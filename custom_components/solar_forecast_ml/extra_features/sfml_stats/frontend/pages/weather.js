// Weather Page — SFML Stats TFS V.20
// (C) 2026 Zara-Toorox

const WeatherPage = ((Vue) => {
const { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } = Vue;

function getThemeColor(varName, fallback) {
    try {
        const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
        return val || fallback;
    } catch (e) {
        return fallback;
    }
}

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
                <h2 class="section-title">{{ $t('nav.weather') }}</h2>
                <span v-if="lastUpdated" class="weather-updated">{{ $t('common.status') }}: {{ lastUpdated }}</span>
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
                            {{ $t('weather.feelsLike') }} {{ fmt(current.feels_like, 1) }}°C
                        </div>
                    </div>
                    <div class="weather-hero-badge" :class="'potential-' + (current.solar_potential || 'none')">
                        <div class="potential-label">{{ $t('weather.solarPotential') }}</div>
                        <div class="potential-value">{{ potentialText }}</div>
                    </div>
                </div>

                <div class="weather-stats-grid">
                    <div class="weather-stat">
                        <div class="weather-stat-icon">\u{2601}</div>
                        <div class="weather-stat-value">{{ fmt(current.cloud_cover, 0) }}<span class="weather-stat-unit">%</span></div>
                        <div class="weather-stat-label">{{ $t('weather.cloudCover') }}</div>
                    </div>
                    <div class="weather-stat">
                        <div class="weather-stat-icon">\u{1F4A8}</div>
                        <div class="weather-stat-value">{{ fmt(current.wind_speed, 1) }}<span class="weather-stat-unit">km/h</span></div>
                        <div class="weather-stat-label">{{ $t('weather.wind') }}</div>
                    </div>
                    <div class="weather-stat">
                        <div class="weather-stat-icon">\u{1F4A7}</div>
                        <div class="weather-stat-value">{{ fmt(current.humidity, 0) }}<span class="weather-stat-unit">%</span></div>
                        <div class="weather-stat-label">{{ $t('weather.humidity') }}</div>
                    </div>
                    <div class="weather-stat">
                        <div class="weather-stat-icon">\u{1F321}</div>
                        <div class="weather-stat-value">{{ fmt(current.dewpoint, 1) }}<span class="weather-stat-unit">°C</span></div>
                        <div class="weather-stat-label">{{ $t('weather.dewpoint') }}</div>
                    </div>
                    <div class="weather-stat">
                        <div class="weather-stat-icon">\u{1F4CF}</div>
                        <div class="weather-stat-value">{{ fmt(current.pressure, 0) }}<span class="weather-stat-unit">hPa</span></div>
                        <div class="weather-stat-label">{{ $t('weather.pressure') }} {{ pressureArrow }}</div>
                    </div>
                    <div class="weather-stat">
                        <div class="weather-stat-icon">\u{1F441}</div>
                        <div class="weather-stat-value">{{ fmtVisibility }}<span class="weather-stat-unit">km</span></div>
                        <div class="weather-stat-label">{{ $t('weather.visibility') }}</div>
                    </div>
                    <div class="weather-stat">
                        <div class="weather-stat-icon">\u{2600}</div>
                        <div class="weather-stat-value">{{ fmt(current.solar_radiation_wm2, 0) }}<span class="weather-stat-unit">W/m²</span></div>
                        <div class="weather-stat-label">{{ $t('weather.radiation') }}</div>
                    </div>
                    <div class="weather-stat">
                        <div class="weather-stat-icon">\u{1F327}</div>
                        <div class="weather-stat-value">{{ fmt(current.precipitation_mm, 1) }}<span class="weather-stat-unit">mm</span></div>
                        <div class="weather-stat-label">{{ $t('weather.precipitation') }}</div>
                    </div>
                </div>
            </div>

            <!-- ================= CARD 2: 72h FORECAST ================= -->
            <div class="chart-card">
                <div class="chart-header">
                    <span class="chart-title">\u{1F4C8} {{ forecastTitle }}</span>
                    <span class="chart-subtitle">{{ $t('weather.forecast72hSub') }}</span>
                </div>
                <div ref="forecastChartEl" class="weather-chart" style="height: 340px;"></div>
            </div>

            <!-- ================= CARD 3: SOLAR RADIATION (FULL WIDTH) ================= -->
            <div class="chart-card">
                <div class="chart-header">
                    <span class="chart-title">\u{2600} {{ $t('weather.solarRadiationToday') }}</span>
                    <span class="chart-subtitle">{{ $t('weather.radiationSubtitle') }}</span>
                </div>
                <div ref="radiationChartEl" class="weather-chart" style="height: 360px;"></div>
                <div class="weather-legend" v-if="radiationKpis">
                    <span class="legend-item"><span class="legend-dot" style="background:#fbbf24"></span> {{ $t('weather.ghiPeak') }}: {{ radiationKpis.ghi_peak }} W/m²</span>
                    <span class="legend-item"><span class="legend-dot" style="background:#f97316"></span> {{ $t('weather.dniPeak') }}: {{ radiationKpis.dni_peak }} W/m²</span>
                    <span class="legend-item"><span class="legend-dot" style="background:#60a5fa"></span> {{ $t('weather.dhiPeak') }}: {{ radiationKpis.dhi_peak }} W/m²</span>
                </div>
            </div>

            <!-- ================= ROW B: 2-COL (CLOTHING + ASTRONOMY) ================= -->
            <div class="weather-row-2col">
                <div class="chart-card">
                    <div class="chart-header">
                        <span class="chart-title">\u{1F455} {{ $t('weather.clothingRecommendation') }}</span>
                        <span class="chart-subtitle">{{ clothingText('label', 'label_key') || '' }}</span>
                    </div>
                    <div v-if="!clothing.available" class="empty-state">
                        {{ $t('weather.noCurrent') }}
                    </div>
                    <div v-else>
                        <p class="clothing-text">{{ clothingText('description', 'description_key') }}</p>
                        <div class="clothing-grid">
                            <div v-if="clothing.bottom || clothing.bottom_key" class="clothing-item">
                                <div class="clothing-icon">\u{1F456}</div>
                                <div class="clothing-name">{{ clothingText('bottom', 'bottom_key') }}</div>
                                <div class="clothing-label">{{ $t('weather.clothing.bottom') }}</div>
                            </div>
                            <div v-if="clothing.top || clothing.top_key" class="clothing-item">
                                <div class="clothing-icon">\u{1F455}</div>
                                <div class="clothing-name">{{ clothingText('top', 'top_key') }}</div>
                                <div class="clothing-label">{{ $t('weather.clothing.top') }}</div>
                            </div>
                            <div v-if="clothing.jacket || clothing.jacket_key" class="clothing-item">
                                <div class="clothing-icon">\u{1F9E5}</div>
                                <div class="clothing-name">{{ clothingText('jacket', 'jacket_key') }}</div>
                                <div class="clothing-label">{{ $t('weather.clothing.jacket') }}</div>
                            </div>
                            <div v-if="clothing.headwear || clothing.headwear_key" class="clothing-item">
                                <div class="clothing-icon">\u{1F3A9}</div>
                                <div class="clothing-name">{{ clothingText('headwear', 'headwear_key') }}</div>
                                <div class="clothing-label">{{ $t('weather.clothing.head') }}</div>
                            </div>
                        </div>
                        <div v-if="clothingExtras.length" class="clothing-extras">
                            <span v-for="x in clothingExtras" :key="x" class="clothing-extra-chip">{{ x }}</span>
                        </div>
                    </div>
                </div>

                <div class="chart-card">
                    <div class="chart-header">
                        <span class="chart-title">\u{1F30C} {{ $t('weather.astronomy') }}</span>
                        <span class="chart-subtitle">{{ $t('weather.astroSubtitle') }}</span>
                    </div>
                    <div class="astro-grid">
                        <div class="astro-item">
                            <div class="astro-icon">\u{1F305}</div>
                            <div class="astro-value">{{ formatTime(astronomy.sunrise) }}</div>
                            <div class="astro-label">{{ $t('weather.sunrise') }}</div>
                        </div>
                        <div class="astro-item">
                            <div class="astro-icon">\u{1F307}</div>
                            <div class="astro-value">{{ formatTime(astronomy.sunset) }}</div>
                            <div class="astro-label">{{ $t('weather.sunset') }}</div>
                        </div>
                        <div class="astro-item">
                            <div class="astro-icon">\u{2600}</div>
                            <div class="astro-value">{{ dayLengthText }}</div>
                            <div class="astro-label">{{ $t('weather.dayLength') }} <span v-if="dayLengthDeltaText" :class="dayLengthDeltaClass">{{ dayLengthDeltaText }}</span></div>
                        </div>
                        <div class="astro-item">
                            <div class="astro-icon">\u{1F31E}</div>
                            <div class="astro-value">{{ fmt(astronomy.max_elevation_deg, 1) }}°</div>
                            <div class="astro-label">{{ $t('weather.maxElevation') }}</div>
                        </div>
                        <div class="astro-item">
                            <div class="astro-icon">{{ moonIcon }}</div>
                            <div class="astro-value">{{ astronomy.moon_phase || '--' }}</div>
                            <div class="astro-label">{{ $t('weather.moonPhase') }}</div>
                        </div>
                        <div class="astro-item">
                            <div class="astro-icon">\u{1F319}</div>
                            <div class="astro-value">{{ fmt(astronomy.moon_illumination, 0) }}%</div>
                            <div class="astro-label">{{ $t('weather.illumination') }}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ================= CARD 7: HISTORY ================= -->
            <div class="chart-card">
                <div class="chart-header">
                    <span class="chart-title">\u{1F4C5} {{ $t('weather.history') }}</span>
                    <div class="history-tabs">
                        <button v-for="tab in historyTabs" :key="tab.id"
                                type="button"
                                class="history-tab"
                                :class="{active: historyTab === tab.id}"
                                :aria-pressed="historyTab === tab.id"
                                :disabled="historyLoading && historyTab === tab.id"
                                @click="setHistoryTab(tab.id)">{{ tab.label }}</button>
                    </div>
                </div>
                <div v-if="!history.data.length" class="empty-state">
                    {{ $t('weather.historyLoading') }}
                </div>
                <div v-else>
                    <div v-if="historyLoading" class="history-note">{{ $t('weather.historyLoading') }}</div>
                    <div v-else-if="historyAvailabilityText" class="history-note">{{ historyAvailabilityText }}</div>
                    <div v-if="historyPartialDayText" class="history-note">{{ historyPartialDayText }}</div>
                    <div class="history-kpis">
                        <div class="history-kpi">
                            <div class="history-kpi-value">{{ fmt(history.stats.avgTemp, 1) }}°C</div>
                            <div class="history-kpi-label">Ø {{ $t('weather.temperature') }}</div>
                        </div>
                        <div class="history-kpi">
                            <div class="history-kpi-value" style="color:#ef4444;">{{ fmt(history.stats.maxTemp, 1) }}°C</div>
                            <div class="history-kpi-label">{{ $t('common.max') }}</div>
                        </div>
                        <div class="history-kpi">
                            <div class="history-kpi-value" style="color:#60a5fa;">{{ fmt(history.stats.minTemp, 1) }}°C</div>
                            <div class="history-kpi-label">{{ $t('common.min') }}</div>
                        </div>
                        <div class="history-kpi">
                            <div class="history-kpi-value" style="color:#3b82f6;">{{ fmt(rainHistoryValue, 1) }} {{ rainHistoryUnit }}</div>
                            <div class="history-kpi-label">{{ $t('weather.precipitation') }}</div>
                        </div>
                        <div class="history-kpi">
                            <div class="history-kpi-value" style="color:#10b981;">{{ fmt(history.stats.avgWind, 1) }} m/s</div>
                            <div class="history-kpi-label">Ø {{ $t('weather.wind') }}</div>
                        </div>
                        <div class="history-kpi">
                            <div class="history-kpi-value" style="color:#fbbf24;">{{ fmt(history.stats.sunHours, 0) }} h</div>
                            <div class="history-kpi-label">{{ $t('weather.sunHours') }}</div>
                        </div>
                    </div>
                    <div ref="historyChartEl" class="weather-chart" style="height: 340px; margin-top: var(--space-md);"></div>
                </div>
            </div>
        </div>
    `,

    setup(props) {
        const t = window.SFMLI18n ? window.SFMLI18n.t : (key) => key;
        const locale = { value: window.SFMLI18n ? window.SFMLI18n.current : 'en' };

        // Map our locale codes to BCP47 tags for Date/Intl formatting
        const bcp = (l) => ({ de: 'de-DE', en: 'en-US', pl: 'pl-PL' }[l] || 'en-US');

        // Clothing recommendation arrives in German from the PyArmor-protected
        // backend (no source access to localize at origin). Map known German
        // values per locale; unknowns fall through unchanged so we don't hide
        // information when a new label appears.
        const CLOTHING_TRANSLATIONS = {
            pl: {
                // labels (chart subtitle)
                'Frostig': 'Mróz',
                'Sehr kalt': 'Bardzo zimno',
                'Kalt': 'Zimno',
                'Kühl': 'Chłodno',
                'Mild': 'Łagodnie',
                'Warm': 'Ciepło',
                'Sehr warm': 'Bardzo ciepło',
                'Heiß': 'Upał',
                // descriptions
                'Warm und angenehm.': 'Ciepło i przyjemnie.',
                'Mild und angenehm.': 'Łagodnie i przyjemnie.',
                'Sehr warm, kann ungemütlich werden.': 'Bardzo ciepło, może być męcząco.',
                'Sehr warm, hell und sonnig.': 'Bardzo ciepło, jasno i słonecznie.',
                'Heiß, viel trinken.': 'Upał, dużo pij.',
                'Kühl, leichte Schicht reicht.': 'Chłodno, wystarczy lekka warstwa.',
                'Kalt, warm anziehen.': 'Zimno, ubierz się ciepło.',
                'Sehr kalt, dick einpacken.': 'Bardzo zimno, opatul się grubo.',
                'Frostig, dick einpacken und Mütze nicht vergessen.': 'Mróz, ubierz się grubo i nie zapomnij czapki.',
                'Es regnet, Regenjacke einpacken.': 'Pada deszcz, weź kurtkę przeciwdeszczową.',
                'Achtung, Regen heute.': 'Uwaga, dziś deszcz.',
                // bottoms
                'Kurze/lange Hose': 'Krótkie/długie spodnie',
                'Kurze Hose': 'Krótkie spodnie',
                'Lange Hose': 'Długie spodnie',
                'Shorts': 'Szorty',
                'Warme Hose': 'Ciepłe spodnie',
                'Dicke Hose': 'Grube spodnie',
                'Thermohose': 'Spodnie termoaktywne',
                // tops
                'T-Shirt': 'T-shirt',
                'Langarmshirt': 'Koszulka z długim rękawem',
                'Pullover': 'Sweter',
                'Hemd': 'Koszula',
                'Bluse': 'Bluzka',
                'Thermoshirt': 'Koszulka termoaktywna',
                'Sweatshirt': 'Bluza',
                // jackets
                'Dünne Jacke': 'Cienka kurtka',
                'Übergangsjacke': 'Kurtka przejściowa',
                'Regenjacke': 'Kurtka przeciwdeszczowa',
                'Mantel': 'Płaszcz',
                'Wintermantel': 'Płaszcz zimowy',
                'Winterjacke': 'Kurtka zimowa',
                'Daunenjacke': 'Kurtka puchowa',
                'Anorak': 'Anorak',
                // headwear
                'Mütze': 'Czapka',
                'Wintermütze': 'Czapka zimowa',
                'Cap': 'Czapka z daszkiem',
                'Kappe': 'Czapka z daszkiem',
                'Sonnenhut': 'Kapelusz przeciwsłoneczny',
                'Stirnband': 'Opaska',
                // extras
                'Schal': 'Szalik',
                'Handschuhe': 'Rękawiczki',
                'Sonnenbrille': 'Okulary przeciwsłoneczne',
                'Sonnencreme': 'Krem z filtrem',
                'Regenschirm': 'Parasol',
                'Schal und Handschuhe': 'Szalik i rękawiczki',
            },
            en: {
                'Frostig': 'Frosty',
                'Sehr kalt': 'Very cold',
                'Kalt': 'Cold',
                'Kühl': 'Cool',
                'Mild': 'Mild',
                'Warm': 'Warm',
                'Sehr warm': 'Very warm',
                'Heiß': 'Hot',
                'Warm und angenehm.': 'Warm and pleasant.',
                'Mild und angenehm.': 'Mild and pleasant.',
                'Sehr warm, kann ungemütlich werden.': 'Very warm — may get uncomfortable.',
                'Sehr warm, hell und sonnig.': 'Very warm, bright and sunny.',
                'Heiß, viel trinken.': 'Hot — drink plenty of water.',
                'Kühl, leichte Schicht reicht.': 'Cool — a light layer is enough.',
                'Kalt, warm anziehen.': 'Cold — dress warm.',
                'Sehr kalt, dick einpacken.': 'Very cold — bundle up.',
                'Frostig, dick einpacken und Mütze nicht vergessen.': 'Frosty — bundle up and don’t forget a hat.',
                'Es regnet, Regenjacke einpacken.': 'It’s raining — bring a rain jacket.',
                'Achtung, Regen heute.': 'Heads up — rain today.',
                'Kurze/lange Hose': 'Shorts or long pants',
                'Kurze Hose': 'Shorts',
                'Lange Hose': 'Long pants',
                'Shorts': 'Shorts',
                'Warme Hose': 'Warm pants',
                'Dicke Hose': 'Thick pants',
                'Thermohose': 'Thermal pants',
                'T-Shirt': 'T-shirt',
                'Langarmshirt': 'Long-sleeve shirt',
                'Pullover': 'Sweater',
                'Hemd': 'Shirt',
                'Bluse': 'Blouse',
                'Thermoshirt': 'Thermal shirt',
                'Sweatshirt': 'Sweatshirt',
                'Dünne Jacke': 'Light jacket',
                'Übergangsjacke': 'Mid-season jacket',
                'Regenjacke': 'Rain jacket',
                'Mantel': 'Coat',
                'Wintermantel': 'Winter coat',
                'Winterjacke': 'Winter jacket',
                'Daunenjacke': 'Down jacket',
                'Anorak': 'Anorak',
                'Mütze': 'Beanie',
                'Wintermütze': 'Winter beanie',
                'Cap': 'Cap',
                'Kappe': 'Cap',
                'Sonnenhut': 'Sun hat',
                'Stirnband': 'Headband',
                'Schal': 'Scarf',
                'Handschuhe': 'Gloves',
                'Sonnenbrille': 'Sunglasses',
                'Sonnencreme': 'Sunscreen',
                'Regenschirm': 'Umbrella',
                'Schal und Handschuhe': 'Scarf and gloves',
            },
        };
        const translateClothing = (value) => {
            if (value == null || value === '') return value;
            const map = CLOTHING_TRANSLATIONS[locale.value];
            if (!map) return value;
            return map[value] ?? value;
        };
        const translateEnum = (group, key, fallback = '') => {
            if (!key) return fallback;
            const i18nKey = `weather.clothing.${group}.${key}`;
            const translated = t(i18nKey);
            return translated === i18nKey ? fallback : translated;
        };
        const clothingText = (field, keyField) => {
            const fallback = translateClothing(clothing[field]);
            const group = field === 'description' ? 'description' : 'items';
            return translateEnum(group, clothing[keyField], fallback || '');
        };
        const clothingExtras = computed(() => {
            const keys = Array.isArray(clothing.extras_keys) ? clothing.extras_keys : [];
            const values = Array.isArray(clothing.extras) ? clothing.extras : [];
            const max = Math.max(keys.length, values.length);
            return Array.from({ length: max }, (_, index) => {
                const fallback = translateClothing(values[index]);
                return translateEnum('items', keys[index], fallback || '');
            }).filter(Boolean);
        });

        const current = reactive({
            temperature: null, feels_like: null, humidity: null,
            wind_speed: null, pressure: null, pressure_trend: null,
            visibility_km: null, cloud_cover: null, precipitation_mm: null,
            condition: null, dewpoint: null, solar_radiation_wm2: null,
            solar_potential: null, timestamp: null,
        });
        const forecast = ref([]);
        const forecastMeta = reactive({ hours: 0, target_hours: 72, is_complete: false });
        const radiation = reactive({ actual: [], forecast: [], clear_sky: [] });
        const clothing = reactive({ available: false });
        const astronomy = reactive({ sunrise: null, sunset: null, day_length_min: null, day_length_delta_min: null, max_elevation_deg: null, moon_phase: null, moon_illumination: null });
        const history = reactive({ data: [], stats: {} });
        const historyMeta = reactive({ availableDays: 0, requestedDays: 7, returnedDays: 0 });
        const historyTab = ref('week');
        const historyLoading = ref(false);
        // Reactive: relabels when locale switches.
        const historyTabs = computed(() => [
            { id: 'week',  label: t('weather.tab.week') },
            { id: 'month', label: t('weather.tab.month') },
            { id: 'year',  label: t('weather.tab.year') },
        ]);
        const lastUpdated = ref('');
        const timeContext = reactive({
            timezone: null,
            now: null,
            today: null,
            current_hour: null,
        });

        const forecastChartEl = ref(null);
        const radiationChartEl = ref(null);
        const historyChartEl = ref(null);
        let forecastChart = null, radiationChart = null, historyChart = null;
        let historyRequestSequence = 0;
        const historyRequestedDays = computed(() => (
            historyTab.value === 'week' ? 7 : historyTab.value === 'month' ? 30 : 365
        ));
        const historyAvailabilityText = computed(() => {
            if (!historyMeta.availableDays || historyMeta.availableDays >= historyRequestedDays.value) {
                return '';
            }
            return t('weather.historyAvail', { days: historyMeta.availableDays });
        });
        const partialHistoryDays = computed(() => history.data.filter((day) => day?.is_complete === false));
        const historyPartialDayText = computed(() => {
            const days = partialHistoryDays.value;
            if (!days.length) return '';
            const latest = days.at(-1);
            const hours = Number(latest?.hours_count);
            const detail = Number.isFinite(hours) ? ` (${hours} Stunden)` : '';
            return `${days.length} unvollständige${days.length === 1 ? 'r Tag ist' : ' Tage sind'} enthalten${detail}; Tageswerte werden nicht hochgerechnet.`;
        });
        const rainHistoryIsRate = computed(() => (
            history.data.some((d) => d?.precipitation_semantics === 'rate')
            && !history.data.some((d) => d?.precipitation_semantics === 'amount')
        ));
        const rainHistoryUnit = computed(() => (rainHistoryIsRate.value ? 'mm/h' : 'mm'));
        const rainHistoryValue = computed(() => (
            rainHistoryIsRate.value ? history.stats.maxRainRate : history.stats.totalRain
        ));
        // Helpers ------------------------------------------------------
        function fmt(v, digits = 1) {
            if (v == null || v === '' || Number.isNaN(Number(v))) return '--';
            return Number(v).toFixed(digits);
        }
        function syncTimeContext(payload) {
            const ctx = payload?.time_context;
            if (!ctx || typeof ctx !== 'object') return;
            Object.assign(timeContext, ctx);
        }
        function formatTime(iso) {
            if (!iso) return '--';
            try {
                const d = new Date(iso);
                if (Number.isNaN(d.getTime())) return String(iso);
                return new Intl.DateTimeFormat(bcp(locale.value), {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: timeContext.timezone || undefined,
                }).format(d);
            } catch (e) { return String(iso); }
        }
        function formatDateOnly(dateStr, options) {
            if (!dateStr) return '--';
            try {
                const d = new Date(dateStr + 'T12:00:00');
                if (Number.isNaN(d.getTime())) return String(dateStr);
                return new Intl.DateTimeFormat(bcp(locale.value), {
                    ...options,
                    timeZone: timeContext.timezone || undefined,
                }).format(d);
            } catch (e) { return String(dateStr); }
        }
        const weatherIcon = computed(() => WEATHER_ICONS[current.condition] || '\u{2601}');
        // Map HA condition strings to our weather.condition.* keys.
        const CONDITION_KEY = {
            'clear-night': 'clearNight', 'sunny': 'sunny', 'clear': 'clear',
            'partlycloudy': 'partlyCloudy', 'cloudy': 'cloudy',
            'rainy': 'rainy', 'pouring': 'pouring', 'snowy': 'snowy',
            'snowy-rainy': 'snowyRainy', 'windy': 'windy', 'fog': 'fog',
            'hail': 'hail', 'lightning': 'lightning', 'lightning-rainy': 'lightningRainy',
            'exceptional': 'exceptional', 'windy-variant': 'windyVariant',
        };
        const conditionText = computed(() => {
            const k = CONDITION_KEY[current.condition];
            return k ? t('weather.condition.' + k) : (current.condition || '--');
        });
        const potentialText = computed(() => {
            const k = current.solar_potential;
            if (!k || k === 'none') return '--';
            return t('weather.potential.' + k);
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
        const dayLengthDeltaValue = computed(() => {
            if (astronomy.day_length_delta_min == null) return null;
            const rounded = Math.round(Number(astronomy.day_length_delta_min));
            return Math.abs(rounded) >= 1 ? rounded : null;
        });
        const dayLengthDeltaText = computed(() => {
            if (dayLengthDeltaValue.value == null) return null;
            return `${dayLengthDeltaValue.value > 0 ? '+' : ''}${dayLengthDeltaValue.value} min`;
        });
        const dayLengthDeltaClass = computed(() => (
            dayLengthDeltaValue.value > 0 ? 'delta-up' : 'delta-down'
        ));
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
        const peakValue = (rows, field) => {
            const values = rows
                .map(row => row?.[field])
                .filter(value => value != null && !Number.isNaN(Number(value)))
                .map(Number);
            return values.length ? Math.round(Math.max(...values)) : 0;
        };
        const radiationKpis = computed(() => {
            const observed = radiation.actual.length ? radiation.actual : radiation.forecast;
            if (!observed.length && !radiation.forecast.length) return null;
            return {
                ghi_peak: peakValue(observed, 'ghi'),
                dni_peak: peakValue(radiation.forecast, 'dni'),
                dhi_peak: peakValue(radiation.forecast, 'dhi'),
            };
        });
        const forecastTitle = computed(() => {
            const hours = forecastMeta.hours || forecast.value.length || 0;
            const target = forecastMeta.target_hours || 72;
            return t('weather.forecastTitle', { hours: Math.min(hours, target) });
        });

        // Charts -------------------------------------------------------
        function renderForecastChart() {
            if (!forecastChartEl.value || !forecast.value.length) return;
            if (!forecastChart) forecastChart = echarts.init(forecastChartEl.value);

            const labels = forecast.value.map(r => {
                const parts = r.time.split(' ');
                const h = parts[1] ? parts[1].slice(0, 5) : '';
                return h;
            });
            const xDates = forecast.value.map(r => r.time.split(' ')[0]);
            // Add day separator
            const dayLabels = labels.map((h, i) => {
                if (i === 0 || xDates[i] !== xDates[i - 1]) {
                    return `${h}\n${formatDateOnly(xDates[i], { weekday: 'short' })}`;
                }
                return h;
            });

            forecastChart.setOption({
                backgroundColor: 'transparent',
                grid: { left: 55, right: 55, top: 30, bottom: 40 },
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: getThemeColor('--bg-card', 'rgba(21, 28, 44, 0.85)'),
                    borderColor: getThemeColor('--border-default', 'rgba(255, 255, 255, 0.1)'),
                    textStyle: { color: getThemeColor('--text-primary', '#f0f6fc'), fontFamily: 'var(--font-family)', fontSize: 12 },
                    extraCssText: 'backdrop-filter: blur(8px);',
                },
                legend: {
                    data: [t('weather.temperature'), t('weather.cloudCover'), t('weather.precipitation'), t('weather.wind')],
                    top: 0, textStyle: { color: getThemeColor('--text-secondary', '#8b949e') },
                },
                xAxis: {
                    type: 'category',
                    data: dayLabels,
                    axisLabel: { color: getThemeColor('--text-secondary', '#8b949e'), interval: 2, fontSize: 10 },
                    axisLine: { lineStyle: { color: getThemeColor('--border-default', 'rgba(255, 255, 255, 0.15)') } },
                },
                yAxis: [
                    { type: 'value', name: '°C', position: 'left', axisLabel: { color: getThemeColor('--text-muted', '#6e7681') }, splitLine: { lineStyle: { color: getThemeColor('--border-default', 'rgba(255, 255, 255, 0.06)') } } },
                    { type: 'value', name: '%', position: 'right', max: 100, axisLabel: { color: getThemeColor('--text-muted', '#6e7681') }, splitLine: { show: false } },
                ],
                series: [
                    {
                        name: t('weather.temperature'), type: 'line', yAxisIndex: 0,
                        data: forecast.value.map(r => r.temperature),
                        smooth: true, symbol: 'none',
                        lineStyle: { color: '#ef4444', width: 2 },
                        itemStyle: { color: '#ef4444' },
                    },
                    {
                        name: t('weather.cloudCover'), type: 'line', yAxisIndex: 1,
                        data: forecast.value.map(r => r.cloud_cover),
                        smooth: true, symbol: 'none',
                        areaStyle: { color: 'rgba(148,163,184,0.25)' },
                        lineStyle: { color: '#94a3b8', width: 1 },
                        itemStyle: { color: '#94a3b8' },
                    },
                    {
                        name: t('weather.precipitation'), type: 'bar', yAxisIndex: 0,
                        data: forecast.value.map(r => r.rain),
                        itemStyle: { color: '#3b82f6' },
                        barWidth: 4,
                    },
                    {
                        name: t('weather.wind'), type: 'line', yAxisIndex: 0,
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
            if (!radiationChart) radiationChart = echarts.init(radiationChartEl.value);

            const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
            const actualMap = new Map(radiation.actual.map(r => [r.hour, r.ghi]));
            const fcMap = new Map(radiation.forecast.map(r => [r.hour, r]));
            const csMap = new Map(radiation.clear_sky.map(r => [r.hour, r.ghi]));

            radiationChart.setOption({
                backgroundColor: 'transparent',
                grid: { left: 55, right: 20, top: 30, bottom: 40 },
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: getThemeColor('--bg-card', 'rgba(21, 28, 44, 0.85)'),
                    borderColor: getThemeColor('--border-default', 'rgba(255, 255, 255, 0.1)'),
                    textStyle: { color: getThemeColor('--text-primary', '#f0f6fc'), fontFamily: 'var(--font-family)', fontSize: 12 },
                    extraCssText: 'backdrop-filter: blur(8px);',
                },
                legend: { data: [t('weather.ghiActual'), t('weather.ghiForecast'), 'DNI', 'DHI', t('weather.clearSky')], top: 0, textStyle: { color: getThemeColor('--text-secondary', '#8b949e') } },
                xAxis: { type: 'category', data: hours, axisLabel: { color: getThemeColor('--text-secondary', '#8b949e'), fontSize: 10, interval: 2 }, axisLine: { lineStyle: { color: getThemeColor('--border-default', 'rgba(255, 255, 255, 0.15)') } } },
                yAxis: { type: 'value', name: 'W/m²', axisLabel: { color: getThemeColor('--text-muted', '#6e7681') }, splitLine: { lineStyle: { color: getThemeColor('--border-default', 'rgba(255, 255, 255, 0.06)') } } },
                series: [
                    csMap.size > 0 ? {
                        name: t('weather.clearSky'), type: 'line',
                        data: hours.map((_, h) => csMap.get(h) ?? null),
                        smooth: true, symbol: 'none',
                        lineStyle: { color: '#6b7280', type: 'dotted', width: 1 },
                        itemStyle: { color: '#6b7280' },
                    } : null,
                    {
                        name: t('weather.ghiForecast'), type: 'line',
                        data: hours.map((_, h) => fcMap.get(h)?.ghi ?? null),
                        smooth: true, symbol: 'none',
                        lineStyle: { color: '#fbbf24', width: 1, type: 'dashed' },
                        itemStyle: { color: '#fbbf24' },
                    },
                    {
                        name: t('weather.ghiActual'), type: 'line',
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
            if (!historyChart) historyChart = echarts.init(historyChartEl.value);

            const dates = history.data.map(d => d.date);
            const rainAxis = rainHistoryIsRate.value ? 'mm/h' : 'mm';
            historyChart.setOption({
                backgroundColor: 'transparent',
                grid: { left: 55, right: 55, top: 30, bottom: 40 },
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: getThemeColor('--bg-card', 'rgba(21, 28, 44, 0.85)'),
                    borderColor: getThemeColor('--border-default', 'rgba(255, 255, 255, 0.1)'),
                    textStyle: { color: getThemeColor('--text-primary', '#f0f6fc'), fontFamily: 'var(--font-family)', fontSize: 12 },
                    extraCssText: 'backdrop-filter: blur(8px);',
                },
                legend: { data: [t('weather.tempAvg'), t('weather.tempMax'), t('weather.tempMin'), t('weather.precipitation')], top: 0, textStyle: { color: getThemeColor('--text-secondary', '#8b949e') } },
                xAxis: { type: 'category', data: dates, axisLabel: { color: getThemeColor('--text-secondary', '#8b949e'), fontSize: 10 }, axisLine: { lineStyle: { color: getThemeColor('--border-default', 'rgba(255, 255, 255, 0.15)') } } },
                yAxis: [
                    { type: 'value', name: '°C', axisLabel: { color: getThemeColor('--text-muted', '#6e7681') }, splitLine: { lineStyle: { color: getThemeColor('--border-default', 'rgba(255, 255, 255, 0.06)') } } },
                    { type: 'value', name: rainAxis, position: 'right', axisLabel: { color: getThemeColor('--text-muted', '#6e7681') }, splitLine: { show: false } },
                ],
                series: [
                    { name: t('weather.tempMax'), type: 'line', data: history.data.map(d => d.temp_max), smooth: true, symbol: 'none', lineStyle: { color: '#ef4444', width: 1 }, itemStyle: { color: '#ef4444' } },
                    { name: t('weather.tempAvg'), type: 'line', data: history.data.map(d => d.temp_avg), smooth: true, symbol: 'none', lineStyle: { color: '#fbbf24', width: 2 }, itemStyle: { color: '#fbbf24' } },
                    { name: t('weather.tempMin'), type: 'line', data: history.data.map(d => d.temp_min), smooth: true, symbol: 'none', lineStyle: { color: '#60a5fa', width: 1 }, itemStyle: { color: '#60a5fa' } },
                    { name: t('weather.precipitation'), type: 'bar', yAxisIndex: 1, data: history.data.map(d => d.rain), itemStyle: { color: '#3b82f6' }, barWidth: 6 },
                ],
            });
            historyChart.resize();
        }

        // Data loading -------------------------------------------------
        async function loadDashboard() {
            try {
                const res = await SFMLApi.fetch('/api/sfml_stats/weather/dashboard', { forceRefresh: true });
                if (!res || !res.success) return;
                syncTimeContext(res);
                Object.assign(current, res.current || {});
                forecast.value = res.forecast || [];
                Object.assign(forecastMeta, res.forecast_meta || {
                    hours: forecast.value.length,
                    target_hours: 72,
                    is_complete: forecast.value.length >= 72,
                });
                Object.assign(radiation, res.radiation || {});
                Object.assign(clothing, res.clothing || { available: false });
                Object.assign(astronomy, res.astronomy || {});
                lastUpdated.value = formatTime(res.timestamp || timeContext.now);

                await nextTick();
                renderForecastChart();
                renderRadiationChart();
            } catch (e) {
                console.error('Weather dashboard load error:', e);
            }
        }

        async function loadHistory() {
            const requestSequence = ++historyRequestSequence;
            const days = historyRequestedDays.value;
            historyLoading.value = true;
            try {
                const res = await SFMLApi.getWeatherHistory(days, true);
                if (requestSequence !== historyRequestSequence) return;
                if (!res || !res.success) return;
                syncTimeContext(res);
                const all = (res.data || []).slice().sort((a, b) => a.date.localeCompare(b.date));
                historyMeta.availableDays = res.available_days || all.length;
                historyMeta.requestedDays = res.requested_days || days;
                historyMeta.returnedDays = res.returned_days || all.length;
                history.data = all;
                history.stats = computeHistoryStats(all);

                await nextTick();
                renderHistoryChart();
            } catch (e) {
                console.error('Weather history load error:', e);
            } finally {
                if (requestSequence === historyRequestSequence) {
                    historyLoading.value = false;
                }
            }
        }

        function computeHistoryStats(data) {
            if (!data.length) return {};
            const temps = data.map(d => d.temp_avg).filter(v => v != null);
            const maxs = data.map(d => d.temp_max).filter(v => v != null);
            const mins = data.map(d => d.temp_min).filter(v => v != null);
            const winds = data.map(d => d.wind_avg).filter(v => v != null);
            const rains = data
                .filter(d => d?.precipitation_semantics === 'amount')
                .map(d => d.rain_total).filter(v => v != null);
            const rates = data
                .filter(d => d?.precipitation_semantics === 'rate')
                .map(d => d.rain_rate_max ?? d.rain).filter(v => v != null);
            const suns = data.map(d => d.sun_hours || 0);
            return {
                avgTemp: temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : null,
                maxTemp: maxs.length ? Math.max(...maxs) : null,
                minTemp: mins.length ? Math.min(...mins) : null,
                totalRain: rains.length ? rains.reduce((a, b) => a + b, 0) : null,
                maxRainRate: rates.length ? Math.max(...rates) : null,
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

        watch(() => props.config?.theme, () => {
            if (forecastChart) { forecastChart.dispose(); forecastChart = null; }
            if (radiationChart) { radiationChart.dispose(); radiationChart = null; }
            if (historyChart) { historyChart.dispose(); historyChart = null; }
            nextTick(() => {
                renderForecastChart();
                renderRadiationChart();
                renderHistoryChart();
            });
        });

        return {
            current, forecast, forecastTitle, radiation, clothing, translateClothing, clothingText, clothingExtras, astronomy, history,
            historyTab, historyTabs, historyLoading, lastUpdated,
            forecastChartEl, radiationChartEl, historyChartEl,
            weatherIcon, conditionText, potentialText, pressureArrow, fmtVisibility,
            dayLengthText, dayLengthDeltaText, dayLengthDeltaClass, moonIcon, radiationKpis,
            fmt, formatTime,
            historyAvailabilityText, historyPartialDayText, rainHistoryValue, rainHistoryUnit,
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
            border-bottom: 1px solid var(--border-default);
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
            border: 1px solid var(--border-default);
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
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-md);
            text-align: center;
            transition: all var(--transition-normal);
        }
        .weather-stat:hover {
            background: var(--bg-card-hover);
            border-color: var(--border-hover);
            transform: translateY(-2px);
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
            background: var(--bg-card);
            border: 1px solid var(--border-default);
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
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: 8px;
            transition: all var(--transition-normal);
        }
        .clothing-item:hover {
            background: var(--bg-card-hover);
            border-color: var(--border-hover);
            transform: translateY(-2px);
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
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: 8px;
            transition: all var(--transition-normal);
        }
        .astro-item:hover {
            background: var(--bg-card-hover);
            border-color: var(--border-hover);
            transform: translateY(-2px);
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
            border: 1px solid var(--border-default);
            color: var(--text-muted);
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.85rem;
            transition: all var(--transition-normal);
        }
        .history-tab:hover {
            color: var(--text-primary);
            border-color: var(--accent);
        }
        .history-tab.active {
            background: var(--bg-card-hover);
            color: var(--accent);
            border-color: var(--accent);
        }
        .history-tab:disabled { cursor: wait; opacity: 0.75; }
        .history-note {
            margin-bottom: var(--space-md);
            color: var(--text-muted);
            font-size: 0.78rem;
        }
        .history-kpis {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
            gap: var(--space-md);
        }
        .history-kpi {
            text-align: center;
            padding: var(--space-md) var(--space-sm);
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: 8px;
            transition: all var(--transition-normal);
        }
        .history-kpi:hover {
            background: var(--bg-card-hover);
            border-color: var(--border-hover);
            transform: translateY(-2px);
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
