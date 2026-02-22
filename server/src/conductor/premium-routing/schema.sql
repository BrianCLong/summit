-- Database schema for Advanced Premium Model Routing with Thompson Sampling
-- server/src/conductor/premium-routing/schema.sql

-- Thompson Sampling Arms table
CREATE TABLE IF NOT EXISTS thompson_sampling_arms (
    model_id VARCHAR(255) NOT NULL,
    context_hash VARCHAR(64) NOT NULL,
    alpha DECIMAL(10,4) DEFAULT 1.0,
    beta DECIMAL(10,4) DEFAULT 1.0,
    reward_sum DECIMAL(10,4) DEFAULT 0.0,
    pull_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    quality_score DECIMAL(5,4) DEFAULT 0.5,
    cost_efficiency DECIMAL(10,6) DEFAULT 0.5,
    latency_score DECIMAL(5,4) DEFAULT 0.5,
    contextual_reward DECIMAL(5,4) DEFAULT 0.5,
    PRIMARY KEY (model_id, context_hash)
);

CREATE INDEX idx_thompson_arms_last_updated ON thompson_sampling_arms(last_updated);
CREATE INDEX idx_thompson_arms_pull_count ON thompson_sampling_arms(pull_count DESC);

-- Multi-Armed Bandit Arms table
CREATE TABLE IF NOT EXISTS bandit_arms (
    arm_id VARCHAR(255) NOT NULL,
    context_type VARCHAR(100) NOT NULL,
    model_id VARCHAR(255) NOT NULL,
    pulls INTEGER DEFAULT 0,
    cumulative_reward DECIMAL(10,4) DEFAULT 0.0,
    average_reward DECIMAL(10,6) DEFAULT 0.0,
    confidence DECIMAL(5,4) DEFAULT 0.5,
    variance DECIMAL(10,6) DEFAULT 0.0,
    regret DECIMAL(10,4) DEFAULT 0.0,
    last_pull TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    exploration_bias DECIMAL(5,4) DEFAULT 0.1,
    quality_metrics JSONB,
    cost_metrics JSONB,
    performance_metrics JSONB,
    PRIMARY KEY (arm_id, context_type)
);

CREATE INDEX idx_bandit_arms_model_id ON bandit_arms(model_id);
CREATE INDEX idx_bandit_arms_last_pull ON bandit_arms(last_pull DESC);
CREATE INDEX idx_bandit_arms_average_reward ON bandit_arms(average_reward DESC);

-- Model Executions table for tracking performance
CREATE TABLE IF NOT EXISTS model_executions (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    task_type VARCHAR(100),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN NOT NULL,
    cost DECIMAL(10,6) NOT NULL,
    latency INTEGER NOT NULL,
    quality_score DECIMAL(5,4),
    user_feedback INTEGER CHECK (user_feedback >= 1 AND user_feedback <= 5),
    tokens_used INTEGER,
    context_features JSONB,
    error_type VARCHAR(100),
    session_id VARCHAR(255)
);

CREATE INDEX idx_model_executions_model_id ON model_executions(model_id);
CREATE INDEX idx_model_executions_tenant_id ON model_executions(tenant_id);
CREATE INDEX idx_model_executions_timestamp ON model_executions(timestamp DESC);
CREATE INDEX idx_model_executions_task_type ON model_executions(task_type);

-- Model Performance aggregated data
CREATE TABLE IF NOT EXISTS model_performance (
    model_id VARCHAR(255) NOT NULL,
    task_type VARCHAR(100) NOT NULL,
    success_rate DECIMAL(5,4) NOT NULL,
    avg_latency DECIMAL(8,2) NOT NULL,
    avg_cost DECIMAL(10,6) NOT NULL,
    quality_score DECIMAL(5,4) NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sample_size INTEGER DEFAULT 0,
    PRIMARY KEY (model_id, task_type)
);

CREATE INDEX idx_model_performance_last_updated ON model_performance(last_updated);
CREATE INDEX idx_model_performance_quality_score ON model_performance(quality_score DESC);

