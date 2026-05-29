// SFML Stats - Dedicated Energy Flow Page V20
// (C) 2026 Zara-Toorox

const FlowPage = ((Vue) => {
const { ref, reactive, computed, onMounted, onUnmounted } = Vue;

// Consumer labels resolve via i18n at render time (`labelKey` -> $t(labelKey)).
const CONSUMER_META = {
    heatpump: { labelKey: 'flow.consumer.heatpump', icon: 'HP', color: '#fb7185', x: 360, y: 574 },
    heatingrod: { labelKey: 'flow.consumer.heatingrod', icon: 'HS', color: '#f97316', x: 660, y: 606 },
    wallbox: { labelKey: 'flow.consumer.wallbox', icon: 'EV', color: '#38bdf8', x: 960, y: 574 },
};

function fmtW(value) {
    if (value == null) return '--';
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(2)} kW`;
    return `${Math.round(value)} W`;
}

function fmtPrice(value) {
    if (value == null) return '--';
    return `${Number(value).toFixed(2)} ct`;
}

function pathWidth(power) {
    const p = Math.max(0, Number(power) || 0);
    if (p <= 0) return 6;
    return 6 + Math.min(6, Math.sqrt(p) * 0.12);
}

function particleCount(power) {
    const p = Math.max(0, Number(power) || 0);
    if (p <= 0) return 0;
    if (p < 400) return 2;
    if (p < 1200) return 3;
    if (p < 2500) return 4;
    return 5;
}

function particleDuration(power) {
    const p = Math.max(0, Number(power) || 0);
    if (p <= 0) return '4.8s';
    if (p < 400) return '4.2s';
    if (p < 1200) return '3.5s';
    if (p < 2500) return '2.8s';
    return '2.2s';
}

function textScaleClass(text, mediumThreshold = 10, smallThreshold = 14) {
    const len = String(text || '').trim().length;
    if (len >= smallThreshold) return 'is-small';
    if (len >= mediumThreshold) return 'is-medium';
    return '';
}

const _FlowPage = {
    props: ['liveData', 'config'],
    template: `
        <div class="page page-flow">
            <div class="section-header">
                <h2 class="section-title">{{ $t('flow.title') }}</h2>
            </div>

            <div class="chart-card flow-hero-card">
                <div class="flow-hero-head">
                    <div class="flow-hero-title">
                        <span class="chart-title">{{ $t('flow.heroTitle') }}</span>
                        <span class="flow-hero-subtitle">{{ $t('flow.subtitle') }}</span>
                    </div>
                    <div class="flow-hero-badges">
                        <span class="flow-badge">{{ currentClock }}</span>
                        <span class="flow-badge" v-if="flowData.current_price">{{ fmtPrice(flowData.current_price.total_price) }}</span>
                        <span class="flow-badge" :class="{ live: connected }">{{ connected ? $t('common.live') : $t('flow.offline') }}</span>
                    </div>
                </div>

                <div class="flow-scene-shell">
                    <svg class="flow-scene" viewBox="0 0 1320 700" preserveAspectRatio="xMidYMid meet">
                        <defs>
                            <radialGradient id="flowBgGlow" cx="50%" cy="42%" r="72%">
                                <stop offset="0%" stop-color="rgba(250,204,21,0.16)"/>
                                <stop offset="35%" stop-color="rgba(34,197,94,0.10)"/>
                                <stop offset="100%" stop-color="rgba(15,23,42,0)"/>
                            </radialGradient>
                            <radialGradient id="flowCoreGlow" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stop-color="rgba(74,222,128,0.26)"/>
                                <stop offset="100%" stop-color="rgba(74,222,128,0)"/>
                            </radialGradient>
                            <filter id="flowSoftGlow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="8" result="blur"/>
                                <feMerge>
                                    <feMergeNode in="blur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                            <filter id="flowCardShadow" x="-30%" y="-30%" width="160%" height="160%">
                                <feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#000" flood-opacity="0.32"/>
                            </filter>
                        </defs>

                        <rect x="0" y="0" width="1320" height="700" fill="url(#flowBgGlow)"></rect>
                        <rect x="36" y="40" width="1248" height="620" rx="34" class="flow-stage"></rect>
                        <circle cx="660" cy="366" r="230" class="flow-orbit flow-orbit-1"></circle>
                        <circle cx="660" cy="366" r="168" class="flow-orbit flow-orbit-2"></circle>
                        <circle cx="660" cy="366" r="104" class="flow-orbit flow-orbit-3"></circle>
                        <circle cx="660" cy="366" r="58" fill="url(#flowCoreGlow)"></circle>
                        <path d="M 660 76 L 660 656" class="flow-axis"></path>
                        <path d="M 118 366 L 1202 366" class="flow-axis"></path>
                        <path d="M 232 142 Q 660 366 1088 142" class="flow-axis-soft"></path>
                        <path d="M 250 582 Q 660 460 1070 582" class="flow-axis-soft"></path>

                        <g class="flow-grid-lines">
                            <path d="M660 98 C 660 182, 660 236, 660 286" class="flow-guide"></path>
                            <path d="M182 366 C 304 366, 448 366, 540 366" class="flow-guide"></path>
                            <path d="M780 366 C 872 366, 1010 366, 1134 366" class="flow-guide"></path>
                            <path d="M604 440 C 540 490, 466 546, 388 596" class="flow-guide"></path>
                            <path d="M660 448 C 660 512, 660 560, 660 604" class="flow-guide"></path>
                            <path d="M716 440 C 784 490, 860 546, 934 596" class="flow-guide"></path>
                        </g>

                        <g v-for="route in routes" :key="route.id">
                            <path
                                :d="route.d"
                                class="flow-route"
                                :class="'route-' + route.theme"
                                :style="{ strokeWidth: route.width + 'px', opacity: route.active ? 1 : 0.16 }"
                            ></path>
                            <path
                                :d="route.d"
                                class="flow-route-glow"
                                :class="'route-' + route.theme"
                                :style="{ strokeWidth: (route.width + 8) + 'px', opacity: route.active ? 0.35 : 0 }"
                            ></path>
                            <g v-if="route.active">
                                <circle
                                    v-for="idx in route.particles"
                                    :key="route.id + '-' + idx"
                                    class="flow-particle"
                                    :class="'particle-' + route.theme"
                                    :r="route.width > 12 ? 5.2 : 4.2"
                                >
                                    <animateMotion
                                        :dur="route.duration"
                                        :begin="(idx - 1) * 0.55 + 's'"
                                        repeatCount="indefinite"
                                        :path="route.d"
                                    />
                                </circle>
                            </g>
                            <g v-if="route.active && route.labelX != null" class="flow-route-label">
                                <rect :x="route.labelX - 46" :y="route.labelY - 18" width="92" height="30" rx="15"></rect>
                                <text :x="route.labelX" :y="route.labelY + 4" text-anchor="middle">{{ fmtW(route.power) }}</text>
                            </g>
                        </g>

                        <g class="flow-node solar-node" transform="translate(520 72)">
                            <rect x="0" y="0" width="280" height="122" rx="30" filter="url(#flowCardShadow)"></rect>
                            <text x="42" y="40" class="node-icon">☀</text>
                            <text x="140" y="42" text-anchor="middle" class="node-title">{{ $t('flow.node.pvProduction') }}</text>
                            <text x="140" y="82" text-anchor="middle" class="node-value solar">{{ fmtW(flowData.flows.solar_power) }}</text>
                            <text x="140" y="106" text-anchor="middle" class="node-sub node-sub-tight">{{ $t('flow.node.liveSolarPower') }}</text>
                        </g>


                        <g class="flow-node house-node" transform="translate(552 294)">
                            <circle cx="108" cy="72" r="84" class="house-core-ring"></circle>
                            <circle cx="108" cy="72" r="68" class="house-core-fill" filter="url(#flowSoftGlow)"></circle>
                            <text x="108" y="62" text-anchor="middle" class="house-core-icon">⌂</text>
                            <text x="108" y="98" text-anchor="middle" class="house-core-value">{{ fmtW(flowData.home.consumption) }}</text>
                            <text x="108" y="124" text-anchor="middle" class="house-core-sub">{{ $t('flow.node.houseConsumption') }}</text>
                        </g>

                        <g class="flow-node grid-node" transform="translate(78 286)">
                            <rect x="0" y="0" width="228" height="144" rx="30" filter="url(#flowCardShadow)"></rect>
                            <text x="38" y="42" class="node-icon">⚡</text>
                            <text x="114" y="44" text-anchor="middle" class="node-title">{{ $t('flow.node.grid') }}</text>
                            <text x="114" y="88" text-anchor="middle" class="node-value grid" :class="gridStatusTextPrimaryClass">{{ gridStatusTextSecondary }}</text>
                            <text x="114" y="116" text-anchor="middle" class="node-sub node-sub-strong" :class="gridModeTextClass">{{ gridModeText }}</text>
                        </g>

                        <g v-if="hasBattery" class="flow-node battery-node" transform="translate(1014 286)">
                            <rect x="0" y="0" width="228" height="144" rx="30" filter="url(#flowCardShadow)"></rect>
                            <text x="38" y="42" class="node-icon">🔋</text>
                            <text x="114" y="42" text-anchor="middle" class="node-title">{{ $t('flow.node.battery') }}</text>
                            <text x="114" y="84" text-anchor="middle" class="node-value battery" :class="batteryPowerTextClass">{{ batteryPowerText }}</text>
                            <text x="114" y="112" text-anchor="middle" class="node-status battery" :class="batteryStateTextClass">{{ batteryStateText }}</text>
                            <text x="114" y="136" text-anchor="middle" class="node-sub">SOC {{ flowData.battery.soc != null ? flowData.battery.soc.toFixed(0) + '%' : '--' }}</text>
                        </g>

                        <g v-for="consumer in activeConsumers" :key="consumer.id" class="flow-node consumer-node" :transform="'translate(' + (consumer.x - 112) + ' ' + (consumer.y - 48) + ')'">
                            <rect x="0" y="0" width="220" height="96" rx="24" filter="url(#flowCardShadow)"></rect>
                            <text x="34" y="36" class="node-icon" :style="{ fill: consumer.color }">{{ consumer.icon }}</text>
                            <text x="56" y="34" text-anchor="start" class="node-title consumer-title" :class="consumer.titleClass">{{ consumer.label }}</text>
                            <text x="116" y="66" text-anchor="middle" class="node-value" :style="{ fill: consumer.color }">{{ fmtW(consumer.power) }}</text>
                        </g>
                    </svg>
                </div>

                <div class="flow-bottom-stats">
                    <div class="flow-stat">
                        <span class="flow-stat-label">{{ $t('flow.stat.solarToHouse') }}</span>
                        <span class="flow-stat-value solar">{{ fmtW(flowData.flows.solar_to_house) }}</span>
                    </div>
                    <div class="flow-stat" v-if="hasBattery">
                        <span class="flow-stat-label">{{ $t('flow.stat.solarToBattery') }}</span>
                        <span class="flow-stat-value battery">{{ fmtW(flowData.flows.solar_to_battery) }}</span>
                    </div>
                    <div class="flow-stat">
                        <span class="flow-stat-label">{{ $t('flow.stat.gridToHouse') }}</span>
                        <span class="flow-stat-value grid">{{ fmtW(flowData.flows.grid_to_house) }}</span>
                    </div>
                    <div class="flow-stat" v-if="hasBattery">
                        <span class="flow-stat-label">{{ $t('flow.stat.batteryToHouse') }}</span>
                        <span class="flow-stat-value battery">{{ fmtW(flowData.flows.battery_to_house) }}</span>
                    </div>
                    <div class="flow-stat">
                        <span class="flow-stat-label">{{ $t('flow.stat.feedIn') }}</span>
                        <span class="flow-stat-value export">{{ fmtW(flowData.flows.house_to_grid) }}</span>
                    </div>
                </div>
            </div>
        </div>
    `,

    setup() {
        const t = window.SFMLI18n ? window.SFMLI18n.t : (key) => key;
        const locale = window.SFMLI18n ? window.SFMLI18n.current : 'en';
        const bcp = (value) => ({ de: 'de-DE', en: 'en-US', pl: 'pl-PL' }[value] || 'en-US');

        const connected = ref(false);
        const flowData = reactive({
            timestamp: null,
            flows: {
                solar_power: 0,
                solar_to_house: 0,
                solar_to_battery: 0,
                battery_to_house: 0,
                grid_to_house: 0,
                grid_to_battery: 0,
                house_to_grid: 0,
            },
            battery: {
                soc: null,
                power: 0,
            },
            home: {
                consumption: 0,
            },
            consumers: {
                heatpump: null,
                heatingrod: null,
                wallbox: null,
            },
            current_price: null,
        });

        let pollTimer = null;

        const currentClock = computed(() => {
            if (!flowData.timestamp) return '--:--';
            const dt = new Date(flowData.timestamp);
            return dt.toLocaleTimeString(bcp(locale), { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        });

        const hasBattery = computed(() => flowData.battery.soc != null);

        const batteryPowerText = computed(() => {
            const p = Number(flowData.battery.power) || 0;
            if (p === 0) return '0 W';
            return fmtW(Math.abs(p));
        });

        const batteryStateText = computed(() => {
            const p = Number(flowData.battery.power) || 0;
            if (p > 0) return t('flow.battery.charging');
            if (p < 0) return t('flow.battery.discharging');
            return t('flow.battery.standby');
        });

        const batteryPowerTextClass = computed(() => textScaleClass(batteryPowerText.value, 8, 12));
        const batteryStateTextClass = computed(() => textScaleClass(batteryStateText.value, 8, 12));

        const houseMixText = computed(() => (
            `${t('flow.short.solar')} ${fmtW(flowData.flows.solar_to_house)} | ${t('flow.short.grid')} ${fmtW(flowData.flows.grid_to_house)}`
        ));
        const houseMixTextClass = computed(() => textScaleClass(houseMixText.value, 24, 34));

        const gridModeText = computed(() => {
            const importW = Number(flowData.flows.grid_to_house || 0) + Number(flowData.flows.grid_to_battery || 0);
            const exportW = Number(flowData.flows.house_to_grid || 0);
            if (exportW > 0) return t('flow.gridMode.export');
            if (importW > 0) return t('flow.gridMode.import');
            return t('flow.gridMode.neutral');
        });

        const gridStatusText = computed(() => {
            const importW = Number(flowData.flows.grid_to_house || 0) + Number(flowData.flows.grid_to_battery || 0);
            const exportW = Number(flowData.flows.house_to_grid || 0);
            if (exportW > 0) return `Export ${fmtW(exportW)}`;
            if (importW > 0) return `Import ${fmtW(importW)}`;
            return '0 W';
        });

        const gridStatusTextPrimary = computed(() => {
            const exportW = Number(flowData.flows.house_to_grid || 0);
            const importW = Number(flowData.flows.grid_to_house || 0) + Number(flowData.flows.grid_to_battery || 0);
            if (exportW > 0) return 'Export';
            if (importW > 0) return 'Import';
            return 'Neutral';
        });

        const gridStatusTextSecondary = computed(() => {
            const exportW = Number(flowData.flows.house_to_grid || 0);
            const importW = Number(flowData.flows.grid_to_house || 0) + Number(flowData.flows.grid_to_battery || 0);
            if (exportW > 0) return fmtW(exportW);
            if (importW > 0) return fmtW(importW);
            return '0 W';
        });

        const gridStatusTextPrimaryClass = computed(() => textScaleClass(gridStatusTextPrimary.value, 7, 9));
        const gridModeTextClass = computed(() => textScaleClass(gridModeText.value, 11, 14));

        const activeConsumers = computed(() => {
            return Object.entries(CONSUMER_META)
                .map(([id, meta]) => {
                    const raw = flowData.consumers[id];
                    if (!raw || !raw.configured) return null;
                    const label = t(meta.labelKey);
                    return {
                        id,
                        ...meta,
                        label,
                        power: Math.max(0, Number(raw.power) || 0),
                        titleClass: textScaleClass(label, 10, 14),
                    };
                })
                .filter(Boolean);
        });

        const routes = computed(() => {
            const houseCenter = { x: 660, y: 366 };
            const routeList = [
                {
                    id: 'solar-house',
                    d: 'M 660 194 C 660 246, 660 292, 660 320',
                    power: flowData.flows.solar_to_house,
                    theme: 'solar',
                    labelX: 718,
                    labelY: 248,
                },
                {
                    id: 'solar-battery',
                    d: 'M 800 133 C 870 170, 970 280, 1014 358',
                    power: flowData.flows.solar_to_battery,
                    theme: 'battery',
                    labelX: 920,
                    labelY: 230,
                },
                {
                    id: 'battery-house',
                    d: 'M 1014 358 C 912 358, 796 362, 740 366',
                    power: flowData.flows.battery_to_house,
                    theme: 'battery',
                    labelX: 862,
                    labelY: 334,
                },
                {
                    id: 'solar-grid',
                    d: 'M 520 133 C 450 170, 350 280, 306 358',
                    power: flowData.flows.house_to_grid,
                    theme: 'export',
                    labelX: 400,
                    labelY: 238,
                },
                {
                    id: 'grid-house',
                    d: 'M 306 358 C 404 358, 520 362, 580 366',
                    power: (Number(flowData.flows.grid_to_house) || 0) + (Number(flowData.flows.grid_to_battery) || 0),
                    theme: 'grid',
                    labelX: 446,
                    labelY: 334,
                },
            ];

            activeConsumers.value.forEach((consumer) => {
                routeList.push({
                    id: `house-${consumer.id}`,
                    d: `M ${houseCenter.x} ${houseCenter.y + 52} C ${houseCenter.x} ${consumer.y - 72}, ${consumer.x} ${consumer.y - 92}, ${consumer.x} ${consumer.y - 48}`,
                    power: consumer.power,
                    theme: consumer.id === 'wallbox' ? 'consumer-ev' : 'consumer',
                    labelX: consumer.x,
                    labelY: consumer.y - 98,
                });
            });

            return routeList.map((route) => {
                const power = Math.max(0, Number(route.power) || 0);
                return {
                    ...route,
                    active: power > 0,
                    width: pathWidth(power),
                    particles: particleCount(power),
                    duration: particleDuration(power),
                };
            });
        });

        async function loadFlow() {
            try {
                const data = await SFMLApi.fetch('/api/sfml_stats/energy_flow', { forceRefresh: true });
                if (!data || !data.success) return;

                connected.value = true;
                flowData.timestamp = data.timestamp || null;
                Object.assign(flowData.flows, data.flows || {});
                Object.assign(flowData.battery, data.battery || {});
                Object.assign(flowData.home, data.home || {});
                flowData.current_price = data.current_price || null;
                flowData.consumers = data.consumers || flowData.consumers;
            } catch (err) {
                console.error('[FlowPage] energy flow load error:', err);
                connected.value = false;
            }
        }

        onMounted(() => {
            loadFlow();
            pollTimer = setInterval(loadFlow, 5000);
        });

        onUnmounted(() => {
            if (pollTimer) clearInterval(pollTimer);
        });

        return {
            connected,
            flowData,
            hasBattery,
            batteryPowerText,
            batteryStateText,
            batteryPowerTextClass,
            batteryStateTextClass,
            houseMixText,
            houseMixTextClass,
            gridStatusText,
            gridStatusTextPrimary,
            gridStatusTextSecondary,
            gridStatusTextPrimaryClass,
            gridModeText,
            gridModeTextClass,
            activeConsumers,
            routes,
            currentClock,
            fmtW,
            fmtPrice,
        };
    },
};

(() => {
    const styleId = 'sfml-flow-page-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .flow-hero-card {
            padding: 18px;
            overflow: hidden;
            background:
                radial-gradient(circle at top left, rgba(250,204,21,0.08), transparent 32%),
                radial-gradient(circle at top right, rgba(168,85,247,0.06), transparent 28%),
                radial-gradient(circle at bottom center, rgba(74,222,128,0.08), transparent 34%),
                linear-gradient(180deg, rgba(12,18,28,0.98), rgba(17,24,39,0.99));
        }
        .flow-hero-head {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            align-items: flex-start;
            margin-bottom: 14px;
        }
        .flow-hero-title {
            display: flex;
            flex-direction: column;
            gap: 6px;
            min-width: 0;
            flex: 1 1 auto;
        }
        .flow-hero-title .chart-title,
        .flow-hero-subtitle {
            overflow-wrap: anywhere;
            word-break: break-word;
        }
        .flow-hero-subtitle {
            color: var(--text-secondary);
            font-size: 0.9rem;
        }
        .flow-hero-badges {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: flex-end;
        }
        .flow-badge {
            border: 1px solid rgba(255,255,255,0.08);
            background: rgba(255,255,255,0.04);
            color: var(--text-primary);
            border-radius: 999px;
            padding: 8px 12px;
            font-size: 0.78rem;
            font-family: var(--font-mono);
        }
        .flow-badge.live {
            color: #4ade80;
            border-color: rgba(74,222,128,0.35);
            box-shadow: 0 0 0 1px rgba(74,222,128,0.12) inset;
        }
        .flow-scene-shell {
            border-radius: 28px;
            overflow: hidden;
            background:
                radial-gradient(circle at top, rgba(250,204,21,0.10), transparent 28%),
                radial-gradient(circle at center, rgba(34,197,94,0.08), transparent 34%),
                linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01)),
                rgba(8,12,20,0.78);
            border: 1px solid rgba(255,255,255,0.07);
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }
        .flow-scene {
            display: block;
            width: 100%;
            height: auto;
            min-height: 560px;
        }
        .flow-guide {
            fill: none;
            stroke: rgba(148,163,184,0.10);
            stroke-width: 1.5;
            stroke-dasharray: 8 12;
        }
        .flow-stage {
            fill: rgba(226,232,240,0.06);
            stroke: rgba(255,255,255,0.08);
            stroke-width: 1.5;
        }
        .flow-orbit {
            fill: none;
            stroke: rgba(148,163,184,0.12);
            stroke-width: 1.4;
        }
        .flow-orbit-2 {
            stroke: rgba(148,163,184,0.09);
        }
        .flow-orbit-3 {
            stroke: rgba(148,163,184,0.07);
        }
        .flow-axis {
            fill: none;
            stroke: rgba(255,255,255,0.08);
            stroke-width: 1.2;
        }
        .flow-axis-soft {
            fill: none;
            stroke: rgba(255,255,255,0.05);
            stroke-width: 1;
        }
        .flow-route,
        .flow-route-glow {
            fill: none;
            stroke-linecap: round;
        }
        .route-solar { stroke: #facc15; }
        .route-battery { stroke: #4ade80; }
        .route-grid { stroke: #c084fc; }
        .route-export { stroke: #22d3ee; }
        .route-consumer { stroke: #fb7185; }
        .route-consumer-ev { stroke: #38bdf8; }
        .particle-solar { fill: #fde047; filter: url(#flowSoftGlow); }
        .particle-battery { fill: #4ade80; filter: url(#flowSoftGlow); }
        .particle-grid { fill: #c084fc; filter: url(#flowSoftGlow); }
        .particle-export { fill: #22d3ee; filter: url(#flowSoftGlow); }
        .particle-consumer { fill: #fb7185; filter: url(#flowSoftGlow); }
        .particle-consumer-ev { fill: #38bdf8; filter: url(#flowSoftGlow); }
        .flow-route-label rect {
            fill: rgba(6,10,18,0.78);
            stroke: rgba(255,255,255,0.08);
        }
        .flow-route-label text {
            fill: var(--text-primary);
            font-size: 13px;
            font-family: var(--font-mono);
            font-weight: 700;
        }
        .flow-node rect {
            fill: rgba(15,23,42,0.78);
            stroke: rgba(255,255,255,0.20);
            stroke-width: 1.2;
        }
        .solar-node rect {
            fill: rgba(250,204,21,0.12);
            stroke: rgba(250,204,21,0.38);
        }
        .battery-node rect {
            fill: rgba(74,222,128,0.12);
            stroke: rgba(96,165,250,0.36);
        }
        .grid-node rect {
            fill: rgba(251,191,36,0.08);
            stroke: rgba(251,191,36,0.30);
        }
        .consumer-node rect {
            fill: rgba(255,255,255,0.04);
        }
        .node-icon {
            font-size: 24px;
            fill: var(--text-primary);
            font-weight: 700;
        }
        .node-title {
            fill: var(--text-primary);
            font-size: 22px;
            font-weight: 700;
        }
        .consumer-title {
            font-size: 18px;
        }
        .node-value {
            font-size: 32px;
            font-weight: 800;
            font-family: var(--font-mono);
        }
        .node-value.is-medium,
        .node-title.is-medium,
        .node-status.is-medium,
        .node-metric.is-medium,
        .node-sub.is-medium {
            font-size: 0.9em;
        }
        .node-value.is-small,
        .node-title.is-small,
        .node-status.is-small,
        .node-metric.is-small,
        .node-sub.is-small {
            font-size: 0.8em;
        }
        .node-value.solar { fill: #facc15; }
        .node-value.house { fill: #22d3ee; }
        .node-value.battery { fill: #4ade80; }
        .node-value.grid { fill: #f8fafc; }
        .node-status {
            font-size: 18px;
            font-weight: 700;
            letter-spacing: 0;
        }
        .node-status.battery {
            fill: rgba(134,239,172,0.94);
        }
        .node-metric {
            font-size: 20px;
            font-weight: 800;
            font-family: var(--font-mono);
        }
        .node-metric.grid {
            fill: rgba(233,213,255,0.98);
        }
        .node-sub {
            fill: var(--text-secondary);
            font-size: 13px;
        }
        .flow-core-kicker {
            fill: #fbbf24;
            font-size: 18px;
            font-weight: 700;
        }
        .house-core-ring {
            fill: rgba(34,197,94,0.08);
            stroke: rgba(74,222,128,0.55);
            stroke-width: 5;
        }
        .house-core-fill {
            fill: rgba(240,253,244,0.92);
        }
        .house-core-icon {
            font-size: 34px;
            fill: #4ade80;
            font-weight: 700;
        }
        .house-core-value {
            fill: rgba(15,23,42,0.92);
            font-size: 28px;
            font-weight: 800;
            font-family: var(--font-mono);
            stroke: rgba(255,255,255,0.28);
            stroke-width: 0.8px;
            paint-order: stroke fill;
        }
        .house-core-sub {
            fill: rgba(15,23,42,0.72);
            font-size: 13px;
            stroke: rgba(255,255,255,0.22);
            stroke-width: 0.5px;
            paint-order: stroke fill;
        }
        .node-sub-tight {
            font-size: 12px;
            letter-spacing: 0.01em;
        }
        .node-sub-small {
            font-size: 12px;
        }
        .node-sub-strong {
            fill: rgba(226,232,240,0.92);
        }
        .flow-bottom-stats {
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 12px;
            margin-top: 16px;
        }
        .flow-stat {
            padding: 14px 16px;
            border-radius: 18px;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.06);
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .flow-stat-label {
            color: var(--text-secondary);
            font-size: 0.74rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        .flow-stat-value {
            font-family: var(--font-mono);
            font-size: 1rem;
            font-weight: 800;
        }
        .flow-stat-value.solar { color: #facc15; }
        .flow-stat-value.battery { color: #4ade80; }
        .flow-stat-value.grid { color: #c084fc; }
        .flow-stat-value.export { color: #22d3ee; }
        @media (max-width: 1100px) {
            .flow-bottom-stats {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }
        @media (max-width: 768px) {
            .flow-hero-head {
                flex-direction: column;
                align-items: stretch;
            }
            .flow-hero-title .chart-title {
                font-size: 1.25rem;
                line-height: 1.2;
            }
            .flow-hero-badges {
                justify-content: flex-start;
            }
            .flow-scene {
                min-height: 520px;
            }
            .node-title {
                font-size: 20px;
            }
            .node-value {
                font-size: 28px;
            }
            .node-status,
            .node-metric {
                font-size: 17px;
            }
            .flow-bottom-stats {
                grid-template-columns: 1fr;
            }
        }
    `;
    document.head.appendChild(style);
})();

return _FlowPage;
})(Vue);

window.FlowPage = FlowPage;
