// SFML Forecast Lovelace Card
// (C) 2026 Zara-Toorox

class SfmlCard extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this.initCard();
    }
    
    // Throttled API updates to prevent excessive DB load on every HA state change
    const now = Date.now();
    if (!this._lastUpdate || (now - this._lastUpdate > 15000)) {
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
        .sfml-card-wrapper {
          backdrop-filter: blur(12px) saturate(120%);
          -webkit-backdrop-filter: blur(12px) saturate(120%);
          background: rgba(16, 20, 36, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 18px;
          color: #f5f5fa;
          font-family: 'Outfit', -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
          transition: all 0.3s ease;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .header-brand {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .header-logo {
          font-size: 20px;
          color: #00ffff;
          animation: pulse 3s infinite alternate;
        }
        .header-title {
          font-size: 16px;
          font-weight: 600;
          letter-spacing: 0.5px;
          background: linear-gradient(135deg, #00ffff, #00bbff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .status-badge {
          font-size: 10px;
          padding: 3px 8px;
          background: rgba(0, 255, 255, 0.1);
          border: 1px solid rgba(0, 255, 255, 0.2);
          border-radius: 20px;
          color: #00ffff;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        
        .kpi-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 18px;
        }
        .kpi-box {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 12px;
          padding: 12px;
          display: flex;
          flex-direction: column;
        }
        .kpi-label {
          font-size: 11px;
          color: #a0a0b0;
          margin-bottom: 4px;
        }
        .kpi-value {
          font-size: 22px;
          font-weight: 700;
          line-height: 1.2;
        }
        .kpi-unit {
          font-size: 13px;
          font-weight: 500;
          color: #a0a0b0;
          margin-left: 2px;
        }
        .kpi-accent-actual {
          color: #00ffcc;
        }
        .kpi-accent-forecast {
          color: #ffb800;
        }
        
        .progress-section {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 18px;
        }
        .progress-meta {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          margin-bottom: 8px;
        }
        .progress-label {
          color: #a0a0b0;
        }
        .progress-percent {
          font-weight: 600;
          color: #00ffcc;
        }
        .progress-bar-bg {
          height: 8px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          overflow: hidden;
        }
        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #00bbff, #00ffcc);
          border-radius: 4px;
          width: 0%;
          transition: width 1s ease-out;
        }
        .accuracy-badge {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          margin-top: 8px;
          color: #a0a0b0;
        }
        .accuracy-val {
          font-weight: 600;
        }
        .accuracy-val.good { color: #00ffaa; }
        .accuracy-val.warn { color: #ffb800; }
        .accuracy-val.poor { color: #ff4a5a; }

        .groups-section {
          margin-bottom: 16px;
        }
        .section-title {
          font-size: 12px;
          font-weight: 600;
          color: #a0a0b0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .section-title::after {
          content: "";
          flex-grow: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
        }
        .group-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          font-size: 13px;
        }
        .group-row:last-child {
          border-bottom: none;
        }
        .group-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .group-icon {
          color: #ffb800;
        }
        .group-name {
          font-weight: 500;
        }
        .group-metrics {
          text-align: right;
        }
        .group-power {
          font-weight: 600;
        }
        .group-yield {
          font-size: 11px;
          color: #a0a0b0;
          margin-left: 4px;
        }
        
        .footer-forecast {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.02);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          margin-top: 12px;
          padding-top: 12px;
          font-size: 12px;
        }
        .tomorrow-label {
          color: #a0a0b0;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .tomorrow-val {
          font-weight: 700;
          color: #ffb800;
        }

        .loading-state {
          text-align: center;
          padding: 20px;
          color: #a0a0b0;
          font-size: 13px;
        }
        
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.9; }
          100% { transform: scale(1.1); opacity: 1; }
        }
      </style>
      <div class="sfml-card-wrapper">
        <div class="header">
          <div class="header-brand">
            <span class="header-logo">☀</span>
            <span class="header-title">Solar Forecast ML</span>
          </div>
          <div class="status-badge">Model Active</div>
        </div>
        
        <div class="card-content">
          <div class="loading-state">Lade Modeldaten...</div>
        </div>
      </div>
    `;
    this.container = this.shadowRoot.querySelector('.card-content');
  }

  async updateData() {
    if (!this._hass || !this.container) return;
    
    try {
      // Parallel API calls using HA credentials
      const [summary, energyFlow] = await Promise.all([
        this._hass.callApi('GET', 'sfml_stats/summary'),
        this._hass.callApi('GET', 'sfml_stats/energy_flow')
      ]);

      if (!summary || !energyFlow) {
        this.container.innerHTML = `<div class="loading-state">Fehler beim Laden der API-Daten.</div>`;
        return;
      }

      this.render(summary, energyFlow);
    } catch (err) {
      console.error("SFML Card fetch error:", err);
      this.container.innerHTML = `<div class="loading-state">Verbindungsfehler zur API.</div>`;
    }
  }

  render(summary, energyFlow) {
    const todayActual = energyFlow.statistics?.solar_yield_daily ?? 0;
    const todayForecast = summary.today?.forecast ?? 0;
    const tomorrowForecast = summary.today?.forecast_tomorrow ?? 0;
    const accuracy = summary.today?.accuracy ?? 0;
    const panels = energyFlow.panels || [];

    // Calculate percentage of forecast reached
    let progressPercent = 0;
    if (todayForecast > 0) {
      progressPercent = Math.min(100, Math.round((todayActual / todayForecast) * 100));
    }

    // Format metrics helper
    const formatPower = (watts) => {
      if (watts == null) return '-- W';
      return watts >= 1000 ? (watts / 1000).toFixed(2) + ' kW' : Math.round(watts) + ' W';
    };

    // Accuracy style classification
    let accClass = "poor";
    if (accuracy >= 90) accClass = "good";
    else if (accuracy >= 75) accClass = "warn";

    // Panel list template
    let panelsHtml = "";
    if (panels.length > 0) {
      panelsHtml = `
        <div class="groups-section">
          <div class="section-title">Panelgruppen</div>
          ${panels.map(p => `
            <div class="group-row">
              <div class="group-info">
                <span class="group-icon">☀️</span>
                <span class="group-name">${p.name}</span>
              </div>
              <div class="group-metrics">
                <span class="group-power">${formatPower(p.power)}</span>
                <span class="group-yield">(${p.actual_today_kwh.toFixed(2)} kWh)</span>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    this.container.innerHTML = `
      <div class="kpi-container">
        <div class="kpi-box">
          <span class="kpi-label">Ertrag Heute</span>
          <span class="kpi-value kpi-accent-actual">${todayActual.toFixed(2)}<span class="kpi-unit">kWh</span></span>
        </div>
        <div class="kpi-box">
          <span class="kpi-label">Prognose Heute</span>
          <span class="kpi-value kpi-accent-forecast">${todayForecast.toFixed(2)}<span class="kpi-unit">kWh</span></span>
        </div>
      </div>
      
      <div class="progress-section">
        <div class="progress-meta">
          <span class="progress-label">Prognose-Erreichung</span>
          <span class="progress-percent">${progressPercent}%</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${progressPercent}%"></div>
        </div>
        <div class="accuracy-badge">
          <span>Prognosegüte</span>
          <span class="accuracy-val ${accClass}">${accuracy.toFixed(1)}%</span>
        </div>
      </div>
      
      ${panelsHtml}
      
      <div class="footer-forecast">
        <span class="tomorrow-label">
          <span>🔮</span> Prognose Morgen
        </span>
        <span class="tomorrow-val">${tomorrowForecast.toFixed(2)} kWh</span>
      </div>
    `;
  }

  getCardSize() {
    return 3;
  }
}

customElements.define('sfml-card', SfmlCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "sfml-card",
  name: "SFML Forecast Card",
  preview: true,
  description: "Visualisiert Machine-Learning Solarprognosen, Genauigkeit und Panelgruppen."
});
