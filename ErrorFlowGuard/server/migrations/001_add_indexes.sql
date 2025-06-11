
-- Indexes critiques pour les performances FlowGuard
CREATE INDEX IF NOT EXISTS idx_error_reports_app_id ON error_reports(app_id);
CREATE INDEX IF NOT EXISTS idx_error_reports_timestamp ON error_reports(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_reports_source ON error_reports(source);
CREATE INDEX IF NOT EXISTS idx_error_reports_type ON error_reports(type);
CREATE INDEX IF NOT EXISTS idx_error_reports_resolved ON error_reports(resolved);

-- Index composite pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_error_reports_app_timestamp ON error_reports(app_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_reports_app_source ON error_reports(app_id, source);

-- Index pour les apps
CREATE INDEX IF NOT EXISTS idx_apps_user_id ON apps(user_id);
CREATE INDEX IF NOT EXISTS idx_apps_api_key ON apps(api_key);
CREATE INDEX IF NOT EXISTS idx_apps_plan ON apps(plan);
