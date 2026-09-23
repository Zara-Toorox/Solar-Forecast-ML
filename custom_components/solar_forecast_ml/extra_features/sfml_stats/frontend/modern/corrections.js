const CORRECTIONS_BRIDGE_PROTOCOL = "sfml-corrections-bridge-v1";
const CORRECTIONS_BRIDGE_PATH = "/sfml-stats-corrections-bridge";
const CORRECTIONS_REQUEST_LIMIT = 8192;
const CORRECTIONS_RESPONSE_LIMIT = 262144;
const CORRECTIONS_OPERATIONS = new Set(["status", "context", "history", "preview", "commit", "undo", "range_preview", "range_commit", "csv_commit", "undo_batch"]);
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
        const values = correctionPick(payload, ["target_date", "metric", "mode"]);
        return { method: "GET", path: `context?target_date=${encodeURIComponent(values.target_date || "")}`
            + `&metric=${encodeURIComponent(values.metric || "")}`
            + (values.mode && values.mode !== "correct" ? `&mode=${encodeURIComponent(values.mode)}` : "") };
    }
    if (operation === "history") {
        const limit = Number(payload?.limit ?? 100);
        if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("Ungültiges Verlaufslimit");
        return { method: "GET", path: `history?limit=${limit}` };
    }
    if (operation === "preview") return { method: "POST", path: "preview",
        payload: correctionPick(payload, ["target_date", "metric", "target_value_kwh", "reason_note", "idempotency_key", "mode", "evidence_type"]) };
    if (operation === "commit") return { method: "POST", path: "commit",
        payload: correctionPick(payload, ["preview_token", "idempotency_key", "confirmed_large_change"]) };
    if (operation === "undo") return { method: "POST", path: "undo",
        payload: correctionPick(payload, ["event_id", "idempotency_key"]) };
    if (operation === "range_preview") return { method: "POST", path: "range/preview",
        payload: correctionPick(payload, ["metric", "start_date", "end_date", "target_sum_kwh", "weighting", "idempotency_key"]) };
    if (operation === "range_commit") return { method: "POST", path: "range/commit",
        payload: correctionPick(payload, ["preview_token", "idempotency_key", "confirmed_large_change"]) };
    if (operation === "csv_commit") return { method: "POST", path: "csv/commit",
        payload: correctionPick(payload, ["preview_token", "idempotency_key", "confirmed_large_change"]) };
    if (operation === "undo_batch") return { method: "POST", path: "undo_batch",
        payload: correctionPick(payload, ["batch_id", "idempotency_key"]) };
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

    async authorizedFetch(path, init = {}) {
        await this.ready;
        if (this.destroyed) throw new Error("Home-Assistant-Verbindung wurde geschlossen");
        if (typeof this.hass?.fetchWithAuth !== "function") {
            throw new Error("Home-Assistant-Anmeldung nicht verfügbar");
        }
        const response = await this.hass.fetchWithAuth(`/api/${CORRECTIONS_API}/${path}`, init);
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            const payload = await response.json();
            if (!response.ok || payload?.success === false) throw correctionSafeError({ body: payload, message: payload?.error?.message });
            return payload;
        }
        if (!response.ok) throw new Error("Anfrage fehlgeschlagen");
        return response;
    }
}

