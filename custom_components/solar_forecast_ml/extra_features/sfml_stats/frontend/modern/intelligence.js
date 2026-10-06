const {
    ref: iqRef,
    reactive: iqReactive,
    computed: iqComputed,
    onMounted: iqOnMounted,
    onUnmounted: iqOnUnmounted,
    watch: iqWatch,
    nextTick: iqNextTick,
} = Vue;

const IQ_COPY = {
    de: {
        score: "Forecast Health",
        quality30: "Die Prognosegüte der letzten 30 Tage liegt bei {percent} %.",
        quality7: "Prognosegüte 7 Tage",
        quality30Label: "Prognosegüte 30 Tage",
        yesterdayDeviation: "Abweichung gestern",
        publicChartTitle: "Prognose und IST, letzte 30 Tage",
        unavailable: "Noch nicht belastbar",
        validDays: "verwertbare Tage",
        accuracy: "Genauigkeit",
        completeness: "Vollständigkeit",
        period: "Bewertungszeitraum",
        calculated: "Berechnet",
        open: "Analyse öffnen",
        summary: "Executive Summary",
        insights: "Relevante Erkenntnisse",
        noSummary: "Für diesen Zeitraum liegt noch keine belastbare Zusammenfassung vor.",
        noInsights: "Aktuell liegt keine belegbare priorisierte Erkenntnis vor.",
        retry: "Erneut laden",
        tabs: { overview: "Überblick", replay: "Replay", models: "Modelle", calendar: "Qualitätsjahr", milestones: "Meilensteine", trends: "Entwicklung" },
        formula: "Bewertungsmodell",
        formulaName: "Harmonisches Mittel",
        positive: "Stärkster Einfluss",
        negative: "Begrenzender Einfluss",
        minimum: "Mindestbasis",
        days: "Tage",
        morning: "Morning Forecast",
        reforecast: "Reforecast",
        winner: "Gewinner",
        tie: "Gleichstand",
        noBattle: "Für einen belastbaren Vergleich fehlen gemeinsame Modellstunden.",
        commonPoints: "gemeinsame Stunden",
        model: "Modell",
        mae: "MAE",
        rmse: "RMSE",
        bias: "Bias",
        wape: "WAPE",
        hourWins: "Stundensiege",
        dayWins: "Tagessiege",
        timeline: "Tagesentwicklung",
        replayDate: "Tag",
        speed: "Tempo",
        largest: "Größte Abweichung",
        currentHour: "Aktuelle Stunde",
        cumulativeActual: "Ist kumuliert",
        cumulativeForecast: "Forecast kumuliert",
        cumulativeError: "Kumulierte Abweichung",
        absoluteError: "Absolute Abweichung",
        missingActual: "Ist fehlt",
        excluded: "Nicht bewertbar",
        p10Missing: "P10 ist nicht als historische Stundenreihe gespeichert.",
        heatmap: "Forecast-Qualität pro Tag",
        missingDay: "Kein Datensatz",
        insufficientDay: "Datenbasis nicht ausreichend",
        rank: "Rang",
        metric: "Tagesgüte",
        forecast: "Forecast",
        actual: "Ist-Ertrag",
        coverage: "Abdeckung",
        evaluationHours: "Evaluationsstunden",
        milestone: "Meilenstein",
        achieved: "Erreicht",
        inProgress: "In Arbeit",
        trend: "Wochenentwicklung",
        weeks: "Wochen",
        valid: "Verwertbar",
        healthClasses: { excellent: "Exzellent", good: "Gut", moderate: "Moderat", weak: "Schwach", critical: "Kritisch" },
    },
    en: {
        score: "Forecast Health", quality30: "Forecast quality over the last 30 days is {percent}%.", quality7: "Forecast quality, 7 days", quality30Label: "Forecast quality, 30 days", yesterdayDeviation: "Yesterday's deviation", publicChartTitle: "Forecast versus actual, last 30 days", unavailable: "Not reliable yet", validDays: "usable days", accuracy: "Accuracy", completeness: "Completeness", period: "Assessment period", calculated: "Calculated", open: "Open analysis", summary: "Executive Summary", insights: "Relevant insights", noSummary: "No reliable summary is available for this period yet.", noInsights: "There is currently no evidence-based prioritized insight.", retry: "Retry",
        tabs: { overview: "Overview", replay: "Replay", models: "Models", calendar: "Quality year", milestones: "Milestones", trends: "Development" },
        formula: "Assessment model", formulaName: "Harmonic mean", positive: "Strongest influence", negative: "Limiting influence", minimum: "Minimum basis", days: "Days", morning: "Morning Forecast", reforecast: "Reforecast", winner: "Winner", tie: "Tie", noBattle: "There are not enough common model hours for a reliable comparison.", commonPoints: "common hours", model: "Model", mae: "MAE", rmse: "RMSE", bias: "Bias", wape: "WAPE", hourWins: "Hour wins", dayWins: "Day wins", timeline: "Daily development", replayDate: "Day", speed: "Speed", largest: "Largest deviation", currentHour: "Current hour", cumulativeActual: "Cumulative actual", cumulativeForecast: "Cumulative forecast", cumulativeError: "Cumulative deviation", absoluteError: "Absolute deviation", missingActual: "Actual missing", excluded: "Not eligible", p10Missing: "P10 is not stored as a historical hourly series.", heatmap: "Forecast quality by day", missingDay: "No record", insufficientDay: "Insufficient data basis", rank: "Rank", metric: "Daily quality", forecast: "Forecast", actual: "Actual yield", coverage: "Coverage", evaluationHours: "Evaluation hours", milestone: "Milestone", achieved: "Achieved", inProgress: "In progress", trend: "Weekly development", weeks: "weeks", valid: "Usable", healthClasses: { excellent: "Excellent", good: "Good", moderate: "Moderate", weak: "Weak", critical: "Critical" },
    },
    pl: {
        score: "Forecast Health", quality30: "Jakość prognozy z ostatnich 30 dni wynosi {percent}%.", quality7: "Jakość prognozy, 7 dni", quality30Label: "Jakość prognozy, 30 dni", yesterdayDeviation: "Odchylenie z wczoraj", publicChartTitle: "Prognoza i wartość rzeczywista, ostatnie 30 dni", unavailable: "Jeszcze niewiarygodne", validDays: "użyteczne dni", accuracy: "Dokładność", completeness: "Kompletność", period: "Okres oceny", calculated: "Obliczono", open: "Otwórz analizę", summary: "Podsumowanie", insights: "Istotne wnioski", noSummary: "Dla tego okresu nie ma jeszcze wiarygodnego podsumowania.", noInsights: "Obecnie nie ma priorytetowego wniosku opartego na danych.", retry: "Spróbuj ponownie",
        tabs: { overview: "Przegląd", replay: "Replay", models: "Modele", calendar: "Rok jakości", milestones: "Kamienie milowe", trends: "Rozwój" },
        formula: "Model oceny", formulaName: "Średnia harmoniczna", positive: "Najsilniejszy wpływ", negative: "Czynnik ograniczający", minimum: "Minimalna baza", days: "Dni", morning: "Morning Forecast", reforecast: "Reforecast", winner: "Zwycięzca", tie: "Remis", noBattle: "Brakuje wspólnych godzin modeli do wiarygodnego porównania.", commonPoints: "wspólne godziny", model: "Model", mae: "MAE", rmse: "RMSE", bias: "Bias", wape: "WAPE", hourWins: "Wygrane godziny", dayWins: "Wygrane dni", timeline: "Rozwój dzienny", replayDate: "Dzień", speed: "Tempo", largest: "Największe odchylenie", currentHour: "Bieżąca godzina", cumulativeActual: "Suma rzeczywista", cumulativeForecast: "Suma prognozy", cumulativeError: "Odchylenie skumulowane", absoluteError: "Odchylenie bezwzględne", missingActual: "Brak wartości rzeczywistej", excluded: "Poza oceną", p10Missing: "P10 nie jest zapisane jako historyczna seria godzinowa.", heatmap: "Jakość prognozy według dnia", missingDay: "Brak rekordu", insufficientDay: "Niewystarczająca baza danych", rank: "Pozycja", metric: "Jakość dnia", forecast: "Prognoza", actual: "Uzysk rzeczywisty", coverage: "Pokrycie", evaluationHours: "Godziny oceny", milestone: "Kamień milowy", achieved: "Osiągnięto", inProgress: "W toku", trend: "Rozwój tygodniowy", weeks: "tygodni", valid: "Użyteczne", healthClasses: { excellent: "Doskonała", good: "Dobra", moderate: "Umiarkowana", weak: "Słaba", critical: "Krytyczna" },
    },
};

function iqLocale() {
    return ["de", "en", "pl"].includes(window.SFMLI18n?.current)
        ? window.SFMLI18n.current
        : "en";
}

