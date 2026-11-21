(function () {
"use strict";
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
        payload: correctionPick(payload, ["target_date", "metric", "target_value_kwh", "reason_note", "idempotency_key", "mode", "evidence_type", "accept_findings"]) };
    if (operation === "commit") return { method: "POST", path: "commit",
        payload: correctionPick(payload, ["preview_token", "idempotency_key", "confirmed_large_change"]) };
    if (operation === "undo") return { method: "POST", path: "undo",
        payload: correctionPick(payload, ["event_id", "idempotency_key"]) };
    if (operation === "range_preview") return { method: "POST", path: "range/preview",
        payload: correctionPick(payload, ["metric", "start_date", "end_date", "target_sum_kwh", "weighting", "idempotency_key", "accept_findings"]) };
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

// ---------------------------------------------------------------------------
// Correction wizard helpers (pure functions, also exported for node tests)
// ---------------------------------------------------------------------------
const CORRECTION_PAGE_SIZE = 50;
const CORRECTION_URL_LIMIT = 6000;
const CORRECTION_MAX_BYTES = 5 * 1024 * 1024;
const CORRECTION_REJECTION_SHOWN = 200;
const CORRECTION_PRIMARY = ["solar_yield_day_kwh", "home_consumption_day_kwh", "grid_import_day_kwh",
    "grid_export_day_kwh", "battery", "consumer_heatpump_day_kwh", "consumer_heatingrod_day_kwh",
    "consumer_wallbox_day_kwh"];
const CORRECTION_BATTERY = ["solar_to_battery_day_kwh", "grid_to_battery_day_kwh", "battery_to_house_day_kwh"];
const CORRECTION_FLOWS = ["solar_to_house_day_kwh", "solar_to_battery_day_kwh", "battery_to_house_day_kwh",
    "grid_to_house_day_kwh", "grid_to_battery_day_kwh"];
const CORRECTION_SHORT = {
    solar_yield_day_kwh: "solarYield", home_consumption_day_kwh: "homeConsumption",
    grid_import_day_kwh: "gridImport", grid_export_day_kwh: "gridExport", battery: "battery",
    consumer_heatpump_day_kwh: "heatpump", consumer_heatingrod_day_kwh: "heatingrod",
    consumer_wallbox_day_kwh: "wallbox", solar_to_house_day_kwh: "solarToHouse",
    solar_to_battery_day_kwh: "solarToBattery", battery_to_house_day_kwh: "batteryToHouse",
    grid_to_house_day_kwh: "gridToHouse", grid_to_battery_day_kwh: "gridToBattery",
};
const CORRECTION_LOCK_CODES = ["premium_required", "admin_required", "local_access_required"];
const CORRECTION_NO_MEASUREMENT = ["source_value_unavailable", "eod_not_finalized"];
const CORRECTION_FORMS = ["day", "range", "meter", "file_daily", "file_meter", "file_series"];

const correctionNormalizeDecimal = (text) => {
    let value = String(text ?? "").trim().replace(/[\s  ']/g, "");
    if (!value) return "";
    const comma = value.lastIndexOf(",");
    const dot = value.lastIndexOf(".");
    if (comma !== -1 && dot !== -1) {
        const decimalChar = comma > dot ? "," : ".";
        const groupChar = decimalChar === "," ? "." : ",";
        value = value.split(groupChar).join("").replace(decimalChar, ".");
    } else if (comma !== -1) {
        if (value.indexOf(",") !== comma) return null;
        value = value.replace(",", ".");
    }
    if (value.startsWith(".")) value = `0${value}`;
    return /^(0|[1-9]\d*)(\.\d{1,3})?$/.test(value) ? value : null;
};

const correctionTrimNumber = (value) => {
    const text = Number(value).toFixed(3);
    return text.includes(".") ? text.replace(/0+$/, "").replace(/\.$/, "") : text;
};

const correctionCompactLines = (lines) => {
    const sorted = Array.from(new Set((lines || []).map(Number).filter((n) => Number.isInteger(n) && n > 0)))
        .sort((a, b) => a - b);
    const parts = [];
    for (let index = 0; index < sorted.length;) {
        let last = index;
        while (last + 1 < sorted.length && sorted[last + 1] === sorted[last] + 1) last += 1;
        parts.push(last > index ? `${sorted[index]}-${sorted[last]}` : String(sorted[index]));
        index = last + 1;
    }
    return parts.join(",");
};

const correctionCompactReplace = (map) => Object.keys(map || {})
    .map(Number).filter((n) => Number.isInteger(n) && n > 0).sort((a, b) => a - b)
    .map((line) => `${line}=${correctionTrimNumber(map[line])}`).join(",");

const correctionBuildQuery = (options) => {
    const parts = [];
    const add = (name, value) => {
        if (value !== null && value !== undefined && value !== "") parts.push(`${name}=${encodeURIComponent(value)}`);
    };
    add("idempotency_key", options.key);
    add("metric", options.metric);
    add("unit", options.unit);
    add("value_kind", options.valueKind);
    add("decimal", options.decimal);
    add("date_order", options.dateOrder);
    add("accept_lines", correctionCompactLines(options.accept));
    add("skip_lines", correctionCompactLines(options.skip));
    add("replace_lines", correctionCompactReplace(options.replace));
    if (options.all === "accept") parts.push("accept_all_findings=1");
    if (options.all === "skip") parts.push("skip_all_findings=1");
    return parts.join("&");
};

const correctionParseIso = (iso) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
    return match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
};
const correctionAddDays = (iso, count) => {
    const date = correctionParseIso(iso);
    if (!date) return "";
    date.setUTCDate(date.getUTCDate() + count);
    return date.toISOString().slice(0, 10);
};

const correctionLocale = () => (typeof window !== "undefined" && window.SFMLI18n && window.SFMLI18n.numberLocale) || undefined;
const correctionLanguage = () => (typeof window !== "undefined" && window.SFMLI18n && window.SFMLI18n.current) || "";
const correctionTranslate = (key, params) => {
    const text = typeof window !== "undefined" ? window.SFMLI18n?.t?.(key, params) : "";
    return text && text !== key ? text : "";
};
const correctionNumber = (value, min = 0, max = 3) => {
    if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "–";
    if (typeof window !== "undefined" && typeof window.SFMLI18n?.formatNumber === "function") {
        return window.SFMLI18n.formatNumber(value, min, max);
    }
    let text = Number(value).toFixed(max);
    if (max > min && text.includes(".")) {
        const [whole, fraction] = text.split(".");
        let kept = fraction;
        while (kept.length > min && kept.endsWith("0")) kept = kept.slice(0, -1);
        text = kept ? `${whole}.${kept}` : whole;
    }
    return text;
};
const correctionDate = (iso) => {
    const date = correctionParseIso(iso);
    if (!date) return String(iso ?? "");
    return date.toLocaleDateString(correctionLocale(), { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });
};
const correctionDateTime = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value ?? "") : date.toLocaleString(correctionLocale());
};

