PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS ai_seasonal_factors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month INTEGER NOT NULL CHECK(month >= 1 AND month <= 12),
    factor REAL NOT NULL,
    sample_count INTEGER DEFAULT 0,
    version TEXT DEFAULT '1.0',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(month)
);

CREATE TABLE IF NOT EXISTS ai_feature_importance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feature_name TEXT NOT NULL,
    importance REAL NOT NULL,
    category TEXT CHECK(category IN ('helpful', 'neutral', 'harmful')),
    baseline_rmse REAL,
    num_samples INTEGER,
    analysis_time_seconds REAL,
    timestamp TIMESTAMP NOT NULL,
    UNIQUE(feature_name, timestamp)
);

CREATE TABLE IF NOT EXISTS ai_grid_search_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    success BOOLEAN NOT NULL,
    hidden_size INTEGER,
    batch_size INTEGER,
    learning_rate REAL,
    accuracy REAL,
    epochs_trained INTEGER,
    final_val_loss REAL,
    duration_seconds REAL,
    is_best_result BOOLEAN DEFAULT FALSE,
    hardware_info TEXT,
    timestamp TIMESTAMP NOT NULL,
    model_type TEXT DEFAULT 'lstm'  -- V16.0.0: track model type @zara
);

CREATE TABLE IF NOT EXISTS ai_dni_tracker (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hour INTEGER NOT NULL CHECK(hour >= 6 AND hour <= 20),
    max_dni REAL DEFAULT 0,
    version TEXT DEFAULT '1.0',
    last_updated DATE,
    UNIQUE(hour)
);

CREATE TABLE IF NOT EXISTS ai_dni_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hour INTEGER NOT NULL,
    dni_value REAL NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hour) REFERENCES ai_dni_tracker(hour) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_learned_weights_meta (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    version TEXT DEFAULT '2.0',
    active_model TEXT NOT NULL DEFAULT 'tiny_lstm',
    training_samples INTEGER,
    last_trained TIMESTAMP,
    accuracy REAL,
    rmse REAL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_ridge_weights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    row_index INTEGER NOT NULL,
    col_index INTEGER NOT NULL,
    weight_value REAL NOT NULL,
    UNIQUE(row_index, col_index)
);

CREATE TABLE IF NOT EXISTS ai_ridge_meta (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    model_type TEXT DEFAULT 'TinyRidge',
    alpha REAL,
    input_size INTEGER,
    hidden_size INTEGER,
    sequence_length INTEGER,
    num_outputs INTEGER,
    flat_size INTEGER,
    trained_samples INTEGER,
    loo_cv_score REAL,
    accuracy REAL,
    rmse REAL,
    feature_means_json TEXT,
    feature_stds_json TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_ridge_normalization (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feature_index INTEGER NOT NULL,
    feature_mean REAL NOT NULL,
    feature_std REAL NOT NULL,
    UNIQUE(feature_index)
);

CREATE TABLE IF NOT EXISTS ai_lstm_weights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weight_type TEXT NOT NULL,
    weight_index INTEGER NOT NULL,
    weight_value REAL NOT NULL,
    UNIQUE(weight_type, weight_index)
);

CREATE TABLE IF NOT EXISTS ai_lstm_meta (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    input_size INTEGER,
    hidden_size INTEGER,
    sequence_length INTEGER,
    num_outputs INTEGER,
    has_attention BOOLEAN DEFAULT FALSE,
    num_layers INTEGER DEFAULT 1,
    num_heads INTEGER DEFAULT 1,
    training_samples INTEGER,
    accuracy REAL,
    rmse REAL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_weather_mlp_weights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weight_type TEXT NOT NULL,
    weight_index INTEGER NOT NULL,
    weight_value REAL NOT NULL,
    UNIQUE(weight_type, weight_index)
);

