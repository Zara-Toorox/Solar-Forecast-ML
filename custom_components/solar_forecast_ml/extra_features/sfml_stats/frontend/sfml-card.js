// SFML Forecast Lovelace Card
// (C) 2026 Zara-Toorox

const SFML_CARD_TEXT = {
  de: {
    title: "Solarprognose",
    tagline: "KI-gestützte Solarprognose",
    live: "Live",
    produced: "erzeugt",
    ofForecast: "von {v} Prognose",
    reached: "der Prognose",
    exceeded: "Prognose übertroffen",
    tomorrow: "Morgen",
    accuracy: "Prognosegüte",
    peak: "Peak",
    peakAt: "{h} Uhr",
    groups: "Panelgruppen",
    forecast: "Prognose",
    actual: "Ist",
    loading: "Lade Prognosedaten …",
    error: "Prognosedaten nicht erreichbar.",
  },
  en: {
    title: "Solar forecast",
    tagline: "AI-powered solar forecasting",
    live: "Live",
    produced: "produced",
    ofForecast: "of {v} forecast",
    reached: "of forecast",
    exceeded: "Forecast exceeded",
    tomorrow: "Tomorrow",
    accuracy: "Accuracy",
    peak: "Peak",
    peakAt: "{h}:00",
    groups: "Panel groups",
    forecast: "Forecast",
    actual: "Actual",
    loading: "Loading forecast data …",
    error: "Forecast data unavailable.",
  },
  pl: {
    title: "Prognoza solarna",
    tagline: "Prognoza solarna ze wsparciem AI",
    live: "Na żywo",
    produced: "wytworzono",
    ofForecast: "z {v} prognozy",
    reached: "prognozy",
    exceeded: "Prognoza przekroczona",
    tomorrow: "Jutro",
    accuracy: "Jakość prognozy",
    peak: "Szczyt",
    peakAt: "{h}:00",
    groups: "Grupy paneli",
    forecast: "Prognoza",
    actual: "Wynik",
    loading: "Wczytywanie danych prognozy …",
    error: "Dane prognozy są niedostępne.",
  },
};

