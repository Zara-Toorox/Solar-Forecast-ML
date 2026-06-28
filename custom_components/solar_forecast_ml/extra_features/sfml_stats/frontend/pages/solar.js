// Solar Analytics Page — SFML Stats V17
// (C) 2026 Zara-Toorox

const SolarPage = ((Vue) => {
const { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } = Vue;

function getThemeColor(varName, fallback) {
    try {
        const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
        return val || fallback;
    } catch (e) {
        return fallback;
    }
}

// Filled in setup() once the active locale is resolved. Keep a fallback for
// helpers that may run before setup.
let MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function forecastBandColor(errorPercent) {
    if (errorPercent == null || Number.isNaN(errorPercent)) return '#8b949e';
    const error = Math.abs(errorPercent);
    if (error <= 15) return '#22c55e';
    if (error <= 25) return '#eab308';
    if (error <= 35) return '#f97316';
    return '#ef4444';
}

function forecastBandBackground(errorPercent) {
    if (errorPercent == null || Number.isNaN(errorPercent)) return 'rgba(139,148,158,0.15)';
    const error = Math.abs(errorPercent);
    if (error <= 15) return 'rgba(34,197,94,0.2)';
    if (error <= 25) return 'rgba(234,179,8,0.2)';
    if (error <= 35) return 'rgba(249,115,22,0.2)';
    return 'rgba(239,68,68,0.2)';
}

function forecastBandColorFromAccuracy(accuracyPercent) {
    if (accuracyPercent == null || Number.isNaN(accuracyPercent)) return '#8b949e';
    return forecastBandColor(100 - accuracyPercent);
}

function forecastBandBackgroundFromAccuracy(accuracyPercent) {
    if (accuracyPercent == null || Number.isNaN(accuracyPercent)) return 'rgba(139,148,158,0.15)';
    return forecastBandBackground(100 - accuracyPercent);
}

function panelGroupSortKey(name) {
    const label = String(name || '').trim();
    const match = label.match(/^gruppe\s+(\d+)$/i);
    if (match) return [0, parseInt(match[1], 10), label.toLowerCase()];
    return [1, Number.MAX_SAFE_INTEGER, label.toLowerCase()];
}

const _SolarPage = {
    props: ['liveData', 'config'],
    template: `
        <div class="page page-solar">
            <div class="section-header">
                <h2 class="section-title">{{ $t('solar.title') }}</h2>
            </div>

            <!-- ========== KARTE 1: MONATLICHER SOLARERTRAG ========== -->
            <div class="chart-card" style="margin-bottom: var(--space-lg);">
                <!-- Datengrundlage Info -->
                <div v-if="dataCoverage" class="data-coverage-bar">
                    {{ $t('solar.dataCoverage', {
                        days: dataCoverage.totalDays,
                        first: dataCoverage.firstDate,
                        last: dataCoverage.lastDate,
                        measured: dataCoverage.measuredMonths,
                        estimated: dataCoverage.estimatedMonths
                    }) }}
                </div>

                <div class="chart-header" style="margin-bottom: var(--space-md);">
                    <span class="chart-title">☀ {{ $t('solar.monthlyYield') }}</span>
                </div>

                <!-- 4 KPI Cards -->
                <div class="annual-kpi-grid">
                    <div class="annual-kpi" style="--kpi-accent: var(--solar);">
                        <div class="annual-kpi-value" style="color: var(--solar);">
                            {{ annualKpis.totalKwh }}
                        </div>
                        <div class="annual-kpi-label">{{ $t('solar.kpi.totalKwh') }}</div>
                    </div>
                    <div class="annual-kpi" style="--kpi-accent: var(--accent); background: rgba(0,212,255,0.08);">
                        <div class="annual-kpi-value" style="color: var(--text-primary); font-size: 1.3rem;">
                            {{ annualKpis.bestMonth }}
                        </div>
                        <div class="annual-kpi-label">{{ $t('solar.kpi.bestMonth') }}</div>
                    </div>
                    <div class="annual-kpi" style="--kpi-accent: var(--price-cheap);">
                        <div class="annual-kpi-value" style="color: var(--price-cheap);">
                            {{ annualKpis.yearKwh }}
                        </div>
                        <div class="annual-kpi-label">2026 kWh</div>
                    </div>
                    <div class="annual-kpi" style="--kpi-accent: #a855f7;">
                        <div class="annual-kpi-value" style="color: #a855f7;">
                            {{ annualKpis.avgMonth }}
                        </div>
                        <div class="annual-kpi-label">{{ $t('solar.kpi.avgPerMonth') }}</div>
                    </div>
                </div>

                <!-- Monthly Bar Chart -->
                <div ref="monthlyChartEl" class="monthly-chart-target" style="height: 320px; width: 100%; margin-top: var(--space-md);"></div>
            </div>

            <!-- ========== KARTE 2: PRODUKTIONS-HEATMAP ========== -->
            <div class="chart-card" style="margin-bottom: var(--space-lg);">
                <div class="chart-header">
                    <span class="chart-title">🔥 {{ $t('solar.productionHeatmap') }}</span>
                </div>
                <div class="heatmap-chart-target" style="height: 320px; width: 100%;"></div>
            </div>

            <!-- ========== KARTE 2b: PROGNOSE-VERGLEICH ========== -->
            <div class="chart-card" style="margin-bottom: var(--space-lg);" v-if="forecastComparisonData">
                <div class="chart-header" style="margin-bottom: var(--space-md);">
                    <span class="chart-title">📊 {{ $t('solar.forecastComparison.title') }}</span>
                    <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: var(--space-sm);">{{ $t('solar.forecastComparison.subtitle') }}</span>
                </div>
                <div ref="comparisonChartEl" class="comparison-chart-target" style="height: 320px; width: 100%;"></div>
            </div>


            <!-- ========== KARTE 3: SCHATTEN-ANALYSE ========== -->
            <div class="chart-card" style="margin-bottom: var(--space-lg);" v-if="shadowStats">
                <div class="chart-header" style="margin-bottom: var(--space-md);">
                    <span class="chart-title">🌑 {{ $t('solar.shadowAnalysis') }}</span>
                </div>

                <!-- Shadow KPIs -->
                <div class="annual-kpi-grid" style="margin-bottom: var(--space-lg);">
                    <div class="annual-kpi" style="--kpi-accent: #ef4444;">
                        <div class="annual-kpi-value" style="color: #ef4444;">{{ shadowStats.totalLoss }}</div>
                        <div class="annual-kpi-label">{{ $t('solar.shadow.lossKwh') }}</div>
                    </div>
                    <div class="annual-kpi" style="--kpi-accent: #f59e0b;">
                        <div class="annual-kpi-value" style="color: #f59e0b;">{{ shadowStats.hours }}</div>
                        <div class="annual-kpi-label">{{ $t('solar.shadow.hours') }}</div>
                    </div>
                    <div class="annual-kpi" style="--kpi-accent: #8b949e;">
                        <div class="annual-kpi-value" style="color: #8b949e;">{{ shadowStats.efficiency }}%</div>
                        <div class="annual-kpi-label">{{ $t('solar.shadow.avgEfficiency') }}</div>
                    </div>
                    <div class="annual-kpi" style="--kpi-accent: #06b6d4;">
                        <div class="annual-kpi-value" style="color: #06b6d4;">{{ shadowStats.daysLearned }}</div>
                        <div class="annual-kpi-label">{{ $t('solar.shadow.aiLearningDays') }}</div>
                    </div>
                </div>

                <!-- Shadow Charts: Causes Donut + Daily Loss -->
                <div style="display: grid; grid-template-columns: 1fr 2fr; gap: var(--space-lg);" class="shadow-charts-row">
                    <div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: var(--space-sm);">{{ $t('solar.shadow.causes') }}</div>
                        <div class="shadow-causes-target" style="height: 250px; width: 100%;"></div>
                    </div>
                    <div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: var(--space-sm);">{{ $t('solar.shadow.dailyLoss') }}</div>
                        <div class="shadow-loss-target" style="height: 250px; width: 100%;"></div>
                    </div>
                </div>
            </div>

            <!-- ========== KARTE 3b: SCHATTEN-FINGERPRINT (Monat × Stunde) ========== -->
            <div class="chart-card" style="margin-bottom: var(--space-lg);" v-if="shadowFingerprint.seasonal.length > 0">
                <div class="chart-header" style="margin-bottom: var(--space-md);">
                    <span class="chart-title">🌓 {{ $t('solar.fingerprint.title') }}</span>
                    <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: var(--space-sm);">{{ $t('solar.fingerprint.subtitle', { samples: shadowFingerprint.summary.total_samples || 0 }) }}</span>
                </div>

                <!-- Fingerprint KPIs -->
                <div class="annual-kpi-grid" style="margin-bottom: var(--space-md);">
                    <div class="annual-kpi" style="--kpi-accent: #ef4444;">
                        <div class="annual-kpi-value" style="color: #ef4444;">{{ shadowFingerprint.summary.fixed_obstructions || 0 }}</div>
                        <div class="annual-kpi-label">{{ $t('solar.fingerprint.fixedObstructions') }}</div>
                    </div>
                    <div class="annual-kpi" style="--kpi-accent: #f59e0b;">
                        <div class="annual-kpi-value" style="color: #f59e0b;">{{ shadowFingerprint.summary.shadow_hours || 0 }}h</div>
                        <div class="annual-kpi-label">{{ $t('solar.shadow.hours') }}</div>
                    </div>
                    <div class="annual-kpi" style="--kpi-accent: #a855f7;">
                        <div class="annual-kpi-value" style="color: #a855f7; font-size: 1.2rem;">{{ shadowFingerprint.summary.first_learned || '--' }}</div>
                        <div class="annual-kpi-label">{{ $t('solar.fingerprint.sinceLearned') }}</div>
                    </div>
                    <div class="annual-kpi" style="--kpi-accent: #06b6d4;">
                        <div class="annual-kpi-value" style="color: #06b6d4;">{{ shadowFingerprint.maxIntensity }}%</div>
                        <div class="annual-kpi-label">{{ $t('solar.fingerprint.maxShadow') }}</div>
                    </div>
                </div>

                <!-- Heatmap: Monat × Stunde -->
                <div ref="shadowFingerprintEl" style="height: 340px; width: 100%;"></div>

                <!-- Pattern Legend + Insights -->
                <div class="shadow-insights" v-if="shadowFingerprint.insights.length">
                    <div class="shadow-insights-title">💡 {{ $t('solar.fingerprint.patternsTitle') }}</div>
                    <div class="shadow-insights-list">
                        <div v-for="ins in shadowFingerprint.insights" :key="ins.hour" class="shadow-insight-item" :class="'insight-' + ins.severity">
                            <span class="insight-time">{{ ins.hour }}:00</span>
                            <span class="insight-text">{{ ins.text }}</span>
                            <span class="insight-pct">{{ ins.avg_percent }}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ========== KARTE 3c: SCHATTEN-WANDERUNG ========== -->
            <div class="chart-card" style="margin-bottom: var(--space-lg);" v-if="shadowMovement.loaded">
                <div class="chart-header" style="margin-bottom: var(--space-md);">
                    <span class="chart-title">🌗 {{ $t('solar.movement.title') }}</span>
                    <div class="sm-date-bar">
                        <button v-for="d in shadowMovement.availableDates" :key="d.key"
                                class="sm-mode-btn" :class="{ active: shadowMovement.selectedDate === d.key }"
                                @click="smSelectDate(d.key)">{{ d.label }}</button>
                        <button class="sm-mode-btn" :class="{ active: shadowMovement.selectedDate === 'typical' }"
                                @click="smSelectDate('typical')">{{ $t('solar.movement.typical') }}</button>
                    </div>
                </div>

                <div class="annual-kpi-grid" style="margin-bottom: var(--space-md);">
                    <div class="annual-kpi" style="--kpi-accent: #fbbf24;">
                        <div class="annual-kpi-value" style="color: #fbbf24;">{{ shadowMovement.currentHour }}:00</div>
                        <div class="annual-kpi-label">{{ $t('solar.movement.time') }}</div>
                    </div>
                    <div class="annual-kpi" style="--kpi-accent: #ef4444;">
                        <div class="annual-kpi-value" :style="{ color: smLossColor }">
                            {{ shadowMovement.hourData.shadowPct }}%
                        </div>
                        <div class="annual-kpi-label">{{ $t('solar.movement.shading') }}</div>
                    </div>
                    <div class="annual-kpi" style="--kpi-accent: #22c55e;">
                        <div class="annual-kpi-value" style="color: #22c55e;">
                            {{ shadowMovement.hourData.efficiency }}%
                        </div>
                        <div class="annual-kpi-label">{{ $t('solar.movement.efficiency') }}</div>
                    </div>
                    <div class="annual-kpi" style="--kpi-accent: #f59e0b;">
                        <div class="annual-kpi-value" style="color: #f59e0b; font-size: 1.1rem;">
                            {{ shadowMovement.hourData.cause }}
                        </div>
                        <div class="annual-kpi-label">{{ $t('solar.movement.cause') }}</div>
                    </div>
                </div>

                <div class="sm-panel-container">
                    <div class="sm-scene-header">
                        <div>
                            <div class="sm-scene-title">{{ $t('solar.movement.dailyByGroup') }}</div>
                            <div class="sm-scene-subtitle">{{ smSceneModeLabel }}</div>
                        </div>
                        <div class="sm-scene-badges">
                            <span class="sm-badge">{{ shadowMovement.hourData.panels.length }} {{ $t('settings.groupsSuffix') }}</span>
                            <span class="sm-badge" :class="smCauseBadgeClass">{{ shadowMovement.hourData.shadowPct }}% {{ $t('solar.movement.shadowShort') }}</span>
                        </div>
                    </div>

                    <div class="sm-sun-track">
                        <div class="sm-sun-line"></div>
                        <div class="sm-sun-glow" :style="{ left: smSunPosition + '%' }"></div>
                        <div class="sm-sun" :style="{ left: smSunPosition + '%' }">☀</div>
                    </div>

                    <div class="sm-panels" :class="'sm-panels-count-' + shadowMovement.hourData.panels.length">
                        <div
                            v-for="panel in shadowMovement.hourData.panels"
                            :key="panel.name"
                            class="sm-panel"
                            :style="smPanelStyle(panel)"
                        >
                            <div class="sm-panel-top">
                                <div class="sm-panel-label">{{ panel.name }}</div>
                                <div class="sm-panel-status" :class="'severity-' + panel.severity">{{ panel.statusLabel }}</div>
                            </div>
                            <div class="sm-panel-eff" :style="{ color: smEffColor(panel.efficiencyValue) }">
                                {{ panel.efficiencyLabel }}
                            </div>
                            <div class="sm-panel-kwh">{{ panel.actualLabel }} kWh</div>
                            <div class="sm-panel-meter">
                                <div class="sm-panel-meter-fill" :style="smPanelMeterStyle(panel)"></div>
                            </div>
                            <div class="sm-panel-meta">
                                <span>{{ panel.shadowLabel }}</span>
                                <span>{{ panel.sourceLabel }}</span>
                            </div>
                            <div class="sm-panel-shadow-overlay"
                                 :style="{ opacity: (panel.shadowPct || 0) / 100 }"></div>
                        </div>
                    </div>

                    <div class="sm-loss-bar" v-if="shadowMovement.hourData.lossKwh > 0">
                        <span style="color: #ef4444;">▼ {{ shadowMovement.hourData.lossKwh }} kWh {{ $t('solar.movement.loss') }}</span>
                    </div>
                </div>

                <div class="sm-slider-container">
                    <div class="sm-controls">
                        <button class="sm-play-btn" @click="smToggleAutoPlay">
                            {{ shadowMovement.playing ? '⏸' : '▶' }}
                        </button>
                        <input type="range" class="sm-slider" min="6" max="20"
                               :value="shadowMovement.currentHour"
                               @input="smOnSlider($event.target.value)" />
                    </div>
                    <div class="sm-hour-labels">
                        <span v-for="h in smHourRange" :key="h"
                              :class="{ 'sm-hour-active': h === shadowMovement.currentHour }"
                              @click="smOnSlider(h)">{{ h }}</span>
                    </div>
                </div>

                <div class="sm-timeline-target" style="height: 60px; width: 100%; margin-top: var(--space-sm);"></div>
            </div>

            <!-- ========== KARTE 4: WOCHEN-TABELLE ========== -->
            <div class="chart-card" v-if="weeklyRows.length > 0">
                <div class="chart-header" style="margin-bottom: var(--space-md);">
                    <span class="chart-title">📅 {{ $t('solar.weeklyTable.title') }}</span>
                </div>
                <div class="data-table-scroll">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>{{ $t('solar.weeklyTable.day') }}</th>
                            <th>{{ $t('common.yield') }}</th>
                            <th>{{ $t('common.forecast') }}</th>
                            <th>{{ $t('solar.weeklyTable.yieldDelta') }}</th>
                            <th>{{ $t('solar.weeklyTable.forecastError') }}</th>
                            <th>{{ $t('solar.weeklyTable.forecastQuality') }}</th>
                            <th>{{ $t('solar.weeklyTable.learningBasis') }}</th>
                            <th>{{ $t('solar.weeklyTable.discarded') }}</th>
                            <th>{{ $t('common.peak') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(row, idx) in weeklyRows" :key="idx" :class="{ 'zebra-odd': idx % 2 === 1 }">
                            <td style="font-weight: 600;">{{ row.day }}</td>
                            <td style="font-family: var(--font-mono);">{{ row.actual }} kWh</td>
                            <td style="font-family: var(--font-mono); color: var(--text-secondary);">{{ row.forecast }} kWh</td>
                            <td :style="{ fontFamily: 'var(--font-mono)', color: row.deltaColor }">
                                {{ row.delta > 0 ? '+' : '' }}{{ row.delta }}%
                            </td>
                            <td :style="{ fontFamily: 'var(--font-mono)', color: row.forecastErrorColor }">
                                {{ row.forecastErrorText }}
                            </td>
                            <td><span class="accuracy-badge" :style="{ background: row.accuracyBg, color: row.accuracyColor }">{{ row.accuracy }}</span></td>
                            <td style="font-family: var(--font-mono); color: var(--text-secondary);">{{ row.learningBasis }}</td>
                            <td style="font-family: var(--font-mono); color: var(--text-secondary);">{{ row.discardedLearning }}</td>
                            <td style="font-family: var(--font-mono); color: var(--text-secondary); font-size: 0.85rem;">{{ row.peak }}</td>
                        </tr>
                    </tbody>
                </table>
                </div>
            </div>

            <!-- ========== KARTE 5: JAHRESÜBERSICHT ========== -->
            <div class="chart-card" style="margin-top: var(--space-lg);" v-if="yearOverview">
                <div class="chart-header" style="margin-bottom: var(--space-md);">
                    <span class="chart-title">📈 {{ $t('solar.yearOverview.title') }}</span>
                </div>

                <!-- Top Row: 3 Prognose KPIs -->
                <div class="annual-kpi-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: var(--space-md);">
                    <div class="annual-kpi" style="border-left: 3px solid #fbbf24;">
                        <div class="annual-kpi-value" style="color: #fbbf24;">{{ yearOverview.optimistic }} kWh</div>
                        <div class="annual-kpi-label">{{ $t('solar.yearOverview.optimistic') }}</div>
                    </div>
                    <div class="annual-kpi" style="border-left: 3px solid #22c55e;">
                        <div class="annual-kpi-value" style="color: #22c55e;">{{ yearOverview.expected }} kWh</div>
                        <div class="annual-kpi-label">{{ $t('solar.yearOverview.expected') }}</div>
                    </div>
                    <div class="annual-kpi" style="border-left: 3px solid #ef4444;">
                        <div class="annual-kpi-value" style="color: #ef4444;">{{ yearOverview.pessimistic }} kWh</div>
                        <div class="annual-kpi-label">{{ $t('solar.yearOverview.pessimistic') }}</div>
                    </div>
                </div>

                <!-- Bottom Row: 3 System KPIs -->
                <div class="annual-kpi-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: var(--space-md);">
                    <div class="annual-kpi" style="border-left: 3px solid #fbbf24;">
                        <div class="annual-kpi-value" style="color: #fbbf24; font-size: 1.3rem;">{{ yearOverview.bestDay }} kWh</div>
                        <div class="annual-kpi-label">{{ $t('solar.yearOverview.recordDay') }} ({{ yearOverview.bestDayDate }})</div>
                    </div>
                    <div class="annual-kpi">
                        <div class="annual-kpi-value" style="font-size: 1.3rem;">{{ yearOverview.peakPower }} W</div>
                        <div class="annual-kpi-label">{{ $t('solar.yearOverview.peakPower') }}</div>
                    </div>
                    <div class="annual-kpi" style="border-left: 3px solid #22c55e;">
                        <div class="annual-kpi-value" style="color: #22c55e; font-size: 1.3rem;">{{ yearOverview.installedKwp }} kWp</div>
                        <div class="annual-kpi-label">{{ $t('solar.yearOverview.installedPower') }}</div>
                    </div>
                </div>

                <!-- Panel Groups -->
                <div v-if="yearOverview.panelGroups.length > 0" class="annual-kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
                    <div class="annual-kpi" v-for="pg in yearOverview.panelGroups" :key="pg.name"
                         style="background: linear-gradient(135deg, rgba(139,92,246,0.06), rgba(6,182,212,0.06));">
                        <div class="annual-kpi-value" style="font-size: 1.1rem; color: var(--text-primary);">{{ pg.name }}</div>
                        <div class="annual-kpi-label" style="margin-top: var(--space-sm);">
                            {{ $t('solar.yearOverview.factorSamples', { factor: pg.factor, samples: pg.samples }) }}
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

        // Localize month-short names at the active locale.
        MONTH_NAMES = ['shortJan','shortFeb','shortMar','shortApr','shortMay','shortJun',
                       'shortJul','shortAug','shortSep','shortOct','shortNov','shortDec'].map(k => t('months.' + k));

        const monthlyChartEl = ref(null);
        let monthlyChart = null;

        const comparisonChartEl = ref(null);
        let comparisonChart = null;
        const forecastComparisonData = ref(null);

        const annualData = ref(null);

        const dataCoverage = computed(() => {
            const d = annualData.value?.data_coverage;
            if (!d) return null;
            return {
                totalDays: d.total_measured_days || 0,
                firstDate: d.first_date || '--',
                lastDate: d.last_date || '--',
                measuredMonths: d.measured_months || 0,
                estimatedMonths: d.estimated_months || 0,
            };
        });

        const annualKpis = computed(() => {
            const a = annualData.value;
            if (!a) return { totalKwh: '--', bestMonth: '--', yearKwh: '--', avgMonth: '--' };

            const months = a.months || [];
            const measured = months.filter(m => m.source === 'measured');
            const totalMeasured = measured.reduce((s, m) => s + (m.measured_yield_kwh || 0), 0);

            // Best month
            let bestMonthName = '--';
            if (a.annual?.best_month) {
                bestMonthName = MONTH_NAMES[(a.annual.best_month - 1) % 12] + ' 2026';
            } else if (months.length > 0) {
                const sorted = [...months].sort((a, b) => (b.projected_yield_kwh || 0) - (a.projected_yield_kwh || 0));
                bestMonthName = MONTH_NAMES[(sorted[0].month - 1) % 12] + ' ' + sorted[0].year;
            }

            // Year 2026 total
            const year2026 = months.filter(m => m.year === 2026).reduce((s, m) => s + (m.projected_yield_kwh || 0), 0);

            // Average per month (measured only)
            const avgPerMonth = measured.length > 0 ? totalMeasured / measured.length : 0;

            return {
                totalKwh: Math.round(totalMeasured),
                bestMonth: bestMonthName,
                yearKwh: Math.round(year2026),
                avgMonth: avgPerMonth.toFixed(1),
            };
        });

        // Real monthly data from daily_summaries (grouped by year)
        const monthlyByYear = ref([]);
        const shadowStats = ref(null);
        const weeklyRows = ref([]);
        const shadowData = ref(null);
        const solarDailyData = ref(null);

        // Shadow Fingerprint (new) -----------------------------------
        const shadowFingerprintEl = ref(null);
        let shadowFingerprintChart = null;
        const shadowFingerprint = reactive({
            hourly: [],
            seasonal: [],
            summary: {},
            insights: [],
            maxIntensity: 0,
        });
        // Reuse the locale-aware short months from setup.
        const MONTH_SHORT = MONTH_NAMES;

        async function loadShadowFingerprint() {
            try {
                const res = await SFMLApi.fetch('/api/sfml_stats/solar/shadow_fingerprint', { forceRefresh: true });
                if (!res || !res.success) return;
                shadowFingerprint.hourly = res.hourly || [];
                shadowFingerprint.seasonal = res.seasonal || [];
                shadowFingerprint.summary = res.summary || {};
                shadowFingerprint.maxIntensity = shadowFingerprint.seasonal.length
                    ? Math.round(Math.max(...shadowFingerprint.seasonal.map(s => s.intensity || 0)))
                    : 0;
                shadowFingerprint.insights = buildInsights(shadowFingerprint.hourly);

                await nextTick();
                // Two-phase render: first initialize when DOM is ready, then re-render after layout stabilizes
                setTimeout(() => {
                    renderShadowFingerprint();
                    setTimeout(() => shadowFingerprintChart?.resize(), 100);
                }, 50);
            } catch (e) {
                console.error('Shadow fingerprint load error:', e);
            }
        }

        function buildInsights(hourly) {
            return hourly
                .filter(h => h.pattern === 'fixed_obstruction' && h.avg_percent > 10)
                .map(h => {
                    let text, severity;
                    if (h.avg_percent >= 80) {
                        text = t('solar.fingerprint.insight.full');
                        severity = 'high';
                    } else if (h.avg_percent >= 40) {
                        text = t('solar.fingerprint.insight.strong');
                        severity = 'high';
                    } else {
                        text = t('solar.fingerprint.insight.recurring');
                        severity = 'mid';
                    }
                    return { hour: h.hour, avg_percent: h.avg_percent, text, severity };
                })
                .sort((a, b) => a.hour - b.hour);
        }

        function renderShadowFingerprint() {
            if (!shadowFingerprintEl.value || !shadowFingerprint.seasonal.length) return;
            if (!shadowFingerprintChart) shadowFingerprintChart = echarts.init(shadowFingerprintEl.value);

            // Filter out empty (0-intensity) cells. ECharts heatmap expects strict [x, y, value].
            const filtered = shadowFingerprint.seasonal.filter(s => (s.intensity || 0) > 0.5);
            const data = filtered.map(s => [s.hour, s.month - 1, s.intensity]);
            // Side-table for tooltip enrichment (lookup by "hour-month")
            const metaMap = {};
            filtered.forEach(s => { metaMap[`${s.hour}-${s.month - 1}`] = s; });
            const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

            shadowFingerprintChart.setOption({
                backgroundColor: 'transparent',
                grid: { left: 60, right: 40, top: 30, bottom: 60 },
                tooltip: {
                    backgroundColor: getThemeColor('--bg-app', 'rgba(10,14,20,0.95)'),
                    borderColor: getThemeColor('--border-default', 'rgba(255,255,255,0.1)'),
                    textStyle: { color: getThemeColor('--text-primary', '#f0f6fc') },
                    formatter: (p) => {
                        const d = metaMap[`${p.data[0]}-${p.data[1]}`] || {};
                        return `<b>${MONTH_SHORT[p.data[1]]} · ${hours[p.data[0]]}:00</b><br/>`
                            + `${t('solar.fingerprint.tooltipShadow')}: <b>${d.avg_percent || 0}%</b><br/>`
                            + `${t('solar.fingerprint.tooltipFrequency')}: ${((d.rate || 0) * 100).toFixed(0)}%<br/>`
                            + `${t('solar.fingerprint.tooltipCause')}: <b>${d.cause || '--'}</b><br/>`
                            + `${t('solar.fingerprint.tooltipSamples')}: ${d.samples || 0} · ${t('solar.fingerprint.tooltipConfidence')}: ${((d.confidence || 0) * 100).toFixed(0)}%`;
                    },
                },
                xAxis: {
                    type: 'category', data: hours,
                    axisLabel: { color: getThemeColor('--text-secondary', '#94a3b8'), interval: 1, fontSize: 10 },
                    axisLine: { lineStyle: { color: getThemeColor('--border-default', '#334155') } },
                    axisTick: { show: false },
                },
                yAxis: {
                    type: 'category', data: MONTH_SHORT,
                    axisLabel: { color: getThemeColor('--text-secondary', '#94a3b8') },
                    axisLine: { lineStyle: { color: getThemeColor('--border-default', '#334155') } },
                    axisTick: { show: false },
                },
                visualMap: {
                    min: 5, max: 100, calculable: true, orient: 'horizontal',
                    left: 'center', bottom: 5,
                    textStyle: { color: getThemeColor('--text-secondary', '#94a3b8') },
                    itemWidth: 20,
                    inRange: {
                        color: ['#1e40af', '#7c3aed', '#db2777', '#ea580c', '#dc2626'],
                    },
                    text: [t('solar.fingerprint.visualMapHigh'), t('solar.fingerprint.visualMapLow')],
                },
                series: [{
                    name: t('solar.fingerprint.tooltipShadow'),
                    type: 'heatmap',
                    data,
                    label: { show: false },
                    emphasis: { itemStyle: { borderColor: '#fff', borderWidth: 2 } },
                }],
            });
            shadowFingerprintChart.resize();
        }

        // === SCHATTEN-WANDERUNG ===
        const smHourRange = Array.from({ length: 15 }, (_, i) => i + 6);
        const smCurrentMonthName = MONTH_NAMES[new Date().getMonth()];
        let smTimeline = null;
        let smAutoPlayTimer = null;

        const shadowMovement = reactive({
            loaded: false,
            selectedDate: null,
            currentHour: new Date().getHours() >= 6 && new Date().getHours() <= 20 ? new Date().getHours() : 12,
            playing: false,
            groupNames: [],
            availableDates: [],
            allDates: {},
            hourData: {
                shadowPct: 0, efficiency: 100, cause: '--', lossKwh: 0,
                panels: [],
            },
            typicalData: {},
        });

        const smSunPosition = computed(() => ((shadowMovement.currentHour - 6) / 14) * 100);

        const smLossColor = computed(() => {
            const p = shadowMovement.hourData.shadowPct;
            if (p >= 60) return '#ef4444';
            if (p >= 30) return '#f59e0b';
            if (p > 5) return '#eab308';
            return '#22c55e';
        });
        const smSceneModeLabel = computed(() => shadowMovement.selectedDate === 'typical'
            ? t('solar.movement.sceneTypical')
            : t('solar.movement.sceneHourly'));
        const smCauseBadgeClass = computed(() => {
            const p = shadowMovement.hourData.shadowPct || 0;
            if (p >= 60) return 'severity-heavy';
            if (p >= 30) return 'severity-medium';
            if (p > 5) return 'severity-light';
            return 'severity-clear';
        });

        function smEffColor(v) {
            if (typeof v !== 'number') return '#94a3b8';
            if (v >= 85) return '#22c55e';
            if (v >= 60) return '#eab308';
            return '#ef4444';
        }
        function smShadowSeverity(shadowPct, hasData) {
            if (!hasData) return 'nodata';
            if (hasData === 'forecast_only') return 'forecast';
            if (shadowPct >= 60) return 'heavy';
            if (shadowPct >= 30) return 'medium';
            if (shadowPct > 5) return 'light';
            return 'clear';
        }
        function smShadowStatusLabel(shadowPct, hasData) {
            const severity = smShadowSeverity(shadowPct, hasData);
            if (severity === 'nodata') return t('common.noData');
            if (severity === 'forecast') return t('solar.movement.forecastOnly');
            if (severity === 'heavy') return t('solar.movement.heavyShaded');
            if (severity === 'medium') return t('solar.movement.partiallyShaded');
            if (severity === 'light') return t('solar.movement.lightlyShaded');
            return t('solar.movement.clear');
        }
        function smPanelBg(eff) {
            const a = 0.15 * (eff / 100);
            const b = 0.05 * (eff / 100);
            return { background: 'linear-gradient(180deg, rgba(251,191,36,' + a + '), rgba(251,191,36,' + b + '))' };
        }

        function smFormatPanel(panelName, rawPanel, fallbackShadowPct = 0) {
            const panel = rawPanel || {};
            const hasActual = panel.actual != null && panel.actual > 0;
            const hasPrediction = panel.prediction != null && panel.prediction > 0;
            const hasAnySignal = hasActual || hasPrediction || fallbackShadowPct > 0;
            const statusMode = hasActual ? true : (hasPrediction ? 'forecast_only' : hasAnySignal);
            const efficiencyValue = hasActual && typeof panel.efficiency === 'number'
                ? panel.efficiency
                : null;
            const shadowPct = hasActual ? (panel.shadow_pct || 0) : (hasPrediction ? null : fallbackShadowPct);
            return {
                name: panelName,
                efficiencyValue,
                efficiencyLabel: hasActual && typeof panel.efficiency === 'number'
                    ? `${panel.efficiency}%`
                    : '--',
                shadowPct,
                shadowLabel: shadowPct == null ? t('solar.movement.shadowUnknown') : `${Math.round(shadowPct || 0)}% ${t('solar.movement.shadowShort')}`,
                actualLabel: hasActual
                    ? panel.actual.toFixed(3)
                    : (hasPrediction ? `~${panel.prediction.toFixed(3)}` : '--'),
                sourceLabel: hasActual ? t('solar.movement.actual') : (hasPrediction ? t('solar.movement.forecastValue') : t('common.noData')),
                severity: smShadowSeverity(shadowPct || 0, statusMode),
                statusLabel: smShadowStatusLabel(shadowPct || 0, statusMode),
            };
        }

        function smBuildPanelsFromGroups(groups, fallbackShadowPct = 0) {
            const orderedNames = shadowMovement.groupNames.length
                ? shadowMovement.groupNames
                : Object.keys(groups || {});
            return orderedNames.map((name, index) => {
                const fallbackName = name || `Gruppe ${index + 1}`;
                return smFormatPanel(fallbackName, groups?.[name], fallbackShadowPct);
            });
        }

        function smPanelStyle(panel) {
            return smPanelBg(panel?.efficiencyValue || 0);
        }
        function smPanelMeterStyle(panel) {
            const width = typeof panel?.efficiencyValue === 'number'
                ? Math.max(0, Math.min(100, panel.efficiencyValue))
                : 0;
            return {
                width: `${width}%`,
                background: typeof panel?.efficiencyValue !== 'number'
                    ? 'linear-gradient(90deg, rgba(148,163,184,0.45), rgba(148,163,184,0.2))'
                    : width >= 85
                        ? 'linear-gradient(90deg, rgba(34,197,94,0.95), rgba(74,222,128,0.85))'
                        : width >= 60
                            ? 'linear-gradient(90deg, rgba(234,179,8,0.95), rgba(251,191,36,0.85))'
                            : 'linear-gradient(90deg, rgba(239,68,68,0.95), rgba(248,113,113,0.85))',
            };
        }

        async function loadShadowMovement() {
            try {
                const [movement, fingerprint] = await Promise.all([
                    SFMLApi.fetch('/api/sfml_stats/solar/shadow_movement?days=7', { forceRefresh: true }),
                    SFMLApi.fetch('/api/sfml_stats/solar/shadow_fingerprint', { forceRefresh: true }),
                ]);

                if (movement?.success) {
                    shadowMovement.allDates = movement.dates || {};
                    shadowMovement.groupNames = movement.groups || [];
                    const avail = movement.available_dates || [];
                    const weekdayFmt = new Intl.DateTimeFormat(bcp(locale.value), { weekday: 'short' });
                    shadowMovement.availableDates = avail.map(d => {
                        const dt = new Date(d + 'T00:00:00');
                        const today = new Date().toISOString().slice(0, 10);
                        const label = d === today ? t('common.today') : weekdayFmt.format(dt) + ' ' + dt.getDate() + '.' + (dt.getMonth() + 1);
                        return { key: d, label };
                    });
                    shadowMovement.selectedDate = movement.selected_date || avail[avail.length - 1] || null;
                }

                const month = new Date().getMonth() + 1;
                (fingerprint?.seasonal || []).filter(s => s.month === month).forEach(s => {
                    shadowMovement.typicalData[s.hour] = {
                        shadowPct: Math.round(s.avg_percent || s.intensity || 0),
                        cause: SHADOW_CAUSE_LABELS[s.cause] || s.cause || '--',
                        rate: Math.round((s.rate || 0) * 100),
                    };
                });

                shadowMovement.loaded = true;
                smUpdateHour(shadowMovement.currentHour);
                await nextTick();
                setTimeout(() => smRenderTimeline(), 150);
            } catch (e) {
                console.error('[SolarPage] shadow movement load error:', e);
            }
        }

        function smSelectDate(key) {
            shadowMovement.selectedDate = key;
            smUpdateHour(shadowMovement.currentHour);
            smRenderTimeline();
        }

        function smGetCurrentDateData() {
            const sel = shadowMovement.selectedDate;
            if (!sel || sel === 'typical') return null;
            return shadowMovement.allDates[sel] || null;
        }

        function smUpdateHour(hour) {
            shadowMovement.currentHour = parseInt(hour);
            const h = String(shadowMovement.currentHour);

            if (shadowMovement.selectedDate !== 'typical') {
                const dateData = smGetCurrentDateData();
                const hd = dateData ? dateData[h] : null;
                if (hd) {
                    const groups = hd.groups || {};
                    const sh = hd.shadow || {};
                    const panels = smBuildPanelsFromGroups(groups);
                    const panelEfficiencies = panels
                        .map(panel => panel.efficiencyValue)
                        .filter(value => typeof value === 'number' && value > 0);
                    shadowMovement.hourData = {
                        shadowPct: sh.pct || 0,
                        efficiency: sh.efficiency || (panelEfficiencies.length
                            ? Math.round(panelEfficiencies.reduce((sum, value) => sum + value, 0) / panelEfficiencies.length)
                            : 100),
                        cause: SHADOW_CAUSE_LABELS[sh.cause] || sh.cause || t('solar.movement.noShadow'),
                        lossKwh: sh.loss || 0,
                        panels,
                    };
                } else {
                    shadowMovement.hourData = {
                        shadowPct: 0, efficiency: 0, cause: t('common.noData'), lossKwh: 0,
                        panels: smBuildPanelsFromGroups({}, 0),
                    };
                }
            } else {
                const d = shadowMovement.typicalData[parseInt(h)] || {};
                const eff = d.shadowPct ? Math.max(0, 100 - d.shadowPct) : 100;
                shadowMovement.hourData = {
                    shadowPct: d.shadowPct || 0,
                    efficiency: eff,
                    cause: d.cause || t('solar.movement.noShadow'),
                    lossKwh: 0,
                    panels: (shadowMovement.groupNames.length ? shadowMovement.groupNames : ['Gruppe 1']).map((name, index) => ({
                        name: name || `Gruppe ${index + 1}`,
                        efficiencyValue: eff,
                        efficiencyLabel: `${eff}%`,
                        shadowPct: d.shadowPct || 0,
                        actualLabel: '--',
                    })),
                };
            }
        }

        function smOnSlider(val) {
            smUpdateHour(val);
            smRenderTimeline();
        }

        function setShadowMode() {};

        function smToggleAutoPlay() {
            if (shadowMovement.playing) {
                clearInterval(smAutoPlayTimer);
                shadowMovement.playing = false;
            } else {
                shadowMovement.playing = true;
                shadowMovement.currentHour = 6;
                smUpdateHour(6);
                smAutoPlayTimer = setInterval(() => {
                    let next = shadowMovement.currentHour + 1;
                    if (next > 20) { next = 6; }
                    smUpdateHour(next);
                    smRenderTimeline();
                }, 1500);
            }
        }

        function smRenderTimeline() {
            const el = document.querySelector('.sm-timeline-target');
            if (!el) return;
            if (!smTimeline) smTimeline = echarts.init(el);

            const data = smHourRange.map(h => {
                if (shadowMovement.selectedDate !== 'typical') {
                    const dateData = smGetCurrentDateData();
                    if (dateData) {
                        const hd = dateData[String(h)];
                        return hd?.shadow?.pct || 0;
                    }
                    return 0;
                }
                return (shadowMovement.typicalData[h] || {}).shadowPct || 0;
            });

            smTimeline.setOption({
                backgroundColor: 'transparent',
                grid: { left: 30, right: 10, top: 5, bottom: 20 },
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: getThemeColor('--bg-app', 'rgba(10,14,20,0.95)'),
                    borderColor: getThemeColor('--border-default', 'rgba(255,255,255,0.1)'),
                    textStyle: { color: getThemeColor('--text-primary', '#f0f6fc'), fontSize: 11 },
                    formatter: function(p) {
                        return p[0].axisValue + '<br/>' + t('solar.movement.timelineShadow') + ': <b>' + p[0].value + '%</b>';
                    },
                },
                xAxis: {
                    type: 'category',
                    data: smHourRange.map(h => h + ':00'),
                    axisLabel: { color: getThemeColor('--text-secondary', '#6e7681'), fontSize: 9 },
                    axisLine: { lineStyle: { color: getThemeColor('--border-default', 'rgba(255,255,255,0.1)') } },
                },
                yAxis: { type: 'value', max: 100, show: false },
                series: [{
                    type: 'bar',
                    data: data.map((v, i) => ({
                        value: v,
                        itemStyle: {
                            color: v >= 60 ? '#ef4444' : v >= 30 ? '#f59e0b' : v > 5 ? '#eab308' : 'rgba(34,197,94,0.3)',
                            borderRadius: [2, 2, 0, 0],
                            opacity: smHourRange[i] === shadowMovement.currentHour ? 1 : 0.4,
                        },
                    })),
                    barMaxWidth: 20,
                }],
            }, true);
        }

        const yearOverview = computed(() => {
            const a = annualData.value;
            if (!a?.annual) return null;
            const ann = a.annual;
            const rec = a.records || {};
            const sys = a.system || {};
            // Get peak from summary daily_stats (alltime_peak)
            const peakW = rec.peak_power_w || summaryData.value?.alltime_peak?.watts || summaryData.value?.daily_stats?.peak_solar_w || 0;
            return {
                optimistic: Math.round(ann.optimistic_kwh || 0),
                expected: Math.round(ann.yield_kwh || 0),
                pessimistic: Math.round(ann.pessimistic_kwh || 0),
                bestDay: (rec.best_day_kwh || 0).toFixed(2),
                bestDayDate: rec.best_day_date || '--',
                peakPower: Math.round(peakW),
                installedKwp: (sys.installed_kwp || 0).toFixed(2),
                panelGroups: (sys.panel_groups || [])
                    .filter(pg => {
                        const name = String(pg.group_name || '').trim();
                        return name && !/^_+pgm_temp_/i.test(name);
                    })
                    .sort((a, b) => {
                        const ak = panelGroupSortKey(a.group_name);
                        const bk = panelGroupSortKey(b.group_name);
                        if (ak[0] !== bk[0]) return ak[0] - bk[0];
                        if (ak[1] !== bk[1]) return ak[1] - bk[1];
                        return ak[2].localeCompare(bk[2]);
                    })
                    .map(pg => ({
                        name: pg.group_name,
                        factor: (pg.global_factor || 0).toFixed(3),
                        samples: pg.sample_count || 0,
                    })),
            };
        });

        const summaryData = ref(null);

        const SHADOW_CAUSE_COLORS = {
            low_radiation: '#94a3b8', low_sun_angle: '#f59e0b', panel_frost: '#38bdf8',
            building_tree_obstruction: '#ef4444', weather_clouds: '#64748b', unknown: '#4b5563',
            weather_better_than_forecast: '#10b981',
        };
        // Look up via i18n so the label changes with the active locale.
        const shadowCauseLabel = (cause) => {
            const map = {
                low_radiation: 'solar.cause.lowRadiation',
                low_sun_angle: 'solar.cause.lowSunAngle',
                panel_frost: 'solar.cause.panelFrost',
                building_tree_obstruction: 'solar.cause.obstruction',
                weather_clouds: 'solar.cause.clouds',
                unknown: 'common.unknown',
                weather_better_than_forecast: 'solar.cause.betterThanForecast',
            };
            return map[cause] ? t(map[cause]) : cause;
        };
        // Backwards-compat object form used elsewhere in this file
        const SHADOW_CAUSE_LABELS = new Proxy({}, { get: (_, k) => shadowCauseLabel(k) });

        function formatDay(dateStr) {
            if (!dateStr) return '--';
            const d = new Date(dateStr + 'T00:00:00');
            return d.toLocaleDateString(bcp(locale.value), { weekday: 'short', day: 'numeric', month: 'numeric' });
        }

        async function loadData() {
            try {
                const [annual, summary, shadow, solar, comparison] = await Promise.all([
                    SFMLApi.fetch('/api/sfml_stats/annual_forecast', { forceRefresh: true }),
                    SFMLApi.fetch('/api/sfml_stats/summary', { forceRefresh: true }),
                    SFMLApi.fetch('/api/sfml_stats/shadow_analytics?days=30', { forceRefresh: true }),
                    SFMLApi.fetch('/api/sfml_stats/solar?days=7', { forceRefresh: true }),
                    SFMLApi.fetch('/api/sfml_stats/forecast_comparison?days=7', { forceRefresh: true }),
                ]);
                annualData.value = annual;
                shadowData.value = shadow;
                solarDailyData.value = solar;
                summaryData.value = summary;
                forecastComparisonData.value = comparison;
                if (summary?.monthly_by_year) {
                    monthlyByYear.value = summary.monthly_by_year;
                }
                processData();
                await nextTick();
                function tryRender(attempts) {
                    if (attempts <= 0) return;
                    const el = document.querySelector('.monthly-chart-target');
                    if (el && el.offsetWidth > 0) {
                        monthlyChartEl.value = el;
                        renderMonthlyChart();
                        renderHeatmapChart();
                        renderShadowCharts();
                        renderComparisonChart();
                    } else {
                        setTimeout(() => tryRender(attempts - 1), 200);
                    }
                }
                tryRender(10);
            } catch (err) {
                console.error('[SolarPage] data load error:', err);
            }
        }

        function formatDiscardedLearning(o) {
            const discarded = o.discarded_learning_hours_count || 0;
            if (discarded <= 0) return '0 h';

            const reasonLabels = {
                mppt_throttled: 'MPPT',
                inverter_clipped: 'Clipping',
                missing_data: t('solar.discarded.missingData'),
                manual_pause: t('solar.discarded.manualPause'),
                suspected_battery_curtailment: t('solar.discarded.suspectedBatteryCurtailment'),
                demand_limited_zero_export: t('solar.discarded.demandLimitedZeroExport'),
                excluded_from_clean_evaluation: t('solar.discarded.excludedFromCleanEvaluation'),
                excluded: t('solar.discarded.excluded'),
            };
            const breakdown = o.discarded_learning_reason_breakdown || {};
            const parts = Object.entries(breakdown)
                .filter(([, hours]) => hours > 0)
                .map(([reason, hours]) => `${hours} h ${reasonLabels[reason] || reason}`);

            return parts.length > 0 ? parts.join(', ') : `${discarded} h`;
        }

        function processData() {
            // Weekly rows
            const daily = solarDailyData.value?.data?.daily || [];
            weeklyRows.value = daily.slice(-7).map(d => {
                const o = d.overall || {};
                const actual = o.actual_total_kwh || 0;
                const forecast = o.predicted_total_kwh || 0;
                const delta = forecast > 0 ? (((actual - forecast) / forecast) * 100) : 0;
                const forecastError = o.forecast_error_vs_actual_percent != null
                    ? parseFloat(o.forecast_error_vs_actual_percent.toFixed(1))
                    : (actual > 0 ? (((forecast - actual) / actual) * 100) : null);
                const forecastAccuracy = o.forecast_accuracy_vs_actual_percent != null
                    ? parseFloat(o.forecast_accuracy_vs_actual_percent.toFixed(1))
                    : (forecastError != null ? Math.max(0, 100 - Math.abs(forecastError)) : null);
                const accuracyValue = forecastAccuracy != null
                    ? parseFloat(forecastAccuracy.toFixed(1))
                    : (o.accuracy_percent != null ? parseFloat(o.accuracy_percent.toFixed(1)) : null);
                const learningHours = o.learning_hours_count ?? o.evaluation_hours_count ?? null;
                const learningCandidates = o.learning_candidate_hours_count ?? o.production_candidate_hours_count ?? null;
                return {
                    day: formatDay(d.date),
                    actual: actual.toFixed(2),
                    forecast: forecast.toFixed(2),
                    delta: parseFloat(delta.toFixed(1)),
                    deltaColor: forecastBandColor(delta),
                    forecastError: forecastError != null ? parseFloat(forecastError.toFixed(1)) : null,
                    forecastErrorColor: forecastBandColor(forecastError),
                    forecastErrorText: forecastError != null
                        ? `${forecastError >= 0 ? '+' : ''}${forecastError.toFixed(1)}%`
                        : '--',
                    accuracyValue,
                    accuracyColor: forecastBandColorFromAccuracy(accuracyValue),
                    accuracyBg: forecastBandBackgroundFromAccuracy(accuracyValue),
                    accuracy: accuracyValue != null ? accuracyValue.toFixed(1) + '%' : '--',
                    learningBasis: learningHours != null && learningCandidates != null
                        ? `${learningHours}/${learningCandidates} h`
                        : '--',
                    discardedLearning: formatDiscardedLearning(o),
                    peak: o.peak_kwh != null ? o.peak_kwh.toFixed(2) + ' kWh' : '--',
                };
            });

            // Shadow stats
            const sh = shadowData.value?.data;
            if (sh?.stats) {
                shadowStats.value = {
                    totalLoss: (sh.stats.total_loss_kwh || 0).toFixed(1),
                    hours: sh.stats.shadow_hours || 0,
                    efficiency: ((sh.stats.avg_efficiency || 0) * 100).toFixed(0),
                    daysLearned: sh.learning?.days_learned || 0,
                };
            }
        }

        function renderMonthlyChart() {
            // Use direct DOM query as fallback for ref binding in IIFE
            const el = monthlyChartEl.value || document.querySelector('.monthly-chart-target');
            if (!el || el.offsetWidth === 0) return;
            if (!monthlyChart) monthlyChart = echarts.init(el);

            // Use real monthly data from DB (monthly_by_year) + forecast estimates
            const realData = monthlyByYear.value || [];
            const forecastMonths = annualData.value?.months || [];

            // Build year→month→kwh map from REAL data (aggregate duplicates)
            const years = {};
            realData.forEach(m => {
                const y = String(m.year);
                if (!years[y]) years[y] = {};
                if (years[y][m.month]) {
                    years[y][m.month].kwh += m.total_kwh;
                    years[y][m.month].days += m.days;
                } else {
                    years[y][m.month] = { kwh: m.total_kwh, measured: true, days: m.days };
                }
            });

            // Add forecast estimates for months without real data (2026 only)
            forecastMonths.forEach(m => {
                const y = String(m.year);
                if (!years[y]) years[y] = {};
                if (!years[y][m.month]) {
                    // No real data — use estimate
                    years[y][m.month] = {
                        kwh: m.projected_yield_kwh || 0,
                        measured: false,
                        days: m.total_days,
                    };
                }
            });

            const yearKeys = Object.keys(years).sort();

            // Colors per year
            const yearColors = { '2025': '#6366f1', '2026': '#fbbf24', '2027': '#22c55e' };

            const series = yearKeys.map(year => {
                const data = [];
                for (let m = 1; m <= 12; m++) {
                    const entry = years[year]?.[m];
                    if (entry && entry.kwh > 0) {
                        data.push({
                            value: entry.kwh,
                            itemStyle: {
                                color: yearColors[year] || '#8b949e',
                                opacity: entry.measured ? 1.0 : 0.3,
                                borderRadius: [3, 3, 0, 0],
                            },
                        });
                    } else {
                        data.push({ value: 0 });
                    }
                }
                return {
                    name: year,
                    type: 'bar',
                    data: data,
                    barMaxWidth: 32,
                    barGap: '20%',
                };
            });

            monthlyChart.setOption({
                backgroundColor: 'transparent',
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: getThemeColor('--bg-app', 'rgba(10, 14, 20, 0.95)'),
                    borderColor: getThemeColor('--border-default', 'rgba(255,255,255,0.1)'),
                    textStyle: { color: getThemeColor('--text-primary', '#f0f6fc'), fontSize: 12, fontFamily: 'var(--font-mono)' },
                    formatter: function(params) {
                        let s = '<b>' + params[0].axisValue + '</b><br/>';
                        params.forEach(p => {
                            if (p.value > 0) {
                                s += '<span style="color:' + (yearColors[p.seriesName] || '#8b949e') + '">'
                                    + '● ' + p.seriesName + ':</span> '
                                    + p.value.toFixed(1) + ' kWh<br/>';
                            }
                        });
                        return s;
                    },
                },
                legend: {
                    bottom: 0,
                    textStyle: { color: getThemeColor('--text-secondary', '#8b949e'), fontSize: 11 },
                    data: yearKeys,
                },
                grid: { left: 55, right: 20, top: 15, bottom: 40 },
                xAxis: {
                    type: 'category',
                    data: MONTH_NAMES,
                    axisLine: { lineStyle: { color: getThemeColor('--border-default', 'rgba(255,255,255,0.1)') } },
                    axisLabel: { color: getThemeColor('--text-secondary', '#8b949e'), fontSize: 11 },
                },
                yAxis: {
                    type: 'value',
                    name: 'kWh',
                    nameTextStyle: { color: getThemeColor('--text-secondary', '#6e7681'), fontSize: 10 },
                    splitLine: { lineStyle: { color: getThemeColor('--border-default', 'rgba(255,255,255,0.05)') } },
                    axisLabel: { color: getThemeColor('--text-secondary', '#8b949e'), fontSize: 11 },
                },
                series: series,
                animationDuration: 1000,
                animationEasing: 'cubicOut',
            }, true);
        }

        let heatmapChart = null;
        let causesChart = null;
        let lossChart = null;

        function renderHeatmapChart() {
            const el = document.querySelector('.heatmap-chart-target');
            if (!el || !solarDailyData.value?.data?.hourly) return;
            if (!heatmapChart) heatmapChart = echarts.init(el);

            const hourly = solarDailyData.value.data.hourly;
            const hours = [];
            for (let h = 6; h <= 20; h++) hours.push(String(h).padStart(2, '0') + ':00');

            // Group by date → build heatmap data [dayIdx, hourIdx, value]
            const dayMap = {};
            hourly.forEach(h => {
                const dt = h.target_date;
                const hr = h.target_hour;
                if (hr < 6 || hr > 20) return;
                if (!dayMap[dt]) dayMap[dt] = {};
                dayMap[dt][hr] = (h.actual_kwh || 0) * 1000; // Convert to Wh for better readability
            });

            const dates = Object.keys(dayMap).sort();
            const dateLabels = dates.map(d => { const p = d.split('-'); return p[2] + '.' + p[1]; });
            let maxVal = 0;

            const heatData = [];
            dates.forEach((date, dayIdx) => {
                for (let h = 6; h <= 20; h++) {
                    const val = dayMap[date]?.[h] || 0;
                    if (val > maxVal) maxVal = val;
                    heatData.push([dayIdx, h - 6, val]);
                }
            });

            heatmapChart.setOption({
                backgroundColor: 'transparent',
                tooltip: {
                    backgroundColor: getThemeColor('--bg-app', 'rgba(10,14,20,0.95)'),
                    borderColor: getThemeColor('--border-default', 'rgba(255,255,255,0.1)'),
                    textStyle: { color: getThemeColor('--text-primary', '#f0f6fc'), fontSize: 12, fontFamily: 'var(--font-mono)' },
                    formatter: p => {
                        const date = dateLabels[p.data[0]] || '';
                        const hour = hours[p.data[1]] || '';
                        const val = p.data[2] || 0;
                        return date + ' · ' + hour + '<br/><b style="color:#fbbf24">' + val.toFixed(0) + ' Wh</b>';
                    },
                },
                grid: { left: 60, right: 30, top: 10, bottom: 40 },
                xAxis: {
                    type: 'category',
                    data: dateLabels,
                    axisLine: { lineStyle: { color: getThemeColor('--border-default', 'rgba(255,255,255,0.1)') } },
                    axisLabel: { color: getThemeColor('--text-secondary', '#8b949e'), fontSize: 11 },
                    splitArea: { show: false },
                },
                yAxis: {
                    type: 'category',
                    data: hours,
                    axisLine: { lineStyle: { color: getThemeColor('--border-default', 'rgba(255,255,255,0.1)') } },
                    axisLabel: { color: getThemeColor('--text-secondary', '#8b949e'), fontSize: 11 },
                    splitArea: { show: false },
                },
                visualMap: {
                    min: 0,
                    max: Math.max(maxVal, 100),
                    calculable: false,
                    orient: 'horizontal',
                    right: 10,
                    bottom: 0,
                    inRange: {
                        color: ['#1a1a2e', '#4a2800', '#8b4513', '#d2691e', '#ff8c00', '#fbbf24', '#fef08a'],
                    },
                    textStyle: { color: '#6e7681', fontSize: 10 },
                    formatter: v => v.toFixed(0) + ' Wh',
                },
                series: [{
                    type: 'heatmap',
                    data: heatData,
                    emphasis: {
                        itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' },
                    },
                    itemStyle: { borderWidth: 1, borderColor: 'rgba(0,0,0,0.2)', borderRadius: 2 },
                }],
                animationDuration: 800,
            }, true);
        }

        function renderShadowCharts() {
            const sh = shadowData.value?.data;
            if (!sh) return;

            // Causes Donut
            const causesEl = document.querySelector('.shadow-causes-target');
            if (causesEl && sh.causes) {
                if (!causesChart) causesChart = echarts.init(causesEl);
                const pieData = Object.entries(sh.causes).map(([key, hours]) => ({
                    name: SHADOW_CAUSE_LABELS[key] || key,
                    value: hours,
                    itemStyle: { color: SHADOW_CAUSE_COLORS[key] || '#64748b' },
                }));
                causesChart.setOption({
                    backgroundColor: 'transparent',
                    tooltip: { trigger: 'item', backgroundColor: getThemeColor('--bg-app', 'rgba(10,14,20,0.95)'), textStyle: { color: getThemeColor('--text-primary', '#f0f6fc') }, formatter: p => p.name + ': ' + p.value + 'h (' + p.percent.toFixed(1) + '%)' },
                    series: [{
                        type: 'pie', radius: ['40%', '72%'],
                        data: pieData,
                        label: { show: true, color: getThemeColor('--text-secondary', '#8b949e'), fontSize: 11, formatter: '{b}\n{d}%' },
                        labelLine: { lineStyle: { color: getThemeColor('--border-default', 'rgba(255,255,255,0.15)') } },
                        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } },
                    }],
                    animationDuration: 1000,
                }, true);
            }

            // Daily Loss Bars
            const lossEl = document.querySelector('.shadow-loss-target');
            if (lossEl && sh.daily_loss) {
                if (!lossChart) lossChart = echarts.init(lossEl);
                const dates = sh.daily_loss.map(d => { const p = d.date.split('-'); return p[2] + '.' + p[1]; });
                const losses = sh.daily_loss.map(d => d.loss_kwh || 0);
                lossChart.setOption({
                    backgroundColor: 'transparent',
                    tooltip: { trigger: 'axis', backgroundColor: getThemeColor('--bg-app', 'rgba(10,14,20,0.95)'), textStyle: { color: getThemeColor('--text-primary', '#f0f6fc'), fontSize: 12 }, formatter: p => p[0].axisValue + '<br/>Verlust: <b>' + p[0].value.toFixed(2) + ' kWh</b>' },
                    grid: { left: 45, right: 15, top: 10, bottom: 40 },
                    xAxis: { type: 'category', data: dates, axisLabel: { color: getThemeColor('--text-secondary', '#6e7681'), fontSize: 10, rotate: 45 }, axisLine: { lineStyle: { color: getThemeColor('--border-default', 'rgba(255,255,255,0.1)') } } },
                    yAxis: { type: 'value', name: 'kWh', nameTextStyle: { color: getThemeColor('--text-secondary', '#6e7681'), fontSize: 10 }, splitLine: { lineStyle: { color: getThemeColor('--border-default', 'rgba(255,255,255,0.05)') } }, axisLabel: { color: getThemeColor('--text-secondary', '#6e7681'), fontSize: 10 } },
                    series: [{ type: 'bar', data: losses, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#ef4444' }, { offset: 1, color: '#991b1b' }] }, borderRadius: [3,3,0,0] }, barMaxWidth: 16 }],
                    animationDuration: 800,
                }, true);
            }
        }

        function renderComparisonChart() {
            const el = comparisonChartEl.value || document.querySelector('.comparison-chart-target');
            if (!el || !forecastComparisonData.value) return;
            if (!comparisonChart) comparisonChart = echarts.init(el);

            const data = forecastComparisonData.value;
            const dates = data.dates || [];
            const actual = data.actual || [];
            const sfml = data.sfml || [];
            const ext1 = data.external_1 || [];
            const ext2 = data.external_2 || [];
            const ext1_name = data.external_1_name || (t('common.forecast') + ' 1');
            const ext2_name = data.external_2_name || (t('common.forecast') + ' 2');

            const legendData = [t('solar.movement.actual') || 'Istwert', 'SFML'];
            const series = [
                {
                    name: t('solar.movement.actual') || 'Istwert',
                    type: 'line',
                    data: actual,
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 6,
                    lineStyle: { color: getThemeColor('--price-cheap', '#22c55e'), width: 3 },
                    itemStyle: { color: getThemeColor('--price-cheap', '#22c55e') },
                    areaStyle: {
                        color: {
                            type: 'linear',
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [
                                { offset: 0, color: 'rgba(34, 197, 94, 0.15)' },
                                { offset: 1, color: 'rgba(34, 197, 94, 0.0)' }
                            ]
                        }
                    }
                },
                {
                    name: 'SFML',
                    type: 'line',
                    data: sfml,
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 5,
                    lineStyle: { color: getThemeColor('--solar', '#fbbf24'), width: 2 },
                    itemStyle: { color: getThemeColor('--solar', '#fbbf24') }
                }
            ];

            if (data.external_1) {
                legendData.push(ext1_name);
                series.push({
                    name: ext1_name,
                    type: 'line',
                    data: ext1,
                    smooth: true,
                    symbol: 'none',
                    lineStyle: { color: getThemeColor('--grid', '#6366f1'), width: 1.5, type: 'dashed' },
                    itemStyle: { color: getThemeColor('--grid', '#6366f1') }
                });
            }

            if (data.external_2) {
                legendData.push(ext2_name);
                series.push({
                    name: ext2_name,
                    type: 'line',
                    data: ext2,
                    smooth: true,
                    symbol: 'none',
                    lineStyle: { color: getThemeColor('--house', '#8b5cf6'), width: 1.5, type: 'dotted' },
                    itemStyle: { color: getThemeColor('--house', '#8b5cf6') }
                });
            }

            comparisonChart.setOption({
                backgroundColor: 'transparent',
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: getThemeColor('--bg-app', 'rgba(10,14,20,0.95)'),
                    borderColor: getThemeColor('--border-default', 'rgba(255,255,255,0.1)'),
                    textStyle: { color: getThemeColor('--text-primary', '#f0f6fc'), fontSize: 12, fontFamily: 'var(--font-mono)' },
                    formatter: function(params) {
                        let s = '<b>' + params[0].axisValue + '</b><br/>';
                        let actualVal = null;
                        const actualName = t('solar.movement.actual') || 'Istwert';
                        params.forEach(p => {
                            if (p.seriesName === actualName) {
                                actualVal = p.value;
                            }
                        });
                        params.forEach(p => {
                            if (p.value !== null && p.value !== undefined) {
                                s += '<span style="color:' + p.color + '">● ' + p.seriesName + ':</span> ' + p.value.toFixed(2) + ' kWh';
                                if (p.seriesName !== actualName && actualVal !== null && actualVal !== undefined && actualVal > 0) {
                                    const diffPct = ((p.value - actualVal) / actualVal) * 100;
                                    const diffSign = diffPct >= 0 ? '+' : '';
                                    s += ' <span style="font-size: 0.8rem; opacity: 0.85;">(' + diffSign + diffPct.toFixed(1) + '%)</span>';
                                }
                                s += '<br/>';
                            }
                        });
                        return s;
                    }
                },
                legend: {
                    bottom: 0,
                    textStyle: { color: getThemeColor('--text-secondary', '#8b949e'), fontSize: 11 },
                    data: legendData
                },
                grid: { left: 45, right: 20, top: 20, bottom: 40 },
                xAxis: {
                    type: 'category',
                    data: dates,
                    axisLine: { lineStyle: { color: getThemeColor('--border-default', 'rgba(255,255,255,0.1)') } },
                    axisLabel: { color: getThemeColor('--text-secondary', '#8b949e'), fontSize: 11 }
                },
                yAxis: {
                    type: 'value',
                    name: 'kWh',
                    nameTextStyle: { color: getThemeColor('--text-secondary', '#6e7681'), fontSize: 10 },
                    splitLine: { lineStyle: { color: getThemeColor('--border-default', 'rgba(255,255,255,0.05)') } },
                    axisLabel: { color: getThemeColor('--text-secondary', '#8b949e'), fontSize: 11 }
                },
                series: series,
                animationDuration: 1000,
                animationEasing: 'cubicOut'
            }, true);
        }

        function handleResize() {
            monthlyChart?.resize();
            heatmapChart?.resize();
            causesChart?.resize();
            lossChart?.resize();
            shadowFingerprintChart?.resize();
            smTimeline?.resize();
            comparisonChart?.resize();
        }

        watch(() => props.config?.theme, () => {
            nextTick(() => {
                if (monthlyChart) { monthlyChart.dispose(); monthlyChart = null; }
                renderMonthlyChart();
                if (heatmapChart) { heatmapChart.dispose(); heatmapChart = null; }
                renderHeatmapChart();
                if (causesChart) { causesChart.dispose(); causesChart = null; }
                if (lossChart) { lossChart.dispose(); lossChart = null; }
                renderShadowCharts();
                if (shadowFingerprintChart) { shadowFingerprintChart.dispose(); shadowFingerprintChart = null; }
                renderShadowFingerprint();
                if (smTimeline) { smTimeline.dispose(); smTimeline = null; }
                smRenderTimeline();
                if (comparisonChart) { comparisonChart.dispose(); comparisonChart = null; }
                renderComparisonChart();
            });
        });

        onMounted(async () => {
            await loadData();
            loadShadowFingerprint();
            loadShadowMovement();
            window.addEventListener('resize', handleResize);
            // Ensure chart renders after DOM is fully ready
            setTimeout(() => {
                if (!monthlyChart) {
                    const el = document.querySelector('.monthly-chart-target');
                    if (el && el.offsetWidth > 0) {
                        monthlyChartEl.value = el;
                        renderMonthlyChart();
                    }
                }
            }, 500);
        });

        onUnmounted(() => {
            window.removeEventListener('resize', handleResize);
            monthlyChart?.dispose(); monthlyChart = null;
            heatmapChart?.dispose(); heatmapChart = null;
            causesChart?.dispose(); causesChart = null;
            lossChart?.dispose(); lossChart = null;
            shadowFingerprintChart?.dispose(); shadowFingerprintChart = null;
            smTimeline?.dispose(); smTimeline = null;
            comparisonChart?.dispose(); comparisonChart = null;
            if (smAutoPlayTimer) clearInterval(smAutoPlayTimer);
        });

        return {
            monthlyChartEl,
            comparisonChartEl,
            forecastComparisonData,
            dataCoverage, annualKpis, yearOverview,
            shadowStats, weeklyRows,
            shadowFingerprint, shadowFingerprintEl,
            shadowMovement, smHourRange, smCurrentMonthName,
            smSunPosition, smLossColor, smSceneModeLabel, smCauseBadgeClass,
            smEffColor, smPanelStyle, smPanelMeterStyle,
            smOnSlider, setShadowMode, smSelectDate, smToggleAutoPlay,
        };
    },
};

// Style injection
(function injectSolarStyles() {
    if (document.getElementById('solar-page-styles')) return;
    const style = document.createElement('style');
    style.id = 'solar-page-styles';
    style.textContent = `
        .data-coverage-bar {
            font-size: 0.75rem;
            color: var(--text-muted);
            text-align: center;
            padding: var(--space-xs) var(--space-md);
            margin-bottom: var(--space-md);
            border-bottom: 1px solid var(--border-default);
        }

        .annual-kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: var(--space-md);
        }

        .annual-kpi {
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-md);
            padding: var(--space-md) var(--space-lg);
            text-align: center;
            transition: all var(--transition-normal);
        }

        .annual-kpi:hover {
            background: var(--bg-card-hover);
            transform: translateY(-2px);
        }

        .annual-kpi-value {
            font-size: 1.8rem;
            font-weight: 700;
            font-family: var(--font-mono);
            line-height: 1.2;
        }

        .annual-kpi-label {
            font-size: 0.75rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin-top: var(--space-xs);
        }

        .forecast-accuracy-footer {
            padding: var(--space-md) 0 0;
            border-top: 1px solid var(--border-default);
            margin-top: var(--space-md);
            display: flex;
            flex-wrap: wrap;
            align-items: center;
        }

        .accuracy-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-family: var(--font-mono);
            font-size: 0.8rem;
            font-weight: 600;
        }

        .zebra-odd td {
            background: rgba(255, 255, 255, 0.02);
        }

        .shadow-insights {
            margin-top: var(--space-md);
            padding-top: var(--space-md);
            border-top: 1px solid rgba(255,255,255,0.06);
        }
        .shadow-insights-title {
            font-size: 0.85rem;
            color: var(--text-muted);
            margin-bottom: var(--space-sm);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .shadow-insights-list {
            display: grid;
            gap: 6px;
        }
        .shadow-insight-item {
            display: grid;
            grid-template-columns: 64px 1fr auto;
            gap: var(--space-sm);
            align-items: center;
            padding: 6px 10px;
            border-radius: 6px;
            background: rgba(255,255,255,0.03);
            font-size: 0.85rem;
        }
        .shadow-insight-item.insight-high {
            background: rgba(239,68,68,0.08);
            border-left: 3px solid #ef4444;
        }
        .shadow-insight-item.insight-mid {
            background: rgba(245,158,11,0.08);
            border-left: 3px solid #f59e0b;
        }
        .insight-time {
            font-family: var(--font-mono);
            font-weight: 600;
            color: var(--text-primary);
        }
        .insight-text { color: var(--text-secondary); }
        .insight-pct {
            font-family: var(--font-mono);
            font-weight: 700;
            color: var(--text-primary);
        }

        .sm-panel-container {
            padding: var(--space-md);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-md);
            background:
                radial-gradient(circle at top, rgba(56, 189, 248, 0.08), transparent 40%),
                linear-gradient(180deg, rgba(4, 8, 18, 0.92), rgba(10, 14, 24, 0.86));
            margin-bottom: var(--space-md);
        }
        .sm-scene-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: var(--space-md);
            margin-bottom: var(--space-md);
        }
        .sm-scene-title {
            font-size: 0.95rem;
            font-weight: 700;
            color: var(--text-primary);
        }
        .sm-scene-subtitle {
            font-size: 0.78rem;
            color: var(--text-secondary);
            margin-top: 4px;
        }
        .sm-scene-badges {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-end;
            gap: 8px;
        }
        .sm-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 10px;
            border-radius: 999px;
            border: 1px solid rgba(255,255,255,0.08);
            background: rgba(255,255,255,0.05);
            color: var(--text-secondary);
            font-size: 0.72rem;
            font-weight: 700;
            letter-spacing: 0.01em;
        }
        .sm-sun-track {
            position: relative;
            height: 40px;
            margin-bottom: var(--space-md);
        }
        .sm-sun-line {
            position: absolute;
            left: 0;
            right: 0;
            top: 20px;
            border-bottom: 1px dashed rgba(255,255,255,0.12);
        }
        .sm-sun-glow {
            position: absolute;
            top: 5px;
            width: 54px;
            height: 24px;
            transform: translateX(-50%);
            background: radial-gradient(circle, rgba(251,191,36,0.28), rgba(251,191,36,0));
            filter: blur(2px);
        }
        .sm-sun {
            position: absolute;
            top: 2px;
            font-size: 1.5rem;
            transform: translateX(-50%);
            transition: left 0.8s cubic-bezier(0.22, 1, 0.36, 1);
            filter: drop-shadow(0 0 8px rgba(251,191,36,0.6));
        }
        .sm-panels {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: var(--space-lg);
            margin-bottom: var(--space-md);
        }
        .sm-panel {
            position: relative;
            border: 1px solid var(--border-default);
            border-radius: var(--radius-md);
            padding: var(--space-lg);
            text-align: center;
            overflow: hidden;
            transition: all 0.6s ease;
            min-height: 156px;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            gap: var(--space-sm);
            background: rgba(255,255,255,0.02);
        }
        .sm-panel-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 8px;
            z-index: 1;
        }
        .sm-panel-label {
            font-size: 0.85rem;
            font-weight: 700;
            color: var(--text-primary);
            z-index: 1;
            text-align: left;
        }
        .sm-panel-status {
            z-index: 1;
            font-size: 0.68rem;
            font-weight: 800;
            padding: 5px 8px;
            border-radius: 999px;
            letter-spacing: 0.01em;
            border: 1px solid transparent;
            white-space: nowrap;
        }
        .sm-panel-status.severity-heavy,
        .sm-badge.severity-heavy {
            color: #fecaca;
            background: rgba(239,68,68,0.14);
            border-color: rgba(239,68,68,0.28);
        }
        .sm-panel-status.severity-forecast {
            color: #bfdbfe;
            background: rgba(59,130,246,0.14);
            border-color: rgba(59,130,246,0.28);
        }
        .sm-panel-status.severity-medium,
        .sm-badge.severity-medium {
            color: #fde68a;
            background: rgba(245,158,11,0.14);
            border-color: rgba(245,158,11,0.28);
        }
        .sm-panel-status.severity-light,
        .sm-badge.severity-light {
            color: #fef08a;
            background: rgba(234,179,8,0.14);
            border-color: rgba(234,179,8,0.28);
        }
        .sm-panel-status.severity-clear,
        .sm-badge.severity-clear {
            color: #bbf7d0;
            background: rgba(34,197,94,0.14);
            border-color: rgba(34,197,94,0.28);
        }
        .sm-panel-status.severity-nodata {
            color: #cbd5e1;
            background: rgba(148,163,184,0.14);
            border-color: rgba(148,163,184,0.24);
        }
        .sm-panel-eff {
            font-size: 2rem;
            font-weight: 800;
            font-family: var(--font-mono);
            z-index: 1;
            transition: color 0.4s ease;
            text-align: left;
        }
        .sm-panel-kwh {
            font-size: 0.8rem;
            color: var(--text-secondary);
            font-family: var(--font-mono);
            z-index: 1;
        }
        .sm-panel-meter {
            position: relative;
            height: 8px;
            width: 100%;
            background: rgba(255,255,255,0.08);
            border-radius: 999px;
            overflow: hidden;
            z-index: 1;
        }
        .sm-panel-meter-fill {
            height: 100%;
            border-radius: 999px;
            transition: width 0.5s ease;
            box-shadow: 0 0 12px rgba(251,191,36,0.22);
        }
        .sm-panel-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
            width: 100%;
            font-size: 0.72rem;
            color: var(--text-muted);
            z-index: 1;
        }
        .sm-panel-shadow-overlay {
            position: absolute;
            inset: 0;
            background: linear-gradient(135deg, rgba(0,0,0,0.92), rgba(15,23,42,0.72));
            transition: opacity 0.6s ease;
            pointer-events: none;
            z-index: 0;
        }
        .sm-loss-bar {
            text-align: center;
            font-size: 0.85rem;
            font-family: var(--font-mono);
            padding: var(--space-xs) 0;
        }
        .sm-slider-container {
            padding: 0 var(--space-sm);
        }
        .sm-controls {
            display: flex;
            align-items: center;
            gap: var(--space-md);
        }
        .sm-play-btn {
            background: rgba(255,255,255,0.08);
            border: 1px solid var(--border-default);
            border-radius: 50%;
            width: 36px;
            height: 36px;
            font-size: 1rem;
            cursor: pointer;
            color: var(--text-primary);
            transition: all var(--transition-normal);
            flex-shrink: 0;
        }
        .sm-play-btn:hover {
            background: rgba(255,255,255,0.15);
            transform: scale(1.1);
        }
        .sm-slider {
            flex: 1;
            -webkit-appearance: none;
            appearance: none;
            height: 6px;
            border-radius: 3px;
            background: rgba(255,255,255,0.1);
            outline: none;
        }
        .sm-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #fbbf24;
            cursor: pointer;
            box-shadow: 0 0 8px rgba(251,191,36,0.5);
        }
        .sm-hour-labels {
            display: flex;
            justify-content: space-between;
            padding: var(--space-xs) 0 0 44px;
            font-size: 0.65rem;
            color: var(--text-muted);
            font-family: var(--font-mono);
        }
        .sm-hour-labels span {
            cursor: pointer;
            padding: 2px 4px;
            border-radius: 3px;
            transition: all var(--transition-normal);
        }
        .sm-hour-labels .sm-hour-active {
            color: #fbbf24;
            background: rgba(251,191,36,0.15);
            font-weight: 700;
        }
        .sm-date-bar {
            display: flex;
            gap: var(--space-xs);
            align-items: center;
            flex-wrap: wrap;
        }
        .sm-mode-btn {
            background: rgba(255,255,255,0.05);
            border: 1px solid var(--border-default);
            border-radius: 6px;
            padding: 4px 12px;
            font-size: 0.75rem;
            color: var(--text-secondary);
            cursor: pointer;
            transition: all var(--transition-normal);
        }
        .sm-mode-btn.active {
            background: rgba(251,191,36,0.15);
            border-color: rgba(251,191,36,0.4);
            color: #fbbf24;
        }

        /* Light Theme overrides */
        [data-theme="light"] .zebra-odd td {
            background: rgba(15, 23, 42, 0.015);
        }
        [data-theme="light"] .shadow-insights {
            border-top: 1px solid rgba(15, 23, 42, 0.06);
        }
        [data-theme="light"] .shadow-insight-item {
            background: rgba(15, 23, 42, 0.02);
        }
        [data-theme="light"] .shadow-insight-item.insight-high {
            background: rgba(239, 68, 68, 0.05);
        }
        [data-theme="light"] .shadow-insight-item.insight-mid {
            background: rgba(245, 158, 11, 0.05);
        }
        [data-theme="light"] .sm-panel-container {
            background:
                radial-gradient(circle at top, rgba(2, 132, 199, 0.05), transparent 40%),
                linear-gradient(180deg, rgba(255, 255, 255, 0.65), rgba(241, 245, 249, 0.5));
            border-color: rgba(15, 23, 42, 0.08);
        }
        [data-theme="light"] .sm-badge {
            border-color: rgba(15, 23, 42, 0.08);
            background: rgba(15, 23, 42, 0.03);
        }
        [data-theme="light"] .sm-sun-line {
            border-bottom-color: rgba(15, 23, 42, 0.08);
        }
        [data-theme="light"] .sm-panel {
            background: rgba(15, 23, 42, 0.02);
        }
        [data-theme="light"] .sm-panel-meter {
            background: rgba(15, 23, 42, 0.06);
        }
        [data-theme="light"] .sm-play-btn {
            background: rgba(15, 23, 42, 0.03);
            border-color: rgba(15, 23, 42, 0.08);
        }
        [data-theme="light"] .sm-play-btn:hover {
            background: rgba(15, 23, 42, 0.06);
        }
        [data-theme="light"] .sm-slider {
            background: rgba(15, 23, 42, 0.06);
        }
        [data-theme="light"] .sm-panel-shadow-overlay {
            background: linear-gradient(135deg, rgba(255,255,255,0.92), rgba(241,245,249,0.72));
        }
        [data-theme="light"] .sm-panel-status.severity-heavy,
        [data-theme="light"] .sm-badge.severity-heavy {
            color: #b91c1c;
            background: rgba(239,68,68,0.08);
            border-color: rgba(239,68,68,0.18);
        }
        [data-theme="light"] .sm-panel-status.severity-forecast {
            color: #1d4ed8;
            background: rgba(59,130,246,0.08);
            border-color: rgba(59,130,246,0.18);
        }
        [data-theme="light"] .sm-panel-status.severity-medium,
        [data-theme="light"] .sm-badge.severity-medium {
            color: #b45309;
            background: rgba(245,158,11,0.08);
            border-color: rgba(245,158,11,0.18);
        }
        [data-theme="light"] .sm-panel-status.severity-light,
        [data-theme="light"] .sm-badge.severity-light {
            color: #a16207;
            background: rgba(234,179,8,0.08);
            border-color: rgba(234,179,8,0.18);
        }
        [data-theme="light"] .sm-panel-status.severity-clear,
        [data-theme="light"] .sm-badge.severity-clear {
            color: #15803d;
            background: rgba(34,197,94,0.08);
            border-color: rgba(34,197,94,0.18);
        }
        [data-theme="light"] .sm-panel-status.severity-nodata {
            color: #475569;
            background: rgba(148,163,184,0.08);
            border-color: rgba(148,163,184,0.15);
        }

        @media (max-width: 768px) {
            .annual-kpi-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            .annual-kpi-value {
                font-size: 1.4rem;
            }
            .shadow-charts-row {
                grid-template-columns: 1fr !important;
            }
            .sm-panels {
                grid-template-columns: 1fr;
            }
            .sm-scene-header {
                flex-direction: column;
                align-items: stretch;
            }
            .sm-scene-badges {
                justify-content: flex-start;
            }
            .sm-panel-top,
            .sm-panel-meta {
                flex-direction: column;
                align-items: flex-start;
            }
        }
    `;
    document.head.appendChild(style);
})();

return _SolarPage;
})(Vue);

window.SolarPage = SolarPage;
