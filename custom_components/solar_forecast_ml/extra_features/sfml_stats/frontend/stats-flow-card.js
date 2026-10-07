// STATS Flow Lovelace Card
// (C) 2026 Zara-Toorox

const STATS_FLOW_TEXT = {
  de: {
    title: "Energiefluss",
    tagline: "KI-gestützte Solarprognose",
    solar: "PV",
    grid: "Netz",
    home: "Zuhause",
    battery: "Batterie",
    autarky: "autark",
    pvToday: "PV heute",
    importToday: "Bezug heute",
    batteryToday: "Akku geladen",
    error: "Energiefluss nicht erreichbar.",
  },
  en: {
    title: "Energy flow",
    tagline: "AI-powered solar forecasting",
    solar: "Solar",
    grid: "Grid",
    home: "Home",
    battery: "Battery",
    autarky: "self-powered",
    pvToday: "Solar today",
    importToday: "Import today",
    batteryToday: "Battery charged",
    error: "Energy flow unavailable.",
  },
};

// Solar Forecast ML brand mark (96 px WebP of brand/icon@2x.png), inlined so the card needs no extra asset
const FLOW_BRAND_ICON = "data:image/webp;base64,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";
const FLOW_BRAND_URL = { de: "https://www.solarforecastml.com/de/", en: "https://www.solarforecastml.com/en/" };

const STATS_FLOW_REFRESH_MS = 10000;
const STATS_FLOW_MIN_W = 10;

// Node centres and connection paths in a 100×100 viewBox; node radius 12
const STATS_FLOW_NODES = {
  solar: [50, 20],
  grid: [14, 49],
  home: [86, 49],
  battery: [50, 78],
};
const STATS_FLOW_PATHS = {
  solarHome: { d: "M 53,32 V 41 Q 53,47 59,47 H 74", color: "solar" },
  solarGrid: { d: "M 47,32 V 41 Q 47,47 41,47 H 26", color: "export" },
  solarBattery: { d: "M 50,32 V 66", color: "charge", battery: true },
  gridHome: { d: "M 26,49 H 74", color: "import" },
  gridBattery: { d: "M 26,51 H 41 Q 47,51 47,57 V 66", color: "import", battery: true },
  batteryHome: { d: "M 53,66 V 57 Q 53,51 59,51 H 74", color: "discharge", battery: true },
};

