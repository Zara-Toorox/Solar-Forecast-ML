// Weather Page — SFML Stats TFS V.20
// (C) 2026 Zara-Toorox

const WeatherPage = ((Vue) => {
const { ref, reactive, computed, onMounted, onUnmounted, nextTick } = Vue;

const WEATHER_ICONS = {
    'clear-night': '\u{1F319}', 'sunny': '\u{2600}', 'clear': '\u{2600}',
    'partlycloudy': '\u{26C5}', 'cloudy': '\u{2601}', 'rainy': '\u{1F327}',
    'pouring': '\u{1F327}', 'snowy': '\u{2744}', 'snowy-rainy': '\u{1F328}',
    'windy': '\u{1F4A8}', 'windy-variant': '\u{1F4A8}', 'fog': '\u{1F32B}',
    'hail': '\u{1F32B}', 'lightning': '\u{26A1}', 'lightning-rainy': '\u{26A1}',
    'exceptional': '\u{26A0}',
};

const _WeatherPage = {
    props: ['liveData', 'config'],

    template: `
        <div class="page page-weather">
            <div class="section-header">
                <h2 class="section-title">Wetter</h2>
                <span v-if="lastUpdated" class="weather-updated">Stand: {{ lastUpdated }}</span>
            </div>

            <!-- ================= CARD 1: CURRENT WEATHER (HERO) ================= -->
            <div class="chart-card weather-hero">
                <div class="weather-hero-main">
                    <div class="weather-hero-icon">{{ weatherIcon }}</div>
                    <div class="weather-hero-core">
                        <div class="weather-hero-temp">
                            {{ fmt(current.temperature, 1) }}<span class="weather-hero-unit">°C</span>
                        </div>
                        <div class="weather-hero-condition">{{ conditionText }}</div>
                        <div class="weather-hero-feels">
                            gefuehlt {{ fmt(current.feels_like, 1) }}°C
                        </div>
                    </div>
                    <div class="weather-hero-badge" :class="'potential-' + (current.solar_potential || 'none')">
                        <div class="potential-label">Solar-Potenzial</div>
                        <div class="potential-value">{{ potentialText }}</div>
                    </div>
                </div>

                <div class="weather-stats-grid">
                    <div class="weather-stat">
                        <div class="weather-stat-icon">\u{2601}</div>
                        <div class="weather-stat-value">{{ fmt(current.cloud_cover, 0) }}<span class="weather-stat-unit">%</span></div>
                        <div class="weather-stat-label">Bewoelkung</div>
                    </div>
                    <div class="weather-stat">
                        <div class="weather-stat-icon">\u{1F4A8}</div>
                        <div class="weather-stat-value">{{ fmt(current.wind_speed, 1) }}<span class="weather-stat-unit">km/h</span></div>
                        <div class="weather-stat-label">Wind</div>
                    </div>
                    <div class="weather-stat">
                        <div class="weather-stat-icon">\u{1F4A7}</div>
                        <div class="weather-stat-value">{{ fmt(current.humidity, 0) }}<span class="weather-stat-unit">%</span></div>
                        <div class="weather-stat-label">Luftfeuchte</div>
                    </div>
                    <div class="weather-stat">
                        <div class="weather-stat-icon">\u{1F321}</div>
                        <div class="weather-stat-value">{{ fmt(current.dewpoint, 1) }}<span class="weather-stat-unit">°C</span></div>
                        <div class="weather-stat-label">Taupunkt</div>
                    </div>
                    <div class="weather-stat">
                        <div class="weather-stat-icon">\u{1F4CF}</div>
                        <div class="weather-stat-value">{{ fmt(current.pressure, 0) }}<span class="weather-stat-unit">hPa</span></div>
                        <div class="weather-stat-label">Druck {{ pressureArrow }}</div>
                    </div>
                    <div class="weather-stat">
                        <div class="weather-stat-icon">\u{1F441}</div>
                        <div class="weather-stat-value">{{ fmtVisibility }}<span class="weather-stat-unit">km</span></div>
                        <div class="weather-stat-label">Sichtweite</div>
                    </div>
                    <div class="weather-stat">
                        <div class="weather-stat-icon">\u{2600}</div>
                        <div class="weather-stat-value">{{ fmt(current.solar_radiation_wm2, 0) }}<span class="weather-stat-unit">W/m²</span></div>
                        <div class="weather-stat-label">Einstrahlung</div>
                    </div>
                    <div class="weather-stat">
                        <div class="weather-stat-icon">\u{1F327}</div>
                        <div class="weather-stat-value">{{ fmt(current.precipitation_mm, 1) }}<span class="weather-stat-unit">mm</span></div>
                        <div class="weather-stat-label">Niederschlag</div>
                    </div>
                </div>
            </div>

            <!-- ================= CARD 2: 72h FORECAST ================= -->
            <div class="chart-card">
                <div class="chart-header">
                    <span class="chart-title">\u{1F4C8} SFML AI Weather Forecast 72h</span>
                    <span class="chart-subtitle">Temp · Cloud · Niederschlag · Wind</span>
                </div>
                <div ref="forecastChartEl" class="weather-chart" style="height: 340px;"></div>
            </div>

            <!-- ================= CARD 3: SOLAR RADIATION (FULL WIDTH) ================= -->
            <div class="chart-card">
                <div class="chart-header">
                    <span class="chart-title">\u{2600} Solar-Strahlung heute</span>
                    <span class="chart-subtitle">GHI · DNI · DHI vs. Forecast</span>
                </div>
                <div ref="radiationChartEl" class="weather-chart" style="height: 360px;"></div>
                <div class="weather-legend" v-if="radiationKpis">
                    <span class="legend-item"><span class="legend-dot" style="background:#fbbf24"></span> GHI Peak: {{ radiationKpis.ghi_peak }} W/m²</span>
                    <span class="legend-item"><span class="legend-dot" style="background:#f97316"></span> DNI Peak: {{ radiationKpis.dni_peak }} W/m²</span>
                    <span class="legend-item"><span class="legend-dot" style="background:#60a5fa"></span> DHI Peak: {{ radiationKpis.dhi_peak }} W/m²</span>
                </div>
            </div>

            <!-- ================= ROW B: 2-COL (CLOTHING + ASTRONOMY) ================= -->
            <div class="weather-row-2col">
                <div class="chart-card">
                    <div class="chart-header">
                        <span class="chart-title">\u{1F455} Kleidungsempfehlung</span>
                        <span class="chart-subtitle">{{ clothing.label || '' }}</span>
                    </div>
                    <div v-if="!clothing.available" class="empty-state">
                        Keine aktuellen Wetterdaten verfuegbar.
                    </div>
                    <div v-else>
                        <p class="clothing-text">{{ clothing.description }}</p>
                        <div class="clothing-grid">
                            <div v-if="clothing.bottom" class="clothing-item">
                                <div class="clothing-icon">\u{1F456}</div>
                                <div class="clothing-name">{{ clothing.bottom }}</div>
                                <div class="clothing-label">Hose</div>
                            </div>
                            <div v-if="clothing.top" class="clothing-item">
                                <div class="clothing-icon">\u{1F455}</div>
                                <div class="clothing-name">{{ clothing.top }}</div>
                                <div class="clothing-label">Oberteil</div>
                            </div>
                            <div v-if="clothing.jacket" class="clothing-item">
                                <div class="clothing-icon">\u{1F9E5}</div>
                                <div class="clothing-name">{{ clothing.jacket }}</div>
                                <div class="clothing-label">Jacke</div>
                            </div>
                            <div v-if="clothing.headwear" class="clothing-item">
                                <div class="clothing-icon">\u{1F3A9}</div>
                                <div class="clothing-name">{{ clothing.headwear }}</div>
                                <div class="clothing-label">Kopf</div>
                            </div>
                        </div>
                        <div v-if="clothing.extras && clothing.extras.length" class="clothing-extras">
                            <span v-for="x in clothing.extras" :key="x" class="clothing-extra-chip">{{ x }}</span>
                        </div>
                    </div>
                </div>

                <div class="chart-card">
                    <div class="chart-header">
                        <span class="chart-title">\u{1F30C} Astronomie</span>
                        <span class="chart-subtitle">Sonne · Mond · Geometrie</span>
                    </div>
                    <div class="astro-grid">
                        <div class="astro-item">
                            <div class="astro-icon">\u{1F305}</div>
                            <div class="astro-value">{{ formatTime(astronomy.sunrise) }}</div>
                            <div class="astro-label">Sonnenaufgang</div>
                        </div>
                        <div class="astro-item">
                            <div class="astro-icon">\u{1F307}</div>
                            <div class="astro-value">{{ formatTime(astronomy.sunset) }}</div>
                            <div class="astro-label">Sonnenuntergang</div>
                        </div>
                        <div class="astro-item">
                            <div class="astro-icon">\u{2600}</div>
                            <div class="astro-value">{{ dayLengthText }}</div>
                            <div class="astro-label">Tageslaenge <span v-if="astronomy.day_length_delta_min != null" :class="astronomy.day_length_delta_min > 0 ? 'delta-up' : 'delta-down'">{{ astronomy.day_length_delta_min > 0 ? '+' : '' }}{{ astronomy.day_length_delta_min }} min</span></div>
                        </div>
                        <div class="astro-item">
                            <div class="astro-icon">\u{1F31E}</div>
                            <div class="astro-value">{{ fmt(astronomy.max_elevation_deg, 1) }}°</div>
                            <div class="astro-label">Max. Sonnenhoehe</div>
                        </div>
                        <div class="astro-item">
                            <div class="astro-icon">{{ moonIcon }}</div>
                            <div class="astro-value">{{ astronomy.moon_phase || '--' }}</div>
                            <div class="astro-label">Mondphase</div>
                        </div>
                        <div class="astro-item">
                            <div class="astro-icon">\u{1F319}</div>
                            <div class="astro-value">{{ fmt(astronomy.moon_illumination, 0) }}%</div>
                            <div class="astro-label">Beleuchtung</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ================= CARD 7: HISTORY ================= -->
            <div class="chart-card">
                <div class="chart-header">
                    <span class="chart-title">\u{1F4C5} Wetter-Historie</span>
                    <div class="history-tabs">
                        <button v-for="tab in historyTabs" :key="tab.id"
                                class="history-tab"
                                :class="{active: historyTab === tab.id}"
                                @click="setHistoryTab(tab.id)">{{ tab.label }}</button>
                    </div>
                </div>
                <div v-if="!history.data.length" class="empty-state">
                    Historiendaten werden geladen...
                </div>
                <div v-else>
                    <div class="history-kpis">
                        <div class="history-kpi">
                            <div class="history-kpi-value">{{ fmt(history.stats.avgTemp, 1) }}°C</div>
                            <div class="history-kpi-label">Ø Temperatur</div>
                        </div>
                        <div class="history-kpi">
                            <div class="history-kpi-value" style="color:#ef4444;">{{ fmt(history.stats.maxTemp, 1) }}°C</div>
                            <div class="history-kpi-label">Max</div>
                        </div>
                        <div class="history-kpi">
                            <div class="history-kpi-value" style="color:#60a5fa;">{{ fmt(history.stats.minTemp, 1) }}°C</div>
                            <div class="history-kpi-label">Min</div>
                        </div>
                        <div class="history-kpi">
                            <div class="history-kpi-value" style="color:#3b82f6;">{{ fmt(history.stats.totalRain, 1) }} mm</div>
                            <div class="history-kpi-label">Niederschlag</div>
                        </div>
                        <div class="history-kpi">
                            <div class="history-kpi-value" style="color:#10b981;">{{ fmt(history.stats.avgWind, 1) }} m/s</div>
                            <div class="history-kpi-label">Ø Wind</div>
                        </div>
                        <div class="history-kpi">
                            <div class="history-kpi-value" style="color:#fbbf24;">{{ fmt(history.stats.sunHours, 0) }} h</div>
                            <div class="history-kpi-label">Sonnenstd.</div>
                        </div>
                    </div>
                    <div ref="historyChartEl" class="weather-chart" style="height: 340px; margin-top: var(--space-md);"></div>
                </div>
            </div>
        </div>
    `,

    setup() {
        const current = reactive({
            temperature: null, feels_like: null, humidity: null,
            wind_speed: null, pressure: null, pressure_trend: null,
            visibility_km: null, cloud_cover: null, precipitation_mm: null,
            condition: null, dewpoint: null, solar_radiation_wm2: null,
            solar_potential: null, timestamp: null,
        });
        const forecast = ref([]);
        const radiation = reactive({ actual: [], forecast: [], clear_sky: [] });
        const clothing = reactive({ available: false });
        const astronomy = reactive({ sunrise: null, sunset: null, day_length_min: null, day_length_delta_min: null, max_elevation_deg: null, moon_phase: null, moon_illumination: null });
        const history = reactive({ data: [], stats: {} });
        const historyTab = ref('week');
        const historyTabs = [
            { id: 'week', label: 'Woche' },
            { id: 'month', label: 'Monat' },
            { id: 'year', label: 'Jahr' },
        ];
        const lastUpdated = ref('');

        const forecastChartEl = ref(null);
        const radiationChartEl = ref(null);
        const historyChartEl = ref(null);
        let forecastChart = null, radiationChart = null, historyChart = null;

        // Helpers ------------------------------------------------------
        function fmt(v, digits = 1) {
            if (v == null || v === '' || Number.isNaN(Number(v))) return '--';
            return Number(v).toFixed(digits);
        }
        function formatTime(iso) {
            if (!iso) return '--';
            try {
                const d = new Date(iso);
                if (Number.isNaN(d.getTime())) return String(iso);
                return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            } catch (e) { return String(iso); }
        }
        const weatherIcon = computed(() => WEATHER_ICONS[current.condition] || '\u{2601}');
        const conditionText = computed(() => {
            const map = {
                'clear-night': 'Klar', 'sunny': 'Sonnig', 'clear': 'Klar',
                'partlycloudy': 'Teils bewoelkt', 'cloudy': 'Bewoelkt',
                'rainy': 'Regen', 'pouring': 'Starkregen', 'snowy': 'Schnee',
                'snowy-rainy': 'Schneeregen', 'windy': 'Windig', 'fog': 'Nebel',
                'hail': 'Hagel', 'lightning': 'Gewitter', 'lightning-rainy': 'Gewitter + Regen',
                'exceptional': 'Ausnahme',
            };
            return map[current.condition] || current.condition || '--';
        });
        const potentialText = computed(() => {
            const m = { good: 'Gut', medium: 'Mittel', poor: 'Gering', none: '--' };
            return m[current.solar_potential] || '--';
        });
        const pressureArrow = computed(() => {
            if (current.pressure_trend === 'rising') return '\u{2191}';
            if (current.pressure_trend === 'falling') return '\u{2193}';
            if (current.pressure_trend === 'steady') return '\u{2192}';
            return '';
        });
        const fmtVisibility = computed(() => {
            if (current.visibility_km == null) return '--';
            return Number(current.visibility_km).toFixed(1);
        });
        const dayLengthText = computed(() => {
            if (!astronomy.day_length_min) return '--';
            const h = Math.floor(astronomy.day_length_min / 60);
            const m = Math.round(astronomy.day_length_min % 60);
            return `${h}h ${m}m`;
        });
        const moonIcon = computed(() => {
            const phase = (astronomy.moon_phase || '').toLowerCase();
            if (phase.includes('neumond') || phase.includes('new')) return '\u{1F311}';
            if (phase.includes('zunehmende sichel') || (phase.includes('waxing') && phase.includes('crescent'))) return '\u{1F312}';
            if (phase.includes('erstes viertel') || phase.includes('first')) return '\u{1F313}';
            if (phase.includes('zunehmender mond') || (phase.includes('waxing') && phase.includes('gibbous'))) return '\u{1F314}';
            if (phase.includes('vollmond') || phase.includes('full')) return '\u{1F315}';
            if (phase.includes('abnehmender mond') || (phase.includes('waning') && phase.includes('gibbous'))) return '\u{1F316}';
            if (phase.includes('letztes viertel') || phase.includes('last')) return '\u{1F317}';
            if (phase.includes('abnehmende sichel') || (phase.includes('waning') && phase.includes('crescent'))) return '\u{1F318}';
            return '\u{1F319}';
        });
        const radiationKpis = computed(() => {
            const src = radiation.forecast.length ? radiation.forecast : radiation.actual;
            if (!src.length) return null;
            return {
                ghi_peak: Math.round(Math.max(...src.map(r => r.ghi || 0))),
                dni_peak: Math.round(Math.max(...(radiation.forecast.map(r => r.dni || 0) || [0]))),
                dhi_peak: Math.round(Math.max(...(radiation.forecast.map(r => r.dhi || 0) || [0]))),
            };
        });

        // Charts -------------------------------------------------------
        function renderForecastChart() {
            if (!forecastChartEl.value || !forecast.value.length) return;
            if (!forecastChart) forecastChart = echarts.init(forecastChartEl.value, 'dark');

            const labels = forecast.value.map(r => {
                const parts = r.time.split(' ');
                const h = parts[1] ? parts[1].slice(0, 5) : '';
                return h;
            });
            const xDates = forecast.value.map(r => r.time.split(' ')[0]);
            // Add day separator
            const dayLabels = labels.map((h, i) => {
                if (i === 0 || xDates[i] !== xDates[i - 1]) {
                    const d = new Date(xDates[i]);
                    return `${h}\n${d.toLocaleDateString('de-DE', { weekday: 'short' })}`;
                }
                return h;
            });

            forecastChart.setOption({
                backgroundColor: 'transparent',
                grid: { left: 55, right: 55, top: 30, bottom: 40 },
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: 'rgba(15,23,42,0.95)',
                    borderColor: '#334155',
                    textStyle: { color: '#e2e8f0' },
                },
                legend: {
                    data: ['Temperatur', 'Bewoelkung', 'Niederschlag', 'Wind'],
                    top: 0, textStyle: { color: '#cbd5e1' },
                },
                xAxis: {
                    type: 'category',
                    data: dayLabels,
                    axisLabel: { color: '#94a3b8', interval: 2, fontSize: 10 },
                    axisLine: { lineStyle: { color: '#334155' } },
                },
                yAxis: [
                    { type: 'value', name: '°C', position: 'left', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b' } } },
                    { type: 'value', name: '%', position: 'right', max: 100, axisLabel: { color: '#94a3b8' }, splitLine: { show: false } },
                ],
                series: [
                    {
                        name: 'Temperatur', type: 'line', yAxisIndex: 0,
                        data: forecast.value.map(r => r.temperature),
                        smooth: true, symbol: 'none',
                        lineStyle: { color: '#ef4444', width: 2 },
                        itemStyle: { color: '#ef4444' },
                    },
                    {
                        name: 'Bewoelkung', type: 'line', yAxisIndex: 1,
                        data: forecast.value.map(r => r.cloud_cover),
                        smooth: true, symbol: 'none',
                        areaStyle: { color: 'rgba(148,163,184,0.25)' },
                        lineStyle: { color: '#94a3b8', width: 1 },
                        itemStyle: { color: '#94a3b8' },
                    },
                    {
                        name: 'Niederschlag', type: 'bar', yAxisIndex: 0,
                        data: forecast.value.map(r => r.rain),
                        itemStyle: { color: '#3b82f6' },
                        barWidth: 4,
                    },
                    {
                        name: 'Wind', type: 'line', yAxisIndex: 0,
                        data: forecast.value.map(r => r.wind),
                        smooth: true, symbol: 'none',
                        lineStyle: { color: '#10b981', width: 1, type: 'dashed' },
                        itemStyle: { color: '#10b981' },
                    },
                ],
            });
            forecastChart.resize();
        }

        function renderRadiationChart() {
            if (!radiationChartEl.value) return;
            if (!radiationChart) radiationChart = echarts.init(radiationChartEl.value, 'dark');

            const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
            const actualMap = new Map(radiation.actual.map(r => [r.hour, r.ghi]));
            const fcMap = new Map(radiation.forecast.map(r => [r.hour, r]));
            const csMap = new Map(radiation.clear_sky.map(r => [r.hour, r.ghi]));

            radiationChart.setOption({
                backgroundColor: 'transparent',
                grid: { left: 55, right: 20, top: 30, bottom: 40 },
                tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.95)', borderColor: '#334155', textStyle: { color: '#e2e8f0' } },
                legend: { data: ['GHI Ist', 'GHI Forecast', 'DNI', 'DHI', 'Clear Sky'], top: 0, textStyle: { color: '#cbd5e1' } },
                xAxis: { type: 'category', data: hours, axisLabel: { color: '#94a3b8', fontSize: 10, interval: 2 }, axisLine: { lineStyle: { color: '#334155' } } },
                yAxis: { type: 'value', name: 'W/m²', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b' } } },
                series: [
                    csMap.size > 0 ? {
                        name: 'Clear Sky', type: 'line',
                        data: hours.map((_, h) => csMap.get(h) ?? null),
                        smooth: true, symbol: 'none',
                        lineStyle: { color: '#6b7280', type: 'dotted', width: 1 },
                        itemStyle: { color: '#6b7280' },
                    } : null,
                    {
                        name: 'GHI Forecast', type: 'line',
                        data: hours.map((_, h) => fcMap.get(h)?.ghi ?? null),
                        smooth: true, symbol: 'none',
                        lineStyle: { color: '#fbbf24', width: 1, type: 'dashed' },
                        itemStyle: { color: '#fbbf24' },
                    },
                    {
                        name: 'GHI Ist', type: 'line',
                        data: hours.map((_, h) => actualMap.get(h) ?? null),
                        smooth: true, symbol: 'circle', symbolSize: 5,
                        lineStyle: { color: '#fbbf24', width: 2 },
                        itemStyle: { color: '#fbbf24' },
                        areaStyle: { color: 'rgba(251,191,36,0.15)' },
                    },
                    {
                        name: 'DNI', type: 'line',
                        data: hours.map((_, h) => fcMap.get(h)?.dni ?? null),
                        smooth: true, symbol: 'none',
                        lineStyle: { color: '#f97316', width: 1 },
                        itemStyle: { color: '#f97316' },
                    },
                    {
                        name: 'DHI', type: 'line',
                        data: hours.map((_, h) => fcMap.get(h)?.dhi ?? null),
                        smooth: true, symbol: 'none',
                        lineStyle: { color: '#60a5fa', width: 1 },
                        itemStyle: { color: '#60a5fa' },
                    },
                ].filter(Boolean),
            });
            radiationChart.resize();
        }

        function renderHistoryChart() {
            if (!historyChartEl.value || !history.data.length) return;
            if (!historyChart) historyChart = echarts.init(historyChartEl.value, 'dark');

            const dates = history.data.map(d => d.date);
            historyChart.setOption({
                backgroundColor: 'transparent',
                grid: { left: 55, right: 55, top: 30, bottom: 40 },
                tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.95)', borderColor: '#334155', textStyle: { color: '#e2e8f0' } },
                legend: { data: ['Temp Ø', 'Temp Max', 'Temp Min', 'Niederschlag'], top: 0, textStyle: { color: '#cbd5e1' } },
                xAxis: { type: 'category', data: dates, axisLabel: { color: '#94a3b8', fontSize: 10 }, axisLine: { lineStyle: { color: '#334155' } } },
                yAxis: [
                    { type: 'value', name: '°C', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b' } } },
                    { type: 'value', name: 'mm', position: 'right', axisLabel: { color: '#94a3b8' }, splitLine: { show: false } },
                ],
                series: [
                    { name: 'Temp Max', type: 'line', data: history.data.map(d => d.temp_max), smooth: true, symbol: 'none', lineStyle: { color: '#ef4444', width: 1 }, itemStyle: { color: '#ef4444' } },
                    { name: 'Temp Ø', type: 'line', data: history.data.map(d => d.temp_avg), smooth: true, symbol: 'none', lineStyle: { color: '#fbbf24', width: 2 }, itemStyle: { color: '#fbbf24' } },
                    { name: 'Temp Min', type: 'line', data: history.data.map(d => d.temp_min), smooth: true, symbol: 'none', lineStyle: { color: '#60a5fa', width: 1 }, itemStyle: { color: '#60a5fa' } },
                    { name: 'Niederschlag', type: 'bar', yAxisIndex: 1, data: history.data.map(d => d.rain), itemStyle: { color: '#3b82f6' }, barWidth: 6 },
                ],
            });
            historyChart.resize();
        }

        // Data loading -------------------------------------------------
        async function loadDashboard() {
            try {
                const res = await SFMLApi.fetch('/api/sfml_stats/weather/dashboard', { forceRefresh: true });
                if (!res || !res.success) return;
                Object.assign(current, res.current || {});
                forecast.value = res.forecast || [];
                Object.assign(radiation, res.radiation || {});
                Object.assign(clothing, res.clothing || { available: false });
                Object.assign(astronomy, res.astronomy || {});
                lastUpdated.value = new Date().toLocaleTimeString('de-DE');

                await nextTick();
                renderForecastChart();
                renderRadiationChart();
            } catch (e) {
                console.error('Weather dashboard load error:', e);
            }
        }

        async function loadHistory() {
            try {
                const res = await SFMLApi.fetch('/api/sfml_stats/weather_history', { forceRefresh: true });
                if (!res || !res.success) return;
                const all = (res.data || []).slice().sort((a, b) => a.date.localeCompare(b.date));
                const days = historyTab.value === 'week' ? 7 : historyTab.value === 'month' ? 30 : 365;
                const slice = all.slice(-days);
                history.data = slice;
                history.stats = computeHistoryStats(slice);

                await nextTick();
                renderHistoryChart();
            } catch (e) {
                console.error('Weather history load error:', e);
            }
        }

        function computeHistoryStats(data) {
            if (!data.length) return {};
            const temps = data.map(d => d.temp_avg).filter(v => v != null);
            const maxs = data.map(d => d.temp_max).filter(v => v != null);
            const mins = data.map(d => d.temp_min).filter(v => v != null);
            const winds = data.map(d => d.wind_avg).filter(v => v != null);
            const rains = data.map(d => d.rain_total).filter(v => v != null);
            const suns = data.map(d => d.sun_hours || 0);
            return {
                avgTemp: temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : null,
                maxTemp: maxs.length ? Math.max(...maxs) : null,
                minTemp: mins.length ? Math.min(...mins) : null,
                totalRain: rains.reduce((a, b) => a + b, 0),
                avgWind: winds.length ? winds.reduce((a, b) => a + b, 0) / winds.length : null,
                sunHours: suns.reduce((a, b) => a + b, 0),
            };
        }

        function setHistoryTab(id) {
            historyTab.value = id;
            loadHistory();
        }

        // Lifecycle ----------------------------------------------------
        let pollInterval = null;
        onMounted(() => {
            loadDashboard();
            loadHistory();
            pollInterval = setInterval(loadDashboard, 60000);
            window.addEventListener('resize', handleResize);
        });
        onUnmounted(() => {
            if (pollInterval) clearInterval(pollInterval);
            window.removeEventListener('resize', handleResize);
            if (forecastChart) { forecastChart.dispose(); forecastChart = null; }
            if (radiationChart) { radiationChart.dispose(); radiationChart = null; }
            if (historyChart) { historyChart.dispose(); historyChart = null; }
        });
        function handleResize() {
            forecastChart?.resize();
            radiationChart?.resize();
            historyChart?.resize();
        }

        return {
            current, forecast, radiation, clothing, astronomy, history,
            historyTab, historyTabs, lastUpdated,
            forecastChartEl, radiationChartEl, historyChartEl,
            weatherIcon, conditionText, potentialText, pressureArrow, fmtVisibility,
            dayLengthText, moonIcon, radiationKpis,
            fmt, formatTime,
            setHistoryTab,
        };
    },
};

// Page-specific styles
(() => {
    if (document.getElementById('weather-page-styles')) return;
    const style = document.createElement('style');
    style.id = 'weather-page-styles';
    style.textContent = `
        .page-weather { padding: var(--space-lg); max-width: 1600px; margin: 0 auto; }
        .weather-updated { font-size: 0.8rem; color: var(--text-muted); margin-left: var(--space-md); }

        .weather-hero { margin-bottom: var(--space-lg); padding: var(--space-lg); }
        .weather-hero-main {
            display: grid;
            grid-template-columns: auto 1fr auto;
            gap: var(--space-lg);
            align-items: center;
            padding-bottom: var(--space-lg);
            border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .weather-hero-icon { font-size: 4rem; line-height: 1; }
        .weather-hero-temp {
            font-size: 4rem; font-weight: 700;
            font-family: var(--font-mono);
            line-height: 1; color: var(--text-primary);
        }
        .weather-hero-unit { font-size: 1.8rem; color: var(--text-muted); font-weight: 400; }
        .weather-hero-condition { font-size: 1.2rem; color: var(--text-secondary); margin-top: 4px; }
        .weather-hero-feels { font-size: 0.85rem; color: var(--text-muted); margin-top: 2px; }
        .weather-hero-badge {
            padding: var(--space-md) var(--space-lg);
            border-radius: 12px;
            text-align: center;
            min-width: 140px;
            border: 1px solid rgba(255,255,255,0.08);
        }
        .potential-label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; }
        .potential-value { font-size: 1.4rem; font-weight: 700; margin-top: 4px; }
        .potential-good { background: rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.4); }
        .potential-good .potential-value { color: #10b981; }
        .potential-medium { background: rgba(251,191,36,0.12); border-color: rgba(251,191,36,0.4); }
        .potential-medium .potential-value { color: #fbbf24; }
        .potential-poor { background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.4); }
        .potential-poor .potential-value { color: #ef4444; }
        .potential-none .potential-value { color: var(--text-muted); }

        .weather-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: var(--space-md);
            margin-top: var(--space-lg);
        }
        .weather-stat {
            padding: var(--space-md);
            background: rgba(255,255,255,0.03);
            border-radius: 8px;
            text-align: center;
        }
        .weather-stat-icon { font-size: 1.2rem; margin-bottom: 4px; opacity: 0.8; }
        .weather-stat-value {
            font-size: 1.4rem;
            font-family: var(--font-mono);
            font-weight: 600;
            color: var(--text-primary);
        }
        .weather-stat-unit { font-size: 0.8rem; color: var(--text-muted); font-weight: 400; margin-left: 2px; }
        .weather-stat-label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }

        .weather-row-2col {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: var(--space-lg);
            margin-bottom: var(--space-lg);
        }
        @media (max-width: 1023px) {
            .weather-row-2col { grid-template-columns: 1fr; }
        }

        .chart-card { margin-bottom: var(--space-lg); }
        .chart-subtitle { font-size: 0.8rem; color: var(--text-muted); margin-left: var(--space-sm); }
        .weather-chart { width: 100%; }
        .weather-legend {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-md);
            padding-top: var(--space-sm);
            border-top: 1px solid rgba(255,255,255,0.05);
            font-size: 0.8rem;
            color: var(--text-secondary);
            font-family: var(--font-mono);
        }
        .legend-item { display: inline-flex; align-items: center; gap: 6px; }
        .legend-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }

        .clothing-text {
            color: var(--text-secondary);
            font-size: 0.9rem;
            line-height: 1.5;
            margin: 0 0 var(--space-md);
            padding: var(--space-sm);
            background: rgba(255,255,255,0.03);
            border-radius: 6px;
        }
        .clothing-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: var(--space-sm);
        }
        .clothing-item {
            text-align: center;
            padding: var(--space-md) var(--space-sm);
            background: rgba(255,255,255,0.03);
            border-radius: 8px;
        }
        .clothing-icon { font-size: 2rem; }
        .clothing-name { font-weight: 600; margin-top: 6px; font-size: 0.85rem; }
        .clothing-label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; }
        .clothing-extras { margin-top: var(--space-md); display: flex; flex-wrap: wrap; gap: 6px; }
        .clothing-extra-chip {
            padding: 4px 10px;
            background: rgba(236,72,153,0.12);
            color: #ec4899;
            border-radius: 12px;
            font-size: 0.8rem;
            border: 1px solid rgba(236,72,153,0.3);
        }

        .astro-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
            gap: var(--space-md);
        }
        .astro-item {
            text-align: center;
            padding: var(--space-md) var(--space-sm);
            background: rgba(255,255,255,0.03);
            border-radius: 8px;
        }
        .astro-icon { font-size: 1.6rem; }
        .astro-value { font-family: var(--font-mono); font-size: 1.1rem; font-weight: 600; margin-top: 4px; color: var(--text-primary); }
        .astro-label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; margin-top: 4px; }
        .delta-up { color: #10b981; }
        .delta-down { color: #ef4444; }

        .history-tabs { display: inline-flex; gap: 4px; margin-left: auto; }
        .history-tab {
            padding: 6px 14px;
            background: transparent;
            border: 1px solid rgba(255,255,255,0.1);
            color: var(--text-muted);
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.85rem;
            transition: all 0.15s;
        }
        .history-tab:hover { color: var(--text-primary); border-color: rgba(0,212,255,0.4); }
        .history-tab.active {
            background: rgba(0,212,255,0.12);
            color: var(--accent);
            border-color: var(--accent);
        }
        .history-kpis {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
            gap: var(--space-md);
        }
        .history-kpi {
            text-align: center;
            padding: var(--space-md) var(--space-sm);
            background: rgba(255,255,255,0.03);
            border-radius: 8px;
        }
        .history-kpi-value { font-family: var(--font-mono); font-size: 1.4rem; font-weight: 700; color: var(--text-primary); }
        .history-kpi-label { font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; margin-top: 4px; letter-spacing: 0.05em; }

        @media (max-width: 768px) {
            .weather-hero-main {
                grid-template-columns: auto 1fr;
            }
            .weather-hero-badge { grid-column: 1 / -1; margin-top: var(--space-sm); }
            .weather-hero-temp { font-size: 3rem; }
            .weather-hero-icon { font-size: 3rem; }
        }
    `;
    document.head.appendChild(style);
})();

return _WeatherPage;
})(Vue);

window.WeatherPage = WeatherPage;
