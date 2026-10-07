// SFML Power Price & Smart Charging Lovelace Card
// (C) 2026 Zara-Toorox

// Solar Forecast ML brand mark (96 px WebP of brand/icon@2x.png), inlined so the card needs no extra asset
const PRICE_BRAND_ICON = "data:image/webp;base64,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";
const PRICE_BRAND_URL = { de: "https://www.solarforecastml.com/de/", en: "https://www.solarforecastml.com/en/" };

// Status and reason wording mirrors i18n/locales.js (smart_charging.status / smart_charging.reasons)
const PRICE_SC_TEXT = {
  "de": {
    "reasons": {
      "soc_unavailable": "Der Akkustand fehlt, deshalb gibt es keine Netzladung.",
      "soc_unavailable_force_charge_blocked": "Der Akkustand fehlt, deshalb gibt es keine Netzladung.",
      "soc_unavailable_standard_charge_blocked": "Der Akkustand fehlt, deshalb gibt es keine Netzladung.",
      "disabled": "Die Netzladung ist ausgeschaltet.",
      "unknown": "Der Grund wird noch ermittelt.",
      "standard_charge_below_target_continuous": "Es ist Nacht, die Stunde ist günstig und die Netzladung läuft weiter.",
      "standard_charge_below_target_start": "Es ist Nacht, die Stunde ist günstig und die Netzladung startet.",
      "daytime_standard_charge_disabled": "Tagsüber bleibt dieser Weg aus, damit Platz für die Sonne bleibt.",
      "price_too_high": "Diese Stunde ist nicht günstig.",
      "price_above_threshold": "Diese Stunde ist nicht günstig.",
      "price_unavailable": "Der Preis fehlt oder ist von der vorigen Stunde, deshalb bleibt die Netzladung aus.",
      "price_demo": "Beispieldaten, deshalb bleibt die Netzladung aus.",
      "soc_reached_target_or_hysteresis": "Der Akkustand hat den Zielstand erreicht.",
      "later_grid_import_is_cheaper": "Später aus dem Netz zu beziehen ist billiger als jetzt zu speichern.",
      "later_cheap_slots_insufficient_capacity": "Späterer, billigerer Netzbezug reicht nicht für die ganze Ladung.",
      "charge_now_avoids_costlier_later_import": "Bis der Bedarf gedeckt ist, gibt es keine günstigere Stunde.",
      "forecast_covers_expected_demand": "Akku und Sonne reichen für die nächsten anderthalb Tage.",
      "economic_input_unavailable": "Für die Ladeentscheidung fehlen Angaben.",
      "forecast_data_unavailable": "Akkustand, Verbrauch oder Solarprognose fehlen.",
      "charge_window_unavailable": "In dieser Stunde lässt sich keine Netzladung ausführen.",
      "future_price_forecast_unavailable": "Für die kommenden Stunden liegt kein nutzbarer Strompreis vor.",
      "demand_deadline_unavailable_charge_now": "Ohne Zeitraum für den Bedarf wird in dieser günstigen Stunde geladen.",
      "smart_charging_disabled": "Die Netzladung ist ausgeschaltet.",
      "force_price_charge_start": "Der Preis liegt unter dem Force-Preis, der Akku lädt bis zur Obergrenze.",
      "force_price_charge_continuous": "Der Preis liegt unter dem Force-Preis, der Akku lädt bis zur Obergrenze.",
      "band_charge_below_target_start": "Die Stunde ist günstig, der Akkustand liegt unter dem Zielstand und die Netzladung startet.",
      "band_charge_below_target_continuous": "Die Stunde ist günstig, der Akkustand liegt unter dem Zielstand und die Netzladung läuft weiter.",
      "band_soc_reached": "Der Akkustand hat den Zielstand erreicht.",
      "band_force_below_max_soc_start": "Der Preis liegt unter dem Force-Preis, der Akku lädt bis zur Obergrenze.",
      "band_force_below_max_soc_continuous": "Der Preis liegt unter dem Force-Preis, der Akku lädt bis zur Obergrenze.",
      "gpm_unavailable": "Ohne Grid Price Monitor bleibt die Netzladung aus.",
      "battery_capacity_missing": "Die Batteriekapazität fehlt, deshalb gibt es keine Netzladung."
    },
    "status": {
      "charging": "Lädt aus dem Netz",
      "idle": "Lädt nicht",
      "nextHour": "Nächste günstige Stunde ab {time}.",
      "nextHourThen": "Nächste günstige Stunde ab {time}. Lädt dann bis {soc} %.",
      "stopSoc": "Stopp bei {soc} % oder zum Stundenende.",
      "stopHour": "Stopp zum Stundenende.",
      "observe": "Beobachten schaltet nicht.",
      "demoBadge": "Beispieldaten"
    }
  },
  "en": {
    "reasons": {
      "soc_unavailable": "The battery level is missing, so there is no grid charging.",
      "soc_unavailable_force_charge_blocked": "The battery level is missing, so there is no grid charging.",
      "soc_unavailable_standard_charge_blocked": "The battery level is missing, so there is no grid charging.",
      "disabled": "Grid charging is turned off.",
      "unknown": "The reason is still being determined.",
      "standard_charge_below_target_continuous": "It is night, the hour is cheap, and grid charging continues.",
      "standard_charge_below_target_start": "It is night, the hour is cheap, and grid charging starts.",
      "daytime_standard_charge_disabled": "During the day this path stays off, so there is room for the sun.",
      "price_too_high": "This hour is not a cheap hour.",
      "price_above_threshold": "This hour is not a cheap hour.",
      "price_unavailable": "The price is missing or from the previous hour, so grid charging stays off.",
      "price_demo": "Sample data, so grid charging stays off.",
      "soc_reached_target_or_hysteresis": "The battery has reached the target level.",
      "later_grid_import_is_cheaper": "Buying from the grid later is cheaper than storing now.",
      "later_cheap_slots_insufficient_capacity": "Cheaper grid import later is not enough for the whole charge.",
      "charge_now_avoids_costlier_later_import": "Until the demand is covered, there is no cheaper hour.",
      "forecast_covers_expected_demand": "Battery and sun cover the next day and a half.",
      "economic_input_unavailable": "Some figures for the charging decision are missing.",
      "forecast_data_unavailable": "Battery level, consumption, or the solar forecast is missing.",
      "charge_window_unavailable": "Grid charging cannot run in this hour.",
      "future_price_forecast_unavailable": "No usable electricity price is available for the coming hours.",
      "demand_deadline_unavailable_charge_now": "With no period for the demand, this cheap hour is used.",
      "smart_charging_disabled": "Grid charging is turned off.",
      "force_price_charge_start": "The price is below the force price, so the battery charges to the ceiling.",
      "force_price_charge_continuous": "The price is below the force price, so the battery charges to the ceiling.",
      "band_charge_below_target_start": "The hour is cheap, the battery is below the target level, and grid charging starts.",
      "band_charge_below_target_continuous": "The hour is cheap, the battery is below the target level, and grid charging continues.",
      "band_soc_reached": "The battery has reached the target level.",
      "band_force_below_max_soc_start": "The price is below the force price, so the battery charges to the ceiling.",
      "band_force_below_max_soc_continuous": "The price is below the force price, so the battery charges to the ceiling.",
      "gpm_unavailable": "Without Grid Price Monitor there is no grid charging.",
      "battery_capacity_missing": "Battery capacity is missing, so there is no grid charging."
    },
    "status": {
      "charging": "Charging from the grid",
      "idle": "Not charging from the grid",
      "nextHour": "Next cheap hour from {time}.",
      "nextHourThen": "Next cheap hour from {time}. Then charges up to {soc}%.",
      "stopSoc": "Stops at {soc}% or at the end of the hour.",
      "stopHour": "Stops at the end of the hour.",
      "observe": "Observe never switches.",
      "demoBadge": "Sample data"
    }
  }
};

