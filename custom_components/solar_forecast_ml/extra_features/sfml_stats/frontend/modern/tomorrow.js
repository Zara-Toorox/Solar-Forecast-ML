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
const TOMORROW_COPY = {
    de: {
        loadingTitle: "Deine Energy Story entsteht",
        loadingText: "Historische Tagesbilanzen werden lokal ausgewertet.",
        errorTitle: "SFML Tomorrow ist gerade nicht erreichbar.",
        retry: "Erneut versuchen",
        retryCheck: "Erneut prüfen",
        lockOverline: "ENERGY STORY",
        lockTitle: "Deine Energiegeschichte wächst noch.",
        needSevenDays: "Für deine Energy Story werden mindestens sieben abgeschlossene Tagesbilanzen benötigt.",
        premium: "PREMIUM AKTIV",
        heroOverline: "ENERGY STORY",
        forecastQuality: "Prognosegüte",
        solarYield: "Solarertrag",
        homeUse: "Hausverbrauch",
        measured: "gemessen",
        thisHour: "in dieser Stunde",
        batterySoc: "Akku-SOC",
        timeMachine: "SOLAR TIME MACHINE",
        timeMachineTitle: "Ertrag & Verbrauch im Blick",
        solarPhase: "LOKALE SONNENPHASE",
        hourLabel: "Stunde des ausgewählten Tages",
        solarMade: "Solar erzeugt",
        timelineMissing: "Für diesen Tag fehlen ausreichende Stundenwerte.",
        timelineKept: "Die historische Tagesbilanz bleibt weiterhin verfügbar.",
        timelineLoadError: "Stundenwerte für diesen Tag konnten nicht geladen werden.",
        coverage: "{covered} von {expected} Stunden erfasst",
        reasons: {
            sensor_not_configured: "Kein Smartmeter-Import konfiguriert — Stundenwerte werden nicht geschrieben.",
            no_hourly_rows: "Für diesen Tag sind keine Stundenzeilen gespeichert.",
            partial_coverage: "Der Tag ist nur teilweise erfasst. Neustarts oder fehlende Stunden hinterlassen Lücken.",
            complete: "Alle erwarteten Stunden sind vollständig.",
        },
        demoTitle: "Interaktive Demo",
        demoText: "Alle historischen Werte sind Mockdaten eines Beispielhaushalts.",
        license: "Lizenz",
        kpiAria: "Drei Hauptkennzahlen",
        kpis: {
            autonomous_days: "Autarke Tage",
            self_supply: "Eigenversorgungsquote",
            own_energy: "Aus eigener Energie gedeckt",
        },
        kpiDetails: {
            min_autonomy: "mindestens 99 % Autarkie",
            weighted_home: "gewichteter Anteil am Hausverbrauch",
            instead_of_grid: "statt Energie aus dem Netz",
        },
        kpiUnits: { days: "Tage", "%": "%", kWh: "kWh" },
        memoryOverline: "ENERGIEGEDÄCHTNIS",
        memoryTitle: "Jeder Tag erzählt eine Geschichte",
        memoryHint: "Klicke einen Tag für seine Energy Story.",
        heatmapAria: "Historische Energie-Tage",
        legend: { unknown: "Unbekannt", grid: "Netzintensiv", balanced: "Ausgeglichen", strong: "Stark", autonomous: "Autark" },
        weekdays: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
        storyOverline: "DEINE ENERGY STORY",
        ownEnergy: "Eigene Energie",
        solarUsed: "Solar genutzt",
        feedIn: "Netzeinspeisung",
        gridImport: "Netzbezug",
        stories: {
            autonomous: {
                headline: "Fast vollständig aus eigener Energie",
                narrative: "Dein Haus hat seinen Energiebedarf nahezu ohne Netzbezug gedeckt. Solarstrom und Speicher haben an diesem Tag perfekt zusammengespielt.",
            },
            strong: {
                headline: "Ein starker Tag für deine Unabhängigkeit",
                narrative: "Der größte Teil deines Bedarfs kam aus eigener Energie. Nur ein kleiner Rest musste aus dem Netz ergänzt werden.",
            },
            balanced: {
                headline: "Sonne und Netz im Gleichgewicht",
                narrative: "Eigene Energie hat mehr als die Hälfte des Tagesbedarfs getragen. Die Tagesbilanz zeigt noch Potenzial für mehr Eigenversorgung.",
            },
            grid: {
                headline: "Ein netzintensiver Tag",
                narrative: "Wetter oder Verbrauch haben an diesem Tag mehr Netzenergie erfordert. Gerade solche Tage machen langfristige Fortschritte sichtbar.",
            },
            unknown: {
                headline: "Für diesen Tag fehlt eine belastbare Bilanz",
                narrative: "Es liegen nicht genug Tageswerte vor, um Autarkie oder eigene Energie zu bewerten. Die Kachel bleibt bewusst neutral.",
            },
        },
        phases: { night: "Nacht", twilight: "Dämmerung", morning: "Vormittag", noon: "Mittag", afternoon: "Nachmittag", evening: "Abend" },
        export: "Einspeisung",
        import: "Netzbezug",
        consumers: "VERBRAUCHER",
        consumersTitle: "Große Verbraucher an diesem Tag",
        heatPump: "Wärmepumpe",
        wallbox: "Wallbox",
        heatingRod: "Heizstab",
        demoConsumer: "Beispielwerte, bis der Verbraucher konfiguriert ist. Nicht in der Tagesbilanz.",
        liveConsumer: "Nur sichtbare Historie aus konfigurierten Verbrauchern.",
        activeDays: "{n} aktive historische Tage bestätigt",
        financeTitle: "Geld an diesem Tag",
        importCost: "Netzbezug",
        exportRevenue: "Einspeisung",
        peakPrice: "Teuerste Stunde",
        peakSolar: "Tagesspitze",
        forecastVsActual: "Prognose vs. Ist",
        forecast: "Prognose",
        actual: "Ist",
        deviation: "Abweichung",
        recordsTitle: "Rekorde",
        bestDay: "Bester Tag",
        bestWeek: "Beste Woche",
        streak: "Längste autarke Serie",
        streakValue: "{n} Tage",
        comparisonsTitle: "Zeitvergleich",
        thisMonth: "Dieser Monat",
        previousMonth: "Vormonat",
        lastYear: "Gleicher Monat im Vorjahr",
        weatherLink: "Warum war dieser Tag so? Ähnliche Tage in Wetter & Energie",
        batteryFlows: "Akkuflüsse",
        solarToHouse: "Solar ins Haus",
        solarToBattery: "Solar in den Akku",
        batteryToHouse: "Akku ins Haus",
        gridToBattery: "Netz in den Akku",
        footnote: "Historische Analyse aus lokalen Tagesbilanzen. Keine Gerätesteuerung und keine Home-Assistant-Dienste.",
        loadError: "Daten konnten nicht geladen werden.",
        hourError: "Stundenwerte konnten nicht geladen werden.",
        emptyDay: "Für diesen Tag liegen noch keine Daten vor.",
        autonomy: "Autarkie",
        hourOf: "Gesamttag · Prognose {value}",
        atHour: "um {value}",
    },
    en: {
        loadingTitle: "Your Energy Story is taking shape",
        loadingText: "Historical daily balances are being evaluated locally.",
        errorTitle: "SFML Tomorrow is currently unavailable.",
        retry: "Try again",
        retryCheck: "Check again",
        lockOverline: "ENERGY STORY",
        lockTitle: "Your energy history is still growing.",
        needSevenDays: "Your Energy Story needs at least seven completed daily balances.",
        premium: "PREMIUM ACTIVE",
        heroOverline: "ENERGY STORY",
        forecastQuality: "Forecast quality",
        solarYield: "Solar yield",
        homeUse: "Home consumption",
        measured: "measured",
        thisHour: "in this hour",
        batterySoc: "Battery SOC",
        timeMachine: "SOLAR TIME MACHINE",
        timeMachineTitle: "Yield and consumption at a glance",
        solarPhase: "LOCAL SOLAR PHASE",
        hourLabel: "Hour of the selected day",
        solarMade: "Solar produced",
        timelineMissing: "This day does not have enough hourly values.",
        timelineKept: "The historical daily balance remains available.",
        timelineLoadError: "Hourly values for this day could not be loaded.",
        coverage: "{covered} of {expected} hours captured",
        reasons: {
            sensor_not_configured: "No smart-meter import is configured — hourly values are not written.",
            no_hourly_rows: "No hourly rows are stored for this day.",
            partial_coverage: "This day is only partly captured. Restarts or missing hours leave gaps.",
            complete: "All expected hours are complete.",
        },
        demoTitle: "Interactive demo",
        demoText: "All historical values are mock data from an example household.",
        license: "License",
        kpiAria: "Three key metrics",
        kpis: {
            autonomous_days: "Autonomous days",
            self_supply: "Self-supply share",
            own_energy: "Covered from own energy",
        },
        kpiDetails: {
            min_autonomy: "at least 99% autonomy",
            weighted_home: "weighted share of home consumption",
            instead_of_grid: "instead of energy from the grid",
        },
        kpiUnits: { days: "days", "%": "%", kWh: "kWh" },
        memoryOverline: "ENERGY MEMORY",
        memoryTitle: "Every day tells a story",
        memoryHint: "Click a day for its Energy Story.",
        heatmapAria: "Historical energy days",
        legend: { unknown: "Unknown", grid: "Grid-heavy", balanced: "Balanced", strong: "Strong", autonomous: "Autonomous" },
        weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        storyOverline: "YOUR ENERGY STORY",
        ownEnergy: "Own energy",
        solarUsed: "Solar used",
        feedIn: "Grid export",
        gridImport: "Grid import",
        stories: {
            autonomous: {
                headline: "Almost fully supplied from own energy",
                narrative: "Your home covered nearly all of its demand without grid import. Solar and storage worked together on this day.",
            },
            strong: {
                headline: "A strong day for your independence",
                narrative: "Most of your demand came from own energy. Only a small remainder had to be taken from the grid.",
            },
            balanced: {
                headline: "Sun and grid in balance",
                narrative: "Own energy covered more than half of the day's demand. The balance still shows room for more self-supply.",
            },
            grid: {
                headline: "A grid-intensive day",
                narrative: "Weather or consumption required more grid energy on this day. Days like this make long-term progress visible.",
            },
            unknown: {
                headline: "This day has no reliable balance",
                narrative: "There are not enough daily values to assess autonomy or own energy. The tile stays deliberately neutral.",
            },
        },
        phases: { night: "Night", twilight: "Twilight", morning: "Morning", noon: "Noon", afternoon: "Afternoon", evening: "Evening" },
        export: "Export",
        import: "Grid import",
        consumers: "CONSUMERS",
        consumersTitle: "Large consumers on this day",
        heatPump: "Heat pump",
        wallbox: "Wallbox",
        heatingRod: "Heating rod",
        demoConsumer: "Sample values until the consumer is configured. Not part of the daily balance.",
        liveConsumer: "Visible history from configured consumers only.",
        activeDays: "{n} confirmed active historical days",
        financeTitle: "Money on this day",
        importCost: "Grid import",
        exportRevenue: "Feed-in",
        peakPrice: "Most expensive hour",
        peakSolar: "Daily peak",
        forecastVsActual: "Forecast vs actual",
        forecast: "Forecast",
        actual: "Actual",
        deviation: "Deviation",
        recordsTitle: "Records",
        bestDay: "Best day",
        bestWeek: "Best week",
        streak: "Longest autonomous streak",
        streakValue: "{n} days",
        comparisonsTitle: "Time comparison",
        thisMonth: "This month",
        previousMonth: "Previous month",
        lastYear: "Same month last year",
        weatherLink: "Why was this day like this? Similar days in Weather & Energy",
        batteryFlows: "Battery flows",
        solarToHouse: "Solar to house",
        solarToBattery: "Solar to battery",
        batteryToHouse: "Battery to house",
        gridToBattery: "Grid to battery",
        footnote: "Historical analysis from local daily balances. No device control and no Home Assistant services.",
        loadError: "Data could not be loaded.",
        hourError: "Hourly values could not be loaded.",
        emptyDay: "No data is available for this day yet.",
        autonomy: "autonomy",
        hourOf: "Full day · forecast {value}",
        atHour: "at {value}",
    },
    pl: {
        loadingTitle: "Twoja Energy Story właśnie powstaje",
        loadingText: "Lokalne dzienne bilanse są właśnie oceniane.",
        errorTitle: "SFML Tomorrow jest teraz niedostępny.",
        retry: "Spróbuj ponownie",
        retryCheck: "Sprawdź ponownie",
        lockOverline: "ENERGY STORY",
        lockTitle: "Twoja historia energii wciąż rośnie.",
        needSevenDays: "Energy Story wymaga co najmniej siedmiu zakończonych bilansów dziennych.",
        premium: "PREMIUM AKTYWNE",
        heroOverline: "ENERGY STORY",
        forecastQuality: "Jakość prognozy",
        solarYield: "Uzysk solarny",
        homeUse: "Zużycie domu",
        measured: "zmierzone",
        thisHour: "w tej godzinie",
        batterySoc: "SOC akumulatora",
        timeMachine: "SOLAR TIME MACHINE",
        timeMachineTitle: "Uzysk i zużycie w jednym widoku",
        solarPhase: "LOKALNA FAZA SŁOŃCA",
        hourLabel: "Godzina wybranego dnia",
        solarMade: "Energia wytworzona",
        timelineMissing: "Dla tego dnia brakuje wystarczających wartości godzinowych.",
        timelineKept: "Historyczny bilans dzienny pozostaje dostępny.",
        timelineLoadError: "Nie udało się wczytać wartości godzinowych dla tego dnia.",
        coverage: "Zarejestrowano {covered} z {expected} godzin",
        reasons: {
            sensor_not_configured: "Nie skonfigurowano importu smartmetra — wartości godzinowe nie są zapisywane.",
            no_hourly_rows: "Dla tego dnia nie ma zapisanych wierszy godzinowych.",
            partial_coverage: "Dzień jest zapisany tylko częściowo. Restart lub brakujące godziny zostawiają luki.",
            complete: "Wszystkie oczekiwane godziny są kompletne.",
        },
        demoTitle: "Interaktywne demo",
        demoText: "Wszystkie wartości historyczne to dane przykładowego domu.",
        license: "Licencja",
        kpiAria: "Trzy główne wskaźniki",
        kpis: {
            autonomous_days: "Dni autarkiczne",
            self_supply: "Udział samowystarczalności",
            own_energy: "Pokryte własną energią",
        },
        kpiDetails: {
            min_autonomy: "co najmniej 99% autarkii",
            weighted_home: "ważony udział zużycia domu",
            instead_of_grid: "zamiast energii z sieci",
        },
        kpiUnits: { days: "dni", "%": "%", kWh: "kWh" },
        memoryOverline: "PAMIĘĆ ENERGII",
        memoryTitle: "Każdy dzień opowiada historię",
        memoryHint: "Kliknij dzień, aby zobaczyć jego Energy Story.",
        heatmapAria: "Historyczne dni energii",
        legend: { unknown: "Nieznany", grid: "Sieciowy", balanced: "Zrównoważony", strong: "Silny", autonomous: "Autarkiczny" },
        weekdays: ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"],
        storyOverline: "TWOJA ENERGY STORY",
        ownEnergy: "Własna energia",
        solarUsed: "Wykorzystane słońce",
        feedIn: "Eksport do sieci",
        gridImport: "Pobór z sieci",
        stories: {
            autonomous: {
                headline: "Prawie w całości z własnej energii",
                narrative: "Dom pokrył niemal cały popyt bez poboru z sieci. Fotowoltaika i magazyn zadziałały tego dnia razem.",
            },
            strong: {
                headline: "Silny dzień dla niezależności",
                narrative: "Większość zapotrzebowania pochodziła z własnej energii. Tylko resztę trzeba było uzupełnić z sieci.",
            },
            balanced: {
                headline: "Słońce i sieć w równowadze",
                narrative: "Własna energia pokryła więcej niż połowę dziennego zapotrzebowania. Bilans wciąż pokazuje potencjał.",
            },
            grid: {
                headline: "Dzień z dużym poborem sieci",
                narrative: "Pogoda lub zużycie wymagały tego dnia więcej energii z sieci. Takie dni pokazują długoterminowy postęp.",
            },
            unknown: {
                headline: "Ten dzień nie ma wiarygodnego bilansu",
                narrative: "Brakuje dziennych wartości, aby ocenić autarkię lub własną energię. Kafel pozostaje celowo neutralny.",
            },
        },
        phases: { night: "Noc", twilight: "Zmierzch", morning: "Przedpołudnie", noon: "Południe", afternoon: "Popołudnie", evening: "Wieczór" },
        export: "Eksport",
        import: "Pobór z sieci",
        consumers: "ODBIORNIKI",
        consumersTitle: "Duże odbiorniki tego dnia",
        heatPump: "Pompa ciepła",
        wallbox: "Wallbox",
        heatingRod: "Grzałka",
        demoConsumer: "Wartości przykładowe, dopóki odbiornik nie jest skonfigurowany. Poza bilansem dnia.",
        liveConsumer: "Widoczna historia tylko z skonfigurowanych odbiorników.",
        activeDays: "{n} potwierdzonych aktywnych dni historycznych",
        financeTitle: "Pieniądze tego dnia",
        importCost: "Pobór z sieci",
        exportRevenue: "Sprzedaż do sieci",
        peakPrice: "Najdroższa godzina",
        peakSolar: "Szczyt dnia",
        forecastVsActual: "Prognoza vs rzeczywisty uzysk",
        forecast: "Prognoza",
        actual: "Rzeczywisty",
        deviation: "Odchylenie",
        recordsTitle: "Rekordy",
        bestDay: "Najlepszy dzień",
        bestWeek: "Najlepszy tydzień",
        streak: "Najdłuższa seria autarkii",
        streakValue: "{n} dni",
        comparisonsTitle: "Porównanie w czasie",
        thisMonth: "Ten miesiąc",
        previousMonth: "Poprzedni miesiąc",
        lastYear: "Ten sam miesiąc rok wcześniej",
        weatherLink: "Dlaczego ten dzień taki był? Podobne dni w Pogoda i energia",
        batteryFlows: "Przepływy akumulatora",
        solarToHouse: "PV do domu",
        solarToBattery: "PV do akumulatora",
        batteryToHouse: "Akumulator do domu",
        gridToBattery: "Sieć do akumulatora",
        footnote: "Historyczna analiza lokalnych bilansów dziennych. Bez sterowania urządzeniami i bez usług Home Assistant.",
        loadError: "Nie udało się wczytać danych.",
        hourError: "Nie udało się wczytać wartości godzinowych.",
        emptyDay: "Dla tego dnia nie ma jeszcze danych.",
        autonomy: "autarkia",
        hourOf: "Cały dzień · prognoza {value}",
        atHour: "o {value}",
    },
};

