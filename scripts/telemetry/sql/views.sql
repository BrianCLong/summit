-- v_run_summary: Aggregate stats per run
CREATE VIEW IF NOT EXISTS v_run_summary AS
SELECT
    r.run_id,
    r.sha,
    r.config_hash,
    r.started_at,
    COUNT(j.job_id) as total_jobs,
    MAX(j.duration_s) as max_job_duration,
    SUM(j.duration_s) as total_compute_seconds
FROM runs r
LEFT JOIN jobs j ON r.run_id = j.run_id
GROUP BY r.run_id;

-- v_regression_candidates: Compare current runs against baseline by config_hash
CREATE VIEW IF NOT EXISTS v_regression_candidates AS
SELECT
    r.run_id,
    r.config_hash,
    r.sha,
    r.files_changed,
    j.name as job_name,
    j.duration_s,
    AVG(base.duration_s) as baseline_duration,
    (j.duration_s - AVG(base.duration_s)) / AVG(base.duration_s) as pct_change
FROM runs r
JOIN jobs j ON r.run_id = j.run_id
JOIN runs base ON r.config_hash = base.config_hash
    AND base.started_at < r.started_at
    AND base.started_at > datetime(r.started_at, '-7 days')
JOIN jobs base_j ON base.run_id = base_j.run_id AND base_j.name = j.name
GROUP BY r.run_id, j.name;
