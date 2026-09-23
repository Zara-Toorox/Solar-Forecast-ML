const STATISTICS_METRIC_KEYS = {
    home_consumption_day_kwh: "corrections.metric.homeConsumption",
    grid_import_day_kwh: "corrections.metric.gridImport",
    smartmeter_import_day_kwh: "corrections.metric.smartmeterImport",
    grid_export_day_kwh: "corrections.metric.gridExport",
    smartmeter_export_day_kwh: "corrections.metric.smartmeterExport",
    solar_yield_day_kwh: "corrections.metric.solarYield",
    solar_to_house_day_kwh: "corrections.metric.solarToHouse",
    solar_to_battery_day_kwh: "corrections.metric.solarToBattery",
    battery_to_house_day_kwh: "corrections.metric.batteryToHouse",
    grid_to_house_day_kwh: "corrections.metric.gridToHouse",
    grid_to_battery_day_kwh: "corrections.metric.gridToBattery",
    consumer_heatpump_day_kwh: "corrections.metric.heatpump",
    consumer_heatingrod_day_kwh: "corrections.metric.heatingrod",
    consumer_wallbox_day_kwh: "corrections.metric.wallbox",
};

const STATISTICS_RESULT_METRICS = [
    "solar_yield_day_kwh",
    "home_consumption_day_kwh",
    "grid_import_day_kwh",
];

const statisticsIso = (date) => {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
};

const statisticsInclusiveDays = (from, to) => {
    const [yearStart, monthStart, dayStart] = from.split("-").map(Number);
    const [yearEnd, monthEnd, dayEnd] = to.split("-").map(Number);
    const start = Date.UTC(yearStart, monthStart - 1, dayStart);
    const end = Date.UTC(yearEnd, monthEnd - 1, dayEnd);
    return Math.round((end - start) / 86400000) + 1;
};

const statisticsWithinYears = (from, to, years) => {
    const [yearStart, monthStart, dayStart] = from.split("-").map(Number);
    const [yearEnd, monthEnd, dayEnd] = to.split("-").map(Number);
    const anniversary = yearStart + years;
    if (yearEnd < anniversary) return true;
    if (yearEnd > anniversary) return false;
    if (monthEnd < monthStart) return true;
    if (monthEnd > monthStart) return false;
    return dayEnd <= dayStart;
};

const statisticsGrainForSpan = (from, to) => {
    if (statisticsInclusiveDays(from, to) <= 92) return "day";
    if (statisticsWithinYears(from, to, 5)) return "month";
    return "year";
};

const statisticsHass = () => {
    let current = window;
    while (current.parent && current.parent !== current) {
        const parent = current.parent;
        try {
            if (parent.location.origin !== window.location.origin) return null;
            const hass = parent.document.querySelector("home-assistant")?.hass;
            if (hass && typeof hass.fetchWithAuth === "function") return hass;
        } catch (_error) {
            return null;
        }
        current = parent;
    }
    return null;
};

const statisticsResponse = async (path) => {
    const hass = statisticsHass();
    if (hass) return hass.fetchWithAuth(path, { method: "GET" });
    return fetch(path, { cache: "no-store", credentials: "same-origin" });
};