const SFML_HOURLY_REFRESH_MS = 5 * 60 * 1000;
const SFML_LIVE_REFRESH_MS = 15000;
const SFML_CHART_W = 300;
const SFML_CHART_H = 90;
// Solar Forecast ML brand mark (96 px WebP of brand/icon@2x.png), inlined so the card needs no extra asset
const SFML_BRAND_ICON = "data:image/webp;base64,UklGRngLAABXRUJQVlA4IGwLAABQMQCdASpwAHAAPj0cikQiIaEUmb3wIAPEsYBmKAdkr+q81m4d6YNVbS9MX51/3G/P8w/7Sfqr7zXoo3jv0APLg9j/+9f+H0yKxrzO+4vbLQG/ln4B/V8UvAI9df5zzy/h+4E1fzAvY/7D/reMzxAP1R/1vrJ/mfBToAfzb/Df9D7gPpZ/u//T5dPp//ze4P/N/65/yuyZ+4B4N40bCZ+nb5os+l2PIMI6mXVLlPyXU2vQ5MkmjDM2fxBTtAVlQ6y7SfFSCu1lMsB56MF4NnE+uC8ZFkVnM3m8QtdQSod6IYAPcbvnFVM443lKOAFsk5G30DE0DiaUaRJVbceemWNt2b/NeGftIA13ICtmvMdKzFqZ0tEUxpOocUs+D53SExLje2XtXqrPR/tp9f+WYxGlS75acLVmsfx05kNCARLxY8Gy3vodo4e/1z/CDowJ94A00e7HuH0+u4LXWvG35V7vEgIPzaPv5vqvO/bc3yvlhSlC8IcjDzp47xvPvXE1IhBQEnt8YS3TtZpSaR8pAIacEGTAAP79U88gex3qJrn9N7hGlPmT4726q52mfpU0fDe8t0wiaRESyenBLy+L2hJsVxYIt1u4Ih08ByPfIf12VaI/tGh61btYKzAsQRjV5ufwTlC3UE+wq5o1eSr/cen8hIeqGvkpDfGrdg/qqxRZI0wSZPmHIGi0dGYpsjnYVd2WviLKasvZBjtyfRmHo1JT227d39Zi8fDxMzBT+YFAxw9ZW2n+wj7sbtzHHBcTRhMtXB0xMkFf8HgLwr8Jc0Cv10Dk7e9d1FymgYkClhhadgr/MlOIN0F/lKgGE6MjKQGu8TRxwnZ7mzP2Vx5M02TjmSflFAVv2ZjDiebQHKHrGmuFWi1QXcpVpvTsFuPpMz3QefOQNI+3FQkTad1zEtz05tnWocn9pLIozBomjgVSuNObt6ebZW8rcW7fIvaxkCqShGfoXHFwhxLOrJ8zBKWAGQDRwVD3b+puFoehEvXZNsAqZx75XrFj2g0ZJzm4273eN4IPjpuRwmL1FIbA75xeOGPyccs0so+YnVX4De1dvL+MLWCk7tnu1tvRqPx3QV+EqX4rqxxYUB4E4h1MyVIOTOHWrwB22b9mpeiYK5NV4AyPFWFdA4ocG7ImxAwWXavboSGyHiTuklUtY12GOLvCsFgP7ddssWy1XRNo/HMLKxiQEFPe0nGam1Zs74tokOmh1P6kWkTYBibtTzp5YlVOTM4uTve/YO03z3c8h6Vojx+wrBdeOncdLT5Ek7Q7RwAO8F4nAKMGXKbc3CaHOE8LlAE9pl/4FnnS93hCWUoOmPreCendxMy0ZeOYkUBwI3C9hrCkR8u1+3xgS+YrOTxGrMDAVXoV5jbd3aWDU5u/7QUi5kPmBWpTgHeLTThX4DIBhw5UdSRgSOBpq2BKEgplg2ZdTdSW+5ZYX+npY3qHj/gi+xDAK3hbMZ1CoUT7StE782mxKG1SYEGIcPD9bIhwg6fRUrL7TWYM7AQ2OUCsEB8EAyVjNnB/06KI1frfi2N+oH7AsFqX0ZX+JmpU9/6r5cCzRmysCIdijWqS6fvI/8q8fAzHRF40xz9+I8MZr/NHp8vgxsT05IjsvJqCTQL4fE7Teg5WJYKWcxQgyBzdau3f1YRuS07P6OehZFO46bQ7k2zHjLCJpGKaOo5YLekyHzllAlb5OiBf61gXhI7/Wb42Y+H64NEfObU7KGrGu1f3Y4r9IZPl6XCgEbaAy6LCaoqL9IAUCVyjBwIIqiI2MAY9l0fbn58kDVhdSIghTSHzps8zdxNiyWn+0RSYrWPE+rxC2mgFktQCqDh65U8EbK+Xs+cln4Eneu7nsrUH+MXJPybUkFjt/4Xpvld1aQwoVDe9qBJsvuV8xYV2ctxhV7LgxE5iKo3dh/Pr3qerkvtO6q6ICjyzldVARoVneyUaEkP3KfsQoNd55o5sufUmxwRjAo1IEn+PzLIV9IBpkuXI6lEd+bOP9+QiNnVtmxYnVvS0+MPcVokDGswEdFX0ETLjfu2uY+eNih2Y1NXsq8cT6pWegzB9cnxW66YXCQdDpRRbPRP6AwXAKRcI6rb4F3gke1STSTA7EFoL5DAFyegz39/OzTlt3eZjhC22rJg1tsZCk4k638O8238VcoDGS5gQ2iB/AIbdQIcdoerCldanGJ7EzVrjYOksdWMc/fBW5qnCBuyuHa2HJF0mXiwW87JebtSLrTN7okCr4bP1sftj3oeFTNxUZL0ku179UuTR0FY9e8QFj9F2ECcLlzoak0OfxDj10uMmAv/qBzCf0yTZurgyDatVPwANpcGcfybml5lKJTusd17Eu10MYfmiZP/ZjwazT73nNFvh8Cr4l4lcU5h2UZ5e1HRN+pQV4H49mXeSExvOufIgFzgqSyfyt2GFeoXz2qELemyFKrTmsyOyWBTbm8sfsZAUELk5dxVSwJP46C+jb+lCSYYqWLE22KI8d5LTxo4dg8lePVXQx0QfeJYH0WANnR8PFUU+EPqNOLNZ800ljiG7AMD6XYsh+knnVLTX6KJNSbsuTZurzIoAFQH5iT5iPQHhYqtaEac2AwjmelM0NLwxBxu/13Skly60M15TBA6JjclFB4jPNwOJ7xpaUP+GfvPOlJZZhNqxeQWQxXXoUnR6eqKXZPsZ8n3NLpuTXZdUW3vjLyq3P4LZmWc0OF1y57aiWQtzOqHVNnDSoqpqwA/yaM0JmUzLu3lS2qNJx29dxs3Xt02FdPrpsUAwjyNh6yxQE7km0pYdrktOeVLuw+ZGvfXOU1351Kwgyqr/sApVXnLN36vbbdAaXk6lrJ6KWiC076E2mUO/hiTukYAzMid5Xgfb1HRFhtcUBv92XdaAlNVV9tH/jVNto4F++k4JebGT0qB9RH2fsWt9bNcymEAa5Oyc+uJJpFDLAiP82AzsN3t8efj5CvoGsyr99vjY5Ptbh9DaM5D2WAeISc6p81kROhRDz/XohojtA0vqPBXKlXuFa0hvwBE0DR/T4zT531wfVsGX7Uesm3zpYKVKbS9thpqZW0C96zJdCeM3hk2+GFgZDtTuO2qRdcwx7wTW0gSvqzb/V+O5x1EBXFJr4b3iMChwNW6ukO1kzK7JYR/ue4FrFdsjD3j58JN86E01WuykLOaBnPNxZL/eysmIPVZbqxUwRcptvTCT+89b8Uc3kvgGNeGz8SAn2mKahUvHHhF/zeh3mZNB0mckvr6KWiG3ENC2B7L4IpPOnB2HCRtg91AIT46gNyJunX0bih1wIMk3OcMlUYozOivtnJwC79T0yw5eQ16j8CG8HPX+girUub74k/qjNoRB0t7Sl7/zhoeUQdV8Mfo+i3JbvG3e/yf03JBKRPhexil/8DNmDOy0qYhNU1BMb6KmnTYjKQhbJAaaTXyCSpu2b6Woayq2eVrv3/kWuJa69RGDUQ/5KoU+9v/8056UizVpT/Sk7Jtv1boQ452svL8iRKjKu6sJLru+s9jxcWcH3vLSO8bSbOHyHvkcr9r1XF4cvErRxs3G/E+UZx5qiAvew3qW6q46qdJ6AUa+wjZZToxQFdK24g6+wiRyvl6ZdmFCTd8UQytfYf6ZEGlIBPxV3lBfmjqC4GwDYKr+UIn5UAxzQMtL9+2uHUooj2NT2Q/GFJ+713WlvB7426rn5sQI2b6bEU1S6JiZsuzLcSrqMaHJFbM3Z03lF20AwDpGx630z5RgrAlfijSUie0C2+U6o/fSf/x14UfTVCdye/UKv9UTB4szaov/KrhB01/3GVRAORg+j3qsdmVKxXwaqzE3/icGY5AkbOUyAzh/L/aBzDgecTWfshO/+HyiN3x1uPr/6F8BAF/e/MS/vV3BNomFqQFJrF+DTytIlj1e8QfWEF00kSdAuAttm2gAAA==";
const SFML_BRAND_URL = { de: "https://www.solarforecastml.com/de/", en: "https://www.solarforecastml.com/en/", pl: "https://www.solarforecastml.com/en/" };

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
    if (!this._lastUpdate || now - this._lastUpdate > SFML_LIVE_REFRESH_MS) {
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
    const text = SFML_CARD_TEXT[this._lang][key] ?? SFML_CARD_TEXT.en[key] ?? key;
    return text.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "");
  }

  _num(value, digits = 2) {
    return new Intl.NumberFormat(this._locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(Number(value) || 0);
  }

  _kwh(value) {
    const v = Number(value) || 0;
    return `${this._num(v, v >= 100 ? 0 : v >= 10 ? 1 : 2)} kWh`;
  }

  _power(watts) {
    if (watts == null || !Number.isFinite(Number(watts))) return "–";
    const w = Math.max(0, Number(watts));
    return w >= 1000 ? `${this._num(w / 1000, 2)} kW` : `${Math.round(w)} W`;
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
          gap: 8px;
          margin-top: 14px;
          padding-top: 10px;
          border-top: 1px solid var(--sfml-divider);
          font-size: 11px;
          color: var(--sfml-muted);
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
          --sfml-solar: var(--energy-solar-color, #ff9800);
          --sfml-text: var(--primary-text-color, #212121);
          --sfml-muted: var(--secondary-text-color, #727272);
          --sfml-divider: var(--divider-color, rgba(127, 127, 127, 0.2));
          --sfml-good: var(--success-color, #43a047);
          --sfml-warn: var(--warning-color, #ffa600);
          --sfml-poor: var(--error-color, #db4437);
        }
        ha-card {
          overflow: hidden;
          position: relative;
          container-type: inline-size;
        }
        .glow {
          position: absolute;
          top: -45%;
          right: -25%;
          width: 75%;
          aspect-ratio: 1;
          border-radius: 50%;
          background: radial-gradient(circle, color-mix(in srgb, var(--sfml-solar) 20%, transparent) 0%, transparent 65%);
          pointer-events: none;
          animation: breathe 8s ease-in-out infinite alternate;
        }
        .content {
          position: relative;
          padding: 16px;
          color: var(--sfml-text);
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 8px;
        }
        .live-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          color: var(--sfml-solar);
          background: color-mix(in srgb, var(--sfml-solar) 14%, transparent);
        }
        .live-chip[hidden] {
          display: none;
        }
        .live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--sfml-solar);
          animation: ping 2s ease-out infinite;
        }

        .hero {
          display: grid;
          grid-template-columns: auto 1fr;
          align-items: center;
          gap: 18px;
          margin: 8px 0 14px;
        }
        .gauge {
          position: relative;
          width: clamp(112px, 34cqw, 150px);
          aspect-ratio: 1;
        }
        .gauge svg {
          width: 100%;
          height: 100%;
          overflow: visible;
        }
        .gauge-track {
          fill: none;
          stroke: var(--sfml-divider);
          stroke-width: 9;
          stroke-linecap: round;
        }
        .gauge-fill {
          fill: none;
          stroke-width: 9;
          stroke-linecap: round;
          transition: stroke-dashoffset 1.2s cubic-bezier(.2, .8, .2, 1);
          filter: drop-shadow(0 0 6px color-mix(in srgb, var(--sfml-solar) 55%, transparent));
        }
        .gauge-center {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .gauge-pct {
          font-size: clamp(24px, 8cqw, 32px);
          font-weight: 600;
          line-height: 1;
          font-variant-numeric: tabular-nums;
        }
        .gauge-pct small {
          font-size: 0.5em;
          font-weight: 500;
          color: var(--sfml-muted);
        }
        .gauge-sub {
          margin-top: 4px;
          font-size: 11px;
          color: var(--sfml-muted);
          max-width: 80%;
          line-height: 1.2;
        }
        .hero-main {
          min-width: 0;
        }
        .hero-value {
          font-size: clamp(30px, 10cqw, 42px);
          font-weight: 600;
          line-height: 1.05;
          letter-spacing: -0.5px;
          font-variant-numeric: tabular-nums;
        }
        .hero-value span {
          font-size: 0.45em;
          font-weight: 500;
          color: var(--sfml-muted);
          margin-left: 4px;
          letter-spacing: 0;
        }
        .hero-caption {
          font-size: 14px;
          color: var(--sfml-muted);
          margin-top: 4px;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 10px;
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 500;
          color: var(--sfml-good);
          background: color-mix(in srgb, var(--sfml-good) 14%, transparent);
        }
        .badge ha-icon {
          --mdc-icon-size: 16px;
        }

        .chart {
          margin: 4px 0 16px;
        }
        .chart svg {
          display: block;
          width: 100%;
          height: 96px;
          overflow: visible;
        }
        .bar.current {
          animation: blink 2.4s ease-in-out infinite;
        }
        .forecast-line {
          fill: none;
          stroke: var(--sfml-solar);
          stroke-width: 1.6;
          stroke-dasharray: 4 3;
          vector-effect: non-scaling-stroke;
          opacity: 0.9;
        }
        .now-line {
          stroke: var(--sfml-text);
          stroke-width: 1;
          stroke-dasharray: 2 3;
          vector-effect: non-scaling-stroke;
          opacity: 0.45;
        }
        .axis {
          position: relative;
          height: 14px;
          font-size: 11px;
          color: var(--sfml-muted);
          margin-top: 4px;
          font-variant-numeric: tabular-nums;
        }
        .axis span {
          position: absolute;
          transform: translateX(-50%);
        }
        .legend {
          display: flex;
          gap: 14px;
          font-size: 11px;
          color: var(--sfml-muted);
          margin-bottom: 6px;
        }
        .legend i {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 3px;
          margin-right: 5px;
          vertical-align: -1px;
          box-sizing: border-box;
        }
        .legend .l-actual {
          background: var(--sfml-solar);
        }
        .legend .l-forecast {
          border: 1.5px dashed var(--sfml-solar);
        }

        .tiles {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }
        .tile {
          padding: 10px clamp(8px, 2.6cqw, 12px);
          border-radius: 12px;
          background: color-mix(in srgb, var(--sfml-text) 4%, transparent);
          border: 1px solid var(--sfml-divider);
          min-width: 0;
        }
        .tile-label {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: var(--sfml-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tile-label ha-icon {
          --mdc-icon-size: 15px;
          flex: none;
        }
        .tile-value {
          margin-top: 4px;
          font-size: clamp(14px, 4.4cqw, 17px);
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-variant-numeric: tabular-nums;
        }
        .good { color: var(--sfml-good); }
        .warn { color: var(--sfml-warn); }
        .poor { color: var(--sfml-poor); }

        .groups {
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid var(--sfml-divider);
        }
        .groups-title {
          font-size: 12px;
          font-weight: 500;
          color: var(--sfml-muted);
          margin-bottom: 4px;
        }
        .group {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 4px 12px;
          padding: 6px 0;
          font-size: 14px;
        }
        .group-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .group-power {
          font-weight: 600;
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .group-track {
          height: 6px;
          border-radius: 3px;
          background: var(--sfml-divider);
          overflow: hidden;
          align-self: center;
        }
        .group-fill {
          height: 100%;
          border-radius: 3px;
          background: linear-gradient(90deg, color-mix(in srgb, var(--sfml-solar) 50%, transparent), var(--sfml-solar));
          transition: width 1s ease;
        }
        .group-kwh {
          font-size: 12px;
          color: var(--sfml-muted);
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        .state {
          padding: 28px 0;
          text-align: center;
          color: var(--sfml-muted);
          font-size: 14px;
        }

        @container (max-width: 420px) {
          .header { flex-wrap: wrap; row-gap: 8px; }
          .live-chip { margin-left: 52px; }
        }
        @container (max-width: 380px) {
          .hero { grid-template-columns: 1fr; justify-items: center; text-align: center; gap: 10px; }
          .gauge { width: 150px; }
          .tiles { grid-template-columns: 1fr; gap: 6px; }
          .tile { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 12px; }
          .tile-value { margin-top: 0; }
        }
        @keyframes breathe {
          from { transform: scale(0.95); opacity: 0.75; }
          to { transform: scale(1.08); opacity: 1; }
        }
        @keyframes ping {
          0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sfml-solar) 60%, transparent); }
          100% { box-shadow: 0 0 0 7px transparent; }
        }
        @keyframes blink {
          50% { opacity: 0.55; }
        }
        @media (prefers-reduced-motion: reduce) {
          .glow, .live-dot, .bar.current { animation: none; }
          .gauge-fill, .group-fill { transition: none; }
        }
      </style>
      <ha-card>
        <div class="brand-stripe"></div>
        <div class="glow"></div>
        <div class="content">
          <div class="header">
            <div class="brand">
              <img class="brand-icon" alt="Solar Forecast ML">
              <div class="brand-copy">
                <span class="title-text"></span>
                <span class="wordmark"><span class="wm-solar">Solar </span><span class="wm-forecast">Forecast ML</span></span>
              </div>
            </div>
            <div class="live-chip" hidden><span class="live-dot"></span><span class="live-val"></span></div>
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
    this.shadowRoot.querySelector(".brand-icon").src = SFML_BRAND_ICON;
    this.shadowRoot.querySelector(".tagline").textContent = this._t("tagline");
    this.shadowRoot.querySelector(".brand-link").href = SFML_BRAND_URL[this._lang];
    this.shadowRoot.querySelector(".state").textContent = this._t("loading");
    this.container = this.shadowRoot.querySelector(".body");
    this.liveChip = this.shadowRoot.querySelector(".live-chip");
  }

  async updateData() {
    if (!this._hass || !this.container) return;

    const now = Date.now();
    const needHourly = !this._hourlyAt || now - this._hourlyAt > SFML_HOURLY_REFRESH_MS;

    try {
      const [summary, energyFlow, solar] = await Promise.all([
        this._hass.callApi("GET", "sfml_stats/summary"),
        this._hass.callApi("GET", "sfml_stats/energy_flow"),
        needHourly
          ? this._hass.callApi("GET", "sfml_stats/solar?days=1&hourly=true").catch(() => null)
          : Promise.resolve(null),
      ]);

      if (!summary || !energyFlow) {
        if (!this._rendered) this._showState(this._t("error"));
        return;
      }
      if (solar) {
        this._hourly = solar.data?.hourly || [];
        this._hourlyAt = now;
      }
      this.render(summary, energyFlow);
    } catch (err) {
      console.error("SFML Card fetch error:", err);
      if (!this._rendered) this._showState(this._t("error"));
    }
  }

  _showState(text) {
    this.container.innerHTML = `<div class="state"></div>`;
    this.container.firstElementChild.textContent = text;
  }

  render(summary, energyFlow) {
    const todayActual = Number(energyFlow.statistics?.solar_yield_daily ?? summary.today?.production ?? 0);
    const todayForecast = Number(summary.today?.forecast ?? 0);
    const tomorrowForecast = Number(summary.today?.forecast_tomorrow ?? 0);
    const accuracy = Number(summary.today?.accuracy ?? 0);
    const peakHour = summary.today?.peak_hour;
    const livePower = energyFlow.flows?.solar_power;
    const panels = energyFlow.panels || [];
    const currentHour = summary.time_context?.current_hour ?? energyFlow.time_context?.current_hour;

    const ratio = todayForecast > 0 ? todayActual / todayForecast : 0;
    const pct = Math.round(ratio * 100);

    if (livePower != null && livePower > 0) {
      this.liveChip.hidden = false;
      this.liveChip.querySelector(".live-val").textContent = `${this._t("live")} ${this._power(livePower)}`;
    } else {
      this.liveChip.hidden = true;
    }

    let accClass = "poor";
    if (accuracy >= 90) accClass = "good";
    else if (accuracy >= 75) accClass = "warn";

    // 270° arc on r=52 (circumference 326.7): visible arc length 245
    const arcLen = 245;
    const filled = arcLen * Math.min(1, Math.max(0, ratio));

    const groupsHtml = panels.length > 1
      ? `
        <div class="groups">
          <div class="groups-title">${this._t("groups")}</div>
          ${panels.map((p) => {
            const power = Number(p.power) || 0;
            const max = Math.max(Number(p.max_today) || 0, power, 1);
            const width = Math.round((power / max) * 100);
            const kwh = p.actual_today_kwh;
            return `
              <div class="group">
                <span class="group-name">${this._escape(p.name)}</span>
                <span class="group-power">${this._power(power)}</span>
                <div class="group-track"><div class="group-fill" style="width:${width}%"></div></div>
                <span class="group-kwh">${kwh != null ? this._kwh(kwh) : "–"}</span>
              </div>`;
          }).join("")}
        </div>`
      : "";

    this.container.innerHTML = `
      <div class="hero">
        <div class="gauge">
          <svg viewBox="0 0 120 120">
            <defs>
              <linearGradient id="sfml-sun" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0" style="stop-color: var(--sfml-solar); stop-opacity: 0.5"/>
                <stop offset="1" style="stop-color: var(--sfml-solar)"/>
              </linearGradient>
            </defs>
            <circle class="gauge-track" cx="60" cy="60" r="52"
              stroke-dasharray="${arcLen} 400" transform="rotate(135 60 60)"/>
            <circle class="gauge-fill" cx="60" cy="60" r="52" stroke="url(#sfml-sun)"
              stroke-dasharray="${arcLen} 400" stroke-dashoffset="${arcLen}"
              transform="rotate(135 60 60)"/>
          </svg>
          <div class="gauge-center">
            <div class="gauge-pct">${todayForecast > 0 ? pct : "–"}<small>%</small></div>
            <div class="gauge-sub">${this._t("reached")}</div>
          </div>
        </div>
        <div class="hero-main">
          <div class="hero-value">${this._num(todayActual, todayActual >= 100 ? 0 : 2)}<span>kWh</span></div>
          <div class="hero-caption">${this._t("produced")} · ${this._t("ofForecast", { v: this._kwh(todayForecast) })}</div>
          ${ratio >= 1 && todayForecast > 0
            ? `<div class="badge"><ha-icon icon="mdi:trophy-outline"></ha-icon>${this._t("exceeded")}</div>`
            : ""}
        </div>
      </div>

      ${this._chartHtml(currentHour)}

      <div class="tiles">
        <div class="tile">
          <div class="tile-label"><ha-icon icon="mdi:weather-sunset-up"></ha-icon>${this._t("tomorrow")}</div>
          <div class="tile-value">${this._kwh(tomorrowForecast)}</div>
        </div>
        <div class="tile">
          <div class="tile-label"><ha-icon icon="mdi:bullseye-arrow"></ha-icon>${this._t("accuracy")}</div>
          <div class="tile-value ${accClass}">${this._num(accuracy, 1)} %</div>
        </div>
        <div class="tile">
          <div class="tile-label"><ha-icon icon="mdi:white-balance-sunny"></ha-icon>${this._t("peak")}</div>
          <div class="tile-value">${peakHour != null ? this._t("peakAt", { h: peakHour }) : "–"}</div>
        </div>
      </div>

      ${groupsHtml}
    `;

    // Animate the gauge from its previous value instead of jumping on every refresh
    const fill = this.container.querySelector(".gauge-fill");
    const from = this._lastFilled ?? 0;
    fill.style.transition = "none";
    fill.setAttribute("stroke-dashoffset", String(arcLen - from));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fill.style.transition = "";
        fill.setAttribute("stroke-dashoffset", String(arcLen - filled));
      });
    });
    this._lastFilled = filled;
    this._rendered = true;
  }

  _chartHtml(currentHour) {
    const rows = (this._hourly || [])
      .filter((r) => r.target_hour != null)
      .sort((a, b) => a.target_hour - b.target_hour);
    const active = rows.filter((r) => (r.prediction_kwh || 0) > 0.001 || (r.actual_kwh || 0) > 0.001);
    if (active.length < 2) return "";

    const first = Math.max(0, active[0].target_hour - 1);
    const last = Math.min(23, active[active.length - 1].target_hour + 1);
    const byHour = new Map(rows.map((r) => [r.target_hour, r]));
    const hours = [];
    for (let h = first; h <= last; h += 1) hours.push(h);

    const maxVal = Math.max(
      0.05,
      ...hours.map((h) => Math.max(byHour.get(h)?.prediction_kwh || 0, byHour.get(h)?.actual_kwh || 0)),
    ) * 1.1;

    const W = SFML_CHART_W;
    const H = SFML_CHART_H;
    const step = W / hours.length;
    const x = (i) => i * step + step / 2;
    const y = (v) => H - (v / maxVal) * H;

    const points = hours.map((h, i) => [x(i), y(byHour.get(h)?.prediction_kwh || 0)]);
    const line = this._smoothPath(points);
    const area = `${line} L ${points[points.length - 1][0].toFixed(1)},${H} L ${points[0][0].toFixed(1)},${H} Z`;

    const barW = Math.max(2, step * 0.62);
    const bars = hours.map((h, i) => {
      const actual = byHour.get(h)?.actual_kwh;
      if (actual == null || actual <= 0) return "";
      const barH = Math.max(1.5, H - y(actual));
      const cls = h === currentHour ? "bar current" : "bar";
      return `<rect class="${cls}" fill="url(#sfml-bar)" x="${(x(i) - barW / 2).toFixed(1)}" y="${(H - barH).toFixed(1)}"
        width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" rx="${Math.min(3, barW / 2).toFixed(1)}"/>`;
    }).join("");

    const nowIndex = hours.indexOf(currentHour);
    const nowLine = nowIndex >= 0
      ? `<line class="now-line" x1="${x(nowIndex).toFixed(1)}" x2="${x(nowIndex).toFixed(1)}" y1="0" y2="${H}"/>`
      : "";

    const labelEvery = hours.length > 12 ? 3 : 2;
    const labels = hours
      .filter((h, i) => i % labelEvery === 0)
      .map((h) => `<span style="left:${((x(hours.indexOf(h)) / W) * 100).toFixed(2)}%">${String(h).padStart(2, "0")}</span>`)
      .join("");

    return `
      <div class="chart">
        <div class="legend">
          <span><i class="l-actual"></i>${this._t("actual")}</span>
          <span><i class="l-forecast"></i>${this._t("forecast")}</span>
        </div>
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sfml-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style="stop-color: var(--sfml-solar); stop-opacity: 0.28"/>
              <stop offset="1" style="stop-color: var(--sfml-solar); stop-opacity: 0"/>
            </linearGradient>
            <linearGradient id="sfml-bar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style="stop-color: var(--sfml-solar)"/>
              <stop offset="1" style="stop-color: var(--sfml-solar); stop-opacity: 0.45"/>
            </linearGradient>
          </defs>
          <path fill="url(#sfml-area)" d="${area}"/>
          ${bars}
          <path class="forecast-line" d="${line}"/>
          ${nowLine}
        </svg>
        <div class="axis">${labels}</div>
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
      const c1y = Math.min(SFML_CHART_H, p1[1] + (p2[1] - p0[1]) / 6);
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = Math.min(SFML_CHART_H, p2[1] - (p3[1] - p1[1]) / 6);
      d += ` C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  }

  // Sections view: always span the full section width, height follows the content
  getGridOptions() {
    return { columns: 12, min_columns: 12, rows: "auto" };
  }

  getCardSize() {
    return 6;
  }

  static getStubConfig() {
    return {};
  }
}

