const EMS_API = "sfml_stats/ems";
const EMS_BRIDGE_PROTOCOL = "sfml-ems-bridge-v1";
const EMS_MAX_REQUEST_BYTES = 4096;
const EMS_MAX_RESPONSE_BYTES = 1024 * 1024;

const EMS_OPERATIONS = Object.freeze({
  snapshot: { method: "GET", path: "snapshot", payload: () => undefined },
  setMode: {
    method: "POST",
    path: "mode",
    payload: (value) => pick(value, ["mode", "confirm_automatic"]),
  },
  setActor: {
    method: "POST",
    path: "actor",
    payload: (value) => pick(value, ["actor_id", "enabled"]),
  },
  confirm: {
    method: "POST",
    path: "confirm",
    payload: (value) => pick(value, ["token"]),
  },
});

function pick(payload, keys) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Ungültige Nutzdaten");
  }
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
    code: String(body.code || error?.code || "request_failed").slice(0, 80),
    message: String(body.message || error?.message || "EMS-Anfrage fehlgeschlagen").slice(0, 240),
  };
}

class SfmlStatsEmsBridge extends HTMLElement {
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

  set panel(value) { this._panel = value; }

  _announceReady() {
    if (!this.isConnected || !this._hass || window.parent === window) return;
    window.parent.postMessage({ protocol: EMS_BRIDGE_PROTOCOL, type: "READY" }, location.origin);
  }

  _validEvent(event) {
    return event.origin === location.origin
      && event.source === window.parent
      && event.data?.protocol === EMS_BRIDGE_PROTOCOL;
  }

  async _handleMessage(event) {
    if (!this._validEvent(event)) return;
    const message = event.data;
    try {
      if (messageSize(message) > EMS_MAX_REQUEST_BYTES) return;
    } catch (_error) { return; }

    if (message.type === "INIT") {
      if (this._nonce !== null || !/^[a-f0-9]{32}$/.test(message.nonce || "")) return;
      this._nonce = message.nonce;
      window.parent.postMessage({
        protocol: EMS_BRIDGE_PROTOCOL,
        type: "INITIALIZED",
        nonce: this._nonce,
      }, location.origin);
      return;
    }

    if (message.type !== "REQUEST" || message.nonce !== this._nonce || !this._hass) return;
    if (!/^[a-f0-9]{32}$/.test(message.requestId || "") || this._seen.has(message.requestId)) return;
    const operation = EMS_OPERATIONS[message.operation];
    if (!operation) return;
    this._seen.add(message.requestId);
    if (this._seen.size > 256) this._seen.delete(this._seen.values().next().value);

    let response;
    try {
      const payload = operation.payload(message.payload || {});
      const data = await this._hass.callApi(
        operation.method,
        `${EMS_API}/${operation.path}`,
        payload,
      );
      response = { protocol: EMS_BRIDGE_PROTOCOL, type: "RESPONSE", nonce: this._nonce,
        requestId: message.requestId, success: true, data };
    } catch (error) {
      response = { protocol: EMS_BRIDGE_PROTOCOL, type: "RESPONSE", nonce: this._nonce,
        requestId: message.requestId, success: false, error: safeError(error) };
    }
    try {
      if (messageSize(response) > EMS_MAX_RESPONSE_BYTES) {
        response = { protocol: EMS_BRIDGE_PROTOCOL, type: "RESPONSE", nonce: this._nonce,
          requestId: message.requestId, success: false,
          error: { code: "response_too_large", message: "EMS-Antwort überschreitet das sichere Größenlimit" } };
      }
      window.parent.postMessage(response, location.origin);
    } catch (_error) {
      window.parent.postMessage({ protocol: EMS_BRIDGE_PROTOCOL, type: "RESPONSE", nonce: this._nonce,
        requestId: message.requestId, success: false,
        error: { code: "invalid_response", message: "EMS-Antwort konnte nicht sicher übertragen werden" } }, location.origin);
    }
  }
}

customElements.define("sfml-stats-ems-bridge", SfmlStatsEmsBridge);
