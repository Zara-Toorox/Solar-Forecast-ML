"""Bounded, fair asynchronous queue owning one aiosqlite connection."""

from __future__ import annotations

import asyncio
from collections import deque
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from time import monotonic
from typing import Any, TypeVar, cast

import aiosqlite

from .contracts import WritePriority
from .errors import QueueFull, QueueTimeout, ServiceStopping, TransactionTimeout

T = TypeVar("T")
JobRunner = Callable[[aiosqlite.Connection], Awaitable[Any]]


@dataclass(slots=True)
class QueueJob:
    domain_id: str
    operation_id: str
    priority: WritePriority
    deadline: float
    timeout: float
    run: JobRunner
    future: asyncio.Future[Any]
    sequence: int
    enqueued_at: float
    started: bool = False


class WriterQueue:
    """Serialize database work and keep ownership inside one worker task."""

    def __init__(
        self,
        connection: aiosqlite.Connection,
        *,
        max_size: int = 256,
        max_domain_size: int = 64,
        busy_timeout_ms: int = 30_000,
        shared_connection: bool = False,
    ) -> None:
        self._connection = connection
        self._max_size = max_size
        self._max_domain_size = max_domain_size
        self._busy_timeout_ms = busy_timeout_ms
        self._shared_connection = shared_connection
        self._queues = {priority: deque[QueueJob]() for priority in WritePriority}
        self._domain_sizes: dict[str, int] = {}
        self._condition = asyncio.Condition()
        self._accepting = True
        self._stop_requested = False
        self._running = False
        self._sequence = 0
        self._last_priority: WritePriority | None = None
        self._priority_streak = 0
        self._worker = asyncio.create_task(self._run(), name="central-database-writer")

    @property
    def size(self) -> int:
        return sum(len(items) for items in self._queues.values())

    async def submit(
        self,
        *,
        domain_id: str,
        operation_id: str,
        priority: WritePriority,
        deadline: float,
        timeout: float,
        runner: Callable[[aiosqlite.Connection], Awaitable[T]],
    ) -> T:
        loop = asyncio.get_running_loop()
        future: asyncio.Future[Any] = loop.create_future()
        async with self._condition:
            if not self._accepting:
                raise ServiceStopping("Writer queue is stopping", domain=domain_id)
            if (
                self.size >= self._max_size
                or self._domain_sizes.get(domain_id, 0) >= self._max_domain_size
            ):
                raise QueueFull("Writer queue capacity reached", domain=domain_id)
            self._sequence += 1
            job = QueueJob(
                domain_id=domain_id,
                operation_id=operation_id,
                priority=priority,
                deadline=deadline,
                timeout=timeout,
                run=runner,
                future=future,
                sequence=self._sequence,
                enqueued_at=monotonic(),
            )
            self._queues[priority].append(job)
            self._domain_sizes[domain_id] = self._domain_sizes.get(domain_id, 0) + 1
            self._condition.notify()
        try:
            return cast(T, await asyncio.shield(future))
        except asyncio.CancelledError:
            if not job.started:
                future.cancel()
            else:
                future.add_done_callback(self._consume_result)
            raise

    async def shutdown(self, *, drain: bool) -> None:
        async with self._condition:
            self._accepting = False
            if not drain:
                for queue in self._queues.values():
                    while queue:
                        job = queue.popleft()
                        self._decrement_domain(job.domain_id)
                        if not job.future.done():
                            job.future.set_exception(
                                ServiceStopping(
                                    "Job rejected during shutdown", domain=job.domain_id
                                )
                            )
            while self.size or self._running:
                await self._condition.wait()
            self._stop_requested = True
            self._condition.notify_all()
        await self._worker

    async def _run(self) -> None:
        while True:
            async with self._condition:
                await self._condition.wait_for(
                    lambda: self.size > 0 or self._stop_requested
                )
                if self._stop_requested and self.size == 0:
                    return
                job = self._next_job()
                self._decrement_domain(job.domain_id)
                if job.future.cancelled():
                    self._condition.notify_all()
                    continue
                if monotonic() >= job.deadline:
                    job.future.set_exception(
                        QueueTimeout(
                            "Job deadline expired before execution",
                            domain=job.domain_id,
                            operation=job.operation_id,
                        )
                    )
                    self._condition.notify_all()
                    continue
                job.started = True
                self._running = True
            try:
                if self._shared_connection:
                    result = await job.run(self._connection)
                else:
                    await self._set_busy_timeout(
                        min(self._busy_timeout_ms, max(1, int(job.timeout * 1_000) - 25))
                    )
                    interrupt = asyncio.create_task(
                        self._interrupt_at_deadline(job.timeout),
                        name=f"database-interrupt-{job.sequence}",
                    )
                    try:
                        result = await asyncio.wait_for(
                            job.run(self._connection), timeout=job.timeout
                        )
                    finally:
                        interrupt.cancel()
                        await asyncio.gather(interrupt, return_exceptions=True)
            except TimeoutError:
                if not job.future.done():
                    job.future.set_exception(
                        TransactionTimeout(
                            "Database transaction exceeded its runtime budget",
                            domain=job.domain_id,
                            operation=job.operation_id,
                        )
                    )
            except BaseException as error:
                if not job.future.done():
                    job.future.set_exception(error)
            else:
                if not job.future.done():
                    job.future.set_result(result)
            finally:
                if not self._shared_connection:
                    await self._set_busy_timeout(self._busy_timeout_ms)
                async with self._condition:
                    self._running = False
                    self._condition.notify_all()

    async def _interrupt_at_deadline(self, timeout: float) -> None:
        await asyncio.sleep(timeout)
        await self._connection.interrupt()

    async def _set_busy_timeout(self, timeout_ms: int) -> None:
        cursor = await self._connection.execute(f"PRAGMA busy_timeout={timeout_ms}")
        await cursor.close()

    def _next_job(self) -> QueueJob:
        available = [priority for priority in WritePriority if self._queues[priority]]
        chosen = available[0]
        if (
            self._last_priority == chosen
            and self._priority_streak >= 8
            and len(available) > 1
        ):
            chosen = available[1]
        else:
            now = monotonic()
            aged = [
                priority
                for priority in available
                if now - self._queues[priority][0].enqueued_at >= 2.0
            ]
            if aged:
                chosen = min(aged, key=lambda item: self._queues[item][0].sequence)
        if chosen == self._last_priority:
            self._priority_streak += 1
        else:
            self._last_priority = chosen
            self._priority_streak = 1
        return self._queues[chosen].popleft()

    def _decrement_domain(self, domain_id: str) -> None:
        remaining = self._domain_sizes.get(domain_id, 1) - 1
        if remaining:
            self._domain_sizes[domain_id] = remaining
        else:
            self._domain_sizes.pop(domain_id, None)

    @staticmethod
    def _consume_result(future: asyncio.Future[object]) -> None:
        if not future.cancelled():
            future.exception()