const PRICE_TEXT = {
  de: {
    title: "Strompreis & Laden",
    tagline: "Preise aus Grid Price Monitor",
    now: "Jetzt",
    perKwh: "ct/kWh",
    cheapNow: "Günstige Stunde",
    forceNow: "Unter Force-Preis",
    notCheap: "Nicht günstig",
    range: "Nächste 24 h: {min} – {max} ct",
    lowest: "Tiefster Preis",
    cheapHours: "Günstige Stunden",
    cheapHoursValue: "{n} in 24 h",
    none: "keine",
    chart: "Preisverlauf 48 h",
    legendCheap: "Günstig",
    legendForce: "Force-Preis",
    legendCharged: "Netzladung",
    threshold: "Grenze",
    force: "Force",
    today: "Heute",
    tomorrow: "Morgen",
    clock: "{h} Uhr",
    charged: "Geladen",
    avgPrice: "Ø Ladepreis",
    savings: "Ersparnis",
    soc: "Akku",
    target: "Ziel {v} %",
    noGpm: "Strompreise benötigen den Grid Price Monitor.",
    error: "Strompreisdaten nicht erreichbar.",
    loading: "Lade Strompreise …",
  },
  en: {
    title: "Power price & charging",
    tagline: "Prices from Grid Price Monitor",
    now: "Now",
    perKwh: "ct/kWh",
    cheapNow: "Cheap hour",
    forceNow: "Below force price",
    notCheap: "Not cheap",
    range: "Next 24 h: {min} – {max} ct",
    lowest: "Lowest price",
    cheapHours: "Cheap hours",
    cheapHoursValue: "{n} in 24 h",
    none: "none",
    chart: "48 h price curve",
    legendCheap: "Cheap",
    legendForce: "Force price",
    legendCharged: "Grid charging",
    threshold: "Limit",
    force: "Force",
    today: "Today",
    tomorrow: "Tomorrow",
    clock: "{h}:00",
    charged: "Charged",
    avgPrice: "Avg. price",
    savings: "Savings",
    soc: "Battery",
    target: "Target {v} %",
    noGpm: "Power prices need the Grid Price Monitor.",
    error: "Power price data unavailable.",
    loading: "Loading power prices …",
  },
};

