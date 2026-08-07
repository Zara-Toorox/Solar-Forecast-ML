const CORRECTIONS_API = "sfml_stats/corrections";
const BRIDGE_PROTOCOL = "sfml-corrections-bridge-v1";
const MAX_REQUEST_BYTES = 8192;
const MAX_RESPONSE_BYTES = 262144;

const OPERATIONS = Object.freeze({
  status: { method: "GET", path: () => "status", payload: () => undefined },
  history: {
    method: "GET",
    path: (payload) => {
      const limit = Number(payload?.limit ?? 100);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("Ungültiges Verlaufslimit");
      return `history?limit=${limit}`;
    },
    payload: () => undefined,
  },
  preview: {
    method: "POST", path: () => "preview",
    payload: (payload) => pick(payload, ["target_date", "metric", "target_value_kwh",
      "reason_note", "idempotency_key"]),
  },
  commit: {
    method: "POST", path: () => "commit",
    payload: (payload) => pick(payload, ["preview_token", "idempotency_key", "confirmed_large_change"]),
  },
  undo: {
    method: "POST", path: () => "undo",
    payload: (payload) => pick(payload, ["event_id", "idempotency_key"]),
  },
});

function pick(payload, keys) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Ungültige Nutzdaten");
  const result = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) result[key] = payload[key];
  }
  return result;
}

function messageSize(value) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function safeError(error) {
  const body = error?.body?.error || error?.error || {};
  return {
    code: String(body.code || "request_failed").slice(0, 80),
    message: String(body.message || error?.message || "Anfrage fehlgeschlagen").slice(0, 240),
  };
}

class SfmlStatsCorrectionsBridge extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this._nonce = null;
    this._seen = new Set();
    this._onMessage = this._handleMessage.bind(this);
  }

  connectedCallback() {
    window.addEventListener("message", this._onMessage);
    this._announceReady();
  }

  disconnectedCallback() {
    window.removeEventListener("message", this._onMessage);
    this._nonce = null;
    this._seen.clear();
  }

  set hass(value) {
    this._hass = value;
    this._announceReady();
  }

  set panel(value) {
    this._panel = value;
  }

  _announceReady() {
    if (!this.isConnected || !this._hass || window.parent === window) return;
    window.parent.postMessage({ protocol: BRIDGE_PROTOCOL, type: "READY" }, location.origin);
  }

  _validEvent(event) {
    return event.origin === location.origin
      && event.source === window.parent
      && event.data?.protocol === BRIDGE_PROTOCOL;
  }

  async _handleMessage(event) {
    if (!this._validEvent(event)) return;
    const message = event.data;
    let size;
    try { size = messageSize(message); } catch (_error) { return; }
    if (size > MAX_REQUEST_BYTES) return;

    if (message.type === "INIT") {
      if (this._nonce !== null || typeof message.nonce !== "string" || !/^[a-f0-9]{32}$/.test(message.nonce)) return;
      this._nonce = message.nonce;
      window.parent.postMessage({ protocol: BRIDGE_PROTOCOL, type: "INITIALIZED", nonce: this._nonce }, location.origin);
      return;
    }

    if (message.type !== "REQUEST" || message.nonce !== this._nonce || !this._hass) return;
    if (typeof message.requestId !== "string" || !/^[a-f0-9]{32}$/.test(message.requestId)) return;
    if (this._seen.has(message.requestId)) return;
    const operation = OPERATIONS[message.operation];
    if (!operation) return;
    this._seen.add(message.requestId);
    if (this._seen.size > 256) this._seen.delete(this._seen.values().next().value);

    let response;
    try {
      const path = operation.path(message.payload);
      const payload = operation.payload(message.payload);
      const data = await this._hass.callApi(operation.method, `${CORRECTIONS_API}/${path}`, payload);
      response = { protocol: BRIDGE_PROTOCOL, type: "RESPONSE", nonce: this._nonce,
        requestId: message.requestId, success: true, data };
    } catch (error) {
      response = { protocol: BRIDGE_PROTOCOL, type: "RESPONSE", nonce: this._nonce,
        requestId: message.requestId, success: false, error: safeError(error) };
    }
    try {
      if (messageSize(response) > MAX_RESPONSE_BYTES) {
        response = { protocol: BRIDGE_PROTOCOL, type: "RESPONSE", nonce: this._nonce,
          requestId: message.requestId, success: false,
          error: { code: "response_too_large", message: "Antwort überschreitet das sichere Größenlimit" } };
      }
      window.parent.postMessage(response, location.origin);
    } catch (_error) {
      window.parent.postMessage({ protocol: BRIDGE_PROTOCOL, type: "RESPONSE", nonce: this._nonce,
        requestId: message.requestId, success: false,
        error: { code: "invalid_response", message: "Antwort konnte nicht sicher übertragen werden" } }, location.origin);
    }
  }
}

customElements.define("sfml-stats-corrections-bridge", SfmlStatsCorrectionsBridge);
