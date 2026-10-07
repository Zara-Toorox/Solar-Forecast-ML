// SFML Room Heating Lovelace Card
// (C) 2026 Zara-Toorox

// Solar Forecast ML brand mark (96 px WebP of brand/icon@2x.png), inlined so the card needs no extra asset
const HEATING_BRAND_ICON = "data:image/webp;base64,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";
const HEATING_BRAND_URL = { de: "https://www.solarforecastml.com/de/", en: "https://www.solarforecastml.com/en/" };

// Reason and label wording mirrors i18n/locales.js (heating.*)
const HEATING_PAGE_TEXT = {
  "de": {
    "reasons": {
      "locked": "Lizenz nicht aktiv",
      "disabled": "Heizung ist ausgeschaltet",
      "no_persons": "Keine Person gewählt",
      "presence_home": "Jemand ist zu Hause",
      "presence_unknown": "Anwesenheit unklar",
      "presence_pending": "Abwesenheit noch nicht lange genug",
      "presence_away": "Niemand zu Hause",
      "window_open": "Fenster offen",
      "away_setback": "Absenkung wegen Abwesenheit",
      "comfort": "Wunschtemperatur",
      "room_inactive": "Raum wird nur beobachtet",
      "thermostat_unavailable": "Thermostat nicht erreichbar",
      "hvac_off": "Thermostate ausgeschaltet",
      "range_setpoint": "Bereichs-Sollwert, kein Einzelwert",
      "setpoint_unreadable": "Sollwert nicht lesbar",
      "within_band": "Schon nah am Ziel",
      "same_value": "Dieser Wert steht bereits",
      "decrease_limited": "Absenkung ist zeitlich begrenzt",
      "increase_limited": "Anhebung wartet noch",
      "manual_override": "Manuell geändert, Regelung pausiert",
      "startup_hold": "Wartet nach dem Neustart",
      "write_failed": "Der Thermostat hat den Sollwert nicht angenommen",
      "schedule_setback": "Außerhalb des Zeitfensters",
      "hvac_switched": "Betriebsart wurde gerade gewechselt",
      "mixed_reasons": "Mehrere Gründe",
      "outdoor_unavailable": "Außentemperatur nicht erreichbar",
      "outdoor_missing": "Keine Außentemperatur gewählt",
      "forecast_unavailable": "Prognose nicht verfügbar",
      "preheat": "Vorheizen",
      "awaiting_device": "Wartet auf das Thermostat",
      "device_not_responding": "Thermostat antwortet nicht",
      "unknown": "Unbekannter Zustand"
    },
    "seasonOnShort": "An",
    "seasonOffShort": "Aus",
    "seasonUnknown": "–",
    "modeAutoShort": "Automatik",
    "modeScheduleShort": "Zeitplan",
    "modeCombinedShort": "Kombiniert",
    "modeObserve": "Beobachten",
    "modePause": "Pause",
    "modeAwaiting": "Wartet auf Gerät",
    "resume": "Wieder übernehmen",
    "keplerRoomLearning": "lernt {heat}/3 · {cool}/3",
    "keplerRoomReady": "Aufheizen {rate} K/h · hält Wärme ~{hours} h",
    "hubbleMin": "Hubble · morgen min {temp} °C",
    "hubbleMissing": "Hubble · Prognose nicht verfügbar",
    "preheatFor": "Vorheizen für {time}",
    "nextChange": "Nächster Wechsel",
    "premiumTitle": "Premium-Funktion nicht freigeschaltet",
    "premiumText": "Die Raumheizung braucht eine aktive Premium-Lizenz.",
    "outdoorNow": "Außen jetzt",
    "personHome": "zu Hause",
    "personAway": "unterwegs",
    "emptyTitle": "Noch kein Raum angelegt",
    "enableTitle": "In EAI aktivieren",
    "enableText": "Schalte die Raumheizung im EAI-Feature-Schritt ein.",
    "windowOpen": "Fenster offen"
  },
  "en": {
    "reasons": {
      "locked": "Licence is not active",
      "disabled": "Heating is switched off",
      "no_persons": "No person selected",
      "presence_home": "Someone is home",
      "presence_unknown": "Presence is unclear",
      "presence_pending": "Away time is still too short",
      "presence_away": "Nobody is home",
      "window_open": "Window is open",
      "away_setback": "Setback because nobody is home",
      "comfort": "Comfort temperature",
      "room_inactive": "Room is only observed",
      "thermostat_unavailable": "Thermostat is unavailable",
      "hvac_off": "Thermostat is off",
      "range_setpoint": "Range setpoint, not a single value",
      "setpoint_unreadable": "Setpoint cannot be read",
      "within_band": "Already close to the target",
      "same_value": "This value is already set",
      "decrease_limited": "A decrease is time-limited",
      "increase_limited": "An increase is still waiting",
      "manual_override": "Changed manually, control is paused",
      "startup_hold": "Waiting after restart",
      "write_failed": "The thermostat did not accept the setpoint",
      "schedule_setback": "Outside the time window",
      "hvac_switched": "Mode was just changed",
      "mixed_reasons": "Several reasons",
      "outdoor_unavailable": "Outdoor temperature is unavailable",
      "outdoor_missing": "No outdoor temperature selected",
      "forecast_unavailable": "Forecast unavailable",
      "preheat": "Preheating",
      "awaiting_device": "Waiting for the thermostat",
      "device_not_responding": "Thermostat is not responding",
      "unknown": "Unknown state"
    },
    "seasonOnShort": "On",
    "seasonOffShort": "Off",
    "seasonUnknown": "–",
    "modeAutoShort": "Automatic",
    "modeScheduleShort": "Schedule",
    "modeCombinedShort": "Combined",
    "modeObserve": "Observe",
    "modePause": "Paused",
    "modeAwaiting": "Waiting for device",
    "resume": "Take over again",
    "keplerRoomLearning": "learning {heat}/3 · {cool}/3",
    "keplerRoomReady": "Heating {rate} K/h · holds heat ~{hours} h",
    "hubbleMin": "Hubble · tomorrow min {temp} °C",
    "hubbleMissing": "Hubble · forecast unavailable",
    "preheatFor": "Preheating for {time}",
    "nextChange": "Next change",
    "premiumTitle": "Premium feature is locked",
    "premiumText": "Room heating needs an active premium licence.",
    "outdoorNow": "Outside now",
    "personHome": "home",
    "personAway": "away",
    "emptyTitle": "No room yet",
    "enableTitle": "Enable in EAI",
    "enableText": "Turn on room heating in the EAI features step.",
    "windowOpen": "Window open"
  }
};

