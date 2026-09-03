const {
    createApp,
    ref,
    reactive,
    computed,
    onMounted,
    onUnmounted,
    watch,
    nextTick,
} = Vue;

const ICON_PATHS = {
    home: "M3 11.5 12 4l9 7.5M5.5 10v10h13V10M9.5 20v-6h5v6",
    solar: "M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
    weather: "M17.5 19H7a5 5 0 1 1 1.8-9.67A6 6 0 0 1 20 12a3.5 3.5 0 0 1-2.5 7ZM8 5l1-2M4.5 7.5 2-1M3 12H1",
    energy: "M13 2 4.5 13H11l-1 9 8.5-11H12l1-9Z",
    heatpump: "M4 7h10v10H4zM14 10h4l2 2v5h-6M7 10h4M7 13h4M6 20h2M16 20h2",
    mobility: "M5 15h14l-1.5-5h-11L5 15Zm2-5 2-4h6l2 4M7 15v3M17 15v3M8 18h.01M16 18h.01M20 9h2v5M22 9V6",
    charge: "M7 7V3M17 7V3M5 7h14v4a7 7 0 0 1-7 7v3M8 21h8",
    settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.38.2.73.32 1.1.4h.5v4h-.09A1.7 1.7 0 0 0 19.4 15Z",
    help: "M9.1 9a3 3 0 1 1 5.8 1.05c-.42 1.08-1.35 1.45-2.05 2.05-.5.43-.85.92-.85 1.9M12 18h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z",
    license: "M5 6h14v14H5zM8 6V4h8v2M8 11h8M8 15h5",
    menu: "M4 6h16M4 12h16M4 18h16",
    close: "m6 6 12 12M18 6 6 18",
    more: "M5 12h.01M12 12h.01M19 12h.01",
    sun: "M12 3v2M12 19v2M3 12h2M19 12h2M5.64 5.64l1.42 1.42M16.94 16.94l1.42 1.42M5.64 18.36l1.42-1.42M16.94 7.06l1.42-1.42M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
    moon: "M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5a8.5 8.5 0 1 0 12 12Z",
    monitor: "M4 4h16v12H4zM8 20h8M12 16v4",
    refresh: "M20 11a8 8 0 1 0-2.34 5.66M20 4v7h-7",
    quality: "M4 19V9M10 19V5M16 19v-7M22 19V3M2 19h22",
    play: "m8 5 11 7-11 7V5Z",
    pause: "M9 5v14M15 5v14",
    restart: "M4 4v6h6M5.5 15a7 7 0 1 0 1-7.5L4 10",
    target: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-6a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-4h.01",
    calendar: "M6 2v4M18 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z",
    trophy: "M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4ZM7 6H3v2a4 4 0 0 0 4 4M17 6h4v2a4 4 0 0 1-4 4",
    trend: "m3 17 6-6 4 4 8-9M17 6h4v4",
};

const UiIcon = {
    props: {
        name: { type: String, required: true },
        size: { type: Number, default: 20 },
    },
    computed: {
        path() {
            return ICON_PATHS[this.name] || ICON_PATHS.more;
        },
    },
    template: `
        <svg class="ui-icon" :width="size" :height="size" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="1.8"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path :d="path"></path>
        </svg>
    `,
};

