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
  pl: {
    title: "Przepływ energii",
    tagline: "Prognoza solarna ze wsparciem AI",
    solar: "PV",
    grid: "Sieć",
    home: "Dom",
    battery: "Akumulator",
    autarky: "autarkia",
    pvToday: "PV dzisiaj",
    importToday: "Pobór dzisiaj",
    batteryToday: "Akumulator naładowany",
    error: "Przepływ energii jest niedostępny.",
  },
};

// Solar Forecast ML brand mark (96 px WebP of brand/icon@2x.png), inlined so the card needs no extra asset
const FLOW_BRAND_ICON = "data:image/webp;base64,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";
const FLOW_BRAND_URL = { de: "https://www.solarforecastml.com/de/", en: "https://www.solarforecastml.com/en/", pl: "https://www.solarforecastml.com/en/" };

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
    const code = String(this._locale || "en").toLowerCase().slice(0, 2);
    return code === "de" || code === "pl" ? code : "en";
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
    // Arrows follow the flow in the diagram: import runs right towards the house, export left into the grid
    this._el("val-import").textContent = `→ ${this._power(gridImport)}`;
    this._el("val-export").textContent = `← ${this._power(houseToGrid)}`;

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
  const code = (document.documentElement.lang || navigator.language || "en").toLowerCase().slice(0, 2);
  const cardLang = code === "de" || code === "pl" ? code : "en";
  window.customCards.push({
    type: "sfml-energy-flow-card",
    name: ({ de: "Solar Forecast ML – Energiefluss", en: "Solar Forecast ML – Energy Flow", pl: "Solar Forecast ML – Przepływ energii" })[cardLang],
    preview: true,
    description: ({ de: "Animierter Live-Energiefluss zwischen PV, Netz, Batterie und Haus – von Solar Forecast ML.", en: "Animated live energy flow between solar, grid, battery and home – by Solar Forecast ML.", pl: "Animowany przepływ energii na żywo między PV, siecią, akumulatorem i domem – od Solar Forecast ML." })[cardLang],
    documentationURL: "https://www.solarforecastml.com/",
  });
}
