CREATE TABLE IF NOT EXISTS graph_degree_metrics_v1 (
    tenant_id VARCHAR(255) NOT NULL,
    label VARCHAR(255) NOT NULL,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    window_end TIMESTAMP WITH TIME ZONE NOT NULL,
    sample_n INTEGER NOT NULL,
    mean_deg DOUBLE PRECISION NOT NULL,
    skew_deg DOUBLE PRECISION NOT NULL,
    top1p_mass DOUBLE PRECISION NOT NULL,
    evidence_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, label, window_end)
);
