-- Supply Chain Intelligence Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For geographic data

-- ============================================================================
-- Core Supply Chain Entities
-- ============================================================================

CREATE TABLE supply_chain_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    tier INTEGER NOT NULL CHECK (tier > 0),
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'inactive', 'under-review', 'suspended')),
    criticality VARCHAR(50) NOT NULL CHECK (criticality IN ('low', 'medium', 'high', 'critical')),

    -- Geographic information
    country VARCHAR(100),
    region VARCHAR(100),
    city VARCHAR(100),
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    timezone VARCHAR(50),
    location GEOGRAPHY(POINT, 4326), -- PostGIS geography point

    -- Metadata
    metadata JSONB,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    CONSTRAINT unique_node_name_tier UNIQUE (name, tier)
);

CREATE INDEX idx_nodes_type ON supply_chain_nodes(type);
CREATE INDEX idx_nodes_tier ON supply_chain_nodes(tier);
CREATE INDEX idx_nodes_status ON supply_chain_nodes(status);
CREATE INDEX idx_nodes_criticality ON supply_chain_nodes(criticality);
CREATE INDEX idx_nodes_country ON supply_chain_nodes(country);
CREATE INDEX idx_nodes_name_trgm ON supply_chain_nodes USING gin(name gin_trgm_ops);
CREATE INDEX idx_nodes_location ON supply_chain_nodes USING GIST(location);

CREATE TABLE supply_chain_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_node_id UUID NOT NULL REFERENCES supply_chain_nodes(id) ON DELETE CASCADE,
    target_node_id UUID NOT NULL REFERENCES supply_chain_nodes(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL,
    material_flow TEXT[],
    strength DECIMAL(3, 2) CHECK (strength >= 0 AND strength <= 1),
    volume DECIMAL(15, 2),
    lead_time_days INTEGER,
    cost DECIMAL(15, 2),
    currency VARCHAR(3),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_relationship UNIQUE (source_node_id, target_node_id, relationship_type)
);

CREATE INDEX idx_relationships_source ON supply_chain_relationships(source_node_id);
CREATE INDEX idx_relationships_target ON supply_chain_relationships(target_node_id);
CREATE INDEX idx_relationships_type ON supply_chain_relationships(relationship_type);
CREATE INDEX idx_relationships_active ON supply_chain_relationships(is_active);

-- ============================================================================
-- Risk Assessment
-- ============================================================================

CREATE TABLE risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id UUID NOT NULL REFERENCES supply_chain_nodes(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'financial', 'cybersecurity', 'geopolitical', 'regulatory',
        'esg', 'operational', 'quality', 'delivery', 'capacity', 'concentration'
    )),
    level VARCHAR(50) NOT NULL CHECK (level IN ('low', 'medium', 'high', 'critical')),
    score DECIMAL(5, 2) CHECK (score >= 0 AND score <= 100),
    indicators JSONB,
    mitigations TEXT[],
    assessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assessed_by VARCHAR(255),
    valid_until TIMESTAMP WITH TIME ZONE,
    metadata JSONB
);

CREATE INDEX idx_risk_node ON risk_assessments(node_id);
CREATE INDEX idx_risk_category ON risk_assessments(category);
CREATE INDEX idx_risk_level ON risk_assessments(level);
CREATE INDEX idx_risk_assessed_at ON risk_assessments(assessed_at);

CREATE TABLE financial_health_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id UUID NOT NULL REFERENCES supply_chain_nodes(id) ON DELETE CASCADE,
    revenue DECIMAL(15, 2),
    profit_margin DECIMAL(5, 4),
    debt_to_equity DECIMAL(5, 2),
    current_ratio DECIMAL(5, 2),
    credit_rating VARCHAR(10),
    cash_flow DECIMAL(15, 2),
    bankruptcy_risk DECIMAL(3, 2) CHECK (bankruptcy_risk >= 0 AND bankruptcy_risk <= 1),
    assessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_financial_node ON financial_health_metrics(node_id);

