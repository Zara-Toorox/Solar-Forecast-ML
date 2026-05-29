// Solar Command Center — Home Page V17 (Solar Dashboard)
// (C) 2026 Zara-Toorox

const HomePage = ((Vue) => {
const { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } = Vue;

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
                <div style="display:flex; align-items:baseline; gap:0; flex-wrap:wrap;">
                    <span class="chart-title" style="margin-right:24px;">{{ $t('home.energyFlow') }}</span>
                    <span v-if="infoData.outdoorTemperatureLabel" style="font-size:0.95rem; color:var(--text-muted); font-family:var(--font-mono); letter-spacing:0.01em;">
                        {{ infoData.outdoorTemperatureLabel }}
                    </span>
                </div>
                <span class="flow-time" style="font-size:0.8rem; color:var(--text-muted); font-family:var(--font-mono)">
                    {{ currentTime }}
                </span>
            </div>

            <div class="flow-layout">

            <svg class="isometric-energy-flow" viewBox="0 0 900 520" preserveAspectRatio="xMidYMid meet"
                 style="width:100%; height:auto; max-height:45vh; display:block;">

                <!-- ========== DAY/NIGHT SKY EFFECTS ========== -->
                <g v-if="isNightTime" class="night-sky">
                    <circle cx="50" cy="30" r="2" fill="#ffffff" class="star star-twinkle-1"/>
                    <circle cx="150" cy="60" r="1.5" fill="#ffffff" class="star star-twinkle-2"/>
                    <circle cx="280" cy="25" r="2.5" fill="#ffffff" class="star star-twinkle-3"/>
                    <circle cx="420" cy="45" r="1.8" fill="#ffffff" class="star star-twinkle-1"/>
                    <circle cx="550" cy="20" r="2" fill="#ffffff" class="star star-twinkle-2"/>
                    <circle cx="680" cy="55" r="2.2" fill="#ffffff" class="star star-twinkle-3"/>
                    <circle cx="800" cy="35" r="1.5" fill="#ffffff" class="star star-twinkle-1"/>
                    <circle cx="850" cy="70" r="2" fill="#ffffff" class="star star-twinkle-2"/>
                    <circle cx="100" cy="80" r="1.2" fill="#c0c0ff" class="star star-twinkle-2"/>
                    <circle cx="200" cy="40" r="1" fill="#c0c0ff" class="star star-twinkle-3"/>
                    <circle cx="350" cy="70" r="1.3" fill="#c0c0ff" class="star star-twinkle-1"/>
                    <circle cx="500" cy="50" r="1" fill="#c0c0ff" class="star star-twinkle-2"/>
                    <circle cx="620" cy="30" r="1.2" fill="#c0c0ff" class="star star-twinkle-3"/>
                    <circle cx="750" cy="65" r="1" fill="#c0c0ff" class="star star-twinkle-1"/>
                    <circle cx="75" cy="50" r="0.8" fill="#8080ff" class="star star-twinkle-3"/>
                    <circle cx="180" cy="85" r="0.6" fill="#8080ff" class="star star-twinkle-1"/>
                    <circle cx="320" cy="35" r="0.7" fill="#8080ff" class="star star-twinkle-2"/>
                    <circle cx="460" cy="75" r="0.8" fill="#8080ff" class="star star-twinkle-3"/>
                    <circle cx="580" cy="40" r="0.6" fill="#8080ff" class="star star-twinkle-1"/>
                    <circle cx="720" cy="80" r="0.7" fill="#8080ff" class="star star-twinkle-2"/>
                    <circle cx="820" cy="45" r="0.8" fill="#8080ff" class="star star-twinkle-3"/>
                    <path d="M780,30 A30,30 0 1,1 780,90 A22,22 0 1,0 780,30 Z"
                          fill="#fffacd" opacity="0.3" filter="url(#glowCyan)"/>
                    <path d="M780,35 A25,25 0 1,1 780,85 A18,18 0 1,0 780,35 Z"
                          fill="#fffacd" opacity="1"/>
                    <path d="M780,40 A23,23 0 0,1 780,80 A16,16 0 0,0 780,40 Z"
                          fill="#fff" opacity="0.3"/>
                </g>

                <g v-else class="day-sky">
                    <circle cx="820" cy="60" r="50" fill="url(#sunGlowGrad)" class="sun-glow" opacity="0.4"/>
                    <circle cx="820" cy="60" r="30" fill="#ffd60a" class="sun-body" filter="url(#glowYellow)"/>
                    <circle cx="820" cy="60" r="22" fill="#ffeb3b"/>
                    <g class="sun-rays">
                        <line x1="820" y1="15" x2="820" y2="0" stroke="#ffd60a" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
                        <line x1="820" y1="105" x2="820" y2="120" stroke="#ffd60a" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
                        <line x1="775" y1="60" x2="760" y2="60" stroke="#ffd60a" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
                        <line x1="865" y1="60" x2="880" y2="60" stroke="#ffd60a" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
                        <line x1="788" y1="28" x2="778" y2="18" stroke="#ffd60a" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>
                        <line x1="852" y1="92" x2="862" y2="102" stroke="#ffd60a" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>
                        <line x1="788" y1="92" x2="778" y2="102" stroke="#ffd60a" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>
                        <line x1="852" y1="28" x2="862" y2="18" stroke="#ffd60a" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>
                    </g>
                </g>

                <defs>
                    <radialGradient id="sunGlowGrad" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stop-color="#ffd60a" stop-opacity="0.8"/>
                        <stop offset="50%" stop-color="#ff9500" stop-opacity="0.3"/>
                        <stop offset="100%" stop-color="#ff9500" stop-opacity="0"/>
                    </radialGradient>
                    <linearGradient id="houseWallGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#2a4a6a"/>
                        <stop offset="100%" stop-color="#1a3050"/>
                    </linearGradient>
                    <linearGradient id="houseRoofGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="#4a7090"/>
                        <stop offset="100%" stop-color="#2a5070"/>
                    </linearGradient>
                    <linearGradient id="solarPanelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#1a3a5a"/>
                        <stop offset="50%" stop-color="#0a2540"/>
                        <stop offset="100%" stop-color="#1a4a6a"/>
                    </linearGradient>
                    <linearGradient id="reactorPlasmaGreen" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stop-color="#22c55e"/>
                        <stop offset="50%" stop-color="#4ade80"/>
                        <stop offset="100%" stop-color="#86efac"/>
                    </linearGradient>
                    <linearGradient id="reactorPlasmaGold" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stop-color="#b45309"/>
                        <stop offset="50%" stop-color="#fbbf24"/>
                        <stop offset="100%" stop-color="#fde68a"/>
                    </linearGradient>
                    <linearGradient id="reactorPlasmaGray" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stop-color="#475569"/>
                        <stop offset="50%" stop-color="#64748b"/>
                        <stop offset="100%" stop-color="#94a3b8"/>
                    </linearGradient>
                    <linearGradient id="gridBoxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#3a2a5a"/>
                        <stop offset="100%" stop-color="#2a1a4a"/>
                    </linearGradient>
                    <filter id="glowCyan" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="blur"/>
                        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                    <filter id="glowYellow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur"/>
                        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                    <filter id="glowGreen" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur"/>
                        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                    <filter id="glowPurple" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur"/>
                        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                    <filter id="shadowFilter" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="#000" flood-opacity="0.5"/>
                    </filter>
                </defs>

                <!-- ========== ISOMETRIC HOUSE (Top Center) ========== -->
                <g class="iso-house iso-element-clickable" @click="() => {}" transform="translate(390, 50) scale(1.4)">
                    <ellipse cx="40" cy="120" rx="70" ry="20" fill="#000" opacity="0.3"/>
                    <polygon points="0,60 0,120 60,150 60,90" fill="url(#houseWallGrad)" stroke="#00d4ff" stroke-width="1" opacity="0.9"/>
                    <polygon points="60,90 60,150 120,120 120,60" fill="#1a3a5a" stroke="#00d4ff" stroke-width="1" opacity="0.9"/>
                    <polygon points="0,60 60,30 120,60 60,90" fill="url(#houseRoofGrad)" stroke="#00d4ff" stroke-width="1"/>
                    <polygon points="60,0 -10,50 60,80 60,0" fill="#3a5a7a" stroke="#00d4ff" stroke-width="1"/>
                    <polygon points="60,0 130,50 60,80 60,0" fill="#2a4a6a" stroke="#00d4ff" stroke-width="1"/>
                    <polygon points="85,15 85,40 100,32 100,7" fill="#4a6a8a" stroke="#00d4ff" stroke-width="0.5"/>
                    <polygon points="85,15 100,7 105,10 90,18" fill="#5a7a9a" stroke="#00d4ff" stroke-width="0.5"/>
                    <rect x="10" y="75" width="20" height="25" fill="rgba(0, 212, 255, 0.3)" stroke="#00d4ff" stroke-width="1" transform="skewY(26.5)"/>
                    <rect x="35" y="75" width="15" height="25" fill="rgba(0, 212, 255, 0.3)" stroke="#00d4ff" stroke-width="1" transform="skewY(26.5)"/>
                    <polygon points="75,95 75,135 95,125 95,85" fill="rgba(0, 212, 255, 0.4)" stroke="#00d4ff" stroke-width="1"/>
                    <rect x="12" y="78" width="16" height="20" fill="#00d4ff" opacity="0.2" transform="skewY(26.5)">
                        <animate attributeName="opacity" values="0.2;0.4;0.2" dur="3s" repeatCount="indefinite"/>
                    </rect>
                </g>

                <text x="590" y="210" fill="#00d4ff" font-size="22" font-weight="bold" text-anchor="start" filter="url(#glowCyan)">
                    {{ flow.home_consumption?.toFixed(0) || '0' }} W
                </text>

                <!-- ========== ISOMETRIC SOLAR PANELS (Left-Center) ========== -->
                <g class="iso-solar iso-element-clickable" @click="() => {}" transform="translate(55, 80) scale(1.25)">
                    <line x1="30" y1="130" x2="30" y2="80" stroke="#4a6a8a" stroke-width="3"/>
                    <line x1="90" y1="130" x2="90" y2="80" stroke="#4a6a8a" stroke-width="3"/>
                    <line x1="60" y1="145" x2="60" y2="60" stroke="#4a6a8a" stroke-width="4"/>
                    <ellipse cx="60" cy="145" rx="50" ry="15" fill="#000" opacity="0.3"/>
                    <g class="panel-s1">
                        <polygon points="20,20 60,0 100,20 60,40" fill="url(#solarPanelGrad)" stroke="#00d4ff" stroke-width="1"/>
                        <line x1="40" y1="10" x2="40" y2="30" stroke="#00d4ff" stroke-width="0.5" opacity="0.5"/>
                        <line x1="60" y1="5" x2="60" y2="35" stroke="#00d4ff" stroke-width="0.5" opacity="0.5"/>
                        <line x1="80" y1="10" x2="80" y2="30" stroke="#00d4ff" stroke-width="0.5" opacity="0.5"/>
                        <polygon points="25,18 45,8 50,12 30,22" fill="#4a8aaa" opacity="0.3"/>
                    </g>
                    <g class="panel-s2">
                        <polygon points="15,45 55,25 95,45 55,65" fill="url(#solarPanelGrad)" stroke="#00d4ff" stroke-width="1"/>
                        <line x1="35" y1="35" x2="35" y2="55" stroke="#00d4ff" stroke-width="0.5" opacity="0.5"/>
                        <line x1="55" y1="30" x2="55" y2="60" stroke="#00d4ff" stroke-width="0.5" opacity="0.5"/>
                        <line x1="75" y1="35" x2="75" y2="55" stroke="#00d4ff" stroke-width="0.5" opacity="0.5"/>
                        <polygon points="20,43 40,33 45,37 25,47" fill="#4a8aaa" opacity="0.3"/>
                    </g>
                    <g class="panel-s3">
                        <polygon points="10,70 50,50 90,70 50,90" fill="url(#solarPanelGrad)" stroke="#00d4ff" stroke-width="1"/>
                        <line x1="30" y1="60" x2="30" y2="80" stroke="#00d4ff" stroke-width="0.5" opacity="0.5"/>
                        <line x1="50" y1="55" x2="50" y2="85" stroke="#00d4ff" stroke-width="0.5" opacity="0.5"/>
                        <line x1="70" y1="60" x2="70" y2="80" stroke="#00d4ff" stroke-width="0.5" opacity="0.5"/>
                        <polygon points="15,68 35,58 40,62 20,72" fill="#4a8aaa" opacity="0.3"/>
                    </g>
                    <circle cx="60" cy="40" r="8" fill="#ffdd00" opacity="0.15">
                        <animate attributeName="opacity" values="0.1;0.25;0.1" dur="2s" repeatCount="indefinite"/>
                        <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite"/>
                    </circle>
                </g>

                <text x="10" y="210" fill="#ffdd00" font-size="22" font-weight="bold" text-anchor="start" filter="url(#glowYellow)">
                    {{ flow.solar_power?.toFixed(0) || '0' }} W
                </text>

                <!-- ========== ISOMETRIC BATTERY (Bottom-Left - Hexagonal Reactor) ========== -->
                <g class="iso-battery iso-element-clickable" @click="() => {}" transform="translate(140, 340) scale(1.4)">
                    <ellipse cx="50" cy="110" rx="45" ry="15" fill="#000" opacity="0.5"/>
                    <polygon points="50,100 90,82 90,55 50,37 10,55 10,82" fill="rgba(20, 40, 35, 0.8)" stroke="#22c55e" stroke-width="1.5"/>
                    <polygon points="50,37 90,55 90,82 50,100 10,82 10,55" fill="none" stroke="#fbbf24" stroke-width="0.5" opacity="0.5"/>
                    <ellipse cx="50" cy="78" rx="32" ry="12" fill="none" stroke="#22c55e" stroke-width="2" opacity="0.8"/>
                    <ellipse cx="50" cy="78" rx="28" ry="10" fill="rgba(34, 197, 94, 0.1)" stroke="#22c55e" stroke-width="1" opacity="0.5"/>
                    <ellipse cx="50" cy="55" rx="18" ry="7" :fill="flow.battery_power > 0 ? 'rgba(34, 197, 94, 0.3)' : (flow.battery_power < 0 ? 'rgba(251, 191, 36, 0.3)' : 'rgba(100, 116, 139, 0.3)')" />
                    <ellipse cx="50" cy="55" rx="12" ry="5" :fill="flow.battery_power > 0 ? '#22c55e' : (flow.battery_power < 0 ? '#fbbf24' : '#64748b')" filter="url(#glowGreen)">
                        <animate attributeName="opacity" values="0.8;1;0.8" dur="1.5s" repeatCount="indefinite"/>
                    </ellipse>
                    <rect x="46" y="18" width="8" height="37" :fill="flow.battery_power > 0 ? 'url(#reactorPlasmaGreen)' : (flow.battery_power < 0 ? 'url(#reactorPlasmaGold)' : 'url(#reactorPlasmaGray)')" opacity="0.8" rx="4"/>
                    <rect x="48" y="20" width="4" height="33" fill="#fff" opacity="0.3" rx="2">
                        <animate attributeName="opacity" values="0.2;0.5;0.2" dur="0.8s" repeatCount="indefinite"/>
                    </rect>
                    <g transform="translate(50, 25)">
                        <ellipse cx="0" cy="0" rx="22" ry="8" fill="none" stroke="#22c55e" stroke-width="2" stroke-dasharray="8,4" opacity="0.9">
                            <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="8s" repeatCount="indefinite"/>
                        </ellipse>
                        <ellipse cx="0" cy="0" rx="16" ry="6" fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="6,6" opacity="0.7">
                            <animateTransform attributeName="transform" type="rotate" from="360" to="0" dur="6s" repeatCount="indefinite"/>
                        </ellipse>
                    </g>
                    <g transform="translate(50, 42)">
                        <ellipse cx="0" cy="0" rx="26" ry="10" fill="none" stroke="#22c55e" stroke-width="1.5" stroke-dasharray="10,5" opacity="0.6">
                            <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="10s" repeatCount="indefinite"/>
                        </ellipse>
                    </g>
                    <g transform="translate(50, 78)">
                        <ellipse cx="0" cy="0" rx="38" ry="14" fill="none" stroke="#1a4a3a" stroke-width="4" opacity="0.5"/>
                        <ellipse cx="0" cy="0" rx="38" ry="14" fill="none" stroke="#22c55e" stroke-width="4"
                            :stroke-dasharray="(flow.battery_soc || 0) * 2.4 + ' 240'"
                            stroke-linecap="round" filter="url(#glowGreen)"/>
                    </g>
                    <circle cx="10" cy="55" r="3" fill="#fbbf24" filter="url(#glowYellow)">
                        <animate attributeName="r" values="2;3;2" dur="2s" repeatCount="indefinite"/>
                    </circle>
                    <circle cx="90" cy="55" r="3" fill="#fbbf24" filter="url(#glowYellow)">
                        <animate attributeName="r" values="2;3;2" dur="2s" repeatCount="indefinite" begin="0.5s"/>
                    </circle>
                    <circle cx="50" cy="37" r="3" fill="#22c55e" filter="url(#glowGreen)">
                        <animate attributeName="r" values="2;4;2" dur="1.5s" repeatCount="indefinite"/>
                    </circle>
                    <rect x="30" y="85" width="40" height="18" fill="rgba(0,0,0,0.8)" rx="3" stroke="#22c55e" stroke-width="0.5"/>
                    <text x="50" y="98" fill="#22c55e" font-size="12" font-weight="bold" text-anchor="middle" filter="url(#glowGreen)">
                        {{ flow.battery_soc?.toFixed(0) || '0' }}%
                    </text>
                    <circle cx="50" cy="8" r="5" :fill="flow.battery_power > 0 ? '#22c55e' : (flow.battery_power < 0 ? '#fbbf24' : '#64748b')" filter="url(#glowGreen)">
                        <animate attributeName="opacity" values="1;0.4;1" dur="1s" repeatCount="indefinite"/>
                    </circle>
                </g>

                <text x="130" y="450" fill="#22c55e" font-size="18" font-weight="bold" text-anchor="end" filter="url(#glowGreen)">
                    {{ flow.battery_power > 0 ? '+' : '' }}{{ flow.battery_power?.toFixed(0) || '0' }} W
                </text>

                <!-- ========== ISOMETRIC GRID TOWER (Bottom-Right) ========== -->
                <g class="iso-grid iso-element-clickable" @click="() => {}" transform="translate(690, 340) scale(1.3)">
                    <ellipse cx="45" cy="120" rx="40" ry="12" fill="#000" opacity="0.5"/>
                    <polygon points="45,115 85,97 85,75 45,57 5,75 5,97" fill="rgba(30, 20, 50, 0.8)" stroke="#8b5cf6" stroke-width="1.5"/>
                    <polygon points="45,57 85,75 85,97 45,115 5,97 5,75" fill="none" stroke="#ff2e97" stroke-width="0.5" opacity="0.5"/>
                    <line x1="25" y1="75" x2="35" y2="0" stroke="#8b5cf6" stroke-width="3"/>
                    <line x1="25" y1="75" x2="35" y2="0" stroke="#c4b5fd" stroke-width="1" opacity="0.5"/>
                    <line x1="65" y1="75" x2="55" y2="0" stroke="#8b5cf6" stroke-width="3"/>
                    <line x1="65" y1="75" x2="55" y2="0" stroke="#c4b5fd" stroke-width="1" opacity="0.5"/>
                    <line x1="28" y1="60" x2="62" y2="60" stroke="#8b5cf6" stroke-width="2"/>
                    <line x1="31" y1="45" x2="59" y2="45" stroke="#8b5cf6" stroke-width="2"/>
                    <line x1="34" y1="30" x2="56" y2="30" stroke="#8b5cf6" stroke-width="1.5"/>
                    <line x1="37" y1="15" x2="53" y2="15" stroke="#8b5cf6" stroke-width="1.5"/>
                    <line x1="28" y1="60" x2="59" y2="45" stroke="#8b5cf6" stroke-width="1" opacity="0.7"/>
                    <line x1="62" y1="60" x2="31" y2="45" stroke="#8b5cf6" stroke-width="1" opacity="0.7"/>
                    <line x1="31" y1="45" x2="56" y2="30" stroke="#8b5cf6" stroke-width="1" opacity="0.7"/>
                    <line x1="59" y1="45" x2="34" y2="30" stroke="#8b5cf6" stroke-width="1" opacity="0.7"/>
                    <rect x="20" y="-2" width="50" height="6" fill="#3a2a5a" stroke="#8b5cf6" stroke-width="1.5" rx="1"/>
                    <g transform="translate(25, -5)">
                        <ellipse cx="0" cy="0" rx="6" ry="8" fill="#1a1a3a" stroke="#00ffff" stroke-width="1.5"/>
                        <ellipse cx="0" cy="0" rx="8" ry="3" fill="none" :stroke="flow.grid_to_house > 0 ? '#ff2e97' : (flow.house_to_grid > 0 ? '#00ffff' : '#8b5cf6')" stroke-width="1" stroke-dasharray="3,3" opacity="0.8">
                            <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="3s" repeatCount="indefinite"/>
                        </ellipse>
                    </g>
                    <g transform="translate(45, -5)">
                        <ellipse cx="0" cy="0" rx="6" ry="8" fill="#1a1a3a" stroke="#00ffff" stroke-width="1.5"/>
                        <ellipse cx="0" cy="0" rx="8" ry="3" fill="none" :stroke="flow.grid_to_house > 0 ? '#ff2e97' : (flow.house_to_grid > 0 ? '#00ffff' : '#8b5cf6')" stroke-width="1" stroke-dasharray="3,3" opacity="0.8">
                            <animateTransform attributeName="transform" type="rotate" from="360" to="0" dur="4s" repeatCount="indefinite"/>
                        </ellipse>
                    </g>
                    <g transform="translate(65, -5)">
                        <ellipse cx="0" cy="0" rx="6" ry="8" fill="#1a1a3a" stroke="#00ffff" stroke-width="1.5"/>
                        <ellipse cx="0" cy="0" rx="8" ry="3" fill="none" :stroke="flow.grid_to_house > 0 ? '#ff2e97' : (flow.house_to_grid > 0 ? '#00ffff' : '#8b5cf6')" stroke-width="1" stroke-dasharray="3,3" opacity="0.8">
                            <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="3.5s" repeatCount="indefinite"/>
                        </ellipse>
                    </g>
                    <path d="M25,-10 Q10,-20 -5,-15" fill="none" stroke="#8b5cf6" stroke-width="2" opacity="0.8"/>
                    <path d="M65,-10 Q80,-20 95,-15" fill="none" stroke="#8b5cf6" stroke-width="2" opacity="0.8"/>
                    <circle cx="10" cy="-18" r="2" :fill="flow.grid_to_house > 0 ? '#ff2e97' : (flow.house_to_grid > 0 ? '#00ffff' : '#8b5cf6')">
                        <animate attributeName="opacity" values="0;1;0" dur="0.8s" repeatCount="indefinite"/>
                    </circle>
                    <circle cx="80" cy="-18" r="2" :fill="flow.grid_to_house > 0 ? '#ff2e97' : (flow.house_to_grid > 0 ? '#00ffff' : '#8b5cf6')">
                        <animate attributeName="opacity" values="0;1;0" dur="0.8s" repeatCount="indefinite" begin="0.4s"/>
                    </circle>
                    <rect x="30" y="62" width="30" height="22" fill="url(#gridBoxGrad)" stroke="#8b5cf6" stroke-width="1.5" rx="2"/>
                    <rect x="33" y="65" width="24" height="10" fill="#0a0a1a" stroke="#8b5cf6" stroke-width="0.5"/>
                    <text x="45" y="73" :fill="(flow.grid_to_house > 0 || flow.grid_to_battery > 0) ? '#ff2e97' : (flow.house_to_grid > 0 ? '#00ffff' : '#8b5cf6')" font-size="7" font-weight="bold" text-anchor="middle">
                        {{ (flow.grid_to_house > 0 || flow.grid_to_battery > 0) ? 'IMPORT' : (flow.house_to_grid > 0 ? 'EXPORT' : 'IDLE') }}
                    </text>
                    <circle cx="35" cy="80" r="2.5" :fill="(flow.grid_to_house > 0 || flow.grid_to_battery > 0) ? '#ff2e97' : '#3a2a5a'" filter="url(#glowPurple)">
                        <animate attributeName="opacity" values="0.5;1;0.5" dur="0.8s" repeatCount="indefinite"/>
                    </circle>
                    <circle cx="45" cy="80" r="2.5" fill="#22c55e" opacity="0.8">
                        <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite"/>
                    </circle>
                    <circle cx="55" cy="80" r="2.5" :fill="flow.house_to_grid > 0 ? '#00ffff' : '#3a2a5a'" filter="url(#glowCyan)">
                        <animate attributeName="opacity" values="0.5;1;0.5" dur="0.8s" repeatCount="indefinite" begin="0.4s"/>
                    </circle>
                    <g transform="translate(45, -18)">
                        <path d="M0,-8 L4,0 L0,0 L4,8 L-4,0 L0,0 Z" :fill="flow.grid_to_house > 0 ? '#ff2e97' : (flow.house_to_grid > 0 ? '#00ffff' : '#fbbf24')" filter="url(#glowYellow)">
                            <animate attributeName="opacity" values="0.7;1;0.7" dur="0.5s" repeatCount="indefinite"/>
                        </path>
                    </g>
                    <g v-if="flow.grid_to_house > 0 || flow.grid_to_battery > 0 || flow.house_to_grid > 0">
                        <circle cx="25" cy="-10" r="1.5" fill="#00ffff">
                            <animate attributeName="opacity" values="0;1;0" dur="0.3s" repeatCount="indefinite"/>
                            <animate attributeName="r" values="1;2.5;1" dur="0.3s" repeatCount="indefinite"/>
                        </circle>
                        <circle cx="45" cy="-10" r="1.5" fill="#00ffff">
                            <animate attributeName="opacity" values="0;1;0" dur="0.25s" repeatCount="indefinite" begin="0.1s"/>
                            <animate attributeName="r" values="1;2.5;1" dur="0.25s" repeatCount="indefinite" begin="0.1s"/>
                        </circle>
                        <circle cx="65" cy="-10" r="1.5" fill="#00ffff">
                            <animate attributeName="opacity" values="0;1;0" dur="0.35s" repeatCount="indefinite" begin="0.2s"/>
                            <animate attributeName="r" values="1;2.5;1" dur="0.35s" repeatCount="indefinite" begin="0.2s"/>
                        </circle>
                    </g>
                    <circle cx="5" cy="75" r="3" fill="#ff2e97" filter="url(#glowPurple)">
                        <animate attributeName="r" values="2;3.5;2" dur="1.8s" repeatCount="indefinite"/>
                    </circle>
                    <circle cx="85" cy="75" r="3" fill="#00ffff" filter="url(#glowCyan)">
                        <animate attributeName="r" values="2;3.5;2" dur="1.8s" repeatCount="indefinite" begin="0.6s"/>
                    </circle>
                    <circle cx="45" cy="57" r="3" fill="#8b5cf6" filter="url(#glowPurple)">
                        <animate attributeName="r" values="2;4;2" dur="1.5s" repeatCount="indefinite"/>
                    </circle>
                </g>

                <text x="830" y="450" fill="#8b5cf6" font-size="18" font-weight="bold" text-anchor="start" filter="url(#glowPurple)">
                    {{ getGridPower() }} W
                </text>
                <text x="830" y="468" fill="#94a3b8" font-size="12" text-anchor="start">{{ getGridLabel() }}</text>

                <!-- ========== ANIMATED FLOW LINES ========== -->
                <g v-if="flow.solar_to_house > 0">
                    <path d="M180,220 Q300,150 400,150" fill="none" stroke="#ffdd00" stroke-width="3" class="flow-line-animated flow-glow-yellow" stroke-linecap="round"/>
                </g>
                <g v-if="flow.solar_to_battery > 0">
                    <path d="M150,280 Q140,360 180,420" fill="none" stroke="#ffdd00" stroke-width="3" class="flow-line-animated flow-glow-yellow" stroke-linecap="round"/>
                </g>
                <g v-if="flow.battery_to_house > 0">
                    <path d="M280,420 Q350,300 430,220" fill="none" stroke="#22c55e" stroke-width="3.5" class="flow-line-animated flow-glow-green" stroke-linecap="round"/>
                </g>
                <g v-if="flow.grid_to_house > 0">
                    <path d="M710,390 Q600,300 500,220" fill="none" stroke="#ff2e97" stroke-width="3.5" stroke-dasharray="10,5" class="flow-line-animated-reverse flow-glow-purple" stroke-linecap="round"/>
                </g>
                <g v-if="flow.house_to_grid > 0">
                    <path d="M500,220 Q600,300 710,390" fill="none" stroke="#00ffff" stroke-width="3.5" class="flow-line-animated flow-glow-cyan" stroke-linecap="round"/>
                </g>
                <g v-if="flow.grid_to_battery > 0">
                    <path d="M735,455 Q460,500 190,440" fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-dasharray="8,4" class="flow-line-animated-reverse flow-glow-purple"/>
                </g>

                <!-- ========== FLOW LABELS ========== -->
                <g class="flow-labels">
                    <text v-if="flow.solar_to_house > 0" x="280" y="140" fill="#ffdd00" font-size="13" font-weight="bold" text-anchor="middle" filter="url(#glowYellow)">
                        {{ flow.solar_to_house.toFixed(0) }} W
                    </text>
                    <text v-if="flow.solar_to_battery > 0" x="120" y="350" fill="#ffdd00" font-size="12" font-weight="bold" text-anchor="middle" filter="url(#glowYellow)">
                        {{ flow.solar_to_battery.toFixed(0) }} W
                    </text>
                    <text v-if="flow.battery_to_house > 0" x="280" y="320" fill="#22c55e" font-size="13" font-weight="bold" text-anchor="middle" filter="url(#glowGreen)">
                        {{ flow.battery_to_house.toFixed(0) }} W
                    </text>
                    <text v-if="flow.grid_to_house > 0" x="580" y="320" fill="#ff2e97" font-size="13" font-weight="bold" text-anchor="middle" filter="url(#glowPurple)">
                        {{ flow.grid_to_house.toFixed(0) }} W
                    </text>
                    <text v-if="flow.house_to_grid > 0" x="580" y="300" fill="#00ffff" font-size="13" font-weight="bold" text-anchor="middle" filter="url(#glowCyan)">
                        {{ flow.house_to_grid.toFixed(0) }} W
                    </text>
                    <text v-if="flow.grid_to_battery > 0" x="500" y="485" fill="#8b5cf6" font-size="11" font-weight="bold" text-anchor="middle">
                        {{ flow.grid_to_battery.toFixed(0) }} W
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
                <div class="info-item">
                    <span class="info-label">⚡ {{ $t('home.panel.peakToday') }}</span>
                    <span class="info-value info-small" style="color: var(--solar)">
                        {{ infoData.peakTodayW ? (infoData.peakTodayW + ' W') : '--' }}
                        <span v-if="infoData.peakTodayTime" style="color:var(--text-muted); font-size:0.7rem"> {{ infoData.peakTodayTime }}</span>
                    </span>
                </div>
                <div class="info-item">
                    <span class="info-label">🏆 {{ $t('home.panel.alltime') }}</span>
                    <span class="info-value info-small" style="color: #fde68a">
                        {{ infoData.peakAlltimeW ? (infoData.peakAlltimeW + ' W') : '--' }}
                        <span v-if="infoData.peakAlltimeDate" style="color:var(--text-muted); font-size:0.7rem"> {{ infoData.peakAlltimeDate }}</span>
                    </span>
                </div>
            </div>

            </div><!-- /flow-layout -->
        </div>

        <section v-if="hubbleView" class="hubble-card" :aria-label="$t('home.hubble.title')">
            <div class="hubble-header">
                <div class="hubble-heading">
                    <span class="hubble-kicker">{{ $t('home.hubble.agent') }} · {{ hubbleView.moment }}</span>
                    <span class="chart-title">{{ hubbleView.title }}</span>
                </div>
                <button type="button" class="hubble-toggle" @click="hubbleExpanded = !hubbleExpanded">
                    {{ hubbleExpanded ? $t('common.collapse') : $t('common.details') }}
                </button>
            </div>
            <div class="hubble-chip-row">
                <span v-for="chip in hubbleView.chips" :key="chip.key" class="hubble-chip">
                    <span class="hubble-chip-label">{{ chip.label }}</span>
                    <span class="hubble-chip-value">{{ chip.value }}</span>
                </span>
            </div>
            <p class="hubble-lead">{{ hubbleView.lead }}</p>
            <p class="hubble-tip">{{ hubbleView.tip }}</p>
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
            </div>
            <div v-if="hubbleView.answer" class="hubble-answer">
                <span class="hubble-answer-label">{{ hubbleView.answer.label }}</span>
                <p>{{ hubbleView.answer.text }}</p>
            </div>
            <div v-if="hubbleExpanded" class="hubble-details">
                <template v-for="block in hubbleView.story" :key="block.key">
                    <p v-if="block.type === 'heading'" class="hubble-story-heading">{{ block.text }}</p>
                    <p v-else>{{ block.text }}</p>
                </template>
                <p class="hubble-updated">{{ hubbleView.updated }}</p>
            </div>
        </section>

        <!-- ========== SECTION 2: PROGNOSE-CHART ========== -->
        <div class="chart-card" style="margin-top: var(--space-lg)">
            <div class="chart-header forecast-card-title-row">
                <span class="chart-title">{{ $t('home.dayForecastVsActual') }}</span>
            </div>
            <div class="forecast-summary-grid">
                <div v-if="todayForecastAccuracyPercent != null || todayForecastErrorLabel || todayLearningBasisLabel" class="forecast-eval-list">
                    <span v-if="todayForecastAccuracyPercent != null">
                        {{ $t('home.todayQuality') }}: <span :style="{ color: forecastBandColorFromAccuracy(todayForecastAccuracyPercent) }">{{ todayForecastAccuracyPercent.toFixed(1) }}%</span>
                    </span>
                    <span v-if="todayForecastErrorLabel">
                        {{ $t('home.todayError') }}: <span :style="{ color: forecastBandColor(todayForecastErrorPercent) }">{{ todayForecastErrorLabel }}</span>
                    </span>
                    <span v-if="todayLearningBasisLabel">
                        {{ $t('home.todayLearningBasis') }}: <span style="color:#fbbf24">{{ todayLearningBasisLabel }}</span>
                    </span>
                    <span v-if="todayDiscardedLearningLabel">
                        {{ $t('home.todayDiscarded') }}: <span style="color:#f87171">{{ todayDiscardedLearningLabel }}</span>
                    </span>
                </div>
                <div class="forecast-kpi-list">
                    <div class="forecast-kpi-row">
                        <span class="forecast-kpi-label">{{ $t('common.yield') }}:</span>
                        <span class="forecast-kpi-value" style="color:#22c55e">{{ actualTotal }} kWh</span>
                    </div>
                    <div class="forecast-kpi-row">
                        <span class="forecast-kpi-label">{{ $t('common.forecast') }}:</span>
                        <span class="forecast-kpi-value" style="color:#fbbf24">{{ forecastTotal }} kWh</span>
                    </div>
                    <div v-if="hasHybridForecast" class="forecast-kpi-row">
                        <span class="forecast-kpi-label">{{ $t('home.hybrid') }}:</span>
                        <span class="forecast-kpi-value" style="color:#38bdf8">{{ hybridForecastTotal }} kWh</span>
                    </div>
                    <div class="forecast-kpi-row">
                        <span class="forecast-kpi-label">{{ $t('home.deviation') }}:</span>
                        <span class="forecast-kpi-value" :style="{ color: forecastBandColor(todayForecastErrorPercent) }">{{ forecastDeviationKwhLabel }}</span>
                    </div>
                </div>
            </div>
            <div v-if="hasWeatherTrace" class="weather-trace" :aria-label="$t('home.weatherTraceAria')">
                <div class="weather-trace-labels">
                    <span>{{ $t('home.expected') }}</span>
                    <span>{{ $t('home.seen') }}</span>
                    <span :title="$t('home.matchTitle')">{{ $t('home.match') }}</span>
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
                        <div class="weather-trace-cell weather-trace-match" :class="'match-' + item.matchState" :title="item.matchTitle">{{ item.matchIcon }}</div>
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
            <div class="panel-groups-grid">
                <div class="chart-card panel-group-chart-card" v-for="(group, groupName) in panelGroupsData.groups" :key="groupName">
                    <div class="chart-header" style="flex-wrap:wrap; gap:4px;">
                        <span class="chart-title" style="font-size:0.95rem">☀ {{ groupName }}</span>
                        <div class="pg-stats">
                            <span style="color: #22c55e; font-family:var(--font-mono); font-size:0.8rem">
                                {{ $t('common.actual') }}: {{ (group.actual_total_kwh || 0).toFixed(3) }} kWh
                            </span>
                            <span style="color: #a855f7; font-family:var(--font-mono); font-size:0.8rem">
                                {{ $t('common.forecast') }}: {{ ((group.prediction_day_kwh ?? group.prediction_total_kwh) || 0).toFixed(3) }} kWh
                            </span>
                            <span :style="{color: group.accuracy_percent != null ? forecastBandColorFromAccuracy(group.accuracy_percent) : '#8b949e', fontFamily:'var(--font-mono)', fontSize:'0.8rem', fontWeight:700}">
                                {{ group.accuracy_percent ? group.accuracy_percent.toFixed(0) + '%' : '—' }}
                            </span>
                        </div>
                    </div>
                    <div :ref="el => { if (el) pgChartRefs[groupName] = el }" style="height: 220px; width: 100%;"></div>
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
                </div>
            </div>
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
        const sparklineRefs = reactive({});
        let forecastChartInstance = null;
        let powerChartInstance = null;
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

        const panels = ref([]);
        const panelHistory = reactive({});

        // Panel Groups (IST vs Prognose pro Gruppe)
        const panelGroupsData = reactive({ available: false, groups: {} });
        const pgChartRefs = reactive({});
        const pgChartInstances = {};
        const forecastData = reactive({ hours: [], forecast: [], forecastRaw: [], hybrid: [], actual: [], actualRaw: [], confidence: [], ml_pct: [], method: [], temperature: [], radiation: [], clouds: [], tfs: [], tfs_weight: [], ai: [], physics: [], lstm: [], ridge: [] });
        const weatherTrace = ref([]);
        const powerData = ref([]);
        const dailyForecasts = ref([]);
        const hubble = ref(null);
        const hubbleExpanded = ref(false);
        const hubbleQuestion = ref(null);
        const currentTime = ref('');
        const lastPowerUpdate = ref('');
        const cleanEvalStats = reactive({
            today: {
                accuracy: null,
                coverage: null,
                excludedMppt: null,
                excludedHours: null,
                evaluationHours: null,
                productionCandidates: null,
                missingActualHours: null,
                excludedWeatherAlertHours: null,
                excludedInverterClippedHours: null,
                learningHours: null,
                learningCandidates: null,
                discardedLearningHours: null,
                discardedLearningReasonBreakdown: null,
                evaluationActual: null,
                evaluationPredicted: null,
                yieldDelta: null,
                forecastError: null,
                forecastAccuracy: null,
            },
            last7: { accuracy: null, coverage: null, excludedMppt: null },
            last30: { accuracy: null, coverage: null, excludedMppt: null },
        });

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
        });
        const FORECAST_LEGEND_STORAGE_KEY = 'sfml_stats_home_forecast_legend_selected';
        const forecastLegendSelected = reactive({
            Prognose: true,
            Hybrid: false,
            IST: true,
            TFS: false,
            Unsicherheit: true,
        });

        // Computed
        const isNightTime = computed(() => {
            const h = new Date().getHours();
            return h < 6 || h > 20;
        });

        const forecastTotal = computed(() => {
            const source = forecastData.forecastRaw.length ? forecastData.forecastRaw : forecastData.forecast;
            const sum = source.reduce((s, v) => s + (v || 0), 0);
            return sum.toFixed(1);
        });

        const actualTotal = computed(() => {
            const source = forecastData.actualRaw.length ? forecastData.actualRaw : forecastData.actual;
            const sum = source.reduce((s, v) => s + (v || 0), 0);
            return sum.toFixed(1);
        });

        const hybridForecastTotal = computed(() => {
            const sum = forecastData.hybrid.reduce((s, v) => s + (v || 0), 0);
            return sum.toFixed(1);
        });

        const hasHybridForecast = computed(() => {
            return forecastData.hybrid.some(v => v != null);
        });

        const hasWeatherTrace = computed(() => weatherTrace.value.length > 0);

        const deviationPercent = computed(() => {
            const act = cleanEvalStats.today.evaluationActual ?? parseFloat(actualTotal.value);
            const pred = cleanEvalStats.today.evaluationPredicted ?? parseFloat(forecastTotal.value);
            if (pred === 0) return 0;
            return ((act - pred) / pred) * 100;
        });

        const isTodayPartial = computed(() => {
            const evaluated = cleanEvalStats.today.evaluationHours;
            const candidates = cleanEvalStats.today.productionCandidates;
            return evaluated != null && candidates != null && candidates > 0 && evaluated < candidates;
        });

        const deviationLabel = computed(() => {
            const prefix = isTodayPartial.value ? (t('common.live') + ' ') : '';
            return `${prefix}${deviationPercent.value >= 0 ? '+' : ''}${deviationPercent.value.toFixed(0)}%`;
        });

        const todayForecastErrorPercent = computed(() => {
            if (cleanEvalStats.today.forecastError != null) {
                return cleanEvalStats.today.forecastError;
            }
            const act = cleanEvalStats.today.evaluationActual ?? parseFloat(actualTotal.value);
            const pred = cleanEvalStats.today.evaluationPredicted ?? parseFloat(forecastTotal.value);
            if (!act || act <= 0) return null;
            return ((pred - act) / act) * 100;
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
            const actualRows = forecastData.actualRaw || [];
            const hybridRows = forecastData.hybrid || [];
            const evaluated = actualRows
                .map((actual, idx) => ({ actual, hybrid: hybridRows[idx] }))
                .filter(row => row.actual != null && (row.actual > 0.01 || (row.hybrid || 0) > 0.01));
            const act = evaluated.length
                ? evaluated.reduce((sum, row) => sum + (row.actual || 0), 0)
                : parseFloat(actualTotal.value);
            const pred = evaluated.length
                ? evaluated.reduce((sum, row) => sum + (row.hybrid || 0), 0)
                : parseFloat(hybridForecastTotal.value);
            if (pred === 0) return 0;
            return ((act - pred) / pred) * 100;
        });

        const hybridDeviationLabel = computed(() => {
            const prefix = isTodayPartial.value ? (t('common.live') + ' ') : '';
            return `${prefix}${hybridDeviationPercent.value >= 0 ? '+' : ''}${hybridDeviationPercent.value.toFixed(0)}%`;
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
            const parts = [];
            if (missingActual > 0) parts.push(t('home.coverage.missingActual', { hours: missingActual }));
            if (excludedMppt > 0) parts.push(t('home.coverage.excludedMppt', { hours: excludedMppt }));
            if (excludedClipped > 0) parts.push(t('home.coverage.excludedClipped', { hours: excludedClipped }));

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

            const leadKey = {
                morning: 'home.hubble.lead.morning',
                midday: metrics.forecast_quality_percent != null
                    ? 'home.hubble.lead.middayQuality'
                    : 'home.hubble.lead.midday',
                evening: 'home.hubble.lead.evening',
            }[moment] || 'home.hubble.lead.midday';

            const chips = [
                { key: 'yield', label: t('home.hubble.chip.yield'), value: metrics.solar_yield_kwh != null ? `${solarYield} kWh` : `${forecast} kWh` },
                { key: 'autarky', label: t('energy.autarky'), value: metrics.autarky_percent != null ? `${autarky}%` : t('common.noData') },
                { key: 'quality', label: t('home.hubble.chip.quality'), value: metrics.forecast_quality_percent != null ? `${quality}%` : t('common.noData') },
                { key: 'window', label: t('home.hubble.chip.window'), value: windowLabel },
            ];

            const storyParams = {
                forecast,
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
                avgConsumption,
                consumptionShare,
                peakPower,
                peakTime,
                price: currentPrice,
                priceAverage: avgPrice,
            };
            const story = buildHubbleStory(moment, storyParams);
            const quickActions = ['now', 'load', 'confidence', 'battery'].map(key => ({
                key,
                label: t(`home.hubble.quick.${key}`),
            }));
            const answer = buildHubbleAnswer(hubbleQuestion.value, payload, storyParams);

            return {
                title: t('home.hubble.title'),
                moment: t(`home.hubble.moment.${moment}`),
                chips,
                lead: t(leadKey, {
                    forecast,
                    solar: solarYield,
                    autarky,
                    quality,
                    error,
                    window: windowLabel,
                    grid: gridImport,
                }),
                tip: buildHubbleTip(payload, windowLabel),
                quickActions,
                answer,
                story,
                updated: t('home.hubble.updated', {
                    time: formatHubbleTime(payload.generated_at),
                }),
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
            const dateValue = new Date(value);
            if (Number.isNaN(dateValue.getTime())) return currentTime.value || '--';
            return dateValue.toLocaleTimeString(bcp(locale.value), { hour: '2-digit', minute: '2-digit' });
        }

        function formatHubbleWindow(bestWindow) {
            if (!bestWindow) return t('home.hubble.noWindow');
            const start = String(bestWindow.start_hour).padStart(2, '0') + ':00';
            const end = String(bestWindow.end_hour).padStart(2, '0') + ':00';
            return bestWindow.start_hour === bestWindow.end_hour ? start : `${start}-${end}`;
        }

        function buildHubbleTip(payload, windowLabel) {
            const metrics = payload.metrics || {};
            const type = payload.tip_type || 'flex_load_window';
            const params = {
                window: windowLabel,
                battery: formatHubbleNumber(metrics.solar_to_battery_kwh, 2),
                average: formatHubbleNumber(metrics.avg_battery_charge_7d_kwh, 1),
                price: formatHubbleNumber(metrics.price_current_ct, 2),
                priceAverage: formatHubbleNumber(metrics.price_avg_ct, 2),
            };
            if (type === 'battery_served') return t('home.hubble.tip.batteryServed', params);
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
            const hasBattery = metrics.solar_to_battery_kwh != null && metrics.avg_battery_charge_7d_kwh != null;
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
                answerKey = hasBattery ? 'home.hubble.answer.batteryKnown' : 'home.hubble.answer.batteryPending';
            }

            if (!answerKey) return null;
            return {
                label: t(`home.hubble.quick.${question}`),
                text: t(answerKey, params),
            };
        }

        function buildHubbleStory(moment, params) {
            const storyMoment = ['morning', 'midday', 'evening'].includes(moment) ? moment : 'midday';
            const keys = [
                ['intro', 'paragraph'],
                ['status', 'paragraph'],
                ['forecast', 'paragraph'],
                ['outlook', 'paragraph'],
                ['proTipTitle', 'heading'],
                ['proTip', 'paragraph'],
                ['simpleTitle', 'heading'],
                ['simple', 'paragraph'],
                ['closing', 'paragraph'],
            ];
            return keys.map(([name, type]) => ({
                key: name,
                type,
                text: t(`home.hubble.story.${storyMoment}.${name}`, params),
            }));
        }

        function parseTimeToMinutes(value) {
            if (!value || typeof value !== 'string' || !value.includes(':')) return null;
            const [hh, mm] = value.split(':').map(v => Number(v));
            if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
            return (hh * 60) + mm;
        }

        function getTimestampMinutes(entry) {
            const ts = entry?.timestamp || entry?.time;
            if (!ts) return null;
            const dt = new Date(ts);
            if (Number.isNaN(dt.getTime())) return null;
            return (dt.getHours() * 60) + dt.getMinutes();
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
            const d = new Date();
            currentTime.value = d.toLocaleTimeString(bcp(locale.value), { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }

        // ========== DATA LOADING ==========

        async function loadEnergyFlow() {
            try {
                const data = await SFMLApi.fetch('/api/sfml_stats/energy_flow');
                if (!data) return;

                const f = data.flows || data;
                const b = data.battery || {};
                const h = data.home || {};

                flow.solar_power = f.solar_power || 0;
                flow.home_consumption = h.consumption || f.home_consumption || 0;
                flow.battery_soc = b.soc ?? f.battery_soc ?? null;
                flow.battery_power = b.power ?? f.battery_power ?? 0;
                flow.solar_to_house = f.solar_to_house || 0;
                flow.solar_to_battery = f.solar_to_battery || 0;
                flow.battery_to_house = f.battery_to_house || 0;
                flow.grid_to_house = f.grid_to_house || 0;
                flow.house_to_grid = f.house_to_grid || 0;
                flow.grid_to_battery = f.grid_to_battery || 0;

                // Panel data
                if (data.panels && Array.isArray(data.panels)) {
                    panels.value = data.panels;
                    // Build sparkline history
                    data.panels.forEach(p => {
                        if (!panelHistory[p.id]) panelHistory[p.id] = [];
                        panelHistory[p.id].push(p.power || 0);
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

        async function loadInfoPanel() {
            try {
                const data = await SFMLApi.fetch('/api/sfml_stats/summary');
                if (!data) return;

                // Produktionszeit
                if (data.sun_times) {
                    infoData.sunrise = data.sun_times.sunrise || null;
                    infoData.sunset = data.sun_times.sunset || null;
                    const dh = data.production_time?.duration_seconds;
                    infoData.productionHours = dh ? (dh / 3600).toFixed(1) : null;
                    updatePowerChart();
                }

                const today = data.today;
                cleanEvalStats.today.accuracy = today?.accuracy ?? null;
                cleanEvalStats.today.coverage = today?.evaluation_coverage_percent ?? null;
                cleanEvalStats.today.excludedMppt = today?.excluded_mppt_hours_count ?? null;
                cleanEvalStats.today.excludedHours = today?.excluded_hours_count ?? null;
                cleanEvalStats.today.evaluationHours = today?.evaluation_hours_count ?? null;
                cleanEvalStats.today.productionCandidates = today?.production_candidate_hours_count ?? null;
                cleanEvalStats.today.missingActualHours = today?.missing_actual_hours_count ?? null;
                cleanEvalStats.today.excludedWeatherAlertHours = today?.excluded_weather_alert_hours_count ?? null;
                cleanEvalStats.today.excludedInverterClippedHours = today?.excluded_inverter_clipped_hours_count ?? null;
                cleanEvalStats.today.learningHours = today?.learning_hours_count ?? null;
                cleanEvalStats.today.learningCandidates = today?.learning_candidate_hours_count ?? null;
                cleanEvalStats.today.discardedLearningHours = today?.discarded_learning_hours_count ?? null;
                cleanEvalStats.today.discardedLearningReasonBreakdown = today?.discarded_learning_reason_breakdown ?? null;
                cleanEvalStats.today.evaluationActual = today?.evaluation_actual_kwh ?? null;
                cleanEvalStats.today.evaluationPredicted = today?.evaluation_predicted_kwh ?? null;
                cleanEvalStats.today.yieldDelta = today?.yield_delta_vs_forecast_percent ?? null;
                cleanEvalStats.today.forecastError = today?.forecast_error_vs_actual_percent ?? null;
                cleanEvalStats.today.forecastAccuracy = today?.forecast_accuracy_vs_actual_percent ?? null;

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

                // Peak heute
                const ds = data.daily_stats;
                if (ds) {
                    infoData.peakTodayW = ds.peak_solar_w || null;
                    infoData.peakTodayTime = ds.peak_solar_time || null;
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
                        const d = new Date(val.date + 'T12:00:00');
                        const label = type === 'tomorrow'
                            ? t('common.tomorrow')
                            : d.toLocaleDateString(bcp(locale.value), { weekday: 'short', day: '2-digit', month: '2-digit' });
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
                const res = await SFMLApi.fetch('/api/sfml_stats/statistics');
                const stats = res?.statistics || {};
                const last7 = stats.last_7_days || {};
                const last30 = stats.last_30_days || {};
                cleanEvalStats.last7.accuracy = last7.avg_accuracy ?? null;
                cleanEvalStats.last7.coverage = last7.avg_evaluation_coverage_percent ?? null;
                cleanEvalStats.last7.excludedMppt = last7.avg_excluded_mppt_hours ?? null;
                cleanEvalStats.last30.accuracy = last30.avg_accuracy ?? null;
                cleanEvalStats.last30.coverage = last30.avg_evaluation_coverage_percent ?? null;
                cleanEvalStats.last30.excludedMppt = last30.avg_excluded_mppt_hours ?? null;
                const pg = res?.data?.panel_groups || res?.panel_groups;
                if (!pg || !pg.available) return;

                panelGroupsData.available = true;
                panelGroupsData.groups = pg.groups || {};

                // Render charts after Vue updates DOM
                await nextTick();
                const nowHour = new Date().getHours();

                for (const [groupName, groupData] of Object.entries(panelGroupsData.groups)) {
                    const chartEl = pgChartRefs[groupName];
                    if (!chartEl) continue;

                    if (!pgChartInstances[groupName]) {
                        pgChartInstances[groupName] = echarts.init(chartEl);
                    }
                    const chart = pgChartInstances[groupName];
                    const hourly = groupData.hourly || [];
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
                        grid: { top: 25, right: 15, bottom: 30, left: 50 },
                        tooltip: {
                            trigger: 'axis',
                            backgroundColor: 'rgba(10,14,20,0.95)',
                            borderColor: 'rgba(255,255,255,0.1)',
                            textStyle: { color: '#f0f6fc', fontSize: 11 },
                        },
                        legend: { data: [t('common.actual'), t('common.forecast')], textStyle: { color: '#8b949e', fontSize: 10 }, top: 0, right: 5 },
                        xAxis: {
                            type: 'category',
                            data: hours.map(h => String(h).padStart(2, '0') + ':00'),
                            axisLabel: { color: '#8b949e', fontSize: 10, interval: 3 },
                            axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
                        },
                        yAxis: {
                            type: 'value', name: 'kWh',
                            nameTextStyle: { color: '#8b949e', fontSize: 9 },
                            axisLabel: { color: '#8b949e', fontSize: 10, formatter: v => v.toFixed(2) },
                            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
                        },
                        series: [
                            {
                                name: t('common.actual'), type: 'line', data: actualData,
                                smooth: true, connectNulls: false,
                                lineStyle: { color: '#22c55e', width: 2.5 },
                                itemStyle: { color: '#22c55e' },
                                symbol: 'circle', symbolSize: 4,
                                areaStyle: {
                                    color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                                        colorStops: [
                                            { offset: 0, color: 'rgba(34,197,94,0.35)' },
                                            { offset: 1, color: 'rgba(34,197,94,0.02)' }
                                        ]
                                    }
                                },
                            },
                            {
                                name: t('common.forecast'), type: 'line', data: forecastD,
                                smooth: true, connectNulls: false,
                                lineStyle: { color: '#a855f7', width: 2, type: 'dashed' },
                                itemStyle: { color: '#a855f7' },
                                symbol: 'none',
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
                const res = await SFMLApi.fetch('/api/sfml_stats/solar?days=1', { forceRefresh: true });
                if (!res || !res.data) return;

                const hourly = res.data.hourly || [];
                if (!hourly.length) return;

                // Filter to today only
                const today = new Date().toISOString().slice(0, 10);
                const todayData = hourly.filter(h => h.target_date === today);
                if (!todayData.length) return;

                forecastData.hours = todayData.map(h => h.target_hour);
                const rawFc = todayData.map(h => h.prediction_kwh || 0);
                const rawAc = todayData.map(h => h.actual_kwh || 0);
                const trimmed = trimSolarWindow(rawAc, rawFc);
                forecastData.forecastRaw = rawFc;
                forecastData.actualRaw = todayData.map(h => h.actual_kwh ?? null);
                forecastData.forecast = trimmed.forecast;
                forecastData.actual = trimmed.actual;
                const hybridPayload = res.data.hybrid || {};
                const hybridHours = Array.isArray(hybridPayload.hourly) ? hybridPayload.hourly : [];
                const hybridByHour = new Map(
                    hybridHours.map(h => [Number(h.target_hour), h.prediction_kwh ?? null])
                );
                forecastData.hybrid = todayData.map(h => (
                    hybridByHour.has(Number(h.target_hour))
                        ? hybridByHour.get(Number(h.target_hour))
                        : null
                ));
                forecastData.confidence = todayData.map(h => h.confidence || 50);
                forecastData.ml_pct = todayData.map(h => h.ml_contribution_percent || 0);
                forecastData.method = todayData.map(h => h.prediction_method || '');
                forecastData.temperature = todayData.map(h => h.temperature || null);
                forecastData.radiation = todayData.map(h => h.solar_radiation || null);
                forecastData.clouds = todayData.map(h => h.clouds || null);
                forecastData.tfs = todayData.map(h => h.tfs_kwh || null);
                forecastData.tfs_weight = todayData.map(h => h.tfs_weight || null);
                forecastData.ai = todayData.map(h => h.ai_kwh || null);
                forecastData.physics = todayData.map(h => h.physics_kwh || null);
                forecastData.lstm = todayData.map(h => h.lstm_kwh || null);
                forecastData.ridge = todayData.map(h => h.ridge_kwh || null);
                weatherTrace.value = buildWeatherTrace(
                    forecastData.hours,
                    today,
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
                const hoursToday = new Date().getHours() + 1;
                const res = await SFMLApi.fetch('/api/sfml_stats/power_sources_history?hours=' + Math.max(hoursToday, 1));
                if (!res || !res.data) return;

                const todayStr = new Date().toISOString().slice(0, 10);
                powerData.value = res.data.filter(d => {
                    const ts = d.timestamp || d.time || '';
                    return ts.startsWith(todayStr);
                });
                lastPowerUpdate.value = new Date().toLocaleTimeString(bcp(locale.value), { hour: '2-digit', minute: '2-digit' });
                updatePowerChart();
            } catch (err) {
                console.error('[Home] Power history error:', err);
            }
        }

        // ========== FORECAST CHART ==========

        function updateForecastChart() {
            if (!forecastChartInstance || !forecastData.hours.length) return;
            const nowHour = new Date().getHours();

            // Calculate P90 / P10 bands (respect null from trimming)
            const p90 = forecastData.forecast.map((v, i) => {
                if (v == null) return null;
                const conf = forecastData.confidence[i] || 50;
                return v * (1 + (100 - conf) / 150);
            });
            const p10 = forecastData.forecast.map((v, i) => {
                if (v == null) return null;
                const conf = forecastData.confidence[i] || 50;
                return Math.max(0, v * (1 - (100 - conf) / 150));
            });

            forecastChartInstance.setOption({
                backgroundColor: 'transparent',
                grid: { top: 30, right: 20, bottom: 40, left: 55 },
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: 'rgba(10,14,20,0.95)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    textStyle: { color: '#f0f6fc', fontSize: 12, fontFamily: 'var(--font-mono)' },
                    formatter: function(params) {
                        const idx = params[0]?.dataIndex;
                        if (idx == null) return '';
                        const hour = forecastData.hours[idx];
                        const pred = forecastData.forecast[idx] || 0;
                        const hybrid = forecastData.hybrid[idx];
                        const act = forecastData.actual[idx] || 0;
                        const conf = forecastData.confidence[idx] || 0;
                        const mlPct = forecastData.ml_pct[idx] || 0;
                        const method = forecastData.method[idx] || '--';
                        const temp = forecastData.temperature[idx];
                        const rad = forecastData.radiation[idx];
                        const clouds = forecastData.clouds[idx];
                        const delta = pred > 0 ? (((act - pred) / pred) * 100).toFixed(1) : '0.0';
                        const forecastError = act > 0 ? (((pred - act) / act) * 100).toFixed(1) : null;

                        let s = '<div style="min-width:180px">';
                        s += '<div style="font-weight:700;font-size:13px;margin-bottom:6px">' + String(hour).padStart(2,'0') + ':00 ' + t('home.oClock') + '</div>';
                        s += '<div style="border-top:1px solid rgba(255,255,255,0.15);margin:4px 0 6px"></div>';
                        s += '<div style="display:flex;justify-content:space-between"><span style="color:#fbbf24">' + t('common.forecast') + ':</span><span>' + pred.toFixed(2) + ' kWh</span></div>';
                        if (hybrid != null) s += '<div style="display:flex;justify-content:space-between"><span style="color:#38bdf8">' + t('home.hybrid') + ':</span><span>' + hybrid.toFixed(2) + ' kWh</span></div>';
                        s += '<div style="display:flex;justify-content:space-between"><span style="color:#22c55e">' + t('common.actual') + ':</span><span>' + act.toFixed(2) + ' kWh</span></div>';
                        s += '<div style="display:flex;justify-content:space-between"><span style="color:#94a3b8">' + t('common.yield') + ' &Delta;:</span><span style="color:' + forecastBandColor(parseFloat(delta)) + '">' + (parseFloat(delta) >= 0 ? '+' : '') + delta + '%</span></div>';
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
                    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
                    axisLabel: { color: '#8b949e', fontSize: 11 },
                },
                yAxis: {
                    type: 'value',
                    name: 'kWh',
                    nameTextStyle: { color: '#8b949e', fontSize: 10 },
                    axisLine: { show: false },
                    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
                    axisLabel: { color: '#8b949e', fontSize: 11 },
                },
                series: [
                    // P10 lower boundary (invisible, stacked base)
                    {
                        name: 'P10',
                        type: 'line',
                        data: p10,
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
                        data: p90.map((v, i) => (v == null || p10[i] == null) ? null : Math.max(0, v - p10[i])),
                        lineStyle: { opacity: 0 },
                        itemStyle: { opacity: 0 },
                        symbol: 'none',
                        smooth: true, connectNulls: false,
                        stack: 'band',
                        areaStyle: { color: 'rgba(251,191,36,0.1)' },
                        z: 1,
                    },
                    {
                        name: 'Prognose',
                        type: 'line',
                        data: forecastData.forecast,
                        lineStyle: { color: '#fbbf24', width: 2.5 },
                        itemStyle: { color: '#fbbf24' },
                        symbol: 'none',
                        smooth: true, connectNulls: false,
                        z: 5,
                    },
                    ...(hasHybridForecast.value ? [{
                        name: 'Hybrid',
                        type: 'line',
                        data: forecastData.hybrid,
                        lineStyle: { color: '#38bdf8', width: 2.5, type: 'dashed' },
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
                        data: forecastData.actual.map((v, i) => {
                            if (v == null) return null;
                            const h = forecastData.hours[i];
                            if (h > nowHour) return null;
                            return v;
                        }),
                        lineStyle: { color: '#22c55e', width: 2.5 },
                        itemStyle: { color: '#22c55e' },
                        symbol: 'none',
                        smooth: true,
                        connectNulls: false,
                        areaStyle: {
                            color: {
                                type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                                colorStops: [
                                    { offset: 0, color: 'rgba(34,197,94,0.25)' },
                                    { offset: 1, color: 'rgba(34,197,94,0)' }
                                ]
                            }
                        },
                        z: 6,
                    },
                    // TFS prediction line (toggleable via legend)
                    {
                        name: 'TFS',
                        type: 'line',
                        data: forecastData.tfs,
                        lineStyle: { color: '#a78bfa', width: 2, type: 'dashed' },
                        itemStyle: { color: '#a78bfa' },
                        symbol: 'none',
                        smooth: true,
                        connectNulls: false,
                        z: 4,
                    },
                    // Now marker
                    ...(forecastData.hours.includes(nowHour) ? [{
                        type: 'line',
                        markLine: {
                            silent: true,
                            symbol: 'none',
                            lineStyle: { color: 'rgba(255,255,255,0.5)', width: 1.5, type: 'dashed' },
                            label: { show: true, formatter: t('home.now'), color: '#f0f6fc', fontSize: 11, position: 'start' },
                            data: [{ xAxis: String(nowHour).padStart(2, '0') }],
                        },
                        data: [],
                    }] : []),
                ],
                legend: {
                    show: true,
                    top: 0,
                    right: 10,
                    textStyle: { color: '#8b949e', fontSize: 11 },
                    // Series names are stable internal identifiers ("Prognose"/"IST"/…)
                    // so legend selection state survives across locale changes;
                    // formatter renders the localized label.
                    data: ['Prognose', ...(hasHybridForecast.value ? ['Hybrid'] : []), 'IST', 'TFS', 'Unsicherheit'],
                    formatter: (name) => ({
                        Prognose: t('common.forecast'),
                        Hybrid: t('home.hybrid'),
                        IST: t('common.actual'),
                        TFS: 'TFS',
                        Unsicherheit: t('home.uncertainty'),
                    }[name] || name),
                    selected: {
                        Prognose: forecastLegendSelected.Prognose,
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
                const dt = new Date(d.timestamp || d.time);
                return dt.toLocaleTimeString(bcp(locale.value), { hour: '2-digit', minute: '2-digit' });
            });

            const solarPower = data.map(d => d.solar_power || 0);

            powerChartInstance.setOption({
                backgroundColor: 'transparent',
                grid: { top: 20, right: 20, bottom: 30, left: 55 },
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: 'rgba(10,14,20,0.95)',
                    borderColor: 'rgba(251,191,36,0.3)',
                    textStyle: { color: '#f0f6fc', fontSize: 12, fontFamily: 'var(--font-mono)' },
                    formatter: function(params) {
                        const val = params[0]?.value || 0;
                        return '<b>' + params[0].axisValue + '</b><br/>'
                             + '<span style="color:#fbbf24">\u25CF ' + t('home.pvPower') + ':</span> '
                             + (val >= 1000 ? (val/1000).toFixed(1) + ' kW' : Math.round(val) + ' W');
                    }
                },
                xAxis: {
                    type: 'category',
                    data: times,
                    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
                    axisLabel: {
                        color: '#8b949e',
                        fontSize: 10,
                        interval: Math.max(0, Math.floor(times.length / 12) - 1),
                    },
                },
                yAxis: {
                    type: 'value',
                    axisLine: { show: false },
                    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
                    axisLabel: { color: '#8b949e', fontSize: 11, formatter: v => v >= 1000 ? (v/1000).toFixed(1)+' kW' : v + ' W' },
                },
                series: [
                    {
                        name: 'PV-Leistung',
                        type: 'line',
                        data: solarPower,
                        lineStyle: { color: '#fbbf24', width: 2 },
                        itemStyle: { color: '#fbbf24' },
                        symbol: 'none',
                        smooth: true,
                        areaStyle: {
                            color: {
                                type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                                colorStops: [
                                    { offset: 0, color: 'rgba(251,191,36,0.4)' },
                                    { offset: 0.5, color: 'rgba(251,191,36,0.15)' },
                                    { offset: 1, color: 'rgba(251,191,36,0.02)' }
                                ]
                            }
                        },
                    },
                ],
                legend: {
                    show: true,
                    data: ['PV-Leistung'],
                    formatter: (name) => name === 'PV-Leistung' ? t('home.pvPower') : name,
                    top: 0, right: 10, textStyle: { color: '#8b949e', fontSize: 11 },
                },
            });
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

        // Lifecycle
        let clockTimer = null;
        let flowTimer = null;
        let powerTimer = null;
        let forecastTimer = null;

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

            resizeHandler = () => {
                if (forecastChartInstance) forecastChartInstance.resize();
                if (powerChartInstance) powerChartInstance.resize();
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
            setInterval(loadInfoPanel, 60000); // Info panel refresh every 60s
        });

        onUnmounted(() => {
            if (clockTimer) clearInterval(clockTimer);
            if (flowTimer) clearInterval(flowTimer);
            if (powerTimer) clearInterval(powerTimer);
            if (forecastTimer) clearInterval(forecastTimer);
            if (forecastChartInstance) { forecastChartInstance.dispose(); forecastChartInstance = null; }
            if (powerChartInstance) { powerChartInstance.dispose(); powerChartInstance = null; }
            if (resizeHandler) window.removeEventListener('resize', resizeHandler);
        });

        return {
            forecastChartEl, powerChartEl, sparklineRefs,
            flow, panels, panelHistory, infoData, panelGroupsData, pgChartRefs,
            forecastData, powerData, dailyForecasts,
            weatherTrace, hasWeatherTrace,
            currentTime, lastPowerUpdate,
            isNightTime, forecastTotal, hybridForecastTotal, hasHybridForecast,
            actualTotal, deviationPercent, deviationLabel, hybridDeviationPercent,
            hybridDeviationLabel, cleanEvalStats, todayLearningBasisLabel,
            todayDiscardedLearningLabel, todayCoverageExplanation,
            todayForecastErrorPercent, todayForecastAccuracyPercent, todayForecastErrorLabel,
            forecastDeviationKwh, forecastDeviationKwhLabel,
            hubbleView, hubbleExpanded, hubbleQuestion,
            getGridPower, getGridLabel, fmtKw, fmtW,
            forecastBandColor, forecastBandColorFromAccuracy,
            getSparklinePath, getSparklineAreaPath,
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
            border: 1px solid rgba(56, 189, 248, 0.24);
            border-left: 4px solid #38bdf8;
            border-radius: var(--radius-md);
            background: linear-gradient(135deg, rgba(56, 189, 248, 0.10), rgba(251, 191, 36, 0.05));
            backdrop-filter: var(--glass-blur);
            -webkit-backdrop-filter: var(--glass-blur);
        }
        .hubble-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: var(--space-md);
            margin-bottom: var(--space-md);
        }
        .hubble-heading {
            display: flex;
            flex-direction: column;
            gap: 3px;
            min-width: 0;
        }
        .hubble-kicker {
            color: #38bdf8;
            font-size: 0.72rem;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }
        .hubble-toggle {
            flex: 0 0 auto;
            border: 1px solid rgba(255, 255, 255, 0.16);
            border-radius: var(--radius-sm);
            background: rgba(255, 255, 255, 0.06);
            color: var(--text-primary);
            padding: 6px 10px;
            font-size: 0.8rem;
            cursor: pointer;
        }
        .hubble-toggle:hover {
            background: rgba(255, 255, 255, 0.10);
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
            min-height: 30px;
            padding: 5px 9px;
            border: 1px solid rgba(255, 255, 255, 0.10);
            border-radius: var(--radius-sm);
            background: rgba(0, 0, 0, 0.16);
        }
        .hubble-chip-label {
            color: var(--text-muted);
            font-size: 0.72rem;
        }
        .hubble-chip-value {
            color: var(--text-primary);
            font-family: var(--font-mono);
            font-size: 0.82rem;
            font-weight: 700;
        }
        .hubble-lead,
        .hubble-tip,
        .hubble-details p {
            margin: 0;
            color: var(--text-secondary);
            line-height: 1.55;
            font-size: 0.92rem;
        }
        .hubble-lead {
            color: var(--text-primary);
        }
        .hubble-tip {
            margin-top: var(--space-sm);
            color: #f8d66d;
            font-weight: 600;
        }
        .hubble-actions {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-sm);
            margin-top: var(--space-md);
        }
        .hubble-action {
            border: 1px solid rgba(56, 189, 248, 0.22);
            border-radius: var(--radius-sm);
            background: rgba(56, 189, 248, 0.08);
            color: var(--text-secondary);
            min-height: 32px;
            padding: 6px 10px;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
        }
        .hubble-action:hover,
        .hubble-action.active {
            background: rgba(56, 189, 248, 0.18);
            border-color: rgba(56, 189, 248, 0.42);
            color: var(--text-primary);
        }
        .hubble-answer {
            margin-top: var(--space-sm);
            padding: var(--space-md);
            border: 1px solid rgba(251, 191, 36, 0.18);
            border-radius: var(--radius-sm);
            background: rgba(0, 0, 0, 0.14);
        }
        .hubble-answer-label {
            display: block;
            margin-bottom: 4px;
            color: #f8d66d;
            font-size: 0.75rem;
            font-weight: 700;
        }
        .hubble-answer p {
            margin: 0;
            color: var(--text-primary);
            line-height: 1.5;
            font-size: 0.9rem;
        }
        .hubble-details {
            display: grid;
            gap: var(--space-sm);
            margin-top: var(--space-md);
            padding-top: var(--space-md);
            border-top: 1px solid rgba(255, 255, 255, 0.10);
        }
        .hubble-details .hubble-story-heading {
            margin-top: var(--space-xs);
            color: var(--text-primary);
            font-weight: 700;
        }
        .hubble-details .hubble-updated {
            color: var(--text-muted);
            font-family: var(--font-mono);
            font-size: 0.78rem;
        }
        /* ===== Isometric Energy Flow ===== */
        .isometric-energy-flow {
            display: block;
            cursor: default;
        }
        .iso-element-clickable {
            cursor: pointer;
            transition: opacity 0.2s ease;
        }
        .iso-element-clickable:hover {
            opacity: 0.85;
        }

        /* Star twinkling */
        .star-twinkle-1 {
            animation: twinkle1 3s ease-in-out infinite;
        }
        .star-twinkle-2 {
            animation: twinkle2 4s ease-in-out infinite;
        }
        .star-twinkle-3 {
            animation: twinkle3 5s ease-in-out infinite;
        }
        @keyframes twinkle1 {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
        }
        @keyframes twinkle2 {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 0.2; }
        }
        @keyframes twinkle3 {
            0%, 100% { opacity: 0.2; }
            50% { opacity: 0.8; }
        }

        /* Sun rays rotation */
        .sun-rays {
            animation: sunRotate 20s linear infinite;
            transform-origin: 820px 60px;
        }
        @keyframes sunRotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        /* Flow lines animation */
        .flow-line-animated {
            stroke-dasharray: 12 6;
            animation: flowDash 1.5s linear infinite;
        }
        .flow-line-animated-reverse {
            stroke-dasharray: 12 6;
            animation: flowDashReverse 1.5s linear infinite;
        }
        @keyframes flowDash {
            to { stroke-dashoffset: -18; }
        }
        @keyframes flowDashReverse {
            to { stroke-dashoffset: 18; }
        }

        /* Flow glow effects */
        .flow-glow-yellow {
            filter: drop-shadow(0 0 6px rgba(255,221,0,0.5));
        }
        .flow-glow-green {
            filter: drop-shadow(0 0 6px rgba(34,197,94,0.5));
        }
        .flow-glow-purple {
            filter: drop-shadow(0 0 6px rgba(139,92,246,0.5));
        }
        .flow-glow-cyan {
            filter: drop-shadow(0 0 6px rgba(0,255,255,0.5));
        }

        /* ===== Panel Groups ===== */
        .panel-groups-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: var(--space-md);
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
            gap: var(--space-md);
            align-items: center;
            flex-wrap: wrap;
        }

        .forecast-card-title-row {
            margin-bottom: 6px;
        }

        .forecast-summary-grid {
            display: grid;
            grid-template-columns: minmax(260px, 1fr) minmax(280px, auto);
            gap: 14px 24px;
            align-items: start;
            margin-top: 4px;
            margin-bottom: 10px;
        }

        .forecast-eval-list,
        .forecast-kpi-list {
            display: flex;
            flex-direction: column;
            gap: 4px;
            font-family: var(--font-mono);
            font-size: 0.8rem;
        }

        .forecast-eval-list {
            color: var(--text-muted);
        }

        .forecast-kpi-list {
            justify-self: end;
            min-width: 280px;
        }

        .forecast-kpi-row {
            display: grid;
            grid-template-columns: 110px minmax(140px, auto);
            gap: 10px;
            align-items: baseline;
        }

        .forecast-kpi-label {
            color: var(--text-muted);
        }

        .forecast-kpi-value {
            justify-self: end;
            font-size: 0.85rem;
            font-weight: 700;
            white-space: nowrap;
        }

        .forecast-kpi-percent {
            font-weight: 600;
            color: inherit;
        }

        /* ===== Responsive: stack forecast summary on phones ===== */
        @media (max-width: 768px) {
            .panel-groups-grid {
                grid-template-columns: 1fr;
            }

            .forecast-summary-grid {
                grid-template-columns: 1fr;
            }

            .forecast-kpi-list {
                justify-self: stretch;
                min-width: 0;
            }

            .forecast-kpi-row {
                grid-template-columns: minmax(98px, auto) 1fr;
            }

            .forecast-kpi-value {
                justify-self: start;
            }
        }

        .weather-trace {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 6px 10px;
            align-items: start;
            margin-top: 12px;
            margin-bottom: 6px;
            padding: 10px 12px;
            border: 1px solid rgba(148, 163, 184, 0.14);
            border-radius: var(--radius-md);
            background:
                linear-gradient(135deg, rgba(56, 189, 248, 0.08), rgba(251, 191, 36, 0.04)),
                rgba(255, 255, 255, 0.018);
        }

        .weather-trace-labels {
            display: grid;
            grid-template-rows: 16px 28px 28px 24px;
            gap: 6px;
            color: var(--text-muted);
            font-family: var(--font-mono);
            font-size: 0.68rem;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            padding-top: 1px;
        }

        .weather-trace-labels span {
            display: flex;
            align-items: center;
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
            grid-template-rows: 16px 28px 28px 24px;
            gap: 6px 4px;
            overflow-x: auto;
            padding-bottom: 2px;
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
            min-height: 30px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.025);
        }

        .weather-trace-visual {
            font-size: 1.08rem;
            line-height: 1;
        }

        .weather-trace-indicators {
            display: flex;
            gap: 3px;
            font-size: 0.58rem;
            line-height: 1;
            letter-spacing: 0.02em;
        }

        .weather-trace-indicator {
            opacity: 0.2;
            transition: opacity 120ms ease, color 120ms ease;
        }

        .weather-trace-indicator.level-low {
            opacity: 0.45;
            color: rgba(226, 232, 240, 0.85);
        }

        .weather-trace-indicator.level-medium {
            opacity: 0.8;
            color: #f8fafc;
        }

        .weather-trace-indicator.level-high {
            opacity: 1;
            color: #fbbf24;
        }

        .weather-trace-icon.muted {
            color: rgba(148, 163, 184, 0.45);
        }

        .weather-trace-match {
            font-size: 0.86rem;
            font-weight: 700;
            border-radius: 999px;
            min-height: 24px;
        }

        .weather-trace-match.match-good {
            color: #22c55e;
            background: rgba(34, 197, 94, 0.10);
        }

        .weather-trace-match.match-mixed {
            color: #eab308;
            background: rgba(234, 179, 8, 0.10);
        }

        .weather-trace-match.match-bad {
            color: #f87171;
            background: rgba(248, 113, 113, 0.10);
        }

        .weather-trace-match.match-missing {
            color: rgba(148, 163, 184, 0.45);
            background: rgba(148, 163, 184, 0.06);
        }

        /* === Panel Live Cards (unter PV-Chart) === */
        .panel-live-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
            gap: var(--space-sm);
        }

        .panel-live-card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(251, 191, 36, 0.15);
            border-radius: var(--radius-md);
            padding: var(--space-sm) var(--space-md);
            text-align: center;
            transition: all var(--transition-normal);
        }

        .panel-live-card:hover {
            background: rgba(251, 191, 36, 0.06);
            border-color: rgba(251, 191, 36, 0.3);
        }

        .panel-live-icon { font-size: 1rem; margin-bottom: 2px; }

        .panel-live-name {
            font-size: 0.7rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .panel-live-power {
            font-size: 1.5rem;
            font-weight: 700;
            font-family: var(--font-mono);
            color: var(--solar);
        }

        .panel-live-unit {
            font-size: 0.8rem;
            font-weight: 400;
            color: var(--text-secondary);
        }

        .panel-group-chart-card {
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-lg);
            padding: var(--space-md);
        }

        /* === FLOW LAYOUT (SVG + Info Panel side by side) === */
        .flow-layout {
            display: flex;
            gap: var(--space-lg);
            align-items: stretch;
        }

        .flow-layout > svg {
            flex: 1;
            min-width: 0;
        }

        .flow-info-panel {
            flex: 0 0 180px;
            display: flex;
            flex-direction: column;
            gap: var(--space-sm);
            padding: var(--space-md);
            background: rgba(255, 255, 255, 0.02);
            border-left: 1px solid var(--border-default);
            border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
        }

        .info-item {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .info-label {
            font-size: 0.7rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.06em;
        }

        .info-value {
            font-size: 1.1rem;
            font-weight: 700;
            font-family: var(--font-mono);
            color: var(--text-primary);
        }

        .info-value.info-small {
            font-size: 0.9rem;
        }

        .info-divider {
            height: 1px;
            background: var(--border-default);
            margin: var(--space-xs) 0;
        }

        @media (max-width: 768px) {
            .flow-layout {
                flex-direction: column;
            }
            .flow-info-panel {
                flex: none;
                flex-direction: row;
                flex-wrap: wrap;
                gap: var(--space-md);
                border-left: none;
                border-top: 1px solid var(--border-default);
                border-radius: 0 0 var(--radius-lg) var(--radius-lg);
            }
            .info-item {
                flex: 1;
                min-width: 80px;
            }
        }
    `;
    document.head.appendChild(style);
})();

return _HomePage;
})(Vue);

window.HomePage = HomePage;