function tomorrowLocale() {
    return ["de", "en", "pl"].includes(window.SFMLI18n?.current)
        ? window.SFMLI18n.current
        : "en";
}

function tomorrowCopy() {
    return TOMORROW_COPY[tomorrowLocale()] || TOMORROW_COPY.en;
}

function tomorrowDate(value, options = {}) {
    const date = new Date(`${value}T12:00:00`);
    if (!Number.isFinite(date.getTime())) return "—";
    return new Intl.DateTimeFormat(tomorrowLocale(), options).format(date);
}

function tomorrowBand(day) {
    if (!day || day.quality === "missing" || day.autonomy_percent == null || day.placeholder) {
        return "unknown";
    }
    const autonomy = Number(day.autonomy_percent);
    if (autonomy >= 99) return "autonomous";
    if (autonomy >= 80) return "strong";
    if (autonomy >= 50) return "balanced";
    return "grid";
}

function tomorrowCalendar(history) {
    const days = Array.isArray(history) ? history : [];
    const weekdayLabels = tomorrowCopy().weekdays;
    if (!days.length) {
        return { weeks: 1, months: [], cells: [], weekdayLabels };
    }
    const byDate = new Map(days.map((day) => [String(day.date), day]));
    const first = String(days[0].date);
    const last = String(days[days.length - 1].date);
    const start = new Date(`${first}T12:00:00`);
    const end = new Date(`${last}T12:00:00`);
    const pad = (start.getDay() + 6) % 7;
    const cells = [];
    for (let index = 0; index < pad; index += 1) {
        cells.push({ key: `pad-${index}`, empty: true });
    }
    for (let stamp = start.getTime(); stamp <= end.getTime(); stamp += 86400000) {
        const current = new Date(stamp);
        const iso = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
        const day = byDate.get(iso);
        cells.push(day
            ? { ...day, key: iso, empty: false, placeholder: false }
            : {
                key: iso,
                date: iso,
                empty: false,
                placeholder: true,
                quality: "missing",
                autonomy_percent: null,
            });
    }
    const months = [];
    const seen = new Set();
    cells.forEach((cell, index) => {
        if (!cell.date) return;
        const key = String(cell.date).slice(0, 7);
        if (!key || seen.has(key)) return;
        seen.add(key);
        months.push({
            key,
            label: tomorrowDate(cell.date, { month: "short" }),
            week: Math.floor(index / 7) + 1,
        });
    });
    return {
        weeks: Math.max(1, Math.ceil(cells.length / 7)),
        months,
        cells,
        weekdayLabels,
    };
}

