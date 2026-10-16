// SFML Solar Weather Lovelace Card
// (C) 2026 Zara-Toorox

// Solar Forecast ML brand mark (96 px WebP of brand/icon@2x.png), inlined so the card needs no extra asset
const WEATHER_BRAND_ICON = "data:image/webp;base64,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";
const WEATHER_BRAND_URL = { de: "https://www.solarforecastml.com/de/", en: "https://www.solarforecastml.com/en/", pl: "https://www.solarforecastml.com/en/" };

const WEATHER_TEXT = {
  de: {
    title: "Solarwetter",
    tagline: "Lokal korrigierte Wetterprognose",
    potential: { good: "Solarpotenzial hoch", medium: "Solarpotenzial mittel", poor: "Solarpotenzial gering" },
    feels: "Gefühlt {v}",
    dayLength: "Tageslänge {v}",
    vsYesterday: "{v} ggü. gestern",
    maxElevation: "Sonnenhöchststand {v}",
    sunlight: "Sonnenlicht heute",
    forecast: "Prognose",
    clearSky: "Klarhimmel",
    clarity: "{v} des Klarhimmel-Potenzials",
    days: "Solar-Ranking",
    today: "Heute",
    tomorrow: "Morgen",
    bestDay: "Bester Solartag",
    error: "Wetterdaten nicht erreichbar.",
    loading: "Lade Wetterdaten …",
    conditions: {
      "clear-night": "Klare Nacht", cloudy: "Bewölkt", exceptional: "Unwetter", fog: "Nebel",
      hail: "Hagel", lightning: "Gewitter", "lightning-rainy": "Gewitter mit Regen",
      partlycloudy: "Teilweise bewölkt", pouring: "Starkregen", rainy: "Regen", snowy: "Schnee",
      "snowy-rainy": "Schneeregen", sunny: "Sonnig", windy: "Windig", "windy-variant": "Windig",
    },
    moon: ["Neumond", "Zunehmende Sichel", "Erstes Viertel", "Zunehmender Mond",
      "Vollmond", "Abnehmender Mond", "Letztes Viertel", "Abnehmende Sichel"],
  },
  en: {
    title: "Solar weather",
    tagline: "Locally corrected weather forecast",
    potential: { good: "High solar potential", medium: "Medium solar potential", poor: "Low solar potential" },
    feels: "Feels like {v}",
    dayLength: "Day length {v}",
    vsYesterday: "{v} vs. yesterday",
    maxElevation: "Max sun elevation {v}",
    sunlight: "Sunlight today",
    forecast: "Forecast",
    clearSky: "Clear sky",
    clarity: "{v} of clear-sky potential",
    days: "Solar ranking",
    today: "Today",
    tomorrow: "Tomorrow",
    bestDay: "Best solar day",
    error: "Weather data unavailable.",
    loading: "Loading weather data …",
    conditions: {
      "clear-night": "Clear night", cloudy: "Cloudy", exceptional: "Severe weather", fog: "Fog",
      hail: "Hail", lightning: "Thunderstorm", "lightning-rainy": "Thunderstorm with rain",
      partlycloudy: "Partly cloudy", pouring: "Heavy rain", rainy: "Rain", snowy: "Snow",
      "snowy-rainy": "Sleet", sunny: "Sunny", windy: "Windy", "windy-variant": "Windy",
    },
    moon: ["New moon", "Waxing crescent", "First quarter", "Waxing gibbous",
      "Full moon", "Waning gibbous", "Last quarter", "Waning crescent"],
  },
  pl: {
    title: "Pogoda solarna",
    tagline: "Lokalnie skorygowana prognoza pogody",
    potential: { good: "Wysoki potencjał solarny", medium: "Średni potencjał solarny", poor: "Niski potencjał solarny" },
    feels: "Odczuwalna {v}",
    dayLength: "Długość dnia {v}",
    vsYesterday: "{v} wobec wczoraj",
    maxElevation: "Maks. wysokość słońca {v}",
    sunlight: "Światło słoneczne dzisiaj",
    forecast: "Prognoza",
    clearSky: "Bezchmurne niebo",
    clarity: "{v} potencjału bezchmurnego nieba",
    days: "Ranking solarny",
    today: "Dzisiaj",
    tomorrow: "Jutro",
    bestDay: "Najlepszy dzień solarny",
    error: "Dane pogody są niedostępne.",
    loading: "Wczytywanie danych pogody …",
    conditions: {
      "clear-night": "Pogodna noc", cloudy: "Pochmurno", exceptional: "Gwałtowna pogoda", fog: "Mgła",
      hail: "Grad", lightning: "Burza", "lightning-rainy": "Burza z deszczem",
      partlycloudy: "Częściowe zachmurzenie", pouring: "Ulewa", rainy: "Deszcz", snowy: "Śnieg",
      "snowy-rainy": "Deszcz ze śniegiem", sunny: "Słonecznie", windy: "Wietrznie", "windy-variant": "Wietrznie",
    },
    moon: ["Nów", "Przybywający sierp", "Pierwsza kwadra", "Przybywający garb",
      "Pełnia", "Ubywający garb", "Ostatnia kwadra", "Ubywający sierp"],
  },
};

