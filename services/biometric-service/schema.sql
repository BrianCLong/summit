-- Biometric Service Database Schema
-- Comprehensive schema for biometric data storage, identity management, and screening

-- ============================================================================
-- Core Biometric Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS biometric_persons (
    person_id UUID PRIMARY KEY,
    status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'WATCHLIST', 'BLOCKED')),
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    enrollment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_update TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata JSONB,
    CONSTRAINT valid_dates CHECK (enrollment_date <= last_update)
);

CREATE INDEX idx_biometric_persons_status ON biometric_persons(status);
CREATE INDEX idx_biometric_persons_risk_score ON biometric_persons(risk_score);
CREATE INDEX idx_biometric_persons_metadata ON biometric_persons USING gin(metadata);

CREATE TABLE IF NOT EXISTS biometric_templates (
    template_id UUID PRIMARY KEY,
    person_id UUID NOT NULL REFERENCES biometric_persons(person_id) ON DELETE CASCADE,
    modality VARCHAR(50) NOT NULL,
    format VARCHAR(100) NOT NULL,
    data TEXT NOT NULL, -- Encrypted biometric template
    quality_score INTEGER NOT NULL CHECK (quality_score >= 0 AND quality_score <= 100),
    quality_data JSONB,
    capture_date TIMESTAMP WITH TIME ZONE NOT NULL,
    expiry_date TIMESTAMP WITH TIME ZONE,
    source VARCHAR(255) NOT NULL,
    device_id VARCHAR(255),
    position VARCHAR(50), -- e.g., 'left_index', 'right_eye'
    compressed BOOLEAN DEFAULT FALSE,
    encrypted BOOLEAN DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_quality CHECK (quality_score >= 0 AND quality_score <= 100)
);

CREATE INDEX idx_biometric_templates_person ON biometric_templates(person_id);
CREATE INDEX idx_biometric_templates_modality ON biometric_templates(modality);
CREATE INDEX idx_biometric_templates_quality ON biometric_templates(quality_score);
CREATE INDEX idx_biometric_templates_source ON biometric_templates(source);

-- Vector extension for similarity search (pgvector)
-- CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS biometric_vectors (
    vector_id UUID PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES biometric_templates(template_id) ON DELETE CASCADE,
    modality VARCHAR(50) NOT NULL,
    algorithm VARCHAR(100) NOT NULL,
    algorithm_version VARCHAR(50) NOT NULL,
    vector_data BYTEA NOT NULL, -- Stored as binary for efficiency
    dimensions INTEGER NOT NULL,
    normalized BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_biometric_vectors_template ON biometric_vectors(template_id);
CREATE INDEX idx_biometric_vectors_modality ON biometric_vectors(modality);
CREATE INDEX idx_biometric_vectors_algorithm ON biometric_vectors(algorithm);

-- ============================================================================
-- Identity Resolution Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS identity_records (
    identity_id UUID PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('PERSON', 'ALIAS', 'PSEUDONYM', 'SYNTHETIC')),
    confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    verification_status VARCHAR(20) NOT NULL CHECK (verification_status IN ('VERIFIED', 'UNVERIFIED', 'DISPUTED', 'SUSPECTED')),
    reliability_score INTEGER CHECK (reliability_score >= 0 AND reliability_score <= 100),
    biographic_data JSONB,
    biometric_data JSONB,
    document_data JSONB,
    digital_data JSONB,
    location_data JSONB,
    sources TEXT[] NOT NULL,
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX idx_identity_records_type ON identity_records(type);
CREATE INDEX idx_identity_records_status ON identity_records(verification_status);
CREATE INDEX idx_identity_records_confidence ON identity_records(confidence);
CREATE INDEX idx_identity_records_biographic ON identity_records USING gin(biographic_data);
CREATE INDEX idx_identity_records_digital ON identity_records USING gin(digital_data);

CREATE TABLE IF NOT EXISTS identity_aliases (
    relationship_id UUID PRIMARY KEY,
    primary_identity_id UUID NOT NULL REFERENCES identity_records(identity_id) ON DELETE CASCADE,
    alias_identity_id UUID NOT NULL REFERENCES identity_records(identity_id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL,
    confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    evidence JSONB,
    status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'HISTORICAL', 'DISPUTED', 'INVALIDATED')),
    date_established TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT different_identities CHECK (primary_identity_id != alias_identity_id)
);

