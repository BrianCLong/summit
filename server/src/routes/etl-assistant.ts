/**
 * ETL Assistant API Router
 * Provides REST endpoints for schema preview, PII scanning, and license checking
 */

import express, { Request, Response, NextFunction } from 'express';
import { body, query, validationResult, ValidationChain } from 'express-validator';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import crypto from 'crypto';
import { Pool } from 'pg';

const logger = pino().child({ module: 'etl-assistant' });

// Rate limiting for ETL operations
const etlRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'Too many ETL requests, please try again later' },
});

// Types
interface FieldSchema {
  name: string;
  inferred_type: string;
  nullable: boolean;
  sample_values: any[];
  confidence: number;
}

interface MappingSuggestion {
  source_field: string;
  canonical_entity: string;
  canonical_property: string;
  confidence: number;
  reasoning: string;
}

interface PIIMatch {
  category: string;
  severity: string;
  field_name: string;
  sample_value: string;
  match_count: number;
  confidence: number;
  recommended_strategy: string;
  reasoning: string;
}

interface SchemaPreviewResult {
  fields: FieldSchema[];
  suggested_mappings: MappingSuggestion[];
  primary_entity: string | null;
  record_count: number;
  processing_time_ms: number;
}

interface PIIScanResult {
  pii_matches: PIIMatch[];
  overall_risk: string;
  summary: string;
  requires_dpia: boolean;
  processing_time_ms: number;
}

interface LicenseCheckResult {
  compliance_status: 'allow' | 'warn' | 'block';
  reason: string;
  violations: any[];
  warnings: any[];
  appeal_path: string | null;
}

// Canonical mappings (deterministic)
const CANONICAL_MAPPINGS: Record<string, [string, string]> = {
  first_name: ['Person', 'firstName'],
  last_name: ['Person', 'lastName'],
  full_name: ['Person', 'name'],
  name: ['Person', 'name'],
  email: ['Person', 'email'],
  phone: ['Person', 'phone'],
  dob: ['Person', 'dateOfBirth'],
  date_of_birth: ['Person', 'dateOfBirth'],
  ssn: ['Person', 'nationalId'],
  social_security: ['Person', 'nationalId'],
  address: ['Person', 'address'],
  company: ['Org', 'name'],
  company_name: ['Org', 'name'],
  organization: ['Org', 'name'],
  org_name: ['Org', 'name'],
  ein: ['Org', 'taxId'],
  tax_id: ['Org', 'taxId'],
  industry: ['Org', 'industry'],
  sector: ['Org', 'sector'],
  city: ['Location', 'city'],
  state: ['Location', 'state'],
  country: ['Location', 'country'],
  zip_code: ['Location', 'postalCode'],
  postal_code: ['Location', 'postalCode'],
  latitude: ['Location', 'latitude'],
  longitude: ['Location', 'longitude'],
  lat: ['Location', 'latitude'],
  lon: ['Location', 'longitude'],
  event_date: ['Event', 'date'],
  event_time: ['Event', 'timestamp'],
  event_type: ['Event', 'type'],
  asset_id: ['Asset', 'id'],
  asset_name: ['Asset', 'name'],
  serial_number: ['Asset', 'serialNumber'],
};

// PII patterns
const PII_FIELD_INDICATORS: Record<string, { severity: string; strategy: string }> = {
  ssn: { severity: 'critical', strategy: 'hash' },
  social_security: { severity: 'critical', strategy: 'hash' },
  email: { severity: 'medium', strategy: 'tokenize' },
  phone: { severity: 'medium', strategy: 'mask' },
  mobile: { severity: 'medium', strategy: 'mask' },
  credit_card: { severity: 'critical', strategy: 'hash' },
  cc_number: { severity: 'critical', strategy: 'hash' },
  dob: { severity: 'medium', strategy: 'mask' },
  date_of_birth: { severity: 'medium', strategy: 'mask' },
  passport: { severity: 'critical', strategy: 'hash' },
  driver_license: { severity: 'high', strategy: 'hash' },
  address: { severity: 'low', strategy: 'mask' },
  ip_address: { severity: 'low', strategy: 'mask' },
};