const ModernCorrectionsPage = {
    template: `
        <section class="corrections-page" aria-labelledby="corrections-title">
            <div ref="bridgeHost" class="corrections-bridge-host" aria-hidden="true"></div>
            <div class="corrections-hero">
                <div><span class="corrections-kicker">Premium · auditierbare Messwerte</span><h2 id="corrections-title">Energie-Korrekturen</h2><p>Abgeschlossene Tageswerte korrigieren oder fehlende Tage nachtragen.</p></div>
                <span class="corrections-badge">Admin · lokal oder HA Cloud</span>
            </div>
            <div class="corrections-notice" role="note"><strong>Dynamische Tarife</strong><span>Der Tages-Energiewert wird korrigiert. Historische Stundenkosten bleiben unverändert und werden nicht als exakt korrigiert ausgewiesen.</span></div>
            <div v-if="message" :class="['corrections-state', messageError ? 'error' : 'notice']" :role="messageError ? 'alert' : 'status'">{{ message }}</div>
            <div v-if="loading" class="corrections-state" role="status">Sichere Home-Assistant-Verbindung wird hergestellt …</div>
            <div v-else-if="locked" class="corrections-state locked" role="status"><strong>Premium-Adminfunktion nicht verfügbar</strong><span>{{ locked }}</span></div>

            <template v-else>
                <div class="corrections-grid corrections-grid-single">
                    <article class="corrections-card corrections-wide" data-correction-card="day">
                        <span class="corrections-eyebrow">{{ label('corrections.cardDay', 'Einzeltag') }}</span><h3>Tageswert korrigieren</h3>
                        <p>Wähle den abgeschlossenen Tag und trage den richtigen Tageswert ein. Vor dem Speichern wird immer eine Vorschau angezeigt.</p>
                        <div class="corrections-confirm"><button class="button compact" :class="{ secondary: form.mode !== 'correct' }" type="button" @click="setMode('correct')">Korrigieren</button><button class="button compact" :class="{ secondary: form.mode !== 'backfill' }" type="button" @click="setMode('backfill')">Nachtragen</button></div>
                        <label><span>Abgeschlossener Tag</span><input v-model="form.target_date" type="date" :max="latestCompletedDate" @input="invalidateSelection" @change="loadContext"></label>
                        <label><span>Messwert</span><select v-model="form.metric" @change="loadContext"><option v-for="item in metricOptions" :key="item.id" :value="item.id">{{ metricLabel(item.id) }}</option></select></label>
                        <label v-if="form.mode === 'backfill'"><span>Nachweis</span><select v-model="form.evidence_type" @change="invalidatePreview"><option value="utility_invoice">Stromrechnung</option><option value="meter_portal_export">Zählerportal</option><option value="signed_daily_report">Tagesprotokoll</option></select></label>
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
                        <div class="corrections-context-card">
                            <span class="corrections-eyebrow">Tokengebundener Serverstand</span><h3>Vorschau</h3>
                            <p v-if="!previewData" class="corrections-muted">Noch keine gültige Vorschau. Eine Vorschau ist fünf Minuten und einmalig gültig.</p>
                            <template v-else>
                                <p class="corrections-context">{{ previewContext }}</p>
                                <div class="corrections-values"><div><span>Vorher</span><strong>{{ kwh(previewData.before_kwh) }}</strong></div><div><span>Nachher</span><strong>{{ kwh(previewData.after_kwh) }}</strong></div><div><span>Differenz</span><strong>{{ signedKwh(previewData.delta_kwh) }}</strong></div></div>
                                <div v-if="previewData.balance_warnings && previewData.balance_warnings.length" class="corrections-danger"><div v-for="(warning, index) in previewData.balance_warnings" :key="index">{{ balanceText(warning) }}</div></div>
                                <div v-if="previewData.requires_second_confirmation" class="corrections-danger">Große Änderung: zweite Bestätigung erforderlich.</div>
                                <label v-if="previewData.requires_second_confirmation" class="corrections-confirm"><input v-model="confirmLarge" type="checkbox"><span>Ich habe Vorher/Nachher geprüft und bestätige die große Änderung.</span></label>
                            </template>
                            <button class="button" type="button" :disabled="commitBusy || !previewData || (previewData && previewData.requires_second_confirmation && !confirmLarge)" @click="commit">{{ commitBusy ? "Wird gespeichert …" : label('corrections.apply', 'Übernehmen') }}</button>
                        </div>
                    </article>
                </div>

                <article class="corrections-card corrections-wide" data-correction-card="range">
                    <span class="corrections-eyebrow">{{ label('corrections.cardRange', 'Zeitraum') }}</span><h3>{{ label('corrections.cardRange', 'Zeitraum') }}</h3>
                    <p>{{ label('corrections.rangeHelp', 'Metrik, Zeitraum und Zielsumme. Vor dem Speichern wird immer eine Vorschau angezeigt.') }}</p>
                    <label><span>{{ label('corrections.metricLabel', 'Metrik') }}</span><select v-model="rangeForm.metric" @change="invalidateRangePreview"><option v-for="item in metricOptions" :key="item.id" :value="item.id">{{ metricLabel(item.id) }}</option></select></label>
                    <label><span>{{ label('corrections.rangeStart', 'Start') }}</span><input v-model="rangeForm.start_date" type="date" :max="latestCompletedDate" @input="invalidateRangePreview" @change="invalidateRangePreview"></label>
                    <label><span>{{ label('corrections.rangeEnd', 'Ende') }}</span><input v-model="rangeForm.end_date" type="date" :max="latestCompletedDate" @input="invalidateRangePreview" @change="invalidateRangePreview"></label>
                    <label><span>{{ label('corrections.rangeTarget', 'Zielsumme (kWh)') }}</span><input v-model="rangeForm.target_sum_kwh" inputmode="decimal" @input="invalidateRangePreview" @change="invalidateRangePreview"></label>
                    <label><span>{{ label('corrections.rangeWeight', 'Gewichtung') }}</span><select v-model="rangeForm.weighting" @change="invalidateRangePreview"><option value="measured">{{ label('corrections.weightMeasured', 'Nach Messwerten') }}</option><option value="uniform">{{ label('corrections.weightUniform', 'Gleichmäßig') }}</option></select></label>
                    <button class="button" type="button" :disabled="rangePreviewBusy || !rangeForm.metric || !rangeForm.start_date || !rangeForm.end_date || !rangeForm.target_sum_kwh" @click="previewRange">{{ rangePreviewBusy ? "Vorschau wird geprüft …" : "Vorschau" }}</button>
                    <p v-if="!rangePreview" class="corrections-muted">Noch keine gültige Vorschau. Eine Vorschau ist fünf Minuten und einmalig gültig.</p>
                    <template v-else>
                        <p v-if="rangePreview.fallback_reason" class="corrections-danger">{{ label('corrections.uniformFallback', 'Gleichmäßige Verteilung, weil die Rohsumme 0 ist.') }}</p>
                        <div class="corrections-values"><div><span>{{ label('corrections.targetHit', 'Zielsumme getroffen') }}</span><strong>{{ kwh(rangePreview.after_sum_kwh) }}</strong></div><div><span>{{ label('corrections.rangeTarget', 'Zielsumme (kWh)') }}</span><strong>{{ kwh(rangePreview.target_sum_kwh) }}</strong></div></div>
                        <div class="corrections-table-wrap"><table><thead><tr><th>Tag</th><th>Vorher</th><th>Nachher</th></tr></thead><tbody><tr v-for="day in rangePreview.days" :key="day.date"><td>{{ day.date }}</td><td>{{ kwh(day.before_kwh) }}</td><td>{{ kwh(day.after_kwh) }}</td></tr></tbody></table></div>
                        <div v-if="rangePreview.requires_second_confirmation" class="corrections-danger">Große Änderung: zweite Bestätigung erforderlich.</div>
                        <label v-if="rangePreview.requires_second_confirmation" class="corrections-confirm"><input v-model="rangeConfirm" type="checkbox"><span>Ich habe Vorher/Nachher geprüft und bestätige die große Änderung.</span></label>
                    </template>
                    <button class="button" type="button" :disabled="rangeCommitBusy || !rangePreview || rangeNeedsConfirm" @click="commitRange">{{ rangeCommitBusy ? "Wird gespeichert …" : label('corrections.apply', 'Übernehmen') }}</button>
                </article>

                <article class="corrections-card corrections-wide" data-correction-card="csv">
                    <span class="corrections-eyebrow">{{ label('corrections.cardCsv', 'CSV-Import') }}</span><h3>{{ label('corrections.cardCsv', 'CSV-Import') }}</h3>
                    <p>{{ label('corrections.importHelp', 'Vorlage laden, Datei wählen und die Vorschau prüfen, bevor etwas übernommen wird.') }}</p>
                    <button class="button secondary" type="button" @click="downloadTemplate">{{ label('corrections.csvTemplate', 'Vorlage herunterladen') }}</button>
                    <label><span>{{ label('corrections.csvFile', 'Datei wählen') }}</span><input type="file" accept=".csv,text/csv" @change="onCsvFile"></label>
                    <button class="button" type="button" :disabled="csvPreviewBusy || !csvFile" @click="previewCsv">{{ csvPreviewBusy ? "Vorschau wird geprüft …" : "Vorschau" }}</button>
                    <p v-if="!csvPreview" class="corrections-muted">Noch keine gültige Vorschau. Eine Vorschau ist fünf Minuten und einmalig gültig.</p>
                    <template v-else>
                        <div class="corrections-values"><div><span>{{ label('corrections.rowsTotal', 'Zeilen gesamt') }}</span><strong>{{ csvPreview.rows_total }}</strong></div><div><span>{{ label('corrections.rowsAccepted', 'Übernommen') }}</span><strong>{{ csvPreview.accepted }}</strong></div><div><span>{{ label('corrections.rowsRejected', 'Abgelehnt') }}</span><strong>{{ csvPreview.rejected }}</strong></div></div>
                        <div v-if="csvPreview.rejections && csvPreview.rejections.length" class="corrections-table-wrap"><table><thead><tr><th>{{ label('corrections.line', 'Zeile') }}</th><th>{{ label('corrections.reasonHeading', 'Grund') }}</th></tr></thead><tbody><tr v-for="item in csvPreview.rejections" :key="item.line"><td>{{ item.line }}</td><td>{{ reasonLabel(item.reason) }}</td></tr></tbody></table></div>
                        <p class="corrections-context">{{ label('corrections.daysCovered', 'Abgedeckte Tage') }}: {{ (csvPreview.days_covered || []).join(', ') || '–' }}</p>
                        <div class="corrections-table-wrap"><table><thead><tr><th>{{ label('corrections.metricLabel', 'Metrik') }}</th><th>{{ label('corrections.sumDelta', 'Summen-Delta') }}</th></tr></thead><tbody><tr v-for="(delta, metric) in csvPreview.sum_delta_by_metric" :key="metric"><td>{{ metricLabel(metric) }}</td><td>{{ signedKwh(delta) }}</td></tr></tbody></table></div>
                        <div v-if="csvPreview.requires_second_confirmation" class="corrections-danger">Große Änderung: zweite Bestätigung erforderlich.</div>
                        <label v-if="csvPreview.requires_second_confirmation" class="corrections-confirm"><input v-model="csvConfirm" type="checkbox"><span>Ich habe Vorher/Nachher geprüft und bestätige die große Änderung.</span></label>
                    </template>
                    <button class="button" type="button" :disabled="csvCommitBusy || !csvPreview || csvNeedsConfirm" @click="commitCsv">{{ csvCommitBusy ? "Wird gespeichert …" : label('corrections.apply', 'Übernehmen') }}</button>
                </article>

                <article class="corrections-card corrections-wide" data-correction-card="history">
                    <span class="corrections-eyebrow">Append-only Audit</span><h3>{{ label('corrections.cardHistory', 'Verlauf') }}</h3>
                    <div class="corrections-table-wrap"><table><thead><tr><th>Zeit</th><th>{{ label('corrections.affectedDays', 'Betroffene Tage') }}</th><th>Metrik</th><th>Ziel</th><th>Δ kWh</th><th>Notiz</th><th></th></tr></thead><tbody>
                        <tr v-for="batch in batchRows" :key="batch.batch_id"><td>{{ dateTime(batch.created_at) }}</td><td>{{ batch.dayCount }}</td><td>{{ batch.metricLabel }}</td><td>–</td><td>–</td><td>–</td><td><button v-if="batch.undoable" class="button secondary compact" type="button" @click="undoBatch(batch.batch_id)">{{ label('corrections.undoBatch', 'Ganzen Batch rückgängig') }}</button></td></tr>
                        <tr v-for="row in singleRows" :key="row.event_id"><td>{{ dateTime(row.created_at) }}</td><td>{{ row.target_date }}</td><td>{{ metricLabel(row.metric) }}<span v-if="row.mode === 'backfill'"> · Nachtrag</span></td><td>{{ number(row.absolute_value_kwh) }}</td><td>{{ signed(row.delta_kwh) }}</td><td>{{ row.reason_note || "–" }}</td><td><button v-if="row.undoable" class="button secondary compact" type="button" @click="undo(row.event_id)">Rückgängig</button></td></tr>
                    </tbody></table></div>
                </article>

                <article class="corrections-card corrections-wide" data-correction-card="prices">
                    <span class="corrections-eyebrow">Grid Price Monitor</span><h3>{{ label('corrections.pricesTitle', 'Preise und Monatskorrekturen') }}</h3>
                    <p>{{ label('corrections.pricesBody', 'Preise und Monatskorrekturen gehören zum Grid Price Monitor.') }}</p>
                    <a class="button" href="#gpm">{{ label('corrections.pricesLink', 'Zur GPM-Seite') }}</a>
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
        const metricOptions = ref([
            { id: "grid_import_day_kwh", i18n_key: "corrections.metric.gridImport" },
            { id: "grid_export_day_kwh", i18n_key: "corrections.metric.gridExport" },
            { id: "solar_yield_day_kwh", i18n_key: "corrections.metric.solarYield" },
        ]);
        const form = reactive({ target_date: "", metric: "grid_import_day_kwh", target_value_kwh: "",
            reason_note: "", mode: "correct", evidence_type: "utility_invoice" });
        const rangeForm = reactive({ metric: "grid_import_day_kwh", start_date: "", end_date: "",
            target_sum_kwh: "", weighting: "measured" });
        const rangePreview = ref(null);
        const rangePreviewBusy = ref(false);
        const rangeCommitBusy = ref(false);
        const rangeConfirm = ref(false);
        const rangeIdempotencyKey = ref(null);
        const csvFile = ref(null);
        const csvPreview = ref(null);
        const csvPreviewBusy = ref(false);
        const csvCommitBusy = ref(false);
        const csvConfirm = ref(false);
        const csvIdempotencyKey = ref(null);
        let bridge;
        let previewGeneration = 0;
        let contextGeneration = 0;
        let rangeGeneration = 0;
        let csvGeneration = 0;

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
            const selection = `${form.target_date}:${form.metric}:${form.mode}`;
            contextBusy.value = true;
            try {
                const result = await call("context", {
                    target_date: form.target_date, metric: form.metric, mode: form.mode,
                });
                if (generation !== contextGeneration || selection !== `${form.target_date}:${form.metric}:${form.mode}`) return;
                contextData.value = result;
            } catch (error) {
                if (generation === contextGeneration) contextError.value = error.message;
            } finally {
                if (generation === contextGeneration) contextBusy.value = false;
            }
        };
        const applyRegistry = (status) => {
            const registry = Array.isArray(status?.registry) ? status.registry : [];
            if (registry.length) {
                metricOptions.value = registry;
                return;
            }
            const metrics = Array.isArray(status?.metrics) ? status.metrics : [];
            if (metrics.length) metricOptions.value = metrics.map((id) => ({ id, i18n_key: "" }));
        };
        const setMode = (mode) => {
            if (form.mode === mode) return;
            form.mode = mode;
            loadContext();
        };
        const load = async () => {
            try {
                const status = await call("status");
                applyRegistry(status);
                if (!metricOptions.value.some((item) => item.id === form.metric) && metricOptions.value.length) {
                    form.metric = metricOptions.value[0].id;
                }
                latestCompletedDate.value = status.latest_completed_date || "";
                if (!form.target_date) form.target_date = latestCompletedDate.value;
                rangeForm.metric = form.metric;
                if (!rangeForm.start_date) rangeForm.start_date = latestCompletedDate.value;
                if (!rangeForm.end_date) rangeForm.end_date = latestCompletedDate.value;
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
        const invalidateRangePreview = () => {
            rangeGeneration += 1;
            rangePreview.value = null;
            rangeIdempotencyKey.value = null;
            rangeConfirm.value = false;
            rangePreviewBusy.value = false;
        };
        const snapshotRange = () => JSON.stringify(rangeForm);
        const previewRange = async () => {
            invalidateRangePreview();
            const generation = rangeGeneration;
            const formSnapshot = snapshotRange();
            const idempotencyKey = correctionRandomId();
            rangePreviewBusy.value = true;
            try {
                const result = await call("range_preview", { ...rangeForm, idempotency_key: idempotencyKey });
                if (generation !== rangeGeneration || formSnapshot !== snapshotRange()) return;
                rangePreview.value = result;
                rangeIdempotencyKey.value = idempotencyKey;
                rangeConfirm.value = false;
                showMessage("");
            } catch (error) {
                if (generation === rangeGeneration && formSnapshot === snapshotRange()) showMessage(error.message, true);
            } finally {
                if (generation === rangeGeneration) rangePreviewBusy.value = false;
            }
        };
        const commitRange = async () => {
            if (!rangePreview.value) return;
            if (rangePreview.value.requires_second_confirmation && !rangeConfirm.value) return;
            rangeCommitBusy.value = true;
            try {
                await call("range_commit", { preview_token: rangePreview.value.preview_token,
                    idempotency_key: rangeIdempotencyKey.value, confirmed_large_change: rangeConfirm.value });
                invalidateRangePreview();
                showMessage(label("corrections.saved", "Korrektur gespeichert."));
                await loadHistory();
            } catch (error) { showMessage(error.message, true); }
            finally { rangeCommitBusy.value = false; }
        };
        const csvStamp = () => {
            const file = csvFile.value;
            return file ? `${file.name}:${file.size}:${file.lastModified}` : "";
        };
        const invalidateCsvPreview = () => {
            csvGeneration += 1;
            csvPreview.value = null;
            csvIdempotencyKey.value = null;
            csvConfirm.value = false;
            csvPreviewBusy.value = false;
        };
        const onCsvFile = (event) => {
            csvFile.value = event.target.files && event.target.files[0] ? event.target.files[0] : null;
            invalidateCsvPreview();
        };
        const previewCsv = async () => {
            const file = csvFile.value;
            if (!file) return;
            invalidateCsvPreview();
            const generation = csvGeneration;
            const stamp = `${file.name}:${file.size}:${file.lastModified}`;
            const idempotencyKey = correctionRandomId();
            csvPreviewBusy.value = true;
            try {
                const raw = await file.text();
                const result = unwrap(await bridge.authorizedFetch(
                    `csv/preview?idempotency_key=${encodeURIComponent(idempotencyKey)}`,
                    { method: "POST", headers: { "Content-Type": "text/csv; charset=utf-8" }, body: raw },
                ));
                if (generation !== csvGeneration || stamp !== csvStamp()) return;
                csvPreview.value = result;
                csvIdempotencyKey.value = idempotencyKey;
                csvConfirm.value = false;
                showMessage("");
            } catch (error) {
                if (generation === csvGeneration && stamp === csvStamp()) showMessage(error.message, true);
            } finally {
                if (generation === csvGeneration) csvPreviewBusy.value = false;
            }
        };
        const commitCsv = async () => {
            if (!csvPreview.value) return;
            if (csvPreview.value.requires_second_confirmation && !csvConfirm.value) return;
            csvCommitBusy.value = true;
            try {
                await call("csv_commit", { preview_token: csvPreview.value.preview_token,
                    idempotency_key: csvIdempotencyKey.value, confirmed_large_change: csvConfirm.value });
                invalidateCsvPreview();
                csvFile.value = null;
                showMessage(label("corrections.saved", "Korrektur gespeichert."));
                await loadHistory();
            } catch (error) { showMessage(error.message, true); }
            finally { csvCommitBusy.value = false; }
        };
        const downloadTemplate = async () => {
            try {
                const response = await bridge.authorizedFetch("csv/template", { method: "GET" });
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "sfml_stats_corrections.csv";
                document.body.append(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(url);
            } catch (error) { showMessage(error.message, true); }
        };
        const undoBatch = async (batchId) => {
            if (!window.confirm(label("corrections.undoBatchConfirm", "Diesen ganzen Batch rückgängig machen?"))) return;
            try {
                await call("undo_batch", { batch_id: batchId, idempotency_key: correctionRandomId() });
                showMessage(label("corrections.batchUndone", "Batch rückgängig gemacht."));
                await loadHistory();
            } catch (error) { showMessage(error.message, true); }
        };
        const number = (value) => Number(value).toFixed(3);
        const signed = (value) => `${Number(value) >= 0 ? "+" : ""}${number(value)}`;
        const kwh = (value) => `${number(value)} kWh`;
        const signedKwh = (value) => `${signed(value)} kWh`;
        const metricText = {
            home_consumption_day_kwh: "Hausverbrauch",
            grid_import_day_kwh: "Netzbezug",
            smartmeter_import_day_kwh: "Zählerbezug",
            grid_export_day_kwh: "Netzeinspeisung",
            smartmeter_export_day_kwh: "Zählereinspeisung",
            solar_yield_day_kwh: "PV-Ertrag",
            solar_to_house_day_kwh: "PV zu Haus",
            solar_to_battery_day_kwh: "PV zu Akku",
            battery_to_house_day_kwh: "Akku zu Haus",
            grid_to_house_day_kwh: "Netz zu Haus",
            grid_to_battery_day_kwh: "Netz zu Akku",
            consumer_heatpump_day_kwh: "Wärmepumpe",
            consumer_heatingrod_day_kwh: "Heizstab",
            consumer_wallbox_day_kwh: "Wallbox",
        };
        const translate = (key, params) => {
            const text = window.SFMLI18n?.t?.(key, params);
            return text && text !== key ? text : "";
        };
        const label = (key, fallback) => translate(key) || fallback;
        const reasonLabel = (code) => label(`corrections.reason.${code}`, code);
        const rangeNeedsConfirm = computed(() => Boolean(
            rangePreview.value && rangePreview.value.requires_second_confirmation && !rangeConfirm.value
        ));
        const csvNeedsConfirm = computed(() => Boolean(
            csvPreview.value && csvPreview.value.requires_second_confirmation && !csvConfirm.value
        ));
        const batchRows = computed(() => {
            const groups = new Map();
            for (const row of history.value) {
                if (!row.batch_id || row.event_type !== "correction") continue;
                let batch = groups.get(row.batch_id);
                if (!batch) {
                    batch = { batch_id: row.batch_id, created_at: row.created_at,
                        days: new Set(), metrics: new Set(), undoable: false };
                    groups.set(row.batch_id, batch);
                }
                batch.days.add(row.target_date);
                batch.metrics.add(metricLabel(row.metric));
                if (row.undoable) batch.undoable = true;
            }
            return Array.from(groups.values()).map((batch) => ({
                batch_id: batch.batch_id, created_at: batch.created_at, dayCount: batch.days.size,
                metricLabel: Array.from(batch.metrics).join(", "), undoable: batch.undoable,
            }));
        });
        const singleRows = computed(() => history.value.filter((row) => !row.batch_id));
        const metricLabel = (metric) => {
            const spec = metricOptions.value.find((item) => item.id === metric);
            const translated = spec?.i18n_key ? translate(spec.i18n_key) : "";
            return translated || metricText[metric] || metric;
        };
        const balanceText = (warning) => {
            const metric = metricLabel(warning.metric);
            const percent = number(warning.deviation_percent);
            const translated = translate("corrections.balanceWarning", { percent, metric });
            return translated || `Bilanzabweichung ${percent} %: ${metric}`;
        };
        const dateTime = (value) => new Date(value).toLocaleString();
        const hourLabel = (value) => `${String(value).padStart(2, "0")}:00`;
        const previewContext = computed(() => {
            const value = previewData.value;
            if (!value) return "";
            return `${value.target_date} · ${metricLabel(value.metric)}`;
        });

        onMounted(() => { bridge = new CorrectionsBridgeClient(); bridge.mount(bridgeHost.value); load(); });
        onUnmounted(() => {
            previewGeneration += 1;
            contextGeneration += 1;
            rangeGeneration += 1;
            csvGeneration += 1;
            bridge?.destroy();
        });
        return { bridgeHost, loading, locked, message, messageError, previewBusy, commitBusy,
            previewData, confirmLarge, history, form, previewContext, invalidatePreview,
            contextData, contextBusy, contextError, latestCompletedDate, metricOptions, invalidateSelection,
            loadContext, setMode, preview, commit, undo, number, signed, kwh, signedKwh, metricLabel,
            balanceText, dateTime, hourLabel, label, reasonLabel, rangeForm, rangePreview, rangePreviewBusy,
            rangeCommitBusy, rangeConfirm, rangeNeedsConfirm, invalidateRangePreview, previewRange, commitRange,
            csvFile, csvPreview, csvPreviewBusy, csvCommitBusy, csvConfirm, csvNeedsConfirm, onCsvFile,
            previewCsv, commitCsv, downloadTemplate, batchRows, singleRows, undoBatch };
    },
};

if (typeof window !== "undefined") {
    window.CorrectionsBridgeClient = CorrectionsBridgeClient;
    window.ModernCorrectionsPage = ModernCorrectionsPage;
}
if (typeof module !== "undefined") module.exports = { CorrectionsBridgeClient };
