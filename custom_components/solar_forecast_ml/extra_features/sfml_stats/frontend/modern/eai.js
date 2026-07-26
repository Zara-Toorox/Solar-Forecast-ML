const EAI_NUMBER_FORMAT = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });
const EAI_ALLOCATION = typeof module !== "undefined"
    ? require("./allocation.js")
    : window.SFMLAllocation;

const assessEaiEnergyAllocation = EAI_ALLOCATION.assessEnergyAllocation;

const ModernEAIPage = {
    components: { AllocationWaterfall: EAI_ALLOCATION.AllocationWaterfall },
    template: `
        <section class="eai-page" aria-labelledby="eai-title">
            <div class="eai-hero">
                <div><span class="eai-kicker">Energy AI · Premium</span><h2 id="eai-title">Wärmepumpe intelligent verstehen</h2><p>Erklärt den Betrieb, prognostiziert den Bedarf und findet die besten Energiezeitfenster.</p></div>
                <div class="eai-state-badges"><span class="eai-badge" :class="status.data_mode">{{ modeLabel }}</span><span class="eai-badge neutral">{{ capabilityLabel }}</span></div>
            </div>

            <div v-if="status.is_demo" class="eai-demo-banner" role="status">
                <div><strong>Interaktive Premium-Demo</strong><span>Alle gezeigten Werte sind realistische Mock-Daten und keine Messwerte deiner Anlage.</span></div>
                <div class="demo-cta"><span>Mit EAI werden dieselben Ansichten aus deinen Sensoren berechnet.</span><strong>Lizenz beim Anbieter anfordern</strong></div>
            </div>
            <div v-else-if="notice" class="eai-notice" :class="status.data_mode" role="status"><strong>{{ notice.title }}</strong><span>{{ notice.text }}</span></div>

            <nav class="eai-tabs" role="tablist" aria-label="EAI Bereiche" @keydown="handleTabKeydown"><button v-for="tab in tabs" :id="'eai-tab-' + tab.id" :key="tab.id" type="button" role="tab" :aria-selected="activeTab === tab.id ? 'true' : 'false'" :aria-controls="'eai-panel-' + tab.id" :tabindex="activeTab === tab.id ? 0 : -1" :class="{ active: activeTab === tab.id }" @click="selectTab(tab.id)">{{ tab.label }}</button></nav>
            <div class="eai-data-status" role="status"><strong>{{ dataStatus.title }}</strong><span>{{ dataStatus.text }}</span></div>
            <div v-if="loading" class="eai-loading" role="status">EAI wird geladen …</div>
            <div v-else-if="error" class="eai-empty" role="alert"><strong>Daten nicht verfügbar</strong><span>{{ error }}</span></div>

            <div v-else class="eai-tab-panel" role="tabpanel" :id="'eai-panel-' + activeTab" :aria-labelledby="'eai-tab-' + activeTab" tabindex="0">
            <template v-if="activeTab === 'overview'">
                <article class="eai-card savings-lab" aria-labelledby="savings-title">
                    <header class="savings-header">
                        <div><span class="eyebrow">Interaktives Beratungsszenario</span><h3 id="savings-title">Was könnte ein besser genutztes PV-Zeitfenster wert sein?</h3><p>Der Rechner gibt Empfehlungen. EAI schaltet oder steuert deine Wärmepumpe nicht.</p></div>
                        <div class="simulation-badges"><span class="simulation-badge">Simulation · keine Einspargarantie</span><span class="tariff-badge">{{ tariffMode }}</span></div>
                    </header>
                    <div class="savings-layout">
                        <div class="calculator-controls">
                            <label><span>Strompreis <strong>{{ electricityPrice.toFixed(1) }} ct/kWh</strong></span><input v-model.number="electricityPrice" type="range" min="15" max="70" step="0.5" aria-label="Strompreis in Cent pro Kilowattstunde"></label>
                            <label><span>Heutige PV-Deckung der Wärmepumpe <strong>{{ pvShare }} %</strong></span><input v-model.number="pvShare" type="range" min="0" max="80" step="1" aria-label="Heutige PV-Deckung in Prozent"></label>
                            <label><span>Jährlicher Wärmebedarf <strong>{{ annualHeat.toLocaleString('de-DE') }} kWh</strong></span><input v-model.number="annualHeat" type="range" min="3000" max="30000" step="250" aria-label="Jährlicher Wärmebedarf in Kilowattstunden"></label>
                            <p class="calculator-source">{{ calculatorSource }}</p>
                        </div>
                        <div class="savings-result" aria-live="polite">
                            <span>Orientierungswert pro Jahr</span><strong><small>≈</small> {{ animatedSavings.toLocaleString('de-DE') }} €</strong><p>{{ potential.gridReduction.toLocaleString('de-DE') }} kWh weniger Netzbezug im dargestellten Szenario</p>
                            <div class="result-comparison"><span><small>Heute</small>{{ potential.currentCost.toLocaleString('de-DE') }} €</span><i>→</i><span><small>Mit genutzten Zeitfenstern</small>{{ potential.advisedCost.toLocaleString('de-DE') }} €</span></div>
                        </div>
                    </div>
                    <allocation-waterfall :model="pvWaterfall"></allocation-waterfall>
                    <div class="timeline-card">
                        <div class="timeline-heading"><div><strong>24-Stunden-Potenzial</strong><span>Vorher und empfohlenes Zeitfenster – keine ausgeführten Schaltungen</span></div><div class="timeline-legend"><span class="before-key">Heute</span><span class="after-key">Beratung</span><span class="pv-key">PV</span></div></div>
                        <div class="advisory-timeline"><div v-for="point in timeline" :key="point.hour" class="timeline-hour" :class="{ cheap: point.cheap }" tabindex="0" role="img" :title="timelinePointLabel(point)" :aria-label="timelinePointLabel(point)"><span class="price-layer" :style="{ height: point.priceHeight + '%' }"></span><span class="pv-layer" :style="{ height: point.pv + '%' }"></span><span class="before-layer" :style="{ height: point.before + '%' }"></span><span class="after-layer" :style="{ height: point.after + '%' }"></span><small v-if="point.hour % 3 === 0">{{ point.hour }}</small></div></div>
                    </div>
                    <footer class="calculator-disclaimer">STATS-Preisbasis: {{ tariffSourceLabel }}. Annahmen: COP {{ potential.cop.toFixed(1) }}, {{ feedInTariff.toFixed(1) }} ct/kWh Einspeisevergütung und maximal 18 % zeitlich nutzbarer Wärmepumpenstrom. Grundgebühren werden nicht als Einsparung gerechnet. Das Ergebnis ist eine Modellrechnung, keine Steuerung und keine Garantie.</footer>
                </article>
                <div class="eai-wow-grid">
                    <article class="eai-card wow-card accent"><span class="eyebrow">Warum läuft sie gerade?</span><h3>{{ whyNow.headline || "Noch keine Erklärung verfügbar" }}</h3><p>{{ whyNow.explanation }}</p><ul><li v-for="item in whyNow.evidence || []" :key="item">{{ item }}</li></ul><footer><span class="confidence">{{ format(whyNow.confidence_percent, " % Vertrauen") }}</span></footer></article>
                    <article class="eai-card wow-card"><span class="eyebrow">Tägliches Energie-Briefing</span><h3>{{ briefing.headline || "Briefing wird vorbereitet" }}</h3><p>{{ briefing.summary }}</p><ol><li v-for="item in briefing.actions || []" :key="item">{{ item }}</li></ol></article>
                    <article class="eai-card wow-card"><span class="eyebrow">Bestes Wärmepumpen-PV-Fenster</span><h3>{{ windowLabel }}</h3><strong class="wow-number">{{ format(optimization.pv_surplus_kwh, " kWh") }}</strong><p>{{ optimizationExplanation.summary || optimization.recommendation || "Noch kein belastbares Wärmepumpen-PV-Fenster erkannt." }}</p><ul><li v-for="item in optimizationExplanation.evidence || []" :key="item">{{ item }}</li></ul><footer><span class="confidence">{{ format(optimizationExplanation.confidence_percent, " % Vertrauen") }}</span></footer></article>
                    <article class="eai-card wow-card"><span class="eyebrow">Anlagenzustand</span><div v-if="healthStatus.scoreAvailable" class="health-row"><strong class="health-score">{{ healthStatus.score }}</strong><span>/ 100</span></div><h3 v-else>{{ healthStatus.title }}</h3><p>{{ healthStatus.text }}</p></article>
                    <article class="eai-card wow-card"><span class="eyebrow">Gebäude-Fingerabdruck</span><h3>{{ buildingStatus.title }}</h3><p>{{ buildingStatus.text }}</p><div class="learning"><span :style="{ width: buildingStatus.progress + '%' }"></span></div></article>
                </div>
                <article v-if="thermalLossDisplay.configured" class="eai-card thermal-loss-card">
                    <header><div><span class="eyebrow">Speicher- & Zirkulationsverluste</span><h3>Wo verschwindet die gespeicherte Wärme?</h3></div></header>
                    <p>{{ thermalLossDisplay.explanation }}</p>
                    <div v-if="!thermalLossDisplay.available" class="eai-validation-warning"><strong>{{ thermalLossDisplay.title }}</strong><span>{{ thermalLossDisplay.reason }}</span></div>
                    <div class="thermal-loss-flow">
                        <div><span>Speicher</span><strong>{{ format(thermalLossDisplay.storage_temperature_c, " °C") }}</strong><small>{{ format(thermalLossDisplay.storage_volume_l, " l") }}</small></div>
                        <i>→</i><div><span>Heizraum</span><strong>{{ format(thermalLossDisplay.ambient_temperature_c, " °C") }}</strong><small>Referenztemperatur</small></div>
                        <i>→</i><div><span>Passiver Speicherverlust</span><strong>{{ thermalLossDisplay.available ? format(thermalLossDisplay.standby_loss_kwh_day, " kWh/Tag") : "Noch nicht belastbar" }}</strong><small>{{ thermalLossDisplay.available ? format(thermalLossDisplay.standby_loss_coefficient_w_k, " W/K") : "Plausibilitätsprüfung läuft" }}</small></div>
                        <i>+</i><div><span>Zirkulationsverlust</span><strong>{{ thermalLossDisplay.circulationAvailable ? format(thermalLossDisplay.circulation_loss_kwh_day, " kWh/Tag") : "Noch nicht ermittelt" }}</strong><small>nur bei ausreichenden Schaltbeobachtungen</small></div>
                    </div>
                    <footer><strong>24-h-Schätzung: {{ thermalLossDisplay.available ? format(thermalLossDisplay.forecast_thermal_loss_kwh_24h, " kWh thermisch") : "ausstehend" }}</strong><span>{{ thermalLossDisplay.qualityLabel }}</span></footer>
                </article>
                <div class="eai-grid metric-grid"><article v-for="metric in overviewMetrics" :key="metric.label" class="eai-card metric-card"><span class="metric-label">{{ metric.label }}</span><strong>{{ metric.value }}</strong></article></div>
            </template>

            <div v-else-if="activeTab === 'forecast'" class="eai-card forecast-card">
                <header><div><span class="eyebrow">72 Stunden · mit Unsicherheitsband</span><h3>Wärmepumpenbedarf und PV-Potenzial</h3></div></header>
                <div class="forecast-intelligence">
                    <div class="confidence-orbit" :style="confidenceOrbitStyle"><div><strong>{{ format(forecastUncertainty.confidence_percent, " %") }}</strong><span>Vertrauen</span></div></div>
                    <div class="forecast-explanation"><span class="eyebrow">KEPLER erklärt die Empfehlung</span><h4>{{ optimizationExplanation.headline || "Prognose wird eingeordnet" }}</h4><p>{{ optimizationExplanation.summary || forecastUncertainty.explanation }}</p><ul><li v-for="item in optimizationExplanation.evidence || []" :key="item">{{ item }}</li></ul></div>
                    <div class="uncertainty-facts"><span>Mittlere Unsicherheit</span><strong>± {{ format(forecastUncertainty.average_percent, " %") }}</strong><small>Das Band zeigt die aktuelle Modellspanne transparent und ist keine Garantie.</small></div>
                </div>
                <div class="forecast-plot" aria-label="72-Stunden-Prognose"><div v-for="point in forecast.hours || []" :key="point.timestamp" class="forecast-column" tabindex="0" role="img" :title="forecastPointTitle(point)" :aria-label="forecastPointTitle(point)"><span class="forecast-band" :style="bandStyle(point)"></span><span class="forecast-value" :style="{ height: powerHeight(point.forecast_kw) }"></span><span v-if="point.actual_kw != null" class="actual-dot" :style="{ bottom: powerHeight(point.actual_kw) }"></span></div></div>
                <div class="chart-legend"><span><i class="forecast-line"></i>Prognose</span><span><i class="actual-line"></i>Ist</span><span><i class="band-line"></i>Unsicherheit</span></div><p class="eai-caption">Haupttreiber: {{ (forecast.main_drivers || []).join(" · ") || "Nicht verfügbar" }}</p>
            </div>

            <div v-else-if="locked" class="eai-card locked-card"><span class="lock-icon">◆</span><h3>Premium-Modul nicht freigeschaltet</h3><p>Für diesen Bereich wird <strong>{{ entitlementLabel }}</strong> benötigt.</p><span>Lizenz beim Anbieter anfordern und anschließend im EAI-Config-Flow hinterlegen.</span></div>
            <template v-else-if="activeTab === 'energy'">
                <allocation-waterfall class="energy-waterfall" :model="pvWaterfall"></allocation-waterfall>
                <div class="eai-grid detail-grid"><article v-for="item in energyItems" :key="item.label" class="eai-card detail-card"><span class="metric-label">{{ item.label }}</span><strong>{{ item.value }}</strong><small>{{ item.description }}</small></article></div>
                <article class="eai-card energy-audit-card" :class="{ warning: !energyAudit.valid }">
                    <span class="eyebrow">Geprüfte Energiebilanz · gleicher Prognosezeitraum</span>
                    <h3>{{ energyAudit.title }}</h3><p>{{ energyAudit.text }}</p>
                    <div class="energy-equation"><span>PV verfügbar</span><i>=</i><span>Haus</span><i>+</i><span>Wärmepumpe</span><i>+</i><span>Speicherreserve</span><i>+</i><span>Kalibrierungsreserve</span><i>+</i><span>Wallbox-PV-Budget</span><i>+</i><span>Unverplant / Einspeisung</span><i>±</i><strong>{{ energyAudit.difference }}</strong></div>
                </article>
            </template>
            <div v-else-if="activeTab === 'diagnostics'" class="diagnostics-layout">
                <article v-for="group in diagnosticGroups" :key="group.id" class="eai-card diagnostic-group"><span class="eyebrow">{{ group.eyebrow }}</span><h3>{{ group.title }}</h3><p>{{ group.text }}</p><ul v-if="group.issues.length"><li v-for="issue in group.issues" :key="issue.id"><strong>{{ issue.title }}</strong><span>{{ issue.impact }}</span><span>{{ issue.action }}</span></li></ul></article>
            </div>
            <div v-else class="eai-grid detail-grid"><article v-for="item in detailItems" :key="item.label" class="eai-card detail-card"><span class="metric-label">{{ item.label }}</span><strong>{{ item.value }}</strong><small>{{ item.description }}</small></article></div>
            </div>
        </section>`,
    setup() {
        const { ref, reactive, computed, onMounted, watch } = Vue;
        const tabs = [["overview", "Übersicht"], ["operation", "Live-Betrieb"], ["forecast", "Prognose"], ["efficiency", "Effizienz"], ["building", "Gebäude"], ["energy", "Energieeinsatz"], ["diagnostics", "Diagnose"]].map(([id, label]) => ({ id, label }));
        const activeTab = ref("overview");
        const loading = ref(true);
        const error = ref("");
        const status = reactive({ data_mode: "mock", capability_level: "preview", is_demo: true });
        const sections = reactive(Object.fromEntries(tabs.map((tab) => [tab.id, {}])));
        const electricityPrice = ref(36.9);
        const pvShare = ref(35);
        const annualHeat = ref(12000);
        const animatedSavings = ref(0);
        const priceFromStats = ref(false);
        const feedInTariff = ref(8.2);
        const tariffMode = ref("Dynamischer Mock-Tarif");
        const tariffSourceLabel = ref("Mock-Tarifdaten");
        const liveEnergyFlow = reactive({ household_kw: null, solar_to_house_kw: null, battery_to_house_kw: null, grid_to_house_kw: null });
        const hourlyPrices = ref([31.2, 29.8, 28.6, 27.9, 29.4, 34.8, 41.6, 45.2, 42.8, 35.4, 27.2, 21.8, 18.6, 17.9, 20.4, 26.8, 34.2, 43.7, 49.1, 46.3, 40.8, 36.1, 33.4, 32.0]);
        const scenario = new URLSearchParams(window.location.search).get("eai_scenario");
        const endpoint = (section) => `/api/sfml_stats/modern/eai/${section}${scenario ? `?scenario=${encodeURIComponent(scenario)}` : ""}`;
        const selectTab = (id) => { if (tabs.some((tab) => tab.id === id)) activeTab.value = id; };
        const handleTabKeydown = (event) => {
            const currentIndex = tabs.findIndex((tab) => tab.id === activeTab.value);
            const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
            let nextIndex = currentIndex;
            if (event.key in keys) nextIndex = (currentIndex + keys[event.key] + tabs.length) % tabs.length;
            else if (event.key === "Home") nextIndex = 0;
            else if (event.key === "End") nextIndex = tabs.length - 1;
            else return;
            event.preventDefault();
            selectTab(tabs[nextIndex].id);
            Vue.nextTick(() => document.getElementById(`eai-tab-${tabs[nextIndex].id}`)?.focus());
        };
        async function load() {
            loading.value = true; error.value = "";
            try {
                const responses = await Promise.all(["status", ...tabs.map((tab) => tab.id)].map((section) => SFMLApi.fetch(endpoint(section))));
                const unwrap = (response) => response?.success === true ? response.data : response;
                Object.assign(status, unwrap(responses[0]));
                tabs.forEach((tab, index) => { sections[tab.id] = unwrap(responses[index + 1])?.data || {}; });
                if (status.is_demo) {
                    const mockTariff = sections.overview?.calculator_defaults || {};
                    electricityPrice.value = Number(mockTariff.electricity_price_ct ?? 36.9);
                    feedInTariff.value = Number(mockTariff.feed_in_tariff_ct ?? 8.2);
                    annualHeat.value = Number(mockTariff.annual_heat_demand_kwh ?? 12000);
                    pvShare.value = Number(mockTariff.heat_pump_pv_coverage_percent ?? 35);
                    tariffMode.value = mockTariff.tariff_mode || "Mock-Tarif";
                    tariffSourceLabel.value = mockTariff.tariff_source || "Mock-Tarifdaten";
                    if (Array.isArray(mockTariff.hourly_prices_ct) && mockTariff.hourly_prices_ct.length === 24) hourlyPrices.value = mockTariff.hourly_prices_ct.map(Number);
                }
                const livePv = Number(sections.energy?.pv_coverage_percent ?? sections.overview?.pv_coverage_percent);
                if (!status.is_demo && Number.isFinite(livePv)) pvShare.value = Math.round(livePv);
                if (!status.is_demo) {
                    const forecastElectric = Number(sections.overview?.expected_today_kwh);
                    const measuredCop = Number(sections.efficiency?.cop);
                    if (Number.isFinite(forecastElectric) && forecastElectric > 0) annualHeat.value = Math.min(30000, Math.max(3000, Math.round(forecastElectric * (Number.isFinite(measuredCop) ? measuredCop : 3.5) * 365 / 250) * 250));
                    const [billingResult, settingsResult, pricesResult, energyFlowResult] = await Promise.allSettled([
                        SFMLApi.fetch("/api/sfml_stats/billing"),
                        SFMLApi.fetch("/api/sfml_stats/settings/dashboard"),
                        SFMLApi.fetch("/api/sfml_stats/gpm_prices"),
                        SFMLApi.fetch("/api/sfml_stats/energy_flow"),
                    ]);
                    const billing = billingResult.status === "fulfilled" ? billingResult.value : {};
                    const settings = settingsResult.status === "fulfilled" ? settingsResult.value : {};
                    const prices = pricesResult.status === "fulfilled" ? pricesResult.value : {};
                    const energyFlow = energyFlowResult.status === "fulfilled" ? energyFlowResult.value : {};
                    const wattsToKw = (value) => Number.isFinite(Number(value)) ? Math.round(Number(value) / 10) / 100 : null;
                    liveEnergyFlow.household_kw = wattsToKw(energyFlow?.home?.consumption);
                    liveEnergyFlow.solar_to_house_kw = wattsToKw(energyFlow?.flows?.solar_to_house);
                    liveEnergyFlow.battery_to_house_kw = wattsToKw(energyFlow?.flows?.battery_to_house);
                    liveEnergyFlow.grid_to_house_kw = wattsToKw(energyFlow?.flows?.grid_to_house);
                    const configuredPrice = Number(settings?.price?.energy_price) + Number(settings?.price?.grid_fees);
                    const candidates = [billing?.finance?.avg_price_ct, Number.isFinite(configuredPrice) && configuredPrice > 0 ? configuredPrice : null, prices?.average_price_today, prices?.total_price];
                    const statsPrice = candidates.map(Number).find((value) => Number.isFinite(value) && value > 0);
                    if (statsPrice) { electricityPrice.value = Math.round(statsPrice * 10) / 10; priceFromStats.value = true; }
                    const statsFeedIn = Number(settings?.price?.feed_in_tariff ?? billing?.finance?.feed_in_tariff_ct);
                    if (Number.isFinite(statsFeedIn) && statsFeedIn >= 0) feedInTariff.value = statsFeedIn;
                    tariffMode.value = settings?.price?.mode || prices?.price_mode || "STATS-Tarif";
                    const todayPrices = (prices?.price_hours || []).filter((point) => !point.is_tomorrow && Number.isFinite(Number(point.total_price)));
                    if (todayPrices.length) {
                        const byHour = new Map(todayPrices.map((point) => [Number(point.hour), Number(point.total_price)]));
                        hourlyPrices.value = Array.from({ length: 24 }, (_, hour) => byHour.get(hour) ?? electricityPrice.value);
                    } else {
                        hourlyPrices.value = Array(24).fill(electricityPrice.value);
                    }
                    const priceOrigin = Number(billing?.finance?.avg_price_ct) > 0 ? "gewichteter Abrechnungspreis" : settings?.price?.mode ? "konfigurierter Tarif" : "aktueller STATS-Preis";
                    tariffSourceLabel.value = `${priceOrigin}, ${tariffMode.value}`;
                }
            } catch {
                error.value = "EAI-Daten konnten nicht geladen werden. Technische Details stehen im Home-Assistant-Protokoll.";
            } finally { loading.value = false; }
        }
        const isValue = (value) => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
        const format = (value, unit = "") => isValue(value) ? `${EAI_NUMBER_FORMAT.format(Number(value))}${unit}` : "Noch nicht verfügbar";
        const stateLabels = {
            off: "Aus", heating: "Heizbetrieb", dhw: "Warmwasser", standby: "Bereitschaft",
            defrost: "Abtauung", good: "Gut", critical: "Kritisch", estimated: "Geschätzt",
            preview: "Vorläufig", learning: "Lernphase", stable: "Stabil", demo_model: "Demo-Modell",
            on: "Ein", idle: "Wartet", cooling: "Kühlbetrieb", unavailable: "Nicht verfügbar",
            unknown: "Unbekannt", warning: "Warnung", error: "Fehler", degraded: "Eingeschränkt",
            configured: "Eingerichtet", incomplete: "Unvollständig", missing: "Fehlt", valid: "Gültig",
            invalid: "Ungültig", stale: "Veraltet", fresh: "Aktuell", ready: "Bereit",
        };
        const displayState = (value) => value == null || value === "" ? "Noch nicht verfügbar" : stateLabels[String(value).toLowerCase()] || "Unbekannter Zustand";
        const containsTechnicalId = (value) => /(?:^|[^a-z0-9])(?:sensor|binary_sensor|switch|climate|number|input_number)\.[a-z0-9_]+|\b[a-z0-9]+_entity\b/i.test(String(value || ""));
        const safeCustomerText = (value, fallback = "Details sind in der Diagnose zusammengefasst.") => value && !containsTechnicalId(value) ? String(value) : fallback;
        const safeTextList = (values) => Array.isArray(values) ? values.filter((value) => value && !containsTechnicalId(value)).map(String) : [];
        const current = computed(() => sections[activeTab.value] || {});
        const entitlementLabel = computed(() => ({
            energy: "die Premium-Funktion Energieeinsatz",
            mobility: "die Premium-Funktion Wallbox und Mobilität",
            building: "die Premium-Funktion Gebäudeanalyse",
            diagnostics: "die erweiterte Premium-Diagnose",
            efficiency: "die Premium-Funktion Effizienzanalyse",
            forecast_enabled: "die Premium-Funktion Prognose und Energieeinsatz",
            building_analysis_enabled: "die Premium-Funktion Gebäudeanalyse",
            advanced_diagnostics_enabled: "die erweiterte Premium-Diagnose",
        }[String(current.value.required_entitlement || "").split(/[.:/]/).at(-1)] || "eine passende Premium-Freischaltung"));
        const overview = computed(() => sections.overview || {});
        const operation = computed(() => sections.operation || {});
        const forecast = computed(() => sections.forecast || {});
        const diagnostics = computed(() => sections.diagnostics || {});
        const readiness = computed(() => diagnostics.value.readiness || {});
        const setupComplete = computed(() => {
            if (typeof readiness.value.setup?.complete === "boolean") return readiness.value.setup.complete;
            return typeof diagnostics.value.setup_complete === "boolean"
                ? diagnostics.value.setup_complete
                : null;
        });
        const building = computed(() => sections.building || {});
        const thermalLoss = computed(() => building.value.thermal_loss || {});
        const capabilityLabel = computed(() => ({
            preview: "Vorschau", essential: "Basis", standard: "Standard", advanced: "Erweitert",
        }[status.capability_level] || "Vorschau"));
        const dataStatus = computed(() => {
            if (status.is_demo) return { title: "Datenstatus: Premium-Demo", text: "Alle Werte dieser Ansicht sind gekennzeichnete Beispieldaten." };
            if (status.data_mode === "degraded") return { title: "Datenstatus: eingeschränkt", text: "Messwerte, Prognosen und Modellergebnisse werden nur angezeigt, wenn ihre Grundlage belastbar ist." };
            return { title: "Datenstatus: Anlage", text: "Messwerte, Prognosen und gelernte Modellergebnisse sind in den Beschreibungen getrennt ausgewiesen." };
        });
        const configuredSensorCount = computed(() => {
            if (isValue(diagnostics.value.sensor_count_available) && isValue(diagnostics.value.sensor_count_configured)) {
                return {
                    configured: Number(diagnostics.value.sensor_count_available),
                    total: Number(diagnostics.value.sensor_count_configured),
                };
            }
            const checks = diagnostics.value.checks;
            if (!checks || typeof checks !== "object") return null;
            const values = Object.values(checks);
            return { configured: values.filter(Boolean).length, total: values.length };
        });
        const diagnosticIssues = computed(() => {
            const issues = Array.isArray(diagnostics.value.issues) ? diagnostics.value.issues : [];
            return issues.map((issue, index) => {
                const structured = issue && typeof issue === "object" ? issue : { code: issue };
                const signal = `${structured.category || ""} ${structured.type || ""} ${structured.code || ""}`.toLowerCase();
                const category = /setup|config|assign|mapping/.test(signal) ? "setup"
                    : /model|learn|forecast|confidence/.test(signal) ? "model"
                        : /plant|system|equipment|compressor|fault|drift/.test(signal) ? "plant"
                            : "source";
                const copy = {
                    setup: ["Einrichtung ergänzen", "Öffne die EAI-Einrichtung und ordne diese Messgröße einer Datenquelle zu."],
                    source: ["Datenquelle prüfen", "Prüfe Verfügbarkeit, Aktualität und Einheit der zugeordneten Messung."],
                    model: ["Prognosegrundlage prüfen", "Stelle eine aktuelle Außentemperaturprognose bereit und aktualisiere die Auswertung."],
                    plant: ["Anlagenhinweis prüfen", "Prüfe den realen Betriebszustand der Wärmepumpe und die zugehörigen Messwerte."],
                }[category];
                const affectedInputs = Array.isArray(structured.affected_inputs) ? structured.affected_inputs : [];
                const inputLabels = affectedInputs
                    .map((input) => safeCustomerText(input?.display_name || input?.display_label, ""))
                    .filter(Boolean);
                const directLabels = safeTextList(
                    structured.display_names || structured.display_labels,
                );
                const labels = [...new Set([...inputLabels, ...directLabels])];
                const affected = labels.join(", ") || "Betroffene Messgröße";
                const impact = {
                    not_configured: `Ohne ${affected} kann EAI die grundlegende Wärmepumpenbewertung nicht vollständig berechnen.`,
                    unavailable: `${affected} liefert aktuell keinen gültigen Wert. Abhängige Auswertungen bleiben deshalb nicht verfügbar.`,
                    stale: `${affected} ist nicht mehr aktuell. Abhängige Aussagen werden bis zur nächsten gültigen Aktualisierung zurückgehalten.`,
                    duplicate_assignment: `${affected} ist keiner unabhängigen Datenquelle zugeordnet. Dadurch können Auswertungen verfälscht werden.`,
                    forecast_temperature_fallback: `Für ${affected} wird derzeit ein Ersatzwert verwendet. Das reduziert die Prognosequalität.`,
                }[structured.code] || `${affected} kann derzeit nicht belastbar ausgewertet werden.`;
                const instruction = safeCustomerText(
                    structured.remediation?.instruction,
                    copy[1],
                );
                return { id: `${category}-${index}`, category, title: `${affected}: ${copy[0]}`, impact, action: instruction };
            });
        });
        const plantIssues = computed(() => diagnosticIssues.value.filter((issue) => issue.category === "plant"));
        const diagnosticGroups = computed(() => {
            const count = configuredSensorCount.value;
            const setupState = setupComplete.value;
            const dataState = displayState(readiness.value.data?.status ?? diagnostics.value.sensor_quality);
            const modelState = displayState(readiness.value.model?.status ?? diagnostics.value.model_status);
            const groups = [
                { id: "setup", eyebrow: "Einrichtung", title: setupState === true ? "Einrichtung vollständig" : setupState === false ? "Einrichtung unvollständig" : "Einrichtungsstatus nicht prüfbar", text: setupState == null ? "Der Provider hat keinen eindeutigen Einrichtungsstatus geliefert." : count ? `${count.configured} von ${count.total} Datenprüfungen bestanden.` : "Der Einrichtungsumfang ist noch nicht vollständig prüfbar." },
                { id: "source", eyebrow: "Datenquellen", title: dataState, text: "Verfügbarkeit, Aktualität und Plausibilität der Messdaten – keine Anlagenbewertung." },
                { id: "model", eyebrow: "Modell", title: modelState, text: "Lernreife und Prognosegrundlage – getrennt vom technischen Anlagenzustand." },
                { id: "plant", eyebrow: "Echter Anlagenzustand", title: healthStatus.value.scoreAvailable ? `${healthStatus.value.score} von 100` : healthStatus.value.title, text: healthStatus.value.text },
            ];
            return groups.map((group) => ({ ...group, issues: diagnosticIssues.value.filter((issue) => issue.category === group.id) }));
        });
        const healthStatus = computed(() => {
            const plantReadiness = readiness.value.plant || {};
            const reliable = typeof plantReadiness.reliable === "boolean"
                ? plantReadiness.reliable
                : diagnostics.value.health_score_reliable === true
                    || diagnostics.value.plant_assessment_reliable === true
                    || diagnostics.value.plant_assessment?.reliable === true;
            const score = plantReadiness.score ?? diagnostics.value.health_score;
            if (setupComplete.value !== true) {
                const count = configuredSensorCount.value;
                const setup = count ? `${count.configured} von ${count.total} Datenprüfungen bestanden.` : "Die Datengrundlage ist noch nicht vollständig.";
                return { scoreAvailable: false, title: "Einrichtung noch unvollständig", text: `${setup} Das ist kein nachgewiesener Defekt der Wärmepumpe.` };
            }
            if (!reliable || !isValue(score)) return { scoreAvailable: false, title: "Anlagenzustand noch nicht bewertbar", text: "Einrichtung, Datenquellen und Modell reichen noch nicht für eine belastbare Anlagenbewertung." };
            return { scoreAvailable: true, score: EAI_NUMBER_FORMAT.format(Number(score)), title: "", text: plantIssues.value.length ? "Belastbare Anlagenhinweise sind in der Diagnose zusammengefasst." : "Keine belastbare technische Abweichung erkannt." };
        });
        const buildingStatus = computed(() => {
            const progress = Math.min(100, Math.max(0, Number(building.value.learning_progress_percent || 0)));
            if (!isValue(building.value.thermal_inertia_hours) || !isValue(building.value.heat_loss_kw)) {
                const missingIndoor = !isValue(building.value.indoor_c);
                return {
                    progress,
                    title: missingIndoor ? "Innenraumsensor noch nicht verfügbar" : "Gebäudemodell lernt noch",
                    text: `${missingIndoor ? "Ohne Innentemperatur kann das Gebäudeverhalten nicht belastbar gelernt werden. " : ""}Lernfortschritt: ${Math.round(progress)} %.`,
                };
            }
            return { progress, title: `${building.value.thermal_inertia_hours} h Wärmespeicher`, text: `Geschätzter Wärmeverlust: ${building.value.heat_loss_kw} kW · Modellfortschritt: ${Math.round(progress)} %.` };
        });
        const thermalLossDisplay = computed(() => {
            const loss = thermalLoss.value;
            const intervals = Number(loss.passive_cooling_intervals || 0);
            const coefficient = Number(loss.standby_loss_coefficient_w_k);
            const daily = Number(loss.standby_loss_kwh_day);
            const forecastLoss = Number(loss.forecast_thermal_loss_kwh_24h);
            const enoughSamples = intervals >= 24;
            const plausible = [coefficient, daily, forecastLoss].every(Number.isFinite)
                && coefficient > 0 && coefficient <= 15
                && daily > 0 && daily <= 12
                && forecastLoss > 0 && forecastLoss <= 16;
            const available = loss.available === true && enoughSamples && plausible;
            const reasons = [];
            if (!enoughSamples) reasons.push(`erst ${intervals} von mindestens 24 geeigneten Abkühlintervallen`);
            if (!plausible) reasons.push("physikalische Plausibilitätsgrenze nicht bestanden");
            return {
                ...loss,
                configured: loss.configured !== false && Object.keys(loss).length > 0,
                available,
                circulationAvailable: available && isValue(loss.circulation_loss_kwh_day) && Number(loss.circulation_loss_kwh_day) >= 0,
                title: "Verlustmodell noch nicht freigegeben",
                reason: reasons.join(" · ") || "Die Datengrundlage wird noch geprüft.",
                explanation: available ? (loss.explanation || "Schätzung aus passiven Abkühlphasen.") : "Ungeprüfte Hochrechnungen werden nicht als Anlagenwert angezeigt.",
                qualityLabel: `${intervals} geeignete Intervalle · Modell ${available ? "plausibel" : "noch nicht belastbar"}`,
            };
        });
        const whyNow = computed(() => {
            const source = overview.value.why_now || operation.value.why_now || {};
            return { ...source, headline: safeCustomerText(source.headline, "Betrieb wird eingeordnet"), explanation: safeCustomerText(source.explanation, "Die aktuelle Datengrundlage wird geprüft."), evidence: safeTextList(source.evidence) };
        });
        const briefing = computed(() => {
            const source = overview.value.briefing || {};
            return { ...source, headline: safeCustomerText(source.headline, "Briefing wird vorbereitet"), summary: safeCustomerText(source.summary, "Noch keine belastbare Zusammenfassung verfügbar."), actions: safeTextList(source.actions) };
        });
        const optimization = computed(() => forecast.value.optimization || sections.energy?.optimization || {});
        const optimizationExplanation = computed(() => {
            const source = optimization.value.explanation || {};
            return { ...source, headline: safeCustomerText(source.headline, "Prognose wird eingeordnet"), summary: safeCustomerText(source.summary || optimization.value.recommendation, "Noch kein belastbares Zeitfenster erkannt."), evidence: safeTextList(source.evidence) };
        });
        const forecastUncertainty = computed(() => forecast.value.uncertainty || {});
        const confidenceOrbitStyle = computed(() => {
            const confidence = Math.min(100, Math.max(0, Number(forecastUncertainty.value.confidence_percent || 0)));
            return { background: `conic-gradient(#45c7bb ${confidence}%, color-mix(in srgb, #45c7bb 12%, var(--bg-elevated)) 0)` };
        });
        const modeLabel = computed(() => ({ mock: "Premium-Demo", onboarding: "Lernphase", live: "Live", degraded: "Eingeschränkt", unavailable: "Nicht verfügbar" }[status.data_mode] || status.data_mode));
        const notice = computed(() => status.data_mode === "degraded" ? { title: "Datenquelle eingeschränkt", text: "Fehlende Werte werden nicht erfunden oder als Null dargestellt." } : null);
        const windowLabel = computed(() => optimization.value.available ? new Date(optimization.value.start).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr" : "Wird ermittelt");
        const overviewMetrics = computed(() => [
            ["Aktuelle elektrische Leistung", overview.value.current_power_kw, " kW"],
            ["Elektrische Energie heute", overview.value.energy_today_kwh, " kWh"],
            ["Elektrischer Bedarf morgen", overview.value.expected_tomorrow_kwh, " kWh"],
            ["PV-Anteil Wärmepumpe", overview.value.pv_coverage_percent, " %"],
            ["Netzbezug Wärmepumpe erwartet", overview.value.expected_grid_import_kwh, " kWh"],
            ["Messdaten-Abdeckung", overview.value.data_quality_percent, " %"],
        ].map(([label, value, unit]) => ({ label, value: format(value, unit) })));
        const energyAudit = computed(() => {
            const energy = sections.energy || {};
            const assessment = assessEaiEnergyAllocation(energy);
            const error = assessment.complete ? Math.abs(assessment.calculatedBalanceError) : null;
            if (!assessment.complete) return { valid: false, title: "Bilanz noch nicht prüfbar", text: "Dieser Provider liefert den neuen prüfbaren Allokationsvertrag noch nicht vollständig. Rest-PV wird nicht aus älteren Ausgleichsfeldern rekonstruiert.", difference: "Prüfung ausstehend" };
            return {
                valid: assessment.valid,
                difference: `${format(error, " kWh Bilanzfehler")}`,
                title: assessment.valid ? "Stündliche PV-Allokation ist geschlossen" : "Energiebilanz nicht vollständig belastbar",
                text: assessment.valid
                    ? "Alle Teilintervalle gehören zum selben Zeitraum. Rest-PV ist explizit nicht zugeordnet oder zur Einspeisung verfügbar; Netzenergie wird getrennt ausgewiesen."
                    : "Providerstatus, Zeitraum oder die selbst geprüfte Komponentensumme bestätigen keine geschlossene Allokation. Rest-PV wird bis zur Klärung unterdrückt.",
            };
        });
        const allocationPeriod = computed(() => {
            const energy = sections.energy || {};
            if (!energy.forecast_period_start || !energy.forecast_interval_end) return "Zeitraum nicht bestätigt";
            const start = new Date(energy.forecast_period_start).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
            const end = new Date(energy.forecast_interval_end).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
            return `${start}–${end} Uhr`;
        });
        const pvWaterfall = computed(() => {
            const energy = sections.energy || {};
            return EAI_ALLOCATION.createAllocationViewModel(energy, {
                period: allocationPeriod.value,
                message: energyAudit.value.text,
            });
        });
        const energyItems = computed(() => {
            const energy = sections.energy || {};
            const providerResidual = energyAudit.value.valid ? energy.unallocated_or_export_kwh : null;
            const coverage = Number(energy.pv_coverage_percent);
            const heatPump = Number(energy.heat_pump_kwh);
            const calculatedGrid = Number.isFinite(coverage) && Number.isFinite(heatPump)
                ? Math.round(Math.max(0, heatPump * (1 - coverage / 100)) * 100) / 100
                : null;
            const householdPower = liveEnergyFlow.household_kw ?? energy.household_power_kw ?? overview.value.household_power_kw;
            return [
                { label: "PV-Prognose", value: format(energy.pv_forecast_kwh, " kWh"), description: "Erwartete PV-Energie im ausgewiesenen Prognosezeitraum." },
                { label: "Haus-Grundlast", value: format(energy.household_base_load_kwh, " kWh"), description: "Prognostizierter Hausverbrauch ohne Wärmepumpe im selben Zeitraum." },
                { label: "Hausverbrauch aktuell", value: format(householdPower, " kW"), description: "Momentane elektrische Leistung des Hauses; kein fehlender Wert wird als null interpretiert." },
                { label: "Haus aus PV", value: format(liveEnergyFlow.solar_to_house_kw ?? energy.solar_to_house_power_kw, " kW"), description: "Momentaner, direkt durch PV gedeckter Hausverbrauch." },
                { label: "Haus aus Batterie", value: format(liveEnergyFlow.battery_to_house_kw ?? energy.battery_to_house_power_kw, " kW"), description: "Momentaner, durch die Batterie gedeckter Hausverbrauch." },
                { label: "Haus aus Netz", value: format(liveEnergyFlow.grid_to_house_kw ?? energy.grid_to_house_power_kw, " kW"), description: "Momentaner Netzanteil am Hausverbrauch." },
                { label: "Wärmepumpenbedarf", value: format(energy.heat_pump_kwh, " kWh"), description: "Prognostizierte elektrische Energie der Wärmepumpe." },
                { label: "PV direkt fürs Haus", value: format(energy.household_pv_kwh, " kWh"), description: "Zeitgleicher PV-Anteil am prognostizierten Hausverbrauch." },
                { label: "PV direkt für Wärmepumpe", value: format(energy.heat_pump_pv_kwh, " kWh"), description: "Zeitgleicher PV-Anteil am elektrischen Wärmepumpenbedarf." },
                { label: "Speicherreserve", value: format(energy.battery_pv_reserve_kwh, " kWh"), description: "Für den Batteriespeicher reservierte PV-Energie." },
                { label: "Rest-PV", value: format(providerResidual, " kWh"), description: energyAudit.value.valid ? "Nach allen bestätigten Allokationen nicht zugeordnet oder zur Einspeisung verfügbar; keine Wallbox-Zusage." : "Wegen einer nicht geschlossenen Energiebilanz unterdrückt." },
                { label: "Konservativer Sicherheitsabschlag", value: format(energy.pv_calibration_reserve_kwh, " kWh"), description: "Nicht zusätzlich verplante PV-Energie aufgrund historischer Prognose- und Überschussabweichungen." },
                { label: "PV-Anteil Wärmepumpe", value: format(energy.pv_coverage_percent, " %"), description: "Anteil des elektrischen Wärmepumpenbedarfs, den PV voraussichtlich deckt." },
                { label: "Netzbezug Wärmepumpe", value: format(calculatedGrid, " kWh"), description: "Aus Wärmepumpenbedarf und PV-Anteil rechnerisch erwarteter Netzbezug." },
                { label: "Energiekontext-Abdeckung", value: format(energy.energy_context_quality_percent, " %"), description: "Abdeckung der benötigten STATS-Kontextdaten; keine Gesamtbewertung der Modellqualität." },
            ];
        });
        const potential = computed(() => {
            const measuredCop = Number(sections.efficiency?.cop);
            const cop = Number.isFinite(measuredCop) && measuredCop >= 1.5 ? measuredCop : 3.5;
            const electric = annualHeat.value / cop;
            const currentPv = electric * pvShare.value / 100;
            const shiftRate = Math.min(0.18, Math.max(0, (100 - pvShare.value) / 100 * 0.45));
            const gridReduction = electric * shiftRate;
            const currentGrid = Math.max(0, electric - currentPv);
            const advisedGrid = Math.max(0, currentGrid - gridReduction);
            const currentCost = currentGrid * electricityPrice.value / 100;
            const netValue = Math.max(0, electricityPrice.value / 100 - feedInTariff.value / 100);
            const savings = gridReduction * netValue;
            return { cop, gridReduction: Math.round(gridReduction), currentCost: Math.round(currentCost), advisedCost: Math.round(currentCost - savings), savings: Math.round(savings) };
        });
        const calculatorSource = computed(() => status.is_demo ? "Demo: Strompreis, Einspeisevergütung und Stundenprofil sind eindeutig gekennzeichnete Mock-Tarifdaten." : priceFromStats.value ? "Live: Gewichteter STATS-Preis, Tarif, Einspeisevergütung sowie EAI-Prognosedaten wurden vorbelegt. Die Rechnung bleibt eine Simulation." : "Live: EAI-Prognosedaten wurden vorbelegt; STATS hatte keinen belastbaren Preis. Den Strompreis kannst du manuell setzen.");
        const timeline = computed(() => Array.from({ length: 24 }, (_, hour) => {
            const morning = Math.max(0, 1 - Math.abs(hour - 6) / 4);
            const evening = Math.max(0, 1 - Math.abs(hour - 19) / 5);
            const solar = Math.max(0, Math.sin((hour - 6) * Math.PI / 12));
            const before = 24 + Math.max(morning, evening) * 66;
            const shiftStrength = Math.min(1, potential.value.gridReduction / 900);
            const price = Number(hourlyPrices.value[hour] ?? electricityPrice.value);
            const maxPrice = Math.max(...hourlyPrices.value, electricityPrice.value, 1);
            const minPrice = Math.min(...hourlyPrices.value, electricityPrice.value);
            const priceAdvantage = maxPrice > minPrice ? (maxPrice - price) / (maxPrice - minPrice) : 0;
            const advisedWindow = Math.max(solar, priceAdvantage * 0.8);
            const after = Math.max(14, before * (1 - shiftStrength * 0.3) + advisedWindow * shiftStrength * 45);
            return { hour, before: Math.round(before), after: Math.round(after), pv: Math.round(solar * pvShare.value), price, priceHeight: Math.round(price / maxPrice * 100), cheap: price < electricityPrice.value * 0.82 };
        }));
        const timelinePointLabel = (point) => `${point.hour}:00 Uhr, Strompreis ${point.price.toFixed(1)} Cent pro Kilowattstunde, PV-Potenzial ${point.pv} Prozent, heutiges Lastprofil ${point.before} Prozent, beratenes Lastprofil ${point.after} Prozent${point.cheap ? ", günstige Stunde" : ""}`;
        let savingsAnimation = null;
        watch(() => potential.value.savings, (target, previous = 0) => {
            if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { animatedSavings.value = target; return; }
            if (savingsAnimation !== null) cancelAnimationFrame(savingsAnimation);
            const start = Number(animatedSavings.value || previous);
            const started = performance.now();
            const tick = (time) => {
                const progress = Math.min(1, (time - started) / 420);
                animatedSavings.value = Math.round(start + (target - start) * (1 - Math.pow(1 - progress, 3)));
                if (progress < 1) savingsAnimation = requestAnimationFrame(tick);
            };
            savingsAnimation = requestAnimationFrame(tick);
        }, { immediate: true });
        const labels = {
            operation: {
                current_power_kw: ["Aktuelle elektrische Leistung", " kW", "Momentane Leistungsaufnahme der Wärmepumpe."],
                current_mode: ["Betriebszustand", "", "Aktueller, übersetzter Zustand der Wärmepumpe.", true],
                runtime_hours: ["Gesamtlaufzeit", " h", "Kumulierter Betriebsstundenzähler."],
                runtime_heating_hours: ["Laufzeit Heizung", " h", "Davon für Raumheizung."],
                runtime_dhw_hours: ["Laufzeit Warmwasser", " h", "Davon für Warmwasserbereitung."],
                starts: ["Kompressorstarts", "", "Kumulierter Startzähler des Kompressors."],
                average_cycle_minutes: ["Durchschnittliche Laufzeit je Start", " min", "Mittlere Kompressorlaufzeit pro Start."],
                sensor_coverage_percent: ["Datenabdeckung", " %", "Anteil verfügbarer Betriebsdaten; Details stehen in Diagnose."],
            },
            efficiency: {
                electric_kwh: ["Elektrische Energie heute", " kWh", "Heute gemessener Stromverbrauch der Wärmepumpe."],
                thermal_kwh: ["Thermische Energie heute", " kWh", "Heute abgegebene oder aus validen Messwerten berechnete Wärme."],
                daily_work_factor: ["Arbeitszahl heute", "", "Thermische Energie geteilt durch elektrische Energie desselben Tages."],
                reported_jaz: ["Jahresarbeitszahl", "", "Vom zugeordneten Sensor gelieferte langfristige Arbeitszahl."],
                cop: ["Momentaner COP", "", "Nur aus zeitgleichen elektrischen und thermischen Leistungswerten."],
                electric_power_kw: ["Elektrische Leistung", " kW", "Momentane elektrische Aufnahmeleistung."],
                thermal_power_kw: ["Thermische Leistung", " kW", "Momentane Wärmeleistung aus synchronen Messgrößen."],
                volume_flow_l_min: ["Volumenstrom", " l/min", "Aktueller Volumenstrom des Heizkreises."],
            },
            building: {
                indoor_c: ["Innentemperatur", " °C", "Aktuell gemessene Innenraumtemperatur."],
                outdoor_c: ["Außentemperatur", " °C", "Aktuelle Außentemperatur der verwendeten Datenquelle."],
                comfort_delta_c: ["Abweichung vom Komfortziel", " K", "Differenz zwischen Innenraumtemperatur und Komfortziel."],
                thermal_inertia_hours: ["Thermische Trägheit", " h", "Gelernte Reaktionsdauer des Gebäudes."],
                heat_loss_kw: ["Geschätzter Gebäude-Wärmeverlust", " kW", "Modellergebnis, kein geeichter Wärmemesswert."],
                learning_progress_percent: ["Fortschritt Gebäudemodell", " %", "Reife des Gebäudemodells, nicht die Messdatenqualität."],
            },
            diagnostics: {
                health_score: ["Anlagenzustand", " / 100", "Nur bei ausreichender Datenbasis belastbar."],
                sensor_quality: ["Qualität der Sensordaten", "", "Plausibilität und Aktualität der Messwerte.", true],
                data_gaps: ["Erkannte Datenlücken", "", "Fehlende oder veraltete Eingangsgrößen."],
                forecast_quality: ["Qualität der Prognose", "", "Reife und Belastbarkeit der Vorhersage.", true],
                model_status: ["Modellstatus", "", "Aktueller Lern- oder Betriebszustand des Modells.", true],
                drift: ["Modellabweichung", "", "Zeigt, ob sich das Anlagenverhalten gegenüber dem gelernten Muster verändert.", true],
            },
        };
        const detailItems = computed(() => Object.entries(labels[activeTab.value] || {}).map(([key, [label, unit, description, isState]]) => ({
            label,
            value: isState ? displayState(current.value[key]) : format(current.value[key], unit),
            description: key === "sensor_coverage_percent" && configuredSensorCount.value
                ? `${configuredSensorCount.value.configured} von ${configuredSensorCount.value.total} Datenprüfungen bestanden.`
                : description,
        })));
        const locked = computed(() => current.value.locked === true);
        const powerHeight = (value) => `${Math.min(100, Math.max(2, Number(value || 0) * 26))}%`;
        const bandStyle = (point) => ({ bottom: powerHeight(point.lower_kw), height: `${Math.max(2, (point.upper_kw - point.lower_kw) * 26)}%` });
        const forecastPointTitle = (point) => {
            const time = new Date(point.timestamp).toLocaleString("de-DE", { weekday: "short", hour: "2-digit", minute: "2-digit" });
            return `${time} · ${format(point.forecast_kw, " kW")} · Band ${format(point.lower_kw, "")}–${format(point.upper_kw, " kW")} · ± ${format(point.uncertainty_percent, " %")}`;
        };
        onMounted(load);
        return { tabs, activeTab, selectTab, handleTabKeydown, loading, error, status, current, operation, forecast, diagnostics, building, diagnosticGroups, thermalLossDisplay, whyNow, briefing, optimization, optimizationExplanation, forecastUncertainty, confidenceOrbitStyle, modeLabel, capabilityLabel, dataStatus, notice, windowLabel, healthStatus, buildingStatus, overviewMetrics, detailItems, energyItems, energyAudit, pvWaterfall, locked, entitlementLabel, electricityPrice, pvShare, annualHeat, animatedSavings, feedInTariff, tariffMode, tariffSourceLabel, potential, calculatorSource, timeline, timelinePointLabel, format, powerHeight, bandStyle, forecastPointTitle };
    },
};

if (typeof window !== "undefined") window.ModernEAIPage = ModernEAIPage;
if (typeof module !== "undefined") module.exports = { assessEaiEnergyAllocation };
