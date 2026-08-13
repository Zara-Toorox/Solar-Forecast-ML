/* ============================================================
   SFML Stats Dashboard - API Client with Caching
   ============================================================ */

const SFML_API_BRIDGE_PROTOCOL = "sfml-api-bridge-v1";
const SFML_API_BRIDGE_PATH = "/sfml-stats-api-bridge";
const SFML_EXTERNAL_AUTH_CALLBACK = "externalAuthSetToken";
const SFML_EXTERNAL_AUTH_TIMEOUT_MS = 10000;

const sfmlApiRandomId = () => {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID().replaceAll("-", "");
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
};

const sfmlAuthenticatedEndpoint = (value, origin = window.location.origin) => {
    if (typeof value !== "string" || value.length > 2048) return null;
    if (/\\|%(?:2f|5c|00)/i.test(value)) return null;
    let parsed;
    try {
        parsed = new URL(value, origin);
    } catch (_error) {
        return null;
    }
    if (
        parsed.origin !== origin
        || !parsed.pathname.startsWith("/api/sfml_stats/")
        || parsed.username
        || parsed.password
        || parsed.hash
    ) {
        return null;
    }
    return `${parsed.pathname}${parsed.search}`;
};

const sfmlHassApiPath = (value, origin = window.location.origin) => {
    const endpoint = sfmlAuthenticatedEndpoint(value, origin);
    return endpoint ? endpoint.slice("/api/".length) : null;
};

class SfmlParentHassApiClient {
    constructor(hostWindow = window) {
        this.hostWindow = hostWindow;
    }

    _authenticatedHass() {
        const host = this.hostWindow;
        if (host.parent === host || host.top !== host.parent) return null;

        try {
            const parent = host.parent;
            if (parent.location.origin !== host.location.origin) return null;
            const hass = parent.document.querySelector("home-assistant")?.hass;
            if (typeof hass?.callApi === "function") return hass;
        } catch (_error) {
            return null;
        }
        return null;
    }

    isAvailable() {
        return this._authenticatedHass() !== null;
    }

    async get(endpoint) {
        const path = sfmlHassApiPath(endpoint, this.hostWindow.location.origin);
        if (!path) throw new Error("Authenticated endpoint rejected");
        const hass = this._authenticatedHass();
        if (!hass) throw new Error("Home-Assistant-Panel-Anmeldung nicht verfügbar");
        return hass.callApi("GET", path);
    }
}

class SfmlCompanionAuthClient {
    constructor(hostWindow = window) {
        this.hostWindow = hostWindow;
        this.pending = null;
    }

    isAvailable() {
        const host = this.hostWindow;
        if (host.top !== host) return false;
        return Boolean(
            host.externalAppV2
            || host.externalApp?.getExternalAuth
            || host.webkit?.messageHandlers?.getExternalAuth
        );
    }

    async getAccessToken() {
        if (!this.isAvailable()) return null;
        if (this.pending) return this.pending;

        this.pending = this._requestAccessToken();
        try {
            return await this.pending;
        } finally {
            this.pending = null;
        }
    }

    _requestAccessToken() {
        const host = this.hostWindow;
        return new Promise((resolve, reject) => {
            const previousCallback = host[SFML_EXTERNAL_AUTH_CALLBACK];
            let timer;

            const restoreCallback = () => {
                host.clearTimeout(timer);
                if (host[SFML_EXTERNAL_AUTH_CALLBACK] !== installedCallback) return;
                if (previousCallback === undefined) {
                    delete host[SFML_EXTERNAL_AUTH_CALLBACK];
                } else {
                    host[SFML_EXTERNAL_AUTH_CALLBACK] = previousCallback;
                }
            };

            const installedCallback = (success, result) => {
                restoreCallback();
                const token = success === true ? result?.access_token : null;
                if (typeof token === "string" && token.length > 0) {
                    resolve(token);
                    return;
                }
                reject(new Error("Home-Assistant-App-Anmeldung fehlgeschlagen"));
            };
            host[SFML_EXTERNAL_AUTH_CALLBACK] = installedCallback;
            timer = host.setTimeout(() => {
                restoreCallback();
                reject(new Error("Home-Assistant-App-Anmeldung nicht verfügbar"));
            }, SFML_EXTERNAL_AUTH_TIMEOUT_MS);

            const payload = { callback: SFML_EXTERNAL_AUTH_CALLBACK };
            try {
                if (host.externalAppV2) {
                    host.externalAppV2.postMessage(JSON.stringify({
                        type: "getExternalAuth",
                        payload,
                    }));
                } else if (host.externalApp?.getExternalAuth) {
                    host.externalApp.getExternalAuth(JSON.stringify(payload));
                } else {
                    host.webkit.messageHandlers.getExternalAuth.postMessage(payload);
                }
            } catch (error) {
                restoreCallback();
                reject(error);
            }
        });
    }
}

