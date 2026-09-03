const EMS_BRIDGE_PROTOCOL = "sfml-ems-bridge-v1";
const EMS_BRIDGE_PATH = "/sfml-stats-ems-bridge";
const EMS_REQUEST_LIMIT = 4096;
const EMS_RESPONSE_LIMIT = 1024 * 1024;
const EMS_OPERATIONS = new Set(["snapshot", "setMode", "setActor", "confirm"]);

const emsRandomId = () => {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID().replaceAll("-", "");
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
};

const emsMessageSize = (value) => new TextEncoder().encode(JSON.stringify(value)).byteLength;

const emsParentHass = (hostWindow) => {
    const origin = hostWindow.location.origin;
    let current = hostWindow;
    while (current.parent && current.parent !== current) {
        const parent = current.parent;
        try {
            if (parent.location.origin !== origin) return null;
            const hass = parent.document.querySelector("home-assistant")?.hass;
            if (hass && typeof hass.callApi === "function") return hass;
        } catch (_error) {
            return null;
        }
        current = parent;
    }
    return null;
};

const emsApiOperation = (operation, payload) => {
    if (operation === "snapshot") return { method: "GET", path: "snapshot", payload: undefined };
    if (operation === "setMode") return { method: "POST", path: "mode", payload };
    if (operation === "setActor") return { method: "POST", path: "actor", payload };
    if (operation === "confirm") return { method: "POST", path: "confirm", payload };
    throw new Error("Nicht unterstützte EMS-Operation");
};

class EMSBridgeClient {
    constructor(hostWindow = window) {
        this.hostWindow = hostWindow;
        this.origin = hostWindow.location.origin;
        this.iframe = null;
        this.pending = new Map();
        this.nonce = emsRandomId();
        this.initialized = false;
        this.destroyed = false;
        this.hass = null;
        this.onMessage = (event) => this.handleMessage(event);
        this.ready = new Promise((resolve, reject) => {
            this._resolveReady = resolve;
            this._rejectReady = reject;
        });
    }

    mount(host) {
        if (this.destroyed || !host || this.iframe) return;
        this.hass = emsParentHass(this.hostWindow);
        if (this.hass?.callApi) {
            this.initialized = true;
            this._resolveReady();
            return;
        }
        const iframe = document.createElement("iframe");
        iframe.className = "ems-bridge-frame";
        iframe.title = "Authentifizierte Home-Assistant-Verbindung";
        iframe.setAttribute("aria-hidden", "true");
        iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
        iframe.tabIndex = -1;
        host.appendChild(iframe);
        this.iframe = iframe;
        this.hostWindow.addEventListener("message", this.onMessage);
        iframe.src = EMS_BRIDGE_PATH;
        this.readyTimer = this.hostWindow.setTimeout(() => {
            this._rejectReady(new Error("EMS-Brücke antwortet nicht"));
        }, 10000);
    }

    handleMessage(event) {
        const accepted = event.source === this.iframe?.contentWindow
            && event.origin === this.origin
            && event.data?.protocol === EMS_BRIDGE_PROTOCOL;
        if (!accepted || this.destroyed) return;
        try { if (emsMessageSize(event.data) > EMS_RESPONSE_LIMIT) return; } catch (_error) { return; }
        const message = event.data;
        if (message.type === "READY" && !this.initialized) {
            this.iframe.contentWindow.postMessage({
                protocol: EMS_BRIDGE_PROTOCOL,
                type: "INIT",
                nonce: this.nonce,
            }, this.origin);
            return;
        }
        if (message.type === "INITIALIZED" && message.nonce === this.nonce && !this.initialized) {
            this.initialized = true;
            this.hostWindow.clearTimeout(this.readyTimer);
            this._resolveReady();
            return;
        }
        if (message.type !== "RESPONSE" || message.nonce !== this.nonce) return;
        const pending = this.pending.get(message.requestId);
        if (!pending) return;
        this.pending.delete(message.requestId);
        this.hostWindow.clearTimeout(pending.timer);
        if (message.success === true) pending.resolve(message.data);
        else {
            const error = new Error(String(message.error?.message || "EMS-Anfrage fehlgeschlagen"));
            pending.reject(error);
        }
    }

    async request(operation, payload = {}) {
        if (this.destroyed || !EMS_OPERATIONS.has(operation)) throw new Error("EMS-Verbindung nicht verfügbar");
        if (emsMessageSize(payload) > EMS_REQUEST_LIMIT) throw new Error("EMS-Anfrage überschreitet 4 KiB");
        await this.ready;
        if (this.destroyed) throw new Error("EMS-Verbindung wurde geschlossen");
        const request = emsApiOperation(operation, payload);
        if (this.hass?.callApi) {
            return this.hass.callApi(request.method, `sfml_stats/ems/${request.path}`, request.payload);
        }
        const requestId = emsRandomId();
        return new Promise((resolve, reject) => {
            const timer = this.hostWindow.setTimeout(() => {
                this.pending.delete(requestId);
                reject(new Error("EMS-Anfrage hat das Zeitlimit überschritten"));
            }, 15000);
            this.pending.set(requestId, { resolve, reject, timer });
            this.iframe.contentWindow.postMessage({
                protocol: EMS_BRIDGE_PROTOCOL,
                type: "REQUEST",
                nonce: this.nonce,
                requestId,
                operation,
                payload,
            }, this.origin);
        });
    }

    destroy() {
        this.destroyed = true;
        this.hostWindow.removeEventListener("message", this.onMessage);
        this.hostWindow.clearTimeout(this.readyTimer);
        if (!this.initialized) this._resolveReady();
        this.pending.forEach((pending) => {
            this.hostWindow.clearTimeout(pending.timer);
            pending.reject(new Error("EMS-Verbindung wurde geschlossen"));
        });
        this.pending.clear();
        this.iframe?.remove();
        this.iframe = null;
        this.hass = null;
    }
}

