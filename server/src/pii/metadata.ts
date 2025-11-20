/**
 * Metadata Storage and Tagging System
 *
 * Provides persistence and retrieval of sensitivity metadata
 * across catalog, graph (Neo4j), and SQL databases.
 */

import {
  SensitivityMetadata,
  SensitivityClass,
  RegulatoryTag,
} from './sensitivity.js';
import { PIIType } from './types.js';

/**
 * Graph node/edge property schema for sensitivity tagging
 */
export interface GraphSensitivityProperties {
  /** Primary sensitivity classification */
  sensitivityClass: string;

  /** Comma-separated list of PII types */
  piiTypes: string;

  /** Severity level (low, medium, high, critical) */
  severity: string;

  /** Comma-separated regulatory tags */
  regulatoryTags: string;

  /** Comma-separated policy tags */
  policyTags: string;

  /** Timestamp of detection */
  sensitivityDetectedAt: string;

  /** Source system that detected sensitivity */
  sensitivitySource: string;

  /** Last validation timestamp */
  sensitivityLastValidated?: string;

  /** Validator user ID */
  sensitivityValidatedBy?: string;

  /** Minimum clearance required to access */
  minClearance: number;

  /** Requires step-up auth */
  requiresStepUp: boolean;

  /** Requires purpose justification */
  requiresPurpose: boolean;
}

/**
 * SQL column schema for sensitivity metadata
 */
export interface SQLSensitivityColumns {
  sensitivity_class: SensitivityClass;
  pii_types: string[]; // JSONB or array type
  severity: string;
  regulatory_tags: string[]; // JSONB or array type
  policy_tags: string[]; // JSONB or array type
  sensitivity_detected_at: Date;
  sensitivity_source: string;
  sensitivity_last_validated?: Date;
  sensitivity_validated_by?: string;
  min_clearance: number;
  requires_step_up: boolean;
  requires_purpose: boolean;
  retention_days_min: number;
  retention_days_max: number;
  encryption_required: boolean;
  encryption_method?: string;
}

/**
 * Catalog entry sensitivity metadata
 */
export interface CatalogSensitivityEntry {
  /** Catalog item ID (table, dataset, service, etc.) */
  catalogId: string;

  /** Type of catalog entry (table, column, dataset, service) */
  catalogType: 'table' | 'column' | 'dataset' | 'service' | 'api';

  /** Fully qualified name */
  fullyQualifiedName: string;

  /** Sensitivity metadata */
  sensitivity: SensitivityMetadata;

  /** Field-level sensitivity (for tables/schemas) */
  fieldSensitivity?: Record<string, SensitivityMetadata>;

  /** Last scanned timestamp */
  lastScanned: Date;

  /** Scan status */
  scanStatus: 'pending' | 'completed' | 'failed' | 'skipped';

  /** Error message if failed */
  scanError?: string;
}

/**
 * Metadata storage interface
 */
export interface MetadataStore {
  /**
   * Store sensitivity metadata for a catalog entry
   */
  storeCatalogMetadata(entry: CatalogSensitivityEntry): Promise<void>;

  /**
   * Retrieve sensitivity metadata for a catalog entry
   */
  getCatalogMetadata(catalogId: string): Promise<CatalogSensitivityEntry | null>;

  /**
   * Query catalog entries by sensitivity class
   */
  queryCatalogBySensitivity(
    sensitivityClass: SensitivityClass,
  ): Promise<CatalogSensitivityEntry[]>;

  /**
   * Query catalog entries by regulatory tag
   */
  queryCatalogByRegulation(
    regulatoryTag: RegulatoryTag,
  ): Promise<CatalogSensitivityEntry[]>;

  /**
   * Tag a Neo4j node with sensitivity metadata
   */
  tagGraphNode(
    nodeId: string,
    metadata: SensitivityMetadata,
  ): Promise<void>;

  /**
   * Tag a Neo4j relationship with sensitivity metadata
   */
  tagGraphRelationship(
    relationshipId: string,
    metadata: SensitivityMetadata,
  ): Promise<void>;

