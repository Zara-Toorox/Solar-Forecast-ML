/* Copyright (c) 2025 Zara-Toorox. See ../../LICENSE for license terms. */

const TOMORROW_PHASE_IMAGES = [
    { phase: "phase-night", src: "/api/sfml_stats/static/modern/assets/tomorrow-night-v1.webp" },
    { phase: "phase-twilight", src: "/api/sfml_stats/static/modern/assets/tomorrow-dawn-v1.webp" },
    { phase: "phase-morning", src: "/api/sfml_stats/static/modern/assets/tomorrow-morning-v1.webp" },
    { phase: "phase-noon", src: "/api/sfml_stats/static/modern/assets/tomorrow-noon-v1.webp" },
    { phase: "phase-afternoon", src: "/api/sfml_stats/static/modern/assets/tomorrow-afternoon-v1.webp" },
    { phase: "phase-evening", src: "/api/sfml_stats/static/modern/assets/tomorrow-evening-v1.webp" },
];
const TOMORROW_SOLAR_PHASES = new Set([
    "night", "twilight", "morning", "noon", "afternoon", "evening",
]);
const TOMORROW_SOLAR_PHASE_LABELS = {
    night: "Nacht",
    twilight: "Dämmerung",
    morning: "Vormittag",
    noon: "Mittag",
    afternoon: "Nachmittag",
    evening: "Abend",
};

function tomorrowBand(value) {
    const autonomy = Number(value || 0);
    if (autonomy >= 99) return "autonomous";
    if (autonomy >= 80) return "strong";
    if (autonomy >= 50) return "balanced";
    return "grid";
}

function tomorrowDate(value, options = {}) {
    const date = new Date(`${value}T12:00:00`);
    return new Intl.DateTimeFormat("de-DE", options).format(date);
}

