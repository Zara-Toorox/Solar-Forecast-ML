/* Tablet modes: choose a full-screen display for a wall-mounted tablet.
   Each mode is a standalone kiosk page that opens in its own window. */

const TABLET_MODES = [
    {
        id: "zara_dynamic_grid",
        name: "Zara-Dynamic-Grid",
        href: "/api/sfml_stats/wall",
        preview: "/api/sfml_stats/static/modern/assets/tablet-zara-dynamic-grid.webp",
        previewSize: [1200, 734],
    },
    {
        id: "zara_consumption",
        name: "Zara-Consumption",
        href: "/api/sfml_stats/wall?mode=consumption",
        preview: "/api/sfml_stats/static/modern/assets/tablet-zara-consumption.webp",
        previewSize: [1200, 745],
    },
    {
        id: "zara_mission_grid",
        name: "Zara-Dynamic-Grid Mission Control",
        href: "/api/sfml_stats/wall?theme=mission",
        preview: "/api/sfml_stats/static/modern/assets/tablet-zara-mission-grid.webp",
        previewSize: [1200, 750],
    },
    {
        id: "zara_mission_consumption",
        name: "Zara-Consumption Mission Control",
        href: "/api/sfml_stats/wall?theme=mission&mode=consumption",
        preview: "/api/sfml_stats/static/modern/assets/tablet-zara-mission-consumption.webp",
        previewSize: [1200, 750],
    },
    {
        id: "zara_lcars_grid",
        name: "Zara-Dynamic-Grid LCARS",
        href: "/api/sfml_stats/wall?theme=lcars",
        preview: "/api/sfml_stats/static/modern/assets/tablet-zara-lcars-grid.webp",
        previewSize: [1200, 750],
    },
    {
        id: "zara_lcars_consumption",
        name: "Zara-Consumption LCARS",
        href: "/api/sfml_stats/wall?theme=lcars&mode=consumption",
        preview: "/api/sfml_stats/static/modern/assets/tablet-zara-lcars-consumption.webp",
        previewSize: [1200, 750],
    },
    {
        id: "zara_horizon_grid",
        name: "Zara-Dynamic-Grid Horizon",
        href: "/api/sfml_stats/wall?theme=horizon",
        preview: "/api/sfml_stats/static/modern/assets/tablet-zara-horizon-grid.webp",
        previewSize: [1200, 750],
    },
    {
        id: "zara_horizon_consumption",
        name: "Zara-Consumption Horizon",
        href: "/api/sfml_stats/wall?theme=horizon&mode=consumption",
        preview: "/api/sfml_stats/static/modern/assets/tablet-zara-horizon-consumption.webp",
        previewSize: [1200, 750],
    },
];

