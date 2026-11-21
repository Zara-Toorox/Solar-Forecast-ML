// Solar Command Center — Settings Page
// (C) 2026 Zara-Toorox

function sfmlGpmList(value) {
    if (value == null || value === '') return [];
    if (Array.isArray(value)) return value.map((item) => String(item));
    return [String(value)];
}

function sfmlGpmFieldKind(field) {
    const selector = field && field.selector;
    if (selector && typeof selector === 'object') {
        if (selector.number) return 'number';
        if (selector.select) return 'select';
        if (selector.boolean) return 'boolean';
        if (selector.date) return 'date';
        if (selector.entity) return 'entity';
        if (selector.text) return 'text';
    }
    const type = field && field.type;
    if (type === 'integer' || type === 'float' || type === 'number') return 'number';
    if (type === 'select' || type === 'multi_select') return 'select';
    if (type === 'boolean') return 'boolean';
    if (type === 'date') return 'date';
    if (type === 'entity') return 'entity';
    return 'text';
}

function sfmlGpmNumberLimits(field) {
    const number = field && field.selector && field.selector.number;
    const source = number && typeof number === 'object' ? number : {};
    const min = source.min != null ? source.min : (field && field.valueMin != null ? field.valueMin : null);
    const max = source.max != null ? source.max : (field && field.valueMax != null ? field.valueMax : null);
    const step = source.step != null ? source.step : (field && field.valueStep != null ? field.valueStep : null);
    const unit = source.unit_of_measurement || (field && field.unit_of_measurement) || '';
    return { min: min, max: max, step: step, unit: unit };
}

function sfmlGpmSelectMultiple(field) {
    const select = field && field.selector && field.selector.select;
    if (select && typeof select === 'object' && select.multiple === true) return true;
    return field && field.type === 'multi_select';
}

function sfmlGpmSelectOptions(field) {
    const select = field && field.selector && field.selector.select;
    const raw = (select && select.options) || (field && field.options) || [];
    const options = [];
    if (!Array.isArray(raw) && raw && typeof raw === 'object') {
        Object.keys(raw).forEach((key) => {
            options.push({ value: String(key), label: String(raw[key]) });
        });
        return options;
    }
    (Array.isArray(raw) ? raw : []).forEach((item) => {
        if (Array.isArray(item)) {
            const label = item.length > 1 ? item[1] : item[0];
            options.push({ value: String(item[0]), label: String(label) });
            return;
        }
        if (item && typeof item === 'object') {
            const value = item.value != null ? item.value : item.id;
            const label = item.label != null ? item.label : value;
            options.push({ value: String(value), label: String(label) });
            return;
        }
        options.push({ value: String(item), label: String(item) });
    });
    return options;
}

function sfmlGpmEntityOptions(states, field) {
    const selector = field && field.selector && field.selector.entity;
    const config = selector && typeof selector === 'object' ? selector : {};
    const domains = sfmlGpmList(config.domain);
    const classes = sfmlGpmList(config.device_class);
    const source = states && typeof states === 'object' ? states : {};
    const found = [];
    Object.keys(source).forEach((entityId) => {
        const state = source[entityId] || {};
        const id = String(state.entity_id || entityId);
        const domain = id.split('.')[0];
        if (domains.length && domains.indexOf(domain) === -1) return;
        const deviceClass = (state.attributes && state.attributes.device_class) || '';
        if (classes.length && classes.indexOf(String(deviceClass)) === -1) return;
        found.push(id);
    });
    found.sort();
    return found;
}

function sfmlGpmBlank(value) {
    if (value == null || value === '') return '\u2013';
    return String(value);
}

function sfmlGpmInitialValues(fields) {
    const values = {};
    (fields || []).forEach((field) => {
        const name = field && field.name;
        if (!name) return;
        const kind = sfmlGpmFieldKind(field);
        if (sfmlGpmSelectMultiple(field)) {
            if (Array.isArray(field.default)) {
                values[name] = field.default.map((item) => String(item));
            } else if (field.default !== undefined && field.default !== null && field.default !== '') {
                values[name] = sfmlGpmList(field.default);
            } else {
                values[name] = [];
            }
            return;
        }
        if (field.default !== undefined && field.default !== null) {
            values[name] = kind === 'number' ? String(field.default) : field.default;
            return;
        }
        values[name] = kind === 'boolean' ? false : '';
    });
    return values;
}

function sfmlGpmSubmitData(fields, values) {
    const data = {};
    (fields || []).forEach((field) => {
        const name = field && field.name;
        if (!name) return;
        const kind = sfmlGpmFieldKind(field);
        const value = values ? values[name] : undefined;
        if (kind === 'number') {
            if (value == null || value === '') {
                data[name] = null;
                return;
            }
            const number = Number(value);
            data[name] = Number.isFinite(number) ? number : null;
            return;
        }
        if (kind === 'boolean') {
            data[name] = value === true;
            return;
        }
        if (sfmlGpmSelectMultiple(field)) {
            const list = Array.isArray(value) ? value : sfmlGpmList(value);
            data[name] = list.map((item) => String(item));
            return;
        }
        data[name] = value == null ? '' : String(value);
    });
    return data;
}

let sfmlGpmStartEpoch = 0;

function sfmlGpmBumpStartEpoch() {
    sfmlGpmStartEpoch += 1;
    return sfmlGpmStartEpoch;
}

function sfmlGpmStartEpochCurrent(token) {
    return token === sfmlGpmStartEpoch;
}

function sfmlGpmFieldViews(fields, states) {
    return (fields || []).filter((field) => field && field.name).map((field) => {
        const kind = sfmlGpmFieldKind(field);
        const limits = kind === 'number' ? sfmlGpmNumberLimits(field) : null;
        return {
            name: field.name,
            kind: kind,
            label: field.label || field.name,
            required: field.required === true,
            description: field.description || '',
            min: limits ? limits.min : null,
            max: limits ? limits.max : null,
            step: limits ? limits.step : null,
            unit: limits ? limits.unit : '',
            options: kind === 'select' ? sfmlGpmSelectOptions(field) : [],
            multiple: kind === 'select' && sfmlGpmSelectMultiple(field),
            entities: kind === 'entity' ? sfmlGpmEntityOptions(states, field) : [],
        };
    });
}

function sfmlStatsIsAdmin() {
    try {
        if (window.parent === window || window.top !== window.parent) return true;
        const root = window.parent.document.querySelector('home-assistant');
        const user = root && root.hass && root.hass.user;
        if (!user) return true;
        return user.is_admin === true;
    } catch (_error) {
        return true;
    }
}

function sfmlSettingsSectionFromHash(hash) {
    const text = String(hash || '');
    const clean = text.charAt(0) === '#' ? text.slice(1) : text;
    const parts = clean.split('/');
    if (parts[0] === 'settings' && parts[1] === 'price') return 'price';
    return '';
}

function sfmlHassStates() {
    try {
        const root = window.parent && window.parent.document
            ? window.parent.document.querySelector('home-assistant')
            : null;
        const states = root && root.hass && root.hass.states;
        if (states && typeof states === 'object') return states;
    } catch (_error) {
        return {};
    }
    return {};
}

