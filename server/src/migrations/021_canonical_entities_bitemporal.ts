/**
 * Migration: Canonical Entities with Bitemporal Support
 *
 * Creates tables for 8 canonical entity types with full bitemporal tracking:
 * - Person, Organization, Asset, Location, Event, Document, Claim, Case
 *
 * Each table includes:
 * - Valid time dimension (validFrom/validTo)
 * - Transaction time dimension (observedAt/recordedAt)
 * - Provenance tracking
 * - Version control
 */

import { Pool } from 'pg';

export default async function migrate(pool?: Pool) {
  const pg = pool || new Pool({ connectionString: process.env.DATABASE_URL });

  await pg.query(`
    -- Create provenance chain storage table
    CREATE TABLE IF NOT EXISTS canonical_provenance (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id text NOT NULL,
      chain_id text NOT NULL,
      chain_data jsonb NOT NULL,
      chain_hash text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(tenant_id, chain_id)
    );
    CREATE INDEX IF NOT EXISTS idx_canonical_provenance_tenant ON canonical_provenance(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_canonical_provenance_hash ON canonical_provenance(chain_hash);

    -- Person canonical entity
    CREATE TABLE IF NOT EXISTS canonical_person (
      -- Base entity fields
      id uuid NOT NULL,
      tenant_id text NOT NULL,
      version integer NOT NULL DEFAULT 1,
      modified_by text NOT NULL,
      deleted boolean NOT NULL DEFAULT false,
      provenance_id uuid REFERENCES canonical_provenance(id),

      -- Bitemporal fields
      valid_from timestamptz NOT NULL,
      valid_to timestamptz,
      observed_at timestamptz NOT NULL,
      recorded_at timestamptz NOT NULL DEFAULT now(),

      -- Metadata
      entity_type text NOT NULL DEFAULT 'Person',
      schema_version text NOT NULL DEFAULT '1.0.0',
      classifications text[] NOT NULL DEFAULT '{}',
      metadata jsonb NOT NULL DEFAULT '{}',

      -- Person-specific fields (stored as JSONB for flexibility)
      name jsonb NOT NULL,
      identifiers jsonb NOT NULL DEFAULT '{}',
      demographics jsonb,
      status text,
      occupations text[],
      affiliations jsonb,
      risk_flags jsonb,
      properties jsonb NOT NULL DEFAULT '{}',

      -- Composite primary key includes temporal dimensions
      PRIMARY KEY (id, recorded_at, valid_from)
    );

    -- Indexes for temporal queries
    CREATE INDEX IF NOT EXISTS idx_person_tenant ON canonical_person(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_person_valid_time ON canonical_person(valid_from, valid_to);
    CREATE INDEX IF NOT EXISTS idx_person_recorded_time ON canonical_person(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_person_current ON canonical_person(id, tenant_id) WHERE valid_to IS NULL AND deleted = false;
    CREATE INDEX IF NOT EXISTS idx_person_provenance ON canonical_person(provenance_id);

    -- Organization canonical entity
    CREATE TABLE IF NOT EXISTS canonical_organization (
      id uuid NOT NULL,
      tenant_id text NOT NULL,
      version integer NOT NULL DEFAULT 1,
      modified_by text NOT NULL,
      deleted boolean NOT NULL DEFAULT false,
      provenance_id uuid REFERENCES canonical_provenance(id),

      valid_from timestamptz NOT NULL,
      valid_to timestamptz,
      observed_at timestamptz NOT NULL,
      recorded_at timestamptz NOT NULL DEFAULT now(),

      entity_type text NOT NULL DEFAULT 'Organization',
      schema_version text NOT NULL DEFAULT '1.0.0',
      classifications text[] NOT NULL DEFAULT '{}',
      metadata jsonb NOT NULL DEFAULT '{}',

      legal_name text NOT NULL,
      common_names text[],
      organization_type text NOT NULL,
      identifiers jsonb NOT NULL DEFAULT '{}',
      addresses jsonb,
      established_date timestamptz,
      dissolved_date timestamptz,
      jurisdiction text,
      industries jsonb,
      parent_organization jsonb,
      subsidiaries jsonb,
      key_people jsonb,
      risk_flags jsonb,
      status text,
      properties jsonb NOT NULL DEFAULT '{}',

      PRIMARY KEY (id, recorded_at, valid_from)
    );

    CREATE INDEX IF NOT EXISTS idx_org_tenant ON canonical_organization(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_org_valid_time ON canonical_organization(valid_from, valid_to);
    CREATE INDEX IF NOT EXISTS idx_org_recorded_time ON canonical_organization(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_org_current ON canonical_organization(id, tenant_id) WHERE valid_to IS NULL AND deleted = false;
    CREATE INDEX IF NOT EXISTS idx_org_legal_name ON canonical_organization(legal_name);

    -- Asset canonical entity
    CREATE TABLE IF NOT EXISTS canonical_asset (
      id uuid NOT NULL,
      tenant_id text NOT NULL,
      version integer NOT NULL DEFAULT 1,
      modified_by text NOT NULL,
      deleted boolean NOT NULL DEFAULT false,
      provenance_id uuid REFERENCES canonical_provenance(id),

      valid_from timestamptz NOT NULL,
      valid_to timestamptz,
      observed_at timestamptz NOT NULL,
      recorded_at timestamptz NOT NULL DEFAULT now(),

      entity_type text NOT NULL DEFAULT 'Asset',
      schema_version text NOT NULL DEFAULT '1.0.0',
      classifications text[] NOT NULL DEFAULT '{}',
      metadata jsonb NOT NULL DEFAULT '{}',

      asset_type text NOT NULL,
      name text NOT NULL,
      identifiers jsonb NOT NULL DEFAULT '{}',
      ownership jsonb,
      value jsonb,
      location jsonb,
      status text,
      acquisition jsonb,
      disposition jsonb,
      risk_flags jsonb,
      properties jsonb NOT NULL DEFAULT '{}',

      PRIMARY KEY (id, recorded_at, valid_from)
    );

    CREATE INDEX IF NOT EXISTS idx_asset_tenant ON canonical_asset(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_asset_valid_time ON canonical_asset(valid_from, valid_to);
    CREATE INDEX IF NOT EXISTS idx_asset_recorded_time ON canonical_asset(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_asset_current ON canonical_asset(id, tenant_id) WHERE valid_to IS NULL AND deleted = false;
    CREATE INDEX IF NOT EXISTS idx_asset_type ON canonical_asset(asset_type);

    -- Location canonical entity
    CREATE TABLE IF NOT EXISTS canonical_location (
      id uuid NOT NULL,
      tenant_id text NOT NULL,
      version integer NOT NULL DEFAULT 1,
      modified_by text NOT NULL,
      deleted boolean NOT NULL DEFAULT false,
      provenance_id uuid REFERENCES canonical_provenance(id),

      valid_from timestamptz NOT NULL,
      valid_to timestamptz,
      observed_at timestamptz NOT NULL,
      recorded_at timestamptz NOT NULL DEFAULT now(),

      entity_type text NOT NULL DEFAULT 'Location',
      schema_version text NOT NULL DEFAULT '1.0.0',
      classifications text[] NOT NULL DEFAULT '{}',
      metadata jsonb NOT NULL DEFAULT '{}',

      name text,
      location_type text NOT NULL,
      coordinates jsonb,
      address jsonb,
      geometry jsonb,
      what3words text,
      plus_code text,
      parent_location jsonb,
      administrative_divisions jsonb,
      time_zone text,
      entities jsonb,
      jurisdictions jsonb,
      risk_flags jsonb,
      properties jsonb NOT NULL DEFAULT '{}',

      PRIMARY KEY (id, recorded_at, valid_from)
    );

    CREATE INDEX IF NOT EXISTS idx_location_tenant ON canonical_location(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_location_valid_time ON canonical_location(valid_from, valid_to);
    CREATE INDEX IF NOT EXISTS idx_location_recorded_time ON canonical_location(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_location_current ON canonical_location(id, tenant_id) WHERE valid_to IS NULL AND deleted = false;
    CREATE INDEX IF NOT EXISTS idx_location_type ON canonical_location(location_type);

    -- Event canonical entity
    CREATE TABLE IF NOT EXISTS canonical_event (
      id uuid NOT NULL,
      tenant_id text NOT NULL,
      version integer NOT NULL DEFAULT 1,
      modified_by text NOT NULL,
      deleted boolean NOT NULL DEFAULT false,
      provenance_id uuid REFERENCES canonical_provenance(id),

      valid_from timestamptz NOT NULL,
      valid_to timestamptz,
      observed_at timestamptz NOT NULL,
      recorded_at timestamptz NOT NULL DEFAULT now(),

      entity_type text NOT NULL DEFAULT 'Event',
      schema_version text NOT NULL DEFAULT '1.0.0',
      classifications text[] NOT NULL DEFAULT '{}',
      metadata jsonb NOT NULL DEFAULT '{}',

      event_type text NOT NULL,
      name text NOT NULL,
      description text,
      timing jsonb NOT NULL,
      locations jsonb,
      participants jsonb,
      related_events jsonb,
      related_documents jsonb,
      outcome jsonb,
      source jsonb,
      risk_flags jsonb,
      properties jsonb NOT NULL DEFAULT '{}',

      PRIMARY KEY (id, recorded_at, valid_from)
    );

    CREATE INDEX IF NOT EXISTS idx_event_tenant ON canonical_event(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_event_valid_time ON canonical_event(valid_from, valid_to);
    CREATE INDEX IF NOT EXISTS idx_event_recorded_time ON canonical_event(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_event_current ON canonical_event(id, tenant_id) WHERE valid_to IS NULL AND deleted = false;
    CREATE INDEX IF NOT EXISTS idx_event_type ON canonical_event(event_type);
    CREATE INDEX IF NOT EXISTS idx_event_timing ON canonical_event USING gin (timing);

    -- Document canonical entity
    CREATE TABLE IF NOT EXISTS canonical_document (
      id uuid NOT NULL,
      tenant_id text NOT NULL,
      version integer NOT NULL DEFAULT 1,
      modified_by text NOT NULL,
      deleted boolean NOT NULL DEFAULT false,
      provenance_id uuid REFERENCES canonical_provenance(id),

      valid_from timestamptz NOT NULL,
      valid_to timestamptz,
      observed_at timestamptz NOT NULL,
      recorded_at timestamptz NOT NULL DEFAULT now(),

      entity_type text NOT NULL DEFAULT 'Document',
      schema_version text NOT NULL DEFAULT '1.0.0',
      classifications text[] NOT NULL DEFAULT '{}',
      metadata jsonb NOT NULL DEFAULT '{}',

      title text NOT NULL,
      document_type text NOT NULL,
      identifiers jsonb NOT NULL DEFAULT '{}',
      authors jsonb,
      issuer jsonb,
      issued_date timestamptz,
      executed_date timestamptz,
      effective_date timestamptz,
      expiration_date timestamptz,
      language text,
      page_count integer,
      format text,
      file_size bigint,
      classification jsonb,
      summary text,
      content text,
      mentions jsonb,
      related_documents jsonb,
      parties jsonb,
      status text,
      properties jsonb NOT NULL DEFAULT '{}',

      PRIMARY KEY (id, recorded_at, valid_from)
    );

    CREATE INDEX IF NOT EXISTS idx_doc_tenant ON canonical_document(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_doc_valid_time ON canonical_document(valid_from, valid_to);
    CREATE INDEX IF NOT EXISTS idx_doc_recorded_time ON canonical_document(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_doc_current ON canonical_document(id, tenant_id) WHERE valid_to IS NULL AND deleted = false;
    CREATE INDEX IF NOT EXISTS idx_doc_type ON canonical_document(document_type);
    CREATE INDEX IF NOT EXISTS idx_doc_title ON canonical_document USING gin (to_tsvector('english', title));

    -- Claim canonical entity
    CREATE TABLE IF NOT EXISTS canonical_claim (
      id uuid NOT NULL,
      tenant_id text NOT NULL,
      version integer NOT NULL DEFAULT 1,
      modified_by text NOT NULL,
      deleted boolean NOT NULL DEFAULT false,
      provenance_id uuid REFERENCES canonical_provenance(id),

      valid_from timestamptz NOT NULL,
      valid_to timestamptz,
      observed_at timestamptz NOT NULL,
      recorded_at timestamptz NOT NULL DEFAULT now(),

      entity_type text NOT NULL DEFAULT 'Claim',
      schema_version text NOT NULL DEFAULT '1.0.0',
      classifications text[] NOT NULL DEFAULT '{}',
      metadata jsonb NOT NULL DEFAULT '{}',

      claim_type text NOT NULL,
      statement text NOT NULL,
      claim_content jsonb,
      subjects jsonb NOT NULL,
      sources jsonb NOT NULL,
      verification jsonb,
      occurred_at timestamptz,
      related_claims jsonb,
      impact jsonb,
      context jsonb,
      risk_flags jsonb,
      properties jsonb NOT NULL DEFAULT '{}',

      PRIMARY KEY (id, recorded_at, valid_from)
    );

    CREATE INDEX IF NOT EXISTS idx_claim_tenant ON canonical_claim(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_claim_valid_time ON canonical_claim(valid_from, valid_to);
    CREATE INDEX IF NOT EXISTS idx_claim_recorded_time ON canonical_claim(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_claim_current ON canonical_claim(id, tenant_id) WHERE valid_to IS NULL AND deleted = false;
    CREATE INDEX IF NOT EXISTS idx_claim_type ON canonical_claim(claim_type);
    CREATE INDEX IF NOT EXISTS idx_claim_statement ON canonical_claim USING gin (to_tsvector('english', statement));

    -- Case canonical entity
    CREATE TABLE IF NOT EXISTS canonical_case (
      id uuid NOT NULL,
      tenant_id text NOT NULL,
      version integer NOT NULL DEFAULT 1,
      modified_by text NOT NULL,
      deleted boolean NOT NULL DEFAULT false,
      provenance_id uuid REFERENCES canonical_provenance(id),

      valid_from timestamptz NOT NULL,
      valid_to timestamptz,
      observed_at timestamptz NOT NULL,
      recorded_at timestamptz NOT NULL DEFAULT now(),

      entity_type text NOT NULL DEFAULT 'Case',
      schema_version text NOT NULL DEFAULT '1.0.0',
      classifications text[] NOT NULL DEFAULT '{}',
      metadata jsonb NOT NULL DEFAULT '{}',

      case_type text NOT NULL,
      case_number text NOT NULL,
      title text NOT NULL,
      description text,
      status text NOT NULL,
      priority jsonb,
      opened_date timestamptz NOT NULL,
      closed_date timestamptz,
      assigned_to jsonb,
      participants jsonb,
      related_entities jsonb,
      related_documents jsonb,
      related_events jsonb,
      related_claims jsonb,
      timeline jsonb,
      jurisdiction jsonb,
      outcome jsonb,
      tags text[],
      risk_assessment jsonb,
      metrics jsonb,
      parent_case jsonb,
      sub_cases jsonb,
      properties jsonb NOT NULL DEFAULT '{}',

      PRIMARY KEY (id, recorded_at, valid_from)
    );

    CREATE INDEX IF NOT EXISTS idx_case_tenant ON canonical_case(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_case_valid_time ON canonical_case(valid_from, valid_to);
    CREATE INDEX IF NOT EXISTS idx_case_recorded_time ON canonical_case(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_case_current ON canonical_case(id, tenant_id) WHERE valid_to IS NULL AND deleted = false;
    CREATE INDEX IF NOT EXISTS idx_case_type ON canonical_case(case_type);
    CREATE INDEX IF NOT EXISTS idx_case_number ON canonical_case(case_number);
    CREATE INDEX IF NOT EXISTS idx_case_status ON canonical_case(status);
    CREATE INDEX IF NOT EXISTS idx_case_tags ON canonical_case USING gin (tags);

    -- Create a view for current (non-deleted, valid_to IS NULL) entities
    CREATE OR REPLACE VIEW canonical_entities_current AS
    SELECT 'Person' as entity_type, id, tenant_id, valid_from, valid_to, recorded_at, deleted FROM canonical_person WHERE valid_to IS NULL AND deleted = false
    UNION ALL
    SELECT 'Organization', id, tenant_id, valid_from, valid_to, recorded_at, deleted FROM canonical_organization WHERE valid_to IS NULL AND deleted = false
    UNION ALL
    SELECT 'Asset', id, tenant_id, valid_from, valid_to, recorded_at, deleted FROM canonical_asset WHERE valid_to IS NULL AND deleted = false
    UNION ALL
    SELECT 'Location', id, tenant_id, valid_from, valid_to, recorded_at, deleted FROM canonical_location WHERE valid_to IS NULL AND deleted = false
    UNION ALL
    SELECT 'Event', id, tenant_id, valid_from, valid_to, recorded_at, deleted FROM canonical_event WHERE valid_to IS NULL AND deleted = false
    UNION ALL
    SELECT 'Document', id, tenant_id, valid_from, valid_to, recorded_at, deleted FROM canonical_document WHERE valid_to IS NULL AND deleted = false
    UNION ALL
    SELECT 'Claim', id, tenant_id, valid_from, valid_to, recorded_at, deleted FROM canonical_claim WHERE valid_to IS NULL AND deleted = false
    UNION ALL
    SELECT 'Case', id, tenant_id, valid_from, valid_to, recorded_at, deleted FROM canonical_case WHERE valid_to IS NULL AND deleted = false;

    -- Create helper functions for bitemporal queries
    CREATE OR REPLACE FUNCTION get_entity_at_time(
      p_entity_type text,
      p_entity_id uuid,
      p_tenant_id text,
      p_as_of timestamptz DEFAULT now(),
      p_as_known_at timestamptz DEFAULT now()
    )
    RETURNS jsonb AS $$
    DECLARE
      v_table_name text;
      v_result jsonb;
    BEGIN
      v_table_name := 'canonical_' || lower(p_entity_type);

      EXECUTE format('
        SELECT row_to_json(t.*)::jsonb
        FROM %I t
        WHERE id = $1
          AND tenant_id = $2
          AND valid_from <= $3
          AND (valid_to IS NULL OR valid_to > $3)
          AND recorded_at <= $4
          AND deleted = false
        ORDER BY recorded_at DESC
        LIMIT 1
      ', v_table_name)
      INTO v_result
      USING p_entity_id, p_tenant_id, p_as_of, p_as_known_at;

      RETURN v_result;
    END;
    $$ LANGUAGE plpgsql;

    -- Create metrics table for monitoring
    CREATE TABLE IF NOT EXISTS canonical_metrics (
      id bigserial PRIMARY KEY,
      tenant_id text NOT NULL,
      entity_type text NOT NULL,
      metric_type text NOT NULL,
      metric_value numeric NOT NULL,
      recorded_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_canonical_metrics_tenant ON canonical_metrics(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_canonical_metrics_type ON canonical_metrics(entity_type, metric_type);
    CREATE INDEX IF NOT EXISTS idx_canonical_metrics_time ON canonical_metrics(recorded_at);
  `);
}
