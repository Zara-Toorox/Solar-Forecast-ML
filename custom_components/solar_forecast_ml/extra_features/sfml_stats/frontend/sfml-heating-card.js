// SFML Room Heating Lovelace Card
// (C) 2026 Zara-Toorox

// Solar Forecast ML brand mark (96 px WebP of brand/icon@2x.png), inlined so the card needs no extra asset
const HEATING_BRAND_ICON = "data:image/webp;base64,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";
const HEATING_BRAND_URL = { de: "https://www.solarforecastml.com/de/", en: "https://www.solarforecastml.com/en/", pl: "https://www.solarforecastml.com/en/" };

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
      "window_detected": "Offenes Fenster erkannt",
      "away_setback": "Absenkung wegen Abwesenheit",
      "vacation": "Urlaub",
      "boost": "Boost",
      "pv_lift": "Anhebung wegen PV-Überschuss",
      "price_lift": "Anhebung wegen günstigem Strom",
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
      "window_detected": "Open window detected",
      "away_setback": "Setback because nobody is home",
      "vacation": "Vacation",
      "boost": "Boost",
      "pv_lift": "Raised because of PV surplus",
      "price_lift": "Raised because power is cheap",
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
  },
  "pl": {
    "reasons": {
      "locked": "Licencja nieaktywna",
      "disabled": "Ogrzewanie jest wyłączone",
      "no_persons": "Nie wybrano osoby",
      "presence_home": "Ktoś jest w domu",
      "presence_unknown": "Obecność niejasna",
      "presence_pending": "Nieobecność trwa jeszcze za krótko",
      "presence_away": "Nikogo nie ma w domu",
      "window_open": "Okno otwarte",
      "window_detected": "Wykryto otwarte okno",
      "away_setback": "Obniżenie z powodu nieobecności",
      "vacation": "Urlop",
      "boost": "Boost",
      "pv_lift": "Podniesienie z powodu nadwyżki PV",
      "price_lift": "Podniesienie z powodu taniej energii",
      "comfort": "Temperatura zadana",
      "room_inactive": "Pomieszczenie jest tylko obserwowane",
      "thermostat_unavailable": "Termostat niedostępny",
      "hvac_off": "Termostat wyłączony",
      "range_setpoint": "Zakres zadany, nie pojedyncza wartość",
      "setpoint_unreadable": "Wartości zadanej nie da się odczytać",
      "within_band": "Już blisko celu",
      "same_value": "Ta wartość jest już ustawiona",
      "decrease_limited": "Obniżenie jest ograniczone czasowo",
      "increase_limited": "Podniesienie jeszcze czeka",
      "manual_override": "Zmieniono ręcznie, regulacja wstrzymana",
      "startup_hold": "Czeka po restarcie",
      "write_failed": "Termostat nie przyjął wartości zadanej",
      "schedule_setback": "Poza oknem czasowym",
      "hvac_switched": "Tryb został właśnie zmieniony",
      "mixed_reasons": "Kilka powodów",
      "outdoor_unavailable": "Temperatura zewnętrzna niedostępna",
      "outdoor_missing": "Nie wybrano temperatury zewnętrznej",
      "forecast_unavailable": "Prognoza niedostępna",
      "preheat": "Nagrzewanie wstępne",
      "awaiting_device": "Czeka na termostat",
      "device_not_responding": "Termostat nie odpowiada",
      "unknown": "Nieznany stan"
    },
    "seasonOnShort": "Wł.",
    "seasonOffShort": "Wył.",
    "seasonUnknown": "–",
    "modeAutoShort": "Automatyka",
    "modeScheduleShort": "Harmonogram",
    "modeCombinedShort": "Łączony",
    "modeObserve": "Obserwacja",
    "modePause": "Pauza",
    "modeAwaiting": "Czeka na urządzenie",
    "resume": "Przejmij ponownie",
    "keplerRoomLearning": "uczy się {heat}/3 · {cool}/3",
    "keplerRoomReady": "Nagrzewanie {rate} K/h · trzyma ciepło ~{hours} h",
    "hubbleMin": "Hubble · jutro min {temp} °C",
    "hubbleMissing": "Hubble · prognoza niedostępna",
    "preheatFor": "Nagrzewanie wstępne na {time}",
    "nextChange": "Następna zmiana",
    "premiumTitle": "Funkcja Premium jest zablokowana",
    "premiumText": "Ogrzewanie pomieszczeń wymaga aktywnej licencji Premium.",
    "outdoorNow": "Na zewnątrz teraz",
    "personHome": "w domu",
    "personAway": "poza domem",
    "emptyTitle": "Nie ma jeszcze pomieszczenia",
    "enableTitle": "Włącz w EAI",
    "enableText": "Włącz ogrzewanie pomieszczeń w kroku funkcji EAI.",
    "windowOpen": "Okno otwarte"
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
    boostTemp: "Boost",
    boostMinutes: "Dauer",
    boostStart: "Boost starten",
    boostStop: "Boost beenden",
    boostUntil: "Boost {temp} °C bis {time}",
    boost30: "30 min",
    boost60: "1 h",
    boost120: "2 h",
    boost240: "4 h",
    boost480: "8 h",
    boost1440: "24 h",
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
    boostTemp: "Boost",
    boostMinutes: "Duration",
    boostStart: "Start Boost",
    boostStop: "Stop Boost",
    boostUntil: "Boost {temp} °C until {time}",
    boost30: "30 min",
    boost60: "1 h",
    boost120: "2 h",
    boost240: "4 h",
    boost480: "8 h",
    boost1440: "24 h",
    loading: "Loading heating …",
    error: "Heating data unavailable.",
    at: "{time}",
  },
  pl: {
    title: "Ogrzewanie",
    tagline: "Regulacja pomieszczeń od Solar Forecast ML",
    seasonOn: "Sezon grzewczy włączony",
    seasonOff: "Sezon grzewczy wyłączony",
    home: "{n} w domu",
    nobodyHome: "Nikogo nie ma w domu",
    kepler: "Kepler · {room}: {text}",
    now: "teraz {v}°",
    setpoint: "Wartość zadana",
    comfort: "Temperatura zadana",
    more: "Dowiedz się więcej",
    premiumLead: "Każde pomieszczenie grzeje tylko wtedy, gdy ktoś jest – z nagrzewaniem wstępnym, wykrywaniem okna i modelem uczącym się.",
    saveFailed: "Nie udało się zapisać.",
    noPermission: "Brak uprawnień do tego pomieszczenia.",
    boostTemp: "Boost",
    boostMinutes: "Czas",
    boostStart: "Uruchom boost",
    boostStop: "Zakończ boost",
    boostUntil: "Boost {temp} °C do {time}",
    boost30: "30 min",
    boost60: "1 h",
    boost120: "2 h",
    boost240: "4 h",
    boost480: "8 h",
    boost1440: "24 h",
    loading: "Wczytywanie ogrzewania …",
    error: "Dane ogrzewania są niedostępne.",
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
    const code = String(this._locale || "en").toLowerCase().slice(0, 2);
    return code === "de" || code === "pl" ? code : "en";
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
        .boost {
          display: flex;
          flex-wrap: wrap;
          align-items: end;
          gap: 6px;
          margin-top: 8px;
          font-size: 12px;
        }
        .boost label {
          display: grid;
          gap: 2px;
        }
        .boost input, .boost select, .boost button {
          font: inherit;
          color: inherit;
          background: color-mix(in srgb, var(--h-bg) 70%, transparent);
          border: 1px solid color-mix(in srgb, var(--tone) 45%, transparent);
          border-radius: 8px;
          min-height: 28px;
          padding: 2px 6px;
        }
        .boost button {
          cursor: pointer;
          font-weight: 600;
        }
        .boost button:focus-visible, .boost input:focus-visible, .boost select:focus-visible {
          outline: 2px solid var(--tone);
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
        ${this._boostHtml(room)}
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

  _boostHtml(room) {
    const id = this._escape(room.id);
    if (room.boost_until != null && this._finite(room.boost_temp_c) != null) {
      return `<div class="boost"><span>${this._escape(this._t("boostUntil", {
        temp: this._num(room.boost_temp_c),
        time: this._time(room.boost_until),
      }))}</span><button type="button" data-boost-stop="${id}">${this._escape(this._t("boostStop"))}</button></div>`;
    }
    const temp = this._boostTemp?.[room.id] ?? this._finite(room.comfort_temp_c) ?? 21;
    const minutes = Number(this._boostMinutes?.[room.id] ?? 60);
    const options = [30, 60, 120, 240, 480, 1440].map((value) => (
      `<option value="${value}"${value === minutes ? " selected" : ""}>${this._escape(this._t(`boost${value}`))}</option>`
    )).join("");
    return `<div class="boost">
      <label>${this._escape(this._t("boostTemp"))}<input data-boost-temp="${id}" type="number" min="${HEATING_MIN_C}" max="${HEATING_MAX_C}" step="${HEATING_STEP_C}" value="${temp}"></label>
      <label>${this._escape(this._t("boostMinutes"))}<select data-boost-minutes="${id}">${options}</select></label>
      <button type="button" data-boost="${id}">${this._escape(this._t("boostStart"))}</button>
    </div>`;
  }

  _onClick(event) {
    const stop = event.target.closest("[data-boost-stop]");
    if (stop) {
      this._clearBoost(stop.dataset.boostStop);
      return;
    }
    const start = event.target.closest("[data-boost]");
    if (start) {
      this._startBoost(start.dataset.boost);
      return;
    }
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

  async _startBoost(roomId) {
    const temp = this.container?.querySelector(`[data-boost-temp="${CSS.escape(roomId)}"]`);
    const minutes = this.container?.querySelector(`[data-boost-minutes="${CSS.escape(roomId)}"]`);
    const tempC = Number(temp?.value);
    const duration = Number(minutes?.value);
    this._boostTemp = { ...(this._boostTemp || {}), [roomId]: tempC };
    this._boostMinutes = { ...(this._boostMinutes || {}), [roomId]: duration };
    try {
      await this._hass.callApi("POST", `sfml_stats/heating/rooms/${encodeURIComponent(roomId)}/boost`, {
        temp_c: tempC,
        minutes: duration,
      });
      if (this._errors) delete this._errors[roomId];
    } catch (err) {
      console.error("SFML Heating Card boost error:", err);
      this._errors = { ...(this._errors || {}), [roomId]: this._errorKey(err) };
    }
    await this.updateData();
    this.render();
  }

  async _clearBoost(roomId) {
    try {
      await this._hass.callApi("DELETE", `sfml_stats/heating/rooms/${encodeURIComponent(roomId)}/boost`);
      if (this._errors) delete this._errors[roomId];
    } catch (err) {
      console.error("SFML Heating Card boost error:", err);
      this._errors = { ...(this._errors || {}), [roomId]: this._errorKey(err) };
    }
    await this.updateData();
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
  const code = (document.documentElement.lang || navigator.language || "en").toLowerCase().slice(0, 2);
  const cardLang = code === "de" || code === "pl" ? code : "en";
  window.customCards.push({
    type: "sfml-heating-card",
    name: ({ de: "Solar Forecast ML – Heizung", en: "Solar Forecast ML – Heating", pl: "Solar Forecast ML – Ogrzewanie" })[cardLang],
    preview: true,
    description: ({ de: "Raumheizung mit Ist/Soll, Grund in Klartext, Wunschtemperatur und Verlauf je Raum – von Solar Forecast ML.", en: "Room heating with actual/target, plain-language reason, comfort temperature and trend per room – by Solar Forecast ML.", pl: "Ogrzewanie pomieszczeń: wynik i wartość zadana, powód zwykłym językiem, temperatura zadana i przebieg każdego pomieszczenia – od Solar Forecast ML." })[cardLang],
    documentationURL: "https://www.solarforecastml.com/",
  });
}
