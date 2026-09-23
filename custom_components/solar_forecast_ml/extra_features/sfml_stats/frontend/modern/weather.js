// Scoped so its Vue bindings do not collide with other page scripts.
(() => {
const { ref, watch, nextTick, onMounted } = Vue;

const WEATHER_SHELL_TABS = ["now", "overview", "story", "impact", "compare"];

const WEATHER_SHELL_COPY = {
    de: {
        label: "Wetter",
        tabs: {
            now: "Aktuell",
            overview: "Ertrag",
            story: "Tagesgeschichte",
            impact: "Weather Impact",
            compare: "Vergleichstage",
        },
        tabsShort: {
            now: "Jetzt",
            overview: "Ertrag",
            story: "Story",
            impact: "Einfluss",
            compare: "Vergleich",
        },
    },
    en: {
        label: "Weather",
        tabs: {
            now: "Current",
            overview: "Yield",
            story: "Day Story",
            impact: "Weather Impact",
            compare: "Comparable Days",
        },
        tabsShort: {
            now: "Now",
            overview: "Yield",
            story: "Story",
            impact: "Impact",
            compare: "Compare",
        },
    },
    pl: {
        label: "Pogoda",
        tabs: {
            now: "Aktualnie",
            overview: "Uzysk",
            story: "Historia dnia",
            impact: "Wpływ pogody",
            compare: "Podobne dni",
        },
        tabsShort: {
            now: "Teraz",
            overview: "Uzysk",
            story: "Dzień",
            impact: "Wpływ",
            compare: "Porównaj",
        },
    },
};

function weatherShellLocale() {
    return ["de", "en", "pl"].includes(window.SFMLI18n?.current) ? window.SFMLI18n.current : "en";
}

function normalizeWeatherTab(value) {
    return WEATHER_SHELL_TABS.includes(value) ? value : "now";
}

window.ModernWeatherPage = {
    props: {
        initialSection: { type: String, default: "" },
        liveData: { type: Object, default: () => ({}) },
        config: { type: Object, default: () => ({}) },
    },
    emits: ["navigate"],
    template: `
        <div class="we-lab">
            <div class="we-commandbar">
                <div class="we-tabs" role="tablist" :aria-label="copy.label">
                    <button v-for="tab in tabs" :key="tab" type="button" role="tab"
                            :aria-selected="activeTab === tab" :class="{ active: activeTab === tab }"
                            @click="selectTab(tab)">
                        <span class="we-tab-long">{{ copy.tabs[tab] }}</span>
                        <span class="we-tab-short">{{ copy.tabsShort[tab] }}</span>
                    </button>
                </div>
            </div>
            <component v-if="activeTab === 'now'"
                       :is="weatherPage"
                       :live-data="liveData"
                       :config="config" />
            <component v-else
                       :is="energyPage"
                       :key="activeTab"
                       :embedded="true"
                       :tab="activeTab"
                       :initial-section="activeTab" />
        </div>
    `,
    setup(props, { emit }) {
        const locale = weatherShellLocale();
        const copy = WEATHER_SHELL_COPY[locale] || WEATHER_SHELL_COPY.en;
        const tabs = WEATHER_SHELL_TABS;
        const activeTab = ref(normalizeWeatherTab(props.initialSection));
        const weatherPage = window.WeatherPage;
        const energyPage = window.ModernWeatherEnergyPage;

        function scheduleChartResize() {
            nextTick(() => {
                requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
            });
        }

        function selectTab(tab) {
            const next = normalizeWeatherTab(tab);
            if (next === activeTab.value) return;
            emit("navigate", "weather", next);
        }

        watch(() => props.initialSection, (value) => {
            const next = normalizeWeatherTab(value);
            if (next !== activeTab.value) activeTab.value = next;
        });
        watch(activeTab, () => scheduleChartResize());
        onMounted(() => scheduleChartResize());

        return { copy, tabs, activeTab, weatherPage, energyPage, selectTab };
    },
};
})();