const HEATING_TEXT = {
  de: {
    title: "Heizung",
    tagline: "Raumregelung von Solar Forecast ML",
    seasonOn: "Heizperiode an",
    seasonOff: "Heizperiode aus",
    home: "{n} zu Hause",
    nobodyHome: "Niemand zu Hause",
    kepler: "Kepler · {room}: {text}",
    now: "jetzt {v}°",
    setpoint: "Soll",
    comfort: "Wunschtemperatur",
    more: "Mehr erfahren",
    premiumLead: "Jeder Raum heizt nur, wenn jemand da ist – mit Vorheizen, Fenster-Erkennung und Lernmodell.",
    saveFailed: "Konnte nicht gespeichert werden.",
    noPermission: "Keine Berechtigung für diesen Raum.",
    loading: "Lade Heizung …",
    error: "Heizungsdaten nicht erreichbar.",
    at: "{time}",
  },
  en: {
    title: "Heating",
    tagline: "Room control by Solar Forecast ML",
    seasonOn: "Heating season on",
    seasonOff: "Heating season off",
    home: "{n} at home",
    nobodyHome: "Nobody at home",
    kepler: "Kepler · {room}: {text}",
    now: "now {v}°",
    setpoint: "Target",
    comfort: "Comfort temperature",
    more: "Learn more",
    premiumLead: "Every room only heats when someone is there – with preheating, window detection and a learning model.",
    saveFailed: "Could not be saved.",
    noPermission: "No permission for this room.",
    loading: "Loading heating …",
    error: "Heating data unavailable.",
    at: "{time}",
  },
};

const HEATING_REFRESH_MS = 60000;
const HEATING_SAVE_DEBOUNCE_MS = 700;
const HEATING_STEP_C = 0.5;
// Server-side limits for the comfort temperature (core/heating.py validate_room)
const HEATING_MIN_C = 5;
const HEATING_MAX_C = 30;
const HEATING_SPARK_POINTS = 48;

