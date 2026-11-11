// SFML Smart Loads Lovelace Card
// (C) 2026 Zara-Toorox

// Solar Forecast ML brand mark, inlined like the other cards so no extra asset is needed
const LOADS_BRAND_ICON = "data:image/webp;base64,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";
const LOADS_BRAND_URL = { de: "https://www.solarforecastml.com/de/", en: "https://www.solarforecastml.com/en/", pl: "https://www.solarforecastml.com/en/" };

// Reason wording mirrors frontend/modern/loads.js (reason.*)
const LOADS_TEXT = {
  "de": {
    "title": "Verbraucher",
    "tagline": "Geräte schalten, wenn Sonne und Preis passen",
    "loading": "Lade Verbraucher …",
    "error": "Die Verbraucher sind gerade nicht erreichbar.",
    "empty": "Noch kein Gerät angelegt.",
    "emptyHint": "Geräte legst du auf der Seite „Verbraucher“ in STATS an.",
    "demo": "Demo",
    "demoHint": "Beispieldaten. Mit Premium siehst du hier deine Geräte.",
    "surplus": "Überschuss {v}",
    "priceNow": "Jetzt {v} ct/kWh",
    "battery": "Akku {v} %",
    "nextStart": "Nächster Start {t}",
    "until": "bis {t}",
    "notPlanned": "noch nicht geplant",
    "beingPlanned": "wird geplant",
    "nextShort": "nächster Start",
    "noSwitch": "schaltet nicht",
    "inactiveWhy": "Regelung aus, das Gerät bleibt, wie es ist",
    "door": "Tür {n}/{m} geöffnet seit dem letzten Lauf",
    "wouldStart": "Würde um {t} starten",
    "finishBy": "fertig bis {t}",
    "objective_price": "Günstigster Preis",
    "objective_pv": "Meiste PV",
    "objective_both": "Preis und PV",
    "arm": "Jetzt planen",
    "disarm": "Abbrechen",
    "saveFailed": "Das hat nicht geklappt.",
    "noPermission": "Keine Berechtigung für dieses Gerät.",
    "mode_planned": "Geplant",
    "mode_armed": "Plant",
    "mode_ready": "Bereit",
    "mode_running": "Läuft",
    "mode_on": "An",
    "mode_off": "Aus",
    "mode_inactive": "Nicht aktiv",
    "mode_paused": "Pause",
    "more": "Mehr erfahren",
    "endShort": "Ende",
    "reasons": {
      "pv_surplus": "PV-Überschuss reicht",
      "surplus_budget": "Kein freier Überschuss für dieses Gerät",
      "surplus_unavailable": "Das Überschusssignal fehlt gerade",
      "surplus_not_stable": "Überschuss noch nicht stabil",
      "cheapest_hour": "Günstige Stunde",
      "not_cheapest_hour": "Keine der günstigsten Stunden",
      "price_below": "Preis unter der Grenze",
      "price_above_limit": "Preis über der Grenze",
      "price_unavailable": "Der Preis fehlt",
      "battery_ok": "Batterie ausreichend",
      "battery_low": "Batterie zu niedrig",
      "soc_unavailable": "Batteriestand fehlt",
      "in_window": "Im Zeitfenster",
      "outside_window": "Außerhalb des Zeitfensters",
      "all_met": "Alle Bedingungen erfüllt",
      "none_met": "Keine Bedingung erfüllt",
      "no_conditions": "Keine Bedingung eingetragen",
      "min_runtime": "Mindestlaufzeit läuft noch",
      "min_off_time": "Mindestpause läuft noch",
      "cycle_limit": "Zu viele Schaltungen in der letzten Stunde",
      "one_start_per_cycle": "Ein Start pro Durchlauf",
      "manual_override": "Von Hand geschaltet, Regelung pausiert",
      "entity_unavailable": "Das Gerät ist nicht erreichbar",
      "inactive": "Regelung nicht aktiv",
      "license_required": "Premium-Lizenz nötig",
      "waiting_for_arm": "Wartet auf „Beladen, jetzt planen“",
      "planned": "Start geplant",
      "deadline_too_tight": "Frist zu knapp, Start sofort",
      "forecast_unavailable": "Die PV-Prognose fehlt",
      "waiting_ready": "Wartet auf die Freigabe am Gerät",
      "program_running": "Programm läuft",
      "pending": "Wird geprüft",
      "planned_start": "Geplanter Start",
      "user": "Von dir",
      "ready_entity": "Freigabe am Gerät",
      "invalid_program": "Programmdaten ungültig"
    }
  },
  "en": {
    "title": "Smart loads",
    "tagline": "Switch devices when sun and price fit",
    "loading": "Loading smart loads …",
    "error": "The smart loads are not reachable right now.",
    "empty": "No device added yet.",
    "emptyHint": "Add devices on the “Smart loads” page in STATS.",
    "demo": "Demo",
    "demoHint": "Example data. With Premium you see your devices here.",
    "surplus": "Surplus {v}",
    "priceNow": "Now {v} ct/kWh",
    "battery": "Battery {v} %",
    "nextStart": "Next start {t}",
    "until": "until {t}",
    "notPlanned": "not planned yet",
    "beingPlanned": "being planned",
    "nextShort": "next start",
    "noSwitch": "does not switch",
    "inactiveWhy": "Control off, the device stays as it is",
    "door": "Door opened {n}/{m} since the last run",
    "wouldStart": "Would start at {t}",
    "finishBy": "done by {t}",
    "objective_price": "Lowest price",
    "objective_pv": "Most PV",
    "objective_both": "Price and PV",
    "arm": "Plan now",
    "disarm": "Cancel",
    "saveFailed": "That did not work.",
    "noPermission": "No permission for this device.",
    "mode_planned": "Planned",
    "mode_armed": "Planning",
    "mode_ready": "Ready",
    "mode_running": "Running",
    "mode_on": "On",
    "mode_off": "Off",
    "mode_inactive": "Not active",
    "mode_paused": "Paused",
    "more": "Learn more",
    "endShort": "end",
    "reasons": {
      "pv_surplus": "PV surplus is enough",
      "surplus_budget": "No free surplus for this device",
      "surplus_unavailable": "The surplus signal is missing right now",
      "surplus_not_stable": "Surplus not stable yet",
      "cheapest_hour": "Cheap hour",
      "not_cheapest_hour": "Not one of the cheapest hours",
      "price_below": "Price below the limit",
      "price_above_limit": "Price above the limit",
      "price_unavailable": "The price is missing",
      "battery_ok": "Battery sufficient",
      "battery_low": "Battery too low",
      "soc_unavailable": "Battery level is missing",
      "in_window": "Inside the time window",
      "outside_window": "Outside the time window",
      "all_met": "All conditions met",
      "none_met": "No condition met",
      "no_conditions": "No condition entered",
      "min_runtime": "Minimum run time still running",
      "min_off_time": "Minimum pause still running",
      "cycle_limit": "Too many switches in the last hour",
      "one_start_per_cycle": "One start per pass",
      "manual_override": "Switched by hand, control paused",
      "entity_unavailable": "The device is not reachable",
      "inactive": "Control not active",
      "license_required": "Premium licence required",
      "waiting_for_arm": "Waiting for “Loaded, plan now”",
      "planned": "Start planned",
      "deadline_too_tight": "Deadline too tight, starting now",
      "forecast_unavailable": "The PV forecast is missing",
      "waiting_ready": "Waiting for the release on the device",
      "program_running": "Program running",
      "pending": "Being checked",
      "planned_start": "Planned start",
      "user": "By you",
      "ready_entity": "Release on the device",
      "invalid_program": "Program data invalid"
    }
  },
  "pl": {
    "title": "Odbiorniki",
    "tagline": "Włączaj urządzenia, gdy słońce i cena pasują",
    "loading": "Ładowanie odbiorników …",
    "error": "Odbiorniki są teraz niedostępne.",
    "empty": "Nie dodano jeszcze urządzenia.",
    "emptyHint": "Urządzenia dodasz na stronie „Odbiorniki” w STATS.",
    "demo": "Demo",
    "demoHint": "Dane przykładowe. Z Premium zobaczysz tu swoje urządzenia.",
    "surplus": "Nadwyżka {v}",
    "priceNow": "Teraz {v} ct/kWh",
    "battery": "Bateria {v} %",
    "nextStart": "Następny start {t}",
    "until": "do {t}",
    "notPlanned": "jeszcze nie zaplanowane",
    "beingPlanned": "planowanie",
    "nextShort": "następny start",
    "noSwitch": "nie przełącza",
    "inactiveWhy": "Sterowanie wyłączone, urządzenie zostaje bez zmian",
    "door": "Drzwi otwarte {n}/{m} od ostatniego cyklu",
    "wouldStart": "Wystartowałoby o {t}",
    "finishBy": "gotowe do {t}",
    "objective_price": "Najniższa cena",
    "objective_pv": "Najwięcej PV",
    "objective_both": "Cena i PV",
    "arm": "Planuj teraz",
    "disarm": "Anuluj",
    "saveFailed": "To się nie udało.",
    "noPermission": "Brak uprawnień do tego urządzenia.",
    "mode_planned": "Zaplanowane",
    "mode_armed": "Planowanie",
    "mode_ready": "Gotowe",
    "mode_running": "Pracuje",
    "mode_on": "Włączone",
    "mode_off": "Wyłączone",
    "mode_inactive": "Nieaktywne",
    "mode_paused": "Pauza",
    "more": "Dowiedz się więcej",
    "endShort": "koniec",
    "reasons": {
      "pv_surplus": "Nadwyżka PV wystarcza",
      "surplus_budget": "Brak wolnej nadwyżki dla tego urządzenia",
      "surplus_unavailable": "Brak sygnału nadwyżki",
      "surplus_not_stable": "Nadwyżka jeszcze niestabilna",
      "cheapest_hour": "Tania godzina",
      "not_cheapest_hour": "To nie jedna z najtańszych godzin",
      "price_below": "Cena poniżej limitu",
      "price_above_limit": "Cena powyżej limitu",
      "price_unavailable": "Brak ceny",
      "battery_ok": "Bateria wystarcza",
      "battery_low": "Bateria zbyt słaba",
      "soc_unavailable": "Brak stanu baterii",
      "in_window": "W oknie czasowym",
      "outside_window": "Poza oknem czasowym",
      "all_met": "Wszystkie warunki spełnione",
      "none_met": "Żaden warunek nie jest spełniony",
      "no_conditions": "Nie wpisano warunku",
      "min_runtime": "Minimalny czas pracy trwa",
      "min_off_time": "Minimalna przerwa trwa",
      "cycle_limit": "Zbyt wiele przełączeń w ostatniej godzinie",
      "one_start_per_cycle": "Jeden start na cykl",
      "manual_override": "Przełączone ręcznie, sterowanie wstrzymane",
      "entity_unavailable": "Urządzenie jest niedostępne",
      "inactive": "Sterowanie nieaktywne",
      "license_required": "Wymagana licencja Premium",
      "waiting_for_arm": "Czeka na „Załadowane, planuj”",
      "planned": "Start zaplanowany",
      "deadline_too_tight": "Termin zbyt krótki, start od razu",
      "forecast_unavailable": "Brak prognozy PV",
      "waiting_ready": "Czeka na zwolnienie na urządzeniu",
      "program_running": "Program pracuje",
      "pending": "Sprawdzanie",
      "planned_start": "Zaplanowany start",
      "user": "Przez Ciebie",
      "ready_entity": "Zwolnienie na urządzeniu",
      "invalid_program": "Nieprawidłowe dane programu"
    }
  }
};

