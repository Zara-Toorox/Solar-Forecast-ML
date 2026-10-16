/**
 * Solar Forecast ML – Forecast trust card
 * How well the weather forecast fits the local station, learned by Solar Forecast EAI.
 */
const TRUST_BRAND_ICON = "data:image/webp;base64,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";
const TRUST_BRAND_URL = { de: "https://www.solarforecastml.com/de/", en: "https://www.solarforecastml.com/en/", pl: "https://www.solarforecastml.com/en/" };

const TRUST_TEXT = {
  de: {
    title: "Prognose-Vertrauen",
    tagline: "Wetterintelligenz von Solar Forecast ML",
    chipHigh: "Heute: hohe Sicherheit",
    chipMedium: "Heute: mittlere Sicherheit",
    chipLow: "Heute: geringe Sicherheit",
    chipLearning: "Lernt noch",
    heroLabel: "So genau trifft die Vorhersage deinen Ort",
    heroSub: "typische Abweichung der Temperatur in den nächsten 24 Stunden",
    h0: "0–6 h",
    h1: "6–24 h",
    h2: "1–3 Tage",
    trendImproving: "wird bei dir genauer",
    trendStable: "gleichbleibend genau",
    trendWorsening: "zuletzt ungenauer",
    lessons: "Was die Vorhersage bei dir lernt",
    temperature: "Temperatur",
    wind: "Wind",
    humidity: "Luftfeuchte",
    pressure: "Luftdruck",
    noOffset: "kein fester Versatz",
    measuredLess: "{value} weniger gemessen",
    measuredMore: "{value} mehr gemessen",
    typical: "typisch ± {value}",
    next: "Als Nächstes",
    noEvent: "Keine besonderen Wetterereignisse in Sicht",
    advisory: "Hinweis",
    warning: "Warnung",
    critical: "Unwetter",
    basis: "{count} Vergleiche je Messgröße mit deiner Wetterstation",
    learning: "Die Wetterintelligenz sammelt noch Vergleiche zwischen Vorhersage und deiner Messung. Die Karte füllt sich in den nächsten Tagen.",
    missing: "Prognose-Vertrauen benötigt Solar Forecast EAI mit Wetterdaten.",
    error: "Wetterintelligenz nicht verfügbar.",
    loading: "Lade Prognose-Vertrauen …",
  },
  en: {
    title: "Forecast trust",
    tagline: "Weather intelligence by Solar Forecast ML",
    chipHigh: "Today: high confidence",
    chipMedium: "Today: medium confidence",
    chipLow: "Today: low confidence",
    chipLearning: "Still learning",
    heroLabel: "How closely the forecast fits your location",
    heroSub: "typical temperature deviation over the next 24 hours",
    h0: "0–6 h",
    h1: "6–24 h",
    h2: "1–3 days",
    trendImproving: "getting more accurate for you",
    trendStable: "steadily accurate",
    trendWorsening: "less accurate lately",
    lessons: "What the forecast learns at your place",
    temperature: "Temperature",
    wind: "Wind",
    humidity: "Humidity",
    pressure: "Pressure",
    noOffset: "no fixed offset",
    measuredLess: "{value} lower measured",
    measuredMore: "{value} higher measured",
    typical: "typically ± {value}",
    next: "Up next",
    noEvent: "No notable weather events ahead",
    advisory: "Advisory",
    warning: "Warning",
    critical: "Severe",
    basis: "{count} comparisons per metric with your weather station",
    learning: "Weather intelligence is still collecting comparisons between the forecast and your measurements. The card fills up over the next days.",
    missing: "Forecast trust needs Solar Forecast EAI with weather data.",
    error: "Weather intelligence unavailable.",
    loading: "Loading forecast trust …",
  },
  pl: {
    title: "Zaufanie do prognozy",
    tagline: "Inteligencja pogodowa od Solar Forecast ML",
    chipHigh: "Dziś: wysoka pewność",
    chipMedium: "Dziś: średnia pewność",
    chipLow: "Dziś: niska pewność",
    chipLearning: "Wciąż się uczy",
    heroLabel: "Jak dokładnie prognoza trafia w twoją lokalizację",
    heroSub: "typowe odchylenie temperatury w ciągu najbliższych 24 godzin",
    h0: "0–6 h",
    h1: "6–24 h",
    h2: "1–3 dni",
    trendImproving: "u ciebie coraz dokładniejsza",
    trendStable: "stale dokładna",
    trendWorsening: "ostatnio mniej dokładna",
    lessons: "Czego prognoza uczy się u ciebie",
    temperature: "Temperatura",
    wind: "Wiatr",
    humidity: "Wilgotność",
    pressure: "Ciśnienie",
    noOffset: "brak stałego przesunięcia",
    measuredLess: "zmierzono o {value} mniej",
    measuredMore: "zmierzono o {value} więcej",
    typical: "typowo ± {value}",
    next: "Następnie",
    noEvent: "Brak szczególnych zjawisk pogodowych",
    advisory: "Informacja",
    warning: "Ostrzeżenie",
    critical: "Nawałnica",
    basis: "{count} porównań na wielkość z twoją stacją pogodową",
    learning: "Inteligencja pogodowa wciąż zbiera porównania prognozy z twoimi pomiarami. Karta wypełni się w najbliższych dniach.",
    missing: "Zaufanie do prognozy wymaga Solar Forecast EAI z danymi pogodowymi.",
    error: "Inteligencja pogodowa niedostępna.",
    loading: "Wczytywanie zaufania do prognozy …",
  },
};

