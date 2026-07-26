const MOBILITY_ALLOCATION = typeof module !== "undefined"
    ? require("./allocation.js")
    : window.SFMLAllocation;

const normalizeMobilityHour = MOBILITY_ALLOCATION.assessAllocationInterval;

const ModernMobilityPage = {
    components: { AllocationWaterfall: MOBILITY_ALLOCATION.AllocationWaterfall },
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
                    <div class="mobility-demand-modes" role="group" aria-label="Quelle des Ladebedarfs">
                        <button type="button" :class="{ active: demandMode === 'soc' }" :aria-pressed="demandMode === 'soc' ? 'true' : 'false'" @click="demandMode = 'soc'">Ladestand bekannt</button>
                        <button type="button" :class="{ active: demandMode === 'energy' }" :aria-pressed="demandMode === 'energy' ? 'true' : 'false'" @click="demandMode = 'energy'">Ladeenergie angeben</button>
                        <button type="button" :class="{ active: demandMode === 'distance' }" :aria-pressed="demandMode === 'distance' ? 'true' : 'false'" @click="demandMode = 'distance'">Fahrt planen</button>
                    </div>
                    <div class="mobility-controls">
                        <label v-if="demandMode === 'soc'"><span>Aktueller Ladezustand <strong>{{ currentSoc }} %</strong></span><input v-model.number="currentSoc" type="range" min="5" :max="Math.max(5, targetSoc - 1)" step="1" aria-label="Aktueller Ladezustand in Prozent"></label>
                        <label v-if="demandMode === 'soc'"><span>Ziel zur Abfahrt <strong>{{ targetSoc }} %</strong></span><input v-model.number="targetSoc" type="range" :min="Math.min(100, currentSoc + 1)" max="100" step="1" aria-label="Ziel-Ladezustand in Prozent"></label>
                        <label v-if="demandMode === 'soc'"><span>Nutzbare Batterie <strong>{{ batteryCapacity }} kWh</strong></span><input v-model.number="batteryCapacity" type="range" min="20" max="150" step="1" aria-label="Nutzbare Batteriekapazität in Kilowattstunden"></label>
                        <label v-if="demandMode === 'energy'"><span>Gewünschte Zusatzenergie <strong>{{ requestedEnergy }} kWh</strong></span><input v-model.number="requestedEnergy" type="range" min="1" max="100" step="1" aria-label="Gewünschte zusätzliche Batterieenergie in Kilowattstunden"></label>
                        <label v-if="demandMode === 'distance'"><span>Geplante Strecke <strong>{{ plannedDistance }} km</strong></span><input v-model.number="plannedDistance" type="range" min="10" max="600" step="10" aria-label="Geplante Strecke in Kilometern"></label>
                        <label v-if="demandMode === 'distance'"><span>Fahrzeugverbrauch <strong>{{ consumption }} kWh/100 km</strong></span><input v-model.number="consumption" type="range" min="10" max="35" step="0.1" aria-label="Fahrzeugverbrauch in Kilowattstunden je 100 Kilometer"></label>
                        <label><span>Ladeeffizienz <strong>{{ chargingEfficiency }} %</strong></span><input v-model.number="chargingEfficiency" type="range" min="70" max="100" step="1" aria-label="Ladeeffizienz in Prozent"></label>
                    </div>
                    <div class="mobility-comparison" aria-live="polite">
                        <div><span>Sofort laden</span><strong>{{ plan.available ? euro(plan.immediateCost) : "Nicht verfügbar" }}</strong><small>{{ plan.available ? number(plan.requiredEnergy) + " kWh Netzenergie zum aktuellen Preis" : "Providerdaten nicht belastbar" }}</small></div>
                        <i>→</i>
                        <div class="recommended"><span>Beratungsplan</span><strong>{{ plan.available ? euro(plan.advisedCost) : "Nicht verfügbar" }}</strong><small>{{ plan.available ? plan.pvShare + " % erwarteter PV-Anteil" : "PV-Allokation nicht belastbar" }}</small></div>
                        <div class="saving"><span>Rechnerischer Vorteil</span><strong>{{ plan.available ? euro(animatedSaving) : "Nicht verfügbar" }}</strong><small>{{ plan.available ? "für diesen simulierten Ladevorgang" : "keine belastbare Kostenrechnung" }}</small></div>
                    </div>
                    <p v-if="!plan.providerHoursAvailable" class="mobility-state" role="status">Providerstunden fehlen. Es wird kein Ladefenster und kein Rest-PV erzeugt.</p>
                    <p v-else-if="!plan.available" class="mobility-state" role="status">Mindestens eine Providerstunde ist unvollständig oder ungültig. Planung, Rest-PV und Ergebniswerte sind nicht verfügbar.</p>
                </article>

                <allocation-waterfall :model="mobilityBudget"></allocation-waterfall>

                <article class="mobility-card mobility-explanation">
                    <div class="mobility-confidence" :style="insightConfidenceStyle"><div><strong>{{ plan.available ? recommendationInsight.confidence_percent + " %" : "Nicht verfügbar" }}</strong><span>Vertrauen</span></div></div>
                    <div><span class="mobility-eyebrow">Frontend-Simulation erklärt den Plan</span><h3>{{ recommendationInsight.headline }}</h3><p>{{ recommendationInsight.summary }}</p><ul><li v-for="item in recommendationInsight.evidence" :key="item">{{ item }}</li></ul></div>
                    <aside><span>Prognoseunsicherheit</span><strong>{{ plan.available ? "± " + number(recommendationInsight.uncertainty_percent, 0) + " %" : "Nicht verfügbar" }}</strong><small>{{ plan.available ? "PV-Anteil im Band " + number(plan.pvLower) + "–" + number(plan.pvUpper) + " kWh" : "Kein belastbares Prognoseband" }}</small></aside>
                </article>

                <article class="mobility-card mobility-timeline-card">
                    <header><div><span class="mobility-eyebrow">Providerbestätigte Planungsintervalle</span><h3>Haus, Wärme, Reserve und Laden teilen sich denselben PV-Haushalt</h3></div><div class="mobility-legend"><span class="pv">PV</span><span class="house">Haus</span><span class="hp">Wärmepumpe</span><span class="battery">Reserve</span><span class="ev">Wallbox</span><span class="price">Preis</span></div></header>
                    <div class="mobility-timeline" :style="{ gridTemplateColumns: timelineColumns }" aria-label="Energie- und Preisplan aus bestätigten Intervallen"><div v-for="point in plan.hours" :key="point.timestamp" class="mobility-hour" :class="{ selected: point.wallbox > 0 }" tabindex="0" role="img" :title="mobilityPointLabel(point)" :aria-label="mobilityPointLabel(point)"><span class="price-bar" :style="{ height: point.priceHeight + '%' }"></span><span class="pv-bar" :style="{ height: point.pvHeight + '%' }"></span><span class="house-bar" :style="{ height: point.houseHeight + '%' }"></span><span class="hp-bar" :style="{ height: point.hpHeight + '%' }"></span><span class="battery-bar" :style="{ height: point.batteryHeight + '%' }"></span><span class="ev-bar" :style="{ height: point.evHeight + '%' }"></span><small>{{ point.label }}</small></div></div>
                    <footer>Preisquelle: {{ tariffSource }}. Hausbedarf, Wärmepumpe, Speicherreserve und Kalibrierungsreserve werden in dieser Reihenfolge vor der Wallbox-Freigabe berücksichtigt.</footer>
                </article>

                <div class="mobility-grid">
                    <article class="mobility-card"><span class="mobility-eyebrow">Abfahrt</span><strong>{{ departureLabel }}</strong><p>{{ plan.available ? plan.readiness + " % rechnerische Abfahrtsbereitschaft" : "Abfahrtsbereitschaft nicht verfügbar" }}</p></article>
                    <article class="mobility-card"><span class="mobility-eyebrow">Empfohlenes Fenster</span><strong>{{ recommendationWindow }}</strong><p>{{ recommendationInsight.summary }}</p></article>
                    <article class="mobility-card"><span class="mobility-eyebrow">Ladebedarf</span><strong>{{ number(plan.requiredEnergy) }} kWh</strong><p>Wallbox-Energie inklusive Ladeverlusten · Frontend-Simulation</p></article>
                    <article class="mobility-card"><span class="mobility-eyebrow">PV-Anteil</span><strong>{{ plan.available ? number(plan.pvEnergy) + " kWh" : "Nicht verfügbar" }}</strong><p>{{ plan.available ? plan.pvShare + " % des simulierten Ladebedarfs" : "Keine belastbare Provider-Allokation" }}</p></article>
                    <article class="mobility-card"><span class="mobility-eyebrow">Netzanteil</span><strong>{{ plan.available ? number(plan.gridEnergy) + " kWh" : "Nicht verfügbar" }}</strong><p>{{ plan.available ? "Ergänzung bis zum Ziel · Frontend-Simulation" : "Keine belastbare Stundenplanung" }}</p></article>
                    <article class="mobility-card"><span class="mobility-eyebrow">Ziel und Zeitraum</span><strong>{{ departureLabel }}</strong><p>{{ recommendationWindow }}</p></article>
                    <article class="mobility-card"><span class="mobility-eyebrow">Kosten geplant</span><strong>{{ plan.available ? euro(plan.advisedCost) : "Nicht verfügbar" }}</strong><p>{{ plan.available ? "PV mit entgangener Einspeisevergütung, Netz mit Stundenpreis" : "Keine belastbare Kostenrechnung" }}</p></article>
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
        const demandMode = ref("distance");
        const currentSoc = ref(42);
        const targetSoc = ref(80);
        const batteryCapacity = ref(77);
        const requestedEnergy = ref(30);
        const plannedDistance = ref(160);
        const consumption = ref(18.3);
        const chargingEfficiency = ref(90);
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
                demandMode.value = ["soc", "energy", "distance"].includes(mobility.demand_source) ? mobility.demand_source : (mobility.current_soc_percent != null ? "soc" : "energy");
                requestedEnergy.value = Number(mobility.requested_energy_kwh ?? mobility.battery_energy_demand_kwh ?? 30);
                plannedDistance.value = Number(mobility.planned_distance_km ?? 160);
                consumption.value = Number(mobility.consumption_kwh_per_100km ?? 18.3);
                chargingEfficiency.value = Number(mobility.charging_efficiency_percent ?? 90);
                maxPower.value = Number(mobility.max_charging_power_kw ?? 11);
                currentPrice.value = Number(mobility.electricity_price_ct_per_kwh ?? 36.9);
                feedIn.value = Number(mobility.feed_in_tariff_ct_per_kwh ?? 8.2);
                const embedded = (mobility.hours || []).map((point) => Number(point.price_ct_per_kwh));
                if (embedded.length && embedded.every(Number.isFinite)) hourlyPrices.value = embedded;
                if (!status.is_demo) await loadStatsTariff();
            } catch {
                error.value = "Die Wallbox-Planung konnte nicht geladen werden. Technische Details stehen im Home-Assistant-Protokoll.";
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
            return Array.isArray(mobility.hours) ? mobility.hours : [];
        });
        const plan = computed(() => {
            const planningWindow = MOBILITY_ALLOCATION.planningWindowOptions(mobility);
            const providerAllocation = planningWindow
                ? MOBILITY_ALLOCATION.aggregateAllocationIntervals(
                    sourceHours.value,
                    planningWindow,
                )
                : null;
            const batteryEnergy = demandMode.value === "soc"
                ? Math.max(0, batteryCapacity.value * (targetSoc.value - currentSoc.value) / 100)
                : demandMode.value === "distance"
                    ? Math.max(0, plannedDistance.value * consumption.value / 100)
                    : Math.max(0, requestedEnergy.value);
            const requiredEnergy = batteryEnergy / Math.max(0.5, chargingEfficiency.value / 100);
            const departureMs = mobility.departure_time ? new Date(mobility.departure_time).getTime() : Number.POSITIVE_INFINITY;
            const hours = sourceHours.value.map((point, index) => {
                const timestamp = new Date(point.timestamp);
                const normalized = normalizeMobilityHour(point);
                const hour = timestamp.getHours();
                const pv = normalized.values.pv;
                const hp = normalized.values.heatPumpDemand;
                const house = normalized.values.houseDemand;
                const battery = normalized.values.batteryReserve + normalized.values.calibrationReserve;
                const confidence = Number(point.forecast_confidence_percent);
                const uncertainty = Number(point.forecast_uncertainty_percent);
                const price = Number(point.price_ct_per_kwh ?? hourlyPrices.value[hour] ?? currentPrice.value);
                const pointValid = normalized.valid
                    && [pv, hp, house, battery, confidence, uncertainty, price].every(Number.isFinite);
                return {
                    source: point,
                    timestamp: point.timestamp,
                    hour,
                    label: Number.isFinite(timestamp.getTime()) ? timestamp.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "Zeitpunkt nicht verfügbar",
                    pv,
                    house,
                    hp,
                    battery,
                    residual: normalized.values.wallboxBudget,
                    residualLower: normalized.residualLower,
                    residualUpper: normalized.residualUpper,
                    intervalHours: normalized.intervalHours,
                    availableHours: normalized.availableHours,
                    intervalEndMs: normalized.intervalEndMs,
                    pointValid,
                    confidence,
                    uncertainty,
                    price,
                    beforeDeparture: normalized.intervalEndMs <= departureMs,
                    wallbox: 0,
                    pvWallbox: 0,
                    gridWallbox: 0,
                    index,
                };
            });
            const providerHoursAvailable = hours.length > 0;
            const sequenceValid = providerAllocation !== null;
            const available = providerHoursAvailable
                && sequenceValid
                && hours.every((point) => point.pointValid);
            let remaining = requiredEnergy;
            if (available) [...hours].sort((a, b) => b.residual - a.residual || a.price - b.price).forEach((point) => {
                if (remaining <= 0) return;
                if (!point.beforeDeparture) return;
                const energy = Math.min(remaining, maxPower.value * point.availableHours, point.residual);
                point.wallbox += energy; point.pvWallbox += energy; remaining -= energy;
            });
            if (available) [...hours].sort((a, b) => a.price - b.price || a.index - b.index).forEach((point) => {
                if (remaining <= 0) return;
                if (!point.beforeDeparture) return;
                const energy = Math.min(remaining, Math.max(0, maxPower.value * point.availableHours - point.wallbox));
                point.wallbox += energy; point.gridWallbox += energy; remaining -= energy;
            });
            const maxEnergy = available ? Math.max(...hours.flatMap((point) => [point.pv, point.house, point.hp, point.battery, point.wallbox]), 1) : 1;
            const maxPriceValue = available ? Math.max(...hours.map((point) => point.price), 1) : 1;
            hours.forEach((point) => {
                point.pvHeight = available ? Math.round(point.pv / maxEnergy * 100) : 0;
                point.houseHeight = available ? Math.round(point.house / maxEnergy * 100) : 0;
                point.hpHeight = available ? Math.round(point.hp / maxEnergy * 100) : 0;
                point.batteryHeight = available ? Math.round(point.battery / maxEnergy * 100) : 0;
                point.evHeight = available ? Math.round(point.wallbox / maxEnergy * 100) : 0;
                point.priceHeight = available ? Math.round(point.price / maxPriceValue * 100) : 0;
            });
            const planned = hours.reduce((sum, point) => sum + point.wallbox, 0);
            const pvEnergy = available ? hours.reduce((sum, point) => sum + point.pvWallbox, 0) : null;
            const gridEnergy = available ? hours.reduce((sum, point) => sum + point.gridWallbox, 0) : null;
            const pvLower = available ? hours.reduce((sum, point) => sum + Math.min(point.pvWallbox, point.residualLower), 0) : null;
            const pvUpper = available ? hours.reduce((sum, point) => sum + Math.min(point.wallbox, point.residualUpper), 0) : null;
            const advisedCost = available ? hours.reduce((sum, point) => sum + point.gridWallbox * point.price / 100 + point.pvWallbox * feedIn.value / 100, 0) : null;
            const immediateCost = available ? requiredEnergy * currentPrice.value / 100 : null;
            const selected = hours.filter((point) => point.wallbox > 0.01);
            const confidence = available && selected.length ? Math.round(selected.reduce((sum, point) => sum + point.confidence, 0) / selected.length) : null;
            const selectedUncertainty = available && selected.length ? Math.round(selected.reduce((sum, point) => sum + point.uncertainty, 0) / selected.length) : null;
            const uncertainty = selectedUncertainty == null ? null : Math.max(selectedUncertainty, demandMode.value === "distance" ? 25 : demandMode.value === "energy" ? 10 : 5);
            return { hours, selected, planningWindow, providerAllocation, batteryEnergy, requiredEnergy, pvEnergy, gridEnergy, pvLower, pvUpper, pvShare: available && planned ? Math.round(pvEnergy / planned * 100) : null, immediateCost, advisedCost, saving: available ? Math.max(0, immediateCost - advisedCost) : null, readiness: available ? requiredEnergy ? Math.min(100, Math.round(planned / requiredEnergy * 100)) : 100 : null, confidence, uncertainty, start: selected[0]?.timestamp, end: selected.at(-1)?.intervalEndMs, providerHoursAvailable, sequenceValid, pvAllocationAvailable: available, available };
        });
        let animation = null;
        watch(() => plan.value.saving, (target) => {
            if (target == null) { animatedSaving.value = 0; return; }
            if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { animatedSaving.value = target; return; }
            if (animation) cancelAnimationFrame(animation);
            const start = animatedSaving.value;
            const started = performance.now();
            const tick = (now) => { const progress = Math.min(1, (now - started) / 420); animatedSaving.value = start + (target - start) * (1 - Math.pow(1 - progress, 3)); if (progress < 1) animation = requestAnimationFrame(tick); };
            animation = requestAnimationFrame(tick);
        }, { immediate: true });
        const number = (value, maximumFractionDigits = 1) => {
            if (value === null || value === undefined || !Number.isFinite(Number(value))) {
                return "Nicht verfügbar";
            }
            return new Intl.NumberFormat("de-DE", {
                minimumFractionDigits: maximumFractionDigits,
                maximumFractionDigits,
            }).format(Number(value));
        };
        const euro = (value) => `${number(value, 2)} €`;
        const departureLabel = computed(() => mobility.departure_time ? new Date(mobility.departure_time).toLocaleString("de-DE", { weekday: "short", hour: "2-digit", minute: "2-digit" }) : "Wird ermittelt");
        const recommendationWindow = computed(() => !plan.value.available ? "Nicht verfügbar" : plan.value.start ? `${new Date(plan.value.start).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}–${new Date(plan.value.end).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr` : plan.value.requiredEnergy > 0 ? "Kein belastbares Zeitfenster" : "Kein Laden nötig");
        const recommendationInsight = computed(() => {
            if (!plan.value.providerHoursAvailable) return { headline: "Planung nicht verfügbar", summary: "Der Provider liefert keine Stunden für den Planungszeitraum. Es wird weder Rest-PV noch ein Ladefenster erzeugt.", evidence: ["Providerstunden fehlen", `${number(plan.value.requiredEnergy)} kWh Ladebedarf berechnet`], confidence_percent: null, uncertainty_percent: null };
            if (!plan.value.available) return { headline: "PV-Empfehlung nicht verfügbar", summary: "Mindestens eine Providerstunde bestätigt keine vollständige, gültige PV-Allokation. Rest-PV wird nicht aus PV, Haus, Wärmepumpe und Speicher rekonstruiert.", evidence: ["Stündlicher Allokationsvertrag unvollständig", `${number(plan.value.requiredEnergy)} kWh Ladebedarf berechnet`], confidence_percent: null, uncertainty_percent: null };
            const usesPv = plan.value.pvShare > 0;
            return {
                headline: usesPv ? "Auf das stärkste Rest-PV-Fenster warten" : "Preisorientiert bis zur Abfahrt laden",
                summary: usesPv ? "Haus, Wärmepumpe und Speicher werden zuerst versorgt; nur der verbleibende PV-Anteil wird der Wallbox zugeordnet." : "Ohne belastbaren PV-Überschuss verteilt KEPLER den Ladebedarf auf die günstigsten Stunden bis zur Abfahrt.",
                evidence: [
                    `${number(plan.value.requiredEnergy)} kWh Ladebedarf bis zur Abfahrt`,
                    demandMode.value === "soc" ? `Aus ${currentSoc.value} % auf ${targetSoc.value} % Fahrzeug-Ladestand berechnet` : demandMode.value === "energy" ? `${number(requestedEnergy.value)} kWh gewünschte Batterieenergie` : `${number(plannedDistance.value, 0)} km mit ${number(consumption.value)} kWh/100 km geplant`,
                    `${chargingEfficiency.value} % Ladeeffizienz berücksichtigt`,
                    `${number(plan.value.pvEnergy)} kWh erwarteter PV-Anteil`,
                    `${plan.value.readiness} % rechnerische Abfahrtsbereitschaft`,
                ],
                confidence_percent: Number(status.is_demo ? plan.value.confidence : mobility.recommendation_confidence_percent ?? plan.value.confidence),
                uncertainty_percent: Number(status.is_demo ? plan.value.uncertainty : mobility.forecast_uncertainty_percent ?? plan.value.uncertainty),
            };
        });
        const mobilityBudget = computed(() => {
            const allocation = plan.value.available ? plan.value.providerAllocation : null;
            const allocationPeriod = allocation
                ? `${new Date(allocation.forecast_interval_start).toLocaleString("de-DE", { weekday: "short", hour: "2-digit", minute: "2-digit" })}–${new Date(allocation.forecast_interval_end).toLocaleString("de-DE", { weekday: "short", hour: "2-digit", minute: "2-digit" })}`
                : "Nicht verfügbar";
            return MOBILITY_ALLOCATION.createAllocationViewModel(allocation || {}, {
                period: allocationPeriod,
                expectedHours: allocation ? plan.value.planningWindow.expectedHours : null,
                message: "Die Wallbox-Planung verwendet ausschließlich vollständige, providerbestätigte Intervalle.",
                wallboxDemandKwh: allocation ? plan.value.pvEnergy + plan.value.gridEnergy : null,
                wallboxPvKwh: allocation ? plan.value.pvEnergy : null,
                wallboxGridKwh: allocation ? plan.value.gridEnergy : null,
            });
        });
        const timelineColumns = computed(() => `repeat(${Math.max(1, plan.value.hours.length)}, minmax(38px, 1fr))`);
        const insightConfidenceStyle = computed(() => ({ background: `conic-gradient(#6f8cff ${Math.min(100, Math.max(0, recommendationInsight.value.confidence_percent))}%, color-mix(in srgb, #6f8cff 12%, var(--bg-elevated)) 0)` }));
        const mobilityPointLabel = (point) => !plan.value.available
            ? `${point.label}, Stundenwerte nicht verfügbar`
            : `${point.label}, Strompreis ${point.price.toFixed(1)} Cent pro Kilowattstunde, PV ${number(point.pv)} Kilowattstunden, Haus ${number(point.house)} Kilowattstunden, Wärmepumpe ${number(point.hp)} Kilowattstunden, Speicherreserve ${number(point.battery)} Kilowattstunden, Wallbox ${number(point.wallbox)} Kilowattstunden, davon PV ${number(point.pvWallbox)} Kilowattstunden, verfügbare Ladezeit ${number(point.availableHours, 2)} Stunden`;
        onMounted(load);
        return { loading, error, status, mobility, demandMode, currentSoc, targetSoc, batteryCapacity, requestedEnergy, plannedDistance, consumption, chargingEfficiency, modeLabel, plan, mobilityBudget, timelineColumns, animatedSaving, tariffSource, departureLabel, recommendationWindow, recommendationInsight, insightConfidenceStyle, mobilityPointLabel, number, euro };
    },
};

if (typeof window !== "undefined") window.ModernMobilityPage = ModernMobilityPage;
if (typeof module !== "undefined") module.exports = { normalizeMobilityHour };
