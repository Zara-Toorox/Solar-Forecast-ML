const EAI_WEATHER_DEMO = {
    available: true,
    status: "ready",
    source_status: "available",
    issued_at: "2026-01-15T08:00:00+00:00",
    valid_at: "2026-01-15T08:30:00+00:00",
    data_quality: {
        forecast_available: true,
        forecast_stale: false,
        hourly_points: 72,
        paired_samples: 286,
        coverage_percent: 96,
        data_since: "2025-03-25",
    },
    outlook: {
        next_hours: {
            hours: 24,
            temperature_min_c: -0.4,
            temperature_max_c: 7.1,
            precipitation_forecast_mm: 4.8,
            precipitation_probability_max: 82,
            wind_speed_max: 34,
            summary_code: "heavy_rain",
        },
        hourly: [
            { valid_at: "2026-01-15T09:00:00+00:00", temperature_c: 5.2, humidity: 72, pressure: 1009, precipitation: 0, precipitation_probability: 15, wind_speed: 14 },
            { valid_at: "2026-01-15T12:00:00+00:00", temperature_c: 7.1, humidity: 76, pressure: 1007, precipitation: 0.2, precipitation_probability: 38, wind_speed: 19 },
            { valid_at: "2026-01-15T15:00:00+00:00", temperature_c: 5.9, humidity: 82, pressure: 1004, precipitation: 1.6, precipitation_probability: 78, wind_speed: 28 },
            { valid_at: "2026-01-15T18:00:00+00:00", temperature_c: 3.6, humidity: 88, pressure: 1002, precipitation: 2.4, precipitation_probability: 82, wind_speed: 34 },
            { valid_at: "2026-01-15T21:00:00+00:00", temperature_c: 1.8, humidity: 84, pressure: 1005, precipitation: 0.6, precipitation_probability: 55, wind_speed: 23 },
            { valid_at: "2026-01-16T00:00:00+00:00", temperature_c: -0.4, humidity: 79, pressure: 1009, precipitation: 0, precipitation_probability: 20, wind_speed: 12 },
        ],
        daily: [
            { date: "2026-01-15", temperature_min_c: 1.8, temperature_max_c: 7.1, temperature_avg_c: 4.8, precipitation_forecast_mm: 4.8, precipitation_probability_max: 82, wind_speed_max: 34, summary_code: "heavy_rain" },
            { date: "2026-01-16", temperature_min_c: -1.4, temperature_max_c: 4.2, temperature_avg_c: 1.2, precipitation_forecast_mm: 0.6, precipitation_probability_max: 35, wind_speed_max: 19, summary_code: "frost" },
            { date: "2026-01-17", temperature_min_c: 0.6, temperature_max_c: 6.8, temperature_avg_c: 3.6, precipitation_forecast_mm: 2.1, precipitation_probability_max: 64, wind_speed_max: 25, summary_code: "rain_likely" },
        ],
    },
    warnings: [
        { code: "heavy_precipitation", severity: "warning", start: "2026-01-15T17:00:00+00:00", end: "2026-01-15T20:00:00+00:00", impact_code: "heavy_rain_precautions", evidence: { precipitation: 6.4, precipitation_probability: 82 } },
        { code: "freeze_risk", severity: "warning", start: "2026-01-16T04:00:00+00:00", end: "2026-01-16T08:00:00+00:00", impact_code: "freeze_precautions", evidence: { temperature_c: -1.4 } },
    ],
    actual_history: {
        available: true,
        status: "available",
        source: "sfml_database",
        sources: { sfml_database: true, weather_fusion_tracker: false, home_assistant_recorder: false },
        current: { observed_at: "2026-01-15T08:00:00+00:00", observation_date: "2026-01-15", temperature_c: 4.6, humidity: 70, pressure: 1010, wind_speed: 11, wind_bearing: 214, precipitation: 0 },
        timeline: [
            { observed_at: "2026-01-14T12:00:00+00:00", temperature_c: 6.8, humidity: 68, pressure: 1018, wind_speed: 8, precipitation: 0 },
            { observed_at: "2026-01-14T15:00:00+00:00", temperature_c: 7.4, humidity: 65, pressure: 1016, wind_speed: 10, precipitation: 0 },
            { observed_at: "2026-01-14T18:00:00+00:00", temperature_c: 5.2, humidity: 73, pressure: 1015, wind_speed: 12, precipitation: 0 },
            { observed_at: "2026-01-14T21:00:00+00:00", temperature_c: 3.1, humidity: 80, pressure: 1014, wind_speed: 9, precipitation: 0 },
            { observed_at: "2026-01-15T00:00:00+00:00", temperature_c: 1.7, humidity: 84, pressure: 1013, wind_speed: 7, precipitation: 0 },
            { observed_at: "2026-01-15T03:00:00+00:00", temperature_c: 0.9, humidity: 86, pressure: 1012, wind_speed: 8, precipitation: 0 },
            { observed_at: "2026-01-15T06:00:00+00:00", temperature_c: 2.8, humidity: 78, pressure: 1011, wind_speed: 10, precipitation: 0 },
            { observed_at: "2026-01-15T08:00:00+00:00", temperature_c: 4.6, humidity: 70, pressure: 1010, wind_speed: 11, precipitation: 0 },
        ],
        aggregates: {
            data_since: "2025-03-25",
            coverage_percent: 96,
            temperature_min_c: -8.2,
            temperature_max_c: 32.4,
            temperature_avg_c: 11.1,
            humidity_avg_percent: 71,
            pressure_avg_hpa: 1013,
            wind_speed_max_kmh: 68,
            valid_days: 286,
        },
        records: [
            { type: "coldest_temperature", value: -8.2, unit: "°C", date: "2025-12-28" },
            { type: "hottest_temperature", value: 32.4, unit: "°C", date: "2025-07-02" },
            { type: "strongest_wind", value: 68, unit: "km/h", date: "2025-10-23" },
        ],
        monthly_series: [
            { month: "2025-03", temperature_avg_c: 8.4, temperature_min_c: -2.1, temperature_max_c: 18.8 },
            { month: "2025-04", temperature_avg_c: 12.1, temperature_min_c: 1.4, temperature_max_c: 23.2 },
            { month: "2025-05", temperature_avg_c: 15.8, temperature_min_c: 4.8, temperature_max_c: 27.1 },
            { month: "2025-06", temperature_avg_c: 19.4, temperature_min_c: 8.1, temperature_max_c: 30.7 },
            { month: "2025-07", temperature_avg_c: 21.2, temperature_min_c: 9.6, temperature_max_c: 32.4 },
            { month: "2025-08", temperature_avg_c: 20.1, temperature_min_c: 8.4, temperature_max_c: 31.2 },
            { month: "2025-09", temperature_avg_c: 15.7, temperature_min_c: 4.9, temperature_max_c: 25.5 },
            { month: "2025-10", temperature_avg_c: 10.2, temperature_min_c: -0.8, temperature_max_c: 19.7 },
            { month: "2025-11", temperature_avg_c: 5.8, temperature_min_c: -4.1, temperature_max_c: 14.3 },
            { month: "2025-12", temperature_avg_c: 2.9, temperature_min_c: -8.2, temperature_max_c: 10.8 },
            { month: "2026-01", temperature_avg_c: 2.4, temperature_min_c: -6.7, temperature_max_c: 9.9 },
        ],
        precipitation: {
            available: true,
            source: "sfml_database",
            total_mm: 486.2,
            rain_days: 91,
            dry_spell_days: 16,
            daily: [
                { date: "2026-01-09", total_mm: 0 },
                { date: "2026-01-10", total_mm: 2.4 },
                { date: "2026-01-11", total_mm: 0.4 },
                { date: "2026-01-12", total_mm: 8.7 },
                { date: "2026-01-13", total_mm: 0 },
                { date: "2026-01-14", total_mm: 0 },
                { date: "2026-01-15", total_mm: 0 },
            ],
        },
        year_comparison: {
            available: true,
            current: { year: 2026, valid_days: 15, temperature_avg_c: 2.4, precipitation_total_mm: 18.7, rain_days: 5, dry_spell_days: 4 },
            previous: { year: 2025, valid_days: 282, temperature_avg_c: 12.7, precipitation_total_mm: 467.5, rain_days: 86, dry_spell_days: 16 },
            same_day_last_year: { date: "2025-01-15", temperature_avg_c: 3.8 },
        },
        source_comparison: {
            sfml_expert_blend: [
                { valid_at: "2026-01-15T09:00:00+00:00", temperature_c: 5.6, precipitation: 0, ghi_wm2: 84, dni_wm2: 31, dhi_wm2: 53 },
                { valid_at: "2026-01-15T12:00:00+00:00", temperature_c: 6.8, precipitation: 0.3, ghi_wm2: 126, dni_wm2: 42, dhi_wm2: 84 },
            ],
            kepler_input: [
                { valid_at: "2026-01-15T09:00:00+00:00", temperature_c: 5.1, precipitation: 0, ghi_wm2: 79, dni_wm2: 28, dhi_wm2: 51 },
                { valid_at: "2026-01-15T12:00:00+00:00", temperature_c: 7.0, precipitation: 0.2, ghi_wm2: 121, dni_wm2: 40, dhi_wm2: 81 },
            ],
        },
    },
    forecast_vs_actual: {
        temperature_c: {
            by_horizon: {
                "0_6h": { pairs: 96, mae: 0.62, bias: -0.08 },
                "6_24h": { pairs: 103, mae: 0.91, bias: 0.14 },
                "24_72h": { pairs: 87, mae: 1.38, bias: 0.31 },
            },
            trend: { direction: "improving", recent_mae: 0.71, previous_mae: 0.89 },
        },
    },
    uncertainty: { available: true, method: "empirical_p90_absolute_error", pairs: 286, temperature_c: 1.9 },
    cold_start: false,
};