CREATE TABLE IF NOT EXISTS ai_weather_mlp_meta (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    input_size INTEGER DEFAULT 8,
    hidden1 INTEGER DEFAULT 16,
    hidden2 INTEGER DEFAULT 8,
    training_samples INTEGER DEFAULT 0,
    accuracy REAL DEFAULT 0.0,
    rmse REAL DEFAULT 0.0,
    last_trained TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_model_weights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weight_type TEXT NOT NULL UNIQUE,
    weight_data TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_training_runs (
    run_id TEXT PRIMARY KEY,
    created_at TIMESTAMP NOT NULL,
    dataset_fingerprint TEXT NOT NULL,
    training_config_hash TEXT NOT NULL,
    code_source_hash TEXT NOT NULL,
    sample_count INTEGER NOT NULL,
    config_json TEXT NOT NULL,
    schema_version TEXT NOT NULL,
    eligibility_version TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_training_sample_provenance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    sample_index INTEGER NOT NULL,
    output_index INTEGER NOT NULL,
    forecast_prediction_id TEXT NOT NULL,
    forecast_anchor TEXT NOT NULL,
    target_prediction_id TEXT NOT NULL,
    target_anchor TEXT NOT NULL,
    prediction_lineage_id TEXT,
    group_lineage_id TEXT,
    group_name TEXT,
    target_value REAL NOT NULL,
    feature_digest TEXT NOT NULL,
    provenance_kind TEXT NOT NULL,
    eligibility_version TEXT NOT NULL,
    schema_version TEXT NOT NULL,
    FOREIGN KEY(run_id) REFERENCES ai_training_runs(run_id),
    UNIQUE(run_id, sample_index, output_index)
);

CREATE TABLE IF NOT EXISTS ai_model_candidates (
    candidate_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    active_model TEXT NOT NULL,
    training_samples INTEGER NOT NULL,
    accuracy REAL,
    rmse REAL,
    artifact_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'candidate',
    FOREIGN KEY(run_id) REFERENCES ai_training_runs(run_id)
);

CREATE TABLE IF NOT EXISTS ai_model_candidate_artifacts (
    candidate_id TEXT NOT NULL,
    model_type TEXT NOT NULL,
    weights_json TEXT NOT NULL,
    weights_hash TEXT NOT NULL,
    PRIMARY KEY(candidate_id, model_type),
    FOREIGN KEY(candidate_id) REFERENCES ai_model_candidates(candidate_id)
);

CREATE TABLE IF NOT EXISTS ai_active_model_pointer (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    active_candidate_id TEXT,
    last_known_good_candidate_id TEXT,
    promoted_at TIMESTAMP,
    FOREIGN KEY(active_candidate_id) REFERENCES ai_model_candidates(candidate_id),
    FOREIGN KEY(last_known_good_candidate_id) REFERENCES ai_model_candidates(candidate_id)
);

CREATE TABLE IF NOT EXISTS ai_model_evaluations (
    evaluation_id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    candidate_artifact_hash TEXT NOT NULL,
    champion_artifact_hash TEXT NOT NULL,
    dataset_fingerprint TEXT NOT NULL,
    evaluation_config_hash TEXT NOT NULL,
    decision TEXT NOT NULL CHECK(decision IN ('GO', 'NO_GO')),
    reason_codes_json TEXT NOT NULL,
    eligible_hour_count INTEGER NOT NULL,
    eligible_independent_day_count INTEGER NOT NULL,
    evaluation_config_json TEXT NOT NULL,
    decision_json TEXT NOT NULL,
    decision_hash TEXT NOT NULL,
    FOREIGN KEY(candidate_id) REFERENCES ai_model_candidates(candidate_id)
);

CREATE TABLE IF NOT EXISTS ai_model_evaluation_samples (
    evaluation_id TEXT NOT NULL,
    sample_index INTEGER NOT NULL,
    target_date TEXT NOT NULL,
    target_hour INTEGER NOT NULL CHECK(target_hour BETWEEN 0 AND 23),
    actual REAL NOT NULL,
    champion_prediction REAL NOT NULL,
    candidate_prediction REAL NOT NULL,
    clean_eligible INTEGER NOT NULL CHECK(clean_eligible IN (0, 1)),
    forecast_anchor TEXT NOT NULL,
    input_fingerprint TEXT NOT NULL,
    policy_fingerprint TEXT NOT NULL,
    weather_regime TEXT,
    horizon TEXT,
    PRIMARY KEY(evaluation_id, sample_index),
    UNIQUE(evaluation_id, target_date, target_hour),
    FOREIGN KEY(evaluation_id) REFERENCES ai_model_evaluations(evaluation_id)
);

CREATE TABLE IF NOT EXISTS ai_model_shadow_runs (
    shadow_run_id TEXT PRIMARY KEY,
    morning_batch_id TEXT NOT NULL UNIQUE,
    run_date TEXT NOT NULL,
    candidate_id TEXT NOT NULL,
    forecast_anchor TEXT NOT NULL,
    champion_artifact_hash TEXT NOT NULL,
    candidate_artifact_hash TEXT NOT NULL,
    input_snapshot_json TEXT NOT NULL,
    input_snapshot_hash TEXT NOT NULL,
    policy_snapshot_json TEXT NOT NULL,
    policy_snapshot_hash TEXT NOT NULL,
    contract_version TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    FOREIGN KEY(morning_batch_id) REFERENCES ensemble_shadow_batches(morning_batch_id),
    FOREIGN KEY(candidate_id) REFERENCES ai_model_candidates(candidate_id)
);

CREATE TABLE IF NOT EXISTS ai_model_shadow_predictions (
    shadow_prediction_id TEXT PRIMARY KEY,
    shadow_run_id TEXT NOT NULL,
    source_prediction_id TEXT NOT NULL,
    target_date TEXT NOT NULL,
    target_hour INTEGER NOT NULL CHECK(target_hour BETWEEN 0 AND 23),
    horizon TEXT NOT NULL,
    champion_prediction REAL NOT NULL,
    candidate_prediction REAL NOT NULL,
    weather_regime TEXT,
    input_fingerprint TEXT NOT NULL,
    policy_fingerprint TEXT NOT NULL,
    champion_result_json TEXT NOT NULL,
    champion_result_hash TEXT NOT NULL,
    candidate_result_json TEXT NOT NULL,
    candidate_result_hash TEXT NOT NULL,
    UNIQUE(shadow_run_id, target_date, target_hour),
    FOREIGN KEY(shadow_run_id) REFERENCES ai_model_shadow_runs(shadow_run_id)
);

CREATE TABLE IF NOT EXISTS ai_model_shadow_actual_versions (
    actual_version_id TEXT PRIMARY KEY,
    shadow_prediction_id TEXT NOT NULL,
    evaluation_version INTEGER NOT NULL,
    actual_fingerprint TEXT NOT NULL,
    evaluated_at TIMESTAMP NOT NULL,
    actual_kwh REAL,
    actual_measured_at TIMESTAMP,
    clean_eligible INTEGER NOT NULL CHECK(clean_eligible IN (0, 1)),
    exclusion_reason TEXT,
    evaluation_status TEXT NOT NULL,
    UNIQUE(shadow_prediction_id, actual_fingerprint),
    UNIQUE(shadow_prediction_id, evaluation_version),
    FOREIGN KEY(shadow_prediction_id)
        REFERENCES ai_model_shadow_predictions(shadow_prediction_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_training_provenance_run
ON ai_training_sample_provenance(run_id);

CREATE INDEX IF NOT EXISTS idx_ai_model_evaluations_candidate
ON ai_model_evaluations(candidate_id, created_at);

CREATE INDEX IF NOT EXISTS idx_ai_model_shadow_candidate
ON ai_model_shadow_runs(candidate_id, run_date);

CREATE INDEX IF NOT EXISTS idx_ai_model_shadow_source
ON ai_model_shadow_predictions(source_prediction_id);

CREATE TRIGGER IF NOT EXISTS ai_training_runs_append_only_update
BEFORE UPDATE ON ai_training_runs
BEGIN
    SELECT RAISE(ABORT, 'ai_training_runs is append-only');
END;

CREATE TRIGGER IF NOT EXISTS ai_training_runs_append_only_delete
BEFORE DELETE ON ai_training_runs
BEGIN
    SELECT RAISE(ABORT, 'ai_training_runs is append-only');
END;

CREATE TRIGGER IF NOT EXISTS ai_training_runs_append_only_insert_guard
BEFORE INSERT ON ai_training_runs
WHEN EXISTS (
    SELECT 1 FROM ai_training_runs WHERE run_id = NEW.run_id
)
BEGIN
    SELECT RAISE(ABORT, 'ai_training_runs is append-only');
END;

CREATE TRIGGER IF NOT EXISTS ai_training_sample_provenance_append_only_update
BEFORE UPDATE ON ai_training_sample_provenance
BEGIN
    SELECT RAISE(ABORT, 'ai_training_sample_provenance is append-only');
END;

CREATE TRIGGER IF NOT EXISTS ai_training_sample_provenance_append_only_delete
BEFORE DELETE ON ai_training_sample_provenance
BEGIN
    SELECT RAISE(ABORT, 'ai_training_sample_provenance is append-only');
END;

CREATE TRIGGER IF NOT EXISTS ai_training_sample_provenance_append_only_insert_guard
BEFORE INSERT ON ai_training_sample_provenance
WHEN EXISTS (
    SELECT 1 FROM ai_training_sample_provenance
    WHERE id = NEW.id
       OR (run_id = NEW.run_id
           AND sample_index = NEW.sample_index
           AND output_index = NEW.output_index)
)
BEGIN
    SELECT RAISE(ABORT, 'ai_training_sample_provenance is append-only');
END;

CREATE TRIGGER IF NOT EXISTS ai_model_candidates_append_only_update
BEFORE UPDATE ON ai_model_candidates
BEGIN
    SELECT RAISE(ABORT, 'ai_model_candidates is append-only');
END;

CREATE TRIGGER IF NOT EXISTS ai_model_candidates_append_only_delete
BEFORE DELETE ON ai_model_candidates
BEGIN
    SELECT RAISE(ABORT, 'ai_model_candidates is append-only');
END;

CREATE TRIGGER IF NOT EXISTS ai_model_candidates_append_only_insert_guard
BEFORE INSERT ON ai_model_candidates
WHEN EXISTS (
    SELECT 1 FROM ai_model_candidates WHERE candidate_id = NEW.candidate_id
)
BEGIN
    SELECT RAISE(ABORT, 'ai_model_candidates is append-only');
END;

CREATE TRIGGER IF NOT EXISTS ai_model_candidate_artifacts_append_only_update
BEFORE UPDATE ON ai_model_candidate_artifacts
BEGIN
    SELECT RAISE(ABORT, 'ai_model_candidate_artifacts is append-only');
END;

CREATE TRIGGER IF NOT EXISTS ai_model_candidate_artifacts_append_only_delete
BEFORE DELETE ON ai_model_candidate_artifacts
BEGIN
    SELECT RAISE(ABORT, 'ai_model_candidate_artifacts is append-only');
END;

CREATE TRIGGER IF NOT EXISTS ai_model_candidate_artifacts_append_only_insert_guard
BEFORE INSERT ON ai_model_candidate_artifacts
WHEN EXISTS (
    SELECT 1 FROM ai_model_candidate_artifacts
    WHERE candidate_id = NEW.candidate_id
      AND model_type = NEW.model_type
)
BEGIN
    SELECT RAISE(ABORT, 'ai_model_candidate_artifacts is append-only');
END;

CREATE TRIGGER IF NOT EXISTS ai_model_evaluations_append_only_update
BEFORE UPDATE ON ai_model_evaluations
BEGIN
    SELECT RAISE(ABORT, 'ai_model_evaluations is append-only');
END;

CREATE TRIGGER IF NOT EXISTS ai_model_evaluations_append_only_delete
BEFORE DELETE ON ai_model_evaluations
BEGIN
    SELECT RAISE(ABORT, 'ai_model_evaluations is append-only');
END;

CREATE TRIGGER IF NOT EXISTS ai_model_evaluations_append_only_insert_guard
BEFORE INSERT ON ai_model_evaluations
WHEN EXISTS (
    SELECT 1 FROM ai_model_evaluations
    WHERE evaluation_id = NEW.evaluation_id
)
BEGIN
    SELECT RAISE(ABORT, 'ai_model_evaluations is append-only');
END;

CREATE TRIGGER IF NOT EXISTS ai_model_evaluation_samples_append_only_update
BEFORE UPDATE ON ai_model_evaluation_samples
BEGIN
    SELECT RAISE(ABORT, 'ai_model_evaluation_samples is append-only');
END;

CREATE TRIGGER IF NOT EXISTS ai_model_evaluation_samples_append_only_delete
BEFORE DELETE ON ai_model_evaluation_samples
BEGIN
    SELECT RAISE(ABORT, 'ai_model_evaluation_samples is append-only');
END;

CREATE TRIGGER IF NOT EXISTS ai_model_evaluation_samples_append_only_insert_guard
BEFORE INSERT ON ai_model_evaluation_samples
WHEN EXISTS (
    SELECT 1 FROM ai_model_evaluation_samples
    WHERE (evaluation_id = NEW.evaluation_id
           AND sample_index = NEW.sample_index)
       OR (evaluation_id = NEW.evaluation_id
           AND target_date = NEW.target_date
           AND target_hour = NEW.target_hour)
)
BEGIN
    SELECT RAISE(ABORT, 'ai_model_evaluation_samples is append-only');
END;

CREATE TRIGGER IF NOT EXISTS ai_model_shadow_runs_append_only_update
BEFORE UPDATE ON ai_model_shadow_runs
BEGIN
    SELECT RAISE(ABORT, 'ai_model_shadow_runs is append-only');
END;

CREATE TRIGGER IF NOT EXISTS ai_model_shadow_runs_append_only_delete
BEFORE DELETE ON ai_model_shadow_runs
BEGIN
    SELECT RAISE(ABORT, 'ai_model_shadow_runs is append-only');
END;

CREATE TRIGGER IF NOT EXISTS ai_model_shadow_runs_append_only_insert_guard
BEFORE INSERT ON ai_model_shadow_runs
WHEN EXISTS (
    SELECT 1 FROM ai_model_shadow_runs
    WHERE shadow_run_id = NEW.shadow_run_id
       OR morning_batch_id = NEW.morning_batch_id
)
BEGIN
    SELECT RAISE(ABORT, 'ai_model_shadow_runs is append-only');
END;

CREATE TRIGGER IF NOT EXISTS ai_model_shadow_predictions_append_only_update
BEFORE UPDATE ON ai_model_shadow_predictions
BEGIN
    SELECT RAISE(ABORT, 'ai_model_shadow_predictions is append-only');
END;

CREATE TRIGGER IF NOT EXISTS ai_model_shadow_predictions_append_only_delete
BEFORE DELETE ON ai_model_shadow_predictions
BEGIN
    SELECT RAISE(ABORT, 'ai_model_shadow_predictions is append-only');
END;

CREATE TRIGGER IF NOT EXISTS ai_model_shadow_predictions_append_only_insert_guard
BEFORE INSERT ON ai_model_shadow_predictions
WHEN EXISTS (
    SELECT 1 FROM ai_model_shadow_predictions
    WHERE shadow_prediction_id = NEW.shadow_prediction_id
       OR (shadow_run_id = NEW.shadow_run_id
           AND target_date = NEW.target_date
           AND target_hour = NEW.target_hour)
)
BEGIN
    SELECT RAISE(ABORT, 'ai_model_shadow_predictions is append-only');
END;

CREATE TRIGGER IF NOT EXISTS ai_model_shadow_actual_versions_append_only_update
BEFORE UPDATE ON ai_model_shadow_actual_versions
BEGIN
    SELECT RAISE(ABORT, 'ai_model_shadow_actual_versions is append-only');
END;

CREATE TRIGGER IF NOT EXISTS ai_model_shadow_actual_versions_append_only_delete
BEFORE DELETE ON ai_model_shadow_actual_versions
BEGIN
    SELECT RAISE(ABORT, 'ai_model_shadow_actual_versions is append-only');
END;

CREATE TRIGGER IF NOT EXISTS ai_model_shadow_actual_versions_append_only_insert_guard
BEFORE INSERT ON ai_model_shadow_actual_versions
WHEN EXISTS (
    SELECT 1 FROM ai_model_shadow_actual_versions
    WHERE actual_version_id = NEW.actual_version_id
       OR (shadow_prediction_id = NEW.shadow_prediction_id
           AND actual_fingerprint = NEW.actual_fingerprint)
       OR (shadow_prediction_id = NEW.shadow_prediction_id
           AND evaluation_version = NEW.evaluation_version)
)
BEGIN
    SELECT RAISE(ABORT, 'ai_model_shadow_actual_versions is append-only');
END;

CREATE TABLE IF NOT EXISTS ai_seasonal_archive_meta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    season TEXT NOT NULL CHECK(season IN ('winter', 'spring', 'summer', 'autumn')),
    archive_type TEXT NOT NULL CHECK(archive_type IN ('lstm', 'ridge')),
    training_samples INTEGER DEFAULT 0,
    accuracy REAL DEFAULT 0.0,
    rmse REAL DEFAULT 0.0,
    source_year INTEGER NOT NULL,
    input_size INTEGER,
    hidden_size INTEGER,
    hidden2 INTEGER DEFAULT 24,
    num_outputs INTEGER,
    num_heads INTEGER DEFAULT 4,
    sequence_length INTEGER DEFAULT 24,
    alpha REAL,
    flat_size INTEGER,
    loo_cv_score REAL,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(season, archive_type)
);

CREATE TABLE IF NOT EXISTS ai_seasonal_archive_weights (
    season TEXT NOT NULL,
    archive_type TEXT NOT NULL,
    weight_type TEXT NOT NULL,
    weight_index INTEGER NOT NULL,
    weight_value REAL NOT NULL,
    PRIMARY KEY(season, archive_type, weight_type, weight_index)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS physics_learning_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    version TEXT DEFAULT '3.0',
    albedo REAL DEFAULT 0.2,
    system_efficiency REAL DEFAULT 0.9,
    learned_efficiency_factor REAL DEFAULT 1.0,
    rolling_window_days INTEGER DEFAULT 21,
    min_samples INTEGER DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS physics_calibration_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_name TEXT NOT NULL UNIQUE,
    global_factor REAL DEFAULT 1.0,
    sample_count INTEGER DEFAULT 0,
    confidence REAL DEFAULT 0.0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS physics_calibration_hourly (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_name TEXT NOT NULL,
    hour INTEGER NOT NULL CHECK(hour >= 0 AND hour <= 23),
    factor REAL NOT NULL,
    FOREIGN KEY (group_name) REFERENCES physics_calibration_groups(group_name) ON DELETE CASCADE,
    UNIQUE(group_name, hour)
);

CREATE TABLE IF NOT EXISTS physics_calibration_buckets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_name TEXT NOT NULL,
    bucket_name TEXT NOT NULL,
    global_factor REAL DEFAULT 1.0,
    sample_count INTEGER DEFAULT 0,
    confidence REAL DEFAULT 0.0,
    FOREIGN KEY (group_name) REFERENCES physics_calibration_groups(group_name) ON DELETE CASCADE,
    UNIQUE(group_name, bucket_name)
);

CREATE TABLE IF NOT EXISTS physics_calibration_bucket_hourly (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_name TEXT NOT NULL,
    bucket_name TEXT NOT NULL,
    hour INTEGER NOT NULL CHECK(hour >= 0 AND hour <= 23),
    factor REAL NOT NULL,
    FOREIGN KEY (group_name) REFERENCES physics_calibration_groups(group_name) ON DELETE CASCADE,
    UNIQUE(group_name, bucket_name, hour)
);

CREATE TABLE IF NOT EXISTS physics_calibration_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    group_name TEXT NOT NULL,
    bucket_name TEXT,
    hour INTEGER,
    avg_ratio REAL NOT NULL,
    sample_count INTEGER NOT NULL,
    source TEXT,
    UNIQUE(date, group_name, bucket_name, hour)
);

CREATE TABLE IF NOT EXISTS weather_forecast (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    forecast_date DATE NOT NULL,
    hour INTEGER NOT NULL CHECK(hour >= 0 AND hour <= 23),
    temperature REAL,
    solar_radiation_wm2 REAL,
    wind REAL,
    humidity REAL,
    rain REAL,
    clouds REAL,
    cloud_cover_low REAL,
    cloud_cover_mid REAL,
    cloud_cover_high REAL,
    pressure REAL,
    direct_radiation REAL,
    diffuse_radiation REAL,
    visibility_m REAL,
    fog_detected BOOLEAN,
    fog_type TEXT,
    weather_code INTEGER,  -- V16.1: Open-Meteo weather code for snow detection @zara
    version TEXT DEFAULT '4.3',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(forecast_date, hour)
);

CREATE TABLE IF NOT EXISTS weather_expert_weights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cloud_type TEXT NOT NULL,
    expert_name TEXT NOT NULL CHECK(expert_name IN ('open_meteo', 'wttr_in', 'ecmwf_layers', 'bright_sky', 'pirate_weather')),
    weight REAL NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cloud_type, expert_name)
);

CREATE TABLE IF NOT EXISTS weather_expert_snow_stats (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    total_predictions INTEGER DEFAULT 0,
    correct_predictions INTEGER DEFAULT 0,
    accuracy REAL DEFAULT 0.0,
    last_updated TIMESTAMP
);

