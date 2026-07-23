const ModernEAIPage = {
    template: `
        <section class="eai-page" aria-labelledby="eai-title">
            <div class="eai-hero">
                <div><span class="eai-kicker">Energy AI · Premium</span><h2 id="eai-title">Wärmepumpe intelligent verstehen</h2><p>Erklärt den Betrieb, prognostiziert den Bedarf und findet die besten Energiezeitfenster.</p></div>
                <div class="eai-state-badges"><span class="eai-badge" :class="status.data_mode">{{ modeLabel }}</span><span class="eai-badge neutral">{{ status.capability_level || "preview" }}</span></div>
            </div>

            <div v-if="status.is_demo" class="eai-demo-banner" role="status">
                <div><strong>Interaktive Premium-Demo</strong><span>Alle gezeigten Werte sind realistische Mock-Daten und keine Messwerte deiner Anlage.</span></div>
                <div class="demo-cta"><span>Mit EAI werden dieselben Ansichten aus deinen Sensoren berechnet.</span><strong>Lizenz beim Anbieter anfordern</strong></div>
            </div>
            <div v-else-if="notice" class="eai-notice" :class="status.data_mode" role="status"><strong>{{ notice.title }}</strong><span>{{ notice.text }}</span></div>

            <nav class="eai-tabs" aria-label="EAI Bereiche"><button v-for="tab in tabs" :key="tab.id" type="button" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">{{ tab.label }}</button></nav>
            <div v-if="loading" class="eai-loading" role="status">EAI wird geladen …</div>
            <div v-else-if="error" class="eai-empty" role="alert"><strong>Daten nicht verfügbar</strong><span>{{ error }}</span></div>

            <template v-else-if="activeTab === 'overview'">
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
                    <div class="energy-story" aria-label="Illustrierter Energiefluss des Beratungsszenarios">
                        <div class="energy-node solar-node"><span>☀</span><strong>PV</strong><small>{{ pvShare }} % heute</small></div><i class="energy-path"><b></b></i>
                        <div class="energy-node hp-node"><span>◈</span><strong>Wärmepumpe</strong><small>nur Empfehlung</small></div><i class="energy-path"><b></b></i>
                        <div class="energy-node house-node"><span>⌂</span><strong>Gebäude / Speicher</strong><small>Wärme zeitlich nutzen</small></div><i class="energy-path grid-path"><b></b></i>
                        <div class="energy-node grid-node"><span>⇄</span><strong>Netz</strong><small>−{{ potential.gridReduction.toLocaleString('de-DE') }} kWh/Jahr</small></div>
                    </div>
                    <div class="timeline-card">
                        <div class="timeline-heading"><div><strong>24-Stunden-Potenzial</strong><span>Vorher und empfohlenes Zeitfenster – keine ausgeführten Schaltungen</span></div><div class="timeline-legend"><span class="before-key">Heute</span><span class="after-key">Beratung</span><span class="pv-key">PV</span></div></div>
                        <div class="advisory-timeline"><div v-for="point in timeline" :key="point.hour" class="timeline-hour" :class="{ cheap: point.cheap }" :title="point.hour + ':00 Uhr · ' + point.price.toFixed(1) + ' ct/kWh'"><span class="price-layer" :style="{ height: point.priceHeight + '%' }"></span><span class="pv-layer" :style="{ height: point.pv + '%' }"></span><span class="before-layer" :style="{ height: point.before + '%' }"></span><span class="after-layer" :style="{ height: point.after + '%' }"></span><small v-if="point.hour % 3 === 0">{{ point.hour }}</small></div></div>
                    </div>
                    <footer class="calculator-disclaimer">STATS-Preisbasis: {{ tariffSourceLabel }}. Annahmen: COP {{ potential.cop.toFixed(1) }}, {{ feedInTariff.toFixed(1) }} ct/kWh Einspeisevergütung und maximal 18 % zeitlich nutzbarer Wärmepumpenstrom. Grundgebühren werden nicht als Einsparung gerechnet. Das Ergebnis ist eine Modellrechnung, keine Steuerung und keine Garantie.</footer>
                </article>
                <div class="eai-wow-grid">
                    <article class="eai-card wow-card accent"><span class="eyebrow">Warum läuft sie gerade?</span><h3>{{ whyNow.headline || "Noch keine Erklärung verfügbar" }}</h3><p>{{ whyNow.explanation }}</p><ul><li v-for="item in whyNow.evidence || []" :key="item">{{ item }}</li></ul><footer><span class="confidence">{{ format(whyNow.confidence_percent, " % Sicherheit") }}</span><span :class="originClass">{{ originLabel }}</span></footer></article>
                    <article class="eai-card wow-card"><span class="eyebrow">Tägliches Energie-Briefing</span><h3>{{ briefing.headline || "Briefing wird vorbereitet" }}</h3><p>{{ briefing.summary }}</p><ol><li v-for="item in briefing.actions || []" :key="item">{{ item }}</li></ol><footer><span :class="originClass">{{ originLabel }}</span></footer></article>
                    <article class="eai-card wow-card"><span class="eyebrow">Bestes Energiezeitfenster</span><h3>{{ windowLabel }}</h3><strong class="wow-number">{{ format(optimization.pv_surplus_kwh, " kWh") }}</strong><p>{{ optimizationExplanation.summary || optimization.recommendation || "Noch kein belastbares PV-Fenster erkannt." }}</p><ul><li v-for="item in optimizationExplanation.evidence || []" :key="item">{{ item }}</li></ul><footer><span class="confidence">{{ format(optimizationExplanation.confidence_percent, " % Vertrauen") }}</span><span :class="originClass">{{ originLabel }}</span></footer></article>
                    <article class="eai-card wow-card"><span class="eyebrow">Anlagen-Gesundheit</span><div class="health-row"><strong class="health-score">{{ format(diagnostics.health_score, "") }}</strong><span>/ 100</span></div><p>{{ anomalyText }}</p><footer><span :class="originClass">{{ originLabel }}</span></footer></article>
                    <article class="eai-card wow-card"><span class="eyebrow">Gebäude-Fingerabdruck</span><h3>{{ format(building.thermal_inertia_hours, " h Wärmespeicher") }}</h3><p>Geschätzter Wärmeverlust: {{ format(building.heat_loss_kw, " kW") }} · Lernfortschritt: {{ format(building.learning_progress_percent, " %") }}</p><div class="learning"><span :style="{ width: (building.learning_progress_percent || 0) + '%' }"></span></div><footer><span :class="originClass">{{ originLabel }}</span></footer></article>
                </div>
                <div class="eai-grid metric-grid"><article v-for="metric in overviewMetrics" :key="metric.label" class="eai-card metric-card"><span class="metric-label">{{ metric.label }}</span><strong>{{ metric.value }}</strong><span :class="originClass">{{ originLabel }}</span></article></div>
            </template>

            <div v-else-if="activeTab === 'forecast'" class="eai-card forecast-card">
                <header><div><span class="eyebrow">72 Stunden · mit Unsicherheitsband</span><h3>Wärmepumpenbedarf und PV-Potenzial</h3></div><span :class="originClass">{{ originLabel }}</span></header>
                <div class="forecast-intelligence">
                    <div class="confidence-orbit" :style="confidenceOrbitStyle"><div><strong>{{ format(forecastUncertainty.confidence_percent, " %") }}</strong><span>Vertrauen</span></div></div>
                    <div class="forecast-explanation"><span class="eyebrow">KEPLER erklärt die Empfehlung</span><h4>{{ optimizationExplanation.headline || "Prognose wird eingeordnet" }}</h4><p>{{ optimizationExplanation.summary || forecastUncertainty.explanation }}</p><ul><li v-for="item in optimizationExplanation.evidence || []" :key="item">{{ item }}</li></ul></div>
                    <div class="uncertainty-facts"><span>Mittlere Unsicherheit</span><strong>± {{ format(forecastUncertainty.average_percent, " %") }}</strong><small>Das Band zeigt die aktuelle Modellspanne transparent und ist keine Garantie.</small></div>
                </div>
                <div class="forecast-plot" aria-label="72-Stunden-Prognose"><div v-for="point in forecast.hours || []" :key="point.timestamp" class="forecast-column" :title="forecastPointTitle(point)"><span class="forecast-band" :style="bandStyle(point)"></span><span class="forecast-value" :style="{ height: powerHeight(point.forecast_kw) }"></span><span v-if="point.actual_kw != null" class="actual-dot" :style="{ bottom: powerHeight(point.actual_kw) }"></span></div></div>
                <div class="chart-legend"><span><i class="forecast-line"></i>Prognose</span><span><i class="actual-line"></i>Ist</span><span><i class="band-line"></i>Unsicherheit</span></div><p class="eai-caption">Haupttreiber: {{ (forecast.main_drivers || []).join(" · ") || "Nicht verfügbar" }}</p>
            </div>

            <div v-else-if="locked" class="eai-card locked-card"><span class="lock-icon">◆</span><h3>Premium-Modul nicht freigeschaltet</h3><p>Dieser Bereich benötigt die Berechtigung <strong>{{ current.required_entitlement }}</strong>.</p><span>Lizenz beim Anbieter anfordern und anschließend im EAI-Config-Flow hinterlegen.</span></div>
            <div v-else class="eai-grid detail-grid"><article v-for="item in detailItems" :key="item.label" class="eai-card detail-card"><span class="metric-label">{{ item.label }}</span><strong>{{ item.value }}</strong><span :class="originClass">{{ originLabel }}</span></article></div>
        </section>`,
    setup() {
        const { ref, reactive, computed, onMounted, watch } = Vue;
        const tabs = [["overview", "Übersicht"], ["forecast", "Prognose"], ["operation", "Betrieb"], ["efficiency", "Effizienz"], ["building", "Gebäude"], ["energy", "PV & Energie"], ["diagnostics", "Diagnose"]].map(([id, label]) => ({ id, label }));
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
        const hourlyPrices = ref([31.2, 29.8, 28.6, 27.9, 29.4, 34.8, 41.6, 45.2, 42.8, 35.4, 27.2, 21.8, 18.6, 17.9, 20.4, 26.8, 34.2, 43.7, 49.1, 46.3, 40.8, 36.1, 33.4, 32.0]);
        const scenario = new URLSearchParams(window.location.search).get("eai_scenario");
        const endpoint = (section) => `/api/sfml_stats/modern/eai/${section}${scenario ? `?scenario=${encodeURIComponent(scenario)}` : ""}`;
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
                    const [billingResult, settingsResult, pricesResult] = await Promise.allSettled([
                        SFMLApi.fetch("/api/sfml_stats/billing"),
                        SFMLApi.fetch("/api/sfml_stats/settings/dashboard"),
                        SFMLApi.fetch("/api/sfml_stats/gpm_prices"),
                    ]);
                    const billing = billingResult.status === "fulfilled" ? billingResult.value : {};
                    const settings = settingsResult.status === "fulfilled" ? settingsResult.value : {};
                    const prices = pricesResult.status === "fulfilled" ? pricesResult.value : {};
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
            } catch (err) { error.value = err?.message || "Provider nicht erreichbar"; } finally { loading.value = false; }
        }
        const format = (value, unit = "") => value == null ? "Noch nicht verfügbar" : `${value}${unit}`;
        const current = computed(() => sections[activeTab.value] || {});
        const overview = computed(() => sections.overview || {});
        const operation = computed(() => sections.operation || {});
        const forecast = computed(() => sections.forecast || {});
        const diagnostics = computed(() => sections.diagnostics || {});
        const building = computed(() => sections.building || {});
        const whyNow = computed(() => overview.value.why_now || operation.value.why_now || {});
        const briefing = computed(() => overview.value.briefing || {});
        const optimization = computed(() => forecast.value.optimization || sections.energy?.optimization || {});
        const optimizationExplanation = computed(() => optimization.value.explanation || {});
        const forecastUncertainty = computed(() => forecast.value.uncertainty || {});
        const confidenceOrbitStyle = computed(() => {
            const confidence = Math.min(100, Math.max(0, Number(forecastUncertainty.value.confidence_percent || 0)));
            return { background: `conic-gradient(#45c7bb ${confidence}%, color-mix(in srgb, #45c7bb 12%, var(--bg-elevated)) 0)` };
        });
        const originLabel = computed(() => status.is_demo ? "Mock-Daten" : "Live-Daten");
        const originClass = computed(() => `origin-tag ${status.is_demo ? "demo" : "live"}`);
        const modeLabel = computed(() => ({ mock: "Premium-Demo", onboarding: "Lernphase", live: "Live", degraded: "Eingeschränkt", unavailable: "Nicht verfügbar" }[status.data_mode] || status.data_mode));
        const notice = computed(() => status.data_mode === "degraded" ? { title: "Datenquelle eingeschränkt", text: "Fehlende Werte werden nicht erfunden oder als Null dargestellt." } : null);
        const windowLabel = computed(() => optimization.value.available ? new Date(optimization.value.start).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr" : "Wird ermittelt");
        const anomalyText = computed(() => diagnostics.value.anomalies?.length ? `${diagnostics.value.anomalies.length} priorisierter Hinweis: ${diagnostics.value.anomalies[0].evidence}` : "Keine kritische Abweichung erkannt.");
        const overviewMetrics = computed(() => [["Aktuelle Leistung", overview.value.current_power_kw, " kW"], ["Energie heute", overview.value.energy_today_kwh, " kWh"], ["Bedarf morgen", overview.value.expected_tomorrow_kwh, " kWh"], ["PV-Deckung", overview.value.pv_coverage_percent, " %"], ["Netzbezug erwartet", overview.value.expected_grid_import_kwh, " kWh"], ["Datenqualität", overview.value.data_quality_percent, " %"]].map(([label, value, unit]) => ({ label, value: format(value, unit) })));
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
            operation: { current_power_kw: ["Aktuelle Leistung", " kW"], current_mode: ["Betriebsart", ""], runtime_hours: ["Laufzeit", " h"], starts: ["Starts", ""], average_cycle_minutes: ["Ø Taktlänge", " min"], sensor_coverage_percent: ["Sensorabdeckung", " %"] },
            efficiency: { electric_kwh: ["Elektrische Energie", " kWh"], thermal_kwh: ["Thermische Energie", " kWh"], cop: ["Synchroner COP", ""], electric_power_kw: ["Elektrische Leistung", " kW"], thermal_power_kw: ["Thermische Leistung", " kW"], volume_flow_l_min: ["Volumenstrom", " l/min"] },
            building: { indoor_c: ["Innentemperatur", " °C"], outdoor_c: ["Außentemperatur", " °C"], comfort_delta_c: ["Komfortabweichung", " K"], thermal_inertia_hours: ["Thermische Trägheit", " h"], heat_loss_kw: ["Wärmeverlust", " kW"], learning_progress_percent: ["Lernfortschritt", " %"] },
            energy: { pv_forecast_kwh: ["PV-Prognose", " kWh"], household_base_load_kwh: ["Hausgrundlast vor Wärme", " kWh"], heat_pump_kwh: ["Wärmepumpenlast", " kWh"], battery_pv_reserve_kwh: ["Speicherreserve nach Wärme", " kWh"], wallbox_pv_available_kwh: ["Rest-PV für Wallbox", " kWh"], pv_coverage_percent: ["PV-Deckung Wärmepumpe", " %"], expected_grid_import_kwh: ["WP-Netzbezug erwartet", " kWh"], energy_context_quality_percent: ["STATS-Kontextqualität", " %"] },
            diagnostics: { health_score: ["Gesundheit", " / 100"], sensor_quality: ["Sensorqualität", ""], data_gaps: ["Datenlücken", ""], forecast_quality: ["Prognosequalität", ""], model_status: ["Modellstatus", ""], drift: ["Drift", ""] },
        };
        const detailItems = computed(() => Object.entries(labels[activeTab.value] || {}).map(([key, [label, unit]]) => ({ label, value: format(current.value[key], unit) })));
        const locked = computed(() => current.value.locked === true);
        const powerHeight = (value) => `${Math.min(100, Math.max(2, Number(value || 0) * 26))}%`;
        const bandStyle = (point) => ({ bottom: powerHeight(point.lower_kw), height: `${Math.max(2, (point.upper_kw - point.lower_kw) * 26)}%` });
        const forecastPointTitle = (point) => {
            const time = new Date(point.timestamp).toLocaleString("de-DE", { weekday: "short", hour: "2-digit", minute: "2-digit" });
            return `${time} · ${format(point.forecast_kw, " kWh")} · Band ${format(point.lower_kw, "")}–${format(point.upper_kw, " kWh")} · ± ${format(point.uncertainty_percent, " %")}`;
        };
        onMounted(load);
        return { tabs, activeTab, loading, error, status, current, operation, forecast, diagnostics, building, whyNow, briefing, optimization, optimizationExplanation, forecastUncertainty, confidenceOrbitStyle, originLabel, originClass, modeLabel, notice, windowLabel, anomalyText, overviewMetrics, detailItems, locked, electricityPrice, pvShare, annualHeat, animatedSavings, feedInTariff, tariffMode, tariffSourceLabel, potential, calculatorSource, timeline, format, powerHeight, bandStyle, forecastPointTitle };
    },
};

window.ModernEAIPage = ModernEAIPage;
