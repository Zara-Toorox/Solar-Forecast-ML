// SFML Stats TFS V.20
// (C) 2026 Zara-Toorox

const { createApp, ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } = Vue;

const App = {
    template: `
        <div class="app" :class="{ 'mobile': isMobile }">
            <!-- Sticky Header -->
            <header class="header">
                <div class="header-brand">
                    <span class="header-icon">☀</span>
                    <span class="header-title">SFML Stats TFS V.20</span>
                </div>
                <div class="header-indicators">
                    <div class="indicator" v-if="liveData.total_price != null">
                        <span class="indicator-icon">⚡</span>
                        <span class="indicator-value" :class="priceClass">{{ formatPrice(liveData.total_price) }} ct</span>
                    </div>
                    <div class="indicator" v-if="liveData.battery_soc != null">
                        <span class="indicator-icon">🔋</span>
                        <span class="indicator-value">{{ liveData.battery_soc }}%</span>
                    </div>
                    <div class="indicator" v-if="liveData.solar_power != null">
                        <span class="indicator-icon">☀</span>
                        <span class="indicator-value">{{ formatPower(liveData.solar_power) }}</span>
                    </div>
                    <div class="indicator status">
                        <span class="status-dot" :class="{ connected: wsConnected }"></span>
                        <span>Live</span>
                    </div>
                </div>
                <nav class="nav-tabs">
                    <button v-for="tab in tabs" :key="tab.id"
                            class="nav-tab"
                            :class="{ active: currentPage === tab.id }"
                            @click="navigate(tab.id)">
                        <span class="nav-icon">{{ tab.icon }}</span>
                        <span class="nav-label">{{ tab.label }}</span>
                    </button>
                </nav>
            </header>

            <!-- Page Content with Transitions -->
            <main class="main-content">
                <transition name="page" mode="out-in">
                    <component :is="currentPageComponent"
                               :live-data="liveData"
                               :config="appConfig"
                               @navigate="navigate" />
                </transition>
            </main>

            <!-- Mobile Bottom Nav -->
            <nav class="mobile-nav" v-if="isMobile">
                <button v-for="tab in tabs" :key="tab.id"
                        class="mobile-nav-item"
                        :class="{ active: currentPage === tab.id }"
                        @click="navigate(tab.id)">
                    <span class="mobile-nav-icon">{{ tab.icon }}</span>
                    <span class="mobile-nav-label">{{ tab.label }}</span>
                </button>
            </nav>
        </div>
    `,

    setup() {
        const currentPage = ref('home');
        const wsConnected = ref(false);
        const isMobile = ref(window.innerWidth < 768);

        const liveData = reactive({
            total_price: null,
            battery_soc: null,
            solar_power: null,
            home_consumption: null,
            // Energy flow
            solar_to_house: 0,
            solar_to_battery: 0,
            battery_to_house: 0,
            grid_to_house: 0,
            grid_export: 0,
        });

        const appConfig = reactive({
            theme: 'dark',
            country: 'DE',
        });

        const tabs = [
            { id: 'home', label: 'Home', icon: '🏠' },
            { id: 'flow', label: 'Flow', icon: '🔀' },
            { id: 'solar', label: 'Solar', icon: '☀' },
            { id: 'weather', label: 'Wetter', icon: '🌤' },
            { id: 'energy', label: 'Energie', icon: '⚡' },
            { id: 'settings', label: 'Settings', icon: '⚙' },
        ];

        // Pages (lazy loaded)
        const pages = {
            home: window.HomePage || { template: '<div class="page page-home"><h2>Loading...</h2></div>' },
            flow: window.FlowPage || { template: '<div class="page page-flow"><h2>Loading...</h2></div>' },
            solar: window.SolarPage || { template: '<div class="page page-solar"><h2>Loading...</h2></div>' },
            weather: window.WeatherPage || { template: '<div class="page page-weather"><h2>Loading...</h2></div>' },
            energy: window.EnergyPage || { template: '<div class="page page-energy"><h2>⚡ Energie & Finanzen</h2><p>Loading...</p></div>' },
            settings: window.SettingsPage || { template: '<div class="page page-settings"><h2>⚙ Einstellungen</h2><p>Loading...</p></div>' },
        };

        const currentPageComponent = computed(() => pages[currentPage.value] || pages.home);

        function navigate(page) {
            currentPage.value = page;
            window.location.hash = page;
        }

        // Hash routing
        function handleHashChange() {
            const hash = window.location.hash.slice(1) || 'home';
            if (pages[hash]) {
                currentPage.value = hash;
            }
        }

        // Format helpers
        function formatPrice(val) {
            return val != null ? val.toFixed(2) : '--';
        }
        function formatPower(watts) {
            if (watts == null) return '--';
            return watts >= 1000 ? (watts / 1000).toFixed(1) + ' kW' : Math.round(watts) + ' W';
        }

        const priceClass = computed(() => {
            const p = liveData.total_price;
            if (p == null) return '';
            if (p < 25) return 'price-cheap';
            if (p > 40) return 'price-expensive';
            return 'price-normal';
        });

        // Data fetching
        let pollInterval = null;

        async function fetchData() {
            try {
                const [summary, gpmPrices, energyFlow] = await Promise.all([
                    SFMLApi.fetch('/api/sfml_stats/summary'),
                    SFMLApi.fetch('/api/sfml_stats/gpm_prices'),
                    SFMLApi.fetch('/api/sfml_stats/energy_flow'),
                ]);

                // GPM prices for header indicators
                if (gpmPrices) {
                    liveData.total_price = gpmPrices.total_price;
                }

                // Energy flow for header indicators
                if (energyFlow) {
                    const f = energyFlow.flows || {};
                    const b = energyFlow.battery || {};
                    const h = energyFlow.home || {};
                    liveData.solar_power = f.solar_power || 0;
                    liveData.battery_soc = b.soc ?? null;
                    liveData.home_consumption = h.consumption || 0;
                    liveData.solar_to_house = f.solar_to_house || 0;
                    liveData.solar_to_battery = f.solar_to_battery || 0;
                    liveData.battery_to_house = f.battery_to_house || 0;
                    liveData.grid_to_house = f.grid_to_house || 0;
                    liveData.grid_export = f.house_to_grid || 0;
                }

                // Fallback price from summary if GPM not available
                if (liveData.total_price == null && summary && summary.kpis) {
                    liveData.total_price = summary.kpis.price_current;
                }

                wsConnected.value = true;
            } catch (err) {
                console.error('Fetch error:', err);
                wsConnected.value = false;
            }
        }

        onMounted(() => {
            handleHashChange();
            window.addEventListener('hashchange', handleHashChange);
            window.addEventListener('resize', () => { isMobile.value = window.innerWidth < 768; });
            fetchData();
            pollInterval = setInterval(fetchData, 5000);
        });

        onUnmounted(() => {
            window.removeEventListener('hashchange', handleHashChange);
            if (pollInterval) clearInterval(pollInterval);
        });

        return {
            currentPage, currentPageComponent, wsConnected, isMobile,
            liveData, appConfig, tabs,
            navigate, formatPrice, formatPower, priceClass,
        };
    }
};

createApp(App).mount('#app');