const TRUST_REFRESH_MS = 15 * 60 * 1000;
const TRUST_NEAR = ["0_6h", "6_24h"];
const TRUST_ALL = ["0_6h", "6_24h", "24_72h"];
// Display thresholds on the 0–24 h temperature MAE in °C
const TRUST_HIGH_MAE = 1.5;
const TRUST_MEDIUM_MAE = 2.5;
const TRUST_MIN_QUALITY = 60;
// A bias counts as a fixed offset only when it is at least half the typical error and above a floor
const TRUST_METRICS = [
  { key: "temperature_c", label: "temperature", unit: "°C", digits: 1, floor: 0.3 },
  { key: "wind_speed", label: "wind", unit: "km/h", digits: 1, floor: 1.0 },
  { key: "humidity", label: "humidity", unit: "%", digits: 0, floor: 3.0 },
  { key: "pressure", label: "pressure", unit: "hPa", digits: 1, floor: 1.0 },
];

class SfmlTrustCard extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this.initCard();
    }
    const now = Date.now();
    if (!this._lastUpdate || now - this._lastUpdate > TRUST_REFRESH_MS) {
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
    const text = TRUST_TEXT[this._lang][key] ?? TRUST_TEXT.en[key] ?? key;
    return text.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "");
  }

  _num(value, digits = 1) {
    return new Intl.NumberFormat(this._locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(Number(value) || 0);
  }

  _escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
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
          border-top: 1px solid var(--t-divider);
          font-size: 11px;
          color: var(--t-muted);
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
          --t-text: var(--primary-text-color, #212121);
          --t-muted: var(--secondary-text-color, #727272);
          --t-divider: var(--divider-color, rgba(127, 127, 127, 0.2));
          --t-good: var(--success-color, #43a047);
          --t-warn: #f5902f;
          --t-blue: #2a90e0;
        }
        ha-card {
          position: relative;
          overflow: hidden;
          container-type: inline-size;
        }
        .content {
          padding: 16px;
          color: var(--t-text);
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 12px;
        }
        .chip {
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          color: var(--t-good);
          background: color-mix(in srgb, var(--t-good) 14%, transparent);
        }
        .chip.medium {
          color: var(--t-warn);
          background: color-mix(in srgb, var(--t-warn) 14%, transparent);
        }
        .chip.low {
          color: var(--error-color, #db4437);
          background: color-mix(in srgb, var(--error-color, #db4437) 14%, transparent);
        }
        .chip.learning {
          color: var(--t-blue);
          background: color-mix(in srgb, var(--t-blue) 14%, transparent);
        }
        .chip[hidden] {
          display: none;
        }
        .hero {
          border-radius: 16px;
          padding: 14px;
          border: 1px solid var(--t-divider);
          background: linear-gradient(170deg,
            color-mix(in srgb, #7e57c2 14%, transparent),
            color-mix(in srgb, var(--t-blue) 10%, transparent));
        }
        .label {
          font-size: 12px;
          color: var(--t-muted);
        }
        .big {
          font-size: 30px;
          font-weight: 600;
          line-height: 1.15;
        }
        .sub {
          font-size: 12px;
          color: var(--t-muted);
        }
        .trend {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 6px;
          font-size: 12px;
          font-weight: 600;
          color: var(--t-good);
        }
        .trend.worsening {
          color: var(--t-warn);
        }
        .trend.stable {
          color: var(--t-muted);
        }
        .trend ha-icon {
          --mdc-icon-size: 16px;
        }
        .cone {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          margin-top: 12px;
        }
        .hz {
          flex: 1;
          min-width: 0;
          text-align: center;
        }
        .pill {
          position: relative;
          margin-bottom: 6px;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent,
            color-mix(in srgb, var(--t-blue) 45%, transparent) 30%,
            color-mix(in srgb, var(--t-warn) 45%, transparent) 70%, transparent);
        }
        .pill::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          width: 8px;
          height: 8px;
          margin: -4px;
          border-radius: 50%;
          background: var(--t-text);
        }
        .hz b {
          display: block;
          font-size: 17px;
        }
        .hz small {
          font-size: 11px;
          color: var(--t-muted);
        }
        .section {
          margin: 16px 0 8px;
          font-size: 13px;
          font-weight: 600;
        }
        .tiles {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        @container (min-width: 640px) {
          .tiles {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }
        .tile {
          border: 1px solid var(--t-divider);
          border-radius: 12px;
          padding: 10px;
          min-width: 0;
        }
        .t-head {
          font-size: 12px;
          color: var(--t-muted);
        }
        .t-val {
          margin: 2px 0;
          font-size: 15px;
          font-weight: 600;
          color: var(--t-good);
        }
        .t-val.offset {
          color: var(--t-warn);
        }
        .t-sub {
          font-size: 11px;
          color: var(--t-muted);
        }
        .event {
          display: flex;
          align-items: center;
          gap: 10px;
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 13px;
          background: color-mix(in srgb, var(--t-warn) 12%, transparent);
        }
        .event.none {
          background: color-mix(in srgb, var(--t-good) 10%, transparent);
        }
        .event ha-icon {
          flex: none;
          --mdc-icon-size: 24px;
          color: var(--t-warn);
        }
        .event.none ha-icon {
          color: var(--t-good);
        }
        .event small {
          display: block;
          font-size: 12px;
          color: var(--t-muted);
        }
        .basis {
          margin-top: 12px;
          font-size: 12px;
          color: var(--t-muted);
        }
        .state {
          padding: 18px 4px;
          font-size: 14px;
          color: var(--t-muted);
          text-align: center;
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
            <div class="chip" hidden></div>
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
    this.shadowRoot.querySelector(".brand-icon").src = TRUST_BRAND_ICON;
    this.shadowRoot.querySelector(".tagline").textContent = this._t("tagline");
    this.shadowRoot.querySelector(".brand-link").href = TRUST_BRAND_URL[this._lang];
    this.shadowRoot.querySelector(".state").textContent = this._t("loading");
    this.container = this.shadowRoot.querySelector(".body");
    this.chip = this.shadowRoot.querySelector(".chip");
  }

  async updateData() {
    if (!this._hass || !this.container) return;
    try {
      const response = await this._hass.callApi("GET", "sfml_stats/modern/eai/weather");
      const envelope = response?.data;
      // Demo scenarios stand in when EAI is missing; never show them as the user's data
      if (!response?.success || !envelope || envelope.is_demo !== false) {
        this.chip.hidden = true;
        this._showState(this._t("missing"));
        return;
      }
      this.render(envelope.data || {});
    } catch (err) {
      console.error("SFML Trust Card fetch error:", err);
      if (!this._rendered) this._showState(this._t("error"));
    }
  }

  _showState(text) {
    this.container.innerHTML = `<div class="state"></div>`;
    this.container.firstElementChild.textContent = text;
  }

  // Pair-weighted MAE and bias over the given horizon buckets
  _aggregate(metric, buckets) {
    let pairs = 0;
    let mae = 0;
    let bias = 0;
    for (const bucket of buckets) {
      const entry = metric?.by_horizon?.[bucket];
      const count = Number(entry?.pairs) || 0;
      if (!count || !Number.isFinite(Number(entry.mae))) continue;
      pairs += count;
      mae += Number(entry.mae) * count;
      bias += (Number(entry.bias) || 0) * count;
    }
    return pairs ? { pairs, mae: mae / pairs, bias: bias / pairs } : null;
  }

  _level(near, data) {
    if (data.cold_start || data.status !== "ready" || !near) return "learning";
    if ((Number(data.data_quality?.score_percent) || 0) < TRUST_MIN_QUALITY) return "low";
    if (near.mae <= TRUST_HIGH_MAE) return "high";
    if (near.mae <= TRUST_MEDIUM_MAE) return "medium";
    return "low";
  }

  render(data) {
    this._rendered = true;
    const metrics = data.forecast_vs_actual || {};
    const temperature = metrics.temperature_c;
    const near = this._aggregate(temperature, TRUST_NEAR);
    const level = this._level(near, data);
    this.chip.hidden = false;
    this.chip.className = `chip ${level}`;
    this.chip.textContent = this._t({ high: "chipHigh", medium: "chipMedium", low: "chipLow", learning: "chipLearning" }[level]);
    if (!near) {
      this._showState(this._t("learning"));
      return;
    }
    this.container.innerHTML = `
      ${this._heroHtml(temperature, near)}
      <div class="section">${this._t("lessons")}</div>
      <div class="tiles">${TRUST_METRICS.map((m) => this._tileHtml(m, metrics[m.key])).join("")}</div>
      <div class="section">${this._t("next")}</div>
      ${this._eventHtml(data)}
      <div class="basis">${this._escape(this._t("basis", { count: new Intl.NumberFormat(this._locale).format(Number(data.data_quality?.paired_samples) || near.pairs) }))}</div>`;
  }

  _heroHtml(temperature, near) {
    const horizons = [["0_6h", "h0"], ["6_24h", "h1"], ["24_72h", "h2"]]
      .map(([bucket, label]) => ({ label, value: this._aggregate(temperature, [bucket]) }))
      .filter((h) => h.value);
    const widest = Math.max(...horizons.map((h) => h.value.mae), 0.1);
    const trend = temperature?.trend?.available ? temperature.trend.direction : null;
    const trendKey = { improving: "trendImproving", stable: "trendStable", worsening: "trendWorsening" }[trend];
    const trendIcon = { improving: "mdi:trending-up", stable: "mdi:trending-neutral", worsening: "mdi:trending-down" }[trend];
    return `
      <div class="hero">
        <div class="label">${this._t("heroLabel")}</div>
        <div class="big">± ${this._num(near.mae)} °C</div>
        <div class="sub">${this._t("heroSub")}</div>
        ${trendKey ? `<div class="trend ${trend}"><ha-icon icon="${trendIcon}"></ha-icon>${this._t(trendKey)}</div>` : ""}
        <div class="cone">
          ${horizons.map((h) => `
            <div class="hz">
              <div class="pill" style="height:${Math.round(10 + 18 * (h.value.mae / widest))}px"></div>
              <b>± ${this._num(h.value.mae)} °C</b>
              <small>${this._t(h.label)}</small>
            </div>`).join("")}
        </div>
      </div>`;
  }

  _tileHtml(spec, metric) {
    const stats = this._aggregate(metric, TRUST_ALL);
    const head = `<div class="t-head">${this._t(spec.label)}</div>`;
    if (!stats) {
      return `<div class="tile">${head}<div class="t-sub">–</div></div>`;
    }
    const amount = (value) => `${this._num(Math.abs(value), spec.digits)} ${spec.unit}`;
    // bias = forecast − measured: positive means the station measured less than forecast
    const offset = Math.abs(stats.bias) >= Math.max(spec.floor, stats.mae / 2);
    const value = offset
      ? this._t(stats.bias > 0 ? "measuredLess" : "measuredMore", { value: amount(stats.bias) })
      : this._t("noOffset");
    return `
      <div class="tile">
        ${head}
        <div class="t-val${offset ? " offset" : ""}">${this._escape(value)}</div>
        <div class="t-sub">${this._escape(this._t("typical", { value: amount(stats.mae) }))}</div>
      </div>`;
  }

  _nextEvent(data) {
    const now = Date.now();
    return (Array.isArray(data.events) ? data.events : [])
      .map((event) => ({ event, start: Date.parse(event?.start), end: Date.parse(event?.end) }))
      .filter((item) => Number.isFinite(item.start) && (Number.isFinite(item.end) ? item.end > now : item.start >= now))
      .sort((a, b) => a.start - b.start)[0] || null;
  }

  _eventIcon(event) {
    const key = `${event.icon_key || ""} ${event.code || ""}`;
    const icons = [
      ["thunder", "mdi:weather-lightning"], ["storm", "mdi:weather-lightning-rainy"],
      ["wind", "mdi:weather-windy"], ["gust", "mdi:weather-windy"],
      ["snow", "mdi:weather-snowy"], ["frost", "mdi:snowflake"], ["ice", "mdi:snowflake"],
      ["heat", "mdi:thermometer-high"], ["fog", "mdi:weather-fog"],
      ["rain", "mdi:weather-rainy"], ["precip", "mdi:weather-rainy"],
    ];
    return (icons.find(([needle]) => key.includes(needle)) || [null, "mdi:weather-cloudy-alert"])[1];
  }

  _eventTime(start, end, timeZone) {
    let day;
    let clock;
    try {
      day = new Intl.DateTimeFormat(this._locale, { weekday: "short", timeZone }).format(start);
      clock = new Intl.DateTimeFormat(this._locale, { hour: "2-digit", minute: "2-digit", timeZone });
    } catch (err) {
      // Unknown time zone name: fall back to the browser zone
      day = new Intl.DateTimeFormat(this._locale, { weekday: "short" }).format(start);
      clock = new Intl.DateTimeFormat(this._locale, { hour: "2-digit", minute: "2-digit" });
    }
    const from = clock.format(start);
    return Number.isFinite(end) ? `${day} ${from}–${clock.format(end)}` : `${day} ${from}`;
  }

  _eventHtml(data) {
    const next = this._nextEvent(data);
    if (!next) {
      return `<div class="event none"><ha-icon icon="mdi:weather-partly-cloudy"></ha-icon><div>${this._t("noEvent")}</div></div>`;
    }
    const { event, start, end } = next;
    const severity = ["advisory", "warning", "critical"].includes(event.severity) ? this._t(event.severity) : "";
    const title = event.title || event.code || "";
    const when = this._eventTime(start, end, data.time_context?.timezone || this._hass?.config?.time_zone);
    return `
      <div class="event">
        <ha-icon icon="${this._eventIcon(event)}"></ha-icon>
        <div><b>${this._escape(title)}</b> · ${this._escape(when)}${severity ? `<small>${this._escape(severity)}</small>` : ""}</div>
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

if (!customElements.get("sfml-trust-card")) customElements.define("sfml-trust-card", SfmlTrustCard);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "sfml-trust-card")) {
  const de = (document.documentElement.lang || navigator.language || "").toLowerCase().startsWith("de");
  window.customCards.push({
    type: "sfml-trust-card",
    name: de ? "Solar Forecast ML – Prognose-Vertrauen" : "Solar Forecast ML – Forecast trust",
    preview: true,
    description: de
      ? "Wie genau die Wettervorhersage deinen Ort trifft – gelernt aus dem Vergleich mit deiner Wetterstation."
      : "How closely the weather forecast fits your location – learned by comparing it with your weather station.",
    documentationURL: "https://www.solarforecastml.com/",
  });
}
