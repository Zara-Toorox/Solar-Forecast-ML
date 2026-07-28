const MOBILITY_ALLOCATION = typeof module !== "undefined"
    ? require("./allocation.js")
    : window.SFMLAllocation;

const normalizeMobilityHour = MOBILITY_ALLOCATION.assessAllocationInterval;

const finiteNumber = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const providerRecommendationInsight = (mobility = {}) => {
    const action = String(mobility.recommended_action || "");
    const reason = String(mobility.recommendation_reason || mobility.reason || "");
    const copy = action === "connect"
        ? ["Fahrzeug jetzt verbinden", "Das Fahrzeug muss verbunden sein, damit das Abfahrtsziel erreichbar bleibt."]
        : action === "complete"
            ? ["Ladeziel bereits erreicht", "Bis zur Abfahrt ist kein zusätzlicher Ladevorgang erforderlich."]
            : action === "charge" && reason === "pv_surplus"
                ? ["Jetzt verbleibenden PV-Überschuss nutzen", "Der Provider hat ein aktuelles PV-Ladefenster bestätigt."]
                : action === "charge" && reason === "low_price"
                    ? ["Jetzt im günstigen Tarifzeitfenster laden", "Der Provider hat ein aktuelles Niedrigpreisfenster bestätigt."]
                    : action === "charge"
                        ? ["Jetzt laden", "Der Provider empfiehlt, den Ladevorgang für das Abfahrtsziel jetzt einzuplanen."]
                        : action === "defer"
                            ? ["Auf das bestätigte Ladefenster warten", reason === "pv_window_upcoming" ? "Der Provider erwartet ein späteres PV-Ladefenster." : "Der Provider hat ein späteres Ladefenster vorgesehen."]
                            : ["Planung nicht verfügbar", "Der Provider hat keinen belastbaren Ladeplan freigegeben."];
    return {
        headline: copy[0],
        summary: copy[1],
        evidence: [],
        confidence_percent: finiteNumber(mobility.recommendation_confidence_percent),
        uncertainty_percent: finiteNumber(mobility.forecast_uncertainty_percent),
    };
};