CREATE INDEX idx_identity_aliases_primary ON identity_aliases(primary_identity_id);
CREATE INDEX idx_identity_aliases_alias ON identity_aliases(alias_identity_id);
CREATE INDEX idx_identity_aliases_type ON identity_aliases(relationship_type);

-- ============================================================================
-- Facial Recognition Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS face_profiles (
    profile_id UUID PRIMARY KEY,
    person_id UUID NOT NULL REFERENCES biometric_persons(person_id) ON DELETE CASCADE,
    detection_data JSONB NOT NULL,
    encoding_data JSONB NOT NULL,
    attributes_data JSONB,
    emotion_data JSONB,
    liveness_data JSONB,
    disguise_data JSONB,
    model_3d_data JSONB,
    quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
    source_image_id VARCHAR(255) NOT NULL,
    source_image_url TEXT,
    capture_date TIMESTAMP WITH TIME ZONE NOT NULL,
    capture_location JSONB,
    processing_time INTEGER, -- milliseconds
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_face_profiles_person ON face_profiles(person_id);
CREATE INDEX idx_face_profiles_quality ON face_profiles(quality_score);
CREATE INDEX idx_face_profiles_capture_date ON face_profiles(capture_date);

CREATE TABLE IF NOT EXISTS face_clusters (
    cluster_id UUID PRIMARY KEY,
    face_ids UUID[] NOT NULL,
    centroid BYTEA NOT NULL,
    size INTEGER NOT NULL,
    cohesion NUMERIC(3,2) CHECK (cohesion >= 0 AND cohesion <= 1),
    representative_face_id UUID,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_face_clusters_size ON face_clusters(size);
CREATE INDEX idx_face_clusters_cohesion ON face_clusters(cohesion);

-- ============================================================================
-- Watchlist Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS watchlists (
    watchlist_id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    source_name VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    source_authority VARCHAR(255),
    source_url TEXT,
    active BOOLEAN DEFAULT TRUE,
    auto_update BOOLEAN DEFAULT FALSE,
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    entry_count INTEGER DEFAULT 0,
    metadata JSONB
);

CREATE INDEX idx_watchlists_category ON watchlists(category);
CREATE INDEX idx_watchlists_priority ON watchlists(priority);
CREATE INDEX idx_watchlists_active ON watchlists(active);

CREATE TABLE IF NOT EXISTS watchlist_entries (
    entry_id UUID PRIMARY KEY,
    watchlist_id UUID NOT NULL REFERENCES watchlists(watchlist_id) ON DELETE CASCADE,
    person_data JSONB NOT NULL,
    biometric_data JSONB,
    listing_reason TEXT NOT NULL,
    offenses TEXT[],
    warrants JSONB,
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'REMOVED', 'UNDER_REVIEW')),
    added_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expiry_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    metadata JSONB
);

CREATE INDEX idx_watchlist_entries_watchlist ON watchlist_entries(watchlist_id);
CREATE INDEX idx_watchlist_entries_risk_level ON watchlist_entries(risk_level);
CREATE INDEX idx_watchlist_entries_status ON watchlist_entries(status);
CREATE INDEX idx_watchlist_entries_person_data ON watchlist_entries USING gin(person_data);