  /**
   * Query graph nodes by sensitivity class
   */
  queryGraphNodesBySensitivity(
    sensitivityClass: SensitivityClass,
  ): Promise<string[]>;

  /**
   * Update SQL record sensitivity metadata
   */
  updateSQLMetadata(
    tableName: string,
    recordId: string,
    metadata: SensitivityMetadata,
  ): Promise<void>;

  /**
   * Batch update SQL records with sensitivity metadata
   */
  batchUpdateSQLMetadata(
    tableName: string,
    updates: Array<{ recordId: string; metadata: SensitivityMetadata }>,
  ): Promise<void>;
}

/**
 * Convert SensitivityMetadata to Graph properties
 */
export function toGraphProperties(
  metadata: SensitivityMetadata,
): GraphSensitivityProperties {
  return {
    sensitivityClass: metadata.sensitivityClass,
    piiTypes: metadata.piiTypes.join(','),
    severity: metadata.severity,
    regulatoryTags: metadata.regulatoryTags.join(','),
    policyTags: metadata.policyTags.join(','),
    sensitivityDetectedAt: metadata.lineage?.detectedAt.toISOString() || new Date().toISOString(),
    sensitivitySource: metadata.lineage?.source || 'unknown',
    sensitivityLastValidated: metadata.lineage?.lastValidated?.toISOString(),
    sensitivityValidatedBy: metadata.lineage?.validatedBy,
    minClearance: metadata.accessControl.minimumClearance,
    requiresStepUp: metadata.accessControl.requireStepUp,
    requiresPurpose: metadata.accessControl.requirePurpose,
  };
}

/**
 * Convert Graph properties to SensitivityMetadata
 */
export function fromGraphProperties(
  props: GraphSensitivityProperties,
): SensitivityMetadata {
  const piiTypes = props.piiTypes.split(',').filter(Boolean) as PIIType[];
  const regulatoryTags = props.regulatoryTags.split(',').filter(Boolean) as RegulatoryTag[];
  const policyTags = props.policyTags.split(',').filter(Boolean);

  return {
    sensitivityClass: props.sensitivityClass as SensitivityClass,
    piiTypes,
    severity: props.severity as 'low' | 'medium' | 'high' | 'critical',
    regulatoryTags,
    policyTags,
    retentionPolicy: {
      minimumDays: 0,
      maximumDays: 2555,
      autoDelete: false,
      legalHoldRequired: false,
      encryptionRequired: false,
    },
    accessControl: {
      minimumClearance: props.minClearance,
      requireStepUp: props.requiresStepUp,
      requirePurpose: props.requiresPurpose,
      requireApproval: false,
      maxExportRecords: 1000,
      auditAccess: true,
      requireAgreement: false,
    },
    lineage: {
      source: props.sensitivitySource,
      detectedAt: new Date(props.sensitivityDetectedAt),
      lastValidated: props.sensitivityLastValidated
        ? new Date(props.sensitivityLastValidated)
        : undefined,
      validatedBy: props.sensitivityValidatedBy,
    },
  };
}

/**
 * Convert SensitivityMetadata to SQL columns
 */
export function toSQLColumns(
  metadata: SensitivityMetadata,
): SQLSensitivityColumns {
  return {
    sensitivity_class: metadata.sensitivityClass,
    pii_types: metadata.piiTypes,
    severity: metadata.severity,
    regulatory_tags: metadata.regulatoryTags,
    policy_tags: metadata.policyTags,
    sensitivity_detected_at: metadata.lineage?.detectedAt || new Date(),
    sensitivity_source: metadata.lineage?.source || 'unknown',
    sensitivity_last_validated: metadata.lineage?.lastValidated,
    sensitivity_validated_by: metadata.lineage?.validatedBy,
    min_clearance: metadata.accessControl.minimumClearance,
    requires_step_up: metadata.accessControl.requireStepUp,
    requires_purpose: metadata.accessControl.requirePurpose,
    retention_days_min: metadata.retentionPolicy.minimumDays,
    retention_days_max: metadata.retentionPolicy.maximumDays,
    encryption_required: metadata.retentionPolicy.encryptionRequired,
    encryption_method: metadata.retentionPolicy.encryptionMethod,
  };
}

