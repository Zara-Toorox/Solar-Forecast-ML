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
    charge: "M7 7V3M17 7V3M5 7h14v4a7 7 0 0 1-7 7v3M8 21h8",
    settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.38.2.73.32 1.1.4h.5v4h-.09A1.7 1.7 0 0 0 19.4 15Z",
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
        mobile: { home: "Übersicht", solar: "Solar", energy: "Energie" },
        pages: {
            home: ["Übersicht", "Live-Energiefluss und Prognosestatus"],
            solar: ["Solar & Prognose", "Ertrag, Modelle, Abweichungen und Schatten"],
            weather: ["Wetter", "Prognose, Strahlung und Historie"],
            energy: ["Energie & Finanzen", "Bilanz, Verbraucher, Tarife und Amortisation"],
            smart_charging: ["Smart Charging", "Ladeentscheidung, Preise und Batterieziel"],
            settings: ["Systemstatus", "Konfiguration, Sensoren und Datenqualität"],
            quality: ["Forecast Intelligence", "Qualität, Modelle und Entwicklung nachvollziehen"],
            weather_energy: ["Wetter & Energie", "Bedingungen, Prognose und Ertrag gemeinsam analysieren"],
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
    },
    en: {
        product: "Solar Forecast Stats",
        sections: { live: "Monitoring", analysis: "Analysis", system: "Control" },
        mobile: { home: "Overview", solar: "Solar", energy: "Energy" },
        pages: {
            home: ["Overview", "Live energy flow and forecast status"],
            solar: ["Solar & Forecast", "Yield, models, deviations and shading"],
            weather: ["Weather", "Forecast, radiation and history"],
            energy: ["Energy & Finance", "Balance, consumers, tariffs and payback"],
            smart_charging: ["Smart Charging", "Charge decision, prices and battery target"],
            settings: ["System Status", "Configuration, sensors and data quality"],
            quality: ["Forecast Intelligence", "Understand quality, models and development"],
            weather_energy: ["Weather & Energy", "Analyse conditions, forecast and yield together"],
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
    },
    pl: {
        product: "Solar Forecast Stats",
        sections: { live: "Monitoring", analysis: "Analiza", system: "Sterowanie" },
        mobile: { home: "Przegląd", solar: "Solar", energy: "Energia" },
        pages: {
            home: ["Przegląd", "Przepływ energii i stan prognozy"],
            solar: ["Energia słoneczna", "Produkcja, modele, odchylenia i cień"],
            weather: ["Pogoda", "Prognoza, promieniowanie i historia"],
            energy: ["Energia i finanse", "Bilans, odbiorniki, taryfy i amortyzacja"],
            smart_charging: ["Smart Charging", "Decyzja ładowania, ceny i cel baterii"],
            settings: ["Stan systemu", "Konfiguracja, czujniki i jakość danych"],
            quality: ["Forecast Intelligence", "Jakość, modele i długoterminowy rozwój"],
            weather_energy: ["Pogoda i energia", "Wspólna analiza warunków, prognozy i uzysku"],
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
    },
};

function installModernChartDefaults() {
    if (!window.echarts || window.echarts.__sfmlModernDefaults) return;

    const originalInit = window.echarts.init.bind(window.echarts);
    const semanticSeries = [
        {
            terms: ["actual", "ist", "gemessen", "ertrag"],
            color: "#2f8f5b",
            lineType: "solid",
            symbol: "circle",
        },
        {
            terms: ["final", "finale prognose", "prediction"],
            color: "#168f87",
            lineType: "solid",
            symbol: "roundRect",
        },
        {
            terms: ["physics", "physik", "rule based", "regelbasiert"],
            color: "#c47a20",
            lineType: "dashed",
            symbol: "triangle",
        },
        {
            terms: ["hubble", "ki", " ai", "lstm", "ridge"],
            color: "#3d73b9",
            lineType: "dotted",
            symbol: "diamond",
        },
        {
            terms: ["p10", "konservativ", "conservative"],
            color: "#7a6a9e",
            lineType: "dashed",
            symbol: "emptyCircle",
        },
        {
            terms: ["reforecast", "neu-prognose"],
            color: "#c65353",
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
        return semanticSeries.find((entry) => entry.terms.some((term) => normalized.includes(term)));
    }

    function normalizeChartOption(option) {
        if (!option || typeof option !== "object") return option;

        const textPrimary = token("--text-primary", "#f3f6f7");
        const textSecondary = token("--text-secondary", "#aab5ba");
        const border = token("--border-default", "#2a353b");
        const surface = token("--bg-card", "#151b1f");

        option.animationDuration = 280;
        option.animationDurationUpdate = 180;
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
                extraCssText: "border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,.2);",
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
                    lineStyle: { ...axis.splitLine?.lineStyle, color: border },
                };
            });
        });

        if (Array.isArray(option.series)) {
            option.series.forEach((series) => {
                const semantic = findSemanticStyle(series.name);
                if (!semantic) return;
                series.itemStyle = { ...series.itemStyle, color: semantic.color };
                series.lineStyle = {
                    ...series.lineStyle,
                    color: semantic.color,
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
        return chart;
    };
    window.echarts.__sfmlModernDefaults = true;
}

const ModernApp = {
    components: { UiIcon },
    template: `
        <div class="modern-app" :class="{ 'drawer-open': drawerOpen }">
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
                                class="nav-item" :class="{ active: currentPage === item.id }"
                                :aria-current="currentPage === item.id ? 'page' : null"
                                @click="navigate(item.id)">
                            <ui-icon :name="item.icon"></ui-icon>
                            <span>{{ pageCopy(item.id)[0] }}</span>
                        </button>
                    </div>
                </nav>

                <div class="sidebar-footer">
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
                            <h1>{{ currentPageCopy[0] }}</h1>
                            <p>{{ currentPageCopy[1] }}</p>
                        </div>
                    </div>

                    <div class="topbar-actions">
                        <div class="live-metrics" aria-label="Live status">
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
                    <div v-if="!hasLoaded" class="initial-state" role="status" aria-live="polite">
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

        const navigation = [
            { id: "live", items: [{ id: "home", icon: "home" }] },
            {
                id: "analysis",
                items: [
                    { id: "solar", icon: "solar" },
                    { id: "quality", icon: "quality" },
                    { id: "weather_energy", icon: "weather" },
                    { id: "weather", icon: "weather" },
                    { id: "energy", icon: "energy" },
                ],
            },
            {
                id: "system",
                items: [
                    { id: "smart_charging", icon: "charge" },
                    { id: "settings", icon: "settings" },
                ],
            },
        ];

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
            home: window.HomePage,
            solar: window.SolarPage,
            quality: window.ModernQualityPage,
            weather_energy: window.ModernWeatherEnergyPage,
            weather: window.WeatherPage,
            energy: window.EnergyPage,
            smart_charging: window.SmartChargingPage,
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
            requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
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

        function navigate(page, detail = "") {
            if (!pages[page]) return;
            currentPage.value = page;
            currentDetail.value = detail || "";
            window.location.hash = detail ? `${page}/${detail}` : page;
            drawerOpen.value = false;
            document.title = `${pageCopy(page)[0]} · ${copy.product}`;
            nextTick(() => document.getElementById("main-content")?.focus({ preventScroll: true }));
        }

        function handleHashChange() {
            const [hashPage, hashDetail = ""] = window.location.hash.slice(1).split("/");
            const page = pages[hashPage] ? hashPage : "home";
            currentPage.value = page;
            currentDetail.value = ["quality", "weather_energy"].includes(page) ? hashDetail : "";
            document.title = `${pageCopy(page)[0]} · ${copy.product}`;
        }

        function closeDrawer() {
            drawerOpen.value = false;
        }

        function handleKeydown(event) {
            if (event.key === "Escape") closeDrawer();
        }

        async function fetchData(forceRefresh = false) {
            if (requestPending.value) return;
            requestPending.value = true;
            try {
                const options = forceRefresh ? { forceRefresh: true } : {};
                const [summary, prices, energyFlow] = await Promise.all([
                    SFMLApi.fetch("/api/sfml_stats/summary", options),
                    SFMLApi.fetch("/api/sfml_stats/gpm_prices", options),
                    SFMLApi.fetch("/api/sfml_stats/energy_flow", options),
                ]);

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
                hasLoaded.value = true;
                requestPending.value = false;
            }
        }

        let pollTimer = null;
        let freshnessTimer = null;
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
        });

        onUnmounted(() => {
            window.removeEventListener("hashchange", handleHashChange);
            window.removeEventListener("keydown", handleKeydown);
            colorScheme.removeEventListener("change", handleColorScheme);
            window.clearInterval(pollTimer);
            window.clearInterval(freshnessTimer);
        });

        watch(currentPage, () => {
            window.scrollTo({ top: 0, behavior: "auto" });
        });

        return {
            copy,
            currentPage,
            currentDetail,
            currentPageCopy,
            currentPageComponent,
            navigation,
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