// Validation middleware helper
const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  };
};

/**
 * Create ETL Assistant API router
 */
export function createETLAssistantRouter(pg?: Pool): express.Router {
  const router = express.Router();

  // Apply rate limiting
  router.use(etlRateLimiter);

  /**
   * POST /preview-schema
   * Infer schema and suggest canonical mappings from sample data
   */
  router.post(
    '/preview-schema',
    validate([
      body('sample_rows').isArray({ min: 1, max: 1000 }).withMessage('sample_rows must be an array with 1-1000 rows'),
      body('tenant_id').isString().notEmpty().withMessage('tenant_id is required'),
      body('source_name').optional().isString(),
    ]),
    async (req: Request, res: Response) => {
      const startTime = Date.now();

      try {
        const { sample_rows, tenant_id, source_name } = req.body;

        logger.info({ tenantId: tenant_id, rowCount: sample_rows.length }, 'Schema preview requested');

        const result = inferSchema(sample_rows);
        const processingTime = Date.now() - startTime;

        logger.info({
          tenantId: tenant_id,
          fieldCount: result.fields.length,
          mappingCount: result.suggested_mappings.length,
          processingTimeMs: processingTime,
        }, 'Schema preview completed');

        res.json({
          ...result,
          processing_time_ms: processingTime,
        });
      } catch (err) {
        logger.error({ err }, 'Schema preview failed');
        res.status(500).json({
          error: 'Schema preview failed',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
  );

  /**
   * POST /pii-scan
   * Scan sample data for PII and recommend redactions
   */
  router.post(
    '/pii-scan',
    validate([
      body('sample_rows').isArray({ min: 1, max: 1000 }).withMessage('sample_rows must be an array with 1-1000 rows'),
      body('tenant_id').isString().notEmpty().withMessage('tenant_id is required'),
    ]),
    async (req: Request, res: Response) => {
      const startTime = Date.now();

      try {
        const { sample_rows, tenant_id } = req.body;

        logger.info({ tenantId: tenant_id, rowCount: sample_rows.length }, 'PII scan requested');

        const result = scanForPII(sample_rows);
        const processingTime = Date.now() - startTime;

        logger.info({
          tenantId: tenant_id,
          piiFieldCount: result.pii_matches.length,
          overallRisk: result.overall_risk,
          processingTimeMs: processingTime,
        }, 'PII scan completed');

        res.json({
          ...result,
          processing_time_ms: processingTime,
        });
      } catch (err) {
        logger.error({ err }, 'PII scan failed');
        res.status(500).json({
          error: 'PII scan failed',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
  );

  /**
   * POST /license-check
   * Verify source against license registry
   */
  router.post(
    '/license-check',
    validate([
      body('source_name').isString().notEmpty().withMessage('source_name is required'),
      body('source_type').isString().notEmpty().withMessage('source_type is required'),
      body('tenant_id').isString().notEmpty().withMessage('tenant_id is required'),
      body('operation').optional().isIn(['ingest', 'query', 'export', 'transform']),
      body('purpose').optional().isString(),
      body('data_source_ids').optional().isArray(),
    ]),
    async (req: Request, res: Response) => {
      try {
        const { source_name, source_type, tenant_id, operation = 'ingest', data_source_ids } = req.body;

        logger.info({ tenantId: tenant_id, sourceName: source_name, operation }, 'License check requested');

        const result = await checkLicenseCompliance(
          source_name,
          source_type,
          operation,
          data_source_ids || [],
          pg,
        );

        logger.info({
          tenantId: tenant_id,
          sourceName: source_name,
          complianceStatus: result.compliance_status,
        }, 'License check completed');

        res.json(result);
      } catch (err) {
        logger.error({ err }, 'License check failed');
        res.status(500).json({
          error: 'License check failed',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
  );

  /**
   * POST /configurations
   * Save ETL configuration with lineage
   */
  router.post(
    '/configurations',
    validate([
      body('tenant_id').isString().notEmpty(),
      body('source_name').isString().notEmpty(),
      body('source_type').isString().notEmpty(),
      body('field_mappings').isArray(),
      body('pii_handling').isArray(),
      body('created_by').isString().notEmpty(),
    ]),
    async (req: Request, res: Response) => {
      if (!pg) {
        return res.status(503).json({ error: 'Database not available' });
      }

      try {
        const {
          tenant_id,
          source_name,
          source_type,
          sample_rows = [],
          field_mappings,
          pii_handling,
          license_decision,
          created_by,
        } = req.body;

        const configId = `etl_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

        await pg.query(
          `INSERT INTO etl_configurations
           (id, tenant_id, source_name, source_type, created_by, created_at,
            field_mappings, pii_handling, license_decision, metadata)
           VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9)`,
          [
            configId,
            tenant_id,
            source_name,
            source_type,
            created_by,
            JSON.stringify(field_mappings),
            JSON.stringify(pii_handling),
            JSON.stringify(license_decision || {}),
            JSON.stringify({ sample_hash: hashSample(sample_rows) }),
          ],
        );

        logger.info({ tenantId: tenant_id, configId }, 'ETL configuration saved');

        res.status(201).json({
          config_id: configId,
          message: 'Configuration saved successfully',
        });
      } catch (err) {
        logger.error({ err }, 'Failed to save configuration');
        res.status(500).json({
          error: 'Failed to save configuration',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
  );

  /**
   * GET /configurations/:id
   * Retrieve saved ETL configuration
   */
  router.get(
    '/configurations/:id',
    validate([
      query('tenant_id').isString().notEmpty().withMessage('tenant_id query parameter required'),
    ]),
    async (req: Request, res: Response) => {
      if (!pg) {
        return res.status(503).json({ error: 'Database not available' });
      }

      try {
        const { id } = req.params;
        const { tenant_id } = req.query;

        const result = await pg.query(
          `SELECT * FROM etl_configurations WHERE id = $1 AND tenant_id = $2`,
          [id, tenant_id],
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Configuration not found' });
        }

        res.json(result.rows[0]);
      } catch (err) {
        logger.error({ err }, 'Failed to load configuration');
        res.status(500).json({
          error: 'Failed to load configuration',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
  );

  /**
   * GET /configurations
   * List configurations for a tenant
   */
  router.get(
    '/configurations',
    validate([
      query('tenant_id').isString().notEmpty().withMessage('tenant_id query parameter required'),
      query('limit').optional().isInt({ min: 1, max: 100 }),
      query('offset').optional().isInt({ min: 0 }),
    ]),
    async (req: Request, res: Response) => {
      if (!pg) {
        return res.status(503).json({ error: 'Database not available' });
      }

      try {
        const { tenant_id, limit = 20, offset = 0 } = req.query;

        const result = await pg.query(
          `SELECT id, source_name, source_type, created_by, created_at
           FROM etl_configurations
           WHERE tenant_id = $1
           ORDER BY created_at DESC
           LIMIT $2 OFFSET $3`,
          [tenant_id, Number(limit), Number(offset)],
        );

        const countResult = await pg.query(
          `SELECT COUNT(*) FROM etl_configurations WHERE tenant_id = $1`,
          [tenant_id],
        );

        res.json({
          configurations: result.rows,
          total: parseInt(countResult.rows[0].count, 10),
          limit: Number(limit),
          offset: Number(offset),
        });
      } catch (err) {
        logger.error({ err }, 'Failed to list configurations');
        res.status(500).json({
          error: 'Failed to list configurations',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
  );

  return router;
}

// Helper functions

/**
 * Infer schema from sample rows
 */
function inferSchema(rows: Record<string, any>[]): Omit<SchemaPreviewResult, 'processing_time_ms'> {
  if (rows.length === 0) {
    return {
      fields: [],
      suggested_mappings: [],
      primary_entity: null,
      record_count: 0,
    };
  }

  const fieldNames = Object.keys(rows[0]);
  const fields: FieldSchema[] = fieldNames.map(name => {
    const values = rows.map(r => r[name]).filter(v => v != null && v !== '');
    return {
      name,
      inferred_type: inferFieldType(values),
      nullable: values.length < rows.length,
      sample_values: values.slice(0, 5),
      confidence: values.length > 0 ? 0.8 + (values.length / rows.length) * 0.2 : 0,
    };
  });

  const suggestedMappings = generateMappings(fields);
  const primaryEntity = determinePrimaryEntity(suggestedMappings);

  return {
    fields,
    suggested_mappings: suggestedMappings,
    primary_entity: primaryEntity,
    record_count: rows.length,
  };
}

function inferFieldType(values: any[]): string {
  if (values.length === 0) return 'unknown';

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
  const dateRegex = /^\d{4}-\d{2}-\d{2}/;
  const urlRegex = /^https?:\/\//;

  // Check patterns
  const strValues = values.map(v => String(v));

  if (strValues.every(v => emailRegex.test(v))) return 'email';
  if (strValues.every(v => phoneRegex.test(v))) return 'phone';
  if (strValues.every(v => dateRegex.test(v))) return 'date';
  if (strValues.every(v => urlRegex.test(v))) return 'url';

  // Check types
  if (values.every(v => typeof v === 'boolean')) return 'boolean';
  if (values.every(v => typeof v === 'number' && Number.isInteger(v))) return 'integer';
  if (values.every(v => typeof v === 'number')) return 'float';

  return 'string';
}

function generateMappings(fields: FieldSchema[]): MappingSuggestion[] {
  const mappings: MappingSuggestion[] = [];

  for (const field of fields) {
    const normalized = field.name.toLowerCase().replace(/\s+/g, '_');

    // Direct name match
    if (normalized in CANONICAL_MAPPINGS) {
      const [entity, property] = CANONICAL_MAPPINGS[normalized];
      mappings.push({
        source_field: field.name,
        canonical_entity: entity,
        canonical_property: property,
        confidence: 0.95,
        reasoning: `Direct field name match: '${field.name}'`,
      });
      continue;
    }

    // Partial match
    for (const [key, [entity, property]] of Object.entries(CANONICAL_MAPPINGS)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        mappings.push({
          source_field: field.name,
          canonical_entity: entity,
          canonical_property: property,
          confidence: 0.75,
          reasoning: `Partial field name match: '${key}' in '${field.name}'`,
        });
        break;
      }
    }

    // Type-based heuristics
    if (field.inferred_type === 'email' && !mappings.some(m => m.source_field === field.name)) {
      mappings.push({
        source_field: field.name,
        canonical_entity: 'Person',
        canonical_property: 'email',
        confidence: 0.85,
        reasoning: 'Field contains email addresses',
      });
    } else if (field.inferred_type === 'phone' && !mappings.some(m => m.source_field === field.name)) {
      mappings.push({
        source_field: field.name,
        canonical_entity: 'Person',
        canonical_property: 'phone',
        confidence: 0.85,
        reasoning: 'Field contains phone numbers',
      });
    }
  }

  return mappings;
}

function determinePrimaryEntity(mappings: MappingSuggestion[]): string | null {
  if (mappings.length === 0) return null;

  const entityScores: Record<string, number> = {};
  for (const mapping of mappings) {
    entityScores[mapping.canonical_entity] =
      (entityScores[mapping.canonical_entity] || 0) + mapping.confidence;
  }

  const sorted = Object.entries(entityScores).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || null;
}

/**
 * Scan for PII in sample data
 */
function scanForPII(rows: Record<string, any>[]): Omit<PIIScanResult, 'processing_time_ms'> {
  if (rows.length === 0) {
    return {
      pii_matches: [],
      overall_risk: 'none',
      summary: 'No data to scan',
      requires_dpia: false,
    };
  }

  const fieldNames = Object.keys(rows[0]);
  const piiMatches: PIIMatch[] = [];

  for (const fieldName of fieldNames) {
    const values = rows.map(r => r[fieldName]).filter(v => v != null && v !== '');
    const match = detectPIIField(fieldName, values);
    if (match) {
      piiMatches.push(match);
    }
  }

  const overallRisk = calculateOverallRisk(piiMatches);
  const requiresDpia = piiMatches.some(m => ['critical', 'high'].includes(m.severity));

  return {
    pii_matches: piiMatches,
    overall_risk: overallRisk,
    summary: piiMatches.length > 0
      ? `Detected ${piiMatches.length} PII field(s) with ${overallRisk} risk. Redaction recommended.`
      : 'No PII detected in sample data',
    requires_dpia: requiresDpia,
  };
}

function detectPIIField(fieldName: string, values: any[]): PIIMatch | null {
  const normalized = fieldName.toLowerCase().replace(/\s+/g, '_');

  // Field name based detection
  for (const [indicator, config] of Object.entries(PII_FIELD_INDICATORS)) {
    if (normalized.includes(indicator)) {
      return {
        category: indicator,
        severity: config.severity,
        field_name: fieldName,
        sample_value: redactSample(String(values[0] || ''), indicator),
        match_count: values.length,
        confidence: 0.9,
        recommended_strategy: config.strategy,
        reasoning: `Field name '${fieldName}' indicates ${indicator.replace(/_/g, ' ')}`,
      };
    }
  }

  // Pattern-based detection
  const strValues = values.map(v => String(v));
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const ssnRegex = /^\d{3}-\d{2}-\d{4}$/;
  const phoneRegex = /^\+?[\d\s\-()]{10,}$/;

  if (strValues.filter(v => emailRegex.test(v)).length > values.length * 0.7) {
    return {
      category: 'email',
      severity: 'medium',
      field_name: fieldName,
      sample_value: redactSample(strValues[0], 'email'),
      match_count: values.length,
      confidence: 0.85,
      recommended_strategy: 'tokenize',
      reasoning: 'Pattern match for email addresses',
    };
  }

  if (strValues.filter(v => ssnRegex.test(v)).length > values.length * 0.5) {
    return {
      category: 'ssn',
      severity: 'critical',
      field_name: fieldName,
      sample_value: redactSample(strValues[0], 'ssn'),
      match_count: values.length,
      confidence: 0.9,
      recommended_strategy: 'hash',
      reasoning: 'Pattern match for SSN format',
    };
  }

  if (strValues.filter(v => phoneRegex.test(v)).length > values.length * 0.7) {
    return {
      category: 'phone',
      severity: 'medium',
      field_name: fieldName,
      sample_value: redactSample(strValues[0], 'phone'),
      match_count: values.length,
      confidence: 0.8,
      recommended_strategy: 'mask',
      reasoning: 'Pattern match for phone numbers',
    };
  }

  return null;
}

function redactSample(value: string, category: string): string {
  if (!value) return '****';

  switch (category) {
    case 'ssn':
    case 'credit_card':
      return value.length > 4 ? `***-**-${value.slice(-4)}` : '****';
    case 'email':
      const parts = value.split('@');
      return parts.length === 2 ? `${parts[0].slice(0, 2)}***@${parts[1]}` : '***@***.***';
    case 'phone':
      const digits = value.replace(/\D/g, '');
      return digits.length > 4 ? `***-***-${digits.slice(-4)}` : '***-****';
    default:
      return value.length > 4 ? `${value.slice(0, 2)}...${value.slice(-2)}` : '****';
  }
}

function calculateOverallRisk(piiMatches: PIIMatch[]): string {
  if (piiMatches.length === 0) return 'none';
  if (piiMatches.some(m => m.severity === 'critical')) return 'critical';
  if (piiMatches.some(m => m.severity === 'high')) return 'high';
  if (piiMatches.some(m => m.severity === 'medium')) return 'medium';
  return 'low';
}

/**
 * Check license compliance
 */
async function checkLicenseCompliance(
  sourceName: string,
  sourceType: string,
  operation: string,
  dataSourceIds: string[],
  pg?: Pool,
): Promise<LicenseCheckResult> {
  // If no database, return warning
  if (!pg) {
    return {
      compliance_status: 'warn',
      reason: 'License registry not available. Please verify compliance manually.',
      violations: [],
      warnings: [{ source: sourceName, warning: 'Database unavailable', severity: 'medium' }],
      appeal_path: null,
    };
  }

  try {
    // Look up data source
    let sourceIds = dataSourceIds;
    if (sourceIds.length === 0) {
      const result = await pg.query(
        'SELECT id FROM data_sources WHERE name = $1',
        [sourceName],
      );
      sourceIds = result.rows.map(r => r.id);
    }

    if (sourceIds.length === 0) {
      return {
        compliance_status: 'warn',
        reason: `Data source '${sourceName}' not registered in license registry. Please register before ingesting.`,
        violations: [],
        warnings: [{ source: sourceName, warning: 'Source not registered', severity: 'medium' }],
        appeal_path: null,
      };
    }

    // Check compliance
    const result = await pg.query(
      `SELECT ds.*, l.compliance_level, l.restrictions, l.name as license_name
       FROM data_sources ds
       JOIN licenses l ON ds.license_id = l.id
       WHERE ds.id = ANY($1)`,
      [sourceIds],
    );

    if (result.rows.length === 0) {
      return {
        compliance_status: 'warn',
        reason: 'License information not found for data source',
        violations: [],
        warnings: [],
        appeal_path: null,
      };
    }

    const violations: any[] = [];
    const warnings: any[] = [];
    let complianceStatus: 'allow' | 'warn' | 'block' = 'allow';

    for (const row of result.rows) {
      const restrictions = row.restrictions || {};

      if (operation === 'export' && restrictions.export_allowed === false) {
        violations.push({
          data_source: row.name,
          license: row.license_name,
          violation: 'Export not permitted under license terms',
          severity: 'critical',
        });
        complianceStatus = 'block';
      }

      if (restrictions.research_only === true && operation !== 'query') {
        violations.push({
          data_source: row.name,
          license: row.license_name,
          violation: 'Commercial use not permitted - research only license',
          severity: 'critical',
        });
        complianceStatus = 'block';
      }

      if (row.compliance_level === 'block') {
        violations.push({
          data_source: row.name,
          license: row.license_name,
          violation: 'License marked as blocked for compliance',
          severity: 'critical',
        });
        complianceStatus = 'block';
      } else if (row.compliance_level === 'warn' && complianceStatus !== 'block') {
        warnings.push({
          data_source: row.name,
          license: row.license_name,
          warning: 'License requires additional review',
          severity: 'medium',
        });
        complianceStatus = 'warn';
      }
    }

    const reason = complianceStatus === 'block'
      ? `Operation blocked due to license violations: ${violations.map(v => v.violation).join('; ')}. Please contact the data governance team for guidance.`
      : complianceStatus === 'warn'
      ? `Operation permitted with warnings: ${warnings.map(w => w.warning).join('; ')}. Consider reviewing data usage policies.`
      : 'Operation complies with all license requirements and data protection regulations.';

    return {
      compliance_status: complianceStatus,
      reason,
      violations,
      warnings,
      appeal_path: complianceStatus === 'block' ? '/ombudsman/appeals' : null,
    };
  } catch (err) {
    logger.error({ err }, 'License compliance check failed');
    return {
      compliance_status: 'warn',
      reason: 'License check encountered an error. Please verify compliance manually.',
      violations: [],
      warnings: [{ source: sourceName, warning: 'Compliance check error', severity: 'high' }],
      appeal_path: null,
    };
  }
}

function hashSample(rows: Record<string, any>[]): string {
  const sample = JSON.stringify(rows.slice(0, 10));
  return crypto.createHash('sha256').update(sample).digest('hex');
}

// Default export for the router factory
export default createETLAssistantRouter;
