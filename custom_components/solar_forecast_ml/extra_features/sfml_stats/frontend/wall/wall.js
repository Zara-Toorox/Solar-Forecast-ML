(function () {
    "use strict";

    var DATA_URL = "/api/sfml_stats/wall/data";
    var POLL_MS = 10000;
    var NS = "http://www.w3.org/2000/svg";
    var BOARD_W = 1600;
    var BOARD_H = 1000;

    var TEXT = {
        de: {
            solarTag: "PV JETZT",
            home: "Haus",
            battery: "Batterie",
            grid: "Netz",
            homeSolar: "PV:",
            homeBattery: "Akku:",
            homeGrid: "Netz:",
            batteryDischarge: "Entlädt:",
            batterySolar: "Lädt PV:",
            batteryGrid: "Lädt Netz:",
            gridImport: "Bezug:",
            gridExport: "Export:",
            gridCharge: "Netzladen:",
            yieldLabel: "Ertrag heute",
            forecastToday: "Prognose: <strong>{kwh} kWh</strong>",
            priceNow: "Aktueller Preis",
            cheapestHour: "Günstigste Stunde",
            cheapestHourTomorrow: "Günstigste Stunde morgen",
            cheapestValue: "{hour} Uhr · {price} <small>ct/kWh</small>",
            chartTitle: "Dein Energietag",
            legendActual: "Ertrag",
            legendForecast: "Prognose",
            forecastSoFar: "{kwh} kWh bis jetzt",
            noForecast: "Keine Prognosewerte für heute",
            daysTitle: "Die nächsten Tage",
            tomorrow: "Morgen",
            dayAfter: "Übermorgen",
            sky: { sun: "Sonnig", partly: "Wolkig", cloud: "Bedeckt", rain: "Regen" },
            live: "Live",
            stale: "Daten veraltet",
            offline: "Keine Verbindung",
            fsTap: "Zum Vollbild tippen",
            fsInstall: "Für Vollbild: Zum Startbildschirm hinzufügen"
        },
        en: {
            solarTag: "PV NOW",
            home: "Home",
            battery: "Battery",
            grid: "Grid",
            homeSolar: "PV:",
            homeBattery: "Battery:",
            homeGrid: "Grid:",
            batteryDischarge: "Discharging:",
            batterySolar: "Charging PV:",
            batteryGrid: "Charging grid:",
            gridImport: "Import:",
            gridExport: "Export:",
            gridCharge: "Grid charging:",
            yieldLabel: "Yield today",
            forecastToday: "Forecast: <strong>{kwh} kWh</strong>",
            priceNow: "Current price",
            cheapestHour: "Cheapest hour",
            cheapestHourTomorrow: "Cheapest hour tomorrow",
            cheapestValue: "{hour}:00 · {price} <small>ct/kWh</small>",
            chartTitle: "Your energy day",
            legendActual: "Yield",
            legendForecast: "Forecast",
            forecastSoFar: "{kwh} kWh so far",
            noForecast: "No forecast values for today",
            daysTitle: "The next days",
            tomorrow: "Tomorrow",
            dayAfter: "Day after",
            sky: { sun: "Sunny", partly: "Cloudy", cloud: "Overcast", rain: "Rain" },
            live: "Live",
            stale: "Data outdated",
            offline: "No connection",
            fsTap: "Tap for full screen",
            fsInstall: "For full screen: add to home screen"
        },
        pl: {
            solarTag: "PV TERAZ",
            home: "Dom",
            battery: "Bateria",
            grid: "Sieć",
            homeSolar: "PV:",
            homeBattery: "Akumulator:",
            homeGrid: "Sieć:",
            batteryDischarge: "Rozładowanie:",
            batterySolar: "Ładowanie PV:",
            batteryGrid: "Ładowanie z sieci:",
            gridImport: "Pobór:",
            gridExport: "Oddawanie:",
            gridCharge: "Ładowanie z sieci:",
            yieldLabel: "Uzysk dzisiaj",
            forecastToday: "Prognoza: <strong>{kwh} kWh</strong>",
            priceNow: "Aktualna cena",
            cheapestHour: "Najtańsza godzina",
            cheapestHourTomorrow: "Najtańsza godzina jutro",
            cheapestValue: "{hour}:00 · {price} <small>ct/kWh</small>",
            chartTitle: "Twój dzień energii",
            legendActual: "Uzysk",
            legendForecast: "Prognoza",
            forecastSoFar: "{kwh} kWh do teraz",
            noForecast: "Brak wartości prognozy na dziś",
            daysTitle: "Najbliższe dni",
            tomorrow: "Jutro",
            dayAfter: "Pojutrze",
            sky: { sun: "Słonecznie", partly: "Pochmurno", cloud: "Zachmurzenie", rain: "Deszcz" },
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

    var locale = pickLocale();
    var copy = TEXT[locale];
    var state = { data: null, failures: 0 };
    var timeFormat = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false });
    var weekdayFormat = new Intl.DateTimeFormat(locale, { weekday: "long" });
    var dateFormat = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" });
    var shortWeekday = new Intl.DateTimeFormat(locale, { weekday: "short" });
    var shortDate = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
    var one = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    var whole = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    var tickFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

    function pickLocale() {
        var wanted = null;
        try {
            wanted = new URLSearchParams(window.location.search).get("lang");
        } catch (e) {
            wanted = null;
        }
        var candidates = [wanted, navigator.language];
        for (var i = 0; i < candidates.length; i += 1) {
            var code = candidates[i] ? String(candidates[i]).toLowerCase().slice(0, 2) : "";
            if (TEXT[code]) return code;
        }
        return "de";
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function fill(template, params) {
        return String(template).replace(/\{(\w+)\}/g, function (_, name) {
            return Object.prototype.hasOwnProperty.call(params || {}, name) ? params[name] : "{" + name + "}";
        });
    }

    function kw(watts) {
        return one.format((watts || 0) / 1000);
    }

    function powerText(watts) {
        return Math.abs(watts) > 1000 ? one.format(watts / 1000) + " kW" : whole.format(watts) + " W";
    }

    function setPower(name, watts) {
        var value = byId(name + "Value");
        var unit = byId(name + "Unit");
        if (watts == null) {
            value.textContent = "–";
            unit.textContent = "W";
            return;
        }
        var abs = Math.abs(watts);
        value.textContent = abs > 1000 ? one.format(watts / 1000) : whole.format(watts);
        unit.textContent = abs > 1000 ? "kW" : "W";
    }

    function el(tag, attrs, parent) {
        var node = document.createElementNS(NS, tag);
        Object.keys(attrs || {}).forEach(function (key) {
            node.setAttribute(key, attrs[key]);
        });
        if (parent) parent.appendChild(node);
        return node;
    }

    function fitBoard() {
        var scale = Math.min(window.innerWidth / BOARD_W, window.innerHeight / BOARD_H);
        document.documentElement.style.setProperty("--scale", String(scale));
    }

    function tickClock() {
        var now = new Date();
        byId("clock").textContent = timeFormat.format(now);
        byId("weekday").textContent = weekdayFormat.format(now);
        byId("datelong").textContent = dateFormat.format(now);
    }

    function staticText() {
        document.documentElement.setAttribute("lang", locale);
        byId("solarTag").textContent = copy.solarTag;
        byId("homeTitle").textContent = copy.home;
        byId("batteryTitle").textContent = copy.battery;
        byId("gridTitle").textContent = copy.grid;
        byId("yieldLabel").textContent = copy.yieldLabel;
        byId("priceNowLabel").textContent = copy.priceNow;
        byId("chartTitle").textContent = copy.chartTitle;
        byId("legendActual").textContent = copy.legendActual;
        byId("legendForecast").textContent = copy.legendForecast;
        byId("daysTitle").textContent = copy.daysTitle;
    }

    function renderSolar(power) {
        var solar = power.solar_w;
        byId("solarValue").textContent = solar == null ? "–" : kw(solar);
    }

    // Fills a fixed breakdown table; every row stays visible, idle rows read 0 W.
    function setBreakdown(id, rows) {
        var host = byId(id);
        while (host.firstChild) host.removeChild(host.firstChild);
        rows.forEach(function (row) {
            var label = document.createElement("dt");
            label.textContent = copy[row[0]];
            var value = document.createElement("dd");
            value.textContent = powerText(row[1] || 0);
            host.appendChild(label);
            host.appendChild(value);
        });
    }

    function renderFlow(power) {
        setPower("home", power.home_w);
        setBreakdown("homeRows", [
            ["homeSolar", power.solar_to_house_w],
            ["homeBattery", power.battery_to_house_w],
            ["homeGrid", power.grid_to_house_w]
        ]);

        var soc = power.battery_soc_percent;
        var hasBattery = soc != null;
        byId("rowBattery").hidden = !hasBattery;
        if (hasBattery) {
            var charge = (power.solar_to_battery_w || 0) + (power.grid_to_battery_w || 0);
            var discharge = power.battery_to_house_w || 0;
            setPower("battery", Math.max(charge, discharge));
            byId("batterySoc").textContent = "(" + whole.format(soc) + " %)";
            setBreakdown("batteryRows", [
                ["batteryDischarge", discharge],
                ["batterySolar", power.solar_to_battery_w],
                ["batteryGrid", power.grid_to_battery_w]
            ]);
        }

        var exportW = power.solar_to_grid_w || 0;
        var importW = (power.grid_to_house_w || 0) + (power.grid_to_battery_w || 0);
        setPower("grid", exportW >= 50 ? exportW : importW);
        setBreakdown("gridRows", [
            ["gridImport", power.grid_to_house_w],
            ["gridExport", exportW],
            ["gridCharge", power.grid_to_battery_w]
        ]);
        drawWires(power);
    }

    function drawWires(power) {
        var flow = byId("flow");
        var svg = byId("flowLines");
        var width = flow.offsetWidth;
        var height = flow.offsetHeight;
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        svg.setAttribute("viewBox", "0 0 " + width + " " + height);

        var flowBox = svg.getBoundingClientRect();
        var ratio = flowBox.height ? height / flowBox.height : 1;
        var originY = height / 2;
        var junction = 6;
        var iconX = 34;
        var rows = [
            { id: "rowHome", active: (power.solar_to_house_w || 0) >= 50, cool: false },
            { id: "rowBattery", active: (power.solar_to_battery_w || 0) >= 50, cool: false },
            { id: "rowGrid", active: (power.solar_to_grid_w || 0) >= 50, cool: true }
        ];
        var visible = rows.filter(function (row) {
            return !byId(row.id).hidden;
        });
        var solarOn = (power.solar_w || 0) >= 50;
        var wire = "M-80 " + originY + " H" + junction;
        var branches = visible.map(function (row) {
            var node = byId(row.id);
            // SVG icons have no offsetTop; measure on screen and undo the board scale.
            var box = node.querySelector(".icon").getBoundingClientRect();
            var y = (box.top + box.height / 2 - flowBox.top) * ratio;
            row.path = "M-80 " + originY + " H" + junction + " V" + y + " H" + iconX;
            wire += " M" + junction + " " + originY + " V" + y + " H" + iconX;
            return row;
        });
        el("path", { "class": "wire", d: wire }, svg);
        var delay = 0;
        branches.forEach(function (row) {
            if (!solarOn || !row.active) return;
            var path = el("path", { "class": "current" + (row.cool ? " cool" : ""), d: row.path }, svg);
            path.style.animationDelay = "-" + delay + "s";
            delay += 4;
        });
        el("circle", { cx: junction, cy: originY, r: 5, fill: "#ffca7a" }, svg);
    }

    function renderDay(today) {
        var yieldKwh = today.yield_kwh;
        var forecast = today.forecast_kwh;
        byId("yieldValue").textContent = yieldKwh == null ? "–" : one.format(yieldKwh);
        byId("yieldForecast").innerHTML = forecast == null ? "" : fill(copy.forecastToday, { kwh: one.format(forecast) });

        var priceNow = state.data.price_now_ct_kwh;
        byId("priceNowRow").hidden = priceNow == null;
        if (priceNow != null) byId("priceNowValue").textContent = one.format(priceNow);

        var cheapest = state.data.cheapest_hour;
        var hasCheapest = !!(cheapest && cheapest.price_ct_kwh != null);
        byId("cheapestBlock").hidden = !hasCheapest;
        if (hasCheapest) {
            byId("cheapestLabel").textContent = cheapest.is_tomorrow ? copy.cheapestHourTomorrow : copy.cheapestHour;
            byId("cheapestValue").innerHTML = fill(copy.cheapestValue, {
                hour: (cheapest.hour < 10 ? "0" : "") + cheapest.hour,
                price: one.format(cheapest.price_ct_kwh)
            });
        }
        byId("prices").hidden = priceNow == null && !hasCheapest;
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

    function renderChart(chart) {
        var svg = byId("chart");
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        if (!chart.forecast.length) {
            var empty = el("text", { x: 485, y: 130, fill: "#b5c4ce", "font-size": 28, "text-anchor": "middle" }, svg);
            empty.textContent = copy.noForecast;
            return;
        }
        var left = 64;
        var right = 924;
        // Axis spans the forecast window plus 30 minutes on each side.
        var startHour = chart.start_hour - 0.5;
        var endHour = chart.end_hour + 0.5;
        var span = Math.max(endHour - startHour, 1);
        // Hourly curves start and end at zero at the edges of the forecast window.
        var forecastLine = [[chart.start_hour, 0]].concat(hourlyPoints(chart.forecast), [[chart.end_hour, 0]]);
        var actualLine = chart.actual.length > 1 ? [[chart.start_hour, 0]].concat(hourlyPoints(chart.actual)) : [];
        var peak = 0.1;
        forecastLine.concat(actualLine).forEach(function (point) {
            peak = Math.max(peak, point[1]);
        });
        var top = niceMax(peak);
        var x = function (hour) { return left + (hour - startHour) / span * (right - left); };
        var y = function (kwh) { return 200 - kwh / top * 158; };
        var path = function (points) {
            return points.map(function (point, index) {
                return (index ? "L" : "M") + x(point[0]).toFixed(2) + "," + y(point[1]).toFixed(2);
            }).join(" ");
        };

        var defs = el("defs", {}, svg);
        var gradient = el("linearGradient", { id: "yieldFill", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
        el("stop", { offset: 0, "stop-color": "#ffca7a", "stop-opacity": 0.21 }, gradient);
        el("stop", { offset: 1, "stop-color": "#ffca7a", "stop-opacity": 0 }, gradient);

        [0, top / 2, top].forEach(function (tick) {
            el("line", { x1: left, x2: right, y1: y(tick), y2: y(tick), stroke: "#8ba2b225" }, svg);
            var label = el("text", { x: 48, y: y(tick) + 9, fill: "#b5c4ce", "font-size": 26, "text-anchor": "end" }, svg);
            label.textContent = tickFormat.format(tick);
        });
        var unit = el("text", { x: 8, y: 26, fill: "#b5c4ce", "font-size": 26 }, svg);
        unit.textContent = "kWh";

        var nowHour = null;
        if (chart.actual.length) nowHour = chart.actual[chart.actual.length - 1][0];
        var first = Math.ceil(startHour / 2) * 2;
        for (var hour = first; hour <= endHour; hour += 2) {
            var tickLabel = el("text", { x: x(hour), y: 238, fill: "#b5c4ce", "font-size": 26, "text-anchor": "middle" }, svg);
            tickLabel.textContent = (hour < 10 ? "0" : "") + hour;
        }

        if (actualLine.length > 1) {
            var last = actualLine[actualLine.length - 1];
            el("path", { d: path(actualLine) + " L" + x(last[0]) + ",200 L" + x(actualLine[0][0]) + ",200 Z", fill: "url(#yieldFill)" }, svg);
        }
        el("path", { d: path(forecastLine), fill: "none", stroke: "#8cb9dc", "stroke-width": 3, "stroke-dasharray": "8 8", "stroke-linecap": "round" }, svg);
        if (actualLine.length > 1) {
            var end = actualLine[actualLine.length - 1];
            el("line", { x1: x(nowHour), x2: x(nowHour), y1: 35, y2: 200, stroke: "#ffca7a50", "stroke-width": 1 }, svg);
            el("path", { d: path(actualLine), fill: "none", stroke: "#ffca7a", "stroke-width": 4, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
            el("circle", { cx: x(end[0]), cy: y(end[1]), r: 6, fill: "#ffca7a", stroke: "#0b1722", "stroke-width": 3 }, svg);
        }
        if (chart.forecast_to_now_kwh != null) {
            var soFar = el("text", { x: right, y: 26, fill: "#8cb9dc", "font-size": 26, "text-anchor": "end" }, svg);
            soFar.textContent = fill(copy.forecastSoFar, { kwh: one.format(chart.forecast_to_now_kwh) });
        }
    }

    function renderDays(days) {
        var host = byId("future");
        host.textContent = "";
        days.forEach(function (day, index) {
            var cell = document.createElement("div");
            var date = new Date(day.date + "T12:00:00");
            var title = document.createElement("div");
            title.className = "future-day";
            title.textContent = index === 0 ? copy.tomorrow : copy.dayAfter;
            var sub = document.createElement("div");
            sub.className = "future-date";
            sub.textContent = shortWeekday.format(date) + " · " + shortDate.format(date);
            cell.appendChild(title);
            cell.appendChild(sub);
            var sky = document.createElement("div");
            sky.className = "future-sky";
            var icon = el("svg", { "class": "future-icon", viewBox: "0 0 48 48", "aria-hidden": "true" });
            el("path", { d: SKY_ICONS[day.sky] || SKY_ICONS.cloud }, icon);
            sky.appendChild(icon);
            var skyText = document.createElement("span");
            skyText.textContent = copy.sky[day.sky] || "";
            sky.appendChild(skyText);
            cell.appendChild(sky);
            var value = document.createElement("div");
            value.className = "future-value";
            value.innerHTML = (day.forecast_kwh == null ? "–" : one.format(day.forecast_kwh)) + " <small>kWh</small>";
            cell.appendChild(value);
            host.appendChild(cell);
        });
    }

    function renderWeatherNow(weather) {
        var host = byId("weatherNow");
        var temperature = weather ? weather.temperature_c : null;
        if (temperature == null) {
            host.hidden = true;
            return;
        }
        host.hidden = false;
        // Measured values show one decimal; forecast values are marked as approximate.
        byId("weatherTemp").textContent = weather.temperature_source === "sensor"
            ? one.format(temperature) + " °C"
            : "≈ " + whole.format(temperature) + " °C";
        var icon = byId("weatherIcon");
        while (icon.firstChild) icon.removeChild(icon.firstChild);
        icon.style.display = weather.sky && SKY_ICONS[weather.sky] ? "" : "none";
        if (weather.sky && SKY_ICONS[weather.sky]) el("path", { d: SKY_ICONS[weather.sky] }, icon);
    }

    function renderFooter(data, offline) {
        var dot = byId("statusDot");
        var text = byId("statusText");
        var stale = offline || !data || data.stale;
        dot.className = stale ? "dot stale" : "dot";
        text.textContent = offline ? copy.offline : (stale ? copy.stale : copy.live);
    }

    function render(data) {
        state.data = data;
        renderSolar(data.power);
        renderFlow(data.power);
        renderDay(data.today);
        renderChart(data.chart);
        renderDays(data.days);
        renderWeatherNow(data.weather_now);
        renderFooter(data, false);
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
                if (state.failures >= 2) renderFooter(state.data, true);
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
        var supported = fullscreenSupported();
        hint.hidden = isStandalone() || fullscreenActive();
        hint.textContent = supported ? copy.fsTap : copy.fsInstall;
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
