const ModernMobilityPage = {
    template: `
        <section class="mobility-page" aria-labelledby="mobility-title">
            <div class="mobility-hero">
                <div><span class="mobility-kicker">Energy AI · E-Mobilität</span><h2 id="mobility-title">Laden, wenn Energie wirklich passt</h2><p>PV-Prognose, Wärmepumpenbedarf, Strompreis und Abfahrtsziel in einem gemeinsamen Beratungsplan.</p></div>
                <div class="mobility-badges"><span :class="['mobility-badge', status.data_mode]">{{ modeLabel }}</span><span class="mobility-badge neutral">Keine Steuerung</span></div>
            </div>

            <div v-if="status.is_demo" class="mobility-demo" role="status"><div><strong>Interaktive Premium-Demo</strong><span>Alle Fahrzeug-, Wallbox-, Preis- und Energiewerte sind realistische Mock-Daten.</span></div><strong>Mit Lizenz werden konfigurierte Sensoren und reale Prognosen verwendet.</strong></div>
            <div v-if="loading" class="mobility-state" role="status">Wallbox-Planung wird geladen …</div>
            <div v-else-if="error" class="mobility-state error" role="alert"><strong>Daten nicht verfügbar</strong><span>{{ error }}</span></div>

            <template v-else>
                <article class="mobility-card mobility-lab">
                    <header><div><span class="mobility-eyebrow">Interaktives Beratungsszenario</span><h3>Was kostet die nächste Ladung – jetzt oder geplant?</h3><p>Die Regler verändern ausschließlich diese Simulation. Es wird kein Fahrzeug und keine Wallbox geschaltet.</p></div><span class="simulation-chip">Simulation · keine Einspargarantie</span></header>
                    <div class="mobility-controls">
                        <label><span>Aktueller Ladezustand <strong>{{ currentSoc }} %</strong></span><input v-model.number="currentSoc" type="range" min="5" :max="Math.max(5, targetSoc - 1)" step="1" aria-label="Aktueller Ladezustand in Prozent"></label>
                        <label><span>Ziel zur Abfahrt <strong>{{ targetSoc }} %</strong></span><input v-model.number="targetSoc" type="range" :min="Math.min(100, currentSoc + 1)" max="100" step="1" aria-label="Ziel-Ladezustand in Prozent"></label>
                        <label><span>Nutzbare Batterie <strong>{{ batteryCapacity }} kWh</strong></span><input v-model.number="batteryCapacity" type="range" min="20" max="150" step="1" aria-label="Nutzbare Batteriekapazität in Kilowattstunden"></label>
                    </div>
                    <div class="mobility-comparison" aria-live="polite">
                        <div><span>Sofort laden</span><strong>{{ euro(plan.immediateCost) }}</strong><small>{{ plan.requiredEnergy.toFixed(1) }} kWh zum aktuellen Preis</small></div>
                        <i>→</i>
                        <div class="recommended"><span>Beratungsplan</span><strong>{{ euro(plan.advisedCost) }}</strong><small>{{ plan.pvShare }} % erwarteter PV-Anteil</small></div>
                        <div class="saving"><span>Rechnerischer Vorteil</span><strong>{{ euro(animatedSaving) }}</strong><small>für diesen simulierten Ladevorgang</small></div>
                    </div>
                </article>

                <div class="mobility-flow" aria-label="Beratender Energiefluss"><div><b>☀</b><strong>PV</strong><small>Prognose</small></div><i><span></span></i><div><b>⌂</b><strong>Haus</strong><small>Grundlast zuerst</small></div><i><span></span></i><div><b>◈</b><strong>Wärmepumpe</strong><small>Wärmebedarf</small></div><i><span></span></i><div><b>▣</b><strong>Speicher</strong><small>historische Reserve</small></div><i><span></span></i><div><b>⚡</b><strong>Wallbox</strong><small>nur echter Rest</small></div><i class="grid"><span></span></i><div><b>⇄</b><strong>Netz</strong><small>fristgerecht ergänzen</small></div></div>

                <article class="mobility-card mobility-explanation">
                    <div class="mobility-confidence" :style="insightConfidenceStyle"><div><strong>{{ recommendationInsight.confidence_percent }} %</strong><span>Vertrauen</span></div></div>
                    <div><span class="mobility-eyebrow">KEPLER erklärt die Empfehlung</span><h3>{{ recommendationInsight.headline }}</h3><p>{{ recommendationInsight.summary }}</p><ul><li v-for="item in recommendationInsight.evidence" :key="item">{{ item }}</li></ul></div>
                    <aside><span>Prognoseunsicherheit</span><strong>± {{ recommendationInsight.uncertainty_percent }} %</strong><small>PV-Anteil im Band {{ plan.pvLower.toFixed(1) }}–{{ plan.pvUpper.toFixed(1) }} kWh</small></aside>
                </article>

                <article class="mobility-card mobility-timeline-card">
                    <header><div><span class="mobility-eyebrow">24-Stunden-Plan</span><h3>Haus, Wärme, Speicher und Laden teilen sich denselben PV-Haushalt</h3></div><div class="mobility-legend"><span class="pv">PV</span><span class="house">Haus</span><span class="hp">Wärmepumpe</span><span class="battery">Speicher</span><span class="ev">Wallbox</span><span class="price">Preis</span></div></header>
                    <div class="mobility-timeline" aria-label="24-Stunden-Energie- und Preisplan"><div v-for="point in plan.hours" :key="point.timestamp" class="mobility-hour" :class="{ selected: point.wallbox > 0 }" :title="point.label + ' · ' + point.price.toFixed(1) + ' ct/kWh'"><span class="price-bar" :style="{ height: point.priceHeight + '%' }"></span><span class="pv-bar" :style="{ height: point.pvHeight + '%' }"></span><span class="house-bar" :style="{ height: point.houseHeight + '%' }"></span><span class="hp-bar" :style="{ height: point.hpHeight + '%' }"></span><span class="battery-bar" :style="{ height: point.batteryHeight + '%' }"></span><span class="ev-bar" :style="{ height: point.evHeight + '%' }"></span><small>{{ point.hour % 3 === 0 ? point.hour : '' }}</small></div></div>
                    <footer>Preisquelle: {{ tariffSource }}. STATS-Grundlast und Speicherreserve werden vor Wärmepumpen- und Wallbox-PV berücksichtigt; Einspeisung kalibriert den Überschuss und wird nicht doppelt abgezogen.</footer>
                </article>

                <div class="mobility-grid">
                    <article class="mobility-card"><span class="mobility-eyebrow">Abfahrt</span><strong>{{ departureLabel }}</strong><p>{{ plan.readiness }} % rechnerische Abfahrtsbereitschaft</p></article>
                    <article class="mobility-card"><span class="mobility-eyebrow">Empfohlenes Fenster</span><strong>{{ recommendationWindow }}</strong><p>{{ recommendationInsight.summary }}</p></article>
                    <article class="mobility-card"><span class="mobility-eyebrow">Benötigte Energie</span><strong>{{ plan.requiredEnergy.toFixed(1) }} kWh</strong><p>{{ plan.pvEnergy.toFixed(1) }} kWh davon aus dem verbleibenden PV-Überschuss</p></article>
                    <article class="mobility-card"><span class="mobility-eyebrow">Passive Signale</span><strong>Automation-ready</strong><p>EAI stellt Sensoren und Binärsensoren bereit. Deine Home-Assistant-Automation entscheidet selbst.</p></article>
                </div>

                <div class="mobility-safety" role="note"><strong>Beratung statt Steuerung</strong><span>EAI ruft keine Wallbox-Dienste auf, verändert keine Ladeleistung und startet keinen Ladevorgang. Kosten und PV-Anteil sind Modellwerte ohne Garantie.</span></div>
            </template>
        </section>`,
    setup() {
        const { ref, reactive, computed, onMounted, watch } = Vue;
        const loading = ref(true);
        const error = ref("");
        const status = reactive({ data_mode: "mock", is_demo: true });
        const mobility = reactive({ hours: [] });
        const currentSoc = ref(42);
        const targetSoc = ref(80);
        const batteryCapacity = ref(77);
        const maxPower = ref(11);
        const currentPrice = ref(36.9);
        const feedIn = ref(8.2);
        const hourlyPrices = ref(Array(24).fill(36.9));
        const tariffSource = ref("Mock-Tarifdaten");
        const animatedSaving = ref(0);
        const scenario = new URLSearchParams(window.location.search).get("eai_scenario");
        const endpoint = (section) => `/api/sfml_stats/modern/eai/${section}${scenario ? `?scenario=${encodeURIComponent(scenario)}` : ""}`;

        async function load() {
            loading.value = true;
            error.value = "";
            try {
                const [statusResponse, mobilityResponse] = await Promise.all([
                    SFMLApi.fetch(endpoint("status")),
                    SFMLApi.fetch(endpoint("mobility")),
                ]);
                const unwrap = (response) => response?.success === true ? response.data : response;
                Object.assign(status, unwrap(statusResponse));
                Object.assign(mobility, unwrap(mobilityResponse)?.data || {});
                if (mobility.control_services_called === true) throw new Error("Unsicherer Provider-Vertrag");
                currentSoc.value = Number(mobility.current_soc_percent ?? 42);
                targetSoc.value = Number(mobility.target_soc_percent ?? 80);
                batteryCapacity.value = Number(mobility.battery_capacity_kwh ?? 77);
                maxPower.value = Number(mobility.max_charging_power_kw ?? 11);
                currentPrice.value = Number(mobility.electricity_price_ct_per_kwh ?? 36.9);
                feedIn.value = Number(mobility.feed_in_tariff_ct_per_kwh ?? 8.2);
                const embedded = (mobility.hours || []).map((point) => Number(point.price_ct_per_kwh));
                if (embedded.length && embedded.every(Number.isFinite)) hourlyPrices.value = embedded;
                if (!status.is_demo) await loadStatsTariff();
            } catch (err) {
                error.value = err?.message || "Provider nicht erreichbar";
            } finally {
                loading.value = false;
            }
        }

        async function loadStatsTariff() {
            const [billingResult, settingsResult, pricesResult] = await Promise.allSettled([
                SFMLApi.fetch("/api/sfml_stats/billing"),
                SFMLApi.fetch("/api/sfml_stats/settings/dashboard"),
                SFMLApi.fetch("/api/sfml_stats/gpm_prices"),
            ]);
            const billing = billingResult.status === "fulfilled" ? billingResult.value : {};
            const settings = settingsResult.status === "fulfilled" ? settingsResult.value : {};
            const prices = pricesResult.status === "fulfilled" ? pricesResult.value : {};
            const configured = Number(settings?.price?.energy_price) + Number(settings?.price?.grid_fees);
            const candidate = [billing?.finance?.avg_price_ct, configured, prices?.total_price].map(Number).find((value) => Number.isFinite(value) && value > 0);
            if (candidate) currentPrice.value = candidate;
            const tariff = Number(settings?.price?.feed_in_tariff ?? billing?.finance?.feed_in_tariff_ct);
            if (Number.isFinite(tariff) && tariff >= 0) feedIn.value = tariff;
            const pricePoints = (prices?.price_hours || []).filter((point) => !point.is_tomorrow && Number.isFinite(Number(point.total_price)));
            if (pricePoints.length) {
                const byHour = new Map(pricePoints.map((point) => [Number(point.hour), Number(point.total_price)]));
                hourlyPrices.value = Array.from({ length: 24 }, (_, hour) => byHour.get(hour) ?? currentPrice.value);
            } else hourlyPrices.value = Array(24).fill(currentPrice.value);
            tariffSource.value = billing?.finance?.avg_price_ct ? "gewichteter STATS-Abrechnungspreis und Stundenpreise" : "konfigurierter STATS-Tarif und Stundenpreise";
        }

        const modeLabel = computed(() => ({ mock: "Premium-Demo", onboarding: "Lernphase", live: "Live", degraded: "Eingeschränkt" }[status.data_mode] || "Vorschau"));
        const sourceHours = computed(() => {
            const values = Array.isArray(mobility.hours) ? mobility.hours.slice(0, 24) : [];
            if (values.length) return values;
            return Array.from({ length: 24 }, (_, hour) => { const pv = Math.max(0, Math.sin((hour - 6) * Math.PI / 12) * 5); const house = 0.5; const hp = 1.4; const battery = 0.3; const residual = Math.max(0, pv - house - hp - battery); return { timestamp: new Date(Date.now() + hour * 3600000).toISOString(), pv_forecast_kwh: pv, household_base_load_kwh: house, heat_pump_kwh: hp, battery_pv_reserved_kwh: battery, residual_pv_kwh: residual, residual_pv_lower_kwh: Math.max(0, residual - 0.35), residual_pv_upper_kwh: residual + 0.35, forecast_confidence_percent: 78, forecast_uncertainty_percent: 22 }; });
        });
        const plan = computed(() => {
            const requiredEnergy = Math.max(0, batteryCapacity.value * (targetSoc.value - currentSoc.value) / 100);
            const hours = sourceHours.value.map((point, index) => {
                const timestamp = new Date(point.timestamp);
                const hour = timestamp.getHours();
                const pv = Number(point.pv_forecast_kwh || 0);
                const hp = Number(point.heat_pump_kwh ?? point.forecast_kw ?? 0);
                const house = Number(point.household_base_load_kwh || 0);
                const battery = Number(point.battery_pv_reserved_kwh || 0);
                const residual = Math.max(0, Number(point.residual_pv_kwh ?? point.wallbox_pv_available_kwh ?? pv - house - hp - battery));
                const residualLower = Math.max(0, Number(point.residual_pv_lower_kwh ?? residual));
                const residualUpper = Math.max(residualLower, Number(point.residual_pv_upper_kwh ?? residual));
                return { timestamp: point.timestamp, hour, label: timestamp.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }), pv, house, hp, battery, residual, residualLower, residualUpper, confidence: Number(point.forecast_confidence_percent ?? 70), uncertainty: Number(point.forecast_uncertainty_percent ?? 30), price: Number(hourlyPrices.value[hour] ?? currentPrice.value), wallbox: 0, pvWallbox: 0, gridWallbox: 0, index };
            });
            let remaining = requiredEnergy;
            [...hours].sort((a, b) => b.residual - a.residual || a.price - b.price).forEach((point) => {
                if (remaining <= 0) return;
                const energy = Math.min(remaining, maxPower.value, point.residual);
                point.wallbox += energy; point.pvWallbox += energy; remaining -= energy;
            });
            [...hours].sort((a, b) => a.price - b.price || a.index - b.index).forEach((point) => {
                if (remaining <= 0) return;
                const energy = Math.min(remaining, Math.max(0, maxPower.value - point.wallbox));
                point.wallbox += energy; point.gridWallbox += energy; remaining -= energy;
            });
            const maxEnergy = Math.max(...hours.flatMap((point) => [point.pv, point.house, point.hp, point.battery, point.wallbox]), 1);
            const maxPriceValue = Math.max(...hours.map((point) => point.price), 1);
            hours.forEach((point) => {
                point.pvHeight = Math.round(point.pv / maxEnergy * 100);
                point.houseHeight = Math.round(point.house / maxEnergy * 100);
                point.hpHeight = Math.round(point.hp / maxEnergy * 100);
                point.batteryHeight = Math.round(point.battery / maxEnergy * 100);
                point.evHeight = Math.round(point.wallbox / maxEnergy * 100);
                point.priceHeight = Math.round(point.price / maxPriceValue * 100);
            });
            const planned = hours.reduce((sum, point) => sum + point.wallbox, 0);
            const pvEnergy = hours.reduce((sum, point) => sum + point.pvWallbox, 0);
            const pvLower = hours.reduce((sum, point) => sum + Math.min(point.pvWallbox, point.residualLower), 0);
            const pvUpper = hours.reduce((sum, point) => sum + Math.min(point.wallbox, point.residualUpper), 0);
            const advisedCost = hours.reduce((sum, point) => sum + point.gridWallbox * point.price / 100 + point.pvWallbox * feedIn.value / 100, 0);
            const immediateCost = requiredEnergy * currentPrice.value / 100;
            const selected = hours.filter((point) => point.wallbox > 0.01);
            const confidence = selected.length ? Math.round(selected.reduce((sum, point) => sum + point.confidence, 0) / selected.length) : 0;
            const uncertainty = selected.length ? Math.round(selected.reduce((sum, point) => sum + point.uncertainty, 0) / selected.length) : 100;
            return { hours, requiredEnergy, pvEnergy, pvLower, pvUpper, pvShare: planned ? Math.round(pvEnergy / planned * 100) : 0, immediateCost, advisedCost, saving: Math.max(0, immediateCost - advisedCost), readiness: requiredEnergy ? Math.min(100, Math.round(planned / requiredEnergy * 100)) : 100, confidence, uncertainty, start: selected[0]?.timestamp, end: selected.at(-1)?.timestamp };
        });
        let animation = null;
        watch(() => plan.value.saving, (target) => {
            if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { animatedSaving.value = target; return; }
            if (animation) cancelAnimationFrame(animation);
            const start = animatedSaving.value;
            const started = performance.now();
            const tick = (now) => { const progress = Math.min(1, (now - started) / 420); animatedSaving.value = start + (target - start) * (1 - Math.pow(1 - progress, 3)); if (progress < 1) animation = requestAnimationFrame(tick); };
            animation = requestAnimationFrame(tick);
        }, { immediate: true });
        const euro = (value) => `${Number(value || 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
        const departureLabel = computed(() => mobility.departure_time ? new Date(mobility.departure_time).toLocaleString("de-DE", { weekday: "short", hour: "2-digit", minute: "2-digit" }) : "Wird ermittelt");
        const recommendationWindow = computed(() => plan.value.start ? `${new Date(plan.value.start).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}–${new Date(plan.value.end).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr` : "Kein Laden nötig");
        const recommendationInsight = computed(() => {
            const provider = mobility.recommendation_explanation;
            if (!status.is_demo && provider?.headline) return provider;
            const usesPv = plan.value.pvShare > 0;
            return {
                headline: usesPv ? "Auf das stärkste Rest-PV-Fenster warten" : "Preisorientiert bis zur Abfahrt laden",
                summary: usesPv ? "Haus, Wärmepumpe und Speicher werden zuerst versorgt; nur der verbleibende PV-Anteil wird der Wallbox zugeordnet." : "Ohne belastbaren PV-Überschuss verteilt KEPLER den Ladebedarf auf die günstigsten Stunden bis zur Abfahrt.",
                evidence: [
                    `${plan.value.requiredEnergy.toFixed(1)} kWh Ladebedarf bis zur Abfahrt`,
                    `${plan.value.pvEnergy.toFixed(1)} kWh erwarteter PV-Anteil`,
                    `${plan.value.readiness} % rechnerische Abfahrtsbereitschaft`,
                ],
                confidence_percent: Number(status.is_demo ? plan.value.confidence : mobility.recommendation_confidence_percent ?? plan.value.confidence),
                uncertainty_percent: Number(status.is_demo ? plan.value.uncertainty : mobility.forecast_uncertainty_percent ?? plan.value.uncertainty),
            };
        });
        const insightConfidenceStyle = computed(() => ({ background: `conic-gradient(#6f8cff ${Math.min(100, Math.max(0, recommendationInsight.value.confidence_percent))}%, color-mix(in srgb, #6f8cff 12%, var(--bg-elevated)) 0)` }));
        onMounted(load);
        return { loading, error, status, mobility, currentSoc, targetSoc, batteryCapacity, modeLabel, plan, animatedSaving, tariffSource, departureLabel, recommendationWindow, recommendationInsight, insightConfidenceStyle, euro };
    },
};

window.ModernMobilityPage = ModernMobilityPage;
