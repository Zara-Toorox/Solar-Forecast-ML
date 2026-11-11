const CONSUMERS_API = "sfml_stats/loads";
const CONSUMERS_BRIDGE_PROTOCOL = "sfml-consumers-bridge-v1";
const CONSUMERS_MAX_REQUEST_BYTES = 8192;
const CONSUMERS_MAX_RESPONSE_BYTES = 1024 * 1024;

function consumersPick(payload, keys) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("invalid_payload");
  }
  const result = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) result[key] = payload[key];
  }
  return result;
}

function consumersId(payload) {
  const id = String(payload && payload.id || "");
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) throw new Error("invalid_consumer");
  return id;
}

const CONSUMER_FIELDS = ["name", "kind", "priority", "nominal_power_w", "min_surplus_w", "entity_id", "ready_entity", "match", "conditions", "min_runtime_min", "min_off_min", "deadline", "duration_min", "objective", "earliest_day"];

const CONSUMERS_OPERATIONS = Object.freeze({
  status: { method: "GET", path: () => "status", payload: () => undefined },
  saveSettings: {
    method: "POST",
    path: () => "settings",
    payload: (value) => consumersPick(value, ["master_enabled", "base_load_w"]),
  },
  acknowledge: { method: "POST", path: () => "disclaimer", payload: () => ({ acknowledged: true }) },
  addConsumer: {
    method: "POST",
    path: () => "consumers",
    payload: (value) => consumersPick(value, CONSUMER_FIELDS),
  },
  updateConsumer: {
    method: "PUT",
    path: (value) => `consumers/${consumersId(value)}`,
    payload: (value) => consumersPick(value, CONSUMER_FIELDS),
  },
  deleteConsumer: {
    method: "DELETE",
    path: (value) => `consumers/${consumersId(value)}`,
    payload: () => undefined,
  },
  setActive: {
    method: "POST",
    path: (value) => `consumers/${consumersId(value)}/active`,
    payload: (value) => ({ active: value.active === true }),
  },
  resume: { method: "POST", path: (value) => `consumers/${consumersId(value)}/resume`, payload: () => undefined },
  arm: { method: "POST", path: (value) => `consumers/${consumersId(value)}/arm`, payload: () => undefined },
  disarm: { method: "POST", path: (value) => `consumers/${consumersId(value)}/disarm`, payload: () => undefined },
});

function consumersMessageSize(value) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function consumersSafeError(error) {
  const body = error?.body?.error || error?.error || {};
  return {
    code: String(body.code || error?.code || "request_failed").slice(0, 80),
    message: String(body.message || error?.message || "request_failed").slice(0, 240),
  };
}

class SfmlStatsConsumersBridge extends HTMLElement {
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
    window.parent.postMessage({ protocol: CONSUMERS_BRIDGE_PROTOCOL, type: "READY" }, location.origin);
  }

  _validEvent(event) {
    return event.origin === location.origin
      && event.source === window.parent
      && event.data?.protocol === CONSUMERS_BRIDGE_PROTOCOL;
  }

  async _handleMessage(event) {
    if (!this._validEvent(event)) return;
    const message = event.data;
    try {
      if (consumersMessageSize(message) > CONSUMERS_MAX_REQUEST_BYTES) return;
    } catch (_error) { return; }

    if (message.type === "INIT") {
      if (this._nonce !== null || !/^[a-f0-9]{32}$/.test(message.nonce || "")) return;
      this._nonce = message.nonce;
      window.parent.postMessage({
        protocol: CONSUMERS_BRIDGE_PROTOCOL,
        type: "INITIALIZED",
        nonce: this._nonce,
      }, location.origin);
      return;
    }

    if (message.type !== "REQUEST" || message.nonce !== this._nonce || !this._hass) return;
    if (!/^[a-f0-9]{32}$/.test(message.requestId || "") || this._seen.has(message.requestId)) return;
    const operation = CONSUMERS_OPERATIONS[message.operation];
    if (!operation) return;
    this._seen.add(message.requestId);
    if (this._seen.size > 256) this._seen.delete(this._seen.values().next().value);

    let response;
    try {
      const payload = operation.payload(message.payload || {});
      const data = await this._hass.callApi(
        operation.method,
        `${CONSUMERS_API}/${operation.path(message.payload || {})}`,
        payload,
      );
      response = {
        protocol: CONSUMERS_BRIDGE_PROTOCOL, type: "RESPONSE", nonce: this._nonce,
        requestId: message.requestId, success: true, data,
      };
    } catch (error) {
      response = {
        protocol: CONSUMERS_BRIDGE_PROTOCOL, type: "RESPONSE", nonce: this._nonce,
        requestId: message.requestId, success: false, error: consumersSafeError(error),
      };
    }
    try {
      if (consumersMessageSize(response) > CONSUMERS_MAX_RESPONSE_BYTES) {
        response = {
          protocol: CONSUMERS_BRIDGE_PROTOCOL, type: "RESPONSE", nonce: this._nonce,
          requestId: message.requestId, success: false,
          error: { code: "response_too_large", message: "response_too_large" },
        };
      }
      window.parent.postMessage(response, location.origin);
    } catch (_error) {
      window.parent.postMessage({
        protocol: CONSUMERS_BRIDGE_PROTOCOL, type: "RESPONSE", nonce: this._nonce,
        requestId: message.requestId, success: false,
        error: { code: "invalid_response", message: "invalid_response" },
      }, location.origin);
    }
  }
}

customElements.define("sfml-stats-consumers-bridge", SfmlStatsConsumersBridge);