/**
 * SQL schema migration for adding sensitivity columns
 */
export const SQL_SENSITIVITY_SCHEMA = `
-- Add sensitivity metadata columns to any table
-- Usage: Replace {table_name} with your target table

ALTER TABLE {table_name}
  ADD COLUMN IF NOT EXISTS sensitivity_class VARCHAR(50),
  ADD COLUMN IF NOT EXISTS pii_types JSONB,
  ADD COLUMN IF NOT EXISTS severity VARCHAR(20),
  ADD COLUMN IF NOT EXISTS regulatory_tags JSONB,
  ADD COLUMN IF NOT EXISTS policy_tags JSONB,
  ADD COLUMN IF NOT EXISTS sensitivity_detected_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS sensitivity_source VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sensitivity_last_validated TIMESTAMP,
  ADD COLUMN IF NOT EXISTS sensitivity_validated_by VARCHAR(100),
  ADD COLUMN IF NOT EXISTS min_clearance INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requires_step_up BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requires_purpose BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS retention_days_min INTEGER,
  ADD COLUMN IF NOT EXISTS retention_days_max INTEGER,
  ADD COLUMN IF NOT EXISTS encryption_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS encryption_method VARCHAR(50);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_{table_name}_sensitivity_class
  ON {table_name}(sensitivity_class);

CREATE INDEX IF NOT EXISTS idx_{table_name}_severity
  ON {table_name}(severity);

CREATE INDEX IF NOT EXISTS idx_{table_name}_min_clearance
  ON {table_name}(min_clearance);

-- GIN index for JSONB array queries
CREATE INDEX IF NOT EXISTS idx_{table_name}_pii_types
  ON {table_name} USING GIN(pii_types);

CREATE INDEX IF NOT EXISTS idx_{table_name}_regulatory_tags
  ON {table_name} USING GIN(regulatory_tags);
`;

/**
 * Neo4j Cypher query templates for sensitivity tagging
 */
export const CYPHER_SENSITIVITY_QUERIES = {
  /**
   * Tag a node with sensitivity metadata
   */
  tagNode: `
    MATCH (n)
    WHERE elementId(n) = $nodeId
    SET n.sensitivityClass = $sensitivityClass,
        n.piiTypes = $piiTypes,
        n.severity = $severity,
        n.regulatoryTags = $regulatoryTags,
        n.policyTags = $policyTags,
        n.sensitivityDetectedAt = $sensitivityDetectedAt,
        n.sensitivitySource = $sensitivitySource,
        n.minClearance = $minClearance,
        n.requiresStepUp = $requiresStepUp,
        n.requiresPurpose = $requiresPurpose
    RETURN n
  `,

  /**
   * Tag a relationship with sensitivity metadata
   */
  tagRelationship: `
    MATCH ()-[r]->()
    WHERE elementId(r) = $relationshipId
    SET r.sensitivityClass = $sensitivityClass,
        r.piiTypes = $piiTypes,
        r.severity = $severity,
        r.regulatoryTags = $regulatoryTags,
        r.policyTags = $policyTags,
        r.sensitivityDetectedAt = $sensitivityDetectedAt,
        r.sensitivitySource = $sensitivitySource,
        r.minClearance = $minClearance,
        r.requiresStepUp = $requiresStepUp,
        r.requiresPurpose = $requiresPurpose
    RETURN r
  `,

  /**
   * Query nodes by sensitivity class
   */
  queryNodesBySensitivity: `
    MATCH (n)
    WHERE n.sensitivityClass = $sensitivityClass
    RETURN elementId(n) as id, labels(n) as labels, n.sensitivityClass as class
    ORDER BY n.sensitivityDetectedAt DESC
  `,

  /**
   * Query nodes by minimum clearance level
   */
  queryNodesByClearance: `
    MATCH (n)
    WHERE n.minClearance >= $minClearance
    RETURN elementId(n) as id, labels(n) as labels,
           n.minClearance as clearance, n.sensitivityClass as class
    ORDER BY n.minClearance DESC
  `,

  /**
   * Find nodes with specific regulatory tags
   */
  queryNodesByRegulation: `
    MATCH (n)
    WHERE $regulatoryTag IN split(n.regulatoryTags, ',')
    RETURN elementId(n) as id, labels(n) as labels,
           n.regulatoryTags as tags, n.sensitivityClass as class
  `,

  /**
   * Create index on sensitivity properties
   */
  createIndexes: `
    CREATE INDEX sensitivity_class_idx IF NOT EXISTS
    FOR (n:Entity)
    ON (n.sensitivityClass);

    CREATE INDEX min_clearance_idx IF NOT EXISTS
    FOR (n:Entity)
    ON (n.minClearance);

    CREATE INDEX severity_idx IF NOT EXISTS
    FOR (n:Entity)
    ON (n.severity);
  `,
};

