// STATS Flow Lovelace Card
// (C) 2026 Zara-Toorox

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
    if (!this._lastUpdate || (now - this._lastUpdate > 10000)) {
      this._lastUpdate = now;
      this.updateData();
    }
  }

  initCard() {
    this._initialized = true;
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        .stats-card-wrapper {
          backdrop-filter: blur(12px) saturate(120%);
          -webkit-backdrop-filter: blur(12px) saturate(120%);
          background: rgba(14, 18, 30, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 16px;
          color: #f5f5fa;
          font-family: 'Outfit', -apple-system, system-ui, BlinkMacSystemFont, sans-serif;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .header-brand {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .header-icon {
          color: #00ffcc;
          font-size: 18px;
        }
        .header-title {
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0.5px;
          background: linear-gradient(135deg, #00ffcc, #00aaff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .header-price {
          font-size: 11px;
          color: #a0a0b0;
          background: rgba(255, 255, 255, 0.04);
          padding: 3px 8px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        
        /* Flow Area Styles */
        .flow-container {
          position: relative;
          width: 100%;
          height: 280px;
        }
        svg {
          width: 100%;
          height: 100%;
        }
        
        /* SVG Connection Lines */
        .conn-line-bg {
          fill: none;
          stroke: rgba(255, 255, 255, 0.06);
          stroke-width: 4px;
        }
        .conn-line-active {
          fill: none;
          stroke-width: 4px;
          stroke-linecap: round;
          stroke-dasharray: 0, 16;
          animation: flow-dash 10s linear infinite;
        }
        
        /* Active line directions */
        .flow-to-inverter {
          animation-direction: reverse;
        }
        .flow-from-inverter {
          animation-direction: normal;
        }
        .flow-stopped {
          animation: none !important;
          stroke: transparent !important;
        }
        
        @keyframes flow-dash {
          to {
            stroke-dashoffset: -128;
          }
        }
        
        /* Node Card Layouts */
        .node-card {
          position: absolute;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          width: 110px;
          padding: 8px 10px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          transition: all 0.3s ease;
        }
        .node-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
        }
        .node-title {
          font-size: 10px;
          color: #a0a0b0;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-bottom: 4px;
        }
        .node-icon {
          font-size: 20px;
          margin-bottom: 2px;
        }
        .node-val {
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 2px;
        }
        .node-sub {
          font-size: 10px;
          color: #a0a0b0;
        }
        
        /* Specific Nodes Placement */
        #node-solar { left: 10px; top: 10px; border-color: rgba(255, 170, 0, 0.15); }
        #node-grid { right: 10px; top: 10px; }
        #node-battery { left: 10px; bottom: 10px; border-color: rgba(76, 175, 80, 0.15); }
        #node-load { right: 10px; bottom: 10px; border-color: rgba(0, 170, 255, 0.15); }
        
        /* Central Inverter Node */
        .node-inverter {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 74px;
          height: 74px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(20, 24, 46, 0.9) 0%, rgba(10, 12, 26, 0.95) 100%);
          border: 2px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          box-shadow: 0 0 16px rgba(0, 255, 204, 0.1);
        }
        .inverter-logo {
          font-size: 24px;
          color: #00ffcc;
        }
        .inverter-sub {
          font-size: 8px;
          color: #a0a0b0;
          text-transform: uppercase;
          margin-top: 2px;
          font-weight: 600;
        }
        
        /* Colors for Flow Dots */
        .stroke-solar { stroke: #ffaa00; }
        .stroke-load { stroke: #00aaff; }
        .stroke-battery { stroke: #4caf50; }
        .stroke-grid-import { stroke: #ff5555; }
        .stroke-grid-export { stroke: stroke: #00ff66; }
        
        /* Battery level bar inside battery node */
        .bat-bar-bg {
          width: 80%;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          margin-top: 4px;
          overflow: hidden;
        }
        .bat-bar-fill {
          height: 100%;
          background: #4caf50;
          border-radius: 2px;
          width: 0%;
          transition: width 0.5s ease;
        }
        
        /* Layout without battery */
        .no-battery #node-battery { display: none !important; }
        .no-battery #path-battery { display: none !important; }
        .no-battery #path-battery-bg { display: none !important; }
        
        .loading-state {
          text-align: center;
          padding: 40px;
          color: #a0a0b0;
          font-size: 13px;
        }
      </style>
      <div class="stats-card-wrapper">
        <div class="header">
          <div class="header-brand">
            <span class="header-icon">⚡</span>
            <span class="header-title">STATS Energiefluss</span>
          </div>
          <div class="header-price" id="price-display">-- ct</div>
        </div>
        
        <div class="flow-container">
          <svg viewBox="0 0 440 280">
            <!-- Background Static Lines -->
            <!-- Solar -> Inverter -->
            <path id="path-solar-bg" class="conn-line-bg" d="M 65,85 L 65,140 L 180,140" />
            <!-- Battery -> Inverter -->
            <path id="path-battery-bg" class="conn-line-bg" d="M 65,195 L 65,140 L 180,140" />
            <!-- Inverter -> Grid -->
            <path id="path-grid-bg" class="conn-line-bg" d="M 260,140 L 375,140 L 375,85" />
            <!-- Inverter -> Load -->
            <path id="path-load-bg" class="conn-line-bg" d="M 260,140 L 375,140 L 375,195" />
            
            <!-- Active Animated Flow Dots -->
            <path id="path-solar" class="conn-line-active stroke-solar" d="M 65,85 L 65,140 L 180,140" />
            <path id="path-battery" class="conn-line-active stroke-battery" d="M 65,195 L 65,140 L 180,140" />
            <path id="path-grid" class="conn-line-active" d="M 260,140 L 375,140 L 375,85" />
            <path id="path-load" class="conn-line-active stroke-load" d="M 260,140 L 375,140 L 375,195" />
          </svg>
          
          <!-- Node: Solar -->
          <div class="node-card" id="node-solar">
            <span class="node-title">Solar</span>
            <span class="node-icon">☀️</span>
            <span class="node-val" id="val-solar">-- W</span>
            <span class="node-sub" id="sub-solar">-- kWh</span>
          </div>
          
          <!-- Node: Grid -->
          <div class="node-card" id="node-grid">
            <span class="node-title">Netz</span>
            <span class="node-icon" id="icon-grid">🔌</span>
            <span class="node-val" id="val-grid">-- W</span>
            <span class="node-sub" id="sub-grid">-- kWh</span>
          </div>
          
          <!-- Central Inverter -->
          <div class="node-inverter">
            <span class="inverter-logo">STATS</span>
            <span class="inverter-sub">Core</span>
          </div>
          
          <!-- Node: Battery -->
          <div class="node-card" id="node-battery">
            <span class="node-title">Akku</span>
            <span class="node-icon">🔋</span>
            <span class="node-val" id="val-battery">-- W</span>
            <span class="node-sub" id="sub-battery">--%</span>
            <div class="bat-bar-bg">
              <div class="bat-bar-fill" id="bar-battery"></div>
            </div>
          </div>
          
          <!-- Node: Load -->
          <div class="node-card" id="node-load">
            <span class="node-title">Verbrauch</span>
            <span class="node-icon">🏠</span>
            <span class="node-val" id="val-load">-- W</span>
            <span class="node-sub" id="sub-load">-- kWh</span>
          </div>
        </div>
      </div>
    `;
    this.wrapper = this.shadowRoot.querySelector('.stats-card-wrapper');
    this.priceDisplay = this.shadowRoot.querySelector('#price-display');
  }

  async updateData() {
    if (!this._hass || !this.wrapper) return;
    
    try {
      const data = await this._hass.callApi('GET', 'sfml_stats/energy_flow');
      if (!data || !data.success) return;
      this.render(data);
    } catch (err) {
      console.error("STATS Flow Card fetch error:", err);
    }
  }

  render(data) {
    const f = data.flows || {};
    const b = data.battery || {};
    const stats = data.statistics || {};
    const home = data.home || {};
    
    const hasBattery = b.soc !== null;
    if (!hasBattery) {
      this.wrapper.classList.add('no-battery');
    } else {
      this.wrapper.classList.remove('no-battery');
    }
    
    // 1. Update Price
    if (data.current_price?.total_price != null) {
      this.priceDisplay.textContent = `${data.current_price.total_price.toFixed(2)} ct`;
      this.priceDisplay.style.display = 'block';
    } else {
      this.priceDisplay.style.display = 'none';
    }
    
    // Format helpers
    const formatW = (w) => {
      if (w == null) return '0 W';
      return w >= 1000 ? (w / 1000).toFixed(2) + ' kW' : Math.round(w) + ' W';
    };
    
    // --- NODES RENDER ---
    
    // Solar Node
    const solarPower = f.solar_power || 0;
    this.shadowRoot.querySelector('#val-solar').textContent = formatW(solarPower);
    this.shadowRoot.querySelector('#sub-solar').textContent = `${(stats.solar_yield_daily || 0).toFixed(2)} kWh`;
    
    // Load Node
    const loadPower = home.consumption || 0;
    this.shadowRoot.querySelector('#val-load').textContent = formatW(loadPower);
    // Dynamic calculate daily consumption if not sent explicitly
    const solarToHouseKwh = stats.solar_yield_daily || 0; // fallback calculation
    this.shadowRoot.querySelector('#sub-load').textContent = `${(stats.grid_import_daily || 0 + solarToHouseKwh).toFixed(2)} kWh`;
    
    // Grid Node
    const gridImport = f.grid_to_house || 0 + (f.grid_to_battery || 0);
    const gridExport = f.house_to_grid || 0;
    const gridNetPower = gridImport - gridExport;
    
    const gridValEl = this.shadowRoot.querySelector('#val-grid');
    const gridSubEl = this.shadowRoot.querySelector('#sub-grid');
    const gridIconEl = this.shadowRoot.querySelector('#icon-grid');
    
    if (gridNetPower > 0) {
      gridValEl.textContent = formatW(gridNetPower);
      gridValEl.style.color = '#ff5555';
      gridIconEl.textContent = '🔌';
    } else if (gridNetPower < 0) {
      gridValEl.textContent = formatW(Math.abs(gridNetPower));
      gridValEl.style.color = '#00ff66';
      gridIconEl.textContent = '☀️';
    } else {
      gridValEl.textContent = '0 W';
      gridValEl.style.color = 'inherit';
      gridIconEl.textContent = '🔌';
    }
    gridSubEl.textContent = `${(stats.grid_import_daily || 0).toFixed(2)} kWh`;
    
    // Battery Node (optional)
    if (hasBattery) {
      const batPower = b.power || 0; // Positive = charging, negative = discharging
      const batValEl = this.shadowRoot.querySelector('#val-battery');
      
      if (batPower > 0) {
        batValEl.textContent = `+${formatW(batPower)}`;
        batValEl.style.color = '#4caf50';
      } else if (batPower < 0) {
        batValEl.textContent = `-${formatW(Math.abs(batPower))}`;
        batValEl.style.color = '#ffaa00';
      } else {
        batValEl.textContent = '0 W';
        batValEl.style.color = 'inherit';
      }
      
      this.shadowRoot.querySelector('#sub-battery').textContent = `${b.soc}%`;
      this.shadowRoot.querySelector('#bar-battery').style.width = `${b.soc}%`;
    }
    
    // --- FLOWS ANIMATION & SPEED ---
    
    const updateFlowLine = (pathId, power, direction) => {
      const path = this.shadowRoot.querySelector(`#${pathId}`);
      if (!path) return;
      
      if (Math.abs(power) < 10) {
        path.className.baseVal = "conn-line-active flow-stopped";
        return;
      }
      
      // Calculate speed: higher power = faster animation duration
      const duration = Math.max(0.6, Math.min(10, 12 - (Math.abs(power) / 1000) * 2));
      path.style.animationDuration = `${duration}s`;
      
      let dirClass = direction === "in" ? "flow-to-inverter" : "flow-from-inverter";
      path.className.baseVal = `conn-line-active ${dirClass} ${pathId === 'path-solar' ? 'stroke-solar' : pathId === 'path-load' ? 'stroke-load' : ''}`;
    };
    
    // Solar: always to inverter
    updateFlowLine('path-solar', solarPower, 'in');
    
    // Load: always from inverter
    updateFlowLine('path-load', loadPower, 'out');
    
    // Battery: dynamic direction
    if (hasBattery) {
      const batPower = b.power || 0;
      const batDirection = batPower > 0 ? 'out' : 'in'; // charging = flow from inverter out to battery
      updateFlowLine('path-battery', batPower, batDirection);
    }
    
    // Grid: dynamic direction & colors
    const gridPath = this.shadowRoot.querySelector('#path-grid');
    if (gridPath) {
      if (Math.abs(gridNetPower) < 10) {
        gridPath.className.baseVal = "conn-line-active flow-stopped";
      } else {
        const duration = Math.max(0.6, Math.min(10, 12 - (Math.abs(gridNetPower) / 1000) * 2));
        gridPath.style.animationDuration = `${duration}s`;
        
        if (gridNetPower > 0) {
          // Import: flow from grid to inverter (in)
          gridPath.className.baseVal = "conn-line-active flow-to-inverter stroke-grid-import";
        } else {
          // Export: flow from inverter to grid (out)
          gridPath.className.baseVal = "conn-line-active flow-from-inverter stroke-grid-export";
        }
      }
    }
  }

  getCardSize() {
    return 4;
  }
}

customElements.define('stats-flow-card', StatsFlowCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "stats-flow-card",
  name: "STATS Flow Card",
  preview: true,
  description: "Ein animiertes Flussdiagramm der STATS Live-Energiedaten (PV, Inverter, Grid, Batterie, Haus)."
});