// The API reports the moon phase by its German name; the index drives icon and translation
const WEATHER_MOON_DE = WEATHER_TEXT.de.moon;
const WEATHER_MOON_ICONS = ["moon-new", "moon-waxing-crescent", "moon-first-quarter", "moon-waxing-gibbous",
  "moon-full", "moon-waning-gibbous", "moon-last-quarter", "moon-waning-crescent"];

const WEATHER_ICONS = {
  "clear-night": "weather-night", cloudy: "weather-cloudy", exceptional: "alert-circle-outline",
  fog: "weather-fog", hail: "weather-hail", lightning: "weather-lightning",
  "lightning-rainy": "weather-lightning-rainy", partlycloudy: "weather-partly-cloudy",
  pouring: "weather-pouring", rainy: "weather-rainy", snowy: "weather-snowy",
  "snowy-rainy": "weather-snowy-rainy", sunny: "weather-sunny", windy: "weather-windy",
  "windy-variant": "weather-windy-variant",
};

const WEATHER_REFRESH_MS = 5 * 60 * 1000;
const WEATHER_CHART_W = 300;
const WEATHER_CHART_H = 80;
// Above this forecast/clear-sky ratio the two radiation scales disagree; the percentage is then hidden
const WEATHER_MAX_PLAUSIBLE_CLARITY = 1.1;

