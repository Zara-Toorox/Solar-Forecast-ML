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
        emits: ['navigate'],
        template: `
            <div class="page page-smart-charging">
                <div class="section-header">
                    <h2 class="section-title">{{ $t('nav.smartCharging') }}</h2>
                    <span v-if="gpmMeta.is_demo" class="sc-demo-badge">{{ $t('smart_charging.status.demoBadge') }}</span>
                </div>

                <div class="chart-card sc-status-card" style="margin-bottom: var(--space-lg);">
                    <p class="sc-status-line">{{ statusPowerLine }}</p>
                    <p class="sc-status-line">{{ statusBatteryLine }}</p>
                    <p class="sc-status-reserved" v-if="statusReservedLine">{{ statusReservedLine }}</p>
                    <button type="button" class="sc-status-month" v-if="monthlyCostsLine" @click="$emit('navigate', 'gpm')">{{ monthlyCostsLine }}</button>
                </div>

                <div class="chart-card sc-setup-card" style="margin-bottom: var(--space-lg);" v-if="setupCheckItems.length">
                    <div class="chart-header">
                        <span class="chart-title">{{ $t('smart_charging.setup.title') }}</span>
                    </div>
                    <div class="sc-setup-item" v-for="item in setupCheckItems" :key="item.id" :class="'sc-setup-' + item.level">
                        {{ item.text }}
                    </div>
                </div>
                <p class="sc-setup-ok" v-else-if="settingsLoaded">{{ $t('smart_charging.setup.allOk') }}</p>

                <div class="chart-card sc-settings-card" style="margin-bottom: var(--space-lg);" v-show="gpmCardVisible">
                    <div class="chart-header">
                        <span class="chart-title">{{ $t('smart_charging.thresholdsTitle') }}</span>
                    </div>
                    <p v-if="settingsError" class="sc-settings-error">{{ settingsError }}</p>
                    <p class="sc-intro">{{ $t('smart_charging.help.thresholdsIntro') }}</p>
                    <p v-if="isFixedTariff" class="sc-help">{{ $t('smart_charging.help.fixedTariff') }}</p>
                    <div class="sc-control">
                        <div class="sc-control-head">
                            <label>{{ $t('smart_charging.modeLabel') }}</label>
                        </div>
                        <select :value="thresholdMode" @change="onThresholdModeChange($event.target.value)">
                            <option value="absolute">{{ $t('smart_charging.thresholdModeAbsolute') }}</option>
                            <option value="below_average">{{ $t('smart_charging.thresholdModeBelowAverage') }}</option>
                            <option value="cheapest_hours">{{ $t('smart_charging.thresholdModeCheapestHours') }}</option>
                        </select>
                        <p class="sc-help">{{ thresholdModeHelp }}</p>
                        <p v-if="fieldError('threshold_mode')" class="sc-settings-error">{{ fieldError('threshold_mode') }}</p>
                    </div>
                    <div class="sc-control">
                        <div class="sc-control-head">
                            <label>{{ $t('smart_charging.cheapThreshold') }}</label>
                            <span class="sc-number-wrap">
                                <input class="sc-number" type="number"
                                    :min="limitValue('max_price', 'min', 0)"
                                    :max="limitValue('max_price', 'max', 100)"
                                    :step="limitValue('max_price', 'step', 0.5)"
                                    v-model.number="settingsData.thresholds.max_price"
                                    @blur="commitThreshold('max_price')"
                                    @keyup.enter="commitThreshold('max_price')" />
                                <span class="sc-number-unit">ct/kWh</span>
                            </span>
                        </div>
                        <input class="sc-slider" type="range"
                            :min="limitValue('max_price', 'min', 0)"
                            :max="limitValue('max_price', 'max', 100)"
                            :step="limitValue('max_price', 'step', 0.5)"
                            v-model.number="settingsData.thresholds.max_price"
                            @input="onThresholdInput('max_price')" />
                        <p class="sc-help">{{ $t('smart_charging.help.cheapThreshold') }}</p>
                        <p v-if="fieldError('max_price')" class="sc-settings-error">{{ fieldError('max_price') }}</p>
                    </div>
                    <div class="sc-control">
                        <div class="sc-control-head">
                            <label>{{ $t('smart_charging.forceThreshold') }}</label>
                            <span class="sc-number-wrap">
                                <input class="sc-number" type="number"
                                    :min="limitValue('force_charge_price', 'min', 0)"
                                    :max="limitValue('force_charge_price', 'max', 100)"
                                    :step="limitValue('force_charge_price', 'step', 0.5)"
                                    v-model.number="settingsData.thresholds.force_charge_price"
                                    @blur="commitThreshold('force_charge_price')"
                                    @keyup.enter="commitThreshold('force_charge_price')" />
                                <span class="sc-number-unit">ct/kWh</span>
                            </span>
                        </div>
                        <input class="sc-slider" type="range"
                            :min="limitValue('force_charge_price', 'min', 0)"
                            :max="limitValue('force_charge_price', 'max', 100)"
                            :step="limitValue('force_charge_price', 'step', 0.5)"
                            v-model.number="settingsData.thresholds.force_charge_price"
                            @input="onThresholdInput('force_charge_price')" />
                        <p class="sc-help">{{ $t('smart_charging.help.forceThreshold') }}</p>
                        <p v-if="fieldError('force_charge_price')" class="sc-settings-error">{{ fieldError('force_charge_price') }}</p>
                    </div>
                    <div class="sc-control" v-show="thresholdMode === 'below_average'">
                        <div class="sc-control-head">
                            <label>{{ $t('smart_charging.belowAveragePct') }}</label>
                            <span class="sc-number-wrap">
                                <input class="sc-number" type="number"
                                    :min="limitValue('below_average_pct', 'min', 0)"
                                    :max="limitValue('below_average_pct', 'max', 50)"
                                    :step="limitValue('below_average_pct', 'step', 1)"
                                    v-model.number="settingsData.thresholds.below_average_pct"
                                    @blur="commitThreshold('below_average_pct')"
                                    @keyup.enter="commitThreshold('below_average_pct')" />
                                <span class="sc-number-unit">%</span>
                            </span>
                        </div>
                        <input class="sc-slider" type="range"
                            :min="limitValue('below_average_pct', 'min', 0)"
                            :max="limitValue('below_average_pct', 'max', 50)"
                            :step="limitValue('below_average_pct', 'step', 1)"
                            v-model.number="settingsData.thresholds.below_average_pct"
                            @input="onThresholdInput('below_average_pct')" />
                        <p class="sc-help">{{ $t('smart_charging.help.belowAveragePct') }}</p>
                        <p v-if="fieldError('below_average_pct')" class="sc-settings-error">{{ fieldError('below_average_pct') }}</p>
                    </div>
                    <div class="sc-control" v-show="thresholdMode === 'cheapest_hours'">
                        <div class="sc-control-head">
                            <label>{{ $t('smart_charging.cheapestHours') }}</label>
                            <span class="sc-number-wrap">
                                <input class="sc-number" type="number"
                                    :min="limitValue('cheapest_hours', 'min', 1)"
                                    :max="limitValue('cheapest_hours', 'max', 12)"
                                    :step="limitValue('cheapest_hours', 'step', 1)"
                                    v-model.number="settingsData.thresholds.cheapest_hours"
                                    @blur="commitThreshold('cheapest_hours')"
                                    @keyup.enter="commitThreshold('cheapest_hours')" />
                                <span class="sc-number-unit">h</span>
                            </span>
                        </div>
                        <input class="sc-slider" type="range"
                            :min="limitValue('cheapest_hours', 'min', 1)"
                            :max="limitValue('cheapest_hours', 'max', 12)"
                            :step="limitValue('cheapest_hours', 'step', 1)"
                            v-model.number="settingsData.thresholds.cheapest_hours"
                            @input="onThresholdInput('cheapest_hours')" />
                        <p class="sc-help">{{ $t('smart_charging.help.cheapestHours') }}</p>
                        <p v-if="fieldError('cheapest_hours')" class="sc-settings-error">{{ fieldError('cheapest_hours') }}</p>
                    </div>
                    <div class="sc-cheap-hours">
                        <div class="sc-cheap-hours-row">
                            <span>{{ $t('smart_charging.cheapHoursToday') }}</span>
                            <span>{{ cheapHoursTodayLabel }}</span>
                        </div>
                        <div class="sc-cheap-hours-row">
                            <span>{{ $t('smart_charging.cheapHoursTomorrow') }}</span>
                            <span>{{ cheapHoursTomorrowLabel }}</span>
                        </div>
                    </div>
                </div>
                <div class="chart-card sc-settings-card" style="margin-bottom: var(--space-lg);" v-show="!gpmCardVisible">
                    <div class="chart-header">
                        <span class="chart-title">{{ $t('smart_charging.thresholdsTitle') }}</span>
                    </div>
                    <p class="sc-help">{{ $t('smart_charging.help.gpmHidden') }}</p>
                </div>
                <div class="chart-card sc-settings-card" style="margin-bottom: var(--space-lg);">
                    <div class="chart-header">
                        <span class="chart-title">{{ $t('smart_charging.batteryTitle') }}</span>
                    </div>
                    <p class="sc-intro">{{ $t('smart_charging.help.batteryIntro') }}</p>
                    <label class="sc-control sc-switch">
                        <input type="checkbox" :checked="!!settingsData.enabled" @change="onEnabledChange($event.target.checked)" />
                        {{ $t('smart_charging.enabled') }}
                    </label>
                    <p class="sc-help">{{ $t('smart_charging.help.enabled') }}</p>
                    <p v-if="fieldError('smart_charging_enabled')" class="sc-settings-error">{{ fieldError('smart_charging_enabled') }}</p>
                    <div class="sc-control">
                        <div class="sc-control-head">
                            <label>{{ $t('smart_charging.modeLabel') }}</label>
                        </div>
                        <select :value="settingsData.mode" @change="onModeChange($event.target.value)">
                            <option value="forecast">{{ $t('smart_charging.modeForecast') }}</option>
                            <option value="price_band_soc">{{ $t('smart_charging.modeBand') }}</option>
                            <option value="combined">{{ $t('smart_charging.modeCombined') }}</option>
                        </select>
                        <p class="sc-help">{{ chargingModeHelp }}</p>
                        <p v-if="fieldError('smart_charging_mode')" class="sc-settings-error">{{ fieldError('smart_charging_mode') }}</p>
                    </div>
                    <div class="sc-control" v-show="showTargetSoc">
                        <div class="sc-control-head">
                            <label>{{ $t('smart_charging.settingsTargetSoc') }}</label>
                            <span class="sc-number-wrap">
                                <input class="sc-number" type="number"
                                    :min="limitValue('target_soc', 'min', 10)"
                                    :max="limitValue('target_soc', 'max', 100)"
                                    :step="limitValue('target_soc', 'step', 1)"
                                    v-model.number="settingsData.target_soc"
                                    @blur="commitSoc('target_soc')"
                                    @keyup.enter="commitSoc('target_soc')" />
                                <span class="sc-number-unit">%</span>
                            </span>
                        </div>
                        <input class="sc-slider" type="range"
                            :min="limitValue('target_soc', 'min', 10)"
                            :max="limitValue('target_soc', 'max', 100)"
                            :step="limitValue('target_soc', 'step', 1)"
                            v-model.number="settingsData.target_soc"
                            @input="onSocInput('target_soc')" />
                        <p class="sc-help">{{ $t('smart_charging.help.targetSoc') }}</p>
                        <p v-if="fieldError('target_soc')" class="sc-settings-error">{{ fieldError('target_soc') }}</p>
                    </div>
                    <div class="sc-control">
                        <div class="sc-control-head">
                            <label>{{ $t('smart_charging.settingsMinSoc') }}</label>
                            <span class="sc-number-wrap">
                                <input class="sc-number" type="number"
                                    :min="limitValue('min_soc', 'min', 0)"
                                    :max="limitValue('min_soc', 'max', 80)"
                                    :step="limitValue('min_soc', 'step', 1)"
                                    v-model.number="settingsData.min_soc"
                                    @blur="commitSoc('min_soc')"
                                    @keyup.enter="commitSoc('min_soc')" />
                                <span class="sc-number-unit">%</span>
                            </span>
                        </div>
                        <input class="sc-slider" type="range"
                            :min="limitValue('min_soc', 'min', 0)"
                            :max="limitValue('min_soc', 'max', 80)"
                            :step="limitValue('min_soc', 'step', 1)"
                            v-model.number="settingsData.min_soc"
                            @input="onSocInput('min_soc')" />
                        <p class="sc-help">{{ $t('smart_charging.help.minSoc') }}</p>
                        <p v-if="fieldError('min_soc')" class="sc-settings-error">{{ fieldError('min_soc') }}</p>
                    </div>
                    <div class="sc-control">
                        <div class="sc-control-head">
                            <label>{{ $t('smart_charging.settingsMaxSoc') }}</label>
                            <span class="sc-number-wrap">
                                <input class="sc-number" type="number"
                                    :min="limitValue('max_soc', 'min', 20)"
                                    :max="limitValue('max_soc', 'max', 100)"
                                    :step="limitValue('max_soc', 'step', 1)"
                                    v-model.number="settingsData.max_soc"
                                    @blur="commitSoc('max_soc')"
                                    @keyup.enter="commitSoc('max_soc')" />
                                <span class="sc-number-unit">%</span>
                            </span>
                        </div>
                        <input class="sc-slider" type="range"
                            :min="limitValue('max_soc', 'min', 20)"
                            :max="limitValue('max_soc', 'max', 100)"
                            :step="limitValue('max_soc', 'step', 1)"
                            v-model.number="settingsData.max_soc"
                            @input="onSocInput('max_soc')" />
                        <p class="sc-help">{{ $t('smart_charging.help.maxSoc') }}</p>
                        <p v-if="fieldError('max_soc')" class="sc-settings-error">{{ fieldError('max_soc') }}</p>
                    </div>
                    <p v-if="!plantData.battery_capacity_kwh" class="sc-settings-error">
                        {{ $t('smart_charging.batteryCapacityMissing') }}
                    </p>
                    <p class="sc-plant-line">{{ plantLine }}</p>
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

                <div class="sc-plan-card" v-if="dashboardData.live">
                    <div class="sc-plan-heading">
                        <span>🧭 {{ $t('smart_charging.planTitle') }}</span>
                        <span class="sc-plan-decision" :class="'sc-plan-' + planDecisionClass"
                              role="status" aria-live="polite">
                            {{ planDecisionText }}
                        </span>
                    </div>
                    <div class="sc-plan-values">
                        <div class="sc-plan-value" v-if="dashboardData.live.requested_grid_charge_kwh > 0">
                            <span>{{ $t('smart_charging.planChargeNow') }}</span>
                            <strong>{{ fmtKwh(dashboardData.live.requested_grid_charge_kwh) }}</strong>
                        </div>
                        <div class="sc-plan-value" v-if="dashboardData.live.reserved_future_grid_charge_kwh > 0">
                            <span>{{ $t('smart_charging.planReservedLater') }}</span>
                            <strong>{{ fmtKwh(dashboardData.live.reserved_future_grid_charge_kwh) }}</strong>
                        </div>
                        <div class="sc-plan-value" v-if="dashboardData.live.effective_storage_cost_ct_kwh != null">
                            <span>{{ $t('smart_charging.planStorageCost') }}</span>
                            <strong>{{ fmtPrice(dashboardData.live.effective_storage_cost_ct_kwh) }} ct/kWh</strong>
                        </div>
                        <div class="sc-plan-value" v-if="dashboardData.live.compared_future_price_ct_kwh != null">
                            <span>{{ $t('smart_charging.planComparedPrice') }}</span>
                            <strong>{{ fmtPrice(dashboardData.live.compared_future_price_ct_kwh) }} ct/kWh</strong>
                        </div>
                    </div>
                    <p class="sc-plan-note" v-if="dashboardData.live.reserved_future_grid_charge_kwh > 0">
                        {{ $t('smart_charging.planReservedLaterNote') }}
                    </p>
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
                    <p v-if="chartThresholdsUnavailable" class="sc-help">{{ $t('smart_charging.chartNoThresholds') }}</p>
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
                                <div class="metric-help-text" v-if="dashboardData.advisor.has_battery">{{ formatPotentialSavingsSub() }}</div>
                                
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
                gpm: {},
                chart_plan: null,
            });

            const selectedPeriod = ref('today');
            const settingsData = reactive({
                enabled: false,
                mode: 'forecast',
                target_soc: 80,
                min_soc: 10,
                max_soc: 100,
                max_charge_power_kw: 0,
                inverter_nominal_power_kw: 0,
                thresholds: {
                    mode: 'absolute',
                    max_price: 0,
                    force_charge_price: 0,
                    below_average_pct: 0,
                    cheapest_hours: 1,
                },
            });
            const settingsLimits = ref({});
            const plantData = reactive({
                battery_capacity_kwh: null,
                max_charge_power_kw: 0,
                inverter_nominal_power_kw: 0,
                charge_switch_configured: false,
            });
            const gpmMeta = reactive({
                available: false,
                is_demo: false,
                tariff_mode: null,
            });
            const gpmCheapHours = reactive({ today: [], tomorrow: [] });
            const gpmTomorrowAvailable = ref(false);
            const monthlyCostsLine = ref('');
            const settingsLoaded = ref(false);
            const settingsError = ref('');
            const settingsFieldErrors = reactive({});
            let debounceTimer = null;
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

            const thresholdMode = computed(() => {
                const mode = settingsData.thresholds && settingsData.thresholds.mode;
                return mode || 'absolute';
            });
            const showTargetSoc = computed(() => {
                return settingsData.mode === 'price_band_soc' || settingsData.mode === 'combined';
            });
            const gpmCardVisible = computed(() => {
                return Boolean(gpmMeta.available) && !gpmMeta.is_demo;
            });
            const isFixedTariff = computed(() => gpmMeta.tariff_mode === 'fixed');
            const chartThresholdsUnavailable = computed(() => {
                const source = dashboardData.chart_plan && dashboardData.chart_plan.source;
                return source === 'unavailable';
            });
            function formatCheapHourList(hours) {
                if (!Array.isArray(hours) || !hours.length) return '—';
                return hours.map((hour) => String(hour).padStart(2, '0') + ':00').join(', ');
            }
            const cheapHoursTodayLabel = computed(() => formatCheapHourList(gpmCheapHours.today));
            const cheapHoursTomorrowLabel = computed(() => {
                if (!gpmTomorrowAvailable.value) {
                    return t('smart_charging.cheapHoursTomorrowMissing');
                }
                return formatCheapHourList(gpmCheapHours.tomorrow);
            });
            const thresholdModeHelp = computed(() => {
                if (thresholdMode.value === 'below_average') {
                    return t('smart_charging.modes.thresholdBelowAverage');
                }
                if (thresholdMode.value === 'cheapest_hours') {
                    return t('smart_charging.modes.thresholdCheapestHours');
                }
                return t('smart_charging.modes.thresholdAbsolute');
            });
            const chargingModeHelp = computed(() => {
                if (settingsData.mode === 'price_band_soc') {
                    return t('smart_charging.modes.chargingBand');
                }
                if (settingsData.mode === 'combined') {
                    return t('smart_charging.modes.chargingCombined');
                }
                return t('smart_charging.modes.chargingForecast');
            });
            const plantLine = computed(() => {
                const capacity = plantData.battery_capacity_kwh;
                const capacityText = capacity
                    ? formatPlantNumber(capacity, 'kWh')
                    : t('smart_charging.capacityUnset');
                return t('smart_charging.plantLine')
                    .replace('{capacity}', capacityText)
                    .replace('{charge}', formatPower(plantData.max_charge_power_kw))
                    .replace('{inverter}', formatPower(plantData.inverter_nominal_power_kw));
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

            function shortReasonText(code) {
                if (!code) return t('smart_charging.status.reason.unknown');
                const key = `smart_charging.status.reason.${code}`;
                const text = t(key);
                if (text !== key) return text;
                return t('smart_charging.status.unknownReason').replace('{code}', String(code));
            }

            const statusPowerLine = computed(() => {
                if (gpmMeta.is_demo) return t('smart_charging.status.powerDemo');
                const dashGpm = dashboardData.gpm || {};
                const gpmOk = Boolean(gpmMeta.available || dashGpm.available);
                if (!gpmOk) return t('smart_charging.status.powerNoGpm');
                const live = dashboardData.live || {};
                if (live.is_cheap === true) {
                    if (live.is_force_price) {
                        return t('smart_charging.status.powerCheap') + ' ' + t('smart_charging.status.powerVeryCheap');
                    }
                    return t('smart_charging.status.powerCheap');
                }
                return t('smart_charging.status.powerNotCheap');
            });

            const statusBatteryLine = computed(() => {
                const live = dashboardData.live || {};
                if (!live.enabled) return t('smart_charging.status.batteryDisabled');
                let battery;
                if (live.decision === 'load') battery = t('smart_charging.status.batteryLoad');
                else if (live.decision === 'wait') battery = t('smart_charging.status.batteryWait');
                else battery = t('smart_charging.status.batteryNotLoad');
                return battery + t('smart_charging.status.because') + shortReasonText(live.reason);
            });

            const statusReservedLine = computed(() => {
                const reserved = Number(dashboardData.live?.reserved_future_grid_charge_kwh || 0);
                if (!(reserved > 0)) return '';
                return t('smart_charging.status.reservedLater').replace('{kwh}', reserved.toFixed(1));
            });

            const setupCheckItems = computed(() => {
                const items = [];
                const capacity = plantData.battery_capacity_kwh;
                if (capacity == null || Number(capacity) <= 0) {
                    items.push({ id: 'capacity', level: 'red', text: t('smart_charging.setup.capacityMissing') });
                }
                if (!plantData.charge_switch_configured) {
                    items.push({ id: 'switch', level: 'yellow', text: t('smart_charging.setup.switchMissing') });
                }
                if (gpmMeta.is_demo) {
                    items.push({ id: 'gpm_demo', level: 'yellow', text: t('smart_charging.setup.gpmDemo') });
                } else if (!gpmMeta.available) {
                    items.push({ id: 'gpm', level: 'yellow', text: t('smart_charging.setup.gpmMissing') });
                }
                if (!settingsData.enabled) {
                    items.push({ id: 'enabled', level: 'gray', text: t('smart_charging.setup.chargingOff') });
                }
                return items;
            });

            const planDecisionClass = computed(() => {
                const decision = dashboardData.live?.decision;
                if (decision === 'load') return 'load';
                if (decision === 'wait') return 'wait';
                return 'not-load';
            });

            const planDecisionText = computed(() => {
                const decision = dashboardData.live?.decision;
                if (decision === 'load') return t('smart_charging.planDecisionLoad');
                if (decision === 'wait') return t('smart_charging.planDecisionWait');
                return t('smart_charging.planDecisionNotLoad');
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
                    const label = typeof h.hour_key === 'string' && h.hour_key.length >= 16
                        ? h.hour_key.slice(11, 16)
                        : '';
                    return label;
                });
                const timeKeys = data.map((h, index) =>
                    typeof h.hour_key === 'string' && h.hour_key
                        ? h.hour_key
                        : 'hour-' + index
                );

                const prices = data.map(h => h.price_ct_kwh);
                const charging = data.map(h => h.is_future ? null : h.grid_to_battery_kwh);
                const solar = data.map(h => h.is_future ? null : h.solar_yield_kwh);
                const priceLegend = t('smart_charging.chartLegendPrice');
                const chargingLegend = t('smart_charging.chartLegendCharging');
                const solarLegend = t('smart_charging.chartLegendSolar');
                const cheapLegend = t('smart_charging.chartLegendCheapHours');

                const firstFutureIndex = data.findIndex(h => h.is_future);
                const cheapFill = 'rgba(34, 197, 94, 0.14)';
                const chartAreas = [];
                if (firstFutureIndex >= 0) {
                    chartAreas.push([
                        {
                            xAxis: timeKeys[firstFutureIndex],
                            label: {
                                show: true,
                                formatter: t('smart_charging.chartForecastZone'),
                                color: getThemeColor('--text-muted', '#8b949e'),
                                fontSize: 9,
                            },
                            itemStyle: { color: 'rgba(0, 210, 255, 0.035)' },
                        },
                        { xAxis: timeKeys[data.length - 1] },
                    ]);
                    let cheapStart = -1;
                    for (let index = firstFutureIndex; index <= data.length; index += 1) {
                        const cheap = index < data.length && data[index].is_future && data[index].is_cheap;
                        if (cheap && cheapStart < 0) cheapStart = index;
                        if (!cheap && cheapStart >= 0) {
                            const endIndex = Math.min(index, data.length - 1);
                            chartAreas.push([
                                {
                                    xAxis: timeKeys[cheapStart],
                                    itemStyle: { color: cheapFill },
                                },
                                { xAxis: timeKeys[endIndex] },
                            ]);
                            cheapStart = -1;
                        }
                    }
                }

                const option = {
                    backgroundColor: 'transparent',
                    tooltip: {
                        trigger: 'axis',
                        backgroundColor: getThemeColor('--bg-card', 'rgba(10,14,20,0.95)'),
                        borderColor: getThemeColor('--border-default', 'rgba(255,255,255,0.1)'),
                        textStyle: { color: getThemeColor('--text-primary', '#f0f6fc'), fontFamily: 'var(--font-mono)', fontSize: 11 },
                        formatter: function(params) {
                            const dataIndex = params[0].dataIndex;
                            let html = '<b>' + (times[dataIndex] || params[0].axisValue) + '</b>';
                            params.forEach(function(p) {
                                if (p.value != null) {
                                    let valStr;
                                    if (p.seriesName === priceLegend) {
                                        valStr = p.value.toFixed(2) + ' ct/kWh';
                                    } else {
                                        valStr = p.value.toFixed(3) + ' kWh';
                                    }
                                    html += '<br/><span style="color:' + p.color + '">● ' + p.seriesName + ': <b>' + valStr + '</b></span>';
                                    if (p.seriesName === priceLegend && data[p.dataIndex]?.is_future) {
                                        html += '<br/><span style="color: var(--text-muted);">' + t('smart_charging.chartTooltipForecastPrice') + '</span>';
                                        if (data[p.dataIndex]?.is_cheap) {
                                            html += '<br/><span style="color: #22c55e;">' + t('smart_charging.chartCheapHour') + '</span>';
                                        }
                                    }
                                }
                            });
                            return html;
                        }
                    },
                    legend: {
                        data: [
                            { name: priceLegend, icon: 'line', itemStyle: { color: '#00d2ff' } },
                            { name: chargingLegend, icon: 'bar', itemStyle: { color: '#22c55e' } },
                            { name: solarLegend, icon: 'bar', itemStyle: { color: '#f59e0b' } },
                            { name: cheapLegend, icon: 'roundRect', itemStyle: { color: '#22c55e' } },
                        ],
                        bottom: 0,
                        textStyle: { color: getThemeColor('--text-secondary', '#8b949e'), fontSize: 11 },
                    },
                    grid: { left: 45, right: 45, top: 25, bottom: 45 },
                    xAxis: {
                        type: 'category',
                        data: timeKeys,
                        axisLine: { lineStyle: { color: getThemeColor('--border-default', 'rgba(255,255,255,0.1)') } },
                        axisLabel: {
                            color: getThemeColor('--text-secondary', '#8b949e'),
                            fontSize: 9,
                            rotate: 30,
                            formatter: function(value, index) { return times[index] || value; },
                        },
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
                            name: priceLegend,
                            type: 'line',
                            yAxisIndex: 1,
                            data: prices,
                            smooth: true,
                            showSymbol: false,
                            lineStyle: { width: 3, color: '#00d2ff' },
                            itemStyle: { color: '#00d2ff' },
                            markArea: chartAreas.length > 0 ? {
                                silent: true,
                                data: chartAreas,
                            } : undefined,
                            markLine: firstFutureIndex >= 0 ? {
                                symbol: ['none', 'none'],
                                lineStyle: { color: 'rgba(0, 210, 255, 0.45)', type: 'dashed' },
                                label: {
                                    show: true,
                                    formatter: t('smart_charging.chartNowBoundary'),
                                    color: getThemeColor('--text-muted', '#8b949e'),
                                    fontSize: 9,
                                },
                                data: [{ xAxis: timeKeys[firstFutureIndex] }],
                            } : undefined,
                        },
                        {
                            name: chargingLegend,
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
                            name: solarLegend,
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
                        },
                        {
                            name: cheapLegend,
                            type: 'line',
                            data: [],
                            silent: true,
                            showSymbol: false,
                            lineStyle: { width: 0, opacity: 0 },
                            itemStyle: { color: cheapFill },
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
                        unboundPotentialSub: "Speicherbarer Export bei vollem Akku, begrenzt auf späteren Netzbezug",
                        potentialSavings: "Netto-Potenzial",
                        potentialSavingsSub: "Bewertet mit {value} ct/kWh nach Einspeisevergütung ({feed} ct/kWh) und Speicherverlusten",
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
                        sizingGood: "Dein Akku ({cap} kWh) ist optimal dimensioniert. Eine Vergrößerung hätte bisher nur {savings} Netto-Ersparnis gebracht.",
                        sizingNeedMore: "Ein größerer Akku könnte sich lohnen! Du hättest in diesem Jahr bereits {savings} netto sparen können.",
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
                        unboundPotentialSub: "Storable export while battery was full, capped by later grid import",
                        potentialSavings: "Net Potential",
                        potentialSavingsSub: "Valued at {value} ct/kWh after feed-in tariff ({feed} ct/kWh) and storage losses",
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
                        sizingGood: "Your battery ({cap} kWh) is optimally sized. A larger battery would have only added {savings} net savings so far.",
                        sizingNeedMore: "A larger battery could be worth it! You could have saved an additional {savings} net so far this year.",
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
                if (battery_capacity == null) return localText('noBatteryDesc');
                if (potential_savings_eur < 15.0) {
                    return localText('sizingGood')
                        .replace('{cap}', battery_capacity.toFixed(1))
                        .replace('{savings}', fmtEur(potential_savings_eur));
                } else {
                    return localText('sizingNeedMore')
                        .replace('{savings}', fmtEur(potential_savings_eur));
                }
            }

            function formatPotentialSavingsSub() {
                if (!dashboardData.advisor) return localText('potentialSavingsSub');
                const netValue = Number(dashboardData.advisor.net_value_ct_kwh || 0).toFixed(1);
                const feedIn = Number(dashboardData.advisor.feed_in_tariff_ct || 0).toFixed(1);
                return localText('potentialSavingsSub')
                    .replace('{value}', netValue)
                    .replace('{feed}', feedIn);
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
                        dashboardData.gpm = data.gpm || {};
                        dashboardData.chart_plan = data.chart_plan || null;
                        if (data.gpm) {
                            applyCheapHours(data.gpm.cheap_hours, data.gpm.tomorrow_available);
                        }
                        
                        nextTick(() => {
                            renderChart();
                        });
                    }
                } catch (err) {
                    console.error('Error loading smart charging dashboard data:', err);
                }
            }

            async function loadSettings() {
                try {
                    const data = await SFMLApi.fetch('/api/sfml_stats/smart_charging/settings');
                    if (data && data.success) {
                        applyServerPayload(data);
                        settingsLoaded.value = true;
                    } else if (!settingsError.value) {
                        settingsError.value = t('smart_charging.settingsLoadFailed');
                    }
                } catch (err) {
                    if (!settingsError.value) {
                        settingsError.value = t('smart_charging.settingsLoadFailed');
                    }
                }
            }

            function translatedErrorCode(code) {
                if (!code) return '';
                const key = `smart_charging.errors.${code}`;
                const text = t(key);
                return text !== key ? text : String(code);
            }

            function fieldError(field) {
                return settingsFieldErrors[field] || '';
            }

            function applyCaughtSettingsError(err) {
                Object.keys(settingsFieldErrors).forEach((key) => {
                    delete settingsFieldErrors[key];
                });
                const errors = (err && err.errors) || (err && err.body && err.body.errors);
                if (errors && typeof errors === 'object') {
                    Object.entries(errors).forEach(([field, code]) => {
                        settingsFieldErrors[field] = translatedErrorCode(code);
                    });
                    const first = Object.values(settingsFieldErrors)[0];
                    settingsError.value = first || translatedErrorCode(err && err.code);
                    return;
                }
                const code = (err && err.code) || (err && err.body && err.body.error);
                settingsError.value = translatedErrorCode(code) || String(err);
            }

            function clearSettingsErrors() {
                Object.keys(settingsFieldErrors).forEach((key) => {
                    delete settingsFieldErrors[key];
                });
                settingsError.value = '';
            }

            function limitValue(field, bound, fallback) {
                const limits = settingsLimits.value[field];
                if (!limits || limits[bound] == null) return fallback;
                return limits[bound];
            }

            function formatUnlimited(value) {
                if (value === 0 || value === '0') return t('common.unlimited');
                return value == null ? '—' : String(value);
            }

            function localeTag() {
                const lang = window.SFMLI18n && window.SFMLI18n.current;
                if (lang === 'de') return 'de-DE';
                if (lang === 'pl') return 'pl-PL';
                return 'en-US';
            }

            function formatPlantNumber(value, unit) {
                const number = Number(value).toLocaleString(localeTag(), {
                    maximumFractionDigits: 1,
                    minimumFractionDigits: 0,
                });
                return number + ' ' + unit;
            }

            function formatPower(value) {
                if (value === 0 || value === '0' || value == null) {
                    return t('common.unlimited');
                }
                return formatPlantNumber(value, 'kW');
            }

            function formatThreshold(value) {
                if (value == null || value === '') return '—';
                return formatPlantNumber(value, 'ct/kWh');
            }

            function formatPercent(value) {
                if (value == null || value === '') return '—';
                return String(value) + ' %';
            }

            function formatHours(value) {
                if (value == null || value === '') return '—';
                return String(value);
            }

            function applyServerPayload(data) {
                if (!data) return;
                if (data.settings) {
                    Object.keys(data.settings).forEach((key) => {
                        if (key === 'thresholds') return;
                        settingsData[key] = data.settings[key];
                    });
                }
                if (data.thresholds) {
                    if (!settingsData.thresholds) {
                        settingsData.thresholds = {
                            mode: 'absolute',
                            max_price: 0,
                            force_charge_price: 0,
                            below_average_pct: 0,
                            cheapest_hours: 1,
                        };
                    }
                    Object.assign(settingsData.thresholds, data.thresholds);
                }
                if (data.limits) settingsLimits.value = data.limits;
                if (data.plant) Object.assign(plantData, data.plant);
                if (data.gpm) Object.assign(gpmMeta, data.gpm);
            }

            function applyCheapHours(hours, tomorrowAvailable) {
                const payload = hours && typeof hours === 'object' ? hours : {};
                gpmCheapHours.today = Array.isArray(payload.today) ? payload.today : [];
                gpmCheapHours.tomorrow = Array.isArray(payload.tomorrow) ? payload.tomorrow : [];
                if (tomorrowAvailable != null) {
                    gpmTomorrowAvailable.value = Boolean(tomorrowAvailable);
                }
            }

            function formatMonthEuro(value) {
                const number = Number(value);
                if (!Number.isFinite(number)) return '';
                return number.toLocaleString(localeTag(), {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                });
            }

            function monthlyCostsText(payload) {
                if (!payload || payload.success === false) return '';
                const months = Array.isArray(payload.months) ? payload.months : [];
                const current = months.find((row) => row && row.is_current);
                if (!current || current.total_eur == null || current.total_eur === '') return '';
                const total = Number(current.total_eur);
                if (!Number.isFinite(total)) return '';
                let line = t('smart_charging.status.monthCost').replace('{eur}', formatMonthEuro(total));
                const expected = payload.projection && payload.projection.expected_eur;
                if (expected != null && expected !== '') {
                    const projected = Number(expected);
                    if (Number.isFinite(projected)) {
                        line += ' · ' + t('smart_charging.status.monthCostProjection').replace(
                            '{eur}',
                            formatMonthEuro(projected)
                        );
                    }
                }
                if (payload.is_demo) {
                    line += ' ' + t('smart_charging.status.monthCostDemo');
                }
                return line;
            }

            async function loadMonthlyCosts() {
                try {
                    const payload = await SFMLApi.fetch('/api/sfml_stats/gpm/monthly_costs', {
                        forceRefresh: true,
                        ttl: 0,
                    });
                    monthlyCostsLine.value = monthlyCostsText(payload);
                } catch (_err) {
                    monthlyCostsLine.value = '';
                }
            }

            async function loadGpmStatus() {
                try {
                    const payload = await SFMLApi.fetch('/api/sfml_stats/gpm/status', {
                        forceRefresh: true,
                        ttl: 0,
                    });
                    if (payload && payload.success) {
                        applyCheapHours(payload.cheap_hours, payload.tomorrow_available);
                    }
                } catch (_err) {
                    /* keep last known hours */
                }
            }

            async function postSettings(payload) {
                try {
                    const data = await SFMLApi.postAuthenticated(
                        '/api/sfml_stats/smart_charging/settings',
                        payload
                    );
                    applyServerPayload(data);
                    clearSettingsErrors();
                    await loadGpmStatus();
                    await loadMonthlyCosts();
                    await loadData();
                } catch (err) {
                    applyCaughtSettingsError(err);
                    await loadSettings();
                }
            }

            function debouncePost(payload) {
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => postSettings(payload), 400);
            }

            function onEnabledChange(checked) {
                debouncePost({ smart_charging_enabled: !!checked });
            }
            function onModeChange(value) {
                debouncePost({ smart_charging_mode: value });
            }
            function onSocInput(field) {
                debouncePost({ [field]: Number(settingsData[field]) });
            }
            function commitSoc(field) {
                debouncePost({ [field]: Number(settingsData[field]) });
            }
            function onThresholdInput(field) {
                debouncePost({ [field]: Number(settingsData.thresholds[field]) });
            }
            function commitThreshold(field) {
                debouncePost({ [field]: Number(settingsData.thresholds[field]) });
            }
            function onThresholdModeChange(value) {
                debouncePost({ threshold_mode: value });
            }

            let pollInterval = null;
            const handleResize = () => {
                if (chartInstance) chartInstance.resize();
            };

            onMounted(() => {
                loadData();
                loadSettings();
                loadGpmStatus();
                loadMonthlyCosts();
                pollInterval = setInterval(loadData, 5000);
                window.addEventListener('resize', handleResize);
            });

            onUnmounted(() => {
                if (pollInterval) clearInterval(pollInterval);
                window.removeEventListener('resize', handleResize);
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
                planDecisionClass,
                planDecisionText,
                getTargetRotation,
                formatPrice,
                formatKwh,
                fmtKwh,
                fmtPrice,
                fmtEur,
                localText,
                getSizingRecommendation,
                formatPotentialSavingsSub,
                getPvChargePercent,
                getGridChargePercent,
                settingsData,
                plantData,
                settingsError,
                fieldError,
                onEnabledChange,
                onModeChange,
                onSocInput,
                commitSoc,
                onThresholdInput,
                commitThreshold,
                onThresholdModeChange,
                limitValue,
                formatUnlimited,
                formatThreshold,
                formatPercent,
                formatHours,
                thresholdMode,
                thresholdModeHelp,
                chargingModeHelp,
                showTargetSoc,
                gpmCardVisible,
                isFixedTariff,
                plantLine,
                gpmMeta,
                cheapHoursTodayLabel,
                cheapHoursTomorrowLabel,
                chartThresholdsUnavailable,
                statusPowerLine,
                statusBatteryLine,
                statusReservedLine,
                monthlyCostsLine,
                setupCheckItems,
                settingsLoaded,
            };
        }
    };

    // Inject Stylesheet dynamically for clean layout component-scoping
    const style = document.createElement('style');
    style.textContent = `
        .page-smart-charging .section-title {
            white-space: normal;
            overflow: visible;
            text-overflow: unset;
            max-width: none;
            width: 100%;
        }
        .page-smart-charging .section-header {
            display: flex;
            align-items: center;
            gap: var(--space-md);
            flex-wrap: wrap;
        }
        .sc-demo-badge {
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            color: #92400e;
            background: #fde68a;
            border-radius: 999px;
            padding: 4px 10px;
        }
        .sc-status-card .sc-status-line {
            margin: 0 0 6px;
            font-size: 1rem;
            line-height: 1.4;
            color: var(--text-primary);
        }
        .sc-status-card .sc-status-line:last-child {
            margin-bottom: 0;
        }
        .sc-status-reserved {
            margin: 8px 0 0;
            font-size: 0.85rem;
            color: var(--text-secondary);
        }
        .sc-status-month {
            display: block;
            margin: 8px 0 0;
            padding: 0;
            border: 0;
            background: none;
            font: inherit;
            font-size: 0.85rem;
            color: var(--text-secondary);
            text-align: left;
            cursor: pointer;
            text-decoration: underline;
            text-underline-offset: 2px;
        }
        .sc-setup-ok {
            margin: 0 0 var(--space-lg);
            color: #15803d;
            font-size: 0.9rem;
        }
        .sc-setup-item {
            margin: 0 0 8px;
            padding-left: 10px;
            border-left: 4px solid transparent;
            font-size: 0.9rem;
            line-height: 1.4;
        }
        .sc-setup-item:last-child {
            margin-bottom: 0;
        }
        .sc-setup-red { border-left-color: #dc2626; }
        .sc-setup-yellow { border-left-color: #d97706; }
        .sc-setup-gray { border-left-color: #9ca3af; color: var(--text-secondary); }
        .sc-settings-card select {
            width: 100%;
            max-width: none;
        }
        .sc-control {
            margin: 0 0 var(--space-md);
        }
        .sc-control-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: var(--space-sm);
            margin-bottom: 4px;
        }
        .sc-control-value {
            font-family: var(--font-mono);
            font-size: 0.85rem;
            color: var(--text-primary);
            white-space: nowrap;
        }
        .sc-number-wrap {
            display: flex;
            align-items: baseline;
            gap: 0.35rem;
            flex-shrink: 0;
        }
        .sc-number {
            width: 5.5rem;
            font-family: var(--font-mono);
            font-size: 0.85rem;
            text-align: right;
        }
        .sc-number-unit {
            font-size: 0.75rem;
            color: var(--text-secondary);
            white-space: nowrap;
        }
        .sc-slider {
            width: 100%;
            display: block;
            margin: 0;
        }
        .sc-cheap-hours {
            margin: var(--space-sm) 0 0;
            padding-top: var(--space-sm);
            border-top: 1px solid var(--border-default, rgba(255,255,255,0.08));
        }
        .sc-cheap-hours-row {
            display: flex;
            justify-content: space-between;
            gap: var(--space-sm);
            font-size: 0.85rem;
            line-height: 1.4;
            margin: 0 0 6px;
        }
        .sc-cheap-hours-row:last-child {
            margin-bottom: 0;
        }
        .sc-cheap-hours-row span:last-child {
            text-align: right;
            font-family: var(--font-mono);
            color: var(--text-primary);
        }
        .sc-intro {
            margin: 0 0 var(--space-md);
            color: var(--text-secondary);
            font-size: 0.9rem;
            line-height: 1.4;
        }
        .sc-help {
            margin: 4px 0 0;
            color: var(--text-muted);
            font-size: 0.75rem;
            line-height: 1.35;
        }
        .sc-settings-error {
            color: var(--warning, #f59e0b);
            margin: 0 0 var(--space-sm);
        }
        .sc-switch {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            margin-bottom: 4px;
        }
        .sc-plant-line {
            margin: var(--space-sm) 0 0;
            color: var(--text-secondary);
            font-size: 0.85rem;
            line-height: 1.4;
        }
        .sc-plan-card {
            margin-bottom: var(--space-lg);
            padding: var(--space-md);
            background: rgba(0, 210, 255, 0.03);
            border: 1px solid rgba(0, 210, 255, 0.16);
            border-radius: var(--radius-md);
        }

        .sc-plan-heading {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: var(--space-sm);
            color: var(--text-primary);
            font-size: 0.85rem;
            font-weight: 700;
        }

        .sc-plan-decision {
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 0.65rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .sc-plan-load { color: var(--success); background: color-mix(in srgb, var(--success) 12%, transparent); }
        .sc-plan-wait { color: var(--warning); background: color-mix(in srgb, var(--warning) 12%, transparent); }
        .sc-plan-not-load { color: var(--text-secondary); background: rgba(148, 163, 184, 0.12); }

        .sc-plan-values {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: var(--space-sm);
            margin-top: var(--space-md);
        }

        .sc-plan-value {
            display: flex;
            flex-direction: column;
            gap: 2px;
            padding: var(--space-sm);
            background: rgba(255, 255, 255, 0.02);
            border-radius: var(--radius-sm);
        }

        .sc-plan-value span, .sc-plan-note {
            color: var(--text-muted);
            font-size: 0.68rem;
        }

        .sc-plan-value strong {
            color: var(--text-primary);
            font-family: var(--font-mono);
            font-size: 0.85rem;
        }

        .sc-plan-note {
            margin: var(--space-sm) 0 0;
            line-height: 1.35;
        }

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