-- ============================================================================
-- Screening Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS screening_requests (
    request_id UUID PRIMARY KEY,
    request_type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    subject_data JSONB NOT NULL,
    watchlist_ids UUID[],
    thresholds JSONB,
    options JSONB,
    context JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_screening_requests_type ON screening_requests(request_type);
CREATE INDEX idx_screening_requests_priority ON screening_requests(priority);
CREATE INDEX idx_screening_requests_created_at ON screening_requests(created_at);

CREATE TABLE IF NOT EXISTS screening_results (
    result_id UUID PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES screening_requests(request_id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    matches JSONB,
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level VARCHAR(20) CHECK (risk_level IN ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    recommendation VARCHAR(50) NOT NULL,
    alerts JSONB,
    processing_time INTEGER NOT NULL, -- milliseconds
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX idx_screening_results_request ON screening_results(request_id);
CREATE INDEX idx_screening_results_status ON screening_results(status);
CREATE INDEX idx_screening_results_risk_level ON screening_results(risk_level);
CREATE INDEX idx_screening_results_created_at ON screening_results(created_at);

CREATE TABLE IF NOT EXISTS screening_alerts (
    alert_id UUID PRIMARY KEY,
    result_id UUID NOT NULL REFERENCES screening_results(result_id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status VARCHAR(50) NOT NULL DEFAULT 'NEW',
    subject_data JSONB NOT NULL,
    match_details JSONB,
    assigned_to VARCHAR(255),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution JSONB,
    escalated BOOLEAN DEFAULT FALSE,
    notifications JSONB,
    metadata JSONB
);

CREATE INDEX idx_screening_alerts_result ON screening_alerts(result_id);
CREATE INDEX idx_screening_alerts_status ON screening_alerts(status);
CREATE INDEX idx_screening_alerts_severity ON screening_alerts(severity);
CREATE INDEX idx_screening_alerts_assigned_to ON screening_alerts(assigned_to);

-- ============================================================================
-- Encounter Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS encounters (
    encounter_id UUID PRIMARY KEY,
    identity_id UUID NOT NULL REFERENCES identity_records(identity_id) ON DELETE CASCADE,
    result_id UUID REFERENCES screening_results(result_id),
    encounter_type VARCHAR(50) NOT NULL,
    facility_id VARCHAR(255),
    facility_name VARCHAR(255) NOT NULL,
    country VARCHAR(3) NOT NULL,
    coordinates JSONB,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    outcome VARCHAR(50) NOT NULL,
    watchlist_hits JSONB,
    biometric_capture JSONB,
    officer_id VARCHAR(255),
    officer_name VARCHAR(255),
    notes TEXT,
    related_encounters UUID[],
    metadata JSONB
);

CREATE INDEX idx_encounters_identity ON encounters(identity_id);
CREATE INDEX idx_encounters_type ON encounters(encounter_type);
CREATE INDEX idx_encounters_timestamp ON encounters(timestamp);
CREATE INDEX idx_encounters_outcome ON encounters(outcome);
CREATE INDEX idx_encounters_country ON encounters(country);

-- ============================================================================
-- Document Verification Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_records (
    document_id UUID PRIMARY KEY,
    document_type VARCHAR(50) NOT NULL,
    document_number VARCHAR(255) NOT NULL,
    issuing_country VARCHAR(3) NOT NULL,
    issuing_authority VARCHAR(255),
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    holder_data JSONB NOT NULL,
    biometric_data JSONB,
    additional_data JSONB,
    images JSONB,
    capture_date TIMESTAMP WITH TIME ZONE NOT NULL,
    capture_device VARCHAR(255),
    capture_location VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_document_records_type ON document_records(document_type);
CREATE INDEX idx_document_records_number ON document_records(document_number);
CREATE INDEX idx_document_records_country ON document_records(issuing_country);
CREATE INDEX idx_document_records_expiry ON document_records(expiry_date);

CREATE TABLE IF NOT EXISTS document_verifications (
    verification_id UUID PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES document_records(document_id) ON DELETE CASCADE,
    verified BOOLEAN NOT NULL,
    confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    score INTEGER CHECK (score >= 0 AND score <= 100),
    recommendation VARCHAR(50) NOT NULL,
    mrz_data JSONB,
    authentication_data JSONB NOT NULL,
    chip_authentication_data JSONB,
    template_match_data JSONB,
    tamper_detection_data JSONB,
    cross_database_validation_data JSONB,
    biometric_extraction_data JSONB,
    issues JSONB,
    processing_time INTEGER NOT NULL,
    verification_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    verified_by VARCHAR(255),
    location VARCHAR(255),
    metadata JSONB
);

CREATE INDEX idx_document_verifications_document ON document_verifications(document_id);
CREATE INDEX idx_document_verifications_verified ON document_verifications(verified);
CREATE INDEX idx_document_verifications_recommendation ON document_verifications(recommendation);

-- ============================================================================
-- Privacy and Compliance Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS consent_records (
    consent_id UUID PRIMARY KEY,
    person_id UUID NOT NULL REFERENCES biometric_persons(person_id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL,
    granted BOOLEAN NOT NULL,
    purpose TEXT NOT NULL,
    legal_basis VARCHAR(50) NOT NULL,
    granted_date TIMESTAMP WITH TIME ZONE NOT NULL,
    expiry_date TIMESTAMP WITH TIME ZONE,
    revoked_date TIMESTAMP WITH TIME ZONE,
    scope JSONB,
    metadata JSONB,
    CONSTRAINT valid_consent_dates CHECK (
        (revoked_date IS NULL OR revoked_date >= granted_date) AND
        (expiry_date IS NULL OR expiry_date >= granted_date)
    )
);

CREATE INDEX idx_consent_records_person ON consent_records(person_id);
CREATE INDEX idx_consent_records_type ON consent_records(consent_type);
CREATE INDEX idx_consent_records_granted ON consent_records(granted);
CREATE INDEX idx_consent_records_revoked ON consent_records(revoked_date);

CREATE TABLE IF NOT EXISTS biometric_audit_events (
    event_id UUID PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    person_id UUID REFERENCES biometric_persons(person_id) ON DELETE SET NULL,
    user_id UUID NOT NULL,
    user_role VARCHAR(100) NOT NULL,
    operation VARCHAR(255) NOT NULL,
    modalities VARCHAR(50)[],
    result VARCHAR(50) NOT NULL CHECK (result IN ('SUCCESS', 'FAILURE', 'PARTIAL')),
    details JSONB,
    ip_address INET,
    location VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    retention_expiry TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_biometric_audit_events_type ON biometric_audit_events(event_type);
CREATE INDEX idx_biometric_audit_events_person ON biometric_audit_events(person_id);
CREATE INDEX idx_biometric_audit_events_user ON biometric_audit_events(user_id);
CREATE INDEX idx_biometric_audit_events_timestamp ON biometric_audit_events(timestamp);
CREATE INDEX idx_biometric_audit_events_retention ON biometric_audit_events(retention_expiry);

-- ============================================================================
-- Behavioral Analysis Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS behavioral_profiles (
    profile_id UUID PRIMARY KEY,
    person_id UUID NOT NULL REFERENCES biometric_persons(person_id) ON DELETE CASCADE,
    gait_signatures JSONB,
    keystroke_profiles JSONB,
    mouse_profiles JSONB,
    touch_profiles JSONB,
    signature_profiles JSONB,
    voice_profiles JSONB,
    writing_styles JSONB,
    fused_profile JSONB NOT NULL,
    temporal_patterns JSONB,
    quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
    sample_count INTEGER NOT NULL DEFAULT 0,
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX idx_behavioral_profiles_person ON behavioral_profiles(person_id);
CREATE INDEX idx_behavioral_profiles_quality ON behavioral_profiles(quality_score);

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Update last_update timestamp
CREATE OR REPLACE FUNCTION update_last_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_update = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_biometric_persons_last_update
    BEFORE UPDATE ON biometric_persons
    FOR EACH ROW
    EXECUTE FUNCTION update_last_update();

-- Update watchlist entry count
CREATE OR REPLACE FUNCTION update_watchlist_entry_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE watchlists SET entry_count = entry_count + 1 WHERE watchlist_id = NEW.watchlist_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE watchlists SET entry_count = entry_count - 1 WHERE watchlist_id = OLD.watchlist_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_watchlist_count_insert
    AFTER INSERT ON watchlist_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_watchlist_entry_count();

CREATE TRIGGER update_watchlist_count_delete
    AFTER DELETE ON watchlist_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_watchlist_entry_count();

-- Audit log retention cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM biometric_audit_events
    WHERE retention_expiry IS NOT NULL AND retention_expiry < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-audit-logs', '0 2 * * *', 'SELECT cleanup_expired_audit_logs()');