const COPY = {
    de: {
        product: "Solar Forecast Stats",
        sections: { live: "Monitoring", analysis: "Analyse", system: "Steuerung" },
        mobile: { dashboard: "Cockpit", home: "Übersicht", solar: "Solar", energy: "Energie" },
        pages: {
            dashboard: ["Solar Cockpit", "Energie, Prognose und Premium Intelligence auf einen Blick"],
            tomorrow: ["Dein Energietag", "Deine historische Energy Story und echte Energie-Unabhängigkeit"],
            home: ["Live & Prognose", "Ausführlicher Energiefluss und Prognosestatus"],
            solar: ["Solar & Prognose", "Ertrag, Modelle, Abweichungen und Schatten"],
            weather: ["Wetter", "Prognose, Strahlung und Historie"],
            energy: ["Energie & Finanzen", "Bilanz, Verbraucher, Tarife und Amortisation"],
            smart_charging: ["Smart Charging", "Ladeentscheidung, Preise und Batterieziel"],
            ems: ["EMS", "BETA v2! · Was jetzt tun – und warum"],
            settings: ["Systemstatus", "Konfiguration, Sensoren und Datenqualität"],
            corrections: ["Korrekturen", "Premium · geprüfte Tageswerte berichtigen"],
            quality: ["Forecast Intelligence", "Qualität, Modelle und Entwicklung nachvollziehen"],
            weather_energy: ["Wetter & Energie", "Bedingungen, Prognose und Ertrag gemeinsam analysieren"],
            eai: ["Wärmepumpe", "Verbrauch, Betrieb, Effizienz und Gebäudeverhalten"],
            mobility: ["E-Mobilität & Wallbox", "PV, Preise, Wärmepumpe und Abfahrtsziel gemeinsam planen"],
            eai_weather: ["Weather Intelligence", "Lokale Prognose, Historie, Genauigkeit und Wetterrisiken"],
        },
        status: { live: "Aktuell", stale: "Veraltet", offline: "Nicht erreichbar", loading: "Verbinden" },
        theme: { label: "Darstellung", auto: "Automatisch", light: "Hell", dark: "Dunkel" },
        updated: "Aktualisiert",
        navigation: "Navigation",
        skip: "Zum Inhalt springen",
        retry: "Erneut laden",
        unavailableTitle: "Datenverbindung unterbrochen",
        unavailableText: "Die zuletzt geladenen Werte bleiben sichtbar. Neue Daten werden automatisch abgerufen, sobald das Backend wieder erreichbar ist.",
        more: "Mehr",
        help: "Hilfe",
        licenseLabel: "Lizenz",
    },
    en: {
        product: "Solar Forecast Stats",
        sections: { live: "Monitoring", analysis: "Analysis", system: "Control" },
        mobile: { dashboard: "Cockpit", home: "Overview", solar: "Solar", energy: "Energy" },
        pages: {
            dashboard: ["Solar Cockpit", "Energy, forecast and premium intelligence at a glance"],
            tomorrow: ["Your Energy Day", "Your historical Energy Story and real energy independence"],
            home: ["Live & Forecast", "Detailed energy flow and forecast status"],
            solar: ["Solar & Forecast", "Yield, models, deviations and shading"],
            weather: ["Weather", "Forecast, radiation and history"],
            energy: ["Energy & Finance", "Balance, consumers, tariffs and payback"],
            smart_charging: ["Smart Charging", "Charge decision, prices and battery target"],
            ems: ["EMS", "BETA v2! · What to do now – and why"],
            settings: ["System Status", "Configuration, sensors and data quality"],
            corrections: ["Corrections", "Premium · correct verified daily values"],
            quality: ["Forecast Intelligence", "Understand quality, models and development"],
            weather_energy: ["Weather & Energy", "Analyse conditions, forecast and yield together"],
            eai: ["Heat Pump", "Consumption, operation, efficiency and building response"],
            mobility: ["E-Mobility & Wallbox", "Plan PV, prices, heat-pump demand and departure target together"],
            eai_weather: ["Weather Intelligence", "Local forecast, history, accuracy and weather risks"],
        },
        status: { live: "Current", stale: "Stale", offline: "Unavailable", loading: "Connecting" },
        theme: { label: "Appearance", auto: "Automatic", light: "Light", dark: "Dark" },
        updated: "Updated",
        navigation: "Navigation",
        skip: "Skip to content",
        retry: "Retry",
        unavailableTitle: "Data connection interrupted",
        unavailableText: "The last loaded values remain visible. New data will be fetched automatically when the backend is available again.",
        more: "More",
        help: "Help",
        licenseLabel: "License",
    },
    pl: {
        product: "Solar Forecast Stats",
        sections: { live: "Monitoring", analysis: "Analiza", system: "Sterowanie" },
        mobile: { dashboard: "Kokpit", home: "Przegląd", solar: "Solar", energy: "Energia" },
        pages: {
            dashboard: ["Solar Cockpit", "Energia, prognoza i funkcje Premium w jednym miejscu"],
            tomorrow: ["Twój dzień energii", "Twoja historyczna Energy Story i rzeczywista niezależność energetyczna"],
            home: ["Na żywo i prognoza", "Szczegółowy przepływ energii i stan prognozy"],
            solar: ["Energia słoneczna", "Produkcja, modele, odchylenia i cień"],
            weather: ["Pogoda", "Prognoza, promieniowanie i historia"],
            energy: ["Energia i finanse", "Bilans, odbiorniki, taryfy i amortyzacja"],
            smart_charging: ["Smart Charging", "Decyzja ładowania, ceny i cel baterii"],
            ems: ["EMS", "BETA v2! · Co teraz zrobić – i dlaczego"],
            settings: ["Stan systemu", "Konfiguracja, czujniki i jakość danych"],
            corrections: ["Korekty", "Premium · korekta zweryfikowanych wartości dziennych"],
            quality: ["Forecast Intelligence", "Jakość, modele i długoterminowy rozwój"],
            weather_energy: ["Pogoda i energia", "Wspólna analiza warunków, prognozy i uzysku"],
            eai: ["Pompa ciepła", "Zużycie, praca, efektywność i reakcja budynku"],
            mobility: ["E-mobilność i wallbox", "Wspólne planowanie PV, cen, pompy ciepła i wyjazdu"],
            eai_weather: ["Weather Intelligence", "Lokalna prognoza, historia, dokładność i ryzyka pogodowe"],
        },
        status: { live: "Aktualne", stale: "Nieaktualne", offline: "Niedostępne", loading: "Łączenie" },
        theme: { label: "Wygląd", auto: "Automatyczny", light: "Jasny", dark: "Ciemny" },
        updated: "Aktualizacja",
        navigation: "Nawigacja",
        skip: "Przejdź do treści",
        retry: "Ponów",
        unavailableTitle: "Przerwane połączenie z danymi",
        unavailableText: "Ostatnie wartości pozostają widoczne. Nowe dane zostaną pobrane automatycznie po przywróceniu backendu.",
        more: "Więcej",
        help: "Pomoc",
        licenseLabel: "Licencja",
    },
};