const SettingsPage = {
    props: ['liveData', 'config'],

    template: `
        <div class="page page-settings">
            <div class="section-header">
                <span class="section-title">{{ $t('common.settings') }}</span>
            </div>

            <div class="settings-accordion">
                <div class="accordion-section" :class="{ open: openSection === 'interface' }">
                    <button class="accordion-header" @click="toggle('interface')">
                        <span class="accordion-icon">{{ openSection === 'interface' ? '\u25BE' : '\u25B8' }}</span>
                        <span class="accordion-title">{{ $t('settings.interface') }}</span>
                        <span class="accordion-badge neutral">{{ localeName(currentLocale) }}</span>
                    </button>
                    <div class="accordion-body" v-show="openSection === 'interface'">
                        <div class="settings-grid">
                            <div class="settings-item">
                                <span class="settings-item-label">{{ $t('settings.language') }}</span>
                                <select class="language-picker settings-language-picker" :value="currentLocale"
                                        @change="changeLocale($event.target.value)"
                                        :title="$t('common.language')">
                                    <option v-for="code in supportedLocales" :key="code" :value="code">{{ localeName(code) }}</option>
                                </select>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">{{ $t('settings.theme') }}</span>
                                <select class="language-picker settings-language-picker" :value="config.theme"
                                        @change="changeTheme($event.target.value)"
                                        :title="$t('settings.theme')">
                                    <option value="dark">{{ $t('settings.themeDark') }}</option>
                                    <option value="light">{{ $t('settings.themeLight') }}</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="accordion-section" :class="{ open: openSection === 'sensors' }">
                    <button class="accordion-header" @click="toggle('sensors')">
                        <span class="accordion-icon">{{ openSection === 'sensors' ? '\u25BE' : '\u25B8' }}</span>
                        <span class="accordion-title">{{ $t('settings.sensors') }}</span>
                        <span class="accordion-badge" :class="sensorStatusClass">{{ sensorStatusText }}</span>
                    </button>
                    <div class="accordion-body" v-show="openSection === 'sensors'">
                        <div class="sensor-list">
                            <div v-for="s in sensors" :key="s.entity_id" class="sensor-row">
                                <span class="sensor-status-dot" :class="s.available ? 'ok' : 'warn'"></span>
                                <span class="sensor-name">{{ translateSensorLabel(s.friendly_name) || s.entity_id }}</span>
                                <span class="sensor-entity">{{ s.entity_id }}</span>
                                <span class="sensor-state">{{ translateSensorState(s) }}</span>
                            </div>
                            <div v-if="sensors.length === 0" class="empty-state">{{ $t('settings.noSensors') }}</div>
                        </div>

                        <!-- Configured Consumers Status -->
                        <div v-if="configuredConsumers && configuredConsumers.length > 0" class="missing-helpers-section">
                            <div class="missing-helpers-title">{{ $t('settings.consumersStatusTitle') || 'Großverbraucher-Status' }}</div>
                            <div v-for="c in configuredConsumers" :key="c.config_key" class="missing-helper-row">
                                <div class="helper-info">
                                    <span class="helper-name">{{ getConsumerName(c.config_key) }}</span>
                                    <span class="helper-desc">
                                        <span v-if="c.mode === 'sensor'">{{ $t('home.hubble.answer.consumerSensorMode') || 'Nutzt konfigurierten Zählersensor' }}: {{ c.daily_entity_id }}</span>
                                        <span v-else>{{ $t('home.hubble.answer.consumerIntegratedMode') || 'Automatische Integration aus Leistungssensor' }}: {{ c.power_entity_id }}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        <a class="settings-link" :href="haConfigUrl" @click="openHaLink($event, haConfigUrl)">
                            {{ $t('settings.configureSensors') }} &rarr;
                        </a>
                    </div>
                </div>

                <!-- Accordion: Electricity Price -->
                <div class="accordion-section" :class="{ open: openSection === 'price' }">
                    <button class="accordion-header" @click="toggle('price')">
                        <span class="accordion-icon">{{ openSection === 'price' ? '\u25BE' : '\u25B8' }}</span>
                        <span class="accordion-title">{{ $t('settings.price') }}</span>
                        <span class="accordion-badge neutral">{{ priceInfo.mode || '--' }}</span>
                    </button>
                    <div class="accordion-body" v-show="openSection === 'price'">
                        <div class="settings-grid">
                            <div class="settings-item">
                                <span class="settings-item-label">{{ $t('settings.country') }}</span>
                                <span class="settings-item-value">{{ priceInfo.country || '--' }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">{{ $t('settings.vat') }}</span>
                                <span class="settings-item-value">{{ priceInfo.vat != null ? priceInfo.vat + '%' : '--' }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">{{ $t('settings.mode') }}</span>
                                <span class="settings-item-value">{{ priceInfo.mode || '--' }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">{{ priceInfo.energy_price_is_total ? $t('settings.sensorLabel.totalPrice') : $t('settings.energyPrice') }}</span>
                                <span class="settings-item-value">{{ priceInfo.energy_price != null ? $n(priceInfo.energy_price, 2) + ' ct/kWh' : '--' }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">{{ $t('settings.gridFees') }}</span>
                                <span class="settings-item-value">{{ priceInfo.grid_fees != null ? $n(priceInfo.grid_fees, 2) + ' ct/kWh' : '--' }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">{{ $t('settings.baseFee') }}</span>
                                <span class="settings-item-value">{{ priceInfo.base_fee != null ? $n(priceInfo.base_fee, 2) + ' EUR/' + $t('settings.month') : '--' }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">{{ $t('settings.feedInTariff') }}</span>
                                <span class="settings-item-value">{{ priceInfo.feed_in_tariff != null ? $n(priceInfo.feed_in_tariff, 2) + ' ct/kWh' : '--' }}</span>
                            </div>
                        </div>
                        <div v-if="gpmIsAdmin()" class="gpm-config-actions">
                            <button type="button" class="export-btn" @click="openGpmStep('tariff')">{{ $t('settings.gpmConfig.tariff') }}</button>
                            <button type="button" class="export-btn" @click="openGpmStep('common')">{{ $t('settings.gpmConfig.common') }}</button>
                            <button type="button" class="export-btn" @click="openGpmStep('fee_history')">{{ $t('settings.gpmConfig.fees') }}</button>
                            <button type="button" class="export-btn" @click="openGpmStep('license')">{{ $t('settings.gpmConfig.license') }}</button>
                        </div>
                        <p v-else class="gpm-config-hint">{{ $t('settings.gpmConfig.adminOnly') }}</p>
                        <p v-if="gpmNotice" class="gpm-config-notice" :class="gpmNoticeOk ? 'ok' : ''">{{ gpmNotice }}</p>
                        <p v-if="gpmUnavailable" class="gpm-config-hint">{{ $t('settings.gpmConfig.unavailable') }}</p>
                        <form v-if="gpmForm.open" class="gpm-config-form" @submit.prevent="submitGpmForm">
                            <p v-if="gpmForm.description">{{ gpmForm.description }}</p>
                            <p v-if="gpmForm.errors.base" class="gpm-config-error">{{ gpmForm.errors.base }}</p>
                            <label v-for="field in gpmFieldViews" :key="field.name" class="gpm-config-field">
                                <span>{{ field.label }}<span v-if="field.required"> *</span></span>
                                <span v-if="field.description" class="gpm-config-help">{{ field.description }}</span>
                                <template v-if="field.kind === 'number'">
                                    <span class="gpm-config-number">
                                        <input type="number" v-model="gpmForm.values[field.name]" :min="field.min" :max="field.max" :step="field.step" />
                                        <span v-if="field.unit">{{ field.unit }}</span>
                                    </span>
                                </template>
                                <template v-else-if="field.kind === 'select' && field.multiple">
                                    <span class="gpm-config-multi">
                                        <label v-for="opt in field.options" :key="opt.value" class="gpm-config-multi-item">
                                            <input type="checkbox" :value="opt.value" v-model="gpmForm.values[field.name]" />
                                            <span>{{ opt.label }}</span>
                                        </label>
                                    </span>
                                </template>
                                <template v-else-if="field.kind === 'select'">
                                    <select v-model="gpmForm.values[field.name]">
                                        <option v-for="opt in field.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                                    </select>
                                </template>
                                <template v-else-if="field.kind === 'boolean'">
                                    <input type="checkbox" v-model="gpmForm.values[field.name]" />
                                </template>
                                <template v-else-if="field.kind === 'date'">
                                    <input type="date" v-model="gpmForm.values[field.name]" />
                                </template>
                                <template v-else-if="field.kind === 'entity'">
                                    <input type="text" v-model="gpmForm.values[field.name]" :list="'gpm-entity-' + field.name" />
                                    <datalist :id="'gpm-entity-' + field.name">
                                        <option v-for="ent in field.entities" :key="ent" :value="ent"></option>
                                    </datalist>
                                </template>
                                <template v-else>
                                    <input type="text" v-model="gpmForm.values[field.name]" />
                                </template>
                                <span v-if="gpmForm.errors[field.name]" class="gpm-config-error">{{ gpmForm.errors[field.name] }}</span>
                            </label>
                            <div class="gpm-config-actions">
                                <button type="submit" class="export-btn" :disabled="gpmForm.busy">{{ $t('common.save') }}</button>
                                <button type="button" class="export-btn" @click="cancelGpmForm(false)" :disabled="gpmForm.busy">{{ $t('common.cancel') }}</button>
                            </div>
                        </form>
                        <h3 class="gpm-history-title">{{ $t('settings.gpmConfig.history') }}</h3>
                        <table class="gpm-fee-table" v-if="gpmHistoryRows.length">
                            <thead>
                                <tr>
                                    <th>{{ $t('settings.gpmConfig.validFrom') }}</th>
                                    <th>{{ $t('settings.gpmConfig.baseFee') }}</th>
                                    <th>{{ $t('settings.gpmConfig.feedIn') }}</th>
                                    <th>{{ $t('settings.gpmConfig.origin') }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(row, index) in gpmHistoryRows" :key="index" :class="{ 'gpm-fee-current': row.current }">
                                    <td>{{ gpmBlank(row.valid_from) }}</td>
                                    <td>{{ gpmBlank(row.base_fee_eur_month) }}</td>
                                    <td>{{ gpmBlank(row.feed_in_tariff_ct) }}</td>
                                    <td>{{ gpmOriginLabel(row.origin) }}<span v-if="row.current"> · {{ $t('settings.gpmConfig.current') }}</span></td>
                                </tr>
                            </tbody>
                        </table>
                        <p v-else-if="!gpmUnavailable" class="gpm-config-hint">{{ $t('settings.gpmConfig.historyEmpty') }}</p>
                        <a class="settings-link" :href="priceConfigUrl" @click="openHaLink($event, priceConfigUrl)">
                            {{ $t('settings.configurePrice') }} &rarr;
                        </a>
                    </div>
                </div>

                <!-- Accordion: Smart Charging -->
                <div class="accordion-section" :class="{ open: openSection === 'charging' }">
                    <button class="accordion-header" @click="toggle('charging')">
                        <span class="accordion-icon">{{ openSection === 'charging' ? '\u25BE' : '\u25B8' }}</span>
                        <span class="accordion-title">{{ $t('settings.smartCharging') }}</span>
                        <span class="accordion-badge" :class="chargingBadgeClass">{{ chargingBadgeText }}</span>
                    </button>
                    <div class="accordion-body" v-show="openSection === 'charging'">
                        <div v-if="!chargingInfo.enabled" class="empty-state">
                            <div>{{ $t('settings.smartChargingDisabled') }}</div>
                            <div style="margin-top:6px;">{{ $t('settings.smartChargingPath') }}</div>
                            <button class="export-btn" style="margin-top:var(--space-sm);" @click="openIntegration">{{ $t('settings.openIntegration') }}</button>
                        </div>
                        <div v-else>
                            <div class="settings-grid">
                                <div class="settings-item">
                                    <span class="settings-item-label">{{ $t('settings.statusLabel') }}</span>
                                    <span class="settings-item-value" :class="chargingInfo.active ? 'val-ok' : ''">{{ chargingStatusText }}</span>
                                </div>
                                <div class="settings-item">
                                    <span class="settings-item-label">{{ chargingThresholdLabel }}</span>
                                    <span class="settings-item-value">{{ chargingThresholdValue }}</span>
                                </div>
                                <div class="settings-item">
                                    <span class="settings-item-label">{{ $t('settings.currentPrice') }}</span>
                                    <span class="settings-item-value" :class="chargingPriceClass">{{ chargingInfo.current_price != null ? $n(chargingInfo.current_price, 2) + ' ct/kWh' : '--' }}{{ chargingPriceSuffix }}</span>
                                </div>
                                <div class="settings-item">
                                    <span class="settings-item-label">{{ $t('settings.batteryCapacity') }}</span>
                                    <span class="settings-item-value">{{ chargingInfo.capacity != null ? chargingInfo.capacity + ' kWh' : '--' }}</span>
                                </div>
                                <div class="settings-item">
                                    <span class="settings-item-label">{{ $t('settings.minSoc') }}</span>
                                    <span class="settings-item-value">{{ chargingInfo.min_soc != null ? chargingInfo.min_soc + '%' : '--' }}</span>
                                </div>
                                <div class="settings-item">
                                    <span class="settings-item-label">{{ $t('settings.maxSoc') }}</span>
                                    <span class="settings-item-value">{{ chargingInfo.max_soc != null ? chargingInfo.max_soc + '%' : '--' }}</span>
                                </div>
                                <div class="settings-item">
                                    <span class="settings-item-label">{{ $t('settings.currentSoc') }}</span>
                                    <span class="settings-item-value">{{ chargingInfo.current_soc != null ? $n(chargingInfo.current_soc, 1) + '%' : '--' }}</span>
                                </div>
                                <div class="settings-item">
                                    <span class="settings-item-label">{{ $t('settings.targetSoc') }}</span>
                                    <span class="settings-item-value">{{ chargingInfo.target_soc != null ? $n(chargingInfo.target_soc, 1) + '%' : '--' }}</span>
                                </div>
                                <div class="settings-item" style="grid-column: 1 / -1;">
                                    <span class="settings-item-label">{{ $t('settings.decision') }}</span>
                                    <span class="settings-item-value">{{ chargingReasonText }}</span>
                                </div>
                            </div>
                            <div v-if="!chargingInfo.soc_sensor_configured" class="empty-state" style="margin-top:var(--space-sm);">
                                {{ $t('settings.noSocSensor') }}
                                <button class="export-btn" style="margin-top:var(--space-sm);" @click="openIntegration">{{ $t('settings.openIntegration') }}</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Accordion: Panel Groups -->
                <div class="accordion-section" :class="{ open: openSection === 'panels' }">
                    <button class="accordion-header" @click="toggle('panels')">
                        <span class="accordion-icon">{{ openSection === 'panels' ? '\u25BE' : '\u25B8' }}</span>
                        <span class="accordion-title">{{ $t('settings.panelGroups') }}</span>
                        <span class="accordion-badge neutral">{{ panelGroups.length }} {{ $t('settings.groupsSuffix') }}</span>
                    </button>
                    <div class="accordion-body" v-show="openSection === 'panels'">
                        <div v-for="(pg, idx) in panelGroups" :key="idx" class="panel-group-card">
                            <div class="panel-group-header">{{ $t('settings.group') }} {{ idx + 1 }}: {{ pg.name || 'Panel ' + (idx + 1) }}</div>
                            <div class="settings-grid">
                                <div class="settings-item">
                                    <span class="settings-item-label">{{ $t('settings.azimuth') }}</span>
                                    <span class="settings-item-value">{{ formatValue(pg.azimuth, 0, '°') }}</span>
                                </div>
                                <div class="settings-item">
                                    <span class="settings-item-label">{{ $t('settings.tilt') }}</span>
                                    <span class="settings-item-value">{{ formatValue(pg.tilt, 0, '°') }}</span>
                                </div>
                                <div class="settings-item">
                                    <span class="settings-item-label">{{ $t('settings.power') }}</span>
                                    <span class="settings-item-value">{{ formatValue(pg.kwp, 3, ' kWp') }}</span>
                                </div>
                                <div class="settings-item" v-if="devOn && pg.factor != null">
                                    <span class="settings-item-label">{{ $t('settings.physicsFactor') }}</span>
                                    <span class="settings-item-value">{{ $n(pg.factor, 3) }}</span>
                                </div>
                                <div class="settings-item" v-if="devOn && pg.confidence != null">
                                    <span class="settings-item-label">{{ $t('settings.confidence') }}</span>
                                    <span class="settings-item-value">{{ $n(pg.confidence * 100, 0) }}%</span>
                                </div>
                            </div>
                        </div>
                        <div v-if="panelGroups.length === 0" class="empty-state">{{ $t('settings.noPanelGroups') }}</div>
                    </div>
                </div>

                <!-- Accordion: Hubble -->
                <div v-if="devOn" class="accordion-section" :class="{ open: openSection === 'ai' }">
                    <button class="accordion-header" @click="toggle('ai')">
                        <span class="accordion-icon">{{ openSection === 'ai' ? '\u25BE' : '\u25B8' }}</span>
                        <span class="accordion-title">{{ $t('settings.hubble') }}</span>
                        <span class="accordion-badge" :class="aiInfo.active_model ? 'ok' : 'neutral'">{{ aiInfo.active_model_display || '--' }}</span>
                    </button>
                    <div class="accordion-body" v-show="openSection === 'ai'">
                        <div class="settings-grid">
                            <div class="settings-item">
                                <span class="settings-item-label">{{ $t('settings.activeModel') }}</span>
                                <span class="settings-item-value">{{ aiInfo.active_model_display || '--' }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">{{ $t('settings.stackVersion') }}</span>
                                <span class="settings-item-value">{{ aiInfo.version || '--' }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">{{ $t('settings.accuracy') }}</span>
                                <span class="settings-item-value">{{ aiInfo.accuracy_percent != null ? $n(aiInfo.accuracy_percent, 1) + ' %' : '--' }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">RMSE</span>
                                <span class="settings-item-value">{{ aiInfo.rmse != null ? $n(aiInfo.rmse, 4) : '--' }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">{{ $t('settings.trainingSamples') }}</span>
                                <span class="settings-item-value">{{ aiInfo.training_samples != null ? $n(aiInfo.training_samples, 0) : '--' }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">{{ $t('settings.lastTraining') }}</span>
                                <span class="settings-item-value">{{ formatDate(aiInfo.last_trained) }}</span>
                            </div>
                            <div v-if="aiInfo.coordinator" class="settings-item">
                                <span class="settings-item-label">{{ $t('settings.expectedToday') }}</span>
                                <span class="settings-item-value">{{ aiInfo.coordinator.expected_kwh_today != null ? $n(aiInfo.coordinator.expected_kwh_today, 2) + ' kWh' : '--' }}</span>
                            </div>
                            <div v-if="aiInfo.drift" class="settings-item">
                                <span class="settings-item-label">{{ $t('settings.driftStatus') }}</span>
                                <span class="settings-item-value" :class="driftStatusClass">{{ driftStatusText }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Accordion: System -->
                <div class="accordion-section" :class="{ open: openSection === 'system' }">
                    <button class="accordion-header" @click="toggle('system')">
                        <span class="accordion-icon">{{ openSection === 'system' ? '\u25BE' : '\u25B8' }}</span>
                        <span class="accordion-title">{{ $t('settings.system') }}</span>
                        <span class="accordion-badge" :class="systemInfo.healthy ? 'ok' : 'warn'">{{ systemInfo.healthy ? 'OK' : $t('settings.warning') }}</span>
                    </button>
                    <div class="accordion-body" v-show="openSection === 'system'">
                        <div class="settings-grid">
                            <div class="settings-item">
                                <span class="settings-item-label">SFML Stats Version</span>
                                <span class="settings-item-value">{{ systemInfo.stats_version || '--' }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">SFML ML Version</span>
                                <span class="settings-item-value">{{ systemInfo.ml_version || '--' }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">{{ $t('settings.database') }}</span>
                                <span class="settings-item-value" :class="systemInfo.db_ok ? '' : 'val-warn'">{{ systemInfo.db_status || '--' }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">{{ $t('settings.dbSize') }}</span>
                                <span class="settings-item-value">{{ systemInfo.db_size || '--' }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">{{ $t('settings.lastAggregation') }}</span>
                                <span class="settings-item-value">{{ formatDate(systemInfo.last_aggregation) }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">{{ $t('settings.dataPoints') }}</span>
                                <span class="settings-item-value">{{ systemInfo.data_points != null ? $n(systemInfo.data_points, 0) : '--' }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Accordion: Update information -->
                <div class="accordion-section" :class="{ open: openSection === 'updateInfo' }">
                    <button class="accordion-header" type="button" @click="toggle('updateInfo')">
                        <span class="accordion-icon">{{ openSection === 'updateInfo' ? '\u25BE' : '\u25B8' }}</span>
                        <span class="accordion-title">{{ $t('settings.updateInfo.title') }}</span>
                        <span v-if="updateInfoKnown && updateInfoAvailable" class="accordion-badge" :class="updateInfoEnabled ? 'ok' : 'warn'">{{ updateInfoEnabled ? $t('settings.updateInfo.on') : $t('settings.updateInfo.off') }}</span>
                    </button>
                    <div class="accordion-body" v-show="openSection === 'updateInfo'">
                        <p class="update-info-text">{{ $t('settings.updateInfo.intro') }}</p>
                        <p class="update-info-text">{{ $t('settings.updateInfo.pingLead') }}<a href="https://www.solarforecastml.com" target="_blank" rel="noopener noreferrer">www.solarforecastml.com</a>{{ $t('settings.updateInfo.pingMid') }} <strong>{{ $t('settings.updateInfo.pingOnly') }}</strong> {{ $t('settings.updateInfo.pingRest') }} {{ $t('settings.updateInfo.scriptNote') }}</p>
                        <button type="button" class="button secondary compact update-info-download" @click="downloadUpdateInfoScript" :disabled="updateInfoDownloading">{{ $t('settings.updateInfo.download') }}</button>
                        <p class="update-info-text"><strong>{{ $t('settings.updateInfo.flowTitle') }}</strong><br>{{ $t('settings.updateInfo.flowLead') }} <strong>Home Assistant</strong> {{ $t('settings.updateInfo.flowRest') }}</p>
                        <p class="update-info-text">{{ $t('settings.updateInfo.generic') }}</p>
                        <p class="update-info-text update-info-ask">{{ $t('settings.updateInfo.ask') }}</p>
                        <p v-if="updateInfoKnown && !updateInfoAvailable" class="dev-access-status">{{ $t('settings.updateInfo.unavailable') }}</p>
                        <label v-else class="update-info-switch">
                            <input type="checkbox" :checked="updateInfoEnabled" @change="saveUpdateInfo" :disabled="!updateInfoCanWrite || updateInfoSaving || !updateInfoKnown">
                            <span>{{ $t('settings.updateInfo.switch') }} — {{ updateInfoEnabled ? $t('settings.updateInfo.on') : $t('settings.updateInfo.off') }}</span>
                        </label>
                        <p v-if="updateInfoNotice" class="dev-access-status" role="status">{{ updateInfoNotice }}</p>
                    </div>
                </div>

                <!-- Accordion: Exports -->
                <div class="accordion-section" :class="{ open: openSection === 'exports' }">
                    <button class="accordion-header" @click="toggle('exports')">
                        <span class="accordion-icon">{{ openSection === 'exports' ? '\u25BE' : '\u25B8' }}</span>
                        <span class="accordion-title">{{ $t('settings.exports.title') }}</span>
                        <span class="accordion-badge neutral">{{ $t('settings.exports.badge') }}</span>
                        <span class="accordion-badge neutral">{{ $t('settings.exports.premium') }}</span>
                    </button>
                    <div class="accordion-body" v-show="openSection === 'exports'">
                        <div class="export-grid">
                            <button v-for="option in exportOptions"
                                    :key="option.type"
                                    class="export-option"
                                    type="button"
                                    @click="exportDataset(option)"
                                    :disabled="isExporting">
                                <span class="export-option-title">{{ exportingType === option.type ? $t('settings.exports.downloading', { name: $t(option.labelKey) }) : $t(option.labelKey) }}</span>
                                <span class="export-option-format">{{ option.format }}</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="accordion-section dev-access" :class="{ open: openSection === 'dev' }">
                    <button class="accordion-header" type="button" @click="toggle('dev')">
                        <span class="accordion-icon">{{ openSection === 'dev' ? '\u25BE' : '\u25B8' }}</span>
                        <span class="accordion-title">{{ $t('settings.dev.title') }}</span>
                        <span class="accordion-badge" :class="devBadgeClass">{{ devBadgeText }}</span>
                    </button>
                    <div class="accordion-body" v-show="openSection === 'dev'">
                        <div class="settings-grid dev-access-grid">
                            <div class="settings-item">
                                <span class="settings-item-label">{{ $t('settings.dev.installId') }}</span>
                                <div class="dev-install-row">
                                    <span class="settings-item-value">{{ devInstallLabel }}</span>
                                    <button type="button" class="button secondary compact" @click="copyInstallHash" :disabled="devInstallBlocked">{{ devCopied ? $t('settings.dev.copied') : $t('settings.dev.copy') }}</button>
                                </div>
                            </div>
                            <label class="settings-item">
                                <span class="settings-item-label">{{ $t('settings.dev.token') }}</span>
                                <input class="dev-token-input" type="password" autocomplete="off" v-model="devToken" :disabled="devInstallBlocked" :title="devInstallTitle" />
                            </label>
                        </div>
                        <p class="dev-access-hint">{{ $t('settings.dev.hint') }}</p>
                        <div class="dev-access-actions">
                            <button type="button" class="button primary compact" @click="activateDevToken" :disabled="devInstallBlocked" :title="devInstallTitle">{{ $t('settings.dev.activate') }}</button>
                            <button type="button" class="button secondary compact" @click="clearDevToken" :disabled="devInstallBlocked" :title="devInstallTitle">{{ $t('settings.dev.remove') }}</button>
                        </div>
                        <p v-if="devMessage" class="dev-access-status">{{ devMessage }}</p>
                    </div>
                </div>
            </div>
        </div>
    `,

    setup(props, { emit }) {
        const { ref: vRef, reactive, computed, onMounted, onUnmounted } = Vue;
        const t = window.SFMLI18n ? window.SFMLI18n.t : (key) => key;
        const currentLocale = vRef((window.SFMLI18n && window.SFMLI18n.current) || 'en');
        const locale = currentLocale;
        const bcp = (l) => ({ de: 'de-DE', en: 'en-US', pl: 'pl-PL' }[l] || 'en-US');
        const timeContext = reactive({
            timezone: null,
            today: null,
        });
        function syncTimeContext(payload) {
            const ctx = payload?.time_context;
            if (!ctx || typeof ctx !== 'object') return;
            Object.assign(timeContext, ctx);
        }
        const localDateKey = (date = null) => {
            if (!date && timeContext.today) return timeContext.today;
            date = date || new Date();
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };
        const supportedLocales = (window.SFMLI18n && window.SFMLI18n.supported) || ['en'];
        const localeName = (code) => (window.SFMLI18n ? window.SFMLI18n.nameOf(code) : code);
        const changeLocale = (code) => {
            currentLocale.value = code;
            if (window.SFMLI18n) window.SFMLI18n.setLocale(code);
        };
        const changeTheme = (theme) => {
            emit('change-theme', theme);
        };

        // Sensor friendly_name values arrive in German from the backend
        // (extra_features/sfml_stats/api/views.py, PyArmor-obfuscated, so we
        // can't translate at source). Map the known role labels here; unknown
        // labels fall through unchanged.
        const SENSOR_LABEL_KEYS = {
            'Hausverbrauch (W)': 'settings.sensorLabel.houseConsumptionW',
            'Hausverbrauch (kWh/Tag)': 'settings.sensorLabel.houseConsumptionDaily',
            'Solar → Haus (W)': 'settings.sensorLabel.solarToHouseW',
            'Solar → Batterie (W)': 'settings.sensorLabel.solarToBatteryW',
            'Solar Produktion (W)': 'settings.sensorLabel.solarProductionW',
            'Solar-Tagesertrag (kWh)': 'settings.sensorLabel.solarYieldDaily',
            'Batterie → Haus (W)': 'settings.sensorLabel.batteryToHouseW',
            'Batterie → Netz (W)': 'settings.sensorLabel.batteryToGridW',
            'Battery to Grid (W)': 'settings.sensorLabel.batteryToGridW',
            'Batterie SoC (%)': 'settings.sensorLabel.batterySoc',
            'Batterie Leistung (W)': 'settings.sensorLabel.batteryPowerW',
            'Batterie von Solar (kWh/Tag)': 'settings.sensorLabel.batteryChargeSolarDaily',
            'Batterie von Netz (kWh/Tag)': 'settings.sensorLabel.batteryChargeGridDaily',
            'Batterie entladen (kWh/Tag)': 'settings.sensorLabel.batteryDischargeDaily',
            'Netz → Haus (W)': 'settings.sensorLabel.gridToHouseW',
            'Netz → Batterie (W)': 'settings.sensorLabel.gridToBatteryW',
            'Haus → Netz (W)': 'settings.sensorLabel.houseToGridW',
            'Smartmeter Bezug (W)': 'settings.sensorLabel.smartmeterImportW',
            'Smartmeter Einspeisung (W)': 'settings.sensorLabel.smartmeterExportW',
            'Netzbezug (kWh/Tag)': 'settings.sensorLabel.gridImportDaily',
            'Netzeinspeisung (kWh/Tag)': 'settings.sensorLabel.gridExportDaily',
            'Zusätzlicher Netzbezug (kWh/Tag)': 'settings.sensorLabel.gridImportExtra',
            'Netzbezug (kWh/Jahr)': 'settings.sensorLabel.gridImportYearly',
            'Strompreis Gesamt (ct/kWh)': 'settings.sensorLabel.totalPrice',
            'Strompreis (ct/kWh)': 'settings.sensorLabel.electricityPrice',
            'Wetter': 'settings.sensorLabel.weather',
            'Außentemperatur (°C)': 'settings.sensorLabel.outdoorTemp',
            'Wärmepumpe Leistung (W)': 'settings.sensorLabel.heatpumpW',
            'Wärmepumpe (kWh/Tag)': 'settings.sensorLabel.heatpumpDaily',
            'Heizstab Leistung (W)': 'settings.sensorLabel.heatingrodW',
            'Heizstab (kWh/Tag)': 'settings.sensorLabel.heatingrodDaily',
            'Wallbox Leistung (W)': 'settings.sensorLabel.wallboxW',
            'Wallbox (kWh/Tag)': 'settings.sensorLabel.wallboxDaily',
            'Wallbox Status': 'settings.sensorLabel.wallboxState',
        };
        // Match "Panel 1 Leistung (W)" through "Panel 9 Leistung (W)" without
        // hard-coding each one — backend exposes one entry per configured panel.
        const PANEL_POWER_RE = /^Panel\s+(\d+)\s+Leistung\s+\(W\)$/;
        const translateSensorLabel = (label) => {
            if (!label) return label;
            const key = SENSOR_LABEL_KEYS[label];
            if (key) return t(key);
            const m = PANEL_POWER_RE.exec(label);
            if (m) return t('settings.sensorLabel.panelPower', { n: m[1] });
            return label;
        };
        // Weather entities return HA condition codes like "sunny"/"cloudy" as
        // their state. Map them via the existing weather.condition.* keys.
        const HA_CONDITION_KEYS = {
            'clear-night': 'weather.condition.clearNight',
            'cloudy': 'weather.condition.cloudy',
            'exceptional': 'weather.condition.exceptional',
            'fog': 'weather.condition.fog',
            'hail': 'weather.condition.hail',
            'lightning': 'weather.condition.lightning',
            'lightning-rainy': 'weather.condition.lightningRainy',
            'partlycloudy': 'weather.condition.partlyCloudy',
            'pouring': 'weather.condition.pouring',
            'rainy': 'weather.condition.rainy',
            'snowy': 'weather.condition.snowy',
            'snowy-rainy': 'weather.condition.snowyRainy',
            'sunny': 'weather.condition.sunny',
            'clear': 'weather.condition.clear',
            'windy': 'weather.condition.windy',
            'windy-variant': 'weather.condition.windyVariant',
        };
        const translateSensorState = (s) => {
            if (s == null || s.state == null) return '--';
            const eid = String(s.entity_id || '');
            if (eid.startsWith('weather.')) {
                const key = HA_CONDITION_KEYS[String(s.state).toLowerCase()];
                if (key) return t(key);
            }
            return s.state;
        };

        const openSection = vRef('interface');
        const exportingType = vRef(null);
        const isExporting = computed(() => exportingType.value !== null);
        const exportOptions = [
            { type: 'solar', labelKey: 'settings.exports.solar', format: 'CSV', extension: 'csv' },
            { type: 'energy', labelKey: 'settings.exports.energy', format: 'CSV', extension: 'csv' },
            { type: 'billing', labelKey: 'settings.exports.billing', format: 'CSV', extension: 'csv' },
            { type: 'smart_charging', labelKey: 'settings.exports.smartCharging', format: 'CSV', extension: 'csv' },
            { type: 'all', labelKey: 'settings.exports.allZip', format: 'ZIP', extension: 'zip' },
        ];

        const sensors = vRef([]);
        const configuredConsumers = vRef([]);
        const priceInfo = reactive({ country: '', vat: null, mode: '', mode_key: '', energy_price: null, energy_price_is_total: false, grid_fees: null, base_fee: null, feed_in_tariff: null });
        const gpmForm = reactive({
            open: false,
            busy: false,
            flowId: '',
            stepId: '',
            description: '',
            fields: [],
            errors: {},
            values: {},
        });
        const gpmHistory = vRef({ available: true, rows: [] });
        const gpmUnavailable = vRef(false);
        const gpmNotice = vRef('');
        const gpmNoticeOk = vRef(false);
        const gpmFieldViews = computed(() => sfmlGpmFieldViews(gpmForm.fields, sfmlHassStates()));
        const gpmHistoryRows = computed(() => {
            const rows = gpmHistory.value && gpmHistory.value.rows;
            return Array.isArray(rows) ? rows : [];
        });
        const chargingInfo = reactive({
            enabled: false, capacity: null, min_soc: null, max_soc: null,
            max_price: null, soc_sensor: null, soc_sensor_configured: false,
            current_soc: null, target_soc: null, active: null, reason: null,
            is_cheap: null, current_price: null, threshold_mode: '',
            cheapest_hours: null, below_average_pct: null,
            grid_kind: '', grid_allowed: null,
        });

        const chargingBadgeText = computed(() => {
            if (!chargingInfo.enabled) return t('settings.charging.inactive');
            return chargingInfo.active === true ? t('settings.charging.charging') : t('settings.charging.ready');
        });

        const chargingBadgeClass = computed(() => {
            if (!chargingInfo.enabled) return 'neutral';
            return chargingInfo.active === true ? 'ok' : 'neutral';
        });

        const chargingStatusText = computed(() => {
            if (chargingInfo.active === true) return t('settings.charging.gridActive');
            if (chargingInfo.active === false) return t('settings.charging.gridStopped');
            return t('settings.charging.waiting');
        });

        const chargingThresholdLabel = computed(() => {
            if (chargingInfo.threshold_mode === 'cheapest_hours') return t('smart_charging.thresholdModeCheapestHours');
            if (chargingInfo.threshold_mode === 'below_average') return t('smart_charging.thresholdModeBelowAverage');
            return t('smart_charging.thresholdModeAbsolute');
        });

        const chargingThresholdValue = computed(() => {
            if (chargingInfo.threshold_mode === 'cheapest_hours') {
                return chargingInfo.cheapest_hours != null ? String(chargingInfo.cheapest_hours) : '--';
            }
            if (chargingInfo.threshold_mode === 'below_average') {
                return chargingInfo.below_average_pct != null ? String(chargingInfo.below_average_pct) + ' %' : '--';
            }
            return chargingInfo.max_price != null ? window.SFMLI18n.formatNumber(chargingInfo.max_price, 1) + ' ct/kWh' : '--';
        });

        const chargingPriceSuffix = computed(() => {
            const kind = chargingInfo.grid_kind;
            if (kind === 'demo' || kind === 'stale' || kind === 'missing' || kind === 'unspecified') return '';
            if (chargingInfo.grid_allowed === true) return ' (' + t('settings.cheap') + ')';
            if (chargingInfo.grid_allowed === false) return ' (' + t('settings.tooHigh') + ')';
            if (chargingInfo.is_cheap === true) return ' (' + t('settings.cheap') + ')';
            if (chargingInfo.is_cheap === false) return ' (' + t('settings.tooHigh') + ')';
            return '';
        });

        const chargingPriceClass = computed(() => {
            if (!chargingPriceSuffix.value) return '';
            return chargingInfo.grid_allowed === true || chargingInfo.is_cheap === true ? 'val-ok' : 'val-warn';
        });

        const chargingReasonText = computed(() => {
            let code = chargingInfo.reason;
            if (chargingInfo.grid_kind === 'demo') code = 'price_demo';
            else if (chargingInfo.grid_kind === 'stale' || chargingInfo.grid_kind === 'missing') code = 'price_unavailable';
            if (!code) return '--';
            const reasonKey = `smart_charging.reasons.${code}`;
            const translation = t(reasonKey);
            if (translation !== reasonKey) return translation;
            return t('smart_charging.status.unknownReason').replace('{code}', String(code));
        });
        const panelGroups = vRef([]);
        const systemInfo = reactive({ stats_version: '', ml_version: '', db_status: '', db_size: '', db_ok: true, healthy: true, last_aggregation: '', data_points: null });
        const aiInfo = reactive({ active_model: null, active_model_display: null, version: null, accuracy_percent: null, rmse: null, training_samples: null, last_trained: null, drift: null, coordinator: null });
        const devOn = computed(() => window.sfmlDevState?.active === true);
        const devInstallHash = vRef("");
        const devInstallState = vRef("loading");
        const devToken = vRef("");
        const devMessage = vRef("");
        const devCopied = vRef(false);
        const devInstallBlocked = computed(() => devInstallState.value !== "ready");
        const devInstallTitle = computed(() => devInstallState.value === "blocked" ? t("settings.dev.panelOnly") : "");
        const devInstallLabel = computed(() => {
            if (devInstallState.value === "blocked") return t("settings.dev.panelOnly");
            return devInstallHash.value || "--";
        });
        const devBadgeText = computed(() => {
            const active = window.sfmlDevState?.active === true;
            const raw = window.sfmlDevState?.expires_at;
            const parsed = raw ? new Date(raw) : null;
            if (!active || !parsed || Number.isNaN(parsed.getTime())) return t("settings.dev.badgeOff");
            const formatted = new Intl.DateTimeFormat(bcp(currentLocale.value), {
                dateStyle: "medium",
                timeStyle: "short",
            }).format(parsed);
            return t("settings.dev.badgeUntil", { date: formatted });
        });
        const devBadgeClass = computed(() => window.sfmlDevState?.active === true ? "ok" : "neutral");

        function devStatusText(code) {
            if (code === "valid") return t("settings.dev.accepted");
            if (code === "install_mismatch") return t("settings.dev.installMismatch");
            if (code === "expired") return t("settings.dev.expired");
            if (code === "not_yet_valid") return t("settings.dev.notYetValid");
            if (code === "not_provided") return t("settings.dev.notProvided");
            if (code === "invalid" || code === "invalid_format" || code === "invalid_signature"
                || code === "unknown_key_id" || code === "wrong_entitlement"
                || code === "validation_error") {
                return t("settings.dev.invalid");
            }
            return t("settings.dev.failed");
        }

        async function loadDevAccess() {
            try {
                await SFMLApi.ensureDevMode(true);
            } catch (_error) {
                // The public flag is optional for this panel.
            }
            try {
                const payload = await SFMLApi.fetch("/api/sfml_stats/dev_mode/install", {
                    forceRefresh: true,
                    authenticated: true,
                });
                const data = payload && payload.data ? payload.data : payload;
                devInstallHash.value = data?.install_hash || "";
                devInstallState.value = devInstallHash.value ? "ready" : "blocked";
            } catch (_error) {
                devInstallHash.value = "";
                devInstallState.value = "blocked";
            }
        }

        async function copyInstallHash() {
            if (!devInstallHash.value || !navigator.clipboard) return;
            await navigator.clipboard.writeText(devInstallHash.value);
            devCopied.value = true;
        }

        async function activateDevToken() {
            if (devInstallBlocked.value) {
                devMessage.value = t("settings.dev.panelOnly");
                return;
            }
            devMessage.value = "";
            try {
                const result = await SFMLApi.postAuthenticated("/api/sfml_stats/dev_token", { token: devToken.value });
                devToken.value = "";
                devMessage.value = devStatusText(result?.data?.status);
                await SFMLApi.ensureDevMode(true);
            } catch (error) {
                devMessage.value = devStatusText(error && error.code);
            }
        }

        async function clearDevToken() {
            if (devInstallBlocked.value) {
                devMessage.value = t("settings.dev.panelOnly");
                return;
            }
            devMessage.value = "";
            devToken.value = "";
            try {
                const result = await SFMLApi.postAuthenticated("/api/sfml_stats/dev_token/clear", {});
                devMessage.value = result?.data?.status === "cleared"
                    ? t("settings.dev.cleared")
                    : devStatusText(result?.data?.status);
                await SFMLApi.ensureDevMode(true);
            } catch (error) {
                devMessage.value = devStatusText(error && error.code);
            }
        }

        const updateInfoEnabled = vRef(false);
        const updateInfoAvailable = vRef(false);
        const updateInfoKnown = vRef(false);
        const updateInfoSaving = vRef(false);
        const updateInfoCanWrite = vRef(true);
        const updateInfoNotice = vRef('');
        const UPDATE_INFO_ENDPOINT = '/api/sfml_stats/update_info';
        const UPDATE_INFO_SCRIPT_ENDPOINT = '/api/sfml_stats/update_info/script';
        const updateInfoDownloading = vRef(false);

        async function downloadUpdateInfoScript() {
            updateInfoDownloading.value = true;
            try {
                const response = await fetch(UPDATE_INFO_SCRIPT_ENDPOINT);
                if (!response.ok) throw new Error(String(response.status));
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'sfml_update_info_script.zip';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (_error) {
                updateInfoNotice.value = t('settings.updateInfo.downloadFailed');
            } finally {
                updateInfoDownloading.value = false;
            }
        }

        async function loadUpdateInfo() {
            try {
                const data = await SFMLApi.fetch(UPDATE_INFO_ENDPOINT, { forceRefresh: true, ttl: 0 });
                if (!data || typeof data.enabled !== 'boolean' || typeof data.available !== 'boolean') {
                    throw new Error('load');
                }
                updateInfoEnabled.value = data.enabled;
                updateInfoAvailable.value = data.available;
                updateInfoKnown.value = true;
            } catch (_error) {
                updateInfoNotice.value = t('settings.updateInfo.loadFailed');
            }
        }

        function updateInfoErrorText(err) {
            const raw = err && err.body && err.body.error;
            const code = (err && err.code)
                || (typeof raw === 'string' ? raw : (raw && raw.code))
                || '';
            if (code === 'not_applied') return { lock: false, text: t('settings.updateInfo.notApplied') };
            if (code === 'admin_required' || code === 'unauthorized') {
                return { lock: true, text: t('settings.updateInfo.adminRequired') };
            }
            if (
                code === 'local_access_required'
                || code === 'local_write_required'
                || code === 'authentication_required'
            ) {
                return { lock: true, text: t('settings.updateInfo.localRequired') };
            }
            if (code === 'service_unavailable' || code === 'service_call_failed') {
                return { lock: false, text: t('settings.updateInfo.serviceUnavailable') };
            }
            return { lock: false, text: t('settings.updateInfo.saveFailed') };
        }

        async function saveUpdateInfo(event) {
            if (!updateInfoCanWrite.value || updateInfoSaving.value || !updateInfoKnown.value) {
                if (event && event.target) event.target.checked = updateInfoEnabled.value;
                return;
            }
            const next = event.target.checked === true;
            const previous = updateInfoEnabled.value;
            updateInfoEnabled.value = next;
            updateInfoSaving.value = true;
            updateInfoNotice.value = '';
            try {
                const data = await SFMLApi.postAuthenticated(UPDATE_INFO_ENDPOINT, { enabled: next });
                if (!data || data.success !== true || data.enabled !== next) {
                    updateInfoEnabled.value = previous;
                    event.target.checked = previous;
                    updateInfoNotice.value = t('settings.updateInfo.notApplied');
                    return;
                }
                updateInfoEnabled.value = data.enabled;
                updateInfoNotice.value = t('settings.updateInfo.saved');
            } catch (err) {
                updateInfoEnabled.value = previous;
                if (event && event.target) event.target.checked = previous;
                const mapped = updateInfoErrorText(err);
                updateInfoNotice.value = mapped.text;
                if (mapped.lock) updateInfoCanWrite.value = false;
            } finally {
                updateInfoSaving.value = false;
            }
        }

        function formatDate(ts) {
            if (!ts) return '--';
            try {
                const d = new Date(ts);
                if (isNaN(d.getTime())) return String(ts);
                return new Intl.DateTimeFormat(bcp(locale.value), {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: timeContext.timezone || undefined,
                }).format(d);
            } catch (e) { return String(ts); }
        }
        function formatValue(value, digits = 0, suffix = '') {
            if (value == null || Number.isNaN(Number(value))) return '--';
            return window.SFMLI18n.formatNumber(value, digits) + suffix;
        }

        const haConfigUrl = computed(() => {
            return '/config/integrations/integration/sfml_stats';
        });

        const priceConfigUrl = computed(() => {
            if (priceInfo.mode_key === 'legacy_fixed') return haConfigUrl.value;
            return '/config/integrations/integration/grid_price_monitor';
        });

        function openHaLink(event, path) {
            if (!event || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                return;
            }
            if (window.SFMLApi && typeof window.SFMLApi.navigateHa === 'function' && window.SFMLApi.navigateHa(path)) {
                event.preventDefault();
            }
        }

        function openIntegration() {
            const path = haConfigUrl.value;
            if (window.SFMLApi && typeof window.SFMLApi.navigateHa === 'function') {
                window.SFMLApi.navigateHa(path);
                return;
            }
            window.location.assign(path);
        }

        const sensorStatusClass = computed(() => {
            if (sensors.value.length === 0) return 'neutral';
            const allOk = sensors.value.every(s => s.available);
            return allOk ? 'ok' : 'warn';
        });

        const sensorStatusText = computed(() => {
            if (sensors.value.length === 0) return '--';
            const ok = sensors.value.filter(s => s.available).length;
            return ok + '/' + sensors.value.length;
        });

        const driftStatusClass = computed(() => {
            const state = aiInfo.drift?.state;
            if (state === 'critical') return 'val-critical';
            if (state === 'warning' || state === 'recovering') return 'val-warn';
            return '';
        });

        const driftStatusText = computed(() => {
            const drift = aiInfo.drift;
            if (!drift) return '--';
            const driftKey = (k) => 'settings.drift.' + k;
            const knownStates = ['stable', 'warning', 'critical', 'recovering', 'unknown'];
            const state = knownStates.includes(drift.state)
                ? t(driftKey(drift.state))
                : (drift.state || t(driftKey('unknown')));
            const warningCount = drift.warning_count || 0;
            const criticalCount = drift.critical_count || 0;
            if (criticalCount > 0) return `${state} · ${criticalCount} ${t('settings.drift.criticalSuffix')}`;
            if (warningCount > 0) return `${state} · ${warningCount} ${t('settings.drift.warningsSuffix')}`;
            return state;
        });

        function toggle(section) {
            const wasPrice = openSection.value === 'price';
            openSection.value = openSection.value === section ? null : section;
            if (wasPrice && openSection.value !== 'price') abortGpmConfig(true);
            if (openSection.value === 'charging') loadChargingThresholds();
        }

        async function loadChargingThresholds() {
            try {
                const payload = await SFMLApi.fetch('/api/sfml_stats/smart_charging/dashboard', { forceRefresh: true, ttl: 0 });
                const live = payload && payload.live ? payload.live : null;
                const price = Number(live && live.max_price);
                if (Number.isFinite(price)) chargingInfo.max_price = price;
                if (live) {
                    chargingInfo.threshold_mode = live.threshold_mode || '';
                    chargingInfo.cheapest_hours = live.cheapest_hours ?? null;
                    chargingInfo.below_average_pct = live.below_average_pct ?? null;
                    chargingInfo.grid_kind = live.grid_kind || '';
                    chargingInfo.grid_allowed = live.grid_allowed ?? null;
                    if (live.reason) chargingInfo.reason = live.reason;
                    if (live.is_cheap != null) chargingInfo.is_cheap = live.is_cheap;
                }
            } catch (error) {
                console.error('Settings smart charging threshold error:', error);
            }
        }

        async function loadSettings() {
            try {
                const dashboard = await SFMLApi.fetch('/api/sfml_stats/settings/dashboard', { forceRefresh: true });

                if (dashboard) {
                    syncTimeContext(dashboard);
                    // System block
                    const sys = dashboard.system || {};
                    systemInfo.stats_version = sys.stats_version || '';
                    systemInfo.ml_version = sys.ml_version || '';
                    systemInfo.db_status = sys.db_status || '';
                    systemInfo.db_size = sys.db_size || '';
                    systemInfo.db_ok = sys.db_ok !== false;
                    systemInfo.healthy = sys.healthy !== false;
                    systemInfo.last_aggregation = sys.last_aggregation || '';
                    systemInfo.data_points = sys.data_points ?? null;

                    // AI block
                    const ai = dashboard.ai || {};
                    aiInfo.active_model = ai.active_model || null;
                    aiInfo.active_model_display = ai.active_model_display || (ai.active_model ? 'Hubble' : null);
                    aiInfo.version = ai.version || null;
                    aiInfo.accuracy_percent = ai.accuracy_percent ?? null;
                    aiInfo.rmse = ai.rmse ?? null;
                    aiInfo.training_samples = ai.training_samples ?? null;
                    aiInfo.last_trained = ai.last_trained || null;
                    aiInfo.drift = ai.drift || null;
                    aiInfo.coordinator = ai.coordinator || null;
                }

                if (dashboard) {
                    // Sensors
                    sensors.value = (dashboard.sensors || []).map(s => ({
                        entity_id: s.entity_id || '',
                        friendly_name: s.friendly_name || '',
                        state: s.state ?? null,
                        available: s.available !== false,
                    }));

                    // Configured consumers status
                    configuredConsumers.value = dashboard.configured_consumers || [];

                    // Price config
                    const pc = dashboard.price || {};
                    priceInfo.country = pc.country || props.config?.country || '';
                    priceInfo.vat = pc.vat ?? null;
                    priceInfo.mode = pc.mode || '';
                    priceInfo.mode_key = pc.mode_key || '';
                    priceInfo.energy_price_is_total = pc.energy_price_is_total === true;
                    priceInfo.energy_price = pc.energy_price ?? null;
                    priceInfo.grid_fees = pc.grid_fees ?? null;
                    priceInfo.base_fee = pc.base_fee ?? null;
                    priceInfo.feed_in_tariff = pc.feed_in_tariff ?? null;

                    // Smart charging
                    const sc = dashboard.smart_charging || {};
                    chargingInfo.enabled = sc.enabled || false;
                    chargingInfo.capacity = sc.capacity ?? null;
                    chargingInfo.min_soc = sc.min_soc ?? null;
                    chargingInfo.max_soc = sc.max_soc ?? null;
                    if (sc.max_price != null && Number.isFinite(Number(sc.max_price))) {
                        chargingInfo.max_price = Number(sc.max_price);
                    }
                    chargingInfo.soc_sensor = sc.soc_sensor ?? null;
                    chargingInfo.soc_sensor_configured = sc.soc_sensor_configured === true;
                    chargingInfo.current_soc = sc.current_soc ?? null;
                    chargingInfo.target_soc = sc.target_soc ?? null;
                    chargingInfo.active = sc.active;
                    chargingInfo.reason = sc.reason ?? null;
                    chargingInfo.is_cheap = sc.is_cheap;
                    chargingInfo.current_price = sc.current_price ?? null;

                    // Panel groups
                    panelGroups.value = (dashboard.panel_groups || []).map(pg => ({
                        name: pg.name || '',
                        azimuth: pg.azimuth ?? null,
                        tilt: pg.tilt ?? null,
                        kwp: pg.kwp ?? null,
                        factor: pg.factor ?? null,
                        confidence: pg.confidence ?? null,
                    }));
                }
            } catch (e) {
                console.error('Settings load error:', e);
            }
        }

        const getConsumerName = (key) => {
            const names = {
                heatpump: t('flow.consumer.heatpump') || 'Wärmepumpe',
                heatingrod: t('flow.consumer.heatingrod') || 'Heizstab',
                wallbox: t('flow.consumer.wallbox') || 'Wallbox',
            };
            return names[key] || key;
        };

        function exportFilename(response, option) {
            const disposition = response.headers.get('Content-Disposition') || '';
            const match = disposition.match(/filename="?([^";]+)"?/i);
            if (match && match[1]) return match[1];
            return `sfml_stats_${option.type}_${localDateKey()}.${option.extension}`;
        }

        async function exportDataset(option) {
            exportingType.value = option.type;
            try {
                const response = await fetch(`/api/sfml_stats/export/${encodeURIComponent(option.type)}`);
                if (!response.ok) throw new Error(`${t('settings.exports.failed')} (${response.status})`);
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = exportFilename(response, option);
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (e) {
                console.error('Export error:', e);
                window.alert(e?.message || t('settings.exports.failed'));
            } finally {
                exportingType.value = null;
            }
        }

        function applyGpmForm(payload, keepValues) {
            const previous = keepValues ? Object.assign({}, gpmForm.values) : null;
            gpmForm.open = true;
            gpmForm.flowId = payload.flow_id || '';
            gpmForm.stepId = payload.step_id || '';
            gpmForm.description = payload.description || '';
            gpmForm.fields = Array.isArray(payload.fields) ? payload.fields : [];
            gpmForm.errors = payload.errors && typeof payload.errors === 'object' ? payload.errors : {};
            const initial = sfmlGpmInitialValues(gpmForm.fields);
            if (previous) {
                gpmForm.fields.forEach((field) => {
                    if (field && previous[field.name] !== undefined) initial[field.name] = previous[field.name];
                });
            }
            gpmForm.values = initial;
        }

        async function loadGpmFeeHistory() {
            try {
                const payload = await SFMLApi.fetch('/api/sfml_stats/gpm/fee_history', {
                    forceRefresh: true,
                    ttl: 0,
                    authenticated: true,
                });
                const data = payload && typeof payload === 'object' ? payload : { available: false, rows: [] };
                gpmHistory.value = data;
                gpmUnavailable.value = data.available === false;
            } catch (_error) {
                gpmHistory.value = { available: false, rows: [] };
                gpmUnavailable.value = true;
            }
        }

        async function abortOpenGpmFlow(silent) {
            const flowId = gpmForm.flowId;
            gpmForm.open = false;
            gpmForm.busy = false;
            gpmForm.flowId = '';
            gpmForm.stepId = '';
            gpmForm.description = '';
            gpmForm.fields = [];
            gpmForm.errors = {};
            gpmForm.values = {};
            if (!flowId) return;
            try {
                await SFMLApi.postAuthenticated('/api/sfml_stats/gpm/config/cancel', { flow_id: flowId });
            } catch (_error) {
                if (!silent) {
                    gpmNotice.value = t('settings.gpmConfig.failed');
                    gpmNoticeOk.value = false;
                }
            }
        }

        async function abortGpmConfig(silent) {
            sfmlGpmBumpStartEpoch();
            await abortOpenGpmFlow(silent);
        }

        async function cancelGpmForm(silent) {
            await abortGpmConfig(silent);
        }

        async function discardStaleGpmStart(token, payload) {
            const flowId = payload && payload.flow_id;
            if (!flowId) return;
            try {
                await SFMLApi.postAuthenticated('/api/sfml_stats/gpm/config/cancel', { flow_id: flowId });
            } catch (_error) {
                /* orphan flow cleanup */
            }
        }

        async function openGpmStep(step) {
            if (!sfmlStatsIsAdmin()) return;
            gpmNotice.value = '';
            const startToken = sfmlGpmBumpStartEpoch();
            await abortOpenGpmFlow(true);
            gpmForm.busy = true;
            try {
                const payload = await SFMLApi.postAuthenticated('/api/sfml_stats/gpm/config/start', { step: step });
                if (!sfmlGpmStartEpochCurrent(startToken)) {
                    await discardStaleGpmStart(startToken, payload);
                    return;
                }
                if (!payload || payload.available === false) {
                    gpmUnavailable.value = true;
                    gpmForm.open = false;
                    return;
                }
                gpmUnavailable.value = false;
                applyGpmForm(payload, false);
            } catch (_error) {
                if (sfmlGpmStartEpochCurrent(startToken)) {
                    gpmNotice.value = t('settings.gpmConfig.failed');
                    gpmNoticeOk.value = false;
                }
            } finally {
                if (sfmlGpmStartEpochCurrent(startToken)) gpmForm.busy = false;
            }
        }

        async function submitGpmForm() {
            const data = sfmlGpmSubmitData(gpmForm.fields, gpmForm.values);
            gpmForm.busy = true;
            gpmNotice.value = '';
            try {
                const payload = await SFMLApi.postAuthenticated('/api/sfml_stats/gpm/config/submit', {
                    flow_id: gpmForm.flowId,
                    data: data,
                });
                if (!payload || payload.available === false) {
                    gpmUnavailable.value = true;
                    gpmForm.open = false;
                    gpmForm.flowId = '';
                    return;
                }
                if (payload.type === 'done') {
                    gpmForm.open = false;
                    gpmForm.flowId = '';
                    gpmForm.fields = [];
                    gpmNotice.value = t('settings.gpmConfig.saved');
                    gpmNoticeOk.value = true;
                    await loadSettings();
                    await loadGpmFeeHistory();
                    return;
                }
                applyGpmForm(payload, true);
            } catch (_error) {
                gpmNotice.value = t('settings.gpmConfig.failed');
                gpmNoticeOk.value = false;
            } finally {
                gpmForm.busy = false;
            }
        }

        function gpmOriginLabel(origin) {
            if (origin == null || origin === '') return sfmlGpmBlank(origin);
            if (origin === 'manual') return t('settings.gpmConfig.originManual');
            if (origin === 'first_start') return t('settings.gpmConfig.originFirstStart');
            return String(origin);
        }

        function applySettingsHash() {
            if (sfmlSettingsSectionFromHash(window.location.hash) === 'price') {
                openSection.value = 'price';
            }
        }

        onMounted(() => {
            applySettingsHash();
            loadSettings();
            loadGpmFeeHistory();
            loadDevAccess();
            loadUpdateInfo();
            window.addEventListener('hashchange', applySettingsHash);
        });
        onUnmounted(() => {
            window.removeEventListener('hashchange', applySettingsHash);
            abortGpmConfig(true);
        });

        return {
            openSection, exportingType, isExporting, exportOptions,
            sensors, priceInfo, chargingInfo, panelGroups, systemInfo, aiInfo,
            devOn, devInstallHash, devInstallLabel, devInstallBlocked, devInstallTitle, devBadgeText, devBadgeClass,
            devToken, devMessage, devCopied,
            copyInstallHash, activateDevToken, clearDevToken,
            haConfigUrl, priceConfigUrl, sensorStatusClass, sensorStatusText, driftStatusClass, driftStatusText,
            gpmIsAdmin: sfmlStatsIsAdmin, gpmForm, gpmFieldViews, gpmHistoryRows, gpmUnavailable, gpmNotice, gpmNoticeOk,
            openGpmStep, submitGpmForm, cancelGpmForm, gpmBlank: sfmlGpmBlank, gpmOriginLabel,
            chargingBadgeText, chargingBadgeClass, chargingStatusText, chargingReasonText,
            chargingThresholdLabel, chargingThresholdValue, chargingPriceSuffix, chargingPriceClass,
            toggle, exportDataset, formatDate, formatValue, openHaLink, openIntegration,
            translateSensorLabel, translateSensorState,
            currentLocale, supportedLocales, localeName, changeLocale, changeTheme,
            configuredConsumers, getConsumerName,
            updateInfoEnabled, updateInfoAvailable, updateInfoKnown, updateInfoSaving,
            updateInfoCanWrite, updateInfoNotice, saveUpdateInfo,
            updateInfoDownloading, downloadUpdateInfoScript,
        };
    },
};

// Page-specific styles (injected once)
(function injectSettingsStyles() {
    if (document.getElementById('settings-page-styles')) return;
    const style = document.createElement('style');
    style.id = 'settings-page-styles';
    style.textContent = `
        .settings-accordion {
            display: flex;
            flex-direction: column;
            gap: var(--space-sm);
        }
        .accordion-section {
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-md);
            overflow: hidden;
            transition: all var(--transition-normal);
        }
        .accordion-section.open {
            border-color: var(--border-hover);
        }
        .accordion-header {
            width: 100%;
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            padding: var(--space-md) var(--space-lg);
            border: none;
            background: transparent;
            color: var(--text-primary);
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            transition: background var(--transition-fast);
        }
        .accordion-header:hover {
            background: var(--bg-card-hover);
        }
        .accordion-icon {
            font-size: 0.8rem;
            color: var(--text-muted);
            width: 16px;
            text-align: center;
        }
        .accordion-title {
            flex: 1;
            text-align: left;
        }
        .accordion-badge {
            font-size: 0.75rem;
            font-weight: 600;
            padding: 2px 10px;
            border-radius: 12px;
            font-family: var(--font-mono);
        }
        .accordion-badge.ok {
            background: color-mix(in srgb, var(--success, rgb(34, 197, 94)) 15%, transparent);
            color: var(--success);
            border: 1px solid color-mix(in srgb, var(--success, rgb(34, 197, 94)) 30%, transparent);
        }
        .accordion-badge.warn {
            background: color-mix(in srgb, var(--solar, rgb(234, 179, 8)) 15%, transparent);
            color: var(--warning);
            border: 1px solid color-mix(in srgb, var(--solar, rgb(234, 179, 8)) 30%, transparent);
        }
        .accordion-badge.neutral {
            background: rgba(255,255,255,0.06);
            color: var(--text-secondary);
            border: 1px solid var(--border-default);
        }
        .accordion-body {
            padding: 0 var(--space-lg) var(--space-lg);
        }
        .sensor-list {
            display: flex;
            flex-direction: column;
            gap: var(--space-xs);
            margin-bottom: var(--space-md);
        }
        .sensor-row {
            display: grid;
            grid-template-columns: 16px 1fr 1fr auto;
            align-items: center;
            gap: var(--space-sm);
            padding: var(--space-xs) var(--space-sm);
            border-radius: var(--radius-sm);
            transition: background var(--transition-fast);
        }
        .sensor-row:hover {
            background: rgba(255,255,255,0.03);
        }
        .sensor-status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }
        .sensor-status-dot.ok {
            background: var(--success);
            box-shadow: 0 0 4px var(--success);
        }
        .sensor-status-dot.warn {
            background: var(--warning);
            box-shadow: 0 0 4px var(--warning);
        }
        .sensor-name {
            font-size: 0.85rem;
            color: var(--text-primary);
        }
        .sensor-entity {
            font-size: 0.75rem;
            color: var(--text-muted);
            font-family: var(--font-mono);
        }
        .sensor-state {
            font-size: 0.85rem;
            font-family: var(--font-mono);
            color: var(--text-secondary);
            text-align: right;
        }
        .settings-link {
            display: inline-block;
            font-size: 0.85rem;
            color: var(--accent);
            text-decoration: none;
            padding: var(--space-xs) 0;
            transition: color var(--transition-fast);
        }
        .settings-link:hover {
            color: var(--text-primary);
            text-decoration: underline;
        }
        .settings-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: var(--space-sm) var(--space-lg);
            margin-bottom: var(--space-md);
        }
        .settings-item {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        .settings-item-label {
            font-size: 0.75rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .settings-item-value {
            font-size: 0.95rem;
            font-family: var(--font-mono);
            font-weight: 500;
            color: var(--text-primary);
        }
        .settings-language-picker {
            width: min(240px, 100%);
            margin-top: 2px;
        }
        .settings-item-value.val-warn {
            color: var(--warning);
        }
        .settings-item-value.val-critical {
            color: var(--danger);
        }
        .panel-group-card {
            background: rgba(255,255,255,0.03);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-sm);
            padding: var(--space-md);
            margin-bottom: var(--space-sm);
        }
        .panel-group-header {
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--solar);
            margin-bottom: var(--space-sm);
        }
        .export-btn {
            display: inline-flex;
            align-items: center;
            gap: var(--space-sm);
            padding: var(--space-sm) var(--space-lg);
            border: 1px solid var(--accent);
            border-radius: var(--radius-md);
            background: color-mix(in srgb, var(--accent, rgb(0, 212, 255)) 8%, transparent);
            color: var(--accent);
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            transition: all var(--transition-fast);
        }
        .export-btn:hover:not(:disabled) {
            background: color-mix(in srgb, var(--accent, rgb(0, 212, 255)) 18%, transparent);
        }
        .export-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .export-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: var(--space-sm);
        }
        .export-option {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--space-sm);
            min-height: 44px;
            padding: var(--space-sm) var(--space-md);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-sm);
            background: rgba(255,255,255,0.03);
            color: var(--text-primary);
            cursor: pointer;
            transition: border-color var(--transition-fast), background var(--transition-fast);
        }
        .export-option:hover:not(:disabled) {
            border-color: var(--accent);
            background: color-mix(in srgb, var(--accent, rgb(0, 212, 255)) 8%, transparent);
        }
        .export-option:disabled {
            opacity: 0.55;
            cursor: not-allowed;
        }
        .export-option-title {
            min-width: 0;
            font-size: 0.85rem;
            font-weight: 600;
            text-align: left;
        }
        .export-option-format {
            flex: 0 0 auto;
            font: 700 0.75rem var(--font-mono);
            color: var(--accent);
        }
        .empty-state {
            text-align: center;
            color: var(--text-muted);
            padding: var(--space-lg);
            font-size: 0.9rem;
        }
        .missing-helpers-section {
            margin-top: var(--space-md);
            padding: var(--space-md);
            border-top: 1px solid var(--border-default);
            background: rgba(255, 255, 255, 0.02);
            border-radius: var(--radius-md);
        }
        .missing-helpers-title {
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--warning);
            margin-bottom: var(--space-sm);
        }
        .missing-helper-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--space-md);
            padding: var(--space-sm) 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .missing-helper-row:last-child {
            border-bottom: none;
        }
        .helper-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        .helper-info .helper-name {
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--text-primary);
        }
        .helper-info .helper-desc {
            font-size: 0.75rem;
            color: var(--text-muted);
        }
        .create-helper-btn {
            padding: 6px 12px;
            background: color-mix(in srgb, var(--solar, rgb(234, 179, 8)) 10%, transparent);
            border: 1px solid var(--warning);
            color: var(--warning);
            border-radius: var(--radius-sm);
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            transition: all var(--transition-fast);
        }
        .create-helper-btn:hover:not(:disabled) {
            background: color-mix(in srgb, var(--solar, rgb(234, 179, 8)) 20%, transparent);
            color: var(--text-primary);
        }
        .create-helper-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .helper-status-msg {
            margin-top: var(--space-sm);
            padding: 8px var(--space-md);
            border-radius: var(--radius-sm);
            font-size: 0.8rem;
            text-align: center;
        }
        .helper-status-msg.success {
            background: color-mix(in srgb, var(--success, rgb(34, 197, 94)) 10%, transparent);
            color: var(--success);
            border: 1px solid color-mix(in srgb, var(--success, rgb(34, 197, 94)) 20%, transparent);
        }
        .helper-status-msg.error {
            background: color-mix(in srgb, var(--danger, rgb(239, 68, 68)) 10%, transparent);
            color: var(--danger);
            border: 1px solid color-mix(in srgb, var(--danger, rgb(239, 68, 68)) 20%, transparent);
        }

        @media (max-width: 768px) {
            .sensor-row {
                grid-template-columns: 16px 1fr auto;
            }
            .sensor-entity {
                display: none;
            }
            .settings-grid {
                grid-template-columns: 1fr 1fr;
            }
        }

        /* Light theme overrides for transparent layers */
        [data-theme="light"] .accordion-badge.neutral { background: rgba(15, 23, 42, 0.03); }
        [data-theme="light"] .sensor-row:hover { background: rgba(15, 23, 42, 0.02); }
        [data-theme="light"] .panel-group-card { background: rgba(15, 23, 42, 0.015); }
        .dev-access-grid {
            grid-template-columns: 1fr;
        }
        .dev-install-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--space-sm);
        }
        .dev-install-row .settings-item-value {
            min-width: 0;
            overflow-wrap: anywhere;
        }
        .dev-token-input {
            width: 100%;
            box-sizing: border-box;
            min-height: 36px;
            margin-top: 4px;
            padding: 7px 10px;
            border: 1px solid var(--border-default);
            border-radius: var(--radius-md);
            background: var(--bg-elevated, var(--bg-card));
            color: var(--text-primary);
            font-family: var(--font-mono);
        }
        .dev-token-input:disabled,
        .dev-access-actions .button:disabled {
            opacity: 0.55;
            cursor: not-allowed;
        }
        .dev-access-actions {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-sm);
        }
        .dev-access-actions .button {
            width: auto;
        }
        .dev-access-actions .button.primary {
            background: var(--accent);
            color: #041018;
            border-color: transparent;
        }
        [data-theme="light"] .dev-access-actions .button.primary {
            color: #ffffff;
        }
        .dev-access-hint,
        .dev-access-status {
            margin: var(--space-sm) 0 0;
            color: var(--text-secondary);
            font-size: 0.8rem;
            line-height: 1.45;
        }
        [data-theme="light"] .dev-token-input {
            background: var(--bg-card);
            color: var(--text-primary);
        }
        [data-theme="light"] .missing-helpers-section { background: rgba(15, 23, 42, 0.015); }
        .update-info-text {
            margin: 0 0 var(--space-sm);
            color: var(--text-secondary);
            font-size: 0.85rem;
            line-height: 1.5;
        }
        .update-info-text a {
            color: var(--accent, var(--text-primary));
        }
        .update-info-download {
            margin: 0 0 var(--space-md, 12px);
        }
        .update-info-ask {
            color: var(--text-primary);
            font-weight: 600;
        }
        .update-info-switch {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            margin-top: var(--space-sm);
        }
        .gpm-config-actions {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-sm);
            margin-top: var(--space-md);
        }
        .gpm-config-form {
            display: flex;
            flex-direction: column;
            gap: var(--space-sm);
            margin-top: var(--space-md);
        }
        .gpm-config-field,
        .gpm-config-number {
            display: flex;
            flex-direction: column;
            gap: 4px;
            font-size: 0.85rem;
        }
        .gpm-config-number {
            flex-direction: row;
            align-items: center;
        }
        .gpm-config-multi {
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
        }
        .gpm-config-multi-item {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            font-weight: normal;
        }
        .gpm-config-field input,
        .gpm-config-field select {
            min-height: 36px;
            padding: 6px 8px;
            border: 1px solid var(--border-default);
            border-radius: var(--radius-sm);
            background: var(--bg-card);
            color: var(--text-primary);
        }
        .gpm-config-help,
        .gpm-config-hint,
        .gpm-config-notice {
            margin-top: var(--space-sm);
            color: var(--text-muted);
            font-size: 0.85rem;
        }
        .gpm-config-error {
            color: var(--danger, #ef4444);
            font-size: 0.8rem;
        }
        .gpm-config-notice.ok {
            color: var(--success, #22c55e);
        }
        .gpm-history-title {
            margin: var(--space-md) 0 var(--space-sm);
            font-size: 0.95rem;
        }
        .gpm-fee-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: var(--space-sm);
            font-size: 0.85rem;
        }
        .gpm-fee-table th,
        .gpm-fee-table td {
            text-align: left;
            padding: 6px 8px;
            border-bottom: 1px solid var(--border-default);
        }
        .gpm-fee-current {
            background: color-mix(in srgb, var(--accent, rgb(0, 212, 255)) 12%, transparent);
            font-weight: 600;
        }
    `;
    document.head.appendChild(style);
})();

window.SettingsPage = SettingsPage;
