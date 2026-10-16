// SFML Weather Warning Lovelace Card
// (C) 2026 Zara-Toorox

// Solar Forecast ML brand mark (96 px WebP of brand/icon@2x.png), inlined so the card needs no extra asset
const WARNING_BRAND_ICON = "data:image/webp;base64,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";
const WARNING_BRAND_URL = { de: "https://www.solarforecastml.com/de/", en: "https://www.solarforecastml.com/en/", pl: "https://www.solarforecastml.com/en/" };

const WARNING_TEXT = {
  de: {
    title: "Wetterwarnungen",
    tagline: "Warnungen aus Solar Forecast EAI",
    none: "Keine Wetterwarnungen",
    noneSub: "Für die nächsten Stunden ist nichts Besonderes zu erwarten.",
    count: { one: "1 Warnung", other: "{n} Warnungen" },
    severity: { advisory: "Hinweis", warning: "Warnung", critical: "Unwetter" },
    official: "Amtlich",
    model: "SFML-Prognose",
    activeFor: "Aktiv · noch {v}",
    startsIn: "Beginnt in {v}",
    until: "bis {v}",
    timeline: "Nächste 48 Stunden",
    now: "Jetzt",
    today: "Heute",
    tomorrow: "Morgen",
    more: "+{n} weitere",
    missing: "Wetterwarnungen benötigen Solar Forecast EAI mit Wetterdaten.",
    loading: "Lade Wetterwarnungen …",
  },
  en: {
    title: "Weather warnings",
    tagline: "Warnings from Solar Forecast EAI",
    none: "No weather warnings",
    noneSub: "Nothing unusual expected for the coming hours.",
    count: { one: "1 warning", other: "{n} warnings" },
    severity: { advisory: "Advisory", warning: "Warning", critical: "Severe" },
    official: "Official",
    model: "SFML forecast",
    activeFor: "Active · {v} left",
    startsIn: "Starts in {v}",
    until: "until {v}",
    timeline: "Next 48 hours",
    now: "Now",
    today: "Today",
    tomorrow: "Tomorrow",
    more: "+{n} more",
    missing: "Weather warnings need Solar Forecast EAI with weather data.",
    loading: "Loading weather warnings …",
  },
  pl: {
    title: "Ostrzeżenia pogodowe",
    tagline: "Ostrzeżenia z Solar Forecast EAI",
    none: "Brak ostrzeżeń pogodowych",
    noneSub: "W najbliższych godzinach nie zapowiada się nic szczególnego.",
    count: { one: "1 ostrzeżenie", other: "{n} ostrzeżeń" },
    severity: { advisory: "Informacja", warning: "Ostrzeżenie", critical: "Gwałtowna pogoda" },
    official: "Oficjalne",
    model: "Prognoza SFML",
    activeFor: "Aktywne · jeszcze {v}",
    startsIn: "Zaczyna się za {v}",
    until: "do {v}",
    timeline: "Najbliższe 48 godzin",
    now: "Teraz",
    today: "Dzisiaj",
    tomorrow: "Jutro",
    more: "+{n} więcej",
    missing: "Ostrzeżenia pogodowe wymagają Solar Forecast EAI z danymi pogody.",
    loading: "Wczytywanie ostrzeżeń pogodowych …",
  },
};

const WARNING_ICONS = {
  frost: "snowflake-thermometer",
  heat: "thermometer-high",
  heavy_rain: "weather-pouring",
  rain_likely: "weather-rainy",
  strong_wind: "weather-windy",
  storm: "weather-tornado",
  thunderstorm: "weather-lightning-rainy",
  hail: "weather-hail",
  snow_or_ice: "weather-snowy-heavy",
  fog: "weather-fog",
  severe_weather: "alert-octagon",
};

