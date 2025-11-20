-- Network Analysis Database Schema
-- For PostgreSQL

-- Networks table
CREATE TABLE IF NOT EXISTS networks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    directed BOOLEAN DEFAULT false,
    weighted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_networks_created_at ON networks(created_at DESC);

-- Network nodes
CREATE TABLE IF NOT EXISTS network_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id UUID REFERENCES networks(id) ON DELETE CASCADE,
    node_id VARCHAR(255) NOT NULL,
    label VARCHAR(255),
    node_type VARCHAR(100),
    attributes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(network_id, node_id)
);

CREATE INDEX idx_network_nodes_network_id ON network_nodes(network_id);
CREATE INDEX idx_network_nodes_node_id ON network_nodes(node_id);
CREATE INDEX idx_network_nodes_type ON network_nodes(node_type);
CREATE INDEX idx_network_nodes_attributes ON network_nodes USING GIN(attributes);

-- Network edges
CREATE TABLE IF NOT EXISTS network_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id UUID REFERENCES networks(id) ON DELETE CASCADE,
    source_node_id VARCHAR(255) NOT NULL,
    target_node_id VARCHAR(255) NOT NULL,
    edge_type VARCHAR(100),
    weight FLOAT DEFAULT 1.0,
    directed BOOLEAN DEFAULT true,
    attributes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_network_edges_network_id ON network_edges(network_id);
CREATE INDEX idx_network_edges_source ON network_edges(source_node_id);
CREATE INDEX idx_network_edges_target ON network_edges(target_node_id);
CREATE INDEX idx_network_edges_type ON network_edges(edge_type);
CREATE INDEX idx_network_edges_attributes ON network_edges USING GIN(attributes);

-- Centrality scores
CREATE TABLE IF NOT EXISTS centrality_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id UUID REFERENCES networks(id) ON DELETE CASCADE,
    node_id VARCHAR(255) NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    score FLOAT NOT NULL,
    calculated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(network_id, node_id, metric_type)
);

CREATE INDEX idx_centrality_network_node ON centrality_scores(network_id, node_id);
CREATE INDEX idx_centrality_metric ON centrality_scores(metric_type);
CREATE INDEX idx_centrality_score ON centrality_scores(score DESC);

-- Communities
CREATE TABLE IF NOT EXISTS communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id UUID REFERENCES networks(id) ON DELETE CASCADE,
    community_id VARCHAR(255) NOT NULL,
    algorithm VARCHAR(100) NOT NULL,
    members JSONB NOT NULL,
    modularity FLOAT,
    density FLOAT,
    detected_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_communities_network_id ON communities(network_id);
CREATE INDEX idx_communities_algorithm ON communities(algorithm);
CREATE INDEX idx_communities_detected_at ON communities(detected_at DESC);

-- Network snapshots (for temporal analysis)
CREATE TABLE IF NOT EXISTS network_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id UUID REFERENCES networks(id) ON DELETE CASCADE,
    snapshot_time TIMESTAMP NOT NULL,
    version VARCHAR(50),
    node_count INTEGER,
    edge_count INTEGER,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_network_snapshots_network_id ON network_snapshots(network_id);
CREATE INDEX idx_network_snapshots_time ON network_snapshots(snapshot_time DESC);

-- Influence scores
CREATE TABLE IF NOT EXISTS influence_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id UUID REFERENCES networks(id) ON DELETE CASCADE,
    node_id VARCHAR(255) NOT NULL,
    influence_value FLOAT NOT NULL,
    reachability FLOAT,
    spread_probability FLOAT,
    calculated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(network_id, node_id)
);

CREATE INDEX idx_influence_network_node ON influence_scores(network_id, node_id);
CREATE INDEX idx_influence_value ON influence_scores(influence_value DESC);

-- Link predictions
CREATE TABLE IF NOT EXISTS link_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id UUID REFERENCES networks(id) ON DELETE CASCADE,
    source_node_id VARCHAR(255) NOT NULL,
    target_node_id VARCHAR(255) NOT NULL,
    score FLOAT NOT NULL,
    method VARCHAR(100) NOT NULL,
    predicted_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_link_predictions_network_id ON link_predictions(network_id);
CREATE INDEX idx_link_predictions_score ON link_predictions(score DESC);
CREATE INDEX idx_link_predictions_method ON link_predictions(method);

-- Network motifs
CREATE TABLE IF NOT EXISTS network_motifs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id UUID REFERENCES networks(id) ON DELETE CASCADE,
    motif_type VARCHAR(100) NOT NULL,
    nodes JSONB NOT NULL,
    count INTEGER DEFAULT 1,
    significance FLOAT,
    detected_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_network_motifs_network_id ON network_motifs(network_id);
CREATE INDEX idx_network_motifs_type ON network_motifs(motif_type);

-- Bot scores (for social media analysis)
CREATE TABLE IF NOT EXISTS bot_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id UUID REFERENCES networks(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    score FLOAT NOT NULL,
    classification VARCHAR(50) NOT NULL,
    features JSONB NOT NULL,
    detected_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(network_id, user_id)
);

CREATE INDEX idx_bot_scores_network_id ON bot_scores(network_id);
CREATE INDEX idx_bot_scores_score ON bot_scores(score DESC);
CREATE INDEX idx_bot_scores_classification ON bot_scores(classification);

-- Coordinated behavior
CREATE TABLE IF NOT EXISTS coordinated_behavior (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id UUID REFERENCES networks(id) ON DELETE CASCADE,
    behavior_type VARCHAR(100) NOT NULL,
    actors JSONB NOT NULL,
    confidence FLOAT NOT NULL,
    time_window_start TIMESTAMP,
    time_window_end TIMESTAMP,
    evidence JSONB,
    detected_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_coordinated_behavior_network_id ON coordinated_behavior(network_id);
CREATE INDEX idx_coordinated_behavior_type ON coordinated_behavior(behavior_type);
CREATE INDEX idx_coordinated_behavior_confidence ON coordinated_behavior(confidence DESC);

-- Echo chambers
CREATE TABLE IF NOT EXISTS echo_chambers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id UUID REFERENCES networks(id) ON DELETE CASCADE,
    members JSONB NOT NULL,
    insularity FLOAT NOT NULL,
    polarization FLOAT,
    detected_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_echo_chambers_network_id ON echo_chambers(network_id);
CREATE INDEX idx_echo_chambers_insularity ON echo_chambers(insularity DESC);

-- Network metrics
CREATE TABLE IF NOT EXISTS network_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id UUID REFERENCES networks(id) ON DELETE CASCADE,
    density FLOAT,
    average_path_length FLOAT,
    clustering_coefficient FLOAT,
    assortativity FLOAT,
    diameter INTEGER,
    number_of_components INTEGER,
    is_small_world BOOLEAN,
    is_scale_free BOOLEAN,
    calculated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_network_metrics_network_id ON network_metrics(network_id);
CREATE INDEX idx_network_metrics_calculated_at ON network_metrics(calculated_at DESC);

-- Analysis jobs (for async processing)
CREATE TABLE IF NOT EXISTS analysis_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id UUID REFERENCES networks(id) ON DELETE CASCADE,
    job_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    parameters JSONB,
    result JSONB,
    error TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_analysis_jobs_network_id ON analysis_jobs(network_id);
CREATE INDEX idx_analysis_jobs_status ON analysis_jobs(status);
CREATE INDEX idx_analysis_jobs_type ON analysis_jobs(job_type);
CREATE INDEX idx_analysis_jobs_created_at ON analysis_jobs(created_at DESC);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_networks_updated_at BEFORE UPDATE ON networks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
