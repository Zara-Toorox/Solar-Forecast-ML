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

    function scFinite(value) {
        return value == null || value === "" ? null : (Number.isFinite(+value) ? +value : null);
    }

    function shownMoney(record, field) {
        const source = record && typeof record === "object" ? record : null;
        if (!source) return { amount: null, incomplete: false };
        const main = scFinite(source[field]);
        if (main != null) return { amount: main, incomplete: false };
        const part = scFinite(source[field + "_priced_part"]);
        if (part != null && source.complete === false) return { amount: part, incomplete: true };
        return { amount: null, incomplete: false };
    }

    function scLocale() {
        const lang = window.SFMLI18n ? window.SFMLI18n.current : "de";
        return ({ de: "de-DE", en: "en-GB", pl: "pl-PL" })[lang] || "de-DE";
    }

    function compressDayRanges(days) {
        if (!Array.isArray(days) || !days.length) return [];
        const sorted = days.slice().sort();
        const ranges = [];
        let start = sorted[0];
        let end = sorted[0];
        const nextDay = (iso) => {
            const parts = iso.split("-").map(Number);
            const nextUtc = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12));
            nextUtc.setUTCDate(nextUtc.getUTCDate() + 1);
            return nextUtc.toISOString().slice(0, 10);
        };
        for (let index = 1; index < sorted.length; index += 1) {
            const day = sorted[index];
            if (day === nextDay(end)) {
                end = day;
            } else {
                ranges.push([start, end]);
                start = day;
                end = day;
            }
        }
        ranges.push([start, end]);
        return ranges;
    }

    function formatLocalDay(iso, locale) {
        const parts = String(iso).split("-").map(Number);
        if (parts.length !== 3) return String(iso);
        const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12));
        return new Intl.DateTimeFormat(locale, {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }).format(date);
    }

    function formatDayRangesText(days) {
        const ranges = compressDayRanges(days);
        const locale = scLocale();
        return ranges
            .map(([start, end]) => {
                const left = formatLocalDay(start, locale);
                if (start === end) return left;
                return `${left}\u2013${formatLocalDay(end, locale)}`;
            })
            .join(", ");
    }

    function daysWithoutPriceList(record) {
        const list = record && record.days_without_price;
        if (!Array.isArray(list)) return [];
        return list.filter((day) => typeof day === "string" && day.length >= 10);
    }

    function fmtPrice(val) {
        const number = scFinite(val);
        if (number == null) return "\u2013";
        return new Intl.NumberFormat(scLocale(), {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(number);
    }

    function fmtEur(val) {
        const number = scFinite(val);
        if (number == null) return "\u2013";
        const formatted = new Intl.NumberFormat(scLocale(), {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(number);
        return `${formatted} €`;
    }

    function kpiMoney(record, field) {
        const shown = shownMoney(record, field);
        return shown.amount == null ? "\u2013" : fmtEur(shown.amount);
    }

    function kpiIncomplete(record, field) {
        return shownMoney(record, field).incomplete;
    }

    function statusChipVisibility(live, mode) {
        const flags = {
            chargingSince: false,
            waitingSince: false,
            soc: false,
            socTarget: false,
            reserved: false,
            nextWindow: false,
            nextWindowBand: false,
        };
        if (!live || typeof live !== 'object') return flags;
        if (live.charging_since) flags.chargingSince = true;
        if (live.waiting_since && live.decision === 'wait') flags.waitingSince = true;
        if (live.current_soc != null && live.current_soc !== '') flags.soc = true;
        if (
            flags.soc
            && (mode === 'price_band_soc' || mode === 'combined')
            && live.target_soc != null
            && live.target_soc !== ''
        ) {
            flags.socTarget = true;
        }
        if (Number(live.reserved_future_grid_charge_kwh) > 0) flags.reserved = true;
        const hour = live.next_cheap_hour;
        const hasHour = hour != null && hour !== '';
        const inWindow = live.grid_allowed === true
            || (live.grid_allowed == null && live.is_cheap === true);
        if (hasHour && (!inWindow || live.decision === 'wait')) {
            flags.nextWindow = true;
            flags.nextWindowBand = mode === 'price_band_soc';
        }
        return flags;
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
                    <div class="sc-hubble-row">
                        <div class="sc-hubble-avatar" aria-hidden="true">
                            <img class="sc-hubble-persona" src="/api/sfml_stats/static/modern/assets/hubble-persona-portrait.jpg" alt="" width="108" height="108">
                        </div>
                        <div class="sc-hubble-bubble" role="status" aria-live="polite">
                            <p class="sc-status-line"><span class="sc-status-ampel" :class="'sc-status-' + statusAmpel" aria-hidden="true"></span>{{ statusHeadlineText }}</p>
                            <p class="sc-status-why" v-if="statusWhyText">{{ statusWhyText }}</p>
                            <p class="sc-status-next" v-if="statusNextText">{{ statusNextText }}</p>
                        </div>
                    </div>
                    <div class="live-metrics sc-status-chips" v-if="statusChips.length">
                        <div class="live-metric" v-for="chip in statusChips" :key="chip.id">
                            <span>{{ chip.label }}</span>
                            <strong>{{ chip.value }}</strong>
                            <span v-if="chip.progress != null" class="sc-soc-bar" aria-hidden="true">
                                <span class="sc-soc-bar-fill" :style="{ width: chip.progress + '%' }"></span>
                            </span>
                        </div>
                    </div>
                </div>

                <slot name="intro"></slot>

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
                    <div class="sc-control" v-show="thresholdMode === 'absolute'">
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
                        <div class="eb-value" style="color: var(--chart-series-ai, #a855f7);">
                            {{ (dashboardData.advisor && !dashboardData.advisor.has_battery) ? localText('noBattery') : (fmtPrice(shownMoney(currentKpis, 'avg_price_ct').amount) + ' ct') }}
                        </div>
                        <div class="eb-label">{{ $t('smart_charging.avgChargePrice') }}</div>
                        <div class="eb-sub">{{ $t('smart_charging.avgPricePerKwh') }}</div>
                    </div>

                    <div class="eb-item">
                        <div class="eb-icon">💚</div>
                        <div class="eb-value" style="color: var(--success, #22c55e);">
                            {{ (dashboardData.advisor && !dashboardData.advisor.has_battery) ? localText('noBattery') : kpiMoney(currentKpis, 'savings_eur') }}
                            <span v-if="kpiIncomplete(currentKpis, 'savings_eur')" class="sc-incomplete"> {{ $t('gpm.billIncomplete') }}</span>
                        </div>
                        <div class="eb-label">{{ $t('smart_charging.smartSavings') }}</div>
                        <div class="eb-sub">{{ $t('smart_charging.savedPerPeriod') }}</div>
                        <p v-if="kpiPriceHint(currentKpis)" class="sc-price-hint">{{ kpiPriceHint(currentKpis) }}<a class="sc-price-hint-link" href="#gpm/gpm-csv-import" @click.prevent="openGpmCsvImport">{{ $t('gpm.missingGpmPricesCsv') }}</a>{{ $t('gpm.missingGpmPricesEnd') }}</p>
                    </div>
                </div>

                <div class="chart-card" style="margin-bottom: var(--space-lg);" v-if="gridChargePeriods.length">
                    <div class="chart-header" style="margin-bottom: var(--space-md);">
                        <span class="chart-title">⚡🔋 {{ $t('smart_charging.gridChargeTitle') }}</span>
                    </div>
                    <div class="eb-grid">
                        <div class="eb-item" v-for="period in gridChargePeriods" :key="period.id">
                            <div class="eb-label">{{ period.label }}</div>
                            <div class="eb-value" style="color: var(--solar);">{{ fmtKwh(period.kwh) }}</div>
                            <div class="eb-sub" v-if="period.avg_ct_kwh != null || !period.unpriced_kwh">{{ kpiMoney(period, 'cost_eur') }}<span v-if="kpiIncomplete(period, 'cost_eur')"> {{ $t('gpm.billIncomplete') }}</span></div>
                            <div class="eb-sub" v-if="period.avg_ct_kwh != null">{{ $t('smart_charging.gridChargeAvg', { price: fmtPrice(period.avg_ct_kwh) }) }}</div>
                            <div class="eb-sub" v-if="period.unpriced_kwh > 0">{{ $t('smart_charging.gridChargeUnpriced', { kwh: $n(period.unpriced_kwh, 1) }) }}</div>
                            <div class="eb-sub" v-if="period.under_limit_share != null">{{ $t('smart_charging.gridChargeUnderLimit', { pct: $n(period.under_limit_share * 100, 0) }) }}</div>
                        </div>
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
                        <div class="advisor-subcard advisor-subcard-wide">
                            <div class="advisor-subcard-header">
                                <span class="subcard-icon">🔋</span>
                                <div>
                                    <div class="subcard-title">{{ localText('batterySizing') }}</div>
                                    <div class="subcard-desc">{{ sizingWindowText() }}</div>
                                </div>
                            </div>
                            <div class="sizing-layout" v-if="dashboardData.advisor.has_battery && dashboardData.advisor.sizing">
                                <div class="sizing-main">
                                    <div class="advisor-metric-row">
                                        <span class="metric-label">{{ localText('fullDays') }}</span>
                                        <span class="metric-value">{{ dashboardData.advisor.sizing.full_days_measurable ? (dashboardData.advisor.sizing.full_days + ' / ' + dashboardData.advisor.sizing.full_days_measurable) : localText('notMeasurable') }}</span>
                                    </div>
                                    <div class="metric-help-text">{{ localText('fullDaysSub') }}</div>

                                    <div class="sizing-table-wrap">
                                        <table class="sizing-steps">
                                            <thead>
                                                <tr>
                                                    <th>{{ localText('colStep') }}</th>
                                                    <th>{{ localText('colPv') }}</th>
                                                    <th>{{ localText('colShift') }}</th>
                                                    <th>{{ localText('colYear') }}</th>
                                                    <th>{{ localText('colPayback') }}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr v-for="step in dashboardData.advisor.sizing.steps" :key="step.step_kwh">
                                                    <td class="sizing-step">+{{ $n(step.step_kwh, 1) }} kWh</td>
                                                    <td>{{ fmtEurRange(step.pv_eur_min, step.pv_eur_max) }}</td>
                                                    <td>
                                                        {{ dashboardData.advisor.sizing.time_variable_tariff ? fmtEur(step.shift_eur) : '–' }}
                                                        <small v-if="dashboardData.advisor.sizing.time_variable_tariff" class="sizing-best">{{ localText('bestCase').replace('{eur}', fmtEur(step.shift_best_eur)) }}</small>
                                                    </td>
                                                    <td class="sizing-year">{{ fmtEur(step.annual_eur) }}</td>
                                                    <td>{{ step.payback_years != null ? localText('years').replace('{years}', $n(step.payback_years, 0)) : '–' }}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <div class="metric-help-text sizing-assumptions">{{ sizingAssumptionsText() }}</div>
                                </div>

                                <div class="sizing-side">
                                    <div class="advisor-recommendation-box">
                                        <span class="recommendation-badge">{{ localText('sizingRecommendation') }}</span>
                                        <p class="recommendation-text">{{ getSizingRecommendation() }}</p>
                                    </div>

                                    <form class="sizing-settings" @submit.prevent="saveSizingSettings">
                                        <label class="sizing-field">
                                            <span class="metric-label">{{ localText('setStep') }}</span>
                                            <input class="sc-number" type="number" min="0.5" step="0.5" v-model="sizingForm.step_kwh" :placeholder="dashboardData.advisor.sizing.step_kwh">
                                        </label>
                                        <label class="sizing-field">
                                            <span class="metric-label">{{ localText('setCost') }}</span>
                                            <input class="sc-number" type="number" min="1" step="1" v-model="sizingForm.cost_per_kwh_eur" :placeholder="localText('setCostPlaceholder')">
                                        </label>
                                        <label class="sizing-field">
                                            <span class="metric-label">{{ localText('setLifetime') }}</span>
                                            <input class="sc-number" type="number" min="1" max="40" step="1" v-model="sizingForm.lifetime_years">
                                        </label>
                                        <label class="sizing-field">
                                            <span class="metric-label">{{ localText('setCycles') }}</span>
                                            <input class="sc-number" type="number" min="500" max="20000" step="100" v-model="sizingForm.cycles">
                                        </label>
                                        <div class="sizing-actions">
                                            <span v-if="sizingError" class="sizing-error">{{ sizingError }}</span>
                                            <button type="submit" class="button" :disabled="sizingSaving">{{ localText('setSave') }}</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                            <div class="advisor-subcard-content" v-else>
                                <div class="metric-help-text">{{ dashboardData.advisor.has_battery ? localText('insufficientData') : localText('noBatteryDesc') }}</div>
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
                                    <span class="metric-value">{{ $n(dashboardData.advisor.avg_solar_yield_kwh, 2) }} kWh</span>
                                </div>
                                <div class="metric-help-text">{{ localText('avgDailyYieldSub') }}</div>
                                
                                <div class="advisor-metric-row">
                                    <span class="metric-label">{{ localText('houseConsumption') }}</span>
                                    <span class="metric-value">{{ $n(dashboardData.advisor.avg_house_consumption_kwh, 2) }} kWh</span>
                                </div>
                                <div class="metric-help-text">{{ localText('houseConsumptionSub') }}</div>
                                
                                <div class="advisor-metric-row">
                                    <span class="metric-label">{{ localText('autarkyRate') }}</span>
                                    <span class="metric-value" style="color: var(--success, #22c55e);">{{ $n(dashboardData.advisor.avg_autarky_percent, 1) }}%</span>
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
                                    <span class="metric-value" style="color: var(--chart-series-ai, #a855f7);">
                                        {{ dashboardData.advisor.has_battery ? formatKwh(dashboardData.advisor.battery_charge_solar_kwh + dashboardData.advisor.battery_charge_grid_kwh) : localText('noBattery') }}
                                    </span>
                                </div>
                                <div class="metric-help-text" v-if="dashboardData.advisor.has_battery">
                                    {{ localText('totalChargedSub').replace('{pv}', getPvChargePercent()).replace('{grid}', getGridChargePercent()) }}
                                </div>
                                
                                <div class="advisor-metric-row">
                                    <span class="metric-label">{{ localText('batteryCycles') }}</span>
                                    <span class="metric-value">{{ dashboardData.advisor.has_battery ? $n(dashboardData.advisor.battery_cycles, 1) : localText('noBattery') }}</span>
                                </div>
                                <div class="metric-help-text" v-if="dashboardData.advisor.has_battery">
                                    {{ localText('batteryCyclesSub').replace('{cycles}', $n(dashboardData.advisor.battery_cycles / dashboardData.advisor.total_days, 2)) }}
                                </div>
                                
                                <!-- Simple Cycle Progress Bar -->
                                <div style="margin-top: var(--space-md);" v-if="dashboardData.advisor.has_battery">
                                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 4px;">
                                        <span>PV: {{ getPvChargePercent() }}%</span>
                                        <span>Netz: {{ getGridChargePercent() }}%</span>
                                    </div>
                                    <div style="height: 6px; width: 100%; background: rgba(255,255,255,0.05); border-radius: 3px; display: flex; overflow: hidden;">
                                        <div :style="{ width: getPvChargePercent() + '%', background: 'var(--solar)' }"></div>
                                        <div :style="{ width: getGridChargePercent() + '%', background: 'var(--chart-series-ai, #a855f7)' }"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <modern-page-guide page="smart_charging"></modern-page-guide>
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
                grid_charge: null,
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
                if (!dashboardData.kpis) return { charged_kwh: null, savings_eur: null };
                return dashboardData.kpis[selectedPeriod.value] || { charged_kwh: null, savings_eur: null };
            });
            const gridChargePeriods = computed(() => {
                const card = dashboardData.grid_charge;
                if (!card) return [];
                return [
                    { id: 'today', label: t('smart_charging.gridChargeToday') },
                    { id: 'month', label: t('smart_charging.gridChargeMonth') },
                    { id: 'year', label: t('smart_charging.gridChargeYear') },
                ].map((period) => Object.assign({ label: period.label, id: period.id }, card[period.id] || {}));
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
                const facts = dashboardData.live.status;
                let reason = facts && facts.why_code ? facts.why_code : dashboardData.live.reason;
                if (reason === 'soc_unavailable' && currentSoc.value != null) {
                    reason = 'unknown';
                }
                return catalogReason(reason);
            });

            function catalogReason(code) {
                if (!code) return t('smart_charging.reasons.unknown');
                const key = `smart_charging.reasons.${code}`;
                const text = t(key);
                if (text !== key) return text;
                return t('smart_charging.status.unknownReason').replace('{code}', String(code));
            }

            function statusHourLabel(hour) {
                const number = Number(hour);
                if (!Number.isInteger(number) || number < 0 || number > 23) return '';
                return String(number).padStart(2, '0') + ':00';
            }

            function statusView(live) {
                const row = live || {};
                const facts = row.status && typeof row.status === 'object' ? row.status : null;
                const allowed = row.grid_allowed === true
                    || (row.grid_allowed == null && row.is_cheap === true);
                const charging = facts
                    ? facts.headline === 'charging'
                    : Boolean(row.active && allowed);
                const whyCode = facts && facts.why_code ? facts.why_code : row.reason;
                let next = '';
                const step = facts && facts.next;
                if (step && step.kind === 'observe') {
                    next = t('smart_charging.status.observe');
                } else if (step && step.kind === 'stop_soc' && step.soc != null) {
                    next = t('smart_charging.status.stopSoc').replace('{soc}', String(step.soc));
                } else if (step && step.kind === 'stop_hour') {
                    next = t('smart_charging.status.stopHour');
                } else if (step && step.kind === 'next_hour') {
                    const time = statusHourLabel(step.hour);
                    if (time && step.soc != null) {
                        next = t('smart_charging.status.hubbleNextHourThen')
                            .replace('{time}', time)
                            .replace('{soc}', String(step.soc));
                    } else if (time) {
                        next = t('smart_charging.status.hubbleNextHour').replace('{time}', time);
                    }
                }
                return {
                    headline: t(charging ? 'smart_charging.status.hubbleCharging' : 'smart_charging.status.hubbleIdle'),
                    why: catalogReason(whyCode),
                    next: next,
                };
            }

            const statusViewNow = computed(() => statusView(dashboardData.live || {}));
            const statusHeadlineText = computed(() => statusViewNow.value.headline);
            const statusWhyText = computed(() => statusViewNow.value.why);
            const statusNextText = computed(() => statusViewNow.value.next);
            const statusSentenceText = computed(() => {
                return [statusHeadlineText.value, statusWhyText.value, statusNextText.value]
                    .filter(Boolean)
                    .join(' ');
            });

            const statusAmpel = computed(() => {
                if (setupCheckItems.value.some((item) => item.level === 'red' || item.level === 'yellow')) {
                    return 'warn';
                }
                const live = dashboardData.live || {};
                if (!live.enabled) return 'idle';
                const facts = live.status;
                if (facts && facts.headline === 'charging') return 'load';
                if (!facts && live.active && (live.grid_allowed === true || (live.grid_allowed == null && live.is_cheap === true))) {
                    return 'load';
                }
                if (live.decision === 'wait') return 'wait';
                return 'idle';
            });

            function formatSinceLabel(iso, kind) {
                if (!iso) return '';
                const start = Date.parse(iso);
                if (!Number.isFinite(start)) return '';
                const minutes = Math.max(0, Math.floor((Date.now() - start) / 60000));
                if (minutes < 60) {
                    const key = kind === 'wait'
                        ? 'smart_charging.status.chipWaitingSinceMin'
                        : 'smart_charging.status.chipChargingSinceMin';
                    return t(key).replace('{min}', String(minutes));
                }
                const hours = Math.floor(minutes / 60);
                const rest = minutes % 60;
                const key = kind === 'wait'
                    ? 'smart_charging.status.chipWaitingSinceHours'
                    : 'smart_charging.status.chipChargingSinceHours';
                return t(key).replace('{hours}', String(hours)).replace('{min}', String(rest));
            }

            function formatChipNumber(value, digits) {
                return Number(value).toLocaleString(localeTag(), {
                    minimumFractionDigits: digits,
                    maximumFractionDigits: digits,
                });
            }

            function formatHourLabel(hour) {
                const number = Number(hour);
                if (!Number.isFinite(number)) return '';
                return String(Math.trunc(number)).padStart(2, '0') + ':00';
            }

            const statusChips = computed(() => {
                const live = dashboardData.live || {};
                const flags = statusChipVisibility(live, settingsData.mode);
                const chips = [];
                if (flags.chargingSince) {
                    chips.push({
                        id: 'charging',
                        label: '⏱',
                        value: formatSinceLabel(live.charging_since, 'charge'),
                        progress: null,
                    });
                }
                if (flags.waitingSince) {
                    chips.push({
                        id: 'waiting',
                        label: '⏱',
                        value: formatSinceLabel(live.waiting_since, 'wait'),
                        progress: null,
                    });
                }
                if (flags.soc) {
                    const soc = Math.round(Number(live.current_soc));
                    if (flags.socTarget) {
                        const target = Math.round(Number(live.target_soc));
                        const progress = target > 0
                            ? Math.min(100, Math.max(0, (Number(live.current_soc) / target) * 100))
                            : 0;
                        chips.push({
                            id: 'soc',
                            label: '🔋',
                            value: t('smart_charging.status.chipSocTarget')
                                .replace('{soc}', String(soc))
                                .replace('{target}', String(target)),
                            progress,
                        });
                    } else {
                        chips.push({
                            id: 'soc',
                            label: '🔋',
                            value: t('smart_charging.status.chipSocOnly').replace('{soc}', String(soc)),
                            progress: null,
                        });
                    }
                }
                if (flags.reserved) {
                    chips.push({
                        id: 'reserved',
                        label: '⚡',
                        value: t('smart_charging.status.chipReserved').replace(
                            '{kwh}',
                            formatChipNumber(live.reserved_future_grid_charge_kwh, 1)
                        ),
                        progress: null,
                    });
                }
                if (flags.nextWindow) {
                    const time = formatHourLabel(live.next_cheap_hour);
                    let value = t(
                        flags.nextWindowBand
                            ? 'smart_charging.status.chipNextWindowBand'
                            : 'smart_charging.status.chipNextWindow'
                    ).replace('{time}', time);
                    if (live.next_cheap_price_ct != null && live.next_cheap_price_ct !== '') {
                        value += t('smart_charging.status.chipNextPrice').replace(
                            '{price}',
                            formatChipNumber(live.next_cheap_price_ct, 1)
                        );
                    }
                    chips.push({
                        id: 'next',
                        label: '🕙',
                        value,
                        progress: null,
                    });
                }
                return chips.filter((chip) => chip.value);
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
                return val != null ? window.SFMLI18n.formatNumber(val, 2) : '--';
            }

            function formatKwh(val) {
                return val != null ? window.SFMLI18n.formatNumber(val, 1) + ' kWh' : '--';
            }

            function fmtKwh(val) {
                return window.SFMLI18n.formatNumber(val != null ? val : 0, 1) + ' kWh';
            }

            function kpiPriceHint(record) {
                const days = daysWithoutPriceList(record);
                if (!days.length || !kpiIncomplete(record, "savings_eur")) return "";
                const ranges = formatDayRangesText(days);
                const lead = t("gpm.missingGpmPricesLead", {
                    count: String(days.length),
                    ranges,
                });
                return lead && lead !== "gpm.missingGpmPricesLead" ? lead : `Für ${days.length} Tage fehlen GPM-Preise (z. B. ${ranges}). GPM lädt sie automatisch nach, sofern die Preisquelle sie liefert; sonst `;
            }

            function openGpmCsvImport() {
                window.location.hash = "gpm/gpm-csv-import";
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
                const cheapFill = (window.sfmlThemeColor?.("--success", 0.14) || 'rgba(34, 197, 94, 0.14)');
                const chartAreas = [];
                if (firstFutureIndex >= 0) {
                    chartAreas.push([
                        {
                            xAxis: timeKeys[firstFutureIndex],
                            label: {
                                show: true,
                                formatter: t('smart_charging.chartForecastZone'),
                                color: getThemeColor('--text-muted', '#8b949e'),
                                fontSize: 12,
                            },
                            itemStyle: { color: (window.sfmlThemeColor?.("--accent", 0.035) || 'rgba(0, 210, 255, 0.035)') },
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
                        textStyle: { color: getThemeColor('--text-primary', '#f0f6fc'), fontFamily: 'var(--font-mono)', fontSize: 12 },
                        formatter: function(params) {
                            const dataIndex = params[0].dataIndex;
                            let html = '<b>' + (times[dataIndex] || params[0].axisValue) + '</b>';
                            params.forEach(function(p) {
                                if (p.value != null) {
                                    let valStr;
                                    if (p.seriesName === priceLegend) {
                                        valStr = window.SFMLI18n.formatNumber(p.value, 2) + ' ct/kWh';
                                    } else {
                                        valStr = window.SFMLI18n.formatNumber(p.value, 3) + ' kWh';
                                    }
                                    html += '<br/><span style="color:' + p.color + '">● ' + p.seriesName + ': <b>' + valStr + '</b></span>';
                                    if (p.seriesName === priceLegend && data[p.dataIndex]?.is_future) {
                                        html += '<br/><span style="color: var(--text-muted);">' + t('smart_charging.chartTooltipForecastPrice') + '</span>';
                                        if (data[p.dataIndex]?.is_cheap) {
                                            html += '<br/><span style="color: var(--success, #22c55e);">' + t('smart_charging.chartCheapHour') + '</span>';
                                        }
                                    }
                                }
                            });
                            return html;
                        }
                    },
                    legend: {
                        data: [
                            { name: priceLegend, icon: 'line', itemStyle: { color: (window.sfmlThemeColor?.("--accent") || "#00d2ff") } },
                            { name: chargingLegend, icon: 'bar', itemStyle: { color: (window.sfmlThemeColor?.("--success") || "#22c55e") } },
                            { name: solarLegend, icon: 'bar', itemStyle: { color: (window.sfmlThemeColor?.("--solar") || "#f59e0b") } },
                            { name: cheapLegend, icon: 'roundRect', itemStyle: { color: (window.sfmlThemeColor?.("--success") || "#22c55e") } },
                        ],
                        bottom: 0,
                        textStyle: { color: getThemeColor('--text-secondary', '#8b949e'), fontSize: 12 },
                    },
                    grid: { left: 45, right: 45, top: 25, bottom: 45 },
                    xAxis: {
                        type: 'category',
                        data: timeKeys,
                        axisLine: { lineStyle: { color: getThemeColor('--border-default', 'rgba(255,255,255,0.1)') } },
                        axisLabel: {
                            color: getThemeColor('--text-secondary', '#8b949e'),
                            fontSize: 12,
                            rotate: 30,
                            formatter: function(value, index) { return times[index] || value; },
                        },
                    },
                    yAxis: [
                        {
                            type: 'value',
                            name: 'kWh',
                            nameTextStyle: { color: '#8b949e', fontSize: 12 },
                            axisLabel: { color: '#8b949e', fontSize: 12 },
                            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.03)' } },
                        },
                        {
                            type: 'value',
                            name: 'ct/kWh',
                            nameTextStyle: { color: '#8b949e', fontSize: 12 },
                            axisLabel: { color: '#8b949e', fontSize: 12 },
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
                            lineStyle: { width: 3, color: (window.sfmlThemeColor?.("--accent") || "#00d2ff") },
                            itemStyle: { color: (window.sfmlThemeColor?.("--accent") || "#00d2ff") },
                            markArea: chartAreas.length > 0 ? {
                                silent: true,
                                data: chartAreas,
                            } : undefined,
                            markLine: firstFutureIndex >= 0 ? {
                                symbol: ['none', 'none'],
                                lineStyle: { color: (window.sfmlThemeColor?.("--accent", 0.45) || 'rgba(0, 210, 255, 0.45)'), type: 'dashed' },
                                label: {
                                    show: true,
                                    formatter: t('smart_charging.chartNowBoundary'),
                                    color: getThemeColor('--text-muted', '#8b949e'),
                                    fontSize: 12,
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
                                    { offset: 0, color: (window.sfmlThemeColor?.("--success") || "#10b981") },
                                    { offset: 1, color: (window.sfmlThemeColor?.("--success") || "#059669") }
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
                                    { offset: 0, color: (window.sfmlThemeColor?.("--solar") || "#f59e0b") },
                                    { offset: 1, color: (window.sfmlThemeColor?.("--house") || "#d97706") }
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
            const currentLang = window.SFMLI18n ? window.SFMLI18n.current : 'de';
            const localText = (key) => {
                const bundle = {
                    de: {
                        advisorTitle: "Hardware- & Kapazitäts-Analysen",
                        batterySizing: "Akku-Dimensionierung",
                        sizingWindow: "Letzte 12 Monate ({start} – {end})",
                        sizingWindowAnnualized: "{start} – {end}, hochgerechnet auf ein Jahr",
                        fullDays: "Tage mit PV-Überschuss bei vollem Akku",
                        fullDaysSub: "Gezählt werden Tage, an denen der Akku laut Ladestand mindestens 95 % erreichte und trotzdem eingespeist wurde.",
                        notMeasurable: "nicht messbar",
                        colStep: "Erweiterung",
                        colPv: "durch PV",
                        colShift: "durch günstige Stunden",
                        colYear: "pro Jahr",
                        colPayback: "bezahlt nach",
                        bestCase: "bestenfalls {eur}",
                        years: "{years} Jahren",
                        assumptions: "Wirkungsgrad {eta} %, Verschleiß {wear} ct/kWh. PV-Werte sind an {measured} % der Tage gemessen, der Rest ist geschätzt (Spanne). Günstige Stunden nach deinen Smart-Laden-Schwellen.",
                        assumptionsNoWear: "Wirkungsgrad {eta} %, Verschleiß nicht berücksichtigt (keine Kosten eingetragen). PV-Werte sind an {measured} % der Tage gemessen, der Rest ist geschätzt (Spanne). Günstige Stunden nach deinen Smart-Laden-Schwellen.",
                        assumptionsFixed: " Bei festem Strompreis gibt es keine Ersparnis durch günstige Stunden.",
                        sizingRecommendation: "Empfehlung",
                        setStep: "Schritt (kWh)",
                        setCost: "Kosten je kWh (€)",
                        setCostPlaceholder: "z. B. 400",
                        setLifetime: "Lebensdauer (Jahre)",
                        setCycles: "Zyklen",
                        setSave: "Speichern",
                        setSaveFailed: "Speichern fehlgeschlagen.",
                        insufficientData: "Für ein Urteil fehlen mir noch Daten. Ich brauche mindestens drei Monate.",
                        solarPerformance: "Solar-Jahresbilanz",
                        performanceDesc: "Solar-Kennzahlen der letzten 12 Monate",
                        totalYield: "Gesamt-Ertrag",
                        totalYieldSub: "Erzeugte Solar-Energie in den letzten 12 Monaten",
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
                        verdictCost: "Trag die Kosten je kWh ein, dann rechne ich dir aus, ob sich eine Erweiterung um {step} kWh lohnt. Sie brächte etwa {eur} im Jahr.",
                        verdictWorth: "Eine Erweiterung um {step} kWh lohnt sich: Sie macht sich nach etwa {years} Jahren bezahlt und bringt rund {eur} im Jahr.",
                        verdictBorderline: "Eine Erweiterung um {step} kWh ist knapp: Sie macht sich erst nach etwa {years} Jahren bezahlt, bei {life} Jahren Lebensdauer.",
                        verdictNot: "Eine Erweiterung um {step} kWh lohnt sich nicht: Sie bräuchte etwa {years} Jahre, um sich zu bezahlen, die Lebensdauer liegt bei {life} Jahren.",
                        verdictNone: "Eine Erweiterung um {step} kWh lohnt sich nicht: Sie würde keine Ersparnis bringen.",
                        verdictInsufficient: "Für ein Urteil fehlen mir noch Daten. Ich brauche mindestens drei Monate.",
                        noBattery: "Kein Akku",
                        noBatteryDesc: "Keine Akku-Optimierung möglich, da kein Akku konfiguriert ist.",
                    },
                    en: {
                        advisorTitle: "Hardware & Capacity Analysis",
                        batterySizing: "Battery Sizing",
                        sizingWindow: "Last 12 months ({start} – {end})",
                        sizingWindowAnnualized: "{start} – {end}, extrapolated to one year",
                        fullDays: "Days with PV surplus on a full battery",
                        fullDaysSub: "Counted are days on which the battery reached at least 95 % state of charge and power was still exported.",
                        notMeasurable: "not measurable",
                        colStep: "Extension",
                        colPv: "from PV",
                        colShift: "from cheap hours",
                        colYear: "per year",
                        colPayback: "pays back after",
                        bestCase: "at best {eur}",
                        years: "{years} years",
                        assumptions: "Efficiency {eta} %, wear {wear} ct/kWh. PV values are measured on {measured} % of days, the rest is estimated (range). Cheap hours follow your smart-charging thresholds.",
                        assumptionsNoWear: "Efficiency {eta} %, wear not included (no cost entered). PV values are measured on {measured} % of days, the rest is estimated (range). Cheap hours follow your smart-charging thresholds.",
                        assumptionsFixed: " With a fixed electricity price there are no savings from cheap hours.",
                        sizingRecommendation: "Recommendation",
                        setStep: "Step (kWh)",
                        setCost: "Cost per kWh (€)",
                        setCostPlaceholder: "e.g. 400",
                        setLifetime: "Lifetime (years)",
                        setCycles: "Cycles",
                        setSave: "Save",
                        setSaveFailed: "Saving failed.",
                        insufficientData: "I still need more data for a verdict, at least three months.",
                        solarPerformance: "Annual Solar Yield",
                        performanceDesc: "Solar figures of the last 12 months",
                        totalYield: "Total Yield",
                        totalYieldSub: "Solar energy produced in the last 12 months",
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
                        verdictCost: "Enter the cost per kWh and I will work out whether an extension of {step} kWh pays off. It would bring about {eur} a year.",
                        verdictWorth: "An extension of {step} kWh pays off: it pays for itself after about {years} years and brings around {eur} a year.",
                        verdictBorderline: "An extension of {step} kWh is borderline: it only pays for itself after about {years} years, with a lifetime of {life} years.",
                        verdictNot: "An extension of {step} kWh does not pay off: it would need about {years} years to pay for itself, the lifetime is {life} years.",
                        verdictNone: "An extension of {step} kWh does not pay off: it would not bring any savings.",
                        verdictInsufficient: "I still need more data for a verdict, at least three months.",
                        noBattery: "No Battery",
                        noBatteryDesc: "No battery optimization possible because no battery is configured.",
                    },
                    pl: {
                        advisorTitle: "Analiza sprzętu i pojemności",
                        batterySizing: "Dobór akumulatora",
                        sizingWindow: "Ostatnie 12 miesięcy ({start} – {end})",
                        sizingWindowAnnualized: "{start} – {end}, przeliczone na rok",
                        fullDays: "Dni z nadwyżką PV przy pełnym akumulatorze",
                        fullDaysSub: "Liczone są dni, w których akumulator osiągnął co najmniej 95 % naładowania, a energia nadal była oddawana do sieci.",
                        notMeasurable: "niemierzalne",
                        colStep: "Rozbudowa",
                        colPv: "z PV",
                        colShift: "z tanich godzin",
                        colYear: "rocznie",
                        colPayback: "zwrot po",
                        bestCase: "w najlepszym razie {eur}",
                        years: "{years} latach",
                        assumptions: "Sprawność {eta} %, zużycie {wear} ct/kWh. Wartości PV zmierzono w {measured} % dni, reszta jest szacowana (zakres). Tanie godziny według Twoich progów inteligentnego ładowania.",
                        assumptionsNoWear: "Sprawność {eta} %, zużycie nieuwzględnione (brak kosztów). Wartości PV zmierzono w {measured} % dni, reszta jest szacowana (zakres). Tanie godziny według Twoich progów inteligentnego ładowania.",
                        assumptionsFixed: " Przy stałej cenie prądu tanie godziny nie dają oszczędności.",
                        sizingRecommendation: "Zalecenie",
                        setStep: "Krok (kWh)",
                        setCost: "Koszt za kWh (€)",
                        setCostPlaceholder: "np. 400",
                        setLifetime: "Żywotność (lata)",
                        setCycles: "Cykle",
                        setSave: "Zapisz",
                        setSaveFailed: "Zapis nie powiódł się.",
                        insufficientData: "Do oceny potrzebuję jeszcze danych, co najmniej z trzech miesięcy.",
                        solarPerformance: "Roczny bilans PV",
                        performanceDesc: "Wskaźniki PV z ostatnich 12 miesięcy",
                        totalYield: "Uzysk łącznie",
                        totalYieldSub: "Energia wytworzona w ostatnich 12 miesiącach",
                        avgDailyYield: "Uzysk dzienny Ø",
                        avgDailyYieldSub: "Średni uzysk na dzień",
                        houseConsumption: "Zużycie domu",
                        houseConsumptionSub: "Średnie dzienne zapotrzebowanie",
                        autarkyRate: "Autarkia",
                        autarkyRateSub: "Średnia niezależność od sieci",
                        batteryThroughput: "Przepływ akumulatora i cykle",
                        throughputDesc: "Wykorzystanie i obciążenie cyklami",
                        totalCharged: "Ładowanie łącznie",
                        totalChargedSub: "Naładowana energia (PV: {pv}%, sieć: {grid}%)",
                        batteryCycles: "Ekwiwalent pełnych cykli",
                        batteryCyclesSub: "Odpowiada ok. {cycles} cyklom na dzień",
                        verdictCost: "Wpisz koszt za kWh, a policzę, czy rozbudowa o {step} kWh się opłaca. Dałaby około {eur} rocznie.",
                        verdictWorth: "Rozbudowa o {step} kWh się opłaca: zwraca się po około {years} latach i daje około {eur} rocznie.",
                        verdictBorderline: "Rozbudowa o {step} kWh jest na granicy: zwraca się dopiero po około {years} latach przy żywotności {life} lat.",
                        verdictNot: "Rozbudowa o {step} kWh się nie opłaca: potrzebowałaby około {years} lat, a żywotność wynosi {life} lat.",
                        verdictNone: "Rozbudowa o {step} kWh się nie opłaca: nie dałaby żadnych oszczędności.",
                        verdictInsufficient: "Do oceny potrzebuję jeszcze danych, co najmniej z trzech miesięcy.",
                        noBattery: "Brak akumulatora",
                        noBatteryDesc: "Optymalizacja akumulatora nie jest możliwa, bo żaden akumulator nie jest skonfigurowany.",
                    }
                };
                const lang = bundle[currentLang] ? currentLang : 'de';
                return bundle[lang][key] || key;
            };

            const sizingForm = reactive({ step_kwh: '', cost_per_kwh_eur: '', lifetime_years: '', cycles: '' });
            const sizingSaving = ref(false);
            const sizingError = ref('');
            let sizingFormLoaded = false;

            function applySizingSettings(sizing, force = false) {
                if (!sizing || (sizingFormLoaded && !force)) return;
                sizingFormLoaded = true;
                const stored = sizing.settings || {};
                sizingForm.step_kwh = stored.step_kwh ?? '';
                sizingForm.cost_per_kwh_eur = stored.cost_per_kwh_eur ?? '';
                sizingForm.lifetime_years = stored.lifetime_years ?? '';
                sizingForm.cycles = stored.cycles ?? '';
            }

            function fmtEurRange(min, max) {
                const leftMissing = min == null || min === "" || !Number.isFinite(Number(min));
                const rightMissing = max == null || max === "" || !Number.isFinite(Number(max));
                if (leftMissing && rightMissing) return "\u2013";
                if (leftMissing) return fmtEur(max);
                if (rightMissing) return fmtEur(min);
                const left = Number(min);
                const right = Number(max);
                if (Math.abs(right - left) < 0.005) return fmtEur(right);
                return window.SFMLI18n.formatNumber(left, 2) + "\u2013" + fmtEur(right);
            }

            function sizingWindowText() {
                const sizing = dashboardData.advisor?.sizing;
                const start = sizing?.window?.start || dashboardData.advisor?.window_start || '';
                const end = sizing?.window?.end || dashboardData.advisor?.window_end || '';
                const key = sizing?.window?.annualized ? 'sizingWindowAnnualized' : 'sizingWindow';
                return localText(key).replace('{start}', start).replace('{end}', end);
            }

            function sizingAssumptionsText() {
                const sizing = dashboardData.advisor?.sizing;
                if (!sizing) return '';
                const eta = Math.round((dashboardData.advisor.battery_roundtrip_efficiency || 0) * 100);
                const measured = sizing.pv_measured_days_percent != null ? Math.round(sizing.pv_measured_days_percent) : 0;
                const base = sizing.wear_ct_per_kwh > 0 ? 'assumptions' : 'assumptionsNoWear';
                let text = localText(base)
                    .replace('{eta}', eta)
                    .replace('{wear}', window.SFMLI18n.formatNumber(sizing.wear_ct_per_kwh, 1))
                    .replace('{measured}', measured);
                if (!sizing.time_variable_tariff) text += localText('assumptionsFixed');
                return text;
            }

            function getSizingRecommendation() {
                const advisor = dashboardData.advisor;
                if (!advisor) return '--';
                if (!advisor.has_battery) return localText('noBatteryDesc');
                const sizing = advisor.sizing;
                const first = sizing?.steps?.[0];
                if (!first) return localText('verdictInsufficient');
                const life = window.SFMLI18n.formatNumber(sizing.settings?.lifetime_years || 0, 0);
                const fill = (key) => localText(key)
                    .replace('{step}', window.SFMLI18n.formatNumber(first.step_kwh, 1))
                    .replace('{eur}', fmtEur(first.annual_eur))
                    .replace('{years}', first.payback_years != null ? window.SFMLI18n.formatNumber(first.payback_years, 0) : '–')
                    .replace('{life}', life);
                switch (first.verdict) {
                    case 'cost_missing': return fill('verdictCost');
                    case 'worth_it': return fill('verdictWorth');
                    case 'borderline': return fill('verdictBorderline');
                    case 'not_worth_it': return fill(first.payback_years != null ? 'verdictNot' : 'verdictNone');
                    default: return fill('verdictInsufficient');
                }
            }

            async function saveSizingSettings() {
                sizingSaving.value = true;
                sizingError.value = '';
                const toNumber = (value) => (value === '' || value == null ? null : Number(value));
                try {
                    const data = await SFMLApi.postAuthenticated('/api/sfml_stats/smart_charging/sizing_settings', {
                        step_kwh: toNumber(sizingForm.step_kwh),
                        cost_per_kwh_eur: toNumber(sizingForm.cost_per_kwh_eur),
                        lifetime_years: toNumber(sizingForm.lifetime_years),
                        cycles: toNumber(sizingForm.cycles),
                    });
                    if (!data || !data.success) throw new Error('save_failed');
                    sizingFormLoaded = false;
                    await loadData();
                } catch (_err) {
                    sizingError.value = localText('setSaveFailed');
                } finally {
                    sizingSaving.value = false;
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
                        applySizingSettings(data.advisor?.sizing);
                        dashboardData.gpm = data.gpm || {};
                        if (data.is_demo) {
                            gpmMeta.is_demo = true;
                        }
                        dashboardData.chart_plan = data.chart_plan || null;
                        dashboardData.grid_charge = data.grid_charge || null;
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
                if (data.gpm) {
                    const dashboardDemo = gpmMeta.is_demo;
                    Object.assign(gpmMeta, data.gpm);
                    if (dashboardDemo) {
                        gpmMeta.is_demo = true;
                    }
                }
            }

            function applyCheapHours(hours, tomorrowAvailable) {
                const payload = hours && typeof hours === 'object' ? hours : {};
                gpmCheapHours.today = Array.isArray(payload.today) ? payload.today : [];
                gpmCheapHours.tomorrow = Array.isArray(payload.tomorrow) ? payload.tomorrow : [];
                if (tomorrowAvailable != null) {
                    gpmTomorrowAvailable.value = Boolean(tomorrowAvailable);
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
                pollInterval = setInterval(() => { if (!document.hidden) loadData(); }, 5000);
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
                gridChargePeriods,
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
                shownMoney,
                kpiMoney,
                kpiIncomplete,
                kpiPriceHint,
                openGpmCsvImport,
                localText,
                getSizingRecommendation,
                sizingWindowText,
                sizingAssumptionsText,
                fmtEurRange,
                sizingForm,
                sizingSaving,
                sizingError,
                saveSizingSettings,
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
                statusHeadlineText,
                statusWhyText,
                statusNextText,
                statusSentenceText,
                statusAmpel,
                statusChips,
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
            color: var(--house, #92400e);
            background: var(--solar, #fde68a);
            border-radius: 999px;
            padding: 4px 10px;
        }
        .sc-status-card .sc-status-line,
        .sc-status-card .sc-status-why,
        .sc-status-card .sc-status-next {
            margin: 0;
            font-size: 1rem;
            line-height: 1.4;
            color: var(--text-primary);
        }
        .sc-status-card .sc-status-why,
        .sc-status-card .sc-status-next {
            margin-top: 4px;
            color: var(--text-secondary, var(--text-primary));
        }
        .sc-hubble-row { display: flex; align-items: center; gap: var(--space-lg, 20px); }
        .sc-hubble-avatar {
            flex: 0 0 108px; width: 108px; height: 108px; border-radius: 50%; padding: 3px;
            background: radial-gradient(circle, color-mix(in srgb, var(--accent, rgb(62, 201, 255)) 35%, transparent), color-mix(in srgb, var(--accent, rgb(62, 201, 255)) 5%, transparent) 70%);
            box-shadow: 0 0 14px color-mix(in srgb, var(--accent, rgb(62, 201, 255)) 35%, transparent);
            animation: sc-hubble-breathe 4s ease-in-out infinite;
        }
        @keyframes sc-hubble-breathe {
            0%, 100% { box-shadow: 0 0 10px color-mix(in srgb, var(--accent, rgb(62, 201, 255)) 25%, transparent); transform: scale(1); }
            50% { box-shadow: 0 0 26px color-mix(in srgb, var(--accent, rgb(62, 201, 255)) 60%, transparent); transform: scale(1.025); }
        }
        .sc-hubble-persona { display: block; width: 100%; height: 100%; object-fit: cover; border-radius: 50%; background: #05121a; }
        .sc-hubble-bubble {
            position: relative; flex: 1 1 auto; min-width: 0;
            background: color-mix(in srgb, var(--accent, rgb(62, 201, 255)) 5%, transparent); border: 1px solid color-mix(in srgb, var(--accent, rgb(62, 201, 255)) 22%, transparent);
            border-radius: var(--radius-md); padding: var(--space-md) var(--space-lg, 20px);
        }
        .sc-hubble-bubble::before {
            content: ""; position: absolute; left: -9px; top: 50%; width: 16px; height: 16px; margin-top: -8px;
            background: #0b1d26; border-left: 1px solid color-mix(in srgb, var(--accent, rgb(62, 201, 255)) 22%, transparent); border-bottom: 1px solid color-mix(in srgb, var(--accent, rgb(62, 201, 255)) 22%, transparent);
            transform: rotate(45deg);
        }
        .sc-status-card .sc-hubble-bubble .sc-status-line { font-weight: 600; display: flex; align-items: center; gap: 8px; }
        .sc-hubble-bubble .sc-status-ampel { margin-top: 0; }
        @media (max-width: 560px) {
            .sc-hubble-row { flex-direction: column; align-items: stretch; }
            .sc-hubble-avatar { align-self: center; flex-basis: auto; width: 96px; height: 96px; }
            .sc-hubble-bubble::before { left: 50%; top: -9px; margin: 0 0 0 -8px; transform: rotate(135deg); }
        }
        @media (prefers-reduced-motion: reduce) { .sc-hubble-avatar { animation: none; } }
        .sc-status-row {
            display: flex;
            align-items: flex-start;
            gap: 10px;
        }
        .sc-status-ampel {
            width: 10px;
            height: 10px;
            margin-top: 6px;
            border-radius: 50%;
            flex-shrink: 0;
            background: var(--sc-ampel, var(--text-muted, #9ca3af));
        }
        /* Shared status-dot scale: load=ok, wait=normal, idle=idle, warn=warn */
        .sc-status-load { --sc-ampel: var(--status-ok, #22c55e); }
        .sc-status-wait { --sc-ampel: var(--status-normal, #f59e0b); }
        .sc-status-idle { --sc-ampel: var(--status-idle, #94a3b8); }
        .sc-status-warn { --sc-ampel: var(--status-warn, #ef4444); }
        .sc-status-chips {
            margin-top: 12px;
            flex-wrap: wrap;
        }
        .sc-soc-bar {
            display: block;
            width: 100%;
            height: 3px;
            margin-top: 4px;
            border-radius: 99px;
            background: var(--border-default, #334155);
            overflow: hidden;
        }
        .sc-soc-bar-fill {
            display: block;
            height: 100%;
            background: var(--info, #60c5ff);
        }
        .sc-setup-ok {
            margin: 0 0 var(--space-lg);
            color: var(--success, #15803d);
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
        .sc-setup-red { border-left-color: var(--danger, #dc2626); }
        .sc-setup-yellow { border-left-color: var(--house, #d97706); }
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
            background: color-mix(in srgb, var(--accent, rgb(0, 210, 255)) 3%, transparent);
            border: 1px solid color-mix(in srgb, var(--accent, rgb(0, 210, 255)) 16%, transparent);
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
            font-size: 0.75rem;
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
            font-size: 0.75rem;
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
            font-size: 0.75rem;
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
            font-size: 0.75rem;
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

        .legend-dot.red { background-color: var(--danger, #ef4444); }
        .legend-dot.blue { background-color: var(--accent, #00d2ff); }
        .legend-dot.green { background-color: var(--success, #10b981); }

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
            font-size: 0.75rem;
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
            font-size: 0.75rem;
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
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .badge-active {
            background: color-mix(in srgb, var(--success, rgb(16, 185, 129)) 12%, transparent);
            color: var(--success, #10b981);
            border: 1px solid color-mix(in srgb, var(--success, rgb(16, 185, 129)) 25%, transparent);
        }

        .badge-standby {
            background: color-mix(in srgb, var(--solar, rgb(234, 179, 8)) 12%, transparent);
            color: var(--solar, #eab308);
            border: 1px solid color-mix(in srgb, var(--solar, rgb(234, 179, 8)) 25%, transparent);
        }

        .badge-disabled {
            background: color-mix(in srgb, var(--danger, rgb(239, 68, 68)) 12%, transparent);
            color: var(--danger, #ef4444);
            border: 1px solid color-mix(in srgb, var(--danger, rgb(239, 68, 68)) 25%, transparent);
        }

        .sc-advisor-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
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
            font-size: 0.75rem;
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
            font-size: 0.75rem;
            color: var(--text-muted);
            margin-top: -6px;
            margin-bottom: var(--space-xs);
            line-height: 1.2;
        }
        
        .advisor-subcard-wide {
            grid-column: 1 / -1;
        }
        .sizing-layout {
            display: grid;
            grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
            gap: var(--space-lg);
            align-items: start;
        }
        .sizing-main,
        .sizing-side {
            display: flex;
            flex-direction: column;
            gap: var(--space-sm);
            min-width: 0;
        }
        .sizing-table-wrap {
            overflow-x: auto;
            margin-top: var(--space-xs);
        }
        .sizing-steps {
            width: 100%;
            border-collapse: collapse;
        }
        .sizing-steps thead {
            background: none;
        }
        .sizing-steps th {
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: none;
            letter-spacing: normal;
            color: var(--text-secondary);
            text-align: right;
            padding: 0 var(--space-sm) var(--space-xs);
            border-bottom: 1px solid var(--border-default);
            white-space: nowrap;
        }
        .sizing-steps td {
            font-family: var(--font-mono);
            font-size: 0.9rem;
            color: var(--text-primary);
            text-align: right;
            padding: var(--space-sm);
            border-bottom: 1px solid var(--border-default);
            white-space: nowrap;
            vertical-align: top;
        }
        .sizing-steps th:first-child,
        .sizing-steps td:first-child {
            text-align: left;
            padding-left: 0;
        }
        .sizing-steps th:last-child,
        .sizing-steps td:last-child {
            padding-right: 0;
        }
        .sizing-steps tbody tr:last-child td {
            border-bottom: none;
        }
        .sizing-step,
        .sizing-year {
            font-weight: 700;
        }
        .sizing-best {
            display: block;
            font-size: 0.75rem;
            font-weight: 400;
            color: var(--text-muted);
            margin-top: 2px;
        }
        .sizing-assumptions {
            margin-top: var(--space-xs);
        }
        .sizing-side .advisor-recommendation-box {
            margin-top: 0;
        }
        .sizing-settings {
            display: flex;
            flex-direction: column;
            gap: var(--space-sm);
        }
        .sizing-field {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: var(--space-md);
        }
        .sizing-actions {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: var(--space-md);
            margin-top: var(--space-xs);
        }
        .sizing-error {
            color: var(--danger, #ef4444);
            font-size: 0.75rem;
        }
        .advisor-recommendation-box {
            margin-top: var(--space-md);
            padding: var(--space-md);
            background: color-mix(in srgb, var(--accent, rgb(0, 210, 255)) 3%, transparent);
            border-radius: var(--radius-sm);
            border: 1px solid color-mix(in srgb, var(--accent, rgb(0, 210, 255)) 10%, transparent);
        }
        
        .recommendation-badge {
            display: inline-block;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            background: color-mix(in srgb, var(--accent, rgb(0, 210, 255)) 12%, transparent);
            color: var(--accent, #00d2ff);
            padding: 2px 6px;
            border-radius: 4px;
            margin-bottom: var(--space-xs);
        }
        
        .recommendation-text {
            font-size: 0.75rem;
            color: var(--text-secondary);
            line-height: 1.35;
            margin: 0;
        }

        @media (max-width: 1024px) {
            .sc-advisor-grid {
                grid-template-columns: 1fr;
                gap: var(--space-md);
            }
            .sizing-layout {
                grid-template-columns: 1fr;
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
