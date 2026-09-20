// Solar Command Center — GPM Page
// (C) 2026 Zara-Toorox

const GPMPage = ((Vue) => {
const { ref, computed, onMounted, onUnmounted, nextTick } = Vue;

const _GPMPage = {
    props: ["liveData", "config"],
    emits: ["navigate"],
    template: `
        <div class="page page-gpm">
            <div class="section-header">
                <h2 class="section-title">{{ $t('nav.gpm') }}</h2>
            </div>

            <div class="chart-card" style="margin-bottom: var(--space-lg);" v-if="status.is_demo">
                <strong>{{ $t('gpm.demoBanner') }}</strong>
            </div>

            <div class="chart-card" style="margin-bottom: var(--space-lg);">
                <div class="chart-header" style="margin-bottom: var(--space-sm);">
                    <span class="chart-title">{{ statusLabel }}</span>
                    <a
                        v-if="licenseBadge.demo"
                        class="gpm-license-badge"
                        :href="status.links.configure"
                        @click="openHaLink($event, status.links.configure)"
                        :title="status.license.id_masked || $t('gpm.noLicenseId')"
                        style="font-size: 0.8rem; text-decoration: none;"
                    >{{ licenseBadge.label }}</a>
                    <span
                        v-else
                        class="gpm-license-badge"
                        :title="status.license.id_masked || $t('gpm.noLicenseId')"
                        :style="licenseBadge.warn ? 'color: var(--warning, #f59e0b); font-size: 0.8rem;' : 'font-size: 0.8rem; color: var(--text-muted);'"
                    >
                        {{ licenseBadge.label }}
                        <span v-if="licenseBadge.expires"> · {{ $t('gpm.licenseExpires') }} {{ licenseBadge.expires }}</span>
                        <span v-if="licenseBadge.warn"> · {{ $t('gpm.licenseExpiresSoon') }}</span>
                    </span>
                </div>
                <div class="eb-grid">
                    <div class="eb-item">
                        <div class="eb-icon">💶</div>
                        <div class="eb-value">{{ formatPrice(status.prices.current_total) }}</div>
                        <div class="eb-label">{{ $t('gpm.current') }}</div>
                    </div>
                    <div class="eb-item">
                        <div class="eb-icon">⏭</div>
                        <div class="eb-value">{{ formatPrice(status.prices.next_total) }}</div>
                        <div class="eb-label">{{ $t('gpm.next') }}</div>
                    </div>
                    <div class="eb-item">
                        <div class="eb-icon">⬇</div>
                        <div class="eb-value">{{ hourLabel(status.prices.cheapest_hour) }}</div>
                        <div class="eb-label">{{ $t('gpm.cheapest') }}</div>
                    </div>
                    <div class="eb-item">
                        <div class="eb-icon">⬆</div>
                        <div class="eb-value">{{ hourLabel(status.prices.most_expensive_hour) }}</div>
                        <div class="eb-label">{{ $t('gpm.expensive') }}</div>
                    </div>
                    <div class="eb-item">
                        <div class="eb-icon">⏱</div>
                        <div class="eb-value">{{ nextCheapLabel }}</div>
                        <div class="eb-label">{{ $t('gpm.nextCheap') }}</div>
                    </div>
                </div>
                <p style="margin-top: var(--space-md); color: var(--text-muted);">
                    {{ tariffLine }}
                </p>
                <p style="color: var(--text-muted); font-size: 0.85rem;">
                    {{ feesLine }}
                </p>
                <p v-if="status.effective_fees.source === 'stats_legacy'" style="font-size: 0.85rem; color: var(--warning, #f59e0b);">
                    {{ $t('gpm.feesLegacyHint') }}
                </p>
                <p v-if="correctionLine" style="font-size: 0.85rem; color: var(--text-muted);">
                    {{ correctionLine }}
                </p>
                <a class="button secondary" :href="status.links.configure" @click="openHaLink($event, status.links.configure)" style="display: inline-block; margin-top: var(--space-sm);">
                    {{ $t('gpm.configure') }}
                </a>
            </div>

            <div class="chart-card" style="margin-bottom: var(--space-lg);" v-if="status.thresholds">
                <div class="chart-header">
                    <span class="chart-title">{{ $t('gpm.thresholdsTitle') }}</span>
                </div>
                <p style="font-size: 0.9rem;">
                    {{ $t('gpm.thresholdMode') }}:
                    <strong>{{ status.thresholds.mode || '—' }}</strong>
                </p>
                <p style="font-size: 0.9rem;">
                    {{ $t('gpm.cheapThreshold') }}:
                    <strong>{{ formatPrice(status.thresholds.max_price) }}</strong>
                    · {{ $t('gpm.cheap') }}: {{ status.is_cheap ? $t('common.yes', 'ja') : $t('common.no', 'nein') }}
                </p>
                <p style="font-size: 0.9rem;">
                    {{ $t('gpm.forceThreshold') }}:
                    <strong>{{ formatPrice(status.thresholds.force_charge_price) }}</strong>
                    · {{ $t('gpm.forceThreshold') }}: {{ status.is_force_price ? $t('common.yes', 'ja') : $t('common.no', 'nein') }}
                </p>
                <input type="range" disabled readonly :value="status.thresholds.max_price || 0" min="0" max="100" />
                <p style="margin-top: var(--space-sm);">
                    <a href="#smart_charging" @click.prevent="$emit('navigate', 'smart_charging')">{{ $t('gpm.editOnSmartCharge') }}</a>
                </p>
            </div>

            <div class="chart-card" style="margin-bottom: var(--space-lg);">
                <div class="chart-header">
                    <span class="chart-title">{{ $t('gpm.today') }} / {{ $t('gpm.tomorrow') }}</span>
                </div>
                <div ref="chartEl" style="height: 260px;"></div>
            </div>

            <div class="chart-card" style="margin-bottom: var(--space-lg);">
                <div class="chart-header" style="display:flex; flex-wrap:wrap; gap: var(--space-sm); align-items:center; justify-content:space-between;">
                    <span class="chart-title">{{ $t('gpm.billTitle') }}</span>
                    <div style="display:flex; flex-wrap:wrap; gap: var(--space-sm); align-items:center;">
                        <label style="font-size: 0.85rem;">{{ $t('gpm.billYear') }}
                            <select v-model.number="billYear" @change="loadBill">
                                <option v-for="year in billYears" :key="year" :value="year">{{ year }}</option>
                            </select>
                        </label>
                        <label style="font-size: 0.85rem;">
                            <select v-model="billMode" @change="loadBill">
                                <option value="calendar">{{ $t('gpm.billCalendar') }}</option>
                                <option value="billing">{{ $t('gpm.billBilling') }}</option>
                            </select>
                        </label>
                    </div>
                </div>
                <p v-if="bill.is_demo" style="font-size: 0.85rem; margin-bottom: var(--space-sm);">
                    {{ $t('gpm.billDemoBanner') }}
                    · <a :href="bill.links.configure || status.links.configure" @click="openHaLink($event, bill.links.configure || status.links.configure)">{{ $t('gpm.configure') }}</a>
                </p>
                <div ref="billEl" style="height: 280px;"></div>
                <p v-if="bill.projection" style="font-size: 0.9rem; margin-top: var(--space-sm);">
                    {{ $t('gpm.billExpected') }}
                    {{ formatEuro(bill.projection.expected_eur) }}
                    ({{ formatEuro(bill.projection.low_eur) }}
                    {{ $t('gpm.billRangeTo') }}
                    {{ formatEuro(bill.projection.high_eur) }})
                </p>
                <p v-if="bill.projection" style="font-size: 0.8rem; color: var(--text-muted);">
                    {{ billMethodLabel }} · {{ bill.projection.basis.complete_months }}
                </p>
                <p v-else-if="bill.projection_reason === 'too_few_complete_months'" style="font-size: 0.85rem; color: var(--text-muted);">
                    {{ $t('gpm.billTooFew') }}
                </p>
            </div>

            <div class="chart-card" style="margin-bottom: var(--space-lg);">
                <div class="chart-header">
                    <span class="chart-title">{{ $t('gpm.yearly.title') }}</span>
                </div>
                <p v-if="!yearlyRows.length" style="font-size: 0.85rem; color: var(--text-muted);">{{ $t('gpm.yearly.empty') }}</p>
                <div v-show="yearlyRows.length" ref="yearlyEl" style="height: 300px;"></div>
                <div class="gpm-yearly-table-wrap" v-if="yearlyRows.length">
                    <table class="gpm-yearly-table">
                        <thead>
                            <tr>
                                <th>{{ $t('gpm.yearly.year') }}</th>
                                <th>{{ $t('gpm.yearly.gridKwh') }}</th>
                                <th>{{ $t('gpm.yearly.totalEur') }}</th>
                                <th>{{ $t('gpm.yearly.effectiveCt') }}</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(row, index) in yearlyRows" :key="yearlyRowKey(row, index)">
                                <td>{{ yearlyAxisLabel(row) }}</td>
                                <td>{{ yearlyNumber(row.grid_kwh, 1) }}</td>
                                <td>{{ yearlyNumber(row.total_eur, 2) }}</td>
                                <td>{{ yearlyNumber(row.ct_kwh, 2) }}</td>
                                <td class="gpm-yearly-info" :title="yearlyNoteText(row)" :aria-label="$t('gpm.yearly.details')">
                                    <ul>
                                        <li v-for="(invoice, invoiceIndex) in yearlyRowInvoices(row)" :key="yearlyInvoiceKey(invoice, invoiceIndex)">
                                            {{ yearlyInvoiceLine(invoice) }}
                                        </li>
                                        <li v-if="yearlyCoverageMeasured(row)">{{ yearlyCoverageMeasured(row) }}</li>
                                        <li v-if="yearlyCoverageHours(row)">{{ yearlyCoverageHours(row) }}</li>
                                        <li v-if="yearlyCoverageSources(row)">{{ yearlyCoverageSources(row) }}</li>
                                        <li v-if="yearlyCoverageGap(row)">{{ yearlyCoverageGap(row) }}</li>
                                    </ul>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <form class="gpm-yearly-form" @submit.prevent="saveYearlyInvoice">
                    <strong class="gpm-yearly-form-title">{{ yearlyForm.id ? $t('gpm.yearly.formEdit') : $t('gpm.yearly.formTitle') }}</strong>
                    <label class="gpm-field">
                        <span class="gpm-field-label">{{ $t('gpm.yearly.periodFrom') }}</span>
                        <input v-model="yearlyForm.period_from" type="date" required>
                    </label>
                    <label class="gpm-field">
                        <span class="gpm-field-label">{{ $t('gpm.yearly.periodTo') }}</span>
                        <input v-model="yearlyForm.period_to" type="date" required>
                    </label>
                    <label class="gpm-field">
                        <span class="gpm-field-label">{{ $t('gpm.yearly.gridKwh') }}</span>
                        <input v-model="yearlyForm.grid_kwh" type="number" min="0.001" step="0.001" required>
                    </label>
                    <label class="gpm-field">
                        <span class="gpm-field-label">{{ $t('gpm.yearly.totalEur') }}</span>
                        <input v-model="yearlyForm.total_eur" type="number" min="0.001" step="0.01" required>
                    </label>
                    <label class="gpm-field">
                        <span class="gpm-field-label">{{ $t('gpm.yearly.provider') }}</span>
                        <input v-model="yearlyForm.provider" type="text">
                    </label>
                    <label class="gpm-field gpm-yearly-note">
                        <span class="gpm-field-label">{{ $t('gpm.yearly.note') }}</span>
                        <input v-model="yearlyForm.note" type="text">
                    </label>
                    <div class="gpm-yearly-form-actions">
                        <button type="submit" class="button" :disabled="yearlyBusy">{{ $t('gpm.yearly.save') }}</button>
                        <button type="button" class="button secondary" :disabled="yearlyBusy" @click="resetYearlyForm">{{ $t('gpm.yearly.cancel') }}</button>
                    </div>
                    <p v-if="yearlyMessage" class="gpm-yearly-message" :style="{ color: yearlyMessageError ? 'var(--danger, #ef4444)' : 'var(--text-muted)' }">{{ yearlyMessage }}</p>
                </form>
                <div class="gpm-yearly-invoices" v-if="yearlyInvoices.length">
                    <strong class="gpm-yearly-invoices-title">{{ $t('gpm.yearly.invoicesTitle') }}</strong>
                    <table class="gpm-yearly-table">
                        <thead>
                            <tr>
                                <th>{{ $t('gpm.yearly.invoicePeriod') }}</th>
                                <th>{{ $t('gpm.yearly.gridKwh') }}</th>
                                <th>{{ $t('gpm.yearly.totalEur') }}</th>
                                <th>{{ $t('gpm.yearly.effectiveCt') }}</th>
                                <th>{{ $t('gpm.yearly.provider') }}</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="invoice in yearlyInvoices" :key="invoice.id">
                                <td>{{ invoice.period_from }}–{{ invoice.period_to }}</td>
                                <td>{{ yearlyNumber(invoice.grid_kwh, 1) }}</td>
                                <td>{{ yearlyNumber(invoice.total_eur, 2) }}</td>
                                <td>{{ yearlyNumber(invoice.effective_ct_kwh, 2) }}</td>
                                <td>{{ yearlyDash(invoice.provider) }}</td>
                                <td>
                                    <button type="button" class="button secondary" :disabled="yearlyBusy" @click="editYearlyInvoice(invoice)">{{ $t('gpm.yearly.edit') }}</button>
                                    <button type="button" class="button secondary" :disabled="yearlyBusy" @click="deleteYearlyInvoice(invoice)">{{ $t('gpm.yearly.delete') }}</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div
                class="chart-card"
                style="margin-bottom: var(--space-lg);"
                v-if="status.tariff.has_spot_component && status.composition_ok && compositionParts.length"
            >
                <div class="chart-header">
                    <span class="chart-title">{{ $t('gpm.composition') }}</span>
                </div>
                <div style="display:flex; height: 18px; overflow:hidden; border-radius: 6px;">
                    <div
                        v-for="part in compositionParts"
                        :key="part.key"
                        :style="{ width: part.pct + '%', background: part.color }"
                        :title="part.label + ' ' + formatPrice(part.value)"
                    ></div>
                </div>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: var(--space-sm);">
                    <span v-for="part in compositionParts" :key="'l-'+part.key" style="margin-right: 0.8rem;">
                        {{ part.label }} {{ formatPrice(part.value) }}
                    </span>
                    = {{ $t('gpm.compositionTotal') }} {{ formatPrice(status.prices.current_total) }}
                </p>
            </div>

            <div class="chart-card" style="margin-bottom: var(--space-lg);" v-if="status.corrections && status.corrections.length">
                <div class="chart-header">
                    <span class="chart-title">{{ $t('gpm.correctionsList') }}</span>
                </div>
                <table style="width:100%; font-size: 0.85rem; border-collapse: collapse;">
                    <tbody>
                        <tr v-for="row in status.corrections" :key="row.id">
                            <td>{{ row.kind }}</td>
                            <td>{{ row.status }}</td>
                            <td>{{ row.month || (row.range_from + '–' + row.range_to) }}</td>
                            <td>{{ row.applied_at || '—' }}</td>
                            <td>{{ row.rows_affected }}</td>
                            <td>
                                <button
                                    v-if="canUndo(row)"
                                    type="button"
                                    class="button secondary"
                                    :disabled="undoBusy"
                                    @click="runUndo(row)"
                                >{{ $t('gpm.undo') }}</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <p v-if="undoMessage" :style="{ color: undoError ? 'var(--danger, #ef4444)' : 'var(--text-muted)' }">{{ undoMessage }}</p>
            </div>

            <div class="chart-card" style="margin-bottom: var(--space-lg);" v-if="status.months && status.months.length">
                <div class="chart-header" style="display:flex; flex-wrap:wrap; gap: var(--space-sm); align-items:center; justify-content:space-between;">
                    <span class="chart-title">{{ $t('gpm.monthsTitle') }}</span>
                    <label style="font-size: 0.85rem;">{{ $t('gpm.monthsRange') }}
                        <select v-model.number="monthSpan" @change="onMonthSpanChange">
                            <option v-for="span in monthSpanOptions" :key="span" :value="span">{{ span }} {{ $t('gpm.monthsUnit') }}</option>
                        </select>
                    </label>
                </div>
                <table style="width:100%; font-size: 0.85rem; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th></th>
                            <th>{{ $t('gpm.monthAvg') }}</th>
                            <th>{{ $t('gpm.monthMin') }}</th>
                            <th>{{ $t('gpm.monthMax') }}</th>
                            <th>{{ $t('gpm.monthCheapHours') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="row in status.months" :key="row.month">
                            <td>{{ row.month }} <span v-if="row.current">({{ $t('gpm.monthCurrent') }})</span></td>
                            <td>{{ formatPrice(row.average) }}</td>
                            <td>{{ formatPrice(row.min) }}</td>
                            <td>{{ formatPrice(row.max) }}</td>
                            <td>{{ row.cheap_hours == null ? '—' : row.cheap_hours }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="chart-card" style="margin-bottom: var(--space-lg);" v-if="status.tariff_schedule">
                <div class="chart-header">
                    <span class="chart-title">{{ $t('gpm.scheduleTitle') }}</span>
                </div>
                <div ref="scheduleEl" style="height: 220px;"></div>
                <p v-if="status.tariff_schedule.holiday_hint" style="font-size: 0.8rem; color: var(--text-muted);">
                    {{ $t('gpm.scheduleHoliday') }}
                </p>
            </div>

            <details class="chart-card" style="margin-bottom: var(--space-lg);">
                <summary class="chart-title">{{ $t('gpm.diagnostics') }}</summary>
                <p style="font-size: 0.85rem; color: var(--text-muted);">
                    {{ lastFetchLabel }}: {{ status.diagnostics.last_fetch || '—' }} ·
                    {{ $t('gpm.cacheAge') }}: {{ cacheAgeLabel }} ·
                    {{ $t('gpm.revision') }}: {{ status.diagnostics.price_revision }} ·
                    {{ $t('gpm.lastCorrection') }}: {{ diagnosticsCorrectionKind }} ·
                    {{ $t('gpm.providerVersion') }}: {{ status.diagnostics.provider_version }} ·
                    <template v-if="status.effective_fees.source === 'stats_legacy'">{{ $t('gpm.feesSourceStats') }}</template>
                    <template v-else>{{ $t('gpm.feesSourceGpm') }}</template>
                </p>
            </details>

            <div class="eb-grid">
                <div
                    class="chart-card"
                    v-if="!status.is_demo && !status.capabilities.csv_import"
                    :style="lockedStyle('csv_import')"
                >
                    <strong>{{ $t('gpm.csvImport') }}</strong>
                    <p style="color: var(--text-muted);">{{ $t('gpm.needsLicense') }}</p>
                </div>
                <div class="chart-card" v-if="showCsvImport">
                    <strong>{{ $t('gpm.csvImport') }}</strong>
                    <p style="color: var(--text-muted); font-size: 0.85rem;">{{ $t('gpm.csvHelp') }}</p>
                    <div style="display:flex; gap: var(--space-sm); flex-wrap: wrap; margin: var(--space-sm) 0;">
                        <a class="button secondary" :href="csvTemplateUrl('price_list')" download>{{ $t('gpm.csvTemplatePrice') }}</a>
                        <a class="button secondary" :href="csvTemplateUrl('community_share')" download>{{ $t('gpm.csvTemplateCommunity') }}</a>
                    </div>
                    <form class="gpm-csv-form" @submit.prevent="runCsvPreview">
                        <label class="gpm-field">
                            <span class="gpm-field-label">{{ $t('gpm.csvFile') }}</span>
                            <input type="file" accept=".csv,.txt,text/csv,text/plain" @change="onCsvFile">
                            <span class="gpm-help">{{ $t('gpm.csvFileHelp') }}</span>
                        </label>
                        <label class="gpm-field">
                            <span class="gpm-field-label">{{ $t('gpm.csvProfile') }}</span>
                            <select v-model="csvForm.profile">
                                <option value="auto">{{ $t('gpm.csvProfileAuto') }}</option>
                                <option value="price_list">{{ $t('gpm.csvProfilePrice') }}</option>
                                <option value="community_share">{{ $t('gpm.csvProfileCommunity') }}</option>
                            </select>
                            <span class="gpm-help">{{ $t('gpm.csvProfileHelp') }}</span>
                        </label>
                        <label class="gpm-field">
                            <span class="gpm-field-label">{{ $t('gpm.csvUnit') }}</span>
                            <select v-model="csvForm.priceUnit">
                                <option value="auto">{{ $t('gpm.csvUnitAuto') }}</option>
                                <option value="ct_kwh">{{ $t('gpm.csvUnitCt') }}</option>
                                <option value="eur_kwh">{{ $t('gpm.csvUnitEurKwh') }}</option>
                                <option value="eur_mwh">{{ $t('gpm.csvUnitEurMwh') }}</option>
                            </select>
                            <span class="gpm-help">{{ $t('gpm.csvUnitHelp') }}</span>
                        </label>
                        <label class="gpm-field">
                            <span class="gpm-field-label">{{ $t('gpm.csvTimezone') }}</span>
                            <select v-model="csvForm.timezone">
                                <option value="local">{{ $t('gpm.csvTzLocal') }}</option>
                                <option value="utc">{{ $t('gpm.csvTzUtc') }}</option>
                            </select>
                            <span class="gpm-help">{{ $t('gpm.csvTimezoneHelp') }}</span>
                        </label>
                        <template v-if="csvPreview">
                            <p class="gpm-section-hint">{{ $t('gpm.csvMapHelp') }}</p>
                            <label class="gpm-field">
                                <span class="gpm-field-label">{{ $t('gpm.csvMapTimestamp') }}</span>
                                <select v-model="csvForm.columnMap.timestamp">
                                    <option v-for="header in csvPreview.headers" :key="'ts-'+header" :value="header">{{ header }}</option>
                                </select>
                            </label>
                            <label v-if="csvForm.profile !== 'community_share'" class="gpm-field">
                                <span class="gpm-field-label">{{ $t('gpm.csvMapPrice') }}</span>
                                <select v-model="csvForm.columnMap.price">
                                    <option v-for="header in csvPreview.headers" :key="'price-'+header" :value="header">{{ header }}</option>
                                </select>
                            </label>
                            <template v-else>
                                <label class="gpm-field">
                                    <span class="gpm-field-label">{{ $t('gpm.csvMapTotal') }}</span>
                                    <select v-model="csvForm.columnMap.total_kwh">
                                        <option v-for="header in csvPreview.headers" :key="'tot-'+header" :value="header">{{ header }}</option>
                                    </select>
                                </label>
                                <label class="gpm-field">
                                    <span class="gpm-field-label">{{ $t('gpm.csvMapCommunity') }}</span>
                                    <select v-model="csvForm.columnMap.community_kwh">
                                        <option v-for="header in csvPreview.headers" :key="'com-'+header" :value="header">{{ header }}</option>
                                    </select>
                                </label>
                            </template>
                            <p style="font-size: 0.85rem; color: var(--text-muted);">
                                {{ $t('gpm.csvRange') }} {{ csvPreview.range_from || '—' }} – {{ csvPreview.range_to || '—' }} ·
                                {{ $t('gpm.csvRows') }} {{ csvPreview.row_count }} ·
                                {{ $t('gpm.csvSkipped') }} {{ csvPreview.skipped_rows }} ·
                                {{ $t('gpm.csvHoursNew') }} {{ csvPreview.hours_new }} ·
                                {{ $t('gpm.csvHoursMatched') }} {{ csvPreview.hours_matched }}
                                <span v-if="csvPreview.stale_months && csvPreview.stale_months.length"> · {{ $t('gpm.csvStale') }} {{ csvPreview.stale_months.join(', ') }}</span>
                            </p>
                        </template>
                        <div style="display:flex; gap: var(--space-sm); margin-top: var(--space-sm);">
                            <button type="submit" class="button secondary" :disabled="csvBusy || !csvFile">{{ $t('gpm.csvPreviewBtn') }}</button>
                            <button type="button" class="button" :disabled="csvBusy || !csvPreview" @click="runCsvApply">{{ $t('gpm.csvApplyBtn') }}</button>
                        </div>
                        <p v-if="csvMessage" :style="{ color: csvMessageError ? 'var(--danger, #ef4444)' : 'var(--text-muted)' }">{{ csvMessage }}</p>
                        <p v-if="csvResult" style="font-size: 0.85rem; color: var(--text-muted);">
                            {{ $t('gpm.csvApplied') }} · {{ $t('gpm.csvRevision') }} {{ csvResult.revision }}
                            · {{ $t('gpm.csvSeeCorrections') }}
                        </p>
                    </form>
                </div>
                <div class="chart-card" :style="lockedStyle('corrections')">
                    <strong>{{ $t('gpm.monthlyCorrection') }}</strong>
                    <p v-if="!status.capabilities.corrections" style="color: var(--text-muted);">{{ $t('gpm.needsLicense') }}</p>
                    <form v-else class="gpm-correction-form" @submit.prevent="runPreview">
                        <label class="gpm-field">
                            <span class="gpm-field-label">{{ $t('gpm.month') }}</span>
                            <select v-model="form.monthKey">
                                <option v-for="item in monthOptions" :key="item" :value="item">{{ item }}</option>
                            </select>
                            <span class="gpm-help">{{ $t('gpm.monthHelp') }}</span>
                        </label>
                        <label class="gpm-field">
                            <span class="gpm-field-label">{{ $t('gpm.billedKwh') }}</span>
                            <input v-model.number="form.billedKwh" type="number" min="0.001" step="0.001" required>
                            <span class="gpm-help">{{ $t('gpm.billedKwhHelp') }}</span>
                        </label>
                        <label class="gpm-field">
                            <span class="gpm-field-label">{{ $t('gpm.billedEur') }}</span>
                            <input v-model.number="form.billedEur" type="number" min="0.001" step="0.001" required>
                            <span class="gpm-help">{{ $t('gpm.billedEurHelp') }}</span>
                        </label>
                        <label class="gpm-field">
                            <span class="gpm-field-label">{{ $t('gpm.baseFeeInput') }}</span>
                            <input v-model.number="form.baseFeeEur" type="number" min="0" step="0.01">
                            <span class="gpm-help">{{ $t('gpm.baseFeeHelp') }}</span>
                        </label>
                        <label class="gpm-field">
                            <span class="gpm-field-label">{{ $t('gpm.method') }}</span>
                            <select v-model="form.method">
                                <option value="additive">{{ $t('gpm.methodAdditive') }}</option>
                                <option value="multiplicative">{{ $t('gpm.methodMultiplicative') }}</option>
                            </select>
                            <span class="gpm-help">{{ $t('gpm.methodHelp') }}</span>
                        </label>
                        <label class="gpm-field">
                            <span class="gpm-field-label">{{ $t('gpm.weighting') }}</span>
                            <select v-model="form.weighting">
                                <option value="consumption">{{ $t('gpm.weightConsumption') }}</option>
                                <option value="uniform">{{ $t('gpm.weightUniform') }}</option>
                            </select>
                            <span class="gpm-help">{{ $t('gpm.weightingHelp') }}</span>
                        </label>
                        <label class="gpm-field gpm-force">
                            <span class="gpm-check-row">
                                <input v-model="form.force" type="checkbox">
                                <span class="gpm-field-label">{{ $t('gpm.force') }}</span>
                            </span>
                            <span class="gpm-help">{{ $t('gpm.forceHelp') }}</span>
                        </label>
                        <div style="display:flex; gap: var(--space-sm); margin-top: var(--space-sm);">
                            <button type="submit" class="button secondary" :disabled="busy">{{ $t('gpm.preview') }}</button>
                            <button type="button" class="button" :disabled="busy || !preview" @click="runApply">{{ $t('gpm.apply') }}</button>
                        </div>
                        <p v-if="message" :style="{ color: messageError ? 'var(--danger, #ef4444)' : 'var(--text-muted)' }">{{ message }}</p>
                        <p v-if="preview" style="font-size: 0.85rem; color: var(--text-muted);">
                            {{ $t('gpm.meanPrice') }} {{ formatPrice(preview.mean_price) }} ·
                            {{ $t('gpm.targetPrice') }} {{ formatPrice(preview.target_price) }} ·
                            {{ $t('gpm.coverage') }} {{ Number(preview.coverage_percent).toFixed(1) }}% ·
                            {{ $t('gpm.energyDeviation') }} {{ Number(preview.energy_deviation_percent).toFixed(1) }}%
                            <span v-if="preview.energy_warning"> · {{ $t('gpm.warningEnergy') }}</span>
                            <span v-if="preview.fallback_reason"> · {{ preview.fallback_reason }}</span>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    `,
    setup() {
        const t = window.SFMLI18n ? window.SFMLI18n.t : (key) => key;
        const chartEl = ref(null);
        const scheduleEl = ref(null);
        const billEl = ref(null);
        const yearlyEl = ref(null);
        let chart = null;
        let scheduleChart = null;
        let billChart = null;
        let yearlyChart = null;
        function openHaLink(event, path) {
            if (!event || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                return;
            }
            if (window.SFMLApi && typeof window.SFMLApi.navigateHa === "function" && window.SFMLApi.navigateHa(path)) {
                event.preventDefault();
            }
        }
        const emptyStatus = () => ({
            success: true,
            state: "not_installed",
            is_demo: true,
            provider_version: 1,
            license: { status: "not_provided", source: null, id_masked: null, expires_at: null },
            tariff: {
                mode: "demo",
                label: "Demo",
                country: "DE",
                has_spot_component: false,
                feed_in_tariff_ct: null,
                base_fee_eur_month: null,
            },
            prices: {
                current_total: null,
                next_total: null,
                average_today: null,
                cheapest_hour: null,
                most_expensive_hour: null,
                today: [],
                tomorrow: [],
            },
            threshold_ct: null,
            thresholds: {
                mode: null,
                max_price: null,
                force_charge_price: null,
                below_average_pct: null,
                cheapest_hours: null,
            },
            is_cheap: false,
            is_force_price: false,
            next_cheap: null,
            cheap_hours: { today: [], tomorrow: [] },
            tomorrow_available: false,
            price_components: null,
            composition_ok: false,
            corrections: [],
            months: [],
            effective_fees: { feed_in_tariff_ct: null, base_fee_eur_month: null, source: "gpm" },
            tariff_schedule: null,
            diagnostics: {
                last_fetch: null,
                cache_age_seconds: null,
                price_revision: 0,
                last_correction: null,
                provider_version: 1,
                composition_mismatch: false,
            },
            revision: 0,
            last_correction: null,
            capabilities: { tariff_models: false, csv_import: false, corrections: false },
            links: {
                configure: "/config/integrations/integration/grid_price_monitor",
                smart_charging: "#smart_charging",
            },
            updated_at: null,
        });
        const status = ref(emptyStatus());
        const emptyBill = () => ({
            success: true,
            year: new Date().getFullYear(),
            mode: "calendar",
            billing_start: { month: 1, day: 1 },
            available_years: { calendar: [], billing: [] },
            months: [],
            previous_year: [],
            projection: null,
            projection_reason: null,
            is_demo: true,
            license_required: true,
            links: { configure: "/config/integrations/integration/grid_price_monitor" },
        });
        const bill = ref(emptyBill());
        const billYear = ref(new Date().getFullYear());
        const billMode = ref("calendar");
        const monthSpanOptions = [12, 24, 60, 120];
        const monthSpan = ref(12);
        const emptyYearlyForm = () => ({
            id: null,
            period_from: "",
            period_to: "",
            grid_kwh: "",
            total_eur: "",
            provider: "",
            note: "",
        });
        const yearlyRows = ref([]);
        const yearlyInvoices = ref([]);
        const yearlyForm = ref(emptyYearlyForm());
        const yearlyBusy = ref(false);
        const yearlyMessage = ref("");
        const yearlyMessageError = ref(false);
        const YEARLY_PARTIAL_DECAL = {
            symbol: "rect",
            dashArrayX: [1, 0],
            dashArrayY: [2, 5],
            rotation: Math.PI / 4,
        };
        const YEARLY_SERIES_COLORS = {
            totalEur: "#0284c7",
            effectiveCt: "#fbbf24",
        };

        const statusLabel = computed(() => {
            const labels = {
                live: t("gpm.statusLive"),
                gpm_demo: t("gpm.statusDemo"),
                not_installed: t("gpm.statusMissing"),
                incompatible: t("gpm.statusIncompatible"),
            };
            return labels[status.value.state] || labels.not_installed;
        });
        const licenseBadge = computed(() => {
            const source = status.value.license && status.value.license.source;
            const expiresAt = status.value.license && status.value.license.expires_at;
            let expires = null;
            let warn = false;
            if (expiresAt) {
                const stamp = Date.parse(expiresAt);
                if (!Number.isNaN(stamp)) {
                    expires = new Date(stamp).toLocaleDateString();
                    warn = (stamp - Date.now()) / 86400000 < 30;
                }
            }
            if (source === "eai_entry") {
                return { label: t("gpm.licenseActiveEai"), demo: false, expires, warn };
            }
            if (source === "manual") {
                return { label: t("gpm.licenseActive"), demo: false, expires: null, warn: false };
            }
            if (source === "legacy") {
                return { label: t("gpm.licenseLegacy"), demo: false, expires: null, warn: false };
            }
            return { label: t("gpm.licenseDemo"), demo: true, expires: null, warn: false };
        });
        const showCsvImport = computed(() => (
            !status.value.is_demo && Boolean(status.value.capabilities.csv_import)
        ));
        const nextCheapLabel = computed(() => {
            const next = status.value.next_cheap;
            const hour = next && next.hour != null ? String(next.hour).padStart(2, "0") + ":00" : "—";
            const today = (status.value.cheap_hours && status.value.cheap_hours.today) || [];
            const tomorrow = (status.value.cheap_hours && status.value.cheap_hours.tomorrow) || [];
            return `${hour} · ${today.length + tomorrow.length} ${t("gpm.cheapHoursCount")}`;
        });

        function i18nLocale() {
            const current = window.SFMLI18n && window.SFMLI18n.current;
            return current === "pl" ? "pl" : current === "en" ? "en" : "de";
        }

        function localeTag() {
            const loc = i18nLocale();
            if (loc === "pl") return "pl-PL";
            if (loc === "en") return "en-GB";
            return "de-DE";
        }

        function translatedOrEmpty(key) {
            const value = t(key);
            return value === key ? "" : value;
        }

        function modeLabel(mode) {
            return translatedOrEmpty(`gpm.tariffMode.${mode}`) || mode || "";
        }

        function countryName(code) {
            const normalized = String(code || "").toUpperCase();
            return translatedOrEmpty(`gpm.country.${normalized}`) || normalized;
        }

        function formatStatusDate(value) {
            if (value == null || value === "") return "";
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) {
                const text = String(value);
                return text.length >= 10 ? text.slice(0, 10) : text;
            }
            if (i18nLocale() === "en") {
                return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
            }
            return date.toLocaleDateString(localeTag(), { day: "2-digit", month: "2-digit", year: "numeric" });
        }

        function formatCtPerKwh(value) {
            const number = Number(value);
            if (!Number.isFinite(number)) return "";
            return `${number.toLocaleString(localeTag(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ct/kWh`;
        }

        function formatCorrectionMonth(month) {
            const text = String(month || "");
            const match = text.match(/^(\d{4})-(\d{2})/);
            return match ? `${match[2]}/${match[1]}` : text;
        }

        function csvBaseMode(tariff) {
            if (tariff && tariff.has_spot_component) return "dynamic";
            const label = String((tariff && tariff.label) || "");
            if (/HT\/NT/i.test(label)) return "time_of_use";
            if (/Fixpreis|fixed price/i.test(label)) return "fixed";
            if (/ \/ /.test(label)) return "time_windows";
            return "fixed";
        }

        function fixedPriceFromLabel(label) {
            const match = String(label || "").match(/(\d+(?:[.,]\d+)?)\s*ct/i);
            return match ? Number(match[1].replace(",", ".")) : null;
        }

        function touWindowFromLabel(label) {
            const match = String(label || "").match(/(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})/);
            return match ? `${match[1]}–${match[2]}` : "";
        }

        function windowNamesFromLabel(label) {
            return String(label || "").replace(/^CSV\s*\+\s*/i, "").trim();
        }

        function tomorrowPhrase() {
            return status.value.tomorrow_available
                ? t("gpm.tomorrowAvailable")
                : t("gpm.tomorrowFrom13");
        }

        function correctionKindLabel(kind) {
            if (kind === "csv") return t("gpm.kindCsv");
            if (kind === "monthly") return t("gpm.kindMonthly");
            return kind || "—";
        }

        const tariffLine = computed(() => {
            const tariff = status.value.tariff || {};
            const mode = tariff.mode || "dynamic";
            if (mode === "csv_community") {
                const base = csvBaseMode(tariff);
                const parts = [modeLabel("csv_community"), t(`gpm.csvOnMode.${base}`)];
                if (tariff.has_spot_component) parts.push(tomorrowPhrase());
                return parts.filter(Boolean).join(" · ");
            }
            if (mode === "fixed") {
                const price = fixedPriceFromLabel(tariff.label);
                const detail = price == null ? "" : ` · ${formatCtPerKwh(price)}`;
                return `${modeLabel("fixed")}${detail}`;
            }
            if (mode === "time_of_use") {
                const window = touWindowFromLabel(tariff.label);
                const detail = window ? ` · ${t("gpm.touWindow", { window })}` : "";
                return `${modeLabel("time_of_use")}${detail}`;
            }
            if (mode === "time_windows") {
                const names = windowNamesFromLabel(tariff.label);
                return names ? `${modeLabel("time_windows")} · ${names}` : modeLabel("time_windows");
            }
            if (mode === "demo") return modeLabel("demo");
            const parts = [modeLabel(mode) || modeLabel("dynamic")];
            const country = countryName(tariff.country);
            if (country) parts.push(country);
            if (tariff.has_spot_component) parts.push(tomorrowPhrase());
            return parts.filter(Boolean).join(" · ");
        });

        const feesLine = computed(() => {
            const fees = status.value.effective_fees || {};
            const feed = Number(fees.feed_in_tariff_ct);
            const feedText = !Number.isFinite(feed) || feed === 0
                ? t("gpm.feedInNone")
                : formatCtPerKwh(feed);
            const base = fees.base_fee_eur_month;
            const amount = base == null
                ? "—"
                : Number(base).toLocaleString(localeTag(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const baseText = base == null ? "—" : t("gpm.baseFeePerMonth", { amount });
            return `${t("gpm.feedIn")}: ${feedText} · ${t("gpm.baseFee")}: ${baseText}`;
        });

        const correctionLine = computed(() => {
            const row = status.value.last_correction;
            if (!row) return "";
            const applied = formatStatusDate(row.applied_at);
            if (row.kind === "csv") {
                const from = formatStatusDate(row.range_from);
                const to = formatStatusDate(row.range_to);
                const range = from && to ? ` (${from}–${to})` : "";
                return t("gpm.correctionCsvApplied", { date: applied }) + range;
            }
            const month = formatCorrectionMonth(row.month);
            return t("gpm.correctionMonthApplied", { month, date: applied });
        });

        const diagnosticsCorrectionKind = computed(() => {
            const row = status.value.diagnostics && status.value.diagnostics.last_correction;
            return correctionKindLabel(row && row.kind);
        });
        const lastFetchLabel = computed(() => {
            const tariff = status.value.tariff || {};
            return tariff.has_spot_component ? t("gpm.lastFetch") : t("gpm.lastUpdate");
        });
        const compositionParts = computed(() => {
            const components = status.value.price_components;
            const total = Number(status.value.prices.current_total);
            if (!components || !status.value.composition_ok || Number.isNaN(total)) return [];
            const grid = Number(components.grid_fee || 0);
            const taxes = Number(components.taxes_fees || 0);
            const markup = Number(components.provider_markup || 0);
            const spotGross = total - grid - taxes - markup;
            const parts = [
                { key: "spot", label: t("gpm.compositionSpotGross"), value: spotGross, color: "#38bdf8" },
                { key: "grid", label: t("gpm.compositionGrid"), value: grid, color: "#818cf8" },
                { key: "taxes", label: t("gpm.compositionTaxes"), value: taxes, color: "#c084fc" },
                { key: "markup", label: t("gpm.compositionMarkup"), value: markup, color: "#f472b6" },
            ];
            const sum = parts.reduce((acc, part) => acc + part.value, 0) || 1;
            return parts.map((part) => ({ ...part, pct: (part.value / sum) * 100 }));
        });
        const cacheAgeLabel = computed(() => {
            const age = status.value.diagnostics.cache_age_seconds;
            if (age == null) return "—";
            if (age < 90) return `${age} s`;
            return `${Math.round(age / 60)} min`;
        });
        const billYears = computed(() => {
            const key = billMode.value === "billing" ? "billing" : "calendar";
            const years = (bill.value.available_years && bill.value.available_years[key]) || [];
            const current = billYear.value;
            if (years.includes(current)) return years;
            return [...years, current].sort((left, right) => left - right);
        });
        const billMethodLabel = computed(() => {
            const method = bill.value.projection && bill.value.projection.basis
                ? bill.value.projection.basis.method
                : null;
            if (method === "prior_year") return t("gpm.billMethodPriorYear");
            if (method === "scaled_complete") return t("gpm.billMethodScaled");
            if (method === "mixed") return t("gpm.billMethodMixed");
            if (method === "complete_only") return t("gpm.billMethodComplete");
            return "";
        });

        function formatPrice(value) {
            return value == null ? "—" : Number(value).toFixed(1) + " ct";
        }
        function formatFee(value) {
            return value == null ? "—" : Number(value).toFixed(2) + " €";
        }
        function formatEuro(value) {
            return value == null ? "—" : Number(value).toFixed(2) + " €";
        }
        function hourLabel(value) {
            return value == null ? "—" : String(value).padStart(2, "0") + ":00";
        }
        function lockedStyle(key) {
            return status.value.capabilities[key]
                ? ""
                : "opacity: 0.55; pointer-events: none;";
        }
        function canUndo(row) {
            return row && row.status === "applied"
                && Boolean(status.value.capabilities.corrections)
                && !status.value.is_demo;
        }

        function completedMonths() {
            const keys = [];
            const now = new Date();
            let year = now.getFullYear();
            let month = now.getMonth();
            for (let index = 0; index < 24; index += 1) {
                if (month === 0) {
                    month = 12;
                    year -= 1;
                }
                keys.push(`${year}-${String(month).padStart(2, "0")}`);
                month -= 1;
            }
            return keys;
        }

        const monthOptions = completedMonths();
        const form = ref({
            monthKey: monthOptions[0],
            billedKwh: null,
            billedEur: null,
            baseFeeEur: 0,
            method: "additive",
            weighting: "consumption",
            force: false,
        });
        const preview = ref(null);
        const busy = ref(false);
        const message = ref("");
        const messageError = ref(false);
        const csvFile = ref(null);
        const csvPreview = ref(null);
        const csvResult = ref(null);
        const csvBusy = ref(false);
        const csvMessage = ref("");
        const csvMessageError = ref(false);
        const csvForm = ref({
            profile: "auto",
            priceUnit: "auto",
            timezone: "local",
            columnMap: { timestamp: "", price: "", total_kwh: "", community_kwh: "" },
        });
        const undoBusy = ref(false);
        const undoMessage = ref("");
        const undoError = ref(false);

        function csvLocale() {
            const current = window.SFMLI18n && window.SFMLI18n.current;
            return current === "en" ? "en" : "de";
        }

        function csvTemplateUrl(profile) {
            return `/api/sfml_stats/gpm/csv/template?profile=${encodeURIComponent(profile)}&lang=${csvLocale()}`;
        }

        function onCsvFile(event) {
            const files = event?.target?.files;
            csvFile.value = files && files[0] ? files[0] : null;
            csvPreview.value = null;
            csvResult.value = null;
            csvMessage.value = "";
        }

        function csvFormData() {
            const body = new FormData();
            if (csvFile.value) body.append("file", csvFile.value);
            body.append("profile", csvForm.value.profile);
            body.append("price_unit", csvForm.value.priceUnit);
            body.append("timezone", csvForm.value.timezone);
            const mapping = {};
            Object.entries(csvForm.value.columnMap || {}).forEach(([key, value]) => {
                if (value) mapping[key] = value;
            });
            body.append("column_map", JSON.stringify(mapping));
            return body;
        }

        async function postCsv(apply) {
            if (!window.SFMLApi || typeof window.SFMLApi.postAuthenticatedForm !== "function") {
                throw new Error("bridge");
            }
            const endpoint = apply
                ? "/api/sfml_stats/gpm/csv/apply"
                : "/api/sfml_stats/gpm/csv/preview";
            return window.SFMLApi.postAuthenticatedForm(endpoint, csvFormData());
        }

        function applyCsvMapping(result) {
            const suggested = result?.column_map || {};
            csvForm.value.columnMap = {
                timestamp: suggested.timestamp || csvForm.value.columnMap.timestamp || "",
                price: suggested.price || csvForm.value.columnMap.price || "",
                total_kwh: suggested.total_kwh || csvForm.value.columnMap.total_kwh || "",
                community_kwh: suggested.community_kwh || csvForm.value.columnMap.community_kwh || "",
            };
            if (result?.profile) csvForm.value.profile = result.profile;
            if (result?.unit && csvForm.value.priceUnit === "auto") {
                csvForm.value.priceUnit = result.unit;
            }
        }

        async function runCsvPreview() {
            csvBusy.value = true;
            csvMessage.value = "";
            csvMessageError.value = false;
            csvResult.value = null;
            try {
                const result = await postCsv(false);
                if (!result || result.success === false) {
                    throw Object.assign(new Error(result?.error || "preview"), { code: result?.error });
                }
                csvPreview.value = result;
                applyCsvMapping(result);
                csvMessage.value = t("gpm.csvPreviewReady");
            } catch (error) {
                csvPreview.value = null;
                csvMessageError.value = true;
                csvMessage.value = error?.code || error?.message || t("gpm.csvPreviewFailed");
            } finally {
                csvBusy.value = false;
            }
        }

        async function runCsvApply() {
            if (!csvPreview.value) return;
            if (!window.confirm(t("gpm.csvConfirm"))) return;
            csvBusy.value = true;
            csvMessage.value = "";
            csvMessageError.value = false;
            try {
                const result = await postCsv(true);
                if (!result || result.success === false) {
                    throw Object.assign(new Error(result?.error || "apply"), { code: result?.error });
                }
                csvResult.value = result;
                csvMessage.value = t("gpm.csvApplied");
                await loadStatus();
            } catch (error) {
                csvMessageError.value = true;
                csvMessage.value = error?.code || error?.message || t("gpm.csvApplyFailed");
            } finally {
                csvBusy.value = false;
            }
        }

        function payloadFromForm() {
            const [year, month] = String(form.value.monthKey || "").split("-");
            return {
                year: Number(year),
                month: Number(month),
                billed_kwh: Number(form.value.billedKwh),
                billed_eur: Number(form.value.billedEur),
                base_fee_eur: Number(form.value.baseFeeEur || 0),
                method: form.value.method,
                weighting: form.value.weighting,
                force: Boolean(form.value.force),
            };
        }

        async function postCorrection(apply) {
            if (!window.SFMLApi || typeof window.SFMLApi.postAuthenticated !== "function") {
                throw new Error("bridge");
            }
            return window.SFMLApi.postAuthenticated("/api/sfml_stats/gpm/correct_month", {
                ...payloadFromForm(),
                apply,
            });
        }

        async function runPreview() {
            busy.value = true;
            message.value = "";
            messageError.value = false;
            try {
                const result = await postCorrection(false);
                if (!result || result.success === false) {
                    throw new Error(result?.error || "preview");
                }
                preview.value = result;
                message.value = t("gpm.previewReady");
            } catch (error) {
                preview.value = null;
                messageError.value = true;
                message.value = error?.message || t("gpm.previewFailed");
            } finally {
                busy.value = false;
            }
        }

        async function runApply() {
            if (!preview.value) return;
            busy.value = true;
            message.value = "";
            messageError.value = false;
            try {
                const result = await postCorrection(true);
                if (!result || result.success === false) {
                    throw new Error(result?.error || "apply");
                }
                message.value = t("gpm.applied");
                preview.value = result;
                await loadStatus();
            } catch (error) {
                messageError.value = true;
                message.value = error?.message || t("gpm.applyFailed");
            } finally {
                busy.value = false;
            }
        }

        async function runUndo(row) {
            if (!canUndo(row)) return;
            if (!window.confirm(t("gpm.undoConfirm"))) return;
            undoBusy.value = true;
            undoMessage.value = "";
            undoError.value = false;
            try {
                if (!window.SFMLApi || typeof window.SFMLApi.postAuthenticated !== "function") {
                    throw new Error("bridge");
                }
                const result = await window.SFMLApi.postAuthenticated(
                    "/api/sfml_stats/gpm/revert_correction",
                    { correction_id: row.id }
                );
                if (!result || result.success === false) {
                    throw new Error(result?.error || "undo");
                }
                undoMessage.value = t("gpm.undoDone");
                await loadStatus();
            } catch (error) {
                undoError.value = true;
                undoMessage.value = error?.message || t("gpm.undoFailed");
            } finally {
                undoBusy.value = false;
            }
        }

        function renderChart() {
            if (!chartEl.value || !window.echarts) return;
            if (!chart) chart = window.echarts.init(chartEl.value);
            const cheapColor = "#22c55e";
            const today = (status.value.prices.today || []).map((row) => ({
                value: row.total_price,
                itemStyle: row.is_cheap ? { color: cheapColor } : undefined,
            }));
            const tomorrow = (status.value.prices.tomorrow || []).map((row) => row.total_price);
            const spot = status.value.tariff.has_spot_component
                ? (status.value.prices.today || []).map((row) => row.spot_price)
                : [];
            const hours = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
            const threshold = status.value.threshold_ct;
            const series = [
                { name: t("gpm.today"), type: "bar", data: today },
                { name: t("gpm.tomorrow"), type: "line", data: tomorrow, symbol: "circle" },
            ];
            if (spot.length) {
                series.push({ name: t("gpm.compositionSpot"), type: "line", data: spot, symbol: "none" });
            }
            chart.setOption({
                tooltip: { trigger: "axis" },
                legend: { data: series.map((item) => item.name) },
                xAxis: { type: "category", data: hours },
                yAxis: { type: "value", name: "ct/kWh" },
                series: series.map((item, index) => (
                    index === 0 && threshold != null
                        ? {
                            ...item,
                            markLine: {
                                symbol: "none",
                                data: [{ yAxis: threshold, name: t("gpm.threshold") }],
                                lineStyle: { type: "dashed" },
                                label: { formatter: t("gpm.threshold") },
                            },
                        }
                        : item
                )),
            }, true);
        }

        function renderBill() {
            if (!billEl.value || !window.echarts) return;
            if (!billChart) billChart = window.echarts.init(billEl.value);
            const months = bill.value.months || [];
            const previous = bill.value.previous_year || [];
            const prevByMonth = {};
            previous.forEach((row) => {
                const key = String(row.month || "");
                prevByMonth[key.slice(5, 7)] = row;
            });
            const labels = months.map((row) => String(row.month || "").slice(5, 7));
            const currentData = months.map((row) => ({
                value: row.total_eur,
                complete: Boolean(row.complete),
                kwh: row.kwh,
                avg: row.avg_price_ct,
                coverage: row.coverage_percent,
                itemStyle: row.complete
                    ? { color: "#38bdf8" }
                    : {
                        color: "#7dd3fc",
                        decal: {
                            symbol: "rect",
                            dashArrayX: [1, 0],
                            dashArrayY: [2, 5],
                            rotation: Math.PI / 4,
                        },
                    },
            }));
            const ghostData = months.map((row) => {
                const prior = prevByMonth[String(row.month || "").slice(5, 7)];
                return prior ? prior.total_eur : null;
            });
            billChart.setOption({
                tooltip: {
                    trigger: "axis",
                    formatter: (items) => {
                        const point = (items || [])[0];
                        if (!point || !months[point.dataIndex]) return "";
                        const row = months[point.dataIndex];
                        const incomplete = row.complete ? "" : ` · ${t("gpm.billIncomplete")}`;
                        const fallback = billMonthFallbackLine(row);
                        const lines = [
                            row.month,
                            `${formatEuro(row.total_eur)}${incomplete}`,
                            `${t("gpm.billKwh")}: ${Number(row.kwh || 0).toFixed(1)}`,
                            `${t("gpm.billAvgPrice")}: ${row.avg_price_ct == null ? "—" : Number(row.avg_price_ct).toFixed(1)}`,
                            `${t("gpm.billCoverage")}: ${Number(row.coverage_percent || 0).toFixed(0)}%`,
                        ];
                        if (fallback) lines.push(fallback);
                        return lines.join("<br/>");
                    },
                },
                legend: { data: [t("gpm.billTitle"), t("gpm.billPreviousYear")] },
                xAxis: { type: "category", data: labels },
                yAxis: { type: "value", name: "€" },
                series: [
                    { name: t("gpm.billTitle"), type: "bar", data: currentData },
                    {
                        name: t("gpm.billPreviousYear"),
                        type: "bar",
                        data: ghostData,
                        itemStyle: { color: "rgba(148, 163, 184, 0.35)" },
                    },
                ],
            }, true);
        }

        async function loadBill() {
            try {
                const year = Number(billYear.value);
                const mode = billMode.value === "billing" ? "billing" : "calendar";
                const payload = await SFMLApi.fetch(
                    `/api/sfml_stats/gpm/monthly_costs?year=${encodeURIComponent(year)}&mode=${encodeURIComponent(mode)}`,
                    { forceRefresh: true, ttl: 0 }
                );
                if (payload && payload.success) {
                    bill.value = payload;
                    if (payload.year) billYear.value = payload.year;
                } else {
                    bill.value = emptyBill();
                }
            } catch (_error) {
                bill.value = emptyBill();
            }
            await nextTick();
            renderBill();
        }

        function yearlyDash(value) {
            return value == null || value === "" ? "—" : value;
        }

        function yearlyNumber(value, digits) {
            if (value == null || value === "") return "—";
            const number = Number(value);
            return Number.isFinite(number) ? number.toFixed(digits) : "—";
        }

        function yearlyMonth(iso) {
            if (typeof iso !== "string" || iso.length < 7) return "";
            return `${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
        }

        function yearlyTodayIso() {
            const now = new Date();
            const month = String(now.getMonth() + 1).padStart(2, "0");
            const day = String(now.getDate()).padStart(2, "0");
            return `${now.getFullYear()}-${month}-${day}`;
        }

        function yearlyAxisLabel(row) {
            if (!row) return "";
            const year = Number(row.year);
            if (!Number.isFinite(year)) return "";
            const coverage = row.coverage || {};
            const first = coverage.first_day;
            const last = coverage.last_day;
            const bits = [];
            if (typeof first === "string" && first > `${year}-01-01`) {
                bits.push(t("gpm.yearly.labelFrom", { month: yearlyMonth(first) }));
            }
            if (typeof last === "string" && last < `${year}-12-31`) {
                if (year === Number(yearlyTodayIso().slice(0, 4))) {
                    bits.push(t("gpm.yearly.labelToDate"));
                } else {
                    bits.push(t("gpm.yearly.labelTo", { month: yearlyMonth(last) }));
                }
            }
            if (!bits.length) return String(year);
            return `${year} (${bits.join(", ")})`;
        }

        function yearlyRowInvoices(row) {
            return Array.isArray(row && row.invoices) ? row.invoices : [];
        }

        function yearlyInvoiceKey(invoice, index) {
            return `${(invoice && invoice.invoice_id) || "invoice"}-${index}`;
        }

        function yearlyInvoiceLine(invoice) {
            return t("gpm.yearly.invoiceLine", {
                label: yearlyDash(invoice && invoice.label),
                days: yearlyDash(invoice && invoice.days_in_year),
                kwh: yearlyNumber(invoice && invoice.grid_kwh, 1),
                eur: yearlyNumber(invoice && invoice.total_eur, 2),
            });
        }

        function yearlyCoverageMeasured(row) {
            const days = row && row.coverage && row.coverage.measured_days;
            if (days == null || Number(days) <= 0) return "";
            return t("gpm.yearly.measuredDays", { days });
        }

        function yearlyCoverageHours(row) {
            const coverage = row && row.coverage;
            if (!coverage || coverage.measured_hours == null || coverage.measured_hours_expected == null) {
                return "";
            }
            if (Number(coverage.measured_hours_expected) <= 0 && Number(coverage.measured_hours) <= 0) {
                return "";
            }
            return t("gpm.yearly.hourCoverage", {
                hours: coverage.measured_hours,
                expected: coverage.measured_hours_expected,
            });
        }

        function yearlyCoverageGap(row) {
            const days = row && row.coverage && row.coverage.gap_days_without_data;
            if (days == null || Number(days) <= 0) return "";
            return t("gpm.yearly.gapDays", { days });
        }

        function yearlyCoverageSources(row) {
            const coverage = row && row.coverage;
            if (!coverage) return "";
            const parts = [];
            const hourly = Number(coverage.days_hourly) || 0;
            const dailyAvg = Number(coverage.days_daily_avg) || 0;
            const kwhOnly = Number(coverage.days_kwh_only) || 0;
            if (hourly > 0) parts.push(t("gpm.yearly.daysHourly", { days: hourly }));
            if (dailyAvg > 0) parts.push(t("gpm.yearly.daysDailyAvg", { days: dailyAvg }));
            if (kwhOnly > 0) parts.push(t("gpm.yearly.daysKwhOnly", { days: kwhOnly }));
            return parts.join(" · ");
        }

        function billMonthFallbackLine(row) {
            const dailyAvg = Number(row && row.days_daily_avg) || 0;
            const kwhOnly = Number(row && row.days_kwh_only) || 0;
            const parts = [];
            if (dailyAvg > 0) parts.push(t("gpm.billFallbackDailyAvg", { days: dailyAvg }));
            if (kwhOnly > 0) parts.push(t("gpm.billFallbackNoPrice", { days: kwhOnly }));
            if (!parts.length) return "";
            return t("gpm.billFallbackNote", { parts: parts.join(" · ") });
        }

        function yearlyNoteText(row) {
            const lines = yearlyRowInvoices(row).map(yearlyInvoiceLine);
            const measured = yearlyCoverageMeasured(row);
            const hours = yearlyCoverageHours(row);
            const sources = yearlyCoverageSources(row);
            const gap = yearlyCoverageGap(row);
            if (measured) lines.push(measured);
            if (hours) lines.push(hours);
            if (sources) lines.push(sources);
            if (gap) lines.push(gap);
            return lines.join("\n");
        }

        function yearlyRowKey(row, index) {
            return `${row && row.year != null ? row.year : "row"}-${index}`;
        }

        function yearlyErrorText(error) {
            const code = error && (error.code || error.body && error.body.error);
            if (typeof code === "string" && code) {
                const translated = t(`gpm.yearly.errors.${code}`);
                if (translated && translated !== `gpm.yearly.errors.${code}`) return translated;
            }
            return t("gpm.yearly.saveFailed");
        }

        function yearlyBarPoint(value, partial) {
            if (value == null || value === "") return null;
            const point = { value, itemStyle: { color: YEARLY_SERIES_COLORS.totalEur } };
            if (partial) point.itemStyle.decal = YEARLY_PARTIAL_DECAL;
            return point;
        }

        function renderYearlyHistory() {
            if (!yearlyEl.value || !window.echarts) return;
            const rows = yearlyRows.value || [];
            if (!rows.length) {
                if (yearlyChart) {
                    yearlyChart.clear();
                }
                return;
            }
            if (!yearlyChart) yearlyChart = window.echarts.init(yearlyEl.value);
            const labels = rows.map(yearlyAxisLabel);
            const eurBars = rows.map((row) => yearlyBarPoint(row.total_eur, Boolean(row.partial)));
            const ctLine = rows.map((row) => (row.ct_kwh == null ? null : row.ct_kwh));
            yearlyChart.setOption({
                tooltip: {
                    trigger: "axis",
                    formatter: (items) => {
                        const point = (items || [])[0];
                        if (!point || !rows[point.dataIndex]) return "";
                        const row = rows[point.dataIndex];
                        const partial = row.partial ? ` · ${t("gpm.yearly.partial")}` : "";
                        return [
                            `${yearlyAxisLabel(row)}${partial}`,
                            `${t("gpm.yearly.totalEur")}: ${yearlyNumber(row.total_eur, 2)} €`,
                            `${t("gpm.yearly.effectiveCt")}: ${yearlyNumber(row.ct_kwh, 2)}`,
                            `${t("gpm.yearly.gridKwh")}: ${yearlyNumber(row.grid_kwh, 1)} kWh`,
                        ].join("<br/>");
                    },
                },
                legend: {
                    data: [t("gpm.yearly.totalEur"), t("gpm.yearly.effectiveCt")],
                },
                grid: { left: 52, right: 56, top: 36, bottom: 48 },
                xAxis: { type: "category", data: labels, axisLabel: { rotate: labels.length > 6 ? 30 : 0 } },
                yAxis: [
                    { type: "value", name: "€", position: "left" },
                    { type: "value", name: "ct/kWh", position: "right", splitLine: { show: false } },
                ],
                series: [
                    {
                        name: t("gpm.yearly.totalEur"),
                        type: "bar",
                        yAxisIndex: 0,
                        color: YEARLY_SERIES_COLORS.totalEur,
                        itemStyle: { color: YEARLY_SERIES_COLORS.totalEur },
                        data: eurBars,
                    },
                    {
                        name: t("gpm.yearly.effectiveCt"),
                        type: "line",
                        yAxisIndex: 1,
                        color: YEARLY_SERIES_COLORS.effectiveCt,
                        data: ctLine,
                        symbol: "circle",
                        itemStyle: { color: YEARLY_SERIES_COLORS.effectiveCt },
                    },
                ],
            }, true);
        }

        async function loadYearly() {
            let history = null;
            let invoices = null;
            try {
                history = await SFMLApi.fetch("/api/sfml_stats/gpm/yearly_history", {
                    forceRefresh: true,
                    ttl: 0,
                    authenticated: true,
                });
            } catch (_error) {
                history = null;
            }
            try {
                invoices = await SFMLApi.fetch("/api/sfml_stats/gpm/invoices", {
                    forceRefresh: true,
                    ttl: 0,
                    authenticated: true,
                });
            } catch (_error) {
                invoices = null;
            }
            yearlyRows.value = Array.isArray(history && history.rows) ? history.rows : [];
            yearlyInvoices.value = Array.isArray(invoices && invoices.invoices) ? invoices.invoices : [];
            await nextTick();
            renderYearlyHistory();
        }

        function yearlyPayload() {
            const payload = {
                period_from: yearlyForm.value.period_from,
                period_to: yearlyForm.value.period_to,
                grid_kwh: Number(yearlyForm.value.grid_kwh),
                total_eur: Number(yearlyForm.value.total_eur),
            };
            if (yearlyForm.value.id) payload.id = yearlyForm.value.id;
            if (yearlyForm.value.provider) payload.provider = yearlyForm.value.provider;
            if (yearlyForm.value.note) payload.note = yearlyForm.value.note;
            return payload;
        }

        function resetYearlyForm() {
            yearlyForm.value = emptyYearlyForm();
        }

        function editYearlyInvoice(invoice) {
            yearlyForm.value = {
                id: invoice && invoice.id != null ? invoice.id : null,
                period_from: invoice && invoice.period_from || "",
                period_to: invoice && invoice.period_to || "",
                grid_kwh: invoice && invoice.grid_kwh == null ? "" : invoice.grid_kwh,
                total_eur: invoice && invoice.total_eur == null ? "" : invoice.total_eur,
                provider: invoice && invoice.provider || "",
                note: invoice && invoice.note || "",
            };
            yearlyMessage.value = "";
            yearlyMessageError.value = false;
        }

        async function saveYearlyInvoice() {
            if (!window.SFMLApi || typeof window.SFMLApi.postAuthenticated !== "function") {
                yearlyMessage.value = t("gpm.yearly.saveFailed");
                yearlyMessageError.value = true;
                return;
            }
            yearlyBusy.value = true;
            yearlyMessage.value = "";
            try {
                const result = await window.SFMLApi.postAuthenticated(
                    "/api/sfml_stats/gpm/invoices",
                    yearlyPayload(),
                );
                if (result && result.success === false) {
                    throw Object.assign(new Error(String(result.error || "request_failed")), {
                        code: String(result.error || "request_failed"),
                    });
                }
                yearlyMessage.value = t("gpm.yearly.saved");
                yearlyMessageError.value = false;
                resetYearlyForm();
                await loadYearly();
            } catch (error) {
                yearlyMessage.value = yearlyErrorText(error);
                yearlyMessageError.value = true;
            } finally {
                yearlyBusy.value = false;
            }
        }

        async function deleteYearlyInvoice(invoice) {
            const invoiceId = invoice && invoice.id;
            if (!invoiceId) return;
            if (!window.confirm(t("gpm.yearly.deleteConfirm"))) return;
            if (!window.SFMLApi || typeof window.SFMLApi.deleteAuthenticated !== "function") {
                yearlyMessage.value = t("gpm.yearly.deleteFailed");
                yearlyMessageError.value = true;
                return;
            }
            yearlyBusy.value = true;
            yearlyMessage.value = "";
            try {
                const result = await window.SFMLApi.deleteAuthenticated(
                    `/api/sfml_stats/gpm/invoices/${encodeURIComponent(invoiceId)}`,
                );
                if (result && result.success === false) {
                    throw Object.assign(new Error(String(result.error || "invoice_not_found")), {
                        code: String(result.error || "invoice_not_found"),
                    });
                }
                yearlyMessage.value = t("gpm.yearly.deleted");
                yearlyMessageError.value = false;
                if (yearlyForm.value.id === invoiceId) resetYearlyForm();
                await loadYearly();
            } catch (error) {
                yearlyMessage.value = yearlyErrorText(error);
                yearlyMessageError.value = true;
            } finally {
                yearlyBusy.value = false;
            }
        }

        function renderSchedule() {
            if (!scheduleEl.value || !window.echarts || !status.value.tariff_schedule) {
                if (scheduleChart) {
                    scheduleChart.dispose();
                    scheduleChart = null;
                }
                return;
            }
            if (!scheduleChart) scheduleChart = window.echarts.init(scheduleEl.value);
            const days = status.value.tariff_schedule.days || [];
            const labels = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
            const heat = [];
            days.forEach((row, day) => {
                (row || []).forEach((value, hour) => {
                    heat.push([hour, day, value]);
                });
            });
            scheduleChart.setOption({
                tooltip: { formatter: (item) => `${labels[item.value[1]]} ${String(item.value[0]).padStart(2, "0")}:00 · ${item.value[2]} ct` },
                grid: { top: 8, left: 32, right: 16, bottom: 24 },
                xAxis: { type: "category", data: Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0")) },
                yAxis: { type: "category", data: labels },
                visualMap: { min: 0, max: Math.max(1, ...heat.map((item) => item[2] || 0)), orient: "horizontal", left: "center", bottom: 0 },
                series: [{ type: "heatmap", data: heat }],
            }, true);
        }

        async function loadStatus(options = {}) {
            const extras = options.extras !== false;
            const span = monthSpanOptions.includes(Number(monthSpan.value))
                ? Number(monthSpan.value)
                : 12;
            monthSpan.value = span;
            try {
                const payload = await SFMLApi.fetch(
                    "/api/sfml_stats/gpm/status?months=" + encodeURIComponent(String(span)),
                    {
                        forceRefresh: true,
                        ttl: 0,
                    }
                );
                if (payload && payload.success) {
                    status.value = payload;
                }
            } catch (_error) {
                status.value = emptyStatus();
            }
            await nextTick();
            renderChart();
            renderSchedule();
            if (extras) {
                loadBill();
                loadYearly();
            }
        }

        function onMonthSpanChange() {
            loadStatus({ extras: false });
        }

        function handleResize() {
            chart?.resize();
            scheduleChart?.resize();
            billChart?.resize();
            yearlyChart?.resize();
        }

        onMounted(() => {
            loadStatus();
            window.addEventListener("resize", handleResize);
        });
        onUnmounted(() => {
            window.removeEventListener("resize", handleResize);
            if (chart) {
                chart.dispose();
                chart = null;
            }
            if (scheduleChart) {
                scheduleChart.dispose();
                scheduleChart = null;
            }
            if (billChart) {
                billChart.dispose();
                billChart = null;
            }
            if (yearlyChart) {
                yearlyChart.dispose();
                yearlyChart = null;
            }
        });

        return {
            status,
            statusLabel,
            licenseBadge,
            showCsvImport,
            chartEl,
            scheduleEl,
            billEl,
            yearlyEl,
            bill,
            billYear,
            billMode,
            billYears,
            billMethodLabel,
            loadBill,
            monthSpan,
            monthSpanOptions,
            onMonthSpanChange,
            yearlyRows,
            yearlyInvoices,
            yearlyForm,
            yearlyBusy,
            yearlyMessage,
            yearlyMessageError,
            yearlyAxisLabel,
            yearlyDash,
            yearlyNumber,
            yearlyRowInvoices,
            yearlyInvoiceKey,
            yearlyInvoiceLine,
            yearlyCoverageMeasured,
            yearlyCoverageHours,
            yearlyCoverageSources,
            yearlyCoverageGap,
            yearlyNoteText,
            yearlyRowKey,
            saveYearlyInvoice,
            editYearlyInvoice,
            deleteYearlyInvoice,
            resetYearlyForm,
            formatPrice,
            formatFee,
            formatEuro,
            hourLabel,
            lockedStyle,
            canUndo,
            nextCheapLabel,
            tariffLine,
            feesLine,
            correctionLine,
            diagnosticsCorrectionKind,
            lastFetchLabel,
            compositionParts,
            cacheAgeLabel,
            monthOptions,
            form,
            preview,
            busy,
            message,
            messageError,
            runPreview,
            runApply,
            runUndo,
            undoBusy,
            undoMessage,
            undoError,
            csvFile,
            csvForm,
            csvPreview,
            csvResult,
            csvBusy,
            csvMessage,
            csvMessageError,
            csvTemplateUrl,
            onCsvFile,
            runCsvPreview,
            runCsvApply,
            openHaLink,
        };
    },
};

// Style injection: CSV import and monthly correction forms
(function injectGpmStyles() {
    if (document.getElementById('gpm-page-styles')) return;
    const style = document.createElement('style');
    style.id = 'gpm-page-styles';
    style.textContent = `
        .gpm-csv-form,
        .gpm-correction-form,
        .gpm-yearly-form {
            display: flex;
            flex-direction: column;
            gap: var(--space-md);
            margin-top: var(--space-md);
        }
        .gpm-yearly-form {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
            gap: var(--space-sm);
            align-items: end;
        }
        .gpm-yearly-form-title,
        .gpm-yearly-form-actions,
        .gpm-yearly-message,
        .gpm-yearly-note,
        .gpm-yearly-invoices {
            grid-column: 1 / -1;
        }
        .gpm-yearly-invoices {
            margin-top: var(--space-md);
        }
        .gpm-yearly-invoices-title {
            display: block;
            margin-bottom: var(--space-sm);
        }
        .gpm-yearly-info {
            white-space: normal;
            max-width: 22rem;
            font-size: 0.75rem;
            color: var(--text-muted);
        }
        .gpm-yearly-info ul {
            margin: 0;
            padding-left: 1.1rem;
        }
        .gpm-yearly-table-wrap {
            overflow-x: auto;
            margin-top: var(--space-sm);
        }
        .gpm-yearly-table {
            width: 100%;
            font-size: 0.8rem;
            border-collapse: collapse;
        }
        .gpm-yearly-table th,
        .gpm-yearly-table td {
            padding: 0.25rem 0.4rem;
            text-align: left;
            white-space: nowrap;
        }
        .gpm-field {
            display: flex;
            flex-direction: column;
            gap: 4px;
            min-width: 0;
        }
        .gpm-field-label {
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--text-primary);
        }
        .gpm-field > input,
        .gpm-field > select {
            width: 100%;
            box-sizing: border-box;
            font-size: 0.95rem;
            color: var(--text-primary);
        }
        .gpm-help,
        .gpm-section-hint {
            font-size: 0.8rem;
            line-height: 1.35;
            color: var(--text-muted);
        }
        .gpm-section-hint {
            margin: 0;
            padding-top: var(--space-sm);
            border-top: 1px solid var(--border, rgba(255,255,255,0.08));
        }
        .gpm-check-row {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
        }
        .gpm-check-row > input {
            width: auto;
            margin: 0;
        }
        .gpm-csv-form > p,
        .gpm-correction-form > p,
        .gpm-yearly-form > p {
            margin: 0;
        }
    `;
    document.head.appendChild(style);
})();

window.GPMPage = _GPMPage;
return _GPMPage;
})(window.Vue);