const TABLET_COPY = {
    de: {
        heroTitle: "Hier kannst Du einen Tablet-Modus auswählen",
        heroText: "Der Tablet-Modus eignet sich besonders für Wand-Tablets, Monitore oder dauerhafte Anzeigen. Du hast eine tolle Idee für einen eigenen Screen? Dann melde Dich bei mir. Ich passe ihn an SFML an, und er kommt mit dem jeweils nächsten Update.",
        open: "Öffnen",
        shows: "Zeigt",
        install: "Für echtes Vollbild die Seite auf dem Tablet zum Startbildschirm hinzufügen.",
        modes: {
            zara_dynamic_grid: {
                text: "Die ganze Energielage auf einen Blick, groß und aus der Entfernung lesbar.",
                items: [
                    "Aktuelle PV-Leistung",
                    "Energiefluss zu Haus, Batterie und Netz",
                    "Ertrag heute und Tagesprognose",
                    "Strompreis jetzt und günstigste Stunde (mit GPM)",
                    "Tageskurve Ertrag gegen Prognose",
                    "Wetter, Uhrzeit und die nächsten Tage",
                ],
            },
            zara_consumption: {
                text: "Der Tag aus Sicht des Hauses: was verbraucht wurde und was in den Akku ging, ganz ohne Strompreis.",
                items: [
                    "Aktuelle PV-Leistung",
                    "Energiefluss zu Haus, Batterie und Netz",
                    "Ertrag heute und Tagesprognose",
                    "Hausverbrauch heute",
                    "Zum Akku heute (aus PV und Netz)",
                    "Tageskurve, Wetter, Uhrzeit und die nächsten Tage",
                ],
            },
            zara_mission_grid: {
                text: "Die Energielage als Leitstand: Missionszeit seit Sonnenaufgang, PV-Skala bis zur Anlagenleistung und Live-Telemetrie.",
                items: [
                    "Missionszeit seit Sonnenaufgang",
                    "PV-Leistung auf einer Skala bis zur Anlagenleistung",
                    "Energiefluss zu Haus, Batterie und Netz",
                    "Ertrag heute gegen Tagesprognose",
                    "Strompreis jetzt und günstigste Stunde (mit GPM)",
                    "Tageskurve, Wetter, Uhrzeit und die nächsten Tage",
                ],
            },
            zara_mission_consumption: {
                text: "Der Leitstand aus Sicht des Hauses: Verbrauch und Akkuladung statt Strompreis.",
                items: [
                    "Missionszeit seit Sonnenaufgang",
                    "PV-Leistung auf einer Skala bis zur Anlagenleistung",
                    "Energiefluss zu Haus, Batterie und Netz",
                    "Ertrag heute gegen Tagesprognose",
                    "Hausverbrauch heute und zum Akku heute",
                    "Tageskurve, Wetter, Uhrzeit und die nächsten Tage",
                ],
            },
            zara_lcars_grid: {
                text: "Hommage an die Anfangszeit von SFML: die Energielage im Stil der Raumschiff-Konsolen, mit Segmentziffern und Sensorleiste.",
                items: [
                    "PV-Leistung und Uhr als Segmentanzeige",
                    "Sensorstatus und Scanner-Anzeige zum PV-Feld",
                    "Energiefluss zu Haus, Batterie und Netz",
                    "Ertrag heute als Balken bis zur Tagesprognose",
                    "Strompreis jetzt und günstigste Stunde (mit GPM)",
                    "Tageskurve, Wetter und die nächsten Tage",
                ],
            },
            zara_lcars_consumption: {
                text: "Die Konsolen-Hommage aus Sicht des Hauses: Verbrauch und Akkuladung statt Strompreis.",
                items: [
                    "PV-Leistung und Uhr als Segmentanzeige",
                    "Sensorstatus und Scanner-Anzeige zum PV-Feld",
                    "Energiefluss zu Haus, Batterie und Netz",
                    "Ertrag heute als Balken bis zur Tagesprognose",
                    "Hausverbrauch heute und zum Akku heute",
                    "Tageskurve, Wetter und die nächsten Tage",
                ],
            },
            zara_horizon_grid: {
                text: "Der Tag als Landschaft: Die Sonne wandert auf ihrem Bogen, der Himmel folgt Tageszeit und Wetter.",
                items: [
                    "Sonnenbogen von Sonnenaufgang bis -untergang",
                    "Himmel passend zu Tageszeit und aktuellem Wetter",
                    "Ertrag und Prognose als Kurven am Horizont",
                    "Energiefluss zu Haus, Batterie und Netz",
                    "Strompreis jetzt und günstigste Stunde (mit GPM)",
                    "Wetter, Uhrzeit und die nächsten Tage",
                ],
            },
            zara_horizon_consumption: {
                text: "Die Landschaft aus Sicht des Hauses: Verbrauch und Akkuladung statt Strompreis.",
                items: [
                    "Sonnenbogen von Sonnenaufgang bis -untergang",
                    "Himmel passend zu Tageszeit und aktuellem Wetter",
                    "Ertrag und Prognose als Kurven am Horizont",
                    "Energiefluss zu Haus, Batterie und Netz",
                    "Hausverbrauch heute und zum Akku heute",
                    "Wetter, Uhrzeit und die nächsten Tage",
                ],
            },
        },
    },
    en: {
        heroTitle: "Choose a tablet mode here",
        heroText: "Tablet mode is ideal for wall-mounted tablets, monitors or always-on displays. Got a great idea for a screen of your own? Get in touch. I will adapt it to SFML, and it will ship with the next update.",
        open: "Open",
        shows: "Shows",
        install: "For true full screen, add the page to the tablet's home screen.",
        modes: {
            zara_dynamic_grid: {
                text: "Your whole energy situation at a glance, large and readable from across the room.",
                items: [
                    "Current PV power",
                    "Energy flow to home, battery and grid",
                    "Yield today and daily forecast",
                    "Current price and cheapest hour (with GPM)",
                    "Daily curve of yield against forecast",
                    "Weather, time and the next days",
                ],
            },
            zara_consumption: {
                text: "The day from the home's point of view: what was consumed and what went into the battery, without any electricity price.",
                items: [
                    "Current PV power",
                    "Energy flow to home, battery and grid",
                    "Yield today and daily forecast",
                    "Home consumption today",
                    "Into battery today (from PV and grid)",
                    "Daily curve, weather, time and the next days",
                ],
            },
            zara_mission_grid: {
                text: "Your energy situation as a control room: mission time since sunrise, a PV scale up to the plant size and live telemetry.",
                items: [
                    "Mission time since sunrise",
                    "PV power on a scale up to the plant size",
                    "Energy flow to home, battery and grid",
                    "Yield today against the daily forecast",
                    "Current price and cheapest hour (with GPM)",
                    "Daily curve, weather, time and the next days",
                ],
            },
            zara_mission_consumption: {
                text: "The control room from the home's point of view: consumption and battery charging instead of the electricity price.",
                items: [
                    "Mission time since sunrise",
                    "PV power on a scale up to the plant size",
                    "Energy flow to home, battery and grid",
                    "Yield today against the daily forecast",
                    "Home consumption today and into battery today",
                    "Daily curve, weather, time and the next days",
                ],
            },
            zara_lcars_grid: {
                text: "A tribute to the early days of SFML: your energy situation in starship console style, with segment digits and a sensor bar.",
                items: [
                    "PV power and clock as segment display",
                    "Sensor status and a scanner view of the PV array",
                    "Energy flow to home, battery and grid",
                    "Yield today as a bar up to the daily forecast",
                    "Current price and cheapest hour (with GPM)",
                    "Daily curve, weather and the next days",
                ],
            },
            zara_lcars_consumption: {
                text: "The console tribute from the home's point of view: consumption and battery charging instead of the electricity price.",
                items: [
                    "PV power and clock as segment display",
                    "Sensor status and a scanner view of the PV array",
                    "Energy flow to home, battery and grid",
                    "Yield today as a bar up to the daily forecast",
                    "Home consumption today and into battery today",
                    "Daily curve, weather and the next days",
                ],
            },
            zara_horizon_grid: {
                text: "The day as a landscape: the sun travels along its arc and the sky follows the time of day and the weather.",
                items: [
                    "Sun arc from sunrise to sunset",
                    "Sky matching the time of day and current weather",
                    "Yield and forecast as curves on the horizon",
                    "Energy flow to home, battery and grid",
                    "Current price and cheapest hour (with GPM)",
                    "Weather, time and the next days",
                ],
            },
            zara_horizon_consumption: {
                text: "The landscape from the home's point of view: consumption and battery charging instead of the electricity price.",
                items: [
                    "Sun arc from sunrise to sunset",
                    "Sky matching the time of day and current weather",
                    "Yield and forecast as curves on the horizon",
                    "Energy flow to home, battery and grid",
                    "Home consumption today and into battery today",
                    "Weather, time and the next days",
                ],
            },
        },
    },
    pl: {
        heroTitle: "Tutaj możesz wybrać tryb tabletu",
        heroText: "Tryb tabletu sprawdza się szczególnie na tabletach ściennych, monitorach i stałych wyświetlaczach. Masz świetny pomysł na własny ekran? Napisz do mnie. Dopasuję go do SFML, a pojawi się w kolejnej aktualizacji.",
        open: "Otwórz",
        shows: "Pokazuje",
        install: "Aby uzyskać pełny ekran, dodaj stronę do ekranu głównego tabletu.",
        modes: {
            zara_dynamic_grid: {
                text: "Cała sytuacja energetyczna w jednym widoku, duża i czytelna z daleka.",
                items: [
                    "Bieżąca moc PV",
                    "Przepływ energii do domu, baterii i sieci",
                    "Uzysk dziś i prognoza dzienna",
                    "Cena teraz i najtańsza godzina (z GPM)",
                    "Krzywa dnia: uzysk wobec prognozy",
                    "Pogoda, godzina i kolejne dni",
                ],
            },
            zara_consumption: {
                text: "Dzień z perspektywy domu: co zostało zużyte i co trafiło do baterii, bez ceny prądu.",
                items: [
                    "Bieżąca moc PV",
                    "Przepływ energii do domu, baterii i sieci",
                    "Uzysk dziś i prognoza dzienna",
                    "Zużycie domu dziś",
                    "Do baterii dziś (z PV i sieci)",
                    "Krzywa dnia, pogoda, godzina i kolejne dni",
                ],
            },
            zara_mission_grid: {
                text: "Sytuacja energetyczna jako centrum dowodzenia: czas misji od wschodu słońca, skala PV do mocy instalacji i telemetria na żywo.",
                items: [
                    "Czas misji od wschodu słońca",
                    "Moc PV na skali do mocy instalacji",
                    "Przepływ energii do domu, baterii i sieci",
                    "Uzysk dziś wobec prognozy dziennej",
                    "Cena teraz i najtańsza godzina (z GPM)",
                    "Krzywa dnia, pogoda, godzina i kolejne dni",
                ],
            },
            zara_mission_consumption: {
                text: "Centrum dowodzenia z perspektywy domu: zużycie i ładowanie baterii zamiast ceny prądu.",
                items: [
                    "Czas misji od wschodu słońca",
                    "Moc PV na skali do mocy instalacji",
                    "Przepływ energii do domu, baterii i sieci",
                    "Uzysk dziś wobec prognozy dziennej",
                    "Zużycie domu dziś i do baterii dziś",
                    "Krzywa dnia, pogoda, godzina i kolejne dni",
                ],
            },
            zara_lcars_grid: {
                text: "Hołd dla początków SFML: sytuacja energetyczna w stylu konsoli statku kosmicznego, z cyframi segmentowymi i paskiem czujników.",
                items: [
                    "Moc PV i zegar jako wyświetlacz segmentowy",
                    "Status czujników i skaner pola PV",
                    "Przepływ energii do domu, baterii i sieci",
                    "Uzysk dziś jako pasek do prognozy dziennej",
                    "Cena teraz i najtańsza godzina (z GPM)",
                    "Krzywa dnia, pogoda i kolejne dni",
                ],
            },
            zara_lcars_consumption: {
                text: "Hołd konsoli z perspektywy domu: zużycie i ładowanie baterii zamiast ceny prądu.",
                items: [
                    "Moc PV i zegar jako wyświetlacz segmentowy",
                    "Status czujników i skaner pola PV",
                    "Przepływ energii do domu, baterii i sieci",
                    "Uzysk dziś jako pasek do prognozy dziennej",
                    "Zużycie domu dziś i do baterii dziś",
                    "Krzywa dnia, pogoda i kolejne dni",
                ],
            },
            zara_horizon_grid: {
                text: "Dzień jako krajobraz: słońce wędruje po łuku, a niebo dopasowuje się do pory dnia i pogody.",
                items: [
                    "Łuk słońca od wschodu do zachodu",
                    "Niebo zgodne z porą dnia i bieżącą pogodą",
                    "Uzysk i prognoza jako krzywe na horyzoncie",
                    "Przepływ energii do domu, baterii i sieci",
                    "Cena teraz i najtańsza godzina (z GPM)",
                    "Pogoda, godzina i kolejne dni",
                ],
            },
            zara_horizon_consumption: {
                text: "Krajobraz z perspektywy domu: zużycie i ładowanie baterii zamiast ceny prądu.",
                items: [
                    "Łuk słońca od wschodu do zachodu",
                    "Niebo zgodne z porą dnia i bieżącą pogodą",
                    "Uzysk i prognoza jako krzywe na horyzoncie",
                    "Przepływ energii do domu, baterii i sieci",
                    "Zużycie domu dziś i do baterii dziś",
                    "Pogoda, godzina i kolejne dni",
                ],
            },
        },
    },
};

