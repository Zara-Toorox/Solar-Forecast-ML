// Solar Command Center — Smart Charging Page
// (C) 2026 Zara-Toorox

const SmartChargingPage = ((Vue) => {
    const { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } = Vue;

    function getThemeColor(varName, fallback) {
        try {
            const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
            return val || fallback;
        } catch (e) {
            return fallback;
        }
    }

    const _SmartChargingPage = {
        props: ['liveData', 'config'],
        template: `
            <div class="page page-smart-charging">
                <div class="section-header">
                    <h2 class="section-title">{{ $t('nav.smartCharging') }}</h2>
                </div>

                <!-- 1. LIVE STATUS PANEL -->
                <div class="chart-card" style="margin-bottom: var(--space-lg);" v-if="dashboardData.live">
                    <div class="chart-header">
                        <span class="chart-title">🤖 {{ $t('smart_charging.liveStatus') }}</span>
                        <div class="status-badge" :class="statusBadgeClass">
                            {{ statusBadgeText }}
                        </div>
                    </div>

                    <div class="sc-live-grid">
                        <!-- Left: Visual Battery Gauge -->
                        <div class="sc-gauge-section">
                            <div class="sc-gauge-wrap">
                                <svg width="180" height="110" viewBox="0 0 120 80">
                                    <!-- Background half-circle -->
                                    <path d="M 10,70 A 50,50 0 0,1 110,70" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8" stroke-linecap="round"/>
                                    
                                    <!-- Current SoC Path -->
                                    <path d="M 10,70 A 50,50 0 0,1 110,70" fill="none"
                                        stroke="url(#sc-battery-grad)"
                                        stroke-width="8" stroke-linecap="round"
                                        :stroke-dasharray="157.08"
                                        :stroke-dashoffset="157.08 - (157.08 * (currentSoc || 0) / 100)"
                                        style="transition: stroke-dashoffset 1s ease;"/>
                                        
                                    <!-- Target SoC Marker (Nadel/Tick) -->
                                    <g v-if="dashboardData.live.target_soc != null" :transform="getTargetRotation(dashboardData.live.target_soc)">
                                        <line x1="10" y1="70" x2="22" y2="70" stroke="#00d2ff" stroke-width="3" stroke-linecap="round"/>
                                    </g>

                                    <!-- Min SoC Marker -->
                                    <g v-if="dashboardData.live.min_soc != null" :transform="getTargetRotation(dashboardData.live.min_soc)">
                                        <line x1="10" y1="70" x2="18" y2="70" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>
                                    </g>

                                    <!-- Max SoC Marker -->
                                    <g v-if="dashboardData.live.max_soc != null" :transform="getTargetRotation(dashboardData.live.max_soc)">
                                        <line x1="10" y1="70" x2="18" y2="70" stroke="#10b981" stroke-width="2" stroke-linecap="round"/>
                                    </g>

                                    <defs>
                                        <linearGradient id="sc-battery-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stop-color="#ef4444" />
                                            <stop offset="50%" stop-color="#eab308" />
                                            <stop offset="100%" stop-color="#10b981" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div class="sc-gauge-text">
                                    <div class="sc-gauge-value" :style="{ fontSize: (dashboardData.advisor && !dashboardData.advisor.has_battery) ? '1.0rem' : '1.3rem' }">
                                        {{ (dashboardData.advisor && !dashboardData.advisor.has_battery) ? localText('noBattery') : ((currentSoc ?? '--') + '%') }}
                                    </div>
                                    <div class="sc-gauge-label" v-if="!dashboardData.advisor || dashboardData.advisor.has_battery">SoC</div>
                                </div>
                            </div>
                            <div class="sc-gauge-legend" v-if="!dashboardData.advisor || dashboardData.advisor.has_battery">
                                <span class="legend-item"><span class="legend-dot red"></span>Min: {{ dashboardData.live.min_soc }}%</span>
                                <span class="legend-item"><span class="legend-dot blue"></span>{{ $t('smart_charging.target') }}: {{ dashboardData.live.target_soc ?? '--' }}%</span>
                                <span class="legend-item"><span class="legend-dot green"></span>Max: {{ dashboardData.live.max_soc }}%</span>
                            </div>
                            <div class="sc-gauge-legend" v-else>
                                <span style="color: var(--text-muted); font-size: 0.75rem; text-align: center; width: 100%;">
                                    {{ localText('noBatteryDesc') }}
                                </span>
                            </div>
                        </div>

                        <!-- Right: Live Details -->
                        <div class="sc-details-section">
                            <div class="sc-reason-box">
                                <span class="sc-reason-icon">💡</span>
                                <div class="sc-reason-content">
                                    <div class="sc-reason-title">{{ $t('smart_charging.currentAction') }}</div>
                                    <div class="sc-reason-text">{{ translatedReason }}</div>
                                </div>
                            </div>

                            <div class="sc-status-meta">
                                <div class="meta-item">
                                    <span class="meta-label">⚡ {{ $t('smart_charging.currentPrice') }}</span>
                                    <span class="meta-value">{{ formatPrice(dashboardData.live.current_price) }} ct/kWh</span>
                                </div>
                                <div class="meta-item">
                                    <span class="meta-label">🔌 {{ $t('smart_charging.forceChargeThreshold') }}</span>
                                    <span class="meta-value">
                                        {{ (dashboardData.advisor && !dashboardData.advisor.has_battery) ? localText('noBattery') : ('< ' + formatPrice(dashboardData.live.force_charge_price) + ' ct/kWh') }}
                                    </span>
                                </div>
                                <div class="meta-item">
                                    <span class="meta-label">☀️ {{ $t('smart_charging.forecastToday') }}</span>
                                    <span class="meta-value">{{ formatKwh(dashboardData.live.solar_forecast_today_kwh) }}</span>
                                </div>
                                <div class="meta-item">
                                    <span class="meta-label">☀️ {{ $t('smart_charging.forecastTomorrow') }}</span>
                                    <span class="meta-value">{{ formatKwh(dashboardData.live.solar_forecast_tomorrow_kwh) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 2. KPI METRICS -->
                <div class="eb-grid" style="margin-bottom: var(--space-lg);" v-if="dashboardData.kpis">
                    <!-- Period Selection Tabs -->
                    <div style="grid-column: 1 / -1; display: flex; gap: var(--space-sm); margin-bottom: var(--space-sm);">
                        <button v-for="p in periods" :key="p.id"
                                class="nav-tab" style="font-size: 0.8rem; padding: 4px 12px; height: auto;"
                                :class="{ active: selectedPeriod === p.id }"
                                @click="selectedPeriod = p.id">
                            {{ p.label }}
                        </button>
                    </div>

                    <div class="eb-item">
                        <div class="eb-icon">⚡🔋</div>
                        <div class="eb-value" style="color: var(--solar);">
                            {{ (dashboardData.advisor && !dashboardData.advisor.has_battery) ? localText('noBattery') : fmtKwh(currentKpis.charged_kwh) }}
                        </div>
                        <div class="eb-label">{{ $t('smart_charging.gridChargedKwh') }}</div>
                        <div class="eb-sub">{{ $t('smart_charging.chargedInPeriod') }}</div>
                    </div>

                    <div class="eb-item">
                        <div class="eb-icon">💰</div>
                        <div class="eb-value" style="color: #a855f7;">
                            {{ (dashboardData.advisor && !dashboardData.advisor.has_battery) ? localText('noBattery') : (fmtPrice(currentKpis.avg_price_ct) + ' ct') }}
                        </div>
                        <div class="eb-label">{{ $t('smart_charging.avgChargePrice') }}</div>
                        <div class="eb-sub">{{ $t('smart_charging.avgPricePerKwh') }}</div>
                    </div>

                    <div class="eb-item">
                        <div class="eb-icon">💚</div>
                        <div class="eb-value" style="color: #22c55e;">
                            {{ (dashboardData.advisor && !dashboardData.advisor.has_battery) ? localText('noBattery') : fmtEur(currentKpis.savings_eur) }}
                        </div>
                        <div class="eb-label">{{ $t('smart_charging.smartSavings') }}</div>
                        <div class="eb-sub">{{ $t('smart_charging.savedPerPeriod') }}</div>
                    </div>
                </div>

                <!-- 3. INTERACTIVE 48H CHART -->
                <div class="chart-card" style="margin-bottom: var(--space-lg);">
                    <div class="chart-header">
                        <span class="chart-title">📈 {{ $t('smart_charging.chartTitle') }}</span>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">{{ $t('smart_charging.chartSubtitle') }}</span>
                    </div>
                    <div class="sc-chart-target" style="height: 350px; width: 100%;"></div>
                </div>

                <!-- 4. HARDWARE & CAPACITY ADVISOR -->
                <div class="chart-card" v-if="dashboardData.advisor">
                    <div class="chart-header">
                        <span class="chart-title">📊 {{ localText('advisorTitle') }}</span>
                    </div>
                    
                    <div class="sc-advisor-grid">
                        <!-- 4.1 Battery Sizing Card -->
                        <div class="advisor-subcard">
                            <div class="advisor-subcard-header">
                                <span class="subcard-icon">🔋</span>
                                <div>
                                    <div class="subcard-title">{{ localText('batterySizing') }}</div>
                                    <div class="subcard-desc">{{ localText('sizingDesc') }}</div>
                                </div>
                            </div>
                            <div class="advisor-subcard-content">
                                <div class="advisor-metric-row">
                                    <span class="metric-label">{{ localText('fullDays') }}</span>
                                    <span class="metric-value">{{ dashboardData.advisor.has_battery ? (dashboardData.advisor.full_days + ' / ' + dashboardData.advisor.total_days) : localText('noBattery') }}</span>
                                </div>
                                <div class="metric-help-text" v-if="dashboardData.advisor.has_battery">
                                    {{ localText('fullDaysSub').replace('{days}', dashboardData.advisor.full_days).replace('{total}', dashboardData.advisor.total_days).replace('{pct}', dashboardData.advisor.full_days_percent.toFixed(1)) }}
                                </div>
                                
                                <div class="advisor-metric-row">
                                    <span class="metric-label">{{ localText('unboundPotential') }}</span>
                                    <span class="metric-value">{{ dashboardData.advisor.has_battery ? (dashboardData.advisor.potential_kwh.toFixed(1) + ' kWh') : localText('noBattery') }}</span>
                                </div>
                                <div class="metric-help-text" v-if="dashboardData.advisor.has_battery">{{ localText('unboundPotentialSub') }}</div>
                                
                                <div class="advisor-metric-row">
                                    <span class="metric-label">{{ localText('potentialSavings') }}</span>
                                    <span class="metric-value" :style="{ color: dashboardData.advisor.has_battery ? '#22c55e' : 'inherit' }">
                                        {{ dashboardData.advisor.has_battery ? fmtEur(dashboardData.advisor.potential_savings_eur) : localText('noBattery') }}
                                    </span>
                                </div>
                                <div class="metric-help-text" v-if="dashboardData.advisor.has_battery">{{ localText('potentialSavingsSub') }}</div>
                                
                                <div class="advisor-recommendation-box">
                                    <span class="recommendation-badge">{{ localText('sizingRecommendation') }}</span>
                                    <p class="recommendation-text">
                                        {{ getSizingRecommendation() }}
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 4.2 Solar Performance Card -->
                        <div class="advisor-subcard">
                            <div class="advisor-subcard-header">
                                <span class="subcard-icon">☀️</span>
                                <div>
                                    <div class="subcard-title">{{ localText('solarPerformance') }}</div>
                                    <div class="subcard-desc">{{ localText('performanceDesc') }}</div>
                                </div>
                            </div>
                            <div class="advisor-subcard-content">
                                <div class="advisor-metric-row">
                                    <span class="metric-label">{{ localText('totalYield') }}</span>
                                    <span class="metric-value" style="color: var(--solar);">{{ formatKwh(dashboardData.advisor.total_solar_yield_kwh) }}</span>
                                </div>
                                <div class="metric-help-text">{{ localText('totalYieldSub') }}</div>
                                
                                <div class="advisor-metric-row">
                                    <span class="metric-label">{{ localText('avgDailyYield') }}</span>
                                    <span class="metric-value">{{ dashboardData.advisor.avg_solar_yield_kwh.toFixed(2) }} kWh</span>
                                </div>
                                <div class="metric-help-text">{{ localText('avgDailyYieldSub') }}</div>
                                
                                <div class="advisor-metric-row">
                                    <span class="metric-label">{{ localText('houseConsumption') }}</span>
                                    <span class="metric-value">{{ dashboardData.advisor.avg_house_consumption_kwh.toFixed(2) }} kWh</span>
                                </div>
                                <div class="metric-help-text">{{ localText('houseConsumptionSub') }}</div>
                                
                                <div class="advisor-metric-row">
                                    <span class="metric-label">{{ localText('autarkyRate') }}</span>
                                    <span class="metric-value" style="color: #22c55e;">{{ dashboardData.advisor.avg_autarky_percent.toFixed(1) }}%</span>
                                </div>
                                <div class="metric-help-text">{{ localText('autarkyRateSub') }}</div>
                            </div>
                        </div>
                        
                        <!-- 4.3 Battery Throughput & Cycles Card -->
                        <div class="advisor-subcard">
                            <div class="advisor-subcard-header">
                                <span class="subcard-icon">🔄</span>
                                <div>
                                    <div class="subcard-title">{{ localText('batteryThroughput') }}</div>
                                    <div class="subcard-desc">{{ localText('throughputDesc') }}</div>
                                </div>
                            </div>
                            <div class="advisor-subcard-content">
                                <div class="advisor-metric-row">
                                    <span class="metric-label">{{ localText('totalCharged') }}</span>
                                    <span class="metric-value" style="color: #a855f7;">
                                        {{ dashboardData.advisor.has_battery ? formatKwh(dashboardData.advisor.battery_charge_solar_kwh + dashboardData.advisor.battery_charge_grid_kwh) : localText('noBattery') }}
                                    </span>
                                </div>
                                <div class="metric-help-text" v-if="dashboardData.advisor.has_battery">
                                    {{ localText('totalChargedSub').replace('{pv}', getPvChargePercent()).replace('{grid}', getGridChargePercent()) }}
                                </div>
                                
                                <div class="advisor-metric-row">
                                    <span class="metric-label">{{ localText('batteryCycles') }}</span>
                                    <span class="metric-value">{{ dashboardData.advisor.has_battery ? dashboardData.advisor.battery_cycles.toFixed(1) : localText('noBattery') }}</span>
                                </div>
                                <div class="metric-help-text" v-if="dashboardData.advisor.has_battery">
                                    {{ localText('batteryCyclesSub').replace('{cycles}', (dashboardData.advisor.battery_cycles / dashboardData.advisor.total_days).toFixed(2)) }}
                                </div>
                                
                                <!-- Simple Cycle Progress Bar -->
                                <div style="margin-top: var(--space-md);" v-if="dashboardData.advisor.has_battery">
                                    <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-secondary); margin-bottom: 4px;">
                                        <span>PV: {{ getPvChargePercent() }}%</span>
                                        <span>Netz: {{ getGridChargePercent() }}%</span>
                                    </div>
                                    <div style="height: 6px; width: 100%; background: rgba(255,255,255,0.05); border-radius: 3px; display: flex; overflow: hidden;">
                                        <div :style="{ width: getPvChargePercent() + '%', background: 'var(--solar)' }"></div>
                                        <div :style="{ width: getGridChargePercent() + '%', background: '#a855f7' }"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `,

        setup(props) {
            const t = window.SFMLI18n ? window.SFMLI18n.t : (key) => key;

            const dashboardData = reactive({
                live: null,
                kpis: null,
                history: null,
            });

            const selectedPeriod = ref('today');
            const periods = computed(() => [
                { id: 'today',  label: t('common.today') },
                { id: 'week',   label: t('common.thisWeek') },
                { id: 'period', label: t('energy.billingPeriod') },
            ]);

            const currentKpis = computed(() => {
                if (!dashboardData.kpis) return { charged_kwh: 0, avg_price_ct: 0, savings_eur: 0 };
                return dashboardData.kpis[selectedPeriod.value] || { charged_kwh: 0, avg_price_ct: 0, savings_eur: 0 };
            });

            // Robust SoC resolution
            const currentSoc = computed(() => {
                if (dashboardData.live && dashboardData.live.current_soc != null) {
                    return dashboardData.live.current_soc;
                }
                if (props.liveData && props.liveData.battery_soc != null) {
                    return props.liveData.battery_soc;
                }
                return null;
            });

            const statusBadgeClass = computed(() => {
                if (!dashboardData.live || !dashboardData.live.enabled) return 'badge-disabled';
                return dashboardData.live.active ? 'badge-active' : 'badge-standby';
            });

            const statusBadgeText = computed(() => {
                if (!dashboardData.live || !dashboardData.live.enabled) return t('smart_charging.statusDisabled');
                return dashboardData.live.active ? t('smart_charging.statusActive') : t('smart_charging.statusStandby');
            });

            const translatedReason = computed(() => {
                if (!dashboardData.live) return '--';
                if (!dashboardData.live.enabled) return t('smart_charging.reasonDisabled');
                let reason = dashboardData.live.reason;
                if (reason === 'soc_unavailable' && currentSoc.value != null) {
                    reason = 'unknown';
                }
                const reasonKey = `smart_charging.reasons.${reason}`;
                const translation = t(reasonKey);
                return translation !== reasonKey ? translation : reason;
            });

            function getTargetRotation(soc) {
                // Map 0-100% to -180 to 0 degrees rotation
                const degrees = (soc / 100) * 180 - 180;
                return `rotate(${degrees} 60 60)`;
            }

            // Formatting
            function formatPrice(val) {
                return val != null ? val.toFixed(2) : '--';
            }

            function formatKwh(val) {
                return val != null ? val.toFixed(1) + ' kWh' : '--';
            }

            function fmtKwh(val) {
                return val != null ? val.toFixed(1) + ' kWh' : '0.0 kWh';
            }

            function fmtPrice(val) {
                return val != null ? val.toFixed(2) : '0.00';
            }

            function fmtEur(val) {
                return val != null ? val.toFixed(2) + ' €' : '0.00 €';
            }

            // Chart rendering
            let chartInstance = null;

            function renderChart() {
                const el = document.querySelector('.sc-chart-target');
                if (!el || el.offsetWidth === 0 || !dashboardData.history) return;
                
                if (!chartInstance) {
                    chartInstance = echarts.init(el);
                }

                const data = dashboardData.history;
                const times = data.map(h => {
                    const dt = new Date(h.hour_key);
                    return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + (h.is_future ? ' 🔮' : '');
                });

                const prices = data.map(h => h.price_ct_kwh);
                const charging = data.map(h => h.grid_to_battery_kwh);
                const solar = data.map(h => h.solar_yield_kwh);

                // Highlight active windows
                const pieces = [];
                let activeStart = null;
                for (let i = 0; i < data.length; i++) {
                    if (data[i].grid_to_battery_kwh > 0.005) {
                        if (activeStart === null) activeStart = i;
                    } else {
                        if (activeStart !== null) {
                            pieces.push({ gt: activeStart - 1, lte: i, color: 'rgba(34, 197, 94, 0.15)' });
                            activeStart = null;
                        }
                    }
                }
                if (activeStart !== null) {
                    pieces.push({ gt: activeStart - 1, lte: data.length - 1, color: 'rgba(34, 197, 94, 0.15)' });
                }

                const option = {
                    backgroundColor: 'transparent',
                    tooltip: {
                        trigger: 'axis',
                        backgroundColor: getThemeColor('--bg-card', 'rgba(10,14,20,0.95)'),
                        borderColor: getThemeColor('--border-default', 'rgba(255,255,255,0.1)'),
                        textStyle: { color: getThemeColor('--text-primary', '#f0f6fc'), fontFamily: 'var(--font-mono)', fontSize: 11 },
                        formatter: function(params) {
                            let html = '<b>' + params[0].axisValue + '</b>';
                            params.forEach(function(p) {
                                if (p.value != null) {
                                    const valStr = p.seriesName.includes('Preis') ? p.value.toFixed(2) + ' ct/kWh' : p.value.toFixed(3) + ' kWh';
                                    html += '<br/><span style="color:' + p.color + '">● ' + p.seriesName + ': <b>' + valStr + '</b></span>';
                                }
                            });
                            return html;
                        }
                    },
                    legend: {
                        data: [
                            { name: t('smart_charging.chartLegendPrice'), icon: 'line', itemStyle: { color: '#00d2ff' } },
                            { name: t('smart_charging.chartLegendCharging'), icon: 'bar', itemStyle: { color: '#22c55e' } },
                            { name: t('smart_charging.chartLegendSolar'), icon: 'bar', itemStyle: { color: '#f59e0b' } },
                        ],
                        bottom: 0,
                        textStyle: { color: getThemeColor('--text-secondary', '#8b949e'), fontSize: 11 },
                    },
                    grid: { left: 45, right: 45, top: 25, bottom: 45 },
                    xAxis: {
                        type: 'category',
                        data: times,
                        axisLine: { lineStyle: { color: getThemeColor('--border-default', 'rgba(255,255,255,0.1)') } },
                        axisLabel: { color: getThemeColor('--text-secondary', '#8b949e'), fontSize: 9, rotate: 30 },
                    },
                    yAxis: [
                        {
                            type: 'value',
                            name: 'kWh',
                            nameTextStyle: { color: '#8b949e', fontSize: 9 },
                            axisLabel: { color: '#8b949e', fontSize: 9 },
                            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.03)' } },
                        },
                        {
                            type: 'value',
                            name: 'ct/kWh',
                            nameTextStyle: { color: '#8b949e', fontSize: 9 },
                            axisLabel: { color: '#8b949e', fontSize: 9 },
                            splitLine: { show: false },
                        }
                    ],
                    series: [
                        {
                            name: t('smart_charging.chartLegendPrice'),
                            type: 'line',
                            yAxisIndex: 1,
                            data: prices,
                            smooth: true,
                            showSymbol: false,
                            lineStyle: { width: 3, color: '#00d2ff' },
                            itemStyle: { color: '#00d2ff' },
                            markArea: pieces.length > 0 ? {
                                silent: true,
                                data: pieces.map(p => [{ xAxis: times[p.gt >= 0 ? p.gt : 0] }, { xAxis: times[p.lte] }]),
                                itemStyle: { color: 'rgba(0, 210, 255, 0.06)' }
                            } : undefined
                        },
                        {
                            name: t('smart_charging.chartLegendCharging'),
                            type: 'bar',
                            data: charging,
                            stack: 'energy',
                            itemStyle: {
                                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                    { offset: 0, color: '#10b981' },
                                    { offset: 1, color: '#059669' }
                                ]),
                                borderRadius: [3, 3, 0, 0]
                            }
                        },
                        {
                            name: t('smart_charging.chartLegendSolar'),
                            type: 'bar',
                            data: solar,
                            stack: 'energy',
                            itemStyle: {
                                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                    { offset: 0, color: '#f59e0b' },
                                    { offset: 1, color: '#d97706' }
                                ]),
                                borderRadius: [3, 3, 0, 0]
                            }
                        }
                    ]
                };

                chartInstance.setOption(option);
            }

            // Sizing Advisor localization
            const currentLang = window.SFMLI18n ? window.SFMLI18n.locale : 'de';
            const localText = (key) => {
                const bundle = {
                    de: {
                        advisorTitle: "Hardware- & Kapazitäts-Analysen (2026)",
                        batterySizing: "Akku-Dimensionierung",
                        sizingDesc: "Beurteilung der Batteriekapazität",
                        fullDays: "Vollladungs-Tage",
                        fullDaysSub: "Akku an {days} von {total} Tagen voll geladen ({pct}%)",
                        unboundPotential: "Ungenutzter Überschuss",
                        unboundPotentialSub: "Eingespeist bei vollem Akku, das nachts bezogen wurde",
                        potentialSavings: "Ersparnis-Potenzial",
                        potentialSavingsSub: "Mögliche Mehrersparnis durch größeren Akku",
                        sizingRecommendation: "Empfehlung",
                        solarPerformance: "Solar-Jahresbilanz",
                        performanceDesc: "Solar-Kennzahlen seit Jahresbeginn",
                        totalYield: "Gesamt-Ertrag",
                        totalYieldSub: "Erzeugte Solar-Energie seit Jahresbeginn",
                        avgDailyYield: "Tagesertrag Ø",
                        avgDailyYieldSub: "Durchschnittlicher Ertrag pro Tag",
                        houseConsumption: "Hausverbrauch",
                        houseConsumptionSub: "Durchschnittlicher täglicher Bedarf",
                        autarkyRate: "Autarkiequote",
                        autarkyRateSub: "Durchschnittliche Unabhängigkeit vom Netz",
                        batteryThroughput: "Akku-Durchsatz & Zyklen",
                        throughputDesc: "Nutzung und Zyklenbelastung der Batterie",
                        totalCharged: "Gesamt-Ladung",
                        totalChargedSub: "Geladene Energie (PV: {pv}%, Netz: {grid}%)",
                        batteryCycles: "Vollzyklen-Äquivalent",
                        batteryCyclesSub: "Entspricht ca. {cycles} Zyklen pro Tag",
                        sizingGood: "Dein Akku ({cap} kWh) ist optimal dimensioniert. Eine Vergrößerung hätte bisher nur {savings} zusätzliche Ersparnis gebracht.",
                        sizingNeedMore: "Ein größerer Akku könnte sich lohnen! Du hättest in diesem Jahr bereits {savings} sparen können.",
                        noBattery: "Kein Akku",
                        noBatteryDesc: "Keine Akku-Optimierung möglich, da kein Akku konfiguriert ist.",
                    },
                    en: {
                        advisorTitle: "Hardware & Capacity Analysis (2026)",
                        batterySizing: "Battery Sizing",
                        sizingDesc: "Assessment of battery capacity",
                        fullDays: "Full Charge Days",
                        fullDaysSub: "Battery fully charged on {days} of {total} days ({pct}%)",
                        unboundPotential: "Unused Solar Potential",
                        unboundPotentialSub: "Exported while battery full and later imported",
                        potentialSavings: "Potential Savings",
                        potentialSavingsSub: "Possible additional savings with larger battery",
                        sizingRecommendation: "Recommendation",
                        solarPerformance: "Annual Solar Yield",
                        performanceDesc: "Solar metrics since beginning of year",
                        totalYield: "Total Yield",
                        totalYieldSub: "Total generated energy this year",
                        avgDailyYield: "Daily Yield Ø",
                        avgDailyYieldSub: "Average generated energy per day",
                        houseConsumption: "House Consumption",
                        houseConsumptionSub: "Average daily consumption",
                        autarkyRate: "Autarky Rate",
                        autarkyRateSub: "Average grid independence this year",
                        batteryThroughput: "Battery Throughput & Cycles",
                        throughputDesc: "Battery usage and cycle wear",
                        totalCharged: "Total Charged",
                        totalChargedSub: "Charged energy (PV: {pv}%, Netz: {grid}%)",
                        batteryCycles: "Full Cycle Equivalent",
                        batteryCyclesSub: "Equivalent to approx. {cycles} cycles per day",
                        sizingGood: "Your battery ({cap} kWh) is optimally sized. A larger battery would have only saved an additional {savings} so far.",
                        sizingNeedMore: "A larger battery could be worth it! You could have saved an additional {savings} so far this year.",
                        noBattery: "No Battery",
                        noBatteryDesc: "No battery optimization possible because no battery is configured.",
                    }
                };
                const lang = bundle[currentLang] ? currentLang : 'de';
                return bundle[lang][key] || key;
            };

            function getSizingRecommendation() {
                if (!dashboardData.advisor) return '--';
                if (!dashboardData.advisor.has_battery) return localText('noBatteryDesc');
                const { potential_savings_eur, battery_capacity } = dashboardData.advisor;
                if (potential_savings_eur < 15.0) {
                    return localText('sizingGood')
                        .replace('{cap}', battery_capacity.toFixed(1))
                        .replace('{savings}', fmtEur(potential_savings_eur));
                } else {
                    return localText('sizingNeedMore')
                        .replace('{savings}', fmtEur(potential_savings_eur));
                }
            }

            function getPvChargePercent() {
                if (!dashboardData.advisor) return '0';
                const total = dashboardData.advisor.battery_charge_solar_kwh + dashboardData.advisor.battery_charge_grid_kwh;
                if (total <= 0) return '0';
                return ((dashboardData.advisor.battery_charge_solar_kwh / total) * 100).toFixed(0);
            }

            function getGridChargePercent() {
                if (!dashboardData.advisor) return '0';
                const total = dashboardData.advisor.battery_charge_solar_kwh + dashboardData.advisor.battery_charge_grid_kwh;
                if (total <= 0) return '0';
                return ((dashboardData.advisor.battery_charge_grid_kwh / total) * 100).toFixed(0);
            }

            async function loadData() {
                try {
                    const data = await SFMLApi.fetch('/api/sfml_stats/smart_charging/dashboard');
                    if (data && data.success) {
                        dashboardData.live = data.live;
                        dashboardData.kpis = data.kpis;
                        dashboardData.history = data.history;
                        dashboardData.advisor = data.advisor;
                        
                        nextTick(() => {
                            renderChart();
                        });
                    }
                } catch (err) {
                    console.error('Error loading smart charging dashboard data:', err);
                }
            }

            let pollInterval = null;

            onMounted(() => {
                loadData();
                pollInterval = setInterval(loadData, 5000);
                window.addEventListener('resize', () => {
                    if (chartInstance) chartInstance.resize();
                });
            });

            onUnmounted(() => {
                if (pollInterval) clearInterval(pollInterval);
                if (chartInstance) {
                    chartInstance.dispose();
                    chartInstance = null;
                }
            });

            return {
                dashboardData,
                selectedPeriod,
                periods,
                currentKpis,
                currentSoc,
                statusBadgeClass,
                statusBadgeText,
                translatedReason,
                getTargetRotation,
                formatPrice,
                formatKwh,
                fmtKwh,
                fmtPrice,
                fmtEur,
                localText,
                getSizingRecommendation,
                getPvChargePercent,
                getGridChargePercent,
            };
        }
    };

    // Inject Stylesheet dynamically for clean layout component-scoping
    const style = document.createElement('style');
    style.textContent = `
        .sc-live-grid {
            display: grid;
            grid-template-columns: 220px 1fr;
            gap: var(--space-xl);
            align-items: center;
            margin-top: var(--space-md);
        }
        
        .sc-gauge-section {
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .sc-gauge-wrap {
            position: relative;
            width: 180px;
            height: 110px;
            display: flex;
            justify-content: center;
            align-items: flex-end;
        }

        .sc-gauge-text {
            position: absolute;
            bottom: 5px;
            left: 50%;
            transform: translateX(-50%);
            text-align: center;
        }

        .sc-gauge-value {
            font-size: 1.6rem;
            font-weight: 700;
            font-family: var(--font-mono);
            color: var(--text-primary);
        }

        .sc-gauge-label {
            font-size: 0.65rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-top: -2px;
        }

        .sc-gauge-legend {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: var(--space-sm);
            font-size: 0.7rem;
            margin-top: var(--space-sm);
            color: var(--text-secondary);
        }

        .legend-item {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .legend-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            display: inline-block;
        }

        .legend-dot.red { background-color: #ef4444; }
        .legend-dot.blue { background-color: #00d2ff; }
        .legend-dot.green { background-color: #10b981; }

        .sc-details-section {
            display: flex;
            flex-direction: column;
            gap: var(--space-md);
        }

        .sc-reason-box {
            display: flex;
            align-items: center;
            gap: var(--space-md);
            background: rgba(255,255,255,0.02);
            border-radius: var(--radius-md);
            padding: var(--space-md);
            border: 1px solid var(--border-default);
        }

        .sc-reason-icon {
            font-size: 1.6rem;
        }

        .sc-reason-content {
            display: flex;
            flex-direction: column;
        }

        .sc-reason-title {
            font-size: 0.7rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 2px;
        }

        .sc-reason-text {
            font-size: 0.85rem;
            font-weight: 500;
            color: var(--text-primary);
            line-height: 1.3;
        }

        .sc-status-meta {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: var(--space-sm);
        }

        .meta-item {
            display: flex;
            flex-direction: column;
            background: rgba(255,255,255,0.01);
            padding: var(--space-sm) var(--space-md);
            border-radius: var(--radius-sm);
            border: 1px solid rgba(255,255,255,0.02);
        }

        .meta-label {
            font-size: 0.65rem;
            color: var(--text-muted);
            margin-bottom: 2px;
        }

        .meta-value {
            font-size: 0.9rem;
            font-weight: 600;
            font-family: var(--font-mono);
            color: var(--text-primary);
        }

        .status-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .badge-active {
            background: rgba(16, 185, 129, 0.12);
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.25);
        }

        .badge-standby {
            background: rgba(234, 179, 8, 0.12);
            color: #eab308;
            border: 1px solid rgba(234, 179, 8, 0.25);
        }

        .badge-disabled {
            background: rgba(239, 68, 68, 0.12);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.25);
        }

        .sc-advisor-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: var(--space-lg);
            margin-top: var(--space-md);
        }
        
        .advisor-subcard {
            background: rgba(255, 255, 255, 0.015);
            border-radius: var(--radius-md);
            padding: var(--space-lg);
            border: 1px solid var(--border-default);
            transition: border-color 0.3s ease, box-shadow 0.3s ease;
            display: flex;
            flex-direction: column;
            gap: var(--space-md);
        }
        
        .advisor-subcard:hover {
            border-color: var(--border-hover);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }
        
        .advisor-subcard-header {
            display: flex;
            align-items: center;
            gap: var(--space-md);
            border-bottom: 1px solid rgba(255, 255, 255, 0.03);
            padding-bottom: var(--space-md);
        }
        
        .subcard-icon {
            font-size: 1.6rem;
        }
        
        .subcard-title {
            font-size: 0.9rem;
            font-weight: 700;
            color: var(--text-primary);
        }
        
        .subcard-desc {
            font-size: 0.65rem;
            color: var(--text-muted);
            margin-top: 1px;
        }
        
        .advisor-subcard-content {
            display: flex;
            flex-direction: column;
            gap: var(--space-sm);
        }
        
        .advisor-metric-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-top: var(--space-xs);
        }
        
        .metric-label {
            font-size: 0.75rem;
            color: var(--text-secondary);
        }
        
        .metric-value {
            font-size: 1.1rem;
            font-weight: 700;
            font-family: var(--font-mono);
            color: var(--text-primary);
        }
        
        .metric-help-text {
            font-size: 0.62rem;
            color: var(--text-muted);
            margin-top: -6px;
            margin-bottom: var(--space-xs);
            line-height: 1.2;
        }
        
        .advisor-recommendation-box {
            margin-top: var(--space-md);
            padding: var(--space-md);
            background: rgba(0, 210, 255, 0.03);
            border-radius: var(--radius-sm);
            border: 1px solid rgba(0, 210, 255, 0.1);
        }
        
        .recommendation-badge {
            display: inline-block;
            font-size: 0.55rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            background: rgba(0, 210, 255, 0.12);
            color: #00d2ff;
            padding: 2px 6px;
            border-radius: 4px;
            margin-bottom: var(--space-xs);
        }
        
        .recommendation-text {
            font-size: 0.72rem;
            color: var(--text-secondary);
            line-height: 1.35;
            margin: 0;
        }

        @media (max-width: 1024px) {
            .sc-advisor-grid {
                grid-template-columns: 1fr;
                gap: var(--space-md);
            }
        }

        @media (max-width: 768px) {
            .sc-live-grid {
                grid-template-columns: 1fr;
                gap: var(--space-lg);
            }
            .sc-status-meta {
                grid-template-columns: 1fr;
            }
        }
    `;
    document.head.appendChild(style);

    window.SmartChargingPage = _SmartChargingPage;
    return _SmartChargingPage;
})(Vue);
