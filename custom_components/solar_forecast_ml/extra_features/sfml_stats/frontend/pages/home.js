// Solar Command Center — Home Page V17 (Solar Dashboard)
// (C) 2026 Zara-Toorox

const HomePage = ((Vue) => {
const { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } = Vue;

function getThemeColor(varName, fallback) {
    try {
        const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
        return val || fallback;
    } catch (e) {
        return fallback;
    }
}

const WEATHER_SYMBOLS = {
    'clear-night': '🌙',
    'cloudy': '☁',
    'exceptional': '❕',
    'fog': '🌫',
    'hail': '🧊',
    'lightning': '⚡',
    'lightning-rainy': '⛈',
    'partlycloudy': '⛅',
    'pouring': '🌧',
    'rainy': '🌦',
    'snowy': '❄',
    'snowy-rainy': '🌨',
    'sunny': '☀',
    'windy': '💨',
    'windy-variant': '🌬',
};

function forecastBandColor(errorPercent) {
    if (errorPercent == null || Number.isNaN(errorPercent)) return '#8b949e';
    const error = Math.abs(errorPercent);
    if (error <= 15) return '#22c55e';
    if (error <= 25) return '#eab308';
    if (error <= 35) return '#f97316';
    return '#ef4444';
}

function forecastBandColorFromAccuracy(accuracyPercent) {
    if (accuracyPercent == null || Number.isNaN(accuracyPercent)) return '#8b949e';
    return forecastBandColor(100 - accuracyPercent);
}

function yieldDeviationColor(deviation) {
    if (deviation == null || Number.isNaN(deviation)) return '#8b949e';
    if (deviation >= 0) return deviation > 0 ? '#22c55e' : '#38bdf8';
    return forecastBandColor(deviation);
}

const STATUS_TRANSLATIONS = {
    de: {
        producing: 'Aktiv',
        idle: 'Inaktiv',
        charging: 'Laden',
        discharging: 'Entladen',
        standby: 'Standby',
        grid_import: 'Netzbezug',
        grid_export: 'Einspeisung',
        grid_neutral: 'Neutral',
        home_desc: 'Hausverbrauch',
        solar: 'SOLAR',
        home: 'BEDARF',
        battery: 'AKKU',
        grid: 'NETZ',
        car: 'AUTO',
        peakToday: 'PEAK HEUTE',
        alltime: 'ALLTIME',
    },
    en: {
        producing: 'Active',
        idle: 'Inactive',
        charging: 'Charging',
        discharging: 'Discharging',
        standby: 'Standby',
        grid_import: 'Grid Import',
        grid_export: 'Grid Export',
        grid_neutral: 'Neutral',
        home_desc: 'House Consumption',
        solar: 'SOLAR',
        home: 'DEMAND',
        battery: 'BATTERY',
        grid: 'GRID',
        car: 'CAR',
        peakToday: 'PEAK TODAY',
        alltime: 'ALLTIME',
    },
    pl: {
        producing: 'Aktywna',
        idle: 'Nieaktywna',
        charging: 'Ładowanie',
        discharging: 'Rozładowywanie',
        standby: 'Czuwanie',
        grid_import: 'Pobór z sieci',
        grid_export: 'Oddawanie do sieci',
        grid_neutral: 'Neutralny',
        home_desc: 'Zużycie domu',
        solar: 'SOLAR',
        home: 'POBÓR',
        battery: 'AKU',
        grid: 'SIEĆ',
        car: 'AUTO',
        peakToday: 'SZCZYT DZIŚ',
        alltime: 'ALLTIME',
    }
};

function pathWidth(power) {
    const p = Math.max(0, Number(power) || 0);
    if (p <= 0) return 2.5;
    return 2.5 + Math.min(3.5, Math.sqrt(p) * 0.08);
}

function particleCount(power) {
    const p = Math.max(0, Number(power) || 0);
    if (p <= 0) return 0;
    if (p < 400) return 2;
    if (p < 1200) return 3;
    return 4;
}

function particleDuration(power) {
    const p = Math.max(0, Number(power) || 0);
    if (p <= 0) return '5s';
    if (p < 400) return '4s';
    if (p < 1200) return '3s';
    return '2s';
}


const _HomePage = {
    props: {
        liveData: { type: Object, required: true },
        config: { type: Object, default: () => ({}) },
    },
    emits: ['navigate'],

    template: `
    <div class="page page-home">

        <!-- ========== SECTION 1: 3D ISOMETRIC ENERGY FLOW + INFO PANEL ========== -->
        <div class="energy-flow-container" style="min-height: 45vh">
            <div class="chart-header">
                <div style="display:flex; align-items:center; gap:var(--space-sm); flex-wrap:wrap;">
                    <span class="chart-title">{{ $t('home.energyFlow') }}</span>
                    <div class="weather-badges" v-if="infoData.outdoorTemp != null || infoData.outdoorClouds != null">
                        <div class="weather-badge temp-badge" v-if="infoData.outdoorTemp != null" :title="$t('weather.temperature')">
                            <span class="badge-icon">🌡️</span>
                            <span class="badge-val">{{ infoData.outdoorTemp.toFixed(1) }}°C</span>
                        </div>
                        <div class="weather-badge clouds-badge" v-if="infoData.outdoorClouds != null" :title="$t('weather.cloudCover')">
                            <span class="badge-icon">{{ getWeatherSymbol(infoData.outdoorCondition, infoData.outdoorClouds) }}</span>
                            <span class="badge-val">{{ Math.round(infoData.outdoorClouds) }}% {{ $t('weather.cloudCover') }}</span>
                        </div>
                        <div class="weather-badge source-badge" v-if="infoData.outdoorSource === 'forecast'">
                            <span class="badge-val">{{ $t('common.forecast') }}</span>
                        </div>
                        <div
                            v-for="chip in flowStatusChips"
                            :key="chip.entity_id"
                            class="weather-badge flow-status-chip"
                            :class="statusChipClass(chip)"
                            :title="statusChipTitle(chip)"
                        >
                            <span class="badge-val">{{ chip.label }}</span>
                            <span class="badge-chip-value">{{ chip.display }}</span>
                        </div>
                    </div>
                </div>
                <div class="time-badge">
                    <span class="badge-icon">🕒</span>
                    <span class="flow-time">{{ currentTime }}</span>
                </div>
            </div>
            <div class="flow-layout">
            <svg class="isometric-energy-flow" viewBox="0 0 1024 576" preserveAspectRatio="xMidYMid meet"
                 style="width:100%; height:auto; display:block;">
                <defs>
                    <filter id="flowSoftGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="6" result="blur"/>
                        <feMerge>
                            <feMergeNode in="blur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                    <marker id="leaderDot" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6">
                        <circle cx="5" cy="5" r="3" class="leader-dot-circle" />
                    </marker>
                </defs>

                <!-- Background Rendered Image (Full Image, y=0) -->
                <image href="/api/sfml_stats/static/solar_house_flow_bg.png" x="0" y="0" width="1024" height="576"/>

                <!-- Active Flow Connections -->
                <g v-for="route in routes" :key="route.id">
                    <!-- Inactive/Background Path -->
                    <path
                        :d="route.d"
                        class="flow-route-bg"
                        :style="{ strokeWidth: route.width + 'px' }"
                    ></path>
                    <!-- Active Glowing Path -->
                    <path
                        v-if="route.active"
                        :d="route.d"
                        class="flow-route"
                        :class="'route-' + route.theme"
                        :style="{ strokeWidth: route.width + 'px' }"
                    ></path>
                    <path
                        v-if="route.active"
                        :d="route.d"
                        class="flow-route-glow"
                        :class="'route-' + route.theme"
                        :style="{ strokeWidth: (route.width + 6) + 'px' }"
                    ></path>
                    <!-- Flow Particles -->
                    <g v-if="route.active">
                        <circle
                            v-for="idx in route.particles"
                            :key="route.id + '-' + idx"
                            class="flow-particle"
                            :class="'particle-' + route.theme"
                            r="4"
                        >
                            <animateMotion
                                :dur="route.duration"
                                :begin="(idx - 1) * 0.7 + 's'"
                                repeatCount="indefinite"
                                :path="route.d"
                            />
                        </circle>
                    </g>
                </g>

                <!-- Leader Lines for Annotation -->
                <path d="M 589 174 L 589 80" class="leader-line" marker-start="url(#leaderDot)"></path>
                <path d="M 752 320 L 752 80" class="leader-line" marker-start="url(#leaderDot)"></path>
                <path d="M 874 40 L 874 90" class="leader-line-separator"></path>
                <path d="M 150 40 L 150 90" class="leader-line-separator"></path>

                <!-- 0. PEAK TODAY / ALLTIME -->
                <g transform="translate(135, 44)" class="text-block-left">
                    <text x="0" y="0" class="val-main solar">{{ infoData.peakTodayW != null ? infoData.peakTodayW + ' W' : '--' }}</text>
                    <text x="0" y="16" class="label-sub">{{ localText('peakToday') }}</text>
                    <text x="0" y="32" class="status-sub neutral">{{ infoData.peakTodayTime || '--' }}</text>
                </g>
                <g transform="translate(165, 44)">
                    <text x="0" y="0" class="val-main" style="filter: drop-shadow(0 0 1px rgba(253,230,138,0.3));">{{ infoData.peakAlltimeW != null ? infoData.peakAlltimeW + ' W' : '--' }}</text>
                    <text x="0" y="16" class="label-sub">{{ localText('alltime') }}</text>
                    <text x="0" y="32" class="status-sub neutral">{{ infoData.peakAlltimeDate || '--' }}</text>
                </g>
                <path d="M 645 448 L 645 535" class="leader-line" marker-start="url(#leaderDot)"></path>
                <path d="M 95 476 L 95 535" class="leader-line" marker-start="url(#leaderDot)"></path>
                <path d="M 437 398 L 437 460 L 378 460 L 378 535" class="leader-line" marker-start="url(#leaderDot)"></path>

                <!-- Text-Blöcke (transform="translate(x y)") -->
                <!-- 1. SOLAR -->
                <g transform="translate(859, 44)" class="text-block-left">
                    <text x="0" y="0" class="val-main solar">{{ fmtW(flow.solar_power) }}</text>
                    <text x="0" y="16" class="label-sub">{{ localText('solar') }}</text>
                    <text x="0" y="32" class="status-sub" :class="flow.solar_power > 10 ? 'producing' : 'idle'">
                        {{ flow.solar_power > 10 ? localText('producing') : localText('idle') }}
                    </text>
                </g>

                <!-- 2. HOME -->
                <g transform="translate(889, 44)">
                    <text x="0" y="0" class="val-main home">{{ fmtW(flow.home_consumption) }}</text>
                    <text x="0" y="16" class="label-sub">{{ localText('home') }}</text>
                    <text x="0" y="32" class="status-sub neutral" v-if="!(consumers.heatpump?.power > 10 || consumers.heatingrod?.power > 10)">{{ localText('home_desc') }}</text>
                    <text x="0" y="32" class="val-extra heatpump" v-if="consumers.heatpump?.power > 10">
                        ♨️ HP: {{ fmtW(consumers.heatpump.power) }}
                    </text>
                    <text x="0" y="45" class="val-extra heatingrod" v-if="consumers.heatingrod?.power > 10">
                        🔥 HS: {{ fmtW(consumers.heatingrod.power) }}
                    </text>
                </g>

                <!-- 3. CAR -->
                <g transform="translate(110, 520)" v-if="consumers.wallbox?.configured">
                    <text x="0" y="0" class="val-main car">{{ fmtW(consumers.wallbox.power) }}</text>
                    <text x="0" y="16" class="label-sub">{{ localText('car') }}</text>
                    <text x="0" y="32" class="status-sub" :class="consumers.wallbox.power > 10 ? 'charging' : 'idle'">
                        {{ consumers.wallbox.power > 10 ? localText('charging') : localText('idle') }}
                    </text>
                </g>

                <!-- 4. GRID -->
                <g transform="translate(434, 520)">
                    <text x="0" y="0" class="val-main grid" :class="gridStateColorClass">{{ gridPowerAbsText }}</text>
                    <text x="0" y="16" class="label-sub">{{ localText('grid') }}</text>
                    <text x="0" y="32" class="status-sub" :class="gridStateColorClass">
                        {{ gridStateTextLocal }}
                    </text>
                </g>

                <!-- 5. BATTERY -->
                <g transform="translate(623, 520)" v-if="flow.battery_soc != null">
                    <text x="0" y="0" class="val-main battery">{{ batteryPowerText }}</text>
                    <text x="0" y="16" class="label-sub">{{ localText('battery') }} · {{ flow.battery_soc != null ? flow.battery_soc.toFixed(0) + '%' : '--' }}</text>
                    <text x="0" y="32" class="status-sub" :class="batteryStateClass">
                        {{ batteryStateTextLocal }}
                    </text>
                </g>
            </svg>

            <!-- INFO PANEL (rechts neben SVG) -->
            <div class="flow-info-panel">
                <div class="info-item">
                    <span class="info-label">☀ {{ $t('home.panel.solar') }}</span>
                    <span class="info-value" style="color: var(--solar)">{{ fmtW(flow.solar_power) }}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">🏠 {{ $t('home.panel.demand') }}</span>
                    <span class="info-value">{{ fmtW(flow.home_consumption) }}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">🔋 {{ $t('home.panel.battery') }}</span>
                    <span class="info-value" :style="{color: flow.battery_power > 0 ? 'var(--price-cheap)' : flow.battery_power < 0 ? '#f97316' : 'var(--text-secondary)'}">
                        {{ flow.battery_power > 0 ? '+' : '' }}{{ fmtW(flow.battery_power) }}
                    </span>
                </div>
                <div class="info-item">
                    <span class="info-label">⚡ {{ $t('home.panel.grid') }}</span>
                    <span class="info-value" :style="{color: flow.grid_to_house > 10 ? 'var(--price-expensive)' : flow.house_to_grid > 10 ? 'var(--price-cheap)' : 'var(--text-secondary)'}">
                        <template v-if="flow.grid_to_house > 10">{{ fmtW(flow.grid_to_house) }} ↓</template>
                        <template v-else-if="flow.house_to_grid > 10">{{ fmtW(flow.house_to_grid) }} ↑</template>
                        <template v-else>0 W</template>
                    </span>
                </div>
                <div class="info-divider"></div>
                <div class="info-item">
                    <span class="info-label">⏱ {{ $t('home.panel.production') }}</span>
                    <span class="info-value info-small">{{ infoData.productionHours || '--' }}h</span>
                </div>
            </div>

            </div><!-- /flow-layout -->
        </div>

        <section v-if="hubbleView" class="hubble-card" :aria-label="$t('home.hubble.title')">
            <div class="hubble-header">
                <div class="hubble-sensor-ring-container">
                    <svg class="hubble-sensor-ring" viewBox="0 0 100 100">
                        <circle class="ring-bg" cx="50" cy="50" r="40" />
                        <circle class="ring-active" cx="50" cy="50" r="40" :class="hubbleView.moment_key" />
                        <!-- Hubble Face (Personality) -->
                        <g class="hubble-face" :class="[hubbleView.moment_key, { pulse: hubbleView.is_pulsing }]">
                            <ellipse class="hubble-eye left" cx="37" cy="48" rx="5" ry="9" />
                            <ellipse class="hubble-eye right" cx="63" cy="48" rx="5" ry="9" />
                            <path class="hubble-mouth" d="M 43 62 Q 50 66 57 62" fill="none" stroke-width="3.5" stroke-linecap="round" />
                        </g>
                    </svg>
                </div>
                <div class="hubble-heading">
                    <span class="hubble-kicker">{{ $t('home.hubble.agent') }}</span>
                    <span class="chart-title">{{ hubbleView.title }}</span>
                    <span class="hubble-moment">{{ hubbleView.moment }}</span>
                </div>
                <div
                    v-if="hubbleView.dayBalance"
                    class="hubble-day-balance"
                    :class="hubbleView.dayBalance.dataQuality"
                    :aria-label="$t('home.hubble.dayBalance.aria')"
                >
                    <div class="hubble-day-balance-heading">
                        <span class="hubble-day-balance-title">{{ $t('home.hubble.dayBalance.title') }}</span>
                        <span class="hubble-day-balance-total">
                            <strong>{{ hubbleView.dayBalance.homeConsumption }}</strong>
                            <span>kWh</span>
                        </span>
                    </div>
                    <div class="hubble-day-balance-subtitle">{{ $t('home.hubble.dayBalance.householdDemand') }}</div>
                    <div class="hubble-day-balance-bar" aria-hidden="true">
                        <span
                            v-for="source in hubbleView.dayBalance.activeSources"
                            :key="source.key"
                            class="hubble-day-balance-segment"
                            :class="source.key"
                            :style="{ width: source.percent + '%' }"
                        ></span>
                    </div>
                    <div class="hubble-day-balance-sources">
                        <span v-for="source in hubbleView.dayBalance.sources" :key="source.key" class="hubble-day-balance-source">
                            <span class="hubble-day-balance-dot" :class="source.key"></span>
                            <span class="hubble-day-balance-source-label">{{ source.label }}</span>
                            <strong>{{ source.kwh }} kWh</strong>
                            <span class="hubble-day-balance-percent">{{ source.percent }}%</span>
                        </span>
                    </div>
                    <span v-if="hubbleView.dayBalance.warning" class="hubble-day-balance-warning">
                        {{ hubbleView.dayBalance.warning }}
                    </span>
                </div>
                <div v-if="hubbleView.systemStatus" class="hubble-system-status" :class="hubbleView.systemStatus.variant">
                    <span class="hubble-system-title">{{ hubbleView.systemStatus.title }}</span>
                    <span class="hubble-system-meta">{{ hubbleView.systemStatus.meta }}</span>
                </div>
            </div>
            <div
                v-if="hubbleView.energyChain"
                class="hubble-energy-chain"
                :class="hubbleView.energyChain.dataQuality"
                :aria-label="$t('home.hubble.energyChain.aria')"
            >
                <div class="hubble-energy-chain-heading">
                    <div>
                        <span class="hubble-energy-chain-kicker">{{ $t('home.hubble.energyChain.title') }}</span>
                        <span class="hubble-energy-chain-subtitle">{{ $t('home.hubble.energyChain.subtitle') }}</span>
                    </div>
                    <span class="hubble-energy-chain-status">{{ hubbleView.energyChain.qualityLabel }}</span>
                </div>
                <div class="hubble-energy-chain-flow">
                    <div class="hubble-energy-chain-node input">
                        <span class="hubble-energy-chain-node-label">{{ $t('home.hubble.energyChain.dcInput') }}</span>
                        <strong>{{ hubbleView.energyChain.dcInput }} <small>kWh</small></strong>
                    </div>
                    <div class="hubble-energy-chain-route loss">
                        <span>{{ $t('home.hubble.energyChain.loss') }} {{ hubbleView.energyChain.loss }}</span>
                    </div>
                    <div class="hubble-energy-chain-converter">
                        <span class="hubble-energy-chain-converter-label">{{ $t('home.hubble.energyChain.conversion') }}</span>
                        <div
                            class="hubble-energy-chain-ring"
                            :style="{ '--chain-progress': hubbleView.energyChain.progress + 'deg' }"
                        >
                            <strong>{{ hubbleView.energyChain.systemEfficiency }}</strong>
                        </div>
                    </div>
                    <div class="hubble-energy-chain-route output"></div>
                    <div class="hubble-energy-chain-node output">
                        <span class="hubble-energy-chain-node-label">{{ $t('home.hubble.energyChain.usefulOutput') }}</span>
                        <strong>{{ hubbleView.energyChain.usefulOutput }} <small>kWh</small></strong>
                    </div>
                </div>
                <div class="hubble-energy-chain-summary">
                    <div class="hubble-energy-chain-branches">
                        <span class="hubble-energy-chain-branch solar" :class="{ pending: !hubbleView.energyChain.pv.available }">
                            <span>{{ $t('home.hubble.energyChain.pvPath') }}</span>
                            <strong>{{ hubbleView.energyChain.pv.label }}</strong>
                        </span>
                        <span
                            v-if="hubbleView.energyChain.battery"
                            class="hubble-energy-chain-branch battery"
                            :class="{ pending: !hubbleView.energyChain.battery.available }"
                        >
                            <span>{{ $t('home.hubble.energyChain.batteryPath') }}</span>
                            <strong>{{ hubbleView.energyChain.battery.label }}</strong>
                        </span>
                    </div>
                    <div class="hubble-energy-chain-kpis">
                        <span>
                            <small>{{ $t('home.hubble.energyChain.netAutarky') }}</small>
                            <strong>{{ hubbleView.energyChain.netAutarky }}</strong>
                        </span>
                        <span>
                            <small>
                                {{ $t('home.hubble.energyChain.adjustedAutarky') }}
                                <button
                                    type="button"
                                    class="hubble-metric-help"
                                    :aria-label="$t('home.hubble.energyChain.adjustedAutarkyHelp')"
                                    :data-tooltip="$t('home.hubble.energyChain.adjustedAutarkyHelp')"
                                >i</button>
                            </small>
                            <strong>{{ hubbleView.energyChain.adjustedAutarky }}</strong>
                        </span>
                        <span>
                            <small>
                                {{ $t('home.hubble.energyChain.coverage') }}
                                <button
                                    type="button"
                                    class="hubble-metric-help"
                                    :aria-label="$t('home.hubble.energyChain.coverageHelp')"
                                    :data-tooltip="$t('home.hubble.energyChain.coverageHelp')"
                                >i</button>
                            </small>
                            <strong>{{ hubbleView.energyChain.coverage }}</strong>
                        </span>
                    </div>
                </div>
            </div>
            <div class="hubble-chip-row">
                <span v-for="chip in hubbleView.chips" :key="chip.key" class="hubble-chip" :title="chip.title || null">
                    <span class="hubble-chip-label">{{ chip.label }}</span>
                    <span class="hubble-chip-value">{{ chip.value }}</span>
                </span>
            </div>
            
            <div class="hubble-speech-bubble">
                <p class="hubble-lead">{{ hubbleView.lead }}</p>
                <p v-if="hubbleView.tip" class="hubble-tip">{{ hubbleView.tip }}</p>
            </div>

            <div class="hubble-actions" :aria-label="$t('home.hubble.quick.title')">
                <button
                    v-for="action in hubbleView.quickActions"
                    :key="action.key"
                    type="button"
                    class="hubble-action"
                    :class="{ active: hubbleQuestion === action.key }"
                    @click="hubbleQuestion = hubbleQuestion === action.key ? null : action.key"
                >
                    {{ action.label }}
                </button>
                <a
                    href="/api/sfml_stats/static/docs.html?v=32.0.0"
                    target="_blank"
                    class="hubble-action docs-link"
                    style="text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 4px;"
                >
                    📖 {{ $t('home.hubble.quick.docs') || 'Handbuch' }}
                </a>
            </div>
            <div v-if="hubbleView.answer" class="hubble-answer">
                <span class="hubble-answer-label">{{ hubbleView.answer.label }}</span>
                <div v-if="hubbleView.answer.chips" class="hubble-chip-row">
                    <span v-for="chip in hubbleView.answer.chips" :key="chip.key" class="hubble-chip">
                        <span class="hubble-chip-label">{{ chip.label }}</span>
                        <span class="hubble-chip-value">{{ chip.value }}</span>
                    </span>
                </div>
                <template v-if="hubbleView.answer.paragraphs">
                    <p v-for="paragraph in hubbleView.answer.paragraphs" :key="paragraph">{{ paragraph }}</p>
                </template>
                <div v-else-if="hubbleView.answer.isHelpers" class="hubble-helpers-quick-create">
                    <p>{{ hubbleView.answer.text }}</p>
                    <div v-for="c in hubbleView.answer.consumers" :key="c.config_key" class="hubble-helper-action-row">
                        <div class="hubble-helper-info">
                            <span class="hubble-helper-name">{{ getConsumerName(c.config_key) }}</span>
                            <span class="hubble-helper-desc">
                                <span v-if="c.mode === 'sensor'">{{ $t('home.hubble.answer.consumerSensorMode') || 'Nutzt Zählersensor' }}: {{ c.daily_entity_id }}</span>
                                <span v-else>{{ $t('home.hubble.answer.consumerIntegratedMode') || 'Integrierter Leistungssensor' }}: {{ c.power_entity_id }}</span>
                            </span>
                        </div>
                    </div>
                </div>
                <p v-else>{{ hubbleView.answer.text }}</p>
            </div>
            <div class="hubble-report-toggle-row">
                <button type="button" class="hubble-toggle" @click="hubbleExpanded = !hubbleExpanded">
                    {{ hubbleExpanded ? $t('home.hubble.reportClose') : $t('home.hubble.reportOpen') }}
                </button>
            </div>
            <div v-if="hubbleExpanded" class="hubble-details">
                <div class="hubble-story-grid">
                    <template v-for="block in hubbleView.story" :key="block.key">
                        <div v-if="block.type === 'tile'" class="hubble-story-tile" :class="block.key">
                            <div class="hubble-tile-header">
                                <span class="hubble-tile-icon">{{ block.icon }}</span>
                                <span class="hubble-tile-title">{{ block.title }}</span>
                            </div>
                            <div class="hubble-tile-body">
                                <p v-for="p in block.paragraphs" :key="p">{{ p }}</p>
                            </div>
                        </div>
                    </template>
                </div>
                <p class="hubble-updated">{{ hubbleView.updated }}</p>
            </div>
        </section>

        <!-- ========== SECTION 2: PROGNOSE-CHART ========== -->
        <div class="chart-card" style="margin-top: var(--space-lg)">
            <div class="chart-header forecast-card-title-row">
                <span class="chart-title">{{ $t('home.dayForecastVsActual') }}</span>
                <div class="day-history-nav">
                    <button class="day-nav-button" type="button" @click="selectPreviousDay" :title="$t('home.previousDay')">&lsaquo;</button>
                    <span class="day-nav-label">{{ selectedDayLabel }}</span>
                    <button class="day-nav-button" type="button" @click="selectNextDay" :disabled="!canSelectNextDay" :title="$t('home.nextDay')">&rsaquo;</button>
                    <button v-if="!isSelectedToday" class="day-nav-today" type="button" @click="selectToday">{{ $t('common.today') }}</button>
                </div>
            </div>
            <div class="forecast-metrics-wrapper">
                <!-- Links: Qualitätsmetriken (Evaluierung) -->
                <div class="forecast-metrics-column eval-column">
                    <div v-if="todayForecastAccuracyPercent != null" class="metric-badge-card">
                        <span class="metric-badge-icon">🎯</span>
                        <div class="metric-badge-info">
                            <span class="metric-badge-value" :style="{ color: forecastBandColorFromAccuracy(todayForecastAccuracyPercent) }">{{ todayForecastAccuracyPercent.toFixed(1) }}%</span>
                            <span class="metric-badge-label">{{ dayQualityLabel }}</span>
                        </div>
                    </div>
                    <div v-if="todayForecastErrorLabel" class="metric-badge-card">
                        <span class="metric-badge-icon">{{ todayForecastErrorIcon }}</span>
                        <div class="metric-badge-info">
                            <span class="metric-badge-value" :style="{ color: yieldDeviationColor(todayForecastErrorPercent) }">{{ todayForecastErrorLabel }}</span>
                            <span class="metric-badge-label">{{ dayErrorLabel }}</span>
                        </div>
                    </div>
                    <div v-if="todayLearningBasisLabel" class="metric-badge-card">
                        <span class="metric-badge-icon">⏱️</span>
                        <div class="metric-badge-info">
                            <span class="metric-badge-value" style="color: #fbbf24">{{ todayLearningBasisLabel }}</span>
                            <span class="metric-badge-label">{{ dayLearningBasisLabel }}</span>
                        </div>
                    </div>
                    <div v-if="todayDiscardedLearningLabel" class="metric-badge-card">
                        <span class="metric-badge-icon">🗑️</span>
                        <div class="metric-badge-info">
                            <span class="metric-badge-value" style="color: #f87171">{{ todayDiscardedLearningLabel }}</span>
                            <span class="metric-badge-label">{{ dayDiscardedLabel }}</span>
                        </div>
                    </div>
                </div>
                <!-- Rechts: Ertragsmetriken (Absolute Werte) -->
                <div class="forecast-metrics-column values-column">
                    <div class="metric-badge-card" :title="$t('home.forecastActualKpiTitle')">
                        <span class="metric-badge-icon">📈</span>
                        <div class="metric-badge-info">
                            <span class="metric-badge-value" style="color: #22c55e">{{ actualTotal }} <span class="unit">kWh</span></span>
                            <span class="metric-badge-label">{{ $t('home.forecastActualKpi') }}</span>
                        </div>
                    </div>
                    <div class="metric-badge-card">
                        <span class="metric-badge-icon">📉</span>
                        <div class="metric-badge-info">
                            <span class="metric-badge-value" style="color: #fbbf24">{{ forecastTotal }} <span class="unit">kWh</span></span>
                            <span class="metric-badge-label">{{ $t('home.forecastDayKpi') }}</span>
                        </div>
                    </div>
                    <div v-if="hasConservativeForecast" class="metric-badge-card">
                        <span class="metric-badge-icon">🔀</span>
                        <div class="metric-badge-info">
                            <span class="metric-badge-value" style="color: #2dd4bf">{{ conservativeForecastTotal }} <span class="unit">kWh</span></span>
                            <span class="metric-badge-label">{{ $t('home.conservativeDayKpi') }}</span>
                        </div>
                    </div>
                    <div class="metric-badge-card">
                        <span class="metric-badge-icon">↕️</span>
                        <div class="metric-badge-info">
                            <span class="metric-badge-value" :style="{ color: yieldDeviationColor(forecastDeviationKwh) }">{{ forecastDeviationKwhLabel }}</span>
                            <span class="metric-badge-label">{{ $t('home.deviation') }}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div v-if="hasWeatherTrace" class="weather-trace" :aria-label="$t('home.weatherTraceAria')">
                <div class="weather-trace-labels">
                    <span :title="$t('home.expected')">🔮</span>
                    <span :title="$t('home.seen')">👀</span>
                    <span :title="$t('home.matchTitle')">🎯</span>
                </div>
                <div class="weather-trace-grid">
                    <template v-for="item in weatherTrace" :key="'weather-' + item.hour">
                        <div class="weather-trace-cell weather-trace-hour">{{ item.hourLabel }}</div>
                        <div class="weather-trace-cell weather-trace-icon" :title="item.expectedTitle">
                            <div class="weather-trace-visual">{{ item.expectedIcon }}</div>
                            <div class="weather-trace-indicators">
                                <span
                                    v-for="indicator in item.expectedIndicators"
                                    :key="'expected-' + item.hour + '-' + indicator.key"
                                    class="weather-trace-indicator"
                                    :class="'level-' + indicator.level"
                                >{{ indicator.label }}</span>
                            </div>
                        </div>
                        <div class="weather-trace-cell weather-trace-icon" :class="{ muted: !item.actualAvailable }" :title="item.actualTitle">
                            <div class="weather-trace-visual">{{ item.actualIcon }}</div>
                            <div class="weather-trace-indicators">
                                <span
                                    v-for="indicator in item.actualIndicators"
                                    :key="'actual-' + item.hour + '-' + indicator.key"
                                    class="weather-trace-indicator"
                                    :class="'level-' + indicator.level"
                                >{{ indicator.label }}</span>
                            </div>
                        </div>
                        <div class="weather-trace-cell weather-trace-match-badge" :class="'match-' + item.matchState" :title="item.matchTitle">
                            <span class="match-icon">{{ item.matchIcon }}</span>
                        </div>
                    </template>
                </div>
            </div>
            <div ref="forecastChartEl" class="chart-container" style="height: 35vh; min-height: 280px;"></div>
        </div>

        <!-- ========== SECTION 2b: MEHRTAGESPROGNOSE ========== -->
        <div class="multi-day-forecast" v-if="dailyForecasts.length > 0" style="margin-top: var(--space-lg);">
            <div class="chart-header" style="margin-bottom: var(--space-sm);">
                <span class="chart-title">{{ $t('home.forecastNextDays') }}</span>
            </div>
            <div style="display:flex; gap:var(--space-md); flex-wrap:wrap;">
                <div v-for="fc in dailyForecasts" :key="fc.type"
                     class="chart-card" style="flex:1; min-width:140px; padding:var(--space-md); text-align:center;">
                    <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:4px;">{{ fc.label }}</div>
                    <div style="font-size:1.5rem; font-weight:700; color:var(--solar); font-family:var(--font-mono);">
                        {{ fc.kwh }} kWh
                    </div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">{{ fc.date }}</div>
                </div>
            </div>
        </div>

        <!-- ========== SECTION 3: PANEL-GRUPPEN (IST vs Prognose pro Gruppe) ========== -->
        <div class="panel-groups-section" style="margin-top: var(--space-lg);" v-if="panelGroupsData.available">
            <div class="chart-header" style="margin-bottom: var(--space-md);">
                <span class="chart-title">☀ {{ $t('settings.panelGroups') }}</span>
            </div>
            <div class="panel-groups-grid" :class="'count-' + Object.keys(panelGroupsData.groups || {}).length">
                <div class="chart-card panel-group-chart-card" v-for="(group, groupName) in panelGroupsData.groups" :key="groupName">
                    <div class="chart-header" style="flex-wrap:wrap; gap:6px; margin-bottom: 8px;">
                        <span class="chart-title" style="font-size:0.92rem; font-weight: 700;">☀ {{ groupName }}</span>
                        <div class="pg-stats">
                            <span class="pg-badge actual">
                                {{ fmtKwh(group.actual_total_kwh, 2) }} kWh
                            </span>
                            <span class="pg-badge forecast">
                                {{ fmtKwh(group.prediction_day_kwh ?? group.prediction_total_kwh, 2) }} kWh
                            </span>
                            <span v-if="group.live_only" class="pg-badge neutral">
                                {{ $t('home.panelGroups.liveOnly') }}
                            </span>
                            <span v-if="panelDayProgressPercent(group) != null" class="pg-badge progress" :style="{ color: panelDayProgressColor(group), borderColor: panelDayProgressColor(group) + '33' }" :title="panelDayProgressTitle(group)">
                                {{ panelDayProgressPercent(group).toFixed(0) }}%
                            </span>
                        </div>
                    </div>
                    <div v-if="groupHasHourly(group)" class="panel-group-chart" :ref="el => { if (el) pgChartRefs[groupName] = el }"></div>
                    <div v-else class="empty-state">{{ $t('home.panelGroups.liveOnlyText') }}</div>
                    <div v-if="panelGroupMetaLine(group)" class="pg-meta-line" :title="panelGroupMetaTitle(group)">
                        {{ panelGroupMetaLine(group) }}
                    </div>
                </div>
            </div>
        </div>

        <!-- ========== SECTION 4: LIVE PV-PRODUKTION ========== -->
        <div class="chart-card" style="margin-top: var(--space-lg)">
            <div class="chart-header" style="flex-wrap:wrap; gap:6px;">
                <div style="display:flex; align-items:center; gap:var(--space-md)">
                    <span class="chart-title">☀ {{ $t('home.pvPower') }}</span>
                    <span style="color:var(--solar); font-size:1.3rem; font-weight:700; font-family:var(--font-mono)">
                        {{ fmtW(flow.solar_power) }}
                    </span>
                </div>
                <div class="pg-stats">
                    <span style="font-size:0.8rem; color:var(--text-muted); font-family:var(--font-mono)">
                        {{ $t('common.peak') }}: <span style="color:var(--solar)">{{ infoData.peakTodayW || '--' }} W</span>
                        <span v-if="infoData.peakTodayTime" style="color:var(--text-muted)"> ({{ infoData.peakTodayTime }})</span>
                    </span>
                    <span style="font-size:0.8rem; color:var(--text-muted); font-family:var(--font-mono)">
                        ● {{ currentTime }}
                    </span>
                </div>
            </div>
            <div ref="powerChartEl" class="chart-container" style="height: 28vh; min-height: 220px;"></div>

            <!-- Panel Cards darunter -->
            <div class="panel-live-grid" v-if="panels.length > 0" style="margin-top: var(--space-md);">
                <div class="panel-live-card" v-for="panel in panels" :key="panel.id">
                    <div class="panel-live-icon">☀</div>
                    <div class="panel-live-name">{{ panel.name }}</div>
                    <div class="panel-live-power">
                        {{ panel.power != null ? panel.power.toFixed(0) : '0' }}<span class="panel-live-unit"> W</span>
                    </div>
                    <div class="panel-live-peak" v-if="panel.max_today != null" style="font-size: 0.65rem; color: var(--text-muted); margin-top: 4px;">
                        Peak: {{ panel.max_today.toFixed(0) }} W
                    </div>
                </div>
            </div>
        </div>

        <div class="chart-card" v-show="hasBatteryChart" style="margin-top: var(--space-lg)">
            <div class="chart-header" style="flex-wrap:wrap; gap:6px;">
                <div style="display:flex; align-items:center; gap:var(--space-md)">
                    <span class="chart-title">🔋 Akku-Ladestand</span>
                    <span style="color:#38bdf8; font-size:1.3rem; font-weight:700; font-family:var(--font-mono)">
                        {{ batteryChartStats.socText }}
                    </span>
                </div>
                <div class="battery-chart-stats">
                    <span>Tief <strong>{{ batteryChartStats.minSocText }}</strong></span>
                    <span>Hoch <strong>{{ batteryChartStats.maxSocText }}</strong></span>
                    <span>Laden <strong class="charge">{{ batteryChartStats.chargeKwh }}</strong></span>
                    <span>Entladen <strong class="discharge">{{ batteryChartStats.dischargeKwh }}</strong></span>
                    <span class="battery-mode" :class="batteryStateClass">{{ batteryStateTextLocal }}</span>
                </div>
            </div>
            <div ref="batteryChartEl" class="chart-container battery-chart-container"></div>
        </div>

    </div>
    `,

    setup(props) {
        const t = window.SFMLI18n ? window.SFMLI18n.t : (key) => key;
        const locale = { value: window.SFMLI18n ? window.SFMLI18n.current : 'en' };
        const bcp = (l) => ({ de: 'de-DE', en: 'en-US', pl: 'pl-PL' }[l] || 'en-US');

        // Refs
        const forecastChartEl = ref(null);
        const powerChartEl = ref(null);
        const batteryChartEl = ref(null);
        const sparklineRefs = reactive({});
        let forecastChartInstance = null;
        let powerChartInstance = null;
        let batteryChartInstance = null;
        let resizeHandler = null;

        // Reactive state
        const flow = reactive({
            solar_power: 0,
            home_consumption: 0,
            battery_soc: null,
            battery_power: 0,
            solar_to_house: 0,
            solar_to_battery: 0,
            battery_to_house: 0,
            grid_to_house: 0,
            house_to_grid: 0,
            grid_to_battery: 0,
        });

        const consumers = reactive({
            wallbox: null,
            heatpump: null,
            heatingrod: null,
        });

        const panels = ref([]);
        const panelHistory = reactive({});
        const flowStatusChips = ref([]);

        // Panel Groups (IST vs Prognose pro Gruppe)
        const panelGroupsData = reactive({ available: false, groups: {} });
        const pgChartRefs = reactive({});
        const pgChartInstances = {};
        const forecastData = reactive({ hours: [], forecast: [], forecastRaw: [], hybrid: [], conservative: [], operationalTotal: null, conservativeTotal: null, actual: [], actualRaw: [], cleanEligible: [], confidence: [], ml_pct: [], method: [], temperature: [], radiation: [], clouds: [], tfs: [], tfs_weight: [], ai: [], physics: [], lstm: [], ridge: [] });
        const weatherTrace = ref([]);
        const powerData = ref([]);
        const batterySocSensorConfigured = ref(false);
        const dailyForecasts = ref([]);
        const hubble = ref(null);


        const localText = (key) => {
            const lang = locale.value;
            const dict = STATUS_TRANSLATIONS[lang] || STATUS_TRANSLATIONS['en'];
            return dict[key] || key;
        };
        const timeContext = reactive({
            timezone: null,
            now: null,
            today: null,
            tomorrow: null,
            current_hour: null,
            current_minute: null,
            current_month: null,
            current_year: null,
            syncedAt: 0,
        });
        function syncTimeContext(payload) {
            const ctx = payload?.time_context;
            if (!ctx) return;
            Object.assign(timeContext, ctx, { syncedAt: Date.now() });
        }
        const localDateKey = (date = null) => {
            if (!date && timeContext.today) return timeContext.today;
            date = date || new Date();
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };
        const haCurrentHour = () => {
            const hour = Number(timeContext.current_hour);
            return Number.isFinite(hour) ? hour : new Date().getHours();
        };
        function formatHaTime(value, options = { hour: '2-digit', minute: '2-digit' }) {
            if (!value) return '';
            const date = value instanceof Date ? value : new Date(value);
            if (Number.isNaN(date.getTime())) return '';
            return new Intl.DateTimeFormat(bcp(locale.value), {
                ...options,
                timeZone: timeContext.timezone || undefined,
            }).format(date);
        }
        function formatHaDateOnly(value, options = { day: '2-digit', month: '2-digit' }) {
            if (!value) return '';
            const date = value instanceof Date ? value : new Date(String(value).length === 10 ? `${value}T12:00:00` : value);
            if (Number.isNaN(date.getTime())) return '';
            return new Intl.DateTimeFormat(bcp(locale.value), {
                ...options,
                timeZone: timeContext.timezone || undefined,
            }).format(date);
        }
        function currentHaInstant() {
            if (!timeContext.now) return new Date();
            const base = new Date(timeContext.now);
            if (Number.isNaN(base.getTime())) return new Date();
            const elapsed = timeContext.syncedAt ? Date.now() - timeContext.syncedAt : 0;
            return new Date(base.getTime() + elapsed);
        }
        const selectedDate = ref(null);
        const selectedDateKey = computed(() => selectedDate.value || localDateKey());
        const isSelectedToday = computed(() => selectedDateKey.value === localDateKey());
        const canSelectNextDay = computed(() => selectedDateKey.value < localDateKey());
        const dateKeyToLocalNoon = (dateKey) => new Date(`${dateKey}T12:00:00`);
        const shiftDateKey = (dateKey, days) => {
            const date = dateKeyToLocalNoon(dateKey);
            date.setDate(date.getDate() + days);
            return localDateKey(date);
        };
        const selectedDayLabel = computed(() => {
            const key = selectedDateKey.value;
            if (key === localDateKey()) return t('common.today');
            if (key === shiftDateKey(localDateKey(), -1)) return t('common.yesterday');
            return formatHaDateOnly(key, { weekday: 'short', day: '2-digit', month: '2-digit' });
        });
        const selectedDayCurrentHour = () => (isSelectedToday.value ? haCurrentHour() : 23);
        async function reloadSelectedDayData() {
            forecastChartInstance?.clear();
            powerChartInstance?.clear();
            batteryChartInstance?.clear();
            for (const chart of Object.values(pgChartInstances)) {
                if (chart) chart.dispose();
            }
            Object.keys(pgChartInstances).forEach((key) => { delete pgChartInstances[key]; });
            panelGroupsData.available = false;
            panelGroupsData.groups = {};
            await Promise.all([
                loadForecastData(),
                loadPowerHistory(),
                loadPanelGroups(),
            ]);
        }
        function selectPreviousDay() {
            selectedDate.value = shiftDateKey(selectedDateKey.value, -1);
            reloadSelectedDayData();
        }
        function selectNextDay() {
            if (!canSelectNextDay.value) return;
            selectedDate.value = shiftDateKey(selectedDateKey.value, 1);
            reloadSelectedDayData();
        }
        function selectToday() {
            selectedDate.value = localDateKey();
            reloadSelectedDayData();
        }
        const valueOrZero = (value) => value ?? 0;
        const fmtKwh = (value, digits = 2) => Number(valueOrZero(value)).toFixed(digits);
        const groupHasHourly = (group) => Array.isArray(group?.hourly) && group.hourly.length > 0;
        const finiteNumber = (value) => {
            const number = Number(value);
            return Number.isFinite(number) ? number : null;
        };
        const formatPanelPercent = (value, digits = 0) => {
            const number = finiteNumber(value);
            return number == null ? null : number.toFixed(digits);
        };
        const panelDayProgressPercent = (group) => {
            const provided = finiteNumber(group?.day_progress_percent);
            if (provided != null) return provided;
            const actual = finiteNumber(group?.actual_total_kwh);
            const forecast = finiteNumber(group?.prediction_day_kwh ?? group?.prediction_total_kwh);
            if (actual == null || forecast == null || forecast <= 0) return null;
            return (actual / forecast) * 100;
        };
        const panelDayProgressColor = (group) => {
            const progress = panelDayProgressPercent(group);
            if (progress == null) return '#8b949e';
            if (progress >= 100) return '#22c55e';
            if (progress >= 70) return '#fbbf24';
            if (progress >= 35) return '#38bdf8';
            return '#8b949e';
        };
        const panelDayProgressTitle = (group) => {
            const actual = fmtKwh(group?.actual_total_kwh, 2);
            const forecast = fmtKwh(group?.prediction_day_kwh ?? group?.prediction_total_kwh, 2);
            return t('home.panelGroups.dayProgressTitle', { actual, forecast });
        };
        const panelGroupMetaParts = (group) => {
            if (!group || group.live_only) return [];
            const parts = [];
            const forecastUntilNow = finiteNumber(group.prediction_until_now_kwh);
            if (forecastUntilNow != null && forecastUntilNow > 0) {
                parts.push(t('home.panelGroups.forecastSoFarShort', {
                    value: fmtKwh(forecastUntilNow, 2),
                }));
            }
            const hitUntilNow = formatPanelPercent(group.forecast_until_now_accuracy_percent);
            if (hitUntilNow != null) {
                parts.push(t('home.panelGroups.hitSoFarShort', { value: hitUntilNow }));
            }
            const cleanAccuracy = formatPanelPercent(group.clean_accuracy_percent ?? group.accuracy_percent);
            if (cleanAccuracy != null) {
                parts.push(t('home.panelGroups.cleanAccuracyShort', { value: cleanAccuracy }));
            }
            const cleanHours = finiteNumber(group.clean_hours_count);
            const elapsedHours = finiteNumber(group.elapsed_hours_count);
            if (cleanHours != null && elapsedHours != null && elapsedHours > 0) {
                parts.push(t('home.panelGroups.learningBasisShort', {
                    clean: cleanHours.toFixed(0),
                    elapsed: elapsedHours.toFixed(0),
                }));
            }
            const excludedHours = finiteNumber(group.excluded_hours_count);
            if (excludedHours != null && excludedHours > 0) {
                parts.push(t('home.panelGroups.discardedShort', { value: excludedHours.toFixed(0) }));
            }
            return parts;
        };
        const panelGroupMetaLine = (group) => panelGroupMetaParts(group).join(' · ');
        const panelGroupMetaTitle = (group) => panelGroupMetaLine(group);
        const statusChipClass = (chip) => {
            if (!chip?.available) return 'unavailable';
            if (chip.active === true) return 'active';
            if (chip.active === false) return 'inactive';
            return chip.source === 'SFML' ? 'sfml' : 'stats';
        };
        const statusChipTitle = (chip) => {
            if (!chip) return '';
            const parts = [chip.label, chip.source, chip.entity_id].filter(Boolean);
            return parts.join(' · ');
        };

        const batteryPowerText = computed(() => {
            const p = Number(flow.battery_power) || 0;
            if (p === 0) return '0 W';
            return fmtW(Math.abs(p));
        });

        const batteryStateTextLocal = computed(() => {
            const p = Number(flow.battery_power) || 0;
            if (p > 10) return localText('charging');
            if (p < -10) return localText('discharging');
            return localText('standby');
        });

        const batteryStateClass = computed(() => {
            const p = Number(flow.battery_power) || 0;
            if (p > 10) return 'charging';
            if (p < -10) return 'discharging';
            return 'idle';
        });

        const hasBatteryChart = computed(() => (
            batterySocSensorConfigured.value
            && (
                (isSelectedToday.value && flow.battery_soc != null)
                || powerData.value.some((point) => point.battery_soc != null)
            )
        ));

        function powerPointTimeMs(point) {
            const raw = point?.local_timestamp || point?.timestamp || point?.time;
            if (!raw) return null;
            const timestamp = new Date(raw).getTime();
            return Number.isFinite(timestamp) ? timestamp : null;
        }

        function integratePowerKwh(data, selector) {
            let total = 0;
            for (let i = 1; i < data.length; i += 1) {
                const previousTime = powerPointTimeMs(data[i - 1]);
                const currentTimeMs = powerPointTimeMs(data[i]);
                if (previousTime == null || currentTimeMs == null || currentTimeMs <= previousTime) continue;
                const hours = Math.min((currentTimeMs - previousTime) / 3600000, 0.5);
                total += Math.max(0, Number(selector(data[i - 1])) || 0) * hours / 1000;
            }
            return total;
        }

        const batteryChartStats = computed(() => {
            const data = powerData.value || [];
            const charge = integratePowerKwh(
                data,
                (point) => (Number(point.solar_to_battery) || 0) + (Number(point.grid_to_battery) || 0),
            );
            const discharge = integratePowerKwh(data, (point) => point.battery_to_house);
            const socPoint = [...data].reverse().find((point) => point.battery_soc != null);
            const soc = isSelectedToday.value
                ? (flow.battery_soc ?? socPoint?.battery_soc ?? null)
                : (socPoint?.battery_soc ?? null);
            const socValues = data
                .map((point) => Number(point.battery_soc))
                .filter((value) => Number.isFinite(value) && value >= 0 && value <= 100);
            if (isSelectedToday.value && flow.battery_soc != null) {
                const currentSoc = Number(flow.battery_soc);
                if (Number.isFinite(currentSoc) && currentSoc >= 0 && currentSoc <= 100) {
                    socValues.push(currentSoc);
                }
            }
            const minSoc = socValues.length ? Math.min(...socValues) : null;
            const maxSoc = socValues.length ? Math.max(...socValues) : null;

            return {
                socText: soc == null ? '--' : `${Number(soc).toFixed(0)}%`,
                minSocText: minSoc == null ? '--' : `${minSoc.toFixed(0)}%`,
                maxSocText: maxSoc == null ? '--' : `${maxSoc.toFixed(0)}%`,
                chargeKwh: `${charge.toFixed(2)} kWh`,
                dischargeKwh: `${discharge.toFixed(2)} kWh`,
            };
        });

        const gridPowerAbsText = computed(() => {
            const importW = Number(flow.grid_to_house || 0) + Number(flow.grid_to_battery || 0);
            const exportW = Number(flow.house_to_grid || 0);
            if (exportW > 10) return fmtW(exportW);
            if (importW > 10) return fmtW(importW);
            return '0 W';
        });

        const gridStateTextLocal = computed(() => {
            const importW = Number(flow.grid_to_house || 0) + Number(flow.grid_to_battery || 0);
            const exportW = Number(flow.house_to_grid || 0);
            if (exportW > 10) return localText('grid_export');
            if (importW > 10) return localText('grid_import');
            return localText('grid_neutral');
        });

        const gridStateColorClass = computed(() => {
            const importW = Number(flow.grid_to_house || 0) + Number(flow.grid_to_battery || 0);
            const exportW = Number(flow.house_to_grid || 0);
            if (exportW > 10) return 'export';
            if (importW > 10) return 'import';
            return 'idle';
        });

        const routes = computed(() => {
            const routeList = [
                // 1. Solar to Inverter
                {
                    id: 'solar-inverter',
                    d: 'M 414 171 L 437 185 L 437 354',
                    power: flow.solar_power,
                    theme: 'solar',
                },
                // 2. Inverter to Battery (charging/discharging)
                {
                    id: 'inverter-battery',
                    d: flow.battery_power >= 0 
                        ? 'M 437 398 L 437 448 L 645 448 L 645 415' 
                        : 'M 645 415 L 645 448 L 437 448 L 437 398',
                    power: Math.abs(flow.battery_power),
                    theme: 'battery',
                },
                // 3. Inverter to EV Car (via wallbox)
                {
                    id: 'inverter-car',
                    d: (consumers.wallbox?.power || 0) > 10
                        ? 'M 430 376 L 276 376 L 276 400 L 235 400 L 235 415'
                        : 'M 235 415 L 235 400 L 276 400 L 276 376 L 430 376',
                    power: consumers.wallbox?.power || 0,
                    theme: 'car',
                },
                // 4. Inverter to House Load
                {
                    id: 'inverter-house',
                    d: 'M 475 376 L 515 376',
                    power: flow.home_consumption,
                    theme: 'house',
                },
                // 5. Grid Connections
                {
                    id: 'grid-inverter',
                    d: (Number(flow.grid_to_house) || 0) + (Number(flow.grid_to_battery) || 0) > 10 
                        ? 'M 378 492 L 378 460 L 437 460 L 437 398' 
                        : 'M 437 398 L 437 460 L 378 460 L 378 492',
                    power: (Number(flow.grid_to_house) || 0) + (Number(flow.grid_to_battery) || 0) > 10
                        ? (Number(flow.grid_to_house) || 0) + (Number(flow.grid_to_battery) || 0)
                        : flow.house_to_grid,
                    theme: (Number(flow.grid_to_house) || 0) + (Number(flow.grid_to_battery) || 0) > 10 ? 'grid' : 'export',
                }
            ];

            return routeList.map((route) => {
                const power = Math.max(0, Number(route.power) || 0);
                return {
                    ...route,
                    active: power > 10,
                    width: pathWidth(power),
                    particles: particleCount(power),
                    duration: particleDuration(power),
                };
            });
        });

        const hubbleExpanded = ref(false);
        const hubbleQuestion = ref(null);
        const currentTime = ref('');
        const workflowClockNow = ref(Date.now());
        const lastPowerUpdate = ref('');
        const cleanEvalStats = reactive({
            today: {
                accuracy: null,
                coverage: null,
                excludedMppt: null,
                excludedHours: null,
                evaluationHours: null,
                productionCandidates: null,
                completedCandidates: null,
                pendingCandidates: null,
                missingActualHours: null,
                excludedWeatherAlertHours: null,
                weatherAlertHours: null,
                excludedInverterClippedHours: null,
                learningHours: null,
                learningCandidates: null,
                discardedLearningHours: null,
                discardedLearningReasonBreakdown: null,
                evaluationActual: null,
                evaluationPredicted: null,
                evaluationCutoffHour: null,
                evaluationScope: null,
                yieldDelta: null,
                liveDayYieldDelta: null,
                forecastError: null,
                forecastAccuracy: null,
            },
            last7: { accuracy: null, coverage: null, excludedMppt: null },
            last30: { accuracy: null, coverage: null, excludedMppt: null },
        });

        function applyDayEvaluationMetrics(day) {
            cleanEvalStats.today.accuracy = day?.accuracy ?? null;
            cleanEvalStats.today.coverage = day?.evaluation_coverage_percent ?? null;
            cleanEvalStats.today.excludedMppt = day?.excluded_mppt_hours_count ?? null;
            cleanEvalStats.today.excludedHours = day?.excluded_hours_count ?? null;
            cleanEvalStats.today.evaluationHours = day?.evaluation_hours_count ?? null;
            cleanEvalStats.today.productionCandidates = day?.production_candidate_hours_count ?? null;
            cleanEvalStats.today.completedCandidates = day?.completed_candidate_hours_count ?? null;
            cleanEvalStats.today.pendingCandidates = day?.pending_candidate_hours_count ?? null;
            cleanEvalStats.today.missingActualHours = day?.missing_actual_hours_count ?? null;
            cleanEvalStats.today.excludedWeatherAlertHours = day?.excluded_weather_alert_hours_count ?? null;
            cleanEvalStats.today.weatherAlertHours = day?.weather_alert_hours_count ?? null;
            cleanEvalStats.today.excludedInverterClippedHours = day?.excluded_inverter_clipped_hours_count ?? null;
            cleanEvalStats.today.learningHours = day?.learning_hours_count ?? null;
            cleanEvalStats.today.learningCandidates = day?.learning_candidate_hours_count ?? null;
            cleanEvalStats.today.discardedLearningHours = day?.discarded_learning_hours_count ?? null;
            cleanEvalStats.today.discardedLearningReasonBreakdown = day?.discarded_learning_reason_breakdown ?? null;
            cleanEvalStats.today.evaluationActual = day?.evaluation_actual_kwh ?? null;
            cleanEvalStats.today.evaluationPredicted = day?.evaluation_predicted_kwh ?? null;
            cleanEvalStats.today.evaluationCutoffHour = day?.evaluation_cutoff_hour ?? null;
            cleanEvalStats.today.evaluationScope = day?.evaluation_scope ?? null;
            cleanEvalStats.today.yieldDelta = day?.yield_delta_vs_forecast_percent ?? null;
            cleanEvalStats.today.liveDayYieldDelta = isSelectedToday.value
                ? (day?.live_day_yield_delta_vs_forecast_percent ?? null)
                : null;
            cleanEvalStats.today.forecastError = (
                day?.forecast_error_vs_sot_percent
                ?? day?.yield_delta_vs_forecast_percent
                ?? day?.forecast_error_vs_actual_percent
                ?? null
            );
            cleanEvalStats.today.forecastAccuracy = (
                day?.forecast_accuracy_vs_sot_percent
                ?? day?.forecast_accuracy_vs_actual_percent
                ?? null
            );
        }

        // Info Panel Data
        const infoData = reactive({
            productionHours: null,
            peakTodayW: null,
            peakTodayTime: null,
            peakAlltimeW: null,
            peakAlltimeDate: null,
            sunrise: null,
            sunset: null,
            outdoorTemperatureLabel: null,
            outdoorTemp: null,
            outdoorClouds: null,
            outdoorCondition: null,
            outdoorSource: null,
            solarYieldToday: null,
        });
        const FORECAST_LEGEND_STORAGE_KEY = 'sfml_stats_home_forecast_legend_selected';
        const forecastLegendSelected = reactive({
            Prognose: true,
            P10: true,
            Hybrid: false,
            IST: true,
            TFS: false,
            Unsicherheit: true,
        });

        // Computed
        const isNightTime = computed(() => {
            const h = haCurrentHour();
            return h < 6 || h > 20;
        });

        function actualRowsWithLiveDelta({ includeCurrentPartial = false } = {}) {
            const rows = (forecastData.actualRaw || []).slice();
            if (!includeCurrentPartial) {
                return rows;
            }
            if (!isSelectedToday.value) {
                return rows;
            }
            const liveYield = Number(infoData.solarYieldToday);
            if (!Number.isFinite(liveYield) || liveYield <= 0 || !forecastData.hours.length) {
                return rows;
            }

            const knownYield = rows.reduce((sum, value) => sum + (Number(value) || 0), 0);
            const delta = liveYield - knownYield;
            if (delta <= 0.01) {
                return rows;
            }

            const nowHour = selectedDayCurrentHour();
            let idx = forecastData.hours.findIndex(hour => Number(hour) === nowHour);
            if (idx < 0) {
                for (let i = rows.length - 1; i >= 0; i--) {
                    if (rows[i] != null) {
                        idx = i;
                        break;
                    }
                }
            }
            if (idx >= 0) {
                rows[idx] = (Number(rows[idx]) || 0) + delta;
            }
            return rows;
        }

        function actualChartRows() {
            const rows = actualRowsWithLiveDelta();
            const nowHour = selectedDayCurrentHour();
            let lastActualIndex = -1;

            rows.forEach((value, index) => {
                const hour = Number(forecastData.hours[index]);
                if (hour <= nowHour && value != null) {
                    lastActualIndex = index;
                }
            });

            return rows.map((value, index) => {
                const hour = Number(forecastData.hours[index]);
                if (hour > nowHour) return null;
                const fallback = forecastData.actual[index];
                if (value != null) return value;
                if (fallback != null) return fallback;
                if (lastActualIndex >= 0 && index > lastActualIndex) return 0;
                return null;
            });
        }

        const forecastTotal = computed(() => {
            if (Number.isFinite(forecastData.operationalTotal)) {
                return forecastData.operationalTotal.toFixed(1);
            }
            const source = forecastData.forecastRaw.length ? forecastData.forecastRaw : forecastData.forecast;
            const sum = source.reduce((s, v) => s + valueOrZero(v), 0);
            return sum.toFixed(1);
        });

        const actualTotal = computed(() => {
            const liveYield = Number(infoData.solarYieldToday);
            if (isSelectedToday.value && Number.isFinite(liveYield) && liveYield >= 0) {
                return liveYield.toFixed(1);
            }
            const source = forecastData.actualRaw.length ? actualRowsWithLiveDelta() : forecastData.actual;
            const sum = source.reduce((s, v) => s + valueOrZero(v), 0);
            return sum.toFixed(1);
        });

        const hybridForecastTotal = computed(() => {
            const sum = forecastData.hybrid.reduce((s, v) => s + valueOrZero(v), 0);
            return sum.toFixed(1);
        });

        const conservativeForecastTotal = computed(() => {
            if (Number.isFinite(forecastData.conservativeTotal)) {
                const forecastCap = Number(forecastTotal.value);
                const capped = Number.isFinite(forecastCap)
                    ? Math.min(forecastData.conservativeTotal, forecastCap)
                    : forecastData.conservativeTotal;
                return capped.toFixed(1);
            }
            const sum = forecastData.conservative.reduce((s, v) => s + valueOrZero(v), 0);
            const forecastCap = Number(forecastTotal.value);
            return (Number.isFinite(forecastCap) ? Math.min(sum, forecastCap) : sum).toFixed(1);
        });

        const hasHybridForecast = computed(() => {
            return forecastData.hybrid.some(v => v != null);
        });

        const hasConservativeForecast = computed(() => {
            return forecastData.conservative.some(v => v != null);
        });

        const hasWeatherTrace = computed(() => weatherTrace.value.length > 0);

        const deviationPercent = computed(() => {
            const act = parseFloat(actualTotal.value);
            const pred = parseFloat(forecastTotal.value);
            if (pred === 0) return 0;
            return ((act - pred) / pred) * 100;
        });

        const isTodayPartial = computed(() => {
            const evaluated = cleanEvalStats.today.evaluationHours;
            const candidates = cleanEvalStats.today.productionCandidates;
            return isSelectedToday.value && evaluated != null && candidates != null && candidates > 0 && evaluated < candidates;
        });
        const dayQualityLabel = computed(() => isSelectedToday.value ? t("home.todayQuality") : t("home.dayQuality"));
        const dayErrorLabel = computed(() => isSelectedToday.value ? t("home.todayError") : t("home.dayError"));
        const dayLearningBasisLabel = computed(() => isSelectedToday.value ? t("home.todayLearningBasis") : t("home.dayLearningBasis"));
        const dayDiscardedLabel = computed(() => isSelectedToday.value ? t("home.todayDiscarded") : t("home.dayDiscarded"));

        const deviationLabel = computed(() => {
            const prefix = isTodayPartial.value ? (t('common.live') + ' ') : '';
            return `${prefix}${deviationPercent.value >= 0 ? '+' : ''}${deviationPercent.value.toFixed(0)}%`;
        });

        const todayForecastErrorPercent = computed(() => {
            return cleanEvalStats.today.forecastError;
        });

        const todayForecastAccuracyPercent = computed(() => {
            if (cleanEvalStats.today.forecastAccuracy != null) {
                return cleanEvalStats.today.forecastAccuracy;
            }
            if (todayForecastErrorPercent.value != null) {
                return Math.max(0, 100 - Math.abs(todayForecastErrorPercent.value));
            }
            return cleanEvalStats.today.accuracy;
        });

        const todayForecastErrorLabel = computed(() => {
            const value = todayForecastErrorPercent.value;
            if (value == null || Number.isNaN(value)) return null;
            return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
        });

        const todayForecastErrorIcon = computed(() => {
            const value = todayForecastErrorPercent.value;
            if (value == null || Number.isNaN(value)) return '↕️';
            if (value > 0) return '↗️';
            if (value < 0) return '⚠️';
            return '✓';
        });

        const forecastDeviationKwh = computed(() => {
            const act = parseFloat(actualTotal.value);
            const pred = parseFloat(forecastTotal.value);
            if (Number.isNaN(act) || Number.isNaN(pred)) return null;
            return act - pred;
        });

        const forecastDeviationKwhLabel = computed(() => {
            const value = forecastDeviationKwh.value;
            if (value == null || Number.isNaN(value)) return '--';
            return `${value >= 0 ? '+' : ''}${value.toFixed(1)} kWh`;
        });

        const hybridDeviationPercent = computed(() => {
            const actualRows = actualRowsWithLiveDelta();
            const hybridRows = forecastData.hybrid || [];
            const cleanEligible = forecastData.cleanEligible || [];
            const evaluated = actualRows
                .map((actual, idx) => ({
                    actual,
                    hybrid: hybridRows[idx],
                    clean: cleanEligible[idx],
                }))
                .filter(row => row.clean !== false)
                .filter(row => row.actual != null && row.hybrid != null)
                .filter(row => (Number(row.actual) || 0) > 0.01 || (Number(row.hybrid) || 0) > 0.01);
            if (!evaluated.length) return null;
            const act = evaluated.reduce((sum, row) => sum + (Number(row.actual) || 0), 0);
            const pred = evaluated.reduce((sum, row) => sum + (Number(row.hybrid) || 0), 0);
            if (pred <= 0) return null;
            return ((act - pred) / pred) * 100;
        });

        const hybridDeviationLabel = computed(() => {
            const value = hybridDeviationPercent.value;
            if (value == null || Number.isNaN(value)) return '--';
            const prefix = isTodayPartial.value ? (t('common.live') + ' ') : '';
            return `${prefix}${value >= 0 ? '+' : ''}${value.toFixed(0)}%`;
        });

        const todayLearningBasisLabel = computed(() => {
            const learning = cleanEvalStats.today.learningHours ?? cleanEvalStats.today.evaluationHours;
            const candidates = cleanEvalStats.today.learningCandidates ?? cleanEvalStats.today.productionCandidates;
            if (learning == null || candidates == null || candidates <= 0) return null;
            return `${learning}/${candidates} h`;
        });

        const todayDiscardedLearningLabel = computed(() => {
            const discarded = cleanEvalStats.today.discardedLearningHours || 0;
            if (discarded <= 0) return '0 h';

            const labels = {
                mppt_throttled: 'MPPT',
                inverter_clipped: 'Clipping',
                missing_data: t('solar.discarded.missingData'),
                manual_pause: t('solar.discarded.manualPause'),
                suspected_battery_curtailment: t('solar.discarded.suspectedBatteryCurtailment'),
                demand_limited_zero_export: t('solar.discarded.demandLimitedZeroExport'),
                excluded_from_clean_evaluation: t('solar.discarded.excludedFromCleanEvaluation'),
                excluded: t('solar.discarded.excluded'),
                weather_alert: t('solar.discarded.weatherAlert'),
                snow: t('solar.discarded.snow'),
                fog: t('solar.discarded.fog'),
                grid_failure: t('solar.discarded.gridFailure'),
                external_limit: t('solar.discarded.externalLimit'),
                inverter_limit: t('solar.discarded.inverterLimit'),
                manual_limit: t('solar.discarded.manualLimit'),
                battery_full: t('solar.discarded.batteryFull'),
                curtailment: t('solar.discarded.curtailment'),
            };
            const breakdown = cleanEvalStats.today.discardedLearningReasonBreakdown || {};
            const parts = Object.entries(breakdown)
                .filter(([, hours]) => hours > 0)
                .map(([reason, hours]) => `${hours} h ${labels[reason] || reason}`);
            return parts.length ? parts.join(', ') : `${discarded} h`;
        });

        const todayCoverageExplanation = computed(() => {
            const coverage = cleanEvalStats.today.coverage;
            if (coverage == null) return null;

            const evaluated = cleanEvalStats.today.evaluationHours;
            const candidates = cleanEvalStats.today.productionCandidates;
            const missingActual = cleanEvalStats.today.missingActualHours || 0;
            const excludedMppt = cleanEvalStats.today.excludedMppt || 0;
            const excludedClipped = cleanEvalStats.today.excludedInverterClippedHours || 0;
            const weatherAlerts = cleanEvalStats.today.weatherAlertHours || 0;
            const parts = [];
            if (missingActual > 0) parts.push(t('home.coverage.missingActual', { hours: missingActual }));
            if (excludedMppt > 0) parts.push(t('home.coverage.excludedMppt', { hours: excludedMppt }));
            if (excludedClipped > 0) parts.push(t('home.coverage.excludedClipped', { hours: excludedClipped }));
            if (weatherAlerts > 0) parts.push(t('home.coverage.weatherAlertsIncluded', { hours: weatherAlerts }));

            if (evaluated != null && candidates != null && candidates > 0) {
                if (parts.length > 0) {
                    return t('home.coverage.evaluatedWithRest', { evaluated, candidates, parts: parts.join(', ') });
                }
                return t('home.coverage.evaluatedFull', { evaluated, candidates });
            }

            return t('home.coverage.fallback');
        });

        const hubbleView = computed(() => {
            const payload = hubble.value;
            if (!payload || !payload.available) return null;

            const metrics = payload.metrics || {};
            const bestWindow = payload.best_window || null;
            const moment = payload.moment || 'midday';
            const hasBattery = metrics.battery_available === true;
            const windowLabel = formatHubbleWindow(bestWindow);
            const forecast = formatHubbleNumber(metrics.forecast_today_kwh, 1);
            const solarYield = formatHubbleNumber(metrics.solar_yield_kwh, 1);
            const autarky = formatHubbleNumber(metrics.autarky_percent, 0);
            const quality = formatHubbleNumber(metrics.forecast_quality_percent, 1);
            const error = formatHubbleSigned(metrics.forecast_error_percent, 1);
            const gridImport = formatHubbleNumber(metrics.grid_import_kwh, 2);
            const batteryCharge = formatHubbleNumber(metrics.solar_to_battery_kwh, 2);
            const avgBattery = formatHubbleNumber(metrics.avg_battery_charge_7d_kwh, 1);
            const avgConsumption = formatHubbleNumber(metrics.avg_home_consumption_7d_kwh, 1);
            const currentPrice = formatHubbleNumber(metrics.price_current_ct, 2);
            const avgPrice = formatHubbleNumber(metrics.price_avg_ct, 2);
            const predicted = formatHubbleNumber(metrics.evaluation_predicted_kwh, 2);
            const actual = formatHubbleNumber(metrics.evaluation_actual_kwh, 2);
            const absError = formatHubbleNumber(Math.abs(Number(metrics.forecast_error_percent)), 0);
            const consumptionRatio = buildHubbleConsumptionRatio(metrics);
            const consumptionShare = consumptionRatio != null ? consumptionRatio.toFixed(0) : '--';
            const peakPower = formatHubblePower(metrics.peak_solar_w);
            const peakTime = metrics.peak_solar_time || '--';
            const declineHour = metrics.decline_hour != null
                ? String(metrics.decline_hour).padStart(2, '0') + ':00'
                : t('home.hubble.noDecline');
            const variantSeed = payload.variant_seed != null ? payload.variant_seed : 0;
            const yesterday = payload.yesterday || null;
            const workflowStatus = payload.signals?.workflow_status || null;
            const learnedShadow = payload.signals?.learned_shadow || null;
            const balancePayload = payload.day_balance;
            let dayBalance = null;
            if (balancePayload?.available === true) {
                const sourceMeta = {
                    solar: { label: t('home.hubble.dayBalance.solarDirect') },
                    battery: { label: t('home.hubble.dayBalance.battery') },
                    grid: { label: t('home.hubble.dayBalance.grid') },
                    unknown: { label: t('home.hubble.dayBalance.unknown') },
                };
                const sources = ['solar', 'battery', 'grid', 'unknown']
                    .filter(key => balancePayload.sources?.[key])
                    .map(key => ({
                        key,
                        label: sourceMeta[key].label,
                        kwh: formatHubbleNumber(balancePayload.sources[key].kwh, 2),
                        percent: Number(balancePayload.sources[key].percent) || 0,
                    }));
                const dataQuality = balancePayload.data_quality || 'ok';
                dayBalance = {
                    homeConsumption: formatHubbleNumber(balancePayload.home_consumption_kwh, 2),
                    dataQuality,
                    sources,
                    activeSources: sources.filter(source => source.percent > 0),
                    warning: dataQuality === 'critical'
                        ? t('home.hubble.dayBalance.inconsistent')
                        : dataQuality === 'warning'
                            ? t('home.hubble.dayBalance.incomplete')
                            : null,
                };
            }

            const chainPayload = payload.energy_chain;
            let energyChain = null;
            if (chainPayload?.available === true) {
                const system = chainPayload.system || {};
                const dataQuality = ['good', 'partial', 'pending', 'inconsistent'].includes(chainPayload.data_quality)
                    ? chainPayload.data_quality
                    : 'pending';
                const systemEfficiency = Number(system.efficiency_percent);
                const systemAvailable = system.available === true && Number.isFinite(systemEfficiency);
                const branchView = (branch, pendingKey) => {
                    const efficiency = Number(branch?.efficiency_percent);
                    const available = branch?.available === true && Number.isFinite(efficiency);
                    return {
                        available,
                        label: available ? `${formatHubbleNumber(efficiency, 1)}%` : t(pendingKey),
                    };
                };
                energyChain = {
                    dataQuality,
                    qualityLabel: t(`home.hubble.energyChain.status.${dataQuality}`),
                    dcInput: systemAvailable ? formatHubbleNumber(system.dc_input_kwh, 2) : '--',
                    usefulOutput: systemAvailable ? formatHubbleNumber(system.useful_output_kwh, 2) : '--',
                    loss: systemAvailable ? `${formatHubbleNumber(system.loss_kwh, 2)} kWh` : '--',
                    systemEfficiency: systemAvailable ? `${formatHubbleNumber(systemEfficiency, 1)}%` : '--',
                    progress: systemAvailable ? Math.max(0, Math.min(360, systemEfficiency * 3.6)) : 0,
                    netAutarky: chainPayload.net_autarky_percent != null
                        ? `${formatHubbleNumber(chainPayload.net_autarky_percent, 1)}%`
                        : '--',
                    adjustedAutarky: chainPayload.loss_adjusted_autarky_percent != null
                        ? `${formatHubbleNumber(chainPayload.loss_adjusted_autarky_percent, 1)}%`
                        : '--',
                    coverage: chainPayload.measurement_coverage_percent != null
                        ? `${formatHubbleNumber(chainPayload.measurement_coverage_percent, 1)}%`
                        : '--',
                    pv: branchView(chainPayload.pv, 'home.hubble.energyChain.noPvWindow'),
                    battery: chainPayload.battery
                        ? branchView(chainPayload.battery, 'home.hubble.energyChain.noBatteryWindow')
                        : null,
                };
            }

            const storyParams = {
                hasWindow: Boolean(bestWindow),
                forecast,
                forecastTomorrow: formatHubbleNumber(metrics.forecast_tomorrow_kwh, 1),
                solar: solarYield,
                consumption: formatHubbleNumber(metrics.home_consumption_kwh, 1),
                grid: gridImport,
                autarky,
                quality,
                error,
                absError,
                predicted,
                actual,
                window: windowLabel,
                declineHour,
                battery: batteryCharge,
                average: avgBattery,
                batterySentence: hasBattery
                    ? t('home.hubble.text.batterySentence', { battery: batteryCharge, average: avgBattery })
                    : '',
                batteryPlanningSentence: hasBattery
                    ? t('home.hubble.text.batteryPlanningSentence', { average: avgBattery })
                    : '',
                batteryServedSentence: hasBattery
                    ? t('home.hubble.text.batteryServedSentence', { battery: batteryCharge, average: avgBattery })
                    : '',
                directSource: hasBattery
                    ? t('home.hubble.text.sunAndBattery')
                    : t('home.hubble.text.sun'),
                avgConsumption,
                consumptionShare,
                peakPower,
                peakTime,
                price: currentPrice,
                priceAverage: avgPrice,
                shadowWindow: learnedShadow
                    ? formatHubbleWindow(learnedShadow)
                    : t('home.hubble.noWindow'),
                shadowOccurrence: learnedShadow
                    ? formatHubbleNumber(learnedShadow.occurrence_percent, 0)
                    : '--',
                shadowStrength: learnedShadow
                    ? formatHubbleNumber(learnedShadow.conditional_loss_percent, 0)
                    : '--',
            };

            const leadKeySpec = `home.hubble.lead.${moment}_v${variantSeed}`;
            const leadKeyBase = {
                morning: 'home.hubble.lead.morning',
                midday: metrics.forecast_quality_percent != null
                    ? 'home.hubble.lead.middayQuality'
                    : 'home.hubble.lead.midday',
                evening: 'home.hubble.lead.evening',
            }[moment] || 'home.hubble.lead.midday';
            const leadKey = t(leadKeySpec, storyParams) !== leadKeySpec ? leadKeySpec : leadKeyBase;

            const chips = [
                { key: 'yield', label: t('home.hubble.chip.yield'), value: metrics.solar_yield_kwh != null ? `${solarYield} kWh` : `${forecast} kWh`, title: t('home.hubble.chip.yieldTitle') },
                { key: 'autarky', label: t('energy.autarky'), value: metrics.autarky_percent != null ? `${autarky}%` : t('common.noData') },
                { key: 'quality', label: t('home.hubble.chip.quality'), value: metrics.forecast_quality_percent != null ? `${quality}%` : t('common.noData') },
                { key: 'window', label: t('home.hubble.chip.window'), value: windowLabel },
            ];
            if (learnedShadow?.available) {
                chips.push({
                    key: 'shadow',
                    label: t('home.hubble.chip.shadow'),
                    value: formatHubbleWindow(learnedShadow),
                    title: t('home.hubble.chip.shadowTitle', storyParams),
                });
            }
            if (workflowStatus?.is_running) {
                chips.unshift({
                    key: 'workflow',
                    label: t('home.hubble.chip.system'),
                    value: t('home.hubble.state.active'),
                    title: workflowStatus.current_step || null,
                });
            }

            const systemStatus = buildHubbleSystemStatus(workflowStatus);
            const story = buildHubbleStory(moment, storyParams, variantSeed, yesterday, payload.signals || {});
            const hasMemory = payload.memory?.available === true
                && Array.isArray(payload.memory.matches)
                && payload.memory.matches.length >= 2;
            const quickActionKeys = hasBattery
                ? ['now', 'load', 'confidence', 'battery']
                : ['now', 'load', 'confidence'];
            if (hasMemory) quickActionKeys.push('memory');
            quickActionKeys.push('helpers');
            const quickActions = quickActionKeys.map(key => ({
                key,
                label: t(`home.hubble.quick.${key}`),
            }));
            const answer = buildHubbleAnswer(hubbleQuestion.value, payload, storyParams);

            return {
                title: systemStatus?.title || t('home.hubble.title'),
                moment: t(`home.hubble.moment.${moment}`),
                moment_key: moment,
                is_pulsing: moment !== 'evening',
                systemStatus,
                dayBalance,
                energyChain,
                chips,
                lead: t(leadKey, storyParams),
                tip: buildHubbleTip(payload, windowLabel),
                quickActions,
                answer,
                story,
                updated: t('home.hubble.updated', {
                    time: formatHubbleTime(payload.generated_at),
                }),
            };
        });

        function buildHubbleSystemStatus(workflowStatus) {
            if (!workflowStatus) {
                return {
                    variant: 'ready',
                    title: t('home.hubble.state.ready'),
                    meta: t('home.hubble.system.readyMeta'),
                };
            }

            const workflowName = formatWorkflowName(workflowStatus.workflow);
            const step = formatWorkflowStepLabel(workflowStatus.current_step);
            const progress = workflowStatus.progress || '--';
            const duration = formatHubbleDuration(getLiveWorkflowDurationSeconds(workflowStatus));

            if (workflowStatus.is_running) {
                return {
                    variant: 'active',
                    title: t('home.hubble.state.active'),
                    meta: t('home.hubble.system.runningMeta', { workflow: workflowName, step, progress, duration }),
                };
            }

            if (workflowStatus.status === 'error' || workflowStatus.status === 'partial') {
                return {
                    variant: 'attention',
                    title: t('home.hubble.state.attention'),
                    meta: workflowStatus.last_error || t('home.hubble.system.attentionMeta', { workflow: workflowName }),
                };
            }

            return null;
        }

        function formatWorkflowName(workflow) {
            const key = `home.hubble.workflow.${workflow || 'idle'}`;
            const translated = t(key);
            return translated !== key ? translated : (workflow || t('home.hubble.workflow.idle'));
        }

        function getLiveWorkflowDurationSeconds(workflowStatus) {
            if (!workflowStatus) return null;

            const fallback = Number(workflowStatus.duration_seconds);
            if (!workflowStatus.is_running || !workflowStatus.started_at) {
                return Number.isFinite(fallback) ? fallback : null;
            }

            const startedAt = Date.parse(workflowStatus.started_at);
            if (!Number.isFinite(startedAt)) {
                return Number.isFinite(fallback) ? fallback : null;
            }

            const elapsed = Math.max(0, Math.floor((workflowClockNow.value - startedAt) / 1000));
            return Number.isFinite(fallback) ? Math.max(fallback, elapsed) : elapsed;
        }

        function formatWorkflowStepLabel(step) {
            if (!step) return t('home.hubble.workflowStep.unknown');

            const normalized = String(step).toLowerCase();
            const matchers = [
                ['weather model', 'weatherModel'],
                ['main ai model', 'forecastModel'],
                ['drift detection', 'driftDetection'],
                ['daily summary', 'dailySummary'],
                ['archive', 'archive'],
                ['weather precision', 'weatherPrecision'],
                ['method performance', 'methodPerformance'],
                ['panel-group efficiency', 'panelGroups'],
                ['group method', 'panelGroups'],
                ['physics engine', 'physicsCalibration'],
                ['weather expert', 'weatherExpert'],
                ['shadow patterns', 'shadowPatterns'],
                ['night cleanup', 'cleanup'],
                ['finalizing day', 'finalizeDay'],
                ['completed with issues', 'completedWithIssues'],
                ['completed', 'completed'],
                ['failed', 'failed'],
                ['preparing', 'preparing'],
            ];

            const found = matchers.find(([needle]) => normalized.includes(needle));
            if (!found) return step;

            const key = `home.hubble.workflowStep.${found[1]}`;
            const translated = t(key);
            return translated !== key ? translated : step;
        }

        const hubbleMemoryView = computed(() => {
            const memory = hubble.value?.memory || null;
            if (!memory || !memory.available || !Array.isArray(memory.matches) || memory.matches.length < 2) {
                return null;
            }

            const matches = memory.matches.map(match => ({
                date: formatHubbleDate(match.date),
                similarity: formatHubbleNumber(match.similarity_percent, 0),
                yield: formatHubbleNumber(match.yield_kwh, 1),
                forecast: formatHubbleNumber(match.forecast_kwh, 1),
                autarky: formatHubbleNumber(match.autarky_percent, 0),
                window: match.window ? formatHubbleWindow(match.window) : t('home.hubble.noWindow'),
            }));
            const bestMatch = matches[0];
            const dates = matches.map(match => match.date).join(', ');
            const commonWindow = memory.common_window ? formatHubbleWindow(memory.common_window) : null;
            const params = {
                count: memory.match_count || matches.length,
                dates,
                bestDate: bestMatch?.date || dates,
                bestSimilarity: bestMatch?.similarity || '--',
                bestYield: bestMatch?.yield || '--',
                bestAutarky: bestMatch?.autarky || '--',
                bestWindow: bestMatch?.window || t('home.hubble.noWindow'),
                similarity: formatHubbleNumber(memory.avg_similarity_percent, 0),
                yield: formatHubbleNumber(memory.avg_yield_kwh, 1),
                forecast: formatHubbleNumber(memory.avg_forecast_kwh, 1),
                autarky: formatHubbleNumber(memory.avg_autarky_percent, 0),
                window: commonWindow || t('home.hubble.noWindow'),
            };

            return {
                title: t('home.hubbleMemory.title'),
                special: t('home.hubbleMemory.special', params),
                lead: t('home.hubbleMemory.lead', params),
                comparable: t('home.hubbleMemory.comparable', params),
                advice: commonWindow
                    ? t('home.hubbleMemory.adviceWindow', params)
                    : t('home.hubbleMemory.adviceNoWindow', params),
                detailIntro: t('home.hubbleMemory.detailIntro'),
                chips: [
                    { key: 'matches', label: t('home.hubbleMemory.chip.matches'), value: String(params.count) },
                    { key: 'similarity', label: t('home.hubbleMemory.chip.similarity'), value: `${params.similarity}%` },
                    { key: 'yield', label: t('home.hubbleMemory.chip.yield'), value: `${params.yield} kWh` },
                    { key: 'window', label: t('home.hubbleMemory.chip.window'), value: params.window },
                ],
                matches: matches.map(match => ({
                    date: match.date,
                    text: t('home.hubbleMemory.matchLine', match),
                })),
            };
        });

        // Helpers
        function fmtW(val) {
            if (val == null) return '0 W';
            const abs = Math.abs(val);
            if (abs >= 1000) return (val / 1000).toFixed(1) + ' kW';
            return Math.round(val) + ' W';
        }

        function restoreForecastLegendSelected() {
            try {
                const raw = window.localStorage.getItem(FORECAST_LEGEND_STORAGE_KEY);
                if (!raw) return;
                const parsed = JSON.parse(raw);
                if (!parsed || typeof parsed !== 'object') return;
                Object.keys(forecastLegendSelected).forEach((key) => {
                    if (typeof parsed[key] === 'boolean') {
                        forecastLegendSelected[key] = parsed[key];
                    }
                });
            } catch (err) {
                console.warn('[Home] Failed to restore forecast legend state:', err);
            }
        }

        function persistForecastLegendSelected() {
            try {
                window.localStorage.setItem(
                    FORECAST_LEGEND_STORAGE_KEY,
                    JSON.stringify({ ...forecastLegendSelected }),
                );
            } catch (err) {
                console.warn('[Home] Failed to persist forecast legend state:', err);
            }
        }

        function fmtKw(val) {
            if (val == null) return '0 W';
            const abs = Math.abs(val);
            if (abs >= 1000) return (val / 1000).toFixed(1) + ' kW';
            return Math.round(val) + ' W';
        }

        function getGridPower() {
            if (flow.house_to_grid > 0) return '-' + flow.house_to_grid.toFixed(0);
            const imp = (flow.grid_to_house || 0) + (flow.grid_to_battery || 0);
            return imp > 0 ? '+' + imp.toFixed(0) : '0';
        }

        function getGridLabel() {
            if (flow.house_to_grid > 0) return 'Export';
            if (flow.grid_to_house > 0 || flow.grid_to_battery > 0) return 'Import';
            return 'Idle';
        }

        function fmtKw(w) {
            if (w == null) return '--';
            if (Math.abs(w) >= 1000) return (w / 1000).toFixed(1) + ' kW';
            return Math.round(w) + ' W';
        }

        function formatHubbleNumber(value, digits = 1) {
            const number = Number(value);
            if (!Number.isFinite(number)) return '--';
            return number.toFixed(digits);
        }

        function formatHubblePower(value) {
            const number = Number(value);
            if (!Number.isFinite(number)) return '--';
            if (Math.abs(number) >= 1000) return `${(number / 1000).toFixed(1)} kW`;
            return `${Math.round(number)} W`;
        }

        function formatHubbleSigned(value, digits = 1) {
            const number = Number(value);
            if (!Number.isFinite(number)) return '--';
            return `${number >= 0 ? '+' : ''}${number.toFixed(digits)}`;
        }

        function formatHubbleTime(value) {
            if (!value) return currentTime.value || '--';
            return formatHaTime(value) || currentTime.value || '--';
        }

        function formatHubbleDate(value) {
            if (!value) return '--';
            return formatHaDateOnly(value) || value;
        }

        function formatHubbleWindow(bestWindow) {
            if (!bestWindow) return t('home.hubble.noWindow');
            const start = String(bestWindow.start_hour).padStart(2, '0') + ':00';
            const end = String(bestWindow.end_hour).padStart(2, '0') + ':00';
            return bestWindow.start_hour === bestWindow.end_hour ? start : `${start}-${end}`;
        }

        function formatHubbleDuration(seconds) {
            const value = Number(seconds);
            if (!Number.isFinite(value) || value < 0) return '--';
            const minutes = Math.floor(value / 60);
            const rest = Math.floor(value % 60);
            return `${minutes}:${String(rest).padStart(2, '0')} min`;
        }

        function buildHubbleTip(payload, windowLabel) {
            const metrics = payload.metrics || {};
            const learnedShadow = payload.signals?.learned_shadow || null;
            const hasBattery = metrics.battery_available === true;
            const type = payload.tip_type || 'flex_load_window';
            const params = {
                window: windowLabel,
                battery: formatHubbleNumber(metrics.solar_to_battery_kwh, 2),
                average: formatHubbleNumber(metrics.avg_battery_charge_7d_kwh, 1),
                price: formatHubbleNumber(metrics.price_current_ct, 2),
                priceAverage: formatHubbleNumber(metrics.price_avg_ct, 2),
                shadowWindow: learnedShadow
                    ? formatHubbleWindow(learnedShadow)
                    : t('home.hubble.noWindow'),
                shadowOccurrence: learnedShadow
                    ? formatHubbleNumber(learnedShadow.occurrence_percent, 0)
                    : '--',
                shadowStrength: learnedShadow
                    ? formatHubbleNumber(learnedShadow.conditional_loss_percent, 0)
                    : '--',
            };
            if (learnedShadow?.available && payload.best_window) {
                const beforeShadow = Number(payload.best_window.end_hour) < Number(learnedShadow.start_hour);
                return t(
                    beforeShadow
                        ? 'home.hubble.tip.shadowBefore'
                        : 'home.hubble.tip.shadowKnown',
                    params,
                );
            }
            if (hasBattery && type === 'battery_served') return t('home.hubble.tip.batteryServed', params);
            if (type === 'cheap_price_plus_solar') return t('home.hubble.tip.cheapPricePlusSolar', params);
            if (type === 'evening_review') return t('home.hubble.tip.eveningReview', params);
            if (type === 'watch_day') return t('home.hubble.tip.watchDay', params);
            return t('home.hubble.tip.flexLoadWindow', params);
        }

        function buildHubbleConsumptionRatio(metrics) {
            const consumption = Number(metrics.home_consumption_kwh);
            const average = Number(metrics.avg_home_consumption_7d_kwh);
            if (!Number.isFinite(consumption) || !Number.isFinite(average) || average <= 0) return null;
            return (consumption / average) * 100;
        }

        function buildHubbleAnswer(question, payload, params) {
            if (!question) return null;
            const metrics = payload.metrics || {};
            const hasWindow = Boolean(payload.best_window);
            const hasQuality = metrics.forecast_quality_percent != null;
            const hasBattery = metrics.battery_available === true
                && metrics.solar_to_battery_kwh != null
                && metrics.avg_battery_charge_7d_kwh != null;
            const consumptionRatio = buildHubbleConsumptionRatio(metrics);
            let answerKey = null;

            if (question === 'now') {
                if (consumptionRatio == null) {
                    answerKey = 'home.hubble.answer.nowInsight';
                } else if (consumptionRatio < 70) {
                    answerKey = 'home.hubble.answer.nowInsightLower';
                } else if (consumptionRatio <= 120) {
                    answerKey = 'home.hubble.answer.nowInsightTypical';
                } else {
                    answerKey = 'home.hubble.answer.nowInsightHigher';
                }
            } else if (question === 'load') {
                answerKey = hasWindow ? 'home.hubble.answer.loadYes' : 'home.hubble.answer.loadWait';
            } else if (question === 'confidence') {
                answerKey = hasQuality ? 'home.hubble.answer.confidenceKnown' : 'home.hubble.answer.confidencePending';
            } else if (question === 'battery') {
                if (metrics.battery_available !== true) return null;
                answerKey = hasBattery ? 'home.hubble.answer.batteryKnown' : 'home.hubble.answer.batteryPending';
            } else if (question === 'memory') {
                const memory = hubbleMemoryView.value;
                if (!memory) return null;
                return {
                    label: t('home.hubble.quick.memory'),
                    chips: memory.chips,
                    paragraphs: [
                        memory.special,
                        memory.lead,
                        memory.comparable,
                        memory.advice,
                        memory.detailIntro,
                        ...memory.matches.map(match => match.text),
                    ],
                };
            } else if (question === 'helpers') {
                const consumersList = payload.configured_consumers || [];
                if (consumersList.length === 0) {
                    return {
                        label: t('home.hubble.quick.helpers') || 'Sensoren-Status',
                        text: t('home.hubble.answer.helpersNoneConfigured') || "Es sind keine Großverbraucher (Wärmepumpe, Heizstab oder Wallbox) konfiguriert."
                    };
                }
                return {
                    label: t('home.hubble.quick.helpers') || 'Sensoren-Status',
                    isHelpers: true,
                    text: t('home.hubble.answer.helpersText') || "Status der konfigurierten Großverbraucher:",
                    consumers: consumersList
                };
            }

            if (!answerKey) return null;
            return {
                label: t(`home.hubble.quick.${question}`),
                text: t(answerKey, params),
            };
        }

        function buildHubbleStory(moment, params, variantSeed, yesterday, signals = {}) {
            const storyMoment = ['morning', 'midday', 'evening'].includes(moment) ? moment : 'midday';
            
            const getVar = (name) => {
                const specKey = `home.hubble.story.${storyMoment}.${name}_v${variantSeed}`;
                const baseKey = `home.hubble.story.${storyMoment}.${name}`;
                return t(specKey, params) !== specKey ? t(specKey, params) : t(baseKey, params);
            };

            const tiles = [];

            const insightParas = [];
            const recordSignal = signals.record_signal || null;
            if (recordSignal) {
                insightParas.push(t(`home.hubble.special.record.${recordSignal.level}`, {
                    solar: formatHubbleNumber(recordSignal.solar_kwh, 1),
                    record: formatHubbleNumber(recordSignal.record_kwh, 1),
                }));
            }
            const forecastIssue = signals.forecast_issue || null;
            if (forecastIssue) {
                insightParas.push(t('home.hubble.special.forecastIssue', {
                    error: formatHubbleSigned(forecastIssue.error_percent, 0),
                    reason: forecastIssue.reason || t('home.hubble.special.unknownReason'),
                }));
            }
            const helperFeedback = signals.helper_feedback || null;
            if (helperFeedback) {
                insightParas.push(t(`home.hubble.special.${helperFeedback.type}`, {
                    hpPvPercent: formatHubbleNumber(helperFeedback.hp_pv_percent, 0),
                    window: formatHubbleWindow(helperFeedback.window),
                }));
            }
            const negativePrice = signals.negative_price_signal || null;
            if (negativePrice) {
                insightParas.push(t('home.hubble.special.negativePrice', {
                    price: formatHubbleNumber(negativePrice.price_ct, 2),
                }));
            }
            const workflowStatus = signals.workflow_status || null;
            if (workflowStatus?.is_running) {
                insightParas.push(t('home.hubble.special.workflowRunning', {
                    workflow: formatWorkflowName(workflowStatus.workflow),
                    step: formatWorkflowStepLabel(workflowStatus.current_step),
                    progress: workflowStatus.progress || '--',
                    duration: formatHubbleDuration(getLiveWorkflowDurationSeconds(workflowStatus)),
                }));
            }
            if (insightParas.length) {
                tiles.push({
                    key: 'special-tile',
                    type: 'tile',
                    icon: '◦',
                    title: t('home.hubble.special.title'),
                    paragraphs: insightParas.filter(p => p && !p.startsWith('home.hubble.special.')),
                });
            }

            // 1. Status-Kachel
            const statusParas = [];
            statusParas.push(getVar('intro'));
            statusParas.push(t(`home.hubble.story.${storyMoment}.status`, params));
            statusParas.push(t(`home.hubble.story.${storyMoment}.forecast`, params));
            tiles.push({
                key: 'status-tile',
                type: 'tile',
                icon: '🌤️',
                title: t('home.dayForecastVsActual'),
                paragraphs: statusParas.filter(p => p && !p.startsWith('home.hubble.story.')),
            });

            // 2. Ratschlag-Kachel
            const adviceParas = [];
            if (params.hasWindow) {
                adviceParas.push(t(`home.hubble.story.${storyMoment}.outlook`, params));
            }
            adviceParas.push(getVar('proTip'));
            tiles.push({
                key: 'advice-tile',
                type: 'tile',
                icon: '💡',
                title: t('home.hubble.story.morning.proTipTitle'),
                paragraphs: adviceParas.filter(p => p && !p.startsWith('home.hubble.story.')),
            });

            // 3. Gestern-Report-Kachel (falls vorhanden)
            if (yesterday) {
                const yesterdayParas = [];
                const repKey = `home.yesterdayReport.v${variantSeed}`;
                
                const yParams = {
                    solar: formatHubbleNumber(yesterday.solar_yield_kwh, 1),
                    consumption: formatHubbleNumber(yesterday.home_consumption_kwh, 1),
                    grid: formatHubbleNumber(yesterday.grid_import_kwh, 1),
                    autarky: formatHubbleNumber(yesterday.autarky_percent, 0),
                    savings: formatHubbleNumber(yesterday.savings_eur, 2),
                    quality: formatHubbleNumber(yesterday.accuracy_percent, 0),
                    error: formatHubbleNumber(yesterday.error_percent, 0),
                    batterySentence: '',
                };

                if (yesterday.solar_to_battery_kwh != null && yesterday.grid_to_battery_kwh != null) {
                    yParams.batterySentence = t('home.hubble.text.batterySentence', {
                        battery: formatHubbleNumber(yesterday.solar_to_battery_kwh, 2),
                        average: formatHubbleNumber(yesterday.solar_to_battery_kwh, 1),
                    });
                }

                yesterdayParas.push(t(repKey, yParams));

                if (yesterday.hp_kwh > 0.1 && yesterday.hp_pv_percent != null) {
                    yesterdayParas.push(t('home.hubble.text.hpSentence', {
                        hpPvPercent: formatHubbleNumber(yesterday.hp_pv_percent, 0),
                        hpPv: formatHubbleNumber(yesterday.hp_pv_kwh, 1),
                        hp: formatHubbleNumber(yesterday.hp_kwh, 1),
                    }));
                }

                if (yesterday.wallbox_kwh > 0.1) {
                    yesterdayParas.push(t('home.hubble.text.wallboxSentence', {
                        wallbox: formatHubbleNumber(yesterday.wallbox_kwh, 1),
                    }));
                }

                tiles.push({
                    key: 'yesterday-tile',
                    type: 'tile',
                    icon: '🌱',
                    title: t('home.yesterdayReportTitle'),
                    paragraphs: yesterdayParas.filter(p => p && !p.startsWith('home.yesterdayReport.')),
                });
            }

            // 4. Einfach gesagt
            const simpleParas = [];
            simpleParas.push(t(`home.hubble.story.${storyMoment}.simple`, params));
            simpleParas.push(getVar('closing'));
            tiles.push({
                key: 'simple-tile',
                type: 'tile',
                icon: '⚖️',
                title: t(`home.hubble.story.${storyMoment}.simpleTitle`),
                paragraphs: simpleParas.filter(p => p && !p.startsWith('home.hubble.story.')),
            });

            return tiles;
        }

        function parseTimeToMinutes(value) {
            if (!value || typeof value !== 'string' || !value.includes(':')) return null;
            const [hh, mm] = value.split(':').map(v => Number(v));
            if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
            return (hh * 60) + mm;
        }

        function getTimestampMinutes(entry) {
            const hourKey = entry?.hour_key;
            if (typeof hourKey === 'string' && hourKey.length >= 16) {
                return parseTimeToMinutes(hourKey.slice(11, 16));
            }
            const ts = entry?.local_timestamp || entry?.timestamp || entry?.time;
            if (!ts) return null;
            const dt = new Date(ts);
            if (Number.isNaN(dt.getTime())) return null;
            const parts = new Intl.DateTimeFormat('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: timeContext.timezone || undefined,
            }).formatToParts(dt);
            const hh = Number(parts.find(part => part.type === 'hour')?.value);
            const mm = Number(parts.find(part => part.type === 'minute')?.value);
            if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
            return (hh * 60) + mm;
        }

        function getSolarWindowedPowerData(data) {
            const sunriseMins = parseTimeToMinutes(infoData.sunrise);
            const sunsetMins = parseTimeToMinutes(infoData.sunset);
            if (sunriseMins == null || sunsetMins == null) return data;

            const rangeStart = Math.max(0, sunriseMins - 60);
            const rangeEnd = Math.min((24 * 60) - 1, sunsetMins + 60);
            const filtered = data.filter((entry) => {
                const mins = getTimestampMinutes(entry);
                return mins != null && mins >= rangeStart && mins <= rangeEnd;
            });

            return filtered.length >= 2 ? filtered : data;
        }

        // Sparklines
        function getSparklinePath(panelId) {
            const hist = panelHistory[panelId];
            if (!hist || hist.length < 2) return 'M0,15 L120,15';
            const max = Math.max(...hist, 1);
            const step = 120 / (hist.length - 1);
            return hist.map((v, i) => {
                const x = i * step;
                const y = 28 - (v / max) * 26;
                return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
            }).join(' ');
        }

        function getSparklineAreaPath(panelId) {
            const hist = panelHistory[panelId];
            if (!hist || hist.length < 2) return '';
            const max = Math.max(...hist, 1);
            const step = 120 / (hist.length - 1);
            let path = hist.map((v, i) => {
                const x = i * step;
                const y = 28 - (v / max) * 26;
                return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
            }).join(' ');
            path += ' L120,30 L0,30 Z';
            return path;
        }

        // Clock
        function updateClock() {
            const d = currentHaInstant();
            currentTime.value = formatHaTime(d, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            workflowClockNow.value = d.getTime();
        }

        // ========== DATA LOADING ==========

        async function loadEnergyFlow() {
            try {
                const data = await SFMLApi.fetch('/api/sfml_stats/energy_flow');
                if (!data) return;
                syncTimeContext(data);

                const f = data.flows || data;
                const b = data.battery || {};
                const h = data.home || {};
                batterySocSensorConfigured.value = Boolean(data.configured_sensors?.battery_soc);

                flow.solar_power = f.solar_power ?? 0;
                flow.home_consumption = h.consumption ?? f.home_consumption ?? 0;
                flow.battery_soc = b.soc ?? f.battery_soc ?? null;
                flow.battery_power = b.power ?? f.battery_power ?? 0;
                flow.solar_to_house = f.solar_to_house ?? 0;
                flow.solar_to_battery = f.solar_to_battery ?? 0;
                flow.battery_to_house = f.battery_to_house ?? 0;
                flow.grid_to_house = f.grid_to_house ?? 0;
                flow.house_to_grid = f.house_to_grid ?? 0;
                flow.grid_to_battery = f.grid_to_battery ?? 0;

                if (data.consumers) {
                    Object.assign(consumers, data.consumers);
                }
                flowStatusChips.value = Array.isArray(data.status_chips)
                    ? data.status_chips.filter(chip => chip && chip.label)
                    : [];

                // Panel data
                if (data.panels && Array.isArray(data.panels)) {
                    panels.value = data.panels;
                    // Build sparkline history
                    data.panels.forEach(p => {
                        if (!panelHistory[p.id]) panelHistory[p.id] = [];
                        panelHistory[p.id].push(p.power ?? 0);
                        // Keep last 24 points (~2h at 5min intervals)
                        if (panelHistory[p.id].length > 24) {
                            panelHistory[p.id] = panelHistory[p.id].slice(-24);
                        }
                    });
                }
            } catch (err) {
                console.error('[Home] Energy flow error:', err);
            }
        }

        let summaryRequest = null;

        async function loadSummaryData() {
            if (!summaryRequest) {
                summaryRequest = SFMLApi.fetch('/api/sfml_stats/summary')
                    .finally(() => { summaryRequest = null; });
            }
            return summaryRequest;
        }

        async function loadInfoPanel() {
            try {
                const data = await loadSummaryData();
                if (!data) return;
                syncTimeContext(data);

                // Produktionszeit
                if (data.sun_times) {
                    infoData.sunrise = data.sun_times.sunrise || null;
                    infoData.sunset = data.sun_times.sunset || null;
                    const dh = data.production_time?.duration_seconds;
                    infoData.productionHours = dh ? (dh / 3600).toFixed(1) : null;
                    updatePowerChart();
                }

                if (isSelectedToday.value) {
                    applyDayEvaluationMetrics(data.today);
                }

                const outdoor = data.outdoor_temperature || {};
                const outdoorTemperature = outdoor.temperature_c;
                const cloudCover = outdoor.cloud_cover_percent;
                const condition = outdoor.condition || null;
                const symbol = WEATHER_SYMBOLS[condition] || (cloudCover != null
                    ? (cloudCover >= 80 ? '☁' : cloudCover >= 35 ? '⛅' : '☀')
                    : null);
                const weatherBits = [];
                if (outdoorTemperature != null) {
                    weatherBits.push(`${outdoorTemperature.toFixed(1)}°C`);
                }
                if (symbol) {
                    weatherBits.push(symbol);
                }
                if (cloudCover != null) {
                    weatherBits.push(`${Math.round(cloudCover)}%`);
                }

                if (weatherBits.length > 0) {
                    infoData.outdoorTemperatureLabel = outdoor.source === 'forecast'
                        ? `${weatherBits.join(' ')} Prognose`
                        : `${weatherBits.join(' ')}`;
                } else {
                    infoData.outdoorTemperatureLabel = null;
                }

                infoData.outdoorTemp = outdoorTemperature;
                infoData.outdoorClouds = cloudCover;
                infoData.outdoorCondition = condition;
                infoData.outdoorSource = outdoor.source || null;

                // Peak heute
                const ds = data.daily_stats;
                if (ds) {
                    infoData.peakTodayW = ds.peak_solar_w || null;
                    infoData.peakTodayTime = ds.peak_solar_time || null;
                    infoData.solarYieldToday = ds.solar_yield_kwh ?? null;
                }

                hubble.value = data.hubble || null;

                // Peak Alltime from summary
                const ap = data.alltime_peak;
                if (ap) {
                    infoData.peakAlltimeW = ap.watts;
                    infoData.peakAlltimeDate = ap.date;
                }

                // Multi-day forecasts
                const dfc = data.daily_forecasts;
                if (dfc) {
                    const items = [];
                    for (const [type, val] of Object.entries(dfc)) {
                        if (type === 'today') continue;
                        const label = type === 'tomorrow'
                            ? t('common.tomorrow')
                            : formatHaDateOnly(val.date, { weekday: 'short', day: '2-digit', month: '2-digit' });
                        items.push({ type, kwh: val.kwh, date: val.date, label, sortDate: val.date });
                    }
                    items.sort((a, b) => a.sortDate.localeCompare(b.sortDate));
                    dailyForecasts.value = items;
                }
            } catch (err) {
                console.error('[Home] Info panel error:', err);
            }
        }

        function trimSolarWindow(actualArr, forecastArr) {
            let start = -1, end = -1;
            for (let i = 0; i < actualArr.length; i++) {
                if ((actualArr[i] ?? 0) > 0.01) { if (start < 0) start = i; end = i; }
            }
            for (let i = 0; i < forecastArr.length; i++) {
                if ((forecastArr[i] ?? 0) > 0.01) {
                    if (start < 0 || i < start) start = i;
                    if (i > end) end = i;
                }
            }
            if (start < 0) return { actual: actualArr, forecast: forecastArr };
            const aS = Math.max(0, start - 1);
            const aE = Math.min(forecastArr.length - 1, end + 1);
            return {
                actual: actualArr.map((v, i) => {
                    if (i < aS || i > aE) return null;
                    if (i === aS || i === aE) return 0;
                    return v;
                }),
                forecast: forecastArr.map((v, i) => {
                    if (i < aS || i > aE) return null;
                    if (i === aS || i === aE) return 0;
                    return v;
                }),
                startIdx: aS,
                endIdx: aE,
            };
        }

        function getWeatherIcon(weather) {
            if (!weather) return '·';
            const precipitation = Number(weather.precipitation ?? weather.precipitation_mm ?? 0);
            const clouds = Number(weather.clouds ?? weather.cloud_cover_percent ?? weather.cloud_cover ?? NaN);
            const radiation = Number(weather.solar_radiation_wm2 ?? weather.solar_radiation ?? NaN);

            if (precipitation >= 1.5) return '☂';
            if (precipitation >= 0.2) return '☁';
            if (!Number.isNaN(clouds)) {
                if (clouds <= 35) return '☀';
                if (clouds <= 75) return '⛅';
                return '☁';
            }
            if (!Number.isNaN(radiation)) {
                if (radiation >= 550) return '☀';
                if (radiation >= 160) return '⛅';
                return '☁';
            }
            return '·';
        }

        function getWeatherIndicators(weather) {
            if (!weather) {
                return [
                    { key: 'sun', label: '☀', level: 'none' },
                    { key: 'cloud', label: '☁', level: 'none' },
                    { key: 'rain', label: '☂', level: 'none' },
                ];
            }

            const precipitation = Number(weather.precipitation ?? weather.precipitation_mm ?? 0);
            const clouds = Number(weather.clouds ?? weather.cloud_cover_percent ?? weather.cloud_cover ?? NaN);
            const radiation = Number(weather.solar_radiation_wm2 ?? weather.solar_radiation ?? NaN);

            const sunLevel = !Number.isNaN(radiation)
                ? (radiation >= 550 ? 'high' : radiation >= 180 ? 'medium' : 'low')
                : (!Number.isNaN(clouds) ? (clouds <= 25 ? 'high' : clouds <= 60 ? 'medium' : 'low') : 'none');
            const cloudLevel = Number.isNaN(clouds)
                ? 'none'
                : (clouds >= 75 ? 'high' : clouds >= 35 ? 'medium' : 'low');
            const rainLevel = precipitation >= 1.5 ? 'high' : precipitation >= 0.2 ? 'medium' : 'low';

            return [
                { key: 'sun', label: '☀', level: sunLevel },
                { key: 'cloud', label: '☁', level: cloudLevel },
                { key: 'rain', label: '☂', level: rainLevel },
            ];
        }

        function describeWeather(weather) {
            if (!weather) return t('common.noData');
            const parts = [];
            const temp = weather.temperature ?? weather.temperature_c;
            const clouds = weather.clouds ?? weather.cloud_cover_percent ?? weather.cloud_cover;
            const precipitation = weather.precipitation ?? weather.precipitation_mm;
            const radiation = weather.solar_radiation_wm2 ?? weather.solar_radiation;
            if (temp != null) parts.push(`${Number(temp).toFixed(1)}°C`);
            if (clouds != null) parts.push(t('home.weatherTrace.cloudsLine', { value: Math.round(Number(clouds)) }));
            if (precipitation != null) parts.push(t('home.weatherTrace.rainLine', { value: Number(precipitation).toFixed(1) }));
            if (radiation != null) parts.push(`${Math.round(Number(radiation))} W/m²`);
            return parts.length ? parts.join(' · ') : t('home.weatherTrace.noDetails');
        }

        function compareWeather(expected, actual) {
            if (!expected || !actual) {
                return { state: 'missing', icon: '·', title: t('home.noActualWeather') };
            }

            const expectedClouds = Number(expected.clouds ?? expected.cloud_cover_percent ?? expected.cloud_cover ?? NaN);
            const actualClouds = Number(actual.clouds ?? actual.cloud_cover_percent ?? actual.cloud_cover ?? NaN);
            const expectedRain = Number(expected.precipitation ?? expected.precipitation_mm ?? 0);
            const actualRain = Number(actual.precipitation ?? actual.precipitation_mm ?? 0);

            let score = 0;
            const details = [];
            if (!Number.isNaN(expectedClouds) && !Number.isNaN(actualClouds)) {
                const cloudDelta = Math.abs(expectedClouds - actualClouds);
                details.push(t('home.weatherTrace.cloudsDelta', { value: cloudDelta.toFixed(0) }));
                score += cloudDelta <= 20 ? 0 : cloudDelta <= 40 ? 1 : 2;
            }

            const rainDelta = Math.abs(expectedRain - actualRain);
            if (expectedRain > 0 || actualRain > 0) {
                details.push(t('home.weatherTrace.rainDelta', { value: rainDelta.toFixed(1) }));
            }
            score += rainDelta <= 0.3 ? 0 : rainDelta <= 1.5 ? 1 : 2;

            const detailSuffix = details.length ? ' · ' + details.join(' · ') : '';
            if (score <= 0) return { state: 'good', icon: '✓', title: t('home.weatherTrace.matchGood') + detailSuffix };
            if (score <= 2) return { state: 'mixed', icon: '~', title: t('home.weatherTrace.matchMixed') + detailSuffix };
            return { state: 'bad', icon: '×', title: t('home.weatherTrace.matchBad') + detailSuffix };
        }

        function buildWeatherTrace(hours, dateKey, expectedByDate, actualByDate, fallbackRows) {
            const expectedDay = expectedByDate?.[dateKey] || {};
            const actualDay = actualByDate?.[dateKey] || {};
            return hours
                .map((hour, idx) => {
                    const key = String(hour);
                    const fallback = fallbackRows[idx] || {};
                    const expected = expectedDay[key] || {
                        temperature: fallback.temperature,
                        clouds: fallback.clouds,
                        solar_radiation_wm2: fallback.solar_radiation,
                    };
                    const actual = actualDay[key] || null;
                    const match = compareWeather(expected, actual);
                    return {
                        hour,
                        hourLabel: String(hour).padStart(2, '0'),
                        expectedIcon: getWeatherIcon(expected),
                        expectedIndicators: getWeatherIndicators(expected),
                        actualIcon: actual ? getWeatherIcon(actual) : '·',
                        actualIndicators: getWeatherIndicators(actual),
                        actualAvailable: Boolean(actual),
                        matchIcon: match.icon,
                        matchState: match.state,
                        expectedTitle: t('home.weatherTrace.expectedAt', {
                            time: `${String(hour).padStart(2, '0')}:00`,
                            details: describeWeather(expected),
                        }),
                        actualTitle: t('home.weatherTrace.actualAt', {
                            time: `${String(hour).padStart(2, '0')}:00`,
                            details: actual ? describeWeather(actual) : t('home.weatherTrace.noActualYet'),
                        }),
                        matchTitle: match.title,
                    };
                })
                .filter(item => item.expectedIcon !== '·' || item.actualAvailable);
        }

        async function loadPanelGroups() {
            try {
                const targetDate = selectedDateKey.value;
                const res = await SFMLApi.fetch(`/api/sfml_stats/statistics?date=${encodeURIComponent(targetDate)}`, { forceRefresh: true });
                const stats = res?.statistics || {};
                const last7 = stats.last_7_days || {};
                const last30 = stats.last_30_days || {};
                cleanEvalStats.last7.accuracy = last7.avg_accuracy ?? null;
                cleanEvalStats.last7.coverage = last7.avg_evaluation_coverage_percent ?? null;
                cleanEvalStats.last7.excludedMppt = last7.avg_excluded_mppt_hours ?? null;
                cleanEvalStats.last30.accuracy = last30.avg_accuracy ?? null;
                cleanEvalStats.last30.coverage = last30.avg_evaluation_coverage_percent ?? null;
                cleanEvalStats.last30.excludedMppt = last30.avg_excluded_mppt_hours ?? null;
                const pg = res?.panel_groups || res?.data?.panel_groups;
                if (!pg || !pg.available) return;

                panelGroupsData.available = true;
                panelGroupsData.groups = pg.groups || {};

                // Render charts after Vue updates DOM
                await nextTick();
                const nowHour = selectedDayCurrentHour();

                for (const [groupName, groupData] of Object.entries(panelGroupsData.groups)) {
                    const chartEl = pgChartRefs[groupName];
                    if (!chartEl) continue;

                    if (!pgChartInstances[groupName]) {
                        pgChartInstances[groupName] = echarts.init(chartEl);
                    }
                    const chart = pgChartInstances[groupName];
                    const hourly = groupData.hourly || [];
                    if (!hourly.length) continue;
                    const hours = hourly.map(h => h.hour);
                    const rawActual = hourly.map(h => h.actual_kwh ?? 0);
                    const rawForecast = hourly.map(h => h.prediction_kwh ?? 0);
                    const trimmed = trimSolarWindow(rawActual, rawForecast);

                    const actualData = trimmed.actual.map((v, i) => {
                        if (hourly[i].hour > nowHour) return null;
                        return v;
                    });
                    const forecastD = trimmed.forecast;

                    chart.setOption({
                        backgroundColor: 'transparent',
                        grid: { top: 30, right: 15, bottom: 30, left: 45 },
                        tooltip: {
                            trigger: 'axis',
                            backgroundColor: getThemeColor('--bg-card', 'rgba(21, 28, 44, 0.85)'),
                            borderColor: 'rgba(255, 255, 255, 0.08)',
                            borderWidth: 1,
                            borderRadius: 8,
                            padding: [8, 12],
                            extraCssText: 'backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); box-shadow: 0 4px 16px rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.05)',
                            textStyle: { color: getThemeColor('--text-primary', '#f0f6fc'), fontSize: 11, fontFamily: 'var(--font-sans)' },
                            formatter: function(params) {
                                let s = '<div style="font-family:var(--font-sans)">';
                                s += '<div style="font-weight:700;font-size:11px;margin-bottom:4px">' + params[0].axisValue + '</div>';
                                params.forEach(p => {
                                    const dot = p.seriesName === t('common.actual')
                                        ? '<span style="display:inline-block;margin-right:4px;border-radius:10px;width:8px;height:8px;background-color:#22c55e;"></span>'
                                        : '<span style="display:inline-block;margin-right:4px;border-radius:10px;width:8px;height:8px;background-color:#fbbf24;"></span>';
                                    s += '<div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;gap:12px">'
                                      + '<span>' + dot + p.seriesName + ':</span>'
                                      + '<span style="font-weight:700;font-family:var(--font-mono)">' + (p.value == null ? '--' : p.value.toFixed(3)) + ' kWh</span></div>';
                                });
                                s += '</div>';
                                return s;
                            }
                        },
                        legend: {
                            data: [t('common.actual'), t('common.forecast')],
                            textStyle: { color: getThemeColor('--text-secondary', '#8b949e'), fontSize: 10 },
                            top: 0,
                            right: 0,
                            itemGap: 12,
                            itemWidth: 22,
                            itemHeight: 10,
                        },
                        xAxis: {
                            type: 'category',
                            data: hours.map(h => String(h).padStart(2, '0') + ':00'),
                            axisLabel: { color: getThemeColor('--text-secondary', '#8b949e'), fontSize: 10, interval: 3 },
                            axisLine: { show: false },
                            axisTick: { show: false },
                        },
                        yAxis: {
                            type: 'value',
                            axisLine: { show: false },
                            axisTick: { show: false },
                            axisLabel: { color: getThemeColor('--text-secondary', '#8b949e'), fontSize: 10, formatter: v => v.toFixed(2) },
                            splitLine: { lineStyle: { color: getThemeColor('--border-default', 'rgba(255,255,255,0.02)'), type: 'dashed' } },
                        },
                        series: [
                            {
                                name: t('common.actual'), type: 'line', data: actualData,
                                smooth: true, connectNulls: false,
                                lineStyle: { color: '#22c55e', width: 2.5, shadowColor: 'rgba(34,197,94,0.25)', shadowBlur: 8, shadowOffsetY: 2 },
                                itemStyle: { color: '#22c55e' },
                                symbol: 'none',
                                areaStyle: {
                                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                        { offset: 0, color: 'rgba(34,197,94,0.12)' },
                                        { offset: 1, color: 'rgba(34,197,94,0)' }
                                    ])
                                },
                                z: 6,
                            },
                            {
                                name: t('common.forecast'), type: 'line', data: forecastD,
                                smooth: true, connectNulls: false,
                                lineStyle: { color: '#fbbf24', width: 2.5, shadowColor: 'rgba(251,191,36,0.2)', shadowBlur: 8, shadowOffsetY: 2 },
                                itemStyle: { color: '#fbbf24' },
                                symbol: 'none',
                                z: 5,
                            },
                        ],
                        animationDuration: 1000,
                    });
                }
            } catch (err) {
                console.error('[Home] Panel groups error:', err);
            }
        }

        async function loadForecastData() {
            try {
                const targetDate = selectedDateKey.value;
                const res = await SFMLApi.fetch(`/api/sfml_stats/solar?days=1&date=${encodeURIComponent(targetDate)}`, { forceRefresh: true });
                if (!res || !res.data) return;
                syncTimeContext(res);

                const hourly = res.data.hourly || [];
                if (!hourly.length) {
                    forecastData.hours = [];
                    forecastData.forecast = [];
                    forecastData.forecastRaw = [];
                    forecastData.actual = [];
                    forecastData.actualRaw = [];
                    weatherTrace.value = [];
                    forecastChartInstance?.clear();
                    return;
                }

                const todayData = hourly.filter(h => h.target_date === targetDate);
                if (!todayData.length) {
                    forecastData.hours = [];
                    forecastData.forecast = [];
                    forecastData.forecastRaw = [];
                    forecastData.actual = [];
                    forecastData.actualRaw = [];
                    weatherTrace.value = [];
                    forecastChartInstance?.clear();
                    return;
                }
                const selectedDaily = (res.data.daily || []).find(day => day.date === targetDate)?.overall || null;
                if (!isSelectedToday.value) {
                    applyDayEvaluationMetrics(selectedDaily);
                }

                forecastData.hours = todayData.map(h => h.target_hour);
                const rawFc = todayData.map(h => h.prediction_kwh ?? 0);
                const rawAc = todayData.map(h => h.actual_kwh ?? null);
                const trimmed = trimSolarWindow(rawAc, rawFc);
                forecastData.forecastRaw = rawFc;
                forecastData.actualRaw = rawAc;
                forecastData.forecast = trimmed.forecast;
                forecastData.actual = trimmed.actual;
                const hybridPayload = res.data.hybrid || {};
                const operationalTotal = Number(hybridPayload.total_kwh);
                forecastData.operationalTotal = Number.isFinite(operationalTotal)
                    ? operationalTotal
                    : null;
                const hybridHours = Array.isArray(hybridPayload.hourly) ? hybridPayload.hourly : [];
                const hybridByHour = new Map(
                    hybridHours.map(h => [Number(h.target_hour), h.prediction_kwh ?? null])
                );
                forecastData.hybrid = todayData.map(h => (
                    hybridByHour.has(Number(h.target_hour))
                        ? hybridByHour.get(Number(h.target_hour))
                        : null
                ));
                const conservativePayload = res.data.conservative || {};
                const conservativeTotal = Number(conservativePayload.total_kwh);
                forecastData.conservativeTotal = Number.isFinite(conservativeTotal)
                    ? Math.min(conservativeTotal, rawFc.reduce((s, v) => s + valueOrZero(v), 0))
                    : null;
                const conservativeHours = Array.isArray(conservativePayload.hourly) ? conservativePayload.hourly : [];
                const conservativeByHour = new Map(
                    conservativeHours.map(h => [Number(h.target_hour), h.prediction_kwh ?? null])
                );
                forecastData.conservative = todayData.map((h, idx) => {
                    if (!conservativeByHour.has(Number(h.target_hour))) return null;
                    const value = Number(conservativeByHour.get(Number(h.target_hour)));
                    if (!Number.isFinite(value)) return null;
                    return Math.min(Math.max(0, value), Math.max(0, rawFc[idx] ?? 0));
                });
                forecastData.cleanEligible = todayData.map(h => h.clean_evaluation_eligible !== false);
                forecastData.confidence = todayData.map(h => h.confidence ?? 50);
                forecastData.ml_pct = todayData.map(h => h.ml_contribution_percent ?? 0);
                forecastData.method = todayData.map(h => h.prediction_method || '');
                forecastData.temperature = todayData.map(h => h.temperature ?? null);
                forecastData.radiation = todayData.map(h => h.solar_radiation ?? null);
                forecastData.clouds = todayData.map(h => h.clouds ?? null);
                forecastData.tfs = todayData.map(h => h.tfs_kwh ?? null);
                forecastData.tfs_weight = todayData.map(h => h.tfs_weight ?? null);
                forecastData.ai = todayData.map(h => h.ai_kwh ?? null);
                forecastData.physics = todayData.map(h => h.physics_kwh ?? null);
                forecastData.lstm = todayData.map(h => h.lstm_kwh ?? null);
                forecastData.ridge = todayData.map(h => h.ridge_kwh ?? null);
                weatherTrace.value = buildWeatherTrace(
                    forecastData.hours,
                    targetDate,
                    res.data.weather_corrected || {},
                    res.data.weather || {},
                    todayData,
                );

                updateForecastChart();
            } catch (err) {
                console.error('[Home] Forecast data error:', err);
            }
        }

        async function loadPowerHistory() {
            try {
                const targetDate = selectedDateKey.value;
                const res = await SFMLApi.fetch(`/api/sfml_stats/power_sources_history?date=${encodeURIComponent(targetDate)}&hours=24`);
                if (!res || !res.data) return;
                syncTimeContext(res);
                batterySocSensorConfigured.value = batterySocSensorConfigured.value || Boolean(res.sensors?.battery_soc);

                const todayStr = selectedDateKey.value;
                powerData.value = res.data.filter(d => {
                    const localDate = d.local_date || (typeof d.hour_key === 'string' ? d.hour_key.slice(0, 10) : null);
                    return localDate === todayStr;
                });
                lastPowerUpdate.value = formatHaTime(currentHaInstant(), { hour: '2-digit', minute: '2-digit' });
                updatePowerChart();
                updateBatteryChart();
            } catch (err) {
                console.error('[Home] Power history error:', err);
            }
        }

        // ========== FORECAST CHART ==========

        function updateForecastChart() {
            if (!forecastChartInstance || !forecastData.hours.length) return;
            const nowHour = haCurrentHour();

            // Calculate P90 / P10 bands (respect null from trimming)
            const p90 = forecastData.forecast.map((v, i) => {
                if (v == null) return null;
                const conf = forecastData.confidence[i] || 50;
                return v * (1 + (100 - conf) / 150);
            });
            const uncertaintyP10 = forecastData.forecast.map((v, i) => {
                if (v == null) return null;
                const conf = forecastData.confidence[i] || 50;
                return Math.max(0, v * (1 - (100 - conf) / 150));
            });
            const actualRows = actualChartRows();

            forecastChartInstance.setOption({
                backgroundColor: 'transparent',
                grid: { top: 40, right: 20, bottom: 40, left: 50 },
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: getThemeColor('--bg-card', 'rgba(21, 28, 44, 0.85)'),
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: [10, 14],
                    extraCssText: 'backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); box-shadow: 0 8px 32px 0 rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06)',
                    textStyle: { color: getThemeColor('--text-primary', '#f0f6fc'), fontSize: 12, fontFamily: 'var(--font-sans)' },
                    formatter: function(params) {
                        const idx = params[0]?.dataIndex;
                        if (idx == null) return '';
                        const hour = forecastData.hours[idx];
                        const pred = forecastData.forecast[idx] ?? 0;
                        const conservative = forecastData.conservative[idx];
                        const hybrid = forecastData.hybrid[idx];
                        const actValue = actualRows[idx] ?? null;
                        const act = actValue == null ? null : Number(actValue);
                        const conf = forecastData.confidence[idx] ?? 0;
                        const mlPct = forecastData.ml_pct[idx] ?? 0;
                        const method = forecastData.method[idx] || '--';
                        const temp = forecastData.temperature[idx];
                        const rad = forecastData.radiation[idx];
                        const clouds = forecastData.clouds[idx];
                        const delta = act != null && pred > 0 ? (((act - pred) / pred) * 100).toFixed(1) : null;
                        const forecastError = delta;

                        let s = '<div style="min-width:180px">';
                        s += '<div style="font-weight:700;font-size:13px;margin-bottom:6px">' + String(hour).padStart(2,'0') + ':00 ' + t('home.oClock') + '</div>';
                        s += '<div style="border-top:1px solid rgba(255,255,255,0.15);margin:4px 0 6px"></div>';
                        s += '<div style="display:flex;justify-content:space-between"><span style="color:#fbbf24">' + t('common.forecast') + ':</span><span>' + pred.toFixed(2) + ' kWh</span></div>';
                        if (conservative != null) s += '<div style="display:flex;justify-content:space-between"><span style="color:#2dd4bf">' + t('home.p10') + ':</span><span>' + conservative.toFixed(2) + ' kWh</span></div>';
                        if (hybrid != null) s += '<div style="display:flex;justify-content:space-between"><span style="color:#38bdf8">' + t('home.hybrid') + ':</span><span>' + hybrid.toFixed(2) + ' kWh</span></div>';
                        s += '<div style="display:flex;justify-content:space-between"><span style="color:#22c55e">' + t('common.actual') + ':</span><span>' + (act == null ? '--' : act.toFixed(2) + ' kWh') + '</span></div>';
                        if (delta != null) s += '<div style="display:flex;justify-content:space-between"><span style="color:#94a3b8">' + t('common.yield') + ' &Delta;:</span><span style="color:' + forecastBandColor(parseFloat(delta)) + '">' + (parseFloat(delta) >= 0 ? '+' : '') + delta + '%</span></div>';
                        if (forecastError != null) s += '<div style="display:flex;justify-content:space-between"><span style="color:#94a3b8">' + t('solar.weeklyTable.forecastError') + ':</span><span style="color:' + forecastBandColor(parseFloat(forecastError)) + '">' + (parseFloat(forecastError) >= 0 ? '+' : '') + forecastError + '%</span></div>';
                        s += '<div style="border-top:1px solid rgba(255,255,255,0.15);margin:6px 0 4px"></div>';
                        s += '<div style="font-size:11px;color:#8b949e;margin-bottom:3px">AI Stack:</div>';
                        s += '<div style="display:flex;justify-content:space-between;font-size:11px"><span>' + t('home.mlShare') + ':</span><span>' + mlPct.toFixed(0) + '%</span></div>';
                        s += '<div style="display:flex;justify-content:space-between;font-size:11px"><span>' + t('settings.confidence') + ':</span><span>' + conf.toFixed(0) + '%</span></div>';
                        s += '<div style="display:flex;justify-content:space-between;font-size:11px"><span>' + t('home.method') + ':</span><span>' + method + '</span></div>';
                        const tfs = forecastData.tfs[idx];
                        const tfsW = forecastData.tfs_weight[idx];
                        const ai = forecastData.ai[idx];
                        const physics = forecastData.physics[idx];
                        const lstm = forecastData.lstm[idx];
                        const ridge = forecastData.ridge[idx];
                        if (tfs != null || ai != null || physics != null) {
                            s += '<div style="border-top:1px solid rgba(255,255,255,0.15);margin:6px 0 4px"></div>';
                            s += '<div style="font-size:11px;color:#8b949e;margin-bottom:3px">' + t('home.models') + ':</div>';
                            if (tfs != null) s += '<div style="display:flex;justify-content:space-between;font-size:11px"><span style="color:#a78bfa">TFS:</span><span>' + tfs.toFixed(3) + ' kWh' + (tfsW != null ? ' (' + (tfsW * 100).toFixed(0) + '%)' : '') + '</span></div>';
                            if (ai != null) s += '<div style="display:flex;justify-content:space-between;font-size:11px"><span>AI:</span><span>' + ai.toFixed(3) + ' kWh</span></div>';
                            if (physics != null) s += '<div style="display:flex;justify-content:space-between;font-size:11px"><span>' + t('home.physics') + ':</span><span>' + physics.toFixed(3) + ' kWh</span></div>';
                            if (lstm != null) s += '<div style="display:flex;justify-content:space-between;font-size:11px"><span>LSTM:</span><span>' + lstm.toFixed(3) + ' kWh</span></div>';
                            if (ridge != null) s += '<div style="display:flex;justify-content:space-between;font-size:11px"><span>Ridge:</span><span>' + ridge.toFixed(3) + ' kWh</span></div>';
                        }
                        if (temp != null || rad != null || clouds != null) {
                            s += '<div style="border-top:1px solid rgba(255,255,255,0.15);margin:6px 0 4px"></div>';
                            s += '<div style="font-size:11px;color:#8b949e;margin-bottom:3px">' + t('nav.weather') + ':</div>';
                            if (temp != null) s += '<div style="display:flex;justify-content:space-between;font-size:11px"><span>' + t('home.tempShort') + ':</span><span>' + temp.toFixed(1) + '\u00B0C</span></div>';
                            if (clouds != null) s += '<div style="display:flex;justify-content:space-between;font-size:11px"><span>' + t('home.cloudsShort') + ':</span><span>' + clouds.toFixed(0) + '%</span></div>';
                            if (rad != null) s += '<div style="display:flex;justify-content:space-between;font-size:11px"><span>' + t('home.irradianceShort') + ':</span><span>' + rad.toFixed(0) + ' W/m\u00B2</span></div>';
                        }
                        s += '</div>';
                        return s;
                    }
                },
                xAxis: {
                    type: 'category',
                    data: forecastData.hours.map(h => String(h).padStart(2, '0')),
                    axisLine: { show: false },
                    axisLabel: { color: getThemeColor('--text-secondary', '#8b949e'), fontSize: 11, margin: 12 },
                },
                yAxis: {
                    type: 'value',
                    name: 'kWh',
                    nameTextStyle: { color: getThemeColor('--text-secondary', '#8b949e'), fontSize: 10 },
                    axisLine: { show: false },
                    splitLine: { lineStyle: { color: getThemeColor('--border-default', 'rgba(255,255,255,0.025)'), type: 'dashed' } },
                    axisLabel: { color: getThemeColor('--text-secondary', '#8b949e'), fontSize: 11 },
                },
                series: [
                    // P10 lower boundary (invisible, stacked base)
                    {
                        name: '__P10BandBase',
                        type: 'line',
                        data: uncertaintyP10,
                        lineStyle: { opacity: 0 },
                        itemStyle: { opacity: 0 },
                        symbol: 'none',
                        smooth: true, connectNulls: false,
                        stack: 'band',
                        areaStyle: { color: 'transparent' },
                        z: 1,
                    },
                    {
                        name: 'Unsicherheit',
                        type: 'line',
                        data: p90.map((v, i) => (v == null || uncertaintyP10[i] == null) ? null : Math.max(0, v - uncertaintyP10[i])),
                        lineStyle: { opacity: 0 },
                        itemStyle: { opacity: 0 },
                        symbol: 'none',
                        smooth: true, connectNulls: false,
                        stack: 'band',
                        areaStyle: { color: 'rgba(251,191,36,0.06)' },
                        z: 1,
                    },
                    {
                        name: 'Prognose',
                        type: 'line',
                        data: forecastData.forecast,
                        lineStyle: { color: '#fbbf24', width: 3, shadowColor: 'rgba(251,191,36,0.25)', shadowBlur: 10, shadowOffsetY: 3 },
                        itemStyle: { color: '#fbbf24' },
                        symbol: 'none',
                        smooth: true, connectNulls: false,
                        z: 5,
                    },
                    ...(hasConservativeForecast.value ? [{
                        name: 'P10',
                        type: 'line',
                        data: forecastData.conservative,
                        lineStyle: { color: '#2dd4bf', width: 2, type: 'dashed', shadowColor: 'rgba(45,212,191,0.18)', shadowBlur: 6 },
                        itemStyle: { color: '#2dd4bf' },
                        symbol: 'none',
                        smooth: true,
                        connectNulls: false,
                        z: 5,
                    }] : []),
                    ...(hasHybridForecast.value ? [{
                        name: 'Hybrid',
                        type: 'line',
                        data: forecastData.hybrid,
                        lineStyle: { color: '#38bdf8', width: 2, type: 'dashed', shadowColor: 'rgba(56,189,248,0.2)', shadowBlur: 6 },
                        itemStyle: { color: '#38bdf8' },
                        symbol: 'none',
                        smooth: true,
                        connectNulls: false,
                        z: 5,
                    }] : []),
                    // IST line — only show up to current hour, null for future
                    {
                        name: 'IST',
                        type: 'line',
                        data: actualRows,
                        lineStyle: { color: '#22c55e', width: 3, shadowColor: 'rgba(34,197,94,0.3)', shadowBlur: 12, shadowOffsetY: 3 },
                        itemStyle: { color: '#22c55e' },
                        symbol: 'none',
                        smooth: true,
                        connectNulls: false,
                        areaStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: 'rgba(34,197,94,0.18)' },
                                { offset: 1, color: 'rgba(34,197,94,0)' }
                            ])
                        },
                        z: 6,
                    },
                    // TFS prediction line (toggleable via legend)
                    {
                        name: 'TFS',
                        type: 'line',
                        data: forecastData.tfs,
                        lineStyle: { color: '#a78bfa', width: 2, type: 'dashed', shadowColor: 'rgba(167,139,250,0.15)', shadowBlur: 6 },
                        itemStyle: { color: '#a78bfa' },
                        symbol: 'none',
                        smooth: true,
                        connectNulls: false,
                        z: 4,
                    },
                    // Now marker
                    ...(isSelectedToday.value && forecastData.hours.includes(nowHour) ? [{
                        type: 'line',
                        markLine: {
                            silent: true,
                            symbol: 'none',
                            lineStyle: { color: getThemeColor('--text-muted', 'rgba(255,255,255,0.25)'), width: 1, type: 'dashed' },
                            label: { show: true, formatter: t('home.now'), color: getThemeColor('--text-secondary', '#f0f6fc'), fontSize: 10, position: 'start', backgroundColor: getThemeColor('--bg-app', 'rgba(10,14,20,0.85)'), padding: [2, 4], borderRadius: 4 },
                            data: [{ xAxis: String(nowHour).padStart(2, '0') }],
                        },
                        data: [],
                    }] : []),
                ],
                legend: {
                    show: true,
                    top: 0,
                    right: 10,
                    textStyle: { color: getThemeColor('--text-secondary', '#8b949e'), fontSize: 11 },
                    // Series names are stable internal identifiers ("Prognose"/"IST"/…)
                    // so legend selection state survives across locale changes;
                    // formatter renders the localized label.
                    data: ['Prognose', ...(hasConservativeForecast.value ? ['P10'] : []), ...(hasHybridForecast.value ? ['Hybrid'] : []), 'IST', 'TFS', 'Unsicherheit'],
                    formatter: (name) => ({
                        Prognose: t('common.forecast'),
                        P10: t('home.p10'),
                        Hybrid: t('home.hybrid'),
                        IST: t('common.actual'),
                        TFS: 'TFS',
                        Unsicherheit: t('home.uncertainty'),
                    }[name] || name),
                    selected: {
                        Prognose: forecastLegendSelected.Prognose,
                        P10: forecastLegendSelected.P10,
                        Hybrid: forecastLegendSelected.Hybrid,
                        IST: forecastLegendSelected.IST,
                        TFS: forecastLegendSelected.TFS,
                        Unsicherheit: forecastLegendSelected.Unsicherheit,
                    },
                },
            });
        }

        // ========== POWER CHART ==========

        function updatePowerChart() {
            if (!powerChartInstance || !powerData.value.length) return;

            const data = getSolarWindowedPowerData(powerData.value);
            const times = data.map(d => {
                if (typeof d.hour_key === 'string' && d.hour_key.length >= 16) {
                    return d.hour_key.slice(11, 16);
                }
                return formatHaTime(d.local_timestamp || d.timestamp || d.time, { hour: '2-digit', minute: '2-digit' });
            });

            const solarPower = data.map(d => d.solar_power ?? 0);

            powerChartInstance.setOption({
                backgroundColor: 'transparent',
                grid: { top: 30, right: 20, bottom: 30, left: 50 },
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: getThemeColor('--bg-card', 'rgba(21, 28, 44, 0.85)'),
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: [10, 14],
                    extraCssText: 'backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); box-shadow: 0 8px 32px 0 rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06)',
                    textStyle: { color: getThemeColor('--text-primary', '#f0f6fc'), fontSize: 12, fontFamily: 'var(--font-sans)' },
                    formatter: function(params) {
                        const val = params[0]?.value ?? 0;
                        const formattedVal = val >= 1000 ? (val/1000).toFixed(2) + ' kW' : Math.round(val) + ' W';
                        return '<div style="font-family:var(--font-sans)">'
                             + '<div style="font-weight:700;font-size:12px;margin-bottom:4px">' + params[0].axisValue + '</div>'
                             + '<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;gap:12px">'
                             + '<span><span style="display:inline-block;margin-right:4px;border-radius:10px;width:8px;height:8px;background-color:#fbbf24;"></span>' + t('home.pvPower') + ':</span>'
                             + '<span style="font-weight:700;font-family:var(--font-mono)">' + formattedVal + '</span></div>'
                             + '</div>';
                    }
                },
                xAxis: {
                    type: 'category',
                    data: times,
                    axisLine: { show: false },
                    axisLabel: {
                        color: getThemeColor('--text-secondary', '#8b949e'),
                        fontSize: 10,
                        interval: Math.max(0, Math.floor(times.length / 12) - 1),
                        margin: 10
                    },
                },
                yAxis: {
                    type: 'value',
                    axisLine: { show: false },
                    axisTick: { show: false },
                    splitLine: { lineStyle: { color: getThemeColor('--border-default', 'rgba(255,255,255,0.02)'), type: 'dashed' } },
                    axisLabel: { color: getThemeColor('--text-secondary', '#8b949e'), fontSize: 11, formatter: v => v >= 1000 ? (v/1000).toFixed(1)+' kW' : v + ' W' },
                },
                series: [
                    {
                        name: 'PV-Leistung',
                        type: 'line',
                        data: solarPower,
                        lineStyle: { color: '#fbbf24', width: 3, shadowColor: 'rgba(251,191,36,0.3)', shadowBlur: 10, shadowOffsetY: 3 },
                        itemStyle: { color: '#fbbf24' },
                        symbol: 'none',
                        smooth: true,
                        areaStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: 'rgba(251,191,36,0.18)' },
                                { offset: 1, color: 'rgba(251,191,36,0)' }
                            ])
                        },
                    },
                ],
                legend: {
                    show: true,
                    data: ['PV-Leistung'],
                    formatter: (name) => name === 'PV-Leistung' ? t('home.pvPower') : name,
                    top: 0, right: 10, textStyle: { color: getThemeColor('--text-secondary', '#8b949e'), fontSize: 11 },
                },
            });
        }

        function updateBatteryChart() {
            if (!batteryChartInstance && batteryChartEl.value && typeof echarts !== 'undefined') {
                batteryChartInstance = echarts.init(batteryChartEl.value, null, { renderer: 'canvas' });
            }
            if (!batteryChartInstance || !batterySocSensorConfigured.value) return;

            const data = powerData.value;
            const dayStart = new Date(`${selectedDateKey.value}T00:00:00`);
            const dayEnd = new Date(dayStart.getTime() + 24 * 3600000);
            const toTimeValue = (point) => {
                const raw = point.local_timestamp || point.timestamp || point.time;
                if (!raw) return null;
                const timestamp = new Date(raw).getTime();
                return Number.isFinite(timestamp) ? timestamp : null;
            };
            const socSeries = data
                .map((point) => {
                    if (point.battery_soc == null) return null;
                    const timestamp = toTimeValue(point);
                    const soc = Number(point.battery_soc);
                    return timestamp == null || !Number.isFinite(soc) ? null : [timestamp, soc];
                })
                .filter(Boolean);
            if (!socSeries.length && flow.battery_soc != null) {
                const soc = Number(flow.battery_soc);
                if (Number.isFinite(soc)) {
                    socSeries.push([currentHaInstant().getTime(), soc]);
                }
            }
            if (!socSeries.length) return;

            batteryChartInstance.setOption({
                backgroundColor: 'transparent',
                grid: { top: 52, right: 24, bottom: 44, left: 56 },
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: getThemeColor('--bg-card', 'rgba(21, 28, 44, 0.85)'),
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: [10, 14],
                    extraCssText: 'backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); box-shadow: 0 8px 32px 0 rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06)',
                    textStyle: { color: getThemeColor('--text-primary', '#f0f6fc'), fontSize: 12, fontFamily: 'var(--font-sans)' },
                    formatter: function(params) {
                        const axisTime = Number(params[0]?.axisValue);
                        let point = params[0]?.data;
                        if (Number.isFinite(axisTime)) {
                            let bestDistance = Infinity;
                            socSeries.forEach((candidate) => {
                                const distance = Math.abs(candidate[0] - axisTime);
                                if (distance < bestDistance) {
                                    bestDistance = distance;
                                    point = candidate;
                                }
                            });
                        }
                        if (!point) return '';
                        const soc = Number(point[1]);
                        let html = '<div style="font-family:var(--font-sans);min-width:170px">';
                        html += '<div style="font-weight:700;font-size:12px;margin-bottom:6px">' + formatHaTime(point[0], { hour: '2-digit', minute: '2-digit' }) + '</div>';
                        html += '<div style="display:flex;justify-content:space-between;gap:14px"><span style="color:#38bdf8">Akkuladung:</span><span style="font-family:var(--font-mono);font-weight:700">' + soc.toFixed(0) + '%</span></div>';
                        html += '</div>';
                        return html;
                    }
                },
                xAxis: {
                    type: 'time',
                    min: dayStart.getTime(),
                    max: dayEnd.getTime(),
                    interval: 3600000,
                    minInterval: 3600000,
                    maxInterval: 3600000,
                    splitNumber: 24,
                    axisLine: { show: false },
                    axisTick: { show: true, alignWithLabel: true },
                    axisLabel: {
                        color: getThemeColor('--text-secondary', '#8b949e'),
                        fontSize: 9,
                        margin: 10,
                        hideOverlap: false,
                        showMinLabel: true,
                        showMaxLabel: true,
                        formatter: value => formatHaTime(value, { hour: '2-digit' })
                    },
                },
                yAxis: {
                    type: 'value',
                    min: 0,
                    max: 100,
                    interval: 20,
                    axisLine: { show: false },
                    axisTick: { show: false },
                    splitLine: { lineStyle: { color: getThemeColor('--border-default', 'rgba(255,255,255,0.02)'), type: 'dashed' } },
                    axisLabel: { color: getThemeColor('--text-secondary', '#8b949e'), fontSize: 11, formatter: v => `${Math.round(v)}%` },
                },
                series: [
                    {
                        name: 'Akkuladung',
                        type: 'line',
                        data: socSeries,
                        lineStyle: { color: '#38bdf8', width: 2.5, shadowColor: 'rgba(56,189,248,0.18)', shadowBlur: 8 },
                        itemStyle: { color: '#38bdf8' },
                        symbol: socSeries.length > 1 ? 'none' : 'circle',
                        symbolSize: 6,
                        smooth: true,
                        connectNulls: true,
                        areaStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: 'rgba(56,189,248,0.18)' },
                                { offset: 1, color: 'rgba(56,189,248,0)' }
                            ])
                        },
                    },
                ],
                legend: {
                    show: false,
                    data: ['Akkuladung'],
                    top: 8,
                    left: 16,
                    textStyle: { color: getThemeColor('--text-secondary', '#8b949e'), fontSize: 11 },
                },
            });
            batteryChartInstance.resize();
        }

        // Sync from parent liveData
        watch(() => props.liveData, (ld) => {
            if (ld.solar_power != null) flow.solar_power = ld.solar_power;
            if (ld.home_consumption != null) flow.home_consumption = ld.home_consumption;
            if (ld.battery_soc != null) flow.battery_soc = ld.battery_soc;
            if (ld.battery_power != null) flow.battery_power = ld.battery_power;
            if (ld.solar_to_house != null) flow.solar_to_house = ld.solar_to_house;
            if (ld.solar_to_battery != null) flow.solar_to_battery = ld.solar_to_battery;
            if (ld.battery_to_house != null) flow.battery_to_house = ld.battery_to_house;
            if (ld.grid_to_house != null) flow.grid_to_house = ld.grid_to_house;
            if (ld.house_to_grid != null) flow.house_to_grid = ld.house_to_grid;
            if (ld.grid_to_battery != null) flow.grid_to_battery = ld.grid_to_battery;
        }, { deep: true });

        watch(() => props.config?.theme, () => {
            nextTick(() => {
                updateForecastChart();
                updatePowerChart();
                updateBatteryChart();
                for (const chart of Object.values(pgChartInstances)) {
                    if (chart) chart.dispose();
                }
                pgChartInstances = {};
                loadPanelGroups();
            });
        });

        // Lifecycle
        let clockTimer = null;
        let flowTimer = null;
        let powerTimer = null;
        let forecastTimer = null;
        let infoTimer = null;

        onMounted(async () => {
            updateClock();
            clockTimer = setInterval(updateClock, 1000);
            restoreForecastLegendSelected();

            await nextTick();

            // Init forecast chart
            if (forecastChartEl.value && typeof echarts !== 'undefined') {
                forecastChartInstance = echarts.init(forecastChartEl.value, null, { renderer: 'canvas' });
                forecastChartInstance.on('legendselectchanged', (event) => {
                    if (!event?.selected) return;
                    Object.keys(forecastLegendSelected).forEach((key) => {
                        if (typeof event.selected[key] === 'boolean') {
                            forecastLegendSelected[key] = event.selected[key];
                        }
                    });
                    persistForecastLegendSelected();
                });
            }
            // Init power chart
            if (powerChartEl.value && typeof echarts !== 'undefined') {
                powerChartInstance = echarts.init(powerChartEl.value, null, { renderer: 'canvas' });
            }
            if (batteryChartEl.value && typeof echarts !== 'undefined') {
                batteryChartInstance = echarts.init(batteryChartEl.value, null, { renderer: 'canvas' });
            }

            resizeHandler = () => {
                if (forecastChartInstance) forecastChartInstance.resize();
                if (powerChartInstance) powerChartInstance.resize();
                if (batteryChartInstance) batteryChartInstance.resize();
            };
            window.addEventListener('resize', resizeHandler);

            // Load all data
            await Promise.all([
                loadEnergyFlow(),
                loadForecastData(),
                loadPowerHistory(),
                loadInfoPanel(),
                loadPanelGroups(),
            ]);

            // Refresh intervals
            flowTimer = setInterval(loadEnergyFlow, 15000);
            powerTimer = setInterval(loadPowerHistory, 60000);
            forecastTimer = setInterval(loadForecastData, 60000);
            infoTimer = setInterval(loadInfoPanel, 60000);
        });

        const getConsumerName = (key) => {
            const names = {
                heatpump: t('flow.consumer.heatpump') || 'Wärmepumpe',
                heatingrod: t('flow.consumer.heatingrod') || 'Heizstab',
                wallbox: t('flow.consumer.wallbox') || 'Wallbox',
            };
            return names[key] || key;
        };

        onUnmounted(() => {
            if (clockTimer) clearInterval(clockTimer);
            if (flowTimer) clearInterval(flowTimer);
            if (powerTimer) clearInterval(powerTimer);
            if (forecastTimer) clearInterval(forecastTimer);
            if (infoTimer) clearInterval(infoTimer);
            if (forecastChartInstance) { forecastChartInstance.dispose(); forecastChartInstance = null; }
            if (powerChartInstance) { powerChartInstance.dispose(); powerChartInstance = null; }
            if (batteryChartInstance) { batteryChartInstance.dispose(); batteryChartInstance = null; }
            for (const chart of Object.values(pgChartInstances)) {
                if (chart) chart.dispose();
            }
            pgChartInstances = {};
            if (resizeHandler) window.removeEventListener('resize', resizeHandler);
        });

        const getWeatherSymbol = (condition, cloudCover) => {
            return WEATHER_SYMBOLS[condition] || (cloudCover != null
                ? (cloudCover >= 80 ? '☁' : cloudCover >= 35 ? '⛅' : '☀')
                : '☀️');
        };

        return {
            forecastChartEl, powerChartEl, batteryChartEl, sparklineRefs,
            flow, panels, panelHistory, infoData, flowStatusChips, panelGroupsData, pgChartRefs,
            forecastData, powerData, dailyForecasts,
            selectedDayLabel, isSelectedToday, canSelectNextDay,
            selectPreviousDay, selectNextDay, selectToday,
            fmtKwh, groupHasHourly, panelDayProgressPercent, panelDayProgressColor,
            panelDayProgressTitle, panelGroupMetaLine, panelGroupMetaTitle,
            weatherTrace, hasWeatherTrace,
            currentTime, lastPowerUpdate,
            isNightTime, forecastTotal, hybridForecastTotal, conservativeForecastTotal, hasHybridForecast,
            hasConservativeForecast,
            actualTotal, deviationPercent, deviationLabel, hybridDeviationPercent,
            hybridDeviationLabel, cleanEvalStats, todayLearningBasisLabel,
            dayQualityLabel, dayErrorLabel, dayLearningBasisLabel, dayDiscardedLabel,
            todayDiscardedLearningLabel, todayCoverageExplanation,
            todayForecastErrorPercent, todayForecastAccuracyPercent, todayForecastErrorLabel,
            todayForecastErrorIcon,
            forecastDeviationKwh, forecastDeviationKwhLabel,
            hubbleView, hubbleExpanded, hubbleQuestion,
            getGridPower, getGridLabel, fmtKw, fmtW,
            forecastBandColor, forecastBandColorFromAccuracy, yieldDeviationColor,
            getSparklinePath, getSparklineAreaPath,
            getWeatherSymbol, statusChipClass, statusChipTitle,
            consumers, routes, batteryPowerText, batteryStateTextLocal,
            batteryStateClass, gridPowerAbsText, gridStateTextLocal,
            gridStateColorClass, localText,
            hasBatteryChart, batteryChartStats,
            getConsumerName,
        };
    }
};

