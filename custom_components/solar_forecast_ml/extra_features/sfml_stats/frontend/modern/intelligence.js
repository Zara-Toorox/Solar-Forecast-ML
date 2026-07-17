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
        score: "Forecast Health", unavailable: "Not reliable yet", validDays: "usable days", accuracy: "Accuracy", completeness: "Completeness", period: "Assessment period", calculated: "Calculated", open: "Open analysis", summary: "Executive Summary", insights: "Relevant insights", noSummary: "No reliable summary is available for this period yet.", noInsights: "There is currently no evidence-based prioritized insight.", retry: "Retry",
        tabs: { overview: "Overview", replay: "Replay", models: "Models", calendar: "Quality year", milestones: "Milestones", trends: "Development" },
        formula: "Assessment model", formulaName: "Harmonic mean", positive: "Strongest influence", negative: "Limiting influence", minimum: "Minimum basis", days: "Days", morning: "Morning Forecast", reforecast: "Reforecast", winner: "Winner", tie: "Tie", noBattle: "There are not enough common model hours for a reliable comparison.", commonPoints: "common hours", model: "Model", mae: "MAE", rmse: "RMSE", bias: "Bias", wape: "WAPE", hourWins: "Hour wins", dayWins: "Day wins", timeline: "Daily development", replayDate: "Day", speed: "Speed", largest: "Largest deviation", currentHour: "Current hour", cumulativeActual: "Cumulative actual", cumulativeForecast: "Cumulative forecast", cumulativeError: "Cumulative deviation", absoluteError: "Absolute deviation", missingActual: "Actual missing", excluded: "Not eligible", p10Missing: "P10 is not stored as a historical hourly series.", heatmap: "Forecast quality by day", missingDay: "No record", insufficientDay: "Insufficient data basis", rank: "Rank", metric: "Daily quality", forecast: "Forecast", actual: "Actual yield", coverage: "Coverage", evaluationHours: "Evaluation hours", milestone: "Milestone", achieved: "Achieved", inProgress: "In progress", trend: "Weekly development", weeks: "weeks", valid: "Usable", healthClasses: { excellent: "Excellent", good: "Good", moderate: "Moderate", weak: "Weak", critical: "Critical" },
    },
    pl: {
        score: "Forecast Health", unavailable: "Jeszcze niewiarygodne", validDays: "użyteczne dni", accuracy: "Dokładność", completeness: "Kompletność", period: "Okres oceny", calculated: "Obliczono", open: "Otwórz analizę", summary: "Podsumowanie", insights: "Istotne wnioski", noSummary: "Dla tego okresu nie ma jeszcze wiarygodnego podsumowania.", noInsights: "Obecnie nie ma priorytetowego wniosku opartego na danych.", retry: "Spróbuj ponownie",
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

async function iqFetch(endpoint, forceRefresh = false) {
    const payload = await SFMLApi.fetch(endpoint, { forceRefresh, ttl: 120000 });
    return payload?.data ?? payload;
}

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
            <div class="iq-tabs" role="tablist" :aria-label="copy.score">
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
                    <div class="iq-month-labels"><span v-for="month in heatmapMonths" :key="month.key">{{ month.label }}</span></div>
                    <div class="iq-heatmap" role="grid">
                        <span v-for="blank in heatmapOffset" :key="'blank-' + blank" class="iq-heat-blank"></span>
                        <button v-for="day in heatmap.days" :key="day.date" type="button" role="gridcell"
                                class="iq-heat-cell" :class="heatClass(day)"
                                :title="heatTitle(day)" :aria-label="heatTitle(day)"
                                @click="selectHeatDay(day)"></button>
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
        const tabs = ["overview", "replay", "models", "calendar", "milestones", "trends"];
        const activeSection = iqRef(tabs.includes(props.initialSection) ? props.initialSection : "overview");
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
            return (heatmap.value?.days || []).filter((day) => {
                const key = day.date.slice(0, 7);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            }).map((day) => ({ key: day.date.slice(0, 7), label: iqFormatDate(day.date, { month: "short" }) }));
        });
        let replayTimer = null;
        let replayChartInstance = null;
        let modelChartInstance = null;
        let trendChartInstance = null;

        function selectSection(section) {
            if (!tabs.includes(section)) return;
            activeSection.value = section;
            window.location.hash = `quality/${section}`;
        }

        async function loadSection(section, forceRefresh = false) {
            loading[section] = true;
            errors[section] = "";
            try {
                if (section === "overview") dashboard.value = await iqFetch("/api/sfml_stats/modern/dashboard?days=14", forceRefresh);
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

        function renderActiveChart() {
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
        };

        iqWatch(activeSection, (section) => loadSection(section));
        iqWatch(() => props.initialSection, (section) => {
            if (tabs.includes(section) && section !== activeSection.value) activeSection.value = section;
        });
        iqWatch(activeHourIndex, () => iqNextTick(renderReplayChart));
        iqWatch(visibleSeries, () => iqNextTick(renderReplayChart), { deep: true });
        iqWatch(playbackSpeed, () => { if (playing.value) schedulePlayback(); });
        iqOnMounted(() => {
            window.addEventListener("resize", resizeCharts);
            loadSection(activeSection.value);
        });
        iqOnUnmounted(() => {
            pausePlayback();
            window.removeEventListener("resize", resizeCharts);
            replayChartInstance?.dispose();
            modelChartInstance?.dispose();
            trendChartInstance?.dispose();
        });

        return {
            copy, tabs, activeSection, loading, errors, dashboard, replay, models, heatmap, milestones, trends,
            replayDate, activeHourIndex, playing, playbackSpeed, replayChart, modelChart, trendChart,
            modelDays, modelMode, selectedHeatDay, visibleSeries, replaySeries, currentReplayHour,
            heatmapOffset, heatmapMonths, selectSection, loadSection, loadReplay, setModelDays, setModelMode,
            togglePlayback, pausePlayback, restartReplay, jumpBiggest, componentValue, heatClass, heatTitle,
            selectHeatDay, milestoneLabel, milestoneValue, hourState, signed, signedClass, healthLabel,
            format: iqFormatNumber, formatDate: iqFormatDate, statement: iqStatement,
        };
    },
};

window.ModernIntelligenceOverview = ModernIntelligenceOverview;
window.ModernQualityPage = ModernQualityPage;