const assessMobilityPlanState = (
    mobility,
    {
        providerHoursAvailable,
        sequenceValid,
        demandValid,
        providerAllocationAvailable,
        pvContextValid,
    },
) => {
    const available = mobility.available === true
        && providerHoursAvailable
        && sequenceValid
        && demandValid
        && mobility.planning_window_complete === true;
    return {
        available,
        pvAllocationAvailable: available
            && mobility.allocation_valid === true
            && providerAllocationAvailable
            && pvContextValid,
    };
};

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
            <div v-else-if="mobility.locked" class="mobility-state" role="status"><strong>Premium-Funktion nicht freigeschaltet</strong><span>Für die Wallbox-Planung wird {{ entitlementLabel }} benötigt.</span></div>
            <div v-else-if="contractIncompatible" class="mobility-state error" role="alert"><strong>Provider-Vertrag nicht kompatibel</strong><span>Die installierte EAI-Version liefert nicht den benötigten Mobility-Vertrag. Live-Werte und Planungsdaten können nicht sicher zugeordnet werden.</span></div>

            <template v-else>
                <div class="mobility-grid">
                    <article class="mobility-card"><span class="mobility-eyebrow">Wallbox-Leistung</span><strong>{{ mobility.current_power_kw == null ? "Nicht verfügbar" : number(mobility.current_power_kw) + " kW" }}</strong><p>Aktuell gemessene Leistungsaufnahme.</p></article>
                    <article class="mobility-card"><span class="mobility-eyebrow">Energie heute</span><strong>{{ mobility.energy_today_kwh == null ? "Nicht verfügbar" : number(mobility.energy_today_kwh) + " kWh" }}</strong><p>Heute gemessene Wallbox-Energie.</p></article>
                    <article class="mobility-card"><span class="mobility-eyebrow">Verbindung</span><strong>{{ telemetryState.title }}</strong><p>{{ telemetryState.text }}</p></article>
                </div>
                <div v-if="providerNotice" class="mobility-state" role="status"><strong>{{ providerNotice.title }}</strong><span>{{ providerNotice.text }}</span></div>

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
                        <div><span>Sofort laden</span><strong>{{ plan.immediateCost != null ? euro(plan.immediateCost) : "Nicht verfügbar" }}</strong><small>{{ plan.available ? number(plan.requiredEnergy) + " kWh Netzenergie zum aktuellen Preis" : "Providerdaten nicht belastbar" }}</small></div>
                        <i>→</i>
                        <div class="recommended"><span>Beratungsplan</span><strong>{{ plan.advisedCost != null ? euro(plan.advisedCost) : "Nicht verfügbar" }}</strong><small>{{ plan.pvAllocationAvailable ? plan.pvShare + " % erwarteter PV-Anteil" : plan.available ? "Netzplanung ohne PV-Aussage" : "PV-Allokation nicht belastbar" }}</small></div>
                        <div class="saving"><span>Rechnerischer Vorteil</span><strong>{{ plan.saving != null ? euro(animatedSaving) : "Nicht verfügbar" }}</strong><small>{{ plan.available ? "für diesen simulierten Ladevorgang" : "keine belastbare Kostenrechnung" }}</small></div>
                    </div>
                    <p v-if="!plan.providerHoursAvailable" class="mobility-state" role="status">Providerstunden fehlen. Es wird kein Ladefenster und kein Rest-PV erzeugt.</p>
                    <p v-else-if="!plan.available" class="mobility-state" role="status">Der Provider hat die Wallbox-Planung nicht freigegeben oder der Planungszeitraum ist unvollständig.</p>
                    <p v-else-if="!plan.pvAllocationAvailable" class="mobility-state" role="status">Ladebedarf und Netzplanung sind verfügbar. Eine belastbare PV-Zuordnung fehlt; deshalb werden keine PV-Anteile oder PV-Empfehlungen ausgewiesen.</p>
                </article>

                <allocation-waterfall :model="mobilityBudget"></allocation-waterfall>

                <article class="mobility-card mobility-explanation">
                    <div class="mobility-confidence" :style="insightConfidenceStyle"><div><strong>{{ plan.available ? recommendationInsight.confidence_percent + " %" : "Nicht verfügbar" }}</strong><span>Vertrauen</span></div></div>
                    <div><span class="mobility-eyebrow">{{ status.is_demo ? "Frontend-Simulation erklärt den Plan" : "EAI-Provider erklärt die Empfehlung" }}</span><h3>{{ recommendationInsight.headline }}</h3><p>{{ recommendationInsight.summary }}</p><ul><li v-for="item in recommendationInsight.evidence" :key="item">{{ item }}</li></ul></div>
                    <aside><span>Prognoseunsicherheit</span><strong>{{ plan.pvAllocationAvailable ? "± " + number(recommendationInsight.uncertainty_percent, 0) + " %" : "Nicht verfügbar" }}</strong><small>{{ plan.pvAllocationAvailable ? "PV-Anteil im Band " + number(plan.pvLower) + "–" + number(plan.pvUpper) + " kWh" : "Kein belastbares PV-Prognoseband" }}</small></aside>
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
                    <article class="mobility-card"><span class="mobility-eyebrow">PV-Anteil</span><strong>{{ plan.pvAllocationAvailable ? number(plan.pvEnergy) + " kWh" : "Nicht verfügbar" }}</strong><p>{{ plan.pvAllocationAvailable ? plan.pvShare + " % des simulierten Ladebedarfs" : "Keine belastbare Provider-Allokation" }}</p></article>
                    <article class="mobility-card"><span class="mobility-eyebrow">Netzanteil</span><strong>{{ plan.available ? number(plan.gridEnergy) + " kWh" : "Nicht verfügbar" }}</strong><p>{{ plan.available ? "Ergänzung bis zum Ziel · Frontend-Simulation" : "Keine belastbare Stundenplanung" }}</p></article>
                    <article class="mobility-card"><span class="mobility-eyebrow">Ziel und Zeitraum</span><strong>{{ departureLabel }}</strong><p>{{ recommendationWindow }}</p></article>
                    <article class="mobility-card"><span class="mobility-eyebrow">Kosten geplant</span><strong>{{ plan.advisedCost != null ? euro(plan.advisedCost) : "Nicht verfügbar" }}</strong><p>{{ plan.pvAllocationAvailable ? "PV mit entgangener Einspeisevergütung, Netz mit Stundenpreis" : plan.available ? "Netzplanung mit Stundenpreisen; ohne PV-Anrechnung" : "Keine belastbare Kostenrechnung" }}</p></article>
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
                const demo = status.is_demo === true;
                const valueOrDemo = (value, fallback) => finiteNumber(value) ?? (demo ? fallback : null);
                currentSoc.value = valueOrDemo(mobility.current_soc_percent, 42);
                targetSoc.value = valueOrDemo(mobility.target_soc_percent, 80);
                batteryCapacity.value = valueOrDemo(mobility.battery_capacity_kwh, 77);
                demandMode.value = ["soc", "energy", "distance"].includes(mobility.demand_source)
                    ? mobility.demand_source
                    : demo
                        ? "distance"
                        : null;
                requestedEnergy.value = valueOrDemo(
                    mobility.requested_energy_kwh
                    ?? mobility.battery_energy_demand_kwh,
                    30,
                );
                plannedDistance.value = valueOrDemo(mobility.planned_distance_km, 160);
                consumption.value = valueOrDemo(mobility.consumption_kwh_per_100km, 18.3);
                chargingEfficiency.value = valueOrDemo(mobility.charging_efficiency_percent, 90);
                maxPower.value = valueOrDemo(mobility.max_charging_power_kw, 11);
                currentPrice.value = valueOrDemo(mobility.electricity_price_ct_per_kwh, 36.9);
                feedIn.value = valueOrDemo(mobility.feed_in_tariff_ct_per_kwh, 8.2);
                const embedded = (mobility.hours || []).map(
                    (point) => finiteNumber(point.price_ct_per_kwh),
                );
                hourlyPrices.value = embedded.length && embedded.every((value) => value !== null)
                    ? embedded
                    : demo
                        ? Array(24).fill(36.9)
                        : [];
                if (!demo) tariffSource.value = "STATS-Tarifdaten nicht verfügbar";
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
            } else {
                hourlyPrices.value = currentPrice.value === null
                    ? []
                    : Array(24).fill(currentPrice.value);
            }
            tariffSource.value = billing?.finance?.avg_price_ct ? "gewichteter STATS-Abrechnungspreis und Stundenpreise" : "konfigurierter STATS-Tarif und Stundenpreise";
        }

        const modeLabel = computed(() => ({ mock: "Premium-Demo", onboarding: "Lernphase", live: "Live", degraded: "Eingeschränkt" }[status.data_mode] || "Vorschau"));
        const entitlementLabel = computed(() => ({
            forecast_enabled: "die Premium-Funktion Prognose und Energieeinsatz",
            mobility: "die Premium-Funktion Wallbox und Mobilität",
        }[String(mobility.required_entitlement || "").split(/[.:/]/).at(-1)] || "eine passende Premium-Freischaltung"));
        const contractIncompatible = computed(() => {
            if (mobility.locked === true || mobility.configured === false) return false;
            // The provider intentionally omits optional planning inputs. Only a
            // missing availability flag means that this is not a Mobility DTO.
            return !Object.prototype.hasOwnProperty.call(mobility, "available");
        });
        const telemetryState = computed(() => {
            if (mobility.charging === true) return { title: "Lädt", text: "Die Wallbox meldet einen aktiven Ladevorgang." };
            if (mobility.connected === true) return { title: "Fahrzeug verbunden", text: "Das Fahrzeug ist verbunden und lädt aktuell nicht." };
            if (mobility.connected === false) return { title: "Nicht verbunden", text: "Die Wallbox meldet kein verbundenes Fahrzeug." };
            return { title: "Nicht verfügbar", text: "Der Verbindungsstatus wird von der Datenquelle nicht eindeutig geliefert." };
        });
        const providerNotice = computed(() => {
            if (mobility.configured === false || mobility.reason === "not_configured") {
                return { title: "Wallbox noch nicht eingerichtet", text: "Aktiviere die Wallbox-Funktion und ordne Leistung sowie eine Quelle für den Ladebedarf zu." };
            }
            if (mobility.available === true) {
                if (mobility.planning_window_complete === false) {
                    return { title: "Planungszeitraum unvollständig", text: "Live-Telemetrie bleibt sichtbar; für einen Ladeplan fehlen zusammenhängende Prognoseintervalle bis zur Abfahrt." };
                }
                if (mobility.allocation_valid === false) {
                    return { title: "PV-Zuordnung nicht verfügbar", text: "Ladebedarf und Netzplanung bleiben nutzbar. PV-Anteile werden zurückgehalten, bis der Energiehaushalt vollständig bestätigt ist." };
                }
                return null;
            }
            const reasons = {
                demand_source_missing: ["Quelle für Ladebedarf fehlt", "Wähle Ladestand, gewünschte Energie oder geplante Strecke als Quelle für den Ladebedarf."],
                demand_value_unavailable: ["Ladebedarf nicht verfügbar", "Die ausgewählte Quelle liefert aktuell keinen gültigen Wert."],
                forecast_hours_missing: ["Prognosestunden fehlen", "Für den Zeitraum bis zur Abfahrt liegen keine nutzbaren Providerstunden vor."],
                planning_window_incomplete: ["Planungszeitraum unvollständig", "Die Prognoseintervalle decken den Zeitraum bis zur Abfahrt nicht lückenlos ab."],
                allocation_context_unavailable: ["PV-Zuordnung nicht verfügbar", "Der Energiehaushalt ist unvollständig. Eine Netzplanung kann erst mit gültigen Planungsstunden erstellt werden."],
            };
            let reason = mobility.reason;
            if (reason === "data_unavailable") {
                reason = mobility.demand_source == null
                    ? "demand_source_missing"
                    : mobility.required_energy_kwh == null
                        ? "demand_value_unavailable"
                        : !(Array.isArray(mobility.hours) && mobility.hours.length)
                            ? "forecast_hours_missing"
                            : "planning_window_incomplete";
            }
            const [title, text] = reasons[reason] || ["Wallbox-Planung nicht verfügbar", "Der Provider hat keinen belastbaren Ladeplan freigegeben. Die Live-Telemetrie bleibt davon getrennt sichtbar."];
            return { title, text };
        });
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
            const socValues = [
                batteryCapacity.value,
                targetSoc.value,
                currentSoc.value,
            ].map(finiteNumber);
            const distanceValues = [
                plannedDistance.value,
                consumption.value,
            ].map(finiteNumber);
            const requested = finiteNumber(requestedEnergy.value);
            const batteryEnergy = demandMode.value === "soc" && socValues.every((value) => value !== null)
                ? Math.max(0, socValues[0] * (socValues[1] - socValues[2]) / 100)
                : demandMode.value === "distance" && distanceValues.every((value) => value !== null)
                    ? Math.max(0, distanceValues[0] * distanceValues[1] / 100)
                    : demandMode.value === "energy" && requested !== null
                        ? Math.max(0, requested)
                        : null;
            const efficiency = finiteNumber(chargingEfficiency.value);
            const requiredEnergy = batteryEnergy !== null && efficiency !== null
                ? batteryEnergy / Math.max(0.5, efficiency / 100)
                : null;
            const configuredMaxPower = finiteNumber(maxPower.value);
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
                const price = finiteNumber(
                    point.price_ct_per_kwh
                    ?? hourlyPrices.value[hour]
                    ?? currentPrice.value,
                );
                const temporalValid = normalized.intervalComplete
                    && [confidence, uncertainty, price].every(Number.isFinite);
                const pvContextValid = normalized.valid
                    && [pv, hp, house, battery].every(Number.isFinite);
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
                    temporalValid,
                    pvContextValid,
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
            const sequenceValid = planningWindow !== null
                && hours.every((point) => point.temporalValid);
            const planState = assessMobilityPlanState(mobility, {
                providerHoursAvailable,
                sequenceValid,
                demandValid: requiredEnergy !== null
                    && configuredMaxPower !== null
                    && configuredMaxPower > 0,
                providerAllocationAvailable: providerAllocation !== null,
                pvContextValid: hours.every((point) => point.pvContextValid),
            });
            const { available, pvAllocationAvailable } = planState;
            let remaining = requiredEnergy;
            if (pvAllocationAvailable) [...hours].sort((a, b) => b.residual - a.residual || a.price - b.price).forEach((point) => {
                if (remaining <= 0) return;
                if (!point.beforeDeparture) return;
                const energy = Math.min(remaining, configuredMaxPower * point.availableHours, point.residual);
                point.wallbox += energy; point.pvWallbox += energy; remaining -= energy;
            });
            if (available) [...hours].sort((a, b) => a.price - b.price || a.index - b.index).forEach((point) => {
                if (remaining <= 0) return;
                if (!point.beforeDeparture) return;
                const energy = Math.min(remaining, Math.max(0, configuredMaxPower * point.availableHours - point.wallbox));
                point.wallbox += energy; point.gridWallbox += energy; remaining -= energy;
            });
            const maxEnergy = available ? Math.max(...hours.flatMap((point) => pvAllocationAvailable ? [point.pv, point.house, point.hp, point.battery, point.wallbox] : [point.wallbox]), 1) : 1;
            const maxPriceValue = available ? Math.max(...hours.map((point) => point.price), 1) : 1;
            hours.forEach((point) => {
                point.pvHeight = pvAllocationAvailable ? Math.round(point.pv / maxEnergy * 100) : 0;
                point.houseHeight = pvAllocationAvailable ? Math.round(point.house / maxEnergy * 100) : 0;
                point.hpHeight = pvAllocationAvailable ? Math.round(point.hp / maxEnergy * 100) : 0;
                point.batteryHeight = pvAllocationAvailable ? Math.round(point.battery / maxEnergy * 100) : 0;
                point.evHeight = available ? Math.round(point.wallbox / maxEnergy * 100) : 0;
                point.priceHeight = available ? Math.round(point.price / maxPriceValue * 100) : 0;
            });
            const planned = hours.reduce((sum, point) => sum + point.wallbox, 0);
            const pvEnergy = pvAllocationAvailable ? hours.reduce((sum, point) => sum + point.pvWallbox, 0) : null;
            const gridEnergy = available ? hours.reduce((sum, point) => sum + point.gridWallbox, 0) : null;
            const pvLower = pvAllocationAvailable ? hours.reduce((sum, point) => sum + Math.min(point.pvWallbox, point.residualLower), 0) : null;
            const pvUpper = pvAllocationAvailable ? hours.reduce((sum, point) => sum + Math.min(point.wallbox, point.residualUpper), 0) : null;
            const feedInTariff = finiteNumber(feedIn.value);
            const advisedCost = available && (!pvAllocationAvailable || feedInTariff !== null)
                ? hours.reduce((sum, point) => sum + point.gridWallbox * point.price / 100 + point.pvWallbox * (feedInTariff || 0) / 100, 0)
                : null;
            const immediatePrice = finiteNumber(currentPrice.value);
            const immediateCost = available && immediatePrice !== null
                ? requiredEnergy * immediatePrice / 100
                : null;
            const selected = hours.filter((point) => point.wallbox > 0.01);
            const confidence = available && selected.length ? Math.round(selected.reduce((sum, point) => sum + point.confidence, 0) / selected.length) : null;
            const selectedUncertainty = available && selected.length ? Math.round(selected.reduce((sum, point) => sum + point.uncertainty, 0) / selected.length) : null;
            const uncertainty = selectedUncertainty == null ? null : Math.max(selectedUncertainty, demandMode.value === "distance" ? 25 : demandMode.value === "energy" ? 10 : 5);
            return { hours, selected, planningWindow, providerAllocation, batteryEnergy, requiredEnergy, pvEnergy, gridEnergy, pvLower, pvUpper, pvShare: pvAllocationAvailable && planned ? Math.round(pvEnergy / planned * 100) : null, immediateCost, advisedCost, saving: available && immediateCost !== null && advisedCost !== null ? Math.max(0, immediateCost - advisedCost) : null, readiness: available ? requiredEnergy ? Math.min(100, Math.round(planned / requiredEnergy * 100)) : 100 : null, confidence, uncertainty, start: selected[0]?.timestamp, end: selected.at(-1)?.intervalEndMs, providerHoursAvailable, sequenceValid, pvAllocationAvailable, available };
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
        const recommendationWindow = computed(() => {
            if (!plan.value.available) return "Nicht verfügbar";
            const providerStart = Date.parse(mobility.recommended_start);
            const providerEnd = Date.parse(mobility.recommended_end);
            const start = status.is_demo !== true
                && Number.isFinite(providerStart)
                && Number.isFinite(providerEnd)
                ? providerStart
                : plan.value.start
                    ? Date.parse(plan.value.start)
                    : null;
            const end = status.is_demo !== true
                && Number.isFinite(providerStart)
                && Number.isFinite(providerEnd)
                ? providerEnd
                : plan.value.end;
            if (Number.isFinite(start) && Number.isFinite(end)) {
                return `${new Date(start).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}–${new Date(end).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr`;
            }
            return plan.value.requiredEnergy > 0
                ? "Kein belastbares Zeitfenster"
                : "Kein Laden nötig";
        });
        const recommendationInsight = computed(() => {
            if (status.is_demo !== true) {
                return providerRecommendationInsight(mobility);
            }
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
            : !plan.value.pvAllocationAvailable
                ? `${point.label}, Strompreis ${point.price.toFixed(1)} Cent pro Kilowattstunde, Wallbox-Netzplanung ${number(point.wallbox)} Kilowattstunden, verfügbare Ladezeit ${number(point.availableHours, 2)} Stunden, PV-Zuordnung nicht verfügbar`
            : `${point.label}, Strompreis ${point.price.toFixed(1)} Cent pro Kilowattstunde, PV ${number(point.pv)} Kilowattstunden, Haus ${number(point.house)} Kilowattstunden, Wärmepumpe ${number(point.hp)} Kilowattstunden, Speicherreserve ${number(point.battery)} Kilowattstunden, Wallbox ${number(point.wallbox)} Kilowattstunden, davon PV ${number(point.pvWallbox)} Kilowattstunden, verfügbare Ladezeit ${number(point.availableHours, 2)} Stunden`;
        onMounted(load);
        return { loading, error, status, mobility, demandMode, currentSoc, targetSoc, batteryCapacity, requestedEnergy, plannedDistance, consumption, chargingEfficiency, modeLabel, entitlementLabel, contractIncompatible, telemetryState, providerNotice, plan, mobilityBudget, timelineColumns, animatedSaving, tariffSource, departureLabel, recommendationWindow, recommendationInsight, insightConfidenceStyle, mobilityPointLabel, number, euro };
    },
};

if (typeof window !== "undefined") window.ModernMobilityPage = ModernMobilityPage;
if (typeof module !== "undefined") module.exports = {
    normalizeMobilityHour,
    assessMobilityPlanState,
    providerRecommendationInsight,
};