class StatsFlowCard extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this.initCard();
    }

    // Throttle API calls to 10 seconds for real-time flows
    const now = Date.now();
    if (!this._lastUpdate || now - this._lastUpdate > STATS_FLOW_REFRESH_MS) {
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
    const text = STATS_FLOW_TEXT[this._lang][key] ?? STATS_FLOW_TEXT.en[key] ?? key;
    return text.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "");
  }

  _num(value, digits) {
    return new Intl.NumberFormat(this._locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(Number(value) || 0);
  }

  _power(watts) {
    const w = Math.abs(Number(watts) || 0);
    return w >= 1000 ? `${this._num(w / 1000, w >= 10000 ? 1 : 2)} kW` : `${Math.round(w)} W`;
  }

  _kwh(value) {
    const v = Number(value) || 0;
    return `${this._num(v, v >= 100 ? 0 : v >= 10 ? 1 : 2)} kWh`;
  }

  initCard() {
    this._initialized = true;
    this.attachShadow({ mode: "open" });

    const pathsSvg = Object.entries(STATS_FLOW_PATHS)
      .map(([id, p]) => `<path id="line-${id}" class="line c-${p.color}" d="${p.d}"/>`)
      .join("");

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
          border-top: 1px solid var(--c-divider);
          font-size: 11px;
          color: var(--c-muted);
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
          --c-solar: var(--energy-solar-color, #ff9800);
          --c-import: var(--energy-grid-consumption-color, #488fc2);
          --c-export: var(--energy-grid-return-color, #8353d1);
          --c-charge: var(--energy-battery-in-color, #f06292);
          --c-discharge: var(--energy-battery-out-color, #4db6ac);
          --c-text: var(--primary-text-color, #212121);
          --c-muted: var(--secondary-text-color, #727272);
          --c-divider: var(--divider-color, rgba(127, 127, 127, 0.2));
          --c-bg: var(--ha-card-background, var(--card-background-color, #fff));
        }
        ha-card {
          position: relative;
          overflow: hidden;
          container-type: inline-size;
        }
        .content {
          padding: 16px;
          color: var(--c-text);
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .price {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          color: var(--c-import);
          background: color-mix(in srgb, var(--c-import) 14%, transparent);
        }
        .price[hidden] {
          display: none;
        }
        .price ha-icon {
          --mdc-icon-size: 16px;
        }

        .flow {
          position: relative;
          width: 100%;
          max-width: 460px;
          margin: 4px auto 0;
          aspect-ratio: 1;
          container: flow / inline-size;
        }
        .flow svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: visible;
        }
        .line {
          fill: none;
          stroke-width: 0.45;
          opacity: 0.22;
          transition: opacity 0.6s ease;
        }
        .line.active {
          opacity: 0.85;
        }
        .c-solar { stroke: var(--c-solar); fill: var(--c-solar); color: var(--c-solar); }
        .c-import { stroke: var(--c-import); fill: var(--c-import); color: var(--c-import); }
        .c-export { stroke: var(--c-export); fill: var(--c-export); color: var(--c-export); }
        .c-charge { stroke: var(--c-charge); fill: var(--c-charge); color: var(--c-charge); }
        .c-discharge { stroke: var(--c-discharge); fill: var(--c-discharge); color: var(--c-discharge); }
        .line.c-solar, .line.c-import, .line.c-export, .line.c-charge, .line.c-discharge { fill: none; }
        .dot {
          stroke: none;
          filter: drop-shadow(0 0 1.2px currentColor);
        }
        .ring {
          fill: var(--c-bg);
          stroke-width: 0.9;
        }
        .ring-track {
          fill: none;
          stroke: var(--c-divider);
          stroke-width: 0.9;
        }
        .ring-seg {
          fill: none;
          stroke-width: 1.5;
          transition: stroke-dasharray 0.8s ease, stroke-dashoffset 0.8s ease;
        }
        .solar-halo {
          fill: none;
          stroke: var(--c-solar);
          stroke-width: 0.6;
          opacity: 0;
          transform-origin: 50px 20px;
        }
        .producing .solar-halo {
          animation: halo 3s ease-out infinite;
        }

        .node {
          position: absolute;
          width: 24%;
          aspect-ratio: 1;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          line-height: 1.15;
          font-variant-numeric: tabular-nums;
        }
        .node ha-icon {
          --mdc-icon-size: clamp(14px, 6.5cqw, 28px);
          margin-bottom: 1px;
        }
        .val {
          font-size: clamp(9px, 4.2cqw, 16px);
          font-weight: 500;
          white-space: nowrap;
        }
        .sub {
          font-size: clamp(8px, 3.1cqw, 12px);
          color: var(--c-muted);
          white-space: nowrap;
        }
        .label {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          font-size: clamp(11px, 3.6cqw, 14px);
          color: var(--c-muted);
          white-space: nowrap;
        }
        .label.below { top: calc(100% + 1.5cqw); }
        .label.above { bottom: calc(100% + 3.6cqw); }
        #node-solar ha-icon { color: var(--c-solar); }
        #node-grid ha-icon { color: var(--c-import); }
        #node-battery ha-icon { color: var(--c-discharge); }
        .t-import { color: var(--c-import); }
        .t-export { color: var(--c-export); }
        .t-charge { color: var(--c-charge); }
        .t-discharge { color: var(--c-discharge); }
        .no-battery .battery-only { display: none; }

        .totals {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-top: 18px;
        }
        .total {
          display: flex;
          gap: 8px;
          align-items: center;
          padding: 8px 10px;
          border-radius: 12px;
          background: color-mix(in srgb, var(--c-text) 4%, transparent);
          border: 1px solid var(--c-divider);
          min-width: 0;
        }
        .total i {
          flex: none;
          width: 4px;
          align-self: stretch;
          border-radius: 2px;
        }
        .total div {
          min-width: 0;
        }
        .total-label {
          font-size: 11px;
          color: var(--c-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .total-val {
          font-size: 15px;
          font-weight: 600;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }
        .error {
          padding: 24px 0;
          text-align: center;
          color: var(--c-muted);
          font-size: 14px;
        }
        .error[hidden] {
          display: none;
        }

        @container (max-width: 420px) {
          .header { flex-wrap: wrap; row-gap: 8px; }
          .price { margin-left: 52px; }
        }
        @container (max-width: 400px) {
          .totals { grid-template-columns: 1fr; gap: 6px; }
          .total { padding: 6px 10px; }
          .total > div { display: flex; flex: 1; align-items: baseline; justify-content: space-between; gap: 8px; }
        }
        @container flow (max-width: 300px) {
          .autarky-word, #sub-solar { display: none; }
        }
        @keyframes halo {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.2); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .producing .solar-halo { animation: none; }
          .dots { display: none; }
          .line.active { opacity: 1; }
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
            <div class="price" hidden><ha-icon icon="mdi:cash"></ha-icon><span class="price-val"></span></div>
          </div>
          <div class="error" hidden></div>
          <div class="flow">
            <svg viewBox="0 0 100 100">
              ${pathsSvg}
              <g class="dots"></g>
              <circle class="solar-halo" cx="50" cy="20" r="12"/>
              <circle class="ring c-solar" cx="50" cy="20" r="12" style="fill: var(--c-bg)"/>
              <circle class="ring c-import" cx="14" cy="49" r="12" style="fill: var(--c-bg)"/>
              <circle class="ring-track" cx="86" cy="49" r="12" style="fill: var(--c-bg)"/>
              <g transform="rotate(-90 86 49)">
                <circle id="seg-solar" class="ring-seg c-solar" cx="86" cy="49" r="12" pathLength="100" style="fill: none"/>
                <circle id="seg-battery" class="ring-seg c-discharge" cx="86" cy="49" r="12" pathLength="100" style="fill: none"/>
                <circle id="seg-grid" class="ring-seg c-import" cx="86" cy="49" r="12" pathLength="100" style="fill: none"/>
              </g>
              <g class="battery-only">
                <circle class="ring-track" cx="50" cy="78" r="12" style="fill: var(--c-bg)"/>
                <circle id="soc-ring" class="ring-seg c-discharge" cx="50" cy="78" r="12" pathLength="100"
                  transform="rotate(-90 50 78)" style="fill: none"/>
              </g>
            </svg>

            <div class="node" id="node-solar" style="left:50%;top:20%">
              <span class="label above">${this._t("solar")}</span>
              <ha-icon icon="mdi:solar-power-variant"></ha-icon>
              <span class="val" id="val-solar">–</span>
              <span class="sub" id="sub-solar"></span>
            </div>
            <div class="node" id="node-grid" style="left:14%;top:49%">
              <ha-icon icon="mdi:transmission-tower"></ha-icon>
              <span class="val t-import" id="val-import"></span>
              <span class="val t-export" id="val-export"></span>
              <span class="label below">${this._t("grid")}</span>
            </div>
            <div class="node" id="node-home" style="left:86%;top:49%">
              <ha-icon icon="mdi:home-variant"></ha-icon>
              <span class="val" id="val-home">–</span>
              <span class="sub" id="sub-home"></span>
              <span class="label below">${this._t("home")}</span>
            </div>
            <div class="node battery-only" id="node-battery" style="left:50%;top:78%">
              <ha-icon id="icon-battery" icon="mdi:battery"></ha-icon>
              <span class="val" id="val-soc">–</span>
              <span class="sub" id="val-battery"></span>
              <span class="label below">${this._t("battery")}</span>
            </div>
          </div>

          <div class="totals">
            <div class="total"><i style="background: var(--c-solar)"></i><div>
              <div class="total-label">${this._t("pvToday")}</div><div class="total-val" id="tot-solar">–</div></div></div>
            <div class="total"><i style="background: var(--c-import)"></i><div>
              <div class="total-label">${this._t("importToday")}</div><div class="total-val" id="tot-import">–</div></div></div>
            <div class="total battery-only"><i style="background: var(--c-charge)"></i><div>
              <div class="total-label">${this._t("batteryToday")}</div><div class="total-val" id="tot-battery">–</div></div></div>
          </div>
          <div class="brand-footer">
            <span class="tagline"></span>
            <a class="brand-link" target="_blank" rel="noopener">solarforecastml.com ↗</a>
          </div>
        </div>
      </ha-card>
    `;
    this.shadowRoot.querySelector(".title-text").textContent = this._config.title || this._t("title");
    this.shadowRoot.querySelector(".brand-icon").src = FLOW_BRAND_ICON;
    this.shadowRoot.querySelector(".tagline").textContent = this._t("tagline");
    this.shadowRoot.querySelector(".brand-link").href = FLOW_BRAND_URL[this._lang];
    this.wrapper = this.shadowRoot.querySelector(".content");
    this.dotsLayer = this.shadowRoot.querySelector(".dots");
  }

  _el(id) {
    return this.shadowRoot.getElementById(id);
  }

  async updateData() {
    if (!this._hass || !this.wrapper) return;

    try {
      const data = await this._hass.callApi("GET", "sfml_stats/energy_flow");
      if (!data || !data.success) return;
      this.wrapper.querySelector(".error").hidden = true;
      this.render(data);
    } catch (err) {
      console.error("STATS Flow Card fetch error:", err);
      if (!this._rendered) {
        const error = this.wrapper.querySelector(".error");
        error.textContent = this._t("error");
        error.hidden = false;
      }
    }
  }

  render(data) {
    const f = data.flows || {};
    const b = data.battery || {};
    const stats = data.statistics || {};
    const pos = (v) => Math.max(0, Number(v) || 0);

    const hasBattery = b.soc !== null && b.soc !== undefined;
    this.wrapper.classList.toggle("no-battery", !hasBattery);

    // Price chip
    const price = data.current_price?.total_price;
    const priceEl = this.wrapper.querySelector(".price");
    if (price != null) {
      this.wrapper.querySelector(".price-val").textContent = `${this._num(price, 1)} ct/kWh`;
      priceEl.hidden = false;
    } else {
      priceEl.hidden = true;
    }

    const solarPower = pos(f.solar_power);
    const solarToHouse = pos(f.solar_to_house);
    const solarToBattery = pos(f.solar_to_battery);
    const batteryToHouse = pos(f.battery_to_house);
    const gridToHouse = pos(f.grid_to_house);
    const gridToBattery = pos(f.grid_to_battery);
    const houseToGrid = pos(f.house_to_grid);
    const homePower = data.home?.consumption != null
      ? pos(data.home.consumption)
      : solarToHouse + batteryToHouse + gridToHouse;

    // Solar
    this._el("val-solar").textContent = this._power(solarPower);
    this._el("sub-solar").textContent = this._kwh(stats.solar_yield_daily);
    this.wrapper.classList.toggle("producing", solarPower >= STATS_FLOW_MIN_W);

    // Grid: separate import and export like the HA energy card
    const gridImport = gridToHouse + gridToBattery;
    this._el("val-import").textContent = `← ${this._power(gridImport)}`;
    this._el("val-export").textContent = `→ ${this._power(houseToGrid)}`;

    // Home: live consumption and self-sufficiency
    this._el("val-home").textContent = this._power(homePower);
    const autarky = homePower >= STATS_FLOW_MIN_W && f.grid_to_house != null
      ? Math.max(0, Math.min(100, Math.round((1 - gridToHouse / homePower) * 100)))
      : null;
    this._el("sub-home").innerHTML = autarky != null
      ? `${autarky} %<span class="autarky-word"> ${this._t("autarky")}</span>`
      : "";

    // Home ring: share of each source in the live supply
    const supply = solarToHouse + batteryToHouse + gridToHouse;
    const shares = supply > 0
      ? [solarToHouse / supply, batteryToHouse / supply, gridToHouse / supply].map((s) => s * 100)
      : [0, 0, 0];
    let offset = 0;
    ["seg-solar", "seg-battery", "seg-grid"].forEach((id, i) => {
      const seg = this._el(id);
      seg.setAttribute("stroke-dasharray", `${shares[i].toFixed(2)} 100`);
      seg.setAttribute("stroke-dashoffset", (-offset).toFixed(2));
      offset += shares[i];
    });

    // Battery: positive power = charging
    if (hasBattery) {
      const soc = Math.max(0, Math.min(100, Number(b.soc) || 0));
      const batPower = Number(b.power) || 0;
      this._el("val-soc").textContent = `${Math.round(soc)} %`;
      this._el("soc-ring").setAttribute("stroke-dasharray", `${soc} 100`);
      const level = Math.min(100, Math.max(10, Math.round(soc / 10) * 10));
      const charging = batPower >= STATS_FLOW_MIN_W;
      this._el("icon-battery").setAttribute(
        "icon",
        charging ? `mdi:battery-charging-${level}` : level === 100 ? "mdi:battery" : `mdi:battery-${level}`,
      );
      const batEl = this._el("val-battery");
      if (Math.abs(batPower) < STATS_FLOW_MIN_W) {
        batEl.textContent = this._power(0);
        batEl.className = "sub";
      } else {
        batEl.textContent = `${charging ? "↓" : "↑"} ${this._power(batPower)}`;
        batEl.className = `sub ${charging ? "t-charge" : "t-discharge"}`;
      }
    }

    // Daily totals
    this._el("tot-solar").textContent = this._kwh(stats.solar_yield_daily);
    this._el("tot-import").textContent = this._kwh(stats.grid_import_daily);
    this._el("tot-battery").textContent = this._kwh(
      pos(stats.battery_charge_solar_daily) + pos(stats.battery_charge_grid_daily),
    );

    this._renderFlows({
      solarHome: solarToHouse,
      solarGrid: houseToGrid,
      solarBattery: hasBattery ? solarToBattery : 0,
      gridHome: gridToHouse,
      gridBattery: hasBattery ? gridToBattery : 0,
      batteryHome: hasBattery ? batteryToHouse : 0,
    }, hasBattery);
    this._rendered = true;
  }

  _renderFlows(powers, hasBattery) {
    const parts = [];
    const signature = [];

    Object.entries(STATS_FLOW_PATHS).forEach(([id, path]) => {
      const line = this._el(`line-${id}`);
      const visible = !path.battery || hasBattery;
      line.style.display = visible ? "" : "none";
      const watts = visible ? powers[id] : 0;
      const active = watts >= STATS_FLOW_MIN_W;
      line.classList.toggle("active", active);
      if (!active) return;

      // More power → faster and denser dots; sqrt keeps small flows visibly alive
      const kw = watts / 1000;
      const dur = Math.max(1.2, Math.min(6, 3.2 / Math.sqrt(kw + 0.15)));
      const durKey = Math.round(dur * 4) / 4;
      const count = 1 + (kw > 1.5 ? 1 : 0) + (kw > 4 ? 1 : 0);
      signature.push(`${id}:${durKey}:${count}`);
      for (let i = 0; i < count; i += 1) {
        parts.push(`
          <circle class="dot c-${path.color}" r="1.25">
            <animateMotion dur="${durKey}s" begin="${(-(durKey / count) * i).toFixed(2)}s"
              repeatCount="indefinite" calcMode="linear" path="${path.d}"/>
          </circle>`);
      }
    });

    // Only rebuild dots when the flow pattern changes, so running animations do not restart every refresh
    const key = signature.join("|");
    if (key !== this._dotsKey) {
      this._dotsKey = key;
      this.dotsLayer.innerHTML = parts.join("");
    }
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

// "sfml-energy-flow-card" is the branded type; "stats-flow-card" stays registered for existing dashboards
class SfmlEnergyFlowCard extends StatsFlowCard {}
if (!customElements.get("sfml-energy-flow-card")) customElements.define("sfml-energy-flow-card", SfmlEnergyFlowCard);
if (!customElements.get("stats-flow-card")) customElements.define("stats-flow-card", StatsFlowCard);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "sfml-energy-flow-card")) {
  const de = (document.documentElement.lang || navigator.language || "").toLowerCase().startsWith("de");
  window.customCards.push({
    type: "sfml-energy-flow-card",
    name: de ? "Solar Forecast ML – Energiefluss" : "Solar Forecast ML – Energy Flow",
    preview: true,
    description: de
      ? "Animierter Live-Energiefluss zwischen PV, Netz, Batterie und Haus – von Solar Forecast ML."
      : "Animated live energy flow between solar, grid, battery and home – by Solar Forecast ML.",
    documentationURL: "https://www.solarforecastml.com/",
  });
}