function installModernChartDefaults() {
    if (!window.echarts || window.echarts.__sfmlModernDefaults) return;

    const originalInit = window.echarts.init.bind(window.echarts);
    const chartRefreshers = new Set();
    const semanticSeries = [
        {
            terms: ["actual", "ist", "gemessen", "ertrag"],
            colorToken: "--success",
            fallback: "#5bd8a6",
            lineType: "solid",
            symbol: "circle",
        },
        {
            terms: ["final", "finale prognose", "prediction"],
            colorToken: "--accent",
            fallback: "#60c5ff",
            lineType: "solid",
            symbol: "roundRect",
        },
        {
            terms: ["physics", "physik", "rule based", "regelbasiert"],
            colorToken: "--solar",
            fallback: "#ffbf2f",
            lineType: "dashed",
            symbol: "triangle",
        },
        {
            terms: ["hubble", "ki", " ai", "lstm", "ridge"],
            colorToken: "--chart-series-ai",
            fallback: "#8fa8ff",
            lineType: "dotted",
            symbol: "diamond",
        },
        {
            terms: ["p10", "konservativ", "conservative"],
            colorToken: "--chart-series-conservative",
            fallback: "#c7a9e8",
            lineType: "dashed",
            symbol: "emptyCircle",
        },
        {
            terms: ["reforecast", "neu-prognose"],
            colorToken: "--danger",
            fallback: "#f27676",
            lineType: "dotted",
            symbol: "pin",
        },
    ];

    function token(name, fallback) {
        const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return value || fallback;
    }

    function findSemanticStyle(name) {
        const normalized = ` ${String(name || "").toLowerCase()} `;
        const entry = semanticSeries.find((candidate) => (
            candidate.terms.some((term) => normalized.includes(term))
        ));
        return entry ? { ...entry, color: token(entry.colorToken, entry.fallback) } : undefined;
    }

    function normalizeChartOption(option) {
        if (!option || typeof option !== "object") return option;

        const textPrimary = token("--text-primary", "#f3f6f7");
        const textSecondary = token("--text-secondary", "#aab5ba");
        const border = token("--border-default", "rgba(103, 170, 220, 0.23)");
        const grid = token("--chart-grid", "rgba(127, 199, 238, 0.14)");
        const surface = token("--surface-data", "#071827");

        option.animationDuration = 280;
        option.animationDurationUpdate = 180;
        option.color = [
            token("--accent", "#60c5ff"),
            token("--solar", "#ffbf2f"),
            token("--success", "#5bd8a6"),
            token("--chart-series-ai", "#8fa8ff"),
            token("--house", "#e89a67"),
            token("--chart-series-conservative", "#c7a9e8"),
            token("--danger", "#f27676"),
        ];
        option.textStyle = { ...option.textStyle, color: textSecondary };
        option.aria = { ...option.aria, enabled: true };

        const grids = Array.isArray(option.grid) ? option.grid : option.grid ? [option.grid] : [];
        grids.forEach((grid) => {
            grid.containLabel = true;
        });

        if (option.legend) {
            option.legend = {
                ...option.legend,
                textStyle: { ...option.legend.textStyle, color: textSecondary },
            };
        }

        if (option.tooltip) {
            option.tooltip = {
                ...option.tooltip,
                backgroundColor: surface,
                borderColor: border,
                textStyle: { ...option.tooltip.textStyle, color: textPrimary },
                extraCssText: "border-radius:11px;box-shadow:0 14px 34px rgba(0,0,0,.22);backdrop-filter:blur(12px);",
            };
        }

        ["xAxis", "yAxis"].forEach((axisName) => {
            const axes = Array.isArray(option[axisName])
                ? option[axisName]
                : option[axisName]
                    ? [option[axisName]]
                    : [];
            axes.forEach((axis) => {
                axis.axisLabel = { ...axis.axisLabel, color: textSecondary };
                axis.nameTextStyle = { ...axis.nameTextStyle, color: textSecondary };
                axis.axisLine = {
                    ...axis.axisLine,
                    lineStyle: { ...axis.axisLine?.lineStyle, color: border },
                };
                axis.splitLine = {
                    ...axis.splitLine,
                    lineStyle: { ...axis.splitLine?.lineStyle, color: grid },
                };
            });
        });

        if (Array.isArray(option.series)) {
            option.series.forEach((series) => {
                const semantic = findSemanticStyle(series.name);
                if (!semantic) return;
                const explicitItemColor = series.itemStyle?.color;
                const explicitLineColor = series.lineStyle?.color;
                series.itemStyle = {
                    ...series.itemStyle,
                    color: explicitItemColor ?? semantic.color,
                };
                series.lineStyle = {
                    ...series.lineStyle,
                    color: explicitLineColor ?? semantic.color,
                    type: semantic.lineType,
                };
                series.symbol = semantic.symbol;
                series.symbolSize = Math.max(Number(series.symbolSize) || 0, 6);
            });
        }

        return option;
    }

    window.echarts.init = function modernChartInit(...args) {
        const chart = originalInit(...args);
        const originalSetOption = chart.setOption.bind(chart);
        chart.setOption = (option, ...setOptionArgs) => (
            originalSetOption(normalizeChartOption(option), ...setOptionArgs)
        );
        const refreshTheme = () => {
            if (chart.isDisposed?.()) {
                chartRefreshers.delete(refreshTheme);
                return;
            }
            originalSetOption(
                normalizeChartOption(chart.getOption()),
                { notMerge: false, lazyUpdate: true, silent: true }
            );
            chart.resize();
        };
        chartRefreshers.add(refreshTheme);
        return chart;
    };
    window.addEventListener("sfml-modern-themechange", () => {
        requestAnimationFrame(() => chartRefreshers.forEach((refresh) => refresh()));
    });
    window.echarts.__sfmlModernDefaults = true;
}

