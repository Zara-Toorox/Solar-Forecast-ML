# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast ML DB-Version
# * This program is protected by a Proprietary Non-Commercial License.
# ******************************************************************************

"""
Training Worker and Subprocess Runner for out-of-process model training.
Exempt from PyArmor obfuscation to prevent subprocess import/lock issues.

@zara
"""

import sys
import os
import json
import logging
import asyncio
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

_LOGGER = logging.getLogger(__name__)

WORKER_TIMEOUT_SECONDS = 1800.0
WORKER_PRIORITY_NICE = 10
_THREAD_ENV_NAMES = (
    "OMP_NUM_THREADS",
    "MKL_NUM_THREADS",
    "OPENBLAS_NUM_THREADS",
    "VECLIB_MAXIMUM_THREADS",
    "NUMEXPR_NUM_THREADS",
)


class WorkerTrainingError(RuntimeError):
    """The training worker failed before the model trainer produced a result."""


def _resolve_worker_threads() -> str:
    configured = os.environ.get("SFML_TRAIN_WORKER_THREADS")
    if configured:
        try:
            return str(max(1, int(configured)))
        except ValueError:
            return "1"

    cpu_count = os.cpu_count() or 2
    return str(max(1, min(2, cpu_count // 2)))


def _build_worker_env() -> Dict[str, str]:
    """Environment for the worker with a hard cap on BLAS/OpenMP threads."""
    env = os.environ.copy()
    env.setdefault("PYTHONUNBUFFERED", "1")
    limit = int(_resolve_worker_threads())
    for name in _THREAD_ENV_NAMES:
        try:
            inherited = int(env.get(name, ""))
        except ValueError:
            inherited = 0
        env[name] = str(min(limit, inherited) if inherited > 0 else limit)
    return env


def _lower_worker_priority() -> None:
    """Run the worker behind Home Assistant for CPU scheduling. @zara"""
    try:
        current = os.getpriority(os.PRIO_PROCESS, 0)
        if current < WORKER_PRIORITY_NICE:
            os.setpriority(os.PRIO_PROCESS, 0, WORKER_PRIORITY_NICE)
    except (AttributeError, OSError):
        pass


def encode_typed(value: Any) -> Any:
    """JSON-safe encoding that keeps datetime, date, timedelta, tuple and tz types. @zara"""
    if isinstance(value, datetime):
        tz_key = getattr(value.tzinfo, "key", None)
        return {"__t": "datetime", "v": value.isoformat(), "tz": tz_key}
    if isinstance(value, date):
        return {"__t": "date", "v": value.isoformat()}
    if isinstance(value, timedelta):
        return {
            "__t": "timedelta",
            "d": value.days,
            "s": value.seconds,
            "us": value.microseconds,
        }
    if isinstance(value, tuple):
        return {"__t": "tuple", "v": [encode_typed(item) for item in value]}
    if isinstance(value, list):
        return [encode_typed(item) for item in value]
    if isinstance(value, dict):
        if "__t" in value:
            raise ValueError("reserved key __t in payload")
        return {str(key): encode_typed(item) for key, item in value.items()}
    return value


def decode_typed(value: Any) -> Any:
    """Inverse of encode_typed. @zara"""
    if isinstance(value, list):
        return [decode_typed(item) for item in value]
    if isinstance(value, dict):
        kind = value.get("__t")
        if kind == "datetime":
            parsed = datetime.fromisoformat(value["v"])
            tz_key = value.get("tz")
            if tz_key and parsed.tzinfo is not None:
                from zoneinfo import ZoneInfo

                parsed = parsed.astimezone(ZoneInfo(tz_key))
            return parsed
        if kind == "date":
            return date.fromisoformat(value["v"])
        if kind == "timedelta":
            return timedelta(days=value["d"], seconds=value["s"], microseconds=value["us"])
        if kind == "tuple":
            return tuple(decode_typed(item) for item in value["v"])
        return {key: decode_typed(item) for key, item in value.items()}
    return value


def _json_default(value: Any) -> Any:
    if hasattr(value, "tolist"):
        return value.tolist()
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")

# If running as script, save real stdout and redirect sys.stdout to sys.stderr
# to prevent print statements or third-party logs from corrupting the JSON payload.
if __name__ == "__main__":
    worker_threads = _resolve_worker_threads()
    for env_name in _THREAD_ENV_NAMES:
        try:
            inherited = int(os.environ.get(env_name, ""))
        except ValueError:
            inherited = 0
        os.environ[env_name] = str(
            min(int(worker_threads), inherited) if inherited > 0 else worker_threads
        )
    _lower_worker_priority()

    _REAL_STDOUT = sys.stdout
    sys.stdout = sys.stderr
    logging.basicConfig(
        level=logging.INFO,
        format="%(message)s",
        stream=sys.stderr,
        force=True,
    )


def _is_progress_line(line: str) -> bool:
    return (
        "Training V3.0:" in line
        or "Epoch " in line
        or "Early stopping" in line
        or "Training complete:" in line
    )


async def _feed_worker_stdin(process: asyncio.subprocess.Process, input_bytes: bytes) -> None:
    if process.stdin is None:
        return
    process.stdin.write(input_bytes)
    await process.stdin.drain()
    process.stdin.close()


async def _read_worker_stdout(process: asyncio.subprocess.Process) -> bytes:
    if process.stdout is None:
        return b""
    return await process.stdout.read()


async def _stream_worker_stderr(process: asyncio.subprocess.Process) -> str:
    if process.stderr is None:
        return ""

    lines: list[str] = []
    while True:
        raw_line = await process.stderr.readline()
        if not raw_line:
            break
        line = raw_line.decode("utf-8", errors="ignore").rstrip()
        lines.append(line)
        if _is_progress_line(line):
            _LOGGER.info("Training worker: %s", line)
        else:
            _LOGGER.debug("Training worker: %s", line)
    return "\n".join(lines).strip()


async def async_run_training_in_subprocess(
    model_type: str,
    model_config: dict,
    current_weights: dict,
    X_data: list,
    y_targets: list,
    training_params: dict,
    extra_payload: Optional[dict] = None,
) -> dict:
    """Run model training in a separate python subprocess. @zara"""
    try:
        # Get path to this script file
        core_dir = os.path.dirname(os.path.abspath(__file__))
        worker_path = os.path.join(core_dir, "core_train_worker.py")

        payload = {
            "model_type": model_type,
            "model_config": model_config,
            "current_weights": current_weights,
            "X_data": X_data,
            "y_targets": y_targets,
            "training_params": training_params
        }
        if extra_payload:
            payload.update(extra_payload)

        input_str = json.dumps(payload, default=_json_default)
        env = _build_worker_env()

        process = await asyncio.create_subprocess_exec(
            sys.executable,
            "-u",
            worker_path,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env
        )

        try:
            # Enforce a 30-minute timeout on training execution
            stdin_task = asyncio.create_task(_feed_worker_stdin(process, input_str.encode("utf-8")))
            stdout_task = asyncio.create_task(_read_worker_stdout(process))
            stderr_task = asyncio.create_task(_stream_worker_stderr(process))
            wait_task = asyncio.create_task(process.wait())
            stdout, stderr_text, _returncode, _stdin_result = await asyncio.wait_for(
                asyncio.gather(stdout_task, stderr_task, wait_task, stdin_task),
                timeout=WORKER_TIMEOUT_SECONDS
            )
        except asyncio.TimeoutError:
            _LOGGER.warning("Training worker subprocess timed out after %d seconds.", WORKER_TIMEOUT_SECONDS)
            try:
                process.kill()
                await process.wait()
            except Exception:
                pass
            return {"success": False, "error_message": f"Training worker timed out after {int(WORKER_TIMEOUT_SECONDS)} seconds"}
        except asyncio.CancelledError:
            _LOGGER.info("Training worker subprocess cancelled, terminating process.")
            try:
                process.kill()
                await process.wait()
            except Exception:
                pass
            raise

        if process.returncode != 0:
            error_msg = stderr_text.strip()
            _LOGGER.warning("Training worker process returned non-zero code %d: %s", process.returncode, error_msg)
            return {"success": False, "error_message": f"Exit code {process.returncode}: {error_msg}"}

        try:
            result = json.loads(stdout.decode('utf-8'))
            return result
        except json.JSONDecodeError as e:
            stdout_str = stdout.decode('utf-8', errors='ignore').strip()
            _LOGGER.warning("Failed to parse training worker stdout JSON: %s\nRaw output: %s", e, stdout_str)
            return {"success": False, "error_message": f"Invalid JSON stdout: {stdout_str}"}

    except Exception as e:
        _LOGGER.warning("Subprocess training invocation failed: %s", e)
        return {"success": False, "error_message": str(e)}


def _read_lstm_state(lstm: Any) -> Dict[str, Any]:
    """Trainer state the parent needs after training (besides the weights). @zara"""
    return {
        "learning_rate": float(lstm.learning_rate),
        "adam_step": int(lstm.adam_step),
        "seed": lstm.seed,
        "rng_state": lstm._rng.bit_generator.state,
    }


def _apply_lstm_state(lstm: Any, state: Dict[str, Any]) -> None:
    """Restore the parent's trainer state inside the worker. @zara"""
    if not state:
        return
    if state.get("noise_std") is not None:
        lstm.noise_std = float(state["noise_std"])
    if state.get("lr_min") is not None:
        lstm.lr_min = float(state["lr_min"])
    if state.get("learning_rate") is not None:
        lstm.learning_rate = float(state["learning_rate"])
    if state.get("seed") is not None:
        lstm.seed = state["seed"]
    if state.get("rng_state") is not None:
        lstm._rng.bit_generator.state = state["rng_state"]


def _model_job(model: Any, model_type: str) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    """Constructor config, weights and trainer state of a parent-side model. @zara"""
    if model_type == "lstm":
        config = {
            "input_size": model.input_size,
            "hidden_sizes": [model.hidden1, model.hidden2],
            "sequence_length": model.sequence_length,
            "num_outputs": model.num_outputs,
            "learning_rate": model.learning_rate,
            "dropout": model.dropout,
            "num_heads": model.num_heads,
        }
        state = {
            "noise_std": model.noise_std,
            "lr_min": model.lr_min,
            "learning_rate": model.learning_rate,
            "seed": model.seed,
            "rng_state": model._rng.bit_generator.state,
        }
        return config, model.get_weights(), state
    if model_type == "ridge":
        config = {
            "input_size": model.input_size,
            "hidden_size": model.hidden_size,
            "sequence_length": model.sequence_length,
            "num_outputs": model.num_outputs,
        }
        return config, model.get_weights(), {}
    raise WorkerTrainingError(f"Unsupported model type for worker training: {model_type}")


async def async_train_model_in_worker(
    model: Any,
    model_type: str,
    X_sequences: List[Any],
    y_targets: List[Any],
    *,
    epochs: int,
    batch_size: int = 16,
    validation_split: float = 0.2,
    early_stopping_patience: int = 10,
    sample_groups: Optional[List[Any]] = None,
    sample_dates: Optional[List[Any]] = None,
    source_intervals: Optional[List[Tuple[Any, Any]]] = None,
    embargo: Any = 0,
    seed: Optional[int] = None,
) -> Dict[str, Any]:
    """Train ``model`` in the worker process with the full temporal contract. @zara

    The trainer result has the same shape as ``model.train`` returns in process.
    The trained weights and trainer state are written back to ``model``.
    Infrastructure failures (crash, timeout, invalid output) raise
    ``WorkerTrainingError``; there is deliberately no local fallback.
    """
    config, weights, state = _model_job(model, model_type)
    temporal: Dict[str, Any] = {}
    if model_type == "lstm":
        temporal = {
            "sample_groups": sample_groups,
            "sample_dates": sample_dates,
            "source_intervals": source_intervals,
            "embargo": embargo,
            "seed": seed,
        }
    else:
        temporal = {
            "sample_groups": sample_groups,
            "sample_dates": sample_dates,
            "source_intervals": source_intervals,
            "embargo": embargo,
        }

    result = await async_run_training_in_subprocess(
        model_type=model_type,
        model_config=config,
        current_weights=weights,
        X_data=X_sequences,
        y_targets=y_targets,
        training_params={
            "epochs": epochs,
            "batch_size": batch_size,
            "validation_split": validation_split,
            "early_stopping_patience": early_stopping_patience,
        },
        extra_payload={
            "temporal": encode_typed(temporal),
            "model_state": encode_typed(state),
        },
    )
    if not isinstance(result, dict) or not result.get("completed"):
        message = (result or {}).get("error_message") if isinstance(result, dict) else None
        raise WorkerTrainingError(message or "training worker returned no trainer result")

    train_result = decode_typed(result["train_result"])
    if train_result.get("success"):
        model.set_weights(result["weights"])
        if model_type == "lstm":
            returned = decode_typed(result.get("model_state")) or {}
            model.learning_rate = float(returned.get("learning_rate", model.learning_rate))
            model.adam_step = int(returned.get("adam_step", model.adam_step))
            if returned.get("seed") is not None:
                model.seed = returned["seed"]
            if returned.get("rng_state") is not None:
                model._rng.bit_generator.state = returned["rng_state"]
    return train_result


def main():
    """Subprocess main entrypoint. @zara"""
    import traceback

    # Locate config folder dynamically and insert into sys.path
    core_dir = os.path.dirname(os.path.abspath(__file__))
    integration_dir = os.path.dirname(core_dir)
    custom_components_dir = os.path.dirname(integration_dir)
    config_dir = os.path.dirname(custom_components_dir)

    if config_dir not in sys.path:
        sys.path.insert(0, config_dir)

    try:
        # Load parameters from stdin
        input_data = json.load(sys.stdin)
        model_type = input_data["model_type"]
        model_config = input_data["model_config"]
        current_weights = input_data.get("current_weights")
        X_data = input_data["X_data"]
        y_targets = input_data["y_targets"]
        training_params = input_data.get("training_params", {})
        temporal = decode_typed(input_data.get("temporal"))
        model_state = decode_typed(input_data.get("model_state")) or {}
        trainer_kwargs = dict(temporal) if temporal else {}

        result = {"success": False, "error_message": None}

        if model_type == "weather_mlp":
            from custom_components.solar_forecast_ml.ai.ai_weather_mlp import TinyWeatherMLP
            mlp = TinyWeatherMLP(
                input_size=model_config.get("input_size", 12),
                hidden1=model_config.get("hidden1", 16),
                hidden2=model_config.get("hidden2", 8),
                learning_rate=model_config.get("learning_rate", 0.001)
            )
            if current_weights:
                mlp.set_weights(current_weights)

            train_res = asyncio.run(mlp._train_in_process(
                X_data=X_data,
                y_targets=y_targets,
                epochs=training_params.get("epochs", 50),
                validation_split=training_params.get("validation_split", 0.2),
                early_stopping_patience=training_params.get("early_stopping_patience", 10)
            ))

            if train_res.get("success"):
                result["success"] = True
                result["weights"] = mlp.get_weights()
                result["accuracy"] = train_res.get("accuracy", 0.0)
                result["rmse"] = train_res.get("rmse", 0.0)
                result["epochs_trained"] = train_res.get("epochs_trained", 0)
                result["training_samples"] = train_res.get("training_samples", 0)
            else:
                result["error_message"] = "Training failed inside TinyWeatherMLP"

        elif model_type == "lstm":
            from custom_components.solar_forecast_ml.ai.ai_tiny_lstm import TinyLSTM
            hidden_sizes = model_config.get("hidden_sizes", (48, 24))
            if isinstance(hidden_sizes, list):
                hidden_sizes = tuple(hidden_sizes)

            lstm = TinyLSTM(
                input_size=model_config.get("input_size", 28),
                hidden_sizes=hidden_sizes,
                sequence_length=model_config.get("sequence_length", 24),
                num_outputs=model_config.get("num_outputs", 1),
                learning_rate=model_config.get("learning_rate", 0.005),
                dropout=model_config.get("dropout", 0.2),
                num_heads=model_config.get("num_heads", 4)
            )
            if current_weights:
                lstm.set_weights(current_weights)
            _apply_lstm_state(lstm, model_state)

            train_res = asyncio.run(lstm._train_in_process(
                X_sequences=X_data,
                y_targets=y_targets,
                epochs=training_params.get("epochs", 200),
                batch_size=training_params.get("batch_size", 16),
                validation_split=training_params.get("validation_split", 0.2),
                early_stopping_patience=training_params.get("early_stopping_patience", 20),
                **trainer_kwargs
            ))
            result["completed"] = True
            result["train_result"] = encode_typed(train_res)
            result["model_state"] = _read_lstm_state(lstm)

            if train_res.get("success"):
                result["success"] = True
                result["weights"] = lstm.get_weights()
                result["accuracy"] = train_res.get("accuracy", 0.0)
                result["rmse"] = train_res.get("rmse", 0.0)
                result["epochs_trained"] = train_res.get("epochs_trained", 0)
                result["training_samples"] = train_res.get("training_samples", 0)
                result["has_attention"] = train_res.get("has_attention", False)
            else:
                result["error_message"] = train_res.get("error_message", "Training failed inside TinyLSTM")

        elif model_type == "ridge":
            from custom_components.solar_forecast_ml.ai.ai_tiny_ridge import TinyRidge
            ridge = TinyRidge(
                input_size=model_config.get("input_size", 28),
                hidden_size=model_config.get("hidden_size", 32),
                sequence_length=model_config.get("sequence_length", 24),
                num_outputs=model_config.get("num_outputs", 1),
                learning_rate=model_config.get("learning_rate", 0.005),
                dropout=model_config.get("dropout", 0.2),
                use_attention=model_config.get("use_attention", False)
            )
            if current_weights:
                ridge.set_weights(current_weights)

            ridge_kwargs = {
                key: value for key, value in trainer_kwargs.items() if key != "seed"
            }
            train_res = asyncio.run(ridge._train_in_process(
                X_sequences=X_data,
                y_targets=y_targets,
                epochs=training_params.get("epochs", 1),
                batch_size=training_params.get("batch_size", 16),
                validation_split=training_params.get("validation_split", 0.2),
                early_stopping_patience=training_params.get("early_stopping_patience", 10),
                **ridge_kwargs
            ))
            result["completed"] = True
            result["train_result"] = encode_typed(train_res)

            if train_res.get("success"):
                result["success"] = True
                result["weights"] = ridge.get_weights()
                result["accuracy"] = train_res.get("accuracy", 0.0)
                result["rmse"] = train_res.get("rmse", 0.0)
                result["epochs_trained"] = train_res.get("epochs_trained", 0)
                result["training_samples"] = train_res.get("training_samples", 0)
                result["alpha"] = train_res.get("alpha", 0.0)
            else:
                result["error_message"] = train_res.get("message", "Training failed inside TinyRidge")

        else:
            result["error_message"] = f"Unsupported model type: {model_type}"

        # Output result to real stdout
        json.dump(result, _REAL_STDOUT)
        _REAL_STDOUT.flush()

    except Exception as e:
        error_res = {
            "success": False,
            "error_message": f"Worker exception: {str(e)}",
            "traceback": traceback.format_exc()
        }
        json.dump(error_res, _REAL_STDOUT)
        _REAL_STDOUT.flush()


if __name__ == "__main__":
    main()