CREATE TABLE cybersecurity_posture (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id UUID NOT NULL REFERENCES supply_chain_nodes(id) ON DELETE CASCADE,
    security_score DECIMAL(5, 2) CHECK (security_score >= 0 AND security_score <= 100),
    certifications TEXT[],
    vulnerabilities JSONB,
    incident_history JSONB,
    last_assessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cyber_node ON cybersecurity_posture(node_id);

CREATE TABLE esg_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id UUID NOT NULL REFERENCES supply_chain_nodes(id) ON DELETE CASCADE,
    overall_score DECIMAL(5, 2) CHECK (overall_score >= 0 AND overall_score <= 100),
    environmental_score DECIMAL(5, 2) CHECK (environmental_score >= 0 AND environmental_score <= 100),
    social_score DECIMAL(5, 2) CHECK (social_score >= 0 AND social_score <= 100),
    governance_score DECIMAL(5, 2) CHECK (governance_score >= 0 AND governance_score <= 100),
    certifications TEXT[],
    violations JSONB,
    last_assessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_esg_node ON esg_scores(node_id);

-- ============================================================================
-- Components and Materials
-- ============================================================================

CREATE TABLE components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_number VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    manufacturer VARCHAR(255),
    suppliers UUID[],
    specifications JSONB,
    is_critical BOOLEAN DEFAULT false,
    is_controlled BOOLEAN DEFAULT false,
    is_conflict_mineral BOOLEAN DEFAULT false,
    lead_time_days INTEGER,
    minimum_order_quantity INTEGER,
    unit_cost DECIMAL(10, 2),
    currency VARCHAR(3),
    alternative_components UUID[],
    obsolescence_risk VARCHAR(20) CHECK (obsolescence_risk IN ('low', 'medium', 'high')),
    certifications TEXT[],
    serialized BOOLEAN DEFAULT false,
    metadata JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_components_part_number ON components(part_number);
CREATE INDEX idx_components_category ON components(category);
CREATE INDEX idx_components_is_critical ON components(is_critical);
CREATE INDEX idx_components_manufacturer ON components(manufacturer);

CREATE TABLE component_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES supply_chain_nodes(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    unit VARCHAR(20),
    reorder_point INTEGER,
    max_stock INTEGER,
    last_restocked TIMESTAMP WITH TIME ZONE,
    expiration_date TIMESTAMP WITH TIME ZONE,
    batch_number VARCHAR(100),
    serial_numbers TEXT[],
    status VARCHAR(50) CHECK (status IN ('available', 'reserved', 'in-transit', 'quarantined', 'expired')),
    metadata JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_component ON component_inventory(component_id);
CREATE INDEX idx_inventory_location ON component_inventory(location_id);
CREATE INDEX idx_inventory_status ON component_inventory(status);

-- ============================================================================
-- Logistics and Shipments
-- ============================================================================

CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_number VARCHAR(100) NOT NULL UNIQUE,
    order_reference VARCHAR(100),

    -- Origin
    origin_country VARCHAR(100),
    origin_city VARCHAR(100),
    origin_latitude DECIMAL(10, 8),
    origin_longitude DECIMAL(11, 8),

    -- Destination
    destination_country VARCHAR(100),
    destination_city VARCHAR(100),
    destination_latitude DECIMAL(10, 8),
    destination_longitude DECIMAL(11, 8),

    -- Current location
    current_country VARCHAR(100),
    current_city VARCHAR(100),
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),

    carrier VARCHAR(100),
    transport_mode VARCHAR(50) CHECK (transport_mode IN ('air', 'sea', 'rail', 'road', 'multimodal')),
    status VARCHAR(50) CHECK (status IN (
        'pending', 'picked-up', 'in-transit', 'at-port', 'customs-clearance',
        'out-for-delivery', 'delivered', 'delayed', 'lost', 'damaged', 'returned'
    )),

    contents JSONB,
    estimated_departure TIMESTAMP WITH TIME ZONE,
    actual_departure TIMESTAMP WITH TIME ZONE,
    estimated_arrival TIMESTAMP WITH TIME ZONE,
    actual_arrival TIMESTAMP WITH TIME ZONE,
    milestones JSONB,
    temperature_data JSONB,
    alerts JSONB,
    insurance JSONB,
    metadata JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_carrier ON shipments(carrier);
CREATE INDEX idx_shipments_origin_country ON shipments(origin_country);
CREATE INDEX idx_shipments_destination_country ON shipments(destination_country);

-- ============================================================================
-- Compliance
-- ============================================================================

CREATE TABLE compliance_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) CHECK (category IN (
        'export-control', 'sanctions', 'conflict-minerals', 'environmental',
        'labor', 'product-safety', 'trade', 'industry-specific'
    )),
    jurisdiction VARCHAR(100),
    description TEXT,
    requirement_text TEXT,
    applicable_node_types TEXT[],
    effective_date DATE,
    expiration_date DATE,
    mandatory_certifications TEXT[],
    penalties TEXT,
    metadata JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_compliance_req_category ON compliance_requirements(category);
CREATE INDEX idx_compliance_req_jurisdiction ON compliance_requirements(jurisdiction);

CREATE TABLE compliance_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id UUID NOT NULL REFERENCES supply_chain_nodes(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL REFERENCES compliance_requirements(id) ON DELETE CASCADE,
    status VARCHAR(50) CHECK (status IN ('compliant', 'non-compliant', 'under-review', 'exempted', 'not-applicable')),
    last_assessed_at TIMESTAMP WITH TIME ZONE,
    assessed_by VARCHAR(255),
    evidence JSONB,
    findings JSONB,
    next_assessment_due DATE,
    metadata JSONB
);

CREATE INDEX idx_compliance_status_node ON compliance_status(node_id);
CREATE INDEX idx_compliance_status_requirement ON compliance_status(requirement_id);
CREATE INDEX idx_compliance_status_status ON compliance_status(status);

-- ============================================================================
-- Incidents and Alerts
-- ============================================================================

CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) CHECK (type IN (
        'disruption', 'quality-issue', 'delivery-delay', 'security-breach',
        'natural-disaster', 'geopolitical-event', 'regulatory-violation',
        'financial-distress', 'labor-dispute', 'contamination', 'recall', 'fraud', 'other'
    )),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(50) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(50) CHECK (status IN ('open', 'investigating', 'mitigating', 'resolved', 'closed')),
    affected_nodes UUID[],
    affected_components UUID[],
    affected_shipments UUID[],
    impact JSONB,
    detected_at TIMESTAMP WITH TIME ZONE,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reported_by VARCHAR(255),
    resolved_at TIMESTAMP WITH TIME ZONE,
    root_cause TEXT,
    mitigation_actions JSONB,
    lessons_learned TEXT,
    preventive_measures TEXT,
    metadata JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_incidents_type ON incidents(type);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_detected_at ON incidents(detected_at);

CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(100),
    severity VARCHAR(50) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    source VARCHAR(100),
    affected_entities UUID[],
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by VARCHAR(255),
    resolved_at TIMESTAMP WITH TIME ZONE,
    action_required BOOLEAN DEFAULT false,
    recommended_actions TEXT[],
    metadata JSONB
);

CREATE INDEX idx_alerts_type ON alerts(type);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_triggered_at ON alerts(triggered_at);
CREATE INDEX idx_alerts_resolved ON alerts(resolved_at);

-- ============================================================================
-- Predictions and Analytics
-- ============================================================================

CREATE TABLE disruption_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id UUID REFERENCES supply_chain_nodes(id) ON DELETE CASCADE,
    component_id UUID REFERENCES components(id) ON DELETE CASCADE,
    prediction_type VARCHAR(100),
    probability DECIMAL(3, 2) CHECK (probability >= 0 AND probability <= 1),
    confidence DECIMAL(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
    expected_impact VARCHAR(50) CHECK (expected_impact IN ('low', 'medium', 'high', 'critical')),
    timeframe_start DATE,
    timeframe_end DATE,
    factors JSONB,
    recommendations TEXT[],
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    model_version VARCHAR(50),
    metadata JSONB
);

CREATE INDEX idx_predictions_node ON disruption_predictions(node_id);
CREATE INDEX idx_predictions_component ON disruption_predictions(component_id);
CREATE INDEX idx_predictions_probability ON disruption_predictions(probability);
CREATE INDEX idx_predictions_generated_at ON disruption_predictions(generated_at);

-- ============================================================================
-- Auditing and History
-- ============================================================================

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(20) CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_by VARCHAR(255),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_audit_table ON audit_log(table_name);
CREATE INDEX idx_audit_record ON audit_log(record_id);
CREATE INDEX idx_audit_operation ON audit_log(operation);
CREATE INDEX idx_audit_changed_at ON audit_log(changed_at);

-- ============================================================================
-- Trigger Functions
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables with updated_at
CREATE TRIGGER update_nodes_updated_at BEFORE UPDATE ON supply_chain_nodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_relationships_updated_at BEFORE UPDATE ON supply_chain_relationships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_components_updated_at BEFORE UPDATE ON components
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON shipments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update location geography from latitude/longitude
CREATE OR REPLACE FUNCTION update_location_geography()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_node_location BEFORE INSERT OR UPDATE ON supply_chain_nodes
    FOR EACH ROW EXECUTE FUNCTION update_location_geography();

-- ============================================================================
-- Views
-- ============================================================================

-- High-risk suppliers view
CREATE VIEW high_risk_suppliers AS
SELECT
    n.id,
    n.name,
    n.tier,
    n.country,
    COUNT(DISTINCT r.id) as risk_count,
    AVG(r.score) as avg_risk_score,
    ARRAY_AGG(DISTINCT r.category) as risk_categories
FROM supply_chain_nodes n
LEFT JOIN risk_assessments r ON n.id = r.node_id
WHERE r.level IN ('high', 'critical')
  AND r.assessed_at > CURRENT_DATE - INTERVAL '90 days'
GROUP BY n.id, n.name, n.tier, n.country
HAVING COUNT(DISTINCT r.id) > 0
ORDER BY avg_risk_score ASC, risk_count DESC;

-- Active incidents summary
CREATE VIEW active_incidents_summary AS
SELECT
    type,
    severity,
    COUNT(*) as count,
    MIN(detected_at) as earliest,
    MAX(detected_at) as latest
FROM incidents
WHERE status NOT IN ('resolved', 'closed')
GROUP BY type, severity;

-- Component availability view
CREATE VIEW component_availability AS
SELECT
    c.id as component_id,
    c.part_number,
    c.name,
    c.is_critical,
    SUM(CASE WHEN ci.status = 'available' THEN ci.quantity ELSE 0 END) as available_qty,
    SUM(CASE WHEN ci.status = 'reserved' THEN ci.quantity ELSE 0 END) as reserved_qty,
    SUM(CASE WHEN ci.status = 'in-transit' THEN ci.quantity ELSE 0 END) as in_transit_qty,
    COUNT(DISTINCT ci.location_id) as location_count
FROM components c
LEFT JOIN component_inventory ci ON c.id = ci.component_id
GROUP BY c.id, c.part_number, c.name, c.is_critical;
