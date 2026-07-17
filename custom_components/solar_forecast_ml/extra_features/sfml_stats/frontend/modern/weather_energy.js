const {
    ref: weRef,
    reactive: weReactive,
    computed: weComputed,
    onMounted: weOnMounted,
    onUnmounted: weOnUnmounted,
    watch: weWatch,
    nextTick: weNextTick,
} = Vue;

const WE_COPY = {
    de: {
        tabs: { overview: "Cockpit", story: "Tagesgeschichte", impact: "Weather Impact", compare: "Vergleichstage" },
        tabsShort: { overview: "Cockpit", story: "Story", impact: "Einfluss", compare: "Vergleich" },
        conditions: "Solar Conditions", conditionsBasis: "beobachtete PV-Bedingungen", forecast: "Morning Forecast", actual: "Tatsächlicher Ertrag", quality: "Forecast-Qualität",
        unavailable: "Für diese Auswertung reicht die gespeicherte Datenbasis noch nicht aus.", retry: "Erneut laden", latest: "Letzter gemeinsamer Datentag",
        scoreClasses: { strong: "Sehr stark", good: "Gut", mixed: "Wechselhaft", weak: "Schwach" },
        components: { radiation_potential: "Strahlungspotenzial", usable_solar_window: "Nutzbares Sonnenfenster", radiation_stability: "Strahlungsstabilität", cloud_openness: "Wolkenoffenheit" },
        kpis: { yield: "Tagesertrag", fulfilment: "Forecast-Erfüllung", specific: "Spezifischer Ertrag", peak: "Produktionspeak", month: "Monatsertrag", year: "Jahresertrag", radiation: "Tagesstrahlung", ratio: "Production Response" },
        evidence: "Belegte Erkenntnisse", completeness: "Datenbasis", weather: "Wetter", energy: "Energie", validHours: "vergleichbare Stunden",
        storyTitle: "Bedingungen, Forecast und Ertrag auf einer Zeitachse", storyNote: "Zeitliche Übereinstimmung zeigt einen Zusammenhang, aber keine nachgewiesene Ursache.", hour: "Stunde", cumulative: "Kumuliert", deviation: "Abweichung",
        series: { solarActual: "Strahlung Ist", solarForecast: "Strahlung Forecast", clearSky: "Clear Sky", forecast: "Final Forecast", actual: "Ertrag Ist", clouds: "Bewölkung", sun: "Sonnenhöhe" },
        impactTitle: "Forecast-Fehler nach gespeicherten Bedingungen", cloudGroups: "Bewölkungsgruppen", volatilityGroups: "Strahlungsdynamik", sample: "Stichprobe", days: "Tage", mae: "MAE", bias: "Bias", best: "Bestes Modell", insufficient: "Noch nicht belastbar",
        groups: { clear: "0–20 %", light_cloud: "20–50 %", cloudy: "50–80 %", overcast: "80–100 %", stable: "Stabil", variable: "Wechselhaft", volatile: "Volatil" },
        compareTitle: "Ähnliche historische Bedingungen", similarity: "Ähnlichkeit", target: "Zieltag", noCompare: "Für eine belastbare Auswahl fehlen noch genügend vollständige Vergleichstage.", select: "Tag vergleichen",
    },
    en: {
        tabs: { overview: "Cockpit", story: "Day Story", impact: "Weather Impact", compare: "Comparable Days" },
        tabsShort: { overview: "Cockpit", story: "Story", impact: "Impact", compare: "Compare" },
        conditions: "Solar Conditions", conditionsBasis: "observed PV conditions", forecast: "Morning Forecast", actual: "Actual yield", quality: "Forecast quality",
        unavailable: "The stored data basis is not sufficient for this analysis yet.", retry: "Try again", latest: "Latest shared data day",
        scoreClasses: { strong: "Very strong", good: "Good", mixed: "Mixed", weak: "Weak" },
        components: { radiation_potential: "Radiation potential", usable_solar_window: "Usable solar window", radiation_stability: "Radiation stability", cloud_openness: "Cloud openness" },
        kpis: { yield: "Daily yield", fulfilment: "Forecast fulfilment", specific: "Specific yield", peak: "Production peak", month: "Month yield", year: "Year yield", radiation: "Daily radiation", ratio: "Production Response" },
        evidence: "Evidence-backed insights", completeness: "Data basis", weather: "Weather", energy: "Energy", validHours: "comparable hours",
        storyTitle: "Conditions, forecast and yield on one timeline", storyNote: "Temporal alignment indicates association, not proven causation.", hour: "Hour", cumulative: "Cumulative", deviation: "Deviation",
        series: { solarActual: "Radiation actual", solarForecast: "Radiation forecast", clearSky: "Clear Sky", forecast: "Final forecast", actual: "Yield actual", clouds: "Cloud cover", sun: "Sun elevation" },
        impactTitle: "Forecast error by stored conditions", cloudGroups: "Cloud groups", volatilityGroups: "Radiation dynamics", sample: "Sample", days: "Days", mae: "MAE", bias: "Bias", best: "Best model", insufficient: "Not reliable yet",
        groups: { clear: "0–20%", light_cloud: "20–50%", cloudy: "50–80%", overcast: "80–100%", stable: "Stable", variable: "Variable", volatile: "Volatile" },
        compareTitle: "Similar historical conditions", similarity: "Similarity", target: "Target day", noCompare: "There are not enough complete comparison days for a reliable selection yet.", select: "Compare day",
    },
    pl: {
        tabs: { overview: "Kokpit", story: "Historia dnia", impact: "Wpływ pogody", compare: "Podobne dni" },
        tabsShort: { overview: "Kokpit", story: "Dzień", impact: "Wpływ", compare: "Porównaj" },
        conditions: "Warunki solarne", conditionsBasis: "zaobserwowane warunki PV", forecast: "Prognoza poranna", actual: "Rzeczywisty uzysk", quality: "Jakość prognozy",
        unavailable: "Zapisana baza danych nie wystarcza jeszcze do tej analizy.", retry: "Spróbuj ponownie", latest: "Ostatni wspólny dzień danych",
        scoreClasses: { strong: "Bardzo dobre", good: "Dobre", mixed: "Zmienne", weak: "Słabe" },
        components: { radiation_potential: "Potencjał promieniowania", usable_solar_window: "Użyteczne okno słoneczne", radiation_stability: "Stabilność promieniowania", cloud_openness: "Przejrzystość chmur" },
        kpis: { yield: "Uzysk dzienny", fulfilment: "Realizacja prognozy", specific: "Uzysk właściwy", peak: "Szczyt produkcji", month: "Uzysk miesiąca", year: "Uzysk roku", radiation: "Promieniowanie dzienne", ratio: "Odpowiedź produkcji" },
        evidence: "Potwierdzone wnioski", completeness: "Baza danych", weather: "Pogoda", energy: "Energia", validHours: "porównywalne godziny",
        storyTitle: "Warunki, prognoza i uzysk na jednej osi czasu", storyNote: "Zbieżność czasowa wskazuje związek, ale nie dowodzi przyczyny.", hour: "Godzina", cumulative: "Łącznie", deviation: "Odchylenie",
        series: { solarActual: "Promieniowanie rzeczywiste", solarForecast: "Prognoza promieniowania", clearSky: "Czyste niebo", forecast: "Prognoza finalna", actual: "Uzysk rzeczywisty", clouds: "Zachmurzenie", sun: "Wysokość słońca" },
        impactTitle: "Błąd prognozy według zapisanych warunków", cloudGroups: "Grupy zachmurzenia", volatilityGroups: "Dynamika promieniowania", sample: "Próba", days: "Dni", mae: "MAE", bias: "Bias", best: "Najlepszy model", insufficient: "Jeszcze niewiarygodne",
        groups: { clear: "0–20%", light_cloud: "20–50%", cloudy: "50–80%", overcast: "80–100%", stable: "Stabilne", variable: "Zmienne", volatile: "Niestabilne" },
        compareTitle: "Podobne warunki historyczne", similarity: "Podobieństwo", target: "Dzień docelowy", noCompare: "Brakuje wystarczającej liczby pełnych dni porównawczych.", select: "Porównaj dzień",
    },
};

