(() => {
    const PROTOCOL = "sfml-heating-bridge-v1";
    const BRIDGE_PATH = "/sfml-stats-heating-bridge";
    const OPERATIONS = new Set(["status", "saveSettings", "addRoom", "updateRoom", "deleteRoom", "setActive", "resume", "setBoost", "clearBoost"]);
    const REASONS = ["locked", "disabled", "no_persons", "presence_home", "presence_unknown", "presence_pending", "presence_away", "window_open", "window_detected", "away_setback", "schedule_setback", "comfort", "preheat", "boost", "vacation", "pv_lift", "price_lift", "room_inactive", "thermostat_unavailable", "hvac_off", "hvac_switched", "mixed_reasons", "range_setpoint", "setpoint_unreadable", "within_band", "same_value", "decrease_limited", "increase_limited", "manual_override", "startup_hold", "write_failed", "awaiting_device", "device_not_responding", "outdoor_unavailable", "outdoor_missing", "forecast_unavailable"];
    const BOOST_MINUTES = [30, 60, 120, 240, 480, 1440];
    const HIDDEN_REASONS = ["same_value", "within_band", "startup_hold"];
    const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
    const UI_PHRASE = {
        de: {
            editRoom: "Raum bearbeiten",
            sectionRoom: "Raum",
            sectionDevices: "Geräte",
            autoHvacHelp: "In der Heizperiode wird auf Heizen gestellt, außerhalb auf Aus.",
        },
        en: {
            editRoom: "Edit room",
            sectionRoom: "Room",
            sectionDevices: "Devices",
            autoHvacHelp: "During the heating season the thermostat is set to heat, otherwise to off.",
        },
        pl: {
            editRoom: "Edytuj pomieszczenie",
            sectionRoom: "Pomieszczenie",
            sectionDevices: "Urządzenia",
            autoHvacHelp: "W sezonie grzewczym termostat włącza grzanie, poza sezonem wyłącza je.",
        },
    };

    function uiPhrase(key) {
        const lang = window.SFMLI18n?.current;
        const pack = UI_PHRASE[lang] || UI_PHRASE.de;
        return pack[key] || UI_PHRASE.de[key] || "";
    }

    const text = (key, params) => (window.SFMLI18n ? window.SFMLI18n.t(key, params) : key);
    const randomId = () => {
        if (typeof crypto.randomUUID === "function") return crypto.randomUUID().replaceAll("-", "");
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
    };
    const messageSize = (value) => new TextEncoder().encode(JSON.stringify(value)).byteLength;
    const parentHass = (hostWindow) => {
        let current = hostWindow;
        while (current.parent && current.parent !== current) {
            const parent = current.parent;
            try {
                if (parent.location.origin !== hostWindow.location.origin) return null;
                const hass = parent.document.querySelector("home-assistant")?.hass;
                if (hass && typeof hass.callApi === "function") return hass;
            } catch (_error) {
                return null;
            }
            current = parent;
        }
        return null;
    };

    class HeatingBridgeClient {
        constructor(hostWindow) {
            this.hostWindow = hostWindow;
            this.origin = hostWindow.location.origin;
            this.iframe = null;
            this.pending = new Map();
            this.nonce = randomId();
            this.initialized = false;
            this.destroyed = false;
            this.hass = null;
            this.onMessage = (event) => this.handleMessage(event);
            this.ready = new Promise((resolve, reject) => {
                this.resolveReady = resolve;
                this.rejectReady = reject;
            });
        }

        mount(host) {
            if (this.destroyed || !host || this.iframe) return;
            this.hass = parentHass(this.hostWindow);
            if (this.hass?.callApi) {
                this.initialized = true;
                this.resolveReady();
                return;
            }
            const iframe = document.createElement("iframe");
            iframe.className = "heating-bridge-frame";
            iframe.title = text("heating.bridgeTitle");
            iframe.setAttribute("aria-hidden", "true");
            iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
            iframe.tabIndex = -1;
            host.appendChild(iframe);
            this.iframe = iframe;
            this.hostWindow.addEventListener("message", this.onMessage);
            iframe.src = BRIDGE_PATH;
            this.readyTimer = this.hostWindow.setTimeout(() => {
                this.rejectReady(new Error("timeout"));
            }, 10000);
        }

        handleMessage(event) {
            const accepted = event.source === this.iframe?.contentWindow
                && event.origin === this.origin
                && event.data?.protocol === PROTOCOL;
            if (!accepted || this.destroyed) return;
            try { if (messageSize(event.data) > 1024 * 1024) return; } catch (_error) { return; }
            const message = event.data;
            if (message.type === "READY" && !this.initialized) {
                this.iframe.contentWindow.postMessage({ protocol: PROTOCOL, type: "INIT", nonce: this.nonce }, this.origin);
                return;
            }
            if (message.type === "INITIALIZED" && message.nonce === this.nonce && !this.initialized) {
                this.initialized = true;
                this.hostWindow.clearTimeout(this.readyTimer);
                this.resolveReady();
                return;
            }
            if (message.type !== "RESPONSE" || message.nonce !== this.nonce) return;
            const pending = this.pending.get(message.requestId);
            if (!pending) return;
            this.pending.delete(message.requestId);
            this.hostWindow.clearTimeout(pending.timer);
            if (message.success === true) pending.resolve(message.data);
            else pending.reject(heatingRequestError(message.error));
        }

        async request(operation, payload = {}) {
            if (this.destroyed || !OPERATIONS.has(operation)) throw new Error("unavailable");
            await this.ready;
            const routes = {
                status: ["GET", "status"],
                saveSettings: ["POST", "settings"],
                addRoom: ["POST", "rooms"],
                updateRoom: ["PUT", `rooms/${payload.id}`],
                deleteRoom: ["DELETE", `rooms/${payload.id}`],
                setActive: ["POST", `rooms/${payload.id}/active`],
                resume: ["POST", `rooms/${payload.id}/resume`],
                setBoost: ["POST", `rooms/${payload.id}/boost`],
                clearBoost: ["DELETE", `rooms/${payload.id}/boost`],
            };
            const route = routes[operation];
            const body = heatingWriteBody(operation, payload);
            if (this.hass?.callApi) {
                try {
                    return await this.hass.callApi(route[0], `sfml_stats/heating/${route[1]}`, body);
                } catch (error) {
                    throw heatingRequestError(error);
                }
            }
            const requestId = randomId();
            return new Promise((resolve, reject) => {
                const timer = this.hostWindow.setTimeout(() => {
                    this.pending.delete(requestId);
                    reject(new Error("timeout"));
                }, 15000);
                this.pending.set(requestId, { resolve, reject, timer });
                this.iframe.contentWindow.postMessage({
                    protocol: PROTOCOL, type: "REQUEST", nonce: this.nonce, requestId, operation, payload,
                }, this.origin);
            });
        }

        destroy() {
            this.destroyed = true;
            this.hostWindow.removeEventListener("message", this.onMessage);
            this.hostWindow.clearTimeout(this.readyTimer);
            if (!this.initialized) this.resolveReady();
            this.pending.forEach((pending) => {
                this.hostWindow.clearTimeout(pending.timer);
                pending.reject(new Error("closed"));
            });
            this.pending.clear();
            this.iframe?.remove();
            this.iframe = null;
        }
    }

    const ROOM_FIELDS = ["name", "climate_entities", "temp_sensor", "window_sensor", "comfort_temp_c", "setback_temp_c", "presence_enabled", "schedule_enabled", "presence_persons", "window_detect", "lift_enabled", "schedule", "auto_hvac"];
    const SETTINGS_FIELDS = ["base_temp_c", "frost_floor_c", "presence_entities", "away_delay_min", "outdoor_entity", "heating_limit_c", "vacation_start", "vacation_end", "lift_k", "lift_on_pv", "lift_on_cheap"];

    function heatingWriteBody(operation, payload) {
        if (operation === "setActive") return { active: payload.active === true };
        if (operation === "setBoost") return { temp_c: payload.temp_c, minutes: payload.minutes };
        if (operation === "status" || operation === "deleteRoom" || operation === "resume" || operation === "clearBoost") return undefined;
        const fields = operation === "saveSettings" ? SETTINGS_FIELDS : ROOM_FIELDS;
        const body = {};
        for (const key of fields) {
            if (Object.prototype.hasOwnProperty.call(payload, key)) body[key] = payload[key];
        }
        return body;
    }

    function heatingRequestError(error) {
        const source = error && typeof error === "object" ? error : {};
        const nested = source.body?.error || source.error;
        let code = "";
        if (nested && typeof nested === "object" && nested.code) code = String(nested.code);
        else if (typeof nested === "string" && nested && !nested.includes(" ")) code = nested;
        else if (typeof source.code === "string") code = source.code;
        const wrapped = new Error(String(nested?.message || source.message || code || "request_failed"));
        wrapped.code = (code || "request_failed").slice(0, 80);
        wrapped.body = source.body || (nested ? { error: nested } : {});
        wrapped.status = source.status || source.status_code;
        return wrapped;
    }

    const blankRoom = () => ({
        id: "",
        name: "",
        climate_entities: [],
        temp_sensor: "",
        window_sensor: "",
        comfort_temp_c: 21,
        setback_temp_c: "",
        presence_enabled: true,
        schedule_enabled: false,
        presence_persons: [],
        window_detect: false,
        lift_enabled: false,
        auto_hvac: true,
        schedule: [],
    });

    window.HeatingPage = {
        template: `
            <section class="heating-page" aria-labelledby="heating-title">
                <div ref="bridgeHost" class="heating-bridge-host" aria-hidden="true"></div>
                <h2 id="heating-title" class="visually-hidden">{{ text('heating.title') }}</h2>
                <nav class="heating-tabs" role="tablist" :aria-label="text('heating.tabsLabel')" @keydown="onTabKey">
                    <button v-for="tab in tabs" :id="'heating-tab-' + tab" :key="tab" type="button" role="tab"
                            :aria-selected="activeTab === tab ? 'true' : 'false'" :aria-controls="'heating-panel-' + tab"
                            :tabindex="activeTab === tab ? 0 : -1" :class="{ active: activeTab === tab }"
                            @click="activeTab = tab">{{ text('heating.tabs.' + tab) }}</button>
                </nav>
                <p v-if="message" class="heating-message" role="alert">{{ message }}</p>
                <div v-if="loading" class="heating-state" role="status">{{ text('heating.loading') }}</div>
                <div v-else-if="!status || status.licensed === false" class="heating-state" role="status">
                    <strong>{{ text('heating.premiumTitle') }}</strong>
                    <span>{{ text('heating.premiumText') }}</span>
                </div>
                <div v-else-if="status.feature_enabled === false" class="heating-state" role="status">
                    <strong>{{ text('heating.enableTitle') }}</strong>
                    <span>{{ text('heating.enableText') }}</span>
                </div>
                <div v-else :id="'heating-panel-' + activeTab" class="heating-panel" role="tabpanel" :aria-labelledby="'heating-tab-' + activeTab" tabindex="0">
                    <div v-if="activeTab === 'rooms'" class="heating-stack">
                        <div v-if="!rooms.length" class="heating-state">
                            <strong>{{ text('heating.emptyTitle') }}</strong>
                            <button type="button" class="primary" @click="openManageAdd">{{ text('heating.emptyAction') }}</button>
                        </div>
                        <header class="heating-hero-band">
                            <p class="heating-kicker">{{ text('heating.introKicker') }}</p>
                            <h3>{{ text('heating.introTitle') }}</h3>
                            <p class="heating-lead">{{ text('heating.introLead') }}</p>
                            <p>{{ text('heating.introBody') }}</p>
                            <p class="heating-close">{{ text('heating.introClose') }}</p>
                            <div class="heating-chips">
                                <span class="heating-pill">{{ keplerChip() }}</span>
                                <span class="heating-pill" :class="status.outdoor && status.outdoor.forecast_min_next_12h == null ? 'warn' : ''">{{ hubbleChip() }}</span>
                            </div>
                            <details class="heating-guide">
                                <summary>{{ text('heating.guide.title') }}</summary>
                                <section v-for="part in guideParts" :key="part">
                                    <h4>{{ text('heating.guide.' + part + 'Title') }}</h4>
                                    <p>{{ text('heating.guide.' + part) }}</p>
                                </section>
                            </details>
                            <details class="heating-guide">
                                <summary>{{ text('heating.advice.title') }}</summary>
                                <section v-for="part in adviceParts" :key="part">
                                    <h4>{{ text('heating.advice.' + part + 'Title') }}</h4>
                                    <p><strong>{{ text('heating.advice.does') }}</strong> {{ text('heating.advice.' + part + 'Does') }}</p>
                                    <p><strong>{{ text('heating.advice.recommend') }}</strong> {{ text('heating.advice.' + part + 'Recommend') }}</p>
                                </section>
                            </details>
                        </header>
                        <div v-if="status.outdoor" class="heating-kpis">
                            <article>
                                <span>{{ text('heating.outdoorNow') }}</span>
                                <strong>{{ formatTemp(status.outdoor.current_c) }}</strong>
                            </article>
                            <article>
                                <span>{{ text('heating.mean') }}</span>
                                <strong>{{ formatTemp(status.outdoor.mean_c) }}</strong>
                            </article>
                            <article>
                                <span>{{ text('heating.season') }}</span>
                                <strong><span class="heating-pill" :class="seasonTone(status.outdoor)">{{ seasonLabel(status.outdoor) }}</span></strong>
                                <span v-if="status.outdoor.reason === 'forecast_unavailable'">{{ text('heating.reasons.forecast_unavailable') }}</span>
                                <span v-if="status.outdoor.limit_c != null">{{ text('heating.seasonLimit', { temp: formatNumber(status.outdoor.limit_c) }) }}</span>
                            </article>
                        </div>
                        <div v-if="rooms.length" class="heating-grid">
                            <article v-for="room in rooms" :key="room.id" class="heating-card">
                                <header>
                                    <strong>{{ room.name }}</strong>
                                    <span class="heating-pill" :class="modePill(room).tone"><ui-icon :name="modePill(room).icon" :size="16"></ui-icon>{{ modePill(room).label }}</span>
                                </header>
                                <div class="heating-hero">
                                    <div class="heating-ring" :data-tone="ringOf(room).tone">
                                        <svg viewBox="0 0 120 120" aria-hidden="true">
                                            <path class="track" :d="ringPath(1)" fill="none" stroke-width="8" stroke-linecap="round"></path>
                                            <path class="value" :d="ringPath(ringOf(room).fraction)" fill="none" stroke-width="8" stroke-linecap="round"></path>
                                        </svg>
                                        <div class="heating-ring-label">
                                            <strong>{{ formatNumber(ringOf(room).actual) }}</strong>
                                            <small>{{ text('heating.targetLine', { temp: formatNumber(room.target_c) }) }}</small>
                                        </div>
                                    </div>
                                    <div>
                                        <p v-if="showReason(room.reason)" class="heating-reason" :class="reasonTone(room.reason)">{{ room.reason === 'preheat' ? text('heating.preheatFor', { time: formatTime(room.preheat_for) }) : reasonText(room.reason) }}</p>
                                        <ul class="heating-facts">
                                            <li v-if="room.boost_until">{{ text('heating.boostUntil', { temp: formatNumber(room.boost_temp_c, 1), time: formatTime(room.boost_until) }) }}</li>
                                            <li v-if="vacationActive() || room.reason === 'vacation'">{{ text('heating.vacationActive') }}</li>
                                            <li v-if="room.window_detected">{{ text('heating.windowDetected') }}</li>
                                            <li v-if="room.lift === 'pv_lift' || room.lift === 'price_lift'">{{ reasonText(room.lift) }}</li>
                                            <li v-if="room.presence">{{ text('heating.groupPresence', { state: presenceText(room.presence) }) }}</li>
                                        </ul>
                                        <p class="heating-kepler">{{ keplerLine(room) }}</p>
                                        <ul class="heating-facts">
                                            <li v-if="room.window_sensor"><ui-icon name="home" :size="16"></ui-icon>{{ room.window_open ? text('heating.windowOpen') : text('heating.windowClosed') }}</li>
                                            <li v-if="room.humidity_pct != null"><ui-icon name="weather" :size="16"></ui-icon>{{ text('heating.humidity') }} {{ formatNumber(room.humidity_pct, 0) }} %</li>
                                            <li>{{ text('heating.setbackEffective', { temp: formatNumber(effectiveSetback(room), 1) }) }}</li>
                                        </ul>
                                        <ul class="heating-people" v-if="status.persons && status.persons.length">
                                            <li v-for="person in status.persons" :key="person.entity_id" class="heating-person" :class="presenceKind(person.state)" :title="personTitle(person)" :aria-label="personTitle(person)">{{ initials(person.name, status.persons) }}<i></i></li>
                                        </ul>
                                    </div>
                                </div>
                                <ul class="heating-trvs">
                                    <li v-for="thermo in room.thermostats" :key="thermo.entity_id">
                                        <ui-icon name="heating" :size="16"></ui-icon>
                                        <span class="name">{{ displayName(thermo) }}</span>
                                        <span class="heating-thermo-side">
                                            <span class="heating-pill" :class="thermo.hvac_mode === 'heat' ? 'heat' : 'muted'">{{ hvacText(thermo.hvac_mode) }}</span>
                                            <span v-if="thermo.battery_pct != null" class="heating-battery" :class="{ low: thermo.battery_pct < 20 }">{{ batteryGlyph() }} {{ formatNumber(thermo.battery_pct, 0) }} %</span>
                                        </span>
                                        <div v-if="thermo.valve_pct != null" class="heating-valve" :style="{ '--valve': Math.max(0, Math.min(100, thermo.valve_pct)) + '%' }" :aria-label="text('heating.valve') + ' ' + formatNumber(thermo.valve_pct, 0) + ' %'"><span></span></div>
                                        <small v-if="activeOffset(thermo)">{{ text('heating.offsetLine', { delta: formatNumber(thermo.offset_k, 1) }) }}</small>
                                        <small v-if="showReason(thermo.reason) && thermo.reason !== room.reason">{{ reasonText(thermo.reason) }}</small>
                                    </li>
                                </ul>
                                <p v-if="lowBattery(room.sensor_battery_pct)" class="heating-battery-note low">{{ text('heating.sensorBattery') }} {{ formatNumber(room.sensor_battery_pct, 0) }} % · {{ text('heating.batterySoon') }}</p>
                                <p v-if="lowBattery(room.window_battery_pct)" class="heating-battery-note low">{{ text('heating.windowBattery') }} {{ formatNumber(room.window_battery_pct, 0) }} % · {{ text('heating.batterySoon') }}</p>
                                <div class="heating-spark" :aria-label="text('heating.history')">
                                    <svg v-if="sparkOf(room)" viewBox="0 0 240 56" role="img">
                                        <polyline class="target" :points="sparkOf(room).target"></polyline>
                                        <polyline class="actual" :points="sparkOf(room).actual"></polyline>
                                    </svg>
                                    <p v-else>{{ text('heating.historyEmpty') }}</p>
                                </div>
                                <p v-if="room.next_change" class="heating-next"><ui-icon name="calendar" :size="16"></ui-icon>{{ formatTime(room.next_change.at) }} → {{ formatNumber(room.next_change.target_c) }}°</p>
                                <div class="heating-actions">
                                    <button type="button" @click="toggleRoom(room)">{{ room.active ? text('heating.switchObserve') : text('heating.switchActive') }}</button>
                                    <button v-if="room.reason === 'manual_override'" type="button" @click="resumeRoom(room)">{{ text('heating.resume') }}</button>
                                    <template v-if="room.boost_until">
                                        <button type="button" @click="clearBoost(room)">{{ text('heating.boostStop') }}</button>
                                    </template>
                                    <template v-else>
                                        <label>{{ text('heating.boostTemp') }}<input v-model.number="boostDraft(room).temp_c" type="number" min="5" max="30" step="0.5"></label>
                                        <label>{{ text('heating.boostMinutes') }}
                                            <select v-model.number="boostDraft(room).minutes">
                                                <option v-for="minutes in boostChoices" :key="minutes" :value="minutes">{{ text('heating.boost' + minutes) }}</option>
                                            </select>
                                        </label>
                                        <button type="button" @click="startBoost(room)">{{ text('heating.boostStart') }}</button>
                                    </template>
                                </div>
                            </article>
                        </div>
                    </div>
                    <div v-else-if="activeTab === 'manage'" class="heating-stack">
                        <header class="heating-manage-head">
                            <h3>{{ text('heating.tabs.manage') }}</h3>
                            <button type="button" class="primary" @click="beginAdd">{{ text('heating.addRoom') }}</button>
                        </header>
                        <div v-if="!rooms.length && !editorOpen" class="heating-empty">
                            <p>{{ text('heating.emptyTitle') }}</p>
                            <button type="button" class="primary" @click="beginAdd">{{ text('heating.addRoom') }}</button>
                        </div>
                        <div v-if="rooms.length" class="heating-grid">
                            <article v-for="room in rooms" :key="room.id" class="heating-room-card">
                                <header>
                                    <strong>{{ room.name }}</strong>
                                    <span>{{ formatTemp(room.comfort_temp_c) }}</span>
                                    <span>{{ text('heating.setbackEffective', { temp: formatNumber(effectiveSetback(room), 1) }) }}</span>
                                </header>
                                <span class="heating-pill">{{ roomModeChip(room) }}</span>
                                <div class="heating-name-chips">
                                    <span v-for="id in room.climate_entities" :key="'c-' + id" class="heating-name-chip" :title="id"><span class="visually-hidden">{{ text('heating.thermostats') }} </span>{{ labelOf(id) }}</span>
                                    <span v-if="room.temp_sensor" class="heating-name-chip" :title="room.temp_sensor"><span class="visually-hidden">{{ text('heating.sensor') }} </span>{{ labelOf(room.temp_sensor) }}</span>
                                    <span v-if="room.window_sensor" class="heating-name-chip" :title="room.window_sensor"><span class="visually-hidden">{{ text('heating.window') }} </span>{{ labelOf(room.window_sensor) }}</span>
                                </div>
                                <div class="heating-card-actions">
                                    <button type="button" @click="beginEdit(room)">{{ text('heating.edit') }}</button>
                                    <button type="button" class="heating-danger" @click="askDelete(room)">{{ text('heating.delete') }}</button>
                                </div>
                            </article>
                        </div>
                        <div v-if="pendingDelete" class="heating-confirm" role="alertdialog" aria-modal="true" aria-labelledby="heating-delete-title">
                            <strong id="heating-delete-title">{{ text('heating.deleteConfirm', { name: pendingDelete.name }) }}</strong>
                            <div class="heating-form-actions">
                                <button type="button" @click="pendingDelete = null">{{ text('heating.cancel') }}</button>
                                <button type="button" class="heating-danger-solid" @click="confirmDelete">{{ text('heating.delete') }}</button>
                            </div>
                        </div>
                        <form v-if="editorOpen" class="heating-editor" @submit.prevent="saveRoom">
                            <h3>{{ editorTitle }}</h3>
                            <section class="heating-section">
                                <h4>{{ uiPhrase('sectionRoom') }}</h4>
                                <div class="heating-fields">
                                    <label>{{ text('heating.roomName') }}<input v-model="draft.name" type="text" required maxlength="80"></label>
                                    <label>{{ text('heating.comfort') }}<input v-model.number="draft.comfort_temp_c" type="number" min="5" max="30" step="0.5" required></label>
                                    <label>{{ text('heating.setback') }}<input v-model="draft.setback_temp_c" type="number" min="5" max="30" step="0.5" :placeholder="text('heating.setbackPlaceholder', { temp: formatNumber(settings.base_temp_c, 1) })"></label>
                                </div>
                                <label class="heating-switch">
                                    <input type="checkbox" role="switch" v-model="draft.schedule_enabled" :aria-checked="draft.schedule_enabled ? 'true' : 'false'">
                                    <span class="heating-switch-track" aria-hidden="true"><span></span></span>
                                    <span class="heating-switch-copy"><strong>{{ text('heating.useSchedule') }}</strong></span>
                                </label>
                                <label class="heating-switch">
                                    <input type="checkbox" role="switch" v-model="draft.presence_enabled" :aria-checked="draft.presence_enabled ? 'true' : 'false'">
                                    <span class="heating-switch-track" aria-hidden="true"><span></span></span>
                                    <span class="heating-switch-copy"><strong>{{ text('heating.usePresence') }}</strong></span>
                                </label>
                                <div v-if="draft.presence_enabled" class="heating-section">
                                    <h4>{{ text('heating.presencePersons') }}</h4>
                                    <p>{{ text('heating.presencePersonsHint') }}</p>
                                    <div class="heating-tiles" role="group" :aria-label="text('heating.presencePersons')">
                                        <label v-for="entity in persons" :key="'room-' + entity.id" class="heating-tile" :class="{ on: draft.presence_persons.includes(entity.id) }">
                                            <input type="checkbox" :value="entity.id" v-model="draft.presence_persons">
                                            <span class="heating-tile-mark" aria-hidden="true"></span>
                                            <span class="heating-tile-name" :title="entity.id">{{ entity.name }}</span>
                                        </label>
                                    </div>
                                </div>
                                <label class="heating-switch">
                                    <input type="checkbox" role="switch" v-model="draft.window_detect" :aria-checked="draft.window_detect ? 'true' : 'false'">
                                    <span class="heating-switch-track" aria-hidden="true"><span></span></span>
                                    <span class="heating-switch-copy"><strong>{{ text('heating.windowDetect') }}</strong><small>{{ text('heating.windowDetectHelp') }}</small></span>
                                </label>
                                <label class="heating-switch">
                                    <input type="checkbox" role="switch" v-model="draft.lift_enabled" :aria-checked="draft.lift_enabled ? 'true' : 'false'">
                                    <span class="heating-switch-track" aria-hidden="true"><span></span></span>
                                    <span class="heating-switch-copy"><strong>{{ text('heating.liftRoom') }}</strong><small>{{ text('heating.liftRoomHelp') }}</small></span>
                                </label>
                            </section>
                            <section class="heating-section">
                                <h4>{{ uiPhrase('sectionDevices') }}</h4>
                                <label class="heating-search">{{ text('heating.search') }}
                                    <input v-model="climateQuery" type="search" :placeholder="text('heating.search')" :aria-label="text('heating.search')">
                                </label>
                                <div class="heating-tiles" role="group" :aria-label="text('heating.thermostats')">
                                    <label v-for="entity in visibleClimates" :key="entity.id" class="heating-tile" :class="{ on: draft.climate_entities.includes(entity.id) }">
                                        <input type="checkbox" :value="entity.id" v-model="draft.climate_entities">
                                        <span class="heating-tile-mark" aria-hidden="true"></span>
                                        <span class="heating-tile-name" :title="entity.id">{{ entity.name }}</span>
                                    </label>
                                </div>
                                <div class="heating-fields">
                                    <label>{{ text('heating.sensor') }}
                                        <select v-model="draft.temp_sensor"><option value="">{{ text('heating.none') }}</option><option v-for="entity in sensors" :key="entity.id" :value="entity.id" :title="entity.id">{{ entity.name }}</option></select>
                                    </label>
                                    <label>{{ text('heating.window') }}
                                        <select v-model="draft.window_sensor"><option value="">{{ text('heating.none') }}</option><option v-for="entity in windows" :key="entity.id" :value="entity.id" :title="entity.id">{{ entity.name }}</option></select>
                                    </label>
                                </div>
                            </section>
                            <section class="heating-section">
                                <h4>{{ text('heating.modeSchedule') }}</h4>
                                <label class="heating-switch">
                                    <input type="checkbox" role="switch" v-model="draft.auto_hvac" :aria-checked="draft.auto_hvac ? 'true' : 'false'">
                                    <span class="heating-switch-track" aria-hidden="true"><span></span></span>
                                    <span class="heating-switch-copy">
                                        <strong>{{ text('heating.autoHvac') }}</strong>
                                        <small>{{ uiPhrase('autoHvacHelp') }}</small>
                                    </span>
                                </label>
                                <div v-for="(window, index) in draft.schedule" :key="index" class="heating-window">
                                    <div class="heating-days" role="group" :aria-label="text('heating.schedule')">
                                        <button v-for="day in weekdays" :key="day" type="button" :class="{ on: window.days.includes(day) }" :aria-pressed="window.days.includes(day) ? 'true' : 'false'" @click="toggleDay(window, day)">{{ text('heating.day' + day) }}</button>
                                    </div>
                                    <div class="heating-fields">
                                        <label>{{ text('heating.start') }}<input v-model="window.start" type="time" required></label>
                                        <label>{{ text('heating.end') }}<input v-model="window.end" type="time" required></label>
                                        <label>{{ text('heating.windowTemp') }}<input v-model="window.temp_c" type="number" min="5" max="30" step="0.5" :placeholder="text('heating.windowTempPlaceholder')"></label>
                                    </div>
                                    <div class="heating-form-actions">
                                        <button type="button" class="heating-danger" @click="draft.schedule.splice(index, 1)">{{ text('heating.removeWindow') }}</button>
                                    </div>
                                </div>
                                <button type="button" @click="addWindow" :disabled="draft.schedule.length >= 12">{{ text('heating.addWindow') }}</button>
                                <div class="heating-week" :aria-label="text('heating.weekBand')">
                                    <strong>{{ text('heating.weekBand') }}</strong>
                                    <div v-for="row in weekBand" :key="row.day" class="heating-week-row">
                                        <span>{{ text('heating.day' + row.day) }}</span>
                                        <div class="heating-week-track">
                                            <i v-for="(bar, index) in row.bars" :key="index" :style="{ left: (bar.left * 100) + '%', width: (bar.width * 100) + '%' }"></i>
                                        </div>
                                    </div>
                                    <div class="heating-week-axis"><span>0</span><span>24</span></div>
                                    <p>{{ text('heating.setbackEffective', { temp: formatNumber(effectiveSetback(draft), 1) }) }}</p>
                                </div>
                            </section>
                            <div class="heating-form-actions">
                                <button type="button" @click="cancelEditor">{{ text('heating.cancel') }}</button>
                                <button type="submit" class="primary">{{ text('heating.save') }}</button>
                            </div>
                        </form>
                    </div>
                    <form v-else class="heating-stack" @submit.prevent="saveSettings">
                        <header class="heating-manage-head">
                            <h3>{{ text('heating.tabs.settings') }}</h3>
                        </header>
                        <div class="heating-editor">
                            <div class="heating-fields">
                                <label>{{ text('heating.baseTemp') }}<small>{{ text('heating.baseTempHelp') }}</small><input v-model.number="settings.base_temp_c" type="number" min="5" max="30" step="0.5" required></label>
                                <label>{{ text('heating.frost') }}<input v-model.number="settings.frost_floor_c" type="number" min="5" max="12" step="0.5" required></label>
                            </div>
                            <section class="heating-section">
                                <h4>{{ text('heating.persons') }}</h4>
                                <div class="heating-tiles" role="group" :aria-label="text('heating.persons')">
                                    <label v-for="entity in persons" :key="entity.id" class="heating-tile" :class="{ on: settings.presence_entities.includes(entity.id) }">
                                        <input type="checkbox" :value="entity.id" v-model="settings.presence_entities">
                                        <span class="heating-tile-mark" aria-hidden="true"></span>
                                        <span class="heating-tile-name" :title="entity.id">{{ entity.name }}</span>
                                    </label>
                                </div>
                            </section>
                            <div class="heating-fields">
                                <label>{{ text('heating.delay') }}<input v-model.number="settings.away_delay_min" type="number" min="0" max="240" step="1" required></label>
                                <label>{{ text('heating.outdoor') }}
                                    <select v-model="settings.outdoor_entity"><option value="">{{ text('heating.none') }}</option><option v-for="entity in outdoors" :key="entity.id" :value="entity.id" :title="entity.id">{{ entity.name }}</option></select>
                                </label>
                                <label>{{ text('heating.heatingLimit') }}<input v-model.number="settings.heating_limit_c" type="number" min="5" max="25" step="0.5" required></label>
                            </div>
                            <section class="heating-section">
                                <h4>{{ text('heating.vacation') }}</h4>
                                <div class="heating-fields">
                                    <label>{{ text('heating.vacationStart') }}<input v-model="settings.vacation_start" type="datetime-local"></label>
                                    <label>{{ text('heating.vacationEnd') }}<input v-model="settings.vacation_end" type="datetime-local"></label>
                                </div>
                                <button type="button" @click="clearVacation">{{ text('heating.vacationClear') }}</button>
                            </section>
                            <section class="heating-section">
                                <h4>{{ text('heating.liftTitle') }}</h4>
                                <div class="heating-fields">
                                    <label>{{ text('heating.liftK') }}<input v-model.number="settings.lift_k" type="number" min="0.5" max="2" step="0.5" required></label>
                                </div>
                                <label class="heating-switch">
                                    <input type="checkbox" role="switch" v-model="settings.lift_on_pv" :aria-checked="settings.lift_on_pv ? 'true' : 'false'">
                                    <span class="heating-switch-track" aria-hidden="true"><span></span></span>
                                    <span class="heating-switch-copy"><strong>{{ text('heating.liftPv') }}</strong></span>
                                </label>
                                <label class="heating-switch">
                                    <input type="checkbox" role="switch" v-model="settings.lift_on_cheap" :aria-checked="settings.lift_on_cheap ? 'true' : 'false'">
                                    <span class="heating-switch-track" aria-hidden="true"><span></span></span>
                                    <span class="heating-switch-copy"><strong>{{ text('heating.liftCheap') }}</strong></span>
                                </label>
                            </section>
                            <div class="heating-form-actions">
                                <button type="submit" class="primary">{{ text('heating.save') }}</button>
                            </div>
                        </div>
                    </form>
                </div>
                <modern-page-guide page="heating"></modern-page-guide>
            </section>
        `,
        setup() {
            const loading = Vue.ref(true);
            const message = Vue.ref("");
            const status = Vue.ref(null);
            const activeTab = Vue.ref("rooms");
            const draft = Vue.reactive(blankRoom());
            const settings = Vue.reactive({
                base_temp_c: 17, frost_floor_c: 7, presence_entities: [], away_delay_min: 15,
                outdoor_entity: "", heating_limit_c: 15, vacation_start: "", vacation_end: "",
                lift_k: 1, lift_on_pv: false, lift_on_cheap: false,
            });
            const boostDrafts = Vue.reactive({});
            const guideParts = ["watching", "temps", "schedule", "presence", "order", "boost", "vacation", "window", "lift", "season", "preheat", "manual"];
            const adviceParts = ["watching", "comfort", "setback", "frost", "schedule", "presence", "delay", "boost", "vacation", "window", "lift", "limit"];
            const boostChoices = BOOST_MINUTES;
            const pendingDelete = Vue.ref(null);
            const editorOpen = Vue.ref(false);
            const climateQuery = Vue.ref("");
            const bridgeHost = Vue.ref(null);
            const hassTick = Vue.ref(0);
            const tabs = ["rooms", "manage", "settings"];
            let bridge = null;
            let timer = null;

            const rooms = Vue.computed(() => status.value?.rooms || []);
            const editorTitle = Vue.computed(() => (draft.id ? uiPhrase("editRoom") : text("heating.addRoom")));
            const entities = Vue.computed(() => {
                hassTick.value;
                const states = parentHass(window)?.states || {};
                return Object.values(states);
            });
            function namedEntities(list) {
                return list.map((item) => ({
                    id: item.entity_id,
                    name: String(item.attributes?.friendly_name || item.entity_id),
                })).sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }) || left.id.localeCompare(right.id));
            }
            const climates = Vue.computed(() => namedEntities(entities.value.filter((item) => String(item.entity_id).startsWith("climate."))));
            const visibleClimates = Vue.computed(() => {
                const query = climateQuery.value.trim().toLowerCase();
                if (!query) return climates.value;
                return climates.value.filter((item) => item.name.toLowerCase().includes(query) || item.id.toLowerCase().includes(query));
            });
            const sensors = Vue.computed(() => namedEntities(entities.value.filter((item) => String(item.entity_id).startsWith("sensor.") && item.attributes?.device_class === "temperature")));
            const windows = Vue.computed(() => namedEntities(entities.value.filter((item) => String(item.entity_id).startsWith("binary_sensor."))));
            const persons = Vue.computed(() => namedEntities(entities.value.filter((item) => String(item.entity_id).startsWith("person."))));
            const outdoors = Vue.computed(() => namedEntities(entities.value.filter((item) => {
                const id = String(item.entity_id);
                if (id.startsWith("weather.")) return true;
                return id.startsWith("sensor.") && (item.attributes?.unit_of_measurement === "°C" || item.attributes?.device_class === "temperature");
            })));

            function unwrap(payload) {
                if (payload && payload.success === true && payload.data) return payload.data;
                return payload || {};
            }

            function applyStatus(payload) {
                const body = unwrap(payload);
                status.value = body;
                if (body.settings) {
                    settings.base_temp_c = body.settings.base_temp_c;
                    settings.frost_floor_c = body.settings.frost_floor_c;
                    settings.presence_entities = [...(body.settings.presence_entities || [])];
                    settings.away_delay_min = body.settings.away_delay_min;
                    settings.outdoor_entity = body.settings.outdoor_entity || "";
                    settings.heating_limit_c = body.settings.heating_limit_c ?? 15;
                    settings.vacation_start = body.settings.vacation_start || "";
                    settings.vacation_end = body.settings.vacation_end || "";
                    settings.lift_k = body.settings.lift_k ?? 1;
                    settings.lift_on_pv = body.settings.lift_on_pv === true;
                    settings.lift_on_cheap = body.settings.lift_on_cheap === true;
                }
            }

            async function refresh() {
                try {
                    applyStatus(await bridge.request("status"));
                    message.value = "";
                } catch (error) {
                    message.value = text("heating.loadFailed");
                } finally {
                    loading.value = false;
                    hassTick.value += 1;
                }
            }

            function roomPayload() {
                return {
                    name: draft.name.trim(),
                    climate_entities: [...draft.climate_entities],
                    temp_sensor: draft.temp_sensor || null,
                    window_sensor: draft.window_sensor || null,
                    comfort_temp_c: draft.comfort_temp_c,
                    setback_temp_c: setbackValue(draft.setback_temp_c),
                    presence_enabled: draft.presence_enabled === true,
                    schedule_enabled: draft.schedule_enabled === true,
                    presence_persons: [...(draft.presence_persons || [])],
                    window_detect: draft.window_detect === true,
                    lift_enabled: draft.lift_enabled === true,
                    auto_hvac: draft.auto_hvac !== false,
                    schedule: (draft.schedule || []).map((window) => ({
                        days: [...window.days].sort((left, right) => left - right),
                        start: String(window.start || "").slice(0, 5),
                        end: String(window.end || "").slice(0, 5),
                        temp_c: setbackValue(window.temp_c),
                    })),
                };
            }

            function failureText(error) {
                const code = String(error?.code || error?.body?.error?.code || "request_failed");
                const known = text(`heating.errors.${code}`);
                if (known !== `heating.errors.${code}`) return known;
                return text("heating.saveFailedCode", { code });
            }

            function labelOf(entityId) {
                if (!entityId) return text("heating.none");
                const state = parentHass(window)?.states?.[entityId];
                return String(state?.attributes?.friendly_name || entityId);
            }

            function entityLabels(ids) {
                return (ids || []).map((entityId) => labelOf(entityId)).join(", ") || text("heating.none");
            }

            function displayName(item) {
                if (!item) return text("heating.none");
                if (item.name) return item.name;
                return labelOf(item.entity_id);
            }

            function setbackValue(value) {
                if (value == null || value === "") return null;
                const number = Number(value);
                return Number.isFinite(number) ? number : null;
            }

            function effectiveSetback(room) {
                const own = setbackValue(room && room.setback_temp_c);
                return own == null ? settings.base_temp_c : own;
            }

            function roomModeChip(room) {
                if (room.mode === "schedule") return text("heating.modeScheduleShort");
                if (room.mode === "combined") return text("heating.modeCombinedShort");
                if (room.mode === "fixed") return text("heating.modeFixedShort");
                return text("heating.modeAutoShort");
            }

            function editRoom(room) {
                pendingDelete.value = null;
                const next = room ? {
                    id: room.id,
                    name: room.name,
                    climate_entities: [...(room.climate_entities || [])],
                    temp_sensor: room.temp_sensor || "",
                    window_sensor: room.window_sensor || "",
                    comfort_temp_c: room.comfort_temp_c,
                    setback_temp_c: room.setback_temp_c == null ? "" : room.setback_temp_c,
                    presence_enabled: room.presence_enabled !== false && room.mode !== "schedule" && room.mode !== "fixed",
                    schedule_enabled: room.schedule_enabled === true || room.mode === "schedule" || room.mode === "combined",
                    presence_persons: [...(room.presence_persons || [])],
                    window_detect: room.window_detect === true,
                    lift_enabled: room.lift_enabled === true,
                    auto_hvac: room.auto_hvac !== false,
                    schedule: (room.schedule || []).map((window) => ({
                        days: [...(window.days || [])],
                        start: window.start,
                        end: window.end,
                        temp_c: window.temp_c == null ? "" : window.temp_c,
                    })),
                } : blankRoom();
                Object.assign(draft, next);
            }

            function beginAdd() {
                pendingDelete.value = null;
                editRoom(null);
                editorOpen.value = true;
            }

            function beginEdit(room) {
                pendingDelete.value = null;
                editRoom(room);
                editorOpen.value = true;
            }

            function cancelEditor() {
                editorOpen.value = false;
                editRoom(null);
            }

            function openManageAdd() {
                activeTab.value = "manage";
                beginAdd();
            }

            async function saveRoom() {
                try {
                    const fields = roomPayload();
                    if (draft.id) await bridge.request("updateRoom", { id: draft.id, ...fields });
                    else await bridge.request("addRoom", fields);
                    editorOpen.value = false;
                    editRoom(null);
                    await refresh();
                } catch (error) {
                    message.value = failureText(error);
                }
            }

            function askDelete(room) { pendingDelete.value = room; }

            async function confirmDelete() {
                if (!pendingDelete.value) return;
                try {
                    await bridge.request("deleteRoom", { id: pendingDelete.value.id });
                    pendingDelete.value = null;
                    await refresh();
                } catch (error) {
                    message.value = failureText(error);
                }
            }

            async function saveSettings() {
                try {
                    applyStatus(await bridge.request("saveSettings", {
                        base_temp_c: settings.base_temp_c,
                        frost_floor_c: settings.frost_floor_c,
                        presence_entities: [...settings.presence_entities],
                        away_delay_min: settings.away_delay_min,
                        outdoor_entity: settings.outdoor_entity || null,
                        heating_limit_c: settings.heating_limit_c,
                        vacation_start: settings.vacation_start || null,
                        vacation_end: settings.vacation_end || null,
                        lift_k: settings.lift_k,
                        lift_on_pv: settings.lift_on_pv === true,
                        lift_on_cheap: settings.lift_on_cheap === true,
                    }));
                } catch (error) {
                    message.value = failureText(error);
                }
            }

            async function toggleRoom(room) {
                try {
                    await bridge.request("setActive", { id: room.id, active: !room.active });
                    await refresh();
                } catch (error) {
                    message.value = failureText(error);
                }
            }

            async function resumeRoom(room) {
                try {
                    await bridge.request("resume", { id: room.id });
                    await refresh();
                } catch (error) {
                    message.value = failureText(error);
                }
            }

            function boostDraft(room) {
                if (!boostDrafts[room.id]) {
                    boostDrafts[room.id] = { temp_c: Number(room.comfort_temp_c) || 21, minutes: 60 };
                }
                return boostDrafts[room.id];
            }

            async function startBoost(room) {
                const draftBoost = boostDraft(room);
                try {
                    await bridge.request("setBoost", {
                        id: room.id,
                        temp_c: Number(draftBoost.temp_c),
                        minutes: Number(draftBoost.minutes),
                    });
                    await refresh();
                } catch (error) {
                    message.value = failureText(error);
                }
            }

            async function clearBoost(room) {
                try {
                    await bridge.request("clearBoost", { id: room.id });
                    await refresh();
                } catch (error) {
                    message.value = failureText(error);
                }
            }

            function clearVacation() {
                settings.vacation_start = "";
                settings.vacation_end = "";
            }

            function vacationActive() {
                const start = Date.parse(settings.vacation_start);
                const end = Date.parse(settings.vacation_end);
                const now = Date.now();
                return Number.isFinite(start) && Number.isFinite(end) && now >= start && now < end;
            }

            function actualOf(room) {
                if (Number.isFinite(Number(room.temp_sensor_c))) return Number(room.temp_sensor_c);
                const entity = room.climate_entities?.[0];
                const state = parentHass(window)?.states?.[entity];
                const current = Number(state?.attributes?.current_temperature);
                return Number.isFinite(current) ? current : null;
            }

            function setpointOf(room) {
                const value = room.thermostats?.[0]?.setpoint_c;
                return Number.isFinite(Number(value)) ? Number(value) : null;
            }

            function lastWriteOf(room) {
                return room.thermostats?.map((item) => item.last_write).find(Boolean) || null;
            }

            function uiLocale() {
                const lang = window.SFMLI18n?.current || "de";
                return lang === "en" || lang === "pl" ? lang : "de";
            }

            function formatNumber(value, digits = 1) {
                if (!Number.isFinite(Number(value))) return text("heating.none");
                return new Intl.NumberFormat(uiLocale(), {
                    minimumFractionDigits: digits,
                    maximumFractionDigits: digits,
                }).format(Number(value));
            }

            function formatTemp(value) {
                if (!Number.isFinite(Number(value))) return text("heating.none");
                return `${formatNumber(value, 1)} °C`;
            }

            function formatTime(value) {
                if (!value) return text("heating.none");
                const date = new Date(value);
                if (Number.isNaN(date.getTime())) return text("heating.none");
                return new Intl.DateTimeFormat(window.SFMLI18n?.current || "de", {
                    hour: "2-digit", minute: "2-digit",
                }).format(date);
            }

            function reasonText(code) {
                if (REASONS.includes(code)) return text(`heating.reasons.${code}`);
                return text("heating.reasons.unknown");
            }

            function addWindow() {
                if (draft.schedule.length >= 12) return;
                draft.schedule.push({ days: [0, 1, 2, 3, 4], start: "06:00", end: "22:00" });
            }

            function toggleDay(window, day) {
                const days = window.days.includes(day)
                    ? window.days.filter((item) => item !== day)
                    : [...window.days, day];
                window.days = days.sort((left, right) => left - right);
            }

            function seasonText(outdoor) {
                if (!outdoor || outdoor.reason) return reasonText(outdoor?.reason || "outdoor_missing");
                return outdoor.season ? text("heating.seasonOn") : text("heating.seasonOff");
            }

            function hvacText(mode) {
                const key = `heating.hvac.${mode || "unknown"}`;
                const known = text(key);
                return known === key ? (mode || text("heating.none")) : known;
            }

            function presenceText(state) {
                if (state === "home") return text("heating.personHome");
                if (state === "unknown" || state === "unavailable" || !state) return text("heating.personUnclear");
                return text("heating.personAway");
            }

            function presenceKind(state) {
                if (state === "home") return "home";
                if (!state || state === "unknown" || state === "unavailable") return "unclear";
                return "away";
            }

            function firstName(name) {
                return String(name || "").trim().split(/\s+/).filter(Boolean)[0] || "?";
            }

            function initials(name, people) {
                const first = firstName(name);
                const others = (people || []).filter((person) => person.name !== name).map((person) => firstName(person.name));
                let count = Math.min(2, first.length);
                while (count < first.length && others.some((item) => item.slice(0, count).toUpperCase() === first.slice(0, count).toUpperCase())) {
                    count += 1;
                }
                return first.slice(0, Math.max(2, count)).toUpperCase();
            }

            function personTitle(person) {
                return `${firstName(person.name)} · ${presenceText(person.state)}`;
            }

            function showReason(code) {
                return Boolean(code) && !HIDDEN_REASONS.includes(code);
            }

            function seasonLabel(outdoor) {
                if (!outdoor || outdoor.season == null) return text("heating.seasonUnknown");
                return outdoor.season ? text("heating.seasonOnShort") : text("heating.seasonOffShort");
            }

            function keplerChip() {
                const list = status.value?.rooms || [];
                const models = list.map((room) => room.model).filter(Boolean);
                if (models.length && models.every((model) => model.status === "ready")) {
                    return text("heating.keplerReady", { count: list.length });
                }
                const model = models.find((item) => item.status !== "ready") || { heat_phases: 0, cool_phases: 0 };
                return text("heating.keplerLearning", { heat: model.heat_phases || 0, cool: model.cool_phases || 0 });
            }

            function hubbleChip() {
                const outdoor = status.value?.outdoor;
                if (!outdoor || outdoor.forecast_min_next_12h == null) return text("heating.hubbleMissing");
                return text("heating.hubbleMin", { temp: formatNumber(outdoor.forecast_min_next_12h, 0) });
            }

            function keplerLine(room) {
                const model = room.model;
                if (!model || model.status !== "ready" || model.rate_k_per_h == null || model.tau_h == null) {
                    return text("heating.keplerRoomLearning", {
                        heat: model?.heat_phases || 0,
                        cool: model?.cool_phases || 0,
                    });
                }
                return text("heating.keplerRoomReady", {
                    rate: formatNumber(model.rate_k_per_h, 1),
                    hours: formatNumber(model.tau_h, 0),
                });
            }

            function seasonTone(outdoor) {
                if (!outdoor || outdoor.reason || outdoor.season == null) return "warn";
                return outdoor.season ? "" : "muted";
            }

            function modePill(room) {
                if (!room.active) return { icon: "monitor", label: text("heating.modeObserve"), tone: "muted" };
                if (room.reason === "manual_override") return { icon: "pause", label: text("heating.modePause"), tone: "bad" };
                if (room.reason === "awaiting_device" || room.reason === "device_not_responding") {
                    return { icon: "refresh", label: text("heating.modeAwaiting"), tone: "warn" };
                }
                if (room.mode === "schedule") return { icon: "calendar", label: text("heating.modeScheduleShort"), tone: "" };
                if (room.mode === "combined") return { icon: "target", label: text("heating.modeCombinedShort"), tone: "" };
                if (room.mode === "fixed") return { icon: "heating", label: text("heating.modeFixedShort"), tone: "" };
                return { icon: "heating", label: text("heating.modeAutoShort"), tone: "" };
            }

            function reasonTone(code) {
                if (["comfort", "same_value", "within_band", "presence_home", "boost", "pv_lift", "price_lift"].includes(code)) return "ok";
                if (["manual_override", "write_failed", "thermostat_unavailable", "device_not_responding", "locked", "disabled"].includes(code)) return "bad";
                return "warn";
            }

            function roomActual(room) {
                if (Number.isFinite(Number(room.temp_sensor_c))) return Number(room.temp_sensor_c);
                const values = (room.thermostats || []).map((item) => Number(item.current_c)).filter(Number.isFinite);
                if (!values.length) return null;
                return values.reduce((sum, value) => sum + value, 0) / values.length;
            }

            function ringOf(room) {
                const actual = roomActual(room);
                const target = Number(room.target_c);
                const hasTarget = Number.isFinite(target);
                const low = hasTarget ? target - 5 : (actual ?? 0) - 5;
                const high = low + 10;
                const fraction = actual == null ? 0 : Math.min(1, Math.max(0, (actual - low) / (high - low)));
                let tone = "muted";
                if (actual != null && hasTarget) {
                    if (Math.abs(actual - target) <= 0.5) tone = "ok";
                    else tone = actual < target ? "cool" : "warm";
                }
                return { actual, fraction, tone };
            }

            function ringPath(fraction) {
                const start = 135;
                const sweep = 270 * Math.max(0.001, Math.min(1, Number(fraction) || 0));
                const point = (deg) => {
                    const rad = deg * Math.PI / 180;
                    return [60 + 46 * Math.cos(rad), 60 + 46 * Math.sin(rad)];
                };
                const [x1, y1] = point(start);
                const [x2, y2] = point(start + sweep);
                const large = sweep > 180 ? 1 : 0;
                return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A 46 46 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
            }

            function sparkOf(room) {
                const points = (room.history || []).filter((item) => Number.isFinite(Number(item.actual_c)) || Number.isFinite(Number(item.target_c)));
                if (points.length < 2) return null;
                const times = points.map((item) => new Date(item.at).getTime());
                const t0 = Math.min(...times);
                const span = Math.max(1, Math.max(...times) - t0);
                const values = points.flatMap((item) => [item.actual_c, item.target_c]).map(Number).filter(Number.isFinite);
                let min = Math.min(...values);
                let max = Math.max(...values);
                if (max - min < 0.5) { min -= 0.5; max += 0.5; }
                const x = (stamp) => 4 + ((stamp - t0) / span) * 232;
                const y = (value) => 4 + (1 - (value - min) / (max - min)) * 48;
                const line = (key) => points
                    .filter((item) => Number.isFinite(Number(item[key])))
                    .map((item) => `${x(new Date(item.at).getTime()).toFixed(1)},${y(Number(item[key])).toFixed(1)}`)
                    .join(" ");
                return { actual: line("actual_c"), target: line("target_c") };
            }

            function clockMinutes(value) {
                const match = /^(\d{2}):(\d{2})$/.exec(value || "");
                if (!match) return null;
                return Number(match[1]) * 60 + Number(match[2]);
            }

            const weekBand = Vue.computed(() => WEEKDAYS.map((day) => ({ day, bars: [] })).map((row, _index, rows) => {
                draft.schedule.forEach((window) => {
                    const start = clockMinutes(window.start);
                    const end = clockMinutes(window.end);
                    if (start == null || end == null || !(window.days || []).includes(row.day)) return;
                    if (end > start) row.bars.push({ left: start / 1440, width: (end - start) / 1440 });
                    else if (end < start) {
                        row.bars.push({ left: start / 1440, width: (1440 - start) / 1440 });
                        rows[(row.day + 1) % 7].bars.push({ left: 0, width: end / 1440 });
                    } else row.bars.push({ left: 0, width: 1 });
                });
                return row;
            }));

            function activeOffset(thermo) {
                const value = Number(thermo && thermo.offset_k);
                return Number.isFinite(value) && Math.abs(value) >= 0.05;
            }

            function lowBattery(value) {
                if (value == null || value === "" || typeof value === "boolean") return false;
                const number = Number(value);
                return Number.isFinite(number) && number < 20;
            }

            function batteryGlyph() {
                return "▮";
            }

            function onTabKey(event) {
                const index = tabs.indexOf(activeTab.value);
                if (event.key === "ArrowRight") activeTab.value = tabs[(index + 1) % tabs.length];
                if (event.key === "ArrowLeft") activeTab.value = tabs[(index + 1 + tabs.length - 2) % tabs.length];
            }

            Vue.onMounted(() => {
                bridge = new HeatingBridgeClient(window);
                bridge.mount(bridgeHost.value);
                refresh();
                timer = window.setInterval(refresh, 30000);
            });
            Vue.onUnmounted(() => {
                window.clearInterval(timer);
                bridge?.destroy();
            });

            return {
                text, tabs, activeTab, loading, message, status, rooms, draft, settings, guideParts, adviceParts, boostChoices,
                climates, visibleClimates, climateQuery, sensors, windows, persons, outdoors, weekdays: WEEKDAYS, pendingDelete, editorOpen, editorTitle, bridgeHost,
                labelOf, entityLabels, displayName, uiPhrase, roomModeChip,
                editRoom, beginAdd, beginEdit, cancelEditor, openManageAdd, saveRoom, askDelete, confirmDelete, saveSettings, toggleRoom, resumeRoom,
                boostDraft, startBoost, clearBoost, clearVacation, vacationActive,
                actualOf, setpointOf, lastWriteOf, formatTemp, formatNumber, formatTime, reasonText, onTabKey,
                addWindow, toggleDay, seasonText, seasonTone, hvacText, presenceText, presenceKind,
                initials, personTitle, modePill, reasonTone, ringOf, ringPath, sparkOf, weekBand, lowBattery, activeOffset, batteryGlyph, effectiveSetback,
                showReason, seasonLabel, keplerChip, hubbleChip, keplerLine,
            };
        },
    };
})();