const assessAccuracyProvenance = (provenance) => {
    if (!provenance || typeof provenance !== "object") {
        return { kind: "unknown", hasProvenance: false };
    }
    const actualSources = provenance.actual_sources;
    const sources = actualSources && typeof actualSources === "object"
        ? Object.entries(actualSources)
            .filter(([, value]) => value !== false && value !== null && value !== 0)
            .map(([source]) => String(source).trim().toLowerCase())
            .filter(Boolean)
        : [];
    const stationSources = new Set([
        "sfml_database",
        "sfml_station",
        "local_weather_station",
    ]);
    if (provenance.station_independent === true
        && sources.length > 0
        && sources.every((source) => stationSources.has(source))) {
        return { kind: "station", hasProvenance: true };
    }
    const wfaiSources = new Set([
        "weather_fusion_ai",
        "weather_fusion",
        "weather_fusion_tracker",
        "wfai",
    ]);
    if (sources.length > 0 && sources.every((source) => wfaiSources.has(source))) {
        return { kind: "wfai", hasProvenance: true };
    }
    return { kind: sources.length > 1 ? "mixed" : "unknown", hasProvenance: true };
};

const matchingPoint = (points, validAt) => {
    if (!Array.isArray(points)) return null;
    const target = new Date(validAt).getTime();
    if (!Number.isFinite(target)) return null;
    const candidates = points
        .map((point) => ({ point, timestamp: new Date(point?.valid_at).getTime() }))
        .filter((candidate) => Number.isFinite(candidate.timestamp));
    const match = candidates.reduce((best, candidate) => {
        const distance = Math.abs(candidate.timestamp - target);
        return !best || distance < best.distance
            ? { point: candidate.point, distance }
            : best;
    }, null);
    return match && match.distance <= 90 * 60 * 1000 ? match.point : null;
};

