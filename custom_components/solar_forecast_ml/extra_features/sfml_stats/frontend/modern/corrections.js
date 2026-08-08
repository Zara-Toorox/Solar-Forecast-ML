const CORRECTIONS_BRIDGE_PROTOCOL = "sfml-corrections-bridge-v1";
const CORRECTIONS_BRIDGE_PATH = "/sfml-stats-corrections-bridge";
const CORRECTIONS_REQUEST_LIMIT = 8192;
const CORRECTIONS_RESPONSE_LIMIT = 262144;
const CORRECTIONS_OPERATIONS = new Set(["status", "context", "history", "preview", "commit", "undo"]);
const CORRECTIONS_API = "sfml_stats/corrections";

const correctionRandomId = () => {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID().replaceAll("-", "");
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
};
const correctionMessageSize = (value) => new TextEncoder().encode(JSON.stringify(value)).byteLength;

const correctionPick = (payload, keys) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Ungültige Nutzdaten");
    const result = {};
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(payload, key)) result[key] = payload[key];
    }
    return result;
};

const correctionApiOperation = (operation, payload) => {
    if (operation === "status") return { method: "GET", path: "status" };
    if (operation === "context") {
        const values = correctionPick(payload, ["target_date", "metric"]);
        return { method: "GET", path: `context?target_date=${encodeURIComponent(values.target_date || "")}`
            + `&metric=${encodeURIComponent(values.metric || "")}` };
    }
    if (operation === "history") {
        const limit = Number(payload?.limit ?? 100);
        if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("Ungültiges Verlaufslimit");
        return { method: "GET", path: `history?limit=${limit}` };
    }
    if (operation === "preview") return { method: "POST", path: "preview",
        payload: correctionPick(payload, ["target_date", "metric", "target_value_kwh", "reason_note", "idempotency_key"]) };
    if (operation === "commit") return { method: "POST", path: "commit",
        payload: correctionPick(payload, ["preview_token", "idempotency_key", "confirmed_large_change"]) };
    if (operation === "undo") return { method: "POST", path: "undo",
        payload: correctionPick(payload, ["event_id", "idempotency_key"]) };
    throw new Error("Nicht unterstützte Korrekturoperation");
};

const correctionSafeError = (error) => {
    const body = error?.body?.error || error?.error || {};
    const normalized = new Error(String(body.message || error?.message || "Anfrage fehlgeschlagen").slice(0, 240));
    normalized.code = String(body.code || error?.code || "request_failed").slice(0, 80);
    return normalized;
};

