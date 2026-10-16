// SFML Shading Lovelace Card
// (C) 2026 Zara-Toorox

// Solar Forecast ML brand mark (96 px WebP of brand/icon@2x.png), inlined so the card needs no extra asset
const SHADOW_BRAND_ICON = "data:image/webp;base64,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";
const SHADOW_BRAND_URL = { de: "https://www.solarforecastml.com/de/", en: "https://www.solarforecastml.com/en/", pl: "https://www.solarforecastml.com/en/" };

const SHADOW_TEXT = {
  de: {
    title: "Verschattung",
    tagline: "Gelernte Verschattung von Solar Forecast ML",
    nowShaded: "{group} im Schatten",
    nowShadedMany: "{n} Panelgruppen im Schatten",
    nowFree: "Gerade kein Schatten",
    window: "ca. {start}–{end} · bis −{loss} % Direktlicht",
    chipNow: "Jetzt Schatten",
    chipNext: "Nächster Schatten ab ca. {time}",
    chipFree: "Heute schattenfrei",
    lossToday: "Schattenverlust heute",
    today: "Heute je Panelgruppe",
    learned: "gelernt aus {days} Sonnentagen",
    free: "frei",
    tomorrow: "Morgen",
    month: "Schattenverlust diesen Monat",
    positions: "Gelernte Positionen",
    positionsHint: "Gelernte Positionen sind Sonnenstände, an denen SFML an mindestens 4 klaren Tagen Schatten bestätigt hat.",
    tomorrowFree: "frei",
    learning: "SFML lernt die Verschattung deiner Anlage noch. Sie erscheint hier nach einigen sonnigen Tagen.",
    error: "Schattendaten nicht erreichbar.",
    loading: "Lade Verschattung …",
  },
  en: {
    title: "Shading",
    tagline: "Learned shading by Solar Forecast ML",
    nowShaded: "{group} in shade",
    nowShadedMany: "{n} panel groups in shade",
    nowFree: "No shade right now",
    window: "approx. {start}–{end} · up to −{loss} % direct light",
    chipNow: "Shade now",
    chipNext: "Next shade from approx. {time}",
    chipFree: "No shade today",
    lossToday: "Shading loss today",
    today: "Today per panel group",
    learned: "learned from {days} sunny days",
    free: "clear",
    tomorrow: "Tomorrow",
    month: "Shading loss this month",
    positions: "Learned positions",
    positionsHint: "Learned positions are sun positions where SFML confirmed shade on at least 4 clear days.",
    tomorrowFree: "clear",
    learning: "SFML is still learning how your system is shaded. It appears here after a few sunny days.",
    error: "Shading data unavailable.",
    loading: "Loading shading …",
  },
  pl: {
    title: "Zacienienie",
    tagline: "Wyuczone zacienienie od Solar Forecast ML",
    nowShaded: "{group} w cieniu",
    nowShadedMany: "{n} grupy paneli w cieniu",
    nowFree: "Teraz bez cienia",
    window: "ok. {start}–{end} · do −{loss} % światła bezpośredniego",
    chipNow: "Teraz cień",
    chipNext: "Następny cień od ok. {time}",
    chipFree: "Dziś bez cienia",
    lossToday: "Strata z cienia dziś",
    today: "Dziś dla każdej grupy paneli",
    learned: "wyuczone z {days} słonecznych dni",
    free: "bez cienia",
    tomorrow: "Jutro",
    month: "Strata z cienia w tym miesiącu",
    positions: "Wyuczone pozycje",
    positionsHint: "Wyuczone pozycje to położenia słońca, w których SFML potwierdził cień w co najmniej 4 pogodne dni.",
    tomorrowFree: "bez cienia",
    learning: "SFML wciąż uczy się zacienienia twojej instalacji. Pojawi się tutaj po kilku słonecznych dniach.",
    error: "Dane o zacienieniu niedostępne.",
    loading: "Wczytywanie zacienienia …",
  },
};