function iqFormatNumber(value, digits = 1) {
    if (value == null || !Number.isFinite(Number(value))) return "–";
    return new Intl.NumberFormat(iqLocale(), {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(Number(value));
}

function iqFormatDate(value, options = { day: "2-digit", month: "short", year: "numeric" }) {
    if (!value) return "–";
    return new Intl.DateTimeFormat(iqLocale(), options).format(new Date(`${value}T12:00:00`));
}

function iqStatement(entry) {
    const locale = iqLocale();
    const score = iqFormatNumber(entry.score);
    if (locale === "de") {
        if (entry.code === "health") return `Der Forecast Health Score liegt bei ${score} Punkten.`;
        if (entry.code === "trend") return `Die Qualität hat sich gegenüber dem vorherigen Zeitraum um ${iqFormatNumber(Math.abs(entry.change))} Punkte ${entry.direction === "up" ? "verbessert" : "verschlechtert"}.`;
        if (entry.code === "largest_day_error") return `Die größte Tagesabweichung lag am ${iqFormatDate(entry.date)} bei ${iqFormatNumber(entry.absolute_error_kwh, 2)} kWh.`;
        if (entry.code === "bias") return entry.direction === "balanced" ? "Im Vergleichszeitraum zeigt sich kein ausgeprägter systematischer Bias." : `Die gespeicherten Daten zeigen überwiegend eine ${entry.direction === "over" ? "Über-" : "Unter"}prognose von ${iqFormatNumber(Math.abs(entry.bias_percent))} %.`;
        if (entry.code === "model_winner") return entry.tie ? `Der Modellvergleich endet auf ${entry.points} gemeinsamen Stunden ohne eindeutigen Gewinner.` : `${String(entry.winner).toUpperCase()} erzielt auf ${entry.points} gemeinsamen Stunden die niedrigste MAE.`;
    }
    if (locale === "pl") {
        if (entry.code === "health") return `Wynik Forecast Health wynosi ${score} punktów.`;
        if (entry.code === "trend") return `Jakość ${entry.direction === "up" ? "wzrosła" : "spadła"} o ${iqFormatNumber(Math.abs(entry.change))} punktu względem poprzedniego okresu.`;
        if (entry.code === "largest_day_error") return `Największe odchylenie dzienne ${iqFormatDate(entry.date)} wyniosło ${iqFormatNumber(entry.absolute_error_kwh, 2)} kWh.`;
        if (entry.code === "bias") return entry.direction === "balanced" ? "W okresie porównawczym nie widać wyraźnego systematycznego biasu." : `Dane wskazują głównie na ${entry.direction === "over" ? "zawyżanie" : "zaniżanie"} prognozy o ${iqFormatNumber(Math.abs(entry.bias_percent))}%.`;
        if (entry.code === "model_winner") return entry.tie ? `Porównanie ${entry.points} wspólnych godzin zakończyło się remisem.` : `${String(entry.winner).toUpperCase()} ma najniższe MAE dla ${entry.points} wspólnych godzin.`;
    }
    if (entry.code === "health") return `The Forecast Health Score is ${score} points.`;
    if (entry.code === "trend") return `Quality ${entry.direction === "up" ? "improved" : "declined"} by ${iqFormatNumber(Math.abs(entry.change))} points versus the previous period.`;
    if (entry.code === "largest_day_error") return `The largest daily deviation was ${iqFormatNumber(entry.absolute_error_kwh, 2)} kWh on ${iqFormatDate(entry.date)}.`;
    if (entry.code === "bias") return entry.direction === "balanced" ? "No pronounced systematic bias is visible in the comparison period." : `Stored data indicates predominantly ${entry.direction === "over" ? "over" : "under"}forecasting by ${iqFormatNumber(Math.abs(entry.bias_percent))}%.`;
    if (entry.code === "model_winner") return entry.tie ? `The model comparison across ${entry.points} common hours has no clear winner.` : `${String(entry.winner).toUpperCase()} has the lowest MAE across ${entry.points} common hours.`;
    return "";
}

function iqInsightText(insight) {
    const locale = iqLocale();
    const value = iqFormatNumber(Math.abs(insight.value));
    const labels = {
        de: {
            health_low: ["Qualität unter Beobachtung", `Der Health Score liegt bei ${value} Punkten.`],
            coverage_low: ["Datenbasis begrenzt", `Nur ${value} % der Produktionsstunden sind belastbar bewertbar.`],
            trend_change: [insight.direction === "up" ? "Positive Entwicklung" : "Negative Entwicklung", `Der Score hat sich um ${value} Punkte ${insight.direction === "up" ? "verbessert" : "verschlechtert"}.`],
            systematic_bias: ["Systematischer Bias", `Der Perioden-Bias beträgt ${iqFormatNumber(insight.value)} %.`],
            model_winner: ["Eindeutiger Modellvorsprung", `${String(insight.winner).toUpperCase()} führt bei der MAE um ${iqFormatNumber(insight.value, 3)} kWh.`],
            quality_strong: ["Stabile Qualität", `Score und Datenabdeckung liegen gemeinsam auf hohem Niveau.`],
            largest_day_error: ["Abweichungsschwerpunkt", `${iqFormatDate(insight.date)}: ${iqFormatNumber(insight.value, 2)} kWh absolute Abweichung.`],
        },
        en: {
            health_low: ["Quality needs attention", `The Health Score is ${value} points.`],
            coverage_low: ["Limited data basis", `Only ${value}% of production hours are reliably evaluable.`],
            trend_change: [insight.direction === "up" ? "Positive development" : "Negative development", `The score ${insight.direction === "up" ? "improved" : "declined"} by ${value} points.`],
            systematic_bias: ["Systematic bias", `The period bias is ${iqFormatNumber(insight.value)}%.`],
            model_winner: ["Clear model lead", `${String(insight.winner).toUpperCase()} leads MAE by ${iqFormatNumber(insight.value, 3)} kWh.`],
            quality_strong: ["Stable quality", "Score and data coverage are both at a high level."],
            largest_day_error: ["Deviation focus", `${iqFormatDate(insight.date)}: ${iqFormatNumber(insight.value, 2)} kWh absolute deviation.`],
        },
        pl: {
            health_low: ["Jakość wymaga uwagi", `Wynik Health wynosi ${value} punktów.`],
            coverage_low: ["Ograniczona baza danych", `Tylko ${value}% godzin produkcji można wiarygodnie ocenić.`],
            trend_change: [insight.direction === "up" ? "Pozytywny rozwój" : "Negatywny rozwój", `Wynik ${insight.direction === "up" ? "wzrósł" : "spadł"} o ${value} punktu.`],
            systematic_bias: ["Systematyczny bias", `Bias okresu wynosi ${iqFormatNumber(insight.value)}%.`],
            model_winner: ["Wyraźna przewaga modelu", `${String(insight.winner).toUpperCase()} prowadzi w MAE o ${iqFormatNumber(insight.value, 3)} kWh.`],
            quality_strong: ["Stabilna jakość", "Wynik i pokrycie danych są na wysokim poziomie."],
            largest_day_error: ["Główne odchylenie", `${iqFormatDate(insight.date)}: ${iqFormatNumber(insight.value, 2)} kWh odchylenia.`],
        },
    };
    return (labels[locale] || labels.en)[insight.id] || [insight.id, ""];
}

function iqSelectPublicSolar(payload, today, yesterday) {
    const candidate = payload?.daily ?? payload?.data?.daily;
    const raw = Array.isArray(candidate) ? candidate : [];
    const rows = raw
        .filter((item) => item && typeof item.date === "string" && item.date)
        .slice()
        .sort((left, right) => (left.date < right.date ? -1 : left.date > right.date ? 1 : 0))
        .slice(-30);
    const row = rows.find((item) => item.date === yesterday)
        || [...rows].reverse().find((item) => item.date < today)
        || null;
    return { rows, row };
}

async function iqFetch(endpoint, forceRefresh = false) {
    const payload = await SFMLApi.fetch(endpoint, { forceRefresh, ttl: 120000 });
    return payload?.data ?? payload;
}

function iqForecastRating(percent, month) {
    const value = Number(percent);
    const seasonMonth = Number(month);
    if (!Number.isFinite(value) || !Number.isInteger(seasonMonth) || seasonMonth < 1 || seasonMonth > 12) return null;
    const summer = seasonMonth >= 4 && seasonMonth <= 9;
    const veryGood = summer ? 85 : 75;
    const good = summer ? 75 : 65;
    const usable = summer ? 65 : 55;
    let rating = "estimate";
    if (value >= veryGood) rating = "veryGood";
    else if (value >= good) rating = "good";
    else if (value >= usable) rating = "usable";
    return { rating, season: summer ? "summer" : "winter" };
}

const IQ_GUIDE = {
    de: {
        title: "So liest du die Prognose",
        fixedTitle: "Feste Tagesprognose",
        fixedText: "SFML legt die Tagesprognose 45 Minuten vor Sonnenaufgang fest und misst die Genauigkeit gegen genau diesen Stand. Dienste wie Solcast oder Forecast.Solar rechnen den ganzen Tag neu. Abends wirken sie dadurch fast perfekt, sind dann aber eher eine Messung als eine Vorhersage. Ein direkter Vergleich ist deshalb nicht fair.",
        dayPartsTitle: "IST bisher und Rest des Tages",
        dayPartsText: "„IST bisher“ ist der heute bereits gemessene Ertrag. „Rest des Tages“ plant die noch offenen Stunden laufend neu und ändert sich deshalb im Tagesverlauf. Die Genauigkeit wird immer gegen die feste Tagesprognose gemessen.",
        p10Title: "P10 – die sichere Bank",
        p10Text: "Mit 90 % Wahrscheinlichkeit wird mindestens dieser Ertrag erreicht. Für kritische Automationen, zum Beispiel das Laden des Akkus aus dem Netz, ist P10 die empfohlene Grundlage.",
        goodTitle: "Wann ist eine Prognose gut?",
        goodText: "Bewertet wird der Durchschnitt über 30 Tage, nicht ein einzelner Tag.",
        colRating: "Einstufung",
        colSummer: "Sommerhalbjahr",
        colWinter: "Winterhalbjahr",
        rows: [
            { id: "veryGood", rating: "Sehr gut", summer: "ab 85 %", winter: "ab 75 %" },
            { id: "good", rating: "Gut", summer: "75–85 %", winter: "65–75 %" },
            { id: "usable", rating: "Brauchbar", summer: "65–75 %", winter: "55–65 %" },
            { id: "estimate", rating: "Eher eine Schätzung", summer: "unter 65 %", winter: "unter 55 %" },
        ],
        rareDays: "Einzelne schwache Tage, etwa bei Hochnebel, gibt es bei jeder Prognose. Entscheidend ist, dass sie selten bleiben.",
        own: "Deine Prognose: {percent} % in den letzten 30 Tagen – {class} ({season}).",
        sources: "Grundlage: Fachliteratur zur Bewertung von Solarprognosen, u. a. Murphy (1993), Weather and Forecasting; Yang et al. (2020), Solar Energy; Antonanzas et al. (2016), Solar Energy; Köhler et al. (2017), Renewable Energy.",
    },
    en: {
        title: "How to read the forecast",
        fixedTitle: "Fixed daily forecast",
        fixedText: "SFML fixes the daily forecast 45 minutes before sunrise and measures accuracy against exactly that version. Services such as Solcast or Forecast.Solar recalculate throughout the day. By evening they therefore look almost perfect, but at that point they are more a measurement than a prediction. A direct comparison is not fair.",
        dayPartsTitle: "Actual so far and rest of day",
        dayPartsText: "“Actual so far” is the yield already measured today. “Rest of day” continuously replans the remaining hours and therefore changes during the day. Accuracy is always measured against the fixed daily forecast.",
        p10Title: "P10 – the safe bet",
        p10Text: "With 90 % probability at least this yield is reached. For critical automations, for example charging the battery from the grid, P10 is the recommended basis.",
        goodTitle: "When is a forecast good?",
        goodText: "It is assessed on the 30-day average, not on a single day.",
        colRating: "Rating",
        colSummer: "Summer half-year",
        colWinter: "Winter half-year",
        rows: [
            { id: "veryGood", rating: "Very good", summer: "from 85 %", winter: "from 75 %" },
            { id: "good", rating: "Good", summer: "75–85 %", winter: "65–75 %" },
            { id: "usable", rating: "Usable", summer: "65–75 %", winter: "55–65 %" },
            { id: "estimate", rating: "Rather an estimate", summer: "below 65 %", winter: "below 55 %" },
        ],
        rareDays: "Single weak days, for example with low stratus, happen with every forecast. What matters is that they stay rare.",
        own: "Your forecast: {percent} % over the last 30 days – {class} ({season}).",
        sources: "Basis: research on solar forecast verification, including Murphy (1993), Weather and Forecasting; Yang et al. (2020), Solar Energy; Antonanzas et al. (2016), Solar Energy; Köhler et al. (2017), Renewable Energy.",
    },
    pl: {
        title: "Jak czytać prognozę",
        fixedTitle: "Stała prognoza dzienna",
        fixedText: "SFML ustala prognozę dzienną 45 minut przed wschodem słońca i mierzy dokładność względem dokładnie tej wersji. Usługi takie jak Solcast lub Forecast.Solar przeliczają ją przez cały dzień. Wieczorem wyglądają przez to niemal idealnie, ale są wtedy raczej pomiarem niż prognozą. Bezpośrednie porównanie nie jest więc uczciwe.",
        dayPartsTitle: "Rzecz. dotąd i reszta dnia",
        dayPartsText: "„Rzecz. dotąd“ to uzysk zmierzony już dziś. „Reszta dnia“ na bieżąco planuje od nowa pozostałe godziny i dlatego zmienia się w ciągu dnia. Dokładność jest zawsze mierzona względem stałej prognozy dziennej.",
        p10Title: "P10 – pewna podstawa",
        p10Text: "Z prawdopodobieństwem 90 % osiągnięty zostanie co najmniej ten uzysk. Dla krytycznych automatyzacji, na przykład ładowania akumulatora z sieci, P10 jest zalecaną podstawą.",
        goodTitle: "Kiedy prognoza jest dobra?",
        goodText: "Ocenie podlega średnia z 30 dni, a nie pojedynczy dzień.",
        colRating: "Ocena",
        colSummer: "Półrocze letnie",
        colWinter: "Półrocze zimowe",
        rows: [
            { id: "veryGood", rating: "Bardzo dobra", summer: "od 85 %", winter: "od 75 %" },
            { id: "good", rating: "Dobra", summer: "75–85 %", winter: "65–75 %" },
            { id: "usable", rating: "Użyteczna", summer: "65–75 %", winter: "55–65 %" },
            { id: "estimate", rating: "Raczej oszacowanie", summer: "poniżej 65 %", winter: "poniżej 55 %" },
        ],
        rareDays: "Pojedyncze słabe dni, na przykład przy niskich chmurach warstwowych, zdarzają się przy każdej prognozie. Ważne, aby pozostawały rzadkie.",
        own: "Twoja prognoza: {percent} % w ostatnich 30 dniach – {class} ({season}).",
        sources: "Podstawa: literatura naukowa dotycząca oceny prognoz solarnych, m.in. Murphy (1993), Weather and Forecasting; Yang et al. (2020), Solar Energy; Antonanzas et al. (2016), Solar Energy; Köhler et al. (2017), Renewable Energy.",
    },
};

const ModernForecastGuide = {
    props: {
        percent: { default: undefined },
    },
    template: `
        <section class="iq-guide" aria-labelledby="iq-guide-title">
            <h2 id="iq-guide-title">{{ copy.title }}</h2>
            <section>
                <h3>{{ copy.fixedTitle }}</h3>
                <p>{{ copy.fixedText }}</p>
            </section>
            <section>
                <h3>{{ copy.dayPartsTitle }}</h3>
                <p>{{ copy.dayPartsText }}</p>
            </section>
            <section>
                <h3>{{ copy.p10Title }}</h3>
                <p>{{ copy.p10Text }}</p>
            </section>
            <section>
                <h3>{{ copy.goodTitle }}</h3>
                <p>{{ copy.goodText }}</p>
                <div class="iq-guide-table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">{{ copy.colRating }}</th>
                                <th scope="col">{{ copy.colSummer }}</th>
                                <th scope="col">{{ copy.colWinter }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="row in copy.rows" :key="row.id">
                                <th scope="row">{{ row.rating }}</th>
                                <td>{{ row.summer }}</td>
                                <td>{{ row.winter }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p>{{ copy.rareDays }}</p>
                <p v-if="ownLine">{{ ownLine }}</p>
            </section>
            <p class="iq-guide-sources">{{ copy.sources }}</p>
        </section>
    `,
    setup(props) {
        const copy = IQ_GUIDE[iqLocale()] || IQ_GUIDE.en;
        const fetched = iqRef(undefined);
        const accuracy = iqComputed(() => {
            const source = props.percent !== undefined ? props.percent : fetched.value;
            const value = Number(source);
            return Number.isFinite(value) ? value : null;
        });
        const ownLine = iqComputed(() => {
            if (accuracy.value == null) return "";
            const rated = iqForecastRating(accuracy.value, new Date().getMonth() + 1);
            if (!rated) return "";
            const label = copy.rows.find((row) => row.id === rated.rating);
            const season = rated.season === "summer" ? copy.colSummer : copy.colWinter;
            return copy.own
                .replace("{percent}", new Intl.NumberFormat(iqLocale(), { maximumFractionDigits: 1 }).format(accuracy.value))
                .replace("{class}", label ? label.rating : "")
                .replace("{season}", season);
        });

        iqOnMounted(async () => {
            if (props.percent !== undefined) return;
            try {
                const dashboard = await iqFetch("/api/sfml_stats/modern/dashboard?days=30");
                fetched.value = dashboard?.health?.accuracy ?? null;
            } catch (_error) {
                fetched.value = null;
            }
        });

        return { copy, ownLine };
    },
};

const ModernIntelligenceOverview = {
    emits: ["navigate"],
    template: `
        <section class="iq-dashboard" aria-labelledby="iq-health-title">
            <div v-if="loading" class="iq-loading" role="status"><span class="loading-indicator"></span></div>
            <div v-else-if="error" class="iq-error" role="alert">
                <strong>{{ error }}</strong>
                <button class="button secondary" type="button" @click="load(true)">{{ copy.retry }}</button>
            </div>
            <template v-else-if="dashboard">
                <div class="iq-health-band" :class="healthClass">
                    <button class="iq-score-command" type="button" @click="open('overview')">
                        <span class="iq-kicker" id="iq-health-title">{{ copy.score }}</span>
                        <span v-if="health.available" class="iq-score-value">{{ format(health.score) }}<small>/100</small></span>
                        <span v-else class="iq-score-unavailable">{{ copy.unavailable }}</span>
                        <span class="iq-score-class">{{ healthLabel }}</span>
                    </button>
                    <div class="iq-component-stack">
                        <div v-for="component in health.components || []" :key="component.id" class="iq-component">
                            <div><span>{{ componentLabel(component.id) }}</span><strong>{{ format(component.value) }}%</strong></div>
                            <div class="iq-progress" aria-hidden="true"><i :style="{ width: component.value + '%' }"></i></div>
                        </div>
                        <div class="iq-period-meta">
                            <span>{{ copy.period }} {{ formatDate(health.period?.start) }} – {{ formatDate(health.period?.end) }}</span>
                            <span>{{ health.valid_days || 0 }} {{ copy.validDays }}</span>
                        </div>
                    </div>
                    <button class="button primary iq-open" type="button" @click="open('overview')">
                        {{ copy.open }}
                        <span aria-hidden="true">→</span>
                    </button>
                </div>

                <div class="iq-dashboard-grid">
                    <section class="iq-summary-block">
                        <h2>{{ copy.summary }}</h2>
                        <ul>
                            <li v-for="(entry, index) in dashboard.executive_summary" :key="entry.code + index">
                                {{ statement(entry) }}
                            </li>
                        </ul>
                        <p v-if="!dashboard.executive_summary.length" class="iq-empty-copy">{{ copy.noSummary }}</p>
                    </section>
                    <section class="iq-insights-block">
                        <h2>{{ copy.insights }}</h2>
                        <div class="iq-insight-list">
                            <button v-for="insight in dashboard.insights" :key="insight.id"
                                    class="iq-insight" :class="'severity-' + insight.severity"
                                    type="button" @click="open(insight.target)">
                                <span class="iq-severity-dot"></span>
                                <span><strong>{{ insightText(insight)[0] }}</strong><small>{{ insightText(insight)[1] }}</small></span>
                                <span aria-hidden="true">→</span>
                            </button>
                        </div>
                        <p v-if="!dashboard.insights.length" class="iq-empty-copy">{{ copy.noInsights }}</p>
                    </section>
                </div>
            </template>
        </section>
    `,
    setup(_, { emit }) {
        const locale = iqLocale();
        const copy = IQ_COPY[locale] || IQ_COPY.en;
        const dashboard = iqRef(null);
        const loading = iqRef(true);
        const error = iqRef("");
        const health = iqComputed(() => dashboard.value?.health || {});
        const healthClass = iqComputed(() => health.value.class ? `health-${health.value.class}` : "health-unavailable");
        const healthLabel = iqComputed(() => health.value.class ? copy.healthClasses[health.value.class] : copy.unavailable);

        async function load(forceRefresh = false) {
            loading.value = true;
            error.value = "";
            try {
                dashboard.value = await iqFetch("/api/sfml_stats/modern/dashboard?days=14", forceRefresh);
            } catch (err) {
                console.error("[SFML Stats] Forecast intelligence unavailable", err);
                error.value = copy.unavailable;
            } finally {
                loading.value = false;
            }
        }

        function componentLabel(id) {
            return id === "accuracy" ? copy.accuracy : copy.completeness;
        }

        function open(section) {
            emit("navigate", "quality", section || "overview");
        }

        iqOnMounted(load);
        return { copy, dashboard, loading, error, health, healthClass, healthLabel, load, open, componentLabel, format: iqFormatNumber, formatDate: iqFormatDate, statement: iqStatement, insightText: iqInsightText };
    },
};

const ModernQualityPage = {
    props: {
        initialSection: { type: String, default: "" },
    },
    template: `
        <div class="iq-lab">
            <div v-if="devOn" class="iq-tabs" role="tablist" :aria-label="copy.score">
                <button v-for="tab in tabs" :key="tab" type="button" role="tab"
                        :aria-selected="activeSection === tab"
                        :class="{ active: activeSection === tab }"
                        @click="selectSection(tab)">{{ copy.tabs[tab] }}</button>
            </div>

            <div v-if="loading[activeSection]" class="iq-section-loading" role="status"><span class="loading-indicator"></span></div>
            <div v-else-if="errors[activeSection]" class="iq-error" role="alert">
                <strong>{{ errors[activeSection] }}</strong>
                <button class="button secondary" type="button" @click="loadSection(activeSection, true)">{{ copy.retry }}</button>
            </div>

            <section v-else-if="activeSection === 'overview' && !devOn" class="iq-detail-section iq-public-results">
                <div class="iq-definition-grid">
                    <article>
                        <span>{{ copy.quality7 }}</span>
                        <strong>{{ format(publicQuality7) }}%</strong>
                    </article>
                    <article>
                        <span>{{ copy.quality30Label }}</span>
                        <strong>{{ format(publicQuality30) }}%</strong>
                    </article>
                    <article>
                        <span>{{ copy.yesterdayDeviation }}</span>
                        <strong>{{ signed(publicYesterdayKwh, 2) }} kWh</strong>
                        <small>{{ signed(publicYesterdayPercent) }}%</small>
                    </article>
                </div>
                <h2 class="iq-kicker">{{ copy.publicChartTitle }}</h2>
                <div ref="publicChart" class="iq-chart iq-public-chart" role="img" :aria-label="copy.publicChartTitle"></div>
                <modern-forecast-guide :percent="publicQuality30"></modern-forecast-guide>
            </section>
            <section v-else-if="activeSection === 'overview' && dashboard" class="iq-detail-section">
                <div class="iq-detail-hero" :class="'health-' + (dashboard.health.class || 'unavailable')">
                    <div><span class="iq-kicker">{{ copy.score }}</span><strong>{{ dashboard.health.available ? format(dashboard.health.score) : '–' }}</strong><small>/100 · {{ healthLabel(dashboard.health.class) }}</small></div>
                    <div class="iq-detail-components">
                        <div v-for="component in dashboard.health.components || []" :key="component.id">
                            <span>{{ component.id === 'accuracy' ? copy.accuracy : copy.completeness }}</span>
                            <strong>{{ format(component.value) }}%</strong>
                        </div>
                    </div>
                </div>
                <div class="iq-definition-grid">
                    <article><span>{{ copy.formula }}</span><strong>{{ copy.formulaName }}</strong><small>2 × A × C ÷ (A + C)</small></article>
                    <article><span>{{ copy.positive }}</span><strong>{{ dashboard.health.positive_influence === 'accuracy' ? copy.accuracy : copy.completeness }}</strong><small>{{ format(componentValue(dashboard.health.positive_influence)) }}%</small></article>
                    <article><span>{{ copy.negative }}</span><strong>{{ dashboard.health.negative_influence === 'accuracy' ? copy.accuracy : copy.completeness }}</strong><small>{{ format(componentValue(dashboard.health.negative_influence)) }}%</small></article>
                    <article><span>{{ copy.minimum }}</span><strong>{{ dashboard.health.minimum_valid_days }} {{ copy.validDays }}</strong><small>{{ dashboard.health.valid_days }} {{ copy.valid }}</small></article>
                </div>
                <div class="iq-summary-detail">
                    <h2>{{ copy.summary }}</h2>
                    <ol><li v-for="(entry, index) in dashboard.executive_summary" :key="index">{{ statement(entry) }}</li></ol>
                    <p v-if="!dashboard.executive_summary.length" class="iq-empty-copy">{{ copy.noSummary }}</p>
                </div>
            </section>

            <section v-else-if="activeSection === 'replay' && replay" class="iq-detail-section">
                <div class="iq-toolbar">
                    <label>{{ copy.replayDate }}<input type="date" v-model="replayDate" @change="loadReplay(true)"></label>
                    <div class="iq-playback-controls">
                        <button class="icon-button" type="button" :title="playing ? 'Pause' : 'Play'" :aria-label="playing ? 'Pause' : 'Play'" @click="togglePlayback"><ui-icon :name="playing ? 'pause' : 'play'"></ui-icon></button>
                        <button class="icon-button" type="button" title="Restart" aria-label="Restart" @click="restartReplay"><ui-icon name="restart"></ui-icon></button>
                        <button class="button secondary" type="button" @click="jumpBiggest"><ui-icon name="target" :size="17"></ui-icon>{{ copy.largest }}</button>
                    </div>
                    <label>{{ copy.speed }}<select v-model.number="playbackSpeed"><option :value="0.5">0.5×</option><option :value="1">1×</option><option :value="2">2×</option><option :value="4">4×</option></select></label>
                </div>
                <input class="iq-timeline" type="range" min="0" :max="Math.max(0, replay.hours.length - 1)" v-model.number="activeHourIndex" @input="pausePlayback">
                <div class="iq-series-controls">
                    <label v-for="series in replaySeries" :key="series.id" :class="{ disabled: !replay.series_available?.[series.id] }"><input type="checkbox" v-model="visibleSeries[series.id]" :disabled="!replay.series_available?.[series.id]">{{ series.label }}</label>
                </div>
                <div ref="replayChart" class="iq-chart iq-replay-chart" role="img" :aria-label="copy.tabs.replay"></div>
                <div v-if="currentReplayHour" class="iq-replay-readout">
                    <article><span>{{ copy.currentHour }}</span><strong>{{ String(currentReplayHour.hour).padStart(2, '0') }}:00</strong><small>{{ hourState(currentReplayHour) }}</small></article>
                    <article><span>{{ copy.cumulativeActual }}</span><strong>{{ format(currentReplayHour.cumulative_actual_kwh, 2) }} kWh</strong></article>
                    <article><span>{{ copy.cumulativeForecast }}</span><strong>{{ format(currentReplayHour.cumulative_final_kwh, 2) }} kWh</strong></article>
                    <article><span>{{ copy.cumulativeError }}</span><strong :class="signedClass(currentReplayHour.cumulative_error_kwh)">{{ signed(currentReplayHour.cumulative_error_kwh, 2) }} kWh</strong></article>
                    <article><span>{{ copy.absoluteError }}</span><strong>{{ format(currentReplayHour.absolute_error_kwh, 3) }} kWh</strong></article>
                </div>
                <div class="iq-data-note"><ui-icon name="quality" :size="17"></ui-icon>{{ copy.p10Missing }}</div>
            </section>

            <section v-else-if="activeSection === 'models' && models" class="iq-detail-section">
                <div class="iq-toolbar">
                    <div class="iq-segmented"><button v-for="days in [7, 30, 90]" :key="days" type="button" :class="{ active: modelDays === days }" @click="setModelDays(days)">{{ days }} {{ copy.days }}</button></div>
                    <div class="iq-segmented"><button type="button" :class="{ active: modelMode === 'morning' }" @click="setModelMode('morning')">{{ copy.morning }}</button><button type="button" :class="{ active: modelMode === 'reforecast' }" @click="setModelMode('reforecast')">{{ copy.reforecast }}</button></div>
                </div>
                <div v-if="!models.available" class="iq-empty"><strong>{{ copy.noBattle }}</strong><span>{{ models.common_points || 0 }} / {{ models.minimum_points || 24 }} {{ copy.commonPoints }}</span></div>
                <template v-else>
                    <div class="iq-battle-result">
                        <span>{{ models.tie ? copy.tie : copy.winner }}</span>
                        <strong>{{ models.tie ? copy.tie : String(models.winner).toUpperCase() }}</strong>
                        <small>{{ models.common_points }} {{ copy.commonPoints }} · {{ models.common_days }} {{ copy.validDays }}</small>
                    </div>
                    <div class="iq-table-wrap"><table class="iq-model-table"><thead><tr><th>#</th><th>{{ copy.model }}</th><th>{{ copy.mae }}</th><th>{{ copy.rmse }}</th><th>{{ copy.bias }}</th><th>{{ copy.wape }}</th><th>{{ copy.hourWins }}</th><th>{{ copy.dayWins }}</th></tr></thead><tbody><tr v-for="(model, index) in models.ranking" :key="model"><td>{{ index + 1 }}</td><th>{{ model.toUpperCase() }}</th><td>{{ format(models.metrics[model].mae_kwh, 3) }} kWh</td><td>{{ format(models.metrics[model].rmse_kwh, 3) }} kWh</td><td :class="signedClass(models.metrics[model].bias_kwh)">{{ signed(models.metrics[model].bias_kwh, 3) }} kWh</td><td>{{ format(models.metrics[model].wape_percent) }}%</td><td>{{ models.metrics[model].hour_wins }}</td><td>{{ models.metrics[model].day_wins }}</td></tr></tbody></table></div>
                    <h2>{{ copy.timeline }}</h2>
                    <div ref="modelChart" class="iq-chart" role="img" :aria-label="copy.timeline"></div>
                </template>
            </section>

            <section v-else-if="activeSection === 'calendar' && heatmap" class="iq-detail-section">
                <div class="iq-section-heading"><div><span class="iq-kicker">{{ heatmap.period?.start }} – {{ heatmap.period?.end }}</span><h2>{{ copy.heatmap }}</h2></div><strong>{{ heatmap.valid_days }} {{ copy.validDays }}</strong></div>
                <div class="iq-heatmap-scroll">
                    <div class="iq-heatmap-canvas" :style="heatmapCanvasStyle">
                        <div class="iq-month-labels" aria-hidden="true">
                            <span v-for="month in heatmapMonths" :key="month.key" :style="heatmapMonthStyle(month)">{{ month.label }}</span>
                        </div>
                        <div class="iq-heatmap" role="grid">
                            <span v-for="blank in heatmapOffset" :key="'blank-' + blank" class="iq-heat-blank"></span>
                            <button v-for="day in heatmap.days" :key="day.date" type="button" role="gridcell"
                                    class="iq-heat-cell" :class="heatClass(day)"
                                    :title="heatTitle(day)" :aria-label="heatTitle(day)"
                                    @click="selectHeatDay(day)"></button>
                        </div>
                    </div>
                </div>
                <div class="iq-heat-legend"><span class="state-missing">{{ copy.missingDay }}</span><span class="quality-critical">0–39</span><span class="quality-weak">40–59</span><span class="quality-moderate">60–74</span><span class="quality-good">75–89</span><span class="quality-excellent">90–100</span></div>
                <div v-if="selectedHeatDay" class="iq-day-detail">
                    <div><span>{{ formatDate(selectedHeatDay.date) }}</span><strong v-if="selectedHeatDay.state === 'valid'">{{ format(selectedHeatDay.quality) }}%</strong><strong v-else>{{ selectedHeatDay.state === 'missing' ? copy.missingDay : copy.insufficientDay }}</strong></div>
                    <dl v-if="selectedHeatDay.state !== 'missing'"><div><dt>{{ copy.forecast }}</dt><dd>{{ format(selectedHeatDay.forecast_kwh, 2) }} kWh</dd></div><div><dt>{{ copy.actual }}</dt><dd>{{ format(selectedHeatDay.actual_kwh, 2) }} kWh</dd></div><div><dt>{{ copy.absoluteError }}</dt><dd>{{ format(selectedHeatDay.absolute_error_kwh, 2) }} kWh</dd></div><div><dt>{{ copy.coverage }}</dt><dd>{{ format(selectedHeatDay.completeness) }}%</dd></div><div><dt>{{ copy.evaluationHours }}</dt><dd>{{ selectedHeatDay.evaluation_hours }}</dd></div><div><dt>{{ copy.rank }}</dt><dd>{{ selectedHeatDay.rank ? selectedHeatDay.rank + ' / ' + selectedHeatDay.rank_basis : '–' }}</dd></div></dl>
                </div>
            </section>

            <section v-else-if="activeSection === 'milestones' && milestones" class="iq-detail-section">
                <div class="iq-section-heading"><div><span class="iq-kicker">{{ milestones.period?.start }} – {{ milestones.period?.end }}</span><h2>{{ copy.tabs.milestones }}</h2></div><strong>{{ milestones.valid_days }} {{ copy.validDays }}</strong></div>
                <div class="iq-milestone-grid">
                    <article v-for="milestone in milestones.milestones" :key="milestone.id" class="iq-milestone" :class="milestone.status">
                        <ui-icon :name="milestone.status === 'achieved' ? 'trophy' : 'trend'" :size="20"></ui-icon>
                        <span>{{ milestoneLabel(milestone) }}</span>
                        <strong>{{ milestoneValue(milestone) }}</strong>
                        <small>{{ milestone.status === 'achieved' ? copy.achieved : copy.inProgress }}</small>
                        <div v-if="milestone.target" class="iq-progress"><i :style="{ width: Math.min(100, milestone.value / milestone.target * 100) + '%' }"></i></div>
                    </article>
                </div>
            </section>

            <section v-else-if="activeSection === 'trends' && trends" class="iq-detail-section">
                <div class="iq-section-heading"><div><span class="iq-kicker">{{ trends.period?.start }} – {{ trends.period?.end }}</span><h2>{{ copy.trend }}</h2></div><strong>{{ trends.points.length }} {{ copy.weeks }}</strong></div>
                <div ref="trendChart" class="iq-chart iq-trend-chart" role="img" :aria-label="copy.trend"></div>
                <div class="iq-table-wrap"><table class="iq-model-table"><thead><tr><th>{{ copy.period }}</th><th>{{ copy.score }}</th><th>{{ copy.accuracy }}</th><th>{{ copy.completeness }}</th><th>{{ copy.mae }}</th><th>{{ copy.bias }}</th><th>{{ copy.validDays }}</th></tr></thead><tbody><tr v-for="point in trends.points" :key="point.period"><th>{{ point.period }}</th><td>{{ format(point.health_score) }}</td><td>{{ format(point.accuracy) }}%</td><td>{{ format(point.completeness) }}%</td><td>{{ format(point.mae_kwh, 3) }} kWh</td><td :class="signedClass(point.bias_kwh)">{{ signed(point.bias_kwh, 3) }} kWh</td><td>{{ point.valid_days }}</td></tr></tbody></table></div>
            </section>
        </div>
    `,
    setup(props) {
        const locale = iqLocale();
        const copy = IQ_COPY[locale] || IQ_COPY.en;
        const devOn = iqComputed(() => window.sfmlDevState?.active === true);
        const allTabs = ["overview", "replay", "models", "calendar", "milestones", "trends"];
        const tabs = iqComputed(() => (
            devOn.value ? allTabs : ["overview"]
        ));
        const quality30Sentence = iqComputed(() => {
            const accuracy = dashboard.value?.health?.accuracy;
            const value = Number(accuracy);
            if (!Number.isFinite(value)) return copy.unavailable;
            return copy.quality30.replace("{percent}", value.toFixed(0));
        });
        const initial = allTabs.includes(props.initialSection) && (props.initialSection === "overview" || window.sfmlDevState?.active === true)
            ? props.initialSection
            : "overview";
        const activeSection = iqRef(initial);
        const loading = iqReactive({});
        const errors = iqReactive({});
        const dashboard = iqRef(null);
        const replay = iqRef(null);
        const models = iqRef(null);
        const heatmap = iqRef(null);
        const milestones = iqRef(null);
        const trends = iqRef(null);
        const replayDate = iqRef("");
        const activeHourIndex = iqRef(0);
        const playing = iqRef(false);
        const playbackSpeed = iqRef(1);
        const replayChart = iqRef(null);
        const modelChart = iqRef(null);
        const trendChart = iqRef(null);
        const publicChart = iqRef(null);
        const publicQuality7 = iqRef(null);
        const publicQuality30 = iqRef(null);
        const publicYesterdayKwh = iqRef(null);
        const publicYesterdayPercent = iqRef(null);
        const publicSeries = iqRef([]);
        const modelDays = iqRef(30);
        const modelMode = iqRef("morning");
        const selectedHeatDay = iqRef(null);
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const visibleSeries = iqReactive({ actual: true, final: true, physics: true, ai: true, reforecast: true });
        const replaySeries = iqComputed(() => [
            { id: "actual", label: copy.actual },
            { id: "final", label: "Final" },
            { id: "physics", label: "Physics" },
            { id: "ai", label: "AI" },
            { id: "reforecast", label: copy.reforecast },
        ]);
        const currentReplayHour = iqComputed(() => replay.value?.hours?.[activeHourIndex.value] || null);
        const heatmapOffset = iqComputed(() => {
            const first = heatmap.value?.days?.[0]?.date;
            if (!first) return 0;
            return (new Date(`${first}T12:00:00`).getDay() + 6) % 7;
        });
        const heatmapMonths = iqComputed(() => {
            const seen = new Set();
            const labels = (heatmap.value?.days || []).filter((day) => {
                const key = day.date.slice(0, 7);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            }).map((day) => ({
                key: day.date.slice(0, 7),
                label: iqFormatDate(day.date, { month: "short" }),
                week: Math.floor((heatmapOffset.value + (heatmap.value.days || []).findIndex((item) => item.date === day.date)) / 7) + 1,
            }));
            const labelsPerWeek = new Map();
            return labels.map((month) => {
                const row = (labelsPerWeek.get(month.week) || 0) + 1;
                labelsPerWeek.set(month.week, row);
                return { ...month, row };
            });
        });
        const heatmapWeeks = iqComputed(() => Math.max(1, Math.ceil((heatmapOffset.value + (heatmap.value?.days?.length || 0)) / 7)));
        const heatmapLabelRows = iqComputed(() => Math.max(1, ...heatmapMonths.value.map((month) => month.row)));
        const heatmapCanvasStyle = iqComputed(() => ({
            "--iq-heatmap-weeks": heatmapWeeks.value,
            "--iq-month-label-rows": heatmapLabelRows.value,
            "--iq-heatmap-width": `${heatmapWeeks.value * 17 - 3}px`,
        }));
        let replayTimer = null;
        let replayChartInstance = null;
        let modelChartInstance = null;
        let trendChartInstance = null;
        let publicChartInstance = null;
        let publicChartTimer = null;

        function selectSection(section) {
            if (!tabs.value.includes(section)) return;
            activeSection.value = section;
            window.location.hash = `quality/${section}`;
        }

        async function loadSection(section, forceRefresh = false) {
            loading[section] = true;
            errors[section] = "";
            try {
                await SFMLApi.ensureDevMode();
                if (section === "overview" && !devOn.value) {
                    const [dash30, dash7, solar] = await Promise.allSettled([
                        iqFetch("/api/sfml_stats/modern/dashboard?days=30", forceRefresh),
                        iqFetch("/api/sfml_stats/modern/dashboard?days=7", forceRefresh),
                        iqFetch("/api/sfml_stats/solar?days=30", forceRefresh),
                    ]);
                    dashboard.value = dash30.status === "fulfilled" ? dash30.value : null;
                    publicQuality30.value = dashboard.value?.health?.accuracy ?? null;
                    publicQuality7.value = dash7.status === "fulfilled" ? (dash7.value?.health?.accuracy ?? null) : null;
                    if (solar.status === "fulfilled") applyPublicSolar(solar.value);
                    if (!dashboard.value && !publicSeries.value.length && publicQuality7.value == null) {
                        throw new Error("public_overview_empty");
                    }
                } else if (section === "overview") {
                    const days = 14;
                    dashboard.value = await iqFetch(`/api/sfml_stats/modern/dashboard?days=${days}`, forceRefresh);
                }
                if (!devOn.value && section !== "overview") return;
                if (section === "replay") await loadReplay(forceRefresh);
                if (section === "models") await loadModels(forceRefresh);
                if (section === "calendar") {
                    heatmap.value = await iqFetch("/api/sfml_stats/modern/heatmap?days=365", forceRefresh);
                    selectedHeatDay.value = [...(heatmap.value.days || [])].reverse().find((day) => day.state !== "missing") || null;
                }
                if (section === "milestones") milestones.value = await iqFetch("/api/sfml_stats/modern/milestones?days=365", forceRefresh);
                if (section === "trends") trends.value = await iqFetch("/api/sfml_stats/modern/trends?days=365", forceRefresh);
            } catch (err) {
                console.error(`[SFML Stats] Intelligence section ${section} failed`, err);
                errors[section] = copy.unavailable;
            } finally {
                loading[section] = false;
                await iqNextTick();
                renderActiveChart();
            }
        }

        async function loadReplay(forceRefresh = false) {
            pausePlayback();
            const query = replayDate.value ? `?date=${encodeURIComponent(replayDate.value)}` : "";
            replay.value = await iqFetch(`/api/sfml_stats/modern/replay${query}`, forceRefresh);
            replayDate.value = replay.value.date || replayDate.value;
            activeHourIndex.value = Math.max(0, (replay.value.hours || []).length - 1);
        }

        async function loadModels(forceRefresh = false) {
            models.value = await iqFetch(`/api/sfml_stats/modern/models?days=${modelDays.value}&mode=${modelMode.value}`, forceRefresh);
        }

        function setModelDays(days) {
            modelDays.value = days;
            loadModels(true).then(() => iqNextTick(renderModelChart));
        }

        function setModelMode(mode) {
            modelMode.value = mode;
            loadModels(true).then(() => iqNextTick(renderModelChart));
        }

        function chartSeries(name, key, color) {
            const rows = (replay.value?.hours || []).slice(0, activeHourIndex.value + 1);
            return {
                name,
                type: "line",
                data: rows.map((row) => [row.hour, row[key]]),
                connectNulls: false,
                showSymbol: rows.length < 12,
                lineStyle: { width: key === "actual" || key === "final" ? 2.5 : 1.7, color },
                itemStyle: { color },
                animation: !reducedMotion,
            };
        }

        function renderReplayChart() {
            if (!replayChart.value || !replay.value?.available) return;
            replayChartInstance ||= echarts.init(replayChart.value);
            const compact = replayChart.value.clientWidth < 520;
            const definitions = [
                [copy.actual, "actual", "#2f8f5b"], ["Final", "final", "#168f87"],
                ["Physics", "physics", "#c47a20"], ["AI", "ai", "#3d73b9"],
                [copy.reforecast, "reforecast", "#c65353"],
            ];
            replayChartInstance.setOption({
                animation: !reducedMotion,
                tooltip: { trigger: "axis" },
                legend: { type: "scroll" },
                grid: { left: 18, right: 20, top: 52, bottom: 26, containLabel: true },
                xAxis: { type: "value", min: 0, max: 23, interval: compact ? 4 : 2, axisLabel: { formatter: (value) => `${String(value).padStart(2, "0")}:00` } },
                yAxis: { type: "value", name: "kWh", min: 0 },
                series: definitions.filter(([, key]) => replay.value.series_available[key] && visibleSeries[key]).map(([name, key, color]) => chartSeries(name, key, color)),
            }, true);
        }

        function renderModelChart() {
            if (!modelChart.value || !models.value?.available) return;
            modelChartInstance ||= echarts.init(modelChart.value);
            const modelKeys = models.value.ranking;
            modelChartInstance.setOption({
                tooltip: { trigger: "axis" }, legend: {},
                grid: { left: 18, right: 20, top: 48, bottom: 28, containLabel: true },
                xAxis: { type: "category", data: models.value.daily_results.map((day) => day.date.slice(5)) },
                yAxis: { type: "value", name: "MAE kWh", min: 0 },
                series: modelKeys.map((key) => ({ name: key.toUpperCase(), type: "line", data: models.value.daily_results.map((day) => day.mae_kwh[key]), connectNulls: false, showSymbol: false, animation: !reducedMotion })),
            }, true);
        }

        function renderTrendChart() {
            if (!trendChart.value || !trends.value?.points?.length) return;
            trendChartInstance ||= echarts.init(trendChart.value);
            trendChartInstance.setOption({
                tooltip: { trigger: "axis" }, legend: {},
                grid: { left: 18, right: 24, top: 48, bottom: 30, containLabel: true },
                xAxis: { type: "category", data: trends.value.points.map((point) => point.period.replace(/^\d{4}-/, "")) },
                yAxis: [{ type: "value", min: 0, max: 100, name: "%" }, { type: "value", min: 0, name: "MAE kWh" }],
                series: [
                    { name: copy.score, type: "line", data: trends.value.points.map((point) => point.health_score), showSymbol: false, lineStyle: { width: 3 }, animation: !reducedMotion },
                    { name: copy.completeness, type: "line", data: trends.value.points.map((point) => point.completeness), showSymbol: false, animation: !reducedMotion },
                    { name: copy.mae, type: "bar", yAxisIndex: 1, data: trends.value.points.map((point) => point.mae_kwh), animation: !reducedMotion },
                ],
            }, true);
        }

        function localDayKey(date) {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, "0");
            const d = String(date.getDate()).padStart(2, "0");
            return `${y}-${m}-${d}`;
        }

        function applyPublicSolar(payload) {
            const today = localDayKey(new Date());
            const yesterday = localDayKey(new Date(Date.now() - 86400000));
            const selected = iqSelectPublicSolar(payload, today, yesterday);
            const overall = selected.row?.overall || {};
            const actual = Number(overall.actual_total_kwh);
            const forecast = Number(overall.predicted_total_kwh);
            if (Number.isFinite(actual) && Number.isFinite(forecast)) {
                publicYesterdayKwh.value = actual - forecast;
                publicYesterdayPercent.value = Math.abs(forecast) > 0.05
                    ? ((actual - forecast) / forecast) * 100
                    : null;
            } else {
                publicYesterdayKwh.value = null;
                publicYesterdayPercent.value = null;
            }
            publicSeries.value = selected.rows;
        }

        function renderPublicChart() {
            const host = publicChart.value;
            if (devOn.value || !host || host.clientWidth <= 0 || !publicSeries.value.length || !window.echarts) return false;
            if (publicChartInstance && publicChartInstance.getDom() !== host) {
                publicChartInstance.dispose();
                publicChartInstance = null;
            }
            publicChartInstance ||= echarts.init(host);
            const rows = publicSeries.value;
            publicChartInstance.setOption({
                tooltip: { trigger: "axis" },
                legend: {},
                grid: { left: 18, right: 20, top: 48, bottom: 28, containLabel: true },
                xAxis: { type: "category", data: rows.map((row) => String(row.date || "").slice(5)) },
                yAxis: { type: "value", name: "kWh", min: 0 },
                series: [
                    { name: copy.forecast, type: "line", data: rows.map((row) => row.overall?.predicted_total_kwh ?? null), connectNulls: false, showSymbol: false, animation: !reducedMotion },
                    { name: copy.actual, type: "line", data: rows.map((row) => row.overall?.actual_total_kwh ?? null), connectNulls: false, showSymbol: false, animation: !reducedMotion },
                ],
            }, true);
            publicChartInstance.resize();
            return true;
        }

        function schedulePublicChart(attempt = 0) {
            window.clearTimeout(publicChartTimer);
            publicChartTimer = window.setTimeout(() => {
                iqNextTick(() => {
                    if (devOn.value || activeSection.value !== "overview" || !publicSeries.value.length || !window.echarts) return;
                    if (renderPublicChart()) return;
                    if (attempt < 12) schedulePublicChart(attempt + 1);
                });
            }, attempt === 0 ? 0 : 50);
        }

        function renderActiveChart() {
            if (!devOn.value && activeSection.value === "overview") schedulePublicChart();
            if (activeSection.value === "replay") renderReplayChart();
            if (activeSection.value === "models") renderModelChart();
            if (activeSection.value === "trends") renderTrendChart();
        }

        function schedulePlayback() {
            window.clearTimeout(replayTimer);
            if (!playing.value) return;
            replayTimer = window.setTimeout(() => {
                if (activeHourIndex.value >= replay.value.hours.length - 1) {
                    playing.value = false;
                    return;
                }
                activeHourIndex.value += 1;
                schedulePlayback();
            }, 1200 / playbackSpeed.value);
        }

        function togglePlayback() {
            if (!replay.value?.hours?.length) return;
            if (activeHourIndex.value >= replay.value.hours.length - 1) activeHourIndex.value = 0;
            playing.value = !playing.value;
            schedulePlayback();
        }

        function pausePlayback() {
            playing.value = false;
            window.clearTimeout(replayTimer);
        }

        function restartReplay() {
            pausePlayback();
            activeHourIndex.value = 0;
        }

        function jumpBiggest() {
            pausePlayback();
            const hour = replay.value?.biggest_deviation?.hour;
            const index = replay.value?.hours?.findIndex((item) => item.hour === hour);
            if (index >= 0) activeHourIndex.value = index;
        }

        function componentValue(id) {
            return dashboard.value?.health?.components?.find((item) => item.id === id)?.value;
        }

        function heatClass(day) {
            return [`state-${day.state}`, day.class ? `quality-${day.class}` : "", day.date.endsWith("-01") ? "month-start" : ""];
        }

        function heatTitle(day) {
            if (day.state === "missing") return `${iqFormatDate(day.date)} · ${copy.missingDay}`;
            if (day.state === "insufficient") return `${iqFormatDate(day.date)} · ${copy.insufficientDay} · ${iqFormatNumber(day.completeness)}%`;
            return `${iqFormatDate(day.date)} · ${iqFormatNumber(day.quality)}% · ${copy.rank} ${day.rank}/${day.rank_basis}`;
        }

        function heatmapMonthStyle(month) {
            return { gridColumn: month.week, gridRow: month.row };
        }

        function selectHeatDay(day) {
            selectedHeatDay.value = day;
        }

        function milestoneLabel(item) {
            const labels = {
                de: { best_day: "Genauester Tag", complete_streak: "Längste vollständige Serie", accurate_streak: "Längste Serie über 90 %", complete_days_30: "30 vollständige Tage", complete_days_100: "100 vollständige Tage", complete_days_365: "365 vollständige Tage", best_week: "Beste Woche" },
                en: { best_day: "Most accurate day", complete_streak: "Longest complete streak", accurate_streak: "Longest streak above 90%", complete_days_30: "30 complete days", complete_days_100: "100 complete days", complete_days_365: "365 complete days", best_week: "Best week" },
                pl: { best_day: "Najdokładniejszy dzień", complete_streak: "Najdłuższa pełna seria", accurate_streak: "Najdłuższa seria powyżej 90%", complete_days_30: "30 pełnych dni", complete_days_100: "100 pełnych dni", complete_days_365: "365 pełnych dni", best_week: "Najlepszy tydzień" },
            };
            return (labels[locale] || labels.en)[item.id] || item.id;
        }

        function milestoneValue(item) {
            if (item.id === "best_day") return `${iqFormatNumber(item.value)}% · ${iqFormatDate(item.date)}`;
            if (item.id === "best_week") return `${iqFormatNumber(item.value)}% · W${item.week}`;
            if (item.id.includes("streak")) return `${item.length} ${copy.days}`;
            return `${item.value} / ${item.target}`;
        }

        function hourState(hour) {
            if (hour.data_state === "forecast_without_actual") return copy.missingActual;
            if (hour.data_state === "excluded") return copy.excluded;
            return copy.valid;
        }

        function signed(value, digits = 1) {
            if (value == null || !Number.isFinite(Number(value))) return "–";
            const number = Number(value);
            return `${number > 0 ? "+" : ""}${iqFormatNumber(number, digits)}`;
        }

        function signedClass(value) {
            return Number(value) > 0 ? "value-over" : Number(value) < 0 ? "value-under" : "";
        }

        function healthLabel(value) {
            return copy.healthClasses[value] || copy.unavailable;
        }

        const resizeCharts = () => {
            replayChartInstance?.resize();
            modelChartInstance?.resize();
            trendChartInstance?.resize();
            publicChartInstance?.resize();
        };

        iqWatch(activeSection, (section) => loadSection(section));
        iqWatch(() => props.initialSection, (section) => {
            if (tabs.value.includes(section) && section !== activeSection.value) activeSection.value = section;
        });
        iqWatch(activeHourIndex, () => iqNextTick(renderReplayChart));
        iqWatch(visibleSeries, () => iqNextTick(renderReplayChart), { deep: true });
        iqWatch(playbackSpeed, () => { if (playing.value) schedulePlayback(); });
        iqOnMounted(() => {
            window.addEventListener("resize", resizeCharts);
            loadSection(activeSection.value);
        });
        iqWatch(publicSeries, () => {
            if (!devOn.value && activeSection.value === "overview") schedulePublicChart();
        });
        iqOnUnmounted(() => {
            pausePlayback();
            window.clearTimeout(publicChartTimer);
            window.removeEventListener("resize", resizeCharts);
            replayChartInstance?.dispose();
            modelChartInstance?.dispose();
            trendChartInstance?.dispose();
            publicChartInstance?.dispose();
        });

        return {
            copy, tabs, activeSection, loading, errors, dashboard, replay, models, heatmap, milestones, trends,
            devOn, quality30Sentence,
            replayDate, activeHourIndex, playing, playbackSpeed, replayChart, modelChart, trendChart, publicChart,
            publicQuality7, publicQuality30, publicYesterdayKwh, publicYesterdayPercent,
            modelDays, modelMode, selectedHeatDay, visibleSeries, replaySeries, currentReplayHour,
            heatmapOffset, heatmapMonths, heatmapCanvasStyle, selectSection, loadSection, loadReplay, setModelDays, setModelMode,
            togglePlayback, pausePlayback, restartReplay, jumpBiggest, componentValue, heatClass, heatTitle,
            heatmapMonthStyle, selectHeatDay, milestoneLabel, milestoneValue, hourState, signed, signedClass, healthLabel,
            format: iqFormatNumber, formatDate: iqFormatDate, statement: iqStatement,
        };
    },
};

const PAGE_GUIDE = {
    de: {
        title: "ℹ️ So liest du diese Seite",
        pages: {
            tomorrow: "Diese Seite blickt zurück: Sie erzählt deine abgeschlossenen Tage anhand der gemessenen Tagesbilanzen und ist keine Prognose für morgen. Die Energy Story startet, sobald mindestens sieben abgeschlossene Tage vorliegen. Die Seite schaltet keine Geräte.",
            solar: "Hier siehst du deinen gemessenen Ertrag über Monate, Wochen und Jahre. Der Hinweis zur Verschattung nennt nur die heute bisher durch Schatten verlorene Energie und ist keine zweite Prognose. Wie gut die heutige Prognose trifft, siehst du auf „Live & Prognose“.",
            energy: "Alle Werte sind gemessen und beziehen sich auf deinen Abrechnungszeitraum, nicht auf eine Prognose. Autarkie ist der Anteil deines Hausverbrauchs, den Solar direkt und dein Akku gedeckt haben, und kein Euro-Betrag. Die Amortisation stellt deine Netto-Investition der realen Ersparnis und den Einspeiseerlösen gegenüber und hängt von den Annahmen ab, die du unter „Bearbeiten“ einträgst.",
            smart_charging: "Der Schalter geht nur in einer günstigen Stunde an, oder wenn der Preis unter dem Force-Preis liegt. Drei Zeilen zeigen, ob geladen wird, warum, und was als Nächstes passiert. Nur die Lücke rechnet die nächsten anderthalb Tage und lädt in günstigen Stunden auch tagsüber. Unter dem Force-Preis lädt jeder Modus bis zur Obergrenze, unabhängig von der Prognose.",
            heating: "Neue Räume starten im Beobachtungsmodus: Die Seite zeigt dann nur, was sie tun würde. Erst wenn du „Regelung aktivieren“ einschaltest, stellt sie die Thermostate selbst. Der angezeigte Grund beschreibt den aktuellen Zustand und ist kein Defekt: Bei offenem Fenster gilt die Frostgrenze, bei Abwesenheit die Absenk- bzw. Grundtemperatur. Änderst du ein Thermostat von Hand, pausiert der Raum bis zum nächsten Anwesenheitswechsel und regelt nicht dagegen.",
            ems: "Das EMS ist eine Beta-Version. Unter „Beobachten“ gibt es nur Empfehlungen und schaltet nie, unter „Bestätigen“ gibst du jeden Vorschlag einzeln frei, und nur unter „Automatik“ darf es freigegebene Geräte schalten. Vor jeder Schaltung werden Freigabe, Datenlage und Schutzregeln erneut geprüft. Meldet die Seite eine ausstehende Sicherheitsfreigabe, bleibt das EMS gesperrt, bis das Gerät bestätigt ausgeschaltet ist. Ohne gültige Freigabe siehst du Beispielwerte.",
        },
    },
    en: {
        title: "ℹ️ How to read this page",
        pages: {
            tomorrow: "This page looks back: it tells the story of your completed days from the measured daily balances and is not a forecast for tomorrow. The Energy Story starts as soon as at least seven completed days are available. The page does not switch any devices.",
            solar: "Here you see your measured yield over months, weeks and years. The shading note only states the energy lost to shade so far today and is not a second forecast. How well today's forecast is doing is shown on “Live & Forecast”.",
            energy: "All values are measured and refer to your billing period, not to a forecast. Autarky is the share of your household consumption covered directly by solar and by your battery, not a euro amount. Amortization compares your net investment with the real savings and feed-in revenue and depends on the assumptions you enter under “Edit”.",
            smart_charging: "The switch turns on only in a cheap hour, or when the price is below the force price. Three lines show whether it is charging, why, and what happens next. Gap only looks at the next day and a half and charges in cheap hours, including daytime. Below the force price every mode charges to the ceiling, regardless of the forecast.",
            heating: "New rooms start in observation mode: the page then only shows what it would do. Only when you switch on “Enable control” does it set the thermostats itself. The reason shown describes the current state and is not a defect: with an open window the frost limit applies, when nobody is home the setback or base temperature applies. If you change a thermostat by hand, the room pauses until the next presence change and does not work against you.",
            ems: "The EMS is a beta version. In “Beobachten” it only gives recommendations and never switches, in “Bestätigen” you approve each suggestion individually, and only in “Automatik” may it switch approved devices. Before every switching action, approval, data quality and protection rules are checked again. If the page reports a pending safety release, the EMS stays locked until the device is confirmed switched off. Without a valid license you see example values.",
        },
    },
    pl: {
        title: "ℹ️ Jak czytać tę stronę",
        pages: {
            tomorrow: "Ta strona patrzy wstecz: opowiada zakończone dni na podstawie zmierzonych bilansów dziennych i nie jest prognozą na jutro. Energy Story startuje, gdy dostępnych jest co najmniej siedem zakończonych dni. Strona nie przełącza żadnych urządzeń.",
            solar: "Tutaj widzisz zmierzony uzysk z miesięcy, tygodni i lat. Wskazówka o zacienieniu podaje tylko energię utraconą dziś do tej pory przez cień i nie jest drugą prognozą. Jak dobrze sprawdza się dzisiejsza prognoza, zobaczysz na „Na żywo i prognoza“.",
            energy: "Wszystkie wartości są zmierzone i odnoszą się do okresu rozliczeniowego, a nie do prognozy. Samowystarczalność to udział zużycia domu pokryty bezpośrednio przez słońce i przez akumulator, a nie kwota w euro. Amortyzacja zestawia inwestycję netto z realną oszczędnością i przychodem z oddania energii i zależy od założeń, które wpisujesz pod „Edytuj“.",
            smart_charging: "Przełącznik włącza się tylko w taniej godzinie albo gdy cena jest poniżej ceny force. Trzy linie pokazują, czy trwa ładowanie, dlaczego i co będzie dalej. Tylko luka liczy najbliższe półtora dnia i ładuje w tanich godzinach także w dzień. Poniżej ceny force każdy tryb ładuje do maksimum, niezależnie od prognozy.",
            heating: "Nowe pomieszczenia startują w trybie obserwacji: strona pokazuje wtedy tylko, co by zrobiła. Dopiero gdy włączysz „Włącz regulację“, ustawia termostaty sama. Pokazany powód opisuje bieżący stan i nie jest usterką: przy otwartym oknie obowiązuje granica przeciwzamrożeniowa, przy nieobecności temperatura obniżenia albo domyślne obniżenie. Jeśli zmienisz termostat ręcznie, pomieszczenie pauzuje do następnej zmiany obecności i nie reguluje wbrew tobie.",
            ems: "EMS jest wersją beta. Pod „Beobachten“ są tylko zalecenia i nic nie jest przełączane, pod „Bestätigen“ zatwierdzasz każdą propozycję osobno, a tylko pod „Automatik“ może przełączać zatwierdzone urządzenia. Przed każdym przełączeniem ponownie sprawdzane są zezwolenie, jakość danych i reguły ochrony. Jeśli strona zgłasza oczekujące zwolnienie bezpieczeństwa, EMS pozostaje zablokowane, aż urządzenie zostanie potwierdzone jako wyłączone. Bez ważnej licencji widzisz wartości przykładowe.",
        },
    },
};

const ModernPageGuide = {
    props: {
        page: { type: String, required: true },
    },
    template: `
        <details v-if="!devOn && text" class="page-guide">
            <summary>{{ copy.title }}</summary>
            <p>{{ text }}</p>
        </details>
    `,
    setup(props) {
        const devOn = iqComputed(() => window.sfmlDevState?.active === true);
        const copy = iqComputed(() => PAGE_GUIDE[iqLocale()] || PAGE_GUIDE.en);
        const text = iqComputed(() => copy.value.pages[props.page] || "");
        return { devOn, copy, text };
    },
};

window.ModernPageGuide = ModernPageGuide;
window.ModernForecastGuide = ModernForecastGuide;
window.ModernIntelligenceOverview = ModernIntelligenceOverview;
window.ModernQualityPage = ModernQualityPage;
