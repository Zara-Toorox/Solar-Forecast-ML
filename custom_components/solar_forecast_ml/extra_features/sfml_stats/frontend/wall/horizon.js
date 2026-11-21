(function () {
    "use strict";

    var DATA_URL = "/api/sfml_stats/wall/data";
    var MANIFEST_URL = "/api/sfml_stats/wall/manifest.webmanifest";
    var THEME = "horizon";
    var POLL_MS = 10000;
    var NS = "http://www.w3.org/2000/svg";
    var BOARD_W = 1600;
    var BOARD_H = 1000;
    var GROUND = 676;
    var AMBER = "#e9a446";
    var AMBER_LINE = "#d38d2f";

    var TEXT = {
        de: {
            pvNow: "PV jetzt",
            yieldToday: "Ertrag heute",
            ofForecast: ["von ", " kWh Prognose"],
            chartTitle: "Dein Energietag",
            chartSub: "Ertrag und Prognose, {from}–{to} Uhr",
            actual: "Ertrag",
            forecast: "Prognose",
            now: "Jetzt {time}",
            noForecast: "Keine Prognosewerte für heute",
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
            priceNow: "Aktueller Preis",
            cheapestHour: "Günstigste Stunde",
            cheapestHourTomorrow: "Günstigste Stunde morgen",
            hour: "{hour} Uhr",
            consumptionToday: "Hausverbrauch heute",
            batteryChargedToday: "Zum Akku heute",
            daysTitle: "Die nächsten Tage",
            tomorrow: "Morgen",
            dayAfter: "Übermorgen",
            skyNow: { sun: "sonnig", partly: "leicht bewölkt", cloud: "bedeckt", rain: "Regen", snow: "Schnee", thunder: "Gewitter", fog: "Nebel", moon: "klar", moon_partly: "leicht bewölkt" },
            sky: { sun: "Sonnig", partly: "Wolkig", cloud: "Bedeckt", rain: "Regen" },
            live: "Live",
            stale: "Daten veraltet",
            offline: "Keine Verbindung",
            fsTap: "Zum Vollbild tippen",
            fsInstall: "Vollbild: zum Startbildschirm hinzufügen"
        },
        en: {
            pvNow: "PV now",
            yieldToday: "Yield today",
            ofForecast: ["of ", " kWh forecast"],
            chartTitle: "Your energy day",
            chartSub: "Yield and forecast, {from}:00–{to}:00",
            actual: "Yield",
            forecast: "Forecast",
            now: "Now {time}",
            noForecast: "No forecast values for today",
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
            priceNow: "Current price",
            cheapestHour: "Cheapest hour",
            cheapestHourTomorrow: "Cheapest hour tomorrow",
            hour: "{hour}:00",
            consumptionToday: "Home consumption today",
            batteryChargedToday: "Into battery today",
            daysTitle: "The next days",
            tomorrow: "Tomorrow",
            dayAfter: "Day after",
            skyNow: { sun: "sunny", partly: "partly cloudy", cloud: "overcast", rain: "rain", snow: "snow", thunder: "thunderstorm", fog: "fog", moon: "clear", moon_partly: "partly cloudy" },
            sky: { sun: "Sunny", partly: "Cloudy", cloud: "Overcast", rain: "Rain" },
            live: "Live",
            stale: "Data outdated",
            offline: "No connection",
            fsTap: "Tap for full screen",
            fsInstall: "Full screen: add to home screen"
        },
        pl: {
            pvNow: "PV teraz",
            yieldToday: "Uzysk dzisiaj",
            ofForecast: ["z ", " kWh prognozy"],
            chartTitle: "Twój dzień energii",
            chartSub: "Uzysk i prognoza, {from}:00–{to}:00",
            actual: "Uzysk",
            forecast: "Prognoza",
            now: "Teraz {time}",
            noForecast: "Brak wartości prognozy na dziś",
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
            priceNow: "Aktualna cena",
            cheapestHour: "Najtańsza godzina",
            cheapestHourTomorrow: "Najtańsza godzina jutro",
            hour: "{hour}:00",
            consumptionToday: "Zużycie domu dziś",
            batteryChargedToday: "Do baterii dziś",
            daysTitle: "Najbliższe dni",
            tomorrow: "Jutro",
            dayAfter: "Pojutrze",
            skyNow: { sun: "słonecznie", partly: "lekkie zachmurzenie", cloud: "pochmurno", rain: "deszcz", snow: "śnieg", thunder: "burza", fog: "mgła", moon: "bezchmurnie", moon_partly: "lekkie zachmurzenie" },
            sky: { sun: "Słonecznie", partly: "Pochmurno", cloud: "Zachmurzenie", rain: "Deszcz" },
            live: "Na żywo",
            stale: "Dane nieaktualne",
            offline: "Brak połączenia",
            fsTap: "Dotknij: pełny ekran",
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

    // Sky colours from zenith to horizon for each phase of the day and weather group.
    var SKIES = {
        day: {
            clear: ["#6f9fcf", "#9fbfdc", "#d6e2e8", "#f1e4c8", "#f7d39a"],
            partly: ["#8fa8c0", "#b6c5d0", "#e2e1d9", "#f2dcb3", "#f5cf8f"],
            cloud: ["#8b96a2", "#a5aeb7", "#c2c7cb", "#d4d3ce", "#dcd3c1"],
            wet: ["#6d7985", "#8b95a0", "#a9b0b6", "#bfc1c0", "#c7c1b4"],
            snow: ["#a5b1bd", "#c1cad2", "#dbe0e4", "#e8e9ea", "#eeeae3"],
            fog: ["#b2b7bb", "#c6c9cb", "#d7d8d7", "#e1dfda", "#e5e0d5"]
        },
        twilight: {
            clear: ["#2b3b62", "#53628b", "#9a7d92", "#de9f7c", "#f3b46c"],
            partly: ["#36415f", "#5d6684", "#957f8c", "#cf9a7d", "#e4a874"],
            cloud: ["#3a414f", "#555c69", "#757880", "#958f8c", "#a8988a"],
            wet: ["#2e343e", "#454b55", "#5f646c", "#787a7d", "#878279"],
            snow: ["#4b5568", "#6c7588", "#959aa6", "#b6b2b3", "#c6b8ad"],
            fog: ["#55595f", "#6e7176", "#8a8b8d", "#a3a09c", "#b0a99f"]
        },
        night: {
            clear: ["#050a16", "#0b1426", "#13203a", "#1c2a47", "#273759"],
            partly: ["#0b111d", "#131b2b", "#1b263a", "#243149", "#2e3c56"],
            cloud: ["#10151d", "#181e27", "#202731", "#29313c", "#323b47"],
            wet: ["#0c1016", "#13181f", "#1a2028", "#222932", "#2a323c"],
            snow: ["#151b26", "#1f2735", "#2a3343", "#353f50", "#414b5c"],
            fog: ["#181c22", "#20252c", "#292e35", "#33383f", "#3c4148"]
        }
    };
    var WEATHER_GROUP = { sun: "clear", moon: "clear", partly: "partly", moon_partly: "partly", cloud: "cloud", rain: "wet", thunder: "wet", snow: "snow", fog: "fog" };
    var SUN_STRENGTH = { clear: 1, partly: 0.85, cloud: 0.35, wet: 0.2, snow: 0.4, fog: 0.45 };
    var CLOUDS = { clear: 0, partly: 4, cloud: 9, wet: 10, snow: 8, fog: 3 };

    var MODES = ["grid", "consumption"];
    var locale = pickLocale();
    var mode = pickMode();
    var copy = TEXT[locale];
    var state = { data: null, failures: 0, skyKey: "" };
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

    // Local wall-clock hour of an ISO stamp, taken from the stamp itself.
    function stampHour(stamp) {
        return Number(stamp.slice(11, 13)) + Number(stamp.slice(14, 16)) / 60;
    }

    function nowHour(now) {
        return now.getHours() + now.getMinutes() / 60;
    }

    function fitBoard() {
        var scale = Math.min(window.innerWidth / BOARD_W, window.innerHeight / BOARD_H);
        document.documentElement.style.setProperty("--scale", String(scale));
    }

    function dayPhase(data) {
        var sky = data.weather_now ? data.weather_now.sky : null;
        if (!data.sun) return sky === "moon" || sky === "moon_partly" ? "night" : "day";
        var t = Date.now();
        var sunrise = Date.parse(data.sun.sunrise);
        var sunset = Date.parse(data.sun.sunset);
        var twilight = 40 * 60000;
        if (t < sunrise - twilight || t > sunset + twilight) return "night";
        if (t < sunrise + twilight || t > sunset - twilight) return "twilight";
        return "day";
    }

    function weatherGroup(data) {
        var sky = data.weather_now ? data.weather_now.sky : null;
        return WEATHER_GROUP[sky] || "clear";
    }

    function cloudShape(parent, cx, cy, size, fillColor, opacity) {
        var cloud = el("g", { "class": "hz-cloud", opacity: opacity, filter: "url(#hzSoft)" }, parent);
        cloud.style.animationDelay = "-" + Math.round(cx % 120) + "s";
        [[0, 0, 1, 0.42], [-0.55, 0.12, 0.62, 0.3], [0.6, 0.1, 0.7, 0.32], [0.15, -0.22, 0.6, 0.36]].forEach(function (blob) {
            el("ellipse", { cx: cx + blob[0] * size, cy: cy + blob[1] * size, rx: blob[2] * size, ry: blob[3] * size, fill: fillColor }, cloud);
        });
    }

    // Background sky follows the phase of the day and the current weather.
    function renderSky(data) {
        var phase = dayPhase(data);
        var group = weatherGroup(data);
        var stormy = data.weather_now && data.weather_now.sky === "thunder";
        var key = phase + group + stormy;
        var board = byId("board");
        board.classList.toggle("hz-dark", phase !== "day");
        if (key === state.skyKey) return;
        state.skyKey = key;
        var colors = SKIES[phase][group];
        byId("hzSky").style.background = "linear-gradient(180deg," + colors[0] + " 0%," + colors[1] + " 28%," + colors[2] + " 58%," + colors[3] + " 86%," + colors[4] + " 100%)";

        var svg = byId("hzWeather");
        clear(svg);
        var seed = 11;
        var random = function () {
            seed = (seed * 16807) % 2147483647;
            return (seed - 1) / 2147483646;
        };
        if (phase !== "day" && (group === "clear" || group === "partly")) {
            var stars = phase === "night" ? (group === "clear" ? 140 : 60) : 25;
            for (var s = 0; s < stars; s += 1) {
                el("circle", { cx: (random() * 1600).toFixed(1), cy: (random() * 470).toFixed(1), r: random() < 0.85 ? 0.9 : 1.6, fill: "#ffffff", opacity: (0.25 + random() * 0.6).toFixed(2) }, svg);
            }
        }
        if (group === "fog") {
            [430, 520, 600].forEach(function (y, index) {
                el("rect", { x: 0, y: y - 40, width: 1600, height: 80, fill: phase === "day" ? "#ffffff" : "#8b9099", opacity: 0.22 + index * 0.08 }, svg);
            });
        }
        var blur = el("filter", { id: "hzSoft", x: "-50%", y: "-50%", width: "200%", height: "200%" }, el("defs", {}, svg));
        el("feGaussianBlur", { stdDeviation: 10 }, blur);
        var count = CLOUDS[group];
        var cloudColor = phase === "night" ? "#2c3442" : (group === "wet" ? "#7d8691" : (phase === "twilight" ? "#a39aa4" : "#ffffff"));
        var cloudOpacity = group === "partly" ? 0.4 : 0.7;
        for (var c = 0; c < count; c += 1) {
            cloudShape(svg, 120 + random() * 1360, 120 + random() * (group === "partly" ? 220 : 360), 70 + random() * 90, cloudColor, cloudOpacity);
        }
        if (group === "wet") {
            var rain = el("g", { "class": "hz-rain", stroke: phase === "day" ? "#5b6673" : "#9aa6b5", "stroke-width": 1.3, opacity: 0.35 }, svg);
            for (var r = 0; r < 120; r += 1) {
                var rx = random() * 1620;
                var ry = random() * 640;
                var line = el("line", { x1: rx, y1: ry, x2: rx - 7, y2: ry + 26 }, rain);
                line.style.animationDelay = "-" + (random() * 0.9).toFixed(2) + "s";
            }
        }
        if (group === "snow") {
            var snow = el("g", { "class": "hz-snow", fill: "#ffffff", opacity: 0.85 }, svg);
            for (var f = 0; f < 110; f += 1) {
                var flake = el("circle", { cx: (random() * 1620).toFixed(1), cy: (random() * 640).toFixed(1), r: (1.2 + random() * 2.2).toFixed(1) }, snow);
                flake.style.animationDelay = "-" + (random() * 9).toFixed(2) + "s";
            }
        }
        if (stormy) el("rect", { "class": "hz-flash", x: 0, y: 0, width: 1600, height: 676, fill: "#ffffff", opacity: 0 }, svg);
    }

    function staticText() {
        document.documentElement.setAttribute("lang", locale);
        var manifest = document.querySelector('link[rel="manifest"]');
        if (manifest) manifest.setAttribute("href", MANIFEST_URL + "?theme=" + THEME + (mode === "grid" ? "" : "&mode=" + mode));
        byId("hzPvLabel").textContent = copy.pvNow;
        byId("hzYieldLabel").textContent = copy.yieldToday;
        byId("hzChartTitle").textContent = copy.chartTitle;
        byId("hzHomeTitle").textContent = copy.home;
        byId("hzBatteryTitle").textContent = copy.battery;
        byId("hzGridTitle").textContent = copy.grid;
        byId("hzPriceNowLabel").textContent = copy.priceNow;
        byId("hzConsumptionLabel").textContent = copy.consumptionToday;
        byId("hzChargedLabel").textContent = copy.batteryChargedToday;
        byId("hzDaysTitle").textContent = copy.daysTitle;
        byId("hzLiveText").textContent = copy.live;
    }

    function tickClock() {
        var now = new Date();
        byId("hzClock").textContent = pad(now.getHours()) + ":" + pad(now.getMinutes());
        byId("hzWeekday").textContent = weekdayFormat.format(now);
        byId("hzDate").textContent = dateFormat.format(now);
    }

    function renderWeatherNow(weather) {
        var host = byId("hzWeatherNow");
        var temperature = weather ? weather.temperature_c : null;
        host.hidden = temperature == null;
        if (temperature == null) return;
        byId("hzTemp").textContent = (weather.temperature_source === "sensor" ? one.format(temperature) : "≈ " + whole.format(temperature)) + " °C";
        var icon = byId("hzWeatherIcon");
        clear(icon);
        var path = weather.sky ? SKY_ICONS[weather.sky] : null;
        icon.style.display = path ? "" : "none";
        if (path) el("path", { d: path, "class": weather.sky === "sun" ? "sun" : "" }, icon);
        byId("hzSkyText").textContent = (weather.sky && copy.skyNow[weather.sky]) || "";
    }

    function renderHeadline(data) {
        var solar = data.power.solar_w;
        byId("hzPvValue").textContent = solar == null ? "–" : one.format(solar / 1000);
        var today = data.today;
        setContent("hzYieldValue", withUnit(kwhText(today.yield_kwh), "kWh"));
        var share = today.forecast_kwh ? Math.max(0, Math.min(1, (today.yield_kwh || 0) / today.forecast_kwh)) : 0;
        byId("hzProgressFill").style.width = (share * 100).toFixed(1) + "%";
        byId("hzProgressKnob").style.left = (share * 100).toFixed(1) + "%";
        var of = byId("hzOf");
        clear(of);
        if (today.forecast_kwh == null) return;
        of.appendChild(document.createTextNode(copy.ofForecast[0]));
        var value = document.createElement("em");
        value.textContent = one.format(today.forecast_kwh);
        of.appendChild(value);
        of.appendChild(document.createTextNode(copy.ofForecast[1]));
    }

    function niceMax(value) {
        var steps = [0.2, 0.4, 0.6, 1, 2, 4, 6, 10, 20, 30, 40, 60, 80, 100, 150, 200, 300, 400, 600, 1000];
        for (var i = 0; i < steps.length; i += 1) {
            if (value <= steps[i]) return steps[i];
        }
        return Math.ceil(value / 100) * 100;
    }

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

    function drawHouse(svg, data) {
        var power = data.power;
        var house = el("g", { transform: "translate(52,592)" }, svg);
        el("path", { d: "M0 44 52 0 104 44V84H0Z", fill: "#1b2431" }, house);
        var panel = (power.solar_w || 0) >= 50 ? "#f2b45a" : "#6b7480";
        [0, 1, 2, 3].forEach(function (index) {
            el("rect", { x: 58 + index * 11, y: -2 + index * 9.2, width: 12, height: 6, rx: 1, fill: panel, transform: "rotate(40 " + (64 + index * 11) + " " + (1 + index * 9.2) + ")" }, house);
        });
        var lit = (power.home_w || 0) > 0 ? "#f6c376" : "#4a5361";
        el("rect", { x: 20, y: 54, width: 14, height: 14, fill: lit }, house);
        el("rect", { x: 46, y: 54, width: 14, height: 14, fill: lit, opacity: 0.75 }, house);
        el("rect", { x: 74, y: 50, width: 12, height: 34, fill: "#2a3443" }, house);
    }

    function drawTree(svg, data) {
        var color = "#c99a52";
        var hasBattery = data.power.battery_soc_percent != null;
        el("path", { d: "M94 " + GROUND + " V708 Q94 720 106 720 H744", fill: "none", stroke: color, "stroke-width": 1.6 }, svg);
        [194, hasBattery ? 469 : null, 744].forEach(function (x) {
            if (x == null) return;
            el("line", { x1: x, x2: x, y1: 720, y2: 732, stroke: color, "stroke-width": 1.6 }, svg);
            el("circle", { cx: x, cy: 720, r: 4.5, fill: AMBER }, svg);
        });
    }

    // The scene: sun arc between sunrise and sunset, energy curves and the house on the horizon.
    function renderScene(data) {
        var svg = byId("hzScene");
        clear(svg);
        var phase = dayPhase(data);
        var dark = phase !== "day";
        var group = weatherGroup(data);
        var chart = data.chart;
        var now = new Date();
        var t = nowHour(now);
        var sunrise = data.sun ? stampHour(data.sun.sunrise) : null;
        var sunset = data.sun ? stampHour(data.sun.sunset) : null;
        var hasChart = chart.forecast.length > 0;
        var from = sunrise != null ? sunrise : (hasChart ? chart.start_hour - 0.5 : 6);
        var to = sunset != null ? sunset : (hasChart ? chart.end_hour + 0.5 : 18);
        if (hasChart) {
            from = Math.min(from, chart.start_hour);
            to = Math.max(to, chart.end_hour);
        }
        var left = 234;
        var right = 1500;
        var x = function (hour) { return left + (hour - from) / (to - from) * (right - left); };
        var lineColor = dark ? "#9aa6b5" : "#6f7884";
        var soft = dark ? "#b4bfcc" : "#4a5563";
        var defs = el("defs", {}, svg);

        var forecastLine = hasChart ? [[chart.start_hour, 0]].concat(hourlyPoints(chart.forecast), [[chart.end_hour, 0]]) : [];
        var actualLine = chart.actual.length > 1 ? [[chart.start_hour, 0]].concat(hourlyPoints(chart.actual)) : [];
        var peak = 0.1;
        forecastLine.concat(actualLine).forEach(function (point) { peak = Math.max(peak, point[1]); });
        var top = niceMax(peak);
        var y = function (kwh) { return GROUND - kwh / top * 236; };

        [top, top / 2].forEach(function (tick, index) {
            el("line", { x1: 236, x2: 1480, y1: y(tick), y2: y(tick), stroke: lineColor, "stroke-opacity": 0.45, "stroke-dasharray": "1 7", "stroke-linecap": "round", "stroke-width": 1.5 }, svg);
            svgText(svg, { x: 222, y: y(tick) + 6, fill: soft, "font-size": 18, "text-anchor": "end" }, tickFormat.format(tick) + (index === 0 ? " kWh" : ""));
        });

        if (sunrise != null && sunset != null) {
            var arcPoint = function (hour) {
                var share = (hour - sunrise) / (sunset - sunrise);
                return [x(hour), GROUND - 336 * Math.pow(Math.sin(Math.PI * share), 0.8)];
            };
            var arcPath = function (a, b) {
                var d = "";
                for (var i = 0; i <= 60; i += 1) {
                    var p = arcPoint(a + (b - a) * i / 60);
                    d += (i ? " L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1);
                }
                return d;
            };
            var sunUp = t > sunrise && t < sunset;
            if (sunUp) {
                el("path", { d: arcPath(sunrise, t), fill: "none", stroke: AMBER_LINE, "stroke-width": 2 }, svg);
                el("path", { d: arcPath(t, sunset), fill: "none", stroke: lineColor, "stroke-width": 1.6, "stroke-dasharray": "2 6", "stroke-linecap": "round" }, svg);
            } else {
                el("path", { d: arcPath(sunrise, sunset), fill: "none", stroke: lineColor, "stroke-width": 1.6, "stroke-dasharray": "2 6", "stroke-linecap": "round", opacity: 0.7 }, svg);
            }
            svgText(svg, { x: x(sunrise) - 14, y: GROUND + 33, fill: "#a3adba", "font-size": 17, "text-anchor": "end" }, "↑ " + data.sun.sunrise.slice(11, 16));
            svgText(svg, { x: x(sunset) + 14, y: GROUND + 33, fill: "#a3adba", "font-size": 17 }, data.sun.sunset.slice(11, 16) + " ↓");
            el("circle", { cx: x(sunrise), cy: GROUND, r: 3.5, fill: AMBER }, svg);
            el("circle", { cx: x(sunset), cy: GROUND, r: 3.5, fill: AMBER }, svg);
            if (sunUp) {
                var sun = arcPoint(t);
                var strength = SUN_STRENGTH[group];
                var glow = el("radialGradient", { id: "hzGlow" }, defs);
                el("stop", { offset: 0, "stop-color": "#fff3d6", "stop-opacity": 0.9 * strength }, glow);
                el("stop", { offset: 0.35, "stop-color": "#ffd795", "stop-opacity": 0.45 * strength }, glow);
                el("stop", { offset: 1, "stop-color": "#ffd795", "stop-opacity": 0 }, glow);
                el("circle", { cx: sun[0], cy: sun[1], r: 300, fill: "url(#hzGlow)" }, svg);
                el("line", { x1: sun[0], x2: sun[0], y1: sun[1] + 30, y2: GROUND, stroke: AMBER, "stroke-width": 2 }, svg);
                el("circle", { cx: sun[0], cy: sun[1], r: 36, fill: "#ffe2a8", opacity: 0.35 * strength + 0.1 }, svg);
                el("circle", { cx: sun[0], cy: sun[1], r: 26, fill: "#fbbd55", stroke: "#fff4dc", "stroke-width": 3, opacity: 0.45 + 0.55 * strength }, svg);
            }
        }

        if (!hasChart) {
            svgText(svg, { x: 860, y: 560, fill: soft, "font-size": 22, "text-anchor": "middle" }, copy.noForecast);
        } else {
            var screen = function (points) { return points.map(function (p) { return [x(p[0]), y(p[1])]; }); };
            var forecast = screen(forecastLine);
            el("path", { d: smoothPath(forecast, GROUND), fill: "none", stroke: dark ? "#c3ccd8" : "#59626e", "stroke-width": 2, "stroke-dasharray": "5 6" }, svg);
            var peakPoint = forecast.reduce(function (best, p) { return p[1] < best[1] ? p : best; }, forecast[0]);
            svgText(svg, { x: peakPoint[0] + 30, y: peakPoint[1] - 22, fill: dark ? "#d7dee7" : "#3b4552", "font-size": 32, style: "font-family:var(--hz-serif);font-style:italic" }, copy.forecast);
            if (actualLine.length > 1) {
                var actual = screen(actualLine);
                var area = el("linearGradient", { id: "hzArea", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
                el("stop", { offset: 0, "stop-color": "#f6b85b", "stop-opacity": 0.75 }, area);
                el("stop", { offset: 1, "stop-color": "#f6b85b", "stop-opacity": 0.3 }, area);
                var actualPath = smoothPath(actual, GROUND);
                var last = actual[actual.length - 1];
                el("path", { d: actualPath + " L" + last[0].toFixed(1) + "," + GROUND + " L" + actual[0][0].toFixed(1) + "," + GROUND + " Z", fill: "url(#hzArea)" }, svg);
                el("path", { d: actualPath, fill: "none", stroke: AMBER_LINE, "stroke-width": 2.5 }, svg);
                el("circle", { cx: last[0], cy: last[1], r: 6, fill: "#fff6e4", stroke: AMBER_LINE, "stroke-width": 2 }, svg);
                var top2 = actual.reduce(function (best, p) { return p[1] < best[1] ? p : best; }, actual[0]);
                var inside = GROUND - top2[1] > 60;
                svgText(svg, { x: top2[0], y: inside ? GROUND - 16 : top2[1] - 14, "text-anchor": "middle", fill: dark ? "#f6d7a6" : "#5a3a12", "font-size": 30, style: "font-family:var(--hz-serif);font-style:italic" }, copy.actual);
            }
            byId("hzChartSub").textContent = fill(copy.chartSub, { from: pad(chart.start_hour), to: pad(chart.end_hour) });
        }

        if (t > from && t < to) {
            var label = fill(copy.now, { time: pad(now.getHours()) + ":" + pad(now.getMinutes()) }).toUpperCase();
            var nx = x(t);
            var flip = nx > right - 200;
            if (!(sunrise != null && t > sunrise && t < sunset)) el("line", { x1: nx, x2: nx, y1: 420, y2: GROUND, stroke: AMBER, "stroke-width": 2, "stroke-dasharray": "3 5" }, svg);
            svgText(svg, { x: flip ? nx - 18 : nx + 18, y: GROUND - 14, fill: "#c97b1e", "font-size": 17, "font-weight": 700, "letter-spacing": 3, "text-anchor": flip ? "end" : "start" }, label);
        }

        for (var hour = Math.ceil(from / 2) * 2; hour <= to; hour += 2) {
            var hx = x(hour);
            if ((sunrise != null && Math.abs(hx - x(sunrise)) < 70) || (sunset != null && Math.abs(hx - x(sunset)) < 70)) {
                if (Math.abs(hx - x(sunrise != null ? sunrise : -99)) < 30 || Math.abs(hx - x(sunset != null ? sunset : -99)) < 30) continue;
            }
            el("line", { x1: hx, x2: hx, y1: GROUND, y2: GROUND + 8, stroke: "#ffffff55" }, svg);
            svgText(svg, { x: hx, y: GROUND + 33, fill: "#c7cfd8", "font-size": 18, "text-anchor": "middle" }, pad(hour));
        }
        drawHouse(svg, data);
        drawTree(svg, data);
    }

    function setRows(id, rows) {
        var host = byId(id);
        clear(host);
        rows.forEach(function (row) {
            var label = document.createElement("dt");
            label.textContent = copy[row[0]];
            var value = document.createElement("dd");
            value.textContent = powerParts(row[1] || 0).join(" ");
            if (row[2] && (row[1] || 0) > 0) value.className = "hot";
            host.appendChild(label);
            host.appendChild(value);
        });
    }

    function renderFlow(power) {
        setContent("hzHomeValue", powerNode(power.home_w));
        setRows("hzHomeRows", [["homeSolar", power.solar_to_house_w], ["homeBattery", power.battery_to_house_w], ["homeGrid", power.grid_to_house_w]]);
        var soc = power.battery_soc_percent;
        byId("hzBattery").hidden = soc == null;
        if (soc != null) {
            var charge = (power.solar_to_battery_w || 0) + (power.grid_to_battery_w || 0);
            var discharge = power.battery_to_house_w || 0;
            byId("hzSoc").textContent = whole.format(soc) + " %";
            setContent("hzBatteryValue", powerNode(Math.max(charge, discharge)));
            setRows("hzBatteryRows", [["batteryDischarge", discharge], ["batterySolar", power.solar_to_battery_w, true], ["batteryGrid", power.grid_to_battery_w]]);
        }
        setContent("hzGridValue", powerNode(gridWatts(power)));
        setRows("hzGridRows", [["gridImport", power.grid_to_house_w], ["gridExport", power.solar_to_grid_w, true], ["gridCharge", power.grid_to_battery_w]]);
    }

    function renderPrices(data) {
        byId("hzUsage").hidden = true;
        var priceNow = data.price_now_ct_kwh;
        byId("hzPriceNow").hidden = priceNow == null;
        if (priceNow != null) setContent("hzPriceNowValue", withUnit(one.format(priceNow), "ct/kWh"));
        var cheapest = data.cheapest_hour;
        var hasCheapest = !!(cheapest && cheapest.price_ct_kwh != null);
        byId("hzCheapest").hidden = !hasCheapest;
        if (hasCheapest) {
            byId("hzCheapestLabel").textContent = cheapest.is_tomorrow ? copy.cheapestHourTomorrow : copy.cheapestHour;
            setContent("hzCheapestValue", withUnit(fill(copy.hour, { hour: pad(cheapest.hour) }) + " · " + one.format(cheapest.price_ct_kwh), "ct/kWh"));
        }
        byId("hzPrices").hidden = priceNow == null && !hasCheapest;
    }

    function renderUsage(data) {
        byId("hzPrices").hidden = true;
        var today = data.today;
        var consumption = today.home_consumption_kwh;
        var charged = data.power.battery_soc_percent == null ? null : today.battery_charged_kwh;
        byId("hzConsumption").hidden = consumption == null;
        if (consumption != null) setContent("hzConsumptionValue", withUnit(one.format(consumption), "kWh"));
        byId("hzCharged").hidden = charged == null;
        if (charged != null) setContent("hzChargedValue", withUnit(one.format(charged), "kWh"));
        byId("hzUsage").hidden = consumption == null && charged == null;
    }

    function renderDays(days) {
        var host = byId("hzDays");
        clear(host);
        days.forEach(function (day, index) {
            var date = new Date(day.date + "T12:00:00");
            var cell = document.createElement("div");
            cell.className = "hz-day";
            var name = document.createElement("div");
            name.className = "hz-day-name";
            name.textContent = index === 0 ? copy.tomorrow : copy.dayAfter;
            var sub = document.createElement("div");
            sub.className = "hz-day-date";
            sub.textContent = shortWeekday.format(date) + " · " + shortDate.format(date);
            var sky = document.createElement("div");
            sky.className = "hz-day-sky";
            var icon = el("svg", { viewBox: "0 0 48 48", "aria-hidden": "true" });
            el("path", { d: SKY_ICONS[day.sky] || SKY_ICONS.cloud }, icon);
            sky.appendChild(icon);
            sky.appendChild(document.createTextNode(copy.sky[day.sky] || ""));
            var value = document.createElement("div");
            value.className = "hz-day-value";
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
        byId("hzLive").className = "hz-live" + (stale ? " stale" : "");
        byId("hzLiveText").textContent = offline ? copy.offline : (stale ? copy.stale : copy.live);
    }

    function render(data) {
        state.data = data;
        data.power = data.power || {};
        renderSky(data);
        renderWeatherNow(data.weather_now);
        renderHeadline(data);
        renderScene(data);
        renderFlow(data.power);
        if (mode === "consumption") {
            renderUsage(data);
        } else {
            renderPrices(data);
        }
        renderDays(data.days);
        renderStatus(data, false);
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

    function updateFullscreenHint() {
        var hint = byId("fsHint");
        hint.hidden = isStandalone() || fullscreenActive();
        hint.textContent = fullscreenSupported() ? copy.fsTap : copy.fsInstall;
        fitBoard();
    }

    function keepAwake() {
        if (!navigator.wakeLock) return;
        navigator.wakeLock.request("screen").catch(function () {});
    }

    staticText();
    fitBoard();
    tickClock();
    window.addEventListener("resize", fitBoard, { passive: true });
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