const ModernEMSPage = {
    template: `
        <section class="ems-page" aria-labelledby="ems-title">
            <div ref="bridgeHost" class="ems-bridge-host" aria-hidden="true"></div>

            <header class="ems-status-bar">
                <div>
                    <span class="ems-eyebrow">Energiemanagement</span>
                    <h2 id="ems-title">Was jetzt tun <span class="ems-beta">BETA v2!</span></h2>
                    <p>{{ statusHint }}</p>
                </div>
                <div class="ems-status-pills">
                    <span :class="['ems-pill', data?.mode === 'live' ? 'live' : 'mock']">{{ availabilityLabel }}</span>
                    <span class="ems-pill quiet">{{ currentModeLabel }}</span>
                </div>
            </header>

            <div v-if="message" :class="['ems-message', messageError ? 'error' : 'ok']" :role="messageError ? 'alert' : 'status'">{{ message }}</div>
            <div v-if="data?.safety_alarm" class="ems-message error" role="alert"><strong>Sicherheitsfreigabe ausstehend:</strong> Ein vom EMS übernommenes Gerät konnte noch nicht bestätigt ausgeschaltet werden. Das EMS versucht die Freigabe erneut und bleibt gesperrt.</div>
            <div v-if="loading" class="ems-loading"><span></span>EMS lädt den aktuellen Plan …</div>
            <div v-else-if="locked" :class="['ems-message', adminLocked ? 'ok' : 'error']" :role="adminLocked ? 'status' : 'alert'"><strong>{{ adminLocked ? "EMS ist nur für Administratoren" : "EMS-Verbindung nicht verfügbar" }}</strong><br>{{ adminLocked ? "Dieses Steuerpanel bleibt für Nicht-Administratoren gesperrt. Ein Administrator kann Geräte freigeben und den Automatikmodus setzen." : locked }}</div>

            <template v-else-if="data">
                <div v-if="data.mode === 'mock'" class="ems-demo"><strong>Demo-Modus</strong><span>Ohne gültige Freigabe siehst du Beispielwerte. Geräte können nicht geschaltet werden.</span></div>

                <section class="ems-card ems-now-card" aria-labelledby="ems-now-title">
                    <div class="ems-section-head">
                        <div><span class="ems-eyebrow">Jetzt</span><h3 id="ems-now-title">{{ primaryAction.device }}</h3></div>
                        <span>{{ primaryAction.when_label || "Jetzt" }}</span>
                    </div>
                    <p class="ems-now-why">{{ primaryAction.why }}</p>
                    <p v-if="primaryAction.detail" class="ems-now-detail">{{ primaryAction.detail }}</p>
                    <div class="ems-now-meta">
                        <strong :class="primaryAction.tone || 'waiting'">{{ primaryAction.status }}</strong>
                        <span>{{ primaryAction.source || "EMS" }}</span>
                    </div>
                    <button v-if="canConfirmPrimary" type="button" class="ems-action" :disabled="busy" @click="confirmPlanItem(primaryAction)">
                        {{ primaryAction.desired ? "Einschalten bestätigen" : "Ausschalten bestätigen" }}
                    </button>
                </section>

                <section v-if="showIntelligence" class="ems-card ems-intel-card" aria-labelledby="ems-intel-title">
                    <div class="ems-section-head">
                        <div><span class="ems-eyebrow">Intelligenz</span><h3 id="ems-intel-title">Warum das EMS so entscheidet</h3></div>
                        <span v-if="definedPercent(intelligence.forecast_confidence_percent)">Prognosegüte {{ percent(intelligence.forecast_confidence_percent) }}</span>
                    </div>
                    <p class="ems-intel-headline">{{ intelligence.headline }}</p>
                    <div v-if="intelligence.why?.length" class="ems-why-list">
                        <span v-for="(item, index) in intelligence.why" :key="'why-' + index">{{ item }}</span>
                    </div>
                    <div v-if="intelligence.priority_order?.length" class="ems-priority">
                        <small>PV-Reihenfolge</small>
                        <ol>
                            <li v-for="(item, index) in intelligence.priority_order" :key="'prio-' + index">{{ item }}</li>
                        </ol>
                    </div>
                    <div v-if="intelligence.allocation?.length" class="ems-allocation">
                        <div class="ems-section-head compact"><div><span class="ems-eyebrow">Allokation</span><h4>Wohin die PV fließt</h4></div></div>
                        <div class="ems-allocation-bar" role="img" :aria-label="allocationStory">
                            <span v-for="row in intelligence.allocation" :key="row.id" :class="['ems-allocation-slice', row.tone]" :style="{ flexGrow: Math.max(row.percent || 0, 0.4) }">{{ row.percent ? Math.round(row.percent) + '%' : '' }}</span>
                        </div>
                        <div class="ems-allocation-legend">
                            <article v-for="row in intelligence.allocation" :key="row.id + '-legend'" :class="row.tone">
                                <span>{{ row.label }}</span>
                                <strong>{{ energy(row.kwh) }} · {{ percent(row.percent) }}</strong>
                                <small>{{ row.origin }}</small>
                            </article>
                        </div>
                    </div>
                    <div class="ems-intel-grid">
                        <article v-if="intelligence.optimization?.available">
                            <span>Bestes PV-Fenster</span>
                            <strong>{{ intelligence.optimization.when_label || "Heute" }}</strong>
                            <small>{{ intelligence.optimization.recommendation }}</small>
                        </article>
                        <article v-if="intelligence.economics">
                            <span>Speicherarbitrage</span>
                            <strong>{{ intelligence.economics.worthwhile ? "Laden lohnt sich" : "Laden lohnt sich nicht" }}</strong>
                            <small>{{ intelligence.economics.detail }}</small>
                        </article>
                        <article v-if="intelligence.mobility">
                            <span>Abfahrt{{ intelligence.mobility.is_demo ? " · Demo" : "" }}</span>
                            <strong>{{ percent(intelligence.mobility.departure_readiness_percent) }} bereit</strong>
                            <small>{{ intelligence.mobility.detail }}</small>
                        </article>
                        <article v-if="intelligence.comfort">
                            <span>Komfort{{ intelligence.comfort.is_demo ? " · Demo" : "" }}</span>
                            <strong>{{ intelligence.comfort.indoor_c != null ? intelligence.comfort.indoor_c.toFixed(1) + " °C" : "Gebäude" }}</strong>
                            <small>{{ intelligence.comfort.detail }}</small>
                        </article>
                    </div>
                </section>

                <section v-if="nextActions.length" class="ems-card ems-next-card" aria-labelledby="ems-next-title">
                    <div class="ems-section-head"><div><span class="ems-eyebrow">Als Nächstes</span><h3 id="ems-next-title">Weitere Schritte</h3></div></div>
                    <div class="ems-next-list">
                        <article v-for="item in nextActions" :key="item.id">
                            <div><span>{{ item.when_label || "Später" }}</span><strong>{{ item.device }}</strong></div>
                            <p>{{ item.why }}</p>
                            <b :class="item.tone">{{ item.status }}</b>
                        </article>
                    </div>
                </section>

                <section v-if="operations" class="ems-card ems-ops-card" aria-labelledby="ems-ops-title">
                    <div class="ems-section-head"><div><span class="ems-eyebrow">Betrieb</span><h3 id="ems-ops-title">EMS-Kennzahlen</h3></div><span>{{ operations.horizon?.when_label || "Rest des Tages" }}</span></div>
                    <p class="ems-ops-story">{{ operations.opportunity?.detail }}</p>
                    <p v-if="operations.tariff?.detail" class="ems-ops-tariff">{{ operations.tariff.detail }}</p>
                    <div class="ems-ops-kpis">
                        <article v-for="kpi in operationKpis" :key="kpi.id">
                            <span>{{ kpi.label }}</span>
                            <strong>{{ kpi.display }}</strong>
                            <small>{{ kpi.hint }}</small>
                        </article>
                    </div>
                    <div class="ems-ops-horizon">
                        <article>
                            <span>Nächste Stunden</span>
                            <strong>{{ energy(operations.horizon?.pv_kwh) }} PV · {{ energy(operations.horizon?.demand_kwh) }} Bedarf</strong>
                            <small>Überschuss {{ energy(operations.horizon?.surplus_kwh) }} · Netz {{ energy(operations.horizon?.grid_kwh) }}</small>
                        </article>
                        <article v-if="operations.peak">
                            <span>Netzspitze</span>
                            <strong>{{ operations.peak.when_label }} · {{ energy(operations.peak.grid_kwh) }}</strong>
                            <small>{{ operations.peak.origin }}</small>
                        </article>
                        <article v-if="operations.best_charge">
                            <span>Günstigste Reststunde</span>
                            <strong>{{ operations.best_charge.when_label }} · {{ price(operations.best_charge.price_ct_kwh) }}</strong>
                            <small>{{ operations.best_charge.origin }}</small>
                        </article>
                    </div>
                </section>

                <section class="ems-card ems-today-card" aria-labelledby="ems-today-title">
                    <div class="ems-section-head">
                        <div><span class="ems-eyebrow">Heute und die nächsten Tage</span><h3 id="ems-today-title">Prognose und Deckung</h3></div>
                        <span>{{ selectedDayCaption }} · {{ dayValueScope }}</span>
                    </div>
                    <p class="ems-coverage-story">{{ coverageStory }}</p>
                    <p v-if="todayBrief.next_window_label" class="ems-next-window"><strong>Nächstes Fenster:</strong> {{ todayBrief.next_window_label }}<span v-if="todayBrief.next_window_when"> · {{ todayBrief.next_window_when }}</span><small v-if="todayBrief.next_window_detail">{{ todayBrief.next_window_detail }}</small></p>
                    <div class="ems-today-metrics">
                        <article><span>PV-Ertrag</span><strong>{{ energy(selectedSummary.pv_kwh) }}</strong><small>Solarprognose</small></article>
                        <article><span>Bedarf</span><strong>{{ energy(selectedSummary.demand_kwh) }}</strong><small>{{ demandComponentsLabel }}</small></article>
                        <article><span>Netzbezug</span><strong>{{ energy(selectedSummary.expected_grid_import_kwh) }}</strong><small>{{ currency(selectedSummary.expected_grid_cost_eur) }}</small></article>
                        <article><span>Autarkie</span><strong>{{ percent(selectedSummary.expected_autarky_percent) }}</strong><small>{{ selectedSummary.autarky_origin_label || "noch ohne Messung" }}</small></article>
                    </div>
                    <div class="ems-coverage" aria-labelledby="ems-coverage-title">
                        <div class="ems-section-head compact"><div><span class="ems-eyebrow">Aufschlüsselung</span><h4 id="ems-coverage-title">Woher kommt der Strom</h4></div><span v-if="definedPercent(selectedSummary.coverage_surplus_kwh)">Überschuss nach Direktdeckung {{ energy(selectedSummary.coverage_surplus_kwh) }}</span></div>
                        <div v-if="coverageRows.length" class="ems-coverage-bar" role="img" :aria-label="coverageStory">
                            <span v-for="row in coverageRows" :key="row.id" :class="['ems-coverage-slice', row.tone]" :style="{ flexGrow: Math.max(row.percent || 0, 0.4) }" :title="row.origin">{{ row.percent ? Math.round(row.percent) + '%' : '' }}</span>
                        </div>
                        <div class="ems-coverage-legend">
                            <article v-for="row in coverageRows" :key="row.id + '-legend'" :class="row.tone">
                                <span>{{ row.label }}</span>
                                <strong>{{ energy(row.kwh) }} · {{ percent(row.percent) }}</strong>
                                <small>{{ row.origin }}</small>
                            </article>
                        </div>
                    </div>
                    <div class="ems-day-navigation">
                        <button type="button" aria-label="Vorheriger Tag" :disabled="selectedDayIndex <= 0" @click="shiftDay(-1)">‹</button>
                        <div ref="dayStrip" class="ems-day-strip" role="tablist" aria-label="Prognosetage">
                            <button v-for="day in data.days" :id="'ems-day-tab-' + day.date" :key="day.date" :data-date="day.date" type="button" role="tab" :aria-selected="day.date === selectedDate" aria-controls="ems-day-panel" :tabindex="day.date === selectedDate ? 0 : -1" :class="{ active: day.date === selectedDate }" @click="selectDay(day.date)" @keydown="handleDayKeydown($event, day.date)"><strong>{{ dayCaption(day) }}</strong><span>{{ dayDate(day.date) }} · 00–24 Uhr</span><small>{{ day.complete_hours }}/24 Stunden verfügbar</small></button>
                        </div>
                        <button type="button" aria-label="Nächster Tag" :disabled="selectedDayIndex >= data.days.length - 1" @click="shiftDay(1)">›</button>
                    </div>
                    <div class="ems-analysis-tabs" role="tablist" aria-label="Graphansicht"><button id="ems-chart-tab-energy" type="button" role="tab" :aria-selected="chartView === 'energy'" aria-controls="ems-chart-panel" :tabindex="chartView === 'energy' ? 0 : -1" :class="{ active: chartView === 'energy' }" @click="setChartView('energy')" @keydown="handleChartKeydown">Energiefluss</button><button id="ems-chart-tab-grid" type="button" role="tab" :aria-selected="chartView === 'grid'" aria-controls="ems-chart-panel" :tabindex="chartView === 'grid' ? 0 : -1" :class="{ active: chartView === 'grid' }" @click="setChartView('grid')" @keydown="handleChartKeydown">Netz &amp; Potenzial</button><button v-if="hasAllocation" id="ems-chart-tab-allocation" type="button" role="tab" :aria-selected="chartView === 'allocation'" aria-controls="ems-chart-panel" :tabindex="chartView === 'allocation' ? 0 : -1" :class="{ active: chartView === 'allocation' }" @click="setChartView('allocation')" @keydown="handleChartKeydown">Allokation</button></div>
                    <div id="ems-day-panel" role="tabpanel" :aria-labelledby="'ems-day-tab-' + selectedDay.date"><div id="ems-chart-panel" ref="chart" class="ems-chart" role="img" :aria-label="chartAriaLabel"></div><p class="ems-chart-summary">{{ chartSummary }}</p></div>
                    <p v-if="data.components?.battery" class="ems-chart-note"><strong>Akku → Haus:</strong> Vorhandene Stunden sind gemessene Werte. Fehlende und kommende Stunden nutzen den Median der letzten 90 Tage für denselben Wochentag und dieselbe Uhrzeit.</p>
                    <div v-if="forecastWindows.length && selectedDay.relative_day === 0" class="ems-window-list">
                        <article v-for="windowItem in forecastWindows" :key="windowItem.id">
                            <strong>{{ windowItem.label }}</strong>
                            <span>{{ windowItem.when_label }}</span>
                            <p>{{ windowItem.detail }}</p>
                        </article>
                    </div>
                </section>

                <section class="ems-control-grid">
                    <article class="ems-card ems-mode-card">
                        <span class="ems-eyebrow">Steuerfreigabe</span><h3>Was darf das EMS tun?</h3>
                        <p>Lege fest, ob das EMS nur empfiehlt oder freigegebene Geräte schalten darf. Vor jeder Schaltung werden Freigabe, Datenlage und Schutzregeln erneut geprüft.</p>
                        <div :class="['ems-mode-state', data.control_mode]"><strong>{{ currentModeLabel }}</strong><span>{{ currentModeScope }}</span></div>
                        <div class="ems-mode-buttons">
                            <button v-for="mode in modes" :key="mode.id" type="button" :class="[mode.id, { active: data.control_mode === mode.id }]" :disabled="busy || (data.mode !== 'live' && mode.id !== 'observe')" @click="setMode(mode.id)"><strong>{{ mode.label }}</strong><span>{{ mode.help }}</span></button>
                        </div>
                    </article>
                </section>

                <section v-if="visibleActors.length" class="ems-actors">
                    <div class="ems-section-head"><div><span class="ems-eyebrow">Geräte</span><h3>Freigaben und Sollzustand</h3></div><span>Nur freigegebene Geräte dürfen geschaltet werden</span></div>
                    <div class="ems-actor-grid">
                        <article v-for="actor in visibleActors" :key="actor.id" :class="['ems-card', 'ems-actor', actor.ready ? 'ready' : 'blocked']">
                            <div class="ems-actor-head"><div><span>{{ actor.source }}</span><h4>{{ actor.label }}</h4></div><span v-if="actor.is_demo" class="ems-pill mock">Demo</span><span v-else-if="actor.paused" class="ems-pill quiet">Pausiert</span><button type="button" class="ems-toggle" :class="{ on: actor.enabled }" :disabled="busy || data.mode !== 'live' || !actor.configured || actor.is_demo" :aria-pressed="actor.enabled" @click="setActor(actor)"><i></i>{{ actor.enabled ? "Freigegeben" : "Gesperrt" }}</button></div>
                            <div class="ems-actor-state"><span>Ist <strong>{{ state(actor.current) }}</strong></span><span>Soll <strong>{{ decision(actor) }}</strong></span></div>
                            <p>{{ actor.detail }}</p><small>{{ actor.reason_label || reason(actor.reason) }}</small>
                            <button v-if="data.control_mode === 'confirm' && actor.confirm_token" type="button" class="ems-action" :disabled="busy" @click="confirmActor(actor)">{{ actor.desired ? "Einschalten bestätigen" : "Ausschalten bestätigen" }}</button>
                            <div v-else-if="!actor.configured" class="ems-actor-note">In den Einstellungen ist noch kein Schalter hinterlegt.</div>
                            <div v-else-if="!actor.ready" class="ems-actor-note">Noch nicht schaltbereit: Daten, Konfiguration oder eine Schutzregel blockieren den Schritt.</div>
                        </article>
                    </div>
                </section>

                <details class="ems-card ems-details" :open="detailsOpen" @toggle="onDetailsToggle">
                    <summary>
                        <span class="ems-eyebrow">Protokoll</span>
                        <strong>Quellen und letzte Ereignisse</strong>
                        <span>Nachvollziehbarkeit</span>
                    </summary>
                    <div class="ems-details-body">
                        <div class="ems-source-row"><div v-for="source in data.sources" :key="source.id" :class="['ems-source', source.available && source.fresh ? 'ready' : 'missing']"><i></i><strong>{{ source.label }}</strong><span>{{ source.role }}</span></div></div>
                        <div class="ems-audit-block">
                            <div class="ems-section-head"><div><span class="ems-eyebrow">Ereignisse</span><h3>Letzte Schaltungen</h3></div><button type="button" class="ems-refresh" :disabled="busy" @click="refresh">Aktualisieren</button></div>
                            <div v-if="!data.audit.length" class="ems-empty">Noch keine Schaltung. Im Beobachten-Modus ist das der erwartete Zustand.</div>
                            <div v-else class="ems-audit-list"><div v-for="row in data.audit" :key="row.timestamp + row.event"><time>{{ dateTime(row.timestamp) }}</time><strong>{{ row.label || eventLabel(row.event) }}</strong><span>{{ row.actor_id || row.mode || "EMS" }}</span><b :class="row.success ? 'ok' : 'bad'">{{ row.success ? "OK" : "Blockiert" }}</b></div></div>
                        </div>
                    </div>
                </details>
            </template>
        </section>
    `,
    setup() {
        const { ref, computed, onMounted, onUnmounted, nextTick } = Vue;
        const bridgeHost = ref(null);
        const chart = ref(null);
        const dayStrip = ref(null);
        const data = ref(null);
        const selectedDate = ref("");
        const chartView = ref("energy");
        const loading = ref(true);
        const locked = ref("");
        const busy = ref(false);
        const message = ref("");
        const messageError = ref(false);
        const detailsOpen = ref(false);
        const modes = [
            { id: "observe", label: "Beobachten", help: "Nur Empfehlungen · schaltet nie" },
            { id: "confirm", label: "Bestätigen", help: "Jeden Vorschlag einzeln freigeben" },
            { id: "automatic", label: "Automatik", help: "Darf freigegebene Geräte schalten" },
        ];
        let bridge;
        let chartInstance;
        let chartResizeObserver;
        let chartResizeTimers = [];
        let chartRenderTimer;
        let chartRenderAttempts = 0;
        let timer;
        let disposed = false;

        const unwrap = (response) => response?.success === true ? response.data : response?.data ?? response;
        const visibleActors = computed(() => (data.value?.actors || []).filter((actor) => actor.present === true));
        const enabledActorLabels = computed(() => visibleActors.value.filter((actor) => actor.configured && actor.enabled).map((actor) => actor.label));
        const actionPlan = computed(() => Array.isArray(data.value?.action_plan) ? data.value.action_plan : []);
        const primaryAction = computed(() => actionPlan.value[0] || {
            device: "Keine Aktion nötig",
            why: "Ertrag, Bedarf und Geräte werden weiter beobachtet.",
            detail: "",
            status: "Beobachten",
            tone: "waiting",
            when_label: "Jetzt",
            source: "EMS",
        });
        const nextActions = computed(() => actionPlan.value.slice(1));
        const todayBrief = computed(() => data.value?.today_brief || {});
        const forecastWindows = computed(() => Array.isArray(data.value?.forecast_windows) ? data.value.forecast_windows : []);
        const operations = computed(() => data.value?.operations && typeof data.value.operations === "object" ? data.value.operations : null);
        const adminLocked = computed(() => /admin/i.test(String(locked.value || "")));
        const operationKpis = computed(() => Array.isArray(operations.value?.kpis) ? operations.value.kpis : []);
        const intelligence = computed(() => data.value?.intelligence && typeof data.value.intelligence === "object" ? data.value.intelligence : null);
        const showIntelligence = computed(() => !!(intelligence.value?.available || intelligence.value?.why?.length || intelligence.value?.allocation?.length));
        const allocationStory = computed(() => (intelligence.value?.allocation || []).map((row) => `${row.label} ${energy(row.kwh)}`).join(" · ") || "PV-Allokation nach Priorität");
        const hasAllocation = computed(() => {
            const hours = selectedDay.value?.hours || [];
            return hours.some((point) => point.household_pv_kwh != null || point.residual_pv_kwh != null);
        });
        const canConfirmPrimary = computed(() => data.value?.control_mode === "confirm" && !!primaryAction.value?.confirm_token);
        const selectedDay = computed(() => data.value?.days?.find((day) => day.date === selectedDate.value) || data.value?.days?.[0] || null);
        const selectedDayIndex = computed(() => Math.max(0, data.value?.days?.findIndex((day) => day.date === selectedDay.value?.date) ?? 0));
        const selectedSummary = computed(() => ({ ...(data.value?.summary || {}), ...(selectedDay.value?.summary || {}), ...(selectedDay.value?.relative_day === 0 ? (data.value?.today_brief || {}) : {}) }));
        const coverageRows = computed(() => Array.isArray(selectedSummary.value.coverage) ? selectedSummary.value.coverage : []);
        const coverageStory = computed(() => selectedSummary.value.coverage_story || "Für diesen Tag wird die Deckung aus Prognose und gemessenen Flüssen gebildet.");
        const demandParts = computed(() => [
            "Haus",
            ...(data.value?.components?.heat_pump ? ["Wärmepumpe"] : []),
            ...(data.value?.components?.wallbox ? ["Wallbox"] : []),
        ]);
        const demandComponentsLabel = computed(() => demandParts.value.join(" + "));
        const dayValueScope = computed(() => selectedDay.value?.complete ? "00–24 Uhr" : `Teilsumme ${selectedDay.value?.complete_hours || 0}/24 h`);
        const selectedDayCaption = computed(() => selectedDay.value ? dayCaption(selectedDay.value) : "Tag");
        const availabilityLabel = computed(() => data.value?.mode === "live" ? "Aktiv" : data.value?.mode === "mock" ? "Demo" : "Nicht verfügbar");
        const statusHint = computed(() => data.value?.summary_text || "Empfehlungen aus Prognose und Gerätezustand.");
        const currentModeLabel = computed(() => data.value?.control_mode === "automatic" ? "Automatik" : data.value?.control_mode === "confirm" ? "Bestätigen" : "Beobachten");
        const currentModeScope = computed(() => {
            if (data.value?.control_mode === "automatic") return enabledActorLabels.value.length ? `Darf schalten: ${enabledActorLabels.value.join(", ")}` : "Keine Geräte freigegeben";
            if (data.value?.control_mode === "confirm") return "Jede vorgeschlagene Schaltung braucht deine Bestätigung";
            return "Plant und erklärt · führt keine Schaltung aus";
        });

        const dateAtNoon = (value) => {
            const [year, month, day] = value.split("-").map(Number);
            return new Date(Date.UTC(year, month - 1, day, 12));
        };
        const dayCaption = (day) => {
            if (day.relative_day === 0) return "Heute";
            if (day.relative_day === 1) return "Morgen";
            return new Intl.DateTimeFormat(undefined, { weekday: "short", timeZone: "UTC" }).format(dateAtNoon(day.date));
        };
        const dayDate = (value) => new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(dateAtNoon(value));
        const selectedDayLong = computed(() => selectedDay.value ? new Intl.DateTimeFormat(undefined, { weekday: "long", day: "2-digit", month: "long", timeZone: "UTC" }).format(dateAtNoon(selectedDay.value.date)) : "gewählten Tag");
        const chartAriaLabel = computed(() => chartView.value === "grid" ? `Tagesgraph für ${selectedDayLong.value}: erwarteter Netzbezug und PV-Potenzial nach Direktdeckung` : chartView.value === "allocation" ? `Tagesgraph für ${selectedDayLong.value}: PV-Allokation nach Haus, Wärme, Speicher und Rest` : `Tagesgraph für ${selectedDayLong.value}: Bedarf, PV-Ertrag, PV direkt ins Haus und Akku-Fluss`);
        const chartSummary = computed(() => chartView.value === "grid"
            ? `Erwarteter Netzbezug ${energy(selectedSummary.value.expected_grid_import_kwh)} · PV-Potenzial nach Direktdeckung ${energy(selectedSummary.value.pv_potential_after_direct_kwh)} · erwartete Stromkosten ${currency(selectedSummary.value.expected_grid_cost_eur)}.`
            : chartView.value === "allocation"
            ? [
                `Haus ${energy(selectedSummary.value.household_pv_kwh)}`,
                ...(data.value?.components?.heat_pump ? [`Wärmepumpe ${energy(selectedSummary.value.heat_pump_pv_kwh)}`] : []),
                ...(data.value?.components?.battery ? [`Akku-Reserve ${energy(selectedSummary.value.battery_pv_reserved_kwh)}`] : []),
                `Rest ${energy(selectedSummary.value.residual_pv_kwh)}`,
            ].join(" · ")
            : `PV ${energy(selectedSummary.value.pv_kwh)} · Bedarf ${energy(selectedSummary.value.demand_kwh)} · PV direkt ins Haus ${energy(selectedSummary.value.covered_kwh)}${data.value?.components?.battery ? ` · Akku → Haus ${energy(selectedSummary.value.battery_to_house_kwh)}` : ""}.`);

        const definedPercent = (value) => value !== null && value !== undefined && Number.isFinite(Number(value));
        const energy = (value) => definedPercent(value) ? `${Number(value).toFixed(1)} kWh` : "–";
        const percent = (value) => definedPercent(value) ? `${Math.round(Number(value))} %` : "–";
        const price = (value) => definedPercent(value) ? `${Number(value).toFixed(2)} ct/kWh` : "–";
        const currency = (value) => definedPercent(value) ? new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(Number(value)) : "–";
        const state = (value) => value === true ? "EIN" : value === false ? "AUS" : "–";
        const decision = (actor) => actor.desired === true ? "EIN" : actor.desired === false ? "AUS" : "HALTEN";
        const dateTime = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "medium" }).format(new Date(value)) : "–";
        const reason = (value) => {
            const labels = {
                license_required: "Ohne Freigabe bleibt die Steuerung gesperrt.",
                no_decision: "Noch keine belastbare Empfehlung.",
                signal_unavailable: "Das Überschusssignal fehlt gerade.",
                external_owner: "Ein anderer Automationspfad steuert diesen Schalter bereits.",
                data_unavailable: "Die nötigen Sensordaten fehlen noch.",
                not_load: "Netzladung ist gerade nicht sinnvoll.",
                load: "Günstiger Zeitraum für Netzladung.",
                charge: "Laden ist jetzt sinnvoll.",
                heating: "Heizen mit günstigem Strom oder PV-Überschuss.",
                dhw: "Warmwasser jetzt nachladen.",
                thermal_storage: "Wärme speichern, solange Strom günstig oder reichlich ist.",
            };
            const key = String(value || "");
            if (labels[key]) return labels[key];
            const cleaned = key.replaceAll("_", " ").trim();
            return cleaned ? cleaned[0].toUpperCase() + cleaned.slice(1) : "Keine Begründung";
        };
        const eventLabel = (value) => reason(value);
        const showMessage = (text, error = false) => { message.value = text; messageError.value = error; };

        const renderChart = () => {
            if (!chart.value || !selectedDay.value?.hours?.length || disposed) return;
            if (!window.echarts) {
                if (chartRenderAttempts < 40) {
                    chartRenderAttempts += 1;
                    window.clearTimeout(chartRenderTimer);
                    chartRenderTimer = window.setTimeout(renderChart, 250);
                }
                return;
            }
            window.clearTimeout(chartRenderTimer);
            chartRenderTimer = null;
            chartRenderAttempts = 0;
            chartInstance ||= window.echarts.init(chart.value);
            if (!chartResizeObserver && window.ResizeObserver) {
                chartResizeObserver = new ResizeObserver(() => chartInstance?.resize());
                chartResizeObserver.observe(chart.value);
            }
            const hours = selectedDay.value.hours;
            const labels = hours.map((point) => `${String(point.hour).padStart(2, "0")}:00`);
            const valueFormatter = (value) => value == null ? "fehlend" : `${Number(value).toFixed(2)} kWh`;
            const energySeries = [
                { name: "PV direkt ins Haus", type: "line", data: hours.map((point) => point.covered_kwh),
                    lineStyle: { width: 0 }, areaStyle: { color: "rgba(80, 210, 156, .28)" }, symbol: "none", z: 1,
                    tooltip: { valueFormatter } },
                ...(data.value?.components?.battery && hours.some((point) => point.battery_to_house_actual_kwh != null) ? [
                    { name: "Akku → Haus (IST)", type: "line", data: hours.map((point) => point.battery_to_house_actual_kwh),
                        connectNulls: false, symbol: "none", lineStyle: { width: 3, color: "#b879ff" }, z: 3, tooltip: { valueFormatter } },
                ] : []),
                ...(data.value?.components?.battery && hours.some((point) => point.battery_to_house_forecast_kwh != null) ? [
                    { name: "Akku → Haus (Prognose)", type: "line", data: hours.map((point) => point.battery_to_house_forecast_kwh),
                        connectNulls: false, symbol: "none", lineStyle: { width: 2, type: "dashed", color: "#b879ff" }, z: 2, tooltip: { valueFormatter } },
                ] : []),
                { name: "PV-Ertrag", type: "line", data: hours.map((point) => point.pv_kwh),
                    smooth: .25, symbol: "none", lineStyle: { width: 3, color: "#ffbf2f" }, areaStyle: { color: "rgba(255,191,47,.12)" }, z: 3,
                    tooltip: { valueFormatter } },
                { name: "Bedarf", type: "line", data: hours.map((point) => point.demand_kwh),
                    smooth: .2, symbol: "circle", symbolSize: 5, lineStyle: { width: 3, color: "#60c5ff" }, z: 4,
                    tooltip: { valueFormatter } },
            ];
            const gridSeries = [
                { name: "Erwarteter Netzbezug", type: "line", data: hours.map((point) => point.expected_grid_import_kwh),
                    connectNulls: false, symbol: "circle", symbolSize: 5, lineStyle: { width: 3, color: "#ff7f8f" }, areaStyle: { color: "rgba(255,127,143,.12)" }, z: 3,
                    tooltip: { valueFormatter } },
                { name: "PV-Potenzial nach Direktdeckung", type: "line", data: hours.map((point) => point.pv_potential_after_direct_kwh),
                    connectNulls: false, symbol: "none", lineStyle: { width: 3, type: "dashed", color: "#61e2af" }, areaStyle: { color: "rgba(97,226,175,.1)" }, z: 2,
                    tooltip: { valueFormatter } },
                ...(hours.some((point) => point.price_ct_kwh != null) ? [{
                    name: "Strompreis", type: "line", yAxisIndex: 1, data: hours.map((point) => point.price_ct_kwh),
                    symbol: "none", lineStyle: { width: 2, type: "dotted", color: "#ffc95b" }, z: 5,
                    tooltip: { valueFormatter: (value) => value == null ? "fehlend" : `${Number(value).toFixed(2)} ct/kWh` },
                }] : []),
            ];
            const allocationSeries = [
                { name: "PV → Haus", type: "bar", stack: "alloc", data: hours.map((point) => point.household_pv_kwh),
                    itemStyle: { color: "#ffbf2f" }, z: 1, tooltip: { valueFormatter } },
                ...(data.value?.components?.heat_pump ? [{
                    name: "PV → Wärmepumpe", type: "bar", stack: "alloc", data: hours.map((point) => point.heat_pump_pv_kwh),
                    itemStyle: { color: "#ff7f8f" }, z: 1, tooltip: { valueFormatter },
                }] : []),
                ...(data.value?.components?.battery ? [{
                    name: "PV → Akku", type: "bar", stack: "alloc", data: hours.map((point) => point.battery_pv_reserved_kwh),
                    itemStyle: { color: "#b879ff" }, z: 1, tooltip: { valueFormatter },
                }] : []),
                { name: "PV-Rest", type: "bar", stack: "alloc", data: hours.map((point) => point.residual_pv_kwh),
                    itemStyle: { color: "#61e2af" }, z: 1, tooltip: { valueFormatter } },
                ...(hours.some((point) => point.historical_grid_import_kwh != null) ? [{
                    name: "Typischer Netzbezug (90 Tage)", type: "line", data: hours.map((point) => point.historical_grid_import_kwh),
                    connectNulls: false, symbol: "none", lineStyle: { width: 2, type: "dashed", color: "#ff7f8f" }, z: 4, tooltip: { valueFormatter },
                }] : []),
            ];
            const series = chartView.value === "grid" ? gridSeries : chartView.value === "allocation" ? allocationSeries : energySeries;
            const compactChart = chart.value.clientWidth < 520;
            const priceAxis = chartView.value === "grid" && series.some((item) => item.yAxisIndex === 1);
            chartInstance.setOption({
                animationDuration: 450,
                tooltip: { trigger: "axis" },
                legend: { type: "scroll", data: series.map((item) => item.name), top: 4 },
                grid: { left: 42, right: priceAxis ? 48 : 24, top: compactChart ? 76 : 52, bottom: 38, containLabel: true },
                xAxis: { type: "category", boundaryGap: false, data: labels, axisLabel: { interval: compactChart ? 3 : 1 } },
                yAxis: priceAxis
                    ? [
                        { type: "value", name: "kWh", min: 0 },
                        { type: "value", name: "ct/kWh", splitLine: { show: false } },
                    ]
                    : { type: "value", name: "kWh", min: 0 },
                series,
            }, true);
            chartResizeTimers.forEach((resizeTimer) => window.clearTimeout(resizeTimer));
            chartResizeTimers = [0, 160, 650].map((delay) => window.setTimeout(() => {
                if (chartInstance && chart.value?.clientWidth && chart.value?.clientHeight) chartInstance.resize();
            }, delay));
        };

        const selectDay = async (date, focus = false) => {
            if (!data.value?.days?.some((day) => day.date === date)) return;
            selectedDate.value = date;
            await nextTick();
            const activeTab = dayStrip.value?.querySelector(`[data-date="${date}"]`);
            activeTab?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
            if (focus) activeTab?.focus();
            renderChart();
        };
        const shiftDay = async (offset) => {
            const next = data.value?.days?.[selectedDayIndex.value + offset];
            if (!next) return;
            await selectDay(next.date);
        };
        const handleDayKeydown = async (event, date) => {
            const index = data.value?.days?.findIndex((day) => day.date === date) ?? -1;
            if (index < 0 || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const targetIndex = event.key === "Home" ? 0 : event.key === "End" ? data.value.days.length - 1 : Math.max(0, Math.min(data.value.days.length - 1, index + (event.key === "ArrowRight" ? 1 : -1)));
            await selectDay(data.value.days[targetIndex].date, true);
        };
        const setChartView = async (view, focus = false) => {
            if (!['energy', 'grid', 'allocation'].includes(view)) return;
            if (view === "allocation" && !hasAllocation.value) return;
            chartView.value = view;
            await nextTick();
            if (focus) document.getElementById(`ems-chart-tab-${view}`)?.focus();
            renderChart();
        };
        const handleChartKeydown = async (event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const views = hasAllocation.value ? ["energy", "grid", "allocation"] : ["energy", "grid"];
            const index = Math.max(0, views.indexOf(chartView.value));
            const next = event.key === "Home" ? 0 : event.key === "End" ? views.length - 1 : Math.max(0, Math.min(views.length - 1, index + (event.key === "ArrowRight" ? 1 : -1)));
            await setChartView(views[next], true);
        };
        const onDetailsToggle = async (event) => {
            detailsOpen.value = !!event.target.open;
            if (detailsOpen.value) {
                await nextTick();
                chartRenderAttempts = 0;
                renderChart();
            }
        };

        const applyResponse = async (response) => {
            if (disposed) return;
            const payload = unwrap(response);
            const schemaOk = payload?.schema_version === 3
                || payload?.schema_version === 2;
            if (!payload || !schemaOk || !["live", "mock"].includes(payload.mode) || !Array.isArray(payload.days) || !payload.days.length) {
                throw new Error("Ungültiger EMS-Vertrag");
            }
            payload.action_plan = Array.isArray(payload.action_plan) ? payload.action_plan : [];
            payload.forecast_windows = Array.isArray(payload.forecast_windows) ? payload.forecast_windows : [];
            payload.today_brief = payload.today_brief && typeof payload.today_brief === "object"
                ? payload.today_brief
                : {};
            payload.operations = payload.operations && typeof payload.operations === "object"
                ? payload.operations
                : { kpis: [] };
            payload.intelligence = payload.intelligence && typeof payload.intelligence === "object"
                ? payload.intelligence
                : { available: false, why: [], allocation: [] };
            data.value = payload;
            if (!payload.days.some((day) => day.date === selectedDate.value)) selectedDate.value = payload.days[0].date;
            await nextTick();
            if (disposed) return;
            chartRenderAttempts = 0;
            renderChart();
        };

        const call = async (operation, payload = {}) => {
            busy.value = true;
            try {
                await applyResponse(await bridge.request(operation, payload));
                showMessage(operation === "snapshot" ? "" : "EMS-Zustand aktualisiert.");
            } catch (error) {
                if (operation === "snapshot") {
                    data.value = null;
                    chartInstance?.clear();
                }
                showMessage(error.message || "EMS-Anfrage fehlgeschlagen", true);
                throw error;
            } finally { busy.value = false; }
        };

        const refresh = async () => { try { await call("snapshot"); } catch (_error) {} };
        const setMode = async (mode) => {
            const confirmAutomatic = mode === "automatic";
            const actorScope = enabledActorLabels.value.length ? enabledActorLabels.value.join(", ") : "keine Geräte";
            if (confirmAutomatic && !window.confirm(`Automatik wirklich aktivieren? Freigegeben: ${actorScope}. Vor jeder Schaltung werden Freigabe, Datenlage und Schutzregeln erneut geprüft.`)) return;
            try { await call("setMode", { mode, confirm_automatic: confirmAutomatic }); } catch (_error) {}
        };
        const setActor = async (actor) => {
            try { await call("setActor", { actor_id: actor.id, enabled: !actor.enabled }); } catch (_error) {}
        };
        const confirmActor = async (actor) => {
            if (!window.confirm(`${actor.label}: Sollzustand ${decision(actor)} jetzt ausführen?`)) return;
            try { await call("confirm", { token: actor.confirm_token }); } catch (_error) {}
        };
        const confirmPlanItem = async (item) => {
            if (!item?.confirm_token) return;
            if (!window.confirm(`${item.device}: ${item.desired ? "Einschalten" : "Ausschalten"} jetzt ausführen?`)) return;
            try { await call("confirm", { token: item.confirm_token }); } catch (_error) {}
        };
        const handleResize = () => chartInstance?.resize();

        onMounted(async () => {
            disposed = false;
            bridge = new EMSBridgeClient();
            bridge.mount(bridgeHost.value);
            try { await applyResponse(await bridge.request("snapshot")); }
            catch (error) {
                if (!disposed) locked.value = error.message || "Adminzugriff erforderlich.";
            } finally {
                if (!disposed) {
                    loading.value = false;
                    if (!/admin/i.test(String(locked.value || ""))) {
                        timer = window.setInterval(refresh, 30000);
                    }
                    window.addEventListener("resize", handleResize);
                }
            }
        });
        onUnmounted(() => {
            disposed = true;
            window.clearInterval(timer);
            window.removeEventListener("resize", handleResize);
            chartResizeTimers.forEach((resizeTimer) => window.clearTimeout(resizeTimer));
            chartResizeTimers = [];
            window.clearTimeout(chartRenderTimer);
            chartRenderTimer = null;
            chartRenderAttempts = 0;
            chartResizeObserver?.disconnect();
            chartResizeObserver = null;
            chartInstance?.dispose();
            chartInstance = null;
            bridge?.destroy();
        });

        return { bridgeHost, chart, dayStrip, data, selectedDate, selectedDay, selectedDayIndex,
            selectedSummary, selectedDayCaption, dayValueScope, demandComponentsLabel, coverageRows, coverageStory,
            chartView, chartAriaLabel, chartSummary, loading, locked, adminLocked, busy, message,
            messageError, detailsOpen, modes, primaryAction, nextActions, todayBrief, forecastWindows,
            operations, operationKpis, intelligence, showIntelligence, allocationStory, hasAllocation,
            canConfirmPrimary, visibleActors, availabilityLabel, statusHint, currentModeLabel, currentModeScope,
            definedPercent, energy, percent, price, currency, state, decision, dateTime, reason, eventLabel, dayCaption, dayDate, selectDay,
            shiftDay, handleDayKeydown, setChartView, handleChartKeydown, onDetailsToggle, refresh,
            setMode, setActor, confirmActor, confirmPlanItem };
    },
};

window.ModernEMSPage = ModernEMSPage;
