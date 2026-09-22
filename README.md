<p align="center">
  <img src="custom_components/solar_forecast_ml/brand/logo@2x.png" alt="Solar Forecast ML" width="180">
</p>

<h1 align="center">Solar Forecast ML</h1>

<p align="center">
  <strong>Local solar forecasting for Home Assistant — a digital twin of your own PV system</strong>
</p>

<p align="center">
  <a href="https://github.com/Zara-Toorox/ha-solar-forecast-ml"><img src="https://img.shields.io/badge/version-46.2.2-blue.svg" alt="Version"></a>
  <a href="https://github.com/Zara-Toorox/ha-solar-forecast-ml"><img src="https://img.shields.io/badge/codename-Hubble-purple.svg" alt="Codename"></a>
  <a href="https://hacs.xyz/"><img src="https://img.shields.io/badge/HACS-Custom-orange.svg" alt="HACS"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Proprietary%20Non--Commercial-green.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/Home%20Assistant-2026.3.0%2B-41BDF5.svg" alt="Home Assistant">
  <img src="https://img.shields.io/badge/platform-x86__64%20%7C%20ARM%20%7C%20RPi-lightgrey.svg" alt="Platform">
</p>

> [!IMPORTANT]
> ### Documentation lives on the website
>
> **[solarforecastml.com](https://solarforecastml.com/en/)** is the authoritative source for everything: what each component does, which sensors you need, installation, troubleshooting, known bugs, and release notes.
>
> **[Is SFML right for me?](https://solarforecastml.com/en/suitability/)** · **[Installation](https://solarforecastml.com/en/installation/)** · **[Sensors](https://solarforecastml.com/en/sensors/)** · **[Help](https://solarforecastml.com/en/docs/)** · **[Bug tracker](https://solarforecastml.com/en/bugs/)** · **[Updates](https://solarforecastml.com/en/updates/)**

---

## What it does

Most solar forecasts are calculated in the cloud for a typical installation: tilt, orientation, kilowatt-peak, done. They do not know the tree that shades your roof from 3 p.m. in winter, the fog in your valley, your second array facing west, or the inverter that caps at 4 kW.

Solar Forecast ML builds a **digital twin of your system** instead. It combines solar physics, weather data, your system geometry and your own measurements into an hourly forecast for today, tomorrow and the day after — recalculated every morning, entirely on your Home Assistant hardware.

The forecast improves over time because it learns from your measurements, not from a reference installation. Quality is not asserted — it is measured and shown: accuracy, deviation, usable data days, and long-term trends.

**Everything runs locally.** No cloud model training, no subscriptions, no telemetry.

[![Live energy overview with solar, household, battery and grid](pictures/dashboard.png)](pictures/dashboard.png)

<p align="center"><sub>Live view with the optional STATS module: solar, household demand, battery, grid and forecast status in one place.</sub></p>

---

## Is it right for you?

**Required:** a DC power sensor for your panels — the power arriving at the inverter, not the inverter's AC output. With a battery, a PV-to-battery sensor as well. Without these values SFML cannot work, and there is no way around it.

**Also needed:** your system data (capacity in kWp, orientation, tilt per panel group), Home Assistant 2026.3.0 or newer, and some willingness to understand your own PV system.

**Not suitable for:** systems without a DC power reading, AC-coupled battery systems, or anyone looking for a one-click product.

The website has the [full suitability check](https://solarforecastml.com/en/suitability/) for every component, including the effort each one takes.

---

## What you see

[![Hourly forecast, measured production and model tracks](pictures/forecast.png)](pictures/forecast.png)

Forecast and measured production hour by hour, with weather context, learning basis and the hours that were excluded — and why.

[![Panel-group production and reference comparison](pictures/solar.png)](pictures/solar.png)

Every panel group stays visible on its own: who delivers as expected, who falls behind, how large the gap is — plus the shading pattern learned for your roof.

[![Long-term forecast quality](pictures/intelligence.png)](pictures/intelligence.png)

Forecast quality over time: accuracy, completeness, deviation, usable days and long-term trends. Model development stays auditable instead of being a promise.

<br>

<table>
  <tr>
    <td width="50%"><a href="pictures/energy_pricing.png"><img src="pictures/energy_pricing.png" alt="Energy balance and costs"></a></td>
    <td width="50%"><a href="pictures/smart_charge.png"><img src="pictures/smart_charge.png" alt="Forecast-aware battery charging"></a></td>
  </tr>
  <tr>
    <td align="center"><strong>Energy &amp; finance</strong><br><sub>Where your energy comes from, what it costs, what you saved.</sub></td>
    <td align="center"><strong>Smart charging</strong><br><sub>Grid charging planned from price, forecast and battery state.</sub></td>
  </tr>
</table>

<p align="center"><sub>The views above come from the optional STATS module. SFML itself provides the forecast and its sensors to Home Assistant.</sub></p>

---

## What makes it different

| | Cloud forecasts | Solar Forecast ML |
|---|---|---|
| **Where it runs** | Remote service | Entirely on your hardware |
| **Basis** | A typical installation | Your measurements, your roof |
| **Shading** | Not covered | Learned, including seasonal change |
| **Environment** | Ignored | Snow, fog, haze, air mass and altitude |
| **Inverter limits** | Unknown | Clipping and curtailment recognised and excluded from learning |
| **Quality** | Stated | Measured, shown and traceable |
| **Your data** | Sent to a service | Stays in your home |

Two AI stacks carry the system: **Hubble** for the solar forecast, **Kepler** for energy decisions in the companion modules. Both run locally inside Home Assistant. If the methods behind a forecast disagree, solar physics takes over — so the result stays dependable even in unusual weather.

---

## Companion modules

SFML works standalone. These build on top of it and are installed through the `install_extras` service:

| Module | What it adds | Platform |
|---|---|---|
| **Solar Forecast STATS** | The complete energy workspace: live flows, forecast evaluation, weather history, energy balance, costs, battery and smart charging | x86_64 |
| **Solar Forecast Energy AI** | Explainable recommendations for heat pump, storage and wallbox. Advisory only — it never switches a device (licensed) | x86_64, ARM64 |
| **Grid Price Monitor** | Dynamic electricity prices, time-of-use tariffs, real total price per kWh | all |

Details and screenshots: [solarforecastml.com](https://solarforecastml.com/en/product/)

---

## Installation

**Via HACS (recommended)**

1. HACS → Integrations → Custom repositories
2. Add `https://github.com/Zara-Toorox/ha-solar-forecast-ml` as category *Integration*
3. Install **Solar Forecast ML**
4. Restart Home Assistant, wait 10–15 minutes, restart once more
5. Add the integration under Settings → Devices & Services

**Manually:** download the release, copy it to `config/custom_components/solar_forecast_ml`, restart twice as above.

During setup you provide the power sensor, orientation, tilt and capacity for each panel group, plus your total system capacity. Daily-reset energy helpers are not required — SFML derives hourly and daily energy from the configured power sensors and keeps its own validated state.

The [installation guide](https://solarforecastml.com/en/installation/) walks through every step, including the optional modules.

---

## Licence for Energy AI

Solar Forecast Energy AI ships with SFML and is unlocked with a signed offline key. Information on obtaining a licence is available **inside Solar Forecast STATS via the "Licence" entry in the sidebar**.

The key is entered once at the start of the EAI configuration flow. Validation happens entirely offline inside Home Assistant: no licence server is contacted, and neither the key nor any household data is transmitted. Keep your key private and never post it publicly.

---

## Your data stays yours

**No language models are involved.** There is no connection to ChatGPT, Claude, Gemini or any other AI service. Every calculation and every learning step happens inside your own Home Assistant instance.

**No telemetry, no analytics, no tracking.** The integration contains no usage tracking, no error reporting endpoints and no background callbacks. I cannot see whether you installed it, how you use it, or what your system produces.

**Nothing is shared.** Production data, sensor readings, location and learned model state never leave your system — not to me, not to third parties.

**Weather requests only.** Public weather APIs are queried with coordinates alone: no personal data, no identifiers, no usage metadata. Once configured, everything else works without an internet connection.

---

## Protected code

Parts of this integration are protected with PyArmor. The reasons: preventing the source from being used for AI training without permission, protecting work that took considerable effort, and responding to code having been copied into commercial products in the past.

Protection does not change behaviour — the integration works exactly like an unprotected build, with minimal runtime overhead. If you have a legitimate interest in details about the code, contact me via GitHub Issues or Discussions.

---

## Licence and credits

Proprietary Non-Commercial — free for personal and educational use. See [LICENSE](LICENSE). The repository licence is separate from the EAI activation key.

**Developer:** [Zara-Toorox](https://github.com/Zara-Toorox)

SFML is a private project. It is discussed in several independent communities; none of them belongs to the project, and the website is the authoritative source. Thanks to everyone testing, reporting and discussing — your feedback shapes every release.

[Issues](https://github.com/Zara-Toorox/ha-solar-forecast-ml/issues) · [Discussions](https://github.com/Zara-Toorox/ha-solar-forecast-ml/discussions) · [Bug tracker](https://solarforecastml.com/en/bugs/)

**Fuel my late-night ideas with a coffee? I'd really appreciate it — it keeps this project running.**

<a href='https://ko-fi.com/Q5Q41NMZZY' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://ko-fi.com/img/githubbutton_sm.svg' border='0' alt='Buy Me a Coffee' /></a>
