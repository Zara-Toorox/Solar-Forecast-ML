// Solar Command Center — Energy Page V17
// (C) 2026 Zara-Toorox

const EnergyPage = ((Vue) => {
const { ref, reactive, computed, onMounted, onUnmounted, nextTick } = Vue;

const _EnergyPage = {
    props: ['liveData', 'config'],
    template: `
        <div class="page page-energy">
            <div class="section-header">
                <h2 class="section-title">Energie & Finanzen</h2>
            </div>

            <!-- ========== KARTE 1: ABRECHNUNGSZEITRAUM + FORTSCHRITT ========== -->
            <div class="chart-card" style="margin-bottom: var(--space-lg);" v-if="billing">
                <div class="chart-header" style="margin-bottom: var(--space-sm);">
                    <span class="chart-title">💰 Energiebilanz</span>
                    <span style="font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono);">
                        📅 {{ billing.period.start }} — {{ billing.period.end }}
                    </span>
                </div>
                <!-- Period Progress Bar -->
                <div style="margin-bottom: var(--space-lg);">
                    <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-muted); margin-bottom: 4px;">
                        <span>Tag {{ billing.period.days_elapsed }} von {{ billing.period.days_total }}</span>
                        <span>{{ billing.period.progress_percent?.toFixed(0) || 0 }}% des Abrechnungsjahres</span>
                    </div>
                    <div style="height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden;">
                        <div :style="{width: billing.period.progress_percent + '%', height: '100%', background: 'linear-gradient(90deg, #22c55e, #06b6d4)', borderRadius: '3px', transition: 'width 0.6s'}"></div>
                    </div>
                </div>

                <!-- BLOCK 1: Haushalt -->
                <div class="eb-block-title"><span>🏠</span> Gesamtverbrauch Haushalt</div>
                <div class="eb-grid">
                    <div class="eb-item">
                        <div class="eb-icon">🏠</div>
                        <div class="eb-value" style="color: var(--solar);">{{ fmt(billing.household.total_kwh) }}</div>
                        <div class="eb-label">kWh Gesamt</div>
                        <div class="eb-sub">Verbrauch im Zeitraum</div>
                    </div>
                    <div class="eb-item">
                        <div class="eb-icon">☀️🏠</div>
                        <div class="eb-value" style="color: var(--solar);">{{ fmt(billing.solar.to_house_kwh) }}</div>
                        <div class="eb-label">davon Solar</div>
                        <div class="eb-sub">Direktverbrauch</div>
                    </div>
                    <div class="eb-item">
                        <div class="eb-icon">🔋🏠</div>
                        <div class="eb-value" style="color: #22c55e;">{{ fmt(billing.household.from_battery_kwh) }}</div>
                        <div class="eb-label">davon Akku</div>
                        <div class="eb-sub">Aus Speicher</div>
                    </div>
                    <div class="eb-item">
                        <div class="eb-icon">⚡🏠</div>
                        <div class="eb-value" style="color: #a855f7;">{{ fmt(billing.household.from_grid_kwh) }}</div>
                        <div class="eb-label">davon Netz</div>
                        <div class="eb-sub">Bezahlt!</div>
                    </div>
                </div>

                <!-- BLOCK 2: Akku -->
                <div class="eb-block-title" style="margin-top: var(--space-lg);"><span>🔋</span> Gesamtladung Akku</div>
                <div class="eb-grid">
                    <div class="eb-item">
                        <div class="eb-icon">🔋</div>
                        <div class="eb-value" style="color: #22c55e;">{{ fmt(billing.battery.total_charge_kwh) }}</div>
                        <div class="eb-label">kWh Gesamt</div>
                        <div class="eb-sub">Geladen im Zeitraum</div>
                    </div>
                    <div class="eb-item">
                        <div class="eb-icon">☀️🔋</div>
                        <div class="eb-value" style="color: var(--solar);">{{ fmt(billing.battery.from_solar_kwh) }}</div>
                        <div class="eb-label">davon Solar</div>
                        <div class="eb-sub">Kostenlos!</div>
                    </div>
                    <div class="eb-item">
                        <div class="eb-icon">⚡🔋</div>
                        <div class="eb-value" style="color: #a855f7;">{{ fmt(billing.battery.from_grid_kwh) }}</div>
                        <div class="eb-label">davon Netz</div>
                        <div class="eb-sub">Bezahlt!</div>
                    </div>
                </div>

                <!-- BLOCK 3: Übersicht & Finanzen -->
                <div class="eb-block-title" style="margin-top: var(--space-lg);"><span>📊</span> Übersicht & Finanzen</div>
                <div class="eb-grid">
                    <div class="eb-item">
                        <div class="eb-icon">☀️</div>
                        <div class="eb-value" style="color: var(--solar);">{{ fmt(billing.solar.total_kwh) }}</div>
                        <div class="eb-label">kWh Solar Gesamt</div>
                        <div class="eb-sub">Ø {{ avgDaily }} kWh/Tag</div>
                    </div>
                    <div class="eb-item">
                        <div class="eb-icon">⚡</div>
                        <div class="eb-value" style="color: #a855f7;">{{ fmt(billing.grid.total_import_kwh) }}</div>
                        <div class="eb-label">kWh Netzbezug</div>
                        <div class="eb-sub">Haus + Akkuladung</div>
                    </div>
                    <div class="eb-item" v-if="billing.grid.export_kwh > 0">
                        <div class="eb-icon">⚡↗️</div>
                        <div class="eb-value" style="color: #06b6d4;">{{ fmt(billing.grid.export_kwh) }}</div>
                        <div class="eb-label">kWh Einspeisung</div>
                        <div class="eb-sub">Ins Netz</div>
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
                                    :stroke-dashoffset="314.16 - (314.16 * (billing.autarkie_percent || 0) / 100)"
                                    transform="rotate(-90 60 60)"
                                    style="transition: stroke-dashoffset 1s ease;"/>
                            </svg>
                            <div class="autarkie-text">
                                <div class="autarkie-value" :style="{color: autarkieColor}">{{ billing.autarkie_percent?.toFixed(0) || 0 }}%</div>
                                <div class="autarkie-label">Autarkie</div>
                            </div>
                        </div>
                    </div>

                    <div class="eb-item">
                        <div class="eb-icon">💰</div>
                        <div class="eb-value" style="color: #ef4444;">{{ billing.finance.grid_cost_eur?.toFixed(2) || '0.00' }}</div>
                        <div class="eb-label">€ Stromkosten</div>
                        <div class="eb-sub">Ø {{ billing.finance.avg_price_ct?.toFixed(1) || '35.0' }} ct/kWh</div>
                    </div>
                    <div class="eb-item">
                        <div class="eb-icon">💚</div>
                        <div class="eb-value" style="color: #22c55e;">{{ billing.finance.savings_eur?.toFixed(2) || '0.00' }}</div>
                        <div class="eb-label">€ gespart</div>
                        <div class="eb-sub">durch {{ savedKwh }} kWh Solar</div>
                    </div>
                    <div class="eb-item" v-if="projectedSavings">
                        <div class="eb-icon">📈</div>
                        <div class="eb-value" style="color: #06b6d4;">{{ projectedSavings }}</div>
                        <div class="eb-label">€ Hochrechnung</div>
                        <div class="eb-sub">Jahres-Ersparnis</div>
                    </div>
                </div>

                <!-- Stromherkunft Breakdown Bar -->
                <div class="breakdown-section" v-if="billing.household.total_kwh > 0" style="margin-top: var(--space-lg);">
                    <div class="eb-sub" style="margin-bottom: 6px;">Stromherkunft im Zeitraum</div>
                    <div class="breakdown-bar">
                        <div class="breakdown-seg solar" :style="{width: breakdownPct.solar + '%'}" v-if="breakdownPct.solar > 3">{{ breakdownPct.solar }}%</div>
                        <div class="breakdown-seg battery" :style="{width: breakdownPct.battery + '%'}" v-if="breakdownPct.battery > 3">{{ breakdownPct.battery }}%</div>
                        <div class="breakdown-seg grid" :style="{width: breakdownPct.grid + '%'}" v-if="breakdownPct.grid > 3">{{ breakdownPct.grid }}%</div>
                    </div>
                    <div class="breakdown-legend">
                        <span><span class="breakdown-dot solar"></span> Solar direkt</span>
                        <span><span class="breakdown-dot battery"></span> Über Akku</span>
                        <span><span class="breakdown-dot grid"></span> Aus Netz</span>
                    </div>
                </div>

                <!-- Recorder Info -->
                <div v-if="billing.data_source" style="font-size: 0.65rem; color: var(--text-muted); text-align: center; margin-top: var(--space-md);">
                    📊 Quelle: {{ billing.data_source }} · {{ billing.period.days_with_data }} Tage mit Daten
                </div>
            </div>

            <!-- ========== KARTE 1b: MONATLICHE STROMKOSTEN ========== -->
            <div class="chart-card" style="margin-bottom: var(--space-lg);" v-if="monthlyData.length > 0">
                <div class="chart-header" style="margin-bottom: var(--space-md);">
                    <span class="chart-title">📅 Laufende Stromkosten pro Monat</span>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Monat</th>
                            <th style="text-align:right">Verbrauch</th>
                            <th style="text-align:right">Solar</th>
                            <th style="text-align:right">Autarkie</th>
                            <th style="text-align:right">Bezug</th>
                            <th style="text-align:right">Ø ct/kWh</th>
                            <th style="text-align:right">Kosten</th>
                            <th style="text-align:right">Gespart</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(m, idx) in monthlyData" :key="idx"
                            :class="{ 'zebra-odd': idx % 2 === 1 }"
                            :style="{ background: m.isCurrent ? 'rgba(0,212,255,0.06)' : '' }">
                            <td style="font-weight: 600;">
                                {{ m.label }}
                                <span v-if="m.isCurrent" style="color:var(--accent); font-size:0.7rem;"> (laufend)</span>
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
                                <span v-if="m.isDynamic" style="color:#22c55e; font-size:0.6rem;" title="Dynamischer Tarif (stündlich)">●</span>
                                <span v-else style="color:#eab308; font-size:0.6rem;" title="Geschätzter Durchschnitt">○</span>
                            </td>
                            <td style="text-align:right; font-family:var(--font-mono); color:#ef4444;">{{ m.cost }} €</td>
                            <td style="text-align:right; font-family:var(--font-mono); color:#22c55e;">{{ m.saved }} €</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr style="border-top: 2px solid var(--border-default); font-weight: 700;">
                            <td>Gesamt</td>
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
                        </tr>
                    </tfoot>
                </table>
            </div>

            <!-- ========== KARTE 2: STROMPREISE HEUTE vs MORGEN ========== -->
            <div class="chart-card" style="margin-bottom: var(--space-lg);">
                <div class="chart-header">
                    <span class="chart-title">Strompreise Heute vs. Morgen (Endpreis)</span>
                    <div v-if="priceRanges" style="display:flex; gap:var(--space-lg); align-items:center;">
                        <span style="font-family:var(--font-mono); font-size:0.8rem; color:#f472b6;">Heute: {{ priceRanges.todayMin }}-{{ priceRanges.todayMax }} ct</span>
                        <span style="font-family:var(--font-mono); font-size:0.8rem; color:#22d3ee;">Morgen: {{ priceRanges.tomorrowMin }}-{{ priceRanges.tomorrowMax }} ct</span>
                    </div>
                </div>
                <div class="price-chart-target" style="height: 320px; width: 100%;"></div>
            </div>

            <!-- ========== KARTE 3: ENERGIEQUELLEN LIVE (Power Sources) ========== -->
            <div class="chart-card" style="margin-bottom: var(--space-lg);">
                <div class="chart-header">
                    <span class="chart-title">🔌 Energiequellen (heute)</span>
                </div>
                <div class="sources-chart-target" style="height: 300px; width: 100%;"></div>
            </div>

            <!-- ========== KARTE 4: VERBRAUCHER ========== -->
            <div class="chart-card" v-if="hasConsumers" style="margin-bottom: var(--space-lg);">
                <div class="chart-header">
                    <span class="chart-title">🔌 Verbraucher</span>
                </div>
                <div class="consumer-grid">
                    <div class="consumer-row clickable" v-if="billing.consumers.heatpump.total_kwh > 0" @click="openConsumerModal('heatpump')">
                        <span class="consumer-icon">♨️</span>
                        <span class="consumer-name">Wärmepumpe</span>
                        <span class="consumer-kwh">{{ billing.consumers.heatpump.total_kwh.toFixed(1) }} kWh</span>
                        <span class="consumer-cost">{{ billing.consumers.heatpump.cost_eur.toFixed(2) }} €</span>
                        <span class="consumer-arrow">›</span>
                    </div>
                    <div class="consumer-row clickable" v-if="billing.consumers.heatingrod.total_kwh > 0" @click="openConsumerModal('heatingrod')">
                        <span class="consumer-icon">🔥</span>
                        <span class="consumer-name">Heizstab</span>
                        <span class="consumer-kwh">{{ billing.consumers.heatingrod.total_kwh.toFixed(1) }} kWh</span>
                        <span class="consumer-cost">{{ billing.consumers.heatingrod.cost_eur.toFixed(2) }} €</span>
                        <span class="consumer-arrow">›</span>
                    </div>
                    <div class="consumer-row clickable" v-if="billing.consumers.wallbox.total_kwh > 0" @click="openConsumerModal('wallbox')">
                        <span class="consumer-icon">🚗</span>
                        <span class="consumer-name">Wallbox</span>
                        <span class="consumer-kwh">{{ billing.consumers.wallbox.total_kwh.toFixed(1) }} kWh</span>
                        <span class="consumer-cost">{{ billing.consumers.wallbox.cost_eur.toFixed(2) }} €</span>
                        <span class="consumer-arrow">›</span>
                    </div>
                </div>
            </div>

            <!-- ========== CONSUMER DETAIL MODAL ========== -->
            <div class="modal-overlay" v-if="consumerModal" @click.self="consumerModal = null">
                <div class="modal-content">
                    <button class="modal-close" @click="consumerModal = null">✕</button>

                    <!-- HEATPUMP MODAL -->
                    <template v-if="consumerModal === 'heatpump' && consumerDetail?.heatpump">
                        <h3 style="margin:0 0 var(--space-md);">♨️ Wärmepumpe — Detail</h3>
                        <div class="cd-grid" v-if="consumerDetail.heatpump.live">
                            <div class="cd-badge" v-if="consumerDetail.heatpump.live.heating_mode">
                                <span class="cd-label">Heizmodus</span>
                                <span class="cd-value">{{ consumerDetail.heatpump.live.heating_mode }}</span>
                            </div>
                            <div class="cd-badge" v-if="consumerDetail.heatpump.live.dhw_mode">
                                <span class="cd-label">WW-Modus</span>
                                <span class="cd-value">{{ consumerDetail.heatpump.live.dhw_mode }}</span>
                            </div>
                            <div class="cd-badge" v-if="consumerDetail.heatpump.live.dhw_charging != null">
                                <span class="cd-label">WW-Bereitung</span>
                                <span class="cd-value" :style="{color: consumerDetail.heatpump.live.dhw_charging ? '#22c55e' : '#6e7681'}">{{ consumerDetail.heatpump.live.dhw_charging ? 'AKTIV' : 'Aus' }}</span>
                            </div>
                            <div class="cd-badge" v-if="consumerDetail.heatpump.live.pv_active != null">
                                <span class="cd-label">PV-Modus</span>
                                <span class="cd-value" :style="{color: consumerDetail.heatpump.live.pv_active ? '#fbbf24' : '#6e7681'}">{{ consumerDetail.heatpump.live.pv_active ? '☀ AKTIV' : 'Aus' }}</span>
                            </div>
                        </div>
                        <div class="cd-stats" v-if="consumerDetail.heatpump.live">
                            <div class="cd-stat" v-if="consumerDetail.heatpump.live.storage_temp != null">
                                <span class="cd-stat-icon">🌡️</span>
                                <span class="cd-stat-value" :style="{color: consumerDetail.heatpump.live.storage_temp > 55 ? '#ef4444' : consumerDetail.heatpump.live.storage_temp > 40 ? '#fbbf24' : '#22d3ee'}">{{ consumerDetail.heatpump.live.storage_temp }}°C</span>
                                <span class="cd-stat-label">Speicher</span>
                            </div>
                            <div class="cd-stat" v-if="consumerDetail.heatpump.live.electric_power != null">
                                <span class="cd-stat-icon">⚡</span>
                                <span class="cd-stat-value">{{ consumerDetail.heatpump.live.electric_power }} kW</span>
                                <span class="cd-stat-label">Elektr. Aufnahme</span>
                            </div>
                            <div class="cd-stat" v-if="consumerDetail.heatpump.live.thermal_power != null">
                                <span class="cd-stat-icon">🔥</span>
                                <span class="cd-stat-value">{{ consumerDetail.heatpump.live.thermal_power }} kW</span>
                                <span class="cd-stat-label">Therm. Leistung</span>
                            </div>
                            <div class="cd-stat" v-if="consumerDetail.heatpump.live.jaz != null">
                                <span class="cd-stat-icon">📊</span>
                                <span class="cd-stat-value" :style="{color: consumerDetail.heatpump.live.jaz >= 3.5 ? '#22c55e' : consumerDetail.heatpump.live.jaz >= 2.5 ? '#fbbf24' : '#ef4444'}">{{ consumerDetail.heatpump.live.jaz }}</span>
                                <span class="cd-stat-label">JAZ</span>
                            </div>
                            <div class="cd-stat" v-if="consumerDetail.heatpump.live.pv_energy_today != null">
                                <span class="cd-stat-icon">☀️</span>
                                <span class="cd-stat-value" style="color:#fbbf24;">{{ consumerDetail.heatpump.live.pv_energy_today }} kWh</span>
                                <span class="cd-stat-label">PV→WP heute</span>
                            </div>
                            <div class="cd-stat" v-if="consumerDetail.heatpump.live.grid_energy_today != null">
                                <span class="cd-stat-icon">⚡</span>
                                <span class="cd-stat-value" style="color:#a855f7;">{{ consumerDetail.heatpump.live.grid_energy_today }} kWh</span>
                                <span class="cd-stat-label">Netz→WP heute</span>
                            </div>
                            <div class="cd-stat" v-if="consumerDetail.heatpump.live.pv_share_percent != null">
                                <span class="cd-stat-icon">🌿</span>
                                <span class="cd-stat-value" style="color:#22c55e;">{{ consumerDetail.heatpump.live.pv_share_percent }}%</span>
                                <span class="cd-stat-label">PV-Anteil</span>
                            </div>
                            <div class="cd-stat" v-if="consumerDetail.heatpump.live.compressor_starts != null">
                                <span class="cd-stat-icon">🔄</span>
                                <span class="cd-stat-value">{{ consumerDetail.heatpump.live.compressor_starts }}</span>
                                <span class="cd-stat-label">Kompressorstarts</span>
                            </div>
                        </div>
                    </template>

                    <!-- HEATINGROD MODAL -->
                    <template v-if="consumerModal === 'heatingrod' && consumerDetail?.heatingrod">
                        <h3 style="margin:0 0 var(--space-md);">🔥 Heizstab — Detail</h3>
                        <div class="cd-stats">
                            <div class="cd-stat" v-if="consumerDetail.heatingrod.live.power != null">
                                <span class="cd-stat-icon">⚡</span>
                                <span class="cd-stat-value">{{ consumerDetail.heatingrod.live.power }} W</span>
                                <span class="cd-stat-label">Aktuelle Leistung</span>
                            </div>
                            <div class="cd-stat" v-if="consumerDetail.heatingrod.live.daily_kwh != null">
                                <span class="cd-stat-icon">📊</span>
                                <span class="cd-stat-value">{{ consumerDetail.heatingrod.live.daily_kwh }} kWh</span>
                                <span class="cd-stat-label">Heute</span>
                            </div>
                        </div>
                    </template>

                    <!-- WALLBOX MODAL -->
                    <template v-if="consumerModal === 'wallbox' && consumerDetail?.wallbox">
                        <h3 style="margin:0 0 var(--space-md);">🚗 Wallbox — Detail</h3>
                        <div class="cd-stats">
                            <div class="cd-stat" v-if="consumerDetail.wallbox.live.state">
                                <span class="cd-stat-icon">🔌</span>
                                <span class="cd-stat-value">{{ consumerDetail.wallbox.live.state }}</span>
                                <span class="cd-stat-label">Status</span>
                            </div>
                            <div class="cd-stat" v-if="consumerDetail.wallbox.live.charge_mode">
                                <span class="cd-stat-icon">⚡</span>
                                <span class="cd-stat-value">{{ consumerDetail.wallbox.live.charge_mode }}</span>
                                <span class="cd-stat-label">Lademodus</span>
                            </div>
                            <div class="cd-stat" v-if="consumerDetail.wallbox.live.power != null">
                                <span class="cd-stat-icon">💪</span>
                                <span class="cd-stat-value">{{ consumerDetail.wallbox.live.power }} W</span>
                                <span class="cd-stat-label">Ladeleistung</span>
                            </div>
                            <div class="cd-stat" v-if="consumerDetail.wallbox.live.session_kwh != null">
                                <span class="cd-stat-icon">🔋</span>
                                <span class="cd-stat-value">{{ consumerDetail.wallbox.live.session_kwh }} kWh</span>
                                <span class="cd-stat-label">Session</span>
                            </div>
                            <div class="cd-stat" v-if="consumerDetail.wallbox.live.daily_kwh != null">
                                <span class="cd-stat-icon">📊</span>
                                <span class="cd-stat-value">{{ consumerDetail.wallbox.live.daily_kwh }} kWh</span>
                                <span class="cd-stat-label">Heute</span>
                            </div>
                        </div>
                    </template>
                </div>
            </div>

        </div>
    `,

    setup(props) {
        const billing = ref(null);
        const priceData = ref(null);
        const monthlyData = ref([]);
        const consumerModal = ref(null);
        const consumerDetail = ref(null);
        let priceChart = null;
        let sourcesChart = null;

        const MONTH_NAMES = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

        function fmt(v) { return v != null ? v.toFixed(1) : '0.0'; }

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
            const p = billing.value?.autarkie_percent || 0;
            if (p >= 70) return '#22c55e';
            if (p >= 40) return '#eab308';
            return '#a855f7';
        });

        const avgDaily = computed(() => {
            const b = billing.value;
            if (!b) return '0.0';
            const days = b.period?.days_elapsed || 1;
            return (b.solar?.total_kwh / days).toFixed(1);
        });

        const savedKwh = computed(() => {
            const b = billing.value;
            if (!b) return '0';
            return ((b.solar?.to_house_kwh || 0) + (b.household?.from_battery_kwh || 0)).toFixed(0);
        });

        const projectedSavings = computed(() => {
            const b = billing.value;
            if (!b || !b.finance?.savings_eur || !b.period?.days_elapsed) return null;
            const factor = b.period.days_total / b.period.days_elapsed;
            return (b.finance.savings_eur * factor).toFixed(0);
        });

        const breakdownPct = computed(() => {
            const b = billing.value;
            if (!b || !b.household?.total_kwh) return { solar: 0, battery: 0, grid: 0 };
            const solarRaw = b.solar?.to_house_kwh || 0;
            const batteryRaw = b.household?.from_battery_kwh || 0;
            const gridRaw = b.household?.from_grid_kwh || 0;
            const sum = solarRaw + batteryRaw + gridRaw;
            if (sum <= 0) return { solar: 0, battery: 0, grid: 0 };
            return {
                solar: (solarRaw / sum * 100).toFixed(0),
                battery: (batteryRaw / sum * 100).toFixed(0),
                grid: (gridRaw / sum * 100).toFixed(0),
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

        async function loadData() {
            try {
                const [bill, prices, sources] = await Promise.all([
                    SFMLApi.fetch('/api/sfml_stats/billing', { forceRefresh: true }),
                    SFMLApi.fetch('/api/sfml_stats/gpm_prices', { forceRefresh: true }),
                    SFMLApi.fetch('/api/sfml_stats/power_sources_history?hours=24', { forceRefresh: true }),
                ]);
                if (bill?.data_available !== false) billing.value = bill;
                priceData.value = prices;

                // Build monthly cost table from real DB data
                try {
                    const summary = await SFMLApi.fetch('/api/sfml_stats/summary', { forceRefresh: false });
                    const monthlyRaw = summary?.monthly_energy || [];
                    const avgPrice = bill?.finance?.avg_price_ct || 35.0;

                    const nowKey = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');

                    const rows = monthlyRaw.map(m => {
                        const parts = m.month.split('-');
                        const year = parseInt(parts[0]);
                        const month = parseInt(parts[1]);
                        const consumption = m.consumption_kwh || 0;
                        const solar = m.solar_kwh || 0;
                        const gridImport = m.grid_import_kwh || 0;
                        const gridExport = m.grid_export_kwh || 0;
                        const autarkie = m.autarkie_percent || 0;

                        // Kosten: echte stündliche Kosten aus DB (dynamisch) oder Fallback
                        const cost = m.cost_eur || (gridImport * avgPrice / 100);
                        const priceUsed = m.avg_price_ct || avgPrice;
                        const selfCons = (m.solar_to_house_kwh || 0) + (m.battery_to_house_kwh || 0);
                        const saved = (selfCons * priceUsed / 100);
                        const isDynamic = m.cost_source === 'dynamic';

                        return {
                            label: MONTH_NAMES[month - 1] + ' ' + year,
                            consumption: consumption.toFixed(0),
                            solar: solar.toFixed(0),
                            autarkie: autarkie.toFixed(0),
                            gridImport: gridImport.toFixed(0),
                            selfCons,
                            cost: cost.toFixed(2),
                            avgPrice: priceUsed.toFixed(1),
                            saved: saved.toFixed(2),
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
                    if (!ok1 || !ok2) setTimeout(() => tryRender(n - 1), 200);
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
                priceChart.setOption({ backgroundColor: 'transparent', graphic: { type: 'text', left: 'center', top: 'middle', style: { text: 'Keine Preisdaten', fill: '#6e7681', fontSize: 14 } } }, true);
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

            const nowHour = new Date().getHours();

            priceChart.setOption({
                backgroundColor: 'transparent',
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: 'rgba(10,14,20,0.95)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    textStyle: { color: '#f0f6fc', fontFamily: 'var(--font-mono)', fontSize: 12 },
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
                        { name: 'Heute', icon: 'circle', itemStyle: { color: '#f472b6' } },
                        { name: 'Morgen', icon: 'circle', itemStyle: { color: '#22d3ee' } },
                    ],
                    bottom: 0,
                    textStyle: { color: '#8b949e', fontSize: 11 },
                },
                grid: { left: 55, right: 20, top: 15, bottom: 40 },
                xAxis: {
                    type: 'category',
                    data: labels,
                    boundaryGap: false,
                    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } },
                    axisLabel: { color: '#6e7681', fontSize: 10, interval: 3 },
                    axisTick: { show: false },
                },
                yAxis: {
                    type: 'value',
                    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
                    axisLabel: { color: '#6e7681', fontSize: 10, formatter: '{value} ct' },
                },
                series: [
                    {
                        name: 'Heute',
                        type: 'line',
                        smooth: 0.3,
                        symbol: 'circle',
                        symbolSize: function(value, params) { return params.dataIndex === nowHour ? 10 : 5; },
                        lineStyle: { color: '#f472b6', width: 2.5 },
                        itemStyle: { color: '#f472b6', borderColor: '#0a0e14', borderWidth: 1 },
                        data: todayData,
                    },
                    {
                        name: 'Morgen',
                        type: 'line',
                        smooth: 0.3,
                        symbol: 'circle',
                        symbolSize: 5,
                        lineStyle: { color: '#22d3ee', width: 2.5 },
                        itemStyle: { color: '#22d3ee', borderColor: '#0a0e14', borderWidth: 1 },
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
                const dt = new Date(d.timestamp || d.time);
                return dt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            });

            sourcesChart.setOption({
                backgroundColor: 'transparent',
                tooltip: { trigger: 'axis', backgroundColor: 'rgba(10,14,20,0.95)', textStyle: { color: '#f0f6fc', fontSize: 11 } },
                legend: { bottom: 0, textStyle: { color: '#8b949e', fontSize: 10 } },
                grid: { left: 50, right: 20, top: 10, bottom: 45 },
                xAxis: { type: 'category', data: times, axisLabel: { color: '#6e7681', fontSize: 10, interval: Math.floor(times.length / 12) }, axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } } },
                yAxis: { type: 'value', name: 'W', nameTextStyle: { color: '#6e7681' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }, axisLabel: { color: '#6e7681' } },
                series: [
                    { name: 'Solar→Haus', type: 'line', stack: 'pos', areaStyle: { color: 'rgba(251,191,36,0.3)' }, lineStyle: { color: '#fbbf24', width: 1.5 }, itemStyle: { color: '#fbbf24' }, symbol: 'none', smooth: true, data: data.map(d => d.solar_to_house || 0) },
                    { name: 'Batterie→Haus', type: 'line', stack: 'pos', areaStyle: { color: 'rgba(34,197,94,0.2)' }, lineStyle: { color: '#22c55e', width: 1.5 }, itemStyle: { color: '#22c55e' }, symbol: 'none', smooth: true, data: data.map(d => d.battery_to_house || 0) },
                    { name: 'Netz→Haus', type: 'line', stack: 'pos', areaStyle: { color: 'rgba(139,92,246,0.2)' }, lineStyle: { color: '#a855f7', width: 1.5 }, itemStyle: { color: '#a855f7' }, symbol: 'none', smooth: true, data: data.map(d => d.grid_to_house || 0) },
                    { name: 'Verbrauch', type: 'line', lineStyle: { color: '#f0f6fc', width: 2, type: 'dashed' }, itemStyle: { color: '#f0f6fc' }, symbol: 'none', smooth: true, data: data.map(d => d.home_consumption || 0) },
                ],
                animationDuration: 1000,
            }, true);
            return true;
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

        function handleResize() { priceChart?.resize(); sourcesChart?.resize(); }

        onMounted(async () => {
            await loadData();
            window.addEventListener('resize', handleResize);
        });

        onUnmounted(() => {
            window.removeEventListener('resize', handleResize);
            priceChart?.dispose(); priceChart = null;
            sourcesChart?.dispose(); sourcesChart = null;
        });

        return {
            billing, priceData, priceRanges, monthlyData, monthlyTotals, fmt,
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
            background: rgba(255,255,255,0.02);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-md);
            padding: var(--space-md);
            text-align: center;
            transition: all var(--transition-normal);
        }

        .eb-item:hover {
            background: rgba(255,255,255,0.04);
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
            background: rgba(255,255,255,0.05);
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
            background: rgba(255,255,255,0.02);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-sm);
        }
        .consumer-row.clickable { cursor: pointer; transition: background 0.2s; }
        .consumer-row.clickable:hover { background: rgba(0,212,255,0.06); border-color: rgba(0,212,255,0.3); }
        .consumer-arrow { color: var(--text-secondary); font-size: 1.2rem; }

        .consumer-icon { font-size: 1.2rem; }
        .consumer-name { font-size: 0.85rem; }
        .consumer-kwh { font-family: var(--font-mono); font-size: 0.85rem; text-align: right; color: var(--text-secondary); }
        .consumer-cost { font-family: var(--font-mono); font-size: 0.85rem; text-align: right; color: #ef4444; }

        /* Consumer Detail Modal */
        .modal-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
            z-index: 9999; display: flex; align-items: center; justify-content: center;
        }
        .modal-content {
            background: rgba(15,20,30,0.95); border: 1px solid rgba(0,212,255,0.2);
            border-radius: var(--radius-lg); padding: var(--space-xl);
            max-width: 600px; width: 90%; max-height: 85vh; overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .modal-close {
            float: right; background: none; border: none; color: var(--text-secondary);
            font-size: 1.5rem; cursor: pointer; padding: 0; line-height: 1;
        }
        .modal-close:hover { color: #ef4444; }

        .cd-grid { display: flex; flex-wrap: wrap; gap: var(--space-sm); margin-bottom: var(--space-lg); }
        .cd-badge {
            display: flex; flex-direction: column; gap: 2px;
            padding: 6px 12px; border-radius: var(--radius-sm);
            background: rgba(255,255,255,0.04); border: 1px solid var(--border-default);
        }
        .cd-label { font-size: 0.65rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
        .cd-value { font-family: var(--font-mono); font-size: 0.85rem; font-weight: 600; color: var(--accent); }

        .cd-stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: var(--space-md); }
        .cd-stat {
            display: flex; flex-direction: column; align-items: center; gap: 4px;
            padding: var(--space-md); border-radius: var(--radius-sm);
            background: rgba(255,255,255,0.03); border: 1px solid var(--border-default);
        }
        .cd-stat-icon { font-size: 1.3rem; }
        .cd-stat-value { font-family: var(--font-mono); font-size: 1.1rem; font-weight: 700; color: var(--text-primary); }
        .cd-stat-label { font-size: 0.7rem; color: var(--text-secondary); text-align: center; }

        @media (max-width: 768px) {
            .eb-grid { grid-template-columns: repeat(2, 1fr); }
            .eb-value { font-size: 1.1rem; }
            .consumer-row { grid-template-columns: 30px 1fr 80px 60px 20px; }
            .cd-stats { grid-template-columns: repeat(2, 1fr); }
        }
    `;
    document.head.appendChild(style);
})();

return _EnergyPage;
})(Vue);

window.EnergyPage = EnergyPage;