class SfmlHeatingCard extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this.initCard();
    }
    const now = Date.now();
    if (!this._lastUpdate || now - this._lastUpdate > HEATING_REFRESH_MS) {
      this._lastUpdate = now;
      this.updateData();
    }
  }

  disconnectedCallback() {
    // Leaving the view must not drop a tap that is still waiting for its debounce
    Object.entries(this._timers || {}).forEach(([roomId, timer]) => {
      if (!timer) return;
      clearTimeout(timer);
      this._timers[roomId] = null;
      this._saveComfort(roomId);
    });
  }

  get _locale() {
    return this._hass?.locale?.language || this._hass?.language || "en";
  }

  get _lang() {
    return this._locale.toLowerCase().startsWith("de") ? "de" : "en";
  }

  _t(key, vars = {}) {
    const text = HEATING_TEXT[this._lang][key] ?? HEATING_TEXT.en[key] ?? key;
    return text.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "");
  }

  _p(key, vars = {}) {
    const text = HEATING_PAGE_TEXT[this._lang]?.[key] ?? HEATING_PAGE_TEXT.en[key] ?? "";
    return String(text).replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "");
  }

  _reason(code) {
    const reasons = HEATING_PAGE_TEXT[this._lang]?.reasons || HEATING_PAGE_TEXT.en.reasons;
    return reasons[code] || reasons.unknown;
  }

  _num(value, digits = 1) {
    return new Intl.NumberFormat(this._locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(Number(value) || 0);
  }

  _finite(value) {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  _time(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "–";
    const tz = this._hass?.config?.time_zone;
    return new Intl.DateTimeFormat(this._locale, {
      hour: "2-digit", minute: "2-digit", hourCycle: "h23", ...(tz ? { timeZone: tz } : {}),
    }).format(date);
  }

  _escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }

  initCard() {
    this._initialized = true;
    this._timers = {};
    this._pending = {};
    this._inflight = {};
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        .brand-stripe {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #2a90e0, #f5902f);
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .brand-icon {
          flex: none;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(20, 33, 68, 0.28);
        }
        .brand-copy {
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
        }
        .title-text {
          font-size: 20px;
          font-weight: 500;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .wordmark {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.3px;
          line-height: 1.4;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .wm-solar { color: #2a90e0; }
        .wm-forecast { color: #f5902f; }
        .brand-footer {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 4px 8px;
          margin-top: 14px;
          padding-top: 10px;
          border-top: 1px solid var(--h-divider);
          font-size: 11px;
          color: var(--h-muted);
        }
        .brand-footer a {
          color: inherit;
          text-decoration: none;
          white-space: nowrap;
          transition: color 0.2s ease;
        }
        .brand-footer a:hover {
          color: #f5902f;
        }
        :host {
          display: block;
          --h-text: var(--primary-text-color, #212121);
          --h-muted: var(--secondary-text-color, #727272);
          --h-divider: var(--divider-color, rgba(127, 127, 127, 0.2));
          --h-heat: #ff7043;
          --h-cool: #4fa3ff;
          --h-good: var(--success-color, #43a047);
          --h-pause: #e0a800;
          --h-bg: var(--ha-card-background, var(--card-background-color, #fff));
        }
        ha-card {
          position: relative;
          overflow: hidden;
          container-type: inline-size;
        }
        .content {
          padding: 16px;
          color: var(--h-text);
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 12px;
        }
        .season {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          color: var(--h-muted);
          background: color-mix(in srgb, var(--h-muted) 14%, transparent);
        }
        .season.on {
          color: var(--h-heat);
          background: color-mix(in srgb, var(--h-heat) 14%, transparent);
        }
        .season[hidden] {
          display: none;
        }
        .season ha-icon {
          --mdc-icon-size: 15px;
        }

        .context {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 12px;
        }
        .chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 9px;
          border-radius: 999px;
          font-size: 12px;
          max-width: 100%;
          background: color-mix(in srgb, var(--h-text) 6%, transparent);
        }
        .chip span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .chip ha-icon {
          --mdc-icon-size: 15px;
          flex: none;
          color: var(--h-muted);
        }
        .chip.ai ha-icon {
          color: #2a90e0;
        }

        .rooms {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .room {
          container-type: inline-size;
          position: relative;
          overflow: hidden;
          min-width: 0;
          padding: 12px;
          border-radius: 16px;
          border: 1px solid var(--h-divider);
          background: linear-gradient(160deg,
            color-mix(in srgb, var(--tone) 16%, transparent),
            color-mix(in srgb, var(--tone) 3%, transparent));
          --tone: var(--h-muted);
        }
        .room.heating { --tone: var(--h-heat); border-color: color-mix(in srgb, var(--h-heat) 40%, transparent); }
        .room.window { --tone: var(--h-cool); border-color: color-mix(in srgb, var(--h-cool) 40%, transparent); }
        .room.paused { --tone: var(--h-pause); border-color: color-mix(in srgb, var(--h-pause) 50%, transparent); }
        .room.idle { --tone: var(--h-good); }
        .room-head {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px 6px;
          min-width: 0;
          font-size: 14px;
          font-weight: 600;
        }
        .room-head .name {
          flex: 1 1 auto;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .room-head ha-icon {
          --mdc-icon-size: 18px;
          flex: none;
          color: var(--tone);
        }
        .room.heating .room-head ha-icon {
          animation: flicker 2.2s ease-in-out infinite;
        }
        .mode {
          flex: none;
          max-width: 100%;
          margin-left: auto;
          padding: 2px 6px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--h-muted);
          background: color-mix(in srgb, var(--h-text) 8%, transparent);
        }
        .temps {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-end;
          justify-content: space-between;
          gap: 6px;
          margin-top: 8px;
        }
        .actual {
          font-size: clamp(28px, 16cqw, 34px);
          font-weight: 600;
          line-height: 1;
          letter-spacing: -1px;
          font-variant-numeric: tabular-nums;
        }
        .actual small {
          font-size: 0.45em;
          font-weight: 500;
          letter-spacing: 0;
          color: var(--h-muted);
        }
        .setpoint {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }
        .stepper {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--tone) 45%, transparent);
          background: color-mix(in srgb, var(--h-bg) 70%, transparent);
        }
        .stepper button {
          all: unset;
          display: grid;
          place-items: center;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          cursor: pointer;
          color: var(--tone);
        }
        .stepper button:hover {
          background: color-mix(in srgb, var(--tone) 14%, transparent);
        }
        .stepper button:focus-visible {
          outline: 2px solid var(--tone);
        }
        .stepper button[disabled] {
          opacity: 0.35;
          cursor: default;
        }
        .stepper ha-icon {
          --mdc-icon-size: 18px;
        }
        .stepper span {
          min-width: 40px;
          text-align: center;
          font-size: 14px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }
        .stepper.pending span {
          animation: pulse 1s ease-in-out infinite;
        }
        .effective {
          font-size: 11px;
          color: var(--h-muted);
        }
        .why {
          display: flex;
          gap: 4px;
          margin-top: 8px;
          min-height: 32px;
          font-size: 12px;
          line-height: 1.35;
        }
        .why ha-icon {
          --mdc-icon-size: 15px;
          flex: none;
          color: var(--tone);
        }
        .error {
          margin-top: 4px;
          font-size: 11px;
          color: var(--error-color, #db4437);
        }
        .resume {
          all: unset;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 8px;
          padding: 5px 10px;
          border-radius: 999px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          color: #fff;
          background: var(--h-pause);
        }
        .resume ha-icon {
          --mdc-icon-size: 15px;
        }
        .spark {
          display: block;
          width: 100%;
          height: 30px;
          margin-top: 6px;
          overflow: visible;
        }
        .spark .a { fill: none; stroke: var(--tone); stroke-width: 2; vector-effect: non-scaling-stroke; }
        .spark .t { fill: none; stroke: var(--h-muted); stroke-width: 1.2; stroke-dasharray: 3 3; vector-effect: non-scaling-stroke; }
        .spark .fill { fill: color-mix(in srgb, var(--tone) 14%, transparent); }
        .valve {
          height: 4px;
          margin-top: 8px;
          border-radius: 2px;
          background: color-mix(in srgb, var(--h-text) 8%, transparent);
          overflow: hidden;
        }
        .valve div {
          height: 100%;
          border-radius: 2px;
          background: linear-gradient(90deg, color-mix(in srgb, var(--h-heat) 50%, transparent), var(--h-heat));
          transition: width 1s ease;
        }
        .meta {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 10px;
          margin-top: 6px;
          font-size: 11px;
          color: var(--h-muted);
        }
        .meta span {
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
        .meta ha-icon {
          --mdc-icon-size: 13px;
        }

        .next {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          font-size: 13px;
          background: color-mix(in srgb, var(--h-text) 5%, transparent);
        }
        .next ha-icon {
          --mdc-icon-size: 18px;
          flex: none;
          color: #2a90e0;
        }

        .locked {
          position: relative;
          display: grid;
          place-items: center;
          min-height: 220px;
          border-radius: 16px;
          overflow: hidden;
          background:
            radial-gradient(circle at 25% 30%, color-mix(in srgb, var(--h-heat) 20%, transparent), transparent 55%),
            radial-gradient(circle at 75% 70%, color-mix(in srgb, var(--h-cool) 20%, transparent), transparent 55%);
        }
        .lock-box {
          max-width: 320px;
          padding: 16px;
          border-radius: 16px;
          text-align: center;
          background: color-mix(in srgb, var(--h-bg) 88%, transparent);
          border: 1px solid color-mix(in srgb, #f5902f 45%, transparent);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.18);
        }
        .lock-box ha-icon {
          --mdc-icon-size: 34px;
          color: #f5902f;
        }
        .lock-box strong {
          display: block;
          margin: 4px 0;
          font-size: 16px;
        }
        .lock-box span {
          font-size: 13px;
          color: var(--h-muted);
        }
        .cta {
          display: inline-block;
          margin-top: 10px;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 600;
          color: #fff;
          text-decoration: none;
          background: linear-gradient(90deg, #2a90e0, #f5902f);
        }
        .state {
          padding: 28px 0;
          text-align: center;
          color: var(--h-muted);
          font-size: 14px;
        }
        .state strong {
          display: block;
          color: var(--h-text);
          margin-bottom: 4px;
        }

        @container (max-width: 420px) {
          .header { flex-wrap: wrap; row-gap: 8px; }
          .season { margin-left: 52px; }
          .rooms { grid-template-columns: 1fr; }
        }
        @container (max-width: 190px) {
          .temps { flex-direction: column; align-items: flex-start; }
          .setpoint { align-items: flex-start; }
        }
        @keyframes flicker {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
        @keyframes pulse {
          50% { opacity: 0.4; }
        }
        @media (prefers-reduced-motion: reduce) {
          .room.heating .room-head ha-icon, .stepper.pending span { animation: none; }
        }
      </style>
      <ha-card>
        <div class="brand-stripe"></div>
        <div class="content">
          <div class="header">
            <div class="brand">
              <img class="brand-icon" alt="Solar Forecast ML">
              <div class="brand-copy">
                <span class="title-text"></span>
                <span class="wordmark"><span class="wm-solar">Solar </span><span class="wm-forecast">Forecast ML</span></span>
              </div>
            </div>
            <div class="season" hidden></div>
          </div>
          <div class="body"><div class="state"></div></div>
          <div class="brand-footer">
            <span class="tagline"></span>
            <a class="brand-link" target="_blank" rel="noopener">solarforecastml.com ↗</a>
          </div>
        </div>
      </ha-card>
    `;
    this.shadowRoot.querySelector(".title-text").textContent = this._config.title || this._t("title");
    this.shadowRoot.querySelector(".brand-icon").src = HEATING_BRAND_ICON;
    this.shadowRoot.querySelector(".tagline").textContent = this._t("tagline");
    this.shadowRoot.querySelector(".brand-link").href = HEATING_BRAND_URL[this._lang];
    this.shadowRoot.querySelector(".state").textContent = this._t("loading");
    this.container = this.shadowRoot.querySelector(".body");
    this.seasonChip = this.shadowRoot.querySelector(".season");
    this.container.addEventListener("click", (event) => this._onClick(event));
  }

  async updateData() {
    if (!this._hass || !this.container) return;
    try {
      const response = await this._hass.callApi("GET", "sfml_stats/heating/status");
      if (!response?.success) {
        if (!this._data) this._showState(this._t("error"));
        return;
      }
      this._data = response.data || {};
      this.render();
    } catch (err) {
      console.error("SFML Heating Card fetch error:", err);
      if (!this._data) this._showState(this._t("error"));
    }
  }

  _showState(text, title = "") {
    this.container.innerHTML = `<div class="state">${title ? `<strong>${this._escape(title)}</strong>` : ""}${this._escape(text)}</div>`;
  }

  // Same precedence as the heating page: a dedicated room sensor wins over the thermostat average
  _actual(room) {
    const sensor = this._finite(room.temp_sensor_c);
    if (sensor != null) return sensor;
    const values = (room.thermostats || []).map((t) => this._finite(t.current_c)).filter((v) => v != null);
    return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
  }

  _tone(room) {
    if (room.reason === "manual_override") return "paused";
    if (room.window_open) return "window";
    if (!room.active) return "observe";
    if (room.demand) return "heating";
    return "idle";
  }

  _modeLabel(room) {
    if (!room.active) return this._p("modeObserve");
    if (room.reason === "manual_override") return this._p("modePause");
    if (room.reason === "awaiting_device" || room.reason === "device_not_responding") return this._p("modeAwaiting");
    if (room.mode === "schedule") return this._p("modeScheduleShort");
    if (room.mode === "combined") return this._p("modeCombinedShort");
    return this._p("modeAutoShort");
  }

  render() {
    const data = this._data || {};
    if (!data.licensed) {
      this.seasonChip.hidden = true;
      this.container.innerHTML = `
        <div class="locked"><div class="lock-box">
          <ha-icon icon="mdi:lock-outline"></ha-icon>
          <strong>${this._escape(this._p("premiumTitle"))}</strong>
          <span>${this._escape(this._t("premiumLead"))}</span><br>
          <a class="cta" href="${HEATING_BRAND_URL[this._lang]}" target="_blank" rel="noopener">${this._t("more")}</a>
        </div></div>`;
      return;
    }
    if (!data.feature_enabled) {
      this.seasonChip.hidden = true;
      this._showState(this._p("enableText"), this._p("enableTitle"));
      return;
    }

    const outdoor = data.outdoor || {};
    if (outdoor.season === true || outdoor.season === false) {
      this.seasonChip.className = `season ${outdoor.season ? "on" : ""}`;
      this.seasonChip.innerHTML = `<ha-icon icon="mdi:radiator${outdoor.season ? "" : "-off"}"></ha-icon>${this._t(outdoor.season ? "seasonOn" : "seasonOff")}`;
      this.seasonChip.hidden = false;
    } else {
      this.seasonChip.hidden = true;
    }

    const rooms = Array.isArray(data.rooms) ? data.rooms : [];
    if (!rooms.length) {
      this._showState("", this._p("emptyTitle"));
      return;
    }

    this.container.innerHTML = `
      ${this._contextHtml(data, rooms)}
      <div class="rooms">${rooms.map((room) => this._roomHtml(room)).join("")}</div>
      ${this._nextHtml(rooms)}
    `;
  }

  _contextHtml(data, rooms) {
    const chips = [];
    const outdoor = data.outdoor || {};
    const outside = this._finite(outdoor.current_c);
    if (outside != null) {
      chips.push(`<span class="chip"><ha-icon icon="mdi:thermometer"></ha-icon><span>${this._p("outdoorNow")} ${this._num(outside)}°</span></span>`);
    }
    // Non-admins only receive counts (persons_home / persons_total), admins the full list
    const persons = Array.isArray(data.persons) ? data.persons : [];
    const total = this._finite(data.persons_total) ?? persons.length;
    if (total) {
      const home = this._finite(data.persons_home) ?? persons.filter((p) => p.state === "home").length;
      chips.push(`<span class="chip"><ha-icon icon="mdi:home-account"></ha-icon><span>${home ? this._t("home", { n: home }) : this._t("nobodyHome")}</span></span>`);
    }
    const learned = rooms.find((r) => r.model?.status === "ready" && r.model.rate_k_per_h != null && r.model.tau_h != null);
    if (learned) {
      const text = this._p("keplerRoomReady", { rate: this._num(learned.model.rate_k_per_h), hours: this._num(learned.model.tau_h, 0) });
      chips.push(`<span class="chip ai"><ha-icon icon="mdi:chart-timeline-variant"></ha-icon><span>${this._escape(this._t("kepler", { room: learned.name, text }))}</span></span>`);
    }
    const hubble = this._finite(outdoor.forecast_min_next_12h);
    chips.push(`<span class="chip ai"><ha-icon icon="mdi:weather-partly-cloudy"></ha-icon><span>${hubble != null
      ? this._p("hubbleMin", { temp: this._num(hubble, 0) })
      : this._p("hubbleMissing")}</span></span>`);
    return `<div class="context">${chips.join("")}</div>`;
  }

  _roomHtml(room) {
    const tone = this._tone(room);
    const icon = {
      heating: "fire", window: "window-open-variant", paused: "hand-back-right-outline", observe: "eye-outline",
    }[tone] || "home-thermometer-outline";
    const actual = this._actual(room);
    const pending = this._pending[room.id];
    const comfort = pending ?? this._finite(room.comfort_temp_c);
    const effective = this._finite(room.target_c);
    const showEffective = effective != null && comfort != null && Math.abs(effective - comfort) >= 0.25;
    const why = room.reason === "preheat" && room.preheat_for
      ? this._p("preheatFor", { time: this._time(room.preheat_for) })
      : this._reason(room.reason);

    const valves = (room.thermostats || []).map((t) => this._finite(t.valve_pct)).filter((v) => v != null);
    const valve = valves.length ? Math.max(...valves) : null;
    const batteries = [
      ...(room.thermostats || []).map((t) => this._finite(t.battery_pct)),
      this._finite(room.sensor_battery_pct),
      this._finite(room.window_battery_pct),
    ].filter((v) => v != null);
    const battery = batteries.length ? Math.min(...batteries) : null;
    const humidity = this._finite(room.humidity_pct);
    const meta = [
      valve != null ? `<span><ha-icon icon="mdi:valve"></ha-icon>${Math.round(valve)} %</span>` : "",
      humidity != null ? `<span><ha-icon icon="mdi:water-percent"></ha-icon>${Math.round(humidity)} %</span>` : "",
      battery != null ? `<span><ha-icon icon="mdi:battery${battery < 20 ? "-alert-variant-outline" : "-70"}"></ha-icon>${Math.round(battery)} %</span>` : "",
    ].join("");

    const id = this._escape(room.id);
    return `
      <div class="room ${tone}">
        <div class="room-head">
          <ha-icon icon="mdi:${icon}"></ha-icon>
          <span class="name">${this._escape(room.name)}</span>
          <span class="mode">${this._escape(this._modeLabel(room))}</span>
        </div>
        <div class="temps">
          <div class="actual">${actual != null ? this._num(actual) : "–"}<small>°C</small></div>
          <div class="setpoint">
            ${comfort != null ? `
              <div class="stepper ${pending != null ? "pending" : ""}" aria-label="${this._escape(this._t("comfort"))}">
                <button data-room="${id}" data-step="-1" aria-label="−" ${comfort <= HEATING_MIN_C ? "disabled" : ""}><ha-icon icon="mdi:minus"></ha-icon></button>
                <span>${this._num(comfort)}°</span>
                <button data-room="${id}" data-step="1" aria-label="+" ${comfort >= HEATING_MAX_C ? "disabled" : ""}><ha-icon icon="mdi:plus"></ha-icon></button>
              </div>` : ""}
            ${showEffective ? `<span class="effective">${this._t("now", { v: this._num(effective) })}</span>` : ""}
          </div>
        </div>
        <div class="why"><ha-icon icon="mdi:information-outline"></ha-icon><span>${this._escape(why)}</span></div>
        ${this._errors?.[room.id] ? `<div class="error">${this._t(this._errors[room.id])}</div>` : ""}
        ${room.reason === "manual_override"
          ? `<button class="resume" data-resume="${id}"><ha-icon icon="mdi:play"></ha-icon>${this._escape(this._p("resume"))}</button>`
          : ""}
        ${this._sparkHtml(room)}
        ${valve != null ? `<div class="valve"><div style="width:${Math.min(100, Math.max(0, valve))}%"></div></div>` : ""}
        ${meta ? `<div class="meta">${meta}</div>` : ""}
      </div>`;
  }

  _sparkHtml(room) {
    const history = (room.history || []).slice(-HEATING_SPARK_POINTS);
    const actual = history.map((h) => this._finite(h.actual_c));
    const target = history.map((h) => this._finite(h.target_c));
    const values = [...actual, ...target].filter((v) => v != null);
    if (history.length < 3 || !values.length) return "";
    const lo = Math.min(...values) - 0.3;
    const hi = Math.max(...values) + 0.3;
    const W = 100;
    const H = 30;
    const x = (i) => (i / (history.length - 1)) * W;
    const y = (v) => H - ((v - lo) / (hi - lo)) * H;
    const path = (series) => {
      let d = "";
      series.forEach((v, i) => {
        if (v == null) return;
        d += `${d && series[i - 1] != null ? "L" : "M"} ${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      });
      return d.trim();
    };
    const actualPath = path(actual);
    const first = actual.findIndex((v) => v != null);
    const last = actual.length - 1 - [...actual].reverse().findIndex((v) => v != null);
    const fill = actualPath && actual.every((v) => v != null)
      ? `<path class="fill" d="${actualPath} L ${x(last).toFixed(1)},${H} L ${x(first).toFixed(1)},${H} Z"/>`
      : "";
    return `
      <svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
        ${fill}
        <path class="t" d="${path(target)}"/>
        <path class="a" d="${actualPath}"/>
      </svg>`;
  }

  _nextHtml(rooms) {
    const upcoming = rooms
      .filter((r) => r.active && r.reason !== "manual_override")
      .filter((r) => r.next_change?.at && this._finite(r.next_change.target_c) != null)
      .map((r) => ({ room: r, at: Date.parse(r.next_change.at) }))
      .filter((item) => Number.isFinite(item.at))
      .sort((a, b) => a.at - b.at)[0];
    if (!upcoming) return "";
    const { room } = upcoming;
    return `
      <div class="next"><ha-icon icon="mdi:clock-outline"></ha-icon>
        <div><b>${this._escape(this._p("nextChange"))}:</b> ${this._escape(room.name)} ${this._time(room.next_change.at)} → ${this._num(room.next_change.target_c)}°</div>
      </div>`;
  }

  _onClick(event) {
    const resume = event.target.closest("[data-resume]");
    if (resume) {
      this._resume(resume.dataset.resume);
      return;
    }
    const button = event.target.closest(".stepper button[data-room]");
    if (!button || button.disabled) return;
    const roomId = button.dataset.room;
    const room = (this._data?.rooms || []).find((r) => r.id === roomId);
    if (!room) return;
    const current = this._pending[roomId] ?? this._finite(room.comfort_temp_c);
    if (current == null) return;
    const next = Math.min(HEATING_MAX_C, Math.max(HEATING_MIN_C, current + Number(button.dataset.step) * HEATING_STEP_C));
    this._pending[roomId] = next;
    if (this._errors) delete this._errors[roomId];
    this.render();
    // Debounce so several taps become one write
    clearTimeout(this._timers[roomId]);
    this._timers[roomId] = setTimeout(() => {
      this._timers[roomId] = null;
      this._saveComfort(roomId);
    }, HEATING_SAVE_DEBOUNCE_MS);
  }

  // hass.callApi rejects with the parsed error body; 403 control_denied means missing HA control rights
  _errorKey(err) {
    const code = err?.body?.error?.code || err?.error?.code;
    return code === "control_denied" || err?.status_code === 403 ? "noPermission" : "saveFailed";
  }

  // One request per room at a time; a tap during a running request is sent right after it
  async _saveComfort(roomId) {
    if (this._inflight[roomId]) return;
    const value = this._pending[roomId];
    if (value == null) return;
    this._inflight[roomId] = true;
    try {
      await this._hass.callApi("POST", `sfml_stats/heating/rooms/${encodeURIComponent(roomId)}/comfort`, {
        comfort_temp_c: value,
      });
    } catch (err) {
      console.error("SFML Heating Card save error:", err);
      this._errors = { ...(this._errors || {}), [roomId]: this._errorKey(err) };
    } finally {
      this._inflight[roomId] = false;
    }
    if (this._pending[roomId] !== value) {
      // A newer tap arrived meanwhile; its own timer sends it, otherwise send it now
      if (!this._timers[roomId]) this._saveComfort(roomId);
      return;
    }
    // The server state is authoritative; drop the local value once it is reloaded
    await this.updateData();
    if (this._pending[roomId] === value && !this._timers[roomId] && !this._inflight[roomId]) {
      delete this._pending[roomId];
    }
    this.render();
  }

  async _resume(roomId) {
    try {
      await this._hass.callApi("POST", `sfml_stats/heating/rooms/${encodeURIComponent(roomId)}/resume`, {});
      if (this._errors) delete this._errors[roomId];
    } catch (err) {
      console.error("SFML Heating Card resume error:", err);
      this._errors = { ...(this._errors || {}), [roomId]: this._errorKey(err) };
    }
    await this.updateData();
  }

  // Sections view: always span the full section width, height follows the content
  getGridOptions() {
    return { columns: 12, min_columns: 12, rows: "auto" };
  }

  getCardSize() {
    return 7;
  }

  static getStubConfig() {
    return {};
  }
}

if (!customElements.get("sfml-heating-card")) customElements.define("sfml-heating-card", SfmlHeatingCard);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "sfml-heating-card")) {
  const de = (document.documentElement.lang || navigator.language || "").toLowerCase().startsWith("de");
  window.customCards.push({
    type: "sfml-heating-card",
    name: de ? "Solar Forecast ML – Heizung" : "Solar Forecast ML – Heating",
    preview: true,
    description: de
      ? "Raumheizung mit Ist/Soll, Grund in Klartext, Wunschtemperatur und Verlauf je Raum – von Solar Forecast ML."
      : "Room heating with actual/target, plain-language reason, comfort temperature and trend per room – by Solar Forecast ML.",
    documentationURL: "https://www.solarforecastml.com/",
  });
}
