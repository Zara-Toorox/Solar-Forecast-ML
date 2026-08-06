// Copyright (c) 2025 Zara-Toorox. See ../../LICENSE for license terms.
const PremiumDashboardLogic = {
    relevantFreshness(dashboard, heatPump, wallbox, weather) {
        const values = [dashboard.freshness?.energy || null];
        if (heatPump.configured || wallbox.configured) {
            values.push(dashboard.freshness?.eai || null);
        }
        if (weather.configured) {
            values.push(dashboard.freshness?.weather || null);
        }
        return values;
    },
    oldestFreshness(values) {
        const timestamps = values
            .map((value) => Date.parse(value))
            .filter(Number.isFinite);
        return timestamps.length === values.length
            ? Math.min(...timestamps)
            : null;
    },
    dataState(dashboard, values, now = Date.now()) {
        if (dashboard.is_demo) return "mock";
        if (!dashboard.freshness?.energy) return "unavailable";
        const oldest = PremiumDashboardLogic.oldestFreshness(values);
        if (!Number.isFinite(oldest)) return "stale";
        return now - oldest > 5 * 60 * 1000 ? "stale" : "live";
    },
};

const PremiumDashboardPage = ((Vue) => {
    const { ref, reactive, computed, onMounted, onUnmounted } = Vue;

    const COPY = {
        de: {
            demoTitle: "Premium-Demo · Beispieldaten",
            demoText: "Nach Eingabe einer gültigen Premium-Lizenz zeigt dieses Cockpit ausschließlich deine realen Anlagenwerte.",
            energyNow: "Energie jetzt",
            weather: "Wetter & Warnungen",
            forecast: "Tagesprognose vs. IST",
            today: "Heute",
            solar: "Solar",
            home: "Haus",
            battery: "Akku",
            grid: "Netz",
            heatPump: "Wärmepumpe",
            wallbox: "Wallbox",
            notConfigured: "Nicht eingerichtet",
            details: "Details ansehen",
            updated: "Aktualisiert",
            accuracy: "Prognosegüte",
            forecastError: "Forecast-Fehler",
            actualSoFar: "Ist bisher",
            dayForecast: "Tagesprognose",
            learningBasis: "Lernbasis",
            discarded: "Heute verworfen",
            conservative: "P10 Tagesprognose",
            deviation: "Stand zur Prognose",
            pvToBattery: "PV lädt Akku",
            charging: "Lädt",
            discharging: "Entlädt",
            standby: "Standby",
            import: "Bezug",
            export: "Einspeisung",
            noWarnings: "Keine aktiven Wetterwarnungen",
            retry: "Erneut laden",
            unavailable: "Dashboard-Daten sind vorübergehend nicht verfügbar.",
            price: "Strompreis",
            autarky: "Autarkie heute",
            solarToday: "Solar heute",
        },
        en: {
            demoTitle: "Premium demo · Sample data",
            demoText: "After a valid premium licence is entered, this cockpit shows only real installation data.",
            energyNow: "Energy now",
            weather: "Weather & warnings",
            forecast: "Daily forecast vs. actual",
            today: "Today",
            solar: "Solar",
            home: "Home",
            battery: "Battery",
            grid: "Grid",
            heatPump: "Heat pump",
            wallbox: "Wallbox",
            notConfigured: "Not configured",
            details: "View details",
            updated: "Updated",
            accuracy: "Forecast accuracy",
            forecastError: "Forecast error",
            actualSoFar: "Actual so far",
            dayForecast: "Daily forecast",
            learningBasis: "Learning basis",
            discarded: "Discarded today",
            conservative: "P10 daily forecast",
            deviation: "Progress to forecast",
            pvToBattery: "PV charges battery",
            charging: "Charging",
            discharging: "Discharging",
            standby: "Standby",
            import: "Import",
            export: "Export",
            noWarnings: "No active weather warnings",
            retry: "Retry",
            unavailable: "Dashboard data is temporarily unavailable.",
            price: "Electricity price",
            autarky: "Autarky today",
            solarToday: "Solar today",
        },
        pl: {
            demoTitle: "Demo Premium · Dane przykładowe",
            demoText: "Po wprowadzeniu ważnej licencji Premium kokpit pokazuje wyłącznie rzeczywiste dane instalacji.",
            energyNow: "Energia teraz",
            weather: "Pogoda i ostrzeżenia",
            forecast: "Prognoza dzienna a wynik",
            today: "Dzisiaj",
            solar: "Solar",
            home: "Dom",
            battery: "Akumulator",
            grid: "Sieć",
            heatPump: "Pompa ciepła",
            wallbox: "Wallbox",
            notConfigured: "Nie skonfigurowano",
            details: "Pokaż szczegóły",
            updated: "Aktualizacja",
            accuracy: "Jakość prognozy",
            forecastError: "Błąd prognozy",
            actualSoFar: "Wynik dotychczas",
            dayForecast: "Prognoza dzienna",
            learningBasis: "Podstawa uczenia",
            discarded: "Odrzucono dzisiaj",
            conservative: "Prognoza dzienna P10",
            deviation: "Stan do prognozy",
            pvToBattery: "PV ładuje akumulator",
            charging: "Ładowanie",
            discharging: "Rozładowanie",
            standby: "Gotowość",
            import: "Pobór",
            export: "Oddawanie",
            noWarnings: "Brak aktywnych ostrzeżeń",
            retry: "Ponów",
            unavailable: "Dane pulpitu są tymczasowo niedostępne.",
            price: "Cena energii",
            autarky: "Autarkia dzisiaj",
            solarToday: "Solar dzisiaj",
        },
    };

    const _PremiumDashboardPage = {
        emits: ["navigate", "mode-change"],
        template: `
            <section class="premium-dashboard" aria-labelledby="premium-dashboard-title">
                <h2 id="premium-dashboard-title" class="sr-only">{{ copy.energyNow }}</h2>

                <div v-if="dashboard.is_demo" class="premium-demo-banner" role="status">
                    <div><strong>{{ copy.demoTitle }}</strong><span>{{ copy.demoText }}</span></div>
                    <span class="premium-demo-chip">MOCK</span>
                </div>

                <div v-if="error" class="premium-dashboard-error" role="alert">
                    <span>{{ copy.unavailable }}</span>
                    <button type="button" @click="load(true)">{{ copy.retry }}</button>
                </div>

                <div v-if="!loaded" class="premium-dashboard-loading" role="status">
                    <span class="loading-indicator" aria-hidden="true"></span>
                    <strong>Solar Cockpit</strong>
                </div>

                <template v-else>
                    <div class="orbit-cockpit">
                        <header class="orbit-status-rail">
                            <div class="orbit-status-copy">
                                <span class="orbit-kicker">SFML · HOME ENERGY</span>
                                <strong>{{ dashboard.is_demo ? "Premium-Demo" : "Zuhause im Energiefluss" }}</strong>
                            </div>
                            <div class="orbit-status-meta">
                                <span :class="['premium-mode-chip', dataState]">
                                    <i aria-hidden="true"></i>{{ dataStateLabel }}
                                </span>
                                <span>Energie {{ updatedTime }}</span>
                                <span>{{ weatherSymbol }} {{ temperature(weather.temperature_c) }}</span>
                            </div>
                        </header>

                        <div class="orbit-main-grid">
                            <article class="orbit-stage" aria-label="Aktueller Energiefluss">
                                <div class="orbit-ambient" aria-hidden="true"></div>
                                <div class="orbit-landscape" aria-hidden="true"></div>
                                <div class="orbit-flow-scene">
                                <svg class="orbit-day-dial" viewBox="0 0 1000 480"
                                     preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                                    <path class="orbit-day-track" pathLength="100"
                                          d="M60 430 C170 55 830 55 940 430"></path>
                                    <path class="orbit-day-progress" pathLength="100"
                                          :style="{ strokeDasharray: dayArc.progress + ' 100' }"
                                          d="M60 430 C170 55 830 55 940 430"></path>
                                    <g class="orbit-day-sun"
                                       :transform="'translate(' + dayArc.x + ' ' + dayArc.y + ')'">
                                        <circle r="19"></circle>
                                        <circle r="7"></circle>
                                    </g>
                                    <text x="60" y="462">06:00</text>
                                    <text class="orbit-day-title" x="500" y="72">TAGESVERLAUF</text>
                                    <text x="940" y="462">21:00</text>
                                </svg>

                                <svg class="orbit-flow-canvas" viewBox="0 0 1000 620"
                                     preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                                    <defs>
                                        <marker id="orbit-flow-arrow" viewBox="0 0 8 8" refX="7" refY="4"
                                                markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                                            <path d="M0 0 L8 4 L0 8 Z" fill="context-stroke"></path>
                                        </marker>
                                    </defs>
                                    <path class="orbit-flow base solar-path" d="M435 390 C320 340 235 175 110 124"></path>
                                    <path class="orbit-flow energy solar-path source-solar reverse"
                                          :class="{ active: positive(energy.solar_to_house_w) }"
                                          marker-start="url(#orbit-flow-arrow)"
                                          :style="flowStyle(energy.solar_to_house_w)" d="M435 390 C320 340 235 175 110 124"></path>
                                    <path class="orbit-flow pulse solar-path source-solar reverse"
                                          :class="{ active: positive(energy.solar_to_house_w) }"
                                          :style="flowStyle(energy.solar_to_house_w)"
                                          d="M435 390 C320 340 235 175 110 124"></path>
                                    <path class="orbit-flow base battery-path" d="M565 415 C690 430 770 500 890 512"></path>
                                    <path class="orbit-flow energy battery-path"
                                          :class="{
                                              active: positive(energy.solar_to_battery_w) || positive(energy.battery_to_house_w),
                                              reverse: !positive(energy.solar_to_battery_w) && positive(energy.battery_to_house_w),
                                              'source-solar': positive(energy.solar_to_battery_w),
                                              'source-battery': !positive(energy.solar_to_battery_w) && positive(energy.battery_to_house_w),
                                          }"
                                          :marker-start="!positive(energy.solar_to_battery_w) && positive(energy.battery_to_house_w) ? 'url(#orbit-flow-arrow)' : null"
                                          :marker-end="positive(energy.solar_to_battery_w) ? 'url(#orbit-flow-arrow)' : null"
                                          :style="flowStyle(positive(energy.solar_to_battery_w) ? energy.solar_to_battery_w : energy.battery_to_house_w)"
                                          d="M565 415 C690 430 770 500 890 512"></path>
                                    <path class="orbit-flow pulse battery-path"
                                          :class="{
                                              active: positive(energy.solar_to_battery_w) || positive(energy.battery_to_house_w),
                                              reverse: !positive(energy.solar_to_battery_w) && positive(energy.battery_to_house_w),
                                              'source-solar': positive(energy.solar_to_battery_w),
                                              'source-battery': !positive(energy.solar_to_battery_w) && positive(energy.battery_to_house_w),
                                          }"
                                          :style="flowStyle(positive(energy.solar_to_battery_w) ? energy.solar_to_battery_w : energy.battery_to_house_w)"
                                          d="M565 415 C690 430 770 500 890 512"></path>
                                    <path class="orbit-flow base grid-path" d="M435 425 C310 448 230 500 110 512"></path>
                                    <path class="orbit-flow energy grid-path"
                                          :class="{
                                              active: positive(energy.grid_export_w) || positive(energy.grid_import_w),
                                              reverse: !positive(energy.grid_export_w) && positive(energy.grid_import_w),
                                              'source-solar': positive(energy.grid_export_w),
                                              'source-grid': !positive(energy.grid_export_w) && positive(energy.grid_import_w),
                                          }"
                                          :marker-start="!positive(energy.grid_export_w) && positive(energy.grid_import_w) ? 'url(#orbit-flow-arrow)' : null"
                                          :marker-end="positive(energy.grid_export_w) ? 'url(#orbit-flow-arrow)' : null"
                                          :style="flowStyle(positive(energy.grid_export_w) ? energy.grid_export_w : energy.grid_import_w)"
                                          d="M435 425 C310 448 230 500 110 512"></path>
                                    <path class="orbit-flow pulse grid-path"
                                          :class="{
                                              active: positive(energy.grid_export_w) || positive(energy.grid_import_w),
                                              reverse: !positive(energy.grid_export_w) && positive(energy.grid_import_w),
                                              'source-solar': positive(energy.grid_export_w),
                                              'source-grid': !positive(energy.grid_export_w) && positive(energy.grid_import_w),
                                          }"
                                          :style="flowStyle(positive(energy.grid_export_w) ? energy.grid_export_w : energy.grid_import_w)"
                                          d="M435 425 C310 448 230 500 110 512"></path>
                                </svg>

                                <p class="sr-only">
                                    <span v-if="positive(energy.solar_to_house_w)">PV zu Haus: {{ power(energy.solar_to_house_w) }}. </span>
                                    <span v-if="positive(energy.solar_to_battery_w)">PV zu Akku: {{ power(energy.solar_to_battery_w) }}. </span>
                                    <span v-else-if="positive(energy.battery_to_house_w)">Akku zu Haus: {{ power(energy.battery_to_house_w) }}. </span>
                                    <span v-if="positive(energy.grid_export_w)">PV zu Netz: {{ power(energy.grid_export_w) }}. </span>
                                    <span v-else-if="positive(energy.grid_import_w)">Netz zu Haus: {{ power(energy.grid_import_w) }}. </span>
                                </p>

                                <button type="button" class="orbit-anchor solar" @click="navigate('solar')">
                                    <span class="orbit-anchor-icon" aria-hidden="true">☀</span>
                                    <small>{{ copy.solar }}</small>
                                    <strong>{{ power(energy.solar_power_w) }}</strong>
                                    <span>{{ energyValue(energy.solar_yield_today_kwh) }} heute</span>
                                </button>

                                <button type="button" class="orbit-anchor battery" @click="navigate('energy')">
                                    <span class="orbit-anchor-icon" aria-hidden="true">▰</span>
                                    <small>{{ copy.battery }}</small>
                                    <strong>{{ percent(energy.battery_soc_percent) }}</strong>
                                    <span>{{ batteryState }}</span>
                                </button>

                                <button type="button" class="orbit-anchor grid" @click="navigate('energy')">
                                    <span class="orbit-anchor-icon" aria-hidden="true">⌁</span>
                                    <small>{{ copy.grid }}</small>
                                    <strong>{{ gridPower }}</strong>
                                    <span>{{ gridState }}</span>
                                </button>

                                <button type="button" class="orbit-core" @click="navigate('energy')">
                                    <span class="orbit-core-label">{{ copy.home }}</span>
                                    <strong>{{ power(energy.home_consumption_w) }}</strong>
                                    <span>{{ energyValue(energy.home_consumption_today_kwh) }} heute</span>
                                </button>

                                <div class="orbit-mobile-flows" aria-label="Aktive Energieflüsse">
                                    <span v-if="positive(energy.solar_to_house_w)">PV → Haus {{ power(energy.solar_to_house_w) }}</span>
                                    <span v-if="positive(energy.solar_to_battery_w)">PV → Akku {{ power(energy.solar_to_battery_w) }}</span>
                                    <span v-else-if="positive(energy.battery_to_house_w)">Akku → Haus {{ power(energy.battery_to_house_w) }}</span>
                                    <span v-if="positive(energy.grid_export_w)">PV → Netz {{ power(energy.grid_export_w) }}</span>
                                    <span v-else-if="positive(energy.grid_import_w)">Netz → Haus {{ power(energy.grid_import_w) }}</span>
                                </div>
                                </div>

                                <div class="orbit-stage-caption">
                                    <strong>{{ progressText }}</strong>
                                </div>
                            </article>

                            <aside class="orbit-decision-rail">
                                <button type="button" class="orbit-decision weather" @click="navigate(weatherTarget)">
                                    <div class="orbit-decision-heading">
                                        <small>WETTER JETZT</small>
                                        <span>{{ temperatureSourceLabel }}</span>
                                    </div>
                                    <div class="orbit-weather-main">
                                        <span class="orbit-weather-current" aria-hidden="true">
                                            <b>{{ weatherSymbol }}</b>
                                            <strong>{{ temperature(weather.temperature_c) }}</strong>
                                        </span>
                                        <div>
                                            <strong>{{ weatherConditionText }}</strong>
                                            <span>{{ weatherText }}</span>
                                        </div>
                                    </div>
                                    <div class="orbit-decision-metrics">
                                        <span><small>Wind</small><strong>{{ speed(weather.wind_speed_kmh) }}</strong></span>
                                        <span><small>Strahlung</small><strong>{{ radiation(weather.solar_radiation_wm2) }}</strong></span>
                                    </div>
                                    <div v-if="primaryWarning" class="orbit-weather-warning">
                                        <b aria-hidden="true">{{ warningIcon(primaryWarning) }}</b>
                                        <span><strong>{{ warningLabel(primaryWarning) }}</strong><small>{{ warningPeriod(primaryWarning) }}{{ additionalWarningText }}</small><small>{{ warningSourceLabel(primaryWarning) }}</small></span>
                                    </div>
                                    <i aria-hidden="true">→</i>
                                </button>

                                <button type="button" class="orbit-decision solar-overview" @click="navigate('solar')">
                                    <div class="orbit-decision-heading">
                                        <small>SOLARPROGNOSE</small>
                                        <span>{{ updatedTime }}</span>
                                    </div>
                                    <div class="orbit-solar-overview-main">
                                        <div class="orbit-solar-yield">
                                            <strong>{{ energyValue(forecast.actual_kwh) }}</strong>
                                            <span>von {{ energyValue(forecast.forecast_kwh) }} Tagesprognose</span>
                                        </div>
                                        <div class="orbit-forecast-quality">
                                            <strong>{{ percent(overviewAccuracy, 1) }}</strong>
                                            <small>Prognosegüte</small>
                                        </div>
                                    </div>
                                    <div v-if="hasForecastProgress" class="orbit-solar-progress" aria-hidden="true">
                                        <i :style="{ width: progressPercent + '%' }"></i>
                                    </div>
                                    <span class="orbit-solar-progress-text">{{ progressText }}</span>
                                    <div class="orbit-decision-metrics">
                                        <span><small>Autarkie</small><strong>{{ percent(energy.autarky_percent) }}</strong></span>
                                        <span><small>Strompreis</small><strong>{{ priceValue(price.current_ct_per_kwh) }}</strong></span>
                                    </div>
                                    <i aria-hidden="true">→</i>
                                </button>
                            </aside>
                        </div>

                        <div class="orbit-lower-grid">
                            <article class="orbit-horizon">
                                <header>
                                    <div>
                                        <span class="orbit-kicker">HEUTE · SFML-STUNDENPROFIL</span>
                                        <h3>Solarverlauf, Forecast und konservativer Tagesplan</h3>
                                    </div>
                                    <button type="button" @click="navigate('solar')">Forecast öffnen →</button>
                                </header>

                                <div class="orbit-horizon-body">
                                    <div class="orbit-horizon-values">
                                        <button type="button" @click="navigate('solar')"><small>Ist bisher</small><strong>{{ energyValue(forecast.actual_kwh) }}</strong></button>
                                        <button type="button" @click="navigate('solar')"><small>Tagesprognose</small><strong>{{ energyValue(forecast.forecast_kwh) }}</strong></button>
                                        <button type="button" @click="navigate('solar')"><small>P10 konservativ</small><strong>{{ energyValue(forecast.conservative_kwh) }}</strong></button>
                                        <button type="button" @click="navigate('solar')"><small>Stand</small><strong>{{ signed(forecast.deviation_kwh, " kWh") }}</strong></button>
                                    </div>

                                    <div class="orbit-chart-wrap">
                                        <svg v-if="chartModel.hasData" class="orbit-forecast-chart"
                                             viewBox="0 0 1000 280" role="img"
                                             aria-label="Stündlicher Solar-Istwert, Forecast, Modellkorridor und proportional abgeleiteter konservativer Planverlauf">
                                            <g class="orbit-chart-grid">
                                                <text class="orbit-chart-unit" x="64" y="18">kWh je Stunde</text>
                                                <line v-for="tick in chartModel.yTicks" :key="'y-' + tick.label"
                                                      x1="64" x2="980" :y1="tick.y" :y2="tick.y"></line>
                                                <text v-for="(tick, index) in chartModel.yTicks" :key="'yl-' + tick.label"
                                                      :class="['orbit-chart-y-label', { 'mobile-skip': index % 2 === 1 }]"
                                                      x="52" :y="tick.y + 4">{{ tick.label }}</text>
                                                <text v-for="(tick, index) in chartModel.xTicks" :key="'x-' + tick.label"
                                                      :class="['orbit-chart-x-label', { 'mobile-skip': index % 2 === 1 }]"
                                                      :x="tick.x" y="268">{{ tick.label }}</text>
                                            </g>
                                            <path class="orbit-chart-band" :d="chartModel.bandPath"></path>
                                            <path class="orbit-chart-p10" :d="chartModel.p10Path"></path>
                                            <path class="orbit-chart-forecast" :d="chartModel.forecastPath"></path>
                                            <path class="orbit-chart-actual" :d="chartModel.actualPath"></path>
                                            <line v-if="chartModel.currentX !== null" class="orbit-chart-now"
                                                  :x1="chartModel.currentX" :x2="chartModel.currentX"
                                                  y1="24" y2="240"></line>
                                            <circle v-if="chartModel.actualPoint" class="orbit-chart-point"
                                                    :cx="chartModel.actualPoint.x" :cy="chartModel.actualPoint.y" r="6"></circle>
                                        </svg>
                                        <div v-else class="orbit-chart-empty">Noch keine Stundenwerte für heute vorhanden.</div>
                                        <div class="orbit-chart-legend">
                                            <span class="actual">Ist</span>
                                            <span class="forecast">Forecast</span>
                                            <span v-if="chartModel.hasCorridor" class="corridor">Modellkorridor</span>
                                            <span class="p10">Konservativer Planverlauf</span>
                                        </div>
                                    </div>
                                </div>

                                <button type="button" class="orbit-quality-strip" @click="navigate('quality')">
                                    <span><small>{{ copy.accuracy }}</small><strong>{{ percent(forecast.accuracy_percent, 1) }}</strong></span>
                                    <span><small>{{ copy.forecastError }}</small><strong>{{ signed(forecast.forecast_error_percent, " %") }}</strong></span>
                                    <span><small>{{ copy.learningBasis }}</small><strong>{{ forecast.learning_hours ?? "—" }}/{{ forecast.learning_candidates ?? "—" }} h</strong></span>
                                    <span><small>{{ copy.discarded }}</small><strong>{{ forecast.discarded_hours ?? 0 }} h · {{ reasonLabel(forecast.discarded_reason) }}</strong></span>
                                    <i>Details →</i>
                                </button>
                            </article>

                            <div class="orbit-device-showcase">
                                <button type="button" class="orbit-device heatpump" @click="navigate('eai')">
                                    <img class="orbit-device-product"
                                         src="/api/sfml_stats/static/modern/assets/heat-pump-v3.webp"
                                         alt="" loading="lazy" decoding="async">
                                    <div>
                                        <small>ENERGY AI</small>
                                        <strong>{{ copy.heatPump }}</strong>
                                        <span>{{ heatPump.configured ? (heatPump.recommendation || heatPumpMode) : copy.notConfigured }}</span>
                                    </div>
                                    <b>{{ heatPump.configured ? powerKw(heatPump.power_kw) : "→" }}</b>
                                </button>

                                <button type="button" class="orbit-device wallbox" @click="navigate('mobility')">
                                    <img class="orbit-device-product"
                                         src="/api/sfml_stats/static/modern/assets/wallbox-v3.webp"
                                         alt="" loading="lazy" decoding="async">
                                    <div>
                                        <small>ENERGY AI</small>
                                        <strong>{{ copy.wallbox }}</strong>
                                        <span>{{ wallbox.configured ? (wallbox.recommendation || wallboxState) : copy.notConfigured }}</span>
                                    </div>
                                    <b>{{ wallbox.configured ? powerKw(wallbox.power_kw) : "→" }}</b>
                                </button>

                                <button type="button" class="orbit-device quality" @click="navigate('weather_energy')">
                                    <span class="orbit-device-icon" aria-hidden="true">◎</span>
                                    <div>
                                        <small>SYSTEM & LERNEN</small>
                                        <strong>{{ percent(forecast.accuracy_percent, 1) }} Prognosegüte</strong>
                                        <span>{{ forecast.learning_hours ?? "—" }} saubere Lernstunden heute</span>
                                    </div>
                                    <b>→</b>
                                </button>
                            </div>
                        </div>

                        <footer class="premium-attribution">Powered by Solar Forecast ML by Zara-Toorox</footer>
                    </div>
                </template>
            </section>
        `,
        setup(_props, { emit }) {
            const locale = window.SFMLI18n?.current || "de";
            const copy = COPY[locale] || COPY.de;
            const loaded = ref(false);
            const error = ref(null);
            const dashboard = reactive({
                mode: "loading",
                is_demo: false,
                generated_at: null,
            });
            const energy = reactive({});
            const forecast = reactive({});
            const price = reactive({});
            const heatPump = reactive({});
            const wallbox = reactive({});
            const weather = reactive({ warnings: [] });
            const hasSnapshot = ref(false);
            let timer = null;
            let requestPending = false;

            const assign = (target, source) => {
                Object.keys(target).forEach((key) => delete target[key]);
                Object.assign(target, source || {});
            };

            async function load(forceRefresh = false) {
                if (requestPending) return;
                requestPending = true;
                try {
                    const response = await SFMLApi.fetch(
                        "/api/sfml_stats/modern/premium-dashboard",
                        { forceRefresh, ttl: 0 },
                    );
                    const data = response?.data || response;
                    Object.assign(dashboard, data || {});
                    assign(energy, data?.energy);
                    assign(forecast, data?.forecast);
                    assign(price, data?.price);
                    assign(heatPump, data?.heat_pump);
                    assign(wallbox, data?.wallbox);
                    assign(weather, data?.weather);
                    hasSnapshot.value = true;
                    error.value = null;
                    loaded.value = true;
                    emit("mode-change", dashboard.mode);
                } catch (err) {
                    if (!hasSnapshot.value) {
                        Object.assign(dashboard, {
                            mode: "unavailable",
                            is_demo: false,
                            generated_at: null,
                        });
                        assign(energy);
                        assign(forecast);
                        assign(price);
                        assign(heatPump);
                        assign(wallbox);
                        assign(weather, { warnings: [] });
                    }
                    error.value = err?.message || copy.unavailable;
                    loaded.value = true;
                    emit("mode-change", "unavailable");
                } finally {
                    requestPending = false;
                }
            }

            function schedule() {
                window.clearInterval(timer);
                if (!document.hidden) timer = window.setInterval(() => load(true), 15000);
            }

            function handleVisibility() {
                if (document.hidden) {
                    window.clearInterval(timer);
                } else {
                    load(true);
                    schedule();
                }
            }

            function navigate(page) {
                emit("navigate", page);
            }

            const numeric = (value) => {
                if (value === null || value === undefined || value === "") return null;
                const number = Number(value);
                return Number.isFinite(number) ? number : null;
            };
            const formatNumber = (value, digits = 1) => {
                const number = numeric(value);
                if (number === null) return "—";
                return new Intl.NumberFormat(locale, {
                    minimumFractionDigits: digits,
                    maximumFractionDigits: digits,
                }).format(number);
            };
            const power = (value) => {
                const watts = numeric(value);
                if (watts === null) return "—";
                return Math.abs(watts) >= 1000
                    ? `${formatNumber(watts / 1000)} kW`
                    : `${formatNumber(watts, 0)} W`;
            };
            const powerKw = (value) => numeric(value) !== null
                ? `${formatNumber(value)} kW`
                : "—";
            const energyValue = (value) => numeric(value) !== null
                ? `${formatNumber(value)} kWh`
                : "—";
            const percent = (value, digits = 0) => numeric(value) !== null
                ? `${formatNumber(value, digits)} %`
                : "—";
            const temperature = (value) => numeric(value) !== null
                ? `${formatNumber(value)} °C`
                : "—";
            const speed = (value) => numeric(value) !== null
                ? `${formatNumber(value, 0)} km/h`
                : "—";
            const radiation = (value) => numeric(value) !== null
                ? `${formatNumber(value, 0)} W/m²`
                : "—";
            const priceValue = (value) => numeric(value) !== null
                ? `${formatNumber(value, 2)} ct/kWh`
                : "—";
            const signed = (value, unit) => {
                const number = numeric(value);
                if (number === null) return "—";
                return `${number > 0 ? "+" : ""}${formatNumber(number)}${unit}`;
            };
            const positive = (value) => {
                const number = numeric(value);
                return number !== null && number > 10;
            };

            const relevantFreshness = computed(() => PremiumDashboardLogic.relevantFreshness(
                dashboard,
                heatPump,
                wallbox,
                weather,
            ));
            const oldestRelevantFreshness = computed(
                () => PremiumDashboardLogic.oldestFreshness(relevantFreshness.value),
            );
            const updatedTime = computed(() => {
                return Number.isFinite(oldestRelevantFreshness.value)
                    ? new Date(oldestRelevantFreshness.value).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
                    : "—";
            });
            const dataState = computed(
                () => PremiumDashboardLogic.dataState(dashboard, relevantFreshness.value),
            );
            const dataStateLabel = computed(() => ({
                mock: "MOCK",
                live: "LIVE",
                stale: "VERALTET",
                unavailable: "KEINE DATEN",
            }[dataState.value]));
            const batteryState = computed(() => {
                if (positive(energy.solar_to_battery_w)) return `${copy.charging} · ${power(energy.solar_to_battery_w)}`;
                if (positive(energy.battery_to_house_w)) return `${copy.discharging} · ${power(energy.battery_to_house_w)}`;
                if (numeric(energy.battery_soc_percent) === null) return copy.unavailable;
                return copy.standby;
            });
            const gridState = computed(() => {
                if (positive(energy.grid_import_w)) return copy.import;
                if (positive(energy.grid_export_w)) return copy.export;
                if (numeric(energy.grid_import_w) === null && numeric(energy.grid_export_w) === null) return copy.unavailable;
                return copy.standby;
            });
            const gridPower = computed(() => power(positive(energy.grid_import_w) ? energy.grid_import_w : energy.grid_export_w));
            const warnings = computed(() => Array.isArray(weather.warnings) ? weather.warnings : []);
            const weatherTarget = computed(() => warnings.value.length ? "eai_weather" : "weather");
            const weatherSymbol = computed(() => {
                if (warnings.value.length) return warningIcon(warnings.value[0]);
                const condition = String(weather.condition || "").toLowerCase();
                if (condition.includes("lightning") || condition.includes("storm")) return "⛈";
                if (condition.includes("snow") || condition.includes("hail")) return "🌨";
                if (condition.includes("rain") || condition.includes("pour")) return "🌧";
                if (condition.includes("fog")) return "🌫";
                if (condition.includes("partly")) return "🌤";
                if (condition.includes("cloud")) return "☁️";
                return "☀️";
            });
            const temperatureSourceLabel = computed(() => ({
                sensor: "Außensensor",
                weather_entity: "Wetter-App",
                mock: "Demo",
            }[weather.temperature_source] || "Temperatur"));
            const weatherText = computed(() => weather.summary && weather.summary !== "ready"
                ? weather.summary
                : (warnings.value.length ? "Wetterwarnung aktiv" : copy.noWarnings));
            const weatherConditionText = computed(() => {
                const condition = String(weather.condition || "").toLowerCase();
                return {
                    "clear-night": "Klare Nacht",
                    sunny: "Sonnig",
                    partlycloudy: "Teilweise bewölkt",
                    cloudy: "Bewölkt",
                    rainy: "Regen",
                    pouring: "Starkregen",
                    snowy: "Schnee",
                    fog: "Nebel",
                    lightning: "Gewitter",
                    "lightning-rainy": "Gewitterregen",
                    windy: "Windig",
                    hail: "Hagel",
                }[condition] || weather.condition || (weather.available ? "Wetter aktuell" : copy.unavailable);
            });
            const heatPumpMode = computed(() => ({
                heating: "Heizen",
                dhw: "Warmwasser",
                defrost: "Abtauen",
                idle: copy.standby,
            }[heatPump.mode] || heatPump.mode || (heatPump.configured ? copy.unavailable : copy.standby)));
            const wallboxState = computed(() => ({
                connected: "Fahrzeug verbunden",
                charging: "Lädt",
                idle: copy.standby,
            }[wallbox.state] || wallbox.state || (wallbox.configured ? copy.unavailable : copy.standby)));
            const progressPercent = computed(() => {
                const actual = numeric(forecast.actual_kwh);
                const target = numeric(forecast.forecast_kwh);
                return target !== null && target > 0 && actual !== null
                    ? Math.max(0, Math.min(100, (actual / target) * 100))
                    : 0;
            });
            const progressText = computed(() => {
                const value = numeric(forecast.deviation_kwh);
                if (value === null) return "Tagesfortschritt wird ermittelt.";
                return value < 0
                    ? `Noch ${formatNumber(Math.abs(value))} kWh bis zur Tagesprognose.`
                    : `${formatNumber(value)} kWh über der Tagesprognose.`;
            });
            const dayArc = computed(() => {
                const parsed = Date.parse(dashboard.generated_at);
                const date = Number.isFinite(parsed) ? new Date(parsed) : new Date();
                const hour = date.getHours() + date.getMinutes() / 60;
                const progress = Math.max(0, Math.min(100, ((hour - 6) / 15) * 100));
                const t = progress / 100;
                const inverse = 1 - t;
                return {
                    progress: progress.toFixed(1),
                    x: (
                        inverse ** 3 * 60
                        + 3 * inverse ** 2 * t * 170
                        + 3 * inverse * t ** 2 * 830
                        + t ** 3 * 940
                    ).toFixed(1),
                    y: (
                        inverse ** 3 * 430
                        + 3 * inverse ** 2 * t * 55
                        + 3 * inverse * t ** 2 * 55
                        + t ** 3 * 430
                    ).toFixed(1),
                };
            });
            const reasonLabel = (reason) => ({
                demand_limited_zero_export: "Nullexport/Basislast",
                suspected_battery_curtailment: "Vermutete Akku-Abregelung",
                mppt_throttled: "MPPT",
                inverter_clipped: "Clipping",
            }[reason] || reason || "—");

            const warningLabel = (warning) => warning?.title || ({
                high_precipitation_probability: "Hohe Regenwahrscheinlichkeit",
                heavy_precipitation: "Starkregen",
                heat_stress: "Hitzebelastung",
                freeze_risk: "Frostgefahr",
                strong_wind: "Starker Wind",
                storm_wind: "Sturmböen",
                thunderstorm: "Gewitter erwartet",
                hail: "Hagel erwartet",
                snow_or_ice: "Schnee oder Glätte erwartet",
                dense_fog: "Dichter Nebel erwartet",
                severe_weather: "Unwetter erwartet",
                forecast_stale: "Wetterprognose veraltet",
            }[warning?.code] || warning?.label || "Wetterhinweis");
            const warningIcon = (warning) => ({
                frost: "❄️", heat: "🌡️", heavy_rain: "🌧️", rain_likely: "🌦️",
                strong_wind: "💨", storm: "⛈️", thunderstorm: "⛈️", hail: "🧊",
                snow_or_ice: "🌨️", fog: "🌫️", severe_weather: "🚨",
                forecast_quality: "ℹ️", data_quality: "🔄",
            }[warning?.icon_key] || ({
                freeze_risk: "❄️", heat_stress: "🌡️", heavy_precipitation: "🌧️",
                high_precipitation_probability: "🌦️", strong_wind: "💨", storm_wind: "⛈️",
                thunderstorm: "⛈️", hail: "🧊", snow_or_ice: "🌨️", dense_fog: "🌫️",
                severe_weather: "🚨", forecast_stale: "🕒",
            }[warning?.code] || "ℹ️"));
            const warningPeriod = (warning) => warning?.start
                ? new Date(warning.start).toLocaleString(locale, { weekday: "short", hour: "2-digit", minute: "2-digit" })
                : "";
            const warningSourceLabel = (warning) => warning?.official_alert === true
                ? "Amtliche Warnung"
                : "Modellprognose · nicht amtlich";
            const warningKey = (warning) => `${warning?.code || "warning"}-${warning?.start || ""}`;
            const primaryWarning = computed(() => warnings.value[0] || null);
            const additionalWarningText = computed(() => warnings.value.length > 1
                ? ` · +${warnings.value.length - 1} weitere`
                : "");
            const overviewAccuracy = computed(() => numeric(forecast.last_completed_accuracy_percent));
            const hasForecastProgress = computed(() => {
                const actual = numeric(forecast.actual_kwh);
                const target = numeric(forecast.forecast_kwh);
                return actual !== null && target !== null && target > 0;
            });
            const flowStyle = (value) => {
                const watts = Math.abs(numeric(value) || 0);
                return {
                    "--flow-strength": String(Math.max(1, Math.min(7, Math.log10(Math.max(10, watts)) * 2))),
                };
            };
            const chartModel = computed(() => {
                const rows = Array.isArray(forecast.timeline) ? forecast.timeline : [];
                const points = rows
                    .map((row) => ({
                        hour: numeric(row?.hour),
                        forecast: numeric(row?.forecast_kwh),
                        p10: numeric(row?.p10_kwh),
                        actual: numeric(row?.actual_kwh),
                        corridorLow: numeric(row?.corridor_low_kwh),
                        corridorHigh: numeric(row?.corridor_high_kwh),
                    }))
                    .filter((point) => point.hour !== null)
                    .sort((left, right) => left.hour - right.hour);
                if (!points.length) {
                    return {
                        hasData: false,
                        actualPath: "",
                        forecastPath: "",
                        p10Path: "",
                        bandPath: "",
                        actualPoint: null,
                        currentX: null,
                        xTicks: [],
                        yTicks: [],
                    };
                }

                const minHour = Math.min(...points.map((point) => point.hour));
                const maxHour = Math.max(...points.map((point) => point.hour));
                const hourSpan = Math.max(1, maxHour - minHour);
                const values = points.flatMap((point) => [
                    point.actual,
                    point.forecast,
                    point.p10,
                    point.corridorLow,
                    point.corridorHigh,
                ])
                    .filter((value) => value !== null);
                const rawMaximum = Math.max(0.5, ...values);
                const maximum = Math.ceil(rawMaximum * 2) / 2;
                const x = (hour) => 64 + ((hour - minHour) / hourSpan) * 916;
                const y = (value) => 240 - (value / maximum) * 205;
                const linePath = (key) => {
                    let open = false;
                    return points.reduce((path, point) => {
                        const value = point[key];
                        if (value === null) {
                            open = false;
                            return path;
                        }
                        const command = open ? "L" : "M";
                        open = true;
                        return `${path}${command}${x(point.hour).toFixed(1)},${y(value).toFixed(1)} `;
                    }, "").trim();
                };
                const bandPoints = points.filter((point) => (
                    point.corridorLow !== null && point.corridorHigh !== null
                ));
                const bandPath = bandPoints.length > 1
                    ? [
                        `M${bandPoints.map((point) => `${x(point.hour).toFixed(1)},${y(point.corridorHigh).toFixed(1)}`).join(" L")}`,
                        `L${[...bandPoints].reverse().map((point) => `${x(point.hour).toFixed(1)},${y(point.corridorLow).toFixed(1)}`).join(" L")}`,
                        "Z",
                    ].join(" ")
                    : "";
                const actualPoints = points.filter((point) => point.actual !== null);
                const lastActual = actualPoints[actualPoints.length - 1];
                const generatedAt = Date.parse(dashboard.generated_at);
                const generated = Number.isFinite(generatedAt) ? new Date(generatedAt) : null;
                const generatedHour = generated
                    ? generated.getHours() + generated.getMinutes() / 60
                    : null;
                return {
                    hasData: values.length > 0,
                    actualPath: linePath("actual"),
                    forecastPath: linePath("forecast"),
                    p10Path: linePath("p10"),
                    bandPath,
                    hasCorridor: bandPoints.length > 1,
                    actualPoint: lastActual
                        ? { x: x(lastActual.hour), y: y(lastActual.actual) }
                        : null,
                    currentX: generatedHour !== null && generatedHour >= minHour && generatedHour <= maxHour
                        ? x(generatedHour)
                        : null,
                    xTicks: [6, 9, 12, 15, 18, 21]
                        .filter((hour) => hour >= minHour && hour <= maxHour)
                        .map((hour) => ({ label: `${String(hour).padStart(2, "0")}:00`, x: x(hour) })),
                    yTicks: [0, 0.25, 0.5, 0.75, 1].map((share) => ({
                        label: formatNumber(maximum * share, 1),
                        y: y(maximum * share),
                    })),
                };
            });

            onMounted(() => {
                load(true);
                schedule();
                document.addEventListener("visibilitychange", handleVisibility);
            });
            onUnmounted(() => {
                window.clearInterval(timer);
                document.removeEventListener("visibilitychange", handleVisibility);
            });

            return {
                copy, loaded, error, dashboard, energy, forecast, price, heatPump, wallbox,
                weather, warnings, weatherTarget, updatedTime, batteryState, gridState, gridPower,
                weatherSymbol, weatherText, weatherConditionText, temperatureSourceLabel, heatPumpMode, wallboxState,
                progressPercent, progressText, dayArc,
                dataState, dataStateLabel,
                chartModel, primaryWarning, additionalWarningText, overviewAccuracy, hasForecastProgress,
                load, navigate, power, powerKw,
                energyValue, percent, temperature, speed, radiation, priceValue, signed, positive,
                reasonLabel, warningLabel, warningIcon, warningPeriod, warningSourceLabel, warningKey, flowStyle,
            };
        },
    };

    return _PremiumDashboardPage;
})(Vue);

if (typeof window !== "undefined") window.PremiumDashboardPage = PremiumDashboardPage;
if (typeof module !== "undefined") module.exports = PremiumDashboardLogic;
