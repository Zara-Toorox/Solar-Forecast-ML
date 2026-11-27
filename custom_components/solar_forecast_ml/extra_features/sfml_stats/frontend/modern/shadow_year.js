(function () {
    "use strict";

    const SHADOW_YEAR_COPY = {
        de: {
            sayHead: "Wann bekommen deine Module Schatten?",
            say: "Jede Karte zeigt eine Modulgruppe: Zeilen sind Monate, Spalten Uhrzeiten. Rot heißt: hier steht regelmäßig etwas im Weg. Tippe auf ein Feld für Details.",
            missingHead: "Noch keine Jahresdaten",
            missing: "Die Daten kommen mit dem nächsten SFML-Update.",
            noGroups: "Für die letzten 365 Tage liegen noch keine Stunden vor.",
            loading: "Jahresdaten werden geladen …",
            loadError: "Die Jahresdaten konnten nicht geladen werden.",
            retry: "Erneut laden",
            demoTitle: "Interaktive Demo",
            demoText: "Alle Werte sind Beispieldaten einer Anlage mit zwei Modulgruppen.",
            license: "Lizenz",
            month: "Monat",
            monthsAria: "Monat auswählen",
            legendAria: "Legende",
            lg: {
                obst: "festes Hindernis, oft",
                part: "Hindernis, zeitweise",
                unclear: "unklar – alle Gruppen gleich schwächer",
                frost: "Reif",
                snow: "Schnee",
                free: "frei",
                open: "noch nicht beobachtet",
                night: "keine Sonne",
                der: "gestreift = aus dem Sonnenstand abgeleitet",
            },
            tags: "L = live beobachtet · R = rückwirkend berechnet · A = aus dem Sonnenstand abgeleitet",
            months: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
            monthsLong: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
            dirs: ["Norden", "Nordosten", "Osten", "Südosten", "Süden", "Südwesten", "Westen", "Nordwesten"],
            low: "flach",
            mid: "mittelhoch",
            high: "hoch",
            tap: "Feld antippen oder darüberfahren für Details.",
            cover: (l, r, a, o) => `live: ${l} · rückwirkend: ${r} · abgeleitet: ${a} · offen: ${o} Monate`,
            range: (a, b) => (a === b ? `im ${a}` : `von ${a} bis ${b}`),
            gOpen: (name) => `${name}: noch nicht beobachtet.`,
            gFree: (name, range) => `${name}: ${range} frei.`,
            gShade: (name, range, hours, place, loss) => `${name}: ${range} ${hours} verschattet${loss === null ? "" : `, etwa ${loss} % weniger Ertrag`}. Das Hindernis steht im ${place}.`,
            gUnclear: " Manche Stunden sind unklar – alle Gruppen gleich schwächer, daher noch kein sicherer Schatten.",
            mFree: (m) => `Im ${m} frei.`,
            mOpen: (m) => `Im ${m} noch nicht beobachtet.`,
            mShade: (m, h, place, derived) => `Im ${m} ${derived ? "voraussichtlich " : ""}${h} verschattet – Hindernis im ${place}${derived ? " (aus dem Sonnenstand abgeleitet)" : ""}.`,
            mFrost: (h) => ` Reif vor allem ${h}.`,
            mSnow: (h) => ` Schnee vor allem ${h}.`,
            hrs: (a, b) => (a === b ? `gegen ${a} Uhr` : `von ${a} bis ${b + 1} Uhr`),
            slot: (m, h) => `${m}, ${h}–${h + 1} Uhr`,
            cellAria: (m, h) => `${m}, ${h} Uhr`,
            d: {
                sun: (dir, el) => `Sonne im ${dir}, ${el}° hoch`,
                obs: (s, n, l) => `verschattet an ${s} von ${n} klaren Tagen${l === null ? "" : `, etwa ${l} % weniger Ertrag`}`,
                free: (n) => `frei an ${n} klaren Tagen`,
                few: (n) => `erst ${n} klare${n === 1 ? "r" : ""} Tag${n === 1 ? "" : "e"} – zu wenig für ein Urteil`,
                none: "noch keine klaren Stunden beobachtet",
                unclear: "alle Gruppen gleich schwächer – Hindernis oder Rechenabweichung, nicht sicher",
                der: (st, m) => `aus dem Sonnenstand abgeleitet: bei gleicher Sonnenposition im ${m} ${st}`,
                derShade: "verschattet",
                derFree: "frei",
                frost: (n) => `Reif an ${n} Tag${n === 1 ? "" : "en"} (gilt für die ganze Anlage)`,
                snow: (n) => `Schnee an ${n} Tag${n === 1 ? "" : "en"}`,
                live: "live beobachtet",
                retro: "rückwirkend aus gespeicherten Stunden und Satellit berechnet",
                retroLater: "rückwirkende Berechnung möglich, sobald Satellitendaten für diesen Monat geladen sind",
                night: "Sonne unter 5° – nicht bewertet",
                noRetro: "keine rückwirkende Berechnung: die Gruppe war damals anders eingerichtet oder es gibt keine Satellitendaten",
            },
        },
        en: {
            sayHead: "When do your panels get shade?",
            say: "Each card shows one panel group: rows are months, columns are hours. Red means something regularly blocks the sun here. Tap a cell for details.",
            missingHead: "No year data yet",
            missing: "The data arrives with the next SFML update.",
            noGroups: "No hours are available for the last 365 days yet.",
            loading: "Loading year data …",
            loadError: "The year data could not be loaded.",
            retry: "Load again",
            demoTitle: "Interactive demo",
            demoText: "All values are example data of a system with two panel groups.",
            license: "License",
            month: "Month",
            monthsAria: "Select month",
            legendAria: "Legend",
            lg: {
                obst: "fixed obstruction, often",
                part: "obstruction, at times",
                unclear: "unclear – all groups equally lower",
                frost: "Frost",
                snow: "Snow",
                free: "clear",
                open: "not observed yet",
                night: "no sun",
                der: "striped = derived from sun position",
            },
            tags: "L = observed live · R = calculated retroactively · A = derived from sun position",
            months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            monthsLong: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
            dirs: ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"],
            low: "low",
            mid: "medium height",
            high: "high",
            tap: "Tap or hover a cell for details.",
            cover: (l, r, a, o) => `live: ${l} · retroactive: ${r} · derived: ${a} · open: ${o} months`,
            range: (a, b) => (a === b ? `in ${a}` : `from ${a} to ${b}`),
            gOpen: (name) => `${name}: not observed yet.`,
            gFree: (name, range) => `${name}: clear ${range}.`,
            gShade: (name, range, hours, place, loss) => `${name}: shaded ${hours} ${range}${loss === null ? "" : `, about ${loss} % less yield`}. The obstruction is in the ${place}.`,
            gUnclear: " Some hours are unclear – all groups equally lower, so no reliable shade yet.",
            mFree: (m) => `Clear in ${m}.`,
            mOpen: (m) => `${m}: not observed yet.`,
            mShade: (m, h, place, derived) => `In ${m} ${derived ? "probably " : ""}shaded ${h} – obstruction in the ${place}${derived ? " (derived from sun position)" : ""}.`,
            mFrost: (h) => ` Frost mainly ${h}.`,
            mSnow: (h) => ` Snow mainly ${h}.`,
            hrs: (a, b) => (a === b ? `around ${a}:00` : `from ${a}:00 to ${b + 1}:00`),
            slot: (m, h) => `${m}, ${h}:00–${h + 1}:00`,
            cellAria: (m, h) => `${m}, ${h}:00`,
            d: {
                sun: (dir, el) => `sun in the ${dir}, ${el}° high`,
                obs: (s, n, l) => `shaded on ${s} of ${n} clear days${l === null ? "" : `, about ${l} % less yield`}`,
                free: (n) => `clear on ${n} clear days`,
                few: (n) => `only ${n} clear day${n === 1 ? "" : "s"} – too few to judge`,
                none: "no clear hours observed yet",
                unclear: "all groups equally lower – obstruction or calculation offset, not certain",
                der: (st, m) => `derived from sun position: ${st} at the same sun position in ${m}`,
                derShade: "shaded",
                derFree: "clear",
                frost: (n) => `frost on ${n} day${n === 1 ? "" : "s"} (applies to the whole system)`,
                snow: (n) => `snow on ${n} day${n === 1 ? "" : "s"}`,
                live: "observed live",
                retro: "calculated retroactively from stored hours and satellite data",
                retroLater: "retroactive calculation possible once satellite data for this month is loaded",
                night: "sun below 5° – not rated",
                noRetro: "no retroactive calculation: the group was set up differently then or no satellite data exists",
            },
        },
        pl: {
            sayHead: "Kiedy twoje moduły są zacienione?",
            say: "Każda karta pokazuje jedną grupę modułów: wiersze to miesiące, kolumny to godziny. Czerwony oznacza, że coś regularnie zasłania tu słońce. Dotknij pola, aby zobaczyć szczegóły.",
            missingHead: "Brak danych rocznych",
            missing: "Dane pojawią się z następną aktualizacją SFML.",
            noGroups: "Brak jeszcze godzin z ostatnich 365 dni.",
            loading: "Wczytywanie danych rocznych …",
            loadError: "Nie udało się wczytać danych rocznych.",
            retry: "Wczytaj ponownie",
            demoTitle: "Interaktywne demo",
            demoText: "Wszystkie wartości to dane przykładowej instalacji z dwiema grupami modułów.",
            license: "Licencja",
            month: "Miesiąc",
            monthsAria: "Wybierz miesiąc",
            legendAria: "Legenda",
            lg: {
                obst: "stała przeszkoda, często",
                part: "przeszkoda, czasami",
                unclear: "niejasne – wszystkie grupy równo słabsze",
                frost: "Szron",
                snow: "Śnieg",
                free: "wolne",
                open: "jeszcze nieobserwowane",
                night: "brak słońca",
                der: "paski = wyprowadzone z pozycji słońca",
            },
            tags: "L = obserwowane na żywo · R = obliczone wstecz · A = wyprowadzone z pozycji słońca",
            months: ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"],
            monthsLong: ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"],
            dirs: ["północ", "północny wschód", "wschód", "południowy wschód", "południe", "południowy zachód", "zachód", "północny zachód"],
            low: "nisko",
            mid: "średnio wysoko",
            high: "wysoko",
            tap: "Dotknij pola lub najedź na nie, aby zobaczyć szczegóły.",
            cover: (l, r, a, o) => `na żywo: ${l} · wstecz: ${r} · wyprowadzone: ${a} · otwarte: ${o} mies.`,
            range: (a, b) => (a === b ? `miesiąc: ${a}` : `od: ${a} do: ${b}`),
            gOpen: (name) => `${name}: jeszcze nieobserwowane.`,
            gFree: (name, range) => `${name}: wolne (${range}).`,
            gShade: (name, range, hours, place, loss) => `${name}: zacienione ${hours} (${range})${loss === null ? "" : `, około ${loss} % mniej uzysku`}. Przeszkoda: ${place}.`,
            gUnclear: " Niektóre godziny są niejasne – wszystkie grupy równo słabsze, więc cień nie jest jeszcze pewny.",
            mFree: (m) => `${m}: wolne.`,
            mOpen: (m) => `${m}: jeszcze nieobserwowane.`,
            mShade: (m, h, place, derived) => `${m}: ${derived ? "prawdopodobnie " : ""}zacienione ${h} – przeszkoda: ${place}${derived ? " (wyprowadzone z pozycji słońca)" : ""}.`,
            mFrost: (h) => ` Szron głównie ${h}.`,
            mSnow: (h) => ` Śnieg głównie ${h}.`,
            hrs: (a, b) => (a === b ? `około ${a}:00` : `od ${a}:00 do ${b + 1}:00`),
            slot: (m, h) => `${m}, ${h}:00–${h + 1}:00`,
            cellAria: (m, h) => `${m}, ${h}:00`,
            d: {
                sun: (dir, el) => `słońce: ${dir}, ${el}° wysokości`,
                obs: (s, n, l) => `zacienione w ${s} z ${n} pogodnych dni${l === null ? "" : `, około ${l} % mniej uzysku`}`,
                free: (n) => `wolne w ${n} pogodnych dniach`,
                few: (n) => `dopiero ${n} pogodnych dni – za mało do oceny`,
                none: "jeszcze brak obserwowanych pogodnych godzin",
                unclear: "wszystkie grupy równo słabsze – przeszkoda lub odchyłka obliczeń, niepewne",
                der: (st, m) => `wyprowadzone z pozycji słońca: przy tej samej pozycji słońca (${m}) ${st}`,
                derShade: "zacienione",
                derFree: "wolne",
                frost: (n) => `szron w ${n} dni (dotyczy całej instalacji)`,
                snow: (n) => `śnieg w ${n} dni`,
                live: "obserwowane na żywo",
                retro: "obliczone wstecz z zapisanych godzin i danych satelitarnych",
                retroLater: "obliczenie wstecz możliwe po wczytaniu danych satelitarnych dla tego miesiąca",
                night: "słońce poniżej 5° – bez oceny",
                noRetro: "brak obliczenia wstecz: grupa była wtedy inaczej skonfigurowana lub brak danych satelitarnych",
            },
        },
    };

    const LEGEND = ["obst", "part", "unclear", "frost", "snow", "free", "open", "night"];
    const SHADED = ["obst", "part"];

    function shadowYearCopy() {
        const locale = ["de", "en", "pl"].includes(window.SFMLI18n?.current) ? window.SFMLI18n.current : "en";
        return SHADOW_YEAR_COPY[locale] || SHADOW_YEAR_COPY.en;
    }

    function formatWhole(value) {
        if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;
        return window.SFMLI18n?.formatNumber ? window.SFMLI18n.formatNumber(Number(value), 0) : String(Math.round(Number(value)));
    }

    function directionOf(azimuth, copy) {
        return copy.dirs[Math.round((((Number(azimuth) % 360) + 360) % 360) / 45) % 8];
    }

    function heightOf(elevation, copy) {
        if (elevation < 20) return copy.low;
        return elevation < 40 ? copy.mid : copy.high;
    }

    function meanDirection(cells) {
        let x = 0;
        let y = 0;
        for (const cell of cells) {
            const rad = (Number(cell.az) * Math.PI) / 180;
            x += Math.cos(rad);
            y += Math.sin(rad);
        }
        return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
    }

    function median(values) {
        const list = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
        if (!list.length) return null;
        const mid = Math.floor(list.length / 2);
        return list.length % 2 ? list[mid] : (list[mid - 1] + list[mid]) / 2;
    }

    function displayClass(cell) {
        if (cell.hint) return cell.hint;
        return cell.class === "few" ? "open" : cell.class;
    }

    window.ShadowYearPage = {
        props: {
            liveData: { type: Object, default: () => ({}) },
            config: { type: Object, default: () => ({}) },
            initialSection: { type: String, default: "" },
        },
        emits: ["navigate"],
        template: `
            <section class="shadow-year-page" aria-labelledby="shadow-year-heading">
                <h2 id="shadow-year-heading" class="shadow-year-sr">{{ copy.sayHead }}</h2>
                <hubble-say class="shadow-year-hubble" :tone="hubbleSay.tone" :headline="hubbleSay.headline" :detail="hubbleSay.detail"></hubble-say>

                <div v-if="loading" class="glass-card empty-state" role="status">{{ copy.loading }}</div>

                <div v-else-if="error" class="glass-card empty-state shadow-year-error" role="alert">
                    <strong>{{ copy.loadError }}</strong>
                    <span>{{ error }}</span>
                    <button type="button" class="shadow-year-retry" @click="load">{{ copy.retry }}</button>
                </div>

                <template v-else-if="!payload.source_missing">
                    <div v-if="pageReason === 'no_license'" class="shadow-year-demo-banner" role="status">
                        <div>
                            <strong>{{ copy.demoTitle }}</strong>
                            <span>{{ copy.demoText }}</span>
                        </div>
                        <a href="https://ko-fi.com/s/8bc3808d22" target="_blank" rel="noopener noreferrer">{{ copy.license }}</a>
                    </div>

                    <div v-if="!groups.length" class="glass-card empty-state">{{ copy.noGroups }}</div>

                    <template v-else>
                        <div class="glass-card shadow-year-toolbar">
                            <span class="shadow-year-toolbar-label">{{ copy.month }}</span>
                            <div class="shadow-year-months" role="group" :aria-label="copy.monthsAria">
                                <button
                                    v-for="(label, index) in copy.months"
                                    :key="label"
                                    type="button"
                                    :class="{ active: index + 1 === selectedMonth }"
                                    :aria-pressed="index + 1 === selectedMonth ? 'true' : 'false'"
                                    @click="selectedMonth = index + 1">{{ label }}</button>
                            </div>
                            <div class="shadow-year-legend" :aria-label="copy.legendAria">
                                <span v-for="key in legend" :key="key"><i :class="'shadow-year-swatch ' + key"></i>{{ copy.lg[key] }}</span>
                                <span><i class="shadow-year-swatch part derived"></i>{{ copy.lg.der }}</span>
                            </div>
                            <p class="shadow-year-tags">{{ copy.tags }}</p>
                        </div>

                        <article v-for="group in groups" :key="group.name" class="chart-card shadow-year-card" :aria-label="group.label">
                            <div class="chart-header">
                                <h3 class="chart-title">{{ group.label }}</h3>
                                <span class="chart-subtitle">{{ coverLine(group) }}</span>
                            </div>
                            <p class="shadow-year-sentence">{{ groupSentence(group) }}</p>
                            <p class="shadow-year-month-line">{{ monthLine(group, selectedMonth) }}</p>
                            <div class="shadow-year-scroll">
                                <div class="shadow-year-grid" role="grid">
                                    <div role="row" class="shadow-year-row">
                                        <span class="shadow-year-corner" aria-hidden="true"></span>
                                        <span v-for="hour in hours" :key="'h' + hour" class="shadow-year-hour" aria-hidden="true">{{ hour % 3 === 0 ? hour : "" }}</span>
                                    </div>
                                    <div v-for="month in months" :key="month" role="row" class="shadow-year-row">
                                        <span class="shadow-year-month" :class="{ selected: month === selectedMonth }" role="rowheader">
                                            <b>{{ copy.months[month - 1] }}</b>
                                            <em v-if="modeTag(group, month)">{{ modeTag(group, month) }}</em>
                                        </span>
                                        <button
                                            v-for="cell in rowCells(group, month)"
                                            :key="month + '-' + cell.hour"
                                            type="button"
                                            role="gridcell"
                                            :class="cellClasses(group, cell)"
                                            :aria-label="copy.cellAria(copy.monthsLong[month - 1], cell.hour)"
                                            :aria-pressed="isSelected(group, cell) ? 'true' : 'false'"
                                            @mouseenter="hover(group, cell)"
                                            @mouseleave="hover(group, null)"
                                            @focus="hover(group, cell)"
                                            @blur="hover(group, null)"
                                            @click="select(group, cell)">
                                            <span v-for="mark in visibleMarks(cell)" :key="mark" class="shadow-year-mark" :class="mark" aria-hidden="true"></span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <p class="shadow-year-detail" aria-live="polite">
                                <template v-if="activeCell(group)">
                                    <strong>{{ slotLabel(activeCell(group)) }}</strong> · {{ cellDetail(group, activeCell(group)) }}
                                </template>
                                <template v-else>{{ copy.tap }}</template>
                            </p>
                        </article>
                    </template>
                </template>
            </section>
        `,
        setup() {
            const copy = Vue.computed(() => shadowYearCopy());
            const loading = Vue.ref(true);
            const error = Vue.ref("");
            const payload = Vue.reactive({ groups: [], hours: [], source_missing: false, is_demo: false });
            const selectedMonth = Vue.ref(new Date().getMonth() + 1);
            const selected = Vue.reactive({});
            const hovered = Vue.reactive({});
            const months = Array.from({ length: 12 }, (_, index) => index + 1);

            const pageReason = Vue.computed(() => {
                const value = payload.sample_reason;
                if (value === "no_license" || value === "live") return value;
                return payload.is_demo ? "no_license" : "live";
            });
            const hours = Vue.computed(() => (Array.isArray(payload.hours) ? payload.hours : []));
            const groups = Vue.computed(() => (Array.isArray(payload.groups) ? payload.groups : []));
            const grids = Vue.computed(() => {
                const result = {};
                for (const group of groups.value) {
                    const grid = {};
                    for (const cell of group.cells || []) grid[`${cell.month}|${cell.hour}`] = cell;
                    result[group.name] = grid;
                }
                return result;
            });

            // Months in window order, oldest first, so ranges read chronologically.
            const windowMonths = Vue.computed(() => {
                const last = Number(String(payload.window?.to || "").slice(5, 7)) || new Date().getMonth() + 1;
                return months.map((_, index) => ((last + index) % 12) + 1);
            });

            function cellOf(group, month, hour) {
                return grids.value[group.name]?.[`${month}|${hour}`] || null;
            }

            function rowCells(group, month) {
                return hours.value.map((hour) => cellOf(group, month, hour)).filter(Boolean);
            }

            function modeTag(group, month) {
                const mode = group.mode?.[month - 1];
                return mode === "L" || mode === "R" || mode === "A" ? mode : "";
            }

            function coverLine(group) {
                const modes = group.mode || [];
                const count = (tag) => modes.filter((mode) => mode === tag).length;
                return copy.value.cover(count("L"), count("R"), count("A"), 12 - count("L") - count("R") - count("A"));
            }

            function hourRange(list) {
                return list.length ? copy.value.hrs(list[0], list[list.length - 1]) : "";
            }

            function place(cells) {
                const elevation = cells.reduce((sum, cell) => sum + Number(cell.el), 0) / cells.length;
                return `${directionOf(meanDirection(cells), copy.value)}, ${heightOf(elevation, copy.value)}`;
            }

            function groupSentence(group) {
                const judged = [];
                const shaded = [];
                let unclear = false;
                for (const month of windowMonths.value) {
                    for (const cell of rowCells(group, month)) {
                        const shown = displayClass(cell);
                        if (["obst", "part", "free", "unclear"].includes(cell.class) && !cell.derived) judged.push(cell);
                        if (SHADED.includes(shown) && !cell.derived) shaded.push(cell);
                        if (cell.class === "unclear") unclear = true;
                    }
                }
                if (!judged.length) return copy.value.gOpen(group.label);
                const monthsSeen = windowMonths.value.filter((month) => judged.some((cell) => cell.month === month));
                const long = copy.value.monthsLong;
                const range = copy.value.range(long[monthsSeen[0] - 1], long[monthsSeen[monthsSeen.length - 1] - 1]);
                let sentence;
                if (shaded.length) {
                    const shadedHours = [...new Set(shaded.map((cell) => cell.hour))].sort((a, b) => a - b);
                    const loss = median(shaded.filter((cell) => cell.loss !== null).map((cell) => Number(cell.loss)));
                    sentence = copy.value.gShade(group.label, range, hourRange(shadedHours), place(shaded), formatWhole(loss));
                } else {
                    sentence = copy.value.gFree(group.label, range);
                }
                return unclear ? sentence + copy.value.gUnclear : sentence;
            }

            function monthLine(group, month) {
                const name = copy.value.monthsLong[month - 1];
                const cells = rowCells(group, month).filter((cell) => cell.class !== "night");
                const shaded = cells.filter((cell) => SHADED.includes(displayClass(cell)));
                const hoursOf = (kind) => cells.filter((cell) => displayClass(cell) === kind).map((cell) => cell.hour);
                let line;
                if (shaded.length) {
                    line = copy.value.mShade(name, hourRange(shaded.map((cell) => cell.hour)), place(shaded), shaded.every((cell) => cell.derived));
                } else if (cells.some((cell) => displayClass(cell) === "free")) {
                    line = copy.value.mFree(name);
                } else {
                    line = copy.value.mOpen(name);
                }
                const frost = hoursOf("frost");
                const snow = hoursOf("snow");
                if (frost.length) line += copy.value.mFrost(hourRange(frost));
                if (snow.length) line += copy.value.mSnow(hourRange(snow));
                return line;
            }

            function cellClasses(group, cell) {
                const classes = ["shadow-year-cell", displayClass(cell)];
                if (cell.derived) classes.push("derived");
                if (group.mode?.[cell.month - 1] === "R" && cell.class !== "night") classes.push("retro");
                if (cell.month === selectedMonth.value && cell.class !== "night") classes.push("in-month");
                if (isSelected(group, cell)) classes.push("selected");
                return classes;
            }

            function visibleMarks(cell) {
                return Array.isArray(cell.marks) ? cell.marks : [];
            }

            function isSelected(group, cell) {
                const key = selected[group.name];
                return Boolean(key && key.month === cell.month && key.hour === cell.hour);
            }

            function hover(group, cell) {
                hovered[group.name] = cell ? { month: cell.month, hour: cell.hour } : null;
            }

            function select(group, cell) {
                selected[group.name] = { month: cell.month, hour: cell.hour };
                selectedMonth.value = cell.month;
            }

            function activeCell(group) {
                const key = hovered[group.name] || selected[group.name];
                return key ? cellOf(group, key.month, key.hour) : null;
            }

            function slotLabel(cell) {
                return copy.value.slot(copy.value.monthsLong[cell.month - 1], cell.hour);
            }

            function retroNote(group, month) {
                return group.retro_note?.[month - 1] === "later" ? copy.value.d.retroLater : copy.value.d.noRetro;
            }

            function cellDetail(group, cell) {
                const d = copy.value.d;
                if (cell.class === "night") return d.night;
                const parts = [d.sun(directionOf(cell.az, copy.value), formatWhole(cell.el))];
                const mode = group.mode?.[cell.month - 1];
                if (mode === "L" || mode === "R") {
                    if (SHADED.includes(cell.class)) parts.push(d.obs(cell.s, cell.n, formatWhole(cell.loss)));
                    else if (cell.class === "unclear") parts.push(d.unclear);
                    else if (cell.class === "free") parts.push(d.free(cell.n));
                    else parts.push(cell.n ? d.few(cell.n) : d.none);
                    parts.push(mode === "L" ? d.live : d.retro);
                } else if (cell.derived) {
                    const source = copy.value.monthsLong[(cell.from_month || cell.month) - 1];
                    parts.push(d.der(cell.class === "free" ? d.derFree : d.derShade, source));
                    parts.push(retroNote(group, cell.month));
                } else {
                    parts.push(d.none);
                    parts.push(retroNote(group, cell.month));
                }
                if (cell.frost_days) parts.push(d.frost(cell.frost_days));
                if (cell.snow_days) parts.push(d.snow(cell.snow_days));
                return parts.join(" · ");
            }

            const hubbleSay = Vue.computed(() => {
                if (!loading.value && !error.value && payload.source_missing) {
                    return { tone: "idle", headline: copy.value.missingHead, detail: copy.value.missing };
                }
                return {
                    tone: pageReason.value === "no_license" ? "demo" : "ok",
                    headline: copy.value.sayHead,
                    detail: copy.value.say,
                };
            });

            async function load() {
                loading.value = true;
                error.value = "";
                try {
                    const response = await SFMLApi.fetch(
                        "/api/sfml_stats/modern/shadow_year",
                        { forceRefresh: true, ttl: 0, authenticated: true }
                    );
                    const data = response?.data || response || {};
                    for (const key of Object.keys(payload)) delete payload[key];
                    Object.assign(payload, { groups: [], hours: [], source_missing: false, is_demo: false }, data);
                    const today = Number(String(data.window?.to || "").slice(5, 7));
                    if (today >= 1 && today <= 12) selectedMonth.value = today;
                } catch (requestError) {
                    error.value = requestError?.message || copy.value.loadError;
                } finally {
                    loading.value = false;
                }
            }

            Vue.onMounted(load);

            return {
                copy, loading, error, payload, pageReason, hours, groups, months, legend: LEGEND, selectedMonth, hubbleSay,
                load, rowCells, modeTag, coverLine, groupSentence, monthLine, cellClasses, visibleMarks,
                isSelected, hover, select, activeCell, slotLabel, cellDetail,
            };
        },
    };
})();
