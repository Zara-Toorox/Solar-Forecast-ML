// SFML Stats - Dedicated Energy Flow Page V20
// (C) 2026 Zara-Toorox

const FlowPage = ((Vue) => {
const { ref, reactive, computed, onMounted, onUnmounted } = Vue;

const CONSUMER_META = {
    heatpump: { label: 'Waermepumpe', icon: 'HP', color: '#fb7185', x: 1040, y: 240 },
    heatingrod: { label: 'Heizstab', icon: 'HS', color: '#f97316', x: 1040, y: 400 },
    wallbox: { label: 'Auto', icon: 'EV', color: '#38bdf8', x: 1040, y: 560 },
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
    return 4 + Math.min(18, Math.sqrt(p) * 0.38);
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

const _FlowPage = {
    props: ['liveData', 'config'],
    template: `
        <div class="page page-flow">
            <div class="section-header">
                <h2 class="section-title">Live Energiefluss</h2>
            </div>

            <div class="chart-card flow-hero-card">
                <div class="flow-hero-head">
                    <div class="flow-hero-title">
                        <span class="chart-title">Energy Flow</span>
                        <span class="flow-hero-subtitle">Solar, Haus, Akku, Netz und optionale Verbraucher</span>
                    </div>
                    <div class="flow-hero-badges">
                        <span class="flow-badge">{{ currentClock }}</span>
                        <span class="flow-badge" v-if="flowData.current_price">{{ fmtPrice(flowData.current_price.total_price) }}</span>
                        <span class="flow-badge" :class="{ live: connected }">{{ connected ? 'Live' : 'Offline' }}</span>
                    </div>
                </div>

                <div class="flow-scene-shell">
                    <svg class="flow-scene" viewBox="0 0 1320 700" preserveAspectRatio="xMidYMid meet">
                        <defs>
                            <radialGradient id="flowBgGlow" cx="50%" cy="35%" r="70%">
                                <stop offset="0%" stop-color="rgba(34,197,94,0.12)"/>
                                <stop offset="35%" stop-color="rgba(6,182,212,0.08)"/>
                                <stop offset="100%" stop-color="rgba(15,23,42,0)"/>
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
                        <circle cx="170" cy="92" r="48" fill="rgba(250,204,21,0.22)" filter="url(#flowSoftGlow)"></circle>
                        <circle cx="1110" cy="108" r="42" fill="rgba(192,132,252,0.14)" filter="url(#flowSoftGlow)"></circle>

                        <g class="flow-grid-lines">
                            <path d="M160 130 C 310 180, 455 225, 600 290" class="flow-guide"></path>
                            <path d="M160 150 C 250 255, 330 395, 430 520" class="flow-guide"></path>
                            <path d="M220 112 C 560 80, 850 90, 1080 150" class="flow-guide"></path>
                            <path d="M654 298 C 800 245, 930 205, 1030 210" class="flow-guide"></path>
                            <path d="M655 350 C 810 350, 930 390, 1030 400" class="flow-guide"></path>
                            <path d="M650 400 C 790 465, 910 535, 1030 560" class="flow-guide"></path>
                            <path d="M585 400 C 550 460, 500 500, 446 518" class="flow-guide"></path>
                            <path d="M1098 176 C 960 178, 810 225, 672 300" class="flow-guide"></path>
                            <path d="M650 292 C 815 170, 950 136, 1090 152" class="flow-guide"></path>
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

                        <g class="flow-node solar-node" transform="translate(68 54)">
                            <rect x="0" y="0" width="202" height="128" rx="30" filter="url(#flowCardShadow)"></rect>
                            <text x="34" y="38" class="node-icon">☀</text>
                            <text x="118" y="42" text-anchor="middle" class="node-title">Solar</text>
                            <text x="118" y="82" text-anchor="middle" class="node-value solar">{{ fmtW(flowData.flows.solar_power) }}</text>
                            <text x="118" y="108" text-anchor="middle" class="node-sub node-sub-tight">PV-Leistung jetzt</text>
                        </g>

                        <g class="flow-node house-node" transform="translate(492 224)">
                            <rect x="0" y="0" width="300" height="180" rx="36" filter="url(#flowCardShadow)"></rect>
                            <text x="42" y="46" class="node-icon">⌂</text>
                            <text x="150" y="48" text-anchor="middle" class="node-title">Haus</text>
                            <text x="150" y="94" text-anchor="middle" class="node-value house">{{ fmtW(flowData.home.consumption) }}</text>
                            <text x="150" y="126" text-anchor="middle" class="node-sub node-sub-strong">Aktueller Verbrauch</text>
                            <text x="150" y="154" text-anchor="middle" class="node-sub">Solar {{ fmtW(flowData.flows.solar_to_house) }} · Netz {{ fmtW(flowData.flows.grid_to_house) }}</text>
                        </g>

                        <g v-if="hasBattery" class="flow-node battery-node" transform="translate(270 474)">
                            <rect x="0" y="0" width="246" height="138" rx="30" filter="url(#flowCardShadow)"></rect>
                            <text x="40" y="42" class="node-icon">🔋</text>
                            <text x="122" y="40" class="node-title">Akku</text>
                            <text x="122" y="82" class="node-value battery node-value-compact">{{ batteryStatusText }}</text>
                            <text x="122" y="110" class="node-sub">SOC {{ flowData.battery.soc != null ? flowData.battery.soc.toFixed(0) + '%' : '--' }}</text>
                        </g>

                        <g class="flow-node grid-node" transform="translate(1016 86)">
                            <rect x="0" y="0" width="236" height="156" rx="30" filter="url(#flowCardShadow)"></rect>
                            <text x="38" y="44" class="node-icon">⚡</text>
                            <text x="118" y="42" class="node-title">Netz</text>
                            <text x="118" y="82" class="node-value grid node-value-wide">{{ gridStatusTextPrimary }}</text>
                            <text x="118" y="112" class="node-sub node-sub-strong">{{ gridStatusTextSecondary }}</text>
                            <text x="118" y="134" class="node-sub">{{ gridModeText }}</text>
                        </g>

                        <g v-for="consumer in activeConsumers" :key="consumer.id" class="flow-node consumer-node" :transform="'translate(' + (consumer.x - 112) + ' ' + (consumer.y - 48) + ')'">
                            <rect x="0" y="0" width="220" height="96" rx="24" filter="url(#flowCardShadow)"></rect>
                            <text x="34" y="36" class="node-icon" :style="{ fill: consumer.color }">{{ consumer.icon }}</text>
                            <text x="116" y="34" text-anchor="middle" class="node-title">{{ consumer.label }}</text>
                            <text x="116" y="66" text-anchor="middle" class="node-value" :style="{ fill: consumer.color }">{{ fmtW(consumer.power) }}</text>
                        </g>
                    </svg>
                </div>

                <div class="flow-bottom-stats">
                    <div class="flow-stat">
                        <span class="flow-stat-label">Solar zu Haus</span>
                        <span class="flow-stat-value solar">{{ fmtW(flowData.flows.solar_to_house) }}</span>
                    </div>
                    <div class="flow-stat" v-if="hasBattery">
                        <span class="flow-stat-label">Solar zu Akku</span>
                        <span class="flow-stat-value battery">{{ fmtW(flowData.flows.solar_to_battery) }}</span>
                    </div>
                    <div class="flow-stat">
                        <span class="flow-stat-label">Netz zu Haus</span>
                        <span class="flow-stat-value grid">{{ fmtW(flowData.flows.grid_to_house) }}</span>
                    </div>
                    <div class="flow-stat" v-if="hasBattery">
                        <span class="flow-stat-label">Akku zu Haus</span>
                        <span class="flow-stat-value battery">{{ fmtW(flowData.flows.battery_to_house) }}</span>
                    </div>
                    <div class="flow-stat">
                        <span class="flow-stat-label">Einspeisung</span>
                        <span class="flow-stat-value export">{{ fmtW(flowData.flows.house_to_grid) }}</span>
                    </div>
                </div>
            </div>
        </div>
    `,

    setup() {
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
            return dt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        });

        const hasBattery = computed(() => flowData.battery.soc != null);

        const batteryStatusText = computed(() => {
            const p = Number(flowData.battery.power) || 0;
            if (p > 0) return `Laedt ${fmtW(p)}`;
            if (p < 0) return `Entlaedt ${fmtW(Math.abs(p))}`;
            return 'Standby';
        });

        const gridModeText = computed(() => {
            const importW = Number(flowData.flows.grid_to_house || 0) + Number(flowData.flows.grid_to_battery || 0);
            const exportW = Number(flowData.flows.house_to_grid || 0);
            if (exportW > 0) return 'Rueckspeisung aktiv';
            if (importW > 0) return 'Netzbezug aktiv';
            return 'Nahe Nullpunkt';
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

        const activeConsumers = computed(() => {
            return Object.entries(CONSUMER_META)
                .map(([id, meta]) => {
                    const raw = flowData.consumers[id];
                    if (!raw || !raw.configured) return null;
                    return {
                        id,
                        ...meta,
                        power: Math.max(0, Number(raw.power) || 0),
                    };
                })
                .filter(Boolean);
        });

        const routes = computed(() => {
            const houseCenter = { x: 642, y: 314 };
            const routeList = [
                {
                    id: 'solar-house',
                    d: 'M 258 134 C 398 184, 525 240, 600 294',
                    power: flowData.flows.solar_to_house,
                    theme: 'solar',
                    labelX: 402,
                    labelY: 206,
                },
                {
                    id: 'solar-battery',
                    d: 'M 232 154 C 270 272, 332 406, 392 496',
                    power: flowData.flows.solar_to_battery,
                    theme: 'battery',
                    labelX: 314,
                    labelY: 326,
                },
                {
                    id: 'battery-house',
                    d: 'M 460 494 C 520 452, 572 392, 614 360',
                    power: flowData.flows.battery_to_house,
                    theme: 'battery',
                    labelX: 520,
                    labelY: 436,
                },
                {
                    id: 'solar-grid',
                    d: 'M 260 124 C 560 74, 855 82, 1102 152',
                    power: flowData.flows.house_to_grid,
                    theme: 'export',
                    labelX: 722,
                    labelY: 62,
                },
                {
                    id: 'grid-house',
                    d: 'M 1098 182 C 930 182, 784 234, 684 298',
                    power: (Number(flowData.flows.grid_to_house) || 0) + (Number(flowData.flows.grid_to_battery) || 0),
                    theme: 'grid',
                    labelX: 888,
                    labelY: 224,
                },
            ];

            activeConsumers.value.forEach((consumer) => {
                routeList.push({
                    id: `house-${consumer.id}`,
                    d: `M ${houseCenter.x + 12} ${houseCenter.y + 28} C 780 ${consumer.y - 12}, 900 ${consumer.y}, ${consumer.x - 120} ${consumer.y}`,
                    power: consumer.power,
                    theme: consumer.id === 'wallbox' ? 'consumer-ev' : 'consumer',
                    labelX: 860,
                    labelY: consumer.y - 16,
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
            batteryStatusText,
            gridStatusText,
            gridStatusTextPrimary,
            gridStatusTextSecondary,
            gridModeText,
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
                radial-gradient(circle at top left, rgba(250,204,21,0.06), transparent 30%),
                radial-gradient(circle at top right, rgba(168,85,247,0.08), transparent 28%),
                radial-gradient(circle at bottom center, rgba(6,182,212,0.08), transparent 34%),
                linear-gradient(180deg, rgba(15,23,42,0.96), rgba(18,25,39,0.98));
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
                linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01)),
                rgba(8,12,20,0.65);
            border: 1px solid rgba(255,255,255,0.06);
        }
        .flow-scene {
            display: block;
            width: 100%;
            height: auto;
            min-height: 560px;
        }
        .flow-guide {
            fill: none;
            stroke: rgba(148,163,184,0.08);
            stroke-width: 2;
            stroke-dasharray: 10 12;
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
            fill: rgba(19,25,37,0.92);
            stroke: rgba(255,255,255,0.08);
        }
        .node-icon {
            font-size: 26px;
            fill: var(--text-primary);
            font-weight: 700;
        }
        .node-title {
            fill: var(--text-primary);
            font-size: 26px;
            font-weight: 700;
        }
        .node-value {
            font-size: 30px;
            font-weight: 800;
            font-family: var(--font-mono);
        }
        .node-value-compact {
            font-size: 26px;
        }
        .node-value-wide {
            font-size: 24px;
        }
        .node-value.solar { fill: #facc15; }
        .node-value.house { fill: #22d3ee; }
        .node-value.battery { fill: #4ade80; }
        .node-value.grid { fill: #c084fc; }
        .node-sub {
            fill: var(--text-secondary);
            font-size: 14px;
        }
        .node-sub-tight {
            font-size: 12px;
            letter-spacing: 0.01em;
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