// Mirrors the EAI sensor contract (sensor.py WEATHER_WARNING_*): only valid hazard events are shown
const WARNING_SEVERITY_RANK = { critical: 0, warning: 1, advisory: 2 };
const WARNING_NON_HAZARD = new Set(["none", "forecast_stale", "forecast_unavailable"]);
const WARNING_EAI_PLATFORM = "solar_forecast_eai";
const WARNING_EAI_KEY = "weather_active_event";
const WARNING_HORIZON_H = 48;
const WARNING_MAX_LANES = 5;
const WARNING_TICK_MS = 60000;

class SfmlWarningCard extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (!this._initialized) {
      this.initCard();
    }
    // Warnings come from entity attributes; re-render only when that state object changes
    const stateObj = this._findState();
    if (first || stateObj !== this._stateObj) {
      this._stateObj = stateObj;
      this.render();
    }
  }

  connectedCallback() {
    // Countdown and "now" marker move even when the entity does not change
    this._timer = setInterval(() => this._initialized && this.render(), WARNING_TICK_MS);
  }

  disconnectedCallback() {
    clearInterval(this._timer);
  }

  get _locale() {
    return this._hass?.locale?.language || this._hass?.language || "en";
  }

  get _lang() {
    const code = String(this._locale || "en").toLowerCase().slice(0, 2);
    return code === "de" || code === "pl" ? code : "en";
  }

  get _tz() {
    return this._hass?.config?.time_zone;
  }

  _t(key, vars = {}) {
    const text = WARNING_TEXT[this._lang][key] ?? WARNING_TEXT.en[key] ?? key;
    return typeof text === "string" ? text.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "") : text;
  }

  _escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }

  _findState() {
    const hass = this._hass;
    if (!hass) return null;
    if (this._config.entity) return hass.states[this._config.entity] || null;
    const entities = hass.entities || {};
    const match = Object.keys(entities).find((id) =>
      entities[id]?.platform === WARNING_EAI_PLATFORM && entities[id]?.translation_key === WARNING_EAI_KEY);
    return match ? hass.states[match] || null : null;
  }

  _warnings(now) {
    const events = this._stateObj?.attributes?.events;
    if (!Array.isArray(events)) return [];
    return events
      .filter((e) => e && typeof e === "object"
        && e.contract_version === 1
        && e.category === "weather_hazard"
        && typeof e.code === "string" && !WARNING_NON_HAZARD.has(e.code)
        && e.severity in WARNING_SEVERITY_RANK)
      .map((e) => ({ ...e, startMs: Date.parse(e.start), endMs: Date.parse(e.end) }))
      .filter((e) => Number.isFinite(e.startMs) && Number.isFinite(e.endMs) && e.endMs > e.startMs && e.endMs > now)
      .sort((a, b) => a.startMs - b.startMs);
  }

  // Same ordering as the EAI "most important warning" sensor: highest severity, then earliest
  _primary(warnings) {
    return [...warnings].sort((a, b) =>
      WARNING_SEVERITY_RANK[a.severity] - WARNING_SEVERITY_RANK[b.severity] || a.startMs - b.startMs)[0];
  }

  _fmt(ms, options) {
    return new Intl.DateTimeFormat(this._locale, { ...options, ...(this._tz ? { timeZone: this._tz } : {}) })
      .format(new Date(ms));
  }

  // Hour of day in the HA timezone; locale-independent ("13 Uhr" in German would not parse)
  _hour(ms) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit", hourCycle: "h23", ...(this._tz ? { timeZone: this._tz } : {}),
    }).formatToParts(new Date(ms));
    return Number(parts.find((p) => p.type === "hour")?.value);
  }

  _dayKey(ms) {
    return this._fmt(ms, { year: "numeric", month: "2-digit", day: "2-digit" });
  }

  // "Heute 09:00", "Morgen 14:00" or "Fr 09:00"
  _when(ms, now) {
    const time = this._fmt(ms, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    const day = this._dayKey(ms);
    if (day === this._dayKey(now)) return `${this._t("today")} ${time}`;
    if (day === this._dayKey(now + 86400000)) return `${this._t("tomorrow")} ${time}`;
    return `${this._fmt(ms, { weekday: "short" })} ${time}`;
  }

  _span(ms) {
    const minutes = Math.max(1, Math.round(ms / 60000));
    const d = Math.floor(minutes / 1440);
    const h = Math.floor((minutes % 1440) / 60);
    const m = minutes % 60;
    if (d > 0) return `${d} d ${h} h`;
    if (h > 0) return `${h} h ${String(m).padStart(2, "0")} min`;
    return `${m} min`;
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
          border-top: 1px solid var(--x-divider);
          font-size: 11px;
          color: var(--x-muted);
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
          --x-text: var(--primary-text-color, #212121);
          --x-muted: var(--secondary-text-color, #727272);
          --x-divider: var(--divider-color, rgba(127, 127, 127, 0.2));
          --x-good: var(--success-color, #43a047);
        }
        /* Warning levels follow the familiar yellow / orange / red scale */
        .sev-advisory { --sev: #f2b705; --sev-ink: #a77d00; }
        .sev-warning { --sev: #f57c00; --sev-ink: #d86a00; }
        .sev-critical { --sev: var(--error-color, #db4437); --sev-ink: var(--error-color, #db4437); }
        ha-card {
          position: relative;
          overflow: hidden;
          container-type: inline-size;
        }
        .content {
          padding: 16px;
          color: var(--x-text);
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 12px;
        }
        .count {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          color: var(--sev-ink);
          background: color-mix(in srgb, var(--sev) 16%, transparent);
        }
        .count[hidden] {
          display: none;
        }
        .count .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--sev);
          animation: ping 2s ease-out infinite;
        }

        .hero {
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          padding: 16px;
          border: 1px solid color-mix(in srgb, var(--sev) 45%, transparent);
          background: linear-gradient(135deg,
            color-mix(in srgb, var(--sev) 20%, transparent),
            color-mix(in srgb, var(--sev) 5%, transparent));
        }
        .hero.active::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--sev) 70%, transparent);
          animation: glow 2.6s ease-in-out infinite;
          pointer-events: none;
        }
        .hero-top {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 14px;
          align-items: center;
        }
        .hero-icon {
          display: grid;
          place-items: center;
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: var(--sev);
          color: #fff;
          box-shadow: 0 4px 14px color-mix(in srgb, var(--sev) 45%, transparent);
        }
        .hero-icon ha-icon {
          --mdc-icon-size: 32px;
        }
        .hero.active .hero-icon ha-icon {
          animation: wobble 3s ease-in-out infinite;
        }
        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 4px;
        }
        .chip {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          white-space: nowrap;
        }
        .chip ha-icon {
          --mdc-icon-size: 13px;
        }
        .chip.level {
          color: #fff;
          background: var(--sev);
        }
        .chip.source {
          color: var(--x-muted);
          background: color-mix(in srgb, var(--x-text) 8%, transparent);
        }
        .chip.source.official {
          color: #2a90e0;
          background: color-mix(in srgb, #2a90e0 14%, transparent);
        }
        .hero-title {
          font-size: clamp(17px, 5.4cqw, 21px);
          font-weight: 600;
          line-height: 1.25;
        }
        .status {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 4px 10px;
          margin-top: 14px;
          font-size: 13px;
          font-variant-numeric: tabular-nums;
        }
        .status strong {
          color: var(--sev-ink);
        }
        .status span:last-child {
          color: var(--x-muted);
        }
        .progress {
          height: 6px;
          margin-top: 6px;
          border-radius: 3px;
          background: color-mix(in srgb, var(--sev) 18%, transparent);
          overflow: hidden;
        }
        .progress div {
          height: 100%;
          border-radius: 3px;
          background: var(--sev);
          transition: width 1s ease;
        }
        .action {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          font-size: 13px;
          line-height: 1.45;
          background: color-mix(in srgb, var(--x-text) 5%, transparent);
        }
        .action ha-icon {
          --mdc-icon-size: 18px;
          flex: none;
          color: var(--sev-ink);
        }

        .calm {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 14px;
          align-items: center;
          padding: 16px;
          border-radius: 16px;
          border: 1px solid color-mix(in srgb, var(--x-good) 35%, transparent);
          background: linear-gradient(135deg,
            color-mix(in srgb, var(--x-good) 14%, transparent),
            color-mix(in srgb, var(--x-good) 3%, transparent));
        }
        .calm ha-icon {
          --mdc-icon-size: 40px;
          color: var(--x-good);
        }
        .calm strong {
          display: block;
          font-size: 17px;
          font-weight: 600;
        }
        .calm span {
          font-size: 13px;
          color: var(--x-muted);
        }

        .timeline {
          margin-top: 16px;
        }
        .tl-title {
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 8px;
        }
        .tl-body {
          position: relative;
        }
        .lane {
          position: relative;
          padding: 4px 0 8px;
        }
        .lane-head {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          min-width: 0;
        }
        .lane-head ha-icon {
          --mdc-icon-size: 16px;
          flex: none;
          color: var(--sev-ink);
        }
        .lane-title {
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .lane-time {
          margin-left: auto;
          padding-left: 8px;
          font-size: 12px;
          color: var(--x-muted);
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }
        .track {
          position: relative;
          height: 10px;
          margin-top: 5px;
          border-radius: 5px;
          background: color-mix(in srgb, var(--x-text) 6%, transparent);
        }
        .bar {
          position: absolute;
          top: 0;
          bottom: 0;
          min-width: 6px;
          border-radius: 5px;
          background: linear-gradient(90deg, color-mix(in srgb, var(--sev) 75%, transparent), var(--sev));
          box-shadow: 0 0 8px color-mix(in srgb, var(--sev) 40%, transparent);
        }
        .bar.open-end {
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
        }
        .track .day-tick {
          position: absolute;
          top: -3px;
          bottom: -3px;
          width: 0;
          border-left: 1px dashed color-mix(in srgb, var(--x-text) 30%, transparent);
        }
        .track .now-tick {
          position: absolute;
          top: -3px;
          bottom: -3px;
          width: 2px;
          margin-left: -1px;
          border-radius: 1px;
          background: var(--x-text);
          opacity: 0.6;
        }
        .axis {
          position: relative;
          height: 16px;
          margin-top: 2px;
          font-size: 11px;
          color: var(--x-muted);
          font-variant-numeric: tabular-nums;
        }
        .axis span {
          position: absolute;
          transform: translateX(-50%);
          white-space: nowrap;
        }
        .axis span.edge-start { transform: none; }
        .axis span.day {
          font-weight: 600;
          color: var(--x-text);
        }
        .more {
          font-size: 12px;
          color: var(--x-muted);
          margin-top: 2px;
        }
        .state {
          padding: 28px 0;
          text-align: center;
          color: var(--x-muted);
          font-size: 14px;
        }

        @container (max-width: 420px) {
          .header { flex-wrap: wrap; row-gap: 8px; }
          .count { margin-left: 52px; }
        }
        @container (max-width: 340px) {
          .hero-icon { width: 46px; height: 46px; border-radius: 13px; }
          .hero-icon ha-icon { --mdc-icon-size: 26px; }
          .lane-time { display: none; }
        }
        @keyframes ping {
          0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sev) 60%, transparent); }
          100% { box-shadow: 0 0 0 7px transparent; }
        }
        @keyframes glow {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 1; }
        }
        @keyframes wobble {
          0%, 100% { transform: rotate(0); }
          10% { transform: rotate(-8deg); }
          20% { transform: rotate(8deg); }
          30% { transform: rotate(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .count .dot, .hero.active::before, .hero.active .hero-icon ha-icon { animation: none; }
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
            <div class="count" hidden><span class="dot"></span><span class="count-val"></span></div>
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
    this.shadowRoot.querySelector(".brand-icon").src = WARNING_BRAND_ICON;
    this.shadowRoot.querySelector(".tagline").textContent = this._t("tagline");
    this.shadowRoot.querySelector(".brand-link").href = WARNING_BRAND_URL[this._lang];
    this.shadowRoot.querySelector(".state").textContent = this._t("loading");
    this.container = this.shadowRoot.querySelector(".body");
    this.countChip = this.shadowRoot.querySelector(".count");
  }

  render() {
    if (!this.container || !this._hass) return;
    const now = Date.now();

    if (!this._stateObj) {
      this.countChip.hidden = true;
      this.container.innerHTML = `<div class="state">${this._t("missing")}</div>`;
      return;
    }

    const warnings = this._warnings(now);
    if (!warnings.length) {
      this.countChip.hidden = true;
      this.container.innerHTML = `
        <div class="calm">
          <ha-icon icon="mdi:shield-check-outline"></ha-icon>
          <div><strong>${this._t("none")}</strong><span>${this._t("noneSub")}</span></div>
        </div>`;
      return;
    }

    const primary = this._primary(warnings);
    const counts = this._t("count");
    this.countChip.className = `count sev-${primary.severity}`;
    this.countChip.querySelector(".count-val").textContent = warnings.length === 1
      ? counts.one
      : counts.other.replace("{n}", warnings.length);
    this.countChip.hidden = false;

    this.container.innerHTML = `${this._heroHtml(primary, now)}${this._timelineHtml(warnings, now)}`;
  }

  _heroHtml(w, now) {
    const active = w.startMs <= now;
    const total = w.endMs - w.startMs;
    const progress = active ? Math.min(100, Math.max(0, ((now - w.startMs) / total) * 100)) : 0;
    const status = active
      ? `<strong>${this._t("activeFor", { v: this._span(w.endMs - now) })}</strong>`
      : `<strong>${this._t("startsIn", { v: this._span(w.startMs - now) })}</strong>`;
    const range = active
      ? this._t("until", { v: this._when(w.endMs, now) })
      : `${this._when(w.startMs, now)} – ${this._dayKey(w.endMs) === this._dayKey(w.startMs)
        ? this._fmt(w.endMs, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
        : this._when(w.endMs, now)}`;
    const source = w.official_alert
      ? `<span class="chip source official"><ha-icon icon="mdi:shield-star-outline"></ha-icon>${this._t("official")}</span>`
      : `<span class="chip source"><ha-icon icon="mdi:chart-bell-curve-cumulative"></ha-icon>${this._t("model")}</span>`;

    return `
      <div class="hero sev-${w.severity} ${active ? "active" : ""}">
        <div class="hero-top">
          <div class="hero-icon"><ha-icon icon="mdi:${WARNING_ICONS[w.icon_key] || "alert"}"></ha-icon></div>
          <div>
            <div class="chips">
              <span class="chip level">${this._t("severity")[w.severity]}</span>
              ${source}
            </div>
            <div class="hero-title">${this._escape(w.title || w.code)}</div>
          </div>
        </div>
        <div class="status">${status}<span>${range}</span></div>
        ${active ? `<div class="progress"><div style="width:${progress.toFixed(1)}%"></div></div>` : ""}
        ${w.recommended_action
          ? `<div class="action"><ha-icon icon="mdi:lightbulb-on-outline"></ha-icon><span>${this._escape(w.recommended_action)}</span></div>`
          : ""}
      </div>`;
  }

  _timelineHtml(warnings, now) {
    const t0 = Math.floor(now / 3600000) * 3600000;
    const t1 = t0 + WARNING_HORIZON_H * 3600000;
    const inView = warnings.filter((w) => w.startMs < t1);
    if (!inView.length) return "";
    const pos = (ms) => Math.min(100, Math.max(0, ((ms - t0) / (t1 - t0)) * 100));

    // Midnight separators and 6-hour ticks in the Home Assistant timezone
    const marks = [];
    for (let ms = t0 + 3600000; ms < t1; ms += 3600000) {
      const hour = this._hour(ms);
      if (hour === 0) marks.push({ ms, day: true });
      else if (hour % 6 === 0) marks.push({ ms, day: false });
    }
    const ticks = marks.filter((m) => m.day)
      .map((m) => `<i class="day-tick" style="left:${pos(m.ms).toFixed(2)}%"></i>`).join("")
      + `<i class="now-tick" style="left:${pos(now).toFixed(2)}%"></i>`;

    const lanes = inView.slice(0, WARNING_MAX_LANES).map((w) => {
      const left = pos(w.startMs);
      const right = pos(w.endMs);
      const openEnd = w.endMs > t1;
      const time = `${this._when(Math.max(w.startMs, now), now)} – ${this._fmt(w.endMs, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}`;
      return `
        <div class="lane sev-${w.severity}">
          <div class="lane-head">
            <ha-icon icon="mdi:${WARNING_ICONS[w.icon_key] || "alert"}"></ha-icon>
            <span class="lane-title">${this._escape(w.title || w.code)}</span>
            <span class="lane-time">${time}</span>
          </div>
          <div class="track">
            ${ticks}
            <div class="bar ${openEnd ? "open-end" : ""}" style="left:${left.toFixed(2)}%;width:${Math.max(1.5, right - left).toFixed(2)}%"></div>
          </div>
        </div>`;
    }).join("");

    const axis = [
      `<span class="edge-start" style="left:0">${this._t("now")}</span>`,
      ...marks
        .filter((m) => pos(m.ms) > 12 && pos(m.ms) < 94)
        .map((m) => `<span class="${m.day ? "day" : ""}" style="left:${pos(m.ms).toFixed(2)}%">${m.day
          ? this._fmt(m.ms, { weekday: "short" })
          : String(this._hour(m.ms)).padStart(2, "0")}</span>`),
    ].join("");
    const more = inView.length > WARNING_MAX_LANES
      ? `<div class="more">${this._t("more", { n: inView.length - WARNING_MAX_LANES })}</div>`
      : "";

    return `
      <div class="timeline">
        <div class="tl-title">${this._t("timeline")}</div>
        <div class="tl-body">
          ${lanes}
          <div class="axis">${axis}</div>
        </div>
        ${more}
      </div>`;
  }

  // Sections view: always span the full section width, height follows the content
  getGridOptions() {
    return { columns: 12, min_columns: 12, rows: "auto" };
  }

  getCardSize() {
    return 5;
  }

  static getStubConfig() {
    return {};
  }
}

if (!customElements.get("sfml-warning-card")) customElements.define("sfml-warning-card", SfmlWarningCard);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "sfml-warning-card")) {
  const code = (document.documentElement.lang || navigator.language || "en").toLowerCase().slice(0, 2);
  const cardLang = code === "de" || code === "pl" ? code : "en";
  window.customCards.push({
    type: "sfml-warning-card",
    name: ({ de: "Solar Forecast ML – Wetterwarnungen", en: "Solar Forecast ML – Weather Warnings", pl: "Solar Forecast ML – Ostrzeżenia pogodowe" })[cardLang],
    preview: true,
    description: ({ de: "Wetterwarnungen aus Solar Forecast EAI mit Live-Countdown und 48-Stunden-Zeitleiste – von Solar Forecast ML.", en: "Weather warnings from Solar Forecast EAI with live countdown and 48-hour timeline – by Solar Forecast ML.", pl: "Ostrzeżenia pogodowe z Solar Forecast EAI z licznikiem na żywo i osią czasu 48 godzin – od Solar Forecast ML." })[cardLang],
    documentationURL: "https://www.solarforecastml.com/",
  });
}