// Learned shade changes once a day; position along the sun path once a quarter hour is enough
const SHADOW_REFRESH_MS = 15 * 60 * 1000;

class SfmlShadowCard extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this.initCard();
    }
    const now = Date.now();
    if (!this._lastUpdate || now - this._lastUpdate > SHADOW_REFRESH_MS) {
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
    const text = SHADOW_TEXT[this._lang][key] ?? SHADOW_TEXT.en[key] ?? key;
    return typeof text === "string" ? text.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "") : text;
  }

  _num(value, digits = 2) {
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

  _minutes(hhmm) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ""));
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
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
          border-top: 1px solid var(--s-divider);
          font-size: 11px;
          color: var(--s-muted);
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
          --s-text: var(--primary-text-color, #212121);
          --s-muted: var(--secondary-text-color, #727272);
          --s-divider: var(--divider-color, rgba(127, 127, 127, 0.2));
          --s-sun: var(--energy-solar-color, #ff9800);
          --s-shade: #5c6bc0;
          --s-shade-soft: color-mix(in srgb, #5c6bc0 50%, transparent);
          --s-clear: color-mix(in srgb, var(--s-text) 7%, transparent);
        }
        ha-card {
          position: relative;
          overflow: hidden;
          container-type: inline-size;
        }
        .content {
          padding: 16px;
          color: var(--s-text);
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 12px;
        }
        .chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          color: var(--s-shade);
          background: color-mix(in srgb, var(--s-shade) 15%, transparent);
        }
        .chip.free {
          color: var(--success-color, #43a047);
          background: color-mix(in srgb, var(--success-color, #43a047) 14%, transparent);
        }
        .chip[hidden] {
          display: none;
        }
        .chip ha-icon {
          --mdc-icon-size: 15px;
        }

        .sky {
          border-radius: 16px;
          padding: 14px 14px 10px;
          border: 1px solid var(--s-divider);
          background: linear-gradient(170deg,
            color-mix(in srgb, #4fa3ff 16%, transparent),
            color-mix(in srgb, var(--s-sun) 10%, transparent));
        }
        .sky-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }
        .now-state {
          font-size: 15px;
          font-weight: 600;
          min-width: 0;
        }
        .now-state small {
          display: block;
          margin-top: 2px;
          font-size: 12px;
          font-weight: 400;
          color: var(--s-muted);
        }
        .loss {
          flex: none;
          text-align: right;
        }
        .loss b {
          display: block;
          font-size: 22px;
          line-height: 1.1;
          color: var(--s-shade);
          font-variant-numeric: tabular-nums;
        }
        .loss span {
          font-size: 11px;
          color: var(--s-muted);
        }
        .arc svg {
          display: block;
          width: 100%;
          height: auto;
          margin-top: 6px;
          overflow: visible;
        }
        .arc .track {
          fill: none;
          stroke: color-mix(in srgb, var(--s-sun) 70%, transparent);
          stroke-width: 5;
          stroke-linecap: round;
        }
        .arc .shade {
          fill: none;
          stroke: var(--s-shade);
          stroke-width: 9;
          stroke-linecap: round;
        }
        .arc .shade.light {
          stroke: var(--s-shade-soft);
        }
        .arc .horizon {
          stroke: color-mix(in srgb, var(--s-text) 25%, transparent);
          stroke-width: 1;
        }
        .arc .sun {
          fill: var(--s-sun);
          filter: drop-shadow(0 0 6px var(--s-sun));
        }
        .arc .glow {
          fill: var(--s-sun);
          opacity: 0.25;
        }
        .arc-legend {
          display: flex;
          justify-content: space-between;
          margin-top: 2px;
          font-size: 12px;
          color: var(--s-muted);
          font-variant-numeric: tabular-nums;
        }
        .arc-legend span {
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
        .arc-legend ha-icon {
          --mdc-icon-size: 15px;
        }

        .section {
          margin-top: 16px;
        }
        .section-title {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 500;
        }
        .section-title small {
          font-size: 11px;
          font-weight: 400;
          color: var(--s-muted);
          text-align: right;
        }
        .lane {
          margin-bottom: 10px;
        }
        .lane-head {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 2px 8px;
          font-size: 13px;
        }
        .lane-head b {
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .lane-head span {
          font-size: 12px;
          color: var(--s-muted);
          font-variant-numeric: tabular-nums;
        }
        .bar {
          position: relative;
          height: 12px;
          margin-top: 4px;
          border-radius: 6px;
          background: linear-gradient(90deg,
            color-mix(in srgb, var(--s-sun) 22%, transparent),
            color-mix(in srgb, var(--s-sun) 42%, transparent),
            color-mix(in srgb, var(--s-sun) 22%, transparent));
        }
        .block {
          position: absolute;
          top: 0;
          bottom: 0;
          min-width: 4px;
          border-radius: 6px;
          background: var(--s-shade);
        }
        .block.light {
          background: var(--s-shade-soft);
        }
        .now-tick {
          position: absolute;
          top: -3px;
          bottom: -3px;
          width: 2px;
          margin-left: -1px;
          border-radius: 1px;
          background: var(--s-text);
          opacity: 0.6;
        }
        .axis {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: var(--s-muted);
          font-variant-numeric: tabular-nums;
        }

        .facts {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-top: 14px;
        }
        .fact {
          padding: 9px 10px;
          border-radius: 12px;
          border: 1px solid var(--s-divider);
          background: color-mix(in srgb, var(--s-text) 4%, transparent);
          min-width: 0;
        }
        .fact small {
          display: block;
          font-size: 11px;
          line-height: 1.3;
          color: var(--s-muted);
        }
        .facts-note {
          margin-top: 6px;
          font-size: 11px;
          line-height: 1.4;
          color: var(--s-muted);
        }
        .fact b {
          font-size: 15px;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }
        .state {
          padding: 24px 0;
          text-align: center;
          color: var(--s-muted);
          font-size: 14px;
          line-height: 1.5;
        }

        @container (max-width: 420px) {
          .header { flex-wrap: wrap; row-gap: 8px; }
          .chip { margin-left: 52px; }
          .facts { grid-template-columns: 1fr; gap: 6px; }
          .fact { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 8px 12px; }
          .fact small { display: inline; }
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
    this.shadowRoot.querySelector(".brand-icon").src = SHADOW_BRAND_ICON;
    this.shadowRoot.querySelector(".tagline").textContent = this._t("tagline");
    this.shadowRoot.querySelector(".brand-link").href = SHADOW_BRAND_URL[this._lang];
    this.shadowRoot.querySelector(".state").textContent = this._t("loading");
    this.container = this.shadowRoot.querySelector(".body");
    this.chip = this.shadowRoot.querySelector(".chip");
  }

  async updateData() {
    if (!this._hass || !this.container) return;
    try {
      const response = await this._hass.callApi("GET", "sfml_stats/solar/shadow_card");
      if (!response?.success) {
        if (!this._rendered) this._showState(this._t("error"));
        return;
      }
      this.render(response.data || {});
    } catch (err) {
      console.error("SFML Shadow Card fetch error:", err);
      if (!this._rendered) this._showState(this._t("error"));
    }
  }

  _showState(text) {
    this.container.innerHTML = `<div class="state"></div>`;
    this.container.firstElementChild.textContent = text;
  }

  _groupLabel(group) {
    return (this._groupLabels || {})[group] || group;
  }

  // All of today's windows across groups, earliest first
  _allWindows(day) {
    const out = [];
    for (const [group, windows] of Object.entries(day?.windows || {})) {
      for (const w of windows) out.push({ ...w, group, startMin: this._minutes(w.start), endMin: this._minutes(w.end) });
    }
    return out.filter((w) => w.startMin != null && w.endMin != null).sort((a, b) => a.startMin - b.startMin);
  }

  render(data) {
    this._rendered = true;
    this._groupLabels = data.group_labels || {};
    if (!data.available) {
      this.chip.hidden = true;
      this._showState(this._t("learning"));
      return;
    }
    const today = data.today || {};
    const nowMin = this._minutes(data.now);
    const windows = this._allWindows(today);
    const actives = windows.filter((w) => nowMin != null && w.startMin <= nowMin && nowMin < w.endMin);
    // With several groups shaded at once, the detail line names the strongest one
    const active = actives.reduce((best, w) => (!best || w.loss_pct > best.loss_pct ? w : best), null);
    const next = windows.find((w) => nowMin != null && w.startMin > nowMin);

    if (active) {
      this.chip.className = "chip";
      this.chip.innerHTML = `<ha-icon icon="mdi:weather-sunny-off"></ha-icon><span></span>`;
      this.chip.querySelector("span").textContent = this._t("chipNow");
    } else if (next) {
      this.chip.className = "chip";
      this.chip.innerHTML = `<ha-icon icon="mdi:weather-sunny-off"></ha-icon><span></span>`;
      this.chip.querySelector("span").textContent = this._t("chipNext", { time: next.start });
    } else {
      this.chip.className = "chip free";
      this.chip.innerHTML = `<ha-icon icon="mdi:weather-sunny"></ha-icon><span></span>`;
      this.chip.querySelector("span").textContent = this._t("chipFree");
    }
    this.chip.hidden = false;

    const focus = active || next;
    const headline = actives.length > 1
      ? this._t("nowShadedMany", { n: actives.length })
      : active ? this._t("nowShaded", { group: this._groupLabel(active.group) }) : this._t("nowFree");
    const detail = focus
      ? `${active && actives.length === 1 ? "" : `${this._escape(this._groupLabel(focus.group))} · `}${this._t("window", { start: focus.start, end: focus.end, loss: focus.loss_pct })}`
      : "";

    this.container.innerHTML = `
      <div class="sky">
        <div class="sky-head">
          <div class="now-state">${this._escape(headline)}${detail ? `<small>${detail}</small>` : ""}</div>
          ${data.loss_today_kwh != null
            ? `<div class="loss"><b>${this._num(data.loss_today_kwh)} kWh</b><span>${this._t("lossToday")}</span></div>`
            : ""}
        </div>
        ${this._arcHtml(today, windows, nowMin)}
      </div>
      ${this._lanesHtml(data, today, nowMin)}
      ${this._factsHtml(data)}
    `;
  }

  _arcHtml(today, windows, nowMin) {
    const rise = this._minutes(today.sunrise);
    const set = this._minutes(today.sunset);
    if (rise == null || set == null || set <= rise) return "";
    const cx = 150;
    const cy = 92;
    const rx = 130;
    const ry = 74;
    const point = (m) => {
      const p = Math.min(1, Math.max(0, (m - rise) / (set - rise)));
      const t = Math.PI * (1 - p);
      return [cx + rx * Math.cos(t), cy - ry * Math.sin(t)];
    };
    const segment = (a, b) => {
      const [x1, y1] = point(a);
      const [x2, y2] = point(b);
      return `M ${x1.toFixed(1)},${y1.toFixed(1)} A ${rx} ${ry} 0 0 1 ${x2.toFixed(1)},${y2.toFixed(1)}`;
    };
    const shades = windows
      .map((w) => `<path class="shade ${w.strength === "light" ? "light" : ""}" d="${segment(w.startMin, w.endMin)}"/>`)
      .join("");
    let sun = "";
    if (nowMin != null && nowMin >= rise && nowMin <= set) {
      const [sx, sy] = point(nowMin);
      sun = `<circle class="glow" cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="10"/><circle class="sun" cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="6"/>`;
    }
    return `
      <div class="arc">
        <svg viewBox="0 0 300 100" aria-hidden="true">
          <line class="horizon" x1="4" x2="296" y1="${cy}" y2="${cy}"/>
          <path class="track" d="${segment(rise, set)}"/>
          ${shades}
          ${sun}
        </svg>
        <div class="arc-legend">
          <span><ha-icon icon="mdi:weather-sunset-up"></ha-icon>${today.sunrise}</span>
          <span>${today.sunset}<ha-icon icon="mdi:weather-sunset-down"></ha-icon></span>
        </div>
      </div>`;
  }

  _lanesHtml(data, today, nowMin) {
    const rise = this._minutes(today.sunrise);
    const set = this._minutes(today.sunset);
    if (rise == null || set == null || set <= rise) return "";
    const pct = (m) => Math.min(100, Math.max(0, ((m - rise) / (set - rise)) * 100));
    const days = Math.max(0, ...Object.values(data.learned_days || {}).map(Number));
    const lanes = (data.groups || []).map((group) => {
      const windows = (today.windows || {})[group] || [];
      const blocks = windows.map((w) => {
        const a = this._minutes(w.start);
        const b = this._minutes(w.end);
        return `<div class="block ${w.strength === "light" ? "light" : ""}" style="left:${pct(a).toFixed(1)}%;width:${Math.max(0.8, pct(b) - pct(a)).toFixed(1)}%"></div>`;
      }).join("");
      const text = windows.length
        ? windows.map((w) => this._t("window", { start: w.start, end: w.end, loss: w.loss_pct })).join(" · ")
        : this._t("free");
      const tick = nowMin != null && nowMin >= rise && nowMin <= set
        ? `<div class="now-tick" style="left:${pct(nowMin).toFixed(1)}%"></div>`
        : "";
      return `
        <div class="lane">
          <div class="lane-head"><b>${this._escape(this._groupLabel(group))}</b><span>${text}</span></div>
          <div class="bar">${blocks}${tick}</div>
        </div>`;
    }).join("");
    return `
      <div class="section">
        <div class="section-title">${this._t("today")}<small>${days ? this._t("learned", { days }) : ""}</small></div>
        ${lanes}
        <div class="axis"><span>${today.sunrise}</span><span>${today.sunset}</span></div>
      </div>`;
  }

  _factsHtml(data) {
    const tomorrow = this._allWindows(data.tomorrow);
    const first = tomorrow[0];
    const positions = Object.values(data.positions || {}).reduce((sum, n) => sum + Number(n || 0), 0);
    return `
      <div class="facts">
        <div class="fact"><small>${this._t("tomorrow")}</small><b>${first ? `ca. ${first.start}–${first.end}` : this._t("tomorrowFree")}</b></div>
        <div class="fact"><small>${this._t("month")}</small><b>${data.loss_month_kwh != null ? `−${this._num(data.loss_month_kwh, 1)} kWh` : "–"}</b></div>
        <div class="fact"><small>${this._t("positions")}</small><b>${positions}</b></div>
      </div>
      <div class="facts-note">${this._t("positionsHint")}</div>`;
  }

  // Sections view: always span the full section width, height follows the content
  getGridOptions() {
    return { columns: 12, min_columns: 12, rows: "auto" };
  }

  getCardSize() {
    return 8;
  }

  static getStubConfig() {
    return {};
  }
}

if (!customElements.get("sfml-shadow-card")) customElements.define("sfml-shadow-card", SfmlShadowCard);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "sfml-shadow-card")) {
  const de = (document.documentElement.lang || navigator.language || "").toLowerCase().startsWith("de");
  window.customCards.push({
    type: "sfml-shadow-card",
    name: de ? "Solar Forecast ML – Verschattung" : "Solar Forecast ML – Shading",
    preview: true,
    description: de
      ? "Wann Schatten auf deine Panelgruppen fällt – heute und morgen, gelernt von Solar Forecast ML."
      : "When shade falls on your panel groups – today and tomorrow, learned by Solar Forecast ML.",
    documentationURL: "https://www.solarforecastml.com/",
  });
}