function weLocale() {
    return ["de", "en", "pl"].includes(window.SFMLI18n?.current) ? window.SFMLI18n.current : "en";
}

function weNumber(value, digits = 1) {
    if (value == null || !Number.isFinite(Number(value))) return "–";
    return new Intl.NumberFormat(weLocale(), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(value));
}

function weDate(value) {
    if (!value) return "–";
    return new Intl.DateTimeFormat(weLocale(), { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function weSigned(value, digits = 2) {
    if (value == null || !Number.isFinite(Number(value))) return "–";
    return `${Number(value) > 0 ? "+" : ""}${weNumber(value, digits)}`;
}

async function weFetch(path, forceRefresh = false) {
    const payload = await SFMLApi.fetch(path, { forceRefresh, ttl: 120000 });
    return payload?.data ?? payload;
}

window.ModernWeatherEnergyPage = {
    props: { initialSection: { type: String, default: "" } },
    template: `
        <div class="we-lab">
            <div class="we-commandbar">
                <div class="we-tabs" role="tablist" :aria-label="copy.conditions">
                    <button v-for="tab in tabs" :key="tab" type="button" role="tab"
                            :aria-selected="activeTab === tab" :class="{ active: activeTab === tab }"
                            @click="selectTab(tab)"><span class="we-tab-long">{{ copy.tabs[tab] }}</span><span class="we-tab-short">{{ copy.tabsShort[tab] }}</span></button>
                </div>
                <label class="we-date-control">
                    <span>{{ copy.latest }}</span>
                    <input type="date" v-model="selectedDate" :max="latestDate || undefined" @change="changeDate">
                </label>
            </div>

            <div v-if="loading" class="we-loading" role="status"><span class="loading-indicator"></span></div>
            <div v-else-if="error" class="we-error" role="alert"><strong>{{ error }}</strong><button class="button secondary" type="button" @click="loadActive(true)">{{ copy.retry }}</button></div>

            <section v-else-if="activeTab === 'overview' && summary" class="we-section">
                <div class="we-causal-chain" aria-label="Conditions to quality">
                    <article :class="conditionClass"><span>01</span><small>{{ copy.conditions }}</small><strong>{{ conditions.available ? number(conditions.score) : '–' }}</strong><em>/100</em></article>
                    <i aria-hidden="true">→</i>
                    <article><span>02</span><small>{{ copy.forecast }}</small><strong>{{ number(production.forecast_kwh, 2) }}</strong><em>kWh</em></article>
                    <i aria-hidden="true">→</i>
                    <article><span>03</span><small>{{ copy.actual }}</small><strong>{{ number(production.yield_kwh, 2) }}</strong><em>kWh</em></article>
                    <i aria-hidden="true">→</i>
                    <article><span>04</span><small>{{ copy.quality }}</small><strong>{{ number(summary.forecast_quality?.accuracy_percent) }}</strong><em>%</em></article>
                </div>

                <div class="we-overview-grid">
                    <section class="we-conditions-panel" :class="conditionClass">
                        <div class="we-score-head">
                            <div><span>{{ copy.conditions }}</span><small>{{ copy.conditionsBasis }}</small></div>
                            <strong v-if="conditions.available">{{ number(conditions.score) }}<em>/100</em></strong>
                            <strong v-else>–</strong>
                        </div>
                        <div v-if="conditions.available" class="we-components">
                            <div v-for="component in conditions.components" :key="component.id">
                                <header><span>{{ copy.components[component.id] }}</span><strong>{{ number(component.value) }}%</strong></header>
                                <div class="we-meter"><i :style="{ width: component.value + '%' }"></i></div>
                                <small>{{ component.weight }}%</small>
                            </div>
                        </div>
                        <p v-else class="we-empty">{{ copy.unavailable }}</p>
                    </section>

                    <section class="we-evidence-panel">
                        <header><span>{{ copy.evidence }}</span><small>{{ date(summary.date) }}</small></header>
                        <div v-if="summary.insights?.length" class="we-insights">
                            <article v-for="insight in summary.insights" :key="insight.id" :class="'severity-' + insight.severity">
                                <i></i><div><strong>{{ insightText(insight)[0] }}</strong><small>{{ insightText(insight)[1] }}</small></div>
                            </article>
                        </div>
                        <p v-else class="we-empty">{{ copy.unavailable }}</p>
                    </section>
                </div>

                <div class="we-kpi-grid">
                    <article><span>{{ copy.kpis.yield }}</span><strong>{{ number(production.yield_kwh, 2) }} <small>kWh</small></strong></article>
                    <article><span>{{ copy.kpis.fulfilment }}</span><strong>{{ number(production.forecast_fulfilment_percent) }} <small>%</small></strong></article>
                    <article><span>{{ copy.kpis.specific }}</span><strong>{{ number(production.specific_yield_kwh_kwp, 2) }} <small>kWh/kWp</small></strong></article>
                    <article><span>{{ copy.kpis.peak }}</span><strong>{{ number(production.peak_power_w, 0) }} <small>W · {{ production.peak_time || '–' }}</small></strong></article>
                    <article><span>{{ copy.kpis.month }}</span><strong>{{ number(production.month_yield_kwh, 1) }} <small>kWh</small></strong></article>
                    <article><span>{{ copy.kpis.year }}</span><strong>{{ number(production.year_yield_kwh, 1) }} <small>kWh</small></strong></article>
                    <article><span>{{ copy.kpis.radiation }}</span><strong>{{ number(conditions.daily_radiation_kwh_m2, 2) }} <small>kWh/m²</small></strong></article>
                    <article><span>{{ copy.kpis.ratio }}</span><strong>{{ number(production.radiation_to_energy_ratio, 2) }} <small>kWh/(kWh/m²)</small></strong></article>
                </div>

                <div class="we-data-basis">
                    <strong>{{ copy.completeness }}</strong>
                    <span>{{ copy.weather }} {{ number(summary.data_completeness?.weather_percent, 0) }}%</span>
                    <span>{{ copy.energy }} {{ number(summary.data_completeness?.energy_percent, 0) }}%</span>
                    <span>{{ summary.data_completeness?.valid_comparison_hours || 0 }} {{ copy.validHours }}</span>
                    <small>SFML Database · {{ summary.weather_basis }} · {{ summary.forecast_basis }}</small>
                </div>
            </section>

            <section v-else-if="activeTab === 'story' && day" class="we-section">
                <header class="we-section-heading"><div><span>Weather-to-Energy Story</span><h2>{{ copy.storyTitle }}</h2></div><small>{{ date(day.date) }} · {{ day.forecast_basis }}</small></header>
                <div class="we-series-controls">
                    <label v-for="item in storySeries" :key="item.id"><input type="checkbox" v-model="visibleSeries[item.id]" @change="renderStory">{{ item.label }}</label>
                </div>
                <div ref="storyChart" class="we-story-chart" role="img" :aria-label="copy.storyTitle"></div>
                <div v-if="activeHour" class="we-hour-readout">
                    <article><span>{{ copy.hour }}</span><strong>{{ String(activeHour.hour).padStart(2, '0') }}:00</strong><small>{{ activeHour.state }}</small></article>
                    <article><span>{{ copy.actual }}</span><strong>{{ number(activeHour.actual_kwh, 3) }} kWh</strong><small>{{ copy.cumulative }} {{ number(activeHour.cumulative_actual_kwh, 2) }} kWh</small></article>
                    <article><span>{{ copy.forecast }}</span><strong>{{ number(activeHour.forecast_kwh, 3) }} kWh</strong><small>{{ copy.cumulative }} {{ number(activeHour.cumulative_forecast_kwh, 2) }} kWh</small></article>
                    <article><span>{{ copy.deviation }}</span><strong :class="signedClass(activeHour.error_kwh)">{{ signed(activeHour.error_kwh, 3) }} kWh</strong><small>{{ number(activeHour.solar_actual_wm2, 0) }} W/m²</small></article>
                </div>
                <p class="we-method-note">{{ copy.storyNote }}</p>
            </section>

            <section v-else-if="activeTab === 'impact' && impact" class="we-section">
                <header class="we-section-heading"><div><span>Weather Impact Explorer</span><h2>{{ copy.impactTitle }}</h2></div><div class="iq-segmented"><button v-for="days in [30, 90, 180]" :key="days" type="button" :class="{ active: impactDays === days }" @click="setImpactDays(days)">{{ days }} {{ copy.days }}</button></div></header>
                <h3>{{ copy.cloudGroups }}</h3>
                <div class="we-impact-grid">
                    <article v-for="group in impact.cloud_groups" :key="group.id" :class="{ unavailable: !group.available }">
                        <header><strong>{{ copy.groups[group.id] }}</strong><span>{{ group.points }} h · {{ group.days }} {{ copy.days }}</span></header>
                        <template v-if="group.available"><div class="we-impact-metrics"><span>{{ copy.mae }}<strong>{{ number(group.mae_kwh, 3) }} kWh</strong></span><span>{{ copy.bias }}<strong :class="signedClass(group.bias_kwh)">{{ signed(group.bias_kwh, 3) }} kWh</strong></span></div><small>{{ copy.best }}: {{ String(group.best_model || '–').toUpperCase() }}</small></template>
                        <p v-else>{{ copy.insufficient }} · {{ group.points }}/{{ group.minimum_points }}</p>
                    </article>
                </div>
                <h3>{{ copy.volatilityGroups }}</h3>
                <div class="we-impact-grid compact">
                    <article v-for="group in impact.volatility_groups" :key="group.id" :class="{ unavailable: !group.available }">
                        <header><strong>{{ copy.groups[group.id] }}</strong><span>{{ group.points }} h · {{ group.days }} {{ copy.days }}</span></header>
                        <template v-if="group.available"><div class="we-impact-metrics"><span>{{ copy.mae }}<strong>{{ number(group.mae_kwh, 3) }} kWh</strong></span><span>{{ copy.bias }}<strong :class="signedClass(group.bias_kwh)">{{ signed(group.bias_kwh, 3) }} kWh</strong></span></div></template>
                        <p v-else>{{ copy.insufficient }}</p>
                    </article>
                </div>
                <p class="we-method-note">{{ copy.storyNote }} · n ≥ {{ impact.minimum_points }}, {{ impact.minimum_days }} {{ copy.days }}.</p>
            </section>

            <section v-else-if="activeTab === 'compare' && comparable" class="we-section">
                <header class="we-section-heading"><div><span>Comparable Days</span><h2>{{ copy.compareTitle }}</h2></div><small>{{ copy.target }} · {{ date(comparable.target_date) }}</small></header>
                <div v-if="!comparable.available" class="we-empty-state"><strong>{{ copy.noCompare }}</strong><span>{{ comparable.candidate_days || 0 }} / {{ comparable.minimum_candidate_days || 14 }} {{ copy.days }}</span></div>
                <template v-else>
                    <div class="we-compare-layout">
                        <div class="we-day-list">
                            <button v-for="item in comparable.days" :key="item.date" type="button" :class="{ active: compareDate === item.date }" @click="selectComparable(item.date)" :aria-label="copy.select">
                                <span><strong>{{ date(item.date) }}</strong><small>{{ number(item.radiation_kwh_m2, 2) }} kWh/m² · {{ number(item.yield_kwh, 2) }} kWh</small></span>
                                <em>{{ number(item.similarity_percent) }}%</em>
                            </button>
                        </div>
                        <div ref="compareChart" class="we-compare-chart" role="img" :aria-label="copy.compareTitle"></div>
                    </div>
                    <div class="we-data-basis"><strong>{{ copy.similarity }}</strong><span>40% radiation · 25% profile · 15% clouds · 10% temperature · 10% daylight</span><small>{{ comparable.candidate_days }} {{ copy.days }} · SFML Database</small></div>
                </template>
            </section>
        </div>
    `,
    setup(props) {
        const locale = weLocale();
        const copy = WE_COPY[locale] || WE_COPY.en;
        const tabs = ["overview", "story", "impact", "compare"];
        const activeTab = weRef(tabs.includes(props.initialSection) ? props.initialSection : "overview");
        const selectedDate = weRef("");
        const latestDate = weRef("");
        const summary = weRef(null);
        const day = weRef(null);
        const impact = weRef(null);
        const comparable = weRef(null);
        const impactDays = weRef(90);
        const loading = weRef(true);
        const error = weRef("");
        const storyChart = weRef(null);
        const compareChart = weRef(null);
        const activeHourIndex = weRef(12);
        const compareDate = weRef("");
        let storyChartInstance = null;
        let compareChartInstance = null;

        const conditions = weComputed(() => summary.value?.solar_conditions || {});
        const production = weComputed(() => summary.value?.production || {});
        const conditionClass = weComputed(() => conditions.value.available ? `conditions-${conditions.value.class}` : "conditions-unavailable");
        const activeHour = weComputed(() => day.value?.hours?.[activeHourIndex.value] || null);
        const storySeries = weComputed(() => [
            { id: "solarActual", label: copy.series.solarActual }, { id: "solarForecast", label: copy.series.solarForecast },
            { id: "clearSky", label: copy.series.clearSky }, { id: "forecast", label: copy.series.forecast },
            { id: "actual", label: copy.series.actual }, { id: "clouds", label: copy.series.clouds }, { id: "sun", label: copy.series.sun },
        ]);
        const visibleSeries = weReactive({ solarActual: true, solarForecast: true, clearSky: true, forecast: true, actual: true, clouds: true, sun: false });

        function endpoint(path, params = {}) {
            const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ""));
            return `/api/sfml_stats/modern/weather-energy/${path}${query.size ? `?${query}` : ""}`;
        }

        async function loadOverview(force = false) {
            summary.value = await weFetch(endpoint("summary", { date: selectedDate.value }), force);
            selectedDate.value = summary.value?.date || selectedDate.value;
            latestDate.value = summary.value?.latest_available_date || latestDate.value;
        }

        async function loadDay(force = false) {
            day.value = await weFetch(endpoint("day", { date: selectedDate.value }), force);
            await weNextTick();
            renderStory();
        }

        async function loadImpact(force = false) {
            impact.value = await weFetch(endpoint("impact", { days: impactDays.value }), force);
        }

        async function loadComparable(force = false) {
            comparable.value = await weFetch(endpoint("comparable-days", { date: selectedDate.value }), force);
            compareDate.value = comparable.value?.days?.[0]?.date || "";
            await weNextTick();
            renderCompare();
        }

        async function loadActive(force = false) {
            loading.value = true;
            error.value = "";
            try {
                if (!summary.value || activeTab.value === "overview") await loadOverview(force);
                if (activeTab.value === "story") await loadDay(force);
                if (activeTab.value === "impact") await loadImpact(force);
                if (activeTab.value === "compare") await loadComparable(force);
            } catch (err) {
                console.error("[SFML Stats] Weather-energy analytics unavailable", err);
                error.value = copy.unavailable;
            } finally {
                loading.value = false;
                await weNextTick();
                if (activeTab.value === "story") renderStory();
                if (activeTab.value === "compare") renderCompare();
            }
        }

        async function selectTab(tab) {
            activeTab.value = tab;
            window.location.hash = `weather_energy/${tab}`;
            await loadActive();
        }

        async function changeDate() {
            summary.value = null; day.value = null; comparable.value = null;
            await loadActive(true);
        }

        async function setImpactDays(days) {
            impactDays.value = days;
            await loadImpact(true);
        }

        function chartText() {
            const styles = getComputedStyle(document.documentElement);
            return { text: styles.getPropertyValue("--text-secondary").trim() || "#718087", grid: styles.getPropertyValue("--border-default").trim() || "#d7dddf" };
        }

        function renderStory() {
            if (!storyChart.value || !day.value?.hours || !window.echarts) return;
            storyChartInstance ||= echarts.init(storyChart.value);
            const colors = chartText();
            const hours = day.value.hours.map((item) => `${String(item.hour).padStart(2, "0")}:00`);
            const series = [];
            const add = (id, name, field, xAxisIndex, yAxisIndex, color, type = "line", extra = {}) => {
                if (!visibleSeries[id]) return;
                series.push({ name, type, xAxisIndex, yAxisIndex, data: day.value.hours.map((item) => item[field]), connectNulls: false, showSymbol: false, symbolSize: 6, lineStyle: { width: 2, color }, itemStyle: { color }, ...extra });
            };
            add("solarActual", copy.series.solarActual, "solar_actual_wm2", 0, 0, "#d99820", "line", { areaStyle: { color: "rgba(217,152,32,.12)" } });
            add("solarForecast", copy.series.solarForecast, "solar_forecast_wm2", 0, 0, "#c47a20", "line", { lineStyle: { width: 2, type: "dashed", color: "#c47a20" } });
            add("clearSky", copy.series.clearSky, "clear_sky_wm2", 0, 0, "#8e9da3", "line", { lineStyle: { width: 1.5, type: "dotted", color: "#8e9da3" } });
            add("forecast", copy.series.forecast, "forecast_kwh", 1, 1, "#168f87");
            add("actual", copy.series.actual, "actual_kwh", 1, 1, "#2f8f5b", "line", { areaStyle: { color: "rgba(47,143,91,.10)" } });
            add("clouds", copy.series.clouds, "cloud_actual_percent", 2, 2, "#6b7f8c", "bar", { barMaxWidth: 18, itemStyle: { color: "rgba(107,127,140,.55)" } });
            add("sun", copy.series.sun, "sun_elevation_deg", 2, 3, "#d99820");
            storyChartInstance.setOption({
                animation: !matchMedia("(prefers-reduced-motion: reduce)").matches,
                tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
                axisPointer: { link: [{ xAxisIndex: "all" }] },
                legend: { show: false },
                grid: [{ left: 58, right: 24, top: 20, height: "25%" }, { left: 58, right: 24, top: "38%", height: "25%" }, { left: 58, right: 24, top: "72%", height: "18%" }],
                xAxis: [0, 1, 2].map((index) => ({ type: "category", gridIndex: index, data: hours, axisLabel: { show: index === 2, interval: 2, color: colors.text }, axisLine: { lineStyle: { color: colors.grid } }, axisPointer: { show: true } })),
                yAxis: [
                    { type: "value", gridIndex: 0, name: "W/m²", min: 0 },
                    { type: "value", gridIndex: 1, name: "kWh", min: 0 },
                    { type: "value", gridIndex: 2, name: "%", min: 0, max: 100 },
                    { type: "value", gridIndex: 2, name: "°", min: 0, max: 70, position: "right" },
                ],
                series,
            }, true);
            storyChartInstance.off("updateAxisPointer");
            storyChartInstance.on("updateAxisPointer", (event) => {
                const index = event.dataIndex ?? event.axesInfo?.[0]?.value;
                if (Number.isInteger(Number(index))) activeHourIndex.value = Number(index);
            });
        }

        function selectedComparable() {
            return comparable.value?.days?.find((item) => item.date === compareDate.value) || null;
        }

        function renderCompare() {
            const target = comparable.value?.target;
            const other = selectedComparable();
            if (!compareChart.value || !target || !other || !window.echarts) return;
            compareChartInstance ||= echarts.init(compareChart.value);
            const hours = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, "0")}:00`);
            compareChartInstance.setOption({
                animation: !matchMedia("(prefers-reduced-motion: reduce)").matches,
                tooltip: { trigger: "axis" }, legend: { top: 0 },
                grid: { left: 58, right: 22, top: 54, bottom: 42 },
                xAxis: { type: "category", data: hours, axisLabel: { interval: 2 } },
                yAxis: { type: "value", name: "W/m²", min: 0 },
                series: [
                    { name: weDate(target.date), type: "line", data: target.solar_profile, connectNulls: false, showSymbol: false, lineStyle: { width: 2.5, color: "#168f87" }, itemStyle: { color: "#168f87" } },
                    { name: weDate(other.date), type: "line", data: other.solar_profile, connectNulls: false, showSymbol: false, lineStyle: { width: 2, type: "dashed", color: "#c47a20" }, itemStyle: { color: "#c47a20" } },
                ],
            }, true);
        }

        function selectComparable(value) { compareDate.value = value; weNextTick(renderCompare); }
        function resizeCharts() { storyChartInstance?.resize(); compareChartInstance?.resize(); }
        function signedClass(value) { return Number(value) > 0 ? "is-positive" : Number(value) < 0 ? "is-negative" : ""; }
        function insightText(insight) {
            if (locale === "de") {
                if (insight.id === "largest_deviation") return ["Größte Stundenabweichung", insight.temporal_weather_coincidence ? `${String(insight.hour).padStart(2, "0")}:00 · ${weNumber(insight.absolute_error_kwh, 2)} kWh; gleichzeitig änderte sich die gespeicherte Strahlung um ${weSigned(insight.radiation_change_wm2, 0)} W/m².` : `${String(insight.hour).padStart(2, "0")}:00 · ${weNumber(insight.absolute_error_kwh, 2)} kWh.`];
                if (insight.id === "production_peak") return ["Produktionspeak", `${weNumber(insight.power_w, 0)} W um ${insight.time}.`];
                if (insight.id === "monthly_yield_rank") return ["Starker Monatstag", `Rang ${insight.rank} von ${insight.days} gespeicherten Tagen.`];
                if (insight.id === "missing_actual_hours") return ["Ist-Daten unvollständig", `${insight.hours} Forecast-Stunden ohne verwertbaren Ist-Wert.`];
                if (insight.id === "conditions_context") return ["Meteorologischer Kontext", `Solar Conditions ${weNumber(insight.score)} / 100 · ${copy.scoreClasses[insight.class]}.`];
            }
            if (insight.id === "largest_deviation") return ["Largest hourly deviation", `${String(insight.hour).padStart(2, "0")}:00 · ${weNumber(insight.absolute_error_kwh, 2)} kWh.`];
            if (insight.id === "production_peak") return ["Production peak", `${weNumber(insight.power_w, 0)} W at ${insight.time}.`];
            if (insight.id === "monthly_yield_rank") return ["Strong month day", `Rank ${insight.rank} of ${insight.days} stored days.`];
            if (insight.id === "missing_actual_hours") return ["Actual data incomplete", `${insight.hours} forecast hours have no usable actual value.`];
            return [copy.conditions, `${weNumber(insight.score)} / 100 · ${copy.scoreClasses[insight.class] || ""}`];
        }

        weWatch(() => props.initialSection, (value) => { if (tabs.includes(value) && value !== activeTab.value) selectTab(value); });
        weOnMounted(async () => { window.addEventListener("resize", resizeCharts); await loadActive(); });
        weOnUnmounted(() => { window.removeEventListener("resize", resizeCharts); storyChartInstance?.dispose(); compareChartInstance?.dispose(); });
        return { copy, tabs, activeTab, selectedDate, latestDate, summary, day, impact, comparable, impactDays, loading, error, conditions, production, conditionClass, activeHour, storySeries, visibleSeries, storyChart, compareChart, compareDate, loadActive, selectTab, changeDate, setImpactDays, renderStory, selectComparable, number: weNumber, signed: weSigned, date: weDate, signedClass, insightText };
    },
};