const CORRECTION_TEMPLATE = `
<section class="corrections-page" aria-labelledby="corrections-title">
    <div ref="bridgeHost" class="corrections-bridge-host" aria-hidden="true"></div>
    <header class="corrections-hero">
        <div><span class="corrections-kicker">{{ label('corrections.kicker', 'Premium · auditierbare Messwerte') }}</span><h2 id="corrections-title">{{ label('corrections.title', 'Energie-Korrekturen') }}</h2><p>{{ t('corrections.intro') }}</p></div>
        <span class="corrections-badge">{{ label('corrections.badge', 'Admin · lokal oder HA Cloud') }}</span>
    </header>
    <div v-if="message" :class="['corrections-state', messageError ? 'error' : 'notice']" :role="messageError ? 'alert' : 'status'">{{ message }}<small v-if="messageCode" class="corrections-code">{{ messageCode }}</small></div>
    <div v-if="loading" class="corrections-state" role="status">{{ t('corrections.loading') }}</div>
    <div v-else-if="locked" class="corrections-state locked" role="status"><strong>{{ t('corrections.lock.title') }}</strong><span>{{ locked }}</span></div>

    <template v-else>
        <nav class="corrections-tabs" role="tablist" :aria-label="t('corrections.tabsLabel')">
            <button id="correction-tab-wizard" type="button" role="tab" class="corrections-tab" :class="{ active: tab === 'wizard' }" :aria-selected="tab === 'wizard' ? 'true' : 'false'" @click="showTab('wizard')">{{ t('corrections.tabCorrect') }}</button>
            <button id="correction-tab-history" type="button" role="tab" class="corrections-tab" :class="{ active: tab === 'history' }" :aria-selected="tab === 'history' ? 'true' : 'false'" @click="showTab('history')">{{ t('corrections.cardHistory') }}</button>
            <a class="corrections-tab corrections-tab-link" href="#gpm">{{ t('corrections.pricesTab') }}</a>
        </nav>

        <div v-if="tab === 'wizard'" class="corrections-wizard" role="tabpanel" aria-labelledby="correction-tab-wizard">
            <ol class="corrections-steps" :aria-label="t('corrections.stepsLabel')">
                <li v-for="item in stepItems" :key="item.n" :class="{ active: item.n === step, passed: item.n < step }" :aria-current="item.n === step ? 'step' : null"><span class="corrections-step-number">{{ item.n }}</span><span class="corrections-step-label">{{ item.label }}</span></li>
            </ol>
            <p v-if="step > 1 && step < 5 && sel.metric" class="corrections-crumb">{{ crumb }}</p>

            <article v-if="step === 1" class="corrections-card" data-correction-step="select">
                <h3 ref="stepHeading" tabindex="-1">{{ t('corrections.step1.title') }}</h3>
                <p>{{ t('corrections.step1.help') }}</p>
                <div v-if="!mainTiles.length" class="corrections-state error" role="alert">{{ t('corrections.step1.empty') }}</div>
                <div class="corrections-tiles">
                    <button v-for="tile in mainTiles" :key="tile.id" type="button" class="corrections-tile" :class="{ selected: tile.group ? batteryOpen : sel.metric === tile.id }" :aria-pressed="(tile.group ? batteryOpen : sel.metric === tile.id) ? 'true' : 'false'" :data-metric="tile.id" @click="chooseTile(tile)">
                        <strong>{{ tile.label }}</strong><span>{{ tile.help }}</span><em v-if="tile.hint">{{ tile.hint }}</em>
                    </button>
                </div>
                <div v-if="batteryOpen" class="corrections-subtiles" role="group" :aria-label="t('corrections.step1.batteryChoose')">
                    <p>{{ t('corrections.step1.batteryChoose') }}</p>
                    <div class="corrections-tiles">
                        <button v-for="tile in batteryTiles" :key="tile.id" type="button" class="corrections-tile" :class="{ selected: sel.metric === tile.id }" :aria-pressed="sel.metric === tile.id ? 'true' : 'false'" :data-metric="tile.id" @click="chooseTile(tile)">
                            <strong>{{ tile.label }}</strong><span>{{ tile.help }}</span>
                        </button>
                    </div>
                </div>
                <details v-if="flowTiles.length" class="corrections-more">
                    <summary>{{ t('corrections.step1.more') }}</summary>
                    <p>{{ t('corrections.step1.moreHelp') }}</p>
                    <div class="corrections-tiles">
                        <button v-for="tile in flowTiles" :key="tile.id" type="button" class="corrections-tile" :class="{ selected: sel.metric === tile.id }" :aria-pressed="sel.metric === tile.id ? 'true' : 'false'" :data-metric="tile.id" @click="chooseTile(tile)">
                            <strong>{{ tile.label }}</strong><span>{{ tile.help }}</span>
                        </button>
                    </div>
                </details>
            </article>

            <article v-else-if="step === 2" class="corrections-card" data-correction-step="form">
                <h3 ref="stepHeading" tabindex="-1">{{ t('corrections.step2.title') }}</h3>
                <p>{{ t('corrections.step2.help') }}</p>
                <div class="corrections-options" role="group" :aria-label="t('corrections.step2.title')">
                    <button v-for="id in formIds" :key="id" type="button" class="corrections-option" :class="{ selected: sel.form === id }" :aria-pressed="sel.form === id ? 'true' : 'false'" :data-form="id" @click="chooseForm(id)">
                        <strong>{{ t('corrections.form.' + id) }}</strong><span>{{ t('corrections.formHelp.' + id) }}</span>
                    </button>
                </div>
                <div v-if="isFile" class="corrections-unit" role="group" :aria-label="t('corrections.unit.label')">
                    <span class="corrections-eyebrow">{{ t('corrections.unit.label') }}</span>
                    <button type="button" class="button compact" :class="{ secondary: sel.unit !== 'kwh' }" :aria-pressed="sel.unit === 'kwh' ? 'true' : 'false'" @click="sel.unit = 'kwh'">kWh</button>
                    <button type="button" class="button compact" :class="{ secondary: sel.unit !== 'wh' }" :aria-pressed="sel.unit === 'wh' ? 'true' : 'false'" @click="sel.unit = 'wh'">Wh</button>
                    <small class="corrections-muted">{{ t('corrections.unit.help') }}</small>
                </div>
                <div v-if="sel.form === 'file_series'" class="corrections-unit" role="group" :aria-label="t('corrections.series.label')">
                    <span class="corrections-eyebrow">{{ t('corrections.series.label') }}</span>
                    <button type="button" class="button compact" :class="{ secondary: sel.seriesKind !== 'daily' }" :aria-pressed="sel.seriesKind === 'daily' ? 'true' : 'false'" @click="sel.seriesKind = 'daily'">{{ t('corrections.series.energy') }}</button>
                    <button type="button" class="button compact" :class="{ secondary: sel.seriesKind !== 'meter' }" :aria-pressed="sel.seriesKind === 'meter' ? 'true' : 'false'" @click="sel.seriesKind = 'meter'">{{ t('corrections.series.meter') }}</button>
                </div>
                <div class="corrections-actions">
                    <button class="button secondary" type="button" @click="goBack">{{ t('corrections.back') }}</button>
                    <button class="button" type="button" :disabled="!sel.form" @click="goInput">{{ t('corrections.next') }}</button>
                </div>
            </article>

            <article v-else-if="step === 3 && sel.form === 'day'" class="corrections-card" data-correction-step="input-day">
                <h3 ref="stepHeading" tabindex="-1">{{ t('corrections.day.title') }}</h3>
                <p>{{ t('corrections.day.help') }}</p>
                <label><span>{{ t('corrections.day.date') }}</span><input v-model="day.date" type="date" :max="latestCompletedDate"></label>
                <div class="corrections-current" aria-live="polite">
                    <div v-if="contextBusy" class="corrections-muted">{{ t('corrections.day.loading') }}</div>
                    <div v-else-if="contextError" class="corrections-context-error" role="alert">{{ contextError }}</div>
                    <template v-else-if="contextData">
                        <template v-if="dayBackfill">
                            <strong>{{ t('corrections.day.backfillTitle') }}</strong>
                            <p>{{ t('corrections.day.backfillHelp') }}</p>
                        </template>
                        <template v-else>
                            <span class="corrections-eyebrow">{{ t('corrections.day.currentLabel') }}</span>
                            <div class="corrections-current-value" data-correction-current>{{ t('corrections.day.current', { value: kwh(contextData.effective_value_kwh) }) }}</div>
                            <span :class="['corrections-source-state', contextData.is_corrected ? 'corrected' : 'original']">{{ contextData.is_corrected ? t('corrections.day.originCorrected') : t('corrections.day.originMeasured') }}</span>
                            <p v-if="contextData.is_corrected" class="corrections-muted">{{ t('corrections.day.measuredWas', { value: kwh(contextData.source_value_kwh) }) }}</p>
                        </template>
                    </template>
                    <div v-else class="corrections-muted">{{ t('corrections.day.pick') }}</div>
                </div>
                <label v-if="dayBackfill && contextData"><span>{{ t('corrections.day.evidence') }}</span><select v-model="day.evidence"><option value="utility_invoice">{{ t('corrections.evidenceUtilityInvoice') }}</option><option value="meter_portal_export">{{ t('corrections.evidenceMeterPortal') }}</option><option value="signed_daily_report">{{ t('corrections.evidenceDailyReport') }}</option></select></label>
                <label><span>{{ t('corrections.day.newValue') }}</span><input v-model="day.value" inputmode="decimal" autocomplete="off" :placeholder="t('corrections.day.placeholder')" :aria-invalid="dayValue.ok || dayValue.empty ? 'false' : 'true'" aria-describedby="correction-value-hint"></label>
                <p id="correction-value-hint" class="corrections-hint" :class="{ invalid: !dayValue.ok && !dayValue.empty }" aria-live="polite">{{ dayValueHint }}</p>
                <label><span>{{ t('corrections.day.note') }}</span><textarea v-model="day.note" maxlength="160" aria-describedby="correction-note-help"></textarea></label>
                <small id="correction-note-help" class="corrections-muted">{{ label('corrections.noteHelp', 'Bitte keine personenbezogenen Daten eingeben.') }}</small>
                <details v-if="contextData && contextData.hourly_values && contextData.hourly_values.length" class="corrections-more">
                    <summary>{{ t('corrections.day.details') }}</summary>
                    <p class="corrections-muted">{{ t('corrections.day.detailsHelp', { sum: kwh(contextData.hourly_sum_kwh), delta: signedKwh(contextData.hourly_delta_kwh), present: contextData.available_hours, expected: contextData.expected_hours }) }}</p>
                    <div class="corrections-hour-grid"><div v-for="row in contextData.hourly_values" :key="row.hour_key"><span>{{ hourLabel(row.hour) }}</span><strong>{{ number(row.value_kwh) }}</strong></div></div>
                </details>
                <div class="corrections-actions">
                    <button class="button secondary" type="button" @click="goBack">{{ t('corrections.back') }}</button>
                    <button class="button" type="button" :disabled="reviewBusy || contextBusy || !contextData || !dayValue.ok" @click="startReview()">{{ t('corrections.preview') }}</button>
                </div>
            </article>

            <article v-else-if="step === 3 && (sel.form === 'range' || sel.form === 'meter')" class="corrections-card" data-correction-step="input-range">
                <h3 ref="stepHeading" tabindex="-1">{{ sel.form === 'range' ? t('corrections.range.title') : t('corrections.meter.title') }}</h3>
                <p>{{ sel.form === 'range' ? t('corrections.range.help') : t('corrections.meter.help') }}</p>
                <template v-if="sel.form === 'range'">
                    <div class="corrections-fields">
                        <label><span>{{ t('corrections.range.start') }}</span><input v-model="range.start" type="date" :max="latestCompletedDate"></label>
                        <label><span>{{ t('corrections.range.end') }}</span><input v-model="range.end" type="date" :max="latestCompletedDate"></label>
                    </div>
                    <label><span>{{ t('corrections.range.sum') }}</span><input v-model="range.sum" inputmode="decimal" autocomplete="off" :placeholder="t('corrections.day.placeholder')"></label>
                </template>
                <template v-else>
                    <fieldset class="corrections-reading"><legend>{{ t('corrections.meter.first') }}</legend>
                        <div class="corrections-fields">
                            <label><span>{{ t('corrections.meter.date') }}</span><input v-model="meter.startDate" type="date" :max="latestCompletedDate"></label>
                            <label><span>{{ t('corrections.meter.value') }}</span><input v-model="meter.startValue" inputmode="decimal" autocomplete="off"></label>
                        </div>
                    </fieldset>
                    <fieldset class="corrections-reading"><legend>{{ t('corrections.meter.second') }}</legend>
                        <div class="corrections-fields">
                            <label><span>{{ t('corrections.meter.date') }}</span><input v-model="meter.endDate" type="date" :max="latestCompletedDate"></label>
                            <label><span>{{ t('corrections.meter.value') }}</span><input v-model="meter.endValue" inputmode="decimal" autocomplete="off"></label>
                        </div>
                    </fieldset>
                    <p v-if="rangePlan.ok" class="corrections-hint" data-correction-meter-result>{{ t('corrections.meter.result', { start: formatDate(rangePlan.start), end: formatDate(rangePlan.end), sum: kwh(rangePlan.sum) }) }}</p>
                </template>
                <p v-if="rangePlan.problem" class="corrections-hint invalid" role="alert">{{ t('corrections.problem.' + rangePlan.problem) }}</p>
                <fieldset class="corrections-weighting"><legend>{{ t('corrections.weight.label') }}</legend>
                    <label class="corrections-radio"><input v-model="weightingModel" type="radio" value="measured" name="correction-weighting"><span><strong>{{ t('corrections.weight.measured') }}</strong><small>{{ t('corrections.weight.measuredHelp') }}</small></span></label>
                    <label class="corrections-radio"><input v-model="weightingModel" type="radio" value="uniform" name="correction-weighting"><span><strong>{{ t('corrections.weight.uniform') }}</strong><small>{{ t('corrections.weight.uniformHelp') }}</small></span></label>
                </fieldset>
                <div class="corrections-actions">
                    <button class="button secondary" type="button" @click="goBack">{{ t('corrections.back') }}</button>
                    <button class="button" type="button" :disabled="reviewBusy || !rangePlan.ok" @click="startReview()">{{ t('corrections.preview') }}</button>
                </div>
            </article>

            <article v-else-if="step === 3" class="corrections-card" data-correction-step="input-file">
                <h3 ref="stepHeading" tabindex="-1">{{ t('corrections.file.title') }}</h3>
                <p>{{ t('corrections.file.help') }}</p>
                <div class="corrections-split">
                    <div class="corrections-upload">
                        <label><span>{{ t('corrections.file.choose') }}</span><input :key="fileInputKey" type="file" accept=".csv,.txt,.xlsx" @change="onFile"></label>
                        <p v-if="fileName" class="corrections-hint">{{ t('corrections.file.chosen', { name: fileName }) }}</p>
                        <div v-if="fileError" class="corrections-state error" role="alert">{{ fileError }}</div>
                        <div v-if="sel.form === 'file_daily'" class="corrections-template">
                            <strong>{{ t('corrections.template.title') }}</strong>
                            <p class="corrections-muted">{{ t('corrections.template.help') }}</p>
                            <div class="corrections-fields">
                                <label><span>{{ t('corrections.range.start') }}</span><input v-model="fileOpts.tplStart" type="date" :max="latestCompletedDate"></label>
                                <label><span>{{ t('corrections.range.end') }}</span><input v-model="fileOpts.tplEnd" type="date" :max="latestCompletedDate"></label>
                            </div>
                            <p v-if="templateProblem" class="corrections-hint invalid" role="alert">{{ t('corrections.problem.' + templateProblem) }}</p>
                            <button class="button secondary" type="button" :disabled="templateBusy || !!templateProblem" @click="downloadTemplate">{{ t('corrections.template.button') }}</button>
                        </div>
                    </div>
                    <aside v-if="formatBox" class="corrections-format" data-correction-format :aria-label="t('corrections.format.title')">
                        <h4>{{ t('corrections.format.title') }}</h4>
                        <ul><li v-for="(rule, index) in formatBox.rules" :key="index">{{ rule }}</li></ul>
                        <div v-for="(table, tableIndex) in formatBox.tables" :key="tableIndex" class="corrections-example">
                            <span class="corrections-eyebrow">{{ table.title }}</span>
                            <div class="corrections-table-wrap"><table><thead><tr><th v-for="(head, headIndex) in table.headers" :key="headIndex" scope="col">{{ head }}</th></tr></thead><tbody><tr v-for="(row, rowIndex) in table.rows" :key="rowIndex"><td v-for="(cell, cellIndex) in row" :key="cellIndex">{{ cell }}</td></tr></tbody></table></div>
                        </div>
                    </aside>
                </div>
                <div class="corrections-actions">
                    <button class="button secondary" type="button" @click="goBack">{{ t('corrections.back') }}</button>
                    <button class="button" type="button" :disabled="reviewBusy || !fileObj" @click="startReview()">{{ t('corrections.preview') }}</button>
                </div>
            </article>

            <article v-else-if="step === 4" class="corrections-card" data-correction-step="review" :aria-busy="reviewBusy ? 'true' : 'false'">
                <h3 ref="stepHeading" tabindex="-1">{{ t('corrections.review.title') }}</h3>
                <div v-if="reviewBusy" class="corrections-state" role="status">{{ t('corrections.review.busy') }}</div>
                <div v-if="reviewError" class="corrections-state error" role="alert">{{ reviewError }}<small v-if="reviewErrorCode" class="corrections-code">{{ reviewErrorCode }}</small>
                    <button v-if="hasDecisions" class="button secondary compact" type="button" @click="resetAndReview">{{ t('corrections.review.resetDecisions') }}</button></div>
                <template v-if="review">
                    <div :class="{ 'corrections-stale': reviewBusy }">
                        <p class="corrections-summary" data-correction-summary>{{ summaryText }}</p>
                        <p v-if="detectedText" class="corrections-detected" data-correction-detected>{{ detectedText }}</p>
                        <p v-if="review.fallback" class="corrections-hint">{{ t('corrections.review.uniformFallback') }}</p>

                        <section v-if="ambiguity" class="corrections-ask" role="group" aria-labelledby="correction-ask-title" data-correction-ask>
                            <h4 id="correction-ask-title">{{ ambiguity.title }}</h4>
                            <p>{{ ambiguity.question }}</p>
                            <div class="corrections-actions">
                                <button v-for="option in ambiguity.options" :key="option.choice" type="button" class="button secondary" @click="chooseAmbiguity(ambiguity.type, option.choice)">{{ option.text }}</button>
                            </div>
                        </section>

                        <section v-if="review.findings.length" class="corrections-findings" aria-labelledby="correction-findings-title" data-correction-findings>
                            <h4 id="correction-findings-title">{{ t(review.findings.length === 1 ? 'corrections.review.findingsTitleOne' : 'corrections.review.findingsTitle', { count: review.findings.length }) }}</h4>
                            <p>{{ t('corrections.review.findingsHelp') }}</p>
                            <div v-if="isFile" class="corrections-bulk">
                                <button class="button secondary compact" type="button" :disabled="reviewBusy" @click="decideAll('accept')">{{ t('corrections.review.acceptAll') }}</button>
                                <button class="button secondary compact" type="button" :disabled="reviewBusy" @click="decideAll('skip')">{{ t('corrections.review.skipAll') }}</button>
                            </div>
                            <p v-if="isFile && decisionsLocked" class="corrections-hint" role="status" data-correction-locked>{{ t('corrections.review.tooMany') }}</p>
                            <div class="corrections-table-wrap"><table><thead><tr><th v-if="isFile" scope="col">{{ t('corrections.line') }}</th><th scope="col">{{ t('corrections.col.date') }}</th><th scope="col">{{ t('corrections.col.metric') }}</th><th scope="col">{{ t('corrections.col.value') }}</th><th scope="col">{{ t('corrections.col.reason') }}</th><th scope="col">{{ t('corrections.col.decision') }}</th></tr></thead>
                                <tbody><tr v-for="finding in pagedFindings" :key="finding.key" :class="{ accepted: finding.accepted }">
                                    <td v-if="isFile">{{ finding.line }}</td><td>{{ formatDate(finding.date) }}</td><td>{{ metricLabel(finding.metric) }}</td><td>{{ kwh(finding.value) }}</td><td class="corrections-wrap">{{ findingText(finding) }}</td>
                                    <td class="corrections-decide">
                                        <template v-if="finding.accepted"><span class="corrections-chip ok">{{ t('corrections.review.accepted') }}</span><button v-if="canWithdraw(finding)" class="button secondary compact" type="button" :disabled="reviewBusy" @click="withdraw(finding)">{{ t('corrections.review.withdraw') }}</button></template>
                                        <template v-else>
                                            <button class="button secondary compact" type="button" :disabled="reviewBusy || rowLocked(finding)" @click="acceptFinding(finding)">{{ t('corrections.review.accept') }}</button>
                                            <button v-if="canSuggest(finding)" class="button secondary compact" type="button" :disabled="reviewBusy || rowLocked(finding)" @click="suggestFinding(finding)">{{ t('corrections.review.useSuggestion', { value: kwh(finding.suggestion) }) }}</button>
                                            <button v-if="isFile" class="button secondary compact" type="button" :disabled="reviewBusy || rowLocked(finding)" @click="skipFinding(finding)">{{ t('corrections.review.skip') }}</button>
                                            <button v-else class="button secondary compact" type="button" @click="goBack">{{ t('corrections.review.edit') }}</button>
                                        </template>
                                    </td></tr></tbody></table></div>
                            <div v-if="findingPageCount > 1" class="corrections-pager"><button class="button secondary compact" type="button" :disabled="findingPage === 0" @click="findingPage -= 1">{{ t('corrections.pager.prev') }}</button><span>{{ t('corrections.pager.page', { page: findingPage + 1, pages: findingPageCount }) }}</span><button class="button secondary compact" type="button" :disabled="findingPage + 1 >= findingPageCount" @click="findingPage += 1">{{ t('corrections.pager.next') }}</button></div>
                        </section>
                        <div v-if="isFile && hasDecisions" class="corrections-bulk">
                            <button class="button secondary compact" type="button" :disabled="reviewBusy" @click="resetAndReview">{{ t('corrections.review.resetDecisions') }}</button>
                        </div>

                        <div v-if="review.balance.length" class="corrections-danger" data-correction-balance><div v-for="(warning, index) in review.balance" :key="index">{{ balanceText(warning) }}</div></div>

                        <div v-if="review.rows.length" class="corrections-table-wrap"><table data-correction-table="days"><caption class="corrections-sr">{{ t('corrections.review.tableCaption') }}</caption>
                            <thead><tr><th scope="col">{{ t('corrections.col.date') }}</th><th scope="col">{{ t('corrections.col.metric') }}</th><th scope="col">{{ t('corrections.col.before') }}</th><th scope="col">{{ t('corrections.col.after') }}</th><th scope="col">{{ t('corrections.col.delta') }}</th></tr></thead>
                            <tbody><tr v-for="row in pagedRows" :key="row.key" :class="{ flagged: row.flagged }"><td>{{ formatDate(row.date) }}</td><td>{{ metricLabel(row.metric) }}</td><td>{{ kwh(row.before) }}</td><td>{{ kwh(row.after) }}</td><td :class="['corrections-delta', row.deltaClass]">{{ row.deltaClass === 'same' ? '' : signedKwh(row.delta) }} <small>{{ t('corrections.delta.' + row.deltaClass) }}</small></td></tr></tbody></table></div>
                        <p v-else-if="!reviewBusy" class="corrections-hint">{{ t('corrections.review.noChanges') }}</p>
                        <div v-if="pageCount > 1" class="corrections-pager"><button class="button secondary compact" type="button" :disabled="rowPage === 0" @click="rowPage -= 1">{{ t('corrections.pager.prev') }}</button><span>{{ t('corrections.pager.page', { page: rowPage + 1, pages: pageCount }) }}</span><button class="button secondary compact" type="button" :disabled="rowPage + 1 >= pageCount" @click="rowPage += 1">{{ t('corrections.pager.next') }}</button></div>

                        <details v-if="review.rejections.length" class="corrections-rejections" data-correction-rejections>
                            <summary>{{ t('corrections.review.rejections', { count: review.rejections.length }) }}</summary>
                            <div class="corrections-table-wrap"><table><thead><tr><th scope="col">{{ t('corrections.line') }}</th><th scope="col">{{ t('corrections.reasonHeading') }}</th><th scope="col"></th></tr></thead>
                                <tbody><tr v-for="item in rejectionRows" :key="item.key"><td>{{ item.line }}</td><td class="corrections-wrap">{{ item.text }}</td><td><button v-if="item.canRestore" class="button secondary compact" type="button" :disabled="reviewBusy" @click="restoreLine(item.line)">{{ t('corrections.review.restore') }}</button></td></tr></tbody></table></div>
                            <p v-if="review.rejections.length > rejectionRows.length" class="corrections-muted">{{ t('corrections.review.rejectionsMore', { count: review.rejections.length - rejectionRows.length }) }}</p>
                        </details>

                        <div v-if="review.needsConfirm" class="corrections-danger">{{ t('corrections.review.largeChange') }}</div>
                        <label v-if="review.needsConfirm" class="corrections-confirm"><input v-model="confirmLarge" type="checkbox"><span>{{ t('corrections.review.confirmLarge') }}</span></label>
                    </div>
                </template>
                <p v-if="applyHint" class="corrections-hint" role="status" data-correction-hint>{{ applyHint }}</p>
                <div class="corrections-actions">
                    <button class="button secondary" type="button" @click="goBack">{{ t('corrections.back') }}</button>
                    <button class="button" type="button" :disabled="!canApply" @click="commit">{{ commitBusy ? t('corrections.saving') : label('corrections.apply', 'Übernehmen') }}</button>
                </div>
            </article>

            <article v-else-if="step === 5 && done" class="corrections-card corrections-done" data-correction-step="done">
                <h3 ref="stepHeading" tabindex="-1">{{ done.undone ? t('corrections.done.undoneTitle') : t('corrections.done.title') }}</h3>
                <p v-if="!done.undone" data-correction-pages>{{ t('corrections.done.pages') }}</p>
                <p v-if="!done.undone" class="corrections-hint" data-correction-note>{{ t('corrections.done.note') }}</p>
                <p v-else>{{ t('corrections.done.undoneText') }}</p>
                <div class="corrections-actions">
                    <button v-if="!done.undone" class="button secondary" type="button" :disabled="undoBusy" @click="undoDone">{{ t('corrections.undo') }}</button>
                    <button class="button" type="button" @click="restart">{{ t('corrections.another') }}</button>
                </div>
            </article>
        </div>

        <article v-else class="corrections-card" role="tabpanel" aria-labelledby="correction-tab-history" data-correction-card="history">
            <h3 ref="stepHeading" tabindex="-1">{{ t('corrections.cardHistory') }}</h3>
            <p>{{ t('corrections.history.help') }}</p>
            <div v-if="!historyEntries.length" class="corrections-hint">{{ t('corrections.history.empty') }}</div>
            <div v-else class="corrections-table-wrap"><table data-correction-table="history"><thead><tr><th scope="col">{{ t('corrections.history.changedAt') }}</th><th scope="col">{{ t('corrections.affectedDays') }}</th><th scope="col">{{ t('corrections.col.metric') }}</th><th scope="col">{{ t('corrections.history.change') }}</th><th scope="col">{{ t('corrections.history.origin') }}</th><th scope="col">{{ t('corrections.history.note') }}</th><th scope="col"></th></tr></thead>
                <tbody><tr v-for="entry in historyEntries" :key="entry.key"><td>{{ entry.createdText }}</td><td>{{ entry.daysText }}</td><td>{{ entry.metricText }}</td><td>{{ entry.changeText }}</td><td>{{ entry.originText }}</td><td class="corrections-wrap">{{ entry.note || '–' }}</td><td><span v-if="entry.undone" class="corrections-chip">{{ t('corrections.history.undone') }}</span><button v-else-if="entry.undoable" class="button secondary compact" type="button" @click="undoEntry(entry)">{{ entry.single ? t('corrections.undo') : t('corrections.undoBatch') }}</button></td></tr></tbody></table></div>
            <p v-if="history.length >= 100" class="corrections-muted">{{ t('corrections.history.limit') }}</p>
        </article>

        <aside class="corrections-gpm" data-correction-card="prices">
            <span>{{ t('corrections.pricesBody') }}</span> <a href="#gpm">{{ t('corrections.pricesLink') }}</a>
        </aside>
    </template>
</section>`;

