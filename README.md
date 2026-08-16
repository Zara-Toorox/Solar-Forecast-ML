<h1 align="center">Solar Forecast ML V44 "Hubble"</h1>

<p align="center">
  <strong>Local solar forecasting, energy intelligence, and smart charging for Home Assistant</strong>
</p>

<p align="center">
  <a href="https://github.com/Zara-Toorox/ha-solar-forecast-ml"><img src="https://img.shields.io/badge/version-44.2.2-blue.svg" alt="Version"></a>
  <a href="https://github.com/Zara-Toorox/ha-solar-forecast-ml"><img src="https://img.shields.io/badge/codename-Hubble-purple.svg" alt="Codename"></a>
  <a href="https://hacs.xyz/"><img src="https://img.shields.io/badge/HACS-Custom-orange.svg" alt="HACS"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Proprietary%20Non--Commercial-green.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/platform-x86__64%20%7C%20ARM%20%7C%20RPi-lightgrey.svg" alt="Platform">
</p>

> [!IMPORTANT]
> ## Official Solar Forecast ML Website
>
> Visit **[solarforecastml.com](https://solarforecastml.com/en/)** for the complete product overview, installation guidance, sensor reference, troubleshooting help, known bugs, and release updates.
>
> **[Installation](https://solarforecastml.com/en/installation/)** · **[Sensor reference](https://solarforecastml.com/en/sensors/)** · **[Help](https://solarforecastml.com/en/docs/)** · **[Bug tracker](https://solarforecastml.com/en/bugs/)** · **[Updates](https://solarforecastml.com/en/updates/)**

Solar Forecast ML (SFML) builds a local digital twin of your photovoltaic system. It combines solar physics, weather intelligence, panel-group measurements, and locally trained models to produce hourly forecasts for today and the next two days. Version 40 uses an SFML-owned Source-of-Truth layer for validated production, forecast, and diagnostic data instead of relying on recorder-derived energy helpers.

With the optional **Solar Forecast STATS** companion module, the same data becomes a complete energy workspace: live energy flows, forecast evaluation, weather history, long-term model quality, household energy balances, tariffs, battery decisions, and smart charging. The licensed **Solar Forecast Energy AI (EAI)** companion adds explainable recommendations and automation signals for heat pumps and an optional wallbox. No remote model training is involved — forecasting, learning, and EAI license validation run locally on your Home Assistant hardware.

**Fuel my late-night ideas with a coffee? I'd really appreciate it — keep this project running!**

<a href='https://ko-fi.com/Q5Q41NMZZY' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://ko-fi.com/img/githubbutton_sm.svg' border='0' alt='Buy Me a Coffee' /></a>

---

## ☀️ Stop Guessing. Start Knowing.

<img src="custom_components/solar_forecast_ml/brand/logo@2x.png" alt="Solar Forecast ML — AI-Powered Solar Forecasting" align="left" width="250">

While generic solar estimates model a typical installation, Solar Forecast ML uses the **Hubble AI Stack** to build a digital twin of your specific roof. Its local Attention and Transformer components are designed to run within Home Assistant's resource limits while learning your roof geometry, local shading, microclimate, and inverter behavior.

Powered by proprietary models, a local machine-learning engine, and a solar-physics backbone, it delivers **three-day hourly forecasts with continuously measured quality metrics**. Everything runs on your hardware with a transactional SQL database for reliability. No cloud model training, no subscriptions, and no telemetry. Your smart home gains foresight for planning energy use before the sun rises.

<br clear="both">

---

## 🌞 SFML + STATS + EAI — From Forecast to Energy Decisions

SFML, STATS, and EAI are designed as complementary layers of one local energy system:

| Layer | Responsibility |
|-------|----------------|
| **SFML Core** | Creates the 72-hour solar forecast, validates panel-group production, learns local weather and shading effects, protects training data, and persists the solar Source of Truth. |
| **Solar Forecast STATS** | Turns SFML data and optional household sensors into dashboards, energy balances, forecast intelligence, weather history, tariff analysis, and charging decisions. |
| **Solar Forecast Energy AI (licensed)** | Combines solar, household, tariff, heat-pump, building, and optional wallbox context into explainable recommendations, confidence and uncertainty values, and passive automation signals. |
| **Optional companions** | Grid Price Monitor adds dynamic electricity prices; Toorox ForeSight can contribute an additional Transformer forecast track. |

Together they answer the questions that matter in daily operation:

- How much solar energy is available today, tomorrow, and the day after?
- Which hours are suitable for flexible loads, battery charging, or an EV?
- How does the current forecast compare with measured production and alternative model tracks?
- Where is energy flowing between PV, home, battery, grid, and optional consumers?
- How are self-consumption, autonomy, grid costs, and battery use developing?
- When is the most suitable time to run the heat pump, prepare domestic hot water, use thermal storage, or charge the vehicle?
- Why is EAI making a recommendation, how confident is it, and how wide is the underlying forecast uncertainty?
- Did weather, shading, curtailment, clipping, or incomplete sensor data affect the result?
- Is forecast quality improving over weeks and seasons?

### Live Energy Overview

[![Solar Forecast STATS live energy overview](pictures/dashboard.png)](pictures/dashboard.png)

The STATS overview combines SFML's live solar truth with household demand, battery state, grid flow, current weather, forecast status, and the configured electricity price.

### Forecast, Actual Production, and Model Tracks

[![Hourly SFML forecast, actual production, and model comparison](pictures/forecast.png)](pictures/forecast.png)

The hourly view keeps the operational forecast, conservative P10 planning value, hybrid track, measured production, TFS contribution, uncertainty, and learning exclusions in one timeline.

### Panel Groups, Deviations, and Learned Context

[![Panel-group production and reference comparison](pictures/solar.png)](pictures/solar.png)

Independent panel groups remain visible throughout the pipeline. STATS shows measured or predicted group output, deviations from the physical reference, excluded hours, forecast quality, and the context behind production gaps.

### Forecast Intelligence Over Time

[![Long-term forecast intelligence and model development](pictures/intelligence.png)](pictures/intelligence.png)

Forecast Intelligence makes model development auditable with forecast health, completeness, MAE, bias, usable days, milestones, replay views, and long-term quality trends.

### Weather as Part of the Energy Model

[![SFML weather forecast and history](pictures/weather.png)](pictures/weather.png)

Weather is not just a decorative forecast. SFML blends and corrects weather inputs, while STATS exposes current conditions, solar potential, radiation, visibility, and the 49-hour weather horizon.

### Energy, Cost, and Smart-Charging Decisions

<table>
  <tr>
    <td width="50%"><a href="pictures/energy_pricing.png"><img src="pictures/energy_pricing.png" alt="Energy balance and financial analysis"></a></td>
    <td width="50%"><a href="pictures/smart_charge.png"><img src="pictures/smart_charge.png" alt="Forecast-aware smart battery charging"></a></td>
  </tr>
  <tr>
    <td align="center"><strong>Energy &amp; Finance</strong><br>Consumption, solar share, battery use, grid energy, autonomy, and electricity cost across the billing period.</td>
    <td align="center"><strong>Smart Charging</strong><br>Battery target, current price, forecast energy, charging thresholds, actions, and the 48-hour price horizon.</td>
  </tr>
</table>

### Explainable Energy AI for Heat Pump and Wallbox

[![Interactive EAI heat-pump cost calculator and PV-window scenario](pictures/eai_heat_pump_cost_calculator.png)](pictures/eai_heat_pump_cost_calculator.png)

The heat-pump workspace turns PV coverage, annual heat demand, electricity price, and a 24-hour load profile into an interactive advisory scenario. The animated energy flow and annual cost comparison make the potential value visible while clearly stating that EAI recommends but does not control the heat pump.

[![EAI wallbox planning with charging cost, residual PV, confidence, and uncertainty](pictures/eai_wallbox_planning.png)](pictures/eai_wallbox_planning.png)

The wallbox workspace combines vehicle state of charge, departure target, household demand, heat-pump demand, battery reserve, PV forecast, and tariff context. It explains the recommended charging window and exposes confidence and forecast uncertainty instead of presenting false precision.

> These screenshots show the clearly labelled interactive premium demo with realistic mock data. With an EAI license, the same views use the sensors, forecasts, tariffs, and system values configured by the user. Simulated savings are orientation values, not a savings guarantee.

> **STATS and EAI are optional.** SFML remains a complete standalone forecasting integration. STATS adds the visual analysis and energy-management layer and is currently available for x86_64 systems. EAI requires a signed license key and remains advisory-only: it never sends control commands to a heat pump, wallbox, or vehicle.

---

## 🚀 Why Is This Different From Other Solar Forecasts?

Most integrations (like Forecast.Solar or Solcast) use static cloud models. They don't know about your neighbor's tree or why your yield drops every November. Solar Forecast ML is the evolution:

| Feature | Standard Cloud Forecasts | Solar Forecast ML (Hubble AI) |
|---------|--------------------------|-------------------------------|
| **Logic** | Remote forecast or generic formulas | Local physics, Transformer, Attention, and adaptive ensemble models |
| **Privacy** | Data sent to the cloud | 100% Local & Private |
| **Shadows** | None or very basic | Dynamic Seasonal Shadow Mapping |
| **Environment** | Ignores local anomalies | Detects Snow, Fog, Pollution & Altitude |
| **Adaptability** | One size fits all | Learns your specific inverter/panel quirks |
| **Reliability** | "Black Box" predictions | Physics-Backbone + AI Safeguard |

---

## 🧭 Version 40 — Source of Truth Architecture

Version 40 makes SFML the authoritative runtime layer for solar production data. Home Assistant remains the interface, but SFML now owns the critical calculations, validation, and persistence path for its solar truth.

- **SFML-owned database truth** — Actual production, panel-group values, forecast rows, diagnostics, and companion-module reads are backed by the SFML database.
- **Panel-group power first** — Configuration is built around the power sensors (W) of the individual strings or panel groups. Daily-reset energy helpers are no longer required for the core solar setup.
- **Internal energy integration** — SFML derives hourly and daily kWh values from validated group power data, reducing recorder drift, reset issues, and rounding errors.
- **Read-only Home Assistant relationship** — SFML reads configured sensors from Home Assistant but keeps its own validated solar state, so HA recorder issues do not become SFML truth.
- **SOT sensors for automations** — Total and per-group power/energy sensors mirror the SFML database state back into Home Assistant for dashboards, rules, and energy automations.
- **HA event-loop protection** — Heavy EOD and forecast work is moved away from the main Home Assistant event loop where possible, keeping the UI responsive during model training and daily processing.

---

## 🏗️ The "Hubble" AI Stack — Enterprise Intelligence built for Home Assistant

<img src="pictures/hubble_ai.jpg" alt="Hubble AI 10.0 — Solar Forecast ML" align="left" width="350">

> *"It's kind of like building a Hubble telescope in your living room just to check if the fridge light is on in the kitchen… simply because it's cool."*
> — **Basti**, Tester

The heart of this integration is the AI-Stack codename **Hubble**, a custom-built AI ensemble. I didn't just wrap a library — I built a native Transformer architecture from the ground up to fit into Home Assistant's resource limits, without needing TensorFlow or PyTorch.

This isn't a single model. It's a sophisticated ensemble of specialized AIs working in harmony:

<br clear="both">

| Component | Purpose | What It Does |
|-----------|---------|--------------|
| **Hybrid-AI V8.0** | Core Neural Engine | Stacked LSTM with Multi-Head Attention and Transformer elements. Analyzes 24-hour sequences for per-panel-group forecasts, capturing complex temporal patterns. |
| **Miss Ridge** | Quick-Start Model | High-stability model for early-phase predictions (from Day 10 onward), bridging the gap to full ensemble activation. |
| **Frau Holle** | Weather Correction AI | Multi-layer perceptron that non-linearly adjusts weather data based on local sensors and historical biases. |
| **Kalman Tracker** | Real-Time Adjustment | Adaptive filter monitoring minute-by-minute bias, dynamically responding to weather volatility. |
| **Physics Backbone** | Geometric Foundation | Calculates theoretical output with a PhysicsCalibrator that learns deviations from real production (shading, efficiency, aging). |
| **Graduated Safeguard** | Ensemble Oversight | Monitors model agreement; blends confidently when aligned, falls back to physics during divergence. No hallucinations. |
| **Subprocess Trainer** | HA Performance Guard | Runs CPU-intensive EOD model training (LSTM/MLP) in an isolated Python worker process, preventing HA event-loop blockages. |

### 🧠 How Hubble "Sees" Your Energy

**Multi-Head Attention** — Instead of looking at weather as a simple list, Hubble understands temporal context: how a cloudy morning should influence your battery strategy for the afternoon. It reasons across time, not just snapshots.

**Graduated Safeguard** — No AI "hallucinations." If the models diverge too strongly, the Physics-Backbone (pure solar geometry) steps in as a safety anchor. The AI knows when to be confident — and when to step back.

**Efficiency Drift Detection** — Most forecasts go wrong because they don't know your panels are dirty or aging. Hubble tracks your real-world efficiency over time and tells you when it's time to clean them.

Additional self-monitoring layers ensure long-term accuracy:
- **Drift Monitor & Seasonal Adjuster** — Detects biases and learns seasonal patterns from real data, not calendars.
- **Grid Search "The Professor"** — Fully automated hyperparameter optimization, extracting the maximum from your specific hardware.
- **Subprocess training (HA-Performance-Fix)** — CPU-intensive model training runs in a separate Python process to prevent Home Assistant UI lags.

---

## 🌍 Real-World Awareness — Beyond the Horizon

<img src="pictures/beyond_horizon.jpg" alt="Real-World Awareness — Beyond the Horizon" align="left" width="350">

Solar Forecast ML is the only solar forecast integration that understands the messy reality of your environment. While other systems treat every roof as identical, Hubble monitors the real-world conditions that actually impact your production — from snow-covered panels to seasonal shadows, from coastal salt haze to altitude-dependent air mass. Every factor is learned, tracked, and applied automatically.

<br clear="both">

❄️ **Snow Logic** — Recognizes when panels are covered and stops contaminated data from polluting your AI training. A snow day doesn't corrupt your model.

烟 **Fog & Visibility** — Uses a learned visibility tracker to evaluate which weather source is most accurate for your specific coordinates.

🌬️ **Atmospheric Depth** — Adjusts for actual air mass. Crucial if you live at altitude or near the sea — your atmosphere is not the same as your neighbor's.

🌳 **The Moving Shadow** — Learns how shadows from trees and buildings change across seasons, accounting for leaves in summer and bare branches in winter.

🌿 **Air Pollution Awareness** — Detects atmospheric aerosols: rapeseed pollen, coastal salt haze, industrial smog. All of it affects your production, and Hubble knows it.

🔋 **MPPT & Battery Intelligence** — Detects inverter clipping and battery-full curtailment. These events are excluded from AI training, so your model reflects true panel capacity — not artificially limited output.

---

## ⚡ Key Capabilities

### 🔮 Forecasting
- 72-hour hourly forecasts for today, tomorrow, and the day after.
- Dynamic scheduling tied to actual sunrise.
- Adaptive midday re-forecasts when conditions shift significantly.
- Per-panel-group predictions with confidence scores.
- Clean forecast evaluation separates real physical production from curtailed or excluded hours, so MPPT throttling, clipping, and weather-alert exclusions do not distort forecast-quality metrics.
- **Rain-Gating for Similar Weather Relaxation:** Automatically suppresses historical similarity scaling when rain is forecast (precipitation > 0.3 mm or rain overcast regime), preventing overoptimistic spikes on wet days.
- **Service-Triggered Reforecast Coupling:** Instantly recalculates rest-of-day operational snapshots (`ops_` tables) upon service call activation of hybrid or operational reforecast modes.

### 🧠 AI & Machine Learning
- Hubble ensemble with Attention mechanisms for temporal reasoning.
- Automatic daily training and hyperparameter tuning.
- Feature importance analysis to reveal what drives your predictions.
- 28 engineered features: time, weather, astronomy, history, panel geometry.
- Data filtering for anomalies (MPPT throttling, inverter clipping, zero-export limits, weather alerts, outliers, snow days).
- Temporal lag features use clean historical production context, reducing contamination from technically curtailed or excluded bad-weather hours.
- **Out-of-Process Subprocess Training:** Offloads CPU-intensive training of LSTM and MLP models to a separate background worker process to guarantee Home Assistant UI responsiveness.
- **Panel Group Topology Epochs:** Versions capacity configurations historically to prevent capacity splits (e.g. adding panels) from polluting model training data.
- **Forced AI-Floor Removal:** Deactivates the mandatory 30% AI floor in rule-based blending on dark/overcast days if physics MAE is superior to AI MAE, allowing the engine to adaptively scale down to a 12% cap.

### 🌦️ Weather Intelligence
- Blends 5 sources (Open-Meteo, Bright Sky, Pirate Weather, wttr.in, ECMWF) with expert weighting.
- Multi-stage corrections: rolling biases, hourly adjustments, condition-specific tweaks.
- Learned cloud correction applies local weather-precision factors back into corrected forecasts.
- Fog/haze detection, cloud trend/volatility tracking, and daily forecast-vs-actual weather diagnostics.

### 🕵️ Detection & Protection
- Shadow mapping and pattern learning for fixed and moving obstacles.
- Frost/fog warnings via dew point and visibility analysis.
- Full zero-export & battery-full curtailment support with weather/radiation plausibility checks before MPPT exclusions are applied.
- Self-healing transactional SQLite database with crash recovery and 30-day backup retention.
- **Self-Healing & Diagnostics (Hubble Persona):** Automatically validates configuration parameters on boot, monitors live sensor data for spikes, generates Repairs notifications, and performs daily EOD data hygiene checkups.

### ❄️ Seasonal Intelligence
- Automatic Winter Mode (Nov–Feb) with low sun-angle adjustments.
- Rolling DNI tracking for real-time atmospheric clearness monitoring.

### 📐 Panel Group Support
- Up to 4 independent panel groups with different orientations, tilts, capacities, and live power sensors.
- Individual efficiency learning, per-group AI predictions, and per-group Source-of-Truth actuals.
- Total live power and daily energy are derived from the validated panel-group state.

### 🏠 Energy AI — Heat Pump & Building (Licensed)

- 72-hour heat-pump consumption forecast based on the configured system, building context, weather, solar forecast, household demand, battery reserve, and tariff data.
- Recommendations for heating, domestic hot water, thermal storage, deferral, and the next suitable operating window.
- Residual-PV planning accounts for household consumption and battery demand before energy is treated as available for the heat pump.
- Cost and savings context uses the effective electricity-price data supplied through STATS and the configured EAI inputs.
- Every recommendation includes a plain-language explanation, supporting evidence, confidence, validity period, and a dynamic forecast-uncertainty value.
- Passive Home Assistant sensors, binary sensors, and policy switches let users build their own automations without granting EAI direct control of the heat pump.

### 🚗 Energy AI — Wallbox & E-Mobility (Licensed, Optional)

- Charging recommendations consider vehicle state of charge, usable battery capacity, target state of charge, departure time, and maximum charging power.
- Planning prioritizes household demand, heat-pump demand, and battery reserve before assigning residual PV energy to the wallbox.
- Provides recommended charging start and end, required energy, expected PV share, estimated charging cost, cost advantage, and departure readiness.
- Each recommendation exposes its reason, explanation, evidence, confidence, and forecast uncertainty.
- Dedicated wallbox sensors and binary triggers support user-created automations for PV windows, low-price windows, and departure risk.
- EAI never switches the wallbox or starts vehicle charging itself. The user remains responsible for the automation and all actuator commands.

### 🧠 Transformer AI Integration — 20.5M Parameter Multihead Transformer (Toorox ForeSight HA Add-on)
- Seamless integration with the Toorox ForeSight HA companion add-on — a 20.5M-parameter Multihead Transformer trained on multi-year solar history and reanalysis weather data.
- Adaptive ensemble blend: SFML's physics+AI forecast is fused with the Transformer's 72-hour P10/P50/P90 predictions, dynamically weighted per hour and per panel group.
- Three live modulators steer the blend in real time:
  - **MAE-Factor** — tracks 7-day rolling accuracy of both models, shifts weight toward whichever is currently winning
  - **Cloud-Factor** — boosts Transformer influence under overcast/stratus/fog conditions where physics struggles
  - **Shadow-Factor** — increases Transformer weight for panel groups with fixed obstructions or frequent shading
- Effective weight range clamped to 10%–55% (base 35%), ensuring neither model can dominate outliers.
- Up to 4 independent panel groups with different orientations, tilts, and capacities — each blended individually.
- Per-group efficiency learning and per-group AI predictions for maximum precision.
- **Optional component** — SFML works standalone without the Transformer; if the add-on is installed, the blend activates automatically.

---

## 📊 Sensors

### Forecast
| Sensor | Description |
|--------|-------------|
| `solar_forecast_ml_today` | Today's forecast (kWh) |
| `solar_forecast_ml_tomorrow` | Tomorrow's forecast (kWh) |
| `solar_forecast_ml_day_after_tomorrow` | Day after tomorrow (kWh) |
| `solar_forecast_ml_next_hour` | Next hour prediction (kWh) |
| `solar_forecast_ml_peak_production_hour` | Best production hour today |

### Production
| Sensor | Description |
|--------|-------------|
| `solar_forecast_ml_production_time` | Production hours (start/end/duration) |
| `solar_forecast_ml_max_peak_today` | Peak power today (W) |
| `solar_forecast_ml_max_peak_all_time` | All-time peak power (W) |
| `solar_forecast_ml_expected_daily_production` | Daily production target |
| `solar_forecast_ml_conservative_planning_forecast` | Conservative planning forecast for safe energy scheduling |

### Source of Truth
| Sensor | Description |
|--------|-------------|
| `solar_forecast_ml_total_power` | Current total power derived from validated panel-group power (W) |
| `solar_forecast_ml_total_yield` | Current day's SFML-owned actual energy total (kWh) |
| Panel-group SOT sensors | Per-group power and daily energy values backed by the SFML database |

### Planning Sensor Note

`Planungsprognose (P10-Blend)` is a planning-only helper sensor for users who
prefer a more conservative daily value for battery charging, EV charging, and
other energy-management automations.

Core idea:

- SFML remains the primary operational forecast truth
- the planning sensor blends SFML hourly panel-group values with TFS hourly
  `p10` values to shift the result toward the safer side
- the current weighting is `65% SFML / 35% TFS p10`
- the sensor is intentionally separated from `expected_daily_production`,
  learning, and forecast-truth ownership

Operational behavior:

- the planning value is created only once the official `today` forecast is
  locked by Morning Routine
- after that it is persisted and does not roll continuously with normal
  coordinator refreshes
- this makes it suitable as a stable day-planning value instead of a rolling
  intraday truth signal

### Statistics
| Sensor | Description |
|--------|-------------|
| `solar_forecast_ml_average_yield` | Cumulative average yield |
| `solar_forecast_ml_average_yield_7_days` | 7-day rolling average |
| `solar_forecast_ml_average_yield_30_days` | 30-day rolling average |
| `solar_forecast_ml_monthly_yield` | Current month total |
| `solar_forecast_ml_weekly_yield` | Current week total |

### AI & Diagnostics
| Sensor | Description |
|--------|-------------|
| `solar_forecast_ml_model_state` | Active prediction model (AI / Rule-Based) |
| `solar_forecast_ml_model_accuracy` | Current prediction accuracy (%) |
| `solar_forecast_ml_ai_rmse` | Model quality (Excellent / Very Good / Good / Fair) |
| `solar_forecast_ml_training_samples` | Available training samples |
| `solar_forecast_ml_ml_metrics` | MAE, RMSE, R² metrics |

### Shadow & Weather
| Sensor | Description |
|--------|-------------|
| `solar_forecast_ml_shadow_current` | Current shadow level (Clear / Light / Moderate / Heavy) |
| `solar_forecast_ml_performance_loss` | Shadow-related production loss (%) |
| `solar_forecast_ml_cloudiness_trend_1h` | 1-hour cloud trend |
| `solar_forecast_ml_cloudiness_trend_3h` | 3-hour cloud trend |
| `solar_forecast_ml_cloudiness_volatility` | Weather stability index |

---

## 📈 Learning Lifecycle

**Phase 1 — Day 0:** The Physics Backbone is active immediately and provides the initial forecast before sufficient local training data exists.

**Phase 2 — Day 10+:** "Miss Ridge" activates as the first local learning track once enough valid samples are available.

**Phase 3 — Day 30+:** The complete Hubble ensemble can activate when its sample, quality, and readiness gates are satisfied.

| Phase | Typical timeline | Active capability |
|-------|------------------|-------------------|
| Fresh Install | Day 0 | Physics Backbone and weather processing |
| Early Learning | Day 1–10 | Data collection, validation, and geometry calibration |
| Calibration | Day 10–30 | Ridge and adaptive ensemble components begin contributing when ready |
| Full Activation | Day 30+ | Complete ensemble, subject to sample and quality gates |

Actual forecast quality depends on sensor completeness, weather volatility, shading, curtailment, system configuration, and the amount of clean training data. SFML reports MAE, bias, completeness, usable hours, and forecast-health trends instead of assuming a fixed accuracy percentage.

> 💡 **Note:** Solar Forecast ML learns from the data it records after setup. There is currently no Home Assistant service for importing historical Home Assistant data into the learning model.

---

## 🚀 Installation

### HACS (Recommended)
1. HACS > Integrations > Custom repositories
2. Add `https://github.com/Zara-Toorox/ha-solar-forecast-ml` (Integration category)
3. Install **Solar Forecast ML**
4. Restart HA, wait 10–15 minutes, then restart once more.

### Manual
1. Download the latest release.
2. Copy to `config/custom_components/solar_forecast_ml`.
3. Restart HA twice as above.

### Configuration
Add via Settings > Devices & Services. Key inputs:
- **Panel-group power sensors** (W) — required for each active string or panel group
- **System capacity** (kWp) + **Panel groups** (`Power(Wp)/Azimuth(°)/Tilt(°)/PowerSensor`) — required for accurate SOT operation
- **Optional sensors:** temperature, lux, radiation, humidity, wind

Daily-reset energy helpers and manually built sum sensors are no longer required for the core solar setup. SFML calculates hourly and daily energy from the configured power sensors and persists the validated result in its own database.

---

## 🧩 Companion Modules

Install via the `install_extras` service:

| Module | Description | Platform |
|--------|-------------|----------|
| **SFML Stats** | Complete solar & energy dashboard: real-time flows, historical charts, forecast vs. actual, cost tracking, surplus detection, smart charging, and beta Lovelace cards. | x86_64 only |
| **Solar Forecast Energy AI** | Licensed, explainable heat-pump/building and optional wallbox analytics with forecasts, cost context, uncertainty bands, and passive automation signals. No direct device control. | x86_64 and ARM64 |
| **Grid Price Monitor** | Dynamic electricity spot prices for DE/AT, including time-of-use tariff support. | All |

---

## 🔑 EAI License for Heat Pump & Wallbox

Solar Forecast Energy AI is delivered with SFML but is activated by a signed offline license key. The key is entered once at the beginning of the EAI configuration flow; heat-pump functions and the optional wallbox analytics are then configured in the same integration.

**The only way to request an EAI license is through the [Simon42 Community](https://community.simon42.com/):**

1. Sign in to the Simon42 forum.
2. Send a **private message (PN)** to the forum user **`tom-ha`**.
3. State that you would like an EAI license for the heat-pump and/or wallbox functions.
4. Keep the issued `EAI1...` license key private and enter it in the Solar Forecast Energy AI configuration flow.

EAI licenses are **not** issued through GitHub, HACS, GitHub Issues, GitHub Discussions, or public forum posts. Please do not publish your license key.

The signature is validated entirely offline inside Home Assistant. EAI does not contact a license server and does not transmit the license key or household data.

---

## 📋 Requirements

- Home Assistant 2026.3.0+
- Power sensors (W) for the active panel groups or strings
- Correct panel-group capacity, azimuth, and tilt values
- ~50 MB disk space · ~200 MB RAM during AI training
- Runs on x86_64, ARM, Raspberry Pi 4/5 (SFML Stats: x86_64 only)
- Optional but recommended: lux sensor, temperature sensor, solar radiation sensor

---

## ❓ Troubleshooting

- **Low predictions?** Verify kWp, panel-group capacity, azimuth, tilt, and the configured panel-group power sensors.
- **No daily actuals?** Check that every active panel group has a valid power sensor in watts. SFML derives kWh from these power signals.
- **AI stalled?** Check `solar_forecast_ml_training_samples` — minimum 10 needed. Allow 3–7 days for initial collection.
- **Shadows off?** Add a lux sensor. System needs clear-sky days to establish baseline patterns.
- **Logs:** `/config/solar_forecast_ml/logs/solar_forecast_ml.log`

---

## 🛡️ Your Data Stays Yours — A Privacy Commitment

Solar Forecast ML was designed from day one with one non-negotiable principle: **your data never leaves your home.**

This isn't a marketing claim. It's an architectural fact:

**No Large Language Models involved** — There is no connection to ChatGPT, Claude, Gemini, Grok, or any other AI service. Every calculation, every prediction, every learning step happens entirely within your own Home Assistant instance. The "AI" in Solar Forecast ML is your AI — running on your hardware, trained on your data.

**No telemetry, no analytics, no tracking** — The integration contains no usage tracking, no error reporting endpoints, no analytics libraries, and no background callbacks of any kind. I have no visibility into whether you've installed this, how you use it, or what your system produces.

**No data shared with me or anyone else** — Your production data, your sensor readings, your location, your learned model weights — none of it is ever transmitted anywhere. Not to me as the developer, not to third parties, not to weather services beyond the standard forecast requests that you explicitly configure.

**Free weather APIs only** — The integration fetches raw weather forecasts from public APIs (Open-Meteo etc.). These requests contain only coordinates — no personal data, no identifiers, no usage metadata.

**Fully offline-capable** — Once installed, Solar Forecast ML operates entirely within your local network. No internet connection is required for the AI to learn, predict, or correct forecasts.

> In short: What happens in your Home Assistant, stays in your Home Assistant.

---

## 🔐 Protected Code Notice

Some files in this integration are obfuscated (encrypted) with an official **PyArmor** version.

**Why is the code protected?**

1. **Protection against AI Training** — I want to prevent my source code from being used to train AI models like ChatGPT, Claude, Gemini, or other Large Language Models (LLMs) without permission.
2. **Intellectual Property Protection** — The algorithms for solar forecasting, AI-learning, and weather analysis were developed with considerable effort and represent my intellectual property.
3. **Open Source with Limits** — This integration is free for personal use, but the source code is proprietary and subject to a Non-Commercial License.
4. **Unfortunately necessary** — Since code has been copied without my consent, incorporated into commercial applications, and attempts have been made to read and modify it using AI in the past, I unfortunately feel compelled to protect the source code.
5. **Transparency** — If you have a legitimate interest, I'm happy to provide information about the code or disclose it. Just contact me via GitHub Issues or Discussions.

The obfuscation has **no impact on functionality**. The integration works identically to the non-obfuscated version. Runtime overhead is minimal.

*Solar Forecast ML — Copyright (C) 2026 Zara-Toorox · Protected with PyArmor 9.2.4*

---

## 📄 License

Proprietary Non-Commercial — free for personal and educational use. See [LICENSE](LICENSE).

This repository license is separate from the signed EAI activation key. For heat-pump and wallbox EAI access, follow the [EAI license request process](#-eai-license-for-heat-pump--wallbox) above.

---

## 👤 Credits

**Developer:** [Zara-Toorox](https://github.com/Zara-Toorox)

Thanks to Simon42 and the users & contributors of the German-speaking HA Forum "simon42" for their testing, feedback, and discussion. INFO: SFML is a private project not linked to the owner of the Simon42 Forum or any company.

**Support-Forum:** [simon42 Community](https://community.simon42.com/c/sfml/49) | [Issues](https://github.com/Zara-Toorox/ha-solar-forecast-ml/issues) | [Discussions](https://github.com/Zara-Toorox/ha-solar-forecast-ml/discussions)

---

*Developed with ☀️, late-night passion, and a stiff glass of Grog during Germany's wintertime.*
