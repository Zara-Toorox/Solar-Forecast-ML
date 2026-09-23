// Solar Command Center — Hybrid Forecast Page
// (C) 2026 Zara-Toorox

const HybridForecastPage = ((Vue) => {
    const { ref, reactive, computed, onMounted } = Vue;

    const ENDPOINT = "/api/sfml_stats/hybrid_forecast";
    const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    const MODE_LABEL_KEYS = {
        standard: "hybrid_forecast.modes.standard",
        standard_midday: "hybrid_forecast.modes.standard_midday",
        standard_midday_afternoon: "hybrid_forecast.modes.standard_midday_afternoon",
        custom_time: "hybrid_forecast.modes.custom_time",
    };

    function t(key, params) {
        return window.SFMLI18n ? window.SFMLI18n.t(key, params) : key;
    }

    function knownNonAdmin() {
        try {
            if (window.parent === window || window.top !== window.parent) return false;
            const user = window.parent.document.querySelector("home-assistant")?.hass?.user;
            if (!user) return false;
            return user.is_admin !== true;
        } catch (_error) {
            return false;
        }
    }

    function numericOrNull(value) {
        if (value == null || value === "") return null;
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    }

    const style = document.createElement("style");
    style.textContent = `
        .page-hybrid-forecast .hf-lead {
            color: var(--text-secondary);
            margin: 0 0 var(--space-lg);
            max-width: 46rem;
        }
        .page-hybrid-forecast .hf-card {
            margin-bottom: var(--space-lg);
        }
        .page-hybrid-forecast .hf-state {
            margin: 0 0 var(--space-md);
            padding: var(--space-md);
            border-radius: var(--radius-md);
            line-height: 1.45;
        }
        .page-hybrid-forecast .hf-state-normal {
            background: rgba(46, 160, 67, 0.12);
            color: var(--text-primary);
        }
        .page-hybrid-forecast .hf-state-on {
            background: rgba(0, 210, 255, 0.08);
            color: var(--text-primary);
        }
        .page-hybrid-forecast .hf-facts,
        .page-hybrid-forecast .hf-compare {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
            gap: var(--space-md);
            margin: 0;
        }
        .page-hybrid-forecast .hf-facts div,
        .page-hybrid-forecast .hf-compare div {
            min-width: 0;
        }
        .page-hybrid-forecast dt {
            color: var(--text-muted);
            font-size: 0.75rem;
            letter-spacing: 0.04em;
            text-transform: uppercase;
        }
        .page-hybrid-forecast dd {
            margin: 0.2rem 0 0;
            font-weight: 600;
        }
        .page-hybrid-forecast .hf-note {
            margin: var(--space-md) 0 0;
            color: var(--text-secondary);
        }
        .page-hybrid-forecast .hf-table-wrap {
            overflow-x: auto;
        }
        .page-hybrid-forecast table {
            width: 100%;
            border-collapse: collapse;
        }
        .page-hybrid-forecast th,
        .page-hybrid-forecast td {
            text-align: left;
            padding: 0.45rem 0.6rem;
            border-bottom: 1px solid var(--border-default);
            white-space: nowrap;
        }
        .page-hybrid-forecast th {
            color: var(--text-muted);
            font-size: 0.75rem;
            font-weight: 600;
        }
        .page-hybrid-forecast .hf-form {
            display: grid;
            gap: var(--space-md);
            max-width: 28rem;
        }
        .page-hybrid-forecast label {
            display: grid;
            gap: 0.35rem;
        }
        .page-hybrid-forecast .hf-check {
            display: flex;
            align-items: center;
            gap: 0.6rem;
        }
        .page-hybrid-forecast select,
        .page-hybrid-forecast input[type="text"] {
            background: var(--bg-input, var(--bg-card));
            color: var(--text-primary);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-sm, 6px);
            padding: 0.45rem 0.6rem;
        }
        .page-hybrid-forecast .hf-notice {
            margin: 0 0 var(--space-md);
            padding: 0.7rem 0.85rem;
            border-radius: var(--radius-md);
        }
        .page-hybrid-forecast .hf-notice-error {
            background: rgba(255, 80, 80, 0.12);
        }
        .page-hybrid-forecast .hf-notice-ok {
            background: rgba(46, 160, 67, 0.12);
        }
        .page-hybrid-forecast .hf-notice-info {
            background: rgba(0, 210, 255, 0.08);
        }
    `;
    document.head.appendChild(style);

    const _HybridForecastPage = {
        props: ["liveData", "config"],
        emits: ["navigate"],
        setup() {
            const loaded = ref(false);
            const loadError = ref("");
            const settings = ref(null);
            const runs = ref([]);
            const morningAnchor = ref(null);
            const currentKwh = ref(null);
            const dateLabel = ref("");
            const form = reactive({
                enabled: false,
                mode: "standard",
                customTime: "",
            });
            const saving = ref(false);
            const canWrite = ref(true);
            const notice = ref(null);

            const difference = computed(() => {
                const left = numericOrNull(morningAnchor.value);
                const right = numericOrNull(currentKwh.value);
                if (left == null || right == null) return null;
                return Math.round((right - left) * 1000) / 1000;
            });
            const unchanged = computed(() => difference.value === 0);

            function applySettings(stored) {
                const next = {
                    mode: stored && stored.mode ? stored.mode : "standard",
                    custom_time: stored && stored.custom_time ? stored.custom_time : null,
                    enabled: !!(stored && stored.enabled === true),
                    updated_at: stored && stored.updated_at ? stored.updated_at : null,
                    updated_by: stored && stored.updated_by ? stored.updated_by : null,
                };
                settings.value = next;
                form.enabled = next.enabled;
                form.mode = Object.prototype.hasOwnProperty.call(MODE_LABEL_KEYS, next.mode)
                    ? next.mode
                    : "standard";
                form.customTime = next.custom_time || "";
            }

            function applyPayload(data) {
                applySettings(data && data.settings);
                runs.value = Array.isArray(data && data.runs_today) ? data.runs_today : [];
                morningAnchor.value = data ? data.morning_anchor_kwh : null;
                currentKwh.value = data ? data.current_kwh : null;
                dateLabel.value = (data && data.date) || "";
            }

            async function loadState() {
                try {
                    const data = await SFMLApi.fetch(ENDPOINT, { forceRefresh: true, ttl: 0 });
                    if (!data || data.success === false) {
                        throw new Error("load");
                    }
                    applyPayload(data);
                    loaded.value = true;
                    loadError.value = "";
                } catch (_error) {
                    if (!loaded.value) {
                        loadError.value = t("hybrid_forecast.loadFailed");
                    }
                }
            }

            function modeLabel(mode) {
                const key = MODE_LABEL_KEYS[mode];
                return key ? t(key) : (mode || t("hybrid_forecast.notSet"));
            }

            function formatKwh(value) {
                const number = numericOrNull(value);
                if (number == null) return t("hybrid_forecast.noNumber");
                return number.toFixed(2) + " " + t("hybrid_forecast.kwh");
            }

            function formatDifference(value) {
                if (value == null) return t("hybrid_forecast.noNumber");
                const prefix = value > 0 ? "+" : "";
                return prefix + value.toFixed(2) + " " + t("hybrid_forecast.kwh");
            }

            function formatStamp(value) {
                if (!value) return t("hybrid_forecast.notSet");
                const parsed = new Date(value);
                if (Number.isNaN(parsed.getTime())) return String(value);
                return parsed.toLocaleString();
            }

            function formatCutoff(value) {
                if (value == null || value === "") return t("hybrid_forecast.noCutoff");
                return String(value);
            }

            function saveErrorText(err) {
                const raw = err && err.body && err.body.error;
                const code = (err && err.code)
                    || (typeof raw === "string" ? raw : (raw && raw.code))
                    || "";
                if (code === "not_applied") {
                    return { lock: false, text: t("hybrid_forecast.notApplied") };
                }
                if (code === "admin_required" || code === "unauthorized") {
                    return { lock: true, text: t("hybrid_forecast.adminRequired") };
                }
                if (
                    code === "local_access_required"
                    || code === "local_write_required"
                    || code === "authentication_required"
                ) {
                    return { lock: true, text: t("hybrid_forecast.localRequired") };
                }
                if (code === "service_unavailable" || code === "service_call_failed") {
                    return { lock: false, text: t("hybrid_forecast.serviceUnavailable") };
                }
                const errors = (err && err.errors) || (err && err.body && err.body.errors) || {};
                if (errors.custom_time || code === "invalid_custom_time") {
                    return { lock: false, text: t("hybrid_forecast.invalidTime") };
                }
                return { lock: false, text: t("hybrid_forecast.saveFailed") };
            }

            function restoreForm() {
                if (!settings.value) return;
                form.enabled = settings.value.enabled;
                form.mode = Object.prototype.hasOwnProperty.call(MODE_LABEL_KEYS, settings.value.mode)
                    ? settings.value.mode
                    : "standard";
                form.customTime = settings.value.custom_time || "";
            }

            async function save() {
                if (!canWrite.value || saving.value) return;
                if (form.mode === "custom_time" && !TIME_PATTERN.test(form.customTime || "")) {
                    notice.value = { kind: "error", text: t("hybrid_forecast.invalidTime") };
                    return;
                }
                const payload = {
                    mode: form.mode,
                    enabled: form.enabled === true,
                };
                if (form.mode === "custom_time") payload.custom_time = form.customTime;
                saving.value = true;
                try {
                    const data = await SFMLApi.postAuthenticated(ENDPOINT, payload);
                    if (!data || data.success !== true || data.error === "not_applied") {
                        notice.value = { kind: "error", text: t("hybrid_forecast.notApplied") };
                        restoreForm();
                        return;
                    }
                    notice.value = { kind: "ok", text: t("hybrid_forecast.saved") };
                    if (data.settings) applySettings(data.settings);
                    await loadState();
                } catch (err) {
                    const mapped = saveErrorText(err);
                    notice.value = { kind: "error", text: mapped.text };
                    if (mapped.lock) canWrite.value = false;
                    if (err && err.code === "not_applied") restoreForm();
                } finally {
                    saving.value = false;
                }
            }

            onMounted(() => {
                if (knownNonAdmin()) {
                    canWrite.value = false;
                    notice.value = { kind: "info", text: t("hybrid_forecast.adminRequired") };
                }
                loadState();
            });

            return {
                loaded,
                loadError,
                settings,
                runs,
                morningAnchor,
                currentKwh,
                dateLabel,
                form,
                saving,
                canWrite,
                notice,
                difference,
                unchanged,
                modes: Object.keys(MODE_LABEL_KEYS),
                modeLabel,
                formatKwh,
                formatDifference,
                formatStamp,
                formatCutoff,
                save,
            };
        },
        template: `
            <div class="page page-hybrid-forecast">
                <div class="section-header">
                    <h2 class="section-title">{{ $t('nav.hybridForecast') }}</h2>
                </div>
                <p class="hf-lead">{{ $t('hybrid_forecast.lead') }}</p>
                <p v-if="loadError" class="hf-notice hf-notice-error" role="alert">{{ loadError }}</p>
                <p v-if="notice" class="hf-notice" :class="'hf-notice-' + notice.kind" role="status">{{ notice.text }}</p>

                <div v-if="settings" class="chart-card hf-card">
                    <div class="chart-header">
                        <span class="chart-title">{{ $t('hybrid_forecast.whatApplies') }}</span>
                    </div>
                    <p class="hf-state" :class="settings.enabled ? 'hf-state-on' : 'hf-state-normal'">
                        {{ settings.enabled ? $t('hybrid_forecast.extraRunsOn') : $t('hybrid_forecast.staticNormal') }}
                    </p>
                    <dl class="hf-facts">
                        <div>
                            <dt>{{ $t('hybrid_forecast.mode') }}</dt>
                            <dd>{{ modeLabel(settings.mode) }}</dd>
                        </div>
                        <div>
                            <dt>{{ $t('hybrid_forecast.extraRuns') }}</dt>
                            <dd>{{ settings.enabled ? $t('hybrid_forecast.on') : $t('hybrid_forecast.off') }}</dd>
                        </div>
                        <div v-if="settings.mode === 'custom_time'">
                            <dt>{{ $t('hybrid_forecast.customTime') }}</dt>
                            <dd>{{ settings.custom_time || $t('hybrid_forecast.notSet') }}</dd>
                        </div>
                        <div>
                            <dt>{{ $t('hybrid_forecast.updatedAt') }}</dt>
                            <dd>{{ formatStamp(settings.updated_at) }}</dd>
                        </div>
                        <div>
                            <dt>{{ $t('hybrid_forecast.updatedBy') }}</dt>
                            <dd>{{ settings.updated_by || $t('hybrid_forecast.notSet') }}</dd>
                        </div>
                    </dl>
                </div>

                <div v-if="loaded" class="chart-card hf-card">
                    <div class="chart-header">
                        <span class="chart-title">{{ $t('hybrid_forecast.runsTitle') }}</span>
                    </div>
                    <p class="hf-note" v-if="!runs.length">{{ $t('hybrid_forecast.runsEmpty') }}</p>
                    <div class="hf-table-wrap" v-else>
                        <table>
                            <thead>
                                <tr>
                                    <th>{{ $t('hybrid_forecast.snapshotType') }}</th>
                                    <th>{{ $t('hybrid_forecast.triggerSource') }}</th>
                                    <th>{{ $t('hybrid_forecast.triggeredAt') }}</th>
                                    <th>{{ $t('hybrid_forecast.cutoffHour') }}</th>
                                    <th>{{ $t('hybrid_forecast.status') }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(run, index) in runs" :key="index">
                                    <td>{{ run.snapshot_type || $t('hybrid_forecast.notSet') }}</td>
                                    <td>{{ run.trigger_source || $t('hybrid_forecast.notSet') }}</td>
                                    <td>{{ formatStamp(run.triggered_at) }}</td>
                                    <td>{{ formatCutoff(run.cutoff_hour) }}</td>
                                    <td>{{ run.status || $t('hybrid_forecast.notSet') }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p class="hf-note">{{ $t('hybrid_forecast.runsHint') }}</p>
                </div>

                <div v-if="loaded" class="chart-card hf-card">
                    <div class="chart-header">
                        <span class="chart-title">{{ $t('hybrid_forecast.compareTitle') }}</span>
                    </div>
                    <p class="hf-note" v-if="dateLabel">{{ $t('hybrid_forecast.forDate', { date: dateLabel }) }}</p>
                    <dl class="hf-compare">
                        <div>
                            <dt>{{ $t('hybrid_forecast.morningAnchor') }}</dt>
                            <dd>{{ formatKwh(morningAnchor) }}</dd>
                        </div>
                        <div>
                            <dt>{{ $t('hybrid_forecast.currentValue') }}</dt>
                            <dd>{{ formatKwh(currentKwh) }}</dd>
                        </div>
                        <div>
                            <dt>{{ $t('hybrid_forecast.difference') }}</dt>
                            <dd>{{ formatDifference(difference) }}</dd>
                        </div>
                    </dl>
                    <p class="hf-note" v-if="unchanged">{{ $t('hybrid_forecast.unchanged') }}</p>
                    <p class="hf-note" v-else-if="difference != null">{{ $t('hybrid_forecast.changed') }}</p>
                </div>

                <div v-if="loaded" class="chart-card hf-card">
                    <div class="chart-header">
                        <span class="chart-title">{{ $t('hybrid_forecast.formTitle') }}</span>
                    </div>
                    <form class="hf-form" @submit.prevent="save">
                        <p class="hf-note">{{ $t('hybrid_forecast.purposeHint') }}</p>
                        <label class="hf-check">
                            <input type="checkbox" v-model="form.enabled" :disabled="!canWrite || saving">
                            <span>{{ $t('hybrid_forecast.extraRuns') }} — {{ form.enabled ? $t('hybrid_forecast.on') : $t('hybrid_forecast.off') }}</span>
                        </label>
                        <label>
                            <span>{{ $t('hybrid_forecast.mode') }}</span>
                            <select v-model="form.mode" :disabled="!canWrite || saving">
                                <option v-for="mode in modes" :key="mode" :value="mode">{{ modeLabel(mode) }}</option>
                            </select>
                        </label>
                        <label v-if="form.mode === 'custom_time'">
                            <span>{{ $t('hybrid_forecast.customTime') }}</span>
                            <input type="text" inputmode="numeric" maxlength="5" placeholder="13:30"
                                   v-model="form.customTime" :disabled="!canWrite || saving"
                                   autocomplete="off">
                        </label>
                        <button type="submit" :disabled="!canWrite || saving">
                            {{ saving ? $t('hybrid_forecast.saving') : $t('hybrid_forecast.save') }}
                        </button>
                    </form>
                </div>
            </div>
        `,
    };

    window.HybridForecastPage = _HybridForecastPage;
    return _HybridForecastPage;
})(Vue);