class SfmlAuthenticatedApiClient {
    constructor() {
        this.origin = window.location.origin;
        this.nonce = sfmlApiRandomId();
        this.pending = new Map();
        this.initialized = false;
        this._onMessage = this._handleMessage.bind(this);
        this.ready = new Promise((resolve, reject) => {
            this._resolveReady = resolve;
            this._rejectReady = reject;
        });
    }

    _mount() {
        if (this.iframe) return;
        const iframe = document.createElement("iframe");
        iframe.hidden = true;
        iframe.title = "Authentifizierte Home-Assistant-Verbindung";
        iframe.tabIndex = -1;
        iframe.setAttribute("aria-hidden", "true");
        iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
        iframe.src = SFML_API_BRIDGE_PATH;
        this.iframe = iframe;
        window.addEventListener("message", this._onMessage);
        document.body.append(iframe);
        this.readyTimer = window.setTimeout(() => {
            this._rejectReady(new Error("Home-Assistant-Anmeldung nicht verfügbar"));
        }, 10000);
    }

    _validEvent(event) {
        return event.origin === this.origin
            && event.source === this.iframe?.contentWindow
            && event.data?.protocol === SFML_API_BRIDGE_PROTOCOL;
    }

    _handleMessage(event) {
        if (!this._validEvent(event)) return;
        const message = event.data;
        if (message.type === "READY" && !this.initialized) {
            this.iframe.contentWindow.postMessage({
                protocol: SFML_API_BRIDGE_PROTOCOL,
                type: "INIT",
                nonce: this.nonce,
            }, this.origin);
            return;
        }
        if (message.type === "INITIALIZED" && message.nonce === this.nonce && !this.initialized) {
            this.initialized = true;
            window.clearTimeout(this.readyTimer);
            this._resolveReady();
            return;
        }
        if (message.type !== "RESPONSE" || message.nonce !== this.nonce) return;
        const pending = this.pending.get(message.requestId);
        if (!pending) return;
        this.pending.delete(message.requestId);
        window.clearTimeout(pending.timer);
        if (message.success === true) pending.resolve(message.data);
        else {
            const error = new Error(String(message.error?.message || "Anfrage fehlgeschlagen"));
            error.code = String(message.error?.code || "request_failed");
            pending.reject(error);
        }
    }

    async get(endpoint) {
        this._mount();
        await this.ready;
        const requestId = sfmlApiRandomId();
        return new Promise((resolve, reject) => {
            const timer = window.setTimeout(() => {
                this.pending.delete(requestId);
                reject(new Error("Home-Assistant-Anfrage hat das Zeitlimit überschritten"));
            }, 15000);
            this.pending.set(requestId, { resolve, reject, timer });
            this.iframe.contentWindow.postMessage({
                protocol: SFML_API_BRIDGE_PROTOCOL,
                type: "GET",
                nonce: this.nonce,
                requestId,
                endpoint,
            }, this.origin);
        });
    }
}

