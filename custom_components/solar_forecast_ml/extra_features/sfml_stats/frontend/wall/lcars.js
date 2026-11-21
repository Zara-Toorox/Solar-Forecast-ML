(function () {
    "use strict";

    var DATA_URL = "/api/sfml_stats/wall/data";
    var MANIFEST_URL = "/api/sfml_stats/wall/manifest.webmanifest";
    var THEME = "lcars";
    var POLL_MS = 10000;
    var NS = "http://www.w3.org/2000/svg";
    var BOARD_W = 1600;
    var BOARD_H = 1000;
    var AMBER = "#ffc864";
    var ORANGE = "#ff9c66";
    var LILAC = "#cc99cc";
    var BLUE = "#99ccff";
    var GREY = "#bdb8c4";
    var DIGIT_ON = "#ffcc66";
    var DIGIT_GHOST = "#2a1f12";

    var TEXT = {
        de: {
            side: ["01 · Sensor", "02 · Fluss", "03 · Ertrag", "04 · Verlauf", "05 · Ausblick"],
            sensorStatus: "Sensorstatus",
            pvNow: "PV jetzt",
            scope: "Sensor-Sweep · PV-Feld",
            flow: "Energiefluss",
            home: "Haus",
            battery: "Batterie",
            grid: "Netz",
            homeSolar: "PV",
            homeBattery: "Akku",
            homeGrid: "Netz",
            batteryDischarge: "Entlädt",
            batterySolar: "Lädt PV",
            batteryGrid: "Lädt Netz",
            gridImport: "Bezug",
            gridExport: "Export",
            gridCharge: "Netzladen",
            yieldToday: "Ertrag heute",
            forecast: "Prognose",
            price: "Strompreis",
            priceNow: "Aktueller Preis",
            cheapestHour: "Günstigste Stunde",
            cheapestHourTomorrow: "Günstigste Stunde morgen",
            hour: "{hour} Uhr",
            usage: "Verbrauch",
            consumptionToday: "Hausverbrauch heute",
            batteryChargedToday: "Zum Akku heute",
            chartTitle: "Dein Energietag",
            legendActual: "Ertrag",
            now: "Jetzt {time}",
            noForecast: "Keine Prognosewerte für heute",
            daysTitle: "Die nächsten Tage",
            tomorrow: "Morgen",
            dayAfter: "Übermorgen",
            skyNow: { sun: "Sonnig", partly: "Leicht bewölkt", cloud: "Bedeckt", rain: "Regen", snow: "Schnee", thunder: "Gewitter", fog: "Nebel", moon: "Klar", moon_partly: "Leicht bewölkt" },
            sky: { sun: "Sonnig", partly: "Wolkig", cloud: "Bedeckt", rain: "Regen" },
            live: "Live",
            stale: "Daten veraltet",
            offline: "Keine Verbindung",
            scanActive: "Scan aktiv · Sensorpaket {n}",
            scanPaused: "Scan unterbrochen",
            fsTap: "Zum Vollbild tippen",
            fsInstall: "Vollbild: zum Startbildschirm"
        },
        en: {
            side: ["01 · Sensor", "02 · Flow", "03 · Yield", "04 · History", "05 · Outlook"],
            sensorStatus: "Sensor status",
            pvNow: "PV now",
            scope: "Sensor sweep · PV array",
            flow: "Energy flow",
            home: "Home",
            battery: "Battery",
            grid: "Grid",
            homeSolar: "PV",
            homeBattery: "Battery",
            homeGrid: "Grid",
            batteryDischarge: "Discharging",
            batterySolar: "Charging PV",
            batteryGrid: "Charging grid",
            gridImport: "Import",
            gridExport: "Export",
            gridCharge: "Grid charging",
            yieldToday: "Yield today",
            forecast: "Forecast",
            price: "Electricity price",
            priceNow: "Current price",
            cheapestHour: "Cheapest hour",
            cheapestHourTomorrow: "Cheapest hour tomorrow",
            hour: "{hour}:00",
            usage: "Consumption",
            consumptionToday: "Home consumption today",
            batteryChargedToday: "Into battery today",
            chartTitle: "Your energy day",
            legendActual: "Yield",
            now: "Now {time}",
            noForecast: "No forecast values for today",
            daysTitle: "The next days",
            tomorrow: "Tomorrow",
            dayAfter: "Day after",
            skyNow: { sun: "Sunny", partly: "Partly cloudy", cloud: "Overcast", rain: "Rain", snow: "Snow", thunder: "Thunderstorm", fog: "Fog", moon: "Clear", moon_partly: "Partly cloudy" },
            sky: { sun: "Sunny", partly: "Cloudy", cloud: "Overcast", rain: "Rain" },
            live: "Live",
            stale: "Data outdated",
            offline: "No connection",
            scanActive: "Scan active · sensor packet {n}",
            scanPaused: "Scan interrupted",
            fsTap: "Tap for full screen",
            fsInstall: "Full screen: home screen"
        },
        pl: {
            side: ["01 · Czujnik", "02 · Przepływ", "03 · Uzysk", "04 · Przebieg", "05 · Prognoza"],
            sensorStatus: "Status czujników",
            pvNow: "PV teraz",
            scope: "Skan czujników · pole PV",
            flow: "Przepływ energii",
            home: "Dom",
            battery: "Bateria",
            grid: "Sieć",
            homeSolar: "PV",
            homeBattery: "Akumulator",
            homeGrid: "Sieć",
            batteryDischarge: "Rozładowanie",
            batterySolar: "Ładowanie PV",
            batteryGrid: "Ładowanie z sieci",
            gridImport: "Pobór",
            gridExport: "Oddawanie",
            gridCharge: "Ładowanie z sieci",
            yieldToday: "Uzysk dzisiaj",
            forecast: "Prognoza",
            price: "Cena prądu",
            priceNow: "Aktualna cena",
            cheapestHour: "Najtańsza godzina",
            cheapestHourTomorrow: "Najtańsza godzina jutro",
            hour: "{hour}:00",
            usage: "Zużycie",
            consumptionToday: "Zużycie domu dziś",
            batteryChargedToday: "Do baterii dziś",
            chartTitle: "Twój dzień energii",
            legendActual: "Uzysk",
            now: "Teraz {time}",
            noForecast: "Brak wartości prognozy na dziś",
            daysTitle: "Najbliższe dni",
            tomorrow: "Jutro",
            dayAfter: "Pojutrze",
            skyNow: { sun: "Słonecznie", partly: "Lekkie zachmurzenie", cloud: "Pochmurno", rain: "Deszcz", snow: "Śnieg", thunder: "Burza", fog: "Mgła", moon: "Bezchmurnie", moon_partly: "Lekkie zachmurzenie" },
            sky: { sun: "Słonecznie", partly: "Pochmurno", cloud: "Zachmurzenie", rain: "Deszcz" },
            live: "Na żywo",
            stale: "Dane nieaktualne",
            offline: "Brak połączenia",
            scanActive: "Skan aktywny · pakiet {n}",
            scanPaused: "Skan przerwany",
            fsTap: "Pełny ekran",
            fsInstall: "Pełny ekran: ekran główny"
        }
    };

    var SKY_ICONS = {
        sun: "M24 14a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM24 3v5M24 40v5M3 24h5M40 24h5M9 9l3.5 3.5M35.5 35.5 39 39M39 9l-3.5 3.5M12.5 35.5 9 39",
        partly: "M18 3v4M3 18h4M7 7l3 3M29 7l-3 3M40 36H18a8 8 0 1 1 3-15 10 10 0 0 1 18 7 4 4 0 0 1 1 8ZM18 10a8 8 0 0 0-8 8",
        cloud: "M38 36H13a10 10 0 1 1 3-19 12 12 0 0 1 23 8 6 6 0 0 1-1 11Z",
        rain: "M38 31H13a10 10 0 1 1 3-19 12 12 0 0 1 23 8 6 6 0 0 1-1 11ZM16 37l-2 5M25 37l-2 5M34 37l-2 5",
        snow: "M38 31H13a10 10 0 1 1 3-19 12 12 0 0 1 23 8 6 6 0 0 1-1 11ZM15 37v6M12 40h6M24 37v6M21 40h6M33 37v6M30 40h6",
        thunder: "M38 31H13a10 10 0 1 1 3-19 12 12 0 0 1 23 8 6 6 0 0 1-1 11ZM26 33l-5 7h7l-4 6",
        fog: "M8 16h32M4 24h40M8 32h32M12 40h24",
        moon: "M30 7a16 16 0 1 0 11 27A14 14 0 0 1 30 7Z",
        moon_partly: "M7 20A10 10 0 0 1 20 7A12 12 0 0 0 7 20ZM40 36H18a8 8 0 1 1 3-15 10 10 0 0 1 18 7 4 4 0 0 1 1 8Z"
    };

    // Sensor status lamps: colour plus the condition that lights them.
    var LAMPS = [
        ["#ff9c66", function (d) { return (d.power.solar_w || 0) >= 50; }],
        ["#ffcc99", function (d) { return (d.power.home_w || 0) > 0; }],
        ["#cc99cc", function (d) { return (d.power.solar_to_battery_w || 0) + (d.power.grid_to_battery_w || 0) >= 50; }],
        ["#99ccff", function (d) { return (d.power.battery_to_house_w || 0) >= 50; }],
        ["#9999ee", function (d) { return (d.power.grid_to_house_w || 0) >= 50; }],
        ["#ffcc99", function (d) { return (d.power.solar_to_grid_w || 0) >= 50; }],
        ["#6b8db5", function (d) { return d.price_now_ct_kwh != null; }],
        ["#c89b6a", function (d) { return d.today.forecast_kwh != null; }],
        ["#d0703f", function (d) { return !!(d.weather_now && d.weather_now.temperature_c != null); }],
        ["#9a72aa", function (d) { return !d.stale; }],
        ["#99ccff", function (d) { return sunUp(d); }],
        ["#ff9c66", function (d) { return !!(d.cheapest_hour && !d.cheapest_hour.is_tomorrow && d.cheapest_hour.hour === new Date().getHours()); }]
    ];

    var SEGMENTS = { "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd", "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg", "-": "g", " ": "" };

    var MODES = ["grid", "consumption"];
    var locale = pickLocale();
    var mode = pickMode();
    var copy = TEXT[locale];
    var state = { data: null, failures: 0, packet: 1 };
    var weekdayFormat = new Intl.DateTimeFormat(locale, { weekday: "long" });
    var dateFormat = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" });
    var shortWeekday = new Intl.DateTimeFormat(locale, { weekday: "short" });
    var shortDate = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
    var one = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    var whole = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    var tickFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

    function queryValue(name) {
        try {
            return new URLSearchParams(window.location.search).get(name);
        } catch (e) {
            return null;
        }
    }

    function pickLocale() {
        var candidates = [queryValue("lang"), navigator.language];
        for (var i = 0; i < candidates.length; i += 1) {
            var code = candidates[i] ? String(candidates[i]).toLowerCase().slice(0, 2) : "";
            if (TEXT[code]) return code;
        }
        return "de";
    }

    function pickMode() {
        var wanted = queryValue("mode");
        return MODES.indexOf(wanted) >= 0 ? wanted : "grid";
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function fill(template, params) {
        return String(template).replace(/\{(\w+)\}/g, function (_, name) {
            return Object.prototype.hasOwnProperty.call(params || {}, name) ? params[name] : "{" + name + "}";
        });
    }

    function pad(value) {
        return (value < 10 ? "0" : "") + value;
    }

    function el(tag, attrs, parent) {
        var node = document.createElementNS(NS, tag);
        Object.keys(attrs || {}).forEach(function (key) {
            node.setAttribute(key, attrs[key]);
        });
        if (parent) parent.appendChild(node);
        return node;
    }

    function clear(node) {
        while (node.firstChild) node.removeChild(node.firstChild);
    }

    function svgText(parent, attrs, text) {
        var node = el("text", attrs, parent);
        node.textContent = text;
        return node;
    }

    function withUnit(value, unit) {
        var span = document.createElement("span");
        span.appendChild(document.createTextNode(value));
        var small = document.createElement("small");
        small.textContent = unit;
        span.appendChild(small);
        return span;
    }

    function setContent(id, node) {
        var host = byId(id);
        clear(host);
        host.appendChild(node);
    }

    function powerParts(watts) {
        if (watts == null) return ["–", "W"];
        return Math.abs(watts) > 1000 ? [one.format(watts / 1000), "kW"] : [whole.format(watts), "W"];
    }

    function powerNode(watts) {
        var parts = powerParts(watts);
        return withUnit(parts[0], parts[1]);
    }

    function kwhText(value) {
        return value == null ? "–" : one.format(value);
    }

    function gridWatts(power) {
        var exportW = power.solar_to_grid_w || 0;
        if (exportW >= 50) return exportW;
        if (power.grid_to_house_w == null && power.grid_to_battery_w == null) return null;
        return (power.grid_to_house_w || 0) + (power.grid_to_battery_w || 0);
    }

    function sunUp(data) {
        if (!data.sun) return (data.power.solar_w || 0) >= 50;
        var t = Date.now();
        return t >= Date.parse(data.sun.sunrise) && t < Date.parse(data.sun.sunset);
    }

    function dayOfYear(now) {
        var start = new Date(now.getFullYear(), 0, 1);
        return Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - start) / 86400000) + 1;
    }

    function fitBoard() {
        var scale = Math.min(window.innerWidth / BOARD_W, window.innerHeight / BOARD_H);
        document.documentElement.style.setProperty("--scale", String(scale));
    }

    function hexagon(x1, y1, x2, y2, t) {
        var points;
        if (y1 === y2) {
            points = [[x1, y1], [x1 + t / 2, y1 - t / 2], [x2 - t / 2, y1 - t / 2], [x2, y1], [x2 - t / 2, y1 + t / 2], [x1 + t / 2, y1 + t / 2]];
        } else {
            points = [[x1, y1], [x1 + t / 2, y1 + t / 2], [x1 + t / 2, y2 - t / 2], [x1, y2], [x1 - t / 2, y2 - t / 2], [x1 - t / 2, y1 + t / 2]];
        }
        return points.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ");
    }

    // Slanted seven-segment read-out; unlit segments stay faintly visible.
    function segmentDisplay(text, height, maxWidth) {
        var h = height;
        var w = h * 0.52;
        var t = h * 0.13;
        var gap = t * 0.22;
        var advance = w + h * 0.13;
        var chars = String(text).split("");
        var width = 0;
        chars.forEach(function (ch) {
            width += ch === "," || ch === "." ? h * 0.2 : (ch === ":" ? h * 0.26 : advance);
        });
        var slant = h * 0.12;
        var total = width + slant;
        var scale = maxWidth && total > maxWidth ? maxWidth / total : 1;
        var svg = el("svg", { viewBox: "0 0 " + total.toFixed(1) + " " + (h * 1.12).toFixed(1), width: (total * scale).toFixed(1), height: (h * 1.12 * scale).toFixed(1), "aria-hidden": "true" });
        var defs = el("defs", {}, svg);
        var gradient = el("linearGradient", { id: "lcDigit" + Math.round(h), x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
        el("stop", { offset: 0, "stop-color": "#ffe09a" }, gradient);
        el("stop", { offset: 1, "stop-color": DIGIT_ON }, gradient);
        var lit = "url(#lcDigit" + Math.round(h) + ")";
        var group = el("g", { transform: "translate(" + slant.toFixed(1) + ",0) skewX(-7)" }, svg);
        var shapes = {
            a: [t / 2 + gap, t / 2, w - t / 2 - gap, t / 2],
            b: [w - t / 2, t / 2 + gap, w - t / 2, h / 2 - gap],
            c: [w - t / 2, h / 2 + gap, w - t / 2, h - t / 2 - gap],
            d: [t / 2 + gap, h - t / 2, w - t / 2 - gap, h - t / 2],
            e: [t / 2, h / 2 + gap, t / 2, h - t / 2 - gap],
            f: [t / 2, t / 2 + gap, t / 2, h / 2 - gap],
            g: [t / 2 + gap, h / 2, w - t / 2 - gap, h / 2]
        };
        var x = 0;
        chars.forEach(function (ch) {
            if (ch === "," || ch === ".") {
                var cx = x + h * 0.02;
                var points = ch === ","
                    ? [[cx, h - t], [cx + t, h - t], [cx + t * 0.4, h + t * 0.9], [cx - t * 0.5, h + t * 0.9]]
                    : [[cx, h - t], [cx + t, h - t], [cx + t, h], [cx, h]];
                el("polygon", { points: points.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "), fill: lit }, group);
                x += h * 0.2;
                return;
            }
            if (ch === ":") {
                var colon = el("g", { "class": "lc-colon" }, group);
                el("rect", { x: x + h * 0.06, y: h * 0.27, width: t, height: t, fill: lit }, colon);
                el("rect", { x: x + h * 0.06, y: h * 0.64, width: t, height: t, fill: lit }, colon);
                x += h * 0.26;
                return;
            }
            var on = SEGMENTS[ch] || "";
            Object.keys(shapes).forEach(function (name) {
                var s = shapes[name];
                el("polygon", {
                    points: hexagon(x + s[0], s[1], x + s[2], s[3], t),
                    fill: on.indexOf(name) >= 0 ? lit : DIGIT_GHOST
                }, group);
            });
            x += advance;
        });
        return svg;
    }

    function staticText() {
        document.documentElement.setAttribute("lang", locale);
        var manifest = document.querySelector('link[rel="manifest"]');
        if (manifest) manifest.setAttribute("href", MANIFEST_URL + "?theme=" + THEME + (mode === "grid" ? "" : "&mode=" + mode));
        ["lcSide1", "lcSide2", "lcSide3", "lcSide4", "lcSide5"].forEach(function (id, index) {
            byId(id).textContent = copy.side[index].toUpperCase();
        });
        byId("lcPvTitle").textContent = copy.pvNow;
        byId("lcScopeCaption").textContent = copy.scope;
        byId("lcFlowTitle").textContent = copy.flow;
        byId("lcHomeTitle").textContent = copy.home;
        byId("lcBatteryTitle").textContent = copy.battery;
        byId("lcGridTitle").textContent = copy.grid;
        byId("lcYieldTitle").textContent = copy.yieldToday;
        byId("lcForecastLabel").textContent = copy.forecast;
        byId("lcPriceTitle").textContent = copy.price;
        byId("lcPriceNowLabel").textContent = copy.priceNow;
        byId("lcUsageTitle").textContent = copy.usage;
        byId("lcConsumptionLabel").textContent = copy.consumptionToday;
        byId("lcChargedLabel").textContent = copy.batteryChargedToday;
        byId("lcChartTitle").textContent = copy.chartTitle;
        byId("lcLegendActual").textContent = copy.legendActual;
        byId("lcLegendForecast").textContent = copy.forecast;
        byId("lcDaysTitle").textContent = copy.daysTitle;
        byId("lcLiveText").textContent = copy.live;
        byId("lcScan").textContent = copy.scanPaused.toUpperCase();
        var pills = byId("lcPills");
        LAMPS.forEach(function (lamp) {
            var pill = document.createElement("i");
            pill.style.background = lamp[0];
            pill.style.opacity = "0.16";
            pills.appendChild(pill);
        });
    }

    function tickClock() {
        var now = new Date();
        var clock = byId("lcClock");
        clear(clock);
        clock.appendChild(segmentDisplay(pad(now.getHours()) + ":" + pad(now.getMinutes()), 74));
        var colon = clock.querySelector(".lc-colon");
        if (colon && now.getSeconds() % 2) colon.setAttribute("opacity", "0.25");
        byId("lcWeekday").textContent = weekdayFormat.format(now);
        byId("lcDate").textContent = dateFormat.format(now);
        byId("lcStardate").textContent = now.getFullYear() + "." + dayOfYear(now);
        renderSensorCode(now);
    }

    function renderSensorCode(now) {
        var lit = 0;
        var pills = byId("lcPills").children;
        if (state.data) {
            LAMPS.forEach(function (lamp, index) {
                var on = !!lamp[1](state.data);
                if (on) lit += 1;
                pills[index].style.opacity = on ? "1" : "0.16";
            });
        }
        byId("lcSensorCode").textContent = (copy.sensorStatus + " · " + dayOfYear(now) + "-" + pad(now.getHours()) + pad(now.getMinutes()) + "-" + pad(lit)).toUpperCase();
    }

    function renderWeatherNow(weather) {
        var host = byId("lcWeather");
        var temperature = weather ? weather.temperature_c : null;
        host.hidden = temperature == null;
        if (temperature == null) return;
        byId("lcTemp").textContent = weather.temperature_source === "sensor"
            ? one.format(temperature)
            : "≈ " + whole.format(temperature);
        var icon = byId("lcWeatherIcon");
        clear(icon);
        var path = weather.sky ? SKY_ICONS[weather.sky] : null;
        icon.style.display = path ? "" : "none";
        if (path) el("path", { d: path }, icon);
        byId("lcSkyText").textContent = (weather.sky && copy.skyNow[weather.sky]) || "";
    }

    function renderPv(data) {
        var solar = data.power.solar_w;
        var text = solar == null ? "--" : one.format(solar / 1000);
        var host = byId("lcPvDigits");
        clear(host);
        host.appendChild(segmentDisplay(text, 118, 250));
        renderScope(data);
    }

    function wavePath(width, mid, amplitude, waves, jitter) {
        var d = "";
        for (var x = 0; x <= width; x += 4) {
            var y = mid
                - Math.sin(x / width * Math.PI * 2 * waves) * amplitude
                - Math.sin(x / width * Math.PI * 2 * waves * 3.3) * amplitude * jitter;
            d += (x ? " L" : "M") + x + "," + y.toFixed(1);
        }
        return d;
    }

    // Decorative oscilloscope: amber amplitude follows PV power, blue follows the home load.
    function renderScope(data) {
        var svg = byId("lcScope");
        clear(svg);
        for (var gx = 0; gx <= 320; gx += 32) el("line", { x1: gx, x2: gx, y1: 0, y2: 125, stroke: "#ffffff10" }, svg);
        for (var gy = 0; gy <= 125; gy += 25) el("line", { x1: 0, x2: 320, y1: gy, y2: gy, stroke: "#ffffff10" }, svg);
        var capacity = (data.installed_kwp || 10) * 1000;
        var pvShare = Math.max(0, Math.min(1, (data.power.solar_w || 0) / capacity));
        var homeShare = Math.max(0, Math.min(1, (data.power.home_w || 0) / capacity));
        var slow = el("g", { "class": "lc-wave lc-wave-slow" }, svg);
        el("path", { d: wavePath(640, 70, 6 + homeShare * 30, 4, 0.1), fill: "none", stroke: BLUE, "stroke-opacity": 0.55, "stroke-width": 1.6 }, slow);
        var fast = el("g", { "class": "lc-wave" }, svg);
        el("path", { d: wavePath(640, 66, (data.power.solar_w || 0) >= 50 ? 9 + pvShare * 32 : 1.5, 8, 0.35), fill: "none", stroke: AMBER, "stroke-width": 2.2 }, fast);
        var sweep = el("g", { "class": "lc-sweep" }, svg);
        el("rect", { x: 0, y: 0, width: 40, height: 125, fill: ORANGE, "fill-opacity": 0.14 }, sweep);
        el("line", { x1: 40, x2: 40, y1: 0, y2: 125, stroke: ORANGE, "stroke-width": 2 }, sweep);
    }

    function setCells(id, rows) {
        var host = byId(id);
        clear(host);
        rows.forEach(function (row) {
            var cell = document.createElement("div");
            var label = document.createElement("div");
            label.className = "lc-cell-label";
            label.textContent = copy[row[0]];
            var value = document.createElement("div");
            value.className = "lc-cell-value" + (row[2] && (row[1] || 0) > 0 ? " hot" : "");
            value.appendChild(powerNode(row[1] || 0));
            cell.appendChild(label);
            cell.appendChild(value);
            host.appendChild(cell);
        });
    }

    function renderFlow(power) {
        setContent("lcHomeValue", powerNode(power.home_w));
        setCells("lcHomeCells", [
            ["homeSolar", power.solar_to_house_w],
            ["homeBattery", power.battery_to_house_w],
            ["homeGrid", power.grid_to_house_w]
        ]);
        var soc = power.battery_soc_percent;
        byId("lcBattery").hidden = soc == null;
        if (soc != null) {
            var charge = (power.solar_to_battery_w || 0) + (power.grid_to_battery_w || 0);
            var discharge = power.battery_to_house_w || 0;
            setContent("lcBatteryValue", powerNode(Math.max(charge, discharge)));
            byId("lcSoc").textContent = whole.format(soc) + " %";
            var bar = byId("lcSocBar");
            clear(bar);
            var lit = Math.round(Math.max(0, Math.min(100, soc)) / 5);
            for (var i = 0; i < 20; i += 1) {
                var segment = document.createElement("i");
                if (i < lit) {
                    segment.className = "on";
                    if (i >= lit - 3) segment.style.opacity = String(0.55 + (lit - i) * 0.15);
                }
                bar.appendChild(segment);
            }
            setCells("lcBatteryCells", [
                ["batteryDischarge", discharge],
                ["batterySolar", power.solar_to_battery_w, true],
                ["batteryGrid", power.grid_to_battery_w]
            ]);
        }
        setContent("lcGridValue", powerNode(gridWatts(power)));
        setCells("lcGridCells", [
            ["gridImport", power.grid_to_house_w],
            ["gridExport", power.solar_to_grid_w, true],
            ["gridCharge", power.grid_to_battery_w]
        ]);
    }

    function niceStep(maximum) {
        var steps = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500];
        for (var i = 0; i < steps.length; i += 1) {
            if (maximum / steps[i] <= 4) return steps[i];
        }
        return 1000;
    }

    // Segment bar from 0 to the day forecast; the orange marker sits at today's yield.
    function renderYield(today) {
        setContent("lcYieldValue", withUnit(kwhText(today.yield_kwh), "kWh"));
        setContent("lcForecastValue", withUnit(kwhText(today.forecast_kwh), "kWh"));
        var bar = byId("lcYieldBar");
        var scale = byId("lcYieldScale");
        clear(bar);
        clear(scale);
        var forecast = today.forecast_kwh;
        var share = forecast ? Math.max(0, Math.min(1, (today.yield_kwh || 0) / forecast)) : 0;
        var count = 40;
        var lit = Math.round(share * count);
        for (var i = 0; i < count; i += 1) {
            var segment = document.createElement("i");
            if (i < lit) segment.className = "on";
            bar.appendChild(segment);
        }
        if (!forecast) return;
        var marker = document.createElement("b");
        marker.style.left = "calc(" + (share * 100).toFixed(2) + "% - 1px)";
        bar.appendChild(marker);
        var step = niceStep(forecast);
        for (var value = 0; value < forecast - step * 0.35; value += step) {
            var tick = document.createElement("span");
            tick.style.left = (value / forecast * 100).toFixed(2) + "%";
            tick.textContent = tickFormat.format(value);
            scale.appendChild(tick);
        }
        var end = document.createElement("span");
        end.className = "end";
        end.style.left = "calc(100% - 12px)";
        end.textContent = one.format(forecast);
        scale.appendChild(end);
    }

    function renderPrices(data) {
        byId("lcUsage").hidden = true;
        var priceNow = data.price_now_ct_kwh;
        byId("lcPriceNow").hidden = priceNow == null;
        if (priceNow != null) setContent("lcPriceNowValue", withUnit(one.format(priceNow), "ct/kWh"));
        var cheapest = data.cheapest_hour;
        var hasCheapest = !!(cheapest && cheapest.price_ct_kwh != null);
        byId("lcCheapest").hidden = !hasCheapest;
        if (hasCheapest) {
            byId("lcCheapestLabel").textContent = cheapest.is_tomorrow ? copy.cheapestHourTomorrow : copy.cheapestHour;
            setContent("lcCheapestValue", withUnit(fill(copy.hour, { hour: pad(cheapest.hour) }) + " · " + one.format(cheapest.price_ct_kwh), "ct/kWh"));
        }
        byId("lcPrices").hidden = priceNow == null && !hasCheapest;
    }

    function renderUsage(data) {
        byId("lcPrices").hidden = true;
        var today = data.today;
        var consumption = today.home_consumption_kwh;
        var charged = data.power.battery_soc_percent == null ? null : today.battery_charged_kwh;
        byId("lcConsumption").hidden = consumption == null;
        if (consumption != null) setContent("lcConsumptionValue", withUnit(one.format(consumption), "kWh"));
        byId("lcCharged").hidden = charged == null;
        if (charged != null) setContent("lcChargedValue", withUnit(one.format(charged), "kWh"));
        byId("lcUsage").hidden = consumption == null && charged == null;
    }

    function niceMax(value) {
        var steps = [0.2, 0.4, 0.6, 1, 2, 4, 6, 10, 20, 30, 40, 60, 80, 100, 150, 200, 300, 400, 600, 1000];
        for (var i = 0; i < steps.length; i += 1) {
            if (value <= steps[i]) return steps[i];
        }
        return Math.ceil(value / 100) * 100;
    }

    // Turns cumulative [hour, kWh] points into per-hour energy placed at the
    // middle of each segment; partial segments are scaled to an hourly rate.
    function hourlyPoints(cumulative) {
        var points = [];
        for (var i = 1; i < cumulative.length; i += 1) {
            var from = cumulative[i - 1];
            var to = cumulative[i];
            var hours = to[0] - from[0];
            if (hours < 0.5) continue;
            points.push([(from[0] + to[0]) / 2, Math.max(to[1] - from[1], 0) / hours]);
        }
        return points;
    }

    // Catmull-Rom curve through screen points; control points never dip below the baseline.
    function smoothPath(points, base) {
        var d = "M" + points[0][0].toFixed(1) + "," + points[0][1].toFixed(1);
        for (var i = 0; i < points.length - 1; i += 1) {
            var p0 = points[i - 1] || points[i];
            var p1 = points[i];
            var p2 = points[i + 1];
            var p3 = points[i + 2] || p2;
            var c1y = Math.min(base, p1[1] + (p2[1] - p0[1]) / 6);
            var c2y = Math.min(base, p2[1] - (p3[1] - p1[1]) / 6);
            d += " C" + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + "," + c1y.toFixed(1) + " " + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + "," + c2y.toFixed(1) + " " + p2[0].toFixed(1) + "," + p2[1].toFixed(1);
        }
        return d;
    }

    function renderChart(chart) {
        var svg = byId("lcChart");
        clear(svg);
        var width = svg.clientWidth || 830;
        var height = svg.clientHeight || 240;
        svg.setAttribute("viewBox", "0 0 " + width + " " + height);
        if (!chart.forecast.length) {
            svgText(svg, { x: width / 2, y: height / 2, fill: GREY, "font-size": 24, "letter-spacing": 2, "text-anchor": "middle" }, copy.noForecast.toUpperCase());
            return;
        }
        var left = 56;
        var right = width - 4;
        var base = height - 36;
        var topY = 30;
        var startHour = chart.start_hour;
        var endHour = chart.end_hour;
        var span = Math.max(endHour - startHour, 1);
        var forecastLine = [[chart.start_hour, 0]].concat(hourlyPoints(chart.forecast), [[chart.end_hour, 0]]);
        var actualLine = chart.actual.length > 1 ? [[chart.start_hour, 0]].concat(hourlyPoints(chart.actual)) : [];
        var peak = 0.1;
        forecastLine.concat(actualLine).forEach(function (point) {
            peak = Math.max(peak, point[1]);
        });
        var top = niceMax(peak);
        var x = function (hour) { return left + (hour - startHour) / span * (right - left); };
        var y = function (kwh) { return base - kwh / top * (base - topY); };
        var screen = function (points) {
            return points.map(function (point) { return [x(point[0]), y(point[1])]; });
        };

        el("rect", { x: left, y: topY, width: right - left, height: base - topY, fill: "#0b0a12", stroke: "#ffffff1c" }, svg);
        for (var hour = startHour; hour <= endHour; hour += 1) {
            el("line", { x1: x(hour), x2: x(hour), y1: topY, y2: base, stroke: "#ffffff0f" }, svg);
            if ((hour - startHour) % 2 === 0) svgText(svg, { x: x(hour), y: base + 30, fill: GREY, "font-size": 22, "text-anchor": "middle" }, pad(hour));
        }
        [0, top / 4, top / 2, top * 3 / 4, top].forEach(function (tick, index) {
            el("line", { x1: left, x2: right, y1: y(tick), y2: y(tick), stroke: "#ffffff0f" }, svg);
            if (index % 2 === 0) svgText(svg, { x: left - 16, y: y(tick) + 8, fill: GREY, "font-size": 22, "text-anchor": "end" }, tickFormat.format(tick));
        });
        svgText(svg, { x: 18, y: 16, fill: "#807c89", "font-size": 17, "letter-spacing": 2 }, "KWH");

        var defs = el("defs", {}, svg);
        var gradient = el("linearGradient", { id: "lcForecastFill", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
        el("stop", { offset: 0, "stop-color": LILAC, "stop-opacity": 0.16 }, gradient);
        el("stop", { offset: 1, "stop-color": LILAC, "stop-opacity": 0.03 }, gradient);
        var forecast = screen(forecastLine);
        var forecastPath = smoothPath(forecast, base);
        el("path", { d: forecastPath + " L" + forecast[forecast.length - 1][0].toFixed(1) + "," + base + " L" + forecast[0][0].toFixed(1) + "," + base + " Z", fill: "url(#lcForecastFill)" }, svg);
        el("path", { d: forecastPath, fill: "none", stroke: LILAC, "stroke-width": 2.5, "stroke-dasharray": "8 7" }, svg);

        var now = new Date();
        var nowHour = now.getHours() + now.getMinutes() / 60;
        if (nowHour > startHour && nowHour < endHour) {
            var nx = x(nowHour);
            el("rect", { x: nx - 28, y: topY, width: 28, height: base - topY, fill: ORANGE, "fill-opacity": 0.12 }, svg);
            el("line", { x1: nx, x2: nx, y1: topY, y2: base, stroke: ORANGE, "stroke-width": 2.5 }, svg);
            var label = fill(copy.now, { time: pad(now.getHours()) + ":" + pad(now.getMinutes()) }).toUpperCase();
            var labelWidth = label.length * 11 + 22;
            var lx = Math.min(nx + 8, right - labelWidth);
            el("rect", { x: lx, y: topY - 13, width: labelWidth, height: 26, rx: 13, fill: "#000", stroke: AMBER, "stroke-width": 1.5 }, svg);
            svgText(svg, { x: lx + labelWidth / 2, y: topY + 7, fill: AMBER, "font-size": 19, "letter-spacing": 1.5, "text-anchor": "middle" }, label);
        }
        if (actualLine.length > 1) {
            var actual = screen(actualLine);
            var end = actual[actual.length - 1];
            el("path", { d: smoothPath(actual, base), fill: "none", stroke: AMBER, "stroke-width": 4, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
            el("circle", { cx: end[0], cy: end[1], r: 6.5, fill: AMBER }, svg);
        }
    }

    function renderDays(days) {
        var host = byId("lcDays");
        clear(host);
        days.forEach(function (day, index) {
            var date = new Date(day.date + "T12:00:00");
            var cell = document.createElement("div");
            cell.className = "lc-day";
            var name = document.createElement("div");
            name.className = "lc-day-name";
            name.textContent = index === 0 ? copy.tomorrow : copy.dayAfter;
            var sub = document.createElement("div");
            sub.className = "lc-day-date";
            sub.textContent = shortWeekday.format(date) + " · " + shortDate.format(date);
            var sky = document.createElement("div");
            sky.className = "lc-day-sky";
            var icon = el("svg", { viewBox: "0 0 48 48", "aria-hidden": "true" });
            el("path", { d: SKY_ICONS[day.sky] || SKY_ICONS.cloud }, icon);
            sky.appendChild(icon);
            sky.appendChild(document.createTextNode(copy.sky[day.sky] || ""));
            var value = document.createElement("div");
            value.className = "lc-day-value";
            value.appendChild(withUnit(kwhText(day.forecast_kwh), "kWh"));
            cell.appendChild(name);
            cell.appendChild(sub);
            cell.appendChild(sky);
            cell.appendChild(value);
            host.appendChild(cell);
        });
    }

    function renderStatus(data, offline) {
        var stale = offline || !data || data.stale;
        byId("lcLive").className = "lc-live" + (stale ? " stale" : "");
        byId("lcLiveText").textContent = offline ? copy.offline : (stale ? copy.stale : copy.live);
        byId("lcScan").textContent = (stale ? copy.scanPaused : fill(copy.scanActive, { n: state.packet })).toUpperCase();
    }

    function render(data) {
        state.data = data;
        data.power = data.power || {};
        renderWeatherNow(data.weather_now);
        renderPv(data);
        renderFlow(data.power);
        renderYield(data.today);
        if (mode === "consumption") {
            renderUsage(data);
        } else {
            renderPrices(data);
        }
        renderChart(data.chart);
        renderDays(data.days);
        renderStatus(data, false);
        renderSensorCode(new Date());
    }

    function load() {
        fetch(DATA_URL, { cache: "no-store", credentials: "same-origin" })
            .then(function (response) {
                if (!response.ok) throw new Error("http_" + response.status);
                return response.json();
            })
            .then(function (body) {
                if (!body || !body.success) throw new Error("payload");
                state.failures = 0;
                state.packet = state.packet % 9 + 1;
                render(body.data);
            })
            .catch(function () {
                state.failures += 1;
                if (state.failures >= 2) renderStatus(state.data, true);
            });
    }

    function isStandalone() {
        if (navigator.standalone === true) return true;
        if (!window.matchMedia) return false;
        return window.matchMedia("(display-mode: standalone)").matches
            || window.matchMedia("(display-mode: fullscreen)").matches;
    }

    function fullscreenActive() {
        return !!(document.fullscreenElement || document.webkitFullscreenElement);
    }

    function fullscreenSupported() {
        var root = document.documentElement;
        return !!(root.requestFullscreen || root.webkitRequestFullscreen);
    }

    function enterFullscreen() {
        if (fullscreenActive() || !fullscreenSupported()) return;
        var root = document.documentElement;
        try {
            var request = (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
            if (request && request.catch) request.catch(function () {});
        } catch (e) {}
    }

    function onResize() {
        fitBoard();
        if (state.data) render(state.data);
    }

    function updateFullscreenHint() {
        var hint = byId("fsHint");
        hint.hidden = isStandalone() || fullscreenActive();
        hint.textContent = fullscreenSupported() ? copy.fsTap : copy.fsInstall;
        onResize();
    }

    function keepAwake() {
        if (!navigator.wakeLock) return;
        navigator.wakeLock.request("screen").catch(function () {});
    }

    staticText();
    fitBoard();
    tickClock();
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("fullscreenchange", updateFullscreenHint);
    document.addEventListener("webkitfullscreenchange", updateFullscreenHint);
    document.addEventListener("pointerup", enterFullscreen);
    updateFullscreenHint();
    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) {
            keepAwake();
            load();
        }
    });
    setInterval(tickClock, 1000);
    setInterval(load, POLL_MS);
    keepAwake();
    load();
})();