const ModernApp = {
    components: { UiIcon },
    template: `
        <div class="modern-app" :class="{
            'drawer-open': drawerOpen,
            'orbit-mode': currentPage === 'dashboard',
            'premium-mode': currentPage === 'eai',
        }">
            <a class="skip-link" href="#main-content">{{ copy.skip }}</a>

            <div v-if="drawerOpen" class="drawer-backdrop" @click="closeDrawer" aria-hidden="true"></div>

            <aside class="sidebar" :class="{ open: drawerOpen }" :aria-label="copy.navigation">
                <div class="brand-row">
                    <div class="brand-mark" aria-hidden="true"><ui-icon name="solar" :size="22"></ui-icon></div>
                    <div class="brand-copy">
                        <strong>Solar Forecast</strong>
                        <span>Stats</span>
                    </div>
                    <button class="icon-button drawer-close" type="button" :aria-label="copy.navigation"
                            @click="closeDrawer">
                        <ui-icon name="close"></ui-icon>
                    </button>
                </div>

                <nav class="primary-nav">
                    <div v-for="section in navigation" :key="section.id" class="nav-section">
                        <div class="nav-section-label">{{ copy.sections[section.id] }}</div>
                        <button v-for="item in section.items" :key="item.id" type="button"
                                class="nav-item" :class="{ active: currentPage === item.id, 'premium-item': item.premium, disabled: item.admin && !isAdmin }"
                                :aria-current="currentPage === item.id ? 'page' : null"
                                :title="item.admin && !isAdmin ? 'Nur Administrator' : undefined"
                                @click="navigate(item.id)">
                            <ui-icon :name="item.icon"></ui-icon>
                            <span>{{ pageCopy(item.id)[0] }}</span>
                            <small v-if="item.panel && !premiumCorrections">🔒 Premium</small>
                            <small v-else-if="item.admin && !isAdmin">Nur Admin</small>
                        </button>
                    </div>
                </nav>

                <div class="sidebar-footer">
                    <a class="nav-item sidebar-help-link" href="https://www.solarforecastml.com"
                       target="_blank" rel="noopener noreferrer">
                        <ui-icon name="help"></ui-icon>
                        <span>{{ copy.help }}</span>
                    </a>
                    <a class="nav-item sidebar-help-link" href="https://ko-fi.com/s/8bc3808d22"
                       target="_blank" rel="noopener noreferrer">
                        <ui-icon name="license"></ui-icon>
                        <span>{{ copy.licenseLabel }}</span>
                    </a>
                    <div class="connection-card" :class="connectionState">
                        <span class="connection-dot" aria-hidden="true"></span>
                        <div>
                            <strong>{{ copy.status[connectionState] }}</strong>
                            <span v-if="lastUpdated">{{ copy.updated }} {{ updatedTime }}</span>
                        </div>
                    </div>
                </div>
            </aside>

            <div class="app-column">
                <header class="topbar">
                    <div class="topbar-title">
                        <button class="icon-button menu-button" type="button" :aria-label="copy.navigation"
                                @click="drawerOpen = true">
                            <ui-icon name="menu"></ui-icon>
                        </button>
                        <div>
                            <div class="eyebrow">{{ copy.product }}</div>
                            <h1>{{ currentPageCopy[0] }} <span v-if="currentPage === 'ems'" class="page-beta">BETA v2!</span></h1>
                            <p>{{ currentPageCopy[1] }}</p>
                        </div>
                    </div>

                    <div class="topbar-actions">
                        <div v-if="currentPage !== 'dashboard'"
                             class="live-metrics" aria-label="Live status">
                            <div v-if="liveData.solar_power != null" class="live-metric">
                                <span>PV</span><strong>{{ formatPower(liveData.solar_power) }}</strong>
                            </div>
                            <div v-if="liveData.battery_soc != null" class="live-metric">
                                <span>SoC</span><strong>{{ Math.round(liveData.battery_soc) }}%</strong>
                            </div>
                            <div v-if="liveData.total_price != null" class="live-metric">
                                <span>Preis</span><strong>{{ formatPrice(liveData.total_price) }}</strong>
                            </div>
                        </div>

                        <div class="theme-control" :aria-label="copy.theme.label">
                            <button v-for="option in themeOptions" :key="option.id" type="button"
                                    :class="{ active: themeMode === option.id }"
                                    :aria-label="copy.theme[option.id]"
                                    :title="copy.theme[option.id]"
                                    @click="setThemeMode(option.id)">
                                <ui-icon :name="option.icon" :size="17"></ui-icon>
                            </button>
                        </div>
                    </div>
                </header>

                <div v-if="connectionState === 'offline' && hasLoaded" class="system-banner error-banner" role="alert">
                    <div>
                        <strong>{{ copy.unavailableTitle }}</strong>
                        <span>{{ copy.unavailableText }}</span>
                    </div>
                    <button type="button" class="button secondary" @click="fetchData(true)">
                        <ui-icon name="refresh" :size="17"></ui-icon>
                        {{ copy.retry }}
                    </button>
                </div>

                <main id="main-content" class="modern-content" tabindex="-1">
                    <div v-if="currentPage !== 'dashboard' && !hasLoaded"
                         class="initial-state" role="status" aria-live="polite">
                        <span class="loading-indicator" aria-hidden="true"></span>
                        <strong>{{ copy.status.loading }}</strong>
                    </div>
                    <transition v-else name="modern-page" mode="out-in">
                        <div :key="currentPage" class="modern-page-frame">
                            <component :is="currentPageComponent"
                                       :live-data="liveData"
                                       :config="appConfig"
                                       :initial-section="currentDetail"
                                       @navigate="navigate"
                                       @mode-change="handleDashboardMode"
                                       @change-theme="handlePageTheme" />
                            <modern-intelligence-overview
                                v-if="currentPage === 'home'"
                                @navigate="navigate" />
                        </div>
                    </transition>
                </main>
            </div>

            <nav class="mobile-nav-modern" :aria-label="copy.navigation">
                <button v-for="item in mobileNavigation" :key="item.id" type="button"
                        :class="{ active: currentPage === item.id }"
                        :aria-current="currentPage === item.id ? 'page' : null"
                        @click="item.id === 'more' ? drawerOpen = true : navigate(item.id)">
                    <ui-icon :name="item.icon"></ui-icon>
                    <span>{{ item.id === 'more' ? copy.more : copy.mobile[item.id] }}</span>
                </button>
            </nav>

            <div class="sr-only" aria-live="polite">
                {{ copy.status[connectionState] }}
            </div>
        </div>
    `,
    setup() {
        const locale = window.SFMLI18n?.current || "en";
        const copy = COPY[locale] || COPY.en;
        const currentPage = ref("home");
        const currentDetail = ref("");
        const dashboardMode = ref("loading");
        const premiumCorrections = ref(false);
        const drawerOpen = ref(false);
        const hasLoaded = ref(false);
        const requestPending = ref(false);
        const connectionState = ref("loading");
        const lastUpdated = ref(null);
        const themeMode = ref(localStorage.getItem("sfml-stats-modern-theme") || "auto");
        const systemDark = ref(window.matchMedia("(prefers-color-scheme: dark)").matches);

        const liveData = reactive({
            total_price: null,
            battery_soc: null,
            solar_power: null,
            home_consumption: null,
            solar_to_house: 0,
            solar_to_battery: 0,
            battery_to_house: 0,
            grid_to_house: 0,
            grid_export: 0,
        });

        const appConfig = reactive({
            theme: "dark",
            themeMode: themeMode.value,
            country: "DE",
        });

        const navigationDefinition = [
            {
                id: "live",
                items: [
                    { id: "home", icon: "home" },
                    { id: "dashboard", icon: "solar" },
                ],
            },
            {
                id: "analysis",
                items: [
                    { id: "solar", icon: "solar" },
                    { id: "quality", icon: "quality" },
                    { id: "weather_energy", icon: "weather" },
                    { id: "weather", icon: "weather" },
                    { id: "energy", icon: "energy" },
                    { id: "tomorrow", icon: "play", premium: true, panel: true },
                    { id: "eai", icon: "heatpump", premium: true, feature: "heat_pump" },
                    { id: "mobility", icon: "mobility", feature: "wallbox" },
                    { id: "eai_weather", icon: "weather" },
                ],
            },
            {
                id: "system",
                items: [
                    { id: "smart_charging", icon: "charge" },
                    { id: "ems", icon: "energy", admin: true },
                    { id: "corrections", icon: "settings", panel: true },
                    { id: "settings", icon: "settings" },
                ],
            },
        ];
        const navigation = computed(() => navigationDefinition);
        const isAdmin = computed(() => {
            try {
                if (window.parent === window || window.top !== window.parent) return true;
                const user = window.parent.document.querySelector("home-assistant")?.hass?.user;
                if (!user) return true;
                return user.is_admin === true;
            } catch (_error) {
                return true;
            }
        });

        const mobileNavigation = [
            { id: "home", icon: "home" },
            { id: "solar", icon: "solar" },
            { id: "energy", icon: "energy" },
            { id: "more", icon: "more" },
        ];

        const themeOptions = [
            { id: "auto", icon: "monitor" },
            { id: "light", icon: "sun" },
            { id: "dark", icon: "moon" },
        ];

        const pages = {
            dashboard: window.PremiumDashboardPage,
            home: window.HomePage,
            solar: window.SolarPage,
            quality: window.ModernQualityPage,
            weather_energy: window.ModernWeatherEnergyPage,
            weather: window.WeatherPage,
            energy: window.EnergyPage,
            tomorrow: window.TomorrowPage,
            eai: window.ModernEAIPage,
            mobility: window.ModernMobilityPage,
            eai_weather: window.ModernEAIWeatherPage,
            smart_charging: window.SmartChargingPage,
            ems: window.ModernEMSPage,
            corrections: window.ModernCorrectionsPage,
            settings: window.SettingsPage,
        };

        const currentPageComponent = computed(() => pages[currentPage.value] || pages.home);
        const currentPageCopy = computed(() => pageCopy(currentPage.value));
        const updatedTime = computed(() => {
            if (!lastUpdated.value) return "";
            return new Intl.DateTimeFormat(locale, {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            }).format(lastUpdated.value);
        });

        function pageCopy(page) {
            return copy.pages[page] || copy.pages.home;
        }

        function formatPower(value) {
            const watts = Number(value);
            if (!Number.isFinite(watts)) return "–";
            return Math.abs(watts) >= 1000
                ? `${(watts / 1000).toFixed(1)} kW`
                : `${Math.round(watts)} W`;
        }

        function formatPrice(value) {
            const price = Number(value);
            if (!Number.isFinite(price)) return "–";
            return `${price.toFixed(2)} ct`;
        }

        function resolveTheme() {
            return themeMode.value === "auto"
                ? (systemDark.value ? "dark" : "light")
                : themeMode.value;
        }

        function applyTheme() {
            const resolved = resolveTheme();
            appConfig.theme = resolved;
            appConfig.themeMode = themeMode.value;
            document.documentElement.setAttribute("data-theme", resolved);
            document.documentElement.setAttribute("data-theme-mode", themeMode.value);
            requestAnimationFrame(() => {
                window.dispatchEvent(new Event("sfml-modern-themechange"));
                window.dispatchEvent(new Event("resize"));
            });
        }

        function setThemeMode(mode) {
            if (!["auto", "light", "dark"].includes(mode)) return;
            themeMode.value = mode;
            localStorage.setItem("sfml-stats-modern-theme", mode);
            applyTheme();
        }

        function handlePageTheme(theme) {
            setThemeMode(theme === "light" ? "light" : "dark");
        }

        function handleDashboardMode(mode) {
            dashboardMode.value = [
                "loading",
                "live",
                "mock",
                "degraded",
                "unavailable",
            ].includes(mode)
                ? mode
                : "unavailable";
            syncShellPolling();
        }

        function navigate(page, detail = "") {
            if (!pages[page]) return;
            if (page === "dashboard") dashboardMode.value = "loading";
            currentPage.value = page;
            currentDetail.value = detail || "";
            window.location.hash = detail ? `${page}/${detail}` : page;
            drawerOpen.value = false;
            document.title = `${pageCopy(page)[0]} · ${copy.product}`;
            nextTick(() => document.getElementById("main-content")?.focus({ preventScroll: true }));
        }

        function handleHashChange() {
            const [hashPage, hashDetail = ""] = window.location.hash.slice(1).split("/");
            const requestedPage = pages[hashPage] ? hashPage : "home";
            const page = requestedPage;
            if (page === "dashboard" && currentPage.value !== "dashboard") {
                dashboardMode.value = "loading";
            }
            currentPage.value = page;
            currentDetail.value = ["quality", "weather_energy", "tomorrow"].includes(page) ? hashDetail : "";
            document.title = `${pageCopy(page)[0]} · ${copy.product}`;
        }

        function closeDrawer() {
            drawerOpen.value = false;
        }

        function handleKeydown(event) {
            if (event.key === "Escape") closeDrawer();
        }

        async function loadPremiumCapabilities() {
            try {
                const dashboardResponse = await SFMLApi.fetch(
                    "/api/sfml_stats/modern/premium-dashboard",
                    { forceRefresh: true, ttl: 0 }
                );
                premiumCorrections.value = dashboardResponse?.data?.premium?.licensed === true;
                handleHashChange();
            } catch (_error) {
                premiumCorrections.value = false;
            }
        }

        async function fetchData(forceRefresh = false) {
            if (currentPage.value === "dashboard") {
                return;
            }
            if (requestPending.value) return;
            requestPending.value = true;
            try {
                const options = forceRefresh ? { forceRefresh: true } : {};
                const [summary, prices, energyFlow] = await Promise.all([
                    SFMLApi.fetch("/api/sfml_stats/summary", options),
                    SFMLApi.fetch("/api/sfml_stats/gpm_prices", options),
                    SFMLApi.fetch("/api/sfml_stats/energy_flow", options),
                ]);
                if (currentPage.value === "dashboard") {
                    return;
                }

                const flows = energyFlow?.flows || {};
                const battery = energyFlow?.battery || {};
                const home = energyFlow?.home || {};
                liveData.total_price = prices?.total_price ?? summary?.kpis?.price_current ?? null;
                liveData.battery_soc = battery.soc ?? null;
                liveData.solar_power = flows.solar_power ?? 0;
                liveData.home_consumption = home.consumption ?? 0;
                liveData.solar_to_house = flows.solar_to_house ?? 0;
                liveData.solar_to_battery = flows.solar_to_battery ?? 0;
                liveData.battery_to_house = flows.battery_to_house ?? 0;
                liveData.grid_to_house = flows.grid_to_house ?? 0;
                liveData.grid_export = flows.house_to_grid ?? 0;
                lastUpdated.value = new Date();
                connectionState.value = "live";
            } catch (error) {
                console.error("[SFML Stats] Dashboard data request failed", error);
                connectionState.value = "offline";
            } finally {
                if (currentPage.value !== "dashboard") {
                    hasLoaded.value = true;
                }
                requestPending.value = false;
            }
        }

        let pollTimer = null;
        let freshnessTimer = null;
        function clearShellData() {
            Object.assign(liveData, {
                total_price: null,
                battery_soc: null,
                solar_power: null,
                home_consumption: null,
                solar_to_house: null,
                solar_to_battery: null,
                battery_to_house: null,
                grid_to_house: null,
                grid_export: null,
            });
            lastUpdated.value = null;
            connectionState.value = "loading";
            hasLoaded.value = false;
        }

        function stopShellPolling(clearData = false) {
            window.clearInterval(pollTimer);
            window.clearInterval(freshnessTimer);
            pollTimer = null;
            freshnessTimer = null;
            if (clearData) clearShellData();
        }

        function startShellPolling() {
            if (pollTimer !== null) return;
            fetchData();
            pollTimer = window.setInterval(fetchData, 10000);
            freshnessTimer = window.setInterval(() => {
                if (
                    connectionState.value === "live"
                    && lastUpdated.value
                    && Date.now() - lastUpdated.value.getTime() > 30000
                ) {
                    connectionState.value = "stale";
                }
            }, 5000);
        }

        function syncShellPolling() {
            if (currentPage.value === "dashboard") {
                stopShellPolling(true);
            } else {
                startShellPolling();
            }
        }

        const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
        const handleColorScheme = (event) => {
            systemDark.value = event.matches;
            if (themeMode.value === "auto") applyTheme();
        };

        onMounted(() => {
            applyTheme();
            handleHashChange();
            window.addEventListener("hashchange", handleHashChange);
            window.addEventListener("keydown", handleKeydown);
            colorScheme.addEventListener("change", handleColorScheme);
            syncShellPolling();
            loadPremiumCapabilities();
        });

        onUnmounted(() => {
            window.removeEventListener("hashchange", handleHashChange);
            window.removeEventListener("keydown", handleKeydown);
            colorScheme.removeEventListener("change", handleColorScheme);
            stopShellPolling();
        });

        watch(currentPage, () => {
            window.scrollTo({ top: 0, behavior: "auto" });
            syncShellPolling();
        });

        return {
            copy,
            currentPage,
            currentDetail,
            dashboardMode,
            currentPageCopy,
            currentPageComponent,
            navigation,
            isAdmin,
            premiumCorrections,
            mobileNavigation,
            themeOptions,
            themeMode,
            drawerOpen,
            hasLoaded,
            connectionState,
            lastUpdated,
            updatedTime,
            liveData,
            appConfig,
            pageCopy,
            formatPower,
            formatPrice,
            navigate,
            closeDrawer,
            setThemeMode,
            handlePageTheme,
            handleDashboardMode,
            fetchData,
        };
    },
};

installModernChartDefaults();
const sfmlStatsModernApp = createApp(ModernApp);
sfmlStatsModernApp.component("ui-icon", UiIcon);
sfmlStatsModernApp.component("modern-intelligence-overview", window.ModernIntelligenceOverview);
sfmlStatsModernApp.config.globalProperties.$t = window.SFMLI18n?.t || ((key) => key);
sfmlStatsModernApp.mount("#app");
