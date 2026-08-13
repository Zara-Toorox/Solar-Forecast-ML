const SFML_API_BRIDGE_PROTOCOL = "sfml-api-bridge-v1";
const SFML_API_PREFIX = "/api/sfml_stats/";
const SFML_API_MAX_REQUEST_BYTES = 4096;
const SFML_API_MAX_RESPONSE_BYTES = 4 * 1024 * 1024;

function bridgeMessageSize(value) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function authenticatedApiPath(value) {
  if (typeof value !== "string" || value.length > 2048) return null;
  let parsed;
  try {
    parsed = new URL(value, location.origin);
  } catch (_error) {
    return null;
  }
  if (parsed.origin !== location.origin || !parsed.pathname.startsWith(SFML_API_PREFIX)) {
    return null;
  }
  if (parsed.username || parsed.password || parsed.hash) return null;
  return `${parsed.pathname.slice("/api/".length)}${parsed.search}`;
}

function bridgeError(error) {
  const body = error?.body?.error || error?.error || {};
  return {
    code: String(body.code || error?.code || "request_failed").slice(0, 80),
    message: String(body.message || error?.message || "Anfrage fehlgeschlagen").slice(0, 240),
  };
}

class SfmlStatsApiBridge extends HTMLElement {
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
    window.parent.postMessage(
      { protocol: SFML_API_BRIDGE_PROTOCOL, type: "READY" },
      location.origin,
    );
  }

  _validEvent(event) {
    return event.origin === location.origin
      && event.source === window.parent
      && event.data?.protocol === SFML_API_BRIDGE_PROTOCOL;
  }

  async _handleMessage(event) {
    if (!this._validEvent(event)) return;
    const message = event.data;
    try {
      if (bridgeMessageSize(message) > SFML_API_MAX_REQUEST_BYTES) return;
    } catch (_error) {
      return;
    }

    if (message.type === "INIT") {
      if (this._nonce !== null || !/^[a-f0-9]{32}$/.test(message.nonce || "")) return;
      this._nonce = message.nonce;
      window.parent.postMessage(
        { protocol: SFML_API_BRIDGE_PROTOCOL, type: "INITIALIZED", nonce: this._nonce },
        location.origin,
      );
      return;
    }

    if (message.type !== "GET" || message.nonce !== this._nonce || !this._hass) return;
    if (!/^[a-f0-9]{32}$/.test(message.requestId || "") || this._seen.has(message.requestId)) return;
    const path = authenticatedApiPath(message.endpoint);
    if (!path) return;
    this._seen.add(message.requestId);
    if (this._seen.size > 256) this._seen.delete(this._seen.values().next().value);

    let response;
    try {
      const data = await this._hass.callApi("GET", path);
      response = {
        protocol: SFML_API_BRIDGE_PROTOCOL,
        type: "RESPONSE",
        nonce: this._nonce,
        requestId: message.requestId,
        success: true,
        data,
      };
    } catch (error) {
      response = {
        protocol: SFML_API_BRIDGE_PROTOCOL,
        type: "RESPONSE",
        nonce: this._nonce,
        requestId: message.requestId,
        success: false,
        error: bridgeError(error),
      };
    }
    try {
      if (bridgeMessageSize(response) > SFML_API_MAX_RESPONSE_BYTES) {
        response = {
          protocol: SFML_API_BRIDGE_PROTOCOL,
          type: "RESPONSE",
          nonce: this._nonce,
          requestId: message.requestId,
          success: false,
          error: { code: "response_too_large", message: "Antwort überschreitet das sichere Größenlimit" },
        };
      }
      window.parent.postMessage(response, location.origin);
    } catch (_error) {
      window.parent.postMessage({
        protocol: SFML_API_BRIDGE_PROTOCOL,
        type: "RESPONSE",
        nonce: this._nonce,
        requestId: message.requestId,
        success: false,
        error: { code: "invalid_response", message: "Antwort konnte nicht sicher übertragen werden" },
      }, location.origin);
    }
  }
}

customElements.define("sfml-stats-api-bridge", SfmlStatsApiBridge);