const TabletModesPage = {
    name: "TabletModesPage",
    props: {
        liveData: { type: Object, default: () => ({}) },
        config: { type: Object, default: () => ({}) },
        initialSection: { type: String, default: "" },
    },
    emits: ["navigate"],
    setup() {
        const requested = window.SFMLI18n?.current;
        const locale = requested === "de" || requested === "pl" ? requested : "en";
        const copy = TABLET_COPY[locale];
        const modes = TABLET_MODES.map((mode) => ({ ...mode, ...copy.modes[mode.id] }));
        return { copy, modes };
    },
    template: `
        <div class="tablet-page">
            <hubble-say class="tablet-hubble" tone="active" :headline="copy.heroTitle" :detail="copy.heroText"></hubble-say>
            <div class="tablet-modes">
                <article v-for="mode in modes" :key="mode.id" class="tablet-mode">
                    <a v-if="mode.preview" class="tablet-mode-preview" :href="mode.href" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">
                        <img :src="mode.preview" alt="" :width="mode.previewSize[0]" :height="mode.previewSize[1]" loading="lazy">
                    </a>
                    <div class="tablet-mode-body">
                        <h3>{{ mode.name }}</h3>
                        <p>{{ mode.text }}</p>
                        <div class="tablet-mode-label">{{ copy.shows }}</div>
                        <ul>
                            <li v-for="item in mode.items" :key="item">{{ item }}</li>
                        </ul>
                        <a class="tablet-mode-open" :href="mode.href" target="_blank" rel="noopener">{{ copy.open }}</a>
                    </div>
                </article>
            </div>
            <p class="tablet-hint">{{ copy.install }}</p>
        </div>
    `,
};

window.TabletModesPage = TabletModesPage;
