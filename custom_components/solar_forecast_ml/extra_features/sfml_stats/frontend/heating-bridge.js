const HEATING_API = "sfml_stats/heating";
const HEATING_BRIDGE_PROTOCOL = "sfml-heating-bridge-v1";
const HEATING_MAX_REQUEST_BYTES = 8192;
const HEATING_MAX_RESPONSE_BYTES = 1024 * 1024;

function heatingPick(payload, keys) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("invalid_payload");
  }
  const result = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) result[key] = payload[key];
  }
  return result;
}

function heatingRoomId(payload) {
  const id = String(payload && payload.id || "");
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) throw new Error("invalid_room");
  return id;
}

const HEATING_OPERATIONS = Object.freeze({
  status: { method: "GET", path: () => "status", payload: () => undefined },
  saveSettings: {
    method: "POST",
    path: () => "settings",
    payload: (value) => heatingPick(value, ["base_temp_c", "frost_floor_c", "presence_entities", "away_delay_min", "outdoor_entity", "heating_limit_c"]),
  },
  addRoom: {
    method: "POST",
    path: () => "rooms",
    payload: (value) => heatingPick(value, ["name", "climate_entities", "temp_sensor", "window_sensor", "comfort_temp_c", "setback_temp_c", "mode", "schedule", "auto_hvac"]),
  },
  updateRoom: {
    method: "PUT",
    path: (value) => `rooms/${heatingRoomId(value)}`,
    payload: (value) => heatingPick(value, ["name", "climate_entities", "temp_sensor", "window_sensor", "comfort_temp_c", "setback_temp_c", "mode", "schedule", "auto_hvac"]),
  },
  deleteRoom: {
    method: "DELETE",
    path: (value) => `rooms/${heatingRoomId(value)}`,
    payload: () => undefined,
  },
  setActive: {
    method: "POST",
    path: (value) => `rooms/${heatingRoomId(value)}/active`,
    payload: (value) => ({ active: value.active === true }),
  },
  resume: {
    method: "POST",
    path: (value) => `rooms/${heatingRoomId(value)}/resume`,
    payload: () => undefined,
  },
});

function heatingMessageSize(value) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function heatingSafeError(error) {
  const body = error?.body?.error || error?.error || {};
  return {
    code: String(body.code || error?.code || "request_failed").slice(0, 80),
    message: String(body.message || error?.message || "request_failed").slice(0, 240),
  };
}

class SfmlStatsHeatingBridge extends HTMLElement {
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
    window.parent.postMessage({ protocol: HEATING_BRIDGE_PROTOCOL, type: "READY" }, location.origin);
  }

  _validEvent(event) {
    return event.origin === location.origin
      && event.source === window.parent
      && event.data?.protocol === HEATING_BRIDGE_PROTOCOL;
  }

  async _handleMessage(event) {
    if (!this._validEvent(event)) return;
    const message = event.data;
    try {
      if (heatingMessageSize(message) > HEATING_MAX_REQUEST_BYTES) return;
    } catch (_error) { return; }

    if (message.type === "INIT") {
      if (this._nonce !== null || !/^[a-f0-9]{32}$/.test(message.nonce || "")) return;
      this._nonce = message.nonce;
      window.parent.postMessage({
        protocol: HEATING_BRIDGE_PROTOCOL,
        type: "INITIALIZED",
        nonce: this._nonce,
      }, location.origin);
      return;
    }

    if (message.type !== "REQUEST" || message.nonce !== this._nonce || !this._hass) return;
    if (!/^[a-f0-9]{32}$/.test(message.requestId || "") || this._seen.has(message.requestId)) return;
    const operation = HEATING_OPERATIONS[message.operation];
    if (!operation) return;
    this._seen.add(message.requestId);
    if (this._seen.size > 256) this._seen.delete(this._seen.values().next().value);

    let response;
    try {
      const payload = operation.payload(message.payload || {});
      const data = await this._hass.callApi(
        operation.method,
        `${HEATING_API}/${operation.path(message.payload || {})}`,
        payload,
      );
      response = {
        protocol: HEATING_BRIDGE_PROTOCOL, type: "RESPONSE", nonce: this._nonce,
        requestId: message.requestId, success: true, data,
      };
    } catch (error) {
      response = {
        protocol: HEATING_BRIDGE_PROTOCOL, type: "RESPONSE", nonce: this._nonce,
        requestId: message.requestId, success: false, error: heatingSafeError(error),
      };
    }
    try {
      if (heatingMessageSize(response) > HEATING_MAX_RESPONSE_BYTES) {
        response = {
          protocol: HEATING_BRIDGE_PROTOCOL, type: "RESPONSE", nonce: this._nonce,
          requestId: message.requestId, success: false,
          error: { code: "response_too_large", message: "response_too_large" },
        };
      }
      window.parent.postMessage(response, location.origin);
    } catch (_error) {
      window.parent.postMessage({
        protocol: HEATING_BRIDGE_PROTOCOL, type: "RESPONSE", nonce: this._nonce,
        requestId: message.requestId, success: false,
        error: { code: "invalid_response", message: "invalid_response" },
      }, location.origin);
    }
  }
}

customElements.define("sfml-stats-heating-bridge", SfmlStatsHeatingBridge);
