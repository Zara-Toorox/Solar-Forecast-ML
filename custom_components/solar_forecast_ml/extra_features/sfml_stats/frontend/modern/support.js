/* Fehler melden: direct report channel from STATS to the developer.
   The backend assembles versions and redacted log excerpts; the page shows exactly
   what leaves the installation before the user sends it. No personal data is asked for. */

const SUPPORT_PREVIEW_ENDPOINT = "/api/sfml_stats/support/preview";
const SUPPORT_REPORT_ENDPOINT = "/api/sfml_stats/support/report";
const SUPPORT_PREVIEW_LINES = 160;
const SUPPORT_WINDOW_CHOICES = [6, 24, 48, 72];
const SUPPORT_TEXT_RULES = {
    title: [5, 180],
    expected: [10, 2000],
    actual: [10, 2000],
    steps: [10, 5000],
};

const SUPPORT_COPY = {
    de: {
        kicker: "Direkter Kanal",
        heroTitle: "Fehler direkt melden",
        heroText: "Beschreibe, was schiefgelaufen ist. STATS hängt Versionen und die passenden Log-Auszüge der letzten Stunden automatisch an – ohne E-Mail-Adresse, ohne Standort, ohne Zugangsdaten.",
        heroBadge: "Keine Kontaktdaten",
        formTitle: "Deine Meldung",
        product: "Betroffenes Produkt",
        environment: "Umgebung",
        installation: "Installation",
        choose: "Bitte auswählen",
        title: "Titel",
        titleHint: "Kurz und konkret, z. B. „Prognose für morgen bleibt bei 0 kWh“",
        expected: "Erwartetes Verhalten",
        actual: "Tatsächliches Verhalten",
        steps: "Schritte zur Reproduktion",
        stepsHint: "Was hast Du getan, bevor der Fehler auftrat? Uhrzeit hilft beim Zuordnen im Log.",
        window: "Log-Zeitraum",
        windowHours: "{hours} h",
        minChars: "min. {count}",
        consent: "Ich habe die Vorschau geprüft und bin einverstanden, dass diese Angaben zusammen mit dem Log-Auszug an solarforecastml.com übertragen und dort bis zur Bearbeitung, längstens 90 Tage, gespeichert werden. Es werden keine Kontaktdaten übertragen, und ich habe im Freitext keine persönlichen Daten eingetragen. Mir ist bewusst, dass der Entwickler mich nicht kontaktieren kann und ich den Stand meiner Meldung im Bug-Tracker auf solarforecastml.com selbst verfolgen muss.",
        submit: "Meldung senden",
        sending: "Meldung wird gesendet …",
        previewTitle: "Das wird gesendet",
        previewText: "Automatisch ermittelt, bereits bereinigt. Koordinaten, E-Mail-Adressen, IP-Adressen und Schlüssel werden vor der Übertragung ersetzt.",
        refresh: "Vorschau aktualisieren",
        loading: "Log-Auszug wird zusammengestellt …",
        haCore: "Home Assistant",
        hostOs: "Host-System",
        install: "Installationstyp",
        integrations: "Integrationen",
        haLog: "HA-Log",
        sfmlLog: "SFML-Log",
        records: "{kept} von {total} Einträgen",
        unavailable: "nicht verfügbar",
        redactions: "Bereinigt",
        size: "Umfang",
        showLog: "Log-Auszug anzeigen",
        hideLog: "Log-Auszug ausblenden",
        moreLines: "… {count} weitere Zeilen – vollständig enthalten in der Meldung",
        showAll: "Alle Zeilen anzeigen",
        showLess: "Weniger anzeigen",
        successTitle: "Danke – Deine Meldung ist angekommen.",
        successText: "Sie wurde unter dieser Referenz aufgenommen. Notiere sie Dir: Sie ist der einzige Schlüssel zu Deiner Meldung, es wird keine Bestätigung verschickt.",
        successTracker: "Bestätigte Fehler erscheinen mit Status und behobener Version im öffentlichen Bug-Tracker.",
        openTracker: "Bug-Tracker öffnen",
        another: "Weitere Meldung erfassen",
        previewFailed: "Die Vorschau konnte nicht erstellt werden.",
        retry: "Erneut versuchen",
        characters: "{count} Zeichen",
        errors: {
            cooldown: "Bitte warte ein paar Minuten, bevor Du eine weitere Meldung sendest.",
            submission_in_progress: "Eine Meldung wird gerade gesendet.",
            rate_limited: "Die Website nimmt von dieser Adresse gerade keine weiteren Meldungen an. Bitte später erneut versuchen.",
            too_large: "Der Log-Auszug ist zu groß. Wähle einen kürzeren Zeitraum.",
            offline: "solarforecastml.com ist von dieser Installation aus gerade nicht erreichbar.",
            unavailable: "Die Website ist vorübergehend nicht verfügbar. Bitte später erneut versuchen.",
            rejected: "Die Website hat die Meldung abgelehnt. Prüfe die Eingaben und versuche es erneut.",
            invalid_field: "Bitte prüfe die markierten Felder.",
            confirmation_required: "Bitte bestätige die Einwilligung.",
            same_origin_required: "Die Meldung kann nur aus der Home-Assistant-Oberfläche gesendet werden.",
            local_access_required: "Nur über die lokale Home-Assistant-Oberfläche oder Home Assistant Cloud möglich.",
            authentication_required: "Bitte melde Dich in Home Assistant an.",
            default: "Die Meldung konnte nicht gesendet werden.",
        },
        fieldErrors: {
            title: "Titel: 5 bis 180 Zeichen.",
            expected: "Erwartetes Verhalten: 10 bis 2000 Zeichen.",
            actual: "Tatsächliches Verhalten: 10 bis 2000 Zeichen.",
            steps: "Schritte: 10 bis 5000 Zeichen.",
            provider: "Bitte ein Produkt wählen.",
            environment: "Bitte eine Umgebung wählen.",
            installation: "Bitte einen Installationstyp wählen.",
            privacy: "Bitte bestätige die Einwilligung.",
        },
        providers: { sfml: "Solar Forecast ML", stats: "SFML STATS", eai: "Energy AI (EAI)", gpm: "Grid Price Monitor", wfai: "Weather Fusion AI" },
        environments: { "bare-metal-x86": "Bare Metal (x86)", proxmox: "Proxmox", arm: "ARM (Raspberry Pi, Home Assistant Green)", vm: "Virtuelle Maschine", docker: "Docker", other: "Andere" },
        installations: { hacs: "HACS", "addon-store": "Add-on Store", manual: "Manuell", other: "Andere" },
    },
    en: {
        kicker: "Direct channel",
        heroTitle: "Report a defect directly",
        heroText: "Describe what went wrong. STATS attaches versions and the matching log excerpts of the last hours automatically – no e-mail address, no location, no credentials.",
        heroBadge: "No contact data",
        formTitle: "Your report",
        product: "Affected product",
        environment: "Environment",
        installation: "Installation",
        choose: "Please select",
        title: "Title",
        titleHint: "Short and specific, e.g. “Tomorrow's forecast stays at 0 kWh”",
        expected: "Expected behaviour",
        actual: "Actual behaviour",
        steps: "Steps to reproduce",
        stepsHint: "What did you do before the defect appeared? A time of day helps to find it in the log.",
        window: "Log window",
        windowHours: "{hours} h",
        minChars: "min. {count}",
        consent: "I have checked the preview and agree that these details are transferred together with the log excerpt to solarforecastml.com and stored there until processed, for at most 90 days. No contact data is transferred and I have not entered any personal data in the free text. I understand that the developer cannot contact me and that I have to follow the status of my report myself in the bug tracker at solarforecastml.com.",
        submit: "Send report",
        sending: "Sending report …",
        previewTitle: "What will be sent",
        previewText: "Collected automatically and already cleaned. Coordinates, e-mail addresses, IP addresses and keys are replaced before transfer.",
        refresh: "Refresh preview",
        loading: "Assembling the log excerpt …",
        haCore: "Home Assistant",
        hostOs: "Host system",
        install: "Installation type",
        integrations: "Integrations",
        haLog: "HA log",
        sfmlLog: "SFML log",
        records: "{kept} of {total} records",
        unavailable: "not available",
        redactions: "Cleaned",
        size: "Size",
        showLog: "Show log excerpt",
        hideLog: "Hide log excerpt",
        moreLines: "… {count} more lines – included in full in the report",
        showAll: "Show all lines",
        showLess: "Show less",
        successTitle: "Thank you – your report has arrived.",
        successText: "It was recorded under this reference. Write it down: it is the only key to your report, no confirmation is sent.",
        successTracker: "Confirmed defects appear with status and fixed version in the public bug tracker.",
        openTracker: "Open bug tracker",
        another: "Enter another report",
        previewFailed: "The preview could not be created.",
        retry: "Try again",
        characters: "{count} characters",
        errors: {
            cooldown: "Please wait a few minutes before sending another report.",
            submission_in_progress: "A report is being sent right now.",
            rate_limited: "The website is not accepting further reports from this address at the moment. Please try again later.",
            too_large: "The log excerpt is too large. Choose a shorter window.",
            offline: "solarforecastml.com cannot be reached from this installation right now.",
            unavailable: "The website is temporarily unavailable. Please try again later.",
            rejected: "The website rejected the report. Check the entries and try again.",
            invalid_field: "Please check the highlighted fields.",
            confirmation_required: "Please confirm the consent.",
            same_origin_required: "Reports can only be sent from the Home Assistant interface.",
            local_access_required: "Only available through the local Home Assistant interface or Home Assistant Cloud.",
            authentication_required: "Please sign in to Home Assistant.",
            default: "The report could not be sent.",
        },
        fieldErrors: {
            title: "Title: 5 to 180 characters.",
            expected: "Expected behaviour: 10 to 2000 characters.",
            actual: "Actual behaviour: 10 to 2000 characters.",
            steps: "Steps: 10 to 5000 characters.",
            provider: "Please choose a product.",
            environment: "Please choose an environment.",
            installation: "Please choose an installation type.",
            privacy: "Please confirm the consent.",
        },
        providers: { sfml: "Solar Forecast ML", stats: "SFML STATS", eai: "Energy AI (EAI)", gpm: "Grid Price Monitor", wfai: "Weather Fusion AI" },
        environments: { "bare-metal-x86": "Bare Metal (x86)", proxmox: "Proxmox", arm: "ARM (Raspberry Pi, Home Assistant Green)", vm: "Virtual machine", docker: "Docker", other: "Other" },
        installations: { hacs: "HACS", "addon-store": "Add-on Store", manual: "Manual", other: "Other" },
    },
};