CREATE TABLE IF NOT EXISTS weather_expert_learning (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    cloud_type TEXT NOT NULL,
    expert_name TEXT NOT NULL,
    mae REAL NOT NULL,
    weight_after REAL NOT NULL,
    comparison_hours INTEGER,
    learned_at TIMESTAMP NOT NULL,
    UNIQUE(date, cloud_type, expert_name)
);

CREATE TABLE IF NOT EXISTS weather_source_weights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_name TEXT NOT NULL CHECK(source_name IN ('open_meteo', 'wwo')) UNIQUE,
    weight REAL NOT NULL,
    last_mae REAL,
    version TEXT DEFAULT '1.1',
    last_learning_date DATE,
    comparison_hours INTEGER,
    smoothing_factor_used REAL,
    smoothing_factor_default REAL DEFAULT 0.3,
    accelerated_learning BOOLEAN DEFAULT FALSE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS weather_source_learning (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    source_name TEXT NOT NULL,
    mae REAL NOT NULL,
    weight_after REAL NOT NULL,
    learned_at TIMESTAMP NOT NULL,
    UNIQUE(date, source_name)
);

CREATE TABLE IF NOT EXISTS weather_cache_wttr_in (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    forecast_date DATE NOT NULL,
    hour INTEGER NOT NULL CHECK(hour >= 0 AND hour <= 23),
    cloud_cover REAL,
    temperature REAL,
    humidity REAL,
    wind_speed REAL,
    precipitation REAL,
    pressure REAL,
    source TEXT DEFAULT 'wttr.in-wwo',
    fetched_at TIMESTAMP,
    UNIQUE(forecast_date, hour)
);

CREATE INDEX IF NOT EXISTS idx_weather_cache_wttr_date ON weather_cache_wttr_in(forecast_date);

CREATE TABLE IF NOT EXISTS weather_cache_bright_sky (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    forecast_date DATE NOT NULL,
    hour INTEGER NOT NULL CHECK(hour >= 0 AND hour <= 23),
    cloud_cover REAL,
    fetched_at TIMESTAMP,
    UNIQUE(forecast_date, hour)
);

CREATE INDEX IF NOT EXISTS idx_weather_cache_bright_sky_date ON weather_cache_bright_sky(forecast_date);

CREATE TABLE IF NOT EXISTS weather_cache_pirate_weather (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    forecast_date DATE NOT NULL,
    hour INTEGER NOT NULL CHECK(hour >= 0 AND hour <= 23),
    cloud_cover REAL,
    fetched_at TIMESTAMP,
    UNIQUE(forecast_date, hour)
);

CREATE INDEX IF NOT EXISTS idx_weather_cache_pirate_date ON weather_cache_pirate_weather(forecast_date);

CREATE TABLE IF NOT EXISTS weather_cache_open_meteo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    forecast_date DATE NOT NULL,
    hour INTEGER NOT NULL CHECK(hour >= 0 AND hour <= 23),
    temperature REAL,
    cloud_cover REAL,
    cloud_cover_low REAL,
    cloud_cover_mid REAL,
    cloud_cover_high REAL,
    humidity REAL,
    wind_speed REAL,
    precipitation REAL,
    pressure REAL,
    direct_radiation REAL,
    diffuse_radiation REAL,
    ghi REAL,
    global_tilted_irradiance REAL,
    visibility_m REAL,
    source TEXT DEFAULT 'open-meteo',
    fetched_at TIMESTAMP,
    weather_code INTEGER,
    snowfall REAL,              -- Schneefallmenge cm/h von Open-Meteo
    rain REAL,                  -- Regen separat mm von Open-Meteo
    UNIQUE(forecast_date, hour)
);

CREATE INDEX IF NOT EXISTS idx_weather_cache_open_meteo_date ON weather_cache_open_meteo(forecast_date);

CREATE TABLE IF NOT EXISTS hourly_predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prediction_id TEXT NOT NULL UNIQUE,
    prediction_created_at TIMESTAMP NOT NULL,
    prediction_created_hour INTEGER NOT NULL,
    morning_batch_id TEXT,
    target_datetime TIMESTAMP NOT NULL,
    target_date DATE NOT NULL,
    target_hour INTEGER NOT NULL,
    target_day_of_week INTEGER,
    target_day_of_year INTEGER,
    target_month INTEGER,
    target_season TEXT,
    prediction_kwh REAL NOT NULL,
    prediction_kwh_uncapped REAL,
    prediction_method TEXT,
    ml_contribution_percent INTEGER,
    model_version TEXT,
    confidence REAL,
    actual_kwh REAL,
    actual_measured_at TIMESTAMP,
    accuracy_percent REAL,
    error_kwh REAL,
    error_percent REAL,
    is_production_hour BOOLEAN DEFAULT FALSE,
    is_peak_hour BOOLEAN DEFAULT FALSE,
    is_outlier BOOLEAN DEFAULT FALSE,
    has_weather_alert BOOLEAN DEFAULT FALSE,
    has_sensor_data BOOLEAN DEFAULT FALSE,
    sensor_data_complete BOOLEAN DEFAULT FALSE,
    weather_forecast_updated BOOLEAN DEFAULT FALSE,
    manual_override BOOLEAN DEFAULT FALSE,
    inverter_clipped BOOLEAN DEFAULT FALSE,
    has_panel_group_predictions BOOLEAN DEFAULT FALSE,
    prediction_confidence TEXT,
    weather_forecast_age_hours INTEGER,
    sensor_data_quality TEXT,
    data_completeness_percent REAL,
    weather_alert_type TEXT,
    physics_kwh REAL,
    ai_kwh REAL,
    ai_confidence REAL,
    lstm_kwh REAL,
    ridge_kwh REAL,
    tfs_kwh REAL,
    tfs_weight REAL,
    exclude_from_learning BOOLEAN DEFAULT FALSE,
    exclude_from_clean_evaluation BOOLEAN DEFAULT FALSE,
    actual_backfill_blocked BOOLEAN DEFAULT FALSE,
    data_quarantine_reason TEXT,
    data_quarantine_at TIMESTAMP,
    mppt_throttled BOOLEAN DEFAULT FALSE,
    mppt_throttle_reason TEXT,
    weather_miss_class TEXT,
    reforecast_trigger_eligible BOOLEAN DEFAULT FALSE,
    has_panel_group_actuals BOOLEAN DEFAULT FALSE,
    panel_group_predictions_backfilled BOOLEAN DEFAULT FALSE,
    adaptive_corrected BOOLEAN DEFAULT FALSE,
    adaptive_correction_time TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hourly_predictions_target ON hourly_predictions(target_date, target_hour);
CREATE INDEX IF NOT EXISTS idx_hourly_predictions_created ON hourly_predictions(prediction_created_at);
CREATE INDEX IF NOT EXISTS idx_hourly_predictions_datetime ON hourly_predictions(target_datetime);
CREATE INDEX IF NOT EXISTS idx_hourly_predictions_morning_batch ON hourly_predictions(morning_batch_id);

CREATE TABLE IF NOT EXISTS ensemble_shadow_batches (
    morning_batch_id TEXT PRIMARY KEY,
    run_date DATE NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'failed')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    failed_at TIMESTAMP,
    last_resumed_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ensemble_shadow_batches_one_running
    ON ensemble_shadow_batches(run_date) WHERE status = 'running';

CREATE TABLE IF NOT EXISTS ensemble_shadow_evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shadow_evaluation_id TEXT NOT NULL UNIQUE,
    morning_batch_id TEXT NOT NULL,
    source_prediction_id TEXT NOT NULL,
    forecast_created_at TIMESTAMP NOT NULL,
    target_datetime TIMESTAMP NOT NULL,
    target_utc_epoch INTEGER NOT NULL,
    target_date DATE NOT NULL,
    target_hour INTEGER NOT NULL CHECK(target_hour >= 0 AND target_hour <= 23),
    forecast_timezone TEXT NOT NULL,
    prediction_method TEXT NOT NULL,
    shadow_rule_version TEXT NOT NULL,
    physics_kwh REAL,
    ai_kwh REAL,
    prediction_kwh REAL NOT NULL,
    tfs_kwh REAL,
    tfs_weight REAL,
    sun_elevation_deg REAL,
    sun_azimuth_deg REAL,
    hours_before_sunset REAL,
    day_progress_ratio REAL,
    forecast_ghi_wm2 REAL,
    direct_radiation_wm2 REAL,
    diffuse_radiation_wm2 REAL,
    forecast_clouds_pct REAL,
    theoretical_max_kwh REAL,
    shadow_evaluable BOOLEAN NOT NULL,
    shadow_not_evaluable_reason TEXT,
    shadow_gate_triggered BOOLEAN NOT NULL,
    shadow_prediction_kwh REAL,
    production_prediction_kwh REAL NOT NULL,
    decision_reason_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(morning_batch_id, source_prediction_id)
);

CREATE INDEX IF NOT EXISTS idx_ensemble_shadow_evaluations_target
    ON ensemble_shadow_evaluations(target_date, target_hour);
CREATE INDEX IF NOT EXISTS idx_ensemble_shadow_evaluations_source
    ON ensemble_shadow_evaluations(source_prediction_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ensemble_shadow_evaluations_batch_target
    ON ensemble_shadow_evaluations(morning_batch_id, target_utc_epoch);

CREATE TABLE IF NOT EXISTS ensemble_shadow_evaluation_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shadow_evaluation_id TEXT NOT NULL UNIQUE,
    evaluated_at TIMESTAMP NOT NULL,
    actual_kwh REAL NOT NULL,
    actual_measured_at TIMESTAMP,
    clean_evaluation_status BOOLEAN NOT NULL,
    clean_exclusion_reason TEXT,
    evaluation_status TEXT NOT NULL,
    final_absolute_error REAL NOT NULL,
    physics_absolute_error REAL,
    shadow_absolute_error REAL,
    avoided_error REAL,
    lost_ensemble_improvement REAL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shadow_evaluation_id)
        REFERENCES ensemble_shadow_evaluations(shadow_evaluation_id)
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_ensemble_shadow_results_status
    ON ensemble_shadow_evaluation_results(evaluation_status, evaluated_at);

