/* ============================================================
   SFML Stats Dashboard - vue-i18n Bootstrap
   Detects the active locale, builds a vue-i18n instance from
   window.SFMLLocales (defined in locales.js), and exposes
   window.SFMLI18n for the Vue apps and the language picker.

   Locale resolution order:
     1. ?lang=xx URL parameter (overrides everything; not persisted)
     2. localStorage["sfml-locale"] (set by language picker)
     3. navigator.language prefix (if supported)
     4. "de" fallback (preserves current behavior for existing users)
   ============================================================ */

(function () {
    var STORAGE_KEY = "sfml-locale";
    var FALLBACK = "de";
    var supported = Object.keys(window.SFMLLocales || { de: {} });

    function normalize(code) {
        if (!code) return null;
        var short = String(code).toLowerCase().slice(0, 2);
        return supported.indexOf(short) !== -1 ? short : null;
    }

    function detectLocale() {
        try {
            var fromUrl = new URLSearchParams(window.location.search).get("lang");
            var n = normalize(fromUrl);
            if (n) return n;
        } catch (e) { /* URLSearchParams may be unavailable in old browsers */ }

        try {
            var stored = localStorage.getItem(STORAGE_KEY);
            var ns = normalize(stored);
            if (ns) return ns;
        } catch (e) { /* localStorage may be blocked */ }

        var fromNav = normalize(navigator.language || navigator.userLanguage);
        if (fromNav) return fromNav;

        return FALLBACK;
    }

    function createInstance() {
        if (typeof VueI18n === "undefined" || !VueI18n.createI18n) {
            console.error("[SFML] vue-i18n is not loaded — translations will not work");
            return null;
        }
        return VueI18n.createI18n({
            legacy: false,
            globalInjection: true,
            locale: detectLocale(),
            fallbackLocale: FALLBACK,
            messages: window.SFMLLocales || {},
            missingWarn: false,
            fallbackWarn: false,
        });
    }

    function setLocale(code) {
        var n = normalize(code);
        if (!n) return;
        try { localStorage.setItem(STORAGE_KEY, n); } catch (e) { /* ignore */ }
        // Reload so every label, computed, and chart re-renders cleanly.
        // Avoids hunting down every reactive label individually.
        window.location.reload();
    }

    var instance = createInstance();
    var current = detectLocale();

    // Reflect the active locale on <html lang="…"> for accessibility/CSS.
    try { document.documentElement.setAttribute("lang", current); } catch (e) { /* ignore */ }

    window.SFMLI18n = {
        instance: instance,
        supported: supported,
        current: current,
        setLocale: setLocale,
        // Human label for the picker UI (e.g. "Deutsch", "English", "Polski").
        nameOf: function (code) {
            var locales = window.SFMLLocales || {};
            return (locales[code] && locales[code].common && locales[code].common.languageName) || code;
        },
    };
})();
