(function initializeAllocation(root, factory) {
    const api = factory();
    if (typeof module !== "undefined") module.exports = api;
    if (root) root.SFMLAllocation = api;
})(typeof window !== "undefined" ? window : globalThis, () => {
    const VALID_STATUSES = new Set(["valid", "balanced", "complete", "closed"]);
    const NUMBER_FORMAT = new Intl.NumberFormat("de-DE", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
    });

    function finiteNumber(value) {
        if (value === null || value === undefined || value === "") return null;
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    }

    function allocationValues(payload = {}) {
        return {
            pv: finiteNumber(payload.pv_forecast_kwh),
            houseDemand: finiteNumber(payload.household_base_load_kwh),
            housePv: finiteNumber(payload.household_pv_kwh),
            houseGrid: finiteNumber(payload.household_grid_import_kwh),
            heatPumpDemand: finiteNumber(payload.heat_pump_kwh),
            heatPumpPv: finiteNumber(payload.heat_pump_pv_kwh),
            heatPumpGrid: finiteNumber(payload.heat_pump_grid_import_kwh),
            batteryDemand: finiteNumber(payload.battery_reserve_kwh),
            batteryReserve: finiteNumber(
                payload.battery_pv_reserve_kwh ?? payload.battery_pv_reserved_kwh,
            ),
            calibrationReserve: finiteNumber(payload.pv_calibration_reserve_kwh),
            wallboxBudget: finiteNumber(
                payload.residual_pv_kwh ?? payload.wallbox_pv_available_kwh,
            ),
            wallboxGrid: finiteNumber(
                payload.expected_grid_energy_kwh ?? payload.grid_wallbox_kwh,
            ),
            unallocated: finiteNumber(
                payload.expected_grid_export_kwh ?? payload.unallocated_or_export_kwh,
            ),
            reportedBalanceError: finiteNumber(payload.pv_balance_error_kwh),
        };
    }

    function timestampMs(value) {
        const timestamp = new Date(value);
        return Number.isFinite(timestamp.getTime()) ? timestamp.getTime() : null;
    }

    function assessEnergyAllocation(payload = {}, options = {}) {
        const values = allocationValues(payload);
        const complete = [
            values.pv,
            values.houseDemand,
            values.housePv,
            values.heatPumpDemand,
            values.heatPumpPv,
            values.batteryReserve,
            values.calibrationReserve,
            values.wallboxBudget,
            values.unallocated,
            values.reportedBalanceError,
        ].every((value) => value !== null);
        const expectedHours = finiteNumber(options.expectedHours ?? 24);
        const periodStartMs = timestampMs(payload.forecast_interval_start);
        const periodEndMs = timestampMs(payload.forecast_interval_end);
        const forecastHours = finiteNumber(payload.forecast_interval_hours);
        const measuredHours = periodStartMs === null || periodEndMs === null
            ? null
            : (periodEndMs - periodStartMs) / 3600000;
        const periodComplete = options.requirePeriod === false || (
            Number.isInteger(Number(payload.forecast_interval_count))
            && Number(payload.forecast_interval_count) > 0
            && periodStartMs !== null
            && periodEndMs !== null
            && expectedHours !== null
            && expectedHours > 0
            && forecastHours !== null
            && Math.abs(forecastHours - expectedHours) <= 1 / 60
            && measuredHours !== null
            && Math.abs(measuredHours - expectedHours) <= 1 / 60
            && Math.abs(forecastHours - measuredHours) <= 1 / 60
            && payload.forecast_intervals_contiguous === true
            && (
                expectedHours === 24
                    ? payload.forecast_covers_24h === true
                        && payload.forecast_period_status === "complete_24h"
                    : payload.forecast_period_status === "complete"
            )
        );
        const status = String(payload.allocation_status || "").toLowerCase();
        const tolerance = values.pv === null ? 0.05 : Math.max(0.05, Math.abs(values.pv) * 0.01);
        const nonNegative = complete && Object.entries(values)
            .filter(([key, value]) => key !== "reportedBalanceError" && value !== null)
            .map(([, value]) => value)
            .every((value) => value >= 0);
        const allocated = complete
            ? values.housePv
                + values.heatPumpPv
                + values.batteryReserve
                + values.calibrationReserve
                + values.wallboxBudget
                + values.unallocated
            : null;
        const calculatedBalanceError = complete ? values.pv - allocated : null;
        const afterHouse = complete ? values.pv - values.housePv : null;
        const afterHeatPump = complete ? afterHouse - values.heatPumpPv : null;
        const afterBattery = complete ? afterHeatPump - values.batteryReserve : null;
        const afterCalibration = complete ? afterBattery - values.calibrationReserve : null;
        const afterWallbox = complete ? afterCalibration - values.wallboxBudget : null;
        const demandValid = complete
            && values.housePv <= values.houseDemand + tolerance
            && values.heatPumpPv <= values.heatPumpDemand + tolerance
            && (
                values.batteryDemand === null
                || values.batteryReserve <= values.batteryDemand + tolerance
            );
        const priorityValid = complete
            && [afterHouse, afterHeatPump, afterBattery, afterCalibration, afterWallbox]
                .every((value) => value >= -tolerance);
        const balanceValid = complete
            && Math.abs(values.reportedBalanceError) <= tolerance
            && Math.abs(calculatedBalanceError) <= tolerance;
        const valid = payload.allocation_valid === true
            && VALID_STATUSES.has(status)
            && periodComplete
            && nonNegative
            && demandValid
            && priorityValid
            && balanceValid;
        return {
            valid,
            complete,
            periodComplete,
            status,
            tolerance,
            values,
            allocated,
            calculatedBalanceError,
            afterHouse,
            afterHeatPump,
            afterBattery,
            afterCalibration,
            afterWallbox,
            demandValid,
            priorityValid,
            balanceValid,
        };
    }

    function assessAllocationInterval(point = {}) {
        const intervalHours = finiteNumber(point.interval_hours);
        const availableHours = finiteNumber(point.available_hours);
        const intervalStartMs = timestampMs(point.interval_start);
        const intervalEndMs = timestampMs(point.interval_end);
        const timestamp = timestampMs(point.timestamp);
        const measuredHours = intervalStartMs === null || intervalEndMs === null
            ? null
            : (intervalEndMs - intervalStartMs) / 3600000;
        const intervalComplete = intervalStartMs !== null
            && intervalEndMs !== null
            && timestamp !== null
            && Math.abs(timestamp - intervalStartMs) <= 1000
            && intervalHours !== null
            && intervalHours > 0
            && intervalHours <= 24
            && measuredHours !== null
            && Math.abs(measuredHours - intervalHours) <= 1 / 60
            && availableHours !== null
            && availableHours >= 0
            && availableHours <= intervalHours;
        const assessment = assessEnergyAllocation(point, { requirePeriod: false });
        const lower = finiteNumber(point.residual_pv_lower_kwh);
        const upper = finiteNumber(point.residual_pv_upper_kwh);
        const boundsValid = (lower === null && upper === null)
            || (
                lower !== null
                && upper !== null
                && lower >= 0
                && lower <= assessment.values.wallboxBudget + assessment.tolerance
                && upper >= lower
            );
        return {
            ...assessment,
            valid: assessment.valid && intervalComplete && boundsValid,
            intervalComplete,
            boundsValid,
            intervalHours,
            availableHours,
            timestampMs: timestamp,
            intervalStartMs,
            intervalEndMs,
            residualLower: lower,
            residualUpper: upper,
        };
    }

    function planningWindowOptions(payload = {}) {
        const expectedHours = finiteNumber(payload.planning_horizon_hours);
        const expectedCoveredHours = finiteNumber(payload.planning_covered_hours);
        if (
            !payload.planning_window_start
            || !payload.planning_window_end
            || timestampMs(payload.planning_window_start) === null
            || timestampMs(payload.planning_window_end) === null
            || expectedHours === null
            || expectedCoveredHours === null
            || payload.planning_intervals_contiguous !== true
            || payload.planning_window_complete !== true
        ) return null;
        return {
            expectedStart: payload.planning_window_start,
            expectedEnd: payload.planning_window_end,
            expectedHours,
            expectedCoveredHours,
        };
    }

    function aggregateAllocationIntervals(points = [], options = {}) {
        if (!Array.isArray(points) || points.length === 0) return null;
        const expectedHours = finiteNumber(options.expectedHours ?? 24);
        const expectedStartMs = options.expectedStart === undefined
            ? null
            : timestampMs(options.expectedStart);
        const expectedEndMs = options.expectedEnd === undefined
            ? null
            : timestampMs(options.expectedEnd);
        const expectedCoveredHours = options.expectedCoveredHours === undefined
            ? expectedHours
            : finiteNumber(options.expectedCoveredHours);
        if (
            expectedHours === null
            || expectedHours <= 0
            || expectedCoveredHours === null
            || Math.abs(expectedCoveredHours - expectedHours) > 1 / 60
            || (options.expectedStart !== undefined && expectedStartMs === null)
            || (options.expectedEnd !== undefined && expectedEndMs === null)
        ) return null;
        const assessments = points.map((point) => assessAllocationInterval(point));
        if (!assessments.every((assessment) => assessment.valid)) return null;
        const first = assessments[0];
        const last = assessments.at(-1);
        const contiguous = assessments.every((assessment, index) => (
            index === 0
            || Math.abs(assessment.intervalStartMs - assessments[index - 1].intervalEndMs) <= 1000
        ));
        const intervalHours = assessments.reduce(
            (total, assessment) => total + assessment.intervalHours,
            0,
        );
        const coveredHours = (last.intervalEndMs - first.intervalStartMs) / 3600000;
        const coversTarget = contiguous
            && Math.abs(intervalHours - expectedHours) <= 1 / 60
            && Math.abs(coveredHours - expectedHours) <= 1 / 60
            && Math.abs(intervalHours - coveredHours) <= 1 / 60;
        const matchesExpectedBounds = (
            expectedStartMs === null
            || Math.abs(first.intervalStartMs - expectedStartMs) <= 1000
        ) && (
            expectedEndMs === null
            || Math.abs(last.intervalEndMs - expectedEndMs) <= 1000
        );
        if (!coversTarget || !matchesExpectedBounds) return null;
        const covers24Hours = coveredHours >= 24 - (1 / 60);
        const sum = (key) => assessments.reduce(
            (total, assessment) => total + assessment.values[key],
            0,
        );
        const optionalSum = (key) => assessments.every(
            (assessment) => assessment.values[key] !== null,
        ) ? sum(key) : null;
        return {
            pv_forecast_kwh: sum("pv"),
            household_base_load_kwh: sum("houseDemand"),
            household_pv_kwh: sum("housePv"),
            household_grid_import_kwh: optionalSum("houseGrid"),
            heat_pump_kwh: sum("heatPumpDemand"),
            heat_pump_pv_kwh: sum("heatPumpPv"),
            heat_pump_grid_import_kwh: optionalSum("heatPumpGrid"),
            battery_reserve_kwh: optionalSum("batteryDemand"),
            battery_pv_reserve_kwh: sum("batteryReserve"),
            pv_calibration_reserve_kwh: sum("calibrationReserve"),
            residual_pv_kwh: sum("wallboxBudget"),
            wallbox_pv_available_kwh: sum("wallboxBudget"),
            grid_wallbox_kwh: optionalSum("wallboxGrid"),
            expected_grid_energy_kwh: optionalSum("wallboxGrid"),
            unallocated_or_export_kwh: sum("unallocated"),
            expected_grid_export_kwh: sum("unallocated"),
            pv_balance_error_kwh: assessments.reduce(
                (total, assessment) => total + assessment.values.reportedBalanceError,
                0,
            ),
            allocation_valid: true,
            allocation_status: "balanced",
            forecast_interval_count: assessments.length,
            forecast_interval_start: new Date(first.intervalStartMs).toISOString(),
            forecast_period_start: new Date(first.intervalStartMs).toISOString(),
            forecast_interval_end: new Date(last.intervalEndMs).toISOString(),
            forecast_interval_hours: intervalHours,
            forecast_intervals_contiguous: true,
            forecast_covers_24h: covers24Hours,
            forecast_period_status: expectedHours === 24 ? "complete_24h" : "complete",
        };
    }

    function createAllocationViewModel(payload = {}, options = {}) {
        const assessment = assessEnergyAllocation(payload, {
            expectedHours: options.expectedHours,
        });
        const values = assessment.values;
        const wallboxDemand = finiteNumber(options.wallboxDemandKwh);
        const wallboxPv = finiteNumber(options.wallboxPvKwh);
        const wallboxGrid = finiteNumber(options.wallboxGridKwh);
        const actualWallboxValid = wallboxDemand === null
            ? wallboxPv === null && wallboxGrid === null
            : wallboxPv !== null
                && wallboxGrid !== null
                && wallboxDemand >= 0
                && wallboxPv >= 0
                && wallboxGrid >= 0
                && Math.abs(wallboxDemand - wallboxPv - wallboxGrid) <= assessment.tolerance
                && wallboxPv <= values.wallboxBudget + assessment.tolerance;
        const netItems = [
            { id: "house", label: "Haus aus Netz", valueKwh: values.houseGrid, applicable: true },
            { id: "heat-pump", label: "Wärmepumpe aus Netz", valueKwh: values.heatPumpGrid, applicable: true },
            { id: "wallbox", label: "Wallbox aus Netz", valueKwh: wallboxGrid, applicable: wallboxDemand !== null },
        ].filter((item) => item.applicable);
        const netTotal = netItems.every((item) => item.valueKwh !== null)
            ? netItems.reduce((total, item) => total + item.valueKwh, 0)
            : null;
        return {
            valid: assessment.valid && actualWallboxValid,
            period: options.period || "Zeitraum nicht bestätigt",
            message: options.message || "Die Provider-Allokation ist unvollständig oder nicht geschlossen.",
            steps: [
                {
                    id: "pv",
                    label: "PV verfügbar",
                    valueLabel: "Prognostizierte Energie",
                    valueKwh: values.pv,
                    remainingPvKwh: values.pv,
                    detail: "Bestätigte PV-Prognose für denselben Zeitraum",
                    origin: "EAI-Provider · PV-Prognose",
                },
                {
                    id: "house",
                    label: "Hausbedarf zuerst",
                    demandKwh: values.houseDemand,
                    valueLabel: "PV für Hausbedarf",
                    valueKwh: values.housePv,
                    remainingPvKwh: assessment.afterHouse,
                    detail: "Hausbedarf wird vor allen weiteren Stufen abgezogen",
                    origin: "EAI-Provider · Hausbedarfsprognose",
                },
                {
                    id: "heat_pump",
                    label: "Wärmepumpe",
                    demandKwh: values.heatPumpDemand,
                    valueLabel: "PV für Wärmepumpe",
                    valueKwh: values.heatPumpPv,
                    remainingPvKwh: assessment.afterHeatPump,
                    detail: "Elektrischer Bedarf nach vorrangigem Hausbedarf",
                    origin: "EAI-Provider · Wärmepumpenprognose",
                },
                {
                    id: "battery",
                    label: "Speicherreserve",
                    demandKwh: values.batteryDemand,
                    valueLabel: "Für Speicher reserviert",
                    valueKwh: values.batteryReserve,
                    remainingPvKwh: assessment.afterBattery,
                    detail: "Reservierter PV-Anteil für den Batteriespeicher",
                    origin: "EAI-Provider · Speicherreserve",
                },
                {
                    id: "calibration",
                    label: "Kalibrier-/Sicherheitsreserve",
                    valueLabel: "Nicht zusätzlich verplant",
                    valueKwh: values.calibrationReserve,
                    remainingPvKwh: assessment.afterCalibration,
                    detail: "Konservativer Abschlag vor der Wallbox-Freigabe",
                    origin: "EAI-Provider · Prognosekalibrierung",
                },
                {
                    id: "surplus",
                    label: "Verbleibender PV-Überschuss",
                    valueLabel: "Für Wallbox freigegeben",
                    valueKwh: values.wallboxBudget,
                    remainingPvKwh: values.wallboxBudget,
                    detail: "Nach Haus, Wärmepumpe, Speicher und Sicherheitsreserve",
                    origin: "EAI-Provider · geschlossene PV-Allokation",
                },
            ],
            result: {
                label: "Netzergebnis separat",
                items: netItems,
                totalKwh: netTotal,
                detail: "Explizite Providerwerte; fehlende Netzenergie wird nicht rekonstruiert",
            },
            exportResult: {
                label: "Nicht zugeordnet / erwartbare Einspeisung",
                valueKwh: values.unallocated,
                detail: "PV-Rest nach dem freigegebenen Wallbox-Budget",
            },
        };
    }

    const AllocationWaterfall = {
        props: {
            model: { type: Object, required: true },
        },
        methods: {
            energy(value) {
                return value === null || value === undefined || !Number.isFinite(Number(value))
                    ? "Nicht verfügbar"
                    : `${NUMBER_FORMAT.format(Number(value))} kWh`;
            },
        },
        template: `
            <section class="allocation-panel" aria-label="Gemeinsame PV-Budget-Allokation">
                <header class="allocation-header"><div><strong>PV-Budget-Allokation</strong><span>Ein gemeinsamer Zeitraum, eine feste Prioritätsreihenfolge</span></div><span>{{ model.period }}</span></header>
                <ol class="allocation-waterfall">
                <li v-for="(step, index) in model.steps" :key="step.id" class="allocation-step">
                    <span class="allocation-index">{{ index + 1 }}</span>
                    <div class="allocation-heading"><strong>{{ step.label }}</strong><small>{{ step.detail }}</small></div>
                    <dl>
                        <div v-if="step.demandKwh !== undefined"><dt>Gesamtbedarf</dt><dd>{{ energy(step.demandKwh) }}</dd></div>
                        <div><dt>{{ step.valueLabel }}</dt><dd>{{ energy(step.valueKwh) }}</dd></div>
                        <div v-if="step.id !== 'surplus'"><dt>PV-Budget danach</dt><dd>{{ energy(step.remainingPvKwh) }}</dd></div>
                        <div><dt>Herkunft</dt><dd>{{ step.origin }}</dd></div>
                    </dl>
                </li>
                </ol>
                <article class="allocation-result">
                    <div><strong>{{ model.result.label }}</strong><small>{{ model.result.detail }} · {{ model.period }}</small></div>
                    <dl><div v-for="item in model.result.items" :key="item.id"><dt>{{ item.label }}</dt><dd>{{ energy(item.valueKwh) }}</dd></div><div><dt>Netz gesamt</dt><dd>{{ energy(model.result.totalKwh) }}</dd></div></dl>
                </article>
                <article class="allocation-export"><div><strong>{{ model.exportResult.label }}</strong><small>{{ model.exportResult.detail }} · {{ model.period }}</small></div><span>{{ energy(model.exportResult.valueKwh) }}</span></article>
                <p v-if="!model.valid" class="allocation-warning">{{ model.message }}</p>
            </section>`,
    };

    return {
        assessEnergyAllocation,
        assessAllocationInterval,
        planningWindowOptions,
        aggregateAllocationIntervals,
        createAllocationViewModel,
        AllocationWaterfall,
    };
});