// API client with caching and deduplication
const SFMLApi = {
    cache: new Map(),
    pendingRequests: new Map(),
    defaultTTL: 30000, // 30 seconds

    async fetch(endpoint, options = {}) {
        const { ttl = this.defaultTTL, forceRefresh = false } = options;
        const cacheKey = endpoint;

        // Check cache first (unless force refresh)
        if (!forceRefresh && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < ttl) {
                return cached.data;
            }
        }

        // Deduplicate concurrent requests to the same endpoint
        if (this.pendingRequests.has(cacheKey)) {
            return this.pendingRequests.get(cacheKey);
        }

        // Make the request
        const requestPromise = (async () => {
            try {
                // The in-memory TTL is the single cache authority. Browser HTTP
                // caches must not retain volatile Home Assistant API snapshots.
                const response = await fetch(endpoint, {
                    cache: "no-store",
                    credentials: "same-origin"
                });
                if (response.status === 401) {
                    let errorCode = null;
                    try {
                        errorCode = (await response.clone().json())?.error?.code;
                    } catch (_error) {
                        errorCode = null;
                    }
                    if (errorCode === "authentication_required") {
                        const authenticatedEndpoint = sfmlAuthenticatedEndpoint(endpoint);
                        if (!authenticatedEndpoint) {
                            throw new Error("Authenticated endpoint rejected");
                        }
                        this.parentHassClient ??= new SfmlParentHassApiClient();
                        if (this.parentHassClient.isAvailable()) {
                            const data = await this.parentHassClient.get(endpoint);
                            this.cache.set(cacheKey, { data, timestamp: Date.now() });
                            return data;
                        }
                        this.companionAuthClient ??= new SfmlCompanionAuthClient();
                        const accessToken = await this.companionAuthClient.getAccessToken();
                        if (accessToken) {
                            const authenticatedResponse = await fetch(authenticatedEndpoint, {
                                cache: "no-store",
                                headers: { Authorization: `Bearer ${accessToken}` },
                            });
                            if (!authenticatedResponse.ok) {
                                throw new Error(
                                    `HTTP ${authenticatedResponse.status}: ${authenticatedResponse.statusText}`
                                );
                            }
                            const data = await authenticatedResponse.json();
                            this.cache.set(cacheKey, { data, timestamp: Date.now() });
                            return data;
                        }
                        this.authenticatedClient ??= new SfmlAuthenticatedApiClient();
                        const data = await this.authenticatedClient.get(endpoint);
                        this.cache.set(cacheKey, { data, timestamp: Date.now() });
                        return data;
                    }
                }
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                const data = await response.json();

                // Cache the result
                this.cache.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });

                return data;
            } finally {
                this.pendingRequests.delete(cacheKey);
            }
        })();

        this.pendingRequests.set(cacheKey, requestPromise);
        return requestPromise;
    },

    // Convenience methods for common endpoints
    async getSummary(forceRefresh = false) {
        return this.fetch('/api/sfml_stats/summary', { forceRefresh });
    },

    async getSolar(days = 7, forceRefresh = false) {
        return this.fetch(`/api/sfml_stats/solar?days=${days}`, { forceRefresh });
    },

    async getPrices(days = 2, forceRefresh = false) {
        return this.fetch(`/api/sfml_stats/prices?days=${days}`, { forceRefresh });
    },

    async getEnergyFlow(forceRefresh = false) {
        return this.fetch('/api/sfml_stats/energy_flow', { forceRefresh });
    },

    async getStatistics(forceRefresh = false) {
        return this.fetch('/api/sfml_stats/statistics', { forceRefresh });
    },

    async getBilling(forceRefresh = false) {
        return this.fetch('/api/sfml_stats/billing', { forceRefresh });
    },

    async getPowerSourcesHistory(hours = 24, forceRefresh = false) {
        return this.fetch(`/api/sfml_stats/power_sources_history?hours=${hours}`, { forceRefresh, ttl: 60000 });
    },

    async getSolarHistory(days = 30, forceRefresh = false) {
        return this.fetch(`/api/sfml_stats/solar_history?days=${days}`, { forceRefresh, ttl: 300000 });
    },

    async getBatteryHistory(hours = 24, forceRefresh = false) {
        return this.fetch(`/api/sfml_stats/battery_history?hours=${hours}`, { forceRefresh, ttl: 60000 });
    },

    async getHouseHistory(hours = 24, forceRefresh = false) {
        return this.fetch(`/api/sfml_stats/house_history?hours=${hours}`, { forceRefresh, ttl: 60000 });
    },

    async getGridHistory(hours = 24, forceRefresh = false) {
        return this.fetch(`/api/sfml_stats/grid_history?hours=${hours}`, { forceRefresh, ttl: 60000 });
    },

    async getWeatherHistory(days = 7, includePartial = false, forceRefresh = false) {
        const partial = includePartial ? '&include_partial=true' : '';
        return this.fetch(`/api/sfml_stats/weather_history?days=${days}${partial}`, { forceRefresh, ttl: 300000 });
    },

    async getClothingRecommendation(forceRefresh = false) {
        return this.fetch('/api/sfml_stats/clothing_recommendation', { forceRefresh, ttl: 300000 });
    },

    async getForecastComparison(forceRefresh = false) {
        return this.fetch('/api/sfml_stats/forecast_comparison', { forceRefresh, ttl: 300000 });
    },

    async getShadowAnalytics(days = 30, forceRefresh = false) {
        return this.fetch(`/api/sfml_stats/shadow_analytics?days=${days}`, { forceRefresh, ttl: 300000 });
    },

    async createHelperSensor(sourceSensor, name, configKey) {
        const response = await fetch('/api/sfml_stats/create_helper_sensor', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ source_sensor: sourceSensor, name, config_key: configKey })
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    },

    // Clear cache (useful for forcing refresh)
    clearCache(endpoint = null) {
        if (endpoint) {
            this.cache.delete(endpoint);
        } else {
            this.cache.clear();
        }
    }
};

// Export for global access
window.SFMLApi = SFMLApi;