/**
 * Catalog metadata table schema (PostgreSQL)
 */
export const CATALOG_METADATA_SCHEMA = `
CREATE TABLE IF NOT EXISTS catalog_sensitivity (
  id SERIAL PRIMARY KEY,
  catalog_id VARCHAR(255) UNIQUE NOT NULL,
  catalog_type VARCHAR(50) NOT NULL,
  fully_qualified_name VARCHAR(500) NOT NULL,

  -- Sensitivity metadata
  sensitivity_class VARCHAR(50) NOT NULL,
  pii_types JSONB,
  severity VARCHAR(20),
  regulatory_tags JSONB,
  policy_tags JSONB,

  -- Access control
  min_clearance INTEGER DEFAULT 0,
  requires_step_up BOOLEAN DEFAULT FALSE,
  requires_purpose BOOLEAN DEFAULT FALSE,
  max_export_records INTEGER,

  -- Retention policy
  retention_days_min INTEGER,
  retention_days_max INTEGER,
  encryption_required BOOLEAN DEFAULT FALSE,
  encryption_method VARCHAR(50),

  -- Lineage
  sensitivity_source VARCHAR(100),
  sensitivity_detected_at TIMESTAMP DEFAULT NOW(),
  sensitivity_last_validated TIMESTAMP,
  sensitivity_validated_by VARCHAR(100),

  -- Scan status
  last_scanned TIMESTAMP DEFAULT NOW(),
  scan_status VARCHAR(20) DEFAULT 'pending',
  scan_error TEXT,

  -- Field-level sensitivity (for tables/schemas)
  field_sensitivity JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_catalog_sensitivity_class ON catalog_sensitivity(sensitivity_class);
CREATE INDEX idx_catalog_type ON catalog_sensitivity(catalog_type);
CREATE INDEX idx_catalog_severity ON catalog_sensitivity(severity);
CREATE INDEX idx_catalog_clearance ON catalog_sensitivity(min_clearance);
CREATE INDEX idx_catalog_fqn ON catalog_sensitivity(fully_qualified_name);

-- GIN indexes for JSONB
CREATE INDEX idx_catalog_pii_types ON catalog_sensitivity USING GIN(pii_types);
CREATE INDEX idx_catalog_regulatory_tags ON catalog_sensitivity USING GIN(regulatory_tags);
CREATE INDEX idx_catalog_field_sensitivity ON catalog_sensitivity USING GIN(field_sensitivity);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_catalog_sensitivity_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
CREATE TRIGGER catalog_sensitivity_update_timestamp
  BEFORE UPDATE ON catalog_sensitivity
  FOR EACH ROW
  EXECUTE FUNCTION update_catalog_sensitivity_timestamp();
`;