// CSS injected once
(function injectHomeStyles() {
    if (document.getElementById('sfml-home-v17-styles')) return;
    const style = document.createElement('style');
    style.id = 'sfml-home-v17-styles';
    style.textContent = `
        .hubble-card {
            margin-top: var(--space-lg);
            padding: var(--space-lg);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-lg);
            background: var(--bg-card);
            backdrop-filter: var(--glass-blur);
            -webkit-backdrop-filter: var(--glass-blur);
            transition: border-color var(--transition-normal);
        }
        .hubble-card:hover {
            border-color: var(--border-hover);
        }
        .day-history-nav {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-left: auto;
            padding: 3px;
            border: 1px solid var(--border-default);
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.03);
        }
        .day-nav-button,
        .day-nav-today {
            min-width: 30px;
            height: 28px;
            border: 0;
            border-radius: 6px;
            color: var(--text-primary);
            background: transparent;
            font: 700 0.85rem var(--font-sans);
            cursor: pointer;
        }
        .day-nav-button:hover:not(:disabled),
        .day-nav-today:hover {
            background: rgba(255, 255, 255, 0.08);
        }
        .day-nav-button:disabled {
            opacity: 0.35;
            cursor: default;
        }
        .day-nav-label {
            min-width: 74px;
            text-align: center;
            color: var(--text-secondary);
            font: 700 0.78rem var(--font-mono);
        }
        .day-nav-today {
            padding: 0 9px;
            color: var(--accent);
        }
        .hubble-header {
            display: grid;
            grid-template-columns: 48px minmax(170px, auto) minmax(360px, 1fr);
            align-items: center;
            gap: var(--space-md);
            margin-bottom: 12px;
        }
        
        .hubble-sensor-ring-container {
            width: 48px;
            height: 48px;
            flex: 0 0 auto;
        }
        .hubble-sensor-ring {
            width: 100%;
            height: 100%;
            display: block;
        }
        .hubble-sensor-ring .ring-bg {
            fill: none;
            stroke: rgba(255, 255, 255, 0.08);
            stroke-width: 6px;
        }
        .hubble-sensor-ring .ring-active {
            fill: none;
            stroke-width: 6px;
            stroke-linecap: round;
            transform-origin: center;
            stroke-dasharray: 200;
            stroke-dashoffset: 80;
            animation: hubble-ring-rotate 6s linear infinite;
        }
        .hubble-sensor-ring .ring-active.morning,
        .hubble-sensor-ring .ring-active.midday,
        .hubble-sensor-ring .ring-active.evening {
            stroke: var(--accent);
        }
        
        .hubble-sensor-ring .hubble-face {
            transform-origin: center;
            transition: color 0.5s ease;
        }
        .hubble-sensor-ring .hubble-face.morning,
        .hubble-sensor-ring .hubble-face.midday,
        .hubble-sensor-ring .hubble-face.evening {
            color: var(--text-primary);
        }
        .hubble-sensor-ring .hubble-face.pulse {
            animation: hubble-core-pulse 2s ease-in-out infinite;
        }
        .hubble-sensor-ring .hubble-eye {
            fill: currentColor;
            animation: hubble-blink 4s ease-in-out infinite;
        }
        .hubble-sensor-ring .hubble-eye.left {
            transform-origin: 37px 48px;
        }
        .hubble-sensor-ring .hubble-eye.right {
            transform-origin: 63px 48px;
        }
        .hubble-sensor-ring .hubble-mouth {
            stroke: currentColor;
            opacity: 0.85;
        }
        
        @keyframes hubble-blink {
            0%, 90%, 100% { transform: scaleY(1); }
            95% { transform: scaleY(0.1); }
        }
        
        @keyframes hubble-ring-rotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @keyframes hubble-core-pulse {
            0%, 100% { transform: scale(1); opacity: 0.95; }
            50% { transform: scale(1.15); opacity: 0.70; }
        }

        .hubble-heading {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
        }
        .hubble-kicker {
            color: var(--accent);
            font-size: 0.72rem;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }
        .hubble-moment {
            color: var(--text-muted);
            font-size: 0.78rem;
            font-weight: 600;
        }
        .hubble-day-balance {
            min-width: 0;
            padding: 2px 0;
        }
        .hubble-day-balance-heading {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: var(--space-md);
        }
        .hubble-day-balance-title {
            color: var(--accent);
            font-size: 0.72rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.06em;
        }
        .hubble-day-balance-total {
            display: inline-flex;
            align-items: baseline;
            gap: 5px;
            color: var(--text-secondary);
            font-family: var(--font-mono);
            font-size: 0.72rem;
        }
        .hubble-day-balance-total strong {
            color: var(--text-primary);
            font-size: 1.12rem;
        }
        .hubble-day-balance-subtitle {
            margin-top: -2px;
            color: var(--text-muted);
            font-size: 0.7rem;
        }
        .hubble-day-balance-bar {
            display: flex;
            width: 100%;
            height: 8px;
            margin: 7px 0 6px;
            overflow: hidden;
            border-radius: 4px;
            background: rgba(148, 163, 184, 0.14);
        }
        .hubble-day-balance-segment {
            display: block;
            height: 100%;
            min-width: 0;
        }
        .hubble-day-balance-segment.solar,
        .hubble-day-balance-dot.solar { background: #fbbf24; }
        .hubble-day-balance-segment.battery,
        .hubble-day-balance-dot.battery { background: #22c55e; }
        .hubble-day-balance-segment.grid,
        .hubble-day-balance-dot.grid { background: #a855f7; }
        .hubble-day-balance-segment.unknown,
        .hubble-day-balance-dot.unknown { background: #64748b; }
        .hubble-day-balance-sources {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 5px 14px;
        }
        .hubble-day-balance-source {
            display: inline-grid;
            grid-template-columns: 7px auto auto auto;
            align-items: baseline;
            gap: 4px;
            white-space: nowrap;
            color: var(--text-secondary);
            font-size: 0.68rem;
        }
        .hubble-day-balance-dot {
            align-self: center;
            width: 7px;
            height: 7px;
            border-radius: 50%;
        }
        .hubble-day-balance-source strong {
            color: var(--text-primary);
            font-family: var(--font-mono);
            font-size: 0.7rem;
        }
        .hubble-day-balance-percent {
            color: var(--text-muted);
            font-family: var(--font-mono);
        }
        .hubble-day-balance-warning {
            display: block;
            margin-top: 5px;
            color: #f59e0b;
            font-size: 0.68rem;
        }
        .hubble-day-balance.critical .hubble-day-balance-warning {
            color: #ef4444;
        }
        .hubble-energy-chain {
            margin: 0 0 12px;
            padding: 12px 0;
            border-top: 1px solid var(--border-default);
            border-bottom: 1px solid var(--border-default);
        }
        .hubble-energy-chain-heading {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: var(--space-md);
            margin-bottom: 8px;
        }
        .hubble-energy-chain-heading > div {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        .hubble-energy-chain-kicker {
            color: var(--accent);
            font-size: 0.76rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.06em;
        }
        .hubble-energy-chain-subtitle {
            color: var(--text-muted);
            font-size: 0.72rem;
        }
        .hubble-energy-chain-status {
            flex: 0 0 auto;
            padding: 4px 8px;
            border: 1px solid rgba(34, 197, 94, 0.28);
            border-radius: 6px;
            color: #22c55e;
            background: rgba(34, 197, 94, 0.07);
            font-size: 0.68rem;
            font-weight: 750;
        }
        .hubble-energy-chain.partial .hubble-energy-chain-status,
        .hubble-energy-chain.pending .hubble-energy-chain-status {
            border-color: rgba(245, 158, 11, 0.28);
            color: #f59e0b;
            background: rgba(245, 158, 11, 0.07);
        }
        .hubble-energy-chain.inconsistent .hubble-energy-chain-status {
            border-color: rgba(239, 68, 68, 0.3);
            color: #ef4444;
            background: rgba(239, 68, 68, 0.07);
        }
        .hubble-energy-chain-flow {
            display: grid;
            grid-template-columns: minmax(110px, 1fr) minmax(70px, 0.7fr) 76px minmax(70px, 0.7fr) minmax(110px, 1fr);
            align-items: center;
            gap: 10px;
        }
        .hubble-energy-chain-node {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .hubble-energy-chain-node.output {
            text-align: right;
        }
        .hubble-energy-chain-node-label {
            color: var(--text-muted);
            font-size: 0.7rem;
        }
        .hubble-energy-chain-node strong {
            color: var(--text-primary);
            font: 800 1.15rem var(--font-mono);
        }
        .hubble-energy-chain-node strong small {
            color: var(--text-muted);
            font-size: 0.62rem;
            font-weight: 600;
        }
        .hubble-energy-chain-route {
            position: relative;
            height: 2px;
            background: #22d3ee;
        }
        .hubble-energy-chain-route::after {
            content: ;
            position: absolute;
            top: 50%;
            right: -1px;
            width: 7px;
            height: 7px;
            border-top: 2px solid #22d3ee;
            border-right: 2px solid #22d3ee;
            transform: translateY(-50%) rotate(45deg);
        }
        .hubble-energy-chain-route.loss {
            background: #fbbf24;
        }
        .hubble-energy-chain-route.loss::after {
            border-color: #fbbf24;
        }
        .hubble-energy-chain-route.loss span {
            position: absolute;
            left: 50%;
            bottom: 7px;
            color: var(--text-muted);
            font: 600 0.62rem var(--font-mono);
            white-space: nowrap;
            transform: translateX(-50%);
        }
        .hubble-energy-chain-converter {
            position: relative;
            display: flex;
            justify-content: center;
        }
        .hubble-energy-chain-converter-label {
            position: absolute;
            bottom: calc(100% + 5px);
            left: 50%;
            color: var(--text-muted);
            font-size: 0.58rem;
            font-weight: 700;
            text-transform: uppercase;
            white-space: nowrap;
            transform: translateX(-50%);
        }
        .hubble-energy-chain-ring {
            display: flex;
            width: 68px;
            height: 68px;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            border-radius: 50%;
            background: radial-gradient(circle at center, var(--bg-card) 58%, transparent 60%),
                conic-gradient(var(--accent) var(--chain-progress), rgba(148, 163, 184, 0.18) 0);
        }
        .hubble-energy-chain-ring strong {
            color: var(--text-primary);
            font: 800 1rem var(--font-mono);
        }
        .hubble-energy-chain-summary {
            display: grid;
            grid-template-columns: minmax(230px, auto) minmax(0, 1fr);
            align-items: center;
            gap: 12px 24px;
            margin-top: 9px;
            padding-top: 9px;
            border-top: 1px solid rgba(148, 163, 184, 0.12);
        }
        .hubble-energy-chain-branches,
        .hubble-energy-chain-kpis {
            display: flex;
            align-items: stretch;
            justify-content: center;
            flex-wrap: wrap;
            gap: 8px 20px;
        }
        .hubble-energy-chain-branches {
            justify-content: flex-start;
        }
        .hubble-energy-chain-branch {
            display: inline-flex;
            align-items: baseline;
            gap: 7px;
            color: var(--text-secondary);
            font-size: 0.68rem;
        }
        .hubble-energy-chain-branch::before {
            content: ;
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #fbbf24;
        }
        .hubble-energy-chain-branch.battery::before {
            background: #22c55e;
        }
        .hubble-energy-chain-branch.pending::before {
            background: #64748b;
        }
        .hubble-energy-chain-branch strong {
            color: var(--text-primary);
            font-family: var(--font-mono);
        }
        .hubble-energy-chain-branch.pending strong {
            color: var(--text-muted);
            font-family: var(--font-sans);
            font-weight: 600;
        }
        .hubble-energy-chain-kpis {
            justify-content: flex-end;
        }
        .hubble-energy-chain-kpis > span {
            display: flex;
            min-width: 120px;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        .hubble-energy-chain-kpis small {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            color: var(--text-muted);
            font-size: 0.66rem;
        }
        .hubble-metric-help {
            position: relative;
            display: inline-flex;
            width: 15px;
            height: 15px;
            align-items: center;
            justify-content: center;
            padding: 0;
            border: 1px solid rgba(148, 163, 184, 0.42);
            border-radius: 50%;
            color: var(--text-muted);
            background: transparent;
            font: 700 0.58rem var(--font-sans);
            cursor: help;
        }
        .hubble-metric-help::after {
            content: attr(data-tooltip);
            position: absolute;
            z-index: 20;
            right: -8px;
            bottom: calc(100% + 8px);
            width: min(260px, 70vw);
            padding: 7px 9px;
            border: 1px solid var(--border-default);
            border-radius: 6px;
            color: var(--text-primary);
            background: var(--bg-elevated, var(--bg-card));
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
            font-size: 0.68rem;
            font-weight: 500;
            line-height: 1.35;
            text-align: left;
            pointer-events: none;
            opacity: 0;
            transform: translateY(3px);
            transition: opacity 0.15s ease, transform 0.15s ease;
        }
        .hubble-metric-help:hover::after,
        .hubble-metric-help:focus-visible::after,
        .hubble-metric-help:focus::after {
            opacity: 1;
            transform: translateY(0);
        }
        .hubble-metric-help:focus-visible {
            outline: 2px solid var(--accent);
            outline-offset: 2px;
        }
        .hubble-energy-chain-kpis strong {
            color: var(--text-primary);
            font: 800 0.82rem var(--font-mono);
        }
        .hubble-system-status {
            flex: 1 1 260px;
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: min(100%, 190px);
            padding: 8px 12px;
            border: 1px solid rgba(255, 255, 255, 0.10);
            border-radius: var(--radius-md);
            background: rgba(255, 255, 255, 0.03);
        }
        .hubble-system-status.ready {
            border-color: rgba(255, 255, 255, 0.12);
            background: rgba(255, 255, 255, 0.035);
        }
        .hubble-system-status.active {
            border-color: rgba(0, 212, 255, 0.28);
            background: rgba(0, 212, 255, 0.06);
        }
        .hubble-system-status.attention {
            border-color: rgba(239, 68, 68, 0.30);
            background: rgba(239, 68, 68, 0.06);
        }
        .hubble-system-title {
            color: var(--text-primary);
            font-size: 0.82rem;
            font-weight: 800;
        }
        .hubble-system-meta {
            color: var(--text-secondary);
            font-size: 0.74rem;
            line-height: 1.35;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .hubble-toggle {
            flex: 0 0 auto;
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: var(--radius-sm);
            background: rgba(255, 255, 255, 0.05);
            color: var(--text-primary);
            padding: 6px 12px;
            font-size: 0.8rem;
            cursor: pointer;
            transition: background 0.2s ease, border-color 0.2s ease;
        }
        .hubble-toggle:hover {
            background: rgba(255, 255, 255, 0.12);
            border-color: rgba(255, 255, 255, 0.25);
        }
        .hubble-report-toggle-row {
            display: flex;
            justify-content: flex-end;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid rgba(148, 163, 184, 0.12);
        }
        .hubble-chip-row {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-sm);
            margin-bottom: var(--space-md);
        }
        .hubble-chip {
            display: inline-flex;
            align-items: baseline;
            gap: 6px;
            min-height: 28px;
            padding: 4px 8px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: var(--radius-sm);
            background: rgba(255, 255, 255, 0.03);
        }
        .hubble-chip-label {
            color: var(--text-muted);
            font-size: 0.70rem;
        }
        .hubble-chip-value {
            color: var(--text-primary);
            font-family: var(--font-mono);
            font-size: 0.80rem;
            font-weight: 700;
        }
        
        .hubble-speech-bubble {
            position: relative;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: var(--radius-md);
            padding: var(--space-md);
            margin-bottom: var(--space-md);
        }
        .hubble-lead,
        .hubble-tip {
            margin: 0;
            line-height: 1.55;
            font-size: 0.94rem;
        }
        .hubble-lead {
            color: var(--text-primary);
        }
        .hubble-tip {
            margin-top: var(--space-xs);
            color: var(--text-primary);
            font-weight: 600;
        }
        
        .hubble-actions {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-sm);
            margin-top: var(--space-md);
        }
        .hubble-action {
            border: 1px solid var(--border-default);
            border-radius: var(--radius-sm);
            background: rgba(255, 255, 255, 0.03);
            color: var(--text-secondary);
            min-height: 32px;
            padding: 6px 12px;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
        }
        .hubble-action:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: var(--border-hover);
            color: var(--text-primary);
        }
        .hubble-action.active {
            background: rgba(0, 212, 255, 0.08);
            border-color: var(--accent);
            color: var(--text-primary);
        }
        .hubble-answer {
            margin-top: var(--space-md);
            padding: var(--space-md);
            border: 1px solid rgba(255, 255, 255, 0.10);
            border-radius: var(--radius-md);
            background: rgba(255, 255, 255, 0.03);
        }
        .hubble-answer-label {
            display: block;
            margin-bottom: 6px;
            color: var(--text-primary);
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .hubble-answer p {
            margin: 0;
            color: var(--text-primary);
            line-height: 1.55;
            font-size: 0.90rem;
        }
        .hubble-answer p + p {
            margin-top: var(--space-xs);
        }
        .hubble-helpers-quick-create {
            margin-top: var(--space-sm);
            display: flex;
            flex-direction: column;
            gap: var(--space-xs);
        }
        .hubble-helper-action-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--space-md);
            padding: var(--space-xs) 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .hubble-helper-action-row:last-child {
            border-bottom: none;
        }
        .hubble-helper-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        .hubble-helper-name {
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--text-primary);
        }
        .hubble-helper-desc {
            font-size: 0.75rem;
            color: var(--text-muted);
        }
        .hubble-create-helper-btn {
            padding: 4px 10px;
            background: rgba(234, 179, 8, 0.1);
            border: 1px solid var(--warning);
            color: var(--warning);
            border-radius: var(--radius-sm);
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            transition: all var(--transition-fast);
        }
        .hubble-create-helper-btn:hover:not(:disabled) {
            background: rgba(234, 179, 8, 0.2);
            color: var(--text-primary);
        }
        .hubble-create-helper-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .hubble-helper-status {
            margin-top: var(--space-xs);
            padding: 6px var(--space-sm);
            border-radius: var(--radius-sm);
            font-size: 0.75rem;
            text-align: center;
        }
        .hubble-helper-status.success {
            background: rgba(34, 197, 94, 0.1);
            color: var(--success);
            border: 1px solid rgba(34, 197, 94, 0.2);
        }
        .hubble-helper-status.error {
            background: rgba(239, 68, 68, 0.1);
            color: var(--danger);
            border: 1px solid rgba(239, 68, 68, 0.2);
        }
        
        .hubble-details {
            margin-top: var(--space-lg);
            padding-top: var(--space-md);
            border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .hubble-story-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: var(--space-md);
            margin-bottom: var(--space-md);
        }
        .hubble-story-tile {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: var(--radius-md);
            padding: var(--space-md);
            transition: transform var(--transition-fast), border-color var(--transition-fast);
        }
        .hubble-story-tile:hover {
            border-color: rgba(255, 255, 255, 0.12);
            transform: translateY(-2px);
        }
        .hubble-tile-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: var(--space-xs);
        }
        .hubble-tile-icon {
            font-size: 1.1rem;
        }
        .hubble-tile-title {
            font-weight: 700;
            font-size: 0.88rem;
            color: var(--text-primary);
        }
        .hubble-tile-body p {
            margin: 0;
            color: var(--text-secondary);
            font-size: 0.86rem;
            line-height: 1.5;
        }
        .hubble-tile-body p + p {
            margin-top: 6px;
        }
        .hubble-updated {
            color: var(--text-muted);
            font-family: var(--font-mono);
            font-size: 0.76rem;
            margin-top: var(--space-md);
        }
        @media (max-width: 1280px) {
            .hubble-header {
                grid-template-columns: 48px minmax(0, 1fr);
            }
            .hubble-day-balance {
                grid-column: 1 / -1;
            }
            .hubble-system-status {
                grid-column: 1 / -1;
            }
        }
        @media (max-width: 760px) {
            .hubble-day-balance {
                min-width: 100%;
            }
            .hubble-day-balance-source {
                grid-template-columns: 7px auto auto;
            }
            .hubble-day-balance-percent {
                display: none;
            }
            .hubble-energy-chain-heading {
                align-items: center;
            }
            .hubble-energy-chain-subtitle {
                display: none;
            }
            .hubble-energy-chain-flow {
                grid-template-columns: minmax(72px, 1fr) 34px 72px 34px minmax(72px, 1fr);
                gap: 4px;
            }
            .hubble-energy-chain-ring {
                width: 68px;
                height: 68px;
            }
            .hubble-energy-chain-node strong {
                font-size: 0.88rem;
            }
            .hubble-energy-chain-route.loss span {
                display: none;
            }
            .hubble-energy-chain-branches {
                align-items: flex-start;
                flex-direction: column;
            }
            .hubble-energy-chain-summary {
                grid-template-columns: 1fr;
                gap: 9px;
            }
            .hubble-energy-chain-kpis {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 4px;
                justify-content: stretch;
            }
            .hubble-energy-chain-kpis > span {
                min-width: 0;
                align-items: center;
                flex-direction: column;
                gap: 3px;
                text-align: center;
            }
        }
        /* ===== Photorealistic Twilight Energy Flow ===== */
        .flow-subtle-axis {
            stroke: rgba(255, 255, 255, 0.04);
            stroke-width: 1px;
            stroke-dasharray: 4 12;
        }
        [data-theme="light"] .flow-subtle-axis {
            stroke: rgba(15, 23, 42, 0.04);
        }

        /* ===== Leader Lines for Annotation ===== */
        .leader-line {
            fill: none;
            stroke: rgba(255, 255, 255, 0.25);
            stroke-width: 1px;
            stroke-dasharray: 2 3;
        }
        [data-theme="light"] .leader-line {
            stroke: rgba(15, 23, 42, 0.25);
        }
        .leader-line-separator {
            fill: none;
            stroke: rgba(255, 255, 255, 0.15);
            stroke-width: 1px;
        }
        [data-theme="light"] .leader-line-separator {
            stroke: rgba(15, 23, 42, 0.15);
        }
        .leader-dot-circle {
            fill: rgba(255, 255, 255, 0.4);
        }
        [data-theme="light"] .leader-dot-circle {
            fill: rgba(15, 23, 42, 0.4);
        }

        /* Route Paths and Glow */
        .flow-route-bg {
            fill: none;
            stroke: rgba(255, 255, 255, 0.08);
            stroke-linecap: round;
        }
        [data-theme="light"] .flow-route-bg {
            stroke: rgba(15, 23, 42, 0.06);
        }
        .flow-route {
            fill: none;
            stroke-linecap: round;
            filter: drop-shadow(0 0 2px currentColor);
        }
        .flow-route-glow {
            fill: none;
            stroke-linecap: round;
            filter: url(#flowSoftGlow);
            opacity: 0.35;
        }

        /* Route Theme Colors */
        .route-solar { stroke: #fbbf24; color: #fbbf24; }
        .route-battery { stroke: #22c55e; color: #22c55e; }
        .route-grid { stroke: #a855f7; color: #a855f7; }
        .route-export { stroke: #06b6d4; color: #06b6d4; }
        .route-house { stroke: #22d3ee; color: #22d3ee; }
        .route-car { stroke: #38bdf8; color: #38bdf8; }

        /* Particles */
        .flow-particle {
            filter: url(#flowSoftGlow);
        }
        .particle-solar { fill: #fde047; }
        .particle-battery { fill: #4ade80; }
        .particle-grid { fill: #c084fc; }
        .particle-export { fill: #22d3ee; }
        .particle-house { fill: #67e8f9; }
        .particle-car { fill: #7dd3fc; }

        /* Text Blocks */
        .val-main {
            font-family: var(--font-family);
            font-size: 24px;
            font-weight: 700;
            fill: #ffffff;
            letter-spacing: -0.02em;
        }
        [data-theme="light"] .val-main {
            fill: #0f172a;
        }
        .label-sub {
            font-family: var(--font-family);
            font-size: 11px;
            font-weight: 600;
            fill: #94a3b8;
            letter-spacing: 0.08em;
        }
        [data-theme="light"] .label-sub {
            fill: #64748b;
        }
        .status-sub {
            font-family: var(--font-family);
            font-size: 12px;
            font-weight: 500;
        }
        .status-sub.producing { fill: #fbbf24; }
        .status-sub.charging { fill: #22c55e; }
        .status-sub.discharging { fill: #38bdf8; }
        .status-sub.export { fill: #06b6d4; }
        .status-sub.import { fill: #a855f7; }
        .status-sub.idle { fill: #94a3b8; }
        .status-sub.neutral { fill: #94a3b8; }

        /* Extra Consumer info under home load */
        .val-extra {
            font-family: var(--font-family);
            font-size: 11px;
            font-weight: 500;
        }
        .val-extra.heatpump { fill: #fb7185; }
        .val-extra.heatingrod { fill: #f97316; }

        /* Text Alignment Left Overrides */
        .text-block-left text {
            text-anchor: end;
        }
        
        /* Subtle glow filters on text values */
        .val-main.solar { filter: drop-shadow(0 0 1px rgba(251,191,36,0.3)); }
        .val-main.home { filter: drop-shadow(0 0 1px rgba(34,211,238,0.3)); }
        .val-main.battery { filter: drop-shadow(0 0 1px rgba(34,197,94,0.3)); }
        .val-main.car { filter: drop-shadow(0 0 1px rgba(56,189,248,0.3)); }
        .val-main.grid.import { filter: drop-shadow(0 0 1px rgba(168,85,247,0.3)); }
        .val-main.grid.export { filter: drop-shadow(0 0 1px rgba(6,182,212,0.3)); }

        /* ===== Panel Groups ===== */
        .panel-groups-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: var(--space-md);
            align-items: stretch;
        }
        .panel-groups-grid.count-4 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .panel-groups-grid.count-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .panel-groups-grid.count-1 {
            grid-template-columns: minmax(0, 720px);
        }
        .panel-group-chart {
            height: 220px;
            width: 100%;
            min-width: 0;
        }
        .panel-group-card {
            background: var(--card-bg, rgba(255,255,255,0.03));
            border: 1px solid var(--border-default, rgba(255,255,255,0.08));
            border-radius: var(--radius-lg, 12px);
            padding: var(--space-md);
            transition: border-color 0.2s ease;
        }
        .panel-group-card:hover {
            border-color: #fbbf24;
        }
        .panel-group-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--space-sm);
        }
        .panel-group-name {
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--text-primary);
        }
        .panel-group-max {
            font-size: 0.7rem;
            font-family: var(--font-mono);
            color: var(--text-muted);
            background: rgba(251,191,36,0.1);
            padding: 2px 8px;
            border-radius: 10px;
        }
        .panel-group-power {
            font-size: 1.8rem;
            font-weight: 700;
            color: #fbbf24;
            font-family: var(--font-mono);
            line-height: 1.1;
        }
        .panel-group-unit {
            font-size: 0.9rem;
            font-weight: 400;
            color: var(--text-muted);
            margin-left: 2px;
        }
        .panel-sparkline-wrap {
            margin-top: var(--space-sm);
            border-top: 1px solid rgba(255,255,255,0.05);
            padding-top: var(--space-sm);
        }

        .pg-stats {
            display: flex;
            gap: 6px;
            align-items: center;
            flex-wrap: wrap;
        }

        .pg-badge {
            display: inline-flex;
            align-items: center;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: var(--font-mono);
            font-size: 0.72rem;
            font-weight: 600;
            border: 1px solid rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
        }

        .pg-badge.actual {
            color: #22c55e;
            background: rgba(34, 197, 94, 0.08);
        }

        .pg-badge.forecast {
            color: #fbbf24;
            background: rgba(251, 191, 36, 0.08);
        }

        .pg-badge.progress {
            background: rgba(255, 255, 255, 0.02);
        }

        .pg-meta-line {
            margin-top: 8px;
            color: var(--text-muted);
            font-size: 0.68rem;
            line-height: 1.35;
            font-family: var(--font-mono);
            white-space: normal;
        }

        .forecast-card-title-row {
            margin-bottom: 12px;
        }

        .forecast-metrics-wrapper {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: var(--space-md);
            margin-top: var(--space-sm);
            margin-bottom: var(--space-md);
        }

        .forecast-metrics-column {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: var(--space-sm);
        }

        .metric-badge-card {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            background: rgba(255, 255, 255, 0.015);
            border: 1px solid rgba(255, 255, 255, 0.04);
            border-radius: var(--radius-md);
            padding: var(--space-xs) var(--space-sm);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            transition: all var(--transition-normal);
        }

        .metric-badge-card:hover {
            background: rgba(255, 255, 255, 0.035);
            border-color: rgba(255, 255, 255, 0.08);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .metric-badge-icon {
            font-size: 1.2rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .metric-badge-info {
            display: flex;
            flex-direction: column;
        }

        .metric-badge-value {
            font-size: 1rem;
            font-weight: 700;
            font-family: var(--font-mono);
            line-height: 1.2;
        }

        .metric-badge-value .unit {
            font-size: 0.75rem;
            font-weight: 500;
            opacity: 0.7;
        }

        .metric-badge-label {
            font-size: 0.65rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.04em;
            margin-top: 1px;
        }

        /* Responsive: stack forecast metrics on tablets and phones */
        @media (max-width: 900px) {
            .forecast-metrics-wrapper {
                grid-template-columns: 1fr;
                gap: var(--space-sm);
            }
        }

        @media (max-width: 480px) {
            .forecast-metrics-column {
                grid-template-columns: 1fr;
            }
        }

        /* ===== Weather Trace Glassmorphism ===== */
        .weather-trace {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 6px 10px;
            align-items: start;
            margin-top: 12px;
            margin-bottom: 6px;
            padding: 8px 10px;
            border: 1px solid rgba(255, 255, 255, 0.04);
            border-radius: var(--radius-md);
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.01), rgba(255, 255, 255, 0.005));
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
        }

        .weather-trace-labels {
            display: grid;
            grid-template-rows: 16px 28px 28px 20px;
            gap: 6px;
            color: var(--text-muted);
            font-size: 0.75rem;
            padding-top: 1px;
            align-items: center;
            justify-items: center;
            width: 24px;
        }

        .weather-trace-labels span {
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: default;
        }

        .weather-trace-labels span:first-child {
            grid-row: 2;
        }

        .weather-trace-labels span:nth-child(2) {
            grid-row: 3;
        }

        .weather-trace-labels span:nth-child(3) {
            grid-row: 4;
        }

        .weather-trace-grid {
            display: grid;
            grid-auto-flow: column;
            grid-auto-columns: minmax(28px, 1fr);
            grid-template-rows: 16px 28px 28px 20px;
            gap: 6px 4px;
            overflow-x: auto;
            padding-bottom: 2px;
            scrollbar-width: none; /* Hide scrollbar for clean look */
        }

        .weather-trace-grid::-webkit-scrollbar {
            display: none;
        }

        .weather-trace-cell {
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 28px;
            font-family: var(--font-mono);
        }

        .weather-trace-hour {
            color: var(--text-muted);
            font-size: 0.62rem;
        }

        .weather-trace-icon {
            flex-direction: column;
            gap: 2px;
            min-height: 28px;
            border-radius: var(--radius-sm);
            background: rgba(255, 255, 255, 0.015);
            border: 1px solid rgba(255, 255, 255, 0.02);
            transition: all var(--transition-normal);
        }

        .weather-trace-icon:hover {
            background: rgba(255, 255, 255, 0.035);
            border-color: rgba(255, 255, 255, 0.05);
        }

        .weather-trace-visual {
            font-size: 1rem;
            line-height: 1;
        }

        .weather-trace-indicators {
            display: flex;
            gap: 2px;
            font-size: 0.55rem;
            line-height: 1;
        }

        .weather-trace-indicator {
            opacity: 0.25;
            font-weight: 700;
        }

        .weather-trace-indicator.level-low {
            opacity: 0.45;
            color: var(--text-muted);
        }

        .weather-trace-indicator.level-medium {
            opacity: 0.75;
            color: var(--text-secondary);
        }

        .weather-trace-indicator.level-high {
            opacity: 1;
            color: var(--solar);
        }

        .weather-trace-icon.muted {
            color: rgba(148, 163, 184, 0.35);
            opacity: 0.5;
        }

        .weather-trace-match-badge {
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: var(--radius-sm);
            min-height: 20px;
            width: 20px;
            margin: auto;
            font-size: 0.75rem;
            transition: all var(--transition-normal);
        }

        .weather-trace-match-badge .match-icon {
            line-height: 1;
        }

        .weather-trace-match-badge.match-good {
            color: #22c55e;
            background: rgba(34, 197, 94, 0.15);
            box-shadow: 0 0 6px rgba(34, 197, 94, 0.05);
        }

        .weather-trace-match-badge.match-mixed {
            color: #eab308;
            background: rgba(234, 179, 8, 0.15);
            box-shadow: 0 0 6px rgba(234, 179, 8, 0.05);
        }

        .weather-trace-match-badge.match-bad {
            color: #f87171;
            background: rgba(248, 113, 113, 0.15);
            box-shadow: 0 0 6px rgba(248, 113, 113, 0.05);
        }

        .weather-trace-match-badge.match-missing {
            color: rgba(148, 163, 184, 0.35);
            background: rgba(148, 163, 184, 0.05);
        }

        /* === Panel Live Cards (unter PV-Chart) === */
        .panel-live-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
            gap: var(--space-sm);
        }

        .panel-live-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.015);
            border: 1px solid rgba(255, 255, 255, 0.04);
            border-radius: var(--radius-md);
            padding: var(--space-sm) var(--space-md);
            text-align: center;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            transition: all var(--transition-normal);
        }

        .panel-live-card:hover {
            background: rgba(255, 255, 255, 0.035);
            border-color: rgba(251, 191, 36, 0.25);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .panel-live-icon {
            font-size: 1.1rem;
            margin-bottom: 4px;
            color: var(--solar);
            filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.3));
        }

        .panel-live-name {
            font-size: 0.65rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 2px;
        }

        .panel-live-power {
            font-size: 1.4rem;
            font-weight: 700;
            font-family: var(--font-mono);
            color: var(--solar);
            line-height: 1.1;
        }

        .panel-live-unit {
            font-size: 0.75rem;
            font-weight: 500;
            color: var(--text-secondary);
        }

        .panel-group-chart-card {
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-lg);
            padding: var(--space-md);
            min-width: 0;
            overflow: hidden;
            backdrop-filter: var(--glass-blur);
            -webkit-backdrop-filter: var(--glass-blur);
            transition: border-color var(--transition-normal);
        }

        .panel-group-chart-card:hover {
            border-color: var(--border-hover);
        }

        .chart-card {
            transition: border-color var(--transition-normal);
        }
        .chart-card:hover {
            border-color: var(--border-hover);
        }

        .battery-chart-container {
            height: 28vh;
            min-height: 220px;
        }

        .battery-chart-stats {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            column-gap: 18px;
            row-gap: 8px;
            color: var(--text-muted);
            font-family: var(--font-mono);
            font-size: 0.78rem;
        }

        .battery-chart-stats span {
            display: inline-flex;
            align-items: baseline;
            gap: 6px;
            white-space: nowrap;
        }

        .battery-chart-stats strong {
            color: var(--text-primary);
            font-weight: 700;
        }

        .battery-chart-stats strong.charge {
            color: #22c55e;
        }

        .battery-chart-stats strong.discharge {
            color: #f97316;
        }

        .battery-chart-stats .battery-mode {
            padding: 2px 7px;
            border-radius: 999px;
            border: 1px solid var(--border-default);
            color: var(--text-secondary);
            font-family: var(--font-sans);
            font-size: 0.72rem;
            font-weight: 700;
        }

        .battery-chart-stats .battery-mode.charging {
            border-color: rgba(34, 197, 94, 0.28);
            color: #22c55e;
        }

        .battery-chart-stats .battery-mode.discharging {
            border-color: rgba(249, 115, 22, 0.28);
            color: #f97316;
        }

        @media (max-width: 1180px) {
            .panel-groups-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }

        @media (max-width: 760px) {
            .panel-groups-grid,
            .panel-groups-grid.count-4,
            .panel-groups-grid.count-2 {
                grid-template-columns: minmax(0, 1fr);
            }
        }

        /* === FLOW LAYOUT (SVG + Info Panel under SVG) === */
        .flow-layout {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            background: var(--bg-card);
            border-radius: var(--radius-lg);
            border: 1px solid var(--border-default);
            overflow: hidden;
        }

        .flow-layout > svg {
            width: 100%;
            height: auto;
            max-height: 70vh;
            display: block;
        }

        .flow-info-panel {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
            gap: var(--space-md);
            padding: var(--space-md);
            background: rgba(255, 255, 255, 0.015);
            border-top: 1px solid var(--border-default);
        }

        [data-theme="light"] .flow-info-panel {
            background: rgba(15, 23, 42, 0.01);
        }

        .info-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 4px;
        }

        .info-label {
            font-size: 0.72rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.06em;
            font-weight: 600;
        }

        .info-value {
            font-size: 1.25rem;
            font-weight: 700;
            font-family: var(--font-mono);
            color: var(--text-primary);
        }

        .info-value.info-small {
            font-size: 0.85rem;
            font-weight: 500;
            margin-top: -2px;
        }

        .flow-inverter-box {
            fill: rgba(34, 211, 238, 0.1);
            stroke: var(--accent);
            stroke-width: 1.5px;
            backdrop-filter: blur(4px);
        }

        .inverter-text {
            font-family: var(--font-family);
            font-size: 10px;
            font-weight: 700;
            fill: var(--accent);
            text-anchor: middle;
        }

        .weather-badges {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            margin-left: var(--space-md);
            flex-wrap: wrap;
        }
        .weather-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 0.8rem;
            padding: 4px 10px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--border-default);
            border-radius: 999px;
            color: var(--text-secondary);
            font-weight: 500;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            transition: all 0.2s ease;
        }
        [data-theme="light"] .weather-badge {
            background: rgba(15, 23, 42, 0.02);
            box-shadow: 0 2px 6px rgba(15, 23, 42, 0.03);
        }
        .weather-badge.temp-badge {
            border-color: rgba(251, 191, 36, 0.25);
            color: var(--solar);
        }
        .weather-badge.clouds-badge {
            border-color: rgba(6, 182, 212, 0.25);
            color: var(--battery);
        }
        .weather-badge.source-badge {
            background: rgba(255, 255, 255, 0.05);
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: 600;
            color: var(--text-muted);
        }
        .flow-status-chip {
            gap: 6px;
            white-space: nowrap;
            max-width: 180px;
        }
        .flow-status-chip.sfml {
            border-color: rgba(56, 189, 248, 0.24);
            color: #38bdf8;
        }
        .flow-status-chip.stats {
            border-color: rgba(168, 85, 247, 0.24);
            color: #a855f7;
        }
        .flow-status-chip.active {
            border-color: rgba(34, 197, 94, 0.32);
            background: rgba(34, 197, 94, 0.11);
            color: #22c55e;
        }
        .flow-status-chip.inactive {
            border-color: rgba(148, 163, 184, 0.18);
            color: var(--text-muted);
        }
        .flow-status-chip.unavailable {
            border-color: rgba(239, 68, 68, 0.24);
            color: #ef4444;
            opacity: 0.82;
        }
        .badge-chip-value {
            overflow: hidden;
            text-overflow: ellipsis;
            font-family: var(--font-mono);
            font-weight: 700;
            color: var(--text-primary);
        }
        .flow-status-chip.active .badge-chip-value {
            color: #22c55e;
        }
        .flow-status-chip.inactive .badge-chip-value {
            color: var(--text-muted);
        }
        .flow-status-chip.unavailable .badge-chip-value {
            color: #ef4444;
        }
        .time-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 0.8rem;
            padding: 4px 10px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--border-default);
            border-radius: 999px;
            color: var(--text-muted);
            font-family: var(--font-mono);
        }
        [data-theme="light"] .time-badge {
            background: rgba(15, 23, 42, 0.02);
        }
    `;
    document.head.appendChild(style);
})();

return _HomePage;
})(Vue);

window.HomePage = HomePage;