// "sfml-forecast-card" is the branded type; "sfml-card" stays registered for existing dashboards
class SfmlForecastCard extends SfmlCard {}
if (!customElements.get("sfml-forecast-card")) customElements.define("sfml-forecast-card", SfmlForecastCard);
if (!customElements.get("sfml-card")) customElements.define("sfml-card", SfmlCard);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "sfml-forecast-card")) {
  const code = (document.documentElement.lang || navigator.language || "en").toLowerCase().slice(0, 2);
  const cardLang = code === "de" || code === "pl" ? code : "en";
  window.customCards.push({
    type: "sfml-forecast-card",
    name: ({ de: "Solar Forecast ML – Solarprognose", en: "Solar Forecast ML – Solar Forecast", pl: "Solar Forecast ML – Prognoza solarna" })[cardLang],
    preview: true,
    description: ({ de: "KI-Solarprognose mit Ist/Prognose-Stundenkurve, Prognosegüte und Panelgruppen – von Solar Forecast ML.", en: "AI solar forecast with hourly actual vs. forecast curve, accuracy and panel groups – by Solar Forecast ML.", pl: "Prognoza solarna ze wsparciem AI: krzywa godzinowa wyniku i prognozy, jakość prognozy i grupy paneli – od Solar Forecast ML." })[cardLang],
    documentationURL: "https://www.solarforecastml.com/",
  });
}