CREATE TABLE IF NOT EXISTS ensemble_shadow_evaluation_versions (
    evaluation_version_id TEXT PRIMARY KEY,
    shadow_evaluation_id TEXT NOT NULL,
    evaluation_version INTEGER NOT NULL,
    supersedes_evaluation_version_id TEXT,
    actual_fingerprint TEXT NOT NULL,
    evaluated_at TIMESTAMP NOT NULL,
    actual_kwh REAL,
    actual_measured_at TIMESTAMP,
    clean_evaluation_status BOOLEAN NOT NULL,
    clean_exclusion_reason TEXT,
    evaluation_status TEXT NOT NULL,
    evaluation_reason TEXT,
    final_absolute_error REAL,
    physics_absolute_error REAL,
    shadow_absolute_error REAL,
    avoided_error REAL,
    lost_ensemble_improvement REAL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shadow_evaluation_id)
        REFERENCES ensemble_shadow_evaluations(shadow_evaluation_id)
        ON DELETE RESTRICT,
    UNIQUE(shadow_evaluation_id, evaluation_version),
    UNIQUE(shadow_evaluation_id, actual_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_ensemble_shadow_versions_current
    ON ensemble_shadow_evaluation_versions(shadow_evaluation_id, evaluation_version DESC);

CREATE TRIGGER IF NOT EXISTS trg_ensemble_shadow_evaluations_no_update
BEFORE UPDATE ON ensemble_shadow_evaluations
BEGIN
    SELECT RAISE(ABORT, 'ensemble shadow provenance is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_ensemble_shadow_evaluations_no_delete
BEFORE DELETE ON ensemble_shadow_evaluations
BEGIN
    SELECT RAISE(ABORT, 'ensemble shadow provenance is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_ensemble_shadow_results_no_update
BEFORE UPDATE ON ensemble_shadow_evaluation_results
BEGIN
    SELECT RAISE(ABORT, 'ensemble shadow evaluation result is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_ensemble_shadow_results_no_delete
BEFORE DELETE ON ensemble_shadow_evaluation_results
BEGIN
    SELECT RAISE(ABORT, 'ensemble shadow evaluation result is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_ensemble_shadow_versions_no_update
BEFORE UPDATE ON ensemble_shadow_evaluation_versions
BEGIN
    SELECT RAISE(ABORT, 'ensemble shadow evaluation version is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_ensemble_shadow_versions_no_delete
BEFORE DELETE ON ensemble_shadow_evaluation_versions
BEGIN
    SELECT RAISE(ABORT, 'ensemble shadow evaluation version is append-only');
END;

CREATE TABLE IF NOT EXISTS emergency_outage_periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TIMESTAMP NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_hour INTEGER NOT NULL DEFAULT 0,
    end_hour INTEGER NOT NULL DEFAULT 23,
    reason TEXT NOT NULL,
    action TEXT NOT NULL,
    actual_policy TEXT NOT NULL,
    backfill_policy TEXT NOT NULL DEFAULT 'block',
    source TEXT NOT NULL DEFAULT 'emergency_service',
    is_active BOOLEAN DEFAULT TRUE,
    affected_hourly_rows INTEGER DEFAULT 0,
    affected_panel_group_rows INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_emergency_outage_periods_range
    ON emergency_outage_periods(start_date, end_date, is_active);

CREATE TABLE IF NOT EXISTS emergency_outage_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TIMESTAMP NOT NULL,
    operation TEXT NOT NULL,
    dry_run BOOLEAN NOT NULL,
    payload_json TEXT NOT NULL,
    result_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prediction_weather (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prediction_id TEXT NOT NULL,
    weather_type TEXT NOT NULL CHECK(weather_type IN ('forecast', 'corrected', 'actual')),
    temperature REAL,
    solar_radiation_wm2 REAL,
    wind REAL,
    humidity REAL,
    rain REAL,
    clouds REAL,
    pressure REAL,
    source TEXT,
    lux REAL,
    frost_detected TEXT,  -- 'heavy_frost', 'light_frost', 'possible_frost', 'none' @zara V16.1
    frost_score REAL,     -- 0.0 to 1.0 @zara V16.1
    frost_confidence REAL,
    diffuse_radiation REAL,  -- V16.0.0: diffuse horizontal irradiance @zara
    direct_radiation REAL,   -- V16.0.1: direct normal irradiance @zara
    FOREIGN KEY (prediction_id) REFERENCES hourly_predictions(prediction_id) ON DELETE CASCADE,
    UNIQUE(prediction_id, weather_type)
);

CREATE TABLE IF NOT EXISTS prediction_astronomy (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prediction_id TEXT NOT NULL UNIQUE,
    sunrise TIMESTAMP,
    sunset TIMESTAMP,
    solar_noon TIMESTAMP,
    daylight_hours REAL,
    sun_elevation_deg REAL,
    sun_azimuth_deg REAL,
    clear_sky_radiation_wm2 REAL,
    theoretical_max_kwh REAL,
    hours_since_solar_noon REAL,
    day_progress_ratio REAL,
    hours_after_sunrise REAL,
    hours_before_sunset REAL,
    FOREIGN KEY (prediction_id) REFERENCES hourly_predictions(prediction_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS prediction_sensor_actual (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prediction_id TEXT NOT NULL UNIQUE,
    temperature_c REAL,
    humidity_percent REAL,
    solar_radiation_wm2 REAL,
    rain_mm REAL,
    uv_index REAL,
    wind_speed_ms REAL,
    current_yield_kwh REAL,
    lux REAL,
    FOREIGN KEY (prediction_id) REFERENCES hourly_predictions(prediction_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS prediction_panel_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prediction_id TEXT NOT NULL,
    group_name TEXT NOT NULL,
    prediction_kwh REAL NOT NULL,
    physics_kwh REAL,
    ai_kwh REAL,
    lstm_kwh REAL,
    ridge_kwh REAL,
    tfs_kwh REAL,
    tfs_weight REAL,
    actual_kwh REAL,
    config_epoch_id INTEGER,
    group_uid TEXT,
    group_lineage_uid TEXT,
    power_wp_at_prediction REAL,
    topology_compatible BOOLEAN DEFAULT TRUE,
    topology_exclusion_reason TEXT,
    exclude_from_learning_group BOOLEAN DEFAULT FALSE,  -- V17.0.0: Per-group learning exclusion @zara
    exclusion_reason_group TEXT,                         -- V17.0.0: Reason for per-group exclusion @zara
    snow_covered_group BOOLEAN DEFAULT FALSE,            -- V17.0.0: Per-group snow status @zara
    shadow_type_group TEXT,                              -- V17.0.0: Per-group shadow type @zara
    FOREIGN KEY (prediction_id) REFERENCES hourly_predictions(prediction_id) ON DELETE CASCADE,
    UNIQUE(prediction_id, group_name)
);

CREATE TABLE IF NOT EXISTS daily_forecasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    forecast_type TEXT NOT NULL CHECK(forecast_type IN ('today', 'tomorrow', 'day_after_tomorrow')),
    forecast_date DATE NOT NULL,
    prediction_kwh REAL NOT NULL,
    prediction_kwh_raw REAL,
    safeguard_applied BOOLEAN DEFAULT FALSE,
    safeguard_reduction_kwh REAL,
    locked BOOLEAN DEFAULT FALSE,
    locked_at TIMESTAMP,
    source TEXT,
    version TEXT DEFAULT '3.0.0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(forecast_type, forecast_date)
);

CREATE TABLE IF NOT EXISTS daily_forecast_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    forecast_type TEXT NOT NULL,
    forecast_date DATE NOT NULL,
    prediction_kwh REAL NOT NULL,
    source TEXT,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS ops_forecast_snapshots (
    snapshot_sequence INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_date DATE NOT NULL,
    snapshot_type TEXT NOT NULL,
    trigger_source TEXT NOT NULL,
    triggered_at TIMESTAMP NOT NULL,
    cutoff_hour INTEGER,
    weather_refresh_started_at TIMESTAMP,
    weather_refresh_finished_at TIMESTAMP,
    forecast_generation_started_at TIMESTAMP,
    forecast_generation_finished_at TIMESTAMP,
    status TEXT NOT NULL,
    source_method TEXT,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_ops_forecast_snapshots_date
    ON ops_forecast_snapshots(snapshot_date, snapshot_sequence);

CREATE TABLE IF NOT EXISTS ops_hourly_forecasts (
    forecast_row_id INTEGER PRIMARY KEY AUTOINCREMENT,
    ops_track_date DATE NOT NULL,
    target_date DATE NOT NULL,
    target_hour INTEGER NOT NULL CHECK(target_hour >= 0 AND target_hour <= 23),
    prediction_id TEXT NOT NULL,
    snapshot_type TEXT NOT NULL,
    snapshot_sequence INTEGER NOT NULL,
    snapshot_created_at TIMESTAMP NOT NULL,
    trigger_source TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    prediction_kwh REAL NOT NULL,
    prediction_kwh_uncapped REAL,
    prediction_method TEXT,
    physics_kwh REAL,
    ai_kwh REAL,
    ai_confidence REAL,
    ml_contribution_percent REAL,
    lstm_kwh REAL,
    ridge_kwh REAL,
    tfs_kwh REAL,
    tfs_weight REAL,
    is_production_hour BOOLEAN,
    actual_kwh REAL,
    source_track TEXT NOT NULL,
    reforecast_cutoff_hour INTEGER,
    superseded_at TIMESTAMP,
    FOREIGN KEY (snapshot_sequence) REFERENCES ops_forecast_snapshots(snapshot_sequence) ON DELETE CASCADE,
    UNIQUE(target_date, target_hour, snapshot_sequence)
);

CREATE INDEX IF NOT EXISTS idx_ops_hourly_forecasts_active
    ON ops_hourly_forecasts(target_date, target_hour, is_active);
CREATE INDEX IF NOT EXISTS idx_ops_hourly_forecasts_snapshot
    ON ops_hourly_forecasts(ops_track_date, snapshot_sequence);
CREATE INDEX IF NOT EXISTS idx_ops_hourly_forecasts_prediction
    ON ops_hourly_forecasts(prediction_id, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ops_hourly_forecasts_one_active
    ON ops_hourly_forecasts(target_date, target_hour)
    WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS ops_prediction_weather (
    ops_weather_row_id INTEGER PRIMARY KEY AUTOINCREMENT,
    forecast_row_id INTEGER NOT NULL,
    target_date DATE NOT NULL,
    target_hour INTEGER NOT NULL CHECK(target_hour >= 0 AND target_hour <= 23),
    prediction_id TEXT NOT NULL,
    snapshot_sequence INTEGER NOT NULL,
    temperature REAL,
    solar_radiation_wm2 REAL,
    wind REAL,
    humidity REAL,
    rain REAL,
    clouds REAL,
    pressure REAL,
    source TEXT,
    lux REAL,
    frost_detected TEXT,
    frost_score REAL,
    frost_confidence REAL,
    diffuse_radiation REAL,
    direct_radiation REAL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    superseded_at TIMESTAMP,
    FOREIGN KEY (forecast_row_id) REFERENCES ops_hourly_forecasts(forecast_row_id) ON DELETE CASCADE,
    FOREIGN KEY (snapshot_sequence) REFERENCES ops_forecast_snapshots(snapshot_sequence) ON DELETE CASCADE,
    UNIQUE(forecast_row_id)
);

CREATE INDEX IF NOT EXISTS idx_ops_prediction_weather_active
    ON ops_prediction_weather(target_date, target_hour, is_active);
CREATE INDEX IF NOT EXISTS idx_ops_prediction_weather_prediction
    ON ops_prediction_weather(prediction_id, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ops_prediction_weather_one_active
    ON ops_prediction_weather(target_date, target_hour)
    WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS ops_prediction_panel_groups (
    ops_group_row_id INTEGER PRIMARY KEY AUTOINCREMENT,
    forecast_row_id INTEGER NOT NULL,
    target_date DATE NOT NULL,
    target_hour INTEGER NOT NULL CHECK(target_hour >= 0 AND target_hour <= 23),
    prediction_id TEXT NOT NULL,
    snapshot_sequence INTEGER NOT NULL,
    group_name TEXT NOT NULL,
    prediction_kwh REAL NOT NULL,
    physics_kwh REAL,
    ai_kwh REAL,
    lstm_kwh REAL,
    ridge_kwh REAL,
    tfs_kwh REAL,
    actual_kwh REAL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    superseded_at TIMESTAMP,
    FOREIGN KEY (forecast_row_id) REFERENCES ops_hourly_forecasts(forecast_row_id) ON DELETE CASCADE,
    FOREIGN KEY (snapshot_sequence) REFERENCES ops_forecast_snapshots(snapshot_sequence) ON DELETE CASCADE,
    UNIQUE(prediction_id, snapshot_sequence, group_name)
);

CREATE INDEX IF NOT EXISTS idx_ops_prediction_panel_groups_active
    ON ops_prediction_panel_groups(target_date, target_hour, is_active);
CREATE INDEX IF NOT EXISTS idx_ops_prediction_panel_groups_forecast_row
    ON ops_prediction_panel_groups(forecast_row_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ops_prediction_panel_groups_one_active
    ON ops_prediction_panel_groups(target_date, target_hour, group_name)
    WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS ops_daily_forecasts (
    ops_daily_id INTEGER PRIMARY KEY AUTOINCREMENT,
    forecast_type TEXT NOT NULL CHECK(forecast_type IN ('today', 'tomorrow', 'day_after_tomorrow')),
    forecast_date DATE NOT NULL,
    snapshot_type TEXT NOT NULL,
    snapshot_sequence INTEGER NOT NULL,
    snapshot_created_at TIMESTAMP NOT NULL,
    trigger_source TEXT NOT NULL,
    prediction_kwh REAL NOT NULL,
    prediction_kwh_raw REAL,
    source_method TEXT,
    actual_kwh REAL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    superseded_at TIMESTAMP,
    FOREIGN KEY (snapshot_sequence) REFERENCES ops_forecast_snapshots(snapshot_sequence) ON DELETE CASCADE,
    UNIQUE(forecast_type, forecast_date, snapshot_sequence)
);

CREATE INDEX IF NOT EXISTS idx_ops_daily_forecasts_active
    ON ops_daily_forecasts(forecast_type, forecast_date, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ops_daily_forecasts_one_active
    ON ops_daily_forecasts(forecast_type, forecast_date)
    WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS ops_reforecast_settings (
    settings_id INTEGER PRIMARY KEY AUTOINCREMENT,
    mode TEXT NOT NULL CHECK(mode IN ('standard', 'standard_midday', 'standard_midday_afternoon', 'custom_time')),
    custom_time TEXT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP NOT NULL,
    updated_by TEXT,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_ops_reforecast_settings_updated
    ON ops_reforecast_settings(updated_at DESC);

CREATE TABLE IF NOT EXISTS daily_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL UNIQUE,
    day_of_week INTEGER,
    day_of_year INTEGER,
    month INTEGER,
    season TEXT,
    week_of_year INTEGER,
    predicted_total_kwh REAL,
    actual_total_kwh REAL,
    accuracy_percent REAL,
    evaluation_predicted_kwh REAL,
    evaluation_actual_kwh REAL,
    evaluation_coverage_percent REAL,
    excluded_hours_count INTEGER DEFAULT 0,
    excluded_mppt_hours_count INTEGER DEFAULT 0,
    evaluation_hours_count INTEGER DEFAULT 0,
    production_candidate_hours_count INTEGER DEFAULT 0,
    missing_actual_hours_count INTEGER DEFAULT 0,
    excluded_weather_alert_hours_count INTEGER DEFAULT 0,
    excluded_inverter_clipped_hours_count INTEGER DEFAULT 0,
    excluded_reason_breakdown_json TEXT,
    error_kwh REAL,
    error_percent REAL,
    production_hours INTEGER,
    peak_power_w REAL,
    peak_hour INTEGER,
    peak_kwh REAL,
    total_hours_predicted INTEGER,
    hours_with_actual_data INTEGER,
    mean_hourly_accuracy REAL,
    std_hourly_accuracy REAL,
    forecast_accuracy REAL,
    avg_temperature_diff REAL,
    avg_cloud_cover_diff REAL,
    forecast_dominant TEXT,
    actual_dominant TEXT,
    ml_mae REAL,
    ml_rmse REAL,
    ml_mape REAL,
    ml_r2_score REAL,
    version TEXT DEFAULT '2.0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    peak_power_time TEXT,                   -- V16.0.0: Time of peak power for AI learning @zara
    eod_duration_seconds REAL               -- V17.1.0: Duration of end-of-day workflow in seconds @zara
);

CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(date);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_month ON daily_summaries(month, season);

CREATE TABLE IF NOT EXISTS daily_summary_time_windows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    window_name TEXT NOT NULL CHECK(window_name IN ('morning_7_10', 'midday_11_14', 'afternoon_15_17')),
    predicted_kwh REAL,
    actual_kwh REAL,
    accuracy REAL,
    stable BOOLEAN,
    hours_count INTEGER,
    FOREIGN KEY (date) REFERENCES daily_summaries(date) ON DELETE CASCADE,
    UNIQUE(date, window_name)
);

CREATE TABLE IF NOT EXISTS daily_summary_frost_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL UNIQUE,
    hours_analyzed INTEGER,
    frost_detected BOOLEAN,
    total_affected_hours INTEGER,
    heavy_frost_hours INTEGER,
    light_frost_hours INTEGER,
    FOREIGN KEY (date) REFERENCES daily_summaries(date) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS daily_summary_shadow_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL UNIQUE,
    shadow_hours_count INTEGER DEFAULT 0,
    cumulative_loss_kwh REAL DEFAULT 0.0,
    FOREIGN KEY (date) REFERENCES daily_summaries(date) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS method_performance_learning (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cloud_bucket TEXT NOT NULL CHECK(cloud_bucket IN ('clear', 'partly_cloudy', 'overcast')),
    hour_bucket TEXT NOT NULL CHECK(hour_bucket IN ('morning', 'midday', 'afternoon')),
    physics_mae REAL DEFAULT 0.0,
    ai_mae REAL DEFAULT 0.0,
    blend_mae REAL DEFAULT 0.0,
    ai_advantage_factor REAL DEFAULT 1.0,
    sample_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP,
    season TEXT DEFAULT NULL,                            -- V17.0.0: Seasonal bucket separation @zara
    UNIQUE(cloud_bucket, hour_bucket, season)
);

CREATE TABLE IF NOT EXISTS ensemble_group_weights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_name TEXT NOT NULL,
    cloud_bucket TEXT NOT NULL CHECK(cloud_bucket IN ('clear', 'partly_cloudy', 'overcast')),
    hour_bucket TEXT NOT NULL CHECK(hour_bucket IN ('morning', 'midday', 'afternoon')),
    lstm_weight REAL DEFAULT 0.85,
    ridge_weight REAL DEFAULT 0.15,
    lstm_mae REAL DEFAULT 0.0,
    ridge_mae REAL DEFAULT 0.0,
    sample_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP,
    season TEXT DEFAULT NULL,                            -- V17.0.0: Seasonal bucket separation @zara
    UNIQUE(group_name, cloud_bucket, hour_bucket, season)
);

CREATE TABLE IF NOT EXISTS astronomy_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_date DATE NOT NULL,
    hour INTEGER NOT NULL CHECK(hour >= 0 AND hour <= 23),
    sun_elevation_deg REAL,
    sun_azimuth_deg REAL,
    clear_sky_radiation_wm2 REAL,
    theoretical_max_kwh REAL,
    sunrise TIMESTAMP,
    sunset TIMESTAMP,
    solar_noon TIMESTAMP,
    daylight_hours REAL,
    version TEXT DEFAULT '1.0',
    UNIQUE(cache_date, hour)
);

CREATE INDEX IF NOT EXISTS idx_astronomy_cache_date ON astronomy_cache(cache_date);

CREATE TABLE IF NOT EXISTS astronomy_system_info (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    elevation_m REAL,
    timezone TEXT,
    installed_capacity_kwp REAL,
    max_peak_record_kwh REAL,
    max_peak_date DATE,
    max_peak_hour INTEGER,
    max_peak_sun_elevation_deg REAL,
    max_peak_cloud_cover_percent REAL,
    max_peak_temperature_c REAL,
    max_peak_solar_radiation_wm2 REAL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS astronomy_hourly_peaks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hour INTEGER NOT NULL CHECK(hour >= 0 AND hour <= 23) UNIQUE,
    kwh REAL DEFAULT 0,
    date DATE,
    sun_elevation_deg REAL,
    cloud_cover_percent REAL,
    temperature_c REAL,
    solar_radiation_wm2 REAL
);

CREATE TABLE IF NOT EXISTS coordinator_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    expected_daily_production REAL,
    last_set_date DATE,
    version TEXT DEFAULT '1.0',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scheduled_task_state (
    task_key TEXT PRIMARY KEY,
    completed_period TEXT,
    completed_at TIMESTAMP,
    last_attempt_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS production_time_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    date DATE NOT NULL,
    accumulated_hours REAL DEFAULT 0,
    is_active BOOLEAN DEFAULT FALSE,
    start_time TIMESTAMP,
    production_time_today TEXT,
    version TEXT DEFAULT '1.0',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    peak_power_w REAL DEFAULT 0,            -- V16.0.0: Today's peak power in Watt @zara
    peak_power_time TEXT,                   -- V16.0.0: Time of today's peak (HH:MM) @zara
    peak_record_w REAL,                     -- V16.0.0: All-time peak power in Watt @zara
    peak_record_date TEXT,                  -- V16.0.0: Date of all-time peak @zara
    peak_record_time TEXT                   -- V16.0.0: Time of all-time peak (HH:MM) @zara
);

CREATE TABLE IF NOT EXISTS panel_group_sensor_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_name TEXT NOT NULL UNIQUE,
    last_value REAL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS yield_cache (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    value REAL,
    time TIMESTAMP,
    date DATE
);

CREATE TABLE IF NOT EXISTS actual_live_state (
    date DATE PRIMARY KEY,
    total_power_w REAL,
    total_actual_kwh REAL NOT NULL DEFAULT 0,
    power_source TEXT,
    actual_source TEXT NOT NULL,
    groups_expected INTEGER NOT NULL DEFAULT 0,
    groups_available INTEGER NOT NULL DEFAULT 0,
    quality TEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS actual_live_panel_groups (
    date DATE NOT NULL,
    group_name TEXT NOT NULL,
    power_w REAL,
    actual_today_kwh REAL NOT NULL DEFAULT 0,
    power_sensor TEXT,
    quality TEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    PRIMARY KEY(date, group_name)
);

CREATE INDEX IF NOT EXISTS idx_actual_live_panel_groups_date
ON actual_live_panel_groups(date);

CREATE TABLE IF NOT EXISTS visibility_learning (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    version TEXT DEFAULT '1.0',
    has_solar_radiation_sensor BOOLEAN DEFAULT FALSE,
    last_learning_date DATE,
    total_fog_hours_learned INTEGER DEFAULT 0,
    total_fog_light_hours_learned INTEGER DEFAULT 0,
    bright_sky_fog_hits INTEGER DEFAULT 0,
    pirate_weather_fog_hits INTEGER DEFAULT 0,
    learning_sessions INTEGER DEFAULT 0,
    fog_bright_sky_weight REAL DEFAULT 0.5,
    fog_pirate_weather_weight REAL DEFAULT 0.5,
    fog_light_bright_sky_weight REAL DEFAULT 0.5,
    fog_light_pirate_weather_weight REAL DEFAULT 0.5,
    visibility_threshold_m REAL DEFAULT 5000,          -- V16.1: Visibility threshold in meters @zara
    fog_visibility_threshold_m REAL DEFAULT 1000,      -- V16.1: Fog threshold in meters @zara
    samples_below_threshold INTEGER DEFAULT 0,         -- V16.1: Sample count below threshold @zara
    samples_above_threshold INTEGER DEFAULT 0,         -- V16.1: Sample count above threshold @zara
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS panel_group_daily_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_date DATE NOT NULL,
    group_name TEXT NOT NULL,
    prediction_total_kwh REAL,
    actual_total_kwh REAL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cache_date, group_name)
);

CREATE TABLE IF NOT EXISTS panel_group_daily_hourly (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_date DATE NOT NULL,
    group_name TEXT NOT NULL,
    hour INTEGER NOT NULL CHECK(hour >= 0 AND hour <= 23),
    prediction_kwh REAL,
    actual_kwh REAL,
    UNIQUE(cache_date, group_name, hour)
);

CREATE INDEX IF NOT EXISTS idx_panel_group_daily_cache_date ON panel_group_daily_cache(cache_date);
CREATE INDEX IF NOT EXISTS idx_panel_group_daily_hourly_date ON panel_group_daily_hourly(cache_date);

CREATE TABLE IF NOT EXISTS retrospective_forecast (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    version TEXT DEFAULT '1.0',
    generated_at TIMESTAMP,
    simulated_forecast_time TIMESTAMP,
    sunrise_today TIMESTAMP,
    target_date DATE,
    today_kwh REAL,
    today_kwh_raw REAL,
    safeguard_applied BOOLEAN DEFAULT FALSE,
    tomorrow_kwh REAL,
    day_after_tomorrow_kwh REAL,
    method TEXT,
    confidence REAL,
    best_hour INTEGER,
    best_hour_kwh REAL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS retrospective_forecast_hourly (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hour INTEGER NOT NULL CHECK(hour >= 0 AND hour <= 23),
    prediction_kwh REAL,
    temperature_c REAL,
    cloud_cover_percent REAL,
    humidity_percent REAL,
    wind_speed_ms REAL,
    precipitation_mm REAL,
    direct_radiation REAL,
    diffuse_radiation REAL,
    visibility_m REAL,
    fog_detected BOOLEAN,
    fog_type TEXT,
    sun_elevation_deg REAL,
    sun_azimuth_deg REAL,
    theoretical_max_kwh REAL,
    clear_sky_radiation_wm2 REAL,
    UNIQUE(hour)
);

CREATE TABLE IF NOT EXISTS snow_tracking (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_snow_event TIMESTAMP,
    panels_covered_since TIMESTAMP,
    estimated_depth_mm REAL DEFAULT 0,
    melt_started_at TIMESTAMP,  -- Deprecated, use melt_hours instead @zara V16.1
    melt_hours REAL DEFAULT 0,  -- V16.1: Accumulated melt hours (temp > 0°C) @zara
    detection_source TEXT DEFAULT 'unknown',  -- V16.1: How snow was detected (weather_code, overnight, heuristic) @zara
    cleared_at TIMESTAMP,       -- V16.1: When panels were cleared @zara
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- V17.0.0: Per-group snow tracking with tilt-based melt physics @zara
CREATE TABLE IF NOT EXISTS snow_tracking_groups (
    group_name TEXT NOT NULL UNIQUE,
    tilt_deg REAL NOT NULL DEFAULT 30.0,
    last_snow_event TIMESTAMP,
    panels_covered_since TIMESTAMP,
    estimated_depth_mm REAL DEFAULT 0,
    melt_hours REAL DEFAULT 0,
    tilt_melt_factor REAL DEFAULT 1.0,
    detection_source TEXT DEFAULT 'unknown',
    cleared_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS forecast_drift_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TIMESTAMP NOT NULL,
    entry_type TEXT NOT NULL CHECK(entry_type IN ('morning_correction', 'cloud_discrepancy')),
    morning_deviation_kwh REAL,
    forecast_drift_percent REAL,
    correction_applied BOOLEAN,
    sensor_cloud_percent REAL,
    forecast_cloud_percent REAL,
    discrepancy_percent REAL,
    action TEXT,
    version TEXT DEFAULT '1.0'
);

CREATE INDEX IF NOT EXISTS idx_forecast_drift_timestamp ON forecast_drift_log(timestamp);

CREATE TABLE IF NOT EXISTS hourly_weather_actual (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    hour INTEGER NOT NULL CHECK(hour >= 0 AND hour <= 23),
    temperature_c REAL,
    humidity_percent REAL,
    wind_speed_ms REAL,
    precipitation_mm REAL,
    pressure_hpa REAL,
    solar_radiation_wm2 REAL,
    lux REAL,
    timestamp TIMESTAMP,
    source TEXT,
    cloud_cover_percent REAL,
    cloud_cover_source TEXT,
    frost_detected BOOLEAN,
    frost_score INTEGER,
    frost_confidence REAL,
    dewpoint_c REAL,
    frost_margin_c REAL,
    frost_probability REAL,
    correlation_diff_percent REAL,
    detection_method TEXT,
    wind_frost_factor REAL,
    physical_frost_possible BOOLEAN,
    hours_after_sunrise REAL,
    hours_before_sunset REAL,
    snow_covered_panels BOOLEAN,
    snow_coverage_source TEXT,
    condition TEXT,
    frost_notification_sent BOOLEAN DEFAULT 0,
    frost_type TEXT,
    snow_confidence REAL,
    snow_event_detected BOOLEAN DEFAULT 0,
    snow_clearing_progress REAL,
    outlier_severity REAL DEFAULT NULL,                  -- V16.4.0: Outlier severity 0.0-1.0 @zara
    version TEXT DEFAULT '1.1',
    UNIQUE(date, hour)
);

CREATE INDEX IF NOT EXISTS idx_hourly_weather_actual_date ON hourly_weather_actual(date);

CREATE TABLE IF NOT EXISTS weather_precision_daily (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    hour INTEGER NOT NULL CHECK(hour >= 0 AND hour <= 23),
    temp_forecast REAL,
    temp_actual REAL,
    temp_offset REAL,
    humidity_forecast REAL,
    humidity_actual REAL,
    humidity_factor REAL,
    wind_forecast REAL,
    wind_actual REAL,
    wind_factor REAL,
    rain_forecast REAL,
    rain_actual REAL,
    rain_difference REAL,
    pressure_forecast REAL,
    pressure_actual REAL,
    pressure_offset REAL,
    solar_forecast REAL,
    solar_actual REAL,
    solar_factor REAL,
    clouds_forecast REAL,
    clouds_actual REAL,
    clouds_factor REAL,
    UNIQUE(date, hour)
);

CREATE INDEX IF NOT EXISTS idx_weather_precision_daily_date ON weather_precision_daily(date);

CREATE TABLE IF NOT EXISTS weather_precision_daily_summary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL UNIQUE,
    hours_tracked INTEGER,
    avg_temp_offset REAL,
    avg_pressure_offset REAL,
    avg_solar_factor REAL,
    avg_clouds_factor REAL,
    avg_humidity_factor REAL,
    avg_wind_factor REAL,
    avg_rain_diff REAL
);

CREATE TABLE IF NOT EXISTS weather_precision_factors (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    temperature_factor REAL DEFAULT 0.0,
    solar_factor REAL DEFAULT 1.0,
    cloud_factor REAL DEFAULT 1.0,
    wind_factor REAL DEFAULT 1.0,
    humidity_factor REAL DEFAULT 1.0,
    rain_factor REAL DEFAULT 1.0,
    pressure_factor REAL DEFAULT 0.0,
    sample_days INTEGER DEFAULT 0,
    confidence REAL DEFAULT 0.0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS multi_day_hourly_forecast (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    forecast_date DATE NOT NULL,
    day_type TEXT NOT NULL CHECK(day_type IN ('today', 'tomorrow', 'day_after_tomorrow')),
    hour INTEGER NOT NULL CHECK(hour >= 0 AND hour <= 23),
    prediction_kwh REAL,
    cloud_cover REAL,
    temperature REAL,
    solar_radiation_wm2 REAL,
    weather_source TEXT,
    version TEXT DEFAULT '1.0',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(forecast_date, hour)
);

CREATE INDEX IF NOT EXISTS idx_multi_day_forecast_date ON multi_day_hourly_forecast(forecast_date);

CREATE TABLE IF NOT EXISTS multi_day_hourly_forecast_panels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    forecast_date DATE NOT NULL,
    hour INTEGER NOT NULL,
    group_name TEXT NOT NULL,
    power_kwh REAL,
    contribution_percent REAL,
    poa_wm2 REAL,
    aoi_deg REAL,
    source TEXT,
    UNIQUE(forecast_date, hour, group_name)
);

CREATE VIEW IF NOT EXISTS v_current_calibration AS
SELECT
    g.group_name,
    g.global_factor,
    g.sample_count,
    g.confidence,
    COUNT(DISTINCT b.bucket_name) as bucket_count,
    COUNT(DISTINCT h.hour) as hourly_factors_count,
    g.last_updated
FROM physics_calibration_groups g
LEFT JOIN physics_calibration_buckets b ON g.group_name = b.group_name
LEFT JOIN physics_calibration_hourly h ON g.group_name = h.group_name
GROUP BY g.group_name;

CREATE VIEW IF NOT EXISTS v_today_forecast AS
SELECT
    hp.target_hour,
    hp.prediction_kwh,
    hp.actual_kwh,
    hp.accuracy_percent,
    pwf.temperature as forecast_temp,
    pwf.clouds as forecast_clouds,
    pwf.solar_radiation_wm2 as forecast_radiation,
    pa.sun_elevation_deg,
    pa.theoretical_max_kwh
FROM hourly_predictions hp
LEFT JOIN prediction_weather pwf ON hp.prediction_id = pwf.prediction_id AND pwf.weather_type = 'forecast'
LEFT JOIN prediction_astronomy pa ON hp.prediction_id = pa.prediction_id
WHERE hp.target_date = DATE('now')
ORDER BY hp.target_hour;

CREATE VIEW IF NOT EXISTS v_latest_daily_forecast AS
SELECT
    forecast_type,
    forecast_date,
    prediction_kwh,
    locked,
    source,
    created_at
FROM daily_forecasts
ORDER BY created_at DESC;

CREATE VIEW IF NOT EXISTS v_weather_expert_performance AS
SELECT
    wel.expert_name,
    wel.cloud_type,
    AVG(wel.mae) as avg_mae,
    AVG(wel.weight_after) as avg_weight,
    COUNT(*) as learning_days,
    MAX(wel.learned_at) as last_learned
FROM weather_expert_learning wel
GROUP BY wel.expert_name, wel.cloud_type
ORDER BY wel.cloud_type, avg_mae;

CREATE VIEW IF NOT EXISTS v_weather_precision_summary AS
SELECT
    date,
    hours_tracked,
    ROUND(avg_temp_offset, 2) as temp_offset,
    ROUND(avg_clouds_factor, 3) as clouds_factor,
    ROUND(avg_solar_factor, 3) as solar_factor,
    ROUND(avg_humidity_factor, 3) as humidity_factor
FROM weather_precision_daily_summary
ORDER BY date DESC;

CREATE VIEW IF NOT EXISTS v_multi_day_forecast_summary AS
SELECT
    mdf.forecast_date,
    mdf.day_type,
    SUM(mdf.prediction_kwh) as total_kwh,
    MAX(mdf.prediction_kwh) as peak_kwh,
    COUNT(CASE WHEN mdf.prediction_kwh > 0 THEN 1 END) as production_hours
FROM multi_day_hourly_forecast mdf
GROUP BY mdf.forecast_date, mdf.day_type
ORDER BY mdf.forecast_date;

-- ============================================================================
-- ADDITIONAL TABLES FOR COMPLETE JSON TO SQLITE MIGRATION
-- ============================================================================

-- Daily forecast tracking (best_hour, next_hour, production_time, peaks, yields, etc.)
CREATE TABLE IF NOT EXISTS daily_forecast_tracking (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    date DATE NOT NULL,

    -- Best Hour Forecast
    forecast_best_hour INTEGER,
    forecast_best_hour_kwh REAL,
    forecast_best_hour_locked BOOLEAN DEFAULT FALSE,
    forecast_best_hour_locked_at TIMESTAMP,
    forecast_best_hour_source TEXT,

    -- Actual Best Hour
    actual_best_hour INTEGER,
    actual_best_hour_kwh REAL,
    actual_best_hour_saved_at TIMESTAMP,

    -- Next Hour Forecast
    forecast_next_hour_period TEXT,
    forecast_next_hour_kwh REAL,
    forecast_next_hour_updated_at TIMESTAMP,
    forecast_next_hour_source TEXT,

    -- Production Time
    production_time_active BOOLEAN DEFAULT FALSE,
    production_time_duration_seconds INTEGER,
    production_time_start TIMESTAMP,
    production_time_end TIMESTAMP,
    production_time_last_power_above_10w TIMESTAMP,
    production_time_zero_power_since TIMESTAMP,

    -- Peak Today
    peak_today_power_w REAL,
    peak_today_at TIMESTAMP,

    -- Yield Today
    yield_today_kwh REAL,
    yield_today_sensor TEXT,

    -- Consumption Today
    consumption_today_kwh REAL,
    consumption_today_sensor TEXT,

    -- Autarky
    autarky_percent REAL,
    autarky_calculated_at TIMESTAMP,

    -- Finalized
    finalized_yield_kwh REAL,
    finalized_consumption_kwh REAL,
    finalized_production_hours TEXT,
    finalized_accuracy_percent REAL,
    finalized_excluded_hours_count INTEGER,
    finalized_excluded_hours_total INTEGER,
    finalized_excluded_hours_ratio REAL,
    finalized_excluded_hours_reasons TEXT,
    conservative_planning_forecast_kwh REAL,
    conservative_planning_forecast_updated_at TIMESTAMP,
    conservative_planning_forecast_hours_json TEXT,
    conservative_planning_forecast_panel_groups_json TEXT,
    conservative_planning_forecast_group_totals_json TEXT,
    finalized_at TIMESTAMP,

    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily statistics (all_time_peak, current_week, current_month, etc.)
CREATE TABLE IF NOT EXISTS daily_statistics (
    id INTEGER PRIMARY KEY CHECK (id = 1),

    -- All Time Peak
    all_time_peak_power_w REAL,
    all_time_peak_date DATE,
    all_time_peak_at TIMESTAMP,

    -- Current Week
    current_week_period TEXT,
    current_week_date_range TEXT,
    current_week_yield_kwh REAL,
    current_week_consumption_kwh REAL,
    current_week_days INTEGER,
    current_week_updated_at TIMESTAMP,

    -- Current Month
    current_month_period TEXT,
    current_month_yield_kwh REAL,
    current_month_consumption_kwh REAL,
    current_month_avg_autarky REAL,
    current_month_days INTEGER,
    current_month_updated_at TIMESTAMP,

    -- Last 7 Days
    last_7_days_avg_yield_kwh REAL,
    last_7_days_avg_accuracy REAL,
    last_7_days_avg_evaluation_coverage_percent REAL,
    last_7_days_avg_excluded_mppt_hours REAL,
    last_7_days_total_yield_kwh REAL,
    last_7_days_calculated_at TIMESTAMP,

    -- Last 30 Days
    last_30_days_avg_yield_kwh REAL,
    last_30_days_avg_accuracy REAL,
    last_30_days_avg_evaluation_coverage_percent REAL,
    last_30_days_avg_excluded_mppt_hours REAL,
    last_30_days_total_yield_kwh REAL,
    last_30_days_calculated_at TIMESTAMP,

    -- Last 365 Days
    last_365_days_avg_yield_kwh REAL,
    last_365_days_total_yield_kwh REAL,
    last_365_days_calculated_at TIMESTAMP,

    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Forecast history (history array from daily_forecasts.json)
CREATE TABLE IF NOT EXISTS forecast_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL UNIQUE,
    predicted_kwh REAL,
    actual_kwh REAL,
    consumption_kwh REAL,
    autarky REAL,
    accuracy REAL,
    production_hours TEXT,
    peak_power REAL,
    source TEXT,
    excluded_hours_count INTEGER,
    excluded_hours_total INTEGER,
    excluded_hours_ratio REAL,
    excluded_hours_reasons TEXT,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_forecast_history_date ON forecast_history(date);

-- Shadow detection details (shadow_detection from hourly_predictions.json)
CREATE TABLE IF NOT EXISTS hourly_shadow_detection (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prediction_id TEXT NOT NULL UNIQUE,
    method TEXT,
    ensemble_mode TEXT,
    shadow_type TEXT,
    shadow_percent REAL,
    confidence REAL,
    root_cause TEXT,
    fusion_mode TEXT,
    efficiency_ratio REAL,
    loss_kwh REAL,
    theoretical_max_kwh REAL,
    interpretation TEXT,

    -- Theory Ratio Method
    theory_ratio_shadow_type TEXT,
    theory_ratio_shadow_percent REAL,
    theory_ratio_confidence REAL,
    theory_ratio_efficiency_ratio REAL,
    theory_ratio_clear_sky_wm2 REAL,
    theory_ratio_actual_wm2 REAL,
    theory_ratio_loss_kwh REAL,
    theory_ratio_root_cause TEXT,

    -- Sensor Fusion Method
    sensor_fusion_shadow_type TEXT,
    sensor_fusion_shadow_percent REAL,
    sensor_fusion_confidence REAL,
    sensor_fusion_efficiency_ratio REAL,
    sensor_fusion_loss_kwh REAL,
    sensor_fusion_root_cause TEXT,
    sensor_fusion_lux_factor REAL,
    sensor_fusion_lux_shadow_percent REAL,
    sensor_fusion_irradiance_factor REAL,
    sensor_fusion_irradiance_shadow_percent REAL,

    -- Weights
    weight_theory_ratio REAL,
    weight_sensor_fusion REAL,

    FOREIGN KEY (prediction_id) REFERENCES hourly_predictions(prediction_id) ON DELETE CASCADE
);

-- V17.0.0: Per-group shadow detection details @zara
CREATE TABLE IF NOT EXISTS shadow_detection_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prediction_id TEXT NOT NULL,
    group_name TEXT NOT NULL,
    shadow_type TEXT,
    shadow_percent REAL,
    confidence REAL,
    root_cause TEXT,
    efficiency_ratio REAL,
    loss_kwh REAL,
    theoretical_max_kwh REAL,
    actual_kwh REAL,
    FOREIGN KEY (prediction_id) REFERENCES hourly_predictions(prediction_id) ON DELETE CASCADE,
    UNIQUE(prediction_id, group_name)
);

CREATE INDEX IF NOT EXISTS idx_shadow_detection_groups_prediction
    ON shadow_detection_groups(prediction_id);

-- Production metrics (production_metrics from hourly_predictions.json)
CREATE TABLE IF NOT EXISTS hourly_production_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prediction_id TEXT NOT NULL UNIQUE,
    peak_power_today_kwh REAL,
    production_hours_today INTEGER,
    cumulative_today_kwh REAL,
    FOREIGN KEY (prediction_id) REFERENCES hourly_predictions(prediction_id) ON DELETE CASCADE
);

-- Historical context (historical_context from hourly_predictions.json)
CREATE TABLE IF NOT EXISTS hourly_historical_context (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prediction_id TEXT NOT NULL UNIQUE,
    yesterday_same_hour REAL,
    same_hour_avg_7days REAL,
    FOREIGN KEY (prediction_id) REFERENCES hourly_predictions(prediction_id) ON DELETE CASCADE
);

-- Panel group accuracy details (panel_group_accuracy from hourly_predictions.json)
CREATE TABLE IF NOT EXISTS hourly_panel_group_accuracy (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prediction_id TEXT NOT NULL,
    group_name TEXT NOT NULL,
    prediction_kwh REAL,
    actual_kwh REAL,
    error_kwh REAL,
    error_percent REAL,
    accuracy_percent REAL,
    FOREIGN KEY (prediction_id) REFERENCES hourly_predictions(prediction_id) ON DELETE CASCADE,
    UNIQUE(prediction_id, group_name)
);

-- Daily patterns (patterns array from daily_summaries.json)
CREATE TABLE IF NOT EXISTS daily_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    pattern_type TEXT NOT NULL,
    hours TEXT,
    severity TEXT,
    avg_error_percent REAL,
    confidence REAL,
    first_detected TIMESTAMP,
    occurrence_count INTEGER,
    seasonal BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (date) REFERENCES daily_summaries(date) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_daily_patterns_date ON daily_patterns(date);

-- Daily recommendations (recommendations array from daily_summaries.json)
CREATE TABLE IF NOT EXISTS daily_recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    recommendation_type TEXT NOT NULL,
    priority TEXT,
    action TEXT,
    hours TEXT,
    factor REAL,
    reason TEXT,
    FOREIGN KEY (date) REFERENCES daily_summaries(date) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_daily_recommendations_date ON daily_recommendations(date);

-- ============================================================================
-- V16.1: WEATHER PRECISION EXTENSION TABLES
-- Fix for weather_forecast_corrected.json migration
-- ============================================================================

-- Hourly correction factors for fine-grained precision learning
-- Stores per-hour factors for solar_radiation, clouds, etc.
CREATE TABLE IF NOT EXISTS weather_precision_hourly_factors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hour INTEGER NOT NULL CHECK(hour >= 0 AND hour <= 23),
    factor_type TEXT NOT NULL CHECK(factor_type IN (
        'solar_radiation_wm2', 'clouds', 'temperature', 'humidity', 'wind', 'rain', 'pressure'
    )),
    factor_value REAL NOT NULL DEFAULT 1.0,
    sample_count INTEGER DEFAULT 0,
    confidence REAL DEFAULT 0.0,
    std_dev REAL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hour, factor_type)
);

CREATE INDEX IF NOT EXISTS idx_weather_precision_hourly_hour
    ON weather_precision_hourly_factors(hour);

-- Weather-specific factors for clear/cloudy conditions
-- Separate learning for different weather types improves accuracy
CREATE TABLE IF NOT EXISTS weather_precision_weather_specific (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weather_type TEXT NOT NULL CHECK(weather_type IN ('clear', 'cloudy', 'mixed')),
    factor_type TEXT NOT NULL CHECK(factor_type IN (
        'solar_radiation_wm2', 'clouds', 'temperature', 'humidity', 'wind', 'rain', 'pressure'
    )),
    factor_value REAL NOT NULL DEFAULT 1.0,
    sample_days INTEGER DEFAULT 0,
    confidence REAL DEFAULT 0.0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(weather_type, factor_type)
);

-- Per-panel-group POA (plane-of-array) radiation data
-- Critical for accurate tilted-panel calculations
CREATE TABLE IF NOT EXISTS astronomy_cache_panel_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_date DATE NOT NULL,
    hour INTEGER NOT NULL CHECK(hour >= 0 AND hour <= 23),
    group_name TEXT NOT NULL,
    power_kwp REAL NOT NULL,
    azimuth_deg REAL NOT NULL,
    tilt_deg REAL NOT NULL,
    theoretical_kwh REAL,
    poa_wm2 REAL,
    aoi_deg REAL,
    UNIQUE(cache_date, hour, group_name)
);

CREATE INDEX IF NOT EXISTS idx_astronomy_cache_panel_groups_date
    ON astronomy_cache_panel_groups(cache_date);

CREATE INDEX IF NOT EXISTS idx_astronomy_cache_panel_groups_date_hour
    ON astronomy_cache_panel_groups(cache_date, hour);

-- ============================================================================
-- V16.0.0: STATISTICS & BILLING TABLES
-- Added for energy billing, tariff tracking, and forecast comparison @zara
-- ============================================================================

-- Settings for statistics module
CREATE TABLE IF NOT EXISTS stats_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Monthly electricity tariffs
CREATE TABLE IF NOT EXISTS stats_monthly_tariffs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year_month TEXT NOT NULL UNIQUE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    price_ct_kwh REAL NOT NULL,
    feed_in_tariff_ct REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stats_monthly_tariffs_year_month ON stats_monthly_tariffs(year_month);

-- Hourly price history (dynamic pricing support)
CREATE TABLE IF NOT EXISTS stats_price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    datetime TEXT NOT NULL UNIQUE,
    date TEXT NOT NULL,
    hour INTEGER NOT NULL CHECK(hour >= 0 AND hour <= 23),
    price_ct_kwh REAL NOT NULL,
    price_source TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stats_price_history_date ON stats_price_history(date);
CREATE INDEX IF NOT EXISTS idx_stats_price_history_datetime ON stats_price_history(datetime);

-- Power source measurements (real-time flow tracking)
CREATE TABLE IF NOT EXISTS stats_power_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL UNIQUE,
    date TEXT NOT NULL,
    hour INTEGER NOT NULL CHECK(hour >= 0 AND hour <= 23),
    solar_power_w REAL DEFAULT 0,
    grid_power_w REAL DEFAULT 0,
    battery_power_w REAL DEFAULT 0,
    house_consumption_w REAL DEFAULT 0,
    solar_to_house_w REAL DEFAULT 0,
    solar_to_battery_w REAL DEFAULT 0,
    solar_to_grid_w REAL DEFAULT 0,
    battery_to_house_w REAL DEFAULT 0,
    grid_to_house_w REAL DEFAULT 0,
    grid_to_battery_w REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stats_power_sources_date ON stats_power_sources(date);
CREATE INDEX IF NOT EXISTS idx_stats_power_sources_timestamp ON stats_power_sources(timestamp);

-- Hourly billing data (energy flows with costs)
CREATE TABLE IF NOT EXISTS stats_hourly_billing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hour_key TEXT NOT NULL UNIQUE,
    date TEXT NOT NULL,
    hour INTEGER NOT NULL CHECK(hour >= 0 AND hour <= 23),
    grid_import_kwh REAL DEFAULT 0,
    grid_import_cost_ct REAL DEFAULT 0,
    grid_export_kwh REAL DEFAULT 0,
    feed_in_revenue_ct REAL DEFAULT 0,
    feed_in_tariff_ct REAL DEFAULT 0,
    price_ct_kwh REAL DEFAULT 0,
    grid_to_house_kwh REAL DEFAULT 0,
    grid_to_house_cost_ct REAL DEFAULT 0,
    grid_to_battery_kwh REAL DEFAULT 0,
    grid_to_battery_cost_ct REAL DEFAULT 0,
    solar_yield_kwh REAL DEFAULT 0,
    solar_to_house_kwh REAL DEFAULT 0,
    solar_to_battery_kwh REAL DEFAULT 0,
    battery_to_house_kwh REAL DEFAULT 0,
    home_consumption_kwh REAL DEFAULT 0,
    data_source TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stats_hourly_billing_date ON stats_hourly_billing(date);
CREATE INDEX IF NOT EXISTS idx_stats_hourly_billing_hour_key ON stats_hourly_billing(hour_key);

-- Daily energy summary
CREATE TABLE IF NOT EXISTS stats_daily_energy (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    solar_yield_kwh REAL DEFAULT 0,
    grid_import_kwh REAL DEFAULT 0,
    grid_export_kwh REAL DEFAULT 0,
    battery_charge_solar_kwh REAL DEFAULT 0,
    battery_charge_grid_kwh REAL DEFAULT 0,
    battery_to_house_kwh REAL DEFAULT 0,
    solar_to_house_kwh REAL DEFAULT 0,
    solar_to_battery_kwh REAL DEFAULT 0,
    grid_to_house_kwh REAL DEFAULT 0,
    home_consumption_kwh REAL DEFAULT 0,
    self_consumption_kwh REAL DEFAULT 0,
    autarkie_percent REAL DEFAULT 0,
    avg_price_ct REAL DEFAULT 0,
    total_cost_eur REAL DEFAULT 0,
    feed_in_revenue_eur REAL DEFAULT 0,
    savings_eur REAL DEFAULT 0,
    peak_solar_w REAL DEFAULT 0,
    peak_solar_time TEXT,
    grid_to_battery_kwh REAL DEFAULT 0,
    smartmeter_import_kwh REAL DEFAULT 0,
    smartmeter_export_kwh REAL DEFAULT 0,
    consumer_heatpump_kwh REAL DEFAULT 0,
    consumer_heatingrod_kwh REAL DEFAULT 0,
    consumer_wallbox_kwh REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stats_daily_energy_date ON stats_daily_energy(date);

-- Billing period totals (configurable billing cycles)
CREATE TABLE IF NOT EXISTS stats_billing_totals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    billing_start_date TEXT NOT NULL UNIQUE,
    billing_start_day INTEGER DEFAULT 1,
    billing_start_month INTEGER DEFAULT 1,
    grid_import_kwh REAL DEFAULT 0,
    grid_import_cost_eur REAL DEFAULT 0,
    grid_export_kwh REAL DEFAULT 0,
    feed_in_revenue_eur REAL DEFAULT 0,
    solar_yield_kwh REAL DEFAULT 0,
    solar_to_house_kwh REAL DEFAULT 0,
    solar_to_battery_kwh REAL DEFAULT 0,
    battery_to_house_kwh REAL DEFAULT 0,
    grid_to_house_kwh REAL DEFAULT 0,
    grid_to_house_cost_eur REAL DEFAULT 0,
    grid_to_battery_kwh REAL DEFAULT 0,
    grid_to_battery_cost_eur REAL DEFAULT 0,
    home_consumption_kwh REAL DEFAULT 0,
    self_consumption_kwh REAL DEFAULT 0,
    autarkie_percent REAL DEFAULT 0,
    savings_eur REAL DEFAULT 0,
    net_benefit_eur REAL DEFAULT 0,
    hours_count INTEGER DEFAULT 0,
    avg_price_ct REAL DEFAULT 0,
    avg_feed_in_tariff_ct REAL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Forecast comparison with external sources
CREATE TABLE IF NOT EXISTS stats_forecast_comparison (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    actual_kwh REAL,
    sfml_forecast_kwh REAL,
    sfml_accuracy_percent REAL,
    external_1_kwh REAL,
    external_1_accuracy_percent REAL,
    external_2_kwh REAL,
    external_2_accuracy_percent REAL,
    best_source TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stats_forecast_comparison_date ON stats_forecast_comparison(date);

-- ============================================================================
-- V16.2: SHADOW PATTERN LEARNING TABLES
-- Self-learning system for shadow detection patterns @zara
-- ============================================================================

-- Hourly shadow patterns - learned occurrence rates and characteristics per hour
CREATE TABLE IF NOT EXISTS shadow_pattern_hourly (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_name TEXT NOT NULL DEFAULT '_system_',     -- V17.0.0: Per-group patterns @zara
    hour INTEGER NOT NULL CHECK(hour >= 0 AND hour <= 23),
    -- Occurrence statistics
    shadow_occurrence_rate REAL DEFAULT 0.0,        -- % of days with shadow at this hour
    avg_shadow_percent REAL DEFAULT 0.0,            -- Average shadow % when shadow occurs
    std_dev_shadow_percent REAL DEFAULT 0.0,        -- Standard deviation (consistency indicator)
    -- Root cause distribution (sum should = 1.0)
    pct_weather_clouds REAL DEFAULT 0.0,            -- % attributed to clouds
    pct_building_tree REAL DEFAULT 0.0,             -- % attributed to fixed obstruction
    pct_low_sun REAL DEFAULT 0.0,                   -- % attributed to low sun angle
    pct_other REAL DEFAULT 0.0,                     -- % attributed to other causes
    -- Classification
    pattern_type TEXT DEFAULT 'unknown' CHECK(pattern_type IN (
        'no_shadow', 'occasional', 'frequent', 'fixed_obstruction', 'unknown'
    )),
    confidence REAL DEFAULT 0.0,                    -- 0-1 confidence in pattern
    -- Sample tracking
    sample_count INTEGER DEFAULT 0,
    shadow_days INTEGER DEFAULT 0,                  -- Days where shadow was detected
    clear_days INTEGER DEFAULT 0,                   -- Days where no shadow detected
    -- Timing
    first_learned DATE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_name, hour)
);

-- Seasonal shadow patterns - patterns vary by month due to sun position
CREATE TABLE IF NOT EXISTS shadow_pattern_seasonal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_name TEXT NOT NULL DEFAULT '_system_',     -- V17.0.0: Per-group patterns @zara
    month INTEGER NOT NULL CHECK(month >= 1 AND month <= 12),
    hour INTEGER NOT NULL CHECK(hour >= 0 AND hour <= 23),
    -- Seasonal adjustments to hourly patterns
    shadow_occurrence_rate REAL DEFAULT 0.0,
    avg_shadow_percent REAL DEFAULT 0.0,
    std_dev_shadow_percent REAL DEFAULT 0.0,
    -- Dominant cause for this month/hour combination
    dominant_cause TEXT DEFAULT 'unknown',
    -- Sample tracking
    sample_count INTEGER DEFAULT 0,
    shadow_days INTEGER DEFAULT 0,
    confidence REAL DEFAULT 0.0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_name, month, hour)
);

-- Shadow learning history - raw daily learning data for analysis
CREATE TABLE IF NOT EXISTS shadow_learning_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_name TEXT NOT NULL DEFAULT '_system_',     -- V17.0.0: Per-group history @zara
    date DATE NOT NULL,
    hour INTEGER NOT NULL CHECK(hour >= 0 AND hour <= 23),
    -- Detection results for this hour
    shadow_detected BOOLEAN NOT NULL,
    shadow_type TEXT,                               -- none/light/moderate/heavy
    shadow_percent REAL,
    root_cause TEXT,
    confidence REAL,
    -- Context data for analysis
    sun_elevation_deg REAL,
    cloud_cover_percent REAL,
    theoretical_max_kwh REAL,
    actual_kwh REAL,
    efficiency_ratio REAL,
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_name, date, hour)
);

CREATE INDEX IF NOT EXISTS idx_shadow_learning_history_date
    ON shadow_learning_history(date);

CREATE INDEX IF NOT EXISTS idx_shadow_learning_history_hour
    ON shadow_learning_history(hour);

-- Shadow pattern config - learning parameters and state
CREATE TABLE IF NOT EXISTS shadow_pattern_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    -- Learning parameters
    rolling_window_days INTEGER DEFAULT 30,         -- Days of history to consider
    min_samples_for_pattern INTEGER DEFAULT 7,      -- Min samples before pattern is valid
    ema_alpha REAL DEFAULT 0.15,                    -- EMA smoothing factor
    fixed_obstruction_threshold REAL DEFAULT 0.7,   -- Occurrence rate to classify as fixed
    -- Learning state
    total_days_learned INTEGER DEFAULT 0,
    total_hours_learned INTEGER DEFAULT 0,
    last_learning_date DATE,
    patterns_detected INTEGER DEFAULT 0,
    fixed_obstructions_detected INTEGER DEFAULT 0,
    -- Version tracking
    version TEXT DEFAULT '1.0',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- V17.0.0: DRIFT DETECTION & MONITORING TABLES
-- Rolling metrics, CUSUM state, events and response config @zara
-- ============================================================================

-- Rolling-window drift metrics per scope and time window
CREATE TABLE IF NOT EXISTS drift_metrics_rolling (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scope TEXT NOT NULL,                             -- 'global' or group_name
    window_days INTEGER NOT NULL,                    -- 7, 14, 30, 60
    season TEXT,                                     -- 'winter','spring','summer','autumn' or NULL
    mae REAL,
    rmse REAL,
    bias REAL,                                       -- mean(predicted - actual)
    coverage_10 REAL,                                -- % within +-10%
    coverage_20 REAL,                                -- % within +-20%
    sample_count INTEGER,
    calculated_at TIMESTAMP,
    UNIQUE(scope, window_days, season)
);

-- Bucket-specific drift metrics (cloud x hour x season)
CREATE TABLE IF NOT EXISTS drift_metrics_bucket (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scope TEXT NOT NULL,                              -- 'global' or group_name
    cloud_bucket TEXT NOT NULL,                       -- 'clear','partly_cloudy','overcast'
    hour_bucket TEXT NOT NULL,                        -- 'morning','midday','afternoon'
    season TEXT,
    mae REAL,
    mae_baseline REAL,                               -- 90-day reference
    mae_ratio REAL,                                  -- mae / mae_baseline (>1.15 = drift)
    bias REAL,
    sample_count INTEGER,
    calculated_at TIMESTAMP,
    UNIQUE(scope, cloud_bucket, hour_bucket, season)
);

-- Detected drift events
CREATE TABLE IF NOT EXISTS drift_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_date DATE NOT NULL,
    scope TEXT NOT NULL,                              -- 'global' or group_name
    drift_type TEXT NOT NULL,                         -- 'mae_above_baseline','bias_shift','cusum_alert','coverage_drop'
    severity TEXT NOT NULL,                           -- 'info','warning','critical'
    bucket_detail TEXT,                               -- e.g. 'clear/midday' or NULL
    metric_value REAL,
    threshold_value REAL,
    description TEXT,
    response_action TEXT,                             -- 'light_retrain','physics_boost','full_reset','none'
    response_executed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_drift_events_date ON drift_events(event_date);
CREATE INDEX IF NOT EXISTS idx_drift_events_scope ON drift_events(scope);

-- CUSUM algorithm persistent state
CREATE TABLE IF NOT EXISTS drift_cusum_state (
    scope TEXT NOT NULL UNIQUE,
    cusum_pos REAL DEFAULT 0,
    cusum_neg REAL DEFAULT 0,
    target_mean REAL DEFAULT 0,
    last_reset DATE,
    alert_count INTEGER DEFAULT 0
);

-- Configurable drift response thresholds (singleton)
CREATE TABLE IF NOT EXISTS drift_response_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    mae_ratio_warning REAL DEFAULT 1.15,
    mae_ratio_critical REAL DEFAULT 1.25,
    bias_threshold REAL DEFAULT 0.15,
    cusum_threshold REAL DEFAULT 5.0,
    coverage_20_min REAL DEFAULT 0.60,
    physics_boost_amount REAL DEFAULT 0.20,
    physics_boost_max_days INTEGER DEFAULT 7,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- V16.0.0: LIVE SENSOR STORAGE TABLES
-- Real-time sensor data storage for power, energy and weather @zara
-- ============================================================================

-- Power Live (Watt) - rolling 2 days, for real-time monitoring
CREATE TABLE IF NOT EXISTS sensor_power_live (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    power_watt REAL,              -- power_entity (main solar power)
    solar_to_battery_watt REAL    -- solar to battery power (if configured)
);

CREATE INDEX IF NOT EXISTS idx_sensor_power_live_timestamp
    ON sensor_power_live(timestamp);

-- Energy Hourly (kWh) - permanent, recorded at full hour
CREATE TABLE IF NOT EXISTS sensor_energy_hourly (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    date DATE NOT NULL,
    hour INTEGER NOT NULL CHECK(hour >= 0 AND hour <= 23),
    yield_total_kwh REAL,         -- solar_yield_today total
    yield_gruppe1_kwh REAL,       -- Panel Gruppe 1 energy
    yield_gruppe2_kwh REAL,       -- Panel Gruppe 2 energy
    consumption_kwh REAL,         -- Hausverbrauch
    UNIQUE(date, hour)
);

CREATE INDEX IF NOT EXISTS idx_sensor_energy_hourly_date
    ON sensor_energy_hourly(date);

-- Weather Sensors (5 min) - permanent, external sensor readings
CREATE TABLE IF NOT EXISTS sensor_weather (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    temperature REAL,             -- °C
    humidity REAL,                -- %
    wind_speed REAL,              -- m/s
    rain REAL,                    -- mm
    lux REAL,                     -- lx
    pressure REAL,                -- hPa
    solar_radiation REAL          -- W/m²
);

CREATE INDEX IF NOT EXISTS idx_sensor_weather_timestamp
    ON sensor_weather(timestamp);

-- Monthly Statistics (permanent, 1 entry per month)
CREATE TABLE IF NOT EXISTS sensor_monthly_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK(month >= 1 AND month <= 12),
    yield_total_kwh REAL,           -- Gesamtertrag Monat
    consumption_total_kwh REAL,     -- Gesamtverbrauch Monat
    avg_autarky_percent REAL,       -- Durchschn. Autarkie
    avg_accuracy_percent REAL,      -- Durchschn. Prognosegenauigkeit
    peak_power_w REAL,              -- Max Peak des Monats
    peak_power_date DATE,           -- Datum des Max Peak
    production_days INTEGER,        -- Tage mit Produktion
    best_day_kwh REAL,              -- Bester Tag (kWh)
    best_day_date DATE,             -- Datum bester Tag
    worst_day_kwh REAL,             -- Schlechtester Tag (kWh)
    worst_day_date DATE,            -- Datum schlechtester Tag
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(year, month)
);

CREATE INDEX IF NOT EXISTS idx_sensor_monthly_stats_year_month
    ON sensor_monthly_stats(year, month);

CREATE TABLE IF NOT EXISTS panel_group_config_epochs (
    epoch_id INTEGER PRIMARY KEY AUTOINCREMENT,
    topology_hash TEXT NOT NULL,
    valid_from TIMESTAMP NOT NULL,
    valid_to TIMESTAMP,
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS panel_group_config_epoch_groups (
    epoch_group_id INTEGER PRIMARY KEY AUTOINCREMENT,
    epoch_id INTEGER NOT NULL,
    group_uid TEXT NOT NULL,
    group_lineage_uid TEXT NOT NULL,
    display_name TEXT NOT NULL,
    power_wp REAL NOT NULL,
    azimuth REAL NOT NULL,
    tilt REAL NOT NULL,
    energy_sensor TEXT,
    group_signature TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (epoch_id) REFERENCES panel_group_config_epochs(epoch_id) ON DELETE CASCADE,
    UNIQUE(epoch_id, display_name)
);

CREATE INDEX IF NOT EXISTS idx_panel_group_epochs_active
ON panel_group_config_epochs(valid_to, valid_from);

CREATE INDEX IF NOT EXISTS idx_panel_group_epoch_groups_lookup
ON panel_group_config_epoch_groups(epoch_id, display_name);

CREATE INDEX IF NOT EXISTS idx_prediction_panel_groups_topology
ON prediction_panel_groups(config_epoch_id, group_uid, group_name);