-- Enhanced Premium Models registry
CREATE TABLE IF NOT EXISTS enhanced_premium_models (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    model_family VARCHAR(100),
    version VARCHAR(50),
    model_type VARCHAR(50) NOT NULL,
    tier VARCHAR(50) NOT NULL,
    capabilities JSONB,
    cost_structure JSONB,
    performance_profile JSONB,
    quality_scores JSONB,
    constraints JSONB,
    specializations JSONB,
    api_configuration JSONB,
    rate_limit_tiers JSONB,
    quality_metrics JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_enhanced_models_provider ON enhanced_premium_models(provider);
CREATE INDEX idx_enhanced_models_tier ON enhanced_premium_models(tier);
CREATE INDEX idx_enhanced_models_model_type ON enhanced_premium_models(model_type);

-- Cost Performance Metrics table
CREATE TABLE IF NOT EXISTS cost_performance_metrics (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(255) NOT NULL,
    time_window VARCHAR(50) NOT NULL,
    tenant_id VARCHAR(255),
    total_cost DECIMAL(12,6) NOT NULL,
    total_requests INTEGER NOT NULL,
    avg_cost_per_request DECIMAL(10,6) NOT NULL,
    avg_quality_score DECIMAL(5,4) NOT NULL,
    avg_latency DECIMAL(8,2) NOT NULL,
    success_rate DECIMAL(5,4) NOT NULL,
    cost_efficiency_score DECIMAL(10,6) NOT NULL,
    performance_score DECIMAL(10,6) NOT NULL,
    value_score DECIMAL(10,6) NOT NULL,
    budget_utilization DECIMAL(5,4) DEFAULT 0.0,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cost_performance_model_id ON cost_performance_metrics(model_id);
CREATE INDEX idx_cost_performance_timestamp ON cost_performance_metrics(timestamp DESC);
CREATE INDEX idx_cost_performance_tenant_id ON cost_performance_metrics(tenant_id);

-- Real-time Alerts table
CREATE TABLE IF NOT EXISTS cost_optimization_alerts (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    model_id VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metrics JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged BOOLEAN DEFAULT FALSE,
    action_taken TEXT
);

CREATE INDEX idx_alerts_timestamp ON cost_optimization_alerts(timestamp DESC);
CREATE INDEX idx_alerts_model_id ON cost_optimization_alerts(model_id);
CREATE INDEX idx_alerts_acknowledged ON cost_optimization_alerts(acknowledged);

-- Budget Constraints table
CREATE TABLE IF NOT EXISTS budget_constraints (
    user_id VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    daily_limit DECIMAL(10,2) NOT NULL,
    monthly_limit DECIMAL(12,2) NOT NULL,
    request_limit INTEGER,
    quality_threshold DECIMAL(5,4) DEFAULT 0.8,
    cost_alert DECIMAL(10,2),
    warning_threshold DECIMAL(5,4) DEFAULT 0.8,
    emergency_threshold DECIMAL(5,4) DEFAULT 0.95,
    auto_optimization BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, tenant_id)
);

-- Query Complexity Analysis table
CREATE TABLE IF NOT EXISTS query_complexity_analysis (
    id SERIAL PRIMARY KEY,
    query_hash VARCHAR(64) NOT NULL UNIQUE,
    query_text TEXT NOT NULL,
    overall_complexity DECIMAL(5,4) NOT NULL,
    linguistic_complexity DECIMAL(5,4) NOT NULL,
    logical_complexity DECIMAL(5,4) NOT NULL,
    factual_complexity DECIMAL(5,4) NOT NULL,
    creative_complexity DECIMAL(5,4) NOT NULL,
    technical_complexity DECIMAL(5,4) NOT NULL,
    multimodal_complexity DECIMAL(5,4) NOT NULL,
    contextual_complexity DECIMAL(5,4) NOT NULL,
    temporal_complexity DECIMAL(5,4) NOT NULL,
    requirements JSONB,
    estimated_resources JSONB,
    recommended_models JSONB,
    confidence_score DECIMAL(5,4) NOT NULL,
    analysis_time INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_complexity_query_hash ON query_complexity_analysis(query_hash);
CREATE INDEX idx_complexity_overall ON query_complexity_analysis(overall_complexity DESC);
CREATE INDEX idx_complexity_created_at ON query_complexity_analysis(created_at DESC);

-- Routing Decisions table
CREATE TABLE IF NOT EXISTS routing_decisions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255),
    user_id VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    query_hash VARCHAR(64) NOT NULL,
    selected_model VARCHAR(255) NOT NULL,
    routing_reasoning TEXT,
    expected_performance JSONB,
    fallback_plan JSONB,
    optimization_flags JSONB,
    risk_assessment JSONB,
    execution_plan JSONB,
    monitoring_plan JSONB,
    actual_performance JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_routing_decisions_tenant_id ON routing_decisions(tenant_id);
CREATE INDEX idx_routing_decisions_selected_model ON routing_decisions(selected_model);
CREATE INDEX idx_routing_decisions_timestamp ON routing_decisions(timestamp DESC);

-- Adaptive Learning Points table
CREATE TABLE IF NOT EXISTS learning_points (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    model_id VARCHAR(255) NOT NULL,
    task_type VARCHAR(100) NOT NULL,
    context_hash VARCHAR(64) NOT NULL,
    features JSONB NOT NULL,
    performance JSONB NOT NULL,
    environmental_factors JSONB NOT NULL,
    outcome JSONB NOT NULL,
    user_feedback INTEGER CHECK (user_feedback >= 1 AND user_feedback <= 5)
);

CREATE INDEX idx_learning_points_model_id ON learning_points(model_id);
CREATE INDEX idx_learning_points_timestamp ON learning_points(timestamp DESC);
CREATE INDEX idx_learning_points_task_type ON learning_points(task_type);

-- Model Learning Profiles table
CREATE TABLE IF NOT EXISTS model_learning_profiles (
    model_id VARCHAR(255) PRIMARY KEY,
    learning_curve JSONB NOT NULL,
    strengths_weaknesses JSONB NOT NULL,
    adaptation_rate DECIMAL(5,4) DEFAULT 0.1,
    confidence_level DECIMAL(5,4) DEFAULT 0.5,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_samples INTEGER DEFAULT 0,
    recent_trends JSONB,
    predictive_model JSONB,
    transfer_learning JSONB
);

CREATE INDEX idx_learning_profiles_last_updated ON model_learning_profiles(last_updated);
CREATE INDEX idx_learning_profiles_confidence ON model_learning_profiles(confidence_level DESC);

-- Dynamic Pricing Models table
CREATE TABLE IF NOT EXISTS dynamic_pricing_models (
    model_id VARCHAR(255) PRIMARY KEY,
    base_pricing JSONB NOT NULL,
    dynamic_factors JSONB NOT NULL,
    demand_model JSONB NOT NULL,
    quality_premium JSONB NOT NULL,
    competitor_pricing JSONB NOT NULL,
    elasticity_model JSONB NOT NULL,
    current_price DECIMAL(10,6) NOT NULL,
    revenue_optimization JSONB,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Price History table
CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    price DECIMAL(10,6) NOT NULL,
    demand DECIMAL(10,4),
    quality DECIMAL(5,4),
    revenue DECIMAL(12,6),
    utilization DECIMAL(5,4),
    competitor_actions JSONB,
    market_conditions JSONB
);

CREATE INDEX idx_price_history_model_id ON price_history(model_id);
CREATE INDEX idx_price_history_timestamp ON price_history(timestamp DESC);

-- Quality-Cost Ratios table
CREATE TABLE IF NOT EXISTS quality_cost_ratios (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    quality_score DECIMAL(5,4) NOT NULL,
    total_cost DECIMAL(10,6) NOT NULL,
    ratio DECIMAL(10,4) NOT NULL,
    benchmark DECIMAL(10,4) NOT NULL,
    trend VARCHAR(20) NOT NULL,
    optimization JSONB,
    recommendations JSONB
);

CREATE INDEX idx_qcr_model_id ON quality_cost_ratios(model_id);
CREATE INDEX idx_qcr_timestamp ON quality_cost_ratios(timestamp DESC);
CREATE INDEX idx_qcr_ratio ON quality_cost_ratios(ratio DESC);

-- Pricing Recommendations table
CREATE TABLE IF NOT EXISTS pricing_recommendations (
    id VARCHAR(255) PRIMARY KEY,
    model_id VARCHAR(255) NOT NULL,
    recommended_price DECIMAL(10,6) NOT NULL,
    current_price DECIMAL(10,6) NOT NULL,
    change_percent DECIMAL(7,4) NOT NULL,
    reasoning TEXT,
    expected_impact JSONB,
    implementation JSONB,
    risks JSONB,
    monitoring JSONB,
    rollback_plan JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    applied BOOLEAN DEFAULT FALSE,
    applied_at TIMESTAMP
);

CREATE INDEX idx_pricing_recommendations_model_id ON pricing_recommendations(model_id);
CREATE INDEX idx_pricing_recommendations_created_at ON pricing_recommendations(created_at DESC);
CREATE INDEX idx_pricing_recommendations_applied ON pricing_recommendations(applied);

-- Competitor Intelligence table
CREATE TABLE IF NOT EXISTS competitor_intelligence (
    id SERIAL PRIMARY KEY,
    competitor_name VARCHAR(255) NOT NULL,
    model_name VARCHAR(255),
    current_price DECIMAL(10,6),
    quality_score DECIMAL(5,4),
    market_share DECIMAL(5,4),
    strengths_weaknesses JSONB,
    target_segments JSONB,
    pricing_strategy VARCHAR(100),
    threat_level DECIMAL(5,4),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_competitor_intelligence_competitor ON competitor_intelligence(competitor_name);
CREATE INDEX idx_competitor_intelligence_updated ON competitor_intelligence(last_updated DESC);

-- System Configuration table
CREATE TABLE IF NOT EXISTS system_configuration (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optimization Results table
CREATE TABLE IF NOT EXISTS optimization_results (
    id SERIAL PRIMARY KEY,
    optimization_type VARCHAR(100) NOT NULL,
    target_metric VARCHAR(100) NOT NULL,
    before_metrics JSONB NOT NULL,
    after_metrics JSONB NOT NULL,
    improvement DECIMAL(10,6) NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    roi DECIMAL(10,4) NOT NULL,
    duration_hours INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_optimization_results_type ON optimization_results(optimization_type);
CREATE INDEX idx_optimization_results_created_at ON optimization_results(created_at DESC);
CREATE INDEX idx_optimization_results_roi ON optimization_results(roi DESC);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_enhanced_premium_models_updated_at 
    BEFORE UPDATE ON enhanced_premium_models 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_constraints_updated_at 
    BEFORE UPDATE ON budget_constraints 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_configuration_updated_at 
    BEFORE UPDATE ON system_configuration 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for common queries
CREATE OR REPLACE VIEW model_performance_summary AS
SELECT 
    m.model_id,
    m.success_rate,
    m.avg_latency,
    m.avg_cost,
    m.quality_score,
    m.sample_size,
    em.display_name,
    em.provider,
    em.tier,
    COALESCE(qcr.ratio, 0) as quality_cost_ratio
FROM model_performance m
JOIN enhanced_premium_models em ON m.model_id = em.id
LEFT JOIN (
    SELECT model_id, AVG(ratio) as ratio
    FROM quality_cost_ratios 
    WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '7 days'
    GROUP BY model_id
) qcr ON m.model_id = qcr.model_id
ORDER BY m.quality_score DESC, m.avg_cost ASC;

CREATE OR REPLACE VIEW cost_performance_dashboard AS
SELECT 
    cpm.model_id,
    em.display_name,
    em.provider,
    cpm.total_cost,
    cpm.total_requests,
    cpm.avg_cost_per_request,
    cpm.avg_quality_score,
    cpm.cost_efficiency_score,
    cpm.performance_score,
    cpm.value_score,
    cpm.timestamp
FROM cost_performance_metrics cpm
JOIN enhanced_premium_models em ON cpm.model_id = em.id
WHERE cpm.time_window = '1h'
    AND cpm.timestamp > CURRENT_TIMESTAMP - INTERVAL '24 hours'
ORDER BY cpm.timestamp DESC, cpm.value_score DESC;

CREATE OR REPLACE VIEW thompson_sampling_dashboard AS
SELECT 
    tsa.model_id,
    em.display_name,
    tsa.context_hash,
    tsa.alpha,
    tsa.beta,
    tsa.pull_count,
    tsa.quality_score,
    tsa.cost_efficiency,
    tsa.contextual_reward,
    (tsa.alpha / (tsa.alpha + tsa.beta)) as success_rate,
    tsa.last_updated
FROM thompson_sampling_arms tsa
JOIN enhanced_premium_models em ON tsa.model_id = em.id
WHERE tsa.last_updated > CURRENT_TIMESTAMP - INTERVAL '7 days'
ORDER BY tsa.contextual_reward DESC, tsa.pull_count DESC;

-- Insert default system configuration
INSERT INTO system_configuration (key, value, description, category) VALUES 
('thompson_sampling.exploration_decay', '0.95', 'Decay factor for exploration rate', 'machine_learning'),
('thompson_sampling.min_exploration_rate', '0.1', 'Minimum exploration rate', 'machine_learning'),
('thompson_sampling.context_similarity_threshold', '0.8', 'Threshold for context similarity', 'machine_learning'),
('bandit.confidence_parameter', '2.0', 'Confidence parameter for UCB algorithm', 'machine_learning'),
('bandit.epsilon', '0.1', 'Exploration rate for epsilon-greedy', 'machine_learning'),
('bandit.learning_rate', '0.1', 'Learning rate for model updates', 'machine_learning'),
('pricing.max_price_change', '0.2', 'Maximum allowed price change per update', 'pricing'),
('pricing.update_frequency_hours', '1', 'Frequency of pricing updates in hours', 'pricing'),
('pricing.profit_margin_target', '0.3', 'Target profit margin', 'pricing'),
('quality.threshold', '0.8', 'Minimum quality threshold', 'quality'),
('cost.performance.learning_window_hours', '168', 'Learning window in hours for cost performance', 'cost_optimization'),
('routing.complexity.min_samples', '50', 'Minimum samples for complexity analysis', 'routing')
ON CONFLICT (key) DO NOTHING;

-- Create materialized view for performance analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS model_analytics_summary AS
SELECT 
    em.id as model_id,
    em.display_name,
    em.provider,
    em.tier,
    COUNT(me.id) as total_executions,
    AVG(me.quality_score) as avg_quality,
    AVG(me.cost) as avg_cost,
    AVG(me.latency) as avg_latency,
    SUM(CASE WHEN me.success THEN 1 ELSE 0 END)::FLOAT / COUNT(me.id) as success_rate,
    AVG(me.user_feedback) as avg_user_feedback,
    COUNT(DISTINCT me.tenant_id) as unique_tenants,
    MAX(me.timestamp) as last_execution
FROM enhanced_premium_models em
LEFT JOIN model_executions me ON em.id = me.model_id
WHERE me.timestamp > CURRENT_TIMESTAMP - INTERVAL '30 days' OR me.timestamp IS NULL
GROUP BY em.id, em.display_name, em.provider, em.tier;

-- Create unique index for materialized view
CREATE UNIQUE INDEX idx_model_analytics_summary_model_id ON model_analytics_summary(model_id);

-- Create refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_model_analytics_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY model_analytics_summary;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed for your security model)
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;

COMMENT ON TABLE thompson_sampling_arms IS 'Stores Thompson sampling arm data for contextual bandits';
COMMENT ON TABLE bandit_arms IS 'Multi-armed bandit optimization data';
COMMENT ON TABLE model_executions IS 'Individual model execution records for learning';
COMMENT ON TABLE enhanced_premium_models IS 'Registry of premium models with detailed metadata';
COMMENT ON TABLE cost_performance_metrics IS 'Cost and performance tracking metrics';
COMMENT ON TABLE query_complexity_analysis IS 'Query complexity analysis results';
COMMENT ON TABLE learning_points IS 'Individual learning points for adaptive learning system';
COMMENT ON TABLE dynamic_pricing_models IS 'Dynamic pricing model configurations';
COMMENT ON TABLE quality_cost_ratios IS 'Quality-cost ratio tracking and optimization';