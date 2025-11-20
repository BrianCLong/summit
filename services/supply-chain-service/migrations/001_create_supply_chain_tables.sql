-- Supply Chain Intelligence Database Schema
-- PostgreSQL migration script

-- ============================================================================
-- Supply Chain Network Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS supply_chain_networks (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    root_node_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_scn_tenant ON supply_chain_networks(tenant_id);
CREATE INDEX idx_scn_root_node ON supply_chain_networks(root_node_id);

CREATE TABLE IF NOT EXISTS supply_chain_nodes (
    id VARCHAR(255) PRIMARY KEY,
    network_id VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    name VARCHAR(500) NOT NULL,
    node_type VARCHAR(50) NOT NULL,
    tier VARCHAR(20) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    entity_id VARCHAR(255),
    location JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    metrics JSONB DEFAULT '{}',
    risk_score DECIMAL(5,2),
    risk_factors JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_network FOREIGN KEY (network_id) REFERENCES supply_chain_networks(id) ON DELETE CASCADE
);

CREATE INDEX idx_scn_nodes_network ON supply_chain_nodes(network_id);
CREATE INDEX idx_scn_nodes_tenant ON supply_chain_nodes(tenant_id);
CREATE INDEX idx_scn_nodes_type ON supply_chain_nodes(node_type);
CREATE INDEX idx_scn_nodes_tier ON supply_chain_nodes(tier);
CREATE INDEX idx_scn_nodes_status ON supply_chain_nodes(status);
CREATE INDEX idx_scn_nodes_risk ON supply_chain_nodes(risk_score);

CREATE TABLE IF NOT EXISTS supply_chain_edges (
    id VARCHAR(255) PRIMARY KEY,
    network_id VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    source_id VARCHAR(255) NOT NULL,
    target_id VARCHAR(255) NOT NULL,
    relationship_type VARCHAR(100) NOT NULL,
    criticality VARCHAR(50) NOT NULL,
    dependency_score DECIMAL(5,2) NOT NULL,
    alternatives_available BOOLEAN DEFAULT FALSE,
    material_flow JSONB,
    lead_time JSONB,
    risk_level VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_edge_network FOREIGN KEY (network_id) REFERENCES supply_chain_networks(id) ON DELETE CASCADE,
    CONSTRAINT fk_edge_source FOREIGN KEY (source_id) REFERENCES supply_chain_nodes(id) ON DELETE CASCADE,
    CONSTRAINT fk_edge_target FOREIGN KEY (target_id) REFERENCES supply_chain_nodes(id) ON DELETE CASCADE
);

CREATE INDEX idx_sce_network ON supply_chain_edges(network_id);
CREATE INDEX idx_sce_source ON supply_chain_edges(source_id);
CREATE INDEX idx_sce_target ON supply_chain_edges(target_id);
CREATE INDEX idx_sce_criticality ON supply_chain_edges(criticality);

-- ============================================================================
-- Supplier Risk Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_risk_assessments (
    id VARCHAR(255) PRIMARY KEY,
    supplier_id VARCHAR(255) NOT NULL,
    supplier_name VARCHAR(500) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    assessment_date TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Component scores
    financial_score DECIMAL(5,2),
    cybersecurity_score DECIMAL(5,2),
    geopolitical_score DECIMAL(5,2),
    esg_score DECIMAL(5,2),
    compliance_score DECIMAL(5,2),
    performance_score DECIMAL(5,2),

    -- Overall assessment
    overall_risk_score DECIMAL(5,2) NOT NULL,
    risk_level VARCHAR(50) NOT NULL,
    risk_tier VARCHAR(50) NOT NULL,

    -- Details
    key_risks JSONB DEFAULT '[]',
    mitigation_actions JSONB DEFAULT '[]',
    concentration_risk JSONB,

    -- Status
    approval_status VARCHAR(50) NOT NULL,
    review_frequency VARCHAR(50),
    next_review_date TIMESTAMP WITH TIME ZONE,
    assessor VARCHAR(255),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sra_supplier ON supplier_risk_assessments(supplier_id);
CREATE INDEX idx_sra_tenant ON supplier_risk_assessments(tenant_id);
CREATE INDEX idx_sra_risk_score ON supplier_risk_assessments(overall_risk_score);
CREATE INDEX idx_sra_risk_level ON supplier_risk_assessments(risk_level);
CREATE INDEX idx_sra_next_review ON supplier_risk_assessments(next_review_date);

-- ============================================================================
-- Vendor Management Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendors (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    name VARCHAR(500) NOT NULL,
    legal_name VARCHAR(500) NOT NULL,
    status VARCHAR(50) NOT NULL,
    tier VARCHAR(50) NOT NULL,

    -- Business details
    duns VARCHAR(50),
    tax_id VARCHAR(100),
    website VARCHAR(500),
    industry VARCHAR(200) NOT NULL,
    company_size VARCHAR(50),
    headquarters JSONB,

    -- Contact
    primary_contact JSONB NOT NULL,

    -- Services
    services_provided JSONB DEFAULT '[]',
    data_access VARCHAR(50),

    -- Relationships
    parent_company VARCHAR(255),
    subsidiaries JSONB DEFAULT '[]',

    -- Dates
    relationship_start_date TIMESTAMP WITH TIME ZONE,
    last_review_date TIMESTAMP WITH TIME ZONE,
    next_review_date TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vendors_tenant ON vendors(tenant_id);
CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_vendors_tier ON vendors(tier);
CREATE INDEX idx_vendors_review ON vendors(next_review_date);

CREATE TABLE IF NOT EXISTS vendor_alerts (
    id VARCHAR(255) PRIMARY KEY,
    vendor_id VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    rule_id VARCHAR(255),

    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,

    detected_at TIMESTAMP WITH TIME ZONE NOT NULL,
    source VARCHAR(255) NOT NULL,
    evidence JSONB DEFAULT '[]',

    status VARCHAR(50) NOT NULL DEFAULT 'new',
    assigned_to VARCHAR(255),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution TEXT,

    impact_assessment JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_alert_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE INDEX idx_va_vendor ON vendor_alerts(vendor_id);
CREATE INDEX idx_va_tenant ON vendor_alerts(tenant_id);
CREATE INDEX idx_va_severity ON vendor_alerts(severity);
CREATE INDEX idx_va_status ON vendor_alerts(status);
CREATE INDEX idx_va_detected ON vendor_alerts(detected_at);

-- ============================================================================
-- Component and BOM Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS components (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,

    part_number VARCHAR(200) NOT NULL,
    manufacturer_part_number VARCHAR(200),
    description TEXT NOT NULL,
    component_type VARCHAR(50) NOT NULL,
    category VARCHAR(200) NOT NULL,
    subcategory VARCHAR(200),
    commodity_code VARCHAR(100),

    -- Manufacturing
    manufacturer_supplier_id VARCHAR(255) NOT NULL,
    manufacturer_name VARCHAR(500) NOT NULL,
    manufacturer_country VARCHAR(100) NOT NULL,

    -- Specifications
    specifications JSONB DEFAULT '{}',

    -- Compliance
    certifications JSONB DEFAULT '[]',
    compliance_requirements JSONB DEFAULT '[]',

    -- Lifecycle
    lifecycle_status VARCHAR(50) NOT NULL,
    obsolescence_date TIMESTAMP WITH TIME ZONE,
    replacement_part_number VARCHAR(200),

    -- Cost and sourcing
    unit_cost JSONB,
    lead_time_days INTEGER NOT NULL,
    minimum_order_quantity INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_components_tenant ON components(tenant_id);
CREATE INDEX idx_components_part_number ON components(part_number);
CREATE INDEX idx_components_type ON components(component_type);
CREATE INDEX idx_components_lifecycle ON components(lifecycle_status);
CREATE INDEX idx_components_manufacturer ON components(manufacturer_supplier_id);

CREATE TABLE IF NOT EXISTS bills_of_materials (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,

    product_id VARCHAR(255) NOT NULL,
    product_name VARCHAR(500) NOT NULL,
    version VARCHAR(100) NOT NULL,

    bom_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,

    items JSONB NOT NULL DEFAULT '[]',

    total_material_cost DECIMAL(15,2),
    total_lead_time INTEGER,

    validated_by VARCHAR(255),
    validation_date TIMESTAMP WITH TIME ZONE,
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
    expiration_date TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bom_tenant ON bills_of_materials(tenant_id);
CREATE INDEX idx_bom_product ON bills_of_materials(product_id);
CREATE INDEX idx_bom_status ON bills_of_materials(status);

-- ============================================================================
-- Logistics Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS carriers (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,

    name VARCHAR(500) NOT NULL,
    scac VARCHAR(10),
    iata_code VARCHAR(10),

    services_offered JSONB DEFAULT '[]',
    geographic_coverage JSONB DEFAULT '[]',

    performance_metrics JSONB DEFAULT '{}',
    overall_rating DECIMAL(5,2),
    risk_level VARCHAR(50),

    has_contract BOOLEAN DEFAULT FALSE,
    contract_id VARCHAR(255),
    status VARCHAR(50) NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_carriers_tenant ON carriers(tenant_id);
CREATE INDEX idx_carriers_status ON carriers(status);

CREATE TABLE IF NOT EXISTS shipments (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,

    tracking_number VARCHAR(200) NOT NULL UNIQUE,
    reference_number VARCHAR(200),
    po_number VARCHAR(200),

    shipper JSONB NOT NULL,
    consignee JSONB NOT NULL,

    carrier_id VARCHAR(255) NOT NULL,
    transport_mode VARCHAR(50) NOT NULL,
    service_level VARCHAR(100),

    cargo JSONB NOT NULL,
    special_handling JSONB DEFAULT '{}',

    status VARCHAR(50) NOT NULL,
    current_location JSONB,

    pickup_date TIMESTAMP WITH TIME ZONE,
    estimated_delivery_date TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_delivery_date TIMESTAMP WITH TIME ZONE,

    on_time_performance BOOLEAN,
    delay_reason TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_shipment_carrier FOREIGN KEY (carrier_id) REFERENCES carriers(id)
);

CREATE INDEX idx_shipments_tenant ON shipments(tenant_id);
CREATE INDEX idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_carrier ON shipments(carrier_id);
CREATE INDEX idx_shipments_delivery ON shipments(estimated_delivery_date);

CREATE TABLE IF NOT EXISTS shipment_events (
    id VARCHAR(255) PRIMARY KEY,
    shipment_id VARCHAR(255) NOT NULL,

    event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_code VARCHAR(50),
    location JSONB NOT NULL,
    description TEXT NOT NULL,
    is_exception BOOLEAN DEFAULT FALSE,
    exception_type VARCHAR(100),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_event_shipment FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
);

CREATE INDEX idx_se_shipment ON shipment_events(shipment_id);
CREATE INDEX idx_se_timestamp ON shipment_events(event_timestamp);
CREATE INDEX idx_se_exception ON shipment_events(is_exception);

-- ============================================================================
-- Compliance Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS export_control_classifications (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,

    component_id VARCHAR(255),
    product_id VARCHAR(255),

    eccn VARCHAR(50),
    usml_category VARCHAR(50),
    schedule_b_number VARCHAR(50),

    jurisdiction JSONB DEFAULT '[]',
    license_required BOOLEAN NOT NULL,
    license_exceptions JSONB DEFAULT '[]',

    authorized_countries JSONB DEFAULT '[]',
    prohibited_countries JSONB DEFAULT '[]',

    classification_rationale TEXT,
    classified_by VARCHAR(255),
    classification_date TIMESTAMP WITH TIME ZONE NOT NULL,
    review_date TIMESTAMP WITH TIME ZONE,

    status VARCHAR(50) NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ecc_tenant ON export_control_classifications(tenant_id);
CREATE INDEX idx_ecc_component ON export_control_classifications(component_id);
CREATE INDEX idx_ecc_product ON export_control_classifications(product_id);
CREATE INDEX idx_ecc_status ON export_control_classifications(status);

CREATE TABLE IF NOT EXISTS sanctions_screenings (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,

    entity_id VARCHAR(255) NOT NULL,
    entity_name VARCHAR(500) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    country VARCHAR(100),

    screening_date TIMESTAMP WITH TIME ZONE NOT NULL,
    lists_screened JSONB DEFAULT '[]',
    matches JSONB DEFAULT '[]',

    overall_result VARCHAR(50) NOT NULL,
    risk_level VARCHAR(50) NOT NULL,

    reviewed_by VARCHAR(255),
    review_date TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,

    next_screening_date TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ss_tenant ON sanctions_screenings(tenant_id);
CREATE INDEX idx_ss_entity ON sanctions_screenings(entity_id);
CREATE INDEX idx_ss_result ON sanctions_screenings(overall_result);
CREATE INDEX idx_ss_risk ON sanctions_screenings(risk_level);
CREATE INDEX idx_ss_next ON sanctions_screenings(next_screening_date);

CREATE TABLE IF NOT EXISTS product_recalls (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,

    product_id VARCHAR(255) NOT NULL,
    recall_number VARCHAR(100) NOT NULL UNIQUE,
    recall_type VARCHAR(50) NOT NULL,
    recall_class VARCHAR(50) NOT NULL,

    issue_description TEXT NOT NULL,
    hazard TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL,

    affected_products JSONB DEFAULT '[]',
    affected_markets JSONB DEFAULT '[]',
    units_affected INTEGER NOT NULL,

    issue_identified_date TIMESTAMP WITH TIME ZONE NOT NULL,
    recall_initiated_date TIMESTAMP WITH TIME ZONE NOT NULL,
    public_announcement_date TIMESTAMP WITH TIME ZONE,
    expected_completion_date TIMESTAMP WITH TIME ZONE,

    corrective_actions JSONB DEFAULT '[]',

    customers_notified INTEGER,
    notification_method JSONB DEFAULT '[]',
    units_returned INTEGER,
    remediation_type VARCHAR(50),

    estimated_cost DECIMAL(15,2),
    insurance_claim BOOLEAN DEFAULT FALSE,

    regulatory_agency VARCHAR(255),
    regulatory_action TEXT,

    status VARCHAR(50) NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pr_tenant ON product_recalls(tenant_id);
CREATE INDEX idx_pr_product ON product_recalls(product_id);
CREATE INDEX idx_pr_number ON product_recalls(recall_number);
CREATE INDEX idx_pr_severity ON product_recalls(severity);
CREATE INDEX idx_pr_status ON product_recalls(status);

CREATE TABLE IF NOT EXISTS regulatory_changes (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,

    regulation VARCHAR(500) NOT NULL,
    jurisdiction VARCHAR(200) NOT NULL,
    change_type VARCHAR(100) NOT NULL,

    title VARCHAR(1000) NOT NULL,
    description TEXT NOT NULL,

    published_date TIMESTAMP WITH TIME ZONE NOT NULL,
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
    comment_deadline TIMESTAMP WITH TIME ZONE,

    impact_level VARCHAR(50) NOT NULL,
    affected_areas JSONB DEFAULT '[]',
    affected_products JSONB DEFAULT '[]',
    affected_suppliers JSONB DEFAULT '[]',

    action_required BOOLEAN DEFAULT FALSE,
    action_items JSONB DEFAULT '[]',

    source VARCHAR(500) NOT NULL,
    source_url VARCHAR(1000),
    document_id VARCHAR(255),

    reviewed_by VARCHAR(255),
    review_date TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rc_tenant ON regulatory_changes(tenant_id);
CREATE INDEX idx_rc_jurisdiction ON regulatory_changes(jurisdiction);
CREATE INDEX idx_rc_impact ON regulatory_changes(impact_level);
CREATE INDEX idx_rc_effective ON regulatory_changes(effective_date);
CREATE INDEX idx_rc_action ON regulatory_changes(action_required);

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_scn_timestamp BEFORE UPDATE ON supply_chain_networks FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_scn_nodes_timestamp BEFORE UPDATE ON supply_chain_nodes FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_sce_timestamp BEFORE UPDATE ON supply_chain_edges FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_sra_timestamp BEFORE UPDATE ON supplier_risk_assessments FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_vendors_timestamp BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_va_timestamp BEFORE UPDATE ON vendor_alerts FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_components_timestamp BEFORE UPDATE ON components FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_bom_timestamp BEFORE UPDATE ON bills_of_materials FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_carriers_timestamp BEFORE UPDATE ON carriers FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_shipments_timestamp BEFORE UPDATE ON shipments FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_ecc_timestamp BEFORE UPDATE ON export_control_classifications FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_pr_timestamp BEFORE UPDATE ON product_recalls FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_rc_timestamp BEFORE UPDATE ON regulatory_changes FOR EACH ROW EXECUTE FUNCTION update_timestamp();
