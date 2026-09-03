// Solar Command Center — Energy Page V17
// (C) 2026 Zara-Toorox

const EnergyPage = ((Vue) => {
const { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } = Vue;

function getThemeColor(varName, fallback) {
    try {
        const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
        return val || fallback;
    } catch (e) {
        return fallback;
    }
}

const _EnergyPage = {
    props: ['liveData', 'config'],
    template: `
        <div class="page page-energy">
            <div class="section-header">
                <h2 class="section-title">{{ $t('nav.energyAndFinances') }}</h2>
            </div>

            <div class="chart-card error-state" style="margin-bottom: var(--space-lg);" v-if="billingError">
                {{ billingError }}
            </div>

            <!-- ========== KARTE 1: ABRECHNUNGSZEITRAUM + FORTSCHRITT ========== -->
            <div class="chart-card" style="margin-bottom: var(--space-lg);" v-if="billing">
                <div class="chart-header" style="margin-bottom: var(--space-sm);">
                    <span class="chart-title">💰 {{ $t('energy.balance') }}</span>
                    <span style="font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono);">
                        📅 {{ billing.period.start }} — {{ billing.period.end }}
                    </span>
                </div>
                <!-- Period Progress Bar -->
                <div style="margin-bottom: var(--space-lg);">
                    <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-muted); margin-bottom: 4px;">
                        <span>{{ $t('energy.dayOf', { current: billing.period.days_elapsed, total: billing.period.days_total }) }}</span>
                        <span>{{ $t('energy.periodProgress', { pct: billing.period.progress_percent != null ? billing.period.progress_percent.toFixed(0) : 0 }) }}</span>
                    </div>
                    <div style="height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden;">
                        <div :style="{width: billing.period.progress_percent + '%', height: '100%', background: 'linear-gradient(90deg, #22c55e, #06b6d4)', borderRadius: '3px', transition: 'width 0.6s'}"></div>
                    </div>
                </div>

                <!-- BLOCK 1: Haushalt -->
                <div class="eb-block-title"><span>🏠</span> {{ $t('energy.homeTotal') }}</div>
                <div class="eb-grid">
                    <div class="eb-item">
                        <div class="eb-icon">🏠</div>
                        <div class="eb-value" style="color: var(--solar);">{{ fmt(billing.household.total_kwh) }}</div>
                        <div class="eb-label">{{ $t('energy.kwhTotal') }}</div>
                        <div class="eb-sub">{{ $t('energy.consumptionPeriod') }}</div>
                    </div>
                    <div class="eb-item">
                        <div class="eb-icon">☀️🏠</div>
                        <div class="eb-value" style="color: var(--solar);">{{ fmt(billing.solar.to_house_kwh) }}</div>
                        <div class="eb-label">{{ $t('energy.ofWhichSolar') }}</div>
                        <div class="eb-sub">{{ $t('energy.directConsumption') }}</div>
                    </div>
                    <div class="eb-item">
                        <div class="eb-icon">🔋🏠</div>
                        <div class="eb-value" style="color: #22c55e;">{{ fmt(billing.household.from_battery_kwh) }}</div>
                        <div class="eb-label">{{ $t('energy.ofWhichBattery') }}</div>
                        <div class="eb-sub">{{ $t('energy.fromStorage') }}</div>
                    </div>
                    <div class="eb-item">
                        <div class="eb-icon">⚡🏠</div>
                        <div class="eb-value" style="color: #a855f7;">{{ fmt(billing.household.from_grid_kwh) }}</div>
                        <div class="eb-label">{{ $t('energy.ofWhichGrid') }}</div>
                        <div class="eb-sub">{{ $t('energy.paid') }}</div>
                    </div>
                </div>

                <!-- BLOCK 2: Akku -->
                <div class="eb-block-title" style="margin-top: var(--space-lg);"><span>🔋</span> {{ $t('energy.batteryTotal') }}</div>
                <div class="eb-grid">
                    <div class="eb-item">
                        <div class="eb-icon">🔋</div>
                        <div class="eb-value" style="color: #22c55e;">{{ fmt(billing.battery.total_charge_kwh) }}</div>
                        <div class="eb-label">{{ $t('energy.kwhTotal') }}</div>
                        <div class="eb-sub">{{ $t('energy.chargedInPeriod') }}</div>
                    </div>
                    <div class="eb-item">
                        <div class="eb-icon">☀️🔋</div>
                        <div class="eb-value" style="color: var(--solar);">{{ fmt(billing.battery.from_solar_kwh) }}</div>
                        <div class="eb-label">{{ $t('energy.ofWhichSolar') }}</div>
                        <div class="eb-sub">{{ $t('energy.free') }}</div>
                    </div>
                    <div class="eb-item">
                        <div class="eb-icon">⚡🔋</div>
                        <div class="eb-value" style="color: #a855f7;">{{ fmt(billing.battery.from_grid_kwh) }}</div>
                        <div class="eb-label">{{ $t('energy.ofWhichGrid') }}</div>
                        <div class="eb-sub">{{ $t('energy.paid') }}</div>
                    </div>
                </div>

                <!-- BLOCK 3: Übersicht & Finanzen -->
                <div class="eb-block-title" style="margin-top: var(--space-lg);"><span>📊</span> {{ $t('energy.overviewFinances') }}</div>
                <div class="eb-grid">
                    <div class="eb-item">
                        <div class="eb-icon">☀️</div>
                        <div class="eb-value" style="color: var(--solar);">{{ fmt(billing.solar.total_kwh) }}</div>
                        <div class="eb-label">{{ $t('energy.kwhSolarTotal') }}</div>
                        <div class="eb-sub">Ø {{ avgDaily }} {{ $t('energy.kwhPerDay') }}</div>
                    </div>
                    <div class="eb-item">
                        <div class="eb-icon">⚡</div>
                        <div class="eb-value" style="color: #a855f7;">{{ fmt(billing.grid.total_import_kwh) }}</div>
                        <div class="eb-label">{{ $t('energy.kwhGridImport') }}</div>
                        <div class="eb-sub">{{ $t('energy.houseAndBattery') }}</div>
                    </div>
                    <div class="eb-item" v-if="billing.grid.export_kwh > 0">
                        <div class="eb-icon">⚡↗️</div>
                        <div class="eb-value" style="color: #06b6d4;">{{ fmt(billing.grid.export_kwh) }}</div>
                        <div class="eb-label">{{ $t('energy.kwhFeedIn') }}</div>
                        <div class="eb-sub">{{ $t('energy.toGrid') }}</div>
                    </div>

                    <!-- Autarkie Donut -->
                    <div class="eb-item" style="display: flex; align-items: center; justify-content: center;">
                        <div class="autarkie-donut-wrap">
                            <svg width="100" height="100" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="10"/>
                                <circle cx="60" cy="60" r="50" fill="none"
                                    :stroke="autarkieColor"
                                    stroke-width="10" stroke-linecap="round"
                                    :stroke-dasharray="314.16"
                                    :stroke-dashoffset="314.16 - (314.16 * ((billing.autarkie_percent ?? 0)) / 100)"
                                    transform="rotate(-90 60 60)"
                                    style="transition: stroke-dashoffset 1s ease;"/>
                            </svg>
                            <div class="autarkie-text">
                                <div class="autarkie-value" :style="{color: autarkieColor}">{{ billing.autarkie_percent != null ? billing.autarkie_percent.toFixed(0) : 0 }}%</div>
                                <div class="autarkie-label">{{ $t('energy.autarky') }}</div>
                            </div>
                        </div>
                    </div>

                    <div class="eb-item">
                        <div class="eb-icon">💰</div>
                        <div class="eb-value" style="color: #ef4444;">{{ billing.finance.grid_cost_eur != null ? billing.finance.grid_cost_eur.toFixed(2) : '0.00' }}</div>
                        <div class="eb-label">{{ $t('energy.electricityCosts') }}</div>
                        <div class="eb-sub">
                            Ø {{ billing.finance.avg_price_ct != null ? billing.finance.avg_price_ct.toFixed(1) : '35.0' }} ct/kWh
                            <template v-if="billing.finance.base_fee_eur"> · +{{ billing.finance.base_fee_eur.toFixed(2) }} €</template>
                        </div>
                    </div>
                    <div class="eb-item">
                        <div class="eb-icon">💚</div>
                        <div class="eb-value" style="color: #22c55e;">{{ (billing.finance.total_savings_eur ?? billing.finance.savings_eur)?.toFixed(2) || '0.00' }}</div>
                        <div class="eb-label">{{ $t('energy.saved') }}</div>
                        <div class="eb-sub">{{ $t('energy.savedSubtitle', { kwh: savedKwh }) }}</div>
                    </div>
                    <div class="eb-item" v-if="projectedSavings">
                        <div class="eb-icon">📈</div>
                        <div class="eb-value" style="color: #06b6d4;">{{ projectedSavings }}</div>
                        <div class="eb-label">{{ $t('energy.projection') }}</div>
                        <div class="eb-sub">{{ $t('energy.yearlySavings') }}</div>
                    </div>
                </div>

                <!-- Stromherkunft Breakdown Bar -->
                <div class="breakdown-section" v-if="billing.household.total_kwh > 0" style="margin-top: var(--space-lg);">
                    <div class="eb-sub" style="margin-bottom: 6px;">{{ $t('energy.electricitySource') }}</div>
                    <div class="breakdown-bar">
                        <div class="breakdown-seg solar" :style="{width: breakdownPct.solar + '%'}" v-if="breakdownPct.solar > 0">
                            <span v-if="breakdownPct.solar >= 3">{{ breakdownPct.solar }}%</span>
                        </div>
                        <div class="breakdown-seg battery" :style="{width: breakdownPct.battery + '%'}" v-if="breakdownPct.battery > 0">
                            <span v-if="breakdownPct.battery >= 3">{{ breakdownPct.battery }}%</span>
                        </div>
                        <div class="breakdown-seg grid" :style="{width: breakdownPct.grid + '%'}" v-if="breakdownPct.grid > 0">
                            <span v-if="breakdownPct.grid >= 3">{{ breakdownPct.grid }}%</span>
                        </div>
                        <div class="breakdown-seg unknown" :style="{width: breakdownPct.unknown + '%'}" v-if="breakdownPct.unknown > 0">
                            <span v-if="breakdownPct.unknown >= 3">{{ breakdownPct.unknown }}%</span>
                        </div>
                    </div>
                    <div class="breakdown-legend">
                        <span><span class="breakdown-dot solar"></span> {{ $t('energy.solarDirect') }}</span>
                        <span><span class="breakdown-dot battery"></span> {{ $t('energy.viaBattery') }}</span>
                        <span><span class="breakdown-dot grid"></span> {{ $t('energy.fromGrid') }}</span>
                        <span v-if="balanceUnknownKwh > 0.05"><span class="breakdown-dot unknown"></span> {{ $t('energy.fromUnknown') }}</span>
                    </div>
                    <div class="breakdown-warning" v-if="balanceUnknownKwh > 0.05">
                        {{ $t('energy.unclassifiedEnergy', { kwh: fmt(balanceUnknownKwh) }) }}
                    </div>
                </div>

                <!-- Recorder Info -->
                <div v-if="billing.data_source" style="font-size: 0.65rem; color: var(--text-muted); text-align: center; margin-top: var(--space-md);">
                    📊 {{ $t('energy.source') }}: {{ billing.data_source }} · {{ $t('energy.daysWithData', { days: billing.period.days_with_data }) }}
                </div>
            </div>

            <!-- ========== KARTE 1b: VERBRAUCHSATLAS ========== -->
            <div class="chart-card consumer-atlas-card" style="margin-bottom: var(--space-lg);">
                <div class="chart-header consumer-atlas-header">
                    <div>
                        <span class="chart-title">{{ $t('energy.consumerAtlas.title') }}</span>
                        <div class="consumer-atlas-subtitle">{{ $t('energy.consumerAtlas.subtitle') }}</div>
                    </div>
                    <div class="consumer-atlas-actions">
                        <span class="consumer-atlas-period" v-if="consumerAtlas?.period">
                            {{ consumerAtlas.period.start }} — {{ consumerAtlas.period.today }}
                        </span>
                    </div>
                </div>

                <div v-if="consumerAtlasError" class="price-error" style="margin-bottom: var(--space-md);">{{ consumerAtlasError }}</div>
                <div v-if="consumerAtlasNotice" class="consumer-atlas-notice" aria-live="polite">{{ consumerAtlasNotice }}</div>

                <div class="consumer-atlas-kpis">
                    <div class="consumer-atlas-kpi">
                        <span>{{ $t('energy.consumerAtlas.known') }}</span>
                        <strong>{{ fmt(consumerAtlas?.summary?.known_kwh) }} kWh</strong>
                    </div>
                    <div class="consumer-atlas-kpi">
                        <span>{{ $t('energy.consumerAtlas.unknown') }}</span>
                        <strong>{{ fmt(consumerAtlas?.summary?.unknown_kwh) }} kWh</strong>
                    </div>
                    <div class="consumer-atlas-kpi">
                        <span>{{ $t('energy.consumerAtlas.activePower') }}</span>
                        <strong>{{ formatPower(consumerAtlas?.summary?.active_power_w) }}</strong>
                    </div>
                    <div class="consumer-atlas-kpi accent">
                        <span>{{ $t('energy.consumerAtlas.topConsumer') }}</span>
                        <strong>{{ consumerAtlasTopName }}</strong>
                    </div>
                </div>

                <div class="consumer-atlas-layout">
                    <div class="consumer-atlas-chart-target"></div>
                    <div class="consumer-atlas-side">
                        <div class="consumer-atlas-list" v-if="consumerAtlasConsumers.length">
                            <div class="consumer-atlas-row" v-for="consumer in consumerAtlasConsumers" :key="consumer.consumer_id">
                                <span class="consumer-atlas-color" :style="{ background: consumer.color }"></span>
                                <span class="consumer-atlas-name">{{ consumer.name }}</span>
                                <span class="consumer-atlas-value">{{ fmt(consumer.period_kwh) }} kWh</span>
                                <span class="consumer-atlas-live">{{ formatPower(consumer.last_power_w) }}</span>
                                <button class="consumer-atlas-delete" @click="deleteConsumerAtlasEntry(consumer.consumer_id)">×</button>
                            </div>
                        </div>
                        <div class="consumer-atlas-empty" v-else>{{ $t('energy.consumerAtlas.noData') }}</div>

                        <div class="consumer-atlas-form">
                            <input type="text" :placeholder="$t('energy.consumerAtlas.name')" v-model="consumerAtlasForm.name">
                            <input type="text" :placeholder="$t('energy.consumerAtlas.entityId')" v-model="consumerAtlasForm.entity_id">
                            <input type="number" min="0" step="0.1" :placeholder="$t('energy.consumerAtlas.startKwh')" v-model="consumerAtlasForm.start_kwh">
                            <select v-model="consumerAtlasForm.category">
                                <option value="entertainment">{{ $t('energy.consumerAtlas.categoryEntertainment') }}</option>
                                <option value="kitchen">{{ $t('energy.consumerAtlas.categoryKitchen') }}</option>
                                <option value="heating">{{ $t('energy.consumerAtlas.categoryHeating') }}</option>
                                <option value="mobility">{{ $t('energy.consumerAtlas.categoryMobility') }}</option>
                                <option value="office">{{ $t('energy.consumerAtlas.categoryOffice') }}</option>
                                <option value="utility">{{ $t('energy.consumerAtlas.categoryUtility') }}</option>
                                <option value="other">{{ $t('energy.consumerAtlas.categoryOther') }}</option>
                            </select>
                            <input type="color" v-model="consumerAtlasForm.color" :title="$t('energy.consumerAtlas.color')">
                            <button class="price-primary-btn consumer-atlas-save" @click="saveConsumerAtlasEntry" :disabled="consumerAtlasSaving">
                                {{ consumerAtlasSaving ? $t('common.saving') : $t('energy.consumerAtlas.add') }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ========== KARTE 1b: AMORTISATION ========== -->
            <div class="chart-card amortization-card" style="margin-bottom: var(--space-lg);" v-if="amortization">
                <div class="chart-header" style="margin-bottom: var(--space-md);">
                    <div>
                        <span class="chart-title">{{ $t('energy.amortization.title') }}</span>
                        <div class="amortization-subtitle">{{ $t('energy.amortization.subtitle') }}</div>
                    </div>
                    <button class="price-edit-btn" @click="toggleAmortizationEdit">
                        {{ amortizationEdit ? $t('common.close') : $t('energy.amortization.edit') }}
                    </button>
                </div>

                <div v-if="amortizationError" class="price-error" style="margin-bottom: var(--space-md);">{{ amortizationError }}</div>

                <div class="amortization-layout">
                    <div class="amortization-summary">
                        <div class="amortization-ring" :style="amortizationRingStyle">
                            <div class="amortization-ring-inner">
                                <strong>{{ amortizationProgress }}%</strong>
                                <span>{{ $t('energy.amortization.progress') }}</span>
                            </div>
                        </div>
                        <div class="amortization-kpis">
                            <div class="amortization-kpi">
                                <span>{{ $t('energy.amortization.investment') }}</span>
                                <strong>{{ formatEuro(amortization.summary?.net_investment_eur) }} €</strong>
                            </div>
                            <div class="amortization-kpi">
                                <span>{{ $t('energy.amortization.paidBack') }}</span>
                                <strong>{{ formatEuro(amortization.summary?.accumulated_benefit_eur) }} €</strong>
                            </div>
                            <div class="amortization-kpi">
                                <span>{{ $t('energy.amortization.remaining') }}</span>
                                <strong>{{ formatEuro(amortization.summary?.remaining_eur) }} €</strong>
                            </div>
                            <div class="amortization-kpi accent">
                                <span>{{ $t('energy.amortization.breakEven') }}</span>
                                <strong>{{ amortizationBreakEven }}</strong>
                            </div>
                        </div>
                    </div>

                    <div class="amortization-chart-wrap">
                        <div class="amortization-chart-target"></div>
                    </div>
                </div>

                <div class="amortization-scenarios" v-if="amortization.configured && amortization.scenarios?.length">
                    <div class="amortization-scenario" v-for="scenario in amortization.scenarios" :key="scenario.id">
                        <span>{{ $t('energy.amortization.scenarios.' + scenario.id) }}</span>
                        <strong>{{ formatScenarioBreakEven(scenario) }}</strong>
                    </div>
                </div>

                <div class="amortization-empty" v-if="!amortization.configured && !amortizationEdit">
                    {{ $t('energy.amortization.notConfigured') }}
                </div>

                <div class="amortization-form" v-if="amortizationEdit">
                    <label>
                        <span>{{ $t('energy.amortization.investmentInput') }}</span>
                        <input type="number" min="0" step="100" v-model="amortizationForm.investment_eur">
                    </label>
                    <label>
                        <span>{{ $t('energy.amortization.subsidyInput') }}</span>
                        <input type="number" min="0" step="100" v-model="amortizationForm.subsidy_eur">
                    </label>
                    <label>
                        <span>{{ $t('energy.amortization.startDate') }}</span>
                        <input type="date" v-model="amortizationForm.commissioning_date">
                    </label>
                    <label>
                        <span>{{ $t('energy.amortization.runningCosts') }}</span>
                        <input type="number" min="0" step="10" v-model="amortizationForm.annual_running_costs_eur">
                    </label>
                    <label>
                        <span>{{ $t('energy.amortization.priceIncrease') }}</span>
                        <input type="number" min="-10" max="20" step="0.1" v-model="amortizationForm.electricity_price_increase_percent">
                    </label>
                    <label>
                        <span>{{ $t('energy.amortization.degradation') }}</span>
                        <input type="number" min="0" max="10" step="0.1" v-model="amortizationForm.degradation_percent">
                    </label>
                    <button class="price-primary-btn amortization-save" @click="saveAmortizationSettings" :disabled="amortizationSaving">
                        {{ amortizationSaving ? $t('common.saving') : $t('energy.amortization.save') }}
                    </button>
                </div>
            </div>

            <!-- ========== KARTE 1b: MONATLICHE STROMKOSTEN ========== -->
            <div class="chart-card" style="margin-bottom: var(--space-lg);" v-if="monthlyData.length > 0">
                <div class="chart-header" style="margin-bottom: var(--space-md);">
                    <span class="chart-title">📅 {{ $t('energy.monthlyCosts') }}</span>
                </div>
                <div class="data-table-scroll">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>{{ $t('energy.month') }}</th>
                            <th style="text-align:right">{{ $t('energy.consumption') }}</th>
                            <th style="text-align:right">{{ $t('energy.solar') }}</th>
                            <th style="text-align:right">{{ $t('energy.autarky') }}</th>
                            <th style="text-align:right">{{ $t('energy.import') }}</th>
                            <th style="text-align:right">Ø ct/kWh</th>
                            <th style="text-align:right">{{ $t('energy.costs') }}</th>
                            <th style="text-align:right">{{ $t('energy.savedShort') }}</th>
                            <th style="text-align:right"></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(m, idx) in monthlyData" :key="idx"
                            :class="{ 'zebra-odd': idx % 2 === 1 }"
                            :style="{ background: m.isCurrent ? 'rgba(0,212,255,0.06)' : '' }">
                            <td class="month-cell" style="font-weight: 600;">
                                <div class="month-cell-content">
                                    <span>
                                        {{ m.label }}
                                        <span v-if="m.isCurrent" style="color:var(--accent); font-size:0.7rem;"> ({{ $t('energy.current') }})</span>
                                    </span>
                                    <button v-if="m.canEditPrice" class="price-edit-btn price-edit-btn-mobile" @click="openPriceModal(m)">Preis ändern</button>
                                </div>
                            </td>
                            <td style="text-align:right; font-family:var(--font-mono);">{{ m.consumption }} kWh</td>
                            <td style="text-align:right; font-family:var(--font-mono); color:var(--solar);">{{ m.solar }} kWh</td>
                            <td style="text-align:right;">
                                <span class="accuracy-badge" :style="{ background: m.autarkie >= 70 ? 'rgba(34,197,94,0.2)' : m.autarkie >= 40 ? 'rgba(234,179,8,0.2)' : 'rgba(168,85,247,0.2)', color: m.autarkie >= 70 ? '#22c55e' : m.autarkie >= 40 ? '#eab308' : '#a855f7' }">
                                    {{ m.autarkie }}%
                                </span>
                            </td>
                            <td style="text-align:right; font-family:var(--font-mono); color:#a855f7;">{{ m.gridImport }} kWh</td>
                            <td style="text-align:right; font-family:var(--font-mono); color:var(--text-secondary); font-size:0.8rem;">
                                {{ m.avgPrice }} ct
                                <span v-if="m.isDynamic" style="color:#22c55e; font-size:0.6rem;" :title="$t('energy.dynamicTariff')">●</span>
                                <span v-else style="color:#eab308; font-size:0.6rem;" :title="$t('energy.estimatedAvg')">○</span>
                            </td>
                            <td style="text-align:right; font-family:var(--font-mono); color:#ef4444;">{{ m.cost }} €</td>
                            <td style="text-align:right; font-family:var(--font-mono); color:#22c55e;">{{ m.saved }} €</td>
                            <td style="text-align:right;">
                                <button v-if="m.canEditPrice" class="price-edit-btn price-edit-btn-desktop" @click="openPriceModal(m)">Preis ändern</button>
                            </td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr style="border-top: 2px solid var(--border-default); font-weight: 700;">
                            <td>{{ $t('energy.totalRow') }}</td>
                            <td style="text-align:right; font-family:var(--font-mono);">{{ monthlyTotals.consumption }} kWh</td>
                            <td style="text-align:right; font-family:var(--font-mono); color:var(--solar);">{{ monthlyTotals.solar }} kWh</td>
                            <td style="text-align:right;">
                                <span class="accuracy-badge" :style="{ background: 'rgba(0,212,255,0.15)', color: 'var(--accent)' }">
                                    {{ monthlyTotals.autarkie }}%
                                </span>
                            </td>
                            <td style="text-align:right; font-family:var(--font-mono); color:#a855f7;">{{ monthlyTotals.gridImport }} kWh</td>
                            <td></td>
                            <td style="text-align:right; font-family:var(--font-mono); color:#ef4444;">{{ monthlyTotals.cost }} €</td>
                            <td style="text-align:right; font-family:var(--font-mono); color:#22c55e;">{{ monthlyTotals.saved }} €</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
                </div>
            </div>

            <!-- ========== KARTE 2: STROMPREISE HEUTE vs MORGEN ========== -->
            <div class="chart-card" style="margin-bottom: var(--space-lg);">
                <div class="chart-header">
                    <span class="chart-title">{{ $t('energy.priceTitle') }}</span>
                    <div v-if="priceRanges" style="display:flex; gap:var(--space-lg); align-items:center;">
                        <span style="font-family:var(--font-mono); font-size:0.8rem; color:#f472b6;">{{ $t('common.today') }}: {{ priceRanges.todayMin }}-{{ priceRanges.todayMax }} ct</span>
                        <span style="font-family:var(--font-mono); font-size:0.8rem; color:#22d3ee;">{{ $t('common.tomorrow') }}: {{ priceRanges.tomorrowMin }}-{{ priceRanges.tomorrowMax }} ct</span>
                    </div>
                </div>
                <div class="price-chart-target" style="height: 320px; width: 100%;"></div>
            </div>

            <!-- ========== KARTE 3: ENERGIEQUELLEN LIVE (Power Sources) ========== -->
            <div class="chart-card" style="margin-bottom: var(--space-lg);">
                <div class="chart-header">
                    <span class="chart-title">🔌 {{ $t('energy.sourcesToday') }}</span>
                </div>
                <div class="sources-chart-target" style="height: 300px; width: 100%;"></div>
            </div>

            <!-- ========== KARTE 4: VERBRAUCHER ========== -->
            <div class="chart-card" v-if="hasConsumers" style="margin-bottom: var(--space-lg);">
                <div class="chart-header">
                    <span class="chart-title">🔌 {{ $t('energy.consumers') }}</span>
                </div>
                <div class="consumer-grid">
                    <div class="consumer-row clickable" v-if="billing.consumers.heatpump.total_kwh > 0" @click="openConsumerModal('heatpump')">
                        <span class="consumer-icon">♨️</span>
                        <span class="consumer-name">{{ $t('flow.consumer.heatpump') }}</span>
                        <span class="consumer-kwh">{{ billing.consumers.heatpump.total_kwh.toFixed(1) }} kWh</span>
                        <span class="consumer-cost">{{ billing.consumers.heatpump.cost_eur.toFixed(2) }} €</span>
                        <span class="consumer-arrow">›</span>
                    </div>
                    <div class="consumer-row clickable" v-if="billing.consumers.heatingrod.total_kwh > 0" @click="openConsumerModal('heatingrod')">
                        <span class="consumer-icon">🔥</span>
                        <span class="consumer-name">{{ $t('flow.consumer.heatingrod') }}</span>
                        <span class="consumer-kwh">{{ billing.consumers.heatingrod.total_kwh.toFixed(1) }} kWh</span>
                        <span class="consumer-cost">{{ billing.consumers.heatingrod.cost_eur.toFixed(2) }} €</span>
                        <span class="consumer-arrow">›</span>
                    </div>
                    <div class="consumer-row clickable" v-if="billing.consumers.wallbox.total_kwh > 0" @click="openConsumerModal('wallbox')">
                        <span class="consumer-icon">🚗</span>
                        <span class="consumer-name">{{ $t('energy.wallbox') }}</span>
                        <span class="consumer-kwh">{{ billing.consumers.wallbox.total_kwh.toFixed(1) }} kWh</span>
                        <span class="consumer-cost">{{ billing.consumers.wallbox.cost_eur.toFixed(2) }} €</span>
                        <span class="consumer-arrow">›</span>
                    </div>
                </div>
            </div>

            <!-- ========== MONTHLY PRICE MODAL ========== -->
            <div class="modal-overlay" v-if="priceModal" @click.self="closePriceModal">
                <div class="modal-content price-modal">
                    <button class="modal-close" @click="closePriceModal">✕</button>
                    <h3 style="margin:0 0 var(--space-md);">Strompreis für {{ priceModal.label }}</h3>
                    <p class="price-current">Aktuell verwendet: <strong>{{ formatCt(priceModal.currentPrice) }} ct/kWh</strong></p>
                    <label class="price-input-label" for="monthly-price-input">Neuer Preis</label>
                    <div class="price-input-row">
                        <input
                            id="monthly-price-input"
                            type="number"
                            min="0.01"
                            max="200"
                            step="0.01"
                            v-model="priceInput"
                            @input="previewPriceChange"
                        >
                        <span>ct/kWh</span>
                    </div>
                    <div v-if="priceError" class="price-error">{{ priceError }}</div>
                    <div v-if="pricePreview" class="price-preview-grid">
                        <div class="price-preview-item">
                            <span>Bisherige Kosten</span>
                            <strong>{{ formatEuro(pricePreview.before?.cost_eur) }} €</strong>
                        </div>
                        <div class="price-preview-item">
                            <span>Neue Kosten</span>
                            <strong>{{ formatEuro(pricePreview.after?.cost_eur) }} €</strong>
                        </div>
                        <div class="price-preview-item">
                            <span>Stromkosten</span>
                            <strong>{{ formatEuro(pricePreview.after?.energy_cost_eur) }} €</strong>
                        </div>
                        <div class="price-preview-item">
                            <span>Anteilige Grundgebühr</span>
                            <strong>{{ formatEuro(pricePreview.after?.base_fee_eur) }} €</strong>
                        </div>
                    </div>
                    <div class="price-modal-actions">
                        <button class="price-primary-btn" @click="savePriceChange" :disabled="priceSaving || !pricePreview">Speichern</button>
                        <button class="price-secondary-btn" @click="resetMonthPrice" :disabled="priceSaving || !priceModal.canReset">Monatspreis zurücksetzen</button>
                        <button class="price-cancel-btn" @click="closePriceModal" :disabled="priceSaving">Abbrechen</button>
                    </div>
                </div>
            </div>

            <!-- ========== CONSUMER DETAIL MODAL ========== -->
            <div class="modal-overlay" v-if="consumerModal" @click.self="consumerModal = null">
                <div class="modal-content">
                    <button class="modal-close" @click="consumerModal = null">✕</button>

                    <!-- HEATPUMP MODAL -->
                    <template v-if="consumerModal === 'heatpump' && consumerDetail?.heatpump">
                        <h3 style="margin:0 0 var(--space-md);">♨️ {{ $t('flow.consumer.heatpump') }} — {{ $t('common.details') }}</h3>
                        <div class="cd-grid" v-if="consumerDetail.heatpump.live">
                            <div class="cd-badge" v-if="consumerDetail.heatpump.live.heating_mode">
                                <span class="cd-label">{{ $t('energy.heatpump.heatingMode') }}</span>
                                <span class="cd-value">{{ consumerDetail.heatpump.live.heating_mode }}</span>
                            </div>
                            <div class="cd-badge" v-if="consumerDetail.heatpump.live.dhw_mode">
                                <span class="cd-label">{{ $t('energy.heatpump.dhwMode') }}</span>
                                <span class="cd-value">{{ consumerDetail.heatpump.live.dhw_mode }}</span>
                            </div>
                            <div class="cd-badge" v-if="consumerDetail.heatpump.live.dhw_charging != null">
                                <span class="cd-label">{{ $t('energy.heatpump.dhwCharging') }}</span>
                                <span class="cd-value" :style="{color: consumerDetail.heatpump.live.dhw_charging ? '#22c55e' : '#6e7681'}">{{ consumerDetail.heatpump.live.dhw_charging ? $t('energy.activeUpper') : $t('energy.off') }}</span>
                            </div>
                            <div class="cd-badge" v-if="consumerDetail.heatpump.live.pv_active != null">
                                <span class="cd-label">{{ $t('energy.heatpump.pvMode') }}</span>
                                <span class="cd-value" :style="{color: consumerDetail.heatpump.live.pv_active ? '#fbbf24' : '#6e7681'}">{{ consumerDetail.heatpump.live.pv_active ? '☀ ' + $t('energy.activeUpper') : $t('energy.off') }}</span>
                            </div>
                        </div>
                        <div class="cd-stats" v-if="consumerDetail.heatpump.live">
                            <div class="cd-stat" v-if="consumerDetail.heatpump.live.storage_temp != null">
                                <span class="cd-stat-icon">🌡️</span>
                                <span class="cd-stat-value" :style="{color: consumerDetail.heatpump.live.storage_temp > 55 ? '#ef4444' : consumerDetail.heatpump.live.storage_temp > 40 ? '#fbbf24' : '#22d3ee'}">{{ consumerDetail.heatpump.live.storage_temp }}°C</span>
                                <span class="cd-stat-label">{{ $t('energy.heatpump.storage') }}</span>
                            </div>
                            <div class="cd-stat" v-if="consumerDetail.heatpump.live.electric_power != null">
                                <span class="cd-stat-icon">⚡</span>
                                <span class="cd-stat-value">{{ consumerDetail.heatpump.live.electric_power }} kW</span>
                                <span class="cd-stat-label">{{ $t('energy.heatpump.electricInput') }}</span>
                            </div>
                            <div class="cd-stat" v-if="consumerDetail.heatpump.live.thermal_power != null">
                                <span class="cd-stat-icon">🔥</span>
                                <span class="cd-stat-value">{{ consumerDetail.heatpump.live.thermal_power }} kW</span>
                                <span class="cd-stat-label">{{ $t('energy.heatpump.thermalPower') }}</span>
                            </div>
                            <div class="cd-stat" v-if="consumerDetail.heatpump.live.jaz != null">
                                <span class="cd-stat-icon">📊</span>
                                <span class="cd-stat-value" :style="{color: consumerDetail.heatpump.live.jaz >= 3.5 ? '#22c55e' : consumerDetail.heatpump.live.jaz >= 2.5 ? '#fbbf24' : '#ef4444'}">{{ consumerDetail.heatpump.live.jaz }}</span>
                                <span class="cd-stat-label">JAZ</span>
                            </div>
                            <div class="cd-stat" v-if="consumerDetail.heatpump.live.daily_kwh != null">
                                <span class="cd-stat-icon">🔋</span>
                                <span class="cd-stat-value">{{ consumerDetail.heatpump.live.daily_kwh }} kWh</span>
                                <span class="cd-stat-label">{{ $t('energy.heatpump.energyToday') }}</span>
                            </div>
                            <div class="cd-stat" v-if="consumerDetail.heatpump.live.pv_energy_today != null">
                                <span class="cd-stat-icon">☀️</span>
                                <span class="cd-stat-value" style="color:#fbbf24;">{{ consumerDetail.heatpump.live.pv_energy_today }} kWh</span>
                                <span class="cd-stat-label">{{ $t('energy.heatpump.pvToHpToday') }}</span>
                            </div>
                            <div class="cd-stat" v-if="consumerDetail.heatpump.live.grid_energy_today != null">
                                <span class="cd-stat-icon">⚡</span>
                                <span class="cd-stat-value" style="color:#a855f7;">{{ consumerDetail.heatpump.live.grid_energy_today }} kWh</span>
                                <span class="cd-stat-label">{{ $t('energy.heatpump.gridToHpToday') }}</span>
                            </div>
                            <div class="cd-stat" v-if="consumerDetail.heatpump.live.unassigned_energy_today != null">
                                <span class="cd-stat-icon">🔌</span>
                                <span class="cd-stat-value" style="color:#38bdf8;">{{ consumerDetail.heatpump.live.unassigned_energy_today }} kWh</span>
                                <span class="cd-stat-label">{{ $t('energy.heatpump.unassignedToday') }}</span>
                            </div>
                            <div class="cd-stat" v-if="consumerDetail.heatpump.live.pv_share_percent != null">
                                <span class="cd-stat-icon">🌿</span>
                                <span class="cd-stat-value" style="color:#22c55e;">{{ consumerDetail.heatpump.live.pv_share_percent }}%</span>
                                <span class="cd-stat-label">{{ $t('energy.heatpump.pvShare') }}</span>
                            </div>
                            <div class="cd-stat" v-if="consumerDetail.heatpump.live.grid_share_percent != null">
                                <span class="cd-stat-icon">⚡</span>
                                <span class="cd-stat-value" style="color:#a855f7;">{{ consumerDetail.heatpump.live.grid_share_percent }}%</span>
                                <span class="cd-stat-label">{{ $t('energy.heatpump.gridShare') }}</span>
                            </div>
                            <div class="cd-stat" v-if="consumerDetail.heatpump.live.compressor_starts != null">
                                <span class="cd-stat-icon">🔄</span>
                                <span class="cd-stat-value">{{ consumerDetail.heatpump.live.compressor_starts }}</span>
                                <span class="cd-stat-label">{{ $t('energy.heatpump.compressorStarts') }}</span>
                            </div>
                        </div>
                    </template>

                    <!-- HEATINGROD MODAL -->
                    <template v-if="consumerModal === 'heatingrod' && consumerDetail?.heatingrod">
                        <h3 style="margin:0 0 var(--space-md);">🔥 {{ $t('flow.consumer.heatingrod') }} — {{ $t('common.details') }}</h3>
                        <div class="cd-stats">
                            <div class="cd-stat" v-if="consumerDetail.heatingrod.live.power != null">
                                <span class="cd-stat-icon">⚡</span>
                                <span class="cd-stat-value">{{ consumerDetail.heatingrod.live.power }} W</span>
                                <span class="cd-stat-label">{{ $t('energy.currentPower') }}</span>
                            </div>
                            <div class="cd-stat" v-if="consumerDetail.heatingrod.live.daily_kwh != null">
                                <span class="cd-stat-icon">📊</span>
                                <span class="cd-stat-value">{{ consumerDetail.heatingrod.live.daily_kwh }} kWh</span>
                                <span class="cd-stat-label">{{ $t('common.today') }}</span>
                            </div>
                        </div>
                    </template>

                    <!-- WALLBOX MODAL -->
                    <template v-if="consumerModal === 'wallbox' && consumerDetail?.wallbox">
                        <h3 style="margin:0 0 var(--space-md);">🚗 {{ $t('energy.wallbox') }} — {{ $t('common.details') }}</h3>
                        <div class="cd-stats">
                            <div class="cd-stat" v-if="consumerDetail.wallbox.live.state">
                                <span class="cd-stat-icon">🔌</span>
                                <span class="cd-stat-value">{{ consumerDetail.wallbox.live.state }}</span>
                                <span class="cd-stat-label">{{ $t('settings.statusLabel') }}</span>
                            </div>
                            <div class="cd-stat" v-if="consumerDetail.wallbox.live.charge_mode">
                                <span class="cd-stat-icon">⚡</span>
                                <span class="cd-stat-value">{{ consumerDetail.wallbox.live.charge_mode }}</span>
                                <span class="cd-stat-label">{{ $t('energy.chargeMode') }}</span>
                            </div>
                            <div class="cd-stat" v-if="consumerDetail.wallbox.live.power != null">
                                <span class="cd-stat-icon">💪</span>
                                <span class="cd-stat-value">{{ consumerDetail.wallbox.live.power }} W</span>
                                <span class="cd-stat-label">{{ $t('energy.chargePower') }}</span>
                            </div>
                            <div class="cd-stat" v-if="consumerDetail.wallbox.live.session_kwh != null">
                                <span class="cd-stat-icon">🔋</span>
                                <span class="cd-stat-value">{{ consumerDetail.wallbox.live.session_kwh }} kWh</span>
                                <span class="cd-stat-label">{{ $t('energy.session') }}</span>
                            </div>
                            <div class="cd-stat" v-if="consumerDetail.wallbox.live.daily_kwh != null">
                                <span class="cd-stat-icon">📊</span>
                                <span class="cd-stat-value">{{ consumerDetail.wallbox.live.daily_kwh }} kWh</span>
                                <span class="cd-stat-label">{{ $t('common.today') }}</span>
                            </div>
                        </div>
                    </template>
                </div>
            </div>

        </div>
    `,

    setup(props) {
        const t = window.SFMLI18n ? window.SFMLI18n.t : (key) => key;
        const locale = { value: window.SFMLI18n ? window.SFMLI18n.current : 'en' };
        const bcp = (l) => ({ de: 'de-DE', en: 'en-US', pl: 'pl-PL' }[l] || 'en-US');

        const defaultAmortization = {
            success: true,
            configured: false,
            settings: {
                investment_eur: 0,
                subsidy_eur: 0,
                commissioning_date: null,
                annual_running_costs_eur: 0,
                electricity_price_increase_percent: 2.0,
                degradation_percent: 0.5,
            },
            summary: {
                net_investment_eur: 0,
                accumulated_benefit_eur: 0,
                remaining_eur: 0,
                progress_percent: 0,
                observed_months: 0,
                annualized_benefit_eur: 0,
                break_even_month: null,
                break_even_year: null,
                months_to_break_even: null,
                status: 'unavailable',
            },
            series: [],
            projection: [],
            scenarios: [],
        };

        const defaultConsumerAtlas = {
            success: true,
            period: null,
            summary: {
                configured_count: 0,
                enabled_count: 0,
                known_kwh: 0,
                home_consumption_kwh: 0,
                unknown_kwh: 0,
                active_power_w: 0,
                top_consumer: null,
            },
            consumers: [],
            daily: [],
        };

        const billing = ref(null);
        const billingError = ref(null);
        const priceData = ref(null);
        const sourcesData = ref(null);
        const monthlyData = ref([]);
        const amortization = ref(defaultAmortization);
        const amortizationError = ref(null);
        const amortizationEdit = ref(false);
        const amortizationSaving = ref(false);
        const amortizationForm = reactive({
            investment_eur: '',
            subsidy_eur: '',
            commissioning_date: '',
            annual_running_costs_eur: '',
            electricity_price_increase_percent: '2.0',
            degradation_percent: '0.5',
        });
        const consumerAtlas = ref(defaultConsumerAtlas);
        const consumerAtlasError = ref(null);
        const consumerAtlasNotice = ref(null);
        const consumerAtlasSaving = ref(false);
        const consumerAtlasForm = reactive({
            name: '',
            entity_id: '',
            start_kwh: '',
            category: 'entertainment',
            color: '#06b6d4',
        });
        const priceModal = ref(null);
        const priceInput = ref('');
        const pricePreview = ref(null);
        const priceError = ref(null);
        const priceSaving = ref(false);
        const consumerModal = ref(null);
        const consumerDetail = ref(null);
        const timeContext = reactive({
            timezone: null,
            today: null,
            current_hour: null,
            current_month: null,
            current_year: null,
        });
        let priceChart = null;
        let sourcesChart = null;
        let amortizationChart = null;
        let consumerAtlasChart = null;
        let pricePreviewTimer = null;

        // Localized via months.shortJan/shortFeb/... at use-site.
        const MONTH_SHORT_KEYS = [
            'months.shortJan', 'months.shortFeb', 'months.shortMar', 'months.shortApr',
            'months.shortMay', 'months.shortJun', 'months.shortJul', 'months.shortAug',
            'months.shortSep', 'months.shortOct', 'months.shortNov', 'months.shortDec',
        ];
        const MONTH_NAMES = MONTH_SHORT_KEYS.map(k => t(k));

        function num(v, fallback = 0) { return v ?? fallback; }
        function fmt(v) { return v != null ? v.toFixed(1) : '0.0'; }
        function formatEuro(v) {
            const n = Number(v ?? 0);
            return Number.isFinite(n) ? n.toFixed(2) : '0.00';
        }
        function formatCt(v) {
            const n = Number(v ?? 0);
            return Number.isFinite(n) ? n.toFixed(2).replace('.', ',') : '0,00';
        }
        function formatPower(v) {
            const n = Number(v ?? 0);
            if (!Number.isFinite(n) || n <= 0) return '0 W';
            if (n >= 1000) return (n / 1000).toFixed(1) + ' kW';
            return n.toFixed(0) + ' W';
        }
        function syncTimeContext(payload) {
            const ctx = payload?.time_context;
            if (!ctx || typeof ctx !== 'object') return;
            Object.assign(timeContext, ctx);
        }
        function haCurrentHour() {
            const hour = Number(timeContext.current_hour);
            return Number.isFinite(hour) ? hour : new Date().getHours();
        }
        function currentYearMonthKey() {
            const year = Number(timeContext.current_year) || new Date().getFullYear();
            const month = Number(timeContext.current_month) || (new Date().getMonth() + 1);
            return `${year}-${String(month).padStart(2, '0')}`;
        }
        function formatHaTime(value) {
            if (!value) return '';
            const date = value instanceof Date ? value : new Date(value);
            if (Number.isNaN(date.getTime())) return '';
            return new Intl.DateTimeFormat(bcp(locale.value), {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: timeContext.timezone || undefined,
            }).format(date);
        }
        function priceEndpoint(monthRow, suffix = '') {
            return `/api/sfml_stats/energy/monthly_price/${monthRow.year}/${monthRow.monthNumber}${suffix}`;
        }
        function validatePriceInput(value) {
            const price = Number(String(value).replace(',', '.'));
            if (!Number.isFinite(price)) return null;
            if (price <= 0 || price > 200) return null;
            return price;
        }
        async function postJson(url, body) {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok || payload?.success === false) {
                throw new Error(payload?.error?.message || payload?.error || 'Der Vorgang konnte nicht ausgeführt werden.');
            }
            return payload;
        }
        async function deleteJson(url) {
            const response = await fetch(url, { method: 'DELETE' });
            const payload = await response.json().catch(() => null);
            if (!response.ok || payload?.success === false) {
                throw new Error(payload?.error?.message || payload?.error || 'Der Vorgang konnte nicht ausgeführt werden.');
            }
            return payload;
        }

        const monthlyTotals = computed(() => {
            const d = monthlyData.value;
            if (!d.length) return { consumption: '0', solar: '0', autarkie: '0', gridImport: '0', cost: '0.00', saved: '0.00' };
            const consumption = d.reduce((s, m) => s + parseFloat(m.consumption), 0);
            const solar = d.reduce((s, m) => s + parseFloat(m.solar), 0);
            const gridImport = d.reduce((s, m) => s + parseFloat(m.gridImport), 0);
            const selfCons = d.reduce((s, m) => s + (m.selfCons || 0), 0);
            const cost = d.reduce((s, m) => s + parseFloat(m.cost), 0);
            const saved = d.reduce((s, m) => s + parseFloat(m.saved), 0);
            const autarkie = consumption > 0 ? Math.min(100, (selfCons / consumption) * 100) : 0;
            return {
                consumption: consumption.toFixed(0),
                solar: solar.toFixed(0),
                autarkie: autarkie.toFixed(0),
                gridImport: gridImport.toFixed(0),
                cost: cost.toFixed(2),
                saved: saved.toFixed(2),
            };
        });

        const autarkieColor = computed(() => {
            const p = billing.value?.autarkie_percent ?? 0;
            if (p >= 70) return '#22c55e';
            if (p >= 40) return '#eab308';
            return '#a855f7';
        });

        const avgDaily = computed(() => {
            const b = billing.value;
            if (!b) return '0.0';
            const days = b.period?.days_elapsed || 1;
            return (num(b.solar?.total_kwh) / days).toFixed(1);
        });

        const savedKwh = computed(() => {
            const b = billing.value;
            if (!b) return '0';
            if (b.household?.self_supplied_kwh != null) {
                return b.household.self_supplied_kwh.toFixed(0);
            }
            return (num(b.solar?.to_house_kwh) + num(b.household?.from_battery_kwh)).toFixed(0);
        });

        const projectedSavings = computed(() => {
            const b = billing.value;
            const savings = b?.finance?.total_savings_eur ?? b?.finance?.savings_eur;
            if (!b || savings == null || !b.period?.days_elapsed) return null;
            const factor = b.period.days_total / b.period.days_elapsed;
            return (savings * factor).toFixed(0);
        });

        const balanceUnknownKwh = computed(() => {
            const value = Number(billing.value?.household?.from_unknown_kwh ?? 0);
            return Number.isFinite(value) ? Math.max(0, value) : 0;
        });

        function wholePercentages(values) {
            const cleaned = values.map(value => {
                const number = Number(value ?? 0);
                return Number.isFinite(number) ? Math.max(0, number) : 0;
            });
            const total = cleaned.reduce((sum, value) => sum + value, 0);
            if (total <= 0) return cleaned.map(() => 0);
            const raw = cleaned.map(value => value / total * 100);
            const rounded = raw.map(value => Math.round(value));
            let diff = 100 - rounded.reduce((sum, value) => sum + value, 0);
            while (diff !== 0) {
                const direction = diff > 0 ? 1 : -1;
                let bestIndex = -1;
                let bestScore = -Infinity;
                raw.forEach((value, index) => {
                    if (cleaned[index] <= 0) return;
                    if (direction < 0 && rounded[index] <= 0) return;
                    const score = direction > 0
                        ? value - rounded[index]
                        : rounded[index] - value;
                    if (score > bestScore) {
                        bestScore = score;
                        bestIndex = index;
                    }
                });
                if (bestIndex < 0) break;
                rounded[bestIndex] += direction;
                diff -= direction;
            }
            return rounded;
        }

        const breakdownPct = computed(() => {
            const b = billing.value;
            if (!b) return { solar: 0, battery: 0, grid: 0, unknown: 0 };
            const solarRaw = Math.max(0, num(b.solar?.to_house_kwh));
            const batteryRaw = Math.max(0, b.household?.from_battery_kwh ?? 0);
            const gridRaw = Math.max(0, num(b.household?.from_grid_kwh));
            const unknownRaw = balanceUnknownKwh.value;
            const [solar, battery, grid, unknown] = wholePercentages([
                solarRaw,
                batteryRaw,
                gridRaw,
                unknownRaw,
            ]);
            return {
                solar,
                battery,
                grid,
                unknown,
            };
        });

        const priceRanges = computed(() => {
            const ph = priceData.value?.price_hours;
            if (!ph || !ph.length) return null;
            const today = ph.filter(h => !h.is_tomorrow).map(h => h.total_price);
            const tomorrow = ph.filter(h => h.is_tomorrow).map(h => h.total_price);
            if (!today.length) return null;
            return {
                todayMin: Math.min(...today).toFixed(2),
                todayMax: Math.max(...today).toFixed(2),
                tomorrowMin: tomorrow.length ? Math.min(...tomorrow).toFixed(2) : '--',
                tomorrowMax: tomorrow.length ? Math.max(...tomorrow).toFixed(2) : '--',
            };
        });

        const hasConsumers = computed(() => {
            const c = billing.value?.consumers;
            if (!c) return false;
            return (c.heatpump?.total_kwh > 0) || (c.heatingrod?.total_kwh > 0) || (c.wallbox?.total_kwh > 0);
        });

        const consumerAtlasConsumers = computed(() => consumerAtlas.value?.consumers || []);

        const consumerAtlasTopName = computed(() => (
            consumerAtlas.value?.summary?.top_consumer?.name || t('energy.consumerAtlas.none')
        ));

        const amortizationProgress = computed(() => {
            const value = Number(amortization.value?.summary?.progress_percent ?? 0);
            return Number.isFinite(value) ? Math.max(0, Math.min(100, value)).toFixed(0) : '0';
        });

        const amortizationRingStyle = computed(() => ({
            background: `conic-gradient(#22c55e ${amortizationProgress.value}%, rgba(255,255,255,0.08) 0)`,
        }));

        const amortizationBreakEven = computed(() => {
            const summary = amortization.value?.summary;
            if (!amortization.value?.configured) return t('energy.amortization.open');
            if (summary?.status === 'reached') return t('energy.amortization.reached');
            if (summary?.break_even_year) return String(summary.break_even_year);
            return t('energy.amortization.unavailable');
        });

        function parseMoneyInput(value) {
            const number = Number(String(value ?? '').replace(',', '.'));
            return Number.isFinite(number) ? Math.max(0, number) : 0;
        }

        function parsePercentInput(value, fallback) {
            const number = Number(String(value ?? '').replace(',', '.'));
            return Number.isFinite(number) ? number : fallback;
        }

        function syncAmortizationForm(settings) {
            const s = settings || {};
            amortizationForm.investment_eur = String(s.investment_eur ?? '');
            amortizationForm.subsidy_eur = String(s.subsidy_eur ?? '');
            amortizationForm.commissioning_date = s.commissioning_date || '';
            amortizationForm.annual_running_costs_eur = String(s.annual_running_costs_eur ?? '');
            amortizationForm.electricity_price_increase_percent = String(s.electricity_price_increase_percent ?? '2.0');
            amortizationForm.degradation_percent = String(s.degradation_percent ?? '0.5');
        }

        function formatScenarioBreakEven(scenario) {
            if (scenario.months_to_break_even === 0) return t('energy.amortization.reached');
            if (!scenario.break_even_month) return t('energy.amortization.unavailable');
            return scenario.break_even_month.slice(0, 4);
        }

        function toggleAmortizationEdit() {
            amortizationEdit.value = !amortizationEdit.value;
        }

        async function saveAmortizationSettings() {
            amortizationSaving.value = true;
            amortizationError.value = null;
            try {
                const payload = {
                    investment_eur: parseMoneyInput(amortizationForm.investment_eur),
                    subsidy_eur: parseMoneyInput(amortizationForm.subsidy_eur),
                    commissioning_date: amortizationForm.commissioning_date || null,
                    annual_running_costs_eur: parseMoneyInput(amortizationForm.annual_running_costs_eur),
                    electricity_price_increase_percent: parsePercentInput(amortizationForm.electricity_price_increase_percent, 2.0),
                    degradation_percent: parsePercentInput(amortizationForm.degradation_percent, 0.5),
                };
                const result = await postJson('/api/sfml_stats/amortization', payload);
                amortization.value = result;
                syncAmortizationForm(result.settings);
                amortizationEdit.value = false;
                await nextTick();
                renderAmortizationChart(result);
            } catch (err) {
                amortizationError.value = err?.message || t('energy.amortization.saveFailed');
            } finally {
                amortizationSaving.value = false;
            }
        }

        function resetConsumerAtlasForm() {
            consumerAtlasForm.name = '';
            consumerAtlasForm.entity_id = '';
            consumerAtlasForm.start_kwh = '';
            consumerAtlasForm.category = 'entertainment';
            consumerAtlasForm.color = '#06b6d4';
        }

        async function reloadConsumerAtlas() {
            const atlas = await SFMLApi.fetch('/api/sfml_stats/consumer_atlas', { forceRefresh: true });
            consumerAtlas.value = atlas || defaultConsumerAtlas;
            syncTimeContext(atlas);
            await nextTick();
            renderConsumerAtlasChart(consumerAtlas.value);
        }

        async function saveConsumerAtlasEntry() {
            consumerAtlasSaving.value = true;
            consumerAtlasError.value = null;
            consumerAtlasNotice.value = null;
            try {
                await postJson('/api/sfml_stats/consumer_atlas', {
                    name: consumerAtlasForm.name,
                    entity_id: consumerAtlasForm.entity_id,
                    start_kwh: consumerAtlasForm.start_kwh,
                    category: consumerAtlasForm.category,
                    color: consumerAtlasForm.color,
                    enabled: true,
                });
                resetConsumerAtlasForm();
                await reloadConsumerAtlas();
            } catch (err) {
                consumerAtlasError.value = err?.message || t('energy.consumerAtlas.saveFailed');
            } finally {
                consumerAtlasSaving.value = false;
            }
        }

        async function deleteConsumerAtlasEntry(consumerId) {
            if (!consumerId) return;
            consumerAtlasError.value = null;
            consumerAtlasNotice.value = null;
            try {
                await deleteJson(`/api/sfml_stats/consumer_atlas/${encodeURIComponent(consumerId)}`);
                await reloadConsumerAtlas();
            } catch (err) {
                consumerAtlasError.value = err?.message || t('energy.consumerAtlas.deleteFailed');
            }
        }

        async function loadData() {
            try {
                const [bill, prices, sources, amort, atlas] = await Promise.all([
                    SFMLApi.fetch('/api/sfml_stats/billing', { forceRefresh: true }).catch(err => ({
                        success: false,
                        error: {
                            code: 'billing_request_failed',
                            message: err?.message || t('energy.billingUnavailable'),
                        },
                    })),
                    SFMLApi.fetch('/api/sfml_stats/gpm_prices', { forceRefresh: true }),
                    SFMLApi.fetch('/api/sfml_stats/power_sources_history?hours=24', { forceRefresh: true }),
                    SFMLApi.fetch('/api/sfml_stats/amortization', { forceRefresh: true }).catch(err => ({
                        success: false,
                        error: err?.message || t('energy.amortization.unavailable'),
                    })),
                    SFMLApi.fetch('/api/sfml_stats/consumer_atlas', { forceRefresh: true }).catch(err => ({
                        success: false,
                        error: err?.message || t('energy.consumerAtlas.unavailable'),
                    })),
                ]);
                syncTimeContext(bill);
                syncTimeContext(prices);
                syncTimeContext(sources);
                syncTimeContext(amort);
                syncTimeContext(atlas);
                if (bill?.success === false || bill?.error) {
                    billing.value = null;
                    billingError.value = bill?.error?.message || bill?.error || t('energy.billingUnavailable');
                } else if (bill?.data_available !== false) {
                    billing.value = bill;
                    billingError.value = null;
                }
                priceData.value = prices;
                sourcesData.value = sources;
                if (amort?.success === false || amort?.error) {
                    amortizationError.value = amort?.error?.message || amort?.error || t('energy.amortization.unavailable');
                } else if (amort) {
                    amortization.value = amort;
                    amortizationError.value = null;
                    syncAmortizationForm(amort.settings);
                }
                if (atlas?.success === false || atlas?.error) {
                    consumerAtlasError.value = atlas?.error?.message || atlas?.error || t('energy.consumerAtlas.unavailable');
                } else if (atlas) {
                    consumerAtlas.value = atlas;
                    consumerAtlasError.value = null;
                }

                // Build monthly cost table from real DB data
                try {
                    const summary = await SFMLApi.fetch('/api/sfml_stats/summary', { forceRefresh: false });
                    syncTimeContext(summary);
                    const monthlyRaw = summary?.monthly_energy || [];
                    const avgPrice = bill?.finance?.avg_price_ct ?? 35.0;

                    const nowKey = currentYearMonthKey();

                    const rows = monthlyRaw.map(m => {
                        const parts = m.month.split('-');
                        const year = parseInt(parts[0]);
                        const month = parseInt(parts[1]);
                        const consumption = m.consumption_kwh ?? 0;
                        const solar = m.solar_kwh ?? 0;
                        const gridImport = m.grid_import_kwh ?? 0;
                        const gridExport = m.grid_export_kwh ?? 0;
                        const autarkie = m.autarkie_percent ?? 0;

                        // Kosten: echte stündliche Kosten aus DB (dynamisch) oder Fallback
                        const cost = m.cost_eur ?? (gridImport * avgPrice / 100);
                        const priceUsed = m.avg_price_ct ?? avgPrice;
                        const selfCons = m.self_consumption_kwh ?? (
                            (m.solar_to_house_kwh ?? 0)
                            + Math.max(0, (m.battery_to_house_kwh ?? 0) - (m.grid_to_battery_kwh ?? 0))
                        );
                        const saved = m.total_savings_eur ?? m.savings_eur ?? (selfCons * priceUsed / 100);
                        const isDynamic = m.cost_source === 'dynamic' || m.cost_source === 'hybrid';
                        const priceMode = m.price_mode || (isDynamic ? 'dynamic' : null);

                        return {
                            monthKey: m.month,
                            year,
                            monthNumber: month,
                            label: MONTH_NAMES[month - 1] + ' ' + year,
                            consumption: consumption.toFixed(0),
                            solar: solar.toFixed(0),
                            autarkie: autarkie.toFixed(0),
                            gridImport: gridImport.toFixed(0),
                            selfCons,
                            cost: cost.toFixed(2),
                            avgPrice: priceUsed.toFixed(1),
                            avgPriceValue: Number(priceUsed ?? 0),
                            energyCost: Number(m.energy_cost_eur ?? 0),
                            baseFee: Number(m.base_fee_eur ?? 0),
                            saved: Number(saved ?? 0).toFixed(2),
                            priceMode,
                            canEditPrice: m.price_mode === 'fixed',
                            canReset: m.tariff_source === 'manual',
                            isDynamic,
                            isCurrent: m.month === nowKey,
                        };
                    });

                    monthlyData.value = rows;
                } catch (e) {
                    console.error('[Energy] Monthly calc error:', e);
                }
                await nextTick();
                function tryRender(n) {
                    if (n <= 0) return;
                    const ok1 = renderPriceChart(prices);
                    const ok2 = renderSourcesChart(sources);
                    const ok3 = renderAmortizationChart(amortization.value);
                    const ok4 = renderConsumerAtlasChart(consumerAtlas.value);
                    if (!ok1 || !ok2 || !ok3 || !ok4) setTimeout(() => tryRender(n - 1), 200);
                }
                tryRender(10);
            } catch (err) {
                console.error('[EnergyPage] load error:', err);
            }
        }

        function renderPriceChart(prices) {
            const el = document.querySelector('.price-chart-target');
            if (!el || el.offsetWidth === 0 || !prices) return false;
            if (!priceChart) priceChart = echarts.init(el);

            const allHours = prices.price_hours || [];
            if (allHours.length === 0) {
                priceChart.setOption({ backgroundColor: 'transparent', graphic: { type: 'text', left: 'center', top: 'middle', style: { text: t('energy.noPriceData'), fill: '#6e7681', fontSize: 14 } } }, true);
                return true;
            }

            // 24h x-axis (0:00 - 23:00), both lines overlaid
            const labels = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0') + ':00');
            const todayMap = {};
            const tomorrowMap = {};
            allHours.forEach(h => {
                if (h.is_tomorrow) tomorrowMap[h.hour] = h.total_price;
                else todayMap[h.hour] = h.total_price;
            });

            const todayData = labels.map((_, i) => todayMap[i] != null ? todayMap[i] : null);
            const tomorrowData = labels.map((_, i) => tomorrowMap[i] != null ? tomorrowMap[i] : null);

            const nowHour = haCurrentHour();

            priceChart.setOption({
                backgroundColor: 'transparent',
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: getThemeColor('--bg-card', 'rgba(10,14,20,0.95)'),
                    borderColor: getThemeColor('--border-default', 'rgba(255,255,255,0.1)'),
                    textStyle: { color: getThemeColor('--text-primary', '#f0f6fc'), fontFamily: 'var(--font-mono)', fontSize: 12 },
                    formatter: function(params) {
                        let html = '<b>' + params[0].axisValue + '</b>';
                        params.forEach(function(p) {
                            if (p.value != null) {
                                html += '<br/><span style="color:' + p.color + '">● ' + p.seriesName + ': <b>' + p.value.toFixed(2) + ' ct</b></span>';
                            }
                        });
                        return html;
                    },
                },
                legend: {
                    data: [
                        { name: t('common.today'), icon: 'circle', itemStyle: { color: '#f472b6' } },
                        { name: t('common.tomorrow'), icon: 'circle', itemStyle: { color: '#22d3ee' } },
                    ],
                    bottom: 0,
                    textStyle: { color: getThemeColor('--text-secondary', '#8b949e'), fontSize: 11 },
                },
                grid: { left: 55, right: 20, top: 15, bottom: 40 },
                xAxis: {
                    type: 'category',
                    data: labels,
                    boundaryGap: false,
                    axisLine: { lineStyle: { color: getThemeColor('--border-default', 'rgba(255,255,255,0.15)') } },
                    axisLabel: { color: getThemeColor('--text-muted', '#6e7681'), fontSize: 10, interval: 3 },
                    axisTick: { show: false },
                },
                yAxis: {
                    type: 'value',
                    splitLine: { lineStyle: { color: getThemeColor('--border-default', 'rgba(255,255,255,0.06)') } },
                    axisLabel: { color: getThemeColor('--text-muted', '#6e7681'), fontSize: 10, formatter: '{value} ct' },
                },
                series: [
                    {
                        name: t('common.today'),
                        type: 'line',
                        smooth: 0.3,
                        symbol: 'circle',
                        symbolSize: function(value, params) { return params.dataIndex === nowHour ? 10 : 5; },
                        lineStyle: { color: '#f472b6', width: 2.5 },
                        itemStyle: { color: '#f472b6', borderColor: getThemeColor('--bg-app', '#0a0e14'), borderWidth: 1 },
                        data: todayData,
                    },
                    {
                        name: t('common.tomorrow'),
                        type: 'line',
                        smooth: 0.3,
                        symbol: 'circle',
                        symbolSize: 5,
                        lineStyle: { color: '#22d3ee', width: 2.5 },
                        itemStyle: { color: '#22d3ee', borderColor: getThemeColor('--bg-app', '#0a0e14'), borderWidth: 1 },
                        data: tomorrowData,
                    },
                ],
                animationDuration: 800,
            }, true);
            return true;
        }

        function renderSourcesChart(sources) {
            const el = document.querySelector('.sources-chart-target');
            if (!el || el.offsetWidth === 0 || !sources?.data) return false;
            if (!sourcesChart) sourcesChart = echarts.init(el);

            const data = sources.data;
            if (!data.length) return true;
            const times = data.map(d => {
                if (typeof d.hour_key === 'string' && d.hour_key.length >= 16) {
                    return d.hour_key.slice(11, 16);
                }
                return formatHaTime(d.local_timestamp || d.timestamp || d.time);
            });

            sourcesChart.setOption({
                backgroundColor: 'transparent',
                tooltip: { trigger: 'axis', backgroundColor: getThemeColor('--bg-card', 'rgba(10,14,20,0.95)'), borderColor: getThemeColor('--border-default', 'rgba(255,255,255,0.1)'), textStyle: { color: getThemeColor('--text-primary', '#f0f6fc'), fontSize: 11 } },
                legend: { bottom: 0, textStyle: { color: getThemeColor('--text-secondary', '#8b949e'), fontSize: 10 } },
                grid: { left: 50, right: 20, top: 10, bottom: 45 },
                xAxis: { type: 'category', data: times, axisLabel: { color: getThemeColor('--text-muted', '#6e7681'), fontSize: 10, interval: Math.floor(times.length / 12) }, axisLine: { lineStyle: { color: getThemeColor('--border-default', 'rgba(255,255,255,0.1)') } } },
                yAxis: { type: 'value', name: 'W', nameTextStyle: { color: getThemeColor('--text-secondary', '#6e7681') }, splitLine: { lineStyle: { color: getThemeColor('--border-default', 'rgba(255,255,255,0.05)') } }, axisLabel: { color: getThemeColor('--text-muted', '#6e7681') } },
                series: [
                    { name: t('flow.stat.solarToHouse'), type: 'line', stack: 'pos', areaStyle: { color: 'rgba(251,191,36,0.3)' }, lineStyle: { color: '#fbbf24', width: 1.5 }, itemStyle: { color: '#fbbf24' }, symbol: 'none', smooth: true, data: data.map(d => d.solar_to_house ?? 0) },
                    { name: t('flow.stat.batteryToHouse'), type: 'line', stack: 'pos', areaStyle: { color: 'rgba(34,197,94,0.2)' }, lineStyle: { color: '#22c55e', width: 1.5 }, itemStyle: { color: '#22c55e' }, symbol: 'none', smooth: true, data: data.map(d => d.battery_to_house ?? 0) },
                    { name: t('flow.stat.gridToHouse'), type: 'line', stack: 'pos', areaStyle: { color: 'rgba(139,92,246,0.2)' }, lineStyle: { color: '#a855f7', width: 1.5 }, itemStyle: { color: '#a855f7' }, symbol: 'none', smooth: true, data: data.map(d => d.grid_to_house ?? 0) },
                    { name: t('flow.node.houseConsumption'), type: 'line', lineStyle: { color: getThemeColor('--text-primary', '#f0f6fc'), width: 2, type: 'dashed' }, itemStyle: { color: getThemeColor('--text-primary', '#f0f6fc') }, symbol: 'none', smooth: true, data: data.map(d => d.home_consumption ?? 0) },
                ],
                animationDuration: 1000,
            }, true);
            return true;
        }

        function renderConsumerAtlasChart(data) {
            const el = document.querySelector('.consumer-atlas-chart-target');
            if (!el || el.offsetWidth === 0 || !data) return false;
            if (!consumerAtlasChart) consumerAtlasChart = echarts.init(el);

            const consumers = data.consumers || [];
            const children = consumers
                .filter(consumer => (consumer.period_kwh || 0) > 0 || (consumer.last_power_w || 0) > 0)
                .map(consumer => ({
                    name: consumer.name,
                    value: Math.max(consumer.period_kwh || 0, 0.01),
                    itemStyle: { color: consumer.color || '#06b6d4' },
                    consumer,
                }));
            const unknown = Number(data.summary?.unknown_kwh || 0);
            if (unknown > 0.05) {
                children.push({
                    name: t('energy.consumerAtlas.unknown'),
                    value: unknown,
                    itemStyle: { color: '#64748b' },
                    consumer: { period_kwh: unknown, last_power_w: 0, share_percent: 0 },
                });
            }

            if (!children.length) {
                consumerAtlasChart.setOption({
                    backgroundColor: 'transparent',
                    graphic: {
                        type: 'text',
                        left: 'center',
                        top: 'middle',
                        style: { text: t('energy.consumerAtlas.noData'), fill: '#6e7681', fontSize: 14 },
                    },
                }, true);
                return true;
            }

            consumerAtlasChart.setOption({
                backgroundColor: 'transparent',
                tooltip: {
                    backgroundColor: 'rgba(10,14,20,0.98)',
                    borderColor: 'rgba(6,182,212,0.45)',
                    borderWidth: 1,
                    textStyle: { color: '#f0f6fc', fontSize: 12 },
                    extraCssText: 'box-shadow: 0 12px 32px rgba(0,0,0,0.45); border-radius: 8px; backdrop-filter: blur(8px);',
                    formatter: function(info) {
                        const consumer = info.data.consumer || {};
                        return `<strong>${info.name}</strong><br>${fmt(consumer.period_kwh)} kWh<br>${formatPower(consumer.last_power_w)}`;
                    },
                },
                series: [{
                    type: 'treemap',
                    roam: false,
                    nodeClick: false,
                    breadcrumb: { show: false },
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    visibleMin: 0,
                    label: {
                        show: true,
                        color: '#ffffff',
                        fontWeight: 700,
                        formatter: function(info) {
                            const kwh = Number(info.data.consumer?.period_kwh || info.value || 0);
                            return `${info.name}\n${kwh.toFixed(1)} kWh`;
                        },
                    },
                    upperLabel: { show: false },
                    itemStyle: {
                        borderColor: getThemeColor('--bg-app', '#0a0e14'),
                        borderWidth: 3,
                        gapWidth: 3,
                    },
                    levels: [{
                        itemStyle: {
                            borderRadius: 8,
                            borderColor: getThemeColor('--bg-app', '#0a0e14'),
                            gapWidth: 3,
                        },
                    }],
                    data: children,
                }],
                animationDuration: 900,
            }, true);
            return true;
        }

        function renderAmortizationChart(data) {
            const el = document.querySelector('.amortization-chart-target');
            if (!el || el.offsetWidth === 0 || !data) return false;
            if (!amortizationChart) amortizationChart = echarts.init(el);

            const history = data.series || [];
            const projection = data.projection || [];
            const points = history.concat(projection);
            if (!points.length) {
                amortizationChart.setOption({
                    backgroundColor: 'transparent',
                    graphic: {
                        type: 'text',
                        left: 'center',
                        top: 'middle',
                        style: { text: t('energy.amortization.noHistory'), fill: '#6e7681', fontSize: 14 },
                    },
                }, true);
                return true;
            }

            const historyLabels = history.map(row => row.month);
            const projectionLabels = projection.map(row => row.month);
            const labels = historyLabels.concat(projectionLabels);
            const historyValues = history.map(row => row.cumulative_eur);
            const projectionValues = history.length
                ? Array(history.length - 1).fill(null).concat([history[history.length - 1].cumulative_eur], projection.map(row => row.cumulative_eur))
                : projection.map(row => row.cumulative_eur);

            amortizationChart.setOption({
                backgroundColor: 'transparent',
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: getThemeColor('--bg-card', 'rgba(10,14,20,0.95)'),
                    borderColor: getThemeColor('--border-default', 'rgba(255,255,255,0.1)'),
                    textStyle: { color: getThemeColor('--text-primary', '#f0f6fc'), fontSize: 12 },
                    formatter: function(params) {
                        let html = '<b>' + params[0].axisValue + '</b>';
                        params.forEach(function(p) {
                            if (p.value != null) {
                                html += '<br/><span style="color:' + p.color + '">● ' + p.seriesName + ': <b>' + formatEuro(p.value) + ' €</b></span>';
                            }
                        });
                        return html;
                    },
                },
                legend: {
                    bottom: 0,
                    textStyle: { color: getThemeColor('--text-secondary', '#8b949e'), fontSize: 11 },
                },
                grid: { left: 58, right: 20, top: 16, bottom: 45 },
                xAxis: {
                    type: 'category',
                    data: labels,
                    boundaryGap: false,
                    axisLabel: { color: getThemeColor('--text-muted', '#6e7681'), fontSize: 10, interval: Math.max(0, Math.floor(labels.length / 8)) },
                    axisLine: { lineStyle: { color: getThemeColor('--border-default', 'rgba(255,255,255,0.15)') } },
                    axisTick: { show: false },
                },
                yAxis: {
                    type: 'value',
                    splitLine: { lineStyle: { color: getThemeColor('--border-default', 'rgba(255,255,255,0.06)') } },
                    axisLabel: { color: getThemeColor('--text-muted', '#6e7681'), fontSize: 10, formatter: value => formatEuro(value) + ' €' },
                },
                series: [
                    {
                        name: t('energy.amortization.history'),
                        type: 'line',
                        smooth: 0.25,
                        symbol: 'circle',
                        symbolSize: 5,
                        lineStyle: { color: '#22c55e', width: 2.5 },
                        itemStyle: { color: '#22c55e' },
                        areaStyle: { color: 'rgba(34,197,94,0.12)' },
                        markLine: { silent: true, symbol: 'none', lineStyle: { color: 'rgba(255,255,255,0.25)', type: 'dashed' }, data: [{ yAxis: 0 }] },
                        data: historyValues,
                    },
                    {
                        name: t('energy.amortization.forecast'),
                        type: 'line',
                        smooth: 0.25,
                        symbol: 'none',
                        lineStyle: { color: '#06b6d4', width: 2, type: 'dashed' },
                        itemStyle: { color: '#06b6d4' },
                        data: projectionValues,
                    },
                ],
                animationDuration: 900,
            }, true);
            return true;
        }

        async function openPriceModal(monthRow) {
            priceModal.value = {
                ...monthRow,
                currentPrice: monthRow.avgPriceValue,
            };
            priceInput.value = formatCt(monthRow.avgPriceValue).replace(',', '.');
            pricePreview.value = null;
            priceError.value = null;
            priceSaving.value = false;
            try {
                const response = await fetch(priceEndpoint(monthRow), { cache: 'no-store' });
                const payload = await response.json();
                if (!response.ok || payload?.success === false) {
                    throw new Error(payload?.error?.message || payload?.error || 'Der Preis konnte nicht geladen werden.');
                }
                priceModal.value = {
                    ...priceModal.value,
                    currentPrice: payload.current_price_ct,
                    canReset: payload.can_reset,
                };
                priceInput.value = formatCt(payload.current_price_ct).replace(',', '.');
                pricePreview.value = payload;
            } catch (err) {
                priceError.value = err?.message || 'Der Preis konnte nicht geladen werden.';
            }
        }

        function closePriceModal() {
            if (pricePreviewTimer) {
                clearTimeout(pricePreviewTimer);
                pricePreviewTimer = null;
            }
            priceModal.value = null;
            priceInput.value = '';
            pricePreview.value = null;
            priceError.value = null;
            priceSaving.value = false;
        }

        function previewPriceChange() {
            if (!priceModal.value) return;
            if (pricePreviewTimer) clearTimeout(pricePreviewTimer);
            const price = validatePriceInput(priceInput.value);
            if (price == null) {
                pricePreview.value = null;
                priceError.value = 'Bitte geben Sie einen Preis zwischen 0 und 200 ct/kWh ein.';
                return;
            }
            priceError.value = null;
            pricePreviewTimer = setTimeout(async () => {
                try {
                    pricePreview.value = await postJson(
                        priceEndpoint(priceModal.value, '/preview'),
                        { price_ct: price },
                    );
                } catch (err) {
                    pricePreview.value = null;
                    priceError.value = err?.message || 'Die Vorschau konnte nicht berechnet werden.';
                }
            }, 250);
        }

        async function savePriceChange() {
            if (!priceModal.value) return;
            const price = validatePriceInput(priceInput.value);
            if (price == null) {
                priceError.value = 'Bitte geben Sie einen Preis zwischen 0 und 200 ct/kWh ein.';
                return;
            }
            priceSaving.value = true;
            priceError.value = null;
            try {
                await postJson(priceEndpoint(priceModal.value), { price_ct: price });
                closePriceModal();
                await loadData();
            } catch (err) {
                priceError.value = err?.message || 'Der Preis konnte nicht gespeichert werden.';
                priceSaving.value = false;
            }
        }

        async function resetMonthPrice() {
            if (!priceModal.value || !priceModal.value.canReset) return;
            priceSaving.value = true;
            priceError.value = null;
            try {
                await deleteJson(priceEndpoint(priceModal.value));
                closePriceModal();
                await loadData();
            } catch (err) {
                priceError.value = err?.message || 'Der Monatspreis konnte nicht zurückgesetzt werden.';
                priceSaving.value = false;
            }
        }

        async function openConsumerModal(type) {
            consumerModal.value = type;
            try {
                const detail = await SFMLApi.fetch('/api/sfml_stats/consumers/detail', { forceRefresh: true });
                if (detail) consumerDetail.value = detail;
            } catch (e) {
                console.error('[Energy] Consumer detail error:', e);
            }
        }

        function handleResize() { priceChart?.resize(); sourcesChart?.resize(); amortizationChart?.resize(); consumerAtlasChart?.resize(); }

        watch(() => props.config?.theme, () => {
            if (priceChart) { priceChart.dispose(); priceChart = null; }
            if (sourcesChart) { sourcesChart.dispose(); sourcesChart = null; }
            if (amortizationChart) { amortizationChart.dispose(); amortizationChart = null; }
            if (consumerAtlasChart) { consumerAtlasChart.dispose(); consumerAtlasChart = null; }
            nextTick(() => {
                if (priceData.value) renderPriceChart(priceData.value);
                if (sourcesData.value) renderSourcesChart(sourcesData.value);
                if (amortization.value) renderAmortizationChart(amortization.value);
                if (consumerAtlas.value) renderConsumerAtlasChart(consumerAtlas.value);
            });
        });

        onMounted(async () => {
            await loadData();
            window.addEventListener('resize', handleResize);
        });

        onUnmounted(() => {
            window.removeEventListener('resize', handleResize);
            priceChart?.dispose(); priceChart = null;
            sourcesChart?.dispose(); sourcesChart = null;
            amortizationChart?.dispose(); amortizationChart = null;
            consumerAtlasChart?.dispose(); consumerAtlasChart = null;
        });

        return {
            billing, billingError, priceData, priceRanges, monthlyData, monthlyTotals, fmt,
            amortization, amortizationError, amortizationEdit, amortizationSaving, amortizationForm,
            amortizationProgress, amortizationRingStyle, amortizationBreakEven,
            toggleAmortizationEdit, saveAmortizationSettings, formatScenarioBreakEven,
            consumerAtlas, consumerAtlasError, consumerAtlasNotice, consumerAtlasSaving,
            consumerAtlasForm,
            consumerAtlasConsumers, consumerAtlasTopName, saveConsumerAtlasEntry,
            deleteConsumerAtlasEntry, formatPower,
            priceModal, priceInput, pricePreview, priceError, priceSaving,
            formatEuro, formatCt, openPriceModal, closePriceModal,
            previewPriceChange, savePriceChange, resetMonthPrice,
            autarkieColor, avgDaily, savedKwh, projectedSavings,
            breakdownPct, hasConsumers,
            consumerModal, consumerDetail, openConsumerModal,
        };
    },
};