function tomorrowMonthAxis(history) {
    return tomorrowCalendar(history);
}

window.TomorrowPage = {
    props: {
        config: { type: Object, default: () => ({}) },
        initialSection: { type: String, default: "" },
    },
    emits: ["navigate"],
    template: `
        <section class="tomorrow-page" aria-labelledby="tomorrow-title">
            <div v-if="loading" class="tomorrow-loading" role="status">
                <span class="tomorrow-loader" aria-hidden="true"></span>
                <strong>{{ copy.loadingTitle }}</strong>
                <span>{{ copy.loadingText }}</span>
            </div>

            <div v-else-if="error" class="tomorrow-error" role="alert">
                <strong>{{ copy.errorTitle }}</strong>
                <span>{{ error }}</span>
                <button type="button" @click="load">{{ copy.retry }}</button>
            </div>

            <article v-else-if="unavailable" class="tomorrow-lock" aria-labelledby="tomorrow-unavailable-title">
                <div class="tomorrow-lock-media" role="img" aria-label=""></div>
                <div class="tomorrow-lock-shade"></div>
                <div class="tomorrow-lock-content">
                    <span class="tomorrow-brand-pill"><i></i> {{ copy.premium }}</span>
                    <p class="tomorrow-overline">{{ copy.lockOverline }}</p>
                    <h2 id="tomorrow-unavailable-title">{{ copy.lockTitle }}</h2>
                    <p>{{ lockMessage }}</p>
                    <button type="button" class="tomorrow-retry" @click="load">{{ copy.retryCheck }}</button>
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
                        <p>{{ copy.heroOverline }} · {{ selectedDateLong }}</p>
                        <h2 id="tomorrow-title">{{ story.headline }}</h2>
                        <span>{{ story.narrative }}</span>
                    </div>
                    <div class="tomorrow-hero-hour-stats" aria-live="polite">
                        <article v-if="hasForecastQuality">
                            <span>{{ copy.forecastQuality }}</span>
                            <strong>{{ formatQuality(displayForecastAccuracy) }}</strong>
                            <small>{{ forecastQualityDetail }}</small>
                        </article>
                        <template v-if="timeMachineAvailable">
                            <article>
                                <span>{{ copy.solarYield }}</span>
                                <strong>{{ formatEnergy(selectedHourData.solar_yield_kwh) }}</strong>
                                <small>{{ copy.measured }}</small>
                            </article>
                            <article>
                                <span>{{ copy.homeUse }}</span>
                                <strong>{{ formatEnergy(selectedHourData.home_consumption_kwh) }}</strong>
                                <small>{{ copy.thisHour }}</small>
                            </article>
                            <article :class="energyState">
                                <span>{{ gridFlowLabel }}</span>
                                <strong>{{ formatEnergy(gridFlowValue) }}</strong>
                                <small>{{ selectedHourLabel }}</small>
                            </article>
                            <article v-if="hasBatterySoc">
                                <span>{{ copy.batterySoc }}</span>
                                <strong>{{ formatQuality(selectedHourData.battery_soc_percent) }}</strong>
                                <small>{{ selectedHourLabel }}</small>
                            </article>
                        </template>
                    </div>
                </header>

                <section class="tomorrow-time-machine" :aria-busy="timelineLoading ? 'true' : 'false'" aria-labelledby="tomorrow-time-machine-title">
                        <div v-if="timelineLoading" class="tomorrow-timeline-loading" role="status">{{ copy.loadingText }}</div>
                        <div class="tomorrow-time-machine-head">
                            <div>
                                <p>{{ copy.timeMachine }}</p>
                                <h3 id="tomorrow-time-machine-title">{{ copy.timeMachineTitle }}</h3>
                            </div>
                            <div class="tomorrow-time-marker">
                                <small>{{ copy.solarPhase }} · {{ timePhaseLabel }}</small>
                                <strong>{{ selectedHourLabel }}</strong>
                            </div>
                        </div>

                        <template v-if="timeMachineAvailable">
                            <label class="tomorrow-hour-control">
                                <span class="sr-only">{{ copy.hourLabel }}</span>
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
                                <span><small>{{ copy.solarMade }}</small><b>{{ formatEnergy(selectedHourData.solar_yield_kwh) }}</b></span>
                                <span><small>{{ copy.homeUse }}</small><b>{{ formatEnergy(selectedHourData.home_consumption_kwh) }}</b></span>
                                <span :class="energyState"><small>{{ gridFlowLabel }}</small><b>{{ formatEnergy(gridFlowValue) }}</b></span>
                            </div>
                            <div v-if="hasHourlyFlows" class="tomorrow-live-hour tomorrow-battery-hour">
                                <span><small>{{ copy.solarToHouse }}</small><b>{{ formatEnergy(selectedHourData.solar_to_house_kwh) }}</b></span>
                                <span><small>{{ copy.solarToBattery }}</small><b>{{ formatEnergy(selectedHourData.solar_to_battery_kwh) }}</b></span>
                                <span><small>{{ copy.batteryToHouse }}</small><b>{{ formatEnergy(selectedHourData.battery_to_house_kwh) }}</b></span>
                                <span><small>{{ copy.gridToBattery }}</small><b>{{ formatEnergy(selectedHourData.grid_to_battery_kwh) }}</b></span>
                            </div>
                        </template>

                        <div v-else class="tomorrow-timeline-unavailable" role="status">
                            <strong>{{ copy.timelineMissing }}</strong>
                            <span>{{ coverageLabel }}</span>
                            <span>{{ reasonLabel }}</span>
                            <span>{{ copy.timelineKept }}</span>
                        </div>

                        <div v-if="timelineError" class="tomorrow-timeline-unavailable" role="alert">
                            <strong>{{ copy.timelineLoadError }}</strong>
                            <span>{{ timelineError }}</span>
                        </div>
                </section>

                <div v-if="payload.is_demo" class="tomorrow-demo-banner" role="status">
                    <div>
                        <strong>{{ copy.demoTitle }}</strong>
                        <span>{{ copy.demoText }}</span>
                    </div>
                    <a href="https://ko-fi.com/s/8bc3808d22" target="_blank" rel="noopener noreferrer">{{ copy.license }}</a>
                </div>

                <section class="tomorrow-kpi-grid" :aria-label="copy.kpiAria">
                    <article v-for="kpi in payload.kpis" :key="kpi.id" class="tomorrow-kpi" :class="kpi.id">
                        <span class="tomorrow-kpi-icon" aria-hidden="true"></span>
                        <div>
                            <p>{{ kpiLabel(kpi) }}</p>
                            <strong>{{ formatKpi(kpi) }} <small>{{ kpiUnit(kpi) }}</small></strong>
                            <span>{{ kpiDetail(kpi) }}</span>
                        </div>
                    </article>
                </section>

                <section class="tomorrow-journal" aria-labelledby="tomorrow-journal-title">
                    <div class="tomorrow-section-head">
                        <div>
                            <p>{{ copy.memoryOverline }}</p>
                            <h3 id="tomorrow-journal-title">{{ copy.memoryTitle }}</h3>
                        </div>
                        <span>{{ copy.memoryHint }}</span>
                    </div>

                    <div class="tomorrow-journal-calendar" :style="calendarStyle">
                        <div class="tomorrow-month-axis" aria-hidden="true">
                            <span v-for="month in visibleMonths" :key="month.key" :style="monthStyle(month)">{{ month.label }}</span>
                        </div>
                        <div class="tomorrow-heatmap-wrap">
                            <div class="tomorrow-weekdays" aria-hidden="true">
                                <span v-for="label in weekdayLabels" :key="label">{{ label }}</span>
                            </div>
                            <ol class="tomorrow-heatmap" :aria-label="copy.heatmapAria">
                                <li v-for="cell in calendarCells" :key="cell.key">
                                    <button
                                        v-if="!cell.empty && !cell.placeholder"
                                        type="button"
                                        class="tomorrow-day"
                                        :class="[band(cell), { selected: cell.date === selectedDate }]"
                                        :aria-pressed="cell.date === selectedDate"
                                        :aria-label="dayLabel(cell)"
                                        :title="dayLabel(cell)"
                                        @click="selectDay(cell.date)">
                                        <span></span>
                                    </button>
                                    <span v-else class="tomorrow-day" :class="[cell.empty ? 'pad' : band(cell), 'is-empty']" aria-hidden="true"><span></span></span>
                                </li>
                            </ol>
                        </div>
                    </div>
                    <div class="tomorrow-legend" aria-hidden="true">
                        <span><i class="unknown"></i>{{ copy.legend.unknown }}</span>
                        <span><i class="grid"></i>{{ copy.legend.grid }}</span>
                        <span><i class="balanced"></i>{{ copy.legend.balanced }}</span>
                        <span><i class="strong"></i>{{ copy.legend.strong }}</span>
                        <span><i class="autonomous"></i>{{ copy.legend.autonomous }}</span>
                    </div>
                </section>

                <section class="tomorrow-story" :class="band(selectedDay)" aria-live="polite">
                    <div class="tomorrow-story-date">
                        <span>{{ selectedWeekday }}</span>
                        <strong>{{ selectedDayNumber }}</strong>
                        <small>{{ selectedMonthYear }}</small>
                    </div>
                    <div class="tomorrow-story-copy">
                        <p>{{ copy.storyOverline }}</p>
                        <h3>{{ story.headline }}</h3>
                        <span>{{ story.narrative }}</span>
                    </div>
                    <dl class="tomorrow-story-values">
                        <div><dt>{{ copy.ownEnergy }}</dt><dd>{{ formatEnergy(selectedDay.own_energy_kwh) }}</dd></div>
                        <div><dt>{{ copy.solarUsed }}</dt><dd>{{ formatPercent(selectedDay.solar_use_percent) }}</dd></div>
                        <div><dt>{{ copy.feedIn }}</dt><dd>{{ formatEnergy(selectedDay.grid_export_kwh) }}</dd></div>
                        <div><dt>{{ copy.gridImport }}</dt><dd>{{ formatEnergy(selectedDay.grid_import_kwh) }}</dd></div>
                    </dl>
                </section>

                <section v-if="hasDayInsights" class="tomorrow-insight-grid" aria-label="">
                    <article v-if="hasFinance" class="tomorrow-insight">
                        <p>{{ copy.financeTitle }}</p>
                        <strong>{{ formatMoney(dayFinance.grid_import_cost_ct) }}</strong>
                        <span>{{ copy.importCost }} · {{ copy.exportRevenue }} {{ formatMoney(dayFinance.feed_in_revenue_ct) }}</span>
                        <small v-if="dayFinance.peak_price_hour != null">{{ copy.peakPrice }} {{ String(dayFinance.peak_price_hour).padStart(2, "0") }}:00 · {{ formatPrice(dayFinance.peak_price_ct_kwh) }}</small>
                    </article>
                    <article v-if="hasPeakSolar" class="tomorrow-insight">
                        <p>{{ copy.peakSolar }}</p>
                        <strong>{{ formatPower(selectedDay.peak_solar_w) }}</strong>
                        <span v-if="selectedDay.peak_solar_time">{{ copy.atHour.replace("{value}", selectedDay.peak_solar_time) }}</span>
                    </article>
                    <article v-if="hasForecastQuality" class="tomorrow-insight">
                        <p>{{ copy.forecastVsActual }}</p>
                        <strong>{{ formatQuality(displayForecastAccuracy) }}</strong>
                        <span>{{ copy.forecast }} {{ formatEnergy(payload.day_timeline?.daily_forecast?.forecast_kwh) }} · {{ copy.actual }} {{ formatEnergy(payload.day_timeline?.daily_forecast?.actual_kwh) }}</span>
                        <small v-if="forecastDelta">{{ copy.deviation }} {{ forecastDelta }}</small>
                    </article>
                </section>

                <section v-if="hasRecords" class="tomorrow-insight-grid">
                    <article v-if="payload.records?.best_day" class="tomorrow-insight">
                        <p>{{ copy.bestDay }}</p>
                        <strong>{{ formatPercent(payload.records.best_day.autonomy_percent) }}</strong>
                        <span>{{ tomorrowDate(payload.records.best_day.date, { day: "2-digit", month: "long" }) }}</span>
                    </article>
                    <article v-if="payload.records?.best_week" class="tomorrow-insight">
                        <p>{{ copy.bestWeek }}</p>
                        <strong>{{ formatPercent(payload.records.best_week.autonomy_percent) }}</strong>
                        <span>{{ tomorrowDate(payload.records.best_week.start, { day: "2-digit", month: "short" }) }} – {{ tomorrowDate(payload.records.best_week.end, { day: "2-digit", month: "short" }) }}</span>
                    </article>
                    <article v-if="payload.records?.longest_autonomous_streak" class="tomorrow-insight">
                        <p>{{ copy.streak }}</p>
                        <strong>{{ copy.streakValue.replace("{n}", payload.records.longest_autonomous_streak.days) }}</strong>
                        <span v-if="payload.records.longest_autonomous_streak.end">{{ tomorrowDate(payload.records.longest_autonomous_streak.end, { day: "2-digit", month: "long" }) }}</span>
                    </article>
                </section>

                <section v-if="hasComparisons" class="tomorrow-insight-grid">
                    <article v-for="item in comparisonCards" :key="item.id" class="tomorrow-insight">
                        <p>{{ item.label }}</p>
                        <strong>{{ formatPercent(item.autonomy_percent) }}</strong>
                        <span>{{ formatEnergy(item.own_energy_kwh) }}</span>
                    </article>
                </section>

                <p class="tomorrow-weather-link">
                    <button type="button" @click="openWeather">{{ copy.weatherLink }}</button>
                </p>

                <section v-if="hasDeviceInsights" class="tomorrow-devices" aria-labelledby="tomorrow-devices-title">
                    <div class="tomorrow-section-head">
                        <div>
                            <p>{{ copy.consumers }}</p>
                            <h3 id="tomorrow-devices-title">{{ copy.consumersTitle }}</h3>
                        </div>
                        <span>{{ deviceInsightHint }}</span>
                    </div>
                    <div class="tomorrow-device-grid">
                        <article v-if="payload.devices?.heat_pump?.visible" class="tomorrow-device heat-pump">
                            <span>{{ copy.heatPump }}</span>
                            <strong>{{ formatEnergy(selectedDay.heat_pump_kwh) }}</strong>
                            <small>{{ consumerCaption(payload.devices.heat_pump) }}</small>
                        </article>
                        <article v-if="payload.devices?.wallbox?.visible" class="tomorrow-device wallbox">
                            <span>{{ copy.wallbox }}</span>
                            <strong>{{ formatEnergy(selectedDay.wallbox_kwh) }}</strong>
                            <small>{{ consumerCaption(payload.devices.wallbox) }}</small>
                        </article>
                        <article v-if="payload.devices?.heating_rod?.visible" class="tomorrow-device heating-rod">
                            <span>{{ copy.heatingRod }}</span>
                            <strong>{{ formatEnergy(selectedDay.heating_rod_kwh) }}</strong>
                            <small>{{ consumerCaption(payload.devices.heating_rod) }}</small>
                        </article>
                    </div>
                </section>

                <p class="tomorrow-footnote">{{ copy.footnote }}</p>
            </template>
        </section>
    `,
    setup(props, { emit }) {
        const loading = Vue.ref(true);
        const error = Vue.ref("");
        const payload = Vue.reactive({ mode: "unavailable", history: [], kpis: [], devices: {} });
        const selectedDate = Vue.ref("");
        const selectedHour = Vue.ref(12);
        const timelineLoading = Vue.ref(false);
        const timelineError = Vue.ref("");
        let timelineRequest = 0;

        const copy = Vue.computed(() => tomorrowCopy());
        const unavailable = Vue.computed(() => payload.licensed === true && payload.mode !== "live");
        const lockMessage = Vue.computed(() => (
            payload.message_code === "need_seven_days" ? copy.value.needSevenDays : (payload.message || copy.value.needSevenDays)
        ));
        const selectedDay = Vue.computed(() => (
            payload.history.find((day) => day.date === selectedDate.value)
            || payload.history[payload.history.length - 1]
            || {
                date: new Date().toISOString().slice(0, 10),
                story_kind: "unknown",
                quality: "missing",
                autonomy_percent: null,
            }
        ));
        const story = Vue.computed(() => (
            copy.value.stories[selectedDay.value.story_kind]
            || copy.value.stories[tomorrowBand(selectedDay.value)]
            || copy.value.stories.unknown
        ));
        const heroPhotos = TOMORROW_PHASE_IMAGES;
        const timeMachineAvailable = Vue.computed(() => Boolean(
            payload.day_timeline?.qualified && payload.day_timeline?.hours?.length
        ));
        const selectedHourData = Vue.computed(() => (
            payload.day_timeline?.hours?.find((entry) => Number(entry.hour) === Number(selectedHour.value))
            || { hour: selectedHour.value, solar_yield_kwh: null, home_consumption_kwh: null, grid_import_kwh: null, grid_export_kwh: null, quality: "missing" }
        ));
        const selectedHourLabel = Vue.computed(() => `${String(selectedHour.value).padStart(2, "0")}:00`);
        const hasBatterySoc = Vue.computed(() => (
            payload.day_timeline?.hours?.some((entry) => (
                entry.battery_soc_percent !== null
                && entry.battery_soc_percent !== undefined
                && Number.isFinite(Number(entry.battery_soc_percent))
            ))
        ));
        const hasHourlyFlows = Vue.computed(() => (
            selectedHourData.value.solar_to_house_kwh != null
            || selectedHourData.value.battery_to_house_kwh != null
            || selectedHourData.value.grid_to_battery_kwh != null
        ));
        const displayForecastAccuracy = Vue.computed(() => (
            payload.day_timeline?.daily_forecast?.accuracy_percent
        ));
        const hasForecastQuality = Vue.computed(() => (
            displayForecastAccuracy.value != null
            || payload.day_timeline?.daily_forecast?.forecast_kwh != null
        ));
        const forecastQualityDetail = Vue.computed(() => (
            copy.value.hourOf.replace("{value}", formatEnergy(payload.day_timeline?.daily_forecast?.forecast_kwh))
        ));
        const forecastDelta = Vue.computed(() => {
            const delta = payload.day_timeline?.daily_forecast?.delta_kwh;
            if (delta == null || !Number.isFinite(Number(delta))) return "";
            const prefix = Number(delta) > 0 ? "+" : "";
            return `${prefix}${formatEnergy(delta)}`;
        });
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
            copy.value.phases[timePhase.value.replace("phase-", "")]
            || copy.value.phases.night
        ));
        const energyState = Vue.computed(() => {
            if (!timeMachineAvailable.value || selectedHourData.value.quality !== "complete") return "energy-missing";
            if (Number(selectedHourData.value.grid_export_kwh || 0) > 0.01) return "energy-export";
            if (Number(selectedHourData.value.grid_import_kwh || 0) > 0.01) return "energy-import";
            return "energy-balanced";
        });
        const gridFlowLabel = Vue.computed(() => (
            energyState.value === "energy-export" ? copy.value.export : copy.value.import
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
            payload.devices?.heat_pump?.visible
            || payload.devices?.wallbox?.visible
            || payload.devices?.heating_rod?.visible
        ));
        const deviceInsightHint = Vue.computed(() => (
            payload.devices?.heat_pump?.is_demo || payload.devices?.wallbox?.is_demo || payload.devices?.heating_rod?.is_demo
                ? copy.value.demoConsumer
                : copy.value.liveConsumer
        ));
        const calendar = Vue.computed(() => tomorrowCalendar(payload.history));
        const visibleMonths = Vue.computed(() => calendar.value.months);
        const calendarCells = Vue.computed(() => calendar.value.cells);
        const weekdayLabels = Vue.computed(() => calendar.value.weekdayLabels);
        const calendarStyle = Vue.computed(() => ({ "--tomorrow-weeks": String(calendar.value.weeks) }));
        const dayFinance = Vue.computed(() => payload.day_timeline?.finance || {});
        const hasFinance = Vue.computed(() => (
            dayFinance.value.grid_import_cost_ct != null || dayFinance.value.feed_in_revenue_ct != null
        ));
        const hasPeakSolar = Vue.computed(() => selectedDay.value.peak_solar_w != null);
        const hasDayInsights = Vue.computed(() => hasFinance.value || hasPeakSolar.value || hasForecastQuality.value);
        const hasRecords = Vue.computed(() => Boolean(
            payload.records?.best_day || payload.records?.best_week || payload.records?.longest_autonomous_streak
        ));
        const comparisonCards = Vue.computed(() => {
            const items = payload.comparisons || {};
            return [
                { id: "current", label: copy.value.thisMonth, ...items.current_month },
                { id: "previous", label: copy.value.previousMonth, ...items.previous_month },
                { id: "year", label: copy.value.lastYear, ...items.same_month_last_year },
            ].filter((item) => item && item.days);
        });
        const hasComparisons = Vue.computed(() => comparisonCards.value.length > 0);
        const coverageLabel = Vue.computed(() => copy.value.coverage
            .replace("{covered}", String(payload.day_timeline?.coverage_hours ?? 0))
            .replace("{expected}", String(payload.day_timeline?.expected_hours ?? 24)));
        const reasonLabel = Vue.computed(() => (
            copy.value.reasons[payload.day_timeline?.reason] || copy.value.timelineMissing
        ));

        function monthStyle(month) {
            return { gridColumn: String(month.week) };
        }

        function preferredDateFromHash() {
            const value = String(props.initialSection || "");
            return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
        }

        function assignPayload(data, preferredDate = "") {
            Object.keys(payload).forEach((key) => delete payload[key]);
            Object.assign(payload, data || { mode: "unavailable", history: [], kpis: [], devices: {} });
            selectedDate.value = preferredDate && payload.history?.some((day) => day.date === preferredDate)
                ? preferredDate
                : payload.history?.[payload.history.length - 1]?.date || "";
            applyHighlightHour();
        }

        function mergeTimeline(data, preferredDate = "") {
            if (!data) return;
            if (data.day_timeline) payload.day_timeline = data.day_timeline;
            if (data.astronomy) payload.astronomy = data.astronomy;
            if (data.selected_day?.date && Array.isArray(payload.history)) {
                const index = payload.history.findIndex((day) => day.date === data.selected_day.date);
                if (index >= 0) payload.history.splice(index, 1, { ...payload.history[index], ...data.selected_day });
            }
            if (preferredDate) selectedDate.value = preferredDate;
            applyHighlightHour();
        }

        function applyHighlightHour() {
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
                const preferred = preferredDateFromHash();
                const query = preferred ? `?date=${encodeURIComponent(preferred)}` : "";
                const response = await SFMLApi.fetch(
                    `/api/sfml_stats/modern/tomorrow${query}`,
                    { forceRefresh: true, ttl: 0, authenticated: true }
                );
                assignPayload(response?.data || response, preferred);
                if (selectedDate.value) emit("navigate", "tomorrow", selectedDate.value);
            } catch (requestError) {
                error.value = requestError?.message || copy.value.loadError;
            } finally {
                loading.value = false;
            }
        }

        async function loadTimeline(value) {
            const requestId = ++timelineRequest;
            timelineLoading.value = true;
            timelineError.value = "";
            try {
                const query = new URLSearchParams({ date: value, view: "timeline" });
                const response = await SFMLApi.fetch(
                    `/api/sfml_stats/modern/tomorrow?${query.toString()}`,
                    { forceRefresh: true, ttl: 0, authenticated: true }
                );
                if (requestId === timelineRequest) mergeTimeline(response?.data || response, value);
            } catch (requestError) {
                if (requestId === timelineRequest) timelineError.value = requestError?.message || copy.value.hourError;
            } finally {
                if (requestId === timelineRequest) timelineLoading.value = false;
            }
        }

        function selectDay(value) {
            if (!payload.history.some((day) => day.date === value)) return;
            selectedDate.value = value;
            emit("navigate", "tomorrow", value);
            loadTimeline(value);
        }

        function shiftDay(step) {
            const dates = (payload.history || []).map((day) => day.date);
            const index = dates.indexOf(selectedDate.value);
            if (index < 0) return;
            const next = dates[index + step];
            if (next) selectDay(next);
        }

        function handleKeydown(event) {
            if (event.target?.closest?.("input, textarea, select")) return;
            if (event.key === "ArrowLeft") {
                event.preventDefault();
                shiftDay(-1);
            } else if (event.key === "ArrowRight") {
                event.preventDefault();
                shiftDay(1);
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                selectedHour.value = Math.min(23, Number(selectedHour.value) + 1);
            } else if (event.key === "ArrowDown") {
                event.preventDefault();
                selectedHour.value = Math.max(0, Number(selectedHour.value) - 1);
            }
        }

        function formatEnergy(value) {
            if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
            return `${Number(value).toFixed(1)} kWh`;
        }

        function formatPercent(value) {
            if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
            return `${Number(value).toFixed(1)} %`;
        }

        function formatQuality(value) {
            if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
            return `${Number(value).toFixed(1)} %`;
        }

        function formatMoney(value) {
            if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
            return new Intl.NumberFormat(tomorrowLocale(), {
                style: "currency",
                currency: "EUR",
            }).format(Number(value) / 100);
        }

        function formatPrice(value) {
            if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
            return `${Number(value).toFixed(1)} ct`;
        }

        function formatPower(value) {
            if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
            const watts = Number(value);
            return watts >= 1000 ? `${(watts / 1000).toFixed(1)} kW` : `${Math.round(watts)} W`;
        }

        function formatKpi(kpi) {
            if (kpi.value === null || kpi.value === undefined || !Number.isFinite(Number(kpi.value))) return "—";
            return kpi.id === "autonomous_days"
                ? String(Math.round(Number(kpi.value)))
                : Number(kpi.value).toFixed(1);
        }

        function kpiLabel(kpi) {
            return copy.value.kpis[kpi.id] || kpi.label || kpi.id;
        }

        function kpiDetail(kpi) {
            return copy.value.kpiDetails[kpi.detail_code] || kpi.detail || "";
        }

        function kpiUnit(kpi) {
            return copy.value.kpiUnits[kpi.unit] || kpi.unit || "";
        }

        function band(value) {
            return tomorrowBand(typeof value === "object" ? value : { autonomy_percent: value });
        }

        function dayLabel(day) {
            return `${tomorrowDate(day.date, { day: "2-digit", month: "long", year: "numeric" })}: ${formatPercent(day.autonomy_percent)} ${copy.value.autonomy}`;
        }

        function consumerCaption(device) {
            if (!device) return "";
            if (device.is_demo) return copy.value.demoConsumer;
            return copy.value.activeDays.replace("{n}", String(device.active_history_days || 0));
        }

        function openWeather() {
            emit("navigate", "weather_energy", "compare");
        }

        Vue.watch(() => props.initialSection, (value) => {
            if (/^\d{4}-\d{2}-\d{2}$/.test(value) && value !== selectedDate.value && payload.history?.some((day) => day.date === value)) {
                selectDay(value);
            }
        });

        Vue.onMounted(() => {
            load();
            window.addEventListener("keydown", handleKeydown);
        });
        Vue.onUnmounted(() => {
            window.removeEventListener("keydown", handleKeydown);
        });

        return {
            loading, error, payload, unavailable, selectedDate, selectedDay, heroPhotos, copy,
            selectedHour, selectedHourData, selectedHourLabel, timelineLoading, timelineError,
            timeMachineAvailable, timePhase, timePhaseLabel, energyState, gridFlowLabel, gridFlowValue,
            hasBatterySoc, hasHourlyFlows, hasForecastQuality, lockMessage, story,
            displayForecastAccuracy, forecastQualityDetail, forecastDelta,
            selectedDateLong, selectedWeekday, selectedDayNumber, selectedMonthYear,
            hasDeviceInsights, deviceInsightHint, visibleMonths, calendarCells, weekdayLabels,
            calendarStyle, monthStyle, dayFinance, hasFinance, hasPeakSolar, hasDayInsights,
            hasRecords, hasComparisons, comparisonCards, coverageLabel, reasonLabel,
            load, selectDay, formatEnergy, formatMoney, formatPrice, formatPower,
            formatPercent, formatQuality, formatKpi, kpiLabel, kpiDetail, kpiUnit,
            band, dayLabel, consumerCaption, openWeather, tomorrowDate,
        };
    },
};