class SfmlWeatherCard extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this.initCard();
    }

    const now = Date.now();
    if (!this._lastUpdate || now - this._lastUpdate > WEATHER_REFRESH_MS) {
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
    const text = WEATHER_TEXT[this._lang][key] ?? WEATHER_TEXT.en[key] ?? key;
    return typeof text === "string" ? text.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "") : text;
  }

  _num(value, digits = 0) {
    return new Intl.NumberFormat(this._locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(Number(value) || 0);
  }

  _temp(value) {
    return value == null ? "–" : `${this._num(value, 0)}°`;
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
          gap: 8px;
          margin-top: 14px;
          padding-top: 10px;
          border-top: 1px solid var(--w-divider);
          font-size: 11px;
          color: var(--w-muted);
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
          --w-solar: var(--energy-solar-color, #ff9800);
          --w-text: var(--primary-text-color, #212121);
          --w-muted: var(--secondary-text-color, #727272);
          --w-divider: var(--divider-color, rgba(127, 127, 127, 0.2));
          --w-good: var(--success-color, #43a047);
          --w-warn: var(--warning-color, #ffa600);
          --w-sky: #4fa3ff;
          --w-night: #3f51b5;
        }
        ha-card {
          position: relative;
          overflow: hidden;
          container-type: inline-size;
        }
        .content {
          padding: 16px;
          color: var(--w-text);
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 12px;
        }
        .potential {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
        }
        .potential ha-icon {
          --mdc-icon-size: 15px;
        }
        .potential.good { color: var(--w-good); background: color-mix(in srgb, var(--w-good) 14%, transparent); }
        .potential.medium { color: var(--w-warn); background: color-mix(in srgb, var(--w-warn) 14%, transparent); }
        .potential.poor { color: var(--w-muted); background: color-mix(in srgb, var(--w-muted) 14%, transparent); }

        /* Sky hero: tint and animation follow the current condition */
        .sky {
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          padding: 16px;
          border: 1px solid var(--w-divider);
          background: linear-gradient(160deg, var(--sky-a), var(--sky-b));
          --sky-a: color-mix(in srgb, var(--w-sky) 18%, transparent);
          --sky-b: color-mix(in srgb, var(--w-solar) 14%, transparent);
        }
        .sky.cloudy, .sky.fog, .sky.exceptional {
          --sky-a: color-mix(in srgb, #90a4ae 26%, transparent);
          --sky-b: color-mix(in srgb, #90a4ae 10%, transparent);
        }
        .sky.partlycloudy {
          --sky-a: color-mix(in srgb, var(--w-sky) 18%, transparent);
          --sky-b: color-mix(in srgb, #90a4ae 16%, transparent);
        }
        .sky.rainy, .sky.pouring, .sky.lightning, .sky.lightning-rainy, .sky.hail {
          --sky-a: color-mix(in srgb, #5c7c99 30%, transparent);
          --sky-b: color-mix(in srgb, #5c7c99 10%, transparent);
        }
        .sky.snowy, .sky.snowy-rainy {
          --sky-a: color-mix(in srgb, #b3e5fc 32%, transparent);
          --sky-b: color-mix(in srgb, #ffffff 8%, transparent);
        }
        .sky.night {
          --sky-a: color-mix(in srgb, var(--w-night) 34%, transparent);
          --sky-b: color-mix(in srgb, #1a237e 14%, transparent);
        }
        .fx {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .fx i {
          position: absolute;
          display: block;
        }
        .fx .cloud {
          width: 46%;
          height: 38%;
          border-radius: 50%;
          background: color-mix(in srgb, var(--w-text) 7%, transparent);
          filter: blur(14px);
          animation: drift 26s linear infinite;
        }
        .fx .drop {
          width: 1.5px;
          height: 14px;
          border-radius: 1px;
          background: color-mix(in srgb, #4fa3ff 55%, transparent);
          animation: fall 1.1s linear infinite;
        }
        .fx .flake {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: color-mix(in srgb, var(--w-text) 30%, transparent);
          animation: fall 5s linear infinite;
        }
        .fx .star {
          width: 2px;
          height: 2px;
          border-radius: 50%;
          background: color-mix(in srgb, var(--w-text) 60%, transparent);
          animation: twinkle 3s ease-in-out infinite alternate;
        }
        .now {
          position: relative;
          display: grid;
          grid-template-columns: auto 1fr;
          align-items: center;
          gap: 14px;
        }
        .now-icon {
          --mdc-icon-size: clamp(56px, 17cqw, 72px);
          color: var(--w-solar);
          filter: drop-shadow(0 2px 8px color-mix(in srgb, currentColor 35%, transparent));
        }
        .now-icon.sun {
          animation: spin 40s linear infinite;
        }
        .now-icon.muted {
          color: var(--w-muted);
        }
        .now-icon.wet {
          color: #4fa3ff;
        }
        .now-icon.moon {
          color: #9fa8da;
        }
        .now-temp {
          font-size: clamp(36px, 12cqw, 48px);
          font-weight: 600;
          line-height: 1;
          letter-spacing: -1px;
        }
        .now-cond {
          margin-top: 4px;
          font-size: 15px;
          font-weight: 500;
        }
        .now-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 12px;
          margin-top: 6px;
          font-size: 12px;
          color: var(--w-muted);
        }
        .now-meta span {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          white-space: nowrap;
        }
        .now-meta ha-icon {
          --mdc-icon-size: 14px;
        }

        .arc {
          position: relative;
          margin-top: 10px;
        }
        .arc svg {
          display: block;
          width: 100%;
          height: auto;
          overflow: visible;
        }
        .arc-track {
          fill: none;
          stroke: color-mix(in srgb, var(--w-text) 25%, transparent);
          stroke-width: 1.5;
          stroke-dasharray: 3 4;
        }
        .arc-done {
          fill: none;
          stroke: var(--w-solar);
          stroke-width: 2.5;
          stroke-linecap: round;
        }
        .horizon {
          stroke: color-mix(in srgb, var(--w-text) 25%, transparent);
          stroke-width: 1;
        }
        .sun-dot {
          fill: var(--w-solar);
          filter: drop-shadow(0 0 6px var(--w-solar));
        }
        .sun-glow {
          fill: var(--w-solar);
          opacity: 0.25;
          animation: pulse 3s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        .arc-labels {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: -4px;
          font-size: 12px;
          color: var(--w-muted);
          font-variant-numeric: tabular-nums;
        }
        .arc-labels span {
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
        .arc-labels ha-icon {
          --mdc-icon-size: 15px;
        }
        .arc-center {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 22px;
          text-align: center;
          font-size: 12px;
          color: var(--w-muted);
          line-height: 1.35;
        }
        .arc-center strong {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: var(--w-text);
        }
        .arc-center ha-icon {
          --mdc-icon-size: 22px;
          color: #9fa8da;
        }

        .section {
          margin-top: 16px;
        }
        .section-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 6px;
        }
        .section-title {
          font-size: 14px;
          font-weight: 500;
        }
        .clarity {
          font-size: 12px;
          color: var(--w-muted);
          text-align: right;
        }
        .clarity strong {
          color: var(--w-solar);
          font-size: 14px;
        }
        .chart svg {
          display: block;
          width: 100%;
          height: 84px;
          overflow: visible;
        }
        .clear-line {
          fill: none;
          stroke: var(--w-muted);
          stroke-width: 1.2;
          stroke-dasharray: 3 3;
          vector-effect: non-scaling-stroke;
          opacity: 0.7;
        }
        .fc-line {
          fill: none;
          stroke: var(--w-solar);
          stroke-width: 2;
          vector-effect: non-scaling-stroke;
        }
        .now-line {
          stroke: var(--w-text);
          stroke-width: 1;
          stroke-dasharray: 2 3;
          vector-effect: non-scaling-stroke;
          opacity: 0.45;
        }
        .axis {
          position: relative;
          height: 14px;
          margin-top: 4px;
          font-size: 11px;
          color: var(--w-muted);
          font-variant-numeric: tabular-nums;
        }
        .axis span {
          position: absolute;
          transform: translateX(-50%);
        }
        .legend {
          display: flex;
          gap: 14px;
          margin-top: 6px;
          font-size: 11px;
          color: var(--w-muted);
        }
        .legend i {
          display: inline-block;
          width: 14px;
          height: 0;
          margin-right: 5px;
          vertical-align: middle;
        }
        .legend .l-fc { border-top: 2px solid var(--w-solar); }
        .legend .l-clear { border-top: 1.5px dashed var(--w-muted); }

        .days {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }
        .day {
          position: relative;
          padding: 10px 8px;
          border-radius: 12px;
          border: 1px solid var(--w-divider);
          background: color-mix(in srgb, var(--w-text) 4%, transparent);
          text-align: center;
          min-width: 0;
        }
        .day.best {
          border-color: color-mix(in srgb, var(--w-solar) 60%, transparent);
          background: color-mix(in srgb, var(--w-solar) 10%, transparent);
        }
        .crown {
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          display: inline-flex;
          align-items: center;
          padding: 1px 6px;
          border-radius: 999px;
          background: var(--w-solar);
          color: #fff;
        }
        .crown ha-icon {
          --mdc-icon-size: 14px;
        }
        .day-name {
          font-size: 12px;
          color: var(--w-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .day ha-icon.day-icon {
          --mdc-icon-size: 30px;
          margin: 4px 0 2px;
          color: var(--w-solar);
        }
        .day ha-icon.day-icon.muted { color: var(--w-muted); }
        .day ha-icon.day-icon.wet { color: #4fa3ff; }
        .day-temp {
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
        }
        .day-temp span {
          color: var(--w-muted);
          font-weight: 400;
        }
        .day-sun {
          margin-top: 6px;
          font-size: 12px;
          font-weight: 600;
          color: var(--w-solar);
          white-space: nowrap;
        }
        .day-sun small {
          font-weight: 400;
          color: var(--w-muted);
        }
        .day-bar {
          height: 4px;
          margin-top: 5px;
          border-radius: 2px;
          background: var(--w-divider);
          overflow: hidden;
        }
        .day-bar div {
          height: 100%;
          border-radius: 2px;
          background: var(--w-solar);
          transition: width 1s ease;
        }
        .day-rain {
          margin-top: 4px;
          font-size: 11px;
          color: #4fa3ff;
          white-space: nowrap;
          min-height: 14px;
        }
        .best-note {
          margin-top: 8px;
          font-size: 12px;
          color: var(--w-muted);
          text-align: center;
        }
        .best-note strong {
          color: var(--w-solar);
        }
        .state {
          padding: 28px 0;
          text-align: center;
          color: var(--w-muted);
          font-size: 14px;
        }

        @container (max-width: 420px) {
          .header { flex-wrap: wrap; row-gap: 8px; }
          .potential { margin-left: 52px; }
        }
        @container (max-width: 380px) {
          .sky { padding: 12px; }
          .arc-center { position: static; margin-top: 6px; }
          .days { gap: 6px; }
          .day { padding: 10px 4px; }
          .day-sun small { display: block; }
          .arc-labels .elevation { display: none; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes drift {
          from { transform: translateX(-60%); }
          to { transform: translateX(260%); }
        }
        @keyframes fall {
          from { transform: translateY(-20px); opacity: 0; }
          15% { opacity: 1; }
          to { transform: translateY(170px); opacity: 0; }
        }
        @keyframes twinkle {
          from { opacity: 0.15; }
          to { opacity: 0.9; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.5); }
        }
        @media (prefers-reduced-motion: reduce) {
          .fx, .now-icon.sun, .sun-glow { animation: none; }
          .fx { display: none; }
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
            <div class="potential" hidden></div>
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
    this.shadowRoot.querySelector(".brand-icon").src = WEATHER_BRAND_ICON;
    this.shadowRoot.querySelector(".tagline").textContent = this._t("tagline");
    this.shadowRoot.querySelector(".brand-link").href = WEATHER_BRAND_URL[this._lang];
    this.shadowRoot.querySelector(".state").textContent = this._t("loading");
    this.container = this.shadowRoot.querySelector(".body");
    this.potentialChip = this.shadowRoot.querySelector(".potential");
  }

  async updateData() {
    if (!this._hass || !this.container) return;
    try {
      const data = await this._hass.callApi("GET", "sfml_stats/weather/dashboard");
      if (!data || !data.success) {
        if (!this._rendered) this._showState(this._t("error"));
        return;
      }
      this.render(data);
    } catch (err) {
      console.error("SFML Weather Card fetch error:", err);
      if (!this._rendered) this._showState(this._t("error"));
    }
  }

  _showState(text) {
    this.container.innerHTML = `<div class="state"></div>`;
    this.container.firstElementChild.textContent = text;
  }

  // Minutes since local midnight in the Home Assistant timezone for "HH:MM" or ISO timestamps
  _minutes(value, tz) {
    if (value == null) return null;
    const text = String(value);
    const hm = /^(\d{1,2}):(\d{2})/.exec(text);
    if (hm) return Number(hm[1]) * 60 + Number(hm[2]);
    const date = new Date(text.includes("T") || text.includes(" ") ? text.replace(" ", "T") : NaN);
    if (Number.isNaN(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit", minute: "2-digit", hourCycle: "h23", ...(tz ? { timeZone: tz } : {}),
    }).formatToParts(date);
    const get = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
    return get("hour") * 60 + get("minute");
  }

  _clock(minutes) {
    if (minutes == null) return "–";
    const m = Math.round(minutes);
    return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  }

  _duration(minutes) {
    const m = Math.round(Math.abs(minutes));
    return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
  }

  // Daily condition from hourly rows: rain and snow win, otherwise mean daylight cloud cover
  _dayCondition(rows) {
    const daylight = rows.filter((r) => (r.ghi || 0) > 0);
    const set = daylight.length ? daylight : rows;
    const codes = set.map((r) => Number(r.weather_code)).filter((c) => Number.isFinite(c));
    const rain = set.reduce((sum, r) => sum + (Number(r.rain) || 0), 0);
    const clouds = set.reduce((sum, r) => sum + (Number(r.cloud_cover) || 0), 0) / Math.max(1, set.length);
    if (codes.some((c) => c >= 95)) return "lightning-rainy";
    if (codes.filter((c) => (c >= 71 && c <= 77) || c === 85 || c === 86).length >= 2) return "snowy";
    if (rain >= 10) return "pouring";
    if (rain >= 1.5) return "rainy";
    if (codes.filter((c) => c === 45 || c === 48).length > set.length / 2) return "fog";
    if (clouds < 25) return "sunny";
    if (clouds < 70) return "partlycloudy";
    return "cloudy";
  }

  _iconTone(condition) {
    if (["sunny", "partlycloudy"].includes(condition)) return "";
    if (["rainy", "pouring", "lightning-rainy", "lightning", "hail", "snowy-rainy"].includes(condition)) return "wet";
    return "muted";
  }

  render(data) {
    const tz = data.time_context?.timezone;
    const current = data.current || {};
    const astro = data.astronomy || {};
    const nowMin = this._minutes(data.time_context?.now, tz);
    const rise = this._minutes(astro.sunrise, tz);
    const set = this._minutes(astro.sunset, tz);
    const isDay = rise != null && set != null && nowMin != null ? nowMin >= rise && nowMin <= set : true;

    let condition = current.condition || "partlycloudy";
    if (condition === "sunny" && !isDay) condition = "clear-night";
    const conditionText = this._t("conditions")[condition] || condition;

    // Potential chip
    const potential = current.solar_potential;
    if (potential && isDay) {
      this.potentialChip.className = `potential ${potential}`;
      this.potentialChip.innerHTML = `<ha-icon icon="mdi:solar-power-variant"></ha-icon><span></span>`;
      this.potentialChip.querySelector("span").textContent = this._t("potential")[potential] || "";
      this.potentialChip.hidden = false;
    } else {
      this.potentialChip.hidden = true;
    }

    const skyClass = isDay ? condition : "night";
    const iconClass = !isDay
      ? "moon"
      : condition === "sunny" ? "sun" : this._iconTone(condition);

    const meta = [];
    if (current.feels_like != null) meta.push(`<span>${this._t("feels", { v: this._temp(current.feels_like) })}</span>`);
    if (current.humidity != null) meta.push(`<span><ha-icon icon="mdi:water-percent"></ha-icon>${this._num(current.humidity)} %</span>`);
    if (current.wind_speed != null) meta.push(`<span><ha-icon icon="mdi:weather-windy"></ha-icon>${this._num(current.wind_speed)} km/h</span>`);
    if (current.uv_index != null && isDay) meta.push(`<span><ha-icon icon="mdi:sun-wireless-outline"></ha-icon>UV ${this._num(current.uv_index)}</span>`);

    this.container.innerHTML = `
      <div class="sky ${skyClass}">
        <div class="fx">${this._effects(skyClass)}</div>
        <div class="now">
          <ha-icon class="now-icon ${iconClass}" icon="mdi:${WEATHER_ICONS[condition] || "weather-partly-cloudy"}"></ha-icon>
          <div>
            <div class="now-temp">${this._temp(current.temperature)}</div>
            <div class="now-cond">${conditionText}</div>
            <div class="now-meta">${meta.join("")}</div>
          </div>
        </div>
        ${this._arcHtml(rise, set, nowMin, isDay, astro)}
      </div>
      ${this._sunlightHtml(data.radiation || {}, data.time_context?.current_hour)}
      ${this._daysHtml(data)}
    `;
    this._rendered = true;
  }

  _effects(skyClass) {
    const seeded = (i, mod) => ((i * 37 + 11) % mod);
    if (skyClass === "night") {
      return Array.from({ length: 14 }, (_, i) =>
        `<i class="star" style="left:${seeded(i, 97)}%;top:${seeded(i * 3, 60)}%;animation-delay:${(i % 5) * 0.6}s"></i>`).join("");
    }
    if (["rainy", "pouring", "lightning-rainy", "lightning", "hail"].includes(skyClass)) {
      const count = skyClass === "pouring" ? 22 : 12;
      return Array.from({ length: count }, (_, i) =>
        `<i class="drop" style="left:${seeded(i, 100)}%;top:0;animation-delay:${((i * 0.17) % 1.1).toFixed(2)}s"></i>`).join("");
    }
    if (["snowy", "snowy-rainy"].includes(skyClass)) {
      return Array.from({ length: 12 }, (_, i) =>
        `<i class="flake" style="left:${seeded(i, 100)}%;top:0;animation-delay:${((i * 0.43) % 5).toFixed(2)}s"></i>`).join("");
    }
    if (["partlycloudy", "cloudy", "fog", "exceptional"].includes(skyClass)) {
      return `<i class="cloud" style="top:6%;animation-delay:-4s"></i><i class="cloud" style="top:48%;animation-delay:-17s;animation-duration:34s"></i>`;
    }
    return "";
  }

  _arcHtml(rise, set, nowMin, isDay, astro) {
    if (rise == null || set == null || set <= rise) return "";

    // Half-ellipse from sunrise (left) to sunset (right)
    const cx = 150;
    const cy = 92;
    const rx = 130;
    const ry = 74;
    const p = nowMin == null ? 0 : Math.min(1, Math.max(0, (nowMin - rise) / (set - rise)));
    const theta = Math.PI * (1 - p);
    const sx = cx + rx * Math.cos(theta);
    const sy = cy - ry * Math.sin(theta);

    let center = "";
    if (isDay) {
      const delta = astro.day_length_delta_min;
      const deltaText = delta != null && Math.abs(delta) >= 0.5
        ? `<div>${this._t("vsYesterday", { v: `${delta > 0 ? "+" : "−"}${this._num(Math.abs(delta))} min` })}</div>`
        : "";
      center = astro.day_length_min != null
        ? `<strong>${this._t("dayLength", { v: this._duration(astro.day_length_min) })}</strong>${deltaText}`
        : "";
    } else if (astro.moon_phase) {
      const idx = Math.max(0, WEATHER_MOON_DE.indexOf(astro.moon_phase));
      center = `<ha-icon icon="mdi:${WEATHER_MOON_ICONS[idx]}"></ha-icon>
        <strong>${this._t("moon")[idx]}</strong>
        ${astro.moon_illumination != null ? `<div>${this._num(astro.moon_illumination)} %</div>` : ""}`;
    }

    const sun = isDay
      ? `<circle class="sun-glow" cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="9"/>
         <circle class="sun-dot" cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="6"/>`
      : "";
    const done = isDay && p > 0.005
      ? `<path class="arc-done" d="M ${cx - rx},${cy} A ${rx} ${ry} 0 0 1 ${sx.toFixed(1)},${sy.toFixed(1)}"/>`
      : "";

    return `
      <div class="arc">
        <svg viewBox="0 0 300 100">
          <line class="horizon" x1="4" x2="296" y1="${cy}" y2="${cy}"/>
          <path class="arc-track" d="M ${cx - rx},${cy} A ${rx} ${ry} 0 0 1 ${cx + rx},${cy}"/>
          ${done}
          ${sun}
        </svg>
        <div class="arc-center">${center}</div>
        <div class="arc-labels">
          <span><ha-icon icon="mdi:weather-sunset-up"></ha-icon>${this._clock(rise)}</span>
          <span class="elevation">${astro.max_elevation_deg != null && isDay ? this._t("maxElevation", { v: `${this._num(astro.max_elevation_deg)}°` }) : ""}</span>
          <span>${this._clock(set)}<ha-icon icon="mdi:weather-sunset-down"></ha-icon></span>
        </div>
      </div>`;
  }

  _sunlightHtml(radiation, currentHour) {
    const forecast = new Map((radiation.forecast || []).map((r) => [Number(r.hour), Number(r.ghi) || 0]));
    const clear = new Map((radiation.clear_sky || []).map((r) => [Number(r.hour), Number(r.ghi) || 0]));
    const active = [...new Set([...forecast.keys(), ...clear.keys()])]
      .filter((h) => (forecast.get(h) || 0) > 1 || (clear.get(h) || 0) > 1)
      .sort((a, b) => a - b);
    if (active.length < 3) return "";

    const hours = [];
    for (let h = Math.max(0, active[0] - 1); h <= Math.min(23, active[active.length - 1] + 1); h += 1) hours.push(h);
    const maxVal = Math.max(50, ...hours.map((h) => Math.max(forecast.get(h) || 0, clear.get(h) || 0))) * 1.08;
    const W = WEATHER_CHART_W;
    const H = WEATHER_CHART_H;
    const step = W / (hours.length - 1);
    const x = (i) => i * step;
    const y = (v) => H - (v / maxVal) * H;
    const line = (series) => this._smoothPath(hours.map((h, i) => [x(i), y(series.get(h) || 0)]));

    const fcLine = line(forecast);
    const area = `${fcLine} L ${W},${H} L 0,${H} Z`;
    const hasClear = clear.size > 0;

    // Day share of clear-sky irradiation; hidden when the scales disagree
    const fcSum = hours.reduce((s, h) => s + (forecast.get(h) || 0), 0);
    const clearSum = hours.reduce((s, h) => s + (clear.get(h) || 0), 0);
    const ratio = hasClear && clearSum > 0 ? fcSum / clearSum : null;
    const clarity = ratio != null && ratio <= WEATHER_MAX_PLAUSIBLE_CLARITY
      ? `<div class="clarity"><strong>${this._num(Math.min(100, ratio * 100))} %</strong><br>${this._t("clarity", { v: "" }).trim()}</div>`
      : "";

    const nowIndex = hours.indexOf(currentHour);
    const nowLine = nowIndex >= 0
      ? `<line class="now-line" x1="${x(nowIndex).toFixed(1)}" x2="${x(nowIndex).toFixed(1)}" y1="0" y2="${H}"/>`
      : "";
    const labelEvery = hours.length > 12 ? 3 : 2;
    const labels = hours
      .map((h, i) => (i % labelEvery === 0
        ? `<span style="left:${((x(i) / W) * 100).toFixed(2)}%">${String(h).padStart(2, "0")}</span>`
        : ""))
      .join("");

    return `
      <div class="section chart">
        <div class="section-head">
          <span class="section-title">${this._t("sunlight")}</span>
          ${clarity}
        </div>
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
          <defs>
            <linearGradient id="w-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style="stop-color: var(--w-solar); stop-opacity: 0.35"/>
              <stop offset="1" style="stop-color: var(--w-solar); stop-opacity: 0"/>
            </linearGradient>
          </defs>
          <path fill="url(#w-area)" d="${area}"/>
          ${hasClear ? `<path class="clear-line" d="${line(clear)}"/>` : ""}
          <path class="fc-line" d="${fcLine}"/>
          ${nowLine}
        </svg>
        <div class="axis">${labels}</div>
        <div class="legend">
          <span><i class="l-fc"></i>${this._t("forecast")}</span>
          ${hasClear ? `<span><i class="l-clear"></i>${this._t("clearSky")}</span>` : ""}
        </div>
      </div>`;
  }

  _daysHtml(data) {
    const todayIso = data.time_context?.today;
    const tomorrowIso = data.time_context?.tomorrow;
    const byDate = new Map();
    (data.forecast || []).forEach((r) => {
      const date = String(r.time || "").slice(0, 10);
      if (!date) return;
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date).push(r);
    });

    const dates = [...byDate.keys()].sort();
    const days = [];
    for (const date of dates) {
      const rows = byDate.get(date);
      // Today uses the full-day radiation forecast; later days need a full daylight window
      if (date !== todayIso && rows.length < 18) continue;
      const ghiSum = date === todayIso && (data.radiation?.forecast || []).length
        ? data.radiation.forecast.reduce((s, r) => s + (Number(r.ghi) || 0), 0)
        : rows.reduce((s, r) => s + (Number(r.ghi) || 0), 0);
      const temps = rows.map((r) => r.temperature).filter((t) => t != null);
      if (date === todayIso && data.current?.temperature != null) temps.push(Number(data.current.temperature));
      days.push({
        date,
        rows,
        kwhm2: ghiSum / 1000,
        min: temps.length ? Math.min(...temps) : null,
        max: temps.length ? Math.max(...temps) : null,
        rain: rows.reduce((s, r) => s + (Number(r.rain) || 0), 0),
        condition: this._dayCondition(rows),
      });
      if (days.length === 3) break;
    }
    if (days.length < 2) return "";

    const best = days.reduce((a, b) => (b.kwhm2 > a.kwhm2 ? b : a));
    const maxKwh = Math.max(0.1, ...days.map((d) => d.kwhm2));
    const dayName = (iso) => {
      if (iso === todayIso) return this._t("today");
      if (iso === tomorrowIso) return this._t("tomorrow");
      return new Intl.DateTimeFormat(this._locale, { weekday: "long", timeZone: "UTC" })
        .format(new Date(`${iso}T12:00:00Z`));
    };

    const cards = days.map((d) => `
      <div class="day ${d === best ? "best" : ""}">
        ${d === best ? `<span class="crown"><ha-icon icon="mdi:crown"></ha-icon></span>` : ""}
        <div class="day-name">${dayName(d.date)}</div>
        <ha-icon class="day-icon ${this._iconTone(d.condition)}" icon="mdi:${WEATHER_ICONS[d.condition]}"></ha-icon>
        <div class="day-temp">${this._temp(d.max)} <span>${this._temp(d.min)}</span></div>
        <div class="day-sun">${this._num(d.kwhm2, 1)} <small>kWh/m²</small></div>
        <div class="day-bar"><div style="width:${Math.round((d.kwhm2 / maxKwh) * 100)}%"></div></div>
        <div class="day-rain">${d.rain >= 0.1 ? `${this._num(d.rain, 1)} mm` : ""}</div>
      </div>`).join("");

    return `
      <div class="section">
        <div class="section-head"><span class="section-title">${this._t("days")}</span></div>
        <div class="days">${cards}</div>
        <div class="best-note">${this._t("bestDay")}: <strong>${dayName(best.date)}</strong></div>
      </div>`;
  }

  // Catmull-Rom → cubic Bézier; control points are clamped to the baseline so the curve never dips below zero
  _smoothPath(points) {
    let d = `M ${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i += 1) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = Math.min(WEATHER_CHART_H, p1[1] + (p2[1] - p0[1]) / 6);
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = Math.min(WEATHER_CHART_H, p2[1] - (p3[1] - p1[1]) / 6);
      d += ` C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
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

if (!customElements.get("sfml-weather-card")) customElements.define("sfml-weather-card", SfmlWeatherCard);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "sfml-weather-card")) {
  const code = (document.documentElement.lang || navigator.language || "en").toLowerCase().slice(0, 2);
  const cardLang = code === "de" || code === "pl" ? code : "en";
  window.customCards.push({
    type: "sfml-weather-card",
    name: ({ de: "Solar Forecast ML – Solarwetter", en: "Solar Forecast ML – Solar Weather", pl: "Solar Forecast ML – Pogoda solarna" })[cardLang],
    preview: true,
    description: ({ de: "Wetter aus Sicht deiner PV-Anlage: Sonnenbogen, Sonnenlicht vs. Klarhimmel und Solar-Ranking der nächsten Tage – von Solar Forecast ML.", en: "Weather from your solar plant's point of view: sun arc, sunlight vs. clear sky and a solar ranking of the next days – by Solar Forecast ML.", pl: "Pogoda z punktu widzenia instalacji PV: łuk słońca, światło wobec bezchmurnego nieba i ranking solarny kolejnych dni – od Solar Forecast ML." })[cardLang],
    documentationURL: "https://www.solarforecastml.com/",
  });
}