const supportInterpolate = (text, params = {}) => String(text).replace(/\{(\w+)\}/g, (_match, key) => (params[key] ?? `{${key}}`));

const ModernSupportPage = {
    name: "ModernSupportPage",
    props: {
        liveData: { type: Object, default: () => ({}) },
        config: { type: Object, default: () => ({}) },
        initialSection: { type: String, default: "" },
    },
    emits: ["navigate"],
    setup() {
        const { ref, reactive, computed, onMounted } = Vue;
        const locale = window.SFMLI18n?.current === "de" ? "de" : "en";
        const copy = SUPPORT_COPY[locale];
        const numberFormat = new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB");

        const previewLoading = ref(false);
        const previewError = ref("");
        const preview = ref(null);
        const logOpen = ref(false);
        const logExpanded = ref(false);
        const sending = ref(false);
        const sendError = ref("");
        const fieldError = ref("");
        const result = ref(null);
        const attempted = ref(false);
        const windowHours = ref(24);
        const form = reactive({
            provider: "",
            environment: "",
            installation: "",
            title: "",
            expected: "",
            actual: "",
            steps: "",
            privacy: false,
        });

        const context = computed(() => preview.value?.context || null);
        const stats = computed(() => preview.value?.stats || null);
        const providers = computed(() => context.value?.providers || ["sfml", "stats"]);
        const trackerUrl = computed(() => context.value?.tracker_urls?.[locale] || result.value?.tracker_url || "");
        const redactionSummary = computed(() => {
            const entries = Object.entries(stats.value?.redactions || {}).filter(([, count]) => count > 0);
            if (!entries.length) return "–";
            return entries.map(([name, count]) => `${count} × ${name.replace("_", " ")}`).join(" · ");
        });
        const logLines = computed(() => (preview.value?.logs || "").split("\n"));
        const visibleLog = computed(() => {
            const lines = logLines.value;
            if (logExpanded.value || lines.length <= SUPPORT_PREVIEW_LINES) return lines.join("\n");
            return lines.slice(0, SUPPORT_PREVIEW_LINES).join("\n");
        });
        const hiddenLineCount = computed(() => Math.max(0, logLines.value.length - SUPPORT_PREVIEW_LINES));
        const sizeLabel = computed(() => {
            const characters = Number(stats.value?.characters || 0);
            const kilobytes = characters / 1024;
            return `${numberFormat.format(kilobytes >= 100 ? Math.round(kilobytes) : Math.round(kilobytes * 10) / 10)} KB · ${supportInterpolate(copy.characters, { count: numberFormat.format(characters) })}`;
        });

        const textLength = (name) => form[name].trim().length;
        const textValid = (name) => {
            const [minimum, maximum] = SUPPORT_TEXT_RULES[name];
            const length = textLength(name);
            return length >= minimum && length <= maximum;
        };
        const invalidFields = () => {
            const names = [];
            if (!providers.value.includes(form.provider)) names.push("provider");
            if (!form.environment) names.push("environment");
            if (!form.installation) names.push("installation");
            for (const name of Object.keys(SUPPORT_TEXT_RULES)) {
                if (!textValid(name)) names.push(name);
            }
            if (form.privacy !== true) names.push("privacy");
            return names;
        };
        const highlighted = computed(() => new Set(attempted.value ? invalidFields() : []));
        const isInvalid = (name) => highlighted.value.has(name) || fieldError.value === name;
        const counter = (name) => {
            const [minimum, maximum] = SUPPORT_TEXT_RULES[name];
            const length = textLength(name);
            const base = `${length}/${maximum}`;
            return length < minimum ? `${base} · ${supportInterpolate(copy.minChars, { count: minimum })}` : base;
        };
        // Only transport states disable the button; validation problems are shown on the fields.
        const canSubmit = computed(() => !sending.value && !previewLoading.value && !!preview.value);

        function recordsLabel(section) {
            const block = stats.value?.[section];
            if (!block || !block.available) return copy.unavailable;
            return supportInterpolate(copy.records, {
                kept: numberFormat.format(block.kept),
                total: numberFormat.format(block.total),
            });
        }

        function stateClass(state) {
            if (!state) return "";
            if (state.startsWith("loaded")) return "ok";
            if (state.startsWith("not_")) return "muted";
            return "warn";
        }

        function errorMessage(error) {
            const code = error?.code || "";
            if (code === "invalid_field" && error?.field && copy.fieldErrors[error.field]) {
                fieldError.value = error.field;
                return copy.fieldErrors[error.field];
            }
            return copy.errors[code] || error?.message || copy.errors.default;
        }

        async function loadPreview() {
            previewLoading.value = true;
            previewError.value = "";
            try {
                const response = await SFMLApi.fetch(
                    `${SUPPORT_PREVIEW_ENDPOINT}?hours=${windowHours.value}`,
                    { forceRefresh: true, ttl: 0, authenticated: true }
                );
                const data = response?.data || response;
                if (!data || typeof data.logs !== "string") throw new Error(copy.previewFailed);
                preview.value = data;
                if (!form.provider && data.context?.providers?.length) form.provider = data.context.providers[0];
                if (!form.environment && data.context?.environment_guess) form.environment = data.context.environment_guess;
                if (!form.installation && data.context?.installation_guess) form.installation = data.context.installation_guess;
            } catch (error) {
                preview.value = null;
                previewError.value = errorMessage(error) || copy.previewFailed;
            } finally {
                previewLoading.value = false;
            }
        }

        function setWindow(hours) {
            if (!SUPPORT_WINDOW_CHOICES.includes(hours) || hours === windowHours.value) return;
            windowHours.value = hours;
            logExpanded.value = false;
            loadPreview();
        }

        async function submit() {
            sendError.value = "";
            fieldError.value = "";
            attempted.value = true;
            const [first] = invalidFields();
            if (first) {
                sendError.value = copy.fieldErrors[first] || copy.errors.invalid_field;
                return;
            }
            sending.value = true;
            try {
                const response = await SFMLApi.postAuthenticated(SUPPORT_REPORT_ENDPOINT, {
                    provider: form.provider,
                    environment: form.environment,
                    installation: form.installation,
                    title: form.title.trim(),
                    expected: form.expected.trim(),
                    actual: form.actual.trim(),
                    steps: form.steps.trim(),
                    language: locale,
                    privacy: true,
                    hours: windowHours.value,
                });
                const data = response?.data || response;
                if (!data?.reference_id) throw new Error(copy.errors.default);
                result.value = data;
            } catch (error) {
                sendError.value = errorMessage(error);
            } finally {
                sending.value = false;
            }
        }

        function reset() {
            result.value = null;
            sendError.value = "";
            fieldError.value = "";
            attempted.value = false;
            form.title = "";
            form.expected = "";
            form.actual = "";
            form.steps = "";
            form.privacy = false;
            logOpen.value = false;
            logExpanded.value = false;
            loadPreview();
        }

        onMounted(loadPreview);

        return {
            copy, locale, form, preview, previewLoading, previewError, context, stats, providers,
            windowHours, windowChoices: SUPPORT_WINDOW_CHOICES, logOpen, logExpanded, visibleLog,
            hiddenLineCount, sizeLabel, redactionSummary, sending, sendError, fieldError, result,
            trackerUrl, canSubmit, textLength, textValid, isInvalid, counter, rules: SUPPORT_TEXT_RULES,
            recordsLabel, stateClass, loadPreview, setWindow, submit, reset, interpolate: supportInterpolate,
        };
    },
    template: `
        <div class="support-page">
            <section class="support-hero">
                <div>
                    <div class="support-kicker">{{ copy.kicker }}</div>
                    <h2>{{ copy.heroTitle }}</h2>
                    <p>{{ copy.heroText }}</p>
                </div>
                <span class="support-badge">{{ copy.heroBadge }}</span>
            </section>

            <section v-if="result" class="support-card support-success" aria-live="polite">
                <div class="support-kicker">{{ copy.successTitle }}</div>
                <div class="support-reference">{{ result.reference_id }}</div>
                <p>{{ copy.successText }}</p>
                <p>{{ copy.successTracker }}</p>
                <div class="support-actions">
                    <a v-if="trackerUrl" class="button" :href="trackerUrl" target="_blank" rel="noopener noreferrer">{{ copy.openTracker }}</a>
                    <button type="button" class="button secondary" @click="reset">{{ copy.another }}</button>
                </div>
            </section>

            <div v-else class="support-grid">
                <form class="support-card support-form" novalidate @submit.prevent="submit">
                    <h3>{{ copy.formTitle }}</h3>

                    <div class="support-row">
                        <label :class="{ invalid: isInvalid('provider') }">
                            <span>{{ copy.product }}</span>
                            <select v-model="form.provider" required>
                                <option value="" disabled>{{ copy.choose }}</option>
                                <option v-for="code in providers" :key="code" :value="code">{{ copy.providers[code] || code }}</option>
                            </select>
                        </label>
                        <label :class="{ invalid: isInvalid('environment') }">
                            <span>{{ copy.environment }}</span>
                            <select v-model="form.environment" required>
                                <option value="" disabled>{{ copy.choose }}</option>
                                <option v-for="(label, code) in copy.environments" :key="code" :value="code">{{ label }}</option>
                            </select>
                        </label>
                        <label :class="{ invalid: isInvalid('installation') }">
                            <span>{{ copy.installation }}</span>
                            <select v-model="form.installation" required>
                                <option value="" disabled>{{ copy.choose }}</option>
                                <option v-for="(label, code) in copy.installations" :key="code" :value="code">{{ label }}</option>
                            </select>
                        </label>
                    </div>

                    <label :class="{ invalid: isInvalid('title') }">
                        <span>{{ copy.title }} <small :class="{ short: !textValid('title') }">{{ counter('title') }}</small></span>
                        <input v-model="form.title" type="text" :maxlength="rules.title[1]" :placeholder="copy.titleHint" required>
                    </label>
                    <div class="support-row support-row-2">
                        <label :class="{ invalid: isInvalid('expected') }">
                            <span>{{ copy.expected }} <small :class="{ short: !textValid('expected') }">{{ counter('expected') }}</small></span>
                            <textarea v-model="form.expected" rows="5" :maxlength="rules.expected[1]" required></textarea>
                        </label>
                        <label :class="{ invalid: isInvalid('actual') }">
                            <span>{{ copy.actual }} <small :class="{ short: !textValid('actual') }">{{ counter('actual') }}</small></span>
                            <textarea v-model="form.actual" rows="5" :maxlength="rules.actual[1]" required></textarea>
                        </label>
                    </div>
                    <label :class="{ invalid: isInvalid('steps') }">
                        <span>{{ copy.steps }} <small :class="{ short: !textValid('steps') }">{{ counter('steps') }}</small></span>
                        <textarea v-model="form.steps" rows="6" :maxlength="rules.steps[1]" :placeholder="copy.stepsHint" required></textarea>
                    </label>

                    <div class="support-window" role="group" :aria-label="copy.window">
                        <span>{{ copy.window }}</span>
                        <div class="support-segments">
                            <button v-for="hours in windowChoices" :key="hours" type="button"
                                    :class="{ active: windowHours === hours }" :disabled="previewLoading"
                                    @click="setWindow(hours)">{{ interpolate(copy.windowHours, { hours }) }}</button>
                        </div>
                    </div>

                    <label class="support-consent" :class="{ invalid: isInvalid('privacy') }">
                        <input v-model="form.privacy" type="checkbox">
                        <span>{{ copy.consent }}</span>
                    </label>

                    <div v-if="sendError" class="support-state error" role="alert">{{ sendError }}</div>

                    <div class="support-actions">
                        <button type="submit" class="button" :disabled="!canSubmit">
                            <span v-if="sending" class="loading-indicator" aria-hidden="true"></span>
                            {{ sending ? copy.sending : copy.submit }}
                        </button>
                    </div>
                </form>

                <aside class="support-card support-preview">
                    <div class="support-preview-heading">
                        <div>
                            <h3>{{ copy.previewTitle }}</h3>
                            <p>{{ copy.previewText }}</p>
                        </div>
                        <button type="button" class="button secondary compact" :disabled="previewLoading" @click="loadPreview">{{ copy.refresh }}</button>
                    </div>

                    <div v-if="previewLoading" class="support-state" role="status" aria-live="polite">
                        <span class="loading-indicator" aria-hidden="true"></span>{{ copy.loading }}
                    </div>
                    <div v-else-if="previewError" class="support-state error" role="alert">
                        <span>{{ previewError }}</span>
                        <button type="button" class="button secondary compact" @click="loadPreview">{{ copy.retry }}</button>
                    </div>

                    <template v-else-if="preview">
                        <dl class="support-facts">
                            <div><dt>{{ copy.haCore }}</dt><dd>{{ context.ha_core_version }}</dd></div>
                            <div><dt>{{ copy.hostOs }}</dt><dd>{{ context.host_os || '–' }}</dd></div>
                            <div><dt>{{ copy.install }}</dt><dd>{{ context.installation_type || '–' }} · {{ context.arch || '–' }}</dd></div>
                            <div><dt>{{ copy.haLog }}</dt><dd>{{ recordsLabel('ha') }}</dd></div>
                            <div><dt>{{ copy.sfmlLog }}</dt><dd>{{ recordsLabel('sfml') }}</dd></div>
                            <div><dt>{{ copy.redactions }}</dt><dd>{{ redactionSummary }}</dd></div>
                            <div><dt>{{ copy.size }}</dt><dd>{{ sizeLabel }}</dd></div>
                        </dl>

                        <div class="support-integrations">
                            <span class="support-facts-label">{{ copy.integrations }}</span>
                            <ul>
                                <li v-for="item in context.integrations" :key="item.domain">
                                    <code>{{ item.domain }}</code>
                                    <strong>{{ item.version }}</strong>
                                    <em :class="stateClass(item.state)">{{ item.state }}</em>
                                </li>
                            </ul>
                        </div>

                        <button type="button" class="support-toggle" :aria-expanded="logOpen ? 'true' : 'false'" @click="logOpen = !logOpen">
                            {{ logOpen ? copy.hideLog : copy.showLog }}
                        </button>
                        <div v-if="logOpen" class="support-log">
                            <pre>{{ visibleLog }}</pre>
                            <div v-if="hiddenLineCount > 0" class="support-log-more">
                                <span v-if="!logExpanded">{{ interpolate(copy.moreLines, { count: hiddenLineCount }) }}</span>
                                <button type="button" class="button secondary compact" @click="logExpanded = !logExpanded">
                                    {{ logExpanded ? copy.showLess : copy.showAll }}
                                </button>
                            </div>
                        </div>
                    </template>
                </aside>
            </div>
        </div>
    `,
};

window.ModernSupportPage = ModernSupportPage;