const ModernCorrectionsPage = {
    template: CORRECTION_TEMPLATE,
    setup() {
        const { ref, shallowRef, reactive, computed, watch, nextTick, onMounted, onUnmounted } = Vue;
        const bridgeHost = ref(null);
        const stepHeading = ref(null);
        const loading = ref(true);
        const locked = ref("");
        const message = ref("");
        const messageError = ref(false);
        const messageCode = ref("");
        const tab = ref("wizard");
        const step = ref(1);
        const latestCompletedDate = ref("");
        const allMetrics = ref([]);
        const metricOptions = ref([]);
        const history = ref([]);
        const batteryOpen = ref(false);

        const sel = reactive({ metric: "", form: "", unit: "kwh", seriesKind: "daily" });
        const day = reactive({ date: "", value: "", note: "", evidence: "utility_invoice" });
        const range = reactive({ start: "", end: "", sum: "", weighting: "measured" });
        const meter = reactive({ startDate: "", startValue: "", endDate: "", endValue: "", weighting: "measured" });
        const fileOpts = reactive({ decimal: "", dateOrder: "", tplStart: "", tplEnd: "" });
        const fileObj = shallowRef(null);
        const fileInputKey = ref(0);
        const fileError = ref("");
        const decisions = reactive({ accept: [], skip: [], replace: {}, all: "", accepted: false });
        const templateBusy = ref(false);

        const contextData = ref(null);
        const contextBusy = ref(false);
        const contextError = ref("");
        const dayMode = ref("correct");

        const review = ref(null);
        const reviewKey = ref(null);
        const reviewBusy = ref(false);
        const reviewError = ref("");
        const reviewErrorCode = ref("");
        const confirmLarge = ref(false);
        const commitBusy = ref(false);
        const undoBusy = ref(false);
        const rowPage = ref(0);
        const findingPage = ref(0);
        const done = ref(null);

        let bridge;
        let previewGeneration = 0;
        let contextGeneration = 0;

        // ----- text helpers -------------------------------------------------
        const t = (key, params) => correctionTranslate(key, params) || key;
        const label = (key, fallback, params) => correctionTranslate(key, params) || fallback || key;
        const number = (value, min = 0, max = 3) => correctionNumber(value, min, max);
        const signed = (value) => `${Number(value) > 0 ? "+" : ""}${number(value)}`;
        const kwh = (value) => `${number(value)} kWh`;
        const signedKwh = (value) => `${signed(value)} kWh`;
        const formatDate = (value) => correctionDate(value);
        const hourLabel = (value) => `${String(value).padStart(2, "0")}:00`;
        const unwrap = (response) => (response?.success === true ? response.data : response?.data ?? response);
        const decimalChar = () => (["de", "pl"].includes(correctionLanguage()) ? "," : ".");
        const inputNumber = (value) => correctionTrimNumber(value).replace(".", decimalChar());

        const metricLabel = (id) => {
            const spec = allMetrics.value.find((item) => item.id === id);
            const key = spec?.i18n_key || (CORRECTION_SHORT[id] ? `corrections.metric.${CORRECTION_SHORT[id]}` : "");
            return (key && correctionTranslate(key)) || id;
        };
        const showMessage = (text, isError = false, code = "") => {
            message.value = text;
            messageError.value = isError;
            messageCode.value = code;
        };
        const friendly = (error) => {
            const code = String(error?.code || "request_failed");
            const text = correctionTranslate(`corrections.error.${code}`);
            return { text: text || t("corrections.error.unknown"), code: text ? "" : code };
        };
        const lockFrom = (error) => {
            const code = error?.code;
            if (code === "premium_required") locked.value = label("corrections.lock.premium", "Diese Funktion benötigt eine gültige Premium-Full-Package-Lizenz. Demo-Daten können nicht geschrieben werden.");
            else if (code === "admin_required") locked.value = label("corrections.lock.admin", "Für Korrekturen ist ein angemeldetes Home-Assistant-Administratorkonto erforderlich.");
            else if (code === "local_access_required") locked.value = label("corrections.lock.local", "Korrekturen sind nur über die lokale Home-Assistant-Oberfläche oder Home Assistant Cloud verfügbar.");
        };
        const showError = (error) => {
            lockFrom(error);
            const info = friendly(error);
            showMessage(info.text, true, info.code);
        };
        const call = async (operation, payload = {}) => {
            try { return unwrap(await bridge.request(operation, payload)); }
            catch (error) { lockFrom(error); throw error; }
        };
        const codedError = (code) => { const error = new Error(code); error.code = code; return error; };

        // ----- registry and tiles -------------------------------------------
        const hasMetric = (id) => metricOptions.value.some((item) => item.id === id);
        const tileFor = (id) => {
            const short = CORRECTION_SHORT[id];
            return {
                id, group: id === "battery",
                label: id === "battery" ? t("corrections.tile.batteryName") : metricLabel(id),
                help: short ? t(`corrections.tile.${short}`) : "",
                hint: id === "solar_yield_day_kwh" ? t("corrections.tile.solarYieldHint") : "",
            };
        };
        const mainTiles = computed(() => CORRECTION_PRIMARY
            .filter((id) => (id === "battery" ? CORRECTION_BATTERY.some(hasMetric) : hasMetric(id))).map(tileFor));
        const batteryTiles = computed(() => CORRECTION_BATTERY.filter(hasMetric).map(tileFor));
        const flowTiles = computed(() => CORRECTION_FLOWS.filter(hasMetric).map(tileFor));
        const applyRegistry = (status) => {
            const registry = Array.isArray(status?.registry) ? status.registry : [];
            if (registry.length) {
                allMetrics.value = registry;
                metricOptions.value = registry.filter((item) => item.selectable !== false);
                return;
            }
            const metrics = Array.isArray(status?.metrics) ? status.metrics : [];
            allMetrics.value = metrics.map((id) => ({ id, i18n_key: "" }));
            metricOptions.value = allMetrics.value.filter((item) => !item.id.startsWith("smartmeter_"));
        };

        // ----- derived input state ------------------------------------------
        const isFile = computed(() => sel.form.startsWith("file_"));
        const formIds = CORRECTION_FORMS;
        const dayBackfill = computed(() => dayMode.value === "backfill");
        const fileName = computed(() => (fileObj.value ? fileObj.value.name : ""));
        const stepItems = computed(() => [1, 2, 3, 4, 5].map((n) => ({ n, label: t(`corrections.steps.${n}`) })));
        const crumb = computed(() => (sel.form
            ? t("corrections.crumbForm", { metric: metricLabel(sel.metric), form: t(`corrections.form.${sel.form}`) })
            : t("corrections.crumb", { metric: metricLabel(sel.metric) })));
        const dayValue = computed(() => {
            const text = String(day.value ?? "");
            const normalized = correctionNormalizeDecimal(text);
            return { empty: text.trim() === "", ok: typeof normalized === "string" && normalized !== "", normalized };
        });
        const dayValueHint = computed(() => {
            if (dayValue.value.empty) return "";
            if (!dayValue.value.ok) return t("corrections.input.invalidNumber");
            return t("corrections.input.parsed", { value: kwh(Number(dayValue.value.normalized)) });
        });
        const weightingModel = computed({
            get: () => (sel.form === "meter" ? meter.weighting : range.weighting),
            set: (value) => { if (sel.form === "meter") meter.weighting = value; else range.weighting = value; },
        });
        const rangePlan = computed(() => {
            const latest = latestCompletedDate.value;
            if (sel.form === "meter") {
                const first = correctionNormalizeDecimal(meter.startValue);
                const second = correctionNormalizeDecimal(meter.endValue);
                if (!meter.startDate || !meter.endDate || !first || !second) return { ok: false, problem: "" };
                if (meter.endDate <= meter.startDate) return { ok: false, problem: "order" };
                if (latest && meter.endDate > latest) return { ok: false, problem: "future" };
                const diff = Math.round((Number(second) - Number(first)) * 1000) / 1000;
                if (diff < 0) return { ok: false, problem: "decreasing" };
                return { ok: true, problem: "", start: correctionAddDays(meter.startDate, 1), end: meter.endDate,
                    sum: correctionTrimNumber(diff), weighting: meter.weighting };
            }
            const sum = correctionNormalizeDecimal(range.sum);
            if (!range.start || !range.end || !sum) return { ok: false, problem: "" };
            if (range.end < range.start) return { ok: false, problem: "order" };
            if (latest && range.end > latest) return { ok: false, problem: "future" };
            return { ok: true, problem: "", start: range.start, end: range.end, sum, weighting: range.weighting };
        });
        const templateProblem = computed(() => {
            if (!fileOpts.tplStart || !fileOpts.tplEnd) return "incomplete";
            if (fileOpts.tplEnd < fileOpts.tplStart) return "order";
            if (latestCompletedDate.value && fileOpts.tplEnd > latestCompletedDate.value) return "future";
            if (correctionAddDays(fileOpts.tplStart, 399) < fileOpts.tplEnd) return "toolong";
            return "";
        });
        const valueKind = () => (sel.form === "file_meter" || (sel.form === "file_series" && sel.seriesKind === "meter") ? "meter" : "daily");
        const fileQueryOptions = (key) => ({
            key, metric: sel.metric, unit: sel.unit, valueKind: valueKind(), decimal: fileOpts.decimal,
            dateOrder: fileOpts.dateOrder, accept: decisions.accept, skip: decisions.skip,
            replace: decisions.replace, all: decisions.all,
        });
        const decisionsLocked = computed(() => correctionBuildQuery(fileQueryOptions("x".repeat(32))).length + 80 > CORRECTION_URL_LIMIT);
        const hasDecisions = computed(() => Boolean(
            decisions.accept.length || decisions.skip.length || Object.keys(decisions.replace).length
            || decisions.all || decisions.accepted
        ));

        const exampleBox = () => {
            const comma = decimalChar() === ",";
            const num = (value) => (comma ? String(value).replace(".", ",") : String(value));
            const wh = sel.unit === "wh";
            const unit = wh ? "Wh" : "kWh";
            const date = (n) => (comma ? `0${n}.08.2026` : `2026-08-0${n}`);
            const head = t("corrections.format.colDate");
            const metricHead = `${metricLabel(sel.metric)} (${unit})`;
            const scale = (value) => (wh ? Math.round(value * 1000) : value);
            return { comma, num, wh, unit, date, head, metricHead, scale };
        };
        const formatBox = computed(() => {
            if (!isFile.value) return null;
            const kind = sel.form === "file_daily" ? "daily" : (sel.form === "file_meter" ? "meter"
                : (sel.seriesKind === "meter" ? "seriesMeter" : "series"));
            const box = exampleBox();
            const rules = [
                t(`corrections.format.cols.${kind}`),
                t("corrections.format.dates"),
                t("corrections.format.decimal"),
                t("corrections.format.unit", { unit: box.unit }),
                t("corrections.format.files"),
            ];
            if (kind === "series" || kind === "seriesMeter") rules.push(t("corrections.format.seriesNote"));
            if (sel.metric === "solar_yield_day_kwh") rules.push(t("corrections.format.trackers"));
            const tables = [];
            const stamp = (n, clock) => `${box.date(n)} ${clock}`;
            if (kind === "daily") {
                tables.push({ title: t("corrections.format.example"), headers: [box.head, box.metricHead],
                    rows: [[box.date(1), box.num(box.scale(12.5))], [box.date(2), box.num(box.scale(9.8))], [box.date(3), box.num(box.scale(14.1))]] });
                if (sel.metric === "solar_yield_day_kwh") {
                    tables.push({ title: t("corrections.format.exampleTrackers"),
                        headers: [box.head, `MPPT 1 (${box.unit})`, `MPPT 2 (${box.unit})`],
                        rows: [[box.date(1), box.num(box.scale(7.1)), box.num(box.scale(5.4))], [box.date(2), box.num(box.scale(5.6)), box.num(box.scale(4.2))]] });
                }
            } else if (kind === "meter") {
                tables.push({ title: t("corrections.format.example"), headers: [box.head, `${t("corrections.format.colMeter")} (${box.unit})`],
                    rows: [[box.date(1), box.num(box.scale(12345.6))], [box.date(2), box.num(box.scale(12358.1))], [box.date(3), box.num(box.scale(12371.9))]] });
            } else if (kind === "series") {
                tables.push({ title: t("corrections.format.example"), headers: [t("corrections.format.colTime"), box.metricHead],
                    rows: [[stamp(1, "00:00"), box.num(box.scale(0.02))], [stamp(1, "00:15"), box.num(box.scale(0.03))], [stamp(1, "00:30"), box.num(box.scale(0.05))]] });
            } else {
                tables.push({ title: t("corrections.format.example"), headers: [t("corrections.format.colTime"), `${t("corrections.format.colMeter")} (${box.unit})`],
                    rows: [[stamp(1, "00:00"), box.num(box.scale(12345.6))], [stamp(1, "00:15"), box.num(box.scale(12345.7))], [stamp(1, "00:30"), box.num(box.scale(12345.9))]] });
            }
            return { rules, tables };
        });

        // ----- review model -------------------------------------------------
        const normalizeFindings = (list) => (Array.isArray(list) ? list : []).map((item, index) => ({
            key: `${item.line ?? "x"}:${item.date}:${item.metric}:${item.rule}:${index}`,
            line: item.line ?? null, date: item.date, metric: item.metric, value: item.value_kwh, rule: item.rule,
            expectedMax: item.expected_max_kwh ?? null, suggestion: item.suggestion_kwh ?? null,
            detail: item.detail && typeof item.detail === "object" ? item.detail : {}, accepted: item.accepted === true,
        }));
        const makeRow = (date, metric, before, after, line) => {
            const delta = Number(after) - Number(before);
            return { key: `${date}:${metric}`, date, metric, before, after, delta, line: line ?? null,
                deltaClass: Math.abs(delta) <= 0.0005 ? "same" : (delta > 0 ? "up" : "down"), flagged: false };
        };
        const buildReview = (kind, data, rows, extra = {}) => {
            const findings = normalizeFindings(data.findings);
            const flagged = new Set(findings.map((item) => `${item.date}:${item.metric}`));
            for (const row of rows) row.flagged = flagged.has(`${row.date}:${row.metric}`);
            return {
                kind, token: data.preview_token || null, rows, findings, findingsOpen: data.findings_open === true,
                balance: Array.isArray(data.balance_warnings) ? data.balance_warnings : [],
                needsConfirm: data.requires_second_confirmation === true,
                unchanged: 0, rejections: [], detected: null, spans: [], fallback: false, ...extra,
            };
        };
        const reviewFromDay = (data) => buildReview("day", data,
            [makeRow(data.target_date, data.metric, data.before_kwh, data.after_kwh, null)]);
        const reviewFromRange = (data) => buildReview("range", data,
            (data.days || []).map((item) => makeRow(item.date, data.metric, item.before_kwh, item.after_kwh, null)),
            { fallback: Boolean(data.fallback_reason) });
        const reviewFromFile = (data) => buildReview("file", data,
            (data.days || []).map((item) => makeRow(item.date, item.metric, item.before_kwh, item.after_kwh, item.line)), {
                unchanged: Number(data.unchanged || 0),
                rejections: (Array.isArray(data.rejections) ? data.rejections : []).map((item, index) => ({
                    key: `${item.line}:${item.reason}:${index}`, line: item.line, reason: item.reason,
                    detail: item.detail && typeof item.detail === "object" ? item.detail : {},
                })),
                detected: data.detected && typeof data.detected === "object" ? data.detected : null,
                spans: Array.isArray(data.spans) ? data.spans : [],
            });

        const requestPreview = async (key) => {
            if (sel.form === "day") {
                const payload = { target_date: day.date, metric: sel.metric, target_value_kwh: dayValue.value.normalized,
                    reason_note: day.note, idempotency_key: key, mode: dayMode.value, accept_findings: decisions.accepted };
                if (dayMode.value === "backfill") payload.evidence_type = day.evidence;
                return reviewFromDay(await call("preview", payload));
            }
            if (sel.form === "range" || sel.form === "meter") {
                const plan = rangePlan.value;
                return reviewFromRange(await call("range_preview", { metric: sel.metric, start_date: plan.start,
                    end_date: plan.end, target_sum_kwh: plan.sum, weighting: plan.weighting,
                    idempotency_key: key, accept_findings: decisions.accepted }));
            }
            const file = fileObj.value;
            if (!file) throw codedError("invalid_csv");
            if (file.size > CORRECTION_MAX_BYTES) throw codedError("csv_too_large");
            const query = correctionBuildQuery(fileQueryOptions(key));
            if (query.length > CORRECTION_URL_LIMIT) throw codedError("decision_too_long");
            try {
                const response = await bridge.authorizedFetch(`csv/preview?${query}`, {
                    method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: file,
                });
                return reviewFromFile(unwrap(response));
            } catch (error) { lockFrom(error); throw error; }
        };

        const inputSignature = () => JSON.stringify([
            sel.metric, sel.form, sel.unit, sel.seriesKind, day.date, day.value, day.note, day.evidence, dayMode.value,
            range.start, range.end, range.sum, range.weighting,
            meter.startDate, meter.startValue, meter.endDate, meter.endValue, meter.weighting,
            fileObj.value ? `${fileObj.value.name}:${fileObj.value.size}:${fileObj.value.lastModified}` : "",
            fileOpts.decimal, fileOpts.dateOrder,
        ]);
        const resetDecisions = () => {
            decisions.accept = [];
            decisions.skip = [];
            decisions.replace = {};
            decisions.all = "";
            decisions.accepted = false;
        };
        const invalidateReview = () => {
            previewGeneration += 1;
            review.value = null;
            reviewKey.value = null;
            confirmLarge.value = false;
            reviewBusy.value = false;
            reviewError.value = "";
            reviewErrorCode.value = "";
            rowPage.value = 0;
            findingPage.value = 0;
        };
        const setStep = (value) => {
            step.value = value;
            nextTick(() => { if (stepHeading.value && stepHeading.value.focus) stepHeading.value.focus(); });
        };
        const startReview = async (keep = false) => {
            if (keep) {
                previewGeneration += 1;
                confirmLarge.value = false;
                reviewError.value = "";
                reviewErrorCode.value = "";
            } else invalidateReview();
            const generation = previewGeneration;
            const signature = inputSignature();
            const key = correctionRandomId();
            reviewBusy.value = true;
            if (step.value !== 4) setStep(4);
            try {
                const result = await requestPreview(key);
                if (generation !== previewGeneration || signature !== inputSignature()) return;
                review.value = result;
                reviewKey.value = key;
                rowPage.value = 0;
                findingPage.value = 0;
                showMessage("");
            } catch (error) {
                if (generation === previewGeneration && signature === inputSignature()) {
                    const info = friendly(error);
                    review.value = null;
                    reviewError.value = info.text;
                    reviewErrorCode.value = info.code;
                }
            } finally {
                if (generation === previewGeneration) reviewBusy.value = false;
            }
        };
        watch(inputSignature, () => { invalidateReview(); resetDecisions(); }, { flush: "sync" });

        // ----- review view --------------------------------------------------
        const pageCount = computed(() => Math.max(1, Math.ceil((review.value?.rows.length || 0) / CORRECTION_PAGE_SIZE)));
        const pagedRows = computed(() => (review.value?.rows || [])
            .slice(rowPage.value * CORRECTION_PAGE_SIZE, (rowPage.value + 1) * CORRECTION_PAGE_SIZE));
        const findingPageCount = computed(() => Math.max(1, Math.ceil((review.value?.findings.length || 0) / CORRECTION_PAGE_SIZE)));
        const pagedFindings = computed(() => (review.value?.findings || [])
            .slice(findingPage.value * CORRECTION_PAGE_SIZE, (findingPage.value + 1) * CORRECTION_PAGE_SIZE));
        const summaryText = computed(() => {
            const value = review.value;
            if (!value) return "";
            const changed = new Set(value.rows.map((row) => row.date)).size;
            const parts = [t(changed === 1 ? "corrections.review.changedOne" : "corrections.review.changedMany", { count: changed })];
            if (value.kind === "file") {
                const skipped = value.rejections.filter((item) => item.reason === "skipped_by_user").length;
                parts.push(t("corrections.review.unchanged", { count: value.unchanged }));
                parts.push(t("corrections.review.rejected", { count: value.rejections.length - skipped }));
                if (skipped) parts.push(t("corrections.review.skipped", { count: skipped }));
            }
            return parts.join(" · ");
        });
        const detectedText = computed(() => {
            const info = review.value?.detected;
            if (!info) return "";
            const parts = [];
            if (info.format) parts.push(t(`corrections.detected.format.${info.format}`));
            const shape = info.time_series ? (info.value_kind === "meter" ? "seriesMeter" : "series")
                : (info.value_kind === "meter" ? "meter" : "daily");
            parts.push(t(`corrections.detected.shape.${shape}`, { minutes: info.time_step_minutes ?? "" }));
            if (info.layout === "wide" || info.layout === "sum") parts.push(t(`corrections.detected.layout.${info.layout}`));
            if (info.decimal === "comma" || info.decimal === "point") parts.push(t(`corrections.detected.decimal.${info.decimal}`));
            if (info.unit === "kwh" || info.unit === "wh" || info.unit === "mixed") parts.push(t(`corrections.detected.unit.${info.unit}`));
            if (info.date_order === "dmy" || info.date_order === "mdy" || info.date_order === "ymd") parts.push(t(`corrections.detected.date.${info.date_order}`));
            return t("corrections.detected.line", { parts: parts.join(", ") });
        });
        const detailParams = (detail) => {
            const params = {};
            for (const [name, value] of Object.entries(detail || {})) {
                if (value === null || typeof value === "object") continue;
                if (name === "metric") params[name] = metricLabel(String(value));
                else if (name === "date" || name.endsWith("_date")) params[name] = formatDate(value);
                else if (name.endsWith("_kwh") && Number.isFinite(Number(value))) params[name] = kwh(value);
                else params[name] = String(value);
            }
            return params;
        };
        const reasonText = (code, detail) => {
            const params = { value: "", date: "", metric: "", previous_date: "", previous_kwh: "", value_kwh: "", ...detailParams(detail) };
            return correctionTranslate(`corrections.reason.${code}`, params) || t("corrections.reason.unknown", params);
        };
        const rejectionRows = computed(() => (review.value?.rejections || []).slice(0, CORRECTION_REJECTION_SHOWN).map((item) => ({
            key: item.key, line: item.line, text: reasonText(item.reason, item.detail),
            canRestore: item.reason === "skipped_by_user" && decisions.skip.includes(item.line) && !decisionsLocked.value,
        })));
        const findingText = (finding) => {
            const detail = finding.detail || {};
            const key = finding.rule === "unit_wh_suspected" && detail.reason === "no_reference"
                ? "unit_wh_suspected_no_reference" : finding.rule;
            const params = {
                value: kwh(finding.value), max: finding.expectedMax === null ? "" : kwh(finding.expectedMax),
                kwp: number(detail.installed_kwp, 0, 2), limit: number(detail.limit_kw, 0, 2), hours: number(detail.hours, 0, 1),
                present: String(detail.present ?? ""), expected: String(detail.expected ?? ""),
                median: kwh(detail.median_kwh), days: String(detail.history_days ?? ""),
                suggestion: finding.suggestion === null ? "" : kwh(finding.suggestion),
            };
            return correctionTranslate(`corrections.finding.${key}`, params) || t("corrections.finding.unknown", params);
        };
        const balanceText = (warning) => {
            const params = { percent: number(warning.deviation_percent, 0, 1), metric: metricLabel(warning.metric) };
            return correctionTranslate(`corrections.balance.${warning.rule}`, params)
                || correctionTranslate("corrections.balanceWarning", params) || t("corrections.balance.unknown", params);
        };
        const ambiguity = computed(() => {
            const items = review.value?.rejections || [];
            const numeric = items.find((item) => item.reason === "ambiguous_number");
            if (numeric) {
                const raw = String(numeric.detail.value ?? "");
                const asComma = Number(raw.replace(/\./g, "").replace(",", "."));
                const asPoint = Number(raw.replace(/,/g, ""));
                const read = (value) => (Number.isFinite(value) ? number(value, 0, 3) : raw);
                return { type: "number", title: t("corrections.ambiguous.title"),
                    question: t("corrections.ambiguous.numberQuestion", { value: raw }),
                    options: [
                        { choice: "comma", text: t("corrections.ambiguous.comma", { value: raw, reading: read(asComma) }) },
                        { choice: "point", text: t("corrections.ambiguous.point", { value: raw, reading: read(asPoint) }) },
                    ] };
            }
            const dated = items.find((item) => item.reason === "ambiguous_date");
            if (dated) {
                const raw = String(dated.detail.value ?? "");
                const match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(raw.trim());
                const reading = (first, second) => {
                    if (!match) return raw;
                    const year = match[3].length === 2 ? `20${match[3]}` : match[3];
                    return formatDate(`${year}-${String(second).padStart(2, "0")}-${String(first).padStart(2, "0")}`);
                };
                return { type: "date", title: t("corrections.ambiguous.title"),
                    question: t("corrections.ambiguous.dateQuestion", { value: raw }),
                    options: [
                        { choice: "dmy", text: t("corrections.ambiguous.dmy", { value: raw, reading: match ? reading(match[1], match[2]) : raw }) },
                        { choice: "mdy", text: t("corrections.ambiguous.mdy", { value: raw, reading: match ? reading(match[2], match[1]) : raw }) },
                    ] };
            }
            return null;
        });
        const canApply = computed(() => {
            const value = review.value;
            return Boolean(value && value.token && value.rows.length && !reviewBusy.value && !commitBusy.value
                && !value.findingsOpen && !ambiguity.value && (!value.needsConfirm || confirmLarge.value));
        });
        const applyHint = computed(() => {
            const value = review.value;
            if (!value || reviewBusy.value) return "";
            if (ambiguity.value) return t("corrections.review.hintAmbiguous");
            if (value.findingsOpen) return t("corrections.review.hintFindings");
            if (!value.rows.length) return t("corrections.review.hintEmpty");
            if (value.needsConfirm && !confirmLarge.value) return t("corrections.review.hintConfirm");
            return "";
        });

        // ----- decisions ----------------------------------------------------
        const rowLocked = (finding) => (review.value?.kind === "file" ? (decisionsLocked.value || finding.line === null) : false);
        const without = (list, line) => list.filter((item) => item !== line);
        const decide = (mutate) => {
            mutate();
            const query = correctionBuildQuery(fileQueryOptions("x".repeat(32)));
            if (query.length > CORRECTION_URL_LIMIT) {
                showMessage(t("corrections.error.decision_too_long"), true);
                return;
            }
            startReview(true);
        };
        const acceptFinding = (finding) => {
            if (review.value?.kind !== "file") { decisions.accepted = true; startReview(true); return; }
            decide(() => {
                decisions.accept = [...without(decisions.accept, finding.line), finding.line];
                decisions.skip = without(decisions.skip, finding.line);
            });
        };
        const skipFinding = (finding) => decide(() => {
            decisions.skip = [...without(decisions.skip, finding.line), finding.line];
            decisions.accept = without(decisions.accept, finding.line);
            const next = { ...decisions.replace };
            delete next[finding.line];
            decisions.replace = next;
        });
        const lineIsSpan = (line) => (review.value?.spans || []).some((span) => span.line === line);
        const canSuggest = (finding) => {
            if (finding.suggestion === null || finding.suggestion === undefined) return false;
            const kind = review.value?.kind;
            if (kind === "day") return true;
            if (kind === "range") return Number(finding.detail?.factor) > 0;
            return finding.line !== null && !lineIsSpan(finding.line) && review.value?.detected?.layout !== "wide";
        };
        const suggestFinding = (finding) => {
            const kind = review.value?.kind;
            if (kind === "day") {
                day.value = inputNumber(finding.suggestion);
                startReview();
            } else if (kind === "range") {
                const plan = rangePlan.value;
                const total = Number(plan.sum) / Number(finding.detail.factor);
                const text = inputNumber(total);
                if (sel.form === "meter") {
                    const first = correctionNormalizeDecimal(meter.startValue);
                    meter.endValue = inputNumber(Number(first) + total);
                } else range.sum = text;
                startReview();
            } else {
                decide(() => {
                    decisions.replace = { ...decisions.replace, [finding.line]: Number(finding.suggestion) };
                    decisions.skip = without(decisions.skip, finding.line);
                    decisions.accept = without(decisions.accept, finding.line);
                });
            }
        };
        const canWithdraw = (finding) => review.value?.kind === "file" && finding.line !== null
            && decisions.accept.includes(finding.line) && !decisionsLocked.value;
        const withdraw = (finding) => decide(() => { decisions.accept = without(decisions.accept, finding.line); });
        const decideAll = (mode) => {
            if (mode === "accept") { decisions.accept = []; decisions.all = "accept"; }
            else { decisions.accept = []; decisions.skip = []; decisions.all = "skip"; }
            startReview(true);
        };
        const restoreLine = (line) => decide(() => { decisions.skip = without(decisions.skip, line); });
        const resetAndReview = () => { resetDecisions(); startReview(); };
        const chooseAmbiguity = (type, choice) => {
            if (type === "number") fileOpts.decimal = choice; else fileOpts.dateOrder = choice;
            startReview();
        };

        // ----- navigation ---------------------------------------------------
        const loadContext = async () => {
            contextGeneration += 1;
            const generation = contextGeneration;
            contextData.value = null;
            contextError.value = "";
            dayMode.value = "correct";
            if (!day.date || !sel.metric) { contextBusy.value = false; return; }
            const selection = `${day.date}:${sel.metric}`;
            const current = () => generation === contextGeneration && selection === `${day.date}:${sel.metric}`;
            contextBusy.value = true;
            try {
                let result;
                let mode = "correct";
                try {
                    result = await call("context", { target_date: day.date, metric: sel.metric, mode });
                } catch (error) {
                    if (!CORRECTION_NO_MEASUREMENT.includes(error.code)) throw error;
                    mode = "backfill";
                    if (!current()) return;
                    result = await call("context", { target_date: day.date, metric: sel.metric, mode });
                }
                if (!current()) return;
                dayMode.value = mode;
                contextData.value = result;
            } catch (error) {
                if (generation === contextGeneration) contextError.value = friendly(error).text;
            } finally {
                if (generation === contextGeneration) contextBusy.value = false;
            }
        };
        watch(() => `${day.date}|${sel.metric}`, () => {
            if (step.value === 3 && sel.form === "day") loadContext();
        });
        const resetTemplateRange = () => {
            const end = latestCompletedDate.value;
            fileOpts.tplEnd = end;
            fileOpts.tplStart = end ? correctionAddDays(end, -29) : "";
        };
        const chooseTile = (tile) => {
            if (tile.group) { batteryOpen.value = !batteryOpen.value; return; }
            sel.metric = tile.id;
            batteryOpen.value = false;
            setStep(2);
        };
        const chooseForm = (id) => { sel.form = id; };
        const goInput = () => {
            if (!sel.form) return;
            if (sel.form === "day") {
                if (!day.date) day.date = latestCompletedDate.value;
                loadContext();
            }
            if (sel.form === "range" && !range.start) {
                range.start = latestCompletedDate.value;
                range.end = latestCompletedDate.value;
            }
            setStep(3);
        };
        const goBack = () => {
            if (step.value === 4) { invalidateReview(); setStep(3); }
            else if (step.value > 1) { invalidateReview(); setStep(step.value - 1); }
        };
        const showTab = (name) => {
            tab.value = name;
            nextTick(() => { if (stepHeading.value && stepHeading.value.focus) stepHeading.value.focus(); });
        };
        const restart = () => {
            invalidateReview();
            resetDecisions();
            sel.metric = "";
            sel.form = "";
            sel.unit = "kwh";
            sel.seriesKind = "daily";
            day.value = "";
            day.note = "";
            day.evidence = "utility_invoice";
            range.sum = "";
            range.weighting = "measured";
            meter.startDate = meter.startValue = meter.endDate = meter.endValue = "";
            meter.weighting = "measured";
            fileObj.value = null;
            fileInputKey.value += 1;
            fileError.value = "";
            fileOpts.decimal = "";
            fileOpts.dateOrder = "";
            contextData.value = null;
            done.value = null;
            batteryOpen.value = false;
            showMessage("");
            setStep(1);
        };
        const onFile = (event) => {
            const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
            fileError.value = "";
            fileOpts.decimal = "";
            fileOpts.dateOrder = "";
            if (file && file.size > CORRECTION_MAX_BYTES) {
                fileObj.value = null;
                fileError.value = t("corrections.error.csv_too_large");
                return;
            }
            fileObj.value = file;
        };

        // ----- history, commit, undo ---------------------------------------
        const loadHistory = async () => {
            const result = await call("history", { limit: 100 });
            history.value = Array.isArray(result) ? result : [];
        };
        const originOf = (row) => {
            const reference = String(row.evidence_reference || "");
            if (reference.startsWith("range:")) return "range";
            if (reference.startsWith("csv:")) return "file";
            return row.mode === "backfill" ? "backfill" : "day";
        };
        const historyEntries = computed(() => {
            const entries = [];
            const batches = new Map();
            for (const row of history.value) {
                if (row.event_type !== "correction") continue;
                if (row.batch_id) {
                    let entry = batches.get(row.batch_id);
                    if (!entry) {
                        entry = { key: `b:${row.batch_id}`, batchId: row.batch_id, single: false, createdAt: row.created_at,
                            dates: new Set(), metrics: new Set(), delta: 0, origin: originOf(row), undoable: false, undone: true, note: "" };
                        batches.set(row.batch_id, entry);
                        entries.push(entry);
                    }
                    entry.dates.add(row.target_date);
                    entry.metrics.add(row.metric);
                    entry.delta += Number(row.delta_kwh || 0);
                    if (row.undoable) entry.undoable = true;
                    if (!row.undone) entry.undone = false;
                } else {
                    entries.push({ key: `e:${row.event_id}`, eventId: row.event_id, single: true, createdAt: row.created_at,
                        dates: new Set([row.target_date]), metrics: new Set([row.metric]), before: row.previous_effective_kwh,
                        after: row.absolute_value_kwh, origin: originOf(row), undoable: row.undoable === true,
                        undone: row.undone === true, note: row.reason_note || "" });
                }
            }
            return entries.map((entry) => {
                const dates = Array.from(entry.dates).sort();
                return {
                    ...entry,
                    createdText: correctionDateTime(entry.createdAt),
                    daysText: dates.length === 1 ? formatDate(dates[0])
                        : t("corrections.history.days", { count: dates.length, start: formatDate(dates[0]), end: formatDate(dates[dates.length - 1]) }),
                    metricText: Array.from(entry.metrics).map(metricLabel).join(", "),
                    changeText: entry.single ? `${kwh(entry.before)} → ${kwh(entry.after)}`
                        : t("corrections.history.sumChange", { value: signedKwh(entry.delta) }),
                    originText: t(`corrections.history.origin_${entry.origin}`),
                };
            });
        });
        const commit = async () => {
            const value = review.value;
            if (!value || !canApply.value) return;
            commitBusy.value = true;
            try {
                const operation = value.kind === "day" ? "commit" : (value.kind === "range" ? "range_commit" : "csv_commit");
                const result = await call(operation, { preview_token: value.token,
                    idempotency_key: reviewKey.value, confirmed_large_change: confirmLarge.value });
                invalidateReview();
                done.value = { kind: value.kind, eventId: result?.event_id ?? null,
                    batchId: value.kind === "day" ? null : (result?.batch_id ?? null), undone: false };
                showMessage("");
                setStep(5);
                await loadHistory().catch(() => {});
            } catch (error) {
                const info = friendly(error);
                lockFrom(error);
                reviewError.value = info.text;
                reviewErrorCode.value = info.code;
            } finally { commitBusy.value = false; }
        };
        const undoDone = async () => {
            if (!done.value || !window.confirm(t("corrections.undoAsk"))) return;
            undoBusy.value = true;
            try {
                if (done.value.batchId) await call("undo_batch", { batch_id: done.value.batchId, idempotency_key: correctionRandomId() });
                else await call("undo", { event_id: done.value.eventId, idempotency_key: correctionRandomId() });
                done.value = { ...done.value, undone: true };
                showMessage("");
                await loadHistory().catch(() => {});
            } catch (error) { showError(error); }
            finally { undoBusy.value = false; }
        };
        const undoEntry = async (entry) => {
            if (!window.confirm(t(entry.single ? "corrections.undoAsk" : "corrections.undoBatchConfirm"))) return;
            try {
                if (entry.single) await call("undo", { event_id: entry.eventId, idempotency_key: correctionRandomId() });
                else await call("undo_batch", { batch_id: entry.batchId, idempotency_key: correctionRandomId() });
                showMessage(t("corrections.undone"));
                await loadHistory();
            } catch (error) { showError(error); }
        };
        const downloadTemplate = async () => {
            if (templateProblem.value) return;
            templateBusy.value = true;
            try {
                const language = ["de", "en", "pl"].includes(correctionLanguage()) ? correctionLanguage() : "en";
                const response = await bridge.authorizedFetch(
                    `csv/template?metric=${encodeURIComponent(sel.metric)}&start=${encodeURIComponent(fileOpts.tplStart)}`
                    + `&end=${encodeURIComponent(fileOpts.tplEnd)}&lang=${language}`,
                    { method: "GET" },
                );
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `korrektur_${sel.metric}_${fileOpts.tplStart}_${fileOpts.tplEnd}.csv`;
                document.body.append(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(url);
            } catch (error) { showError(error); }
            finally { templateBusy.value = false; }
        };
        const load = async () => {
            try {
                const status = await call("status");
                applyRegistry(status);
                latestCompletedDate.value = status.latest_completed_date || "";
                if (!day.date) day.date = latestCompletedDate.value;
                resetTemplateRange();
                await loadHistory();
            } catch (error) {
                lockFrom(error);
                if (!locked.value) locked.value = friendly(error).text;
            } finally { loading.value = false; }
        };

        onMounted(() => { bridge = new CorrectionsBridgeClient(); bridge.mount(bridgeHost.value); load(); });
        onUnmounted(() => {
            previewGeneration += 1;
            contextGeneration += 1;
            bridge?.destroy();
        });
        return {
            bridgeHost, stepHeading, loading, locked, message, messageError, messageCode, tab, step, stepItems, crumb,
            latestCompletedDate, history, historyEntries, batteryOpen, mainTiles, batteryTiles, flowTiles, sel, day, range,
            meter, fileOpts, fileObj, fileName, fileInputKey, fileError, formIds, isFile, dayBackfill, dayValue, dayValueHint,
            weightingModel, rangePlan, templateProblem, templateBusy, formatBox, contextData, contextBusy, contextError,
            review, reviewBusy, reviewError, reviewErrorCode, confirmLarge, commitBusy, undoBusy, rowPage, findingPage, done,
            pageCount, pagedRows, findingPageCount, pagedFindings, summaryText, detectedText, rejectionRows, ambiguity,
            canApply, applyHint, decisions, decisionsLocked, hasDecisions, t, label, number, kwh, signedKwh, formatDate, hourLabel,
            metricLabel, findingText, balanceText, rowLocked, acceptFinding, skipFinding, canSuggest, suggestFinding,
            canWithdraw, withdraw, decideAll, restoreLine, resetAndReview, chooseAmbiguity, chooseTile, chooseForm,
            goInput, goBack, showTab, restart, onFile, startReview, commit, undoDone, undoEntry, downloadTemplate,
        };
    },
};

if (typeof window !== "undefined") {
    window.CorrectionsBridgeClient = CorrectionsBridgeClient;
    window.ModernCorrectionsPage = ModernCorrectionsPage;
}
if (typeof module !== "undefined") {
    module.exports = {
        CorrectionsBridgeClient,
        correctionHelpers: {
            normalizeDecimal: correctionNormalizeDecimal, compactLines: correctionCompactLines,
            compactReplace: correctionCompactReplace, buildQuery: correctionBuildQuery,
            urlLimit: CORRECTION_URL_LIMIT,
        },
    };
}
})();
