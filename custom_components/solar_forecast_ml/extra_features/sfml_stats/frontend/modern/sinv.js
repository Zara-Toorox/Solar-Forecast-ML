(() => {
    const TEXT = {
        de: {
            loading: "Laden",
            error: "Werte konnten nicht geladen werden.",
            retry: "Erneut laden",
            disabledTitle: "S-INV ist nicht eingerichtet",
            disabledText: "Die Seite erscheint, sobald die Integration solar_forecast_sinv aktiv ist.",
            emptyTitle: "Kein Wechselrichter sichtbar",
            emptyText: "S-INV ist eingerichtet, liefert aber noch keine Werte.",
            curtailed: "Abregelung aktiv",
            pvTotal: "PV gesamt",
            anker: "Anker",
            mppt: "MPPT",
            voltage: "Spannung",
            current: "Strom",
            power: "Leistung",
            spark: "Verlauf, 24 Stunden",
            yield: "Tagesertrag",
            today: "Heute",
            calibrated: "Am Fühler kalibriert, Faktor {k}",
            shareToday: "Anteil am Ertrag",
            maxCurrent: "Max. Strom",
            maxVoltage: "Max. Spannung",
            maxModule: "Modul max.",
            peak: "Spitze",
            peakAt: "um",
            grid: "Netz",
            frequency: "Frequenz",
            dayRange: "Tages-Min/Max",
            battery: "Akku",
            soc: "Ladestand",
            temperature: "Temperatur",
            expansion: "Erweiterung",
            measure: "Messung",
            cloud: "Cloud",
            justNow: "gerade eben",
            minutesAgo: "vor {n} min",
            hoursAgo: "vor {n} h",
            dayChart: "Tagesverlauf",
            sinceMidnight: "seit Mitternacht",
            charge: "Laden",
            discharge: "Entladen",
            mainBattery: "Hauptakku",
            soh: "SOH",
            cells: "Zellen",
            meterImport: "Netzbezug",
            meterExport: "Einspeisung",
            module: "Modul",
            moduleDerived: "Modul (abgeleitet)",
            outdoor: "Außen",
            delta: "ΔT",
            moduleEstimated: "Modul (geschätzt)",
            learning: "Schätzung lernt noch",
            curtailedReason: "Während der Abregelung keine Schätzung",
            noAmbient: "Keine Außentemperatur",
            noCurrent: "Kein Strommesswert",
            thermal: "Modul und Außen, 24 Stunden",
            compare: "Temperaturvergleich",
            measured: "Gemessen",
            faiman: "Schätzung",
            premiumTitle: "Premium-Funktion nicht freigeschaltet",
            premiumText: "Das Vergleichsdiagramm braucht eine aktive Premium-Lizenz.",
            unitNotice: "{id} ({unit}) wird ignoriert, die Einheit passt nicht.",
        },
        en: {
            loading: "Loading",
            error: "Values could not be loaded.",
            retry: "Retry",
            disabledTitle: "S-INV is not set up",
            disabledText: "The page appears once the solar_forecast_sinv integration is active.",
            emptyTitle: "No inverter visible",
            emptyText: "S-INV is set up, but it is not reporting values yet.",
            curtailed: "Curtailment active",
            pvTotal: "PV total",
            anker: "Anker",
            mppt: "MPPT",
            voltage: "Voltage",
            current: "Current",
            power: "Power",
            spark: "Trace, 24 hours",
            yield: "Today",
            today: "Today",
            calibrated: "Calibrated against the sensor, factor {k}",
            shareToday: "Share of yield",
            maxCurrent: "Max. current",
            maxVoltage: "Max. voltage",
            maxModule: "Module max.",
            peak: "Peak",
            peakAt: "at",
            grid: "Grid",
            frequency: "Frequency",
            dayRange: "Day min/max",
            battery: "Battery",
            soc: "State of charge",
            temperature: "Temperature",
            expansion: "Expansion",
            measure: "Reading",
            cloud: "Cloud",
            justNow: "just now",
            minutesAgo: "{n} min ago",
            hoursAgo: "{n} h ago",
            dayChart: "Today",
            sinceMidnight: "since midnight",
            charge: "Charge",
            discharge: "Discharge",
            mainBattery: "Main battery",
            soh: "SOH",
            cells: "Cells",
            meterImport: "Grid import",
            meterExport: "Grid export",
            module: "Module",
            moduleDerived: "Module (derived)",
            outdoor: "Outdoor",
            delta: "ΔT",
            moduleEstimated: "Module (estimated)",
            learning: "Estimate is still learning",
            curtailedReason: "No estimate while curtailed",
            noAmbient: "No outdoor temperature",
            noCurrent: "No current reading",
            thermal: "Module and outdoor, 24 hours",
            compare: "Temperature comparison",
            measured: "Measured",
            faiman: "Estimate",
            premiumTitle: "Premium feature is locked",
            premiumText: "The comparison chart needs an active premium licence.",
            unitNotice: "{id} ({unit}) is ignored because the unit does not match.",
        },
        pl: {
            loading: "Ładowanie",
            error: "Nie udało się wczytać wartości.",
            retry: "Wczytaj ponownie",
            disabledTitle: "S-INV nie jest skonfigurowane",
            disabledText: "Strona pojawi się, gdy integracja solar_forecast_sinv będzie aktywna.",
            emptyTitle: "Brak widocznego falownika",
            emptyText: "S-INV jest skonfigurowane, ale nie podaje jeszcze wartości.",
            curtailed: "Ograniczenie aktywne",
            pvTotal: "PV łącznie",
            anker: "Anker",
            mppt: "MPPT",
            voltage: "Napięcie",
            current: "Prąd",
            power: "Moc",
            spark: "Przebieg, 24 godziny",
            yield: "Uzysk dnia",
            today: "Dzisiaj",
            calibrated: "Skalibrowano czujnikiem, współczynnik {k}",
            shareToday: "Udział w uzysku",
            maxCurrent: "Maks. prąd",
            maxVoltage: "Maks. napięcie",
            maxModule: "Moduł maks.",
            peak: "Szczyt",
            peakAt: "o",
            grid: "Sieć",
            frequency: "Częstotliwość",
            dayRange: "Min/maks doby",
            battery: "Akumulator",
            soc: "Stan naładowania",
            temperature: "Temperatura",
            expansion: "Rozszerzenie",
            measure: "Odczyt",
            cloud: "Chmura",
            justNow: "przed chwilą",
            minutesAgo: "{n} min temu",
            hoursAgo: "{n} godz. temu",
            dayChart: "Przebieg dnia",
            sinceMidnight: "od północy",
            charge: "Ładowanie",
            discharge: "Rozładowanie",
            mainBattery: "Akumulator główny",
            soh: "SOH",
            cells: "Ogniwa",
            meterImport: "Pobór z sieci",
            meterExport: "Oddawanie do sieci",
            module: "Moduł",
            moduleDerived: "Moduł (wyliczony)",
            outdoor: "Na zewnątrz",
            delta: "ΔT",
            moduleEstimated: "Moduł (szacowany)",
            learning: "Szacunek jeszcze się uczy",
            curtailedReason: "Brak szacunku przy ograniczeniu",
            noAmbient: "Brak temperatury zewnętrznej",
            noCurrent: "Brak pomiaru prądu",
            thermal: "Moduł i zewnątrz, 24 godziny",
            compare: "Porównanie temperatur",
            measured: "Pomiar",
            faiman: "Szacunek",
            premiumTitle: "Funkcja Premium jest zablokowana",
            premiumText: "Wykres porównawczy wymaga aktywnej licencji Premium.",
            unitNotice: "{id} ({unit}) jest ignorowane, jednostka nie pasuje.",
        },
    };

    const LIVE_MS = 15000;
    const HISTORY_MS = 60000;
    const MPPT_KEYS = ["p1", "p2", "p3", "p4"];

    function text(key) {
        const lang = window.SFMLI18n?.current;
        const pack = TEXT[lang] || TEXT.en;
        return pack[key] || TEXT.en[key] || key;
    }

    function locale() {
        return window.SFMLI18n?.current || "de";
    }

    function formatNumber(value, digits) {
        const number = Number(value);
        if (!Number.isFinite(number)) return "";
        return new Intl.NumberFormat(locale(), {
            maximumFractionDigits: digits,
            minimumFractionDigits: digits,
        }).format(number);
    }

    function formatMeasure(value, digits, unit) {
        const formatted = formatNumber(value, digits);
        if (!formatted) return "";
        return unit ? `${formatted} ${unit}` : formatted;
    }

    function formatSigned(value, unit) {
        const number = Number(value);
        if (!Number.isFinite(number)) return "";
        const formatted = new Intl.NumberFormat(locale(), {
            maximumFractionDigits: 0,
            minimumFractionDigits: 0,
            signDisplay: "exceptZero",
        }).format(number);
        return unit ? `${formatted} ${unit}` : formatted;
    }

    function formatShare(value) {
        const number = Number(value);
        if (!Number.isFinite(number)) return "";
        return new Intl.NumberFormat(locale(), {
            style: "percent",
            maximumFractionDigits: 0,
        }).format(number);
    }

    function formatClock(iso) {
        const when = new Date(iso);
        if (Number.isNaN(when.getTime())) return "";
        return new Intl.DateTimeFormat(locale(), { hour: "2-digit", minute: "2-digit" }).format(when);
    }

    function ago(iso) {
        const then = Date.parse(iso);
        if (!Number.isFinite(then)) return "";
        const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
        if (minutes < 1) return text("justNow");
        if (minutes < 60) return text("minutesAgo").replace("{n}", String(minutes));
        return text("hoursAgo").replace("{n}", String(Math.round(minutes / 60)));
    }

    function reading(device, role) {
        const item = device && device.states ? device.states[role] : null;
        if (!item || item.value == null || item.value === "") return null;
        return item;
    }

    function finitePoints(points) {
        if (!Array.isArray(points)) return [];
        return points.filter((point) => Number.isFinite(Number(point && point.v)) && point.t);
    }

    function pathFrom(points) {
        const rows = finitePoints(points);
        if (rows.length < 2) return "";
        const times = rows.map((point) => Date.parse(point.t));
        const values = rows.map((point) => Number(point.v));
        let min = Math.min(...values);
        let max = Math.max(...values);
        if (max - min < 1) {
            min -= 1;
            max += 1;
        }
        const start = Math.min(...times);
        const span = Math.max(1, Math.max(...times) - start);
        const width = 240;
        const height = 48;
        return rows.map((point, indexPoint) => {
            const time = times[indexPoint];
            const x = Number.isNaN(time) ? (indexPoint / (rows.length - 1)) * width : ((time - start) / span) * width;
            const y = 4 + (1 - (Number(point.v) - min) / (max - min)) * (height - 8);
            return `${indexPoint === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
        }).join(" ");
    }

    function hasThermal(device) {
        const thermal = device.thermal;
        return Boolean(thermal) && (thermal.ambient_c != null || (Array.isArray(thermal.mppt) && thermal.mppt.length > 0));
    }

    function thermalSource(device, index) {
        const row = thermalRow(device, index);
        return row && (row.source === "derived" || row.source === "estimated") ? row.source : "measured";
    }

    function moduleLabel(source) {
        if (source === "derived") return text("moduleDerived");
        if (source === "estimated") return text("moduleEstimated");
        return text("module");
    }

    function thermalValue(device, index, key, unit) {
        const row = thermalRow(device, index);
        return row && row[key] != null ? formatMeasure(row[key], 1, unit) : "–";
    }

    function thermalRow(device, index) {
        const rows = device.thermal && device.thermal.mppt;
        if (!Array.isArray(rows)) return null;
        return rows.find((row) => row.index === index) || null;
    }



    function niceRange(values, zero) {
        let min = Math.min(...values);
        let max = Math.max(...values);
        if (zero) min = Math.min(0, min);
        if (max - min < 1e-9) {
            max += 1;
            if (!zero) min -= 1;
        }
        const raw = (max - min) / 4;
        const base = 10 ** Math.floor(Math.log10(raw));
        const fraction = raw / base;
        const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10) * base;
        const low = Math.floor(min / step + 1e-9) * step;
        const high = Math.ceil(max / step - 1e-9) * step;
        const ticks = [];
        for (let value = high; value >= low - step / 2; value -= step) ticks.push(value);
        return { min: low, max: high > low ? high : low + step, step, ticks };
    }

    const CROP_PAD = 20 * 60 * 1000;

    // Keeps the span where a series carries values (above 2 % of its peak), plus padding.
    function activeWindow(rows) {
        const values = rows.filter((point) => Number.isFinite(point.v));
        if (!values.length) return null;
        const peak = Math.max(...values.map((point) => Math.abs(point.v)));
        const active = values.filter((point) => Math.abs(point.v) > peak * 0.02);
        if (!active.length) return null;
        return { start: active[0].t - CROP_PAD, end: active[active.length - 1].t + CROP_PAD };
    }

    // Line chart with a value scale fitted to the data and hour ticks. Points are joined
    // across recorder gaps; with crop the time axis covers only the span with values.
    function lineChart(seriesList, unit, zero, crop = false) {
        const width = 640;
        const height = 200;
        let prepared = seriesList.map((series) => ({
            key: series.key,
            rows: (series.points || [])
                .map((point) => ({ t: Date.parse(point.t), v: point.v == null ? null : Number(point.v) }))
                .filter((point) => Number.isFinite(point.t) && Number.isFinite(point.v))
                .sort((a, b) => a.t - b.t),
        }));
        if (crop) {
            const windows = prepared.map((series) => activeWindow(series.rows)).filter(Boolean);
            if (windows.length) {
                const from = Math.min(...windows.map((item) => item.start));
                const to = Math.max(...windows.map((item) => item.end));
                prepared = prepared.map((series) => ({
                    key: series.key,
                    rows: series.rows.filter((point) => point.t >= from && point.t <= to),
                }));
            }
        }
        const finite = prepared.flatMap((series) => series.rows);
        if (finite.length < 2) return null;
        const times = finite.map((point) => point.t);
        const start = Math.min(...times);
        const end = Math.max(...times);
        const span = Math.max(1, end - start);
        const range = niceRange(finite.map((point) => point.v), zero);
        const xOf = (time) => ((time - start) / span) * width;
        const yOf = (value) => (1 - (value - range.min) / (range.max - range.min)) * height;
        const paths = {};
        prepared.forEach((series) => {
            paths[series.key] = series.rows
                .map((point, index) => `${index === 0 ? "M" : "L"}${xOf(point.t).toFixed(1)} ${yOf(point.v).toFixed(1)}`)
                .join(" ");
        });
        const digits = range.step >= 1 ? 0 : range.step >= 0.1 ? 1 : 2;
        const yTicks = range.ticks.map((value, index) => ({
            top: `${((range.max - value) / (range.max - range.min)) * 100}%`,
            y: yOf(value),
            label: index === 0 ? `${formatNumber(value, digits)} ${unit}` : formatNumber(value, digits),
        }));
        return { paths, yTicks, xTicks: hourTicks(start, end), width, height };
    }

    function thermalChart(device, index) {
        const thermal = device.history && device.history.thermal;
        if (!thermal) return null;
        const row = Array.isArray(thermal.mppt) ? thermal.mppt.find((item) => item.index === index) : null;
        if (finitePoints(row && row.module).length < 2) return null;
        const chart = lineChart([
            { key: "module", points: row.module },
            { key: "ambient", points: thermal.ambient },
        ], "°C", false);
        if (!chart) return null;
        chart.source = row.source === "derived" || row.source === "estimated" ? row.source : "measured";
        return chart;
    }

    function reasonText(code) {
        if (code === "learning") return text("learning");
        if (code === "curtailed") return text("curtailedReason");
        if (code === "no_ambient") return text("noAmbient");
        if (code === "no_current") return text("noCurrent");
        return "";
    }

    function compareRows(device) {
        const thermal = device.history && device.history.thermal;
        const rows = thermal && thermal.compare;
        return Array.isArray(rows) ? rows : [];
    }

    function compareGeometry(device) {
        const rows = compareRows(device);
        if (rows.length < 2) return null;
        const pick = (key) => rows.map((row) => ({ t: row.t, v: row[key] }));
        return lineChart([
            { key: "measured", points: pick("measured_c") },
            { key: "faiman", points: pick("faiman_c") },
        ], "°C", false);
    }

    function channelStats(device, channel) {
        const rows = device.history && device.history.mppt;
        if (!Array.isArray(rows)) return null;
        return rows.find((item) => item.index === channel.index) || null;
    }

    function rangeText(block, digits, unit) {
        if (!block || block.min == null || block.max == null) return "";
        return `${formatMeasure(block.min, digits, unit)} – ${formatMeasure(block.max, digits, unit)}`;
    }

    function sourceLine(device) {
        const sources = device && device.sources;
        if (!sources) return "";
        const parts = [];
        if (sources.measure) parts.push(`${text("measure")} ${ago(sources.measure)}`);
        if (sources.cloud) parts.push(`${text("cloud")} ${ago(sources.cloud)}`);
        return parts.join(" · ");
    }


    function hourTicks(start, end) {
        const span = Math.max(1, end - start);
        const hours = span / 3600000;
        const step = [1, 2, 3, 4, 6].find((candidate) => hours / candidate <= 6) || 6;
        const format = new Intl.DateTimeFormat(locale(), { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
        const ticks = [];
        const cursor = new Date(start);
        cursor.setMinutes(0, 0, 0);
        if (cursor.getTime() < start) cursor.setHours(cursor.getHours() + 1);
        while (cursor.getTime() <= end + 1000 && ticks.length < 12) {
            if (cursor.getHours() % step === 0) {
                const pct = ((cursor.getTime() - start) / span) * 100;
                if (pct >= -1 && pct <= 101) {
                    const clamped = Math.min(100, Math.max(0, pct));
                    ticks.push({
                        left: `${clamped.toFixed(2)}%`,
                        label: format.format(cursor),
                        align: clamped < 8 ? "start" : clamped > 92 ? "end" : "middle",
                    });
                }
            }
            cursor.setHours(cursor.getHours() + 1);
        }
        return ticks;
    }

    function dayGeometry(device) {
        const day = device.history && device.history.day;
        const power = day && day.power;
        if (!Array.isArray(power) || power.length < 2) return null;
        const width = 640;
        const height = 220;
        let peak = 0;
        const all = power.map((point) => {
            const levels = MPPT_KEYS.map((key) => {
                const value = Number(point[key]);
                return Number.isFinite(value) && value > 0 ? value : 0;
            });
            const gap = MPPT_KEYS.every((key) => point[key] == null);
            if (!gap) peak = Math.max(peak, levels.reduce((sum, value) => sum + value, 0));
            return { t: Date.parse(point.t), gap, levels };
        }).filter((row) => Number.isFinite(row.t));
        // the axis starts when production starts, not at midnight
        const producing = all.filter((row) => !row.gap && row.levels.some((value) => value > 0));
        const rows = producing.length
            ? all.filter((row) => row.t >= producing[0].t - CROP_PAD && row.t <= producing[producing.length - 1].t + CROP_PAD)
            : all;
        const times = rows.map((row) => row.t);
        if (times.length < 2) return null;
        const start = Math.min(...times);
        const span = Math.max(1, Math.max(...times) - start);
        const range = niceRange([0, peak > 0 ? peak : 1], true);
        const max = range.max;
        const xOf = (time) => ((time - start) / span) * width;
        const yOf = (value) => (1 - value / max) * height;
        const areas = [0, 1, 2, 3].map((series) => {
            const paths = [];
            let chunk = [];
            const flush = () => {
                if (chunk.length < 2) {
                    chunk = [];
                    return;
                }
                const top = chunk.map((row, indexPoint) => {
                    const below = row.levels.slice(0, series).reduce((sum, value) => sum + value, 0);
                    const command = indexPoint === 0 ? "M" : "L";
                    return `${command}${xOf(row.t).toFixed(1)} ${yOf(below + row.levels[series]).toFixed(1)}`;
                }).join(" ");
                const bottom = chunk.slice().reverse().map((row) => {
                    const below = row.levels.slice(0, series).reduce((sum, value) => sum + value, 0);
                    return `L${xOf(row.t).toFixed(1)} ${yOf(below).toFixed(1)}`;
                }).join(" ");
                paths.push(`${top} ${bottom} Z`);
                chunk = [];
            };
            rows.forEach((row) => {
                if (row.gap) return;
                if (row.levels[series] <= 0) flush();
                else chunk.push(row);
            });
            flush();
            return paths.join(" ");
        });
        const drawn = areas.map((path, index) => ({ index: index + 1, d: path })).filter((area) => area.d);
        if (!drawn.length) return null;
        const end = Math.max(...times);
        const yTicks = range.ticks.map((value, index) => ({
            top: `${((max - value) / max) * 100}%`,
            y: (1 - value / max) * height,
            label: index === 0 ? `${formatNumber(value, 0)} W` : formatNumber(value, 0),
        }));
        return {
            areas: drawn,
            series: drawn.map((area) => area.index),
            yTicks,
            xTicks: hourTicks(start, end),
            width,
            height,
        };
    }

    window.SinvPage = {
        template: `
            <section class="sinv-page">
                <div v-if="loading" class="sinv-state" role="status">{{ text('loading') }}</div>
                <div v-else-if="error" class="sinv-state" role="alert">
                    <strong>{{ text('error') }}</strong>
                    <button type="button" class="button secondary" @click="reload">{{ text('retry') }}</button>
                </div>
                <div v-else-if="!live || live.feature_enabled === false" class="sinv-state" role="status">
                    <strong>{{ text('disabledTitle') }}</strong>
                    <span>{{ text('disabledText') }}</span>
                </div>
                <div v-else-if="!devices.length" class="sinv-state" role="status">
                    <strong>{{ text('emptyTitle') }}</strong>
                    <span>{{ text('emptyText') }}</span>
                </div>
                <template v-else>
                <article v-for="device in devices" :key="device.device_id" class="sinv-device">
                    <header class="sinv-device-head">
                        <div>
                            <h2>{{ device.name }}</h2>
                            <p v-if="device.model">{{ device.model }}</p>
                            <p v-if="sourceLine(device)" class="sinv-fresh">{{ sourceLine(device) }}</p>
                        </div>
                        <span v-if="device.curtailed === true" class="sinv-chip" role="status">{{ text('curtailed') }}</span>
                    </header>
                    <template v-if="device.kind === 'meter'">
                        <div class="sinv-pair">
                            <article v-if="reading(device, 'grid_to_home_power') || meterPath(device, 'grid_to_home_power')" class="sinv-card">
                                <h3>{{ text('meterImport') }}</h3>
                                <p v-if="reading(device, 'grid_to_home_power')" class="sinv-total">
                                    <strong>{{ formatMeasure(reading(device, 'grid_to_home_power').value, 0, reading(device, 'grid_to_home_power').unit || 'W') }}</strong>
                                </p>
                                <div v-if="meterChart(device, 'grid_to_home_power')" class="sinv-chart sinv-line-chart">
                                    <div class="sinv-y-axis"><span v-for="(tick, tickIndex) in meterChart(device, 'grid_to_home_power').yTicks" :key="'y' + tickIndex" :style="{ top: tick.top }">{{ tick.label }}</span></div>
                                    <svg class="sinv-day" :viewBox="'0 0 ' + meterChart(device, 'grid_to_home_power').width + ' ' + meterChart(device, 'grid_to_home_power').height" role="img" :aria-label="text('spark')">
                                        <line v-for="(tick, tickIndex) in meterChart(device, 'grid_to_home_power').yTicks" :key="'g' + tickIndex" class="sinv-gridline" x1="0" :x2="meterChart(device, 'grid_to_home_power').width" :y1="tick.y" :y2="tick.y"></line>
                                        <path class="sinv-line-spark" :d="meterChart(device, 'grid_to_home_power').paths.value"></path>
                                    </svg>
                                    <div class="sinv-x-axis"><span v-for="(tick, tickIndex) in meterChart(device, 'grid_to_home_power').xTicks" :key="'x' + tickIndex" :data-align="tick.align" :style="{ left: tick.left }">{{ tick.label }}</span></div>
                                </div>
                            </article>
                            <article v-if="reading(device, 'photovoltaic_to_grid_power') || meterPath(device, 'photovoltaic_to_grid_power')" class="sinv-card">
                                <h3>{{ text('meterExport') }}</h3>
                                <p v-if="reading(device, 'photovoltaic_to_grid_power')" class="sinv-total">
                                    <strong>{{ formatMeasure(reading(device, 'photovoltaic_to_grid_power').value, 0, reading(device, 'photovoltaic_to_grid_power').unit || 'W') }}</strong>
                                </p>
                                <div v-if="meterChart(device, 'photovoltaic_to_grid_power')" class="sinv-chart sinv-line-chart">
                                    <div class="sinv-y-axis"><span v-for="(tick, tickIndex) in meterChart(device, 'photovoltaic_to_grid_power').yTicks" :key="'y' + tickIndex" :style="{ top: tick.top }">{{ tick.label }}</span></div>
                                    <svg class="sinv-day" :viewBox="'0 0 ' + meterChart(device, 'photovoltaic_to_grid_power').width + ' ' + meterChart(device, 'photovoltaic_to_grid_power').height" role="img" :aria-label="text('spark')">
                                        <line v-for="(tick, tickIndex) in meterChart(device, 'photovoltaic_to_grid_power').yTicks" :key="'g' + tickIndex" class="sinv-gridline" x1="0" :x2="meterChart(device, 'photovoltaic_to_grid_power').width" :y1="tick.y" :y2="tick.y"></line>
                                        <path class="sinv-line-spark" :d="meterChart(device, 'photovoltaic_to_grid_power').paths.value"></path>
                                    </svg>
                                    <div class="sinv-x-axis"><span v-for="(tick, tickIndex) in meterChart(device, 'photovoltaic_to_grid_power').xTicks" :key="'x' + tickIndex" :data-align="tick.align" :style="{ left: tick.left }">{{ tick.label }}</span></div>
                                </div>
                            </article>
                        </div>
                    </template>
                    <template v-else>
                    <p v-if="device.pv_total_w != null" class="sinv-total">
                        <span>{{ text('pvTotal') }}</span>
                        <strong>{{ formatMeasure(device.pv_total_w, 0, 'W') }}</strong>
                        <span v-if="device.anker_total_w != null" class="sinv-anker">· {{ text('anker') }}: {{ formatMeasure(device.anker_total_w, 0, 'W') }}</span>
                    </p>
                    <p v-for="notice in (device.thermal && device.thermal.notices) || []" :key="notice.kind + '-' + (notice.index || 0) + '-' + notice.entity_id" class="sinv-notice">{{ text('unitNotice').replace('{id}', notice.entity_id).replace('{unit}', notice.unit || '–') }}</p>
                    <div v-if="visibleMppt(device).length" class="sinv-mppts">
                        <article v-for="channel in visibleMppt(device)" :key="channel.index" class="sinv-card sinv-mppt-row">
                            <div class="sinv-mppt-side">
                                <header class="sinv-mppt-head">
                                    <h3>{{ text('mppt') }} {{ channel.index }}</h3>
                                    <span v-if="channel.power_w != null" class="sinv-mppt-power">
                                        <strong>{{ formatMeasure(channel.power_w, 0, 'W') }}</strong>
                                        <span v-if="channel.share != null">· {{ formatShare(channel.share) }}</span>
                                    </span>
                                </header>
                                <svg class="sinv-panel-art" viewBox="0 0 240 120" role="presentation" aria-hidden="true">
                                    <polygon class="sinv-panel-shadow" points="22,112 196,112 230,92 60,92"></polygon>
                                    <polygon class="sinv-panel-frame" points="40,14 196,10 226,96 18,104"></polygon>
                                    <polygon class="sinv-panel-glass" points="45,19 192,15 220,92 25,99"></polygon>
                                    <path class="sinv-panel-grid" d="M80,18 L71,97 M118,17 L117,96 M155,16 L163,94 M42,38 L199,34 M37,58 L206,54 M31,78 L213,73"></path>
                                </svg>
                                <div class="sinv-tiles">
                                    <div class="sinv-tile">
                                        <svg class="sinv-tile-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 L5 13 h6 l-1 9 l8 -12 h-6 z"></path></svg>
                                        <span class="sinv-tile-label">{{ text('voltage') }}</span>
                                        <strong class="sinv-tile-value">{{ channel.voltage_v != null ? formatMeasure(channel.voltage_v, 1, 'V') : '–' }}</strong>
                                    </div>
                                    <div class="sinv-tile">
                                        <svg class="sinv-tile-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8 q2.25 -3 4.5 0 t4.5 0 t4.5 0 t4.5 0 M3 13 q2.25 -3 4.5 0 t4.5 0 t4.5 0 t4.5 0 M4 19 h16"></path></svg>
                                        <span class="sinv-tile-label">{{ text('current') }}</span>
                                        <strong class="sinv-tile-value">{{ channel.current_a != null ? formatMeasure(channel.current_a, 1, 'A') : '–' }}</strong>
                                    </div>
                                    <div class="sinv-tile" :class="{ 'sinv-derived': hasThermal(device) && thermalSource(device, channel.index) !== 'measured' }">
                                        <svg class="sinv-tile-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4 a2 2 0 0 1 4 0 v9.5 a4 4 0 1 1 -4 0 z M12 10 v6 M16 6 h3 M16 9 h2 M16 12 h3"></path></svg>
                                        <span class="sinv-tile-label">{{ hasThermal(device) ? moduleLabel(thermalSource(device, channel.index)) : text('temperature') }}</span>
                                        <strong class="sinv-tile-value">{{ hasThermal(device) ? thermalValue(device, channel.index, 'module_c', '°C') : '–' }}</strong>
                                    </div>
                                </div>
                                <p v-if="hasThermal(device)" class="sinv-tile-foot">
                                    <span>{{ text('outdoor') }} {{ device.thermal.ambient_c != null ? formatMeasure(device.thermal.ambient_c, 1, '°C') : '–' }}</span>
                                    <span>· {{ text('delta') }} {{ thermalValue(device, channel.index, 'delta_c', 'K') }}</span>
                                    <span v-if="channel.anker_w != null">· {{ text('anker') }} {{ formatMeasure(channel.anker_w, 0, 'W') }}</span>
                                </p>
                                <p v-else-if="channel.anker_w != null" class="sinv-tile-foot">{{ text('anker') }} {{ formatMeasure(channel.anker_w, 0, 'W') }}</p>
                                <p v-if="thermalRow(device, channel.index) && thermalRow(device, channel.index).reason" class="sinv-hint">{{ reasonText(thermalRow(device, channel.index).reason) }}</p>
                                <section v-if="daySummary(device, channel).length" class="sinv-day-summary">
                                    <h4>{{ text('today') }}</h4>
                                    <dl>
                                        <div v-for="item in daySummary(device, channel)" :key="item.key">
                                            <dt>{{ item.label }}</dt>
                                            <dd>{{ item.value }} <small v-if="item.note">{{ item.note }}</small></dd>
                                        </div>
                                    </dl>
                                </section>
                            </div>
                            <div class="sinv-mppt-charts">
                                <section class="sinv-chart-block">
                                    <div class="sinv-chart-head">
                                        <span>{{ text('spark') }}</span>
                                        <div class="sinv-trace" role="group" :aria-label="text('spark')">
                                            <button type="button" :class="{ active: traceMode(device, channel) === 'v' }" @click="setTrace(device, channel, 'v')">V</button>
                                            <button type="button" :class="{ active: traceMode(device, channel) === 'a' }" @click="setTrace(device, channel, 'a')">A</button>
                                            <button type="button" :class="{ active: traceMode(device, channel) === 'w' }" @click="setTrace(device, channel, 'w')">W</button>
                                        </div>
                                    </div>
                                    <template v-if="sparkChart(device, channel)">
                                    <div class="sinv-chart sinv-line-chart">
                                        <div class="sinv-y-axis"><span v-for="(tick, tickIndex) in sparkChart(device, channel).yTicks" :key="'y' + tickIndex" :style="{ top: tick.top }">{{ tick.label }}</span></div>
                                        <svg class="sinv-day" :viewBox="'0 0 ' + sparkChart(device, channel).width + ' ' + sparkChart(device, channel).height" role="img" :aria-label="text('spark')">
                                            <line v-for="(tick, tickIndex) in sparkChart(device, channel).yTicks" :key="'g' + tickIndex" class="sinv-gridline" x1="0" :x2="sparkChart(device, channel).width" :y1="tick.y" :y2="tick.y"></line>
                                            <path class="sinv-line-spark" :d="sparkChart(device, channel).paths.value"></path>
                                        </svg>
                                        <div class="sinv-x-axis"><span v-for="(tick, tickIndex) in sparkChart(device, channel).xTicks" :key="'x' + tickIndex" :data-align="tick.align" :style="{ left: tick.left }">{{ tick.label }}</span></div>
                                    </div>
                                    </template>
                                </section>
                                <section v-if="thermalChart(device, channel.index)" class="sinv-chart-block">
                                    <div class="sinv-chart-head"><span>{{ text('thermal') }}</span></div>
                                    <div class="sinv-chart sinv-line-chart">
                                        <div class="sinv-y-axis"><span v-for="(tick, tickIndex) in thermalChart(device, channel.index).yTicks" :key="'y' + tickIndex" :style="{ top: tick.top }">{{ tick.label }}</span></div>
                                        <svg class="sinv-day" :viewBox="'0 0 ' + thermalChart(device, channel.index).width + ' ' + thermalChart(device, channel.index).height" role="img" :aria-label="text('thermal')">
                                            <line v-for="(tick, tickIndex) in thermalChart(device, channel.index).yTicks" :key="'g' + tickIndex" class="sinv-gridline" x1="0" :x2="thermalChart(device, channel.index).width" :y1="tick.y" :y2="tick.y"></line>
                                            <path class="sinv-line-ambient" :d="thermalChart(device, channel.index).paths.ambient"></path>
                                            <path :class="thermalChart(device, channel.index).source !== 'measured' ? 'sinv-line-derived' : 'sinv-line-module'" :d="thermalChart(device, channel.index).paths.module"></path>
                                        </svg>
                                        <div class="sinv-x-axis"><span v-for="(tick, tickIndex) in thermalChart(device, channel.index).xTicks" :key="'x' + tickIndex" :data-align="tick.align" :style="{ left: tick.left }">{{ tick.label }}</span></div>
                                    </div>
                                    <ul class="sinv-legend sinv-thermal-legend">
                                        <li><i :class="thermalChart(device, channel.index).source !== 'measured' ? 'sinv-swatch sinv-swatch-derived' : 'sinv-swatch sinv-swatch-1'"></i>{{ moduleLabel(thermalChart(device, channel.index).source) }}</li>
                                        <li v-if="thermalChart(device, channel.index).paths.ambient"><i class="sinv-swatch sinv-swatch-ambient"></i>{{ text('outdoor') }}</li>
                                    </ul>
                                    <p v-if="thermalChart(device, channel.index).source === 'estimated' && calibrationText(device)" class="sinv-hint">{{ calibrationText(device) }}</p>
                                </section>
                            </div>
                        </article>
                    </div>
                    <article v-if="device.dayView" class="sinv-card sinv-day-card">
                        <h3>{{ text('dayChart') }} <span>{{ text('sinceMidnight') }}</span></h3>
                        <div class="sinv-chart">
                            <div class="sinv-y-axis">
                                <span v-for="(tick, tickIndex) in device.dayView.yTicks" :key="'y-' + tickIndex" :style="{ top: tick.top }">{{ tick.label }}</span>
                            </div>
                            <svg class="sinv-day" viewBox="0 0 640 220" role="img" :aria-label="text('dayChart')">
                                <line v-for="(tick, tickIndex) in device.dayView.yTicks" :key="'g' + tickIndex" class="sinv-gridline" x1="0" x2="640" :y1="tick.y" :y2="tick.y"></line>
                                <path v-for="area in device.dayView.areas" :key="'area-' + area.index" :class="'sinv-area sinv-area-' + area.index" :d="area.d"></path>
                                <line class="sinv-axis" x1="0" y1="219.5" x2="640" y2="219.5"></line>
                            </svg>
                            <div class="sinv-x-axis">
                                <span v-for="(tick, tickIndex) in device.dayView.xTicks" :key="'x-' + tickIndex" :data-align="tick.align" :style="{ left: tick.left }">{{ tick.label }}</span>
                            </div>
                        </div>
                        <ul class="sinv-legend">
                            <li v-for="index in device.dayView.series" :key="index"><i :class="'sinv-swatch sinv-swatch-' + index"></i>{{ text('mppt') }} {{ index }}</li>
                        </ul>
                    </article>
                    <article v-if="showPremium(device)" class="sinv-card sinv-day-card">
                        <h3>{{ text('compare') }}</h3>
                        <div v-if="!premiumOn" class="sinv-state" role="status">
                            <strong>{{ text('premiumTitle') }}</strong>
                            <span>{{ text('premiumText') }}</span>
                        </div>
                        <template v-else-if="compareGeometry(device)">
                            <div class="sinv-chart sinv-line-chart">
                                        <div class="sinv-y-axis"><span v-for="(tick, tickIndex) in compareGeometry(device).yTicks" :key="'y' + tickIndex" :style="{ top: tick.top }">{{ tick.label }}</span></div>
                                        <svg class="sinv-day" :viewBox="'0 0 ' + compareGeometry(device).width + ' ' + compareGeometry(device).height" role="img" :aria-label="text('compare')">
                                            <line v-for="(tick, tickIndex) in compareGeometry(device).yTicks" :key="'g' + tickIndex" class="sinv-gridline" x1="0" :x2="compareGeometry(device).width" :y1="tick.y" :y2="tick.y"></line>
                                            <path class="sinv-line-module" :d="compareGeometry(device).paths.measured"></path>
                                            <path class="sinv-line-faiman" :d="compareGeometry(device).paths.faiman"></path>
                                        </svg>
                                        <div class="sinv-x-axis"><span v-for="(tick, tickIndex) in compareGeometry(device).xTicks" :key="'x' + tickIndex" :data-align="tick.align" :style="{ left: tick.left }">{{ tick.label }}</span></div>
                                    </div>
                            <ul class="sinv-legend">
                                <li><i class="sinv-swatch sinv-swatch-1"></i>{{ text('measured') }}</li>
                                <li><i class="sinv-swatch sinv-swatch-2"></i>{{ text('faiman') }}</li>
                            </ul>
                            <p v-if="calibrationText(device)" class="sinv-hint">{{ calibrationText(device) }}</p>
                        </template>
                    </article>
                    <div class="sinv-pair">
                        <article v-if="showGrid(device)" class="sinv-card">
                            <h3>{{ text('grid') }}</h3>
                            <dl class="sinv-metrics">
                                <div v-if="reading(device, 'ac_voltage')">
                                    <dt>{{ text('voltage') }}</dt>
                                    <dd>{{ formatMeasure(reading(device, 'ac_voltage').value, 1, reading(device, 'ac_voltage').unit || 'V') }}</dd>
                                </div>
                                <div v-if="reading(device, 'ac_frequency')">
                                    <dt>{{ text('frequency') }}</dt>
                                    <dd>{{ formatMeasure(reading(device, 'ac_frequency').value, 2, reading(device, 'ac_frequency').unit || 'Hz') }}</dd>
                                </div>
                            </dl>
                            <p v-if="rangeText(extrema(device, 'ac_voltage'), 1, 'V')" class="sinv-range">
                                {{ text('dayRange') }}
                                <strong>{{ rangeText(extrema(device, 'ac_voltage'), 1, 'V') }}</strong>
                            </p>
                            <p v-if="rangeText(extrema(device, 'ac_frequency'), 2, 'Hz')" class="sinv-range">
                                {{ text('dayRange') }}
                                <strong>{{ rangeText(extrema(device, 'ac_frequency'), 2, 'Hz') }}</strong>
                            </p>
                        </article>
                        <article v-if="showBattery(device)" class="sinv-card">
                            <h3>{{ text('battery') }}</h3>
                            <dl class="sinv-metrics">
                                <div v-if="reading(device, 'state_of_charge')">
                                    <dt>{{ text('soc') }}</dt>
                                    <dd>{{ formatMeasure(reading(device, 'state_of_charge').value, 0, reading(device, 'state_of_charge').unit || '%') }}</dd>
                                </div>
                                <div v-if="device.battery && device.battery.main_soc != null">
                                    <dt>{{ text('mainBattery') }}</dt>
                                    <dd>{{ formatMeasure(device.battery.main_soc, 0, '%') }}</dd>
                                </div>
                                <div v-if="reading(device, 'battery_power_signed')">
                                    <dt>{{ text('power') }}</dt>
                                    <dd>{{ formatSigned(reading(device, 'battery_power_signed').value, reading(device, 'battery_power_signed').unit || 'W') }}</dd>
                                </div>
                                <div v-if="device.battery && device.battery.charge_w != null">
                                    <dt>{{ text('charge') }}</dt>
                                    <dd>{{ formatMeasure(device.battery.charge_w, 0, 'W') }}</dd>
                                </div>
                                <div v-if="device.battery && device.battery.discharge_w != null">
                                    <dt>{{ text('discharge') }}</dt>
                                    <dd>{{ formatMeasure(device.battery.discharge_w, 0, 'W') }}</dd>
                                </div>
                                <div v-if="reading(device, 'temperature')">
                                    <dt>{{ text('temperature') }}</dt>
                                    <dd>{{ formatMeasure(reading(device, 'temperature').value, 1, reading(device, 'temperature').unit || '°C') }}</dd>
                                </div>
                            </dl>
                            <ul v-if="device.battery && device.battery.packs && device.battery.packs.length" class="sinv-packs">
                                <li v-for="pack in device.battery.packs" :key="pack.id">
                                    <strong>{{ pack.id === 'main' ? text('mainBattery') : text('expansion') + ' ' + pack.id }}</strong>
                                    <span v-if="pack.soh != null">{{ text('soh') }} {{ formatMeasure(pack.soh, 0, '%') }}</span>
                                    <span v-if="pack.cells_v && pack.cells_v.length" class="sinv-cells">{{ text('cells') }} {{ cellList(pack.cells_v) }}</span>
                                </li>
                            </ul>
                            <ul v-if="device.expansions && device.expansions.length" class="sinv-packs">
                                <li v-for="pack in device.expansions" :key="'exp-' + pack.index">
                                    <strong>{{ text('expansion') }} {{ pack.index }}</strong>
                                    <span v-if="pack.soc != null">{{ formatMeasure(pack.soc, 0, '%') }}</span>
                                    <span v-if="pack.temperature_c != null">{{ formatMeasure(pack.temperature_c, 1, '°C') }}</span>
                                </li>
                            </ul>
                        </article>
                    </div>
                    </template>
                </article>
                </template>
            </section>
        `,
        setup() {
            const live = Vue.ref(null);
            const history = Vue.ref(null);
            const loading = Vue.ref(true);
            const error = Vue.ref("");
            const traces = Vue.reactive({});
            const premiumOn = Vue.computed(() => Boolean(history.value && history.value.premium === true));
            let alive = true;
            let liveTimer = null;
            let historyTimer = null;
            let livePending = false;
            let historyPending = false;

            const devices = Vue.computed(() => {
                const rows = (live.value && live.value.devices) || [];
                const byId = new Map(((history.value && history.value.devices) || []).map((device) => [device.device_id, device]));
                return rows.map((device) => {
                    const merged = { ...device, history: byId.get(device.device_id) || null };
                    return { ...merged, dayView: dayGeometry(merged) };
                });
            });

            async function read(url) {
                const payload = await SFMLApi.fetch(url, { authenticated: true, forceRefresh: true, ttl: 0 });
                if (payload && payload.success === false) {
                    const code = payload.error && payload.error.code;
                    throw new Error(code || "request_failed");
                }
                return payload && payload.data ? payload.data : payload;
            }

            async function refreshLive() {
                if (livePending) return;
                livePending = true;
                try {
                    const body = await read("/api/sfml_stats/sinv/live");
                    if (!alive) return;
                    live.value = body;
                    error.value = "";
                    loading.value = false;
                } catch (_err) {
                    if (!alive) return;
                    if (!live.value) error.value = "load";
                    loading.value = false;
                } finally {
                    livePending = false;
                }
            }

            async function refreshHistory() {
                if (historyPending) return;
                historyPending = true;
                try {
                    const body = await read("/api/sfml_stats/sinv/history?hours=24");
                    if (!alive) return;
                    history.value = body;
                } catch (_err) {
                    if (!alive) return;
                } finally {
                    historyPending = false;
                }
            }

            function reload() {
                error.value = "";
                loading.value = !live.value;
                refreshLive();
                refreshHistory();
            }

            function traceKey(device, channel) {
                return `${device.device_id}:${channel.index}`;
            }

            function traceMode(device, channel) {
                return traces[traceKey(device, channel)] || "w";
            }

            function setTrace(device, channel, mode) {
                traces[traceKey(device, channel)] = mode;
            }

            function tracePoints(device, channel) {
                const mode = traceMode(device, channel);
                const past = device.history;
                if (mode === "w") {
                    const row = channelStats(device, channel);
                    return row && row.power ? row.power : [];
                }
                const role = mode === "v" ? `pv_${channel.index}_voltage` : `pv_${channel.index}_current`;
                const series = past && past.series;
                return series && series[role] ? series[role] : [];
            }

            function sparkPath(device, channel) {
                return pathFrom(tracePoints(device, channel));
            }

            function dayMax(device, points) {
                const day = device.history && device.history.day;
                const from = day && day.start ? Date.parse(day.start) : 0;
                let best = null;
                (points || []).forEach((point) => {
                    const value = Number(point && point.v);
                    if (!Number.isFinite(value) || !(Date.parse(point.t) >= from)) return;
                    if (best == null || value > best.v) best = { v: value, t: point.t };
                });
                return best;
            }

            // Today's figures of one MPPT for the area below its tiles.
            function daySummary(device, channel) {
                const items = [];
                const row = channelStats(device, channel);
                if (row && row.energy_kwh != null) {
                    items.push({ key: "yield", label: text("yield"), value: formatMeasure(row.energy_kwh, 2, "kWh") });
                    const total = ((device.history && device.history.mppt) || [])
                        .reduce((sum, item) => sum + (Number(item.energy_kwh) > 0 ? Number(item.energy_kwh) : 0), 0);
                    if (total > 0) items.push({ key: "share", label: text("shareToday"), value: formatShare(row.energy_kwh / total) });
                }
                if (row && row.peak_w != null) {
                    items.push({
                        key: "peak",
                        label: text("peak"),
                        value: formatMeasure(row.peak_w, 0, "W"),
                        note: row.peak_at ? `${text("peakAt")} ${formatClock(row.peak_at)}` : "",
                    });
                }
                const series = (device.history && device.history.series) || {};
                const current = dayMax(device, series[`pv_${channel.index}_current`]);
                if (current) items.push({ key: "current", label: text("maxCurrent"), value: formatMeasure(current.v, 1, "A"), note: `${text("peakAt")} ${formatClock(current.t)}` });
                const voltage = dayMax(device, series[`pv_${channel.index}_voltage`]);
                if (voltage) items.push({ key: "voltage", label: text("maxVoltage"), value: formatMeasure(voltage.v, 1, "V"), note: `${text("peakAt")} ${formatClock(voltage.t)}` });
                const thermal = device.history && device.history.thermal;
                const moduleRow = thermal && Array.isArray(thermal.mppt) ? thermal.mppt.find((item) => item.index === channel.index) : null;
                const module = dayMax(device, moduleRow && moduleRow.module);
                if (module) items.push({ key: "module", label: text("maxModule"), value: formatMeasure(module.v, 1, "°C"), note: `${text("peakAt")} ${formatClock(module.t)}` });
                return items;
            }

            function calibrationText(device) {
                const thermal = device.history && device.history.thermal;
                const gain = thermal && thermal.calibration && Number(thermal.calibration.gain);
                if (!Number.isFinite(gain)) return "";
                return text("calibrated").replace("{k}", formatNumber(gain, 2));
            }

            function sparkChart(device, channel) {
                const mode = traceMode(device, channel);
                const unit = mode === "v" ? "V" : mode === "a" ? "A" : "W";
                return lineChart([{ key: "value", points: tracePoints(device, channel) }], unit, mode !== "v", true);
            }

            function meterChart(device, role) {
                const series = device.history && device.history.series;
                return lineChart([{ key: "value", points: series && series[role] ? series[role] : [] }], "W", true, true);
            }

            function meterPath(device, role) {
                const series = device.history && device.history.series;
                return pathFrom(series && series[role] ? series[role] : []);
            }

            function channelVisible(device, channel) {
                const row = channelStats(device, channel);
                return channel.voltage_v != null
                    || channel.current_a != null
                    || channel.power_w != null
                    || channel.anker_w != null
                    || sparkPath(device, channel) !== ""
                    || (row && (row.energy_kwh != null || row.peak_w != null));
            }

            function visibleMppt(device) {
                return (device.mppt || []).filter((channel) => channelVisible(device, channel));
            }

            function extrema(device, role) {
                const block = device.history && device.history.extrema;
                return block ? block[role] : null;
            }

            function showGrid(device) {
                return Boolean(reading(device, "ac_voltage") || reading(device, "ac_frequency") || rangeText(extrema(device, "ac_voltage"), 1, "V") || rangeText(extrema(device, "ac_frequency"), 2, "Hz"));
            }

            function showBattery(device) {
                const battery = device.battery || {};
                return Boolean(
                    reading(device, "state_of_charge")
                    || reading(device, "battery_power_signed")
                    || reading(device, "temperature")
                    || battery.charge_w != null
                    || battery.discharge_w != null
                    || battery.main_soc != null
                    || (battery.packs && battery.packs.length)
                    || (device.expansions && device.expansions.length)
                );
            }

            function showPremium(device) {
                const liveThermal = device.thermal || {};
                const past = device.history && device.history.thermal;
                const measured = (rows) => Array.isArray(rows) && rows.some((row) => row && row.source === "measured");
                return Boolean(measured(liveThermal.mppt) || (past && measured(past.mppt)) || (past && past.compare_ready === true));
            }

            function cellList(cells) {
                return cells.map((cell) => formatMeasure(cell, 3, "V")).filter(Boolean).join(" · ");
            }

            Vue.onMounted(() => {
                refreshLive();
                refreshHistory();
                liveTimer = window.setInterval(refreshLive, LIVE_MS);
                historyTimer = window.setInterval(refreshHistory, HISTORY_MS);
            });
            Vue.onUnmounted(() => {
                alive = false;
                window.clearInterval(liveTimer);
                window.clearInterval(historyTimer);
                liveTimer = null;
                historyTimer = null;
            });

            return {
                text, loading, error, live, devices, reload, reading, formatMeasure, formatSigned, formatShare,
                formatClock, sparkPath, meterPath, meterChart, visibleMppt, extrema, rangeText, showGrid, showBattery,
                sourceLine, dayGeometry, traceMode, setTrace, stats: channelStats, cellList, daySummary, calibrationText,
                thermalRow, thermalChart, sparkChart, hasThermal, thermalSource, thermalValue, moduleLabel, compareGeometry, showPremium, premiumOn, reasonText,
            };
        },
    };
})();
