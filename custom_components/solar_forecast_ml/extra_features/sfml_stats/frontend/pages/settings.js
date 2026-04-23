// Solar Command Center — Settings Page
// (C) 2026 Zara-Toorox

const SettingsPage = {
    props: ['liveData', 'config'],

    template: `
        <div class="page page-settings">
            <div class="section-header">
                <span class="section-title">Einstellungen</span>
            </div>

            <!-- Accordion: Sensors -->
            <div class="settings-accordion">
                <div class="accordion-section" :class="{ open: openSection === 'sensors' }">
                    <button class="accordion-header" @click="toggle('sensors')">
                        <span class="accordion-icon">{{ openSection === 'sensors' ? '\u25BE' : '\u25B8' }}</span>
                        <span class="accordion-title">Sensoren</span>
                        <span class="accordion-badge" :class="sensorStatusClass">{{ sensorStatusText }}</span>
                    </button>
                    <div class="accordion-body" v-show="openSection === 'sensors'">
                        <div class="sensor-list">
                            <div v-for="s in sensors" :key="s.entity_id" class="sensor-row">
                                <span class="sensor-status-dot" :class="s.available ? 'ok' : 'warn'"></span>
                                <span class="sensor-name">{{ s.friendly_name || s.entity_id }}</span>
                                <span class="sensor-entity">{{ s.entity_id }}</span>
                                <span class="sensor-state">{{ s.state ?? '--' }}</span>
                            </div>
                            <div v-if="sensors.length === 0" class="empty-state">Keine Sensoren konfiguriert</div>
                        </div>
                        <a class="settings-link" :href="haConfigUrl" target="_blank" rel="noopener">
                            Sensoren ueber HA konfigurieren &rarr;
                        </a>
                    </div>
                </div>

                <!-- Accordion: Electricity Price -->
                <div class="accordion-section" :class="{ open: openSection === 'price' }">
                    <button class="accordion-header" @click="toggle('price')">
                        <span class="accordion-icon">{{ openSection === 'price' ? '\u25BE' : '\u25B8' }}</span>
                        <span class="accordion-title">Strompreis</span>
                        <span class="accordion-badge neutral">{{ priceInfo.mode || '--' }}</span>
                    </button>
                    <div class="accordion-body" v-show="openSection === 'price'">
                        <div class="settings-grid">
                            <div class="settings-item">
                                <span class="settings-item-label">Land</span>
                                <span class="settings-item-value">{{ priceInfo.country || '--' }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">MwSt</span>
                                <span class="settings-item-value">{{ priceInfo.vat != null ? priceInfo.vat + '%' : '--' }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">Modus</span>
                                <span class="settings-item-value">{{ priceInfo.mode || '--' }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">Arbeitspreis</span>
                                <span class="settings-item-value">{{ priceInfo.energy_price != null ? priceInfo.energy_price.toFixed(2) + ' ct/kWh' : '--' }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">Netzentgelte</span>
                                <span class="settings-item-value">{{ priceInfo.grid_fees != null ? priceInfo.grid_fees.toFixed(2) + ' ct/kWh' : '--' }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">Grundgebuehr</span>
                                <span class="settings-item-value">{{ priceInfo.base_fee != null ? priceInfo.base_fee.toFixed(2) + ' EUR/Monat' : '--' }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">Einspeiseverguetung</span>
                                <span class="settings-item-value">{{ priceInfo.feed_in_tariff != null ? priceInfo.feed_in_tariff.toFixed(2) + ' ct/kWh' : '--' }}</span>
                            </div>
                        </div>
                        <a class="settings-link" :href="haConfigUrl" target="_blank" rel="noopener">
                            Preis ueber HA konfigurieren &rarr;
                        </a>
                    </div>
                </div>

                <!-- Accordion: Smart Charging -->
                <div class="accordion-section" :class="{ open: openSection === 'charging' }">
                    <button class="accordion-header" @click="toggle('charging')">
                        <span class="accordion-icon">{{ openSection === 'charging' ? '\u25BE' : '\u25B8' }}</span>
                        <span class="accordion-title">Smart Charging</span>
                        <span class="accordion-badge" :class="chargingBadgeClass">{{ chargingBadgeText }}</span>
                    </button>
                    <div class="accordion-body" v-show="openSection === 'charging'">
                        <div v-if="!chargingInfo.enabled" class="empty-state">
                            <div>Smart Charging ist deaktiviert.</div>
                            <div style="margin-top:6px;">Integration oeffnen &rarr; <b>Konfigurieren</b> &rarr; <b>Smart Charging</b>.</div>
                            <button class="export-btn" style="margin-top:var(--space-sm);" @click="openIntegration">Integration oeffnen</button>
                        </div>
                        <div v-else>
                            <div class="settings-grid">
                                <div class="settings-item">
                                    <span class="settings-item-label">Status</span>
                                    <span class="settings-item-value" :class="chargingInfo.active ? 'val-ok' : ''">{{ chargingStatusText }}</span>
                                </div>
                                <div class="settings-item">
                                    <span class="settings-item-label">Preis-Schwelle</span>
                                    <span class="settings-item-value">{{ chargingInfo.max_price != null ? chargingInfo.max_price.toFixed(1) + ' ct/kWh' : '--' }}</span>
                                </div>
                                <div class="settings-item">
                                    <span class="settings-item-label">Aktueller Preis</span>
                                    <span class="settings-item-value" :class="chargingInfo.is_cheap === true ? 'val-ok' : chargingInfo.is_cheap === false ? 'val-warn' : ''">{{ chargingInfo.current_price != null ? chargingInfo.current_price.toFixed(2) + ' ct/kWh' : '--' }}{{ chargingInfo.is_cheap === true ? ' (guenstig)' : chargingInfo.is_cheap === false ? ' (zu hoch)' : '' }}</span>
                                </div>
                                <div class="settings-item">
                                    <span class="settings-item-label">Batterie-Kapazitaet</span>
                                    <span class="settings-item-value">{{ chargingInfo.capacity != null ? chargingInfo.capacity + ' kWh' : '--' }}</span>
                                </div>
                                <div class="settings-item">
                                    <span class="settings-item-label">Min SOC</span>
                                    <span class="settings-item-value">{{ chargingInfo.min_soc != null ? chargingInfo.min_soc + '%' : '--' }}</span>
                                </div>
                                <div class="settings-item">
                                    <span class="settings-item-label">Max SOC</span>
                                    <span class="settings-item-value">{{ chargingInfo.max_soc != null ? chargingInfo.max_soc + '%' : '--' }}</span>
                                </div>
                                <div class="settings-item">
                                    <span class="settings-item-label">Aktueller SOC</span>
                                    <span class="settings-item-value">{{ chargingInfo.current_soc != null ? chargingInfo.current_soc.toFixed(1) + '%' : '--' }}</span>
                                </div>
                                <div class="settings-item">
                                    <span class="settings-item-label">Ziel-SOC (berechnet)</span>
                                    <span class="settings-item-value">{{ chargingInfo.target_soc != null ? chargingInfo.target_soc.toFixed(1) + '%' : '--' }}</span>
                                </div>
                                <div class="settings-item" style="grid-column: 1 / -1;">
                                    <span class="settings-item-label">Entscheidung</span>
                                    <span class="settings-item-value">{{ chargingReasonText }}</span>
                                </div>
                            </div>
                            <div v-if="!chargingInfo.soc_sensor_configured" class="empty-state" style="margin-top:var(--space-sm);">
                                Kein SOC-Sensor konfiguriert &mdash; die Logik laeuft im Preis-Fallback.
                                <button class="export-btn" style="margin-top:var(--space-sm);" @click="openIntegration">Integration oeffnen</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Accordion: Panel Groups -->
                <div class="accordion-section" :class="{ open: openSection === 'panels' }">
                    <button class="accordion-header" @click="toggle('panels')">
                        <span class="accordion-icon">{{ openSection === 'panels' ? '\u25BE' : '\u25B8' }}</span>
                        <span class="accordion-title">Panel-Gruppen</span>
                        <span class="accordion-badge neutral">{{ panelGroups.length }} Gruppen</span>
                    </button>
                    <div class="accordion-body" v-show="openSection === 'panels'">
                        <div v-for="(pg, idx) in panelGroups" :key="idx" class="panel-group-card">
                            <div class="panel-group-header">Gruppe {{ idx + 1 }}: {{ pg.name || 'Panel ' + (idx + 1) }}</div>
                            <div class="settings-grid">
                                <div class="settings-item">
                                    <span class="settings-item-label">Azimut</span>
                                    <span class="settings-item-value">{{ pg.azimuth }}deg</span>
                                </div>
                                <div class="settings-item">
                                    <span class="settings-item-label">Neigung</span>
                                    <span class="settings-item-value">{{ pg.tilt }}deg</span>
                                </div>
                                <div class="settings-item">
                                    <span class="settings-item-label">Leistung</span>
                                    <span class="settings-item-value">{{ pg.kwp }} kWp</span>
                                </div>
                                <div class="settings-item">
                                    <span class="settings-item-label">Module</span>
                                    <span class="settings-item-value">{{ pg.module_count || '--' }}</span>
                                </div>
                                <div class="settings-item" v-if="pg.factor != null">
                                    <span class="settings-item-label">Physics-Faktor</span>
                                    <span class="settings-item-value">{{ pg.factor.toFixed(3) }}</span>
                                </div>
                                <div class="settings-item" v-if="pg.confidence != null">
                                    <span class="settings-item-label">Confidence</span>
                                    <span class="settings-item-value">{{ (pg.confidence * 100).toFixed(0) }}%</span>
                                </div>
                            </div>
                        </div>
                        <div v-if="panelGroups.length === 0" class="empty-state">Keine Panel-Gruppen konfiguriert</div>
                    </div>
                </div>

                <!-- Accordion: Hubble AI -->
                <div class="accordion-section" :class="{ open: openSection === 'ai' }">
                    <button class="accordion-header" @click="toggle('ai')">
                        <span class="accordion-icon">{{ openSection === 'ai' ? '\u25BE' : '\u25B8' }}</span>
                        <span class="accordion-title">Hubble AI</span>
                        <span class="accordion-badge" :class="aiInfo.active_model ? 'ok' : 'neutral'">{{ aiInfo.active_model || '--' }}</span>
                    </button>
                    <div class="accordion-body" v-show="openSection === 'ai'">
                        <div class="settings-grid">
                            <div class="settings-item">
                                <span class="settings-item-label">Aktives Modell</span>
                                <span class="settings-item-value">{{ aiInfo.active_model || '--' }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">Stack-Version</span>
                                <span class="settings-item-value">{{ aiInfo.version || '--' }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">Genauigkeit</span>
                                <span class="settings-item-value">{{ aiInfo.accuracy_percent != null ? aiInfo.accuracy_percent.toFixed(1) + ' %' : '--' }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">RMSE</span>
                                <span class="settings-item-value">{{ aiInfo.rmse != null ? aiInfo.rmse.toFixed(4) : '--' }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">Trainings-Samples</span>
                                <span class="settings-item-value">{{ aiInfo.training_samples != null ? aiInfo.training_samples.toLocaleString() : '--' }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">Letztes Training</span>
                                <span class="settings-item-value">{{ formatDate(aiInfo.last_trained) }}</span>
                            </div>
                            <div v-if="aiInfo.lstm" class="settings-item">
                                <span class="settings-item-label">LSTM-Architektur</span>
                                <span class="settings-item-value">{{ aiInfo.lstm.input_size }}&times;{{ aiInfo.lstm.hidden_size }} &middot; seq={{ aiInfo.lstm.sequence_length }} &middot; {{ aiInfo.lstm.num_layers }}L / {{ aiInfo.lstm.num_heads }}H{{ aiInfo.lstm.has_attention ? ' + Attention' : '' }}</span>
                            </div>
                            <div v-if="aiInfo.ridge" class="settings-item">
                                <span class="settings-item-label">Ridge &alpha; / LOO-CV</span>
                                <span class="settings-item-value">{{ aiInfo.ridge.alpha }} &middot; {{ aiInfo.ridge.loo_cv_score != null ? aiInfo.ridge.loo_cv_score.toFixed(4) : '--' }}</span>
                            </div>
                            <div v-if="aiInfo.coordinator" class="settings-item">
                                <span class="settings-item-label">Erwartete Produktion heute</span>
                                <span class="settings-item-value">{{ aiInfo.coordinator.expected_kwh_today != null ? aiInfo.coordinator.expected_kwh_today.toFixed(2) + ' kWh' : '--' }}</span>
                            </div>
                            <div v-if="aiInfo.drift" class="settings-item">
                                <span class="settings-item-label">Drift-Events</span>
                                <span class="settings-item-value" :class="aiInfo.drift.critical_count > 0 ? 'val-warn' : ''">{{ aiInfo.drift.total_events }} gesamt &middot; {{ aiInfo.drift.critical_count }} kritisch</span>
                            </div>
                        </div>
                        <div v-if="aiInfo.physics_groups && aiInfo.physics_groups.length" class="ai-physics">
                            <div class="ai-physics-title">Physics Calibrator</div>
                            <div class="ai-physics-grid">
                                <div v-for="pg in aiInfo.physics_groups" :key="pg.group" class="ai-physics-item">
                                    <span class="ai-physics-name">{{ pg.group }}</span>
                                    <span class="ai-physics-factor">{{ pg.factor.toFixed(3) }}&times;</span>
                                    <span class="ai-physics-meta">{{ pg.samples }} samples &middot; conf {{ (pg.confidence * 100).toFixed(0) }}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Accordion: System -->
                <div class="accordion-section" :class="{ open: openSection === 'system' }">
                    <button class="accordion-header" @click="toggle('system')">
                        <span class="accordion-icon">{{ openSection === 'system' ? '\u25BE' : '\u25B8' }}</span>
                        <span class="accordion-title">System</span>
                        <span class="accordion-badge" :class="systemInfo.healthy ? 'ok' : 'warn'">{{ systemInfo.healthy ? 'OK' : 'Warnung' }}</span>
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
                                <span class="settings-item-label">Datenbank</span>
                                <span class="settings-item-value" :class="systemInfo.db_ok ? '' : 'val-warn'">{{ systemInfo.db_status || '--' }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">DB Groesse</span>
                                <span class="settings-item-value">{{ systemInfo.db_size || '--' }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">Letzte Aggregation</span>
                                <span class="settings-item-value">{{ formatDate(systemInfo.last_aggregation) }}</span>
                            </div>
                            <div class="settings-item">
                                <span class="settings-item-label">Datenpunkte</span>
                                <span class="settings-item-value">{{ systemInfo.data_points != null ? systemInfo.data_points.toLocaleString() : '--' }}</span>
                            </div>
                        </div>
                        <button class="export-btn" @click="exportCsv" :disabled="exporting">
                            {{ exporting ? 'Exportiere...' : 'CSV Export' }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `,

    setup(props) {
        const { ref: vRef, reactive, computed, onMounted } = Vue;

        const openSection = vRef('sensors');
        const exporting = vRef(false);

        const sensors = vRef([]);
        const priceInfo = reactive({ country: '', vat: null, mode: '', energy_price: null, grid_fees: null, base_fee: null, feed_in_tariff: null });
        const chargingInfo = reactive({
            enabled: false, capacity: null, min_soc: null, max_soc: null,
            max_price: null, soc_sensor: null, soc_sensor_configured: false,
            current_soc: null, target_soc: null, active: null, reason: null,
            is_cheap: null, current_price: null,
        });

        const REASON_LABELS = {
            price_too_high: 'Strompreis ueber Schwelle — kein Netzladen',
            soc_unavailable_fallback: 'SOC-Sensor fehlt — Preis-Fallback aktiv',
            soc_below_target: 'SOC unter Ziel — Netzladen empfohlen',
            soc_reached_solar_expected: 'SOC-Ziel erreicht — Solar fuellt den Rest',
            soc_reached_target: 'SOC-Ziel erreicht — Laden gestoppt',
        };

        const chargingBadgeText = computed(() => {
            if (!chargingInfo.enabled) return 'Inaktiv';
            return chargingInfo.active === true ? 'Laedt' : 'Bereit';
        });

        const chargingBadgeClass = computed(() => {
            if (!chargingInfo.enabled) return 'neutral';
            return chargingInfo.active === true ? 'ok' : 'neutral';
        });

        const chargingStatusText = computed(() => {
            if (chargingInfo.active === true) return 'Netzladen AKTIV';
            if (chargingInfo.active === false) return 'Netzladen gestoppt';
            return 'Wartet auf Daten';
        });

        const chargingReasonText = computed(() => {
            if (!chargingInfo.reason) return '--';
            return REASON_LABELS[chargingInfo.reason] || chargingInfo.reason;
        });
        const panelGroups = vRef([]);
        const systemInfo = reactive({ stats_version: '', ml_version: '', db_status: '', db_size: '', db_ok: true, healthy: true, last_aggregation: '', data_points: null });
        const aiInfo = reactive({ active_model: null, version: null, accuracy_percent: null, rmse: null, training_samples: null, last_trained: null, lstm: null, ridge: null, physics_groups: [], drift: null, coordinator: null });

        function formatDate(ts) {
            if (!ts) return '--';
            try {
                const d = new Date(ts);
                if (isNaN(d.getTime())) return String(ts);
                return d.toLocaleString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            } catch (e) { return String(ts); }
        }

        const haConfigUrl = computed(() => {
            return '/config/integrations/integration/sfml_stats';
        });

        function openIntegration() {
            // Open in a new tab: the SFML dashboard runs unauthenticated,
            // so navigating top-level to /config/... hits HA's auth flow
            // and looks like nothing happens. New tab preserves state.
            const url = (window.location.origin || '') + haConfigUrl.value;
            const win = window.open(url, '_blank', 'noopener');
            if (!win) {
                // Popup blocker kicked in — fall back to top-level navigation
                window.location.href = url;
            }
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

        function toggle(section) {
            openSection.value = openSection.value === section ? null : section;
        }

        async function loadSettings() {
            try {
                const dashboard = await SFMLApi.fetch('/api/sfml_stats/settings/dashboard', { forceRefresh: true });

                if (dashboard) {
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
                    aiInfo.version = ai.version || null;
                    aiInfo.accuracy_percent = ai.accuracy_percent ?? null;
                    aiInfo.rmse = ai.rmse ?? null;
                    aiInfo.training_samples = ai.training_samples ?? null;
                    aiInfo.last_trained = ai.last_trained || null;
                    aiInfo.lstm = ai.lstm || null;
                    aiInfo.ridge = ai.ridge || null;
                    aiInfo.physics_groups = ai.physics_groups || [];
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

                    // Price config
                    const pc = dashboard.price || {};
                    priceInfo.country = pc.country || props.config?.country || '';
                    priceInfo.vat = pc.vat ?? null;
                    priceInfo.mode = pc.mode || '';
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
                    chargingInfo.max_price = sc.max_price ?? null;
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
                        azimuth: pg.azimuth ?? 0,
                        tilt: pg.tilt ?? 0,
                        kwp: pg.kwp ?? 0,
                        module_count: pg.module_count ?? null,
                    }));
                }
            } catch (e) {
                console.error('Settings load error:', e);
            }
        }

        async function exportCsv() {
            exporting.value = true;
            try {
                const response = await fetch('/api/sfml_stats/export/csv');
                if (!response.ok) throw new Error('Export failed');
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'sfml_stats_export_' + new Date().toISOString().slice(0, 10) + '.csv';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (e) {
                console.error('CSV export error:', e);
            } finally {
                exporting.value = false;
            }
        }

        onMounted(() => {
            loadSettings();
        });

        return {
            openSection, exporting,
            sensors, priceInfo, chargingInfo, panelGroups, systemInfo, aiInfo,
            haConfigUrl, sensorStatusClass, sensorStatusText,
            chargingBadgeText, chargingBadgeClass, chargingStatusText, chargingReasonText,
            toggle, exportCsv, formatDate, openIntegration,
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
            background: rgba(34,197,94,0.15);
            color: var(--success);
            border: 1px solid rgba(34,197,94,0.3);
        }
        .accordion-badge.warn {
            background: rgba(234,179,8,0.15);
            color: var(--warning);
            border: 1px solid rgba(234,179,8,0.3);
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
            font-size: 0.7rem;
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
        .settings-item-value.val-warn {
            color: var(--warning);
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
            background: rgba(0,212,255,0.08);
            color: var(--accent);
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            transition: all var(--transition-fast);
        }
        .export-btn:hover:not(:disabled) {
            background: rgba(0,212,255,0.18);
        }
        .export-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .empty-state {
            text-align: center;
            color: var(--text-muted);
            padding: var(--space-lg);
            font-size: 0.9rem;
        }
        .ai-physics {
            margin-top: var(--space-md);
            padding-top: var(--space-md);
            border-top: 1px solid rgba(255,255,255,0.06);
        }
        .ai-physics-title {
            font-size: 0.85rem;
            color: var(--text-muted);
            margin-bottom: var(--space-sm);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .ai-physics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: var(--space-sm);
        }
        .ai-physics-item {
            display: grid;
            grid-template-columns: auto auto;
            gap: 2px var(--space-sm);
            padding: var(--space-sm);
            background: rgba(255,255,255,0.03);
            border-radius: 6px;
        }
        .ai-physics-name {
            font-weight: 600;
            color: var(--text);
        }
        .ai-physics-factor {
            text-align: right;
            color: var(--accent);
            font-variant-numeric: tabular-nums;
        }
        .ai-physics-meta {
            grid-column: 1 / -1;
            font-size: 0.75rem;
            color: var(--text-muted);
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
    `;
    document.head.appendChild(style);
})();

window.SettingsPage = SettingsPage;