window.TomorrowPage = {
    props: {
        config: { type: Object, default: () => ({}) },
    },
    template: `
        <section class="tomorrow-page" aria-labelledby="tomorrow-title">
            <div v-if="loading" class="tomorrow-loading" role="status">
                <span class="tomorrow-loader" aria-hidden="true"></span>
                <strong>Deine Energy Story entsteht</strong>
                <span>Historische Tagesbilanzen werden lokal ausgewertet.</span>
            </div>

            <div v-else-if="error" class="tomorrow-error" role="alert">
                <strong>SFML Tomorrow ist gerade nicht erreichbar.</strong>
                <span>{{ error }}</span>
                <button type="button" @click="load">Erneut versuchen</button>
            </div>

            <article v-else-if="unavailable" class="tomorrow-lock" aria-labelledby="tomorrow-unavailable-title">
                <div class="tomorrow-lock-media" role="img" aria-label="Solarhaus in der blauen Stunde"></div>
                <div class="tomorrow-lock-shade"></div>
                <div class="tomorrow-lock-content">
                    <span class="tomorrow-brand-pill"><i></i> PREMIUM AKTIV</span>
                    <p class="tomorrow-overline">ENERGY STORY</p>
                    <h2 id="tomorrow-unavailable-title">Deine Energiegeschichte wächst noch.</h2>
                    <p>{{ payload.message }}</p>
                    <button type="button" class="tomorrow-retry" @click="load">Erneut prüfen</button>
                </div>
            </article>

            <template v-else>
                <header class="tomorrow-hero" :class="[timePhase, energyState]">
                    <div
                        v-for="photo in heroPhotos"
                        :key="photo.phase"
                        class="tomorrow-hero-photo"
                        :class="{ active: timePhase === photo.phase }"
                        :style="{ backgroundImage: 'url(' + photo.src + ')' }"
                        aria-hidden="true"></div>
                    <div class="tomorrow-hero-shade"></div>
                    <div class="tomorrow-hero-copy">
                        <p>ENERGY STORY · {{ selectedDateLong }}</p>
                        <h2 id="tomorrow-title">{{ selectedDay.headline }}</h2>
                        <span>{{ selectedDay.narrative }}</span>
                    </div>
                    <div v-if="timeMachineAvailable" class="tomorrow-hero-hour-stats" aria-live="polite">
                        <article>
                            <span>Prognosegüte</span>
                            <strong>{{ formatQuality(displayForecastAccuracy) }}</strong>
                            <small>{{ forecastQualityDetail }}</small>
                        </article>
                        <article>
                            <span>Solarertrag</span>
                            <strong>{{ formatEnergy(selectedHourData.solar_yield_kwh) }}</strong>
                            <small>gemessen</small>
                        </article>
                        <article>
                            <span>Hausverbrauch</span>
                            <strong>{{ formatEnergy(selectedHourData.home_consumption_kwh) }}</strong>
                            <small>in dieser Stunde</small>
                        </article>
                        <article :class="energyState">
                            <span>{{ gridFlowLabel }}</span>
                            <strong>{{ formatEnergy(gridFlowValue) }}</strong>
                            <small>{{ selectedHourLabel }}</small>
                        </article>
                        <article v-if="hasBatterySoc">
                            <span>Akku-SOC</span>
                            <strong>{{ formatQuality(selectedHourData.battery_soc_percent) }}</strong>
                            <small>{{ selectedHourLabel }}</small>
                        </article>
                    </div>
                </header>

                <section class="tomorrow-time-machine" aria-labelledby="tomorrow-time-machine-title">
                        <div class="tomorrow-time-machine-head">
                            <div>
                                <p>SOLAR TIME MACHINE</p>
                                <h3 id="tomorrow-time-machine-title">Ertrag &amp; Verbrauch im Blick</h3>
                            </div>
                            <div class="tomorrow-time-marker">
                                <small>LOKALE SONNENPHASE · {{ timePhaseLabel }}</small>
                                <strong>{{ selectedHourLabel }}</strong>
                            </div>
                        </div>

                        <template v-if="timeMachineAvailable">
                            <label class="tomorrow-hour-control">
                                <span class="sr-only">Stunde des ausgewählten Tages</span>
                                <input
                                    v-model.number="selectedHour"
                                    type="range"
                                    min="0"
                                    max="23"
                                    step="1"
                                    :aria-valuetext="selectedHourLabel">
                                <span class="tomorrow-hour-track" aria-hidden="true">
                                    <i>00</i><i>06</i><i>12</i><i>18</i><i>24</i>
                                </span>
                            </label>

                            <div class="tomorrow-live-hour" aria-live="polite">
                                <span><small>Solar erzeugt</small><b>{{ formatEnergy(selectedHourData.solar_yield_kwh) }}</b></span>
                                <span><small>Hausverbrauch</small><b>{{ formatEnergy(selectedHourData.home_consumption_kwh) }}</b></span>
                                <span :class="energyState"><small>{{ gridFlowLabel }}</small><b>{{ formatEnergy(gridFlowValue) }}</b></span>
                            </div>

                        </template>

                        <div v-else class="tomorrow-timeline-unavailable" role="status">
                            <strong>Für diesen Tag fehlen ausreichende Stundenwerte.</strong>
                            <span>Die historische Tagesbilanz bleibt weiterhin verfügbar.</span>
                        </div>

                        <div v-if="timelineError" class="tomorrow-timeline-unavailable" role="alert">
                            <strong>Stundenwerte für diesen Tag konnten nicht geladen werden.</strong>
                            <span>{{ timelineError }}</span>
                        </div>
                </section>

                <div v-if="payload.is_demo" class="tomorrow-demo-banner" role="status">
                    <div>
                        <strong>Interaktive Demo</strong>
                        <span>Alle historischen Werte sind Mockdaten eines Beispielhaushalts.</span>
                    </div>
                    <a href="https://ko-fi.com/s/8bc3808d22" target="_blank" rel="noopener noreferrer">Lizenz</a>
                </div>

                <section class="tomorrow-kpi-grid" aria-label="Drei Hauptkennzahlen">
                    <article v-for="kpi in payload.kpis" :key="kpi.id" class="tomorrow-kpi" :class="kpi.id">
                        <span class="tomorrow-kpi-icon" aria-hidden="true"></span>
                        <div>
                            <p>{{ kpi.label }}</p>
                            <strong>{{ formatKpi(kpi) }} <small>{{ kpi.unit }}</small></strong>
                            <span>{{ kpi.detail }}</span>
                        </div>
                    </article>
                </section>

                <section class="tomorrow-journal" aria-labelledby="tomorrow-journal-title">
                    <div class="tomorrow-section-head">
                        <div>
                            <p>365-TAGE-ENERGIEGEDÄCHTNIS</p>
                            <h3 id="tomorrow-journal-title">Jeder Tag erzählt eine Geschichte</h3>
                        </div>
                        <span>Klicke einen Tag für seine Energy Story.</span>
                    </div>

                    <div class="tomorrow-month-axis" aria-hidden="true">
                        <span v-for="month in visibleMonths" :key="month.key">{{ month.label }}</span>
                    </div>
                    <div class="tomorrow-heatmap" role="list" aria-label="Historische Energie-Tage">
                        <button
                            v-for="day in payload.history"
                            :key="day.date"
                            type="button"
                            role="listitem"
                            class="tomorrow-day"
                            :class="[band(day.autonomy_percent), { selected: day.date === selectedDate }]"
                            :aria-pressed="day.date === selectedDate"
                            :aria-label="dayLabel(day)"
                            :title="dayLabel(day)"
                            @click="selectDay(day.date)">
                            <span></span>
                        </button>
                    </div>
                    <div class="tomorrow-legend" aria-hidden="true">
                        <span><i class="grid"></i>Netzintensiv</span>
                        <span><i class="balanced"></i>Ausgeglichen</span>
                        <span><i class="strong"></i>Stark</span>
                        <span><i class="autonomous"></i>Autark</span>
                    </div>
                </section>

                <section class="tomorrow-story" :class="band(selectedDay.autonomy_percent)" aria-live="polite">
                    <div class="tomorrow-story-date">
                        <span>{{ selectedWeekday }}</span>
                        <strong>{{ selectedDayNumber }}</strong>
                        <small>{{ selectedMonthYear }}</small>
                    </div>
                    <div class="tomorrow-story-copy">
                        <p>DEINE ENERGY STORY</p>
                        <h3>{{ selectedDay.headline }}</h3>
                        <span>{{ selectedDay.narrative }}</span>
                    </div>
                    <dl class="tomorrow-story-values">
                        <div><dt>Eigene Energie</dt><dd>{{ formatEnergy(selectedDay.own_energy_kwh) }}</dd></div>
                        <div><dt>Solar genutzt</dt><dd>{{ formatPercent(selectedDay.solar_use_percent) }}</dd></div>
                        <div><dt>Netzeinspeisung</dt><dd>{{ formatEnergy(selectedDay.grid_export_kwh) }}</dd></div>
                        <div><dt>Netzbezug</dt><dd>{{ formatEnergy(selectedDay.grid_import_kwh) }}</dd></div>
                    </dl>
                </section>

                <section v-if="hasDeviceInsights" class="tomorrow-devices" aria-labelledby="tomorrow-devices-title">
                    <div class="tomorrow-section-head">
                        <div>
                            <p>VERBRAUCHER</p>
                            <h3 id="tomorrow-devices-title">Große Verbraucher an diesem Tag</h3>
                        </div>
                        <span>{{ deviceInsightHint }}</span>
                    </div>
                    <div class="tomorrow-device-grid">
                        <article v-if="payload.devices?.heat_pump?.visible" class="tomorrow-device heat-pump">
                            <span>Wärmepumpe</span>
                            <strong>{{ formatEnergy(selectedDay.heat_pump_kwh) }}</strong>
                            <small>{{ payload.devices.heat_pump.is_demo ? "Beispielwerte, bis die Wärmepumpe konfiguriert ist. Nicht in der Tagesbilanz." : (payload.devices.heat_pump.active_history_days + " aktive historische Tage bestätigt") }}</small>
                        </article>
                        <article v-if="payload.devices?.wallbox?.visible" class="tomorrow-device wallbox">
                            <span>Wallbox</span>
                            <strong>{{ formatEnergy(selectedDay.wallbox_kwh) }}</strong>
                            <small>{{ payload.devices.wallbox.is_demo ? "Beispielwerte, bis die Wallbox konfiguriert ist. Nicht in der Tagesbilanz." : (payload.devices.wallbox.active_history_days + " aktive historische Tage bestätigt") }}</small>
                        </article>
                    </div>
                </section>

                <p class="tomorrow-footnote">
                    Historische Analyse aus lokalen Tagesbilanzen. Keine Gerätesteuerung und keine Home-Assistant-Dienste.
                </p>
            </template>
        </section>
    `,
    setup() {
        const loading = Vue.ref(true);
        const error = Vue.ref("");
        const payload = Vue.reactive({ mode: "unavailable", history: [], kpis: [], devices: {} });
        const selectedDate = Vue.ref("");
        const selectedHour = Vue.ref(12);
        const timelineLoading = Vue.ref(false);
        const timelineError = Vue.ref("");
        let timelineRequest = 0;

        const unavailable = Vue.computed(() => payload.licensed === true && payload.mode !== "live");
        const selectedDay = Vue.computed(() => (
            payload.history.find((day) => day.date === selectedDate.value)
            || payload.history[payload.history.length - 1]
            || {
                date: new Date().toISOString().slice(0, 10), headline: "Energy Story",
                narrative: "Für diesen Tag liegen noch keine Daten vor.", autonomy_percent: 0,
            }
        ));
        const heroPhotos = TOMORROW_PHASE_IMAGES;
        const timeMachineAvailable = Vue.computed(() => Boolean(
            payload.day_timeline?.qualified && payload.day_timeline?.hours?.length
        ));
        const selectedHourData = Vue.computed(() => (
            payload.day_timeline?.hours?.find((entry) => Number(entry.hour) === Number(selectedHour.value))
            || { hour: selectedHour.value, solar_yield_kwh: 0, home_consumption_kwh: 0, grid_import_kwh: 0, grid_export_kwh: 0, quality: "missing" }
        ));
        const selectedHourLabel = Vue.computed(() => `${String(selectedHour.value).padStart(2, "0")}:00`);
        const hasBatterySoc = Vue.computed(() => (
            payload.day_timeline?.hours?.some((entry) => (
                entry.battery_soc_percent !== null
                && entry.battery_soc_percent !== undefined
                && Number.isFinite(Number(entry.battery_soc_percent))
            ))
        ));
        const displayForecastAccuracy = Vue.computed(() => (
            payload.day_timeline?.daily_forecast?.accuracy_percent
        ));
        const forecastQualityDetail = Vue.computed(() => (
            `Gesamttag · Prognose ${formatEnergy(payload.day_timeline?.daily_forecast?.forecast_kwh)}`
        ));
        const timePhase = Vue.computed(() => {
            const solarPhase = selectedHourData.value?.solar_phase;
            if (TOMORROW_SOLAR_PHASES.has(solarPhase)) return `phase-${solarPhase}`;
            const hour = Number(selectedHour.value);
            if (hour >= 6 && hour < 7) return "phase-twilight";
            if (hour >= 7 && hour < 11) return "phase-morning";
            if (hour >= 11 && hour < 14) return "phase-noon";
            if (hour >= 14 && hour < 18) return "phase-afternoon";
            if (hour >= 18 && hour < 21) return "phase-evening";
            return "phase-night";
        });
        const timePhaseLabel = Vue.computed(() => (
            TOMORROW_SOLAR_PHASE_LABELS[timePhase.value.replace("phase-", "")]
            || "Nacht"
        ));
        const energyState = Vue.computed(() => {
            if (!timeMachineAvailable.value || selectedHourData.value.quality !== "complete") return "energy-missing";
            if (Number(selectedHourData.value.grid_export_kwh || 0) > 0.01) return "energy-export";
            if (Number(selectedHourData.value.grid_import_kwh || 0) > 0.01) return "energy-import";
            return "energy-balanced";
        });
        const gridFlowLabel = Vue.computed(() => (
            energyState.value === "energy-export" ? "Einspeisung" : "Netzbezug"
        ));
        const gridFlowValue = Vue.computed(() => (
            energyState.value === "energy-export"
                ? selectedHourData.value.grid_export_kwh
                : selectedHourData.value.grid_import_kwh
        ));
        const selectedDateLong = Vue.computed(() => tomorrowDate(selectedDay.value.date, {
            weekday: "long", day: "2-digit", month: "long", year: "numeric",
        }));
        const selectedWeekday = Vue.computed(() => tomorrowDate(selectedDay.value.date, { weekday: "long" }));
        const selectedDayNumber = Vue.computed(() => tomorrowDate(selectedDay.value.date, { day: "2-digit" }));
        const selectedMonthYear = Vue.computed(() => tomorrowDate(selectedDay.value.date, { month: "long", year: "numeric" }));
        const hasDeviceInsights = Vue.computed(() => Boolean(
            payload.devices?.heat_pump?.visible || payload.devices?.wallbox?.visible
        ));
        const deviceInsightHint = Vue.computed(() => (
            payload.devices?.heat_pump?.is_demo || payload.devices?.wallbox?.is_demo
                ? "Beispielwerte, bis der Verbraucher konfiguriert ist. Nicht in der Tagesbilanz."
                : "Nur sichtbare Historie aus konfigurierten Verbrauchern."
        ));
        const visibleMonths = Vue.computed(() => {
            const months = [];
            const seen = new Set();
            payload.history.forEach((day) => {
                const key = day.date.slice(0, 7);
                if (!seen.has(key)) {
                    seen.add(key);
                    months.push({ key, label: tomorrowDate(day.date, { month: "short" }) });
                }
            });
            return months;
        });

        function assignPayload(data, preferredDate = "") {
            Object.keys(payload).forEach((key) => delete payload[key]);
            Object.assign(payload, data || { mode: "unavailable", history: [], kpis: [], devices: {} });
            selectedDate.value = preferredDate && payload.history?.some((day) => day.date === preferredDate)
                ? preferredDate
                : payload.history?.[payload.history.length - 1]?.date || "";
            const highlightHour = Number(payload.day_timeline?.highlight_hour);
            if (Number.isInteger(highlightHour) && highlightHour >= 0 && highlightHour <= 23) {
                selectedHour.value = highlightHour;
            } else if (!payload.day_timeline?.hours?.some((entry) => Number(entry.hour) === Number(selectedHour.value))) {
                selectedHour.value = 12;
            }
        }

        async function load() {
            loading.value = true;
            error.value = "";
            try {
                const response = await SFMLApi.fetch(
                    "/api/sfml_stats/modern/tomorrow",
                    { forceRefresh: true, ttl: 0, authenticated: true }
                );
                assignPayload(response?.data || response);
            } catch (requestError) {
                error.value = requestError?.message || "Daten konnten nicht geladen werden.";
            } finally {
                loading.value = false;
            }
        }

        async function loadTimeline(value) {
            const requestId = ++timelineRequest;
            timelineLoading.value = true;
            timelineError.value = "";
            try {
                const query = new URLSearchParams({ date: value });
                const response = await SFMLApi.fetch(
                    `/api/sfml_stats/modern/tomorrow?${query.toString()}`,
                    { forceRefresh: true, ttl: 0, authenticated: true }
                );
                if (requestId === timelineRequest) assignPayload(response?.data || response, value);
            } catch (requestError) {
                if (requestId === timelineRequest) timelineError.value = requestError?.message || "Stundenwerte konnten nicht geladen werden.";
            } finally {
                if (requestId === timelineRequest) timelineLoading.value = false;
            }
        }

        function selectDay(value) {
            if (!payload.history.some((day) => day.date === value)) return;
            selectedDate.value = value;
            loadTimeline(value);
        }

        function formatEnergy(value) {
            if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
            return `${Number(value || 0).toFixed(1)} kWh`;
        }

        function formatPercent(value) {
            return `${Number(value || 0).toFixed(1)} %`;
        }

        function formatQuality(value) {
            if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
            return `${Number(value).toFixed(1)} %`;
        }

        function formatKpi(kpi) {
            return kpi.id === "autonomous_days"
                ? String(Math.round(Number(kpi.value || 0)))
                : Number(kpi.value || 0).toFixed(1);
        }

        function band(value) {
            return tomorrowBand(value);
        }

        function dayLabel(day) {
            return `${tomorrowDate(day.date, { day: "2-digit", month: "long", year: "numeric" })}: ${formatPercent(day.autonomy_percent)} Autarkie`;
        }

        Vue.onMounted(load);

        return {
            loading, error, payload, unavailable, selectedDate, selectedDay, heroPhotos,
            selectedHour, selectedHourData, selectedHourLabel, timelineLoading, timelineError,
            timeMachineAvailable, timePhase, timePhaseLabel, energyState, gridFlowLabel, gridFlowValue,
            hasBatterySoc,
            displayForecastAccuracy, forecastQualityDetail,
            selectedDateLong, selectedWeekday, selectedDayNumber, selectedMonthYear,
            hasDeviceInsights, deviceInsightHint, visibleMonths, load, selectDay, formatEnergy,
            formatPercent, formatQuality, formatKpi, band, dayLabel,
        };
    },
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = { tomorrowBand, tomorrowDate };
}