const ModernStatisticsPage = {
    template: `
        <section class="statistics-page" aria-labelledby="statistics-title">
            <div class="statistics-hero">
                <div>
                    <span class="statistics-kicker">Premium</span>
                    <h2 id="statistics-title">{{ text('statistics.title', 'Statistik') }}</h2>
                    <p>{{ text('statistics.description', 'Kennzahlen über frei wählbare Zeiträume, als CSV oder ZIP.') }}</p>
                </div>
            </div>
            <div v-if="loading" class="statistics-state" role="status">{{ text('statistics.loading', 'Kennzahlen werden geladen …') }}</div>
            <div v-else-if="locked" class="statistics-state locked" role="status"><strong>{{ locked }}</strong></div>
            <template v-else>
                <form class="statistics-card statistics-filters" @submit.prevent="load">
                    <label><span>{{ text('statistics.from', 'Von') }}</span><input v-model="periodFrom" type="date" required></label>
                    <label><span>{{ text('statistics.to', 'Bis') }}</span><input v-model="periodTo" type="date" required></label>
                    <label><span>{{ text('corrections.metricLabel', 'Metrik') }}</span><select v-model="selectedMetric"><option v-for="metric in metricIds" :key="metric" :value="metric">{{ metricLabel(metric) }}</option></select></label>
                    <div class="statistics-grains" role="group" :aria-label="text('statistics.period', 'Zeitraum')">
                        <button v-for="item in grains" :key="item.id" class="button compact" :class="{ secondary: grain !== item.id }" type="button" :aria-pressed="grain === item.id" @click="grain = item.id">{{ item.label }}</button>
                    </div>
                    <button class="button" type="submit">{{ text('statistics.show', 'Anzeigen') }}</button>
                </form>
                <div v-if="message" class="statistics-state error" role="alert">{{ message }}</div>
                <div class="statistics-kpis" :aria-label="text('statistics.kpi', 'Kennzahlen')">
                    <article class="statistics-card"><span>{{ text('statistics.cost', 'Kosten') }}</span><strong>{{ money(totals.cost_eur) }}</strong><small>{{ text('statistics.pricedPortion', 'davon bepreist') }} {{ kwh(totals.kwh) }}</small></article>
                    <button v-for="metric in resultMetrics" :key="metric" class="statistics-card" type="button" :data-metric="metric" :aria-pressed="selectedMetric === metric" @click="selectedMetric = metric"><span>{{ metricLabel(metric) }}</span><strong>{{ kwh(metricTotal(metric)) }}</strong></button>
                </div>
                <div class="statistics-card">
                    <span class="statistics-kicker">{{ text('statistics.chart', 'Verlauf') }}</span>
                    <div ref="chartEl" class="statistics-chart" role="img" :aria-label="metricLabel(selectedMetric)"></div>
                </div>
                <div class="statistics-card">
                    <div class="statistics-downloads">
                        <button class="button secondary" type="button" @click="download('day')">{{ text('statistics.downloadDay', 'Tag als CSV') }}</button>
                        <button class="button secondary" type="button" @click="download('month')">{{ text('statistics.downloadMonth', 'Monat als CSV') }}</button>
                        <button class="button secondary" type="button" @click="download('year')">{{ text('statistics.downloadYear', 'Jahr als CSV') }}</button>
                        <button class="button" type="button" @click="download('zip')">{{ text('statistics.downloadZip', 'Alles als ZIP') }}</button>
                    </div>
                    <p v-if="!rows.length" class="statistics-empty">{{ text('statistics.empty', 'Keine Werte in diesem Zeitraum.') }}</p>
                    <template v-else>
                        <p v-if="correctedPeriods" class="statistics-correction-note" role="status" :aria-label="correctionNote">{{ correctionNote }}</p>
                        <details class="statistics-columns" :open="showAll">
                            <summary @click.prevent="showAll = !showAll">{{ text('statistics.allColumns', 'Alle Spalten') }}</summary>
                        </details>
                        <div class="statistics-table-wrap">
                            <table class="statistics-table">
                                <thead>
                                    <tr>
                                        <th>{{ text('statistics.period', 'Zeitraum') }}</th>
                                        <th>{{ text('statistics.cost', 'Kosten') }}</th>
                                        <th v-for="metric in visibleMetrics" :key="metric">{{ metricLabel(metric) }}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="row in rows" :key="row.period">
                                        <td>{{ row.period }}</td>
                                        <td>{{ money(row.cost_eur) }}</td>
                                        <td v-for="metric in visibleMetrics" :key="metric" :class="{ 'statistics-corrected': correctedMetric(row, metric) }">{{ kwh(row.metrics[metric]) }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </template>
                </div>
            </template>
        </section>
    `,
    setup() {
        const { ref, computed, watch, onMounted, onUnmounted, nextTick } = Vue;
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const periodFrom = ref(statisticsIso(monthStart));
        const periodTo = ref(statisticsIso(today));
        const grain = ref("day");
        const selectedMetric = ref(STATISTICS_RESULT_METRICS[0]);
        const shownFrom = ref("");
        const shownTo = ref("");
        const loading = ref(true);
        const locked = ref("");
        const message = ref("");
        const payload = ref(null);
        const showAll = ref(false);
        const chartEl = ref(null);
        let chartInstance = null;

        const text = (key, fallback, params) => {
            const translated = window.SFMLI18n?.t?.(key, params);
            const chosen = translated && translated !== key ? translated : fallback;
            if (!params) return chosen;
            return String(chosen).replace(/\{([^}]+)\}/g, (_, name) => (
                Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : `{${name}}`
            ));
        };
        const grains = computed(() => [
            { id: "day", label: text("statistics.grainDay", "Tag") },
            { id: "month", label: text("statistics.grainMonth", "Monat") },
            { id: "year", label: text("statistics.grainYear", "Jahr") },
        ]);
        const metricIds = computed(() => payload.value?.metrics || []);
        const resultMetrics = STATISTICS_RESULT_METRICS;
        const rows = computed(() => payload.value?.datasets?.[grain.value] || []);
        const totals = computed(() => payload.value?.totals || { cost_eur: 0, kwh: 0, metrics: {} });
        const metricLabel = (metric) => text(STATISTICS_METRIC_KEYS[metric] || metric, metric);
        const metricTotal = (metric) => totals.value.metrics?.[metric];
        const money = (value) => `${Number(value || 0).toFixed(2)} €`;
        const kwh = (value) => `${Number(value || 0).toFixed(3)} kWh`;
        const correctedMetric = (row, metric) => Array.isArray(row.corrected_metrics) && row.corrected_metrics.includes(metric);
        const visibleMetrics = computed(() => {
            if (!showAll.value) return [selectedMetric.value];
            const rest = metricIds.value.filter((metric) => metric !== selectedMetric.value);
            return [selectedMetric.value, ...rest];
        });
        const correctedPeriods = computed(() => rows.value.filter((row) => (
            row.corrected || (Array.isArray(row.corrected_metrics) && row.corrected_metrics.length > 0)
        )).length);
        const correctionNote = computed(() => text(
            "statistics.correctedPeriods",
            "Korrekturen in {count} von {total} Zeiträumen",
            { count: correctedPeriods.value, total: rows.value.length },
        ));
        const chartColor = () => {
            const token = getComputedStyle(document.documentElement).getPropertyValue("--chart-series-ai").trim();
            if (token) return token;
            return document.documentElement.getAttribute("data-theme") === "light" ? "#4e64b8" : "#8fa8ff";
        };
        const disposeChart = () => {
            if (!chartInstance) return;
            chartInstance.dispose();
            chartInstance = null;
        };
        const chartOption = () => {
            const points = rows.value;
            const metric = selectedMetric.value;
            const color = chartColor();
            const axis = getComputedStyle(document.documentElement).getPropertyValue("--text-secondary").trim();
            const gridColor = getComputedStyle(document.documentElement).getPropertyValue("--chart-grid").trim();
            const option = {
                animation: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
                tooltip: { trigger: "axis" },
                grid: { left: 8, right: 8, top: 16, bottom: 8, containLabel: true },
                xAxis: {
                    type: "category",
                    data: points.map((row) => row.period),
                    boundaryGap: false,
                    axisLabel: { color: axis || undefined, hideOverlap: true },
                },
                yAxis: { type: "value", name: "kWh", axisLabel: { color: axis || undefined }, splitLine: { lineStyle: { color: gridColor || undefined } } },
                series: [{
                    name: metricLabel(metric),
                    type: "line",
                    data: points.map((row) => Number(row.metrics?.[metric]) || 0),
                    showSymbol: points.length <= 400,
                    symbolSize: 6,
                    lineStyle: { width: 2, color },
                    itemStyle: { color },
                }],
            };
            if (grain.value === "day" && points.length > 400) option.series[0].sampling = "lttb";
            return option;
        };
        const renderChart = () => {
            disposeChart();
            const host = chartEl.value;
            if (loading.value || locked.value || !host || !window.echarts || !rows.value.length) return;
            chartInstance = window.echarts.init(host);
            chartInstance.setOption(chartOption());
        };
        const resizeChart = () => chartInstance?.resize();
        const refreshChartTheme = () => {
            if (!chartInstance || chartInstance.isDisposed?.()) return;
            chartInstance.setOption(chartOption(), true);
        };
        const queryFor = (from, to) => `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
        const query = () => queryFor(periodFrom.value, periodTo.value);
        const load = async () => {
            const from = periodFrom.value;
            const to = periodTo.value;
            loading.value = true;
            locked.value = "";
            message.value = "";
            try {
                const response = await statisticsResponse(`/api/sfml_stats/modern/statistics?${queryFor(from, to)}`);
                const body = await response.json();
                if (response.status === 403 || body?.error?.code === "premium_required") {
                    locked.value = text("statistics.premiumRequired", "Eine gültige Premium-Lizenz ist erforderlich.");
                    payload.value = null;
                    return;
                }
                if (!response.ok || body?.success === false) {
                    throw new Error(body?.error?.message || text("statistics.loadFailed", "Kennzahlen konnten nicht geladen werden."));
                }
                payload.value = body;
                if (from !== shownFrom.value || to !== shownTo.value) {
                    grain.value = statisticsGrainForSpan(from, to);
                }
                shownFrom.value = from;
                shownTo.value = to;
            } catch (error) {
                payload.value = null;
                message.value = String(error?.message || text("statistics.loadFailed", "Kennzahlen konnten nicht geladen werden.")).slice(0, 240);
            } finally {
                loading.value = false;
            }
        };
        const download = async (kind) => {
            const grainName = kind === "zip" ? "zip" : kind;
            const path = `/api/sfml_stats/export/statistics?${query()}&grain=${encodeURIComponent(grainName)}`;
            try {
                const response = await statisticsResponse(path);
                if (response.status === 403) {
                    locked.value = text("statistics.premiumRequired", "Eine gültige Premium-Lizenz ist erforderlich.");
                    return;
                }
                if (!response.ok) throw new Error(text("statistics.loadFailed", "Kennzahlen konnten nicht geladen werden."));
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = kind === "zip" ? "sfml_stats_statistics.zip" : `sfml_stats_statistics_${kind}.csv`;
                document.body.append(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(url);
            } catch (error) {
                message.value = String(error?.message || text("statistics.loadFailed", "Kennzahlen konnten nicht geladen werden.")).slice(0, 240);
            }
        };
        watch([selectedMetric, grain, rows], () => nextTick(renderChart));
        watch(loading, (isLoading) => {
            if (isLoading) disposeChart();
        });
        onMounted(() => {
            window.addEventListener("resize", resizeChart);
            window.addEventListener("sfml-modern-themechange", refreshChartTheme);
            load();
        });
        onUnmounted(() => {
            window.removeEventListener("resize", resizeChart);
            window.removeEventListener("sfml-modern-themechange", refreshChartTheme);
            disposeChart();
        });
        return {
            periodFrom, periodTo, grain, grains, selectedMetric, showAll, loading, locked, message, rows, totals, metricIds, resultMetrics,
            visibleMetrics, correctedPeriods, correctionNote, chartEl, text, metricLabel, metricTotal, money, kwh, correctedMetric, load, download,
        };
    },
};

if (typeof window !== "undefined") {
    window.ModernStatisticsPage = ModernStatisticsPage;
    window.statisticsGrainForSpan = statisticsGrainForSpan;
}
