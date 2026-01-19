CREATE TABLE IF NOT EXISTS runs (
    run_id TEXT PRIMARY KEY,
    repo TEXT,
    sha TEXT,
    parent_sha TEXT,
    branch TEXT,
    event TEXT,
    config_hash TEXT,
    files_changed INTEGER,
    loc_delta INTEGER,
    queued_at DATETIME,
    started_at DATETIME,
    ended_at DATETIME,
    status TEXT
);

CREATE TABLE IF NOT EXISTS jobs (
    job_id TEXT PRIMARY KEY,
    run_id TEXT,
    name TEXT,
    runner_label TEXT,
    queued_s REAL,
    duration_s REAL,
    cache_hits INTEGER,
    cache_misses INTEGER,
    FOREIGN KEY(run_id) REFERENCES runs(run_id)
);

CREATE TABLE IF NOT EXISTS steps (
    step_id TEXT PRIMARY KEY,
    job_id TEXT,
    name TEXT,
    duration_s REAL,
    exit_code INTEGER,
    FOREIGN KEY(job_id) REFERENCES jobs(job_id)
);

CREATE INDEX IF NOT EXISTS idx_runs_config_hash ON runs(config_hash);
CREATE INDEX IF NOT EXISTS idx_jobs_run_id ON jobs(run_id);