// Style injection
(function injectEnergyStyles() {
    if (document.getElementById('energy-page-styles')) return;
    const style = document.createElement('style');
    style.id = 'energy-page-styles';
    style.textContent = `
        /* Energy Balance Grid */
        .eb-block-title {
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--accent);
            margin-bottom: var(--space-sm);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .eb-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: var(--space-sm);
        }

        .eb-item {
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-md);
            padding: var(--space-md);
            text-align: center;
            transition: all var(--transition-normal);
        }

        .eb-item:hover {
            background: var(--bg-card-hover);
            border-color: var(--border-hover);
            transform: translateY(-1px);
        }

        .eb-icon { font-size: 1.2rem; margin-bottom: 4px; }
        .eb-value { font-size: 1.4rem; font-weight: 700; font-family: var(--font-mono); }
        .eb-label { font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px; }
        .eb-sub { font-size: 0.65rem; color: var(--text-muted); margin-top: 2px; }

        /* Autarkie Donut */
        .autarkie-donut-wrap {
            position: relative;
            width: 100px;
            height: 100px;
        }

        .autarkie-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
        }

        .autarkie-value {
            font-size: 1.5rem;
            font-weight: 700;
            font-family: var(--font-mono);
        }

        .autarkie-label {
            font-size: 0.6rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }

        /* Breakdown Bar */
        .breakdown-bar {
            display: flex;
            height: 24px;
            border-radius: 12px;
            overflow: hidden;
            background: var(--border-default);
        }

        .breakdown-seg {
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.7rem;
            font-weight: 600;
            font-family: var(--font-mono);
            color: #fff;
            transition: width 0.6s ease;
        }

        .breakdown-seg.solar { background: linear-gradient(90deg, #fbbf24, #f59e0b); }
        .breakdown-seg.battery { background: linear-gradient(90deg, #22c55e, #16a34a); }
        .breakdown-seg.grid { background: linear-gradient(90deg, #a855f7, #7c3aed); }
        .breakdown-seg.unknown { background: linear-gradient(90deg, #94a3b8, #64748b); }

        .breakdown-legend {
            display: flex;
            gap: var(--space-md);
            justify-content: center;
            margin-top: var(--space-sm);
            font-size: 0.7rem;
            color: var(--text-muted);
        }

        .breakdown-dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 4px;
        }

        .breakdown-dot.solar { background: #fbbf24; }
        .breakdown-dot.battery { background: #22c55e; }
        .breakdown-dot.grid { background: #a855f7; }
        .breakdown-dot.unknown { background: #94a3b8; }

        .breakdown-warning {
            margin-top: 6px;
            font-size: 0.68rem;
            color: var(--text-muted);
            text-align: center;
        }

        /* Smart Charging Badge */
        .smart-badge {
            background: rgba(34,197,94,0.15);
            border: 1px solid rgba(34,197,94,0.3);
            color: #22c55e;
            padding: 2px 10px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
        }

        /* Consumer Grid */
        .consumer-grid { display: flex; flex-direction: column; gap: var(--space-sm); }

        .consumer-row {
            display: grid;
            grid-template-columns: 30px 1fr 100px 80px 20px;
            align-items: center;
            gap: var(--space-sm);
            padding: var(--space-sm) var(--space-md);
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-sm);
            transition: all var(--transition-normal);
        }
        .consumer-row.clickable { cursor: pointer; }
        .consumer-row.clickable:hover {
            background: var(--bg-card-hover);
            border-color: var(--accent);
        }
        .consumer-arrow { color: var(--text-secondary); font-size: 1.2rem; }

        .consumer-icon { font-size: 1.2rem; }
        .consumer-name { font-size: 0.85rem; }
        .consumer-kwh { font-family: var(--font-mono); font-size: 0.85rem; text-align: right; color: var(--text-secondary); }
        .consumer-cost { font-family: var(--font-mono); font-size: 0.85rem; text-align: right; color: #ef4444; }

        .consumer-atlas-header {
            align-items: flex-start;
            gap: var(--space-md);
        }
        .consumer-atlas-subtitle {
            color: var(--text-muted);
            font-size: 0.74rem;
            margin-top: 3px;
        }
        .consumer-atlas-period {
            color: var(--text-muted);
            font-family: var(--font-mono);
            font-size: 0.74rem;
            white-space: nowrap;
        }
        .consumer-atlas-actions {
            align-items: center;
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-sm);
            justify-content: flex-end;
        }
        .consumer-atlas-notice {
            align-items: center;
            background: rgba(34,197,94,0.1);
            border: 1px solid rgba(34,197,94,0.25);
            border-radius: var(--radius-sm);
            color: #22c55e;
            display: flex;
            font-size: 0.78rem;
            gap: 8px;
            margin-bottom: var(--space-md);
            padding: 8px 10px;
        }
        .consumer-atlas-kpis {
            display: grid;
            gap: var(--space-sm);
            grid-template-columns: repeat(4, minmax(0, 1fr));
            margin: var(--space-md) 0;
        }
        .consumer-atlas-kpi {
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-sm);
            min-width: 0;
            padding: var(--space-sm) var(--space-md);
        }
        .consumer-atlas-kpi span {
            color: var(--text-muted);
            display: block;
            font-size: 0.68rem;
            margin-bottom: 3px;
        }
        .consumer-atlas-kpi strong {
            color: var(--text-primary);
            display: block;
            font-family: var(--font-mono);
            font-size: 1rem;
            overflow-wrap: anywhere;
        }
        .consumer-atlas-kpi.accent strong { color: #06b6d4; }
        .consumer-atlas-layout {
            display: grid;
            gap: var(--space-lg);
            grid-template-columns: minmax(320px, 1.25fr) minmax(280px, 0.75fr);
            align-items: stretch;
        }
        .consumer-atlas-chart-target {
            min-height: 340px;
            width: 100%;
        }
        .consumer-atlas-side {
            display: flex;
            flex-direction: column;
            gap: var(--space-md);
            min-width: 0;
        }
        .consumer-atlas-list {
            display: flex;
            flex-direction: column;
            gap: 7px;
            max-height: 220px;
            overflow-y: auto;
            padding-right: 2px;
        }
        .consumer-atlas-row {
            align-items: center;
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-sm);
            display: grid;
            gap: 8px;
            grid-template-columns: 10px minmax(0, 1fr) auto auto 24px;
            padding: 8px 9px;
        }
        .consumer-atlas-color {
            border-radius: 999px;
            height: 28px;
            width: 6px;
        }
        .consumer-atlas-name {
            color: var(--text-primary);
            font-size: 0.8rem;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .consumer-atlas-value,
        .consumer-atlas-live {
            color: var(--text-secondary);
            font-family: var(--font-mono);
            font-size: 0.74rem;
            white-space: nowrap;
        }
        .consumer-atlas-live { color: #22c55e; }
        .consumer-atlas-delete {
            background: transparent;
            border: 0;
            color: var(--text-muted);
            cursor: pointer;
            font-size: 1.1rem;
            line-height: 1;
            padding: 2px;
        }
        .consumer-atlas-delete:hover { color: #ef4444; }
        .consumer-atlas-empty {
            border: 1px dashed var(--border-default);
            border-radius: var(--radius-sm);
            color: var(--text-muted);
            font-size: 0.78rem;
            padding: var(--space-md);
            text-align: center;
        }
        .consumer-atlas-form {
            display: grid;
            gap: 8px;
            grid-template-columns: 1fr 1fr;
        }
        .consumer-atlas-form input,
        .consumer-atlas-form select {
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-sm);
            color: var(--text-primary);
            min-width: 0;
            padding: 8px 10px;
        }
        .consumer-atlas-form input[type="color"] {
            min-height: 36px;
            padding: 4px;
        }
        .consumer-atlas-save {
            border-radius: var(--radius-sm);
            cursor: pointer;
            font-weight: 700;
            min-height: 36px;
        }

        .price-edit-btn {
            background: rgba(0,212,255,0.12);
            border: 1px solid rgba(0,212,255,0.35);
            border-radius: var(--radius-sm);
            color: var(--accent);
            cursor: pointer;
            font-size: 0.72rem;
            font-weight: 600;
            padding: 5px 9px;
            white-space: nowrap;
        }
        .price-edit-btn:hover {
            background: rgba(0,212,255,0.2);
            border-color: var(--accent);
        }
        .price-edit-btn-mobile { display: none; }
        .month-cell-content {
            align-items: center;
            display: flex;
            gap: var(--space-sm);
            justify-content: space-between;
        }

        /* Consumer Detail Modal */
        .modal-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.6); backdrop-filter: var(--glass-blur);
            z-index: 9999; display: flex; align-items: center; justify-content: center;
        }
        .modal-content {
            background: var(--bg-card);
            backdrop-filter: var(--glass-blur);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-lg); padding: var(--space-xl);
            max-width: 600px; width: 90%; max-height: 85vh; overflow-y: auto;
            box-shadow: var(--glass-shadow);
            color: var(--text-primary);
        }
        .modal-close {
            float: right; background: none; border: none; color: var(--text-secondary);
            font-size: 1.5rem; cursor: pointer; padding: 0; line-height: 1;
        }
        .modal-close:hover { color: #ef4444; }

        .price-modal { max-width: 520px; }
        .price-current {
            color: var(--text-secondary);
            font-size: 0.9rem;
            margin: 0 0 var(--space-lg);
        }
        .price-current strong {
            color: var(--text-primary);
            font-family: var(--font-mono);
        }
        .price-input-label {
            color: var(--text-secondary);
            display: block;
            font-size: 0.78rem;
            margin-bottom: 6px;
        }
        .price-input-row {
            align-items: center;
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-sm);
            display: flex;
            gap: 8px;
            padding: 8px 10px;
        }
        .price-input-row input {
            background: transparent;
            border: 0;
            color: var(--text-primary);
            flex: 1;
            font-family: var(--font-mono);
            font-size: 1rem;
            min-width: 0;
            outline: none;
        }
        .price-input-row span {
            color: var(--text-secondary);
            font-size: 0.82rem;
            white-space: nowrap;
        }
        .price-error {
            color: #ef4444;
            font-size: 0.78rem;
            margin-top: 8px;
        }
        .price-preview-grid {
            display: grid;
            gap: var(--space-sm);
            grid-template-columns: repeat(2, minmax(0, 1fr));
            margin-top: var(--space-lg);
        }
        .price-preview-item {
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-sm);
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding: var(--space-md);
        }
        .price-preview-item span {
            color: var(--text-secondary);
            font-size: 0.72rem;
        }
        .price-preview-item strong {
            color: var(--text-primary);
            font-family: var(--font-mono);
            font-size: 1rem;
        }
        .price-modal-actions {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-sm);
            justify-content: flex-end;
            margin-top: var(--space-lg);
        }
        .price-modal-actions button {
            border-radius: var(--radius-sm);
            cursor: pointer;
            font-weight: 600;
            padding: 8px 12px;
        }
        .price-modal-actions button:disabled {
            cursor: not-allowed;
            opacity: 0.45;
        }
        .price-primary-btn {
            background: var(--accent);
            border: 1px solid var(--accent);
            color: #001018;
        }
        .price-secondary-btn,
        .price-cancel-btn {
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            color: var(--text-primary);
        }

        .cd-grid { display: flex; flex-wrap: wrap; gap: var(--space-sm); margin-bottom: var(--space-lg); }
        .cd-badge {
            display: flex; flex-direction: column; gap: 2px;
            padding: 6px 12px; border-radius: var(--radius-sm);
            background: var(--bg-card); border: 1px solid var(--border-default);
        }
        .cd-label { font-size: 0.65rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
        .cd-value { font-family: var(--font-mono); font-size: 0.85rem; font-weight: 600; color: var(--accent); }

        .cd-stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: var(--space-md); }
        .cd-stat {
            display: flex; flex-direction: column; align-items: center; gap: 4px;
            padding: var(--space-md); border-radius: var(--radius-sm);
            background: var(--bg-card); border: 1px solid var(--border-default);
            transition: all var(--transition-normal);
        }
        .cd-stat:hover {
            background: var(--bg-card-hover);
            border-color: var(--border-hover);
            transform: translateY(-2px);
        }
        .cd-stat-icon { font-size: 1.3rem; }
        .cd-stat-value { font-family: var(--font-mono); font-size: 1.1rem; font-weight: 700; color: var(--text-primary); }
        .cd-stat-label { font-size: 0.7rem; color: var(--text-secondary); text-align: center; }

        .amortization-subtitle {
            color: var(--text-muted);
            font-size: 0.74rem;
            margin-top: 3px;
        }
        .amortization-layout {
            display: grid;
            grid-template-columns: minmax(260px, 0.9fr) minmax(320px, 1.4fr);
            gap: var(--space-lg);
            align-items: stretch;
        }
        .amortization-summary {
            display: grid;
            grid-template-columns: 138px 1fr;
            gap: var(--space-md);
            align-items: center;
        }
        .amortization-ring {
            align-items: center;
            border-radius: 50%;
            display: flex;
            height: 132px;
            justify-content: center;
            width: 132px;
        }
        .amortization-ring-inner {
            align-items: center;
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            height: 104px;
            justify-content: center;
            width: 104px;
        }
        .amortization-ring-inner strong {
            color: #22c55e;
            font-family: var(--font-mono);
            font-size: 1.45rem;
        }
        .amortization-ring-inner span {
            color: var(--text-muted);
            font-size: 0.64rem;
            text-transform: uppercase;
        }
        .amortization-kpis {
            display: grid;
            gap: var(--space-sm);
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .amortization-kpi {
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-sm);
            min-width: 0;
            padding: var(--space-sm) var(--space-md);
        }
        .amortization-kpi span {
            color: var(--text-muted);
            display: block;
            font-size: 0.68rem;
            margin-bottom: 3px;
        }
        .amortization-kpi strong {
            color: var(--text-primary);
            display: block;
            font-family: var(--font-mono);
            font-size: 1rem;
            overflow-wrap: anywhere;
        }
        .amortization-kpi.accent strong { color: #06b6d4; }
        .amortization-chart-wrap {
            min-height: 260px;
            min-width: 0;
        }
        .amortization-chart-target {
            height: 270px;
            width: 100%;
        }
        .amortization-scenarios {
            display: grid;
            gap: var(--space-sm);
            grid-template-columns: repeat(3, minmax(0, 1fr));
            margin-top: var(--space-md);
        }
        .amortization-scenario {
            align-items: center;
            background: rgba(255,255,255,0.035);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-sm);
            display: flex;
            justify-content: space-between;
            gap: var(--space-sm);
            padding: 8px 10px;
        }
        .amortization-scenario span {
            color: var(--text-secondary);
            font-size: 0.72rem;
        }
        .amortization-scenario strong {
            color: var(--text-primary);
            font-family: var(--font-mono);
            font-size: 0.88rem;
        }
        .amortization-empty {
            color: var(--text-muted);
            font-size: 0.78rem;
            margin-top: var(--space-md);
        }
        .amortization-form {
            border-top: 1px solid var(--border-default);
            display: grid;
            gap: var(--space-sm);
            grid-template-columns: repeat(3, minmax(0, 1fr));
            margin-top: var(--space-lg);
            padding-top: var(--space-lg);
        }
        .amortization-form label {
            display: flex;
            flex-direction: column;
            gap: 5px;
            min-width: 0;
        }
        .amortization-form label span {
            color: var(--text-secondary);
            font-size: 0.72rem;
        }
        .amortization-form input {
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-sm);
            color: var(--text-primary);
            font-family: var(--font-mono);
            min-width: 0;
            padding: 8px 10px;
        }
        .amortization-form input:focus {
            border-color: var(--accent);
            outline: none;
        }
        .amortization-save {
            align-self: end;
            border-radius: var(--radius-sm);
            cursor: pointer;
            font-weight: 700;
            min-height: 36px;
            padding: 8px 12px;
        }

        @media (max-width: 768px) {
            .eb-grid { grid-template-columns: repeat(2, 1fr); }
            .eb-value { font-size: 1.1rem; }
            .consumer-row { grid-template-columns: 30px 1fr 80px 60px 20px; }
            .consumer-atlas-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .consumer-atlas-layout { grid-template-columns: 1fr; }
            .consumer-atlas-chart-target { min-height: 300px; }
            .consumer-atlas-actions { justify-content: flex-start; }
            .consumer-atlas-form { grid-template-columns: 1fr; }
            .cd-stats { grid-template-columns: repeat(2, 1fr); }
            .price-preview-grid { grid-template-columns: 1fr; }
            .amortization-layout { grid-template-columns: 1fr; }
            .amortization-summary { grid-template-columns: 1fr; justify-items: center; }
            .amortization-kpis, .amortization-scenarios, .amortization-form { grid-template-columns: 1fr; width: 100%; }
            .price-modal-actions { justify-content: stretch; }
            .price-modal-actions button { flex: 1 1 100%; }
            .price-edit-btn-mobile { display: inline-flex; }
            .price-edit-btn-desktop { display: none; }
        }
        @media (max-width: 480px) {
            .consumer-row {
                grid-template-columns: 30px minmax(0, 1fr) auto 20px;
            }
            .consumer-name { min-width: 0; overflow-wrap: anywhere; }
            .consumer-kwh { grid-column: 2; text-align: left; }
            .consumer-cost { grid-column: 3; grid-row: 1 / span 2; }
            .consumer-arrow { grid-column: 4; grid-row: 1 / span 2; }
        }
    `;
    document.head.appendChild(style);
})();

return _EnergyPage;
})(Vue);

window.EnergyPage = EnergyPage;