const correctionParentHass = (hostWindow) => {
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

class CorrectionsBridgeClient {
    constructor({ hostWindow = window, hostDocument = document, readyTimeoutMs = 10000, requestTimeoutMs = 15000 } = {}) {
        this.hostWindow = hostWindow;
        this.hostDocument = hostDocument;
        this.origin = hostWindow.location.origin;
        this.readyTimeoutMs = readyTimeoutMs;
        this.requestTimeoutMs = requestTimeoutMs;
        this.nonce = correctionRandomId();
        this.pending = new Map();
        this.initialized = false;
        this.hass = null;
        this.destroyed = false;
        this._onMessage = this._handleMessage.bind(this);
        this.ready = new Promise((resolve, reject) => {
            this._resolveReady = resolve;
            this._rejectReady = reject;
        });
    }

    mount(container) {
        if (this.destroyed) throw new Error("Home-Assistant-Verbindung wurde geschlossen");
        if (this.iframe) return;
        this.hass = correctionParentHass(this.hostWindow);
        if (this.hass) {
            this.initialized = true;
            this._resolveReady();
            return;
        }
        const iframe = this.hostDocument.createElement("iframe");
        iframe.className = "corrections-bridge-frame";
        iframe.title = "Authentifizierte Home-Assistant-Verbindung";
        iframe.tabIndex = -1;
        iframe.setAttribute("aria-hidden", "true");
        iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
        iframe.src = CORRECTIONS_BRIDGE_PATH;
        this.iframe = iframe;
        this.hostWindow.addEventListener("message", this._onMessage);
        container.append(iframe);
        this.readyTimer = this.hostWindow.setTimeout(() => {
            this._rejectReady(new Error("Home-Assistant-Anmeldung nicht verfügbar"));
        }, this.readyTimeoutMs);
    }

    _validEvent(event) {
        return event.origin === this.origin
            && event.source === this.iframe?.contentWindow
            && event.data?.protocol === CORRECTIONS_BRIDGE_PROTOCOL;
    }

    _handleMessage(event) {
        if (!this._validEvent(event)) return;
        let size;
        try { size = correctionMessageSize(event.data); } catch (_error) { return; }
        if (size > CORRECTIONS_RESPONSE_LIMIT) return;
        const message = event.data;
        if (message.type === "READY" && !this.initialized) {
            this.iframe.contentWindow.postMessage({
                protocol: CORRECTIONS_BRIDGE_PROTOCOL,
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
            const error = new Error(String(message.error?.message || "Anfrage fehlgeschlagen"));
            error.code = String(message.error?.code || "request_failed");
            pending.reject(error);
        }
    }

    async request(operation, payload = {}) {
        if (this.destroyed) throw new Error("Home-Assistant-Verbindung wurde geschlossen");
        if (!CORRECTIONS_OPERATIONS.has(operation)) throw new Error("Nicht unterstützte Korrekturoperation");
        if (correctionMessageSize(payload) > CORRECTIONS_REQUEST_LIMIT) throw new Error("Anfrage überschreitet 8 KiB");
        await this.ready;
        if (this.destroyed) throw new Error("Home-Assistant-Verbindung wurde geschlossen");
        if (this.hass) {
            const request = correctionApiOperation(operation, payload);
            try {
                return await this.hass.callApi(
                    request.method,
                    `${CORRECTIONS_API}/${request.path}`,
                    request.payload,
                );
            } catch (error) {
                throw correctionSafeError(error);
            }
        }
        const requestId = correctionRandomId();
        const message = { protocol: CORRECTIONS_BRIDGE_PROTOCOL, type: "REQUEST",
            nonce: this.nonce, requestId, operation, payload };
        return new Promise((resolve, reject) => {
            const timer = this.hostWindow.setTimeout(() => {
                this.pending.delete(requestId);
                reject(new Error("Home-Assistant-Anfrage hat das Zeitlimit überschritten"));
            }, this.requestTimeoutMs);
            this.pending.set(requestId, { resolve, reject, timer });
            this.iframe.contentWindow.postMessage(message, this.origin);
        });
    }

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.hostWindow.removeEventListener("message", this._onMessage);
        this.hostWindow.clearTimeout(this.readyTimer);
        if (!this.initialized) this._resolveReady();
        const error = new Error("Home-Assistant-Verbindung wurde geschlossen");
        for (const pending of this.pending.values()) {
            this.hostWindow.clearTimeout(pending.timer);
            pending.reject(error);
        }
        this.pending.clear();
        this.hass = null;
        this.iframe?.remove();
        this.iframe = null;
    }
}

const ModernCorrectionsPage = {
    template: `
        <section class="corrections-page" aria-labelledby="corrections-title">
            <div ref="bridgeHost" class="corrections-bridge-host" aria-hidden="true"></div>
            <div class="corrections-hero">
                <div><span class="corrections-kicker">Premium · auditierbare Messwerte</span><h2 id="corrections-title">Energie-Korrekturen</h2><p>Abgeschlossene Tageswerte für Netzbezug, Netzeinspeisung und PV-Ertrag sicher berichtigen.</p></div>
                <span class="corrections-badge">Admin · lokal oder HA Cloud</span>
            </div>
            <div class="corrections-notice" role="note"><strong>Dynamische Tarife</strong><span>Der Tages-Energiewert wird korrigiert. Historische Stundenkosten bleiben unverändert und werden nicht als exakt korrigiert ausgewiesen.</span></div>
            <div v-if="message" :class="['corrections-state', messageError ? 'error' : 'notice']" :role="messageError ? 'alert' : 'status'">{{ message }}</div>
            <div v-if="loading" class="corrections-state" role="status">Sichere Home-Assistant-Verbindung wird hergestellt …</div>
            <div v-else-if="locked" class="corrections-state locked" role="status"><strong>Premium-Adminfunktion nicht verfügbar</strong><span>{{ locked }}</span></div>

            <template v-else>
                <div class="corrections-grid corrections-grid-single">
                    <article class="corrections-card corrections-wide">
                        <span class="corrections-eyebrow">Absoluter Zielwert</span><h3>Tageswert korrigieren</h3>
                        <p>Wähle den abgeschlossenen Tag und trage den richtigen Tageswert ein. Vor dem Speichern wird immer eine Vorschau angezeigt.</p>
                        <label><span>Abgeschlossener Tag</span><input v-model="form.target_date" type="date" :max="latestCompletedDate" @input="invalidateSelection" @change="loadContext"></label>
                        <label><span>Messwert</span><select v-model="form.metric" @change="loadContext"><option value="grid_import_day_kwh">Netzbezug</option><option value="grid_export_day_kwh">Netzeinspeisung</option><option value="solar_yield_day_kwh">PV-Ertrag</option></select></label>
                        <div class="corrections-context-card" aria-live="polite">
                            <div v-if="contextBusy" class="corrections-muted">Vorhandener Messwert wird geladen …</div>
                            <div v-else-if="contextError" class="corrections-context-error">{{ contextError }}</div>
                            <template v-else-if="contextData">
                                <div class="corrections-context-heading"><div><span class="corrections-eyebrow">Vorhandener Messwert</span><strong>{{ metricLabel(contextData.metric) }} · {{ contextData.target_date }}</strong></div><span :class="['corrections-source-state', contextData.is_corrected ? 'corrected' : 'original']">{{ contextData.is_corrected ? "Bereits korrigiert" : "Originalwert" }}</span></div>
                                <div class="corrections-values corrections-source-values"><div><span>DB-Rohwert</span><strong>{{ kwh(contextData.source_value_kwh) }}</strong></div><div><span>Aktuell wirksam</span><strong>{{ kwh(contextData.effective_value_kwh) }}</strong></div><div><span>Summe Stundenwerte</span><strong>{{ kwh(contextData.hourly_sum_kwh) }}</strong></div><div><span>Tag minus Stunden</span><strong>{{ signedKwh(contextData.hourly_delta_kwh) }}</strong></div></div>
                                <div class="corrections-hour-heading"><strong>Stundenwerte zur Diagnose</strong><span>{{ contextData.available_hours }}/{{ contextData.expected_hours }} Stunden vorhanden</span></div>
                                <div v-if="contextData.hourly_values.length" class="corrections-hour-grid"><div v-for="row in contextData.hourly_values" :key="row.hour_key"><span>{{ hourLabel(row.hour) }}</span><strong>{{ number(row.value_kwh) }}</strong></div></div>
                                <p v-else class="corrections-muted">Für diesen Tag sind keine Stundenwerte vorhanden.</p>
                                <small class="corrections-muted">Die Stundenwerte dienen nur zur Fehleranalyse. Korrigiert wird weiterhin ausschließlich der Tageswert.</small>
                            </template>
                            <div v-else class="corrections-muted">Wähle einen abgeschlossenen Tag und einen Messwert.</div>
                        </div>
                        <label><span>Neuer korrekter Tageswert (kWh)</span><input v-model="form.target_value_kwh" inputmode="decimal" placeholder="Wert eingeben" @input="invalidatePreview" @change="invalidatePreview"></label>
                        <label><span>Notiz (optional, max. 160)</span><textarea v-model="form.reason_note" maxlength="160" aria-describedby="correction-note-help" @input="invalidatePreview" @change="invalidatePreview"></textarea></label>
                        <small id="correction-note-help" class="corrections-muted">Bitte keine personenbezogenen Daten eingeben.</small>
                        <button class="button" type="button" :disabled="previewBusy || contextBusy || !contextData || !form.target_value_kwh" @click="preview">{{ previewBusy ? "Vorschau wird geprüft …" : "Vorschau" }}</button>
                    </article>
                </div>

                <article class="corrections-card corrections-wide">
                    <span class="corrections-eyebrow">Tokengebundener Serverstand</span><h3>Vorschau</h3>
                    <p v-if="!previewData" class="corrections-muted">Noch keine gültige Vorschau. Eine Vorschau ist fünf Minuten und einmalig gültig.</p>
                    <template v-else>
                        <p class="corrections-context">{{ previewContext }}</p>
                        <div class="corrections-values"><div><span>Vorher</span><strong>{{ kwh(previewData.before_kwh) }}</strong></div><div><span>Nachher</span><strong>{{ kwh(previewData.after_kwh) }}</strong></div><div><span>Differenz</span><strong>{{ signedKwh(previewData.delta_kwh) }}</strong></div></div>
                        <div v-if="previewData.requires_second_confirmation" class="corrections-danger">Große Änderung: zweite Bestätigung erforderlich.</div>
                        <label v-if="previewData.requires_second_confirmation" class="corrections-confirm"><input v-model="confirmLarge" type="checkbox"><span>Ich habe Vorher/Nachher geprüft und bestätige die große Änderung.</span></label>
                        <button class="button" type="button" :disabled="commitBusy || (previewData.requires_second_confirmation && !confirmLarge)" @click="commit">{{ commitBusy ? "Wird gespeichert …" : "Korrektur speichern" }}</button>
                    </template>
                </article>

                <article class="corrections-card corrections-wide">
                    <span class="corrections-eyebrow">Append-only Audit</span><h3>Verlauf</h3>
                    <div class="corrections-table-wrap"><table><thead><tr><th>Zeit</th><th>Tag</th><th>Metrik</th><th>Ziel</th><th>Δ kWh</th><th>Notiz</th><th></th></tr></thead><tbody><tr v-for="row in history" :key="row.event_id"><td>{{ dateTime(row.created_at) }}</td><td>{{ row.target_date }}</td><td>{{ metricLabel(row.metric) }}</td><td>{{ number(row.absolute_value_kwh) }}</td><td>{{ signed(row.delta_kwh) }}</td><td>{{ row.reason_note || "–" }}</td><td><button v-if="row.undoable" class="button secondary compact" type="button" @click="undo(row.event_id)">Rückgängig</button></td></tr></tbody></table></div>
                </article>
            </template>
        </section>`,
    setup() {
        const { ref, reactive, computed, onMounted, onUnmounted } = Vue;
        const bridgeHost = ref(null);
        const loading = ref(true);
        const locked = ref("");
        const message = ref("");
        const messageError = ref(false);
        const previewBusy = ref(false);
        const commitBusy = ref(false);
        const previewData = ref(null);
        const previewIdempotencyKey = ref(null);
        const confirmLarge = ref(false);
        const history = ref([]);
        const contextData = ref(null);
        const contextBusy = ref(false);
        const contextError = ref("");
        const latestCompletedDate = ref("");
        const form = reactive({ target_date: "", metric: "grid_import_day_kwh", target_value_kwh: "",
            reason_note: "" });
        let bridge;
        let previewGeneration = 0;
        let contextGeneration = 0;

        const showMessage = (text, error = false) => { message.value = text; messageError.value = error; };
        const unwrap = (response) => response?.success === true ? response.data : response?.data ?? response;
        const snapshot = () => JSON.stringify(form);
        const invalidatePreview = () => {
            previewGeneration += 1;
            previewData.value = null;
            previewIdempotencyKey.value = null;
            confirmLarge.value = false;
            previewBusy.value = false;
        };
        const invalidateSelection = () => {
            invalidatePreview();
            contextGeneration += 1;
            contextData.value = null;
            contextError.value = "";
            contextBusy.value = false;
        };
        const call = async (operation, payload = {}) => {
            try { return unwrap(await bridge.request(operation, payload)); }
            catch (error) {
                if (error.code === "premium_required") locked.value = "Diese Funktion benötigt eine gültige Premium-Full-Package-Lizenz. Demo-Daten können nicht geschrieben werden.";
                else if (error.code === "admin_required") locked.value = "Für Korrekturen ist ein angemeldetes Home-Assistant-Administratorkonto erforderlich.";
                else if (error.code === "local_access_required") locked.value = "Korrekturen sind nur über die lokale Home-Assistant-Oberfläche oder Home Assistant Cloud verfügbar.";
                throw error;
            }
        };
        const loadHistory = async () => { history.value = await call("history", { limit: 100 }); };
        const loadContext = async () => {
            invalidateSelection();
            if (!form.target_date || !form.metric) return;
            const generation = contextGeneration;
            const selection = `${form.target_date}:${form.metric}`;
            contextBusy.value = true;
            try {
                const result = await call("context", {
                    target_date: form.target_date, metric: form.metric,
                });
                if (generation !== contextGeneration || selection !== `${form.target_date}:${form.metric}`) return;
                contextData.value = result;
            } catch (error) {
                if (generation === contextGeneration) contextError.value = error.message;
            } finally {
                if (generation === contextGeneration) contextBusy.value = false;
            }
        };
        const load = async () => {
            try {
                const status = await call("status");
                latestCompletedDate.value = status.latest_completed_date || "";
                if (!form.target_date) form.target_date = latestCompletedDate.value;
                await Promise.all([loadHistory(), loadContext()]);
            } catch (error) {
                if (!locked.value) locked.value = error.message;
            } finally { loading.value = false; }
        };
        const preview = async () => {
            invalidatePreview();
            const generation = previewGeneration;
            const formSnapshot = snapshot();
            const idempotencyKey = correctionRandomId();
            previewBusy.value = true;
            try {
                const result = await call("preview", { ...form, idempotency_key: idempotencyKey });
                if (generation !== previewGeneration || formSnapshot !== snapshot()) return;
                previewData.value = result;
                previewIdempotencyKey.value = idempotencyKey;
                confirmLarge.value = false;
                showMessage("");
            } catch (error) {
                if (generation === previewGeneration && formSnapshot === snapshot()) showMessage(error.message, true);
            } finally {
                if (generation === previewGeneration) previewBusy.value = false;
            }
        };
        const commit = async () => {
            const serverPreview = previewData.value;
            if (!serverPreview) return;
            if (serverPreview.requires_second_confirmation && !confirmLarge.value) return;
            commitBusy.value = true;
            try {
                await call("commit", { preview_token: serverPreview.preview_token,
                    idempotency_key: previewIdempotencyKey.value, confirmed_large_change: confirmLarge.value });
                invalidatePreview();
                showMessage("Korrektur gespeichert.");
                await loadHistory();
            } catch (error) { showMessage(error.message, true); }
            finally { commitBusy.value = false; }
        };
        const undo = async (eventId) => {
            if (!window.confirm("Diese Korrektur durch ein Gegenereignis rückgängig machen?")) return;
            try {
                await call("undo", { event_id: eventId, idempotency_key: correctionRandomId() });
                showMessage("Korrektur rückgängig gemacht.");
                await loadHistory();
            } catch (error) { showMessage(error.message, true); }
        };
        const number = (value) => Number(value).toFixed(3);
        const signed = (value) => `${Number(value) >= 0 ? "+" : ""}${number(value)}`;
        const kwh = (value) => `${number(value)} kWh`;
        const signedKwh = (value) => `${signed(value)} kWh`;
        const metricLabel = (metric) => ({
            grid_import_day_kwh: "Netzbezug",
            grid_export_day_kwh: "Netzeinspeisung",
            solar_yield_day_kwh: "PV-Ertrag",
        })[metric] || metric;
        const dateTime = (value) => new Date(value).toLocaleString();
        const hourLabel = (value) => `${String(value).padStart(2, "0")}:00`;
        const previewContext = computed(() => {
            const value = previewData.value;
            if (!value) return "";
            return `${value.target_date} · ${metricLabel(value.metric)}`;
        });

        onMounted(() => { bridge = new CorrectionsBridgeClient(); bridge.mount(bridgeHost.value); load(); });
        onUnmounted(() => { previewGeneration += 1; contextGeneration += 1; bridge?.destroy(); });
        return { bridgeHost, loading, locked, message, messageError, previewBusy, commitBusy,
            previewData, confirmLarge, history, form, previewContext, invalidatePreview,
            contextData, contextBusy, contextError, latestCompletedDate, invalidateSelection,
            loadContext, preview, commit, undo, number, signed, kwh, signedKwh, metricLabel,
            dateTime, hourLabel };
    },
};

if (typeof window !== "undefined") {
    window.CorrectionsBridgeClient = CorrectionsBridgeClient;
    window.ModernCorrectionsPage = ModernCorrectionsPage;
}
if (typeof module !== "undefined") module.exports = { CorrectionsBridgeClient };