// The dashboard endpoint aggregates history and yearly figures; prices change hourly
const PRICE_REFRESH_MS = 5 * 60 * 1000;
const PRICE_CHART_W = 480;
const PRICE_CHART_H = 110;

class SfmlPriceCard extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this.initCard();
    }
    const now = Date.now();
    if (!this._lastUpdate || now - this._lastUpdate > PRICE_REFRESH_MS) {
      this._lastUpdate = now;
      this.updateData();
    }
  }

  get _locale() {
    return this._hass?.locale?.language || this._hass?.language || "en";
  }

  get _lang() {
    return this._locale.toLowerCase().startsWith("de") ? "de" : "en";
  }

  _t(key, vars = {}) {
    const text = PRICE_TEXT[this._lang][key] ?? PRICE_TEXT.en[key] ?? key;
    return text.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "");
  }

  _sc(group, key, vars = {}) {
    const text = PRICE_SC_TEXT[this._lang]?.[group]?.[key] ?? PRICE_SC_TEXT.en[group]?.[key];
    return text ? text.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "") : "";
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

  initCard() {
    this._initialized = true;
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
          border-top: 1px solid var(--p-divider);
          font-size: 11px;
          color: var(--p-muted);
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
          --p-text: var(--primary-text-color, #212121);
          --p-muted: var(--secondary-text-color, #727272);
          --p-divider: var(--divider-color, rgba(127, 127, 127, 0.2));
          --p-cheap: var(--success-color, #43a047);
          --p-force: #8353d1;
          --p-charge: var(--energy-battery-in-color, #f06292);
          --p-battery: var(--energy-battery-out-color, #4db6ac);
          --p-neutral: color-mix(in srgb, var(--p-text) 28%, transparent);
        }
        ha-card {
          position: relative;
          overflow: hidden;
          container-type: inline-size;
        }
        .content {
          padding: 16px;
          color: var(--p-text);
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 12px;
        }
        .demo {
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          color: var(--p-muted);
          background: color-mix(in srgb, var(--p-muted) 14%, transparent);
          white-space: nowrap;
        }
        .demo[hidden] {
          display: none;
        }

        .hero {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 14px;
          align-items: center;
          padding: 16px;
          border-radius: 16px;
          border: 1px solid color-mix(in srgb, var(--state) 40%, transparent);
          background: linear-gradient(135deg,
            color-mix(in srgb, var(--state) 16%, transparent),
            color-mix(in srgb, var(--state) 4%, transparent));
          --state: var(--p-neutral);
        }
        .hero.cheap { --state: var(--p-cheap); }
        .hero.force { --state: var(--p-force); }
        .state-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          color: #fff;
          background: var(--state);
        }
        .hero:not(.cheap):not(.force) .state-chip {
          color: var(--p-text);
          background: color-mix(in srgb, var(--p-text) 10%, transparent);
        }
        .state-chip ha-icon {
          --mdc-icon-size: 14px;
        }
        .price {
          margin-top: 8px;
          font-size: clamp(34px, 11cqw, 46px);
          font-weight: 600;
          line-height: 1;
          letter-spacing: -1px;
          font-variant-numeric: tabular-nums;
        }
        .price span {
          margin-left: 4px;
          font-size: 0.36em;
          font-weight: 500;
          letter-spacing: 0;
          color: var(--p-muted);
        }
        .scale {
          position: relative;
          height: 8px;
          margin-top: 12px;
          border-radius: 4px;
          background: linear-gradient(90deg, var(--p-cheap), #f2b705, var(--error-color, #db4437));
          opacity: 0.85;
        }
        .scale i {
          position: absolute;
          top: -4px;
          width: 4px;
          height: 16px;
          margin-left: -2px;
          border-radius: 2px;
          background: var(--p-text);
          box-shadow: 0 0 0 2px var(--ha-card-background, var(--card-background-color, #fff));
          transition: left 0.8s ease;
        }
        .scale-label {
          margin-top: 6px;
          font-size: 12px;
          color: var(--p-muted);
          font-variant-numeric: tabular-nums;
        }

        .soc {
          position: relative;
          width: clamp(92px, 26cqw, 116px);
          aspect-ratio: 1;
        }
        .soc svg {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }
        .soc-track {
          fill: none;
          stroke: color-mix(in srgb, var(--p-text) 12%, transparent);
          stroke-width: 8;
        }
        .soc-fill {
          fill: none;
          stroke: var(--p-battery);
          stroke-width: 8;
          stroke-linecap: round;
          transition: stroke-dasharray 1s ease;
        }
        .soc.charging .soc-fill {
          stroke: var(--p-charge);
          animation: breathe 2.4s ease-in-out infinite;
        }
        .soc-target {
          stroke: var(--p-text);
          stroke-width: 3;
          stroke-linecap: round;
        }
        .soc-center {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          line-height: 1.15;
        }
        .soc-center ha-icon {
          --mdc-icon-size: 20px;
          color: var(--p-battery);
        }
        .soc.charging .soc-center ha-icon {
          color: var(--p-charge);
        }
        .soc-val {
          font-size: 20px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }
        .soc-sub {
          font-size: 10px;
          color: var(--p-muted);
        }

        .status {
          display: flex;
          gap: 10px;
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          background: color-mix(in srgb, var(--p-text) 5%, transparent);
          font-size: 13px;
          line-height: 1.45;
        }
        .status ha-icon {
          --mdc-icon-size: 20px;
          flex: none;
          color: var(--p-muted);
        }
        .status.charging ha-icon {
          color: var(--p-charge);
        }
        .status strong {
          display: block;
        }
        .status span {
          color: var(--p-muted);
        }

        .facts {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-top: 12px;
        }
        .fact {
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid var(--p-divider);
          background: color-mix(in srgb, var(--p-text) 4%, transparent);
          min-width: 0;
        }
        .fact-label {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: var(--p-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .fact-label ha-icon {
          --mdc-icon-size: 15px;
          flex: none;
        }
        .fact-value {
          margin-top: 3px;
          font-size: 16px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-variant-numeric: tabular-nums;
        }
        .fact-value small {
          font-size: 12px;
          font-weight: 400;
          color: var(--p-muted);
        }
        .fact-value.cheap { color: var(--p-cheap); }
        .fact-value.save { color: var(--p-cheap); }

        .chart {
          margin-top: 16px;
        }
        .chart-title {
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 6px;
        }
        .chart svg {
          display: block;
          width: 100%;
          height: 120px;
          overflow: visible;
        }
        .bar-past { fill: color-mix(in srgb, var(--p-text) 16%, transparent); }
        .bar-future { fill: var(--p-neutral); }
        .bar-cheap { fill: var(--p-cheap); }
        .bar-force { fill: var(--p-force); }
        .bar-charged { fill: var(--p-charge); }
        .bar-now {
          stroke: var(--p-text);
          stroke-width: 1.5;
          vector-effect: non-scaling-stroke;
        }
        .ref {
          stroke-width: 1.2;
          stroke-dasharray: 4 3;
          vector-effect: non-scaling-stroke;
        }
        .ref.limit { stroke: var(--p-cheap); }
        .ref.force { stroke: var(--p-force); }
        .zero {
          stroke: var(--p-divider);
          stroke-width: 1;
          vector-effect: non-scaling-stroke;
        }
        .now-line {
          stroke: var(--p-text);
          stroke-width: 1;
          stroke-dasharray: 2 3;
          vector-effect: non-scaling-stroke;
          opacity: 0.5;
        }
        .axis {
          position: relative;
          height: 14px;
          margin-top: 4px;
          font-size: 11px;
          color: var(--p-muted);
          font-variant-numeric: tabular-nums;
        }
        .axis span {
          position: absolute;
          transform: translateX(-50%);
          white-space: nowrap;
        }
        .axis span.day {
          font-weight: 600;
          color: var(--p-text);
        }
        .legend {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 14px;
          margin-top: 6px;
          font-size: 11px;
          color: var(--p-muted);
        }
        .legend i {
          display: inline-block;
          width: 10px;
          height: 10px;
          margin-right: 5px;
          border-radius: 3px;
          vertical-align: -1px;
        }
        .legend .l-cheap { background: var(--p-cheap); }
        .legend .l-force { background: var(--p-force); }
        .legend .l-charged { background: var(--p-charge); }

        .kpis-title {
          margin-top: 14px;
          margin-bottom: 6px;
          font-size: 14px;
          font-weight: 500;
        }
        .kpis {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }
        .state {
          padding: 28px 0;
          text-align: center;
          color: var(--p-muted);
          font-size: 14px;
        }

        @container (max-width: 420px) {
          .header { flex-wrap: wrap; row-gap: 8px; }
          .demo { margin-left: 52px; }
        }
        @container (max-width: 380px) {
          .hero { grid-template-columns: 1fr; justify-items: start; }
          .soc { justify-self: center; }
          .kpis, .facts { grid-template-columns: 1fr; gap: 6px; }
          .kpis .fact, .facts .fact { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 12px; }
          .kpis .fact-value, .facts .fact-value { margin-top: 0; min-width: 0; }
          .kpis .fact-label, .facts .fact-label { flex: none; }
          .axis span.minor { display: none; }
        }
        @keyframes breathe {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        @media (prefers-reduced-motion: reduce) {
          .soc.charging .soc-fill { animation: none; }
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
            <div class="demo" hidden></div>
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
    this.shadowRoot.querySelector(".brand-icon").src = PRICE_BRAND_ICON;
    this.shadowRoot.querySelector(".tagline").textContent = this._t("tagline");
    this.shadowRoot.querySelector(".brand-link").href = PRICE_BRAND_URL[this._lang];
    this.shadowRoot.querySelector(".state").textContent = this._t("loading");
    this.container = this.shadowRoot.querySelector(".body");
    this.demoChip = this.shadowRoot.querySelector(".demo");
  }

  async updateData() {
    if (!this._hass || !this.container) return;
    try {
      const data = await this._hass.callApi("GET", "sfml_stats/smart_charging/dashboard");
      if (!data || !data.success) {
        if (!this._rendered) this._showState(this._t("error"));
        return;
      }
      this.render(data);
    } catch (err) {
      console.error("SFML Price Card fetch error:", err);
      if (!this._rendered) this._showState(this._t("error"));
    }
  }

  _showState(text) {
    this.container.innerHTML = `<div class="state"></div>`;
    this.container.firstElementChild.textContent = text;
  }

  _dayLabel(hourKey, todayKey) {
    const date = String(hourKey).slice(0, 10);
    if (date === todayKey) return this._t("today");
    const next = new Date(`${todayKey}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    if (date === next.toISOString().slice(0, 10)) return this._t("tomorrow");
    return new Intl.DateTimeFormat(this._locale, { weekday: "short", timeZone: "UTC" })
      .format(new Date(`${date}T12:00:00Z`));
  }

  render(data) {
    const live = data.live || {};
    const gpm = data.gpm || {};
    const plan = data.chart_plan || {};
    const history = Array.isArray(data.history) ? data.history : [];

    if (gpm.available === false && !gpm.is_demo) {
      this.demoChip.hidden = true;
      this._showState(this._t("noGpm"));
      this._rendered = true;
      return;
    }
    this.demoChip.hidden = !gpm.is_demo;
    this.demoChip.textContent = this._sc("status", "demoBadge");

    const price = this._finite(live.current_price);
    const limit = this._finite(plan.recommendation_threshold) ?? this._finite(plan.max_price_ct);
    const force = this._finite(plan.force_charge_price_ct);
    const nowIdx = history.reduce((idx, h, i) => (h.is_future ? idx : i), -1);
    const todayKey = nowIdx >= 0 ? String(history[nowIdx].hour_key).slice(0, 10) : "";

    // GPM owns "cheap": live.is_cheap / is_force_price for now, history[].is_cheap for future hours
    const stateClass = live.is_force_price ? "force" : live.is_cheap ? "cheap" : "";
    const stateText = live.is_force_price ? this._t("forceNow") : live.is_cheap ? this._t("cheapNow") : this._t("notCheap");
    const stateIcon = live.is_force_price ? "flash" : live.is_cheap ? "piggy-bank-outline" : "cash";

    const window24 = history.slice(Math.max(0, nowIdx)).map((h) => this._finite(h.price_ct_kwh)).filter((p) => p != null);
    const lo = window24.length ? Math.min(...window24) : null;
    const hi = window24.length ? Math.max(...window24) : null;
    const markerPos = price != null && lo != null && hi > lo ? ((price - lo) / (hi - lo)) * 100 : 50;

    const smcOn = Boolean(plan.enabled);
    const status = live.status || {};
    const charging = status.headline === "charging";

    this.container.innerHTML = `
      <div class="hero ${stateClass}">
        <div>
          <span class="state-chip"><ha-icon icon="mdi:${stateIcon}"></ha-icon>${stateText}</span>
          <div class="price">${price != null ? this._num(price) : "–"}<span>${this._t("perKwh")}</span></div>
          ${lo != null && hi != null
            ? `<div class="scale"><i style="left:${Math.min(100, Math.max(0, markerPos)).toFixed(1)}%"></i></div>
               <div class="scale-label">${this._t("range", { min: this._num(lo), max: this._num(hi) })}</div>`
            : ""}
        </div>
        ${smcOn ? this._socHtml(live, charging) : ""}
      </div>
      ${smcOn ? this._statusHtml(status, charging) : ""}
      ${this._factsHtml(history, nowIdx, todayKey)}
      ${this._chartHtml(history, nowIdx, limit, force, todayKey)}
      ${smcOn ? this._kpiHtml(data.kpis?.today) : ""}
    `;
    this._rendered = true;
  }

  _socHtml(live, charging) {
    const soc = this._finite(live.current_soc);
    if (soc == null) return "";
    const value = Math.max(0, Math.min(100, soc));
    const target = this._finite(live.target_soc);
    const r = 42;
    const circ = 2 * Math.PI * r;
    let targetMark = "";
    if (target != null && target > 0 && target <= 100) {
      const a = (target / 100) * 2 * Math.PI;
      const x1 = 50 + (r - 7) * Math.cos(a);
      const y1 = 50 + (r - 7) * Math.sin(a);
      const x2 = 50 + (r + 7) * Math.cos(a);
      const y2 = 50 + (r + 7) * Math.sin(a);
      targetMark = `<line class="soc-target" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
    }
    return `
      <div class="soc ${charging ? "charging" : ""}">
        <svg viewBox="0 0 100 100">
          <circle class="soc-track" cx="50" cy="50" r="${r}"/>
          <circle class="soc-fill" cx="50" cy="50" r="${r}"
            stroke-dasharray="${((value / 100) * circ).toFixed(1)} ${circ.toFixed(1)}"/>
          ${targetMark}
        </svg>
        <div class="soc-center">
          <ha-icon icon="mdi:${charging ? "battery-charging" : "battery"}"></ha-icon>
          <span class="soc-val">${Math.round(value)} %</span>
          <span class="soc-sub">${target != null ? this._t("target", { v: Math.round(target) }) : this._t("soc")}</span>
        </div>
      </div>`;
  }

  _statusHtml(status, charging) {
    const headline = this._sc("status", charging ? "charging" : "idle");
    const why = this._sc("reasons", status.why_code) || this._sc("reasons", "unknown");
    const next = status.next || {};
    let step = "";
    if (next.kind === "stop_soc") step = this._sc("status", "stopSoc", { soc: next.soc });
    else if (next.kind === "stop_hour") step = this._sc("status", "stopHour");
    else if (next.kind === "observe") step = this._sc("status", "observe");
    else if (next.kind === "next_hour") {
      const time = this._t("clock", { h: String(next.hour).padStart(2, "0") });
      step = next.soc != null
        ? this._sc("status", "nextHourThen", { time, soc: next.soc })
        : this._sc("status", "nextHour", { time });
    }
    return `
      <div class="status ${charging ? "charging" : ""}">
        <ha-icon icon="mdi:${charging ? "transmission-tower-import" : "timer-sand"}"></ha-icon>
        <div><strong>${headline}</strong><span>${why}${step ? ` ${step}` : ""}</span></div>
      </div>`;
  }

  _factsHtml(history, nowIdx, todayKey) {
    const ahead = history.slice(Math.max(0, nowIdx));
    const priced = ahead.filter((h) => this._finite(h.price_ct_kwh) != null);
    if (!priced.length) return "";
    const lowest = priced.reduce((a, b) => (Number(b.price_ct_kwh) < Number(a.price_ct_kwh) ? b : a));
    const cheapCount = ahead.filter((h) => h.is_future && h.is_cheap).length;
    const when = `${this._dayLabel(lowest.hour_key, todayKey)} ${this._t("clock", { h: String(lowest.hour).padStart(2, "0") })}`;
    return `
      <div class="facts">
        <div class="fact">
          <div class="fact-label"><ha-icon icon="mdi:arrow-collapse-down"></ha-icon>${this._t("lowest")}</div>
          <div class="fact-value">${this._num(lowest.price_ct_kwh)} <small>ct · ${when}</small></div>
        </div>
        <div class="fact">
          <div class="fact-label"><ha-icon icon="mdi:piggy-bank-outline"></ha-icon>${this._t("cheapHours")}</div>
          <div class="fact-value ${cheapCount ? "cheap" : ""}">${cheapCount ? this._t("cheapHoursValue", { n: cheapCount }) : this._t("none")}</div>
        </div>
      </div>`;
  }

  _chartHtml(history, nowIdx, limit, force, todayKey) {
    const points = history.map((h) => this._finite(h.price_ct_kwh));
    const priced = points.filter((p) => p != null);
    if (priced.length < 4) return "";

    const W = PRICE_CHART_W;
    const H = PRICE_CHART_H;
    const refs = [limit, force].filter((v) => v != null);
    const min = Math.min(0, ...priced, ...refs);
    const max = Math.max(...priced, ...refs, 1) * 1.08;
    const y = (v) => H - ((v - min) / (max - min)) * H;
    const step = W / history.length;
    const barW = Math.max(1.5, step * 0.72);
    const zeroY = y(0);

    const bars = history.map((h, i) => {
      const p = points[i];
      if (p == null) return "";
      const x = i * step + (step - barW) / 2;
      const top = Math.min(y(p), zeroY);
      const height = Math.max(1, Math.abs(zeroY - y(p)));
      let cls = h.is_future ? "bar-future" : "bar-past";
      if (!h.is_future && Number(h.grid_to_battery_kwh) > 0.01) cls = "bar-charged";
      else if (h.is_future && force != null && p <= force) cls = "bar-force";
      else if (h.is_future && h.is_cheap) cls = "bar-cheap";
      return `<rect class="${cls}${i === nowIdx ? " bar-now" : ""}" x="${x.toFixed(1)}" y="${top.toFixed(1)}"
        width="${barW.toFixed(1)}" height="${height.toFixed(1)}" rx="${Math.min(2, barW / 2).toFixed(1)}"/>`;
    }).join("");

    const refLine = (v, cls) => (v == null ? "" : `<line class="ref ${cls}" x1="0" x2="${W}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/>`);
    const nowX = nowIdx >= 0 ? (nowIdx + 1) * step : null;

    const labels = history.map((h, i) => {
      const hour = Number(h.hour);
      if (hour % 6 !== 0) return "";
      const left = ((i * step + step / 2) / W) * 100;
      if (left < 4 || left > 96) return "";
      return hour === 0
        ? `<span class="day" style="left:${left.toFixed(2)}%">${this._dayLabel(h.hour_key, todayKey)}</span>`
        : `<span class="${hour === 12 ? "" : "minor"}" style="left:${left.toFixed(2)}%">${String(hour).padStart(2, "0")}</span>`;
    }).join("");

    const hasCharged = history.some((h) => !h.is_future && Number(h.grid_to_battery_kwh) > 0.01);
    const hasCheap = history.some((h) => h.is_future && h.is_cheap);

    return `
      <div class="chart">
        <div class="chart-title">${this._t("chart")}</div>
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
          ${min < 0 ? `<line class="zero" x1="0" x2="${W}" y1="${zeroY.toFixed(1)}" y2="${zeroY.toFixed(1)}"/>` : ""}
          ${bars}
          ${refLine(limit, "limit")}
          ${refLine(force, "force")}
          ${nowX != null ? `<line class="now-line" x1="${nowX.toFixed(1)}" x2="${nowX.toFixed(1)}" y1="0" y2="${H}"/>` : ""}
        </svg>
        <div class="axis">${labels}</div>
        <div class="legend">
          ${hasCheap || limit != null ? `<span><i class="l-cheap"></i>${this._t("legendCheap")}${limit != null ? ` · ${this._t("threshold")} ${this._num(limit)} ct` : ""}</span>` : ""}
          ${force != null ? `<span><i class="l-force"></i>${this._t("legendForce")}${force != null ? ` ${this._num(force)} ct` : ""}</span>` : ""}
          ${hasCharged ? `<span><i class="l-charged"></i>${this._t("legendCharged")}</span>` : ""}
        </div>
      </div>`;
  }

  _kpiHtml(today) {
    if (!today) return "";
    const kwh = this._finite(today.charged_kwh) ?? 0;
    const avg = this._finite(today.avg_price_ct);
    const saved = this._finite(today.savings_eur) ?? 0;
    const euro = new Intl.NumberFormat(this._locale, { style: "currency", currency: "EUR" });
    return `
      <div class="kpis-title">${this._t("today")}</div>
      <div class="kpis">
        <div class="fact">
          <div class="fact-label"><ha-icon icon="mdi:battery-arrow-up-outline"></ha-icon>${this._t("charged")}</div>
          <div class="fact-value">${this._num(kwh, 2)} <small>kWh</small></div>
        </div>
        <div class="fact">
          <div class="fact-label"><ha-icon icon="mdi:tag-outline"></ha-icon>${this._t("avgPrice")}</div>
          <div class="fact-value">${kwh > 0 && avg != null ? `${this._num(avg)} <small>ct</small>` : "–"}</div>
        </div>
        <div class="fact">
          <div class="fact-label"><ha-icon icon="mdi:piggy-bank-outline"></ha-icon>${this._t("savings")}</div>
          <div class="fact-value ${saved > 0 ? "save" : ""}">${euro.format(saved)}</div>
        </div>
      </div>`;
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

if (!customElements.get("sfml-price-card")) customElements.define("sfml-price-card", SfmlPriceCard);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "sfml-price-card")) {
  const de = (document.documentElement.lang || navigator.language || "").toLowerCase().startsWith("de");
  window.customCards.push({
    type: "sfml-price-card",
    name: de ? "Solar Forecast ML – Strompreis & Laden" : "Solar Forecast ML – Power Price & Charging",
    preview: true,
    description: de
      ? "Aktueller Strompreis, günstige Stunden, 48-Stunden-Preisverlauf und Smart-Charging-Status – von Solar Forecast ML."
      : "Current power price, cheap hours, 48-hour price curve and smart charging status – by Solar Forecast ML.",
    documentationURL: "https://www.solarforecastml.com/",
  });
}