const buildWeatherChartModel = ({ history = {}, current = {}, hourly = [], metric = "temperature_c", now = null } = {}) => {
    const hourMs = 60 * 60 * 1000;
    const plotLeft = 140;
    const plotRight = 980;
    const plotWidth = plotRight - plotLeft;
    const hasMetric = (point) => point?.[metric] !== null
        && point?.[metric] !== undefined
        && point?.[metric] !== ""
        && Number.isFinite(Number(point[metric]));
    const empty = { actualPath: "", bridgePath: "", forecastPath: "", points: [], nowX: 500, grid: [70, 130, 190, 250], plotLeft, plotRight, xTicks: [], yTicks: [] };
    const forecastRows = (Array.isArray(hourly) ? hourly : [])
        .map((point) => ({ ...point, at: point?.valid_at, source: "forecast" }))
        .filter((point) => Number.isFinite(new Date(point.at).getTime()));
    const forecastByTimestamp = new Map();
    forecastRows.forEach((point) => {
        const timestamp = new Date(point.at).getTime();
        const existing = forecastByTimestamp.get(timestamp);
        if (!existing || hasMetric(point) || !hasMetric(existing)) {
            forecastByTimestamp.set(timestamp, point);
        }
    });
    const forecastCandidates = [...forecastByTimestamp.values()]
        .sort((left, right) => new Date(left.at).getTime() - new Date(right.at).getTime());
    const currentTime = new Date(current?.observed_at).getTime();
    const requestedNow = now === null || now === undefined
        ? NaN
        : new Date(now).getTime();
    const forecastStart = forecastCandidates.length ? new Date(forecastCandidates[0].at).getTime() : NaN;
    const anchorTime = Number.isFinite(requestedNow)
        ? requestedNow
        : Number.isFinite(currentTime)
            ? currentTime
            : forecastStart;
    if (!Number.isFinite(anchorTime)) return empty;
    const windowStart = anchorTime - 24 * hourMs;
    const windowEnd = anchorTime + 48 * hourMs;
    const xForTime = (timestamp) => plotLeft + ((timestamp - windowStart) / (windowEnd - windowStart)) * plotWidth;
    const nowX = xForTime(anchorTime);
    const xTicks = [
        { at: windowStart, x: plotLeft, anchor: "start", kind: "start" },
        { at: anchorTime, x: nowX, anchor: "middle", kind: "now" },
        { at: anchorTime + 24 * hourMs, x: xForTime(anchorTime + 24 * hourMs), anchor: "middle", kind: "future" },
        { at: windowEnd, x: plotRight, anchor: "end", kind: "end" },
    ];
    const recentActual = Array.isArray(history?.recent_timeline) && history.recent_timeline.length
        ? history.recent_timeline
        : (Array.isArray(history?.timeline) ? history.timeline : []);
    const actualCandidates = recentActual.map((point) => ({ ...point, at: point?.observed_at, source: "actual" }));
    if (current?.observed_at) actualCandidates.push({ ...current, at: current.observed_at, source: "actual" });
    const actualByTimestamp = new Map();
    actualCandidates.forEach((point) => {
        const timestamp = new Date(point.at).getTime();
        const existing = actualByTimestamp.get(timestamp);
        if (Number.isFinite(timestamp)
            && (!existing || hasMetric(point) || !hasMetric(existing))) {
            actualByTimestamp.set(timestamp, point);
        }
    });
    const actual = [...actualByTimestamp.values()].filter((point) => {
        const timestamp = new Date(point.at).getTime();
        return Number.isFinite(timestamp) && timestamp >= windowStart && timestamp <= anchorTime;
    });
    const forecast = forecastCandidates.filter((point) => {
        const timestamp = new Date(point.at).getTime();
        return timestamp >= anchorTime && timestamp < windowEnd;
    });
    const combined = [...actual, ...forecast]
        .filter((point) => hasMetric(point) && Number.isFinite(new Date(point.at).getTime()))
        .sort((left, right) => new Date(left.at).getTime() - new Date(right.at).getTime());
    if (!combined.length) return { ...empty, nowX, xTicks };
    const values = combined.map((point) => Number(point[metric]));
    let min = Math.min(...values);
    let max = Math.max(...values);
    const padding = Math.max((max - min) * 0.12, 1);
    min -= padding;
    max += padding;
    const points = combined.map((point, index) => ({
        ...point,
        key: `${point.source}-${point.at}-${index}`,
        value: Number(point[metric]),
        x: plotLeft + ((new Date(point.at).getTime() - windowStart) / (windowEnd - windowStart)) * plotWidth,
        y: 268 - ((Number(point[metric]) - min) / Math.max(1, max - min)) * 224,
    }));
    const path = (source) => {
        let previousTime = null;
        return points.filter((point) => point.source === source).map((point) => {
            const timestamp = new Date(point.at).getTime();
            const command = previousTime === null || timestamp - previousTime > 2.5 * hourMs ? "M" : "L";
            previousTime = timestamp;
            return `${command} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
        }).join(" ");
    };
    const firstForecast = points.find((point) => point.source === "forecast");
    const lastActual = [...points].reverse().find((point) => point.source === "actual");
    const bridgeGap = firstForecast && lastActual
        ? new Date(firstForecast.at).getTime() - new Date(lastActual.at).getTime()
        : null;
    const bridgePath = firstForecast && lastActual && bridgeGap >= 0 && bridgeGap <= 3 * hourMs
        ? `M ${lastActual.x.toFixed(1)} ${lastActual.y.toFixed(1)} L ${firstForecast.x.toFixed(1)} ${firstForecast.y.toFixed(1)}`
        : "";
    const yTicks = [
        { y: 44, value: max },
        { y: 268, value: min },
    ];
    return { actualPath: path("actual"), bridgePath, forecastPath: path("forecast"), points, nowX, grid: [44, 100, 156, 212, 268], plotLeft, plotRight, xTicks, yTicks };
};

const ModernEAIWeatherPage = {
    template: `
        <section class="eai-weather-page" aria-labelledby="eai-weather-title">
            <header class="eai-weather-hero">
                <div class="eai-weather-hero-copy">
                    <span class="eai-weather-kicker">Energy AI · Weather Fusion</span>
                    <h2 id="eai-weather-title">Vergangenheit verstehen. Jetzt sehen. Zukunft planen.</h2>
                    <p>{{ narrative }}</p>
                    <small class="eai-weather-attribution">Powered by Weather Fusion AI by Zara-Toorox</small>
                </div>
                <div class="eai-weather-badges">
                    <span :class="['eai-weather-badge', status.data_mode]">{{ modeLabel }}</span>
                    <span class="eai-weather-badge neutral">{{ recorderLabel }}</span>
                </div>
            </header>

            <div v-if="status.is_demo" class="eai-weather-demo" role="status">
                <div><strong>Interaktive Weather-Intelligence Premium-Demo</strong><span>SFML-Historie und die Prognosequellen sind realistische Beispieldaten.</span></div>
                <strong>Keine Steuerung · klare lokale Einordnung</strong>
            </div>

            <div v-if="loading" class="eai-weather-state" role="status">Weather Intelligence wird geladen …</div>
            <div v-else-if="error" class="eai-weather-state error" role="alert"><strong>Daten nicht verfügbar</strong><span>{{ error }}</span></div>

            <template v-else>
                <section class="eai-weather-now" aria-labelledby="weather-now-title">
                    <header><div><span class="eai-weather-eyebrow">{{ currentSourceEyebrow }}</span><h3 id="weather-now-title">Aktuelle Messwerte</h3></div><time>{{ dateTime(current.observed_at) }}</time></header>
                    <div class="eai-weather-now-grid">
                        <article v-for="metric in currentMetrics" :key="metric.label"><span>{{ metric.label }}</span><strong>{{ metric.value }}</strong><small>{{ metric.detail }}</small></article>
                    </div>
                </section>

                <div class="eai-weather-metrics">
                    <article><span>Nächste {{ nextHours.hours || 24 }} Stunden</span><strong>{{ forecastRain }}</strong><small>erwarteter Niederschlag</small></article>
                    <article><span>Temperatur</span><strong>{{ temperature(nextHours.temperature_min_c) }} – {{ temperature(nextHours.temperature_max_c) }}</strong><small>erwarteter Bereich</small></article>
                    <article><span>Lokale Historie</span><strong>{{ historySince }}</strong><small>{{ coverageLabel }}</small></article>
                    <article><span>Warnlage</span><strong>{{ warningSummary }}</strong><small>{{ warnings.length }} aktive Hinweise</small></article>
                </div>

                <article class="eai-weather-card eai-weather-bridge">
                    <header>
                        <div><span class="eai-weather-eyebrow">Historie → Jetzt → Prognose</span><h3>Deine Wetter-Zeitreise</h3></div>
                        <div class="eai-weather-controls" aria-label="Diagramm auswählen">
                            <button v-for="option in chartOptions" :key="option.id" type="button" :class="{ active: chartMetric === option.id }" @click="chartMetric = option.id; selectedChartPoint = null">{{ option.label }}</button>
                        </div>
                    </header>
                    <div class="eai-weather-chart-readout" aria-live="polite">
                        <strong>{{ selectedChartPoint ? chartValue(selectedChartPoint) : chartTitle }}</strong>
                        <span>{{ selectedChartPoint ? chartPointLabel(selectedChartPoint) : chartSubtitle }}</span>
                    </div>
                    <p class="eai-weather-chart-scroll-hint">Auf schmalen Bildschirmen seitlich wischen, um das gesamte 72-Stunden-Fenster zu sehen.</p>
                    <div class="eai-weather-chart-wrap" role="region" tabindex="0" :aria-label="chartTitle + ': horizontal scrollbares Zeitdiagramm'">
                        <svg class="eai-weather-chart" viewBox="0 0 1000 300" role="img" :aria-label="chartAriaLabel">
                            <line v-for="line in chartModel.grid" :key="line" :x1="chartModel.plotLeft" :x2="chartModel.plotRight" :y1="line" :y2="line" class="weather-grid-line" />
                            <path v-if="chartModel.actualPath" :d="chartModel.actualPath" class="weather-path actual" />
                            <path v-if="chartModel.bridgePath" :d="chartModel.bridgePath" class="weather-path bridge" />
                            <path v-if="chartModel.forecastPath" :d="chartModel.forecastPath" class="weather-path forecast" />
                            <line :x1="chartModel.nowX" :x2="chartModel.nowX" y1="24" y2="268" class="weather-now-line" />
                            <text :x="chartModel.nowX" y="18" text-anchor="middle" class="weather-now-label">JETZT</text>
                            <text v-for="tick in chartModel.yTicks" :key="'y-' + tick.y" :x="chartModel.plotLeft - 8" :y="tick.y + 4" text-anchor="end" class="weather-axis-label value">{{ chartAxisValue(tick.value) }}</text>
                            <text v-for="tick in chartModel.xTicks" :key="'x-' + tick.at" :x="tick.x" y="292" :text-anchor="tick.anchor" class="weather-axis-label time">{{ chartAxisTime(tick) }}</text>
                            <circle v-for="point in chartModel.points" :key="point.key" :cx="point.x" :cy="point.y" r="4.5" :class="['weather-point', point.source]" tabindex="0" @mouseenter="selectedChartPoint = point" @focus="selectedChartPoint = point"><title>{{ chartPointLabel(point) }} · {{ chartValue(point) }}</title></circle>
                        </svg>
                    </div>
                    <footer class="eai-weather-legend"><span v-if="hasActualTimeline" class="actual">{{ actualTimelineLabel }}</span><span class="forecast">Weather Fusion Prognose</span><span class="uncertainty">Prognose-Spielraum ± {{ temperature(weather.uncertainty?.temperature_c) }}</span></footer>
                </article>

                <div class="eai-weather-dashboard-grid">
                    <article class="eai-weather-card eai-weather-hourly">
                        <header><div><span class="eai-weather-eyebrow">Nächste Stunden</span><h3>Wann ändert sich das Wetter?</h3></div><span class="eai-weather-chip">Stündlich</span></header>
                        <div v-if="hourly.length" class="eai-weather-timeline" role="list" aria-label="Stündliche Wetterprognose">
                            <div v-for="point in hourly" :key="point.valid_at" class="eai-weather-hour" role="listitem">
                                <time>{{ time(point.valid_at) }}</time><strong>{{ temperature(point.temperature_c) }}</strong>
                                <span class="eai-weather-hour-condition"><i aria-hidden="true">{{ weatherSymbol(point) }}</i>{{ weatherDescription(point) }}</span>
                                <span>{{ percent(point.precipitation_probability) }} Regen</span>
                                <small>{{ precipitation(point.precipitation) }} · {{ number(point.wind_speed) }} km/h</small>
                                <small v-if="precipitationInconsistent(point)" class="eai-weather-hour-note" title="Niederschlagsmenge und Regenwahrscheinlichkeit der Prognosequelle widersprechen sich.">⚠ Quelldaten widersprüchlich</small>
                            </div>
                        </div>
                        <p v-else>Für die stündliche Ansicht liegen noch keine belastbaren Prognosepunkte vor.</p>
                    </article>

                    <article class="eai-weather-card">
                        <header><div><span class="eai-weather-eyebrow">Wetterhinweise</span><h3>Was du jetzt wissen solltest</h3></div><span v-if="hasModelWarnings" class="eai-weather-chip">Modellprognose · nicht amtlich</span></header>
                        <ul v-if="warnings.length" class="eai-weather-events">
                            <li v-for="warning in warnings" :key="warning.code + (warning.start || warning.valid_at)">
                                <i class="eai-weather-warning-icon" aria-hidden="true">{{ warningIcon(warning) }}</i>
                                <div class="eai-weather-warning-content">
                                    <span :class="['eai-weather-severity', warning.severity]">{{ warningTitle(warning) }} · {{ severityLabel(warning.severity) }}</span>
                                    <time class="eai-weather-warning-period">{{ warningPeriod(warning) }}</time>
                                    <strong>{{ warningEvidence(warning) }}</strong>
                                    <span>{{ warningAction(warning) }}</span>
                                </div>
                            </li>
                        </ul>
                        <p v-else>Aktuell wurden keine besonderen Wetterhinweise erkannt.</p>
                    </article>
                </div>

                <article class="eai-weather-card">
                    <header><div><span class="eai-weather-eyebrow">Die nächsten Tage</span><h3>Klare Tagesaussage statt Zahlenfriedhof</h3></div></header>
                    <div class="eai-weather-days">
                        <article v-for="day in daily" :key="day.date">
                            <header><div class="eai-weather-day-title"><i aria-hidden="true">{{ dayIcon(day.summary_code) }}</i><strong>{{ dayName(day.date) }}</strong></div><span>{{ daySummary(day.summary_code) }}</span></header>
                            <b>{{ temperature(day.temperature_min_c) }} – {{ temperature(day.temperature_max_c) }}</b>
                            <span>{{ precipitationOutlook(day.precipitation_forecast_mm, day.precipitation_probability_max) }}</span>
                            <small>Wind bis {{ number(day.wind_speed_max) }} km/h</small>
                        </article>
                    </div>
                </article>

                <article class="eai-weather-card">
                    <header><div><span class="eai-weather-eyebrow">Verfügbare Wetterquellen</span><h3>Vier Wetterlinsen: WFAI, HUBBLE, Kepler und Wetterstation</h3></div><span class="eai-weather-chip">{{ sourceAvailabilityLabel }}</span></header>
                    <div class="eai-weather-source-matrix">
                        <article v-for="source in sourceCards" :key="source.id">
                            <span>{{ source.icon }} {{ source.label }}</span>
                            <strong>{{ source.temperature }}</strong>
                            <small>{{ source.detail }}</small>
                        </article>
                    </div>
                    <p v-if="missingSourceLabels.length" class="eai-weather-source-note">Derzeit nicht verfügbar: {{ missingSourceLabels.join(", ") }}. Die Auswertung zeigt keine Ersatz- oder Nullwerte.</p>
                    <div v-if="sourceComparisonRows.length" class="eai-weather-table-wrap">
                        <table class="eai-weather-source-table"><thead><tr><th>Zeit</th><th>WFAI</th><th>HUBBLE AI</th><th>Kepler AI</th><th>Spanne verfügbarer Quellen</th></tr></thead><tbody>
                            <tr v-for="row in sourceComparisonRows" :key="row.valid_at"><th>{{ time(row.valid_at) }}</th><td>{{ temperature(row.wfai) }}</td><td>{{ temperature(row.blend) }}</td><td>{{ temperature(row.kepler) }}</td><td>{{ temperature(row.spread) }}</td></tr>
                        </tbody></table>
                    </div>
                    <footer>Wetterstation zeigt die in SFML hinterlegten Sensoren. HUBBLE zeigt den Wetterblend aus der SFML-Datenbank, WFAI die lokale Prognose und Kepler den Prognose-Snapshot. „—“ bedeutet nicht verfügbar; 0,0 °C Spanne bedeutet, dass die verfügbaren Quellen übereinstimmen.</footer>
                </article>

                <div class="eai-weather-grid">
                    <article class="eai-weather-card">
                        <span class="eai-weather-eyebrow">Wetterjahr an deinem Standort</span><h3>Dieses Jahr im Vergleich</h3>
                        <div class="eai-weather-history">
                            <span>MIN <strong>{{ temperature(aggregates.temperature_min_c) }}</strong></span><span>MAX <strong>{{ temperature(aggregates.temperature_max_c) }}</strong></span>
                            <span>AVG gesamt <strong>{{ temperature(aggregates.temperature_avg_c) }}</strong></span>
                            <span>Aktuell <strong>{{ temperature(current.temperature_c) }}</strong></span>
                            <span>Vor einem Jahr <strong>{{ temperature(yearComparison.same_day_last_year?.temperature_avg_c) }}</strong></span>
                            <span>Daten seit <strong>{{ historySince }}</strong></span>
                            <span>Ø {{ yearComparison.current?.year || "dieses Jahr" }} <strong>{{ temperature(yearComparison.current?.temperature_avg_c) }}</strong><small>{{ integer(yearComparison.current?.valid_days) }} Tage</small></span>
                            <span>Ø {{ yearComparison.previous?.year || "Vorjahr" }} <strong>{{ temperature(yearComparison.previous?.temperature_avg_c) }}</strong><small>{{ integer(yearComparison.previous?.valid_days) }} Tage</small></span>
                            <span v-if="rainfallRateAvailable">Regentage {{ yearComparison.current?.year || "aktuell" }} <strong>{{ integer(yearComparison.current?.rain_days) }}</strong></span>
                            <span v-else>Regen {{ yearComparison.current?.year || "aktuell" }} <strong>{{ precipitation(yearComparison.current?.precipitation_total_mm) }}</strong></span>
                            <span v-if="rainfallRateAvailable">Regentage {{ yearComparison.previous?.year || "Vorjahr" }} <strong>{{ integer(yearComparison.previous?.rain_days) }}</strong></span>
                            <span v-else>Regen {{ yearComparison.previous?.year || "Vorjahr" }} <strong>{{ precipitation(yearComparison.previous?.precipitation_total_mm) }}</strong></span>
                            <span>Ø Globalstrahlung <strong>{{ irradiance(aggregates.solar_radiation_avg_wm2) }}</strong></span>
                            <span>Maximum Globalstrahlung <strong>{{ irradiance(aggregates.solar_radiation_max_wm2) }}</strong></span>
                        </div>
                    </article>
                    <article class="eai-weather-card">
                        <span class="eai-weather-eyebrow">Monatsklima</span><h3>Bandbreite und Mittelwert</h3>
                        <div v-if="monthly.length" class="eai-weather-months">
                            <div v-for="month in monthly" :key="month.month"><span>{{ monthLabel(month.month) }}</span><i :style="monthStyle(month)"><b :style="monthAverageStyle(month)"></b></i><strong>{{ temperature(month.temperature_avg_c) }}</strong></div>
                        </div>
                        <p v-else>Noch nicht genügend lokale Monatswerte.</p>
                    </article>
                </div>

                <div class="eai-weather-grid">
                    <article class="eai-weather-card">
                        <span class="eai-weather-eyebrow">Regenbilanz</span><h3>{{ rainfallTitle }}</h3>
                        <div v-if="rainfallAvailable" class="eai-weather-rain-summary">
                            <div><strong>{{ precipitation(rainfall.total_mm) }}</strong><span>im verfügbaren Zeitraum</span></div>
                            <div><strong>{{ integer(rainfall.rain_days) }}</strong><span>Regentage</span></div>
                            <div><strong>{{ integer(rainfall.dry_spell_days) }}</strong><span>längste Trockenphase</span></div>
                        </div>
                        <div v-else-if="rainfallRateAvailable" class="eai-weather-rain-summary">
                            <div><strong>{{ precipitationRate(rainfall.max_rate_mm_per_h) }}</strong><span>höchste gemessene Regenrate</span></div>
                            <div><strong>{{ integer(rainfall.rain_days) }}</strong><span>Tage mit Regen</span></div>
                            <div><strong>{{ integer(rainfall.dry_spell_days) }}</strong><span>längste Trockenphase</span></div>
                        </div>
                        <div v-if="rainDays.length" class="eai-weather-rain-bars" aria-label="Niederschlag der letzten Tage">
                            <div v-for="day in rainDays" :key="day.date"><i :style="{ height: rainBar(day.total_mm) }"></i><strong>{{ precipitation(day.total_mm) }}</strong><small>{{ shortDate(day.date) }}</small></div>
                        </div>
                        <div v-else-if="rainRateDays.length" class="eai-weather-rain-bars" aria-label="Maximale Regenrate der letzten Tage">
                            <div v-for="day in rainRateDays" :key="day.date"><i :style="{ height: rainBar(day.max_mm_per_h) }"></i><strong>{{ precipitationRate(day.max_mm_per_h) }}</strong><small>{{ shortDate(day.date) }}</small></div>
                        </div>
                        <p v-else-if="!rainfallAvailable && !rainfallRateAvailable" class="eai-weather-unavailable">Für eine Regenbilanz fehlen eindeutige Messwerte.</p>
                    </article>
                    <article class="eai-weather-card">
                        <span class="eai-weather-eyebrow">Lokale Rekorde</span><h3>Was deine Station wirklich gemessen hat</h3>
                        <ul v-if="records.length" class="eai-weather-records"><li v-for="record in records" :key="record.type + record.date"><span>{{ recordLabel(record.type) }}</span><strong>{{ recordValue(record) }}</strong><small>{{ dateOnly(record.date) }}</small></li></ul>
                        <p v-else>Für lokale Rekorde fehlen noch ausreichend qualitätsgeprüfte Tageswerte.</p>
                    </article>
                </div>

                <article class="eai-weather-card">
                    <header><div><span class="eai-weather-eyebrow">{{ qualityEyebrow }}</span><h3>{{ qualityTitle }}</h3></div><span class="eai-weather-chip">{{ trendLabel }}</span></header>
                    <div class="eai-weather-table-wrap"><table><thead><tr><th>Vorlauf</th><th>Vergleiche</th><th>Typische Abweichung</th><th>Bias</th></tr></thead><tbody><tr v-for="row in qualityRows" :key="row.key"><th>{{ row.label }}</th><td>{{ integer(row.values.pairs) }}</td><td>{{ temperature(row.values.mae) }}</td><td>{{ signedTemperature(row.values.bias) }}</td></tr></tbody></table></div>
                    <footer>{{ qualityProvenance }}</footer>
                </article>
            </template>
        </section>`,

    setup() {
        const { ref, reactive, computed, onMounted, onUnmounted } = Vue;
        const loading = ref(true);
        const error = ref("");
        const status = reactive({ data_mode: "mock", is_demo: true });
        const weather = reactive({});
        const chartMetric = ref("temperature_c");
        const selectedChartPoint = ref(null);
        const scenario = new URLSearchParams(window.location.search).get("eai_scenario");
        const endpoint = (section) => `/api/sfml_stats/modern/eai/${section}${scenario ? `?scenario=${encodeURIComponent(scenario)}` : ""}`;
        const startupRetryDelays = [2000, 4000, 8000, 15000, 30000];
        const healthyRefreshDelay = 30000;
        const degradedRefreshDelay = 60000;
        let refreshTimer = null;
        let disposed = false;
        let inFlight = false;
        let refreshQueued = false;
        let requestGeneration = 0;
        let startupRetryAttempt = 0;
        let lastSuccessAt = 0;
        let lastSnapshotTransient = true;
        let demoModeConfirmed = false;

        const replaceReactive = (target, source) => {
            Object.keys(target).forEach((key) => delete target[key]);
            Object.assign(target, source || {});
        };
        const snapshotIsTransient = (snapshot) => {
            const points = snapshot?.outlook?.hourly;
            return snapshot?.available !== true
                || snapshot?.source_status === "stale"
                || snapshot?.source_status === "unavailable"
                || snapshot?.data_quality?.forecast_stale === true
                || !Array.isArray(points)
                || points.length === 0;
        };
        const pageIsVisible = () => typeof document === "undefined" || document.visibilityState !== "hidden";
        const clearRefreshTimer = () => {
            if (refreshTimer !== null) window.clearTimeout(refreshTimer);
            refreshTimer = null;
        };
        const scheduleRefresh = (delay) => {
            clearRefreshTimer();
            if (disposed || scenario || demoModeConfirmed || !pageIsVisible()) return;
            refreshTimer = window.setTimeout(() => {
                refreshTimer = null;
                void load();
            }, Math.max(0, delay));
        };
        const scheduleNextRefresh = () => {
            if (lastSnapshotTransient) {
                const delay = startupRetryDelays[startupRetryAttempt] ?? degradedRefreshDelay;
                startupRetryAttempt += 1;
                scheduleRefresh(delay);
                return;
            }
            startupRetryAttempt = 0;
            scheduleRefresh(healthyRefreshDelay);
        };

        async function load({ initial = false } = {}) {
            if (disposed) return;
            if (inFlight) {
                refreshQueued = true;
                return;
            }
            inFlight = true;
            const generation = ++requestGeneration;
            const hadWeather = Object.keys(weather).length > 0;
            let succeeded = false;
            if (initial && !hadWeather) loading.value = true;
            try {
                const unwrap = (response) => response?.success === true ? response.data : response;
                const nextStatus = unwrap(await SFMLApi.fetch(endpoint("status"), {
                    forceRefresh: true,
                    ttl: 0
                })) || {};
                let nextWeather;
                try {
                    nextWeather = unwrap(await SFMLApi.fetch(endpoint("weather"), {
                        forceRefresh: true,
                        ttl: 0
                    }))?.data || {};
                } catch (weatherError) {
                    if (!nextStatus.is_demo) throw weatherError;
                    nextWeather = EAI_WEATHER_DEMO;
                }
                if (disposed || generation !== requestGeneration) return;
                replaceReactive(status, nextStatus);
                replaceReactive(weather, nextWeather);
                demoModeConfirmed = nextStatus.is_demo === true;
                lastSnapshotTransient = snapshotIsTransient(nextWeather);
                lastSuccessAt = Date.now();
                error.value = "";
                succeeded = true;
            } catch {
                if (disposed || generation !== requestGeneration) return;
                lastSnapshotTransient = true;
                if (!hadWeather) {
                    error.value = "Die Wetterauswertung konnte nicht geladen werden. Die Verbindung wird automatisch erneut geprüft.";
                }
            } finally {
                if (generation !== requestGeneration) return;
                inFlight = false;
                if (!disposed) loading.value = false;
                if (disposed || scenario || (succeeded && demoModeConfirmed)) {
                    clearRefreshTimer();
                    return;
                }
                if (refreshQueued) {
                    refreshQueued = false;
                    scheduleRefresh(0);
                } else {
                    scheduleNextRefresh();
                }
            }
        }

        const handleVisibilityChange = () => {
            clearRefreshTimer();
            if (disposed || scenario || demoModeConfirmed || !pageIsVisible()) return;
            const age = Date.now() - lastSuccessAt;
            if (lastSnapshotTransient || lastSuccessAt === 0 || age >= healthyRefreshDelay) {
                if (inFlight) refreshQueued = true;
                else scheduleRefresh(0);
                return;
            }
            scheduleRefresh(healthyRefreshDelay - age);
        };

        const outlook = computed(() => weather.outlook || {});
        const nextHours = computed(() => outlook.value.next_hours || {});
        const hourly = computed(() => Array.isArray(outlook.value.hourly) ? outlook.value.hourly : []);
        const daily = computed(() => Array.isArray(outlook.value.daily) ? outlook.value.daily : []);
        const forecastAvailable = computed(() => weather.available === true && hourly.value.length > 0);
        const history = computed(() => weather.actual_history || weather.history || {});
        const current = computed(() => history.value.current || {});
        const normalizedSource = (value) => String(value || "").trim().toLowerCase();
        const currentSource = computed(() => normalizedSource(current.value.source));
        const timelineSource = computed(() => normalizedSource(history.value.timeline_source || history.value.source));
        const isStationSource = (source) => ["sfml_database", "sfml_station", "local_weather_station"].includes(source);
        const isStationHistorySource = (source) => isStationSource(source) || source === "home_assistant_recorder";
        const isWfaiSource = (source) => ["weather_fusion_ai", "weather_fusion", "wfai"].includes(source);
        const currentSourceLabel = computed(() => isStationSource(currentSource.value)
            ? "Wetterstation"
            : isWfaiSource(currentSource.value)
                ? "Weather Fusion AI"
                : currentSource.value ? "Gelieferte Wetterquelle" : "Aktuelle Wetterquelle nicht bestätigt");
        const currentSourceEyebrow = computed(() => `Jetzt · ${currentSourceLabel.value}`);
        const hasActualTimeline = computed(() => Array.isArray(history.value.timeline)
            && history.value.timeline.length > 0);
        const actualTimelineLabel = computed(() => isStationHistorySource(timelineSource.value)
            ? "SFML-Wetterstation / Recorder"
            : isWfaiSource(timelineSource.value)
                ? "Weather Fusion AI · Beobachtung"
                : "Historische Beobachtung · Quelle nicht bestätigt");
        const aggregates = computed(() => history.value.aggregates || {});
        const monthly = computed(() => Array.isArray(history.value.monthly_series)
            ? history.value.monthly_series.map((month) => {
                const temperatureValues = month?.values?.temperature;
                if (!temperatureValues || typeof temperatureValues !== "object") return month;
                return {
                    ...month,
                    temperature_min_c: temperatureValues.min,
                    temperature_max_c: temperatureValues.max,
                    temperature_avg_c: temperatureValues.avg,
                };
            })
            : []);
        const records = computed(() => Array.isArray(history.value.records) ? history.value.records : []);
        const warnings = computed(() => {
            const items = Array.isArray(weather.warnings) ? weather.warnings : (Array.isArray(weather.events) ? weather.events : []);
            return [...items].sort((left, right) => {
                const leftTime = new Date(left.start || left.valid_at || 0).getTime();
                const rightTime = new Date(right.start || right.valid_at || 0).getTime();
                return (Number.isFinite(leftTime) ? leftTime : Number.MAX_SAFE_INTEGER)
                    - (Number.isFinite(rightTime) ? rightTime : Number.MAX_SAFE_INTEGER);
            });
        });
        const hasModelWarnings = computed(() => warnings.value.some((warning) => warning?.official_alert === false));
        const rainfall = computed(() => history.value.precipitation || {});
        const yearComparison = computed(() => history.value.year_comparison || {});
        const sourceComparison = computed(() => history.value.source_comparison || {});
        const rainDays = computed(() => Array.isArray(rainfall.value.daily)
            ? rainfall.value.daily.filter((item) => isFiniteValue(item?.total_mm)).slice(-7)
            : []);
        const rainfallAvailable = computed(() => rainfall.value.available === true && isFiniteValue(rainfall.value.total_mm));
        const rainfallRateAvailable = computed(() => rainfall.value.available === true
            && rainfall.value.semantics === "rate"
            && rainfall.value.unit === "mm/h");
        const rainRateDays = computed(() => Array.isArray(rainfall.value.daily)
            ? rainfall.value.daily.filter((item) => isFiniteValue(item?.max_mm_per_h)).slice(-7)
            : []);
        const rainfallTitle = computed(() => rainfallRateAvailable.value
            ? "Intensität, Regentage und Trockenphasen"
            : "Menge, Regentage und Trockenphasen");
        const todayRainfall = computed(() => {
            if (!["sfml_database", "home_assistant_recorder"].includes(rainfall.value.source)) return null;
            const observationDate = String(current.value.observation_date || "");
            const day = rainDays.value.find((item) => item.date === observationDate);
            return isFiniteValue(day?.total_mm) ? Number(day.total_mm) : null;
        });
        const currentRainMetric = computed(() => rainfallRateAvailable.value
            ? {
                label: "Aktuelle Regenrate",
                value: precipitationRate(current.value.precipitation),
                detail: "Wetterstation · Intensität",
            }
            : {
                label: "Regen seit 00:00",
                value: precipitation(todayRainfall.value),
                detail: todayRainfall.value === null ? "Keine gesicherte Tagessumme" : "Wetterstation · Tagesstatistik",
            });
        const historySince = computed(() => dateOnly(aggregates.value.data_since || history.value.data_since || weather.data_quality?.data_since) || "noch im Aufbau");
        const coverageLabel = computed(() => Number.isFinite(Number(aggregates.value.coverage_percent ?? history.value.coverage ?? weather.data_quality?.coverage_percent)) ? `${integer(aggregates.value.coverage_percent ?? history.value.coverage ?? weather.data_quality?.coverage_percent)} %` : "wird ermittelt");
        const recorderLabel = computed(() => history.value.sources?.sfml_database ? "SFML Datenbank verbunden" : "Lokale Historie");
        const historySource = computed(() => isStationHistorySource(timelineSource.value)
            ? "SFML-Wetterstation · Recorder"
            : isWfaiSource(timelineSource.value)
                ? "Weather Fusion AI"
                : hasActualTimeline.value ? "Historie · Quelle nicht bestätigt" : "Historie nicht verfügbar");
        const forecastRain = computed(() => forecastAvailable.value ? precipitation(nextHours.value.precipitation_forecast_mm) : "—");
        const forecastPrecipitation = computed(() => precipitationOutlook(
            nextHours.value.precipitation_forecast_mm,
            nextHours.value.precipitation_probability_max,
        ));
        const warningSummary = computed(() => !forecastAvailable.value ? "Prognose lädt" : warnings.value.some((item) => item.severity === "critical") ? "Dringend" : warnings.value.some((item) => item.severity === "warning") ? "Beachten" : warnings.value.length ? "Hinweise" : "Ruhig");
        const narrative = computed(() => {
            if (!forecastAvailable.value) {
                return "Die lokale Messhistorie ist verfügbar. Weather Fusion AI lädt die aktuelle Stunden- und Tagesprognose; bis dahin werden bewusst keine Nullwerte oder Wetterbehauptungen angezeigt.";
            }
            const summary = daySummary(nextHours.value.summary_code);
            const range = isFiniteValue(nextHours.value.temperature_min_c) && isFiniteValue(nextHours.value.temperature_max_c) ? ` Die Temperatur liegt zwischen ${temperature(nextHours.value.temperature_min_c)} und ${temperature(nextHours.value.temperature_max_c)}.` : "";
            return `${summary}.${range} In den nächsten ${nextHours.value.hours || 24} Stunden meldet die Prognose ${forecastPrecipitation.value} und Wind bis ${number(nextHours.value.wind_speed_max)} km/h.`;
        });

        const chartOptions = [
            { id: "temperature_c", label: "Temperatur", unit: "°C" },
            { id: "humidity", label: "Feuchte", unit: "%" },
            { id: "pressure", label: "Luftdruck", unit: "hPa" },
            { id: "wind_speed", label: "Wind", unit: "km/h" },
        ];
        const chartConfig = computed(() => chartOptions.find((item) => item.id === chartMetric.value) || chartOptions[0]);
        const chartTitle = computed(() => hasActualTimeline.value
            ? `${chartConfig.value.label}: ${actualTimelineLabel.value} und Prognose`
            : `${chartConfig.value.label}: Weather Fusion Prognose`);
        const chartSubtitle = computed(() => hasActualTimeline.value
            ? "Letzte 24 Stunden gemessen · nächste 48 Stunden Prognose"
            : "Nur verfügbare Weather-Fusion-Prognose");
        const chartModel = computed(() => buildWeatherChartModel({
            history: history.value,
            current: current.value,
            hourly: hourly.value,
            metric: chartMetric.value,
            now: status.is_demo ? current.value.observed_at : Date.now(),
        }));

        const sourceComparisonRows = computed(() => hourly.value.slice(0, 12).map((point) => {
            const blend = matchingPoint(sourceComparison.value.sfml_expert_blend, point.valid_at);
            const kepler = matchingPoint(sourceComparison.value.kepler_input, point.valid_at);
            const values = [point.temperature_c, blend?.temperature_c, kepler?.temperature_c].filter(isFiniteValue).map(Number);
            return {
                valid_at: point.valid_at,
                wfai: point.temperature_c,
                blend: blend?.temperature_c,
                kepler: kepler?.temperature_c,
                spread: values.length > 1 ? Math.max(...values) - Math.min(...values) : null,
            };
        }).filter((row) => isFiniteValue(row.blend) || isFiniteValue(row.kepler)));
        const sourceCards = computed(() => {
            const wfai = hourly.value[0] || {};
            const blend = matchingPoint(sourceComparison.value.sfml_expert_blend, wfai.valid_at) || {};
            const kepler = matchingPoint(sourceComparison.value.kepler_input, wfai.valid_at) || {};
            return [
                { id: "wfai", icon: "🧠", label: "WFAI", available: isFiniteValue(wfai.temperature_c), temperature: temperature(wfai.temperature_c), detail: isFiniteValue(wfai.temperature_c) ? `${precipitation(wfai.precipitation)} · lokale Prognose` : "Lokale Prognose nicht verfügbar" },
                { id: "hubble", icon: "🛰️", label: "HUBBLE AI", available: isFiniteValue(blend.temperature_c), temperature: temperature(blend.temperature_c), detail: isFiniteValue(blend.temperature_c) ? `${number(blend.ghi_wm2, 0)} GHI · ${number(blend.dhi_wm2, 0)} DHI W/m²` : "Wetterblend nicht verfügbar" },
                { id: "kepler", icon: "✦", label: "Kepler AI", available: isFiniteValue(kepler.temperature_c), temperature: temperature(kepler.temperature_c), detail: isFiniteValue(kepler.temperature_c) ? `${number(kepler.dni_wm2, 0)} DNI · ${number(kepler.dhi_wm2, 0)} DHI W/m²` : "Prognose-Snapshot nicht verfügbar" },
                { id: "station", icon: "📡", label: "Wetterstation", available: isFiniteValue(current.value.temperature_c), temperature: temperature(current.value.temperature_c), detail: isFiniteValue(current.value.temperature_c) ? `${irradiance(current.value.solar_radiation_wm2)} GHI · SFML-Sensoren` : "Stationswert nicht verfügbar" },
            ];
        });
        const missingSourceLabels = computed(() => {
            return sourceCards.value
                .filter((source) => !source.available)
                .map((source) => source.label);
        });
        const sourceAvailabilityLabel = computed(() => {
            const count = sourceCards.value.filter((source) => source.available).length;
            return `${count} Quelle${count === 1 ? "" : "n"} verfügbar`;
        });

        const currentMetrics = computed(() => [
            { label: "Temperatur", value: temperature(current.value.temperature_c), detail: currentSourceLabel.value },
            { label: "Luftfeuchte", value: percent(current.value.humidity), detail: dewPointHint(current.value.temperature_c, current.value.humidity) },
            { label: "Luftdruck", value: isFiniteValue(current.value.pressure) ? `${integer(current.value.pressure)} hPa` : "—", detail: pressureHint(current.value.pressure) },
            { label: "Wind", value: isFiniteValue(current.value.wind_speed) ? `${number(current.value.wind_speed)} km/h` : "—", detail: windDirection(current.value.wind_bearing) },
            currentRainMetric.value,
            { label: "Aktuelle Quelle", value: currentSourceLabel.value, detail: "Quelle des aktuellen Werts" },
            { label: "Historie", value: historySource.value, detail: coverageLabel.value + " Abdeckung" },
        ]);
        const quality = computed(() => weather.forecast_vs_actual?.temperature_c || { by_horizon: weather.accuracy || {} });
        const qualityRows = computed(() => [["0_6h", "0–6 Stunden"], ["6_24h", "6–24 Stunden"], ["24_72h", "24–72 Stunden"]].map(([key, label]) => ({ key, label, values: quality.value.by_horizon?.[key] || {} })));
        const trendLabel = computed(() => ({ improving: "Treffer werden besser", worsening: "Zuletzt wechselhafter", stable: "Treffer bleiben stabil" }[quality.value.trend?.direction] || "Trend braucht mehr Daten"));
        const accuracyProvenance = computed(() => assessAccuracyProvenance(
            quality.value.provenance,
        ));
        const qualityEyebrow = computed(() => accuracyProvenance.value.kind === "station"
            ? "Prognose gegen Messung"
            : "Prognose gegen Messung · Quelle prüfen");
        const qualityTitle = computed(() => accuracyProvenance.value.kind === "station"
            ? "Wie gut trifft Weather Fusion deinen Standort?"
            : accuracyProvenance.value.kind === "wfai"
                ? "Wie nah liegen WFAI-Beobachtung und Prognose?"
                : "Wie entwickeln sich verfügbare Prognosevergleiche?");
        const qualityProvenance = computed(() => accuracyProvenance.value.kind === "station"
            ? "Früher gespeicherte Weather-Fusion-Prognosen werden mit SFML-Stationsmessungen gepaart. Das zeigt die Standortgüte für diese Datenbasis."
            : accuracyProvenance.value.kind === "wfai"
                ? "WFAI-Beobachtungen und Weather-Fusion-Prognosen stammen aus derselben Quelle. Die Werte sind keine unabhängige Stationsgüte."
                : accuracyProvenance.value.kind === "mixed"
                    ? "Die Vergleiche enthalten mehrere Beobachtungsquellen. Sie sind keine unabhängige Stationsgüte."
                : "Die Herkunft der Vergleichswerte ist nicht bestätigt. Die Tabelle zeigt keine unabhängige Stationsgüte.");
        const modeLabel = computed(() => ({ mock: "Premium-Demo", onboarding: "Lernphase", live: "Live", degraded: "Eingeschränkt" }[status.data_mode] || "Vorschau"));

        const isFiniteValue = (value) => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
        const number = (value, digits = 1) => isFiniteValue(value) ? new Intl.NumberFormat("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(value)) : "—";
        const integer = (value) => isFiniteValue(value) ? new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(Number(value)) : "—";
        const percent = (value) => isFiniteValue(value) ? `${integer(value)} %` : "—";
        const temperature = (value) => isFiniteValue(value) ? `${number(value)} °C` : "—";
        const precipitation = (value) => isFiniteValue(value) ? `${number(value)} mm` : "—";
        const precipitationRate = (value) => isFiniteValue(value) ? `${number(value)} mm/h` : "—";
        const precipitationProbability = (amount, probability) => {
            if (!isFiniteValue(probability)) return "Wahrscheinlichkeit —";
            const declared = percent(probability);
            return Number(amount) > 0 && Number(probability) === 0
                ? `${declared} laut Quelle · widersprüchlich zur Niederschlagsmenge`
                : declared;
        };
        const precipitationOutlook = (amount, probability) => `${precipitation(amount)} · ${precipitationProbability(amount, probability)} Regenrisiko`;
        const irradiance = (value) => isFiniteValue(value) ? `${number(value, 0)} W/m²` : "—";
        const signedTemperature = (value) => isFiniteValue(value) ? `${Number(value) > 0 ? "+" : ""}${number(value)} °C` : "—";
        const dateTime = (value) => value ? new Date(value).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "noch offen";
        const dateOnly = (value) => value ? new Date(value).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
        const shortDate = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }) : "—";
        const time = (value) => value ? new Date(value).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "—";
        const dayName = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit" }) : "—";
        const daySummary = (code) => ({ storm: "Sturm prägt die Wetterlage", heat: "Es wird heiß und belastend", heavy_rain: "Kräftiger Regen ist zu erwarten", rain_likely: "Regen ist wahrscheinlich", strong_wind: "Es wird deutlich windiger", frost: "Frost ist möglich", calm: "Die Wetterlage bleibt überwiegend ruhig" }[code] || "Die Wetterentwicklung wird ausgewertet");
        const weatherSymbol = (point) => Number(point.wind_speed) >= 60 ? "💨" : Number(point.precipitation_probability) >= 70 ? "🌧️" : Number(point.precipitation_probability) >= 35 ? "🌦️" : Number(point.temperature_c) >= 30 ? "☀️" : "⛅";
        const weatherDescription = (point) => ({
            "clear-night": "Klare Nacht",
            cloudy: "Bewölkt",
            exceptional: "Ungewöhnliche Wetterlage",
            fog: "Nebelig",
            hail: "Hagel",
            lightning: "Gewitter",
            "lightning-rainy": "Gewitter mit Regen",
            partlycloudy: "Teilweise bewölkt",
            pouring: "Starker Regen",
            rainy: "Regnerisch",
            snowy: "Schneefall",
            "snowy-rainy": "Schneeregen",
            sunny: "Sonnig",
            windy: "Windig",
            "windy-variant": "Windig und bewölkt",
        }[point.condition] || (Number(point.precipitation_probability) >= 70 ? "Regen wahrscheinlich" : Number(point.precipitation_probability) >= 35 ? "Schauer möglich" : Number(point.temperature_c) >= 30 ? "Sonnig und heiß" : "Teilweise bewölkt"));
        const precipitationInconsistent = (point) => Number(point.precipitation) > 0 && Number(point.precipitation_probability) === 0;
        const dayIcon = (code) => ({ storm: "⛈️", heat: "☀️", heavy_rain: "🌧️", rain_likely: "🌦️", strong_wind: "💨", frost: "❄️", calm: "⛅" }[code] || "🌤️");
        const warningTitle = (warning) => String(warning?.title || ({ forecast_stale: "Prognose nicht frisch", forecast_unavailable: "Quelle nicht verfügbar", unavailable: "Quelle nicht verfügbar", freeze_risk: "Frost erwartet", heat_stress: "Starke Hitze erwartet", heavy_precipitation: "Starker Regen erwartet", high_precipitation_probability: "Regen sehr wahrscheinlich", precipitation_probability_inconsistent: "Wetterdaten widersprüchlich", strong_wind: "Starker Wind erwartet", storm_wind: "Sturm erwartet", thunderstorm: "Gewitter erwartet", hail: "Hagel erwartet", snow_or_ice: "Schnee oder Glätte erwartet", dense_fog: "Dichter Nebel erwartet", severe_weather: "Unwetter erwartet" }[warning?.code] || "Wetterentwicklung beachten"));
        const warningIcon = (warning) => ({ frost: "❄️", heat: "🌡️", heavy_rain: "🌧️", rain_likely: "🌦️", strong_wind: "💨", storm: "⛈️", thunderstorm: "⛈️", hail: "🧊", snow_or_ice: "🌨️", fog: "🌫️", severe_weather: "🚨", forecast_quality: "ℹ️", data_quality: "🔄" }[warning?.icon_key] || ({ freeze_risk: "❄️", heat_stress: "🌡️", heavy_precipitation: "🌧️", high_precipitation_probability: "🌦️", strong_wind: "💨", storm_wind: "⛈️", thunderstorm: "⛈️", hail: "🧊", snow_or_ice: "🌨️", dense_fog: "🌫️", severe_weather: "🚨", forecast_stale: "🕒", forecast_unavailable: "🔄", unavailable: "🔄", precipitation_probability_inconsistent: "ℹ️" }[warning?.code] || "ℹ️"));
        const severityLabel = (severity) => ({ advisory: "Hinweis", warning: "Warnung", critical: "Hohe Gefahr" }[severity] || "Hinweis");
        const impactLabel = (code) => ({
            freeze_precautions: "Glätte und Frostschäden sind möglich. Empfindliche Pflanzen, Außenleitungen und rutschige Wege rechtzeitig schützen.",
            heat_precautions: "Hitze kann Menschen, Tiere und Gebäude belasten. Für Schatten, ausreichend Wasser und möglichst kühle Innenräume sorgen.",
            heavy_rain_precautions: "Lokale Überflutungen und überlastete Abläufe sind möglich. Kellerzugänge, Entwässerung und lose Gegenstände vorsorglich prüfen.",
            forecast_input_inconsistent: "Niederschlagsmenge und Regenwahrscheinlichkeit der Prognosequelle widersprechen sich. Die Werte werden unverändert angezeigt und nicht für eine eindeutige Regenaussage aufgelöst.",
            rain_planning: "Außenarbeiten und Bewässerung entsprechend planen. Wetterempfindliche Vorhaben möglichst außerhalb dieses Zeitfensters legen.",
            secure_loose_objects: "Lose Gegenstände und empfindliche Pflanzen sichern. Markisen einfahren und exponierte Bereiche frühzeitig kontrollieren.",
            storm_precautions: "Aufenthalt im Freien vermeiden und Sturmschutz prüfen. Fenster schließen, lose Gegenstände sichern und Fahrten wenn möglich verschieben."
        }[code] || "Die Prognose wird regelmäßig aktualisiert.");
        const warningEvidence = (warning) => { const evidence = warning.evidence || {}; if (Number.isFinite(Number(evidence.temperature_c))) return temperature(evidence.temperature_c); if (Number.isFinite(Number(evidence.wind_speed))) return `${number(evidence.wind_speed)} km/h Wind`; if (Number.isFinite(Number(evidence.visibility))) return `${number(evidence.visibility)} m Sichtweite`; const rain = evidence.precipitation_forecast_mm ?? evidence.precipitation; if (Number.isFinite(Number(rain))) return precipitationOutlook(rain, evidence.precipitation_probability); if (Number.isFinite(Number(evidence.precipitation_probability))) return `${percent(evidence.precipitation_probability)} Regenwahrscheinlichkeit`; return ({ lightning: "Gewitter", "lightning-rainy": "Gewitter mit Regen", hail: "Hagel", fog: "Dichter Nebel", rainy: "Regen", pouring: "Starker Regen", snowy: "Schnee", "snowy-rainy": "Schneeregen", exceptional: "Ungewöhnliche Wetterlage" }[evidence.condition] || "Prognosewert nicht verfügbar"); };
        const warningAction = (warning) => String(warning?.recommended_action || impactLabel(warning?.impact_code));
        const warningDate = (value, includeWeekday = true) => value ? new Date(value).toLocaleDateString("de-DE", { weekday: includeWeekday ? "long" : undefined, day: "2-digit", month: "long" }) : "Zeitpunkt noch offen";
        const warningPeriod = (warning) => {
            const startValue = warning.start || warning.valid_at;
            if (!startValue) return "Zeitpunkt noch offen";
            const start = new Date(startValue);
            const end = warning.end ? new Date(warning.end) : null;
            if (!end || Number.isNaN(end.getTime())) return `${warningDate(startValue)} · ab ${time(startValue)} Uhr`;
            const sameDay = start.toLocaleDateString("de-DE") === end.toLocaleDateString("de-DE");
            return sameDay
                ? `${warningDate(startValue)} · ${time(startValue)}–${time(warning.end)} Uhr`
                : `${warningDate(startValue)} · ${time(startValue)} Uhr bis ${warningDate(warning.end)} · ${time(warning.end)} Uhr`;
        };
        const monthLabel = (value) => { if (!value) return "—"; const date = /^\d{4}-\d{2}$/.test(value) ? new Date(`${value}-15T12:00:00`) : new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("de-DE", { month: "short", year: "2-digit" }); };
        const monthStyle = (month) => ({ left: `${Math.max(0, Math.min(100, ((Number(month.temperature_min_c) + 15) / 55) * 100))}%`, width: `${Math.max(4, Math.min(100, ((Number(month.temperature_max_c) - Number(month.temperature_min_c)) / 55) * 100))}%` });
        const monthAverageStyle = (month) => ({ left: `${Math.max(0, Math.min(100, ((Number(month.temperature_avg_c) - Number(month.temperature_min_c)) / Math.max(1, Number(month.temperature_max_c) - Number(month.temperature_min_c))) * 100))}%` });
        const recordLabel = (type) => ({ coldest_temperature: "Kältester Tag", hottest_temperature: "Wärmster Tag", strongest_wind: "Stärkster Wind", lowest_pressure: "Tiefster Luftdruck", highest_pressure: "Höchster Luftdruck" }[type] || type);
        const recordValue = (record) => Number.isFinite(Number(record.value)) ? `${number(record.value)} ${record.unit || ""}` : "—";
        const rainBar = (value) => {
            if (!isFiniteValue(value) || Number(value) <= 0) return "0%";
            return `${Math.max(4, Math.min(100, Number(value) * 8))}%`;
        };
        const chartValue = (point) => `${number(point?.value)} ${chartConfig.value.unit}`;
        const chartPointLabel = (point) => `${point.source === "actual" ? "Gemessen" : "Prognose"} · ${dateTime(point.at)}`;
        const chartAxisValue = (value) => `${number(value)} ${chartConfig.value.unit}`;
        const chartAxisTime = (tick) => tick?.kind === "now"
            ? `Jetzt · ${time(tick.at)}`
            : `${shortDate(new Date(tick?.at).toISOString().slice(0, 10))} · ${time(tick?.at)}`;
        const chartAriaLabel = computed(() => {
            const ticks = chartModel.value.yTicks || [];
            const range = ticks.length === 2
                ? ` Wertebereich ${chartAxisValue(ticks[1].value)} bis ${chartAxisValue(ticks[0].value)}.`
                : " Für diese Metrik liegen noch keine Werte vor.";
            return `${chartTitle.value}. Letzte 24 Stunden Messung und nächste 48 Stunden Prognose.${range}`;
        });
        const pressureHint = (value) => !Number.isFinite(Number(value)) ? "kein Messwert" : Number(value) < 1005 ? "fallend / unbeständig" : Number(value) > 1020 ? "stabile Hochdrucklage" : "normaler Bereich";
        const windDirection = (value) => { if (!Number.isFinite(Number(value))) return "Richtung unbekannt"; const directions = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"]; return `aus ${directions[Math.round(Number(value) / 45) % 8]}`; };
        const dewPointHint = (temp, humidity) => Number.isFinite(Number(temp)) && Number.isFinite(Number(humidity)) ? `Taupunkt ca. ${number(Number(temp) - (100 - Number(humidity)) / 5)} °C` : "Taupunkt wird ermittelt";

        onMounted(() => {
            document.addEventListener("visibilitychange", handleVisibilityChange);
            void load({ initial: true });
        });
        onUnmounted(() => {
            disposed = true;
            requestGeneration += 1;
            clearRefreshTimer();
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        });
        return {
            loading, error, status, weather, chartMetric, selectedChartPoint, chartOptions, chartTitle, chartSubtitle, chartModel, chartAriaLabel,
            modeLabel, recorderLabel, historySource, outlook, nextHours, hourly, daily, history, current, currentMetrics, currentSourceEyebrow, hasActualTimeline, actualTimelineLabel,
            aggregates, monthly, records, warnings, hasModelWarnings, warningSummary, rainfall, rainDays, rainRateDays, rainfallAvailable, rainfallRateAvailable, rainfallTitle, historySince,
            yearComparison, sourceCards, sourceComparisonRows, missingSourceLabels, sourceAvailabilityLabel,
            coverageLabel, forecastRain, narrative, qualityRows, trendLabel, qualityEyebrow, qualityTitle, qualityProvenance, accuracyProvenance, number, integer, percent, temperature,
            precipitation, precipitationRate, irradiance, signedTemperature, precipitationProbability, precipitationOutlook, dateTime, dateOnly, shortDate, time, dayName, daySummary, weatherSymbol, weatherDescription, precipitationInconsistent, dayIcon,
            warningTitle, warningIcon, severityLabel, impactLabel, warningEvidence, warningAction, warningPeriod, monthLabel, monthStyle,
            monthAverageStyle, recordLabel, recordValue, rainBar, chartValue, chartPointLabel, chartAxisValue, chartAxisTime,
        };
    },
};

if (typeof window !== "undefined") window.ModernEAIWeatherPage = ModernEAIWeatherPage;
if (typeof module !== "undefined") module.exports = { assessAccuracyProvenance, buildWeatherChartModel, matchingPoint };