const LOADS_REFRESH_MS = 60000;
const LOADS_ICONS = { program: "dishwasher", switchable: "power-plug-outline" };

class SfmlLoadsCard extends HTMLElement {
  setConfig(config) {
    if (config && config.devices !== undefined && !Array.isArray(config.devices)) {
      throw new Error("devices must be a list of device ids");
    }
    this._config = config || {};
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) this.initCard();
    const now = Date.now();
    if (!this._lastUpdate || now - this._lastUpdate > LOADS_REFRESH_MS) {
      this._lastUpdate = now;
      this.updateData();
    }
  }

  get _locale() {
    return this._hass?.locale?.language || this._hass?.language || "en";
  }

  get _lang() {
    const code = String(this._locale || "en").toLowerCase().slice(0, 2);
    return code === "de" || code === "pl" ? code : "en";
  }

  _t(key, vars = {}) {
    const text = LOADS_TEXT[this._lang][key] ?? LOADS_TEXT.en[key] ?? key;
    return String(text).replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "");
  }

  _reason(code) {
    const reasons = LOADS_TEXT[this._lang].reasons || LOADS_TEXT.en.reasons;
    return reasons[code] || LOADS_TEXT.en.reasons[code] || "";
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

  _power(watts) {
    const w = this._finite(watts);
    if (w == null) return "–";
    return Math.abs(w) >= 1000 ? `${this._num(w / 1000, 2)} kW` : `${Math.round(w)} W`;
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
    this._busy = {};
    this._errors = {};
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
          border-top: 1px solid var(--l-divider);
          font-size: 11px;
          color: var(--l-muted);
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
          --l-text: var(--primary-text-color, #212121);
          --l-muted: var(--secondary-text-color, #727272);
          --l-divider: var(--divider-color, rgba(127, 127, 127, 0.2));
          --l-solar: var(--energy-solar-color, #ff9800);
          --l-plan: #2a90e0;
          --l-ready: #e0a800;
          --l-good: var(--success-color, #43a047);
          --l-bg: var(--ha-card-background, var(--card-background-color, #fff));
        }
        ha-card {
          position: relative;
          overflow: hidden;
          container-type: inline-size;
        }
        .glow {
          position: absolute;
          top: -45%;
          right: -25%;
          width: 75%;
          aspect-ratio: 1;
          border-radius: 50%;
          background: radial-gradient(circle, color-mix(in srgb, var(--l-solar) 20%, transparent) 0%, transparent 65%);
          pointer-events: none;
          animation: breathe 8s ease-in-out infinite alternate;
        }
        .content {
          position: relative;
          padding: 16px;
          color: var(--l-text);
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 12px;
        }
        .live-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          color: var(--l-solar);
          background: color-mix(in srgb, var(--l-solar) 14%, transparent);
        }
        .live-chip[hidden] {
          display: none;
        }
        .live-chip.demo {
          color: var(--l-muted);
          background: color-mix(in srgb, var(--l-muted) 14%, transparent);
        }
        .live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: currentColor;
          animation: ping 2s ease-out infinite;
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
          background: color-mix(in srgb, var(--l-text) 6%, transparent);
        }
        .chip span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .chip ha-icon {
          --mdc-icon-size: 15px;
          flex: none;
          color: var(--l-muted);
        }
        .devices {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .device {
          container-type: inline-size;
          position: relative;
          overflow: hidden;
          min-width: 0;
          padding: 12px;
          border-radius: 16px;
          border: 1px solid var(--l-divider);
          background: linear-gradient(160deg,
            color-mix(in srgb, var(--tone) 16%, transparent),
            color-mix(in srgb, var(--tone) 3%, transparent));
          --tone: var(--l-muted);
        }
        .device.plan { --tone: var(--l-plan); border-color: color-mix(in srgb, var(--l-plan) 40%, transparent); }
        .device.ready { --tone: var(--l-ready); border-color: color-mix(in srgb, var(--l-ready) 50%, transparent); }
        .device.run { --tone: var(--l-good); }
        .device-head {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px 6px;
          min-width: 0;
          font-size: 14px;
          font-weight: 600;
        }
        .device-head .name {
          flex: 1 1 auto;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .device-head ha-icon {
          --mdc-icon-size: 18px;
          flex: none;
          color: var(--tone);
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
          color: var(--tone);
          background: color-mix(in srgb, var(--tone) 16%, transparent);
        }
        .value {
          margin-top: 8px;
          font-size: clamp(28px, 16cqw, 34px);
          font-weight: 600;
          line-height: 1;
          letter-spacing: -1px;
          font-variant-numeric: tabular-nums;
        }
        .value small {
          font-size: 0.45em;
          font-weight: 500;
          letter-spacing: 0;
          color: var(--l-muted);
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
        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }
        .actions button {
          font: inherit;
          font-size: 12px;
          font-weight: 600;
          color: inherit;
          cursor: pointer;
          background: color-mix(in srgb, var(--l-bg) 70%, transparent);
          border: 1px solid color-mix(in srgb, var(--tone) 45%, transparent);
          border-radius: 8px;
          min-height: 28px;
          padding: 2px 10px;
        }
        .actions button.go {
          color: #fff;
          background: #f5902f;
          border-color: #f5902f;
        }
        .actions button:focus-visible {
          outline: 2px solid var(--tone);
        }
        .actions button[disabled] {
          opacity: 0.45;
          cursor: default;
        }
        .error {
          margin-top: 4px;
          font-size: 11px;
          color: var(--error-color, #db4437);
        }
        .state {
          padding: 28px 0;
          text-align: center;
          color: var(--l-muted);
          font-size: 14px;
        }
        .state strong {
          display: block;
          color: var(--l-text);
          margin-bottom: 4px;
        }
        .demo-note {
          margin: -4px 0 12px;
          font-size: 12px;
          color: var(--l-muted);
        }
        @keyframes breathe {
          from { opacity: 0.55; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1.05); }
        }
        @keyframes ping {
          0% { box-shadow: 0 0 0 0 color-mix(in srgb, currentColor 55%, transparent); }
          100% { box-shadow: 0 0 0 8px transparent; }
        }
        @container (max-width: 420px) {
          .header { flex-wrap: wrap; row-gap: 8px; }
          .live-chip { margin-left: 52px; }
          .devices { grid-template-columns: 1fr; }
        }
        @media (prefers-reduced-motion: reduce) {
          .glow, .live-dot { animation: none; }
        }
      </style>
      <ha-card>
        <div class="brand-stripe"></div>
        <div class="glow"></div>
        <div class="content">
          <div class="header">
            <div class="brand">
              <img class="brand-icon" alt="Solar Forecast ML">
              <div class="brand-copy">
                <span class="title-text"></span>
                <span class="wordmark"><span class="wm-solar">Solar </span><span class="wm-forecast">Forecast ML</span></span>
              </div>
            </div>
            <div class="live-chip" hidden><span class="live-dot"></span><span class="live-val"></span></div>
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
    this.shadowRoot.querySelector(".brand-icon").src = LOADS_BRAND_ICON;
    this.shadowRoot.querySelector(".tagline").textContent = this._t("tagline");
    this.shadowRoot.querySelector(".brand-link").href = LOADS_BRAND_URL[this._lang];
    this.shadowRoot.querySelector(".state").textContent = this._t("loading");
    this.container = this.shadowRoot.querySelector(".body");
    this.liveChip = this.shadowRoot.querySelector(".live-chip");
    this.container.addEventListener("click", (event) => this._onClick(event));
  }

  async updateData() {
    if (!this._hass || !this.container) return;
    try {
      const response = await this._hass.callApi("GET", "sfml_stats/loads/status");
      if (!response?.success) {
        if (!this._data) this._showState(this._t("error"));
        return;
      }
      this._data = response.data || {};
      this.render();
    } catch (err) {
      console.error("SFML Loads Card fetch error:", err);
      if (!this._data) this._showState(this._t("error"));
    }
  }

  _showState(text, title = "") {
    this.container.innerHTML = `<div class="state">${title ? `<strong>${this._escape(title)}</strong>` : ""}${this._escape(text)}</div>`;
  }

  _devices() {
    const all = Array.isArray(this._data?.consumers) ? this._data.consumers : [];
    const wanted = this._config.devices;
    if (!Array.isArray(wanted) || !wanted.length) return all;
    return wanted.map((id) => all.find((d) => d.id === String(id))).filter(Boolean);
  }

  get _live() {
    return this._data?.mode === "live" && this._data?.licensed === true;
  }

  // Tone and pill follow the page states: planned blue, ready amber, running green, rest muted
  _look(device) {
    if (!device.active) return { tone: "", mode: "mode_inactive" };
    if (device.paused) return { tone: "ready", mode: "mode_paused" };
    if (device.kind === "program") {
      if (device.state === "started") return { tone: "run", mode: "mode_running" };
      if (device.state === "planned") return { tone: "plan", mode: "mode_planned" };
      if (device.state === "armed") return { tone: "plan", mode: "mode_armed" };
      return { tone: "ready", mode: "mode_ready" };
    }
    return device.is_on ? { tone: "run", mode: "mode_on" } : { tone: "", mode: "mode_off" };
  }

  _nextStart(devices) {
    const stamps = devices
      .filter((d) => d.active)
      .map((d) => (d.kind === "program" ? (d.plan || d.preview)?.start : (!d.is_on ? d.next_window?.start : null)))
      .map((iso) => ({ iso, at: Date.parse(iso) }))
      .filter((item) => Number.isFinite(item.at) && item.at >= Date.now() - 3600000)
      .sort((a, b) => a.at - b.at);
    return stamps.length ? stamps[0].iso : null;
  }

  render() {
    const data = this._data || {};
    const devices = this._devices();
    const inputs = data.inputs || {};
    const surplus = this._finite(inputs.surplus_w);
    if (data.mode === "demo") {
      this.liveChip.className = "live-chip demo";
      this.liveChip.querySelector(".live-val").textContent = this._t("demo");
      this.liveChip.hidden = false;
    } else if (surplus != null) {
      this.liveChip.className = "live-chip";
      this.liveChip.querySelector(".live-val").textContent = this._t("surplus", { v: this._power(surplus) });
      this.liveChip.hidden = false;
    } else {
      this.liveChip.hidden = true;
    }
    if (!devices.length) {
      this._showState(this._t("emptyHint"), this._t("empty"));
      return;
    }
    const chips = [];
    const price = this._finite(inputs.price_ct_kwh);
    if (price != null) chips.push(this._chip("cash", this._t("priceNow", { v: this._num(price) })));
    const next = this._nextStart(devices);
    if (next) chips.push(this._chip("clock-outline", this._t("nextStart", { t: this._time(next) })));
    const battery = this._finite(inputs.battery_soc);
    if (battery != null) chips.push(this._chip("battery-70", this._t("battery", { v: Math.round(battery) })));
    this.container.innerHTML = `
      ${data.mode === "demo" ? `<div class="demo-note">${this._escape(this._t("demoHint"))}</div>` : ""}
      ${chips.length ? `<div class="context">${chips.join("")}</div>` : ""}
      <div class="devices">${devices.map((d) => this._deviceHtml(d)).join("")}</div>
    `;
  }

  _chip(icon, text) {
    return `<span class="chip"><ha-icon icon="mdi:${icon}"></ha-icon><span>${this._escape(text)}</span></span>`;
  }

  _deviceHtml(device) {
    const look = this._look(device);
    const id = this._escape(device.id);
    const value = this._valueHtml(device);
    const why = this._why(device);
    const busy = this._busy[device.id] || !this._live;
    let actions = "";
    if (device.kind === "program" && device.active) {
      if (device.state === "idle" || device.state === "done") {
        actions = `<button type="button" class="go" data-arm="${id}" ${busy ? "disabled" : ""}>${this._escape(this._t("arm"))}</button>`;
      } else if (device.state === "armed" || device.state === "planned") {
        actions = `<button type="button" data-disarm="${id}" ${busy ? "disabled" : ""}>${this._escape(this._t("disarm"))}</button>`;
      }
    }
    return `
      <div class="device ${look.tone}">
        <div class="device-head">
          <ha-icon icon="mdi:${LOADS_ICONS[device.kind] || "power-plug-outline"}"></ha-icon>
          <span class="name">${this._escape(device.name)}</span>
          <span class="mode">${this._escape(this._t(look.mode))}</span>
        </div>
        <div class="value">${value}</div>
        <div class="why"><ha-icon icon="mdi:${why.icon}"></ha-icon><span>${this._escape(why.text)}</span></div>
        ${actions ? `<div class="actions">${actions}</div>` : ""}
        ${this._errors[device.id] ? `<div class="error">${this._escape(this._t(this._errors[device.id]))}</div>` : ""}
      </div>`;
  }

  _valueHtml(device) {
    const small = (text) => `<small>${this._escape(text)}</small>`;
    if (!device.active) return `– ${small(this._t("noSwitch"))}`;
    if (device.kind === "program") {
      const plan = device.plan;
      if (device.state === "started" && plan?.end) return `${this._time(plan.end)} ${small(this._t("endShort"))}`;
      if (device.state === "planned" && plan?.start) {
        return `${this._time(plan.start)} ${small(this._t("until", { t: this._time(plan.end) }))}`;
      }
      if (device.state === "armed") return `– ${small(this._t("beingPlanned"))}`;
      return `– ${small(this._t("notPlanned"))}`;
    }
    if (device.is_on) {
      const watts = this._finite(device.nominal_power_w);
      if (watts == null) return "–";
      return watts >= 1000 ? `${this._num(watts / 1000)} ${small("kW")}` : `${Math.round(watts)} ${small("W")}`;
    }
    if (device.next_window?.start) return `${this._time(device.next_window.start)} ${small(this._t("nextShort"))}`;
    return "–";
  }

  _why(device) {
    if (!device.active) return { icon: "pause-circle-outline", text: this._t("inactiveWhy") };
    if (device.kind === "program") {
      if (device.state === "planned") {
        const goal = this._t(`objective_${device.objective || "both"}`);
        const finish = device.deadline ? ` · ${this._t("finishBy", { t: device.deadline })}` : "";
        return { icon: device.objective === "pv" ? "solar-power-variant" : "cash", text: `${goal}${finish}` };
      }
      if ((device.state === "idle" || device.state === "done") && device.has_door) {
        return {
          icon: "door",
          text: this._t("door", { n: device.door_opens ?? 0, m: device.door_openings ?? 2 }),
        };
      }
      if ((device.state === "idle" || device.state === "done") && device.preview?.start) {
        return { icon: "clock-outline", text: this._t("wouldStart", { t: this._time(device.preview.start) }) };
      }
    }
    const icon = device.reason === "pv_surplus" ? "solar-power-variant" : "information-outline";
    return { icon, text: this._reason(device.reason) || "" };
  }

  _onClick(event) {
    const arm = event.target.closest("[data-arm]");
    if (arm && !arm.disabled) {
      this._act(arm.dataset.arm, "arm");
      return;
    }
    const disarm = event.target.closest("[data-disarm]");
    if (disarm && !disarm.disabled) this._act(disarm.dataset.disarm, "disarm");
  }

  // hass.callApi rejects with the parsed error body; 403 control_denied means missing HA control rights
  _errorKey(err) {
    const code = err?.body?.error?.code || err?.error?.code;
    return code === "control_denied" ? "noPermission" : "saveFailed";
  }

  async _act(deviceId, action) {
    if (this._busy[deviceId]) return;
    this._busy[deviceId] = true;
    delete this._errors[deviceId];
    this.render();
    try {
      await this._hass.callApi("POST", `sfml_stats/loads/consumers/${encodeURIComponent(deviceId)}/${action}`, {});
    } catch (err) {
      console.error("SFML Loads Card action error:", err);
      this._errors[deviceId] = this._errorKey(err);
    } finally {
      this._busy[deviceId] = false;
    }
    await this.updateData();
    this.render();
  }

  // Sections view: always span the full section width, height follows the content
  getGridOptions() {
    return { columns: 12, min_columns: 6, rows: "auto" };
  }

  getCardSize() {
    return 5;
  }

  static getStubConfig() {
    return {};
  }
}

if (!customElements.get("sfml-loads-card")) customElements.define("sfml-loads-card", SfmlLoadsCard);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "sfml-loads-card")) {
  const code = (document.documentElement.lang || navigator.language || "en").toLowerCase().slice(0, 2);
  const cardLang = code === "de" || code === "pl" ? code : "en";
  window.customCards.push({
    type: "sfml-loads-card",
    name: ({ de: "Solar Forecast ML – Verbraucher", en: "Solar Forecast ML – Smart loads", pl: "Solar Forecast ML – Odbiorniki" })[cardLang],
    preview: true,
    description: ({ de: "Geräte, die nach PV-Überschuss und Strompreis schalten, mit Startzeit, Grund und „Jetzt planen“ – von Solar Forecast ML.", en: "Devices switched by PV surplus and electricity price, with start time, reason and “Plan now” – by Solar Forecast ML.", pl: "Urządzenia włączane według nadwyżki PV i ceny prądu, z godziną startu, powodem i „Planuj teraz” – od Solar Forecast ML." })[cardLang],
    documentationURL: "https://www.solarforecastml.com/",
  });
}
