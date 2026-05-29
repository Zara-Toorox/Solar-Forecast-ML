/* SFML Stats local i18n runtime */
(function () {
    var STORAGE_KEY = "sfml-stats-locale";
    var LEGACY_STORAGE_KEY = "sfml-locale";
    var FALLBACK = "en";
    var SUPPORTED = ["de", "en", "pl"];
    var REGION_TO_LOCALE = {
        DE: "de",
        AT: "de",
        CH: "de",
        PL: "pl",
    };
    var TIMEZONE_TO_REGION = {
        "Europe/Berlin": "DE",
        "Europe/Vienna": "AT",
        "Europe/Zurich": "CH",
        "Europe/Warsaw": "PL",
    };

    function normalizeLocale(code) {
        if (!code) return null;
        var normalized = String(code).toLowerCase().slice(0, 2);
        return SUPPORTED.indexOf(normalized) !== -1 ? normalized : null;
    }

    function localeRegion(code) {
        if (!code) return null;
        try {
            if (window.Intl && Intl.Locale) {
                var locale = new Intl.Locale(String(code));
                var maximized = locale.maximize ? locale.maximize() : locale;
                if (maximized.region) return maximized.region.toUpperCase();
            }
        } catch (e) {}

        var match = String(code).match(/[-_]([A-Za-z]{2})(?:-|_|$)/);
        return match ? match[1].toUpperCase() : null;
    }

    function localeLanguage(code) {
        return code ? String(code).toLowerCase().slice(0, 2) : null;
    }

    function localeFromRegion(region, language) {
        if (region && REGION_TO_LOCALE[region]) return REGION_TO_LOCALE[region];
        if (!region && language === "de") return "de";
        if (!region && language === "pl") return "pl";
        return FALLBACK;
    }

    function readStoredLocale() {
        try {
            return normalizeLocale(localStorage.getItem(STORAGE_KEY))
                || normalizeLocale(localStorage.getItem(LEGACY_STORAGE_KEY));
        } catch (e) {
            return null;
        }
    }

    function readUrlLocale() {
        try {
            return normalizeLocale(new URLSearchParams(window.location.search).get("lang"));
        } catch (e) {
            return null;
        }
    }

    function autoLocale() {
        var candidates = [];
        if (navigator.languages && navigator.languages.length) {
            candidates = candidates.concat(Array.prototype.slice.call(navigator.languages));
        }
        if (navigator.language) candidates.push(navigator.language);
        if (navigator.userLanguage) candidates.push(navigator.userLanguage);

        for (var i = 0; i < candidates.length; i += 1) {
            var region = localeRegion(candidates[i]);
            if (region) return localeFromRegion(region, localeLanguage(candidates[i]));
        }

        try {
            var resolved = Intl.DateTimeFormat().resolvedOptions();
            var tzRegion = TIMEZONE_TO_REGION[resolved.timeZone];
            if (tzRegion) return localeFromRegion(tzRegion);
            return localeFromRegion(localeRegion(resolved.locale), localeLanguage(resolved.locale));
        } catch (e) {
            return FALLBACK;
        }
    }

    function resolveLocale() {
        return readUrlLocale() || readStoredLocale() || autoLocale();
    }

    function lookup(locale, key) {
        var messages = window.SFMLLocales || {};
        var current = messages[locale] || messages[FALLBACK] || {};
        var fallback = messages[FALLBACK] || {};
        var parts = String(key).split(".");

        function dig(root) {
            var value = root;
            for (var i = 0; i < parts.length; i += 1) {
                if (!value || !Object.prototype.hasOwnProperty.call(value, parts[i])) return null;
                value = value[parts[i]];
            }
            return value;
        }

        var value = dig(current);
        if (value == null && locale !== FALLBACK) value = dig(fallback);
        return value == null ? key : value;
    }

    function interpolate(text, params) {
        if (!params) return text;
        return String(text).replace(/\{([^}]+)\}/g, function (_, name) {
            return Object.prototype.hasOwnProperty.call(params, name) ? params[name] : "{" + name + "}";
        });
    }

    var current = resolveLocale();

    function t(key, params) {
        return interpolate(lookup(current, key), params);
    }

    function setLocale(code) {
        var locale = normalizeLocale(code);
        if (!locale) return;
        current = locale;
        try {
            localStorage.setItem(STORAGE_KEY, locale);
            localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch (e) {}

        try {
            document.documentElement.setAttribute("lang", current);
        } catch (e) {}

        try {
            var url = new URL(window.location.href);
            url.searchParams.set("lang", locale);
            window.location.replace(url.toString());
        } catch (e) {
            window.location.reload();
        }
    }

    try {
        document.documentElement.setAttribute("lang", current);
    } catch (e) {}

    window.SFMLI18n = {
        current: current,
        supported: SUPPORTED.slice(),
        t: t,
        setLocale: setLocale,
        nameOf: function (code) {
            return lookup(normalizeLocale(code) || FALLBACK, "common.languageName");
        },
        autoLocale: autoLocale,
    };
})();
