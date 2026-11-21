(function () {
    "use strict";

    var DATA_URL = "/api/sfml_stats/wall/data";
    var MANIFEST_URL = "/api/sfml_stats/wall/manifest.webmanifest";
    var POLL_MS = 10000;
    var NS = "http://www.w3.org/2000/svg";
    var BOARD_W = 1600;
    var BOARD_H = 1000;
    var AMBER = "#f3b864";
    var ORANGE = "#f08a3c";
    var STEEL = "#a9c0d3";
    var MUTED = "#8b9198";
    var BG = "#05070a";

    var TEXT = {
        de: {
            missionTime: "Missionszeit",
            sinceSunrise: "Seit Sonnenaufgang {time}",
            untilSunrise: "Bis Sonnenaufgang {time}",
            solarTag: "PV jetzt",
            producing: "Erzeugung aktiv",
            idle: "Keine Erzeugung",
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
            priceNow: "Aktueller Preis",
            cheapestHour: "Günstigste Stunde",
            cheapestHourTomorrow: "Günstigste Stunde morgen",
            hour: "{hour} Uhr",
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
            telemetryPv: "PV",
            telemetryHome: "Haus",
            telemetryBattery: "Akku",
            telemetryGrid: "Netz",
            telemetryYield: "Ertrag",
            live: "Live",
            stale: "Daten veraltet",
            offline: "Keine Verbindung",
            fsTap: "Zum Vollbild tippen",
            fsInstall: "Vollbild: zum Startbildschirm hinzufügen"
        },
        en: {
            missionTime: "Mission time",
            sinceSunrise: "Since sunrise {time}",
            untilSunrise: "Until sunrise {time}",
            solarTag: "PV now",
            producing: "Generating",
            idle: "No generation",
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
            priceNow: "Current price",
            cheapestHour: "Cheapest hour",
            cheapestHourTomorrow: "Cheapest hour tomorrow",
            hour: "{hour}:00",
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
            telemetryPv: "PV",
            telemetryHome: "Home",
            telemetryBattery: "Battery",
            telemetryGrid: "Grid",
            telemetryYield: "Yield",
            live: "Live",
            stale: "Data outdated",
            offline: "No connection",
            fsTap: "Tap for full screen",
            fsInstall: "Full screen: add to home screen"
        },
        pl: {
            missionTime: "Czas misji",
            sinceSunrise: "Od wschodu słońca {time}",
            untilSunrise: "Do wschodu słońca {time}",
            solarTag: "PV teraz",
            producing: "Produkcja aktywna",
            idle: "Brak produkcji",
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
            priceNow: "Aktualna cena",
            cheapestHour: "Najtańsza godzina",
            cheapestHourTomorrow: "Najtańsza godzina jutro",
            hour: "{hour}:00",
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
            telemetryPv: "PV",
            telemetryHome: "Dom",
            telemetryBattery: "Akumulator",
            telemetryGrid: "Sieć",
            telemetryYield: "Uzysk",
            live: "Na żywo",
            stale: "Dane nieaktualne",
            offline: "Brak połączenia",
            fsTap: "Dotknij, aby włączyć pełny ekran",
            fsInstall: "Pełny ekran: dodaj do ekranu głównego"
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

    var MODES = ["grid", "consumption"];
    var locale = pickLocale();
    var mode = pickMode();
    var copy = TEXT[locale];
    var state = { data: null, failures: 0 };
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

    function fitBoard() {
        var scale = Math.min(window.innerWidth / BOARD_W, window.innerHeight / BOARD_H);
        document.documentElement.style.setProperty("--scale", String(scale));
    }

    // Deterministic star field and a horizon arc behind the board.
    function drawSky() {
        var svg = byId("mcSky");
        var seed = 7;
        function random() {
            seed = (seed * 16807) % 2147483647;
            return (seed - 1) / 2147483646;
        }
        var defs = el("defs", {}, svg);
        var glow = el("radialGradient", { id: "mcHorizonGlow", cx: "50%", cy: "100%", r: "60%" }, defs);
        el("stop", { offset: 0, "stop-color": "#6f8fae", "stop-opacity": 0.16 }, glow);
        el("stop", { offset: 1, "stop-color": "#6f8fae", "stop-opacity": 0 }, glow);
        for (var i = 0; i < 170; i += 1) {
            el("circle", {
                cx: (random() * BOARD_W).toFixed(1),
                cy: (random() * BOARD_H).toFixed(1),
                r: random() < 0.9 ? 0.7 : 1.3,
                fill: "#ffffff",
                opacity: (0.08 + random() * 0.32).toFixed(2)
            }, svg);
        }
        el("ellipse", { cx: 800, cy: 1560, rx: 1050, ry: 650, fill: "url(#mcHorizonGlow)" }, svg);
        el("ellipse", { cx: 800, cy: 1560, rx: 1050, ry: 650, fill: BG, stroke: "#8aa6c2", "stroke-opacity": 0.32, "stroke-width": 1.2 }, svg);
    }

    function staticText() {
        document.documentElement.setAttribute("lang", locale);
        var manifest = document.querySelector('link[rel="manifest"]');
        if (manifest) manifest.setAttribute("href", MANIFEST_URL + "?theme=mission" + (mode === "grid" ? "" : "&mode=" + mode));
        byId("mcMissionLabel").textContent = copy.missionTime;
        byId("mcSolarTag").textContent = copy.solarTag;
        byId("mcHomeTitle").textContent = copy.home;
        byId("mcBatteryTitle").textContent = copy.battery;
        byId("mcGridTitle").textContent = copy.grid;
        byId("mcYieldLabel").textContent = copy.yieldToday;
        byId("mcForecastLabel").textContent = copy.forecast;
        byId("mcPriceNowLabel").textContent = copy.priceNow;
        byId("mcConsumptionLabel").textContent = copy.consumptionToday;
        byId("mcChargedLabel").textContent = copy.batteryChargedToday;
        byId("mcChartTitle").textContent = copy.chartTitle;
        byId("mcLegendActual").textContent = copy.legendActual;
        byId("mcLegendForecast").textContent = copy.forecast;
        byId("mcDaysTitle").textContent = copy.daysTitle;
        byId("mcLiveText").textContent = copy.live;
    }

    // T+ counts up from today's sunrise until sunset, T- counts down to the next sunrise.
    function renderMission(now) {
        var sun = state.data ? state.data.sun : null;
        if (!sun) {
            byId("mcSign").textContent = "T";
            byId("mcMission").textContent = "--:--";
            byId("mcMissionSub").textContent = "";
            return;
        }
        var t = now.getTime();
        var sunrise = Date.parse(sun.sunrise);
        var sunset = Date.parse(sun.sunset);
        var nextSunrise = Date.parse(sun.next_sunrise);
        var sign = "T+";
        var diff = t - sunrise;
        var sub = fill(copy.sinceSunrise, { time: sun.sunrise.slice(11, 16) });
        if (t < sunrise) {
            sign = "T−";
            diff = sunrise - t;
            sub = fill(copy.untilSunrise, { time: sun.sunrise.slice(11, 16) });
        } else if (t >= sunset && t < nextSunrise) {
            sign = "T−";
            diff = nextSunrise - t;
            sub = fill(copy.untilSunrise, { time: sun.next_sunrise.slice(11, 16) });
        } else if (t >= nextSunrise) {
            diff = t - nextSunrise;
            sub = fill(copy.sinceSunrise, { time: sun.next_sunrise.slice(11, 16) });
        }
        var minutes = Math.floor(diff / 60000);
        byId("mcSign").textContent = sign;
        byId("mcMission").textContent = pad(Math.floor(minutes / 60)) + ":" + pad(minutes % 60);
        byId("mcMissionSub").textContent = sub;
    }

    function tickClock() {
        var now = new Date();
        byId("mcClock").textContent = pad(now.getHours()) + ":" + pad(now.getMinutes());
        byId("mcDate").textContent = weekdayFormat.format(now) + " · " + dateFormat.format(now);
        renderMission(now);
    }

    function renderWeatherNow(weather) {
        var host = byId("mcWeather");
        var temperature = weather ? weather.temperature_c : null;
        host.hidden = temperature == null;
        if (temperature == null) return;
        byId("mcTemp").textContent = weather.temperature_source === "sensor"
            ? one.format(temperature)
            : "≈ " + whole.format(temperature);
        var icon = byId("mcWeatherIcon");
        clear(icon);
        var path = weather.sky ? SKY_ICONS[weather.sky] : null;
        icon.style.display = path ? "" : "none";
        if (path) el("path", { d: path }, icon);
        byId("mcSkyText").textContent = (weather.sky && copy.skyNow[weather.sky]) || "";
    }

    function polar(center, radius, degrees) {
        var rad = degrees * Math.PI / 180;
        return [center + radius * Math.cos(rad), center + radius * Math.sin(rad)];
    }

    function arc(center, radius, from, to) {
        var a = polar(center, radius, from);
        var b = polar(center, radius, to);
        var large = to - from > 180 ? 1 : 0;
        return "M" + a[0].toFixed(2) + " " + a[1].toFixed(2) + " A" + radius + " " + radius + " 0 " + large + " 1 " + b[0].toFixed(2) + " " + b[1].toFixed(2);
    }

    // PV dial: a 270 degree scale from bottom left; full scale is the installed kWp.
    function renderDial(data) {
        var svg = byId("mcDial");
        clear(svg);
        var c = 210;
        var start = 135;
        var sweep = 270;
        var defs = el("defs", {}, svg);
        var disc = el("radialGradient", { id: "mcDisc" }, defs);
        el("stop", { offset: 0, "stop-color": "#11161b" }, disc);
        el("stop", { offset: 1, "stop-color": "#07090c" }, disc);
        el("circle", { cx: c, cy: c, r: 204, fill: "none", stroke: "#ffffff14" }, svg);
        el("circle", { cx: c, cy: c, r: 170, fill: "url(#mcDisc)", stroke: "#ffffff12" }, svg);
        for (var i = 0; i <= 54; i += 1) {
            var degrees = start + sweep * i / 54;
            var major = i % 9 === 0;
            var inner = polar(c, major ? 176 : 182, degrees);
            var outer = polar(c, 192, degrees);
            el("line", { x1: inner[0], y1: inner[1], x2: outer[0], y2: outer[1], stroke: major ? "#ffffff55" : "#ffffff1f", "stroke-width": major ? 2 : 1 }, svg);
        }
        el("path", { d: arc(c, 186, start, start + sweep), fill: "none", stroke: "#ffffff10", "stroke-width": 4 }, svg);

        var solar = data.power.solar_w;
        var kwp = data.installed_kwp;
        var share = kwp && solar != null ? Math.max(0, Math.min(1, solar / (kwp * 1000))) : 0;
        var end = start + sweep * share;
        if (share > 0.003) {
            el("path", { d: arc(c, 186, start, end), fill: "none", stroke: AMBER, "stroke-width": 4, "stroke-linecap": "round" }, svg);
        }
        var knob = polar(c, 186, end);
        var needle = polar(c, 150, end);
        el("line", { x1: knob[0], y1: knob[1], x2: needle[0], y2: needle[1], stroke: AMBER, "stroke-width": 3, "stroke-linecap": "round" }, svg);
        el("circle", { cx: knob[0], cy: knob[1], r: 11, fill: "#07090c", stroke: ORANGE, "stroke-width": 2.5 }, svg);
        el("circle", { cx: knob[0], cy: knob[1], r: 4, fill: AMBER }, svg);

        byId("mcSolar").textContent = solar == null ? "–" : one.format(solar / 1000);
        var active = (solar || 0) >= 50;
        var status = byId("mcSolarState");
        status.className = "mc-dial-state" + (active ? " on" : "");
        status.querySelector("span").textContent = active ? copy.producing : copy.idle;
    }

    // Three labelled cells per node; "hot" cells turn amber while energy flows.
    function setCells(id, rows) {
        var host = byId(id);
        clear(host);
        rows.forEach(function (row) {
            var cell = document.createElement("div");
            var label = document.createElement("div");
            label.className = "mc-cell-label";
            label.textContent = copy[row[0]];
            var value = document.createElement("div");
            value.className = "mc-cell-value" + (row[2] && (row[1] || 0) > 0 ? " hot" : "");
            value.appendChild(powerNode(row[1] || 0));
            cell.appendChild(label);
            cell.appendChild(value);
            host.appendChild(cell);
        });
    }

    function renderTree(power) {
        setContent("mcHomeValue", powerNode(power.home_w));
        setCells("mcHomeCells", [
            ["homeSolar", power.solar_to_house_w],
            ["homeBattery", power.battery_to_house_w],
            ["homeGrid", power.grid_to_house_w]
        ]);

        var soc = power.battery_soc_percent;
        var hasBattery = soc != null;
        byId("mcBattery").hidden = !hasBattery;
        if (hasBattery) {
            var charge = (power.solar_to_battery_w || 0) + (power.grid_to_battery_w || 0);
            var discharge = power.battery_to_house_w || 0;
            var level = Math.max(0, Math.min(100, soc));
            setContent("mcBatteryValue", powerNode(Math.max(charge, discharge)));
            byId("mcSoc").textContent = whole.format(soc) + " %";
            byId("mcSocFill").style.width = level + "%";
            byId("mcSocKnob").style.left = "calc(" + level + "% - 1px)";
            setCells("mcBatteryCells", [
                ["batteryDischarge", discharge],
                ["batterySolar", power.solar_to_battery_w, true],
                ["batteryGrid", power.grid_to_battery_w]
            ]);
        }

        setContent("mcGridValue", powerNode(gridWatts(power)));
        setCells("mcGridCells", [
            ["gridImport", power.grid_to_house_w],
            ["gridExport", power.solar_to_grid_w, true],
            ["gridCharge", power.grid_to_battery_w]
        ]);
        drawTree(power);
    }

    // Bracket from the dial to the nodes; a filled dot marks PV flowing into that node.
    function drawTree(power) {
        var tree = byId("mcTree");
        var svg = byId("mcTreeLines");
        clear(svg);
        var width = tree.offsetWidth;
        var height = tree.offsetHeight;
        svg.setAttribute("viewBox", "0 0 " + width + " " + height);
        var box = tree.getBoundingClientRect();
        var ratio = box.height ? height / box.height : 1;
        var trunk = 18;
        var rows = [
            ["mcHome", power.solar_to_house_w],
            ["mcBattery", power.solar_to_battery_w],
            ["mcGrid", power.solar_to_grid_w]
        ].filter(function (row) {
            return !byId(row[0]).hidden;
        });
        var ys = rows.map(function (row) {
            var title = byId(row[0]).querySelector(".mc-node-title").getBoundingClientRect();
            return (title.top + title.height / 2 - box.top) * ratio;
        });
        var middle = height / 2;
        var line = { fill: "none", stroke: AMBER + "99", "stroke-width": 1.5 };
        el("path", Object.assign({ d: "M-36 " + middle + " H" + trunk }, line), svg);
        el("path", Object.assign({ d: "M" + (trunk + 8) + " " + ys[0] + " H" + trunk + " V" + ys[ys.length - 1] + " H" + (trunk + 8) }, line), svg);
        var solarOn = (power.solar_w || 0) >= 50;
        ys.forEach(function (y, index) {
            el("line", { x1: trunk, y1: y, x2: trunk + 12, y2: y, stroke: AMBER + "99", "stroke-width": 1.5 }, svg);
            var active = solarOn && (rows[index][1] || 0) >= 50;
            el("circle", { cx: trunk + 14, cy: y, r: 4.5, fill: active ? AMBER : BG, stroke: active ? AMBER : MUTED, "stroke-width": 1.5 }, svg);
        });
        el("circle", { cx: -36, cy: middle, r: 4, fill: AMBER }, svg);
        el("circle", { cx: trunk, cy: middle, r: 3, fill: AMBER }, svg);
    }

    // Yield ring: the dotted circle is the day forecast, the amber arc the share produced so far.
    function renderYield(today) {
        var svg = byId("mcRing");
        clear(svg);
        var c = 100;
        el("circle", { cx: c, cy: c, r: 94, fill: "none", stroke: STEEL, "stroke-opacity": 0.55, "stroke-width": 2, "stroke-dasharray": "1 5", "stroke-linecap": "round" }, svg);
        el("circle", { cx: c, cy: c, r: 76, fill: "none", stroke: "#ffffff1f" }, svg);
        var share = today.forecast_kwh ? Math.max(0, Math.min(1, (today.yield_kwh || 0) / today.forecast_kwh)) : 0;
        if (share >= 0.999) {
            el("circle", { cx: c, cy: c, r: 94, fill: "none", stroke: AMBER, "stroke-width": 5 }, svg);
        } else if (share > 0.003) {
            el("path", { d: arc(c, 94, -90, -90 + 360 * share), fill: "none", stroke: AMBER, "stroke-width": 5, "stroke-linecap": "round" }, svg);
        }
        svgText(svg, { x: c, y: c + 12, fill: "#ece8e1", "font-size": 46, "font-weight": 300, "text-anchor": "middle" }, kwhText(today.yield_kwh));
        svgText(svg, { x: c, y: c + 40, fill: MUTED, "font-size": 13, "letter-spacing": 2, "text-anchor": "middle" }, "kWh");
        setContent("mcForecast", withUnit(kwhText(today.forecast_kwh), "kWh"));
    }

    function renderPrices(data) {
        byId("mcUsage").hidden = true;
        var priceNow = data.price_now_ct_kwh;
        byId("mcPriceNow").hidden = priceNow == null;
        if (priceNow != null) setContent("mcPriceNowValue", withUnit(one.format(priceNow), "ct/kWh"));
        var cheapest = data.cheapest_hour;
        var hasCheapest = !!(cheapest && cheapest.price_ct_kwh != null);
        byId("mcCheapest").hidden = !hasCheapest;
        if (hasCheapest) {
            byId("mcCheapestLabel").textContent = cheapest.is_tomorrow ? copy.cheapestHourTomorrow : copy.cheapestHour;
            setContent("mcCheapestValue", withUnit(fill(copy.hour, { hour: pad(cheapest.hour) }) + " · " + one.format(cheapest.price_ct_kwh), "ct/kWh"));
        }
        byId("mcPrices").hidden = priceNow == null && !hasCheapest;
    }

    function renderUsage(data) {
        byId("mcPrices").hidden = true;
        var today = data.today;
        var consumption = today.home_consumption_kwh;
        var charged = data.power.battery_soc_percent == null ? null : today.battery_charged_kwh;
        byId("mcConsumption").hidden = consumption == null;
        if (consumption != null) setContent("mcConsumptionValue", withUnit(one.format(consumption), "kWh"));
        byId("mcCharged").hidden = charged == null;
        if (charged != null) setContent("mcChargedValue", withUnit(one.format(charged), "kWh"));
        byId("mcUsage").hidden = consumption == null && charged == null;
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
            var c1x = p1[0] + (p2[0] - p0[0]) / 6;
            var c1y = Math.min(base, p1[1] + (p2[1] - p0[1]) / 6);
            var c2x = p2[0] - (p3[0] - p1[0]) / 6;
            var c2y = Math.min(base, p2[1] - (p3[1] - p1[1]) / 6);
            d += " C" + c1x.toFixed(1) + "," + c1y.toFixed(1) + " " + c2x.toFixed(1) + "," + c2y.toFixed(1) + " " + p2[0].toFixed(1) + "," + p2[1].toFixed(1);
        }
        return d;
    }

    function renderChart(chart) {
        var svg = byId("mcChart");
        clear(svg);
        var width = svg.clientWidth || 940;
        var height = svg.clientHeight || 250;
        svg.setAttribute("viewBox", "0 0 " + width + " " + height);
        if (!chart.forecast.length) {
            svgText(svg, { x: width / 2, y: height / 2, fill: MUTED, "font-size": 20, "letter-spacing": 2, "text-anchor": "middle" }, copy.noForecast);
            return;
        }
        var left = 64;
        var right = width - 8;
        var base = height - 34;
        var topY = 36;
        var startHour = chart.start_hour - 0.5;
        var endHour = chart.end_hour + 0.5;
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

        var defs = el("defs", {}, svg);
        var gradient = el("linearGradient", { id: "mcForecastFill", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
        el("stop", { offset: 0, "stop-color": STEEL, "stop-opacity": 0.14 }, gradient);
        el("stop", { offset: 1, "stop-color": STEEL, "stop-opacity": 0.02 }, gradient);

        [0, top / 2, top].forEach(function (tick) {
            el("line", { x1: left, x2: right, y1: y(tick), y2: y(tick), stroke: tick ? "#ffffff0d" : "#ffffff2a" }, svg);
            svgText(svg, { x: 44, y: y(tick) + 6, fill: MUTED, "font-size": 17, "text-anchor": "end" }, tickFormat.format(tick));
        });
        svgText(svg, { x: 4, y: 14, fill: MUTED, "font-size": 14, "letter-spacing": 2 }, "KWH");
        for (var hour = Math.ceil(startHour / 2) * 2; hour <= endHour; hour += 2) {
            svgText(svg, { x: x(hour), y: base + 30, fill: MUTED, "font-size": 17, "text-anchor": "middle" }, pad(hour));
        }

        var forecast = screen(forecastLine);
        var forecastPath = smoothPath(forecast, base);
        el("path", { d: forecastPath + " L" + forecast[forecast.length - 1][0].toFixed(1) + "," + base + " L" + forecast[0][0].toFixed(1) + "," + base + " Z", fill: "url(#mcForecastFill)" }, svg);
        el("path", { d: forecastPath, fill: "none", stroke: STEEL, "stroke-width": 2, "stroke-dasharray": "6 6", "stroke-opacity": 0.85 }, svg);

        var now = new Date();
        var nowHour = now.getHours() + now.getMinutes() / 60;
        if (nowHour > startHour && nowHour < endHour) {
            var nx = x(nowHour);
            el("line", { x1: nx, x2: nx, y1: 22, y2: base, stroke: ORANGE, "stroke-width": 1.5 }, svg);
            el("path", { d: "M" + (nx - 7) + " 12 H" + (nx + 7) + " L" + nx + " 22 Z", fill: ORANGE }, svg);
            var label = fill(copy.now, { time: pad(now.getHours()) + ":" + pad(now.getMinutes()) });
            var labelRight = nx + 16 + label.length * 11 > right;
            svgText(svg, { x: labelRight ? nx - 16 : nx + 16, y: 22, fill: ORANGE, "font-size": 15, "letter-spacing": 2, "text-anchor": labelRight ? "end" : "start" }, label.toUpperCase());
        }
        if (actualLine.length > 1) {
            var actual = screen(actualLine);
            var end = actual[actual.length - 1];
            el("path", { d: smoothPath(actual, base), fill: "none", stroke: AMBER, "stroke-width": 3.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
            el("circle", { cx: end[0], cy: end[1], r: 6, fill: AMBER, stroke: BG, "stroke-width": 3 }, svg);
        }
    }

    function renderDays(days) {
        var host = byId("mcDays");
        clear(host);
        days.forEach(function (day, index) {
            var date = new Date(day.date + "T12:00:00");
            var cell = document.createElement("div");
            cell.className = "mc-day";
            var name = document.createElement("div");
            name.className = "mc-day-name";
            name.textContent = index === 0 ? copy.tomorrow : copy.dayAfter;
            var sub = document.createElement("div");
            sub.className = "mc-day-date";
            sub.textContent = shortWeekday.format(date) + " · " + shortDate.format(date);
            var sky = document.createElement("div");
            sky.className = "mc-day-sky";
            var icon = el("svg", { viewBox: "0 0 48 48", "aria-hidden": "true" });
            el("path", { d: SKY_ICONS[day.sky] || SKY_ICONS.cloud }, icon);
            sky.appendChild(icon);
            sky.appendChild(document.createTextNode(copy.sky[day.sky] || ""));
            var value = document.createElement("div");
            value.className = "mc-day-value";
            value.appendChild(withUnit(kwhText(day.forecast_kwh), "kWh"));
            cell.appendChild(name);
            cell.appendChild(sub);
            cell.appendChild(sky);
            cell.appendChild(value);
            host.appendChild(cell);
        });
    }

    function renderTelemetry(data) {
        var power = data.power;
        var today = data.today;
        var grid = powerParts(gridWatts(power));
        var items = [
            [copy.telemetryPv, power.solar_w == null ? "–" : one.format(power.solar_w / 1000) + " kW"],
            [copy.telemetryHome, powerParts(power.home_w).join(" ")]
        ];
        if (power.battery_soc_percent != null) items.push([copy.telemetryBattery, whole.format(power.battery_soc_percent) + " %"]);
        items.push([copy.telemetryGrid, grid.join(" ")]);
        items.push([copy.telemetryYield, kwhText(today.yield_kwh) + " / " + kwhText(today.forecast_kwh) + " kWh"]);
        var host = byId("mcTelemetry");
        clear(host);
        items.forEach(function (item) {
            var span = document.createElement("span");
            span.appendChild(document.createTextNode(item[0] + " "));
            var value = document.createElement("b");
            value.textContent = item[1];
            span.appendChild(value);
            host.appendChild(span);
        });
    }

    function renderStatus(data, offline) {
        var stale = offline || !data || data.stale;
        byId("mcLive").className = "mc-live" + (stale ? " stale" : "");
        byId("mcLiveText").textContent = offline ? copy.offline : (stale ? copy.stale : copy.live);
    }

    function render(data) {
        state.data = data;
        data.power = data.power || {};
        renderMission(new Date());
        renderWeatherNow(data.weather_now);
        renderDial(data);
        renderTree(data.power);
        renderYield(data.today);
        if (mode === "consumption") {
            renderUsage(data);
        } else {
            renderPrices(data);
        }
        renderChart(data.chart);
        renderDays(data.days);
        renderTelemetry(data);
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
    drawSky();
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
