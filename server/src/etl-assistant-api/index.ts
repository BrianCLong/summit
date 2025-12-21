/**
 * ETL Assistant API
 * Provides REST endpoints for schema preview, PII scanning, and license checking
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { spawn } from 'child_process';
import path from 'path';
import logger from '../config/logger.js';
import { Pool } from 'pg';

const apiLogger = logger.child({ name: 'ETLAssistantAPI' });

// Request schemas
const PreviewSchemaRequest = z.object({
  sample_rows: z.array(z.record(z.string(), z.any())),
  source_name: z.string().optional(),
  tenant_id: z.string(),
});

const PIIScanRequest = z.object({
  sample_rows: z.array(z.record(z.string(), z.any())),
  tenant_id: z.string(),
});

const LicenseCheckRequest = z.object({
  source_name: z.string(),
  source_type: z.string(),
  data_source_ids: z.array(z.string()).optional(),
  operation: z.enum(['ingest', 'query', 'export', 'transform']).default('ingest'),
  purpose: z.string().default('intelligence'),
  tenant_id: z.string(),
});

const SaveConfigurationRequest = z.object({
  tenant_id: z.string(),
  source_name: z.string(),
  source_type: z.string(),
  sample_rows: z.array(z.record(z.string(), z.any())),
  field_mappings: z.array(
    z.object({
      source_field: z.string(),
      canonical_entity: z.string(),
      canonical_property: z.string(),
      transformation: z.string().optional(),
      confidence: z.number(),
    }),
  ),
  pii_handling: z.array(
    z.object({
      field_name: z.string(),
      pii_category: z.string(),
      redaction_strategy: z.string(),
      reason: z.string(),
    }),
  ),
  license_decision: z
    .object({
      source_name: z.string(),
      license_id: z.string().nullable(),
      compliance_status: z.string(),
      reason: z.string(),
    })
    .optional(),
  created_by: z.string(),
});

type PreviewSchemaRequestType = z.infer<typeof PreviewSchemaRequest>;
type PIIScanRequestType = z.infer<typeof PIIScanRequest>;
type LicenseCheckRequestType = z.infer<typeof LicenseCheckRequest>;
type SaveConfigurationRequestType = z.infer<typeof SaveConfigurationRequest>;

// Path to Python ETL assistant
const PYTHON_PATH = process.env.PYTHON_PATH || 'python3';
const ETL_ASSISTANT_PATH = path.join(
  process.cwd(),
  'data-pipelines',
  'etl-assistant',
  'src',
);

/**
 * Execute Python ETL assistant module
 */
async function executePythonModule(
  moduleName: string,
  input: any,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonScript = spawn(PYTHON_PATH, [
      '-m',
      moduleName,
      '--json',
    ], {
      cwd: ETL_ASSISTANT_PATH,
      env: {
        ...process.env,
        PYTHONPATH: path.dirname(ETL_ASSISTANT_PATH),
      },
    });

    let stdout = '';
    let stderr = '';

    pythonScript.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonScript.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonScript.stdin.write(JSON.stringify(input));
    pythonScript.stdin.end();

    pythonScript.on('close', (code) => {
      if (code !== 0) {
        apiLogger.error({ stderr, code }, 'Python module execution failed');
        reject(new Error(`Python execution failed: ${stderr}`));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (err) {
        apiLogger.error({ stdout, err }, 'Failed to parse Python output');
        reject(new Error('Failed to parse Python output'));
      }
    });
  });
}

/**
 * Create ETL Assistant API router
 */
export function createETLAssistantAPI(pg: Pool): Router {
  const router = Router();

  /**
   * POST /etl/preview-schema
   * Infer schema and suggest canonical mappings
   */
  router.post(
    '/etl/preview-schema',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const input = PreviewSchemaRequest.parse(req.body);

        apiLogger.info({
          tenantId: input.tenant_id,
          rowCount: input.sample_rows.length,
        }, 'Schema preview requested');

        // Simple in-process schema inference (TypeScript implementation)
        const result = await inferSchemaInProcess(input.sample_rows);

        apiLogger.info({
          tenantId: input.tenant_id,
          fieldCount: result.fields.length,
          mappingCount: result.suggested_mappings.length,
        }, 'Schema preview completed');

        res.json(result);
      } catch (err) {
        apiLogger.error({ err }, 'Schema preview failed');
        res.status(400).json({
          error: 'Schema preview failed',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
  );

  /**
   * POST /etl/pii-scan
   * Scan for PII and recommend redactions
   */
  router.post(
    '/etl/pii-scan',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const input = PIIScanRequest.parse(req.body);

        apiLogger.info({
          tenantId: input.tenant_id,
          rowCount: input.sample_rows.length,
        }, 'PII scan requested');

        // Simple in-process PII detection
        const result = await detectPIIInProcess(input.sample_rows);

        apiLogger.info({
          tenantId: input.tenant_id,
          piiFieldCount: result.pii_matches.length,
          overallRisk: result.overall_risk,
        }, 'PII scan completed');

        res.json(result);
      } catch (err) {
        apiLogger.error({ err }, 'PII scan failed');
        res.status(400).json({
          error: 'PII scan failed',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
  );

  /**
   * POST /etl/license-check
   * Verify license compliance
   */
  router.post(
    '/etl/license-check',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const input = LicenseCheckRequest.parse(req.body);

        apiLogger.info({
          tenantId: input.tenant_id,
          sourceName: input.source_name,
          operation: input.operation,
        }, 'License check requested');

        // Check against license registry
        const result = await checkLicenseCompliance(input, pg);

        apiLogger.info({
          tenantId: input.tenant_id,
          sourceName: input.source_name,
          complianceStatus: result.compliance_status,
        }, 'License check completed');

        res.json(result);
      } catch (err) {
        apiLogger.error({ err }, 'License check failed');
        res.status(400).json({
          error: 'License check failed',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
  );

  /**
   * POST /etl/configurations
   * Save ETL configuration with lineage
   */
  router.post(
    '/etl/configurations',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const input = SaveConfigurationRequest.parse(req.body);

        apiLogger.info({
          tenantId: input.tenant_id,
          sourceName: input.source_name,
        }, 'Saving ETL configuration');

        // Save to database
        const configId = await saveConfiguration(input, pg);

        apiLogger.info({
          tenantId: input.tenant_id,
          configId,
        }, 'ETL configuration saved');

        res.status(201).json({
          config_id: configId,
          message: 'Configuration saved successfully',
        });
      } catch (err) {
        apiLogger.error({ err }, 'Failed to save configuration');
        res.status(500).json({
          error: 'Failed to save configuration',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
  );

  /**
   * GET /etl/configurations/:id
   * Retrieve ETL configuration
   */
  router.get(
    '/etl/configurations/:id',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { id } = req.params;
        const tenantId = req.query.tenant_id as string;

        if (!tenantId) {
          res.status(400).json({ error: 'tenant_id query parameter required' });
          return;
        }

        const config = await loadConfiguration(id, tenantId, pg);

        if (!config) {
          res.status(404).json({ error: 'Configuration not found' });
          return;
        }

        res.json(config);
      } catch (err) {
        apiLogger.error({ err }, 'Failed to load configuration');
        res.status(500).json({
          error: 'Failed to load configuration',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
  );

  return router;
}

// Helper functions

/**
 * In-process schema inference (TypeScript implementation)
 */
async function inferSchemaInProcess(
  rows: Record<string, any>[],
): Promise<any> {
  if (rows.length === 0) {
    return {
      fields: [],
      suggested_mappings: [],
      primary_entity: null,
      record_count: 0,
    };
  }

  const fields = Object.keys(rows[0]).map((fieldName) => {
    const values = rows.map((r) => r[fieldName]).filter((v) => v != null);
    const inferredType = inferFieldType(values);

    return {
      name: fieldName,
      inferred_type: inferredType,
      nullable: values.length < rows.length,
      sample_values: values.slice(0, 5),
      confidence: 0.8,
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

  // Check for email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (values.every((v) => typeof v === 'string' && emailRegex.test(v))) {
    return 'email';
  }

  // Check for phone
  const phoneRegex = /^\+?[\d\s\-()]+$/;
  if (
    values.every((v) => typeof v === 'string' && phoneRegex.test(v) && v.length >= 10)
  ) {
    return 'phone';
  }

  // Check for date
  const dateRegex = /^\d{4}-\d{2}-\d{2}/;
  if (values.every((v) => typeof v === 'string' && dateRegex.test(v))) {
    return 'date';
  }

  // Basic type inference
  if (values.every((v) => typeof v === 'number' && Number.isInteger(v))) {
    return 'integer';
  }
  if (values.every((v) => typeof v === 'number')) {
    return 'float';
  }
  if (values.every((v) => typeof v === 'boolean')) {
    return 'boolean';
  }

  return 'string';
}

function generateMappings(fields: any[]): any[] {
  const mappings: any[] = [];

  const canonicalMappings: Record<string, [string, string]> = {
    first_name: ['Person', 'firstName'],
    last_name: ['Person', 'lastName'],
    full_name: ['Person', 'name'],
    name: ['Person', 'name'],
    email: ['Person', 'email'],
    phone: ['Person', 'phone'],
    company: ['Org', 'name'],
    company_name: ['Org', 'name'],
    organization: ['Org', 'name'],
    city: ['Location', 'city'],
    state: ['Location', 'state'],
    country: ['Location', 'country'],
  };

  for (const field of fields) {
    const normalized = field.name.toLowerCase().replace(/\s/g, '_');
    if (normalized in canonicalMappings) {
      const [entity, property] = canonicalMappings[normalized];
      mappings.push({
        source_field: field.name,
        canonical_entity: entity,
        canonical_property: property,
        confidence: 0.95,
        reasoning: `Direct field name match: '${field.name}'`,
      });
    } else if (field.inferred_type === 'email') {
      mappings.push({
        source_field: field.name,
        canonical_entity: 'Person',
        canonical_property: 'email',
        confidence: 0.85,
        reasoning: 'Field contains email addresses',
      });
    } else if (field.inferred_type === 'phone') {
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

function determinePrimaryEntity(mappings: any[]): string | null {
  if (mappings.length === 0) return null;

  const entityCounts: Record<string, number> = {};
  for (const mapping of mappings) {
    entityCounts[mapping.canonical_entity] =
      (entityCounts[mapping.canonical_entity] || 0) + mapping.confidence;
  }

  const sorted = Object.entries(entityCounts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || null;
}

/**
 * In-process PII detection
 */
async function detectPIIInProcess(rows: Record<string, any>[]): Promise<any> {
  if (rows.length === 0) {
    return {
      pii_matches: [],
      overall_risk: 'none',
      summary: 'No data to scan',
      requires_dpia: false,
    };
  }

  const piiMatches: any[] = [];
  const fieldNames = Object.keys(rows[0]);

  for (const fieldName of fieldNames) {
    const values = rows.map((r) => r[fieldName]).filter((v) => v != null);
    const piiMatch = detectPIIField(fieldName, values);
    if (piiMatch) {
      piiMatches.push(piiMatch);
    }
  }

  const overallRisk = calculateOverallRisk(piiMatches);
  const requiresDPIA = piiMatches.some((m) =>
    ['critical', 'high'].includes(m.severity),
  );

  return {
    pii_matches: piiMatches,
    overall_risk: overallRisk,
    summary: piiMatches.length > 0
      ? `Detected ${piiMatches.length} PII field(s) with ${overallRisk} risk`
      : 'No PII detected',
    requires_dpia: requiresDPIA,
  };
}

function detectPIIField(fieldName: string, values: any[]): any | null {
  const normalized = fieldName.toLowerCase().replace(/\s/g, '_');

  // Field name patterns
  if (normalized.includes('ssn') || normalized.includes('social_security')) {
    return {
      category: 'ssn',
      severity: 'critical',
      field_name: fieldName,
      sample_value: '***-**-****',
      match_count: values.length,
      confidence: 0.9,
      recommended_strategy: 'hash',
      reasoning: `Field name '${fieldName}' indicates SSN`,
    };
  }

  if (normalized.includes('email')) {
    return {
      category: 'email',
      severity: 'medium',
      field_name: fieldName,
      sample_value: 'us***@example.com',
      match_count: values.length,
      confidence: 0.9,
      recommended_strategy: 'tokenize',
      reasoning: `Field name '${fieldName}' indicates email`,
    };
  }

  if (normalized.includes('phone') || normalized.includes('mobile')) {
    return {
      category: 'phone',
      severity: 'medium',
      field_name: fieldName,
      sample_value: '***-***-1234',
      match_count: values.length,
      confidence: 0.9,
      recommended_strategy: 'mask',
      reasoning: `Field name '${fieldName}' indicates phone`,
    };
  }

  // Pattern detection
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailMatches = values.filter(
    (v) => typeof v === 'string' && emailRegex.test(v),
  ).length;

  if (emailMatches > values.length * 0.7) {
    return {
      category: 'email',
      severity: 'medium',
      field_name: fieldName,
      sample_value: 'us***@example.com',
      match_count: emailMatches,
      confidence: emailMatches / values.length,
      recommended_strategy: 'tokenize',
      reasoning: 'Pattern match for email addresses',
    };
  }

  return null;
}

function calculateOverallRisk(piiMatches: any[]): string {
  if (piiMatches.length === 0) return 'none';

  const hasCritical = piiMatches.some((m) => m.severity === 'critical');
  if (hasCritical) return 'critical';

  const hasHigh = piiMatches.some((m) => m.severity === 'high');
  if (hasHigh) return 'high';

  const hasMedium = piiMatches.some((m) => m.severity === 'medium');
  if (hasMedium) return 'medium';

  return 'low';
}

/**
 * Check license compliance
 */
async function checkLicenseCompliance(
  input: LicenseCheckRequestType,
  pg: Pool,
): Promise<any> {
  // Try to find registered data sources
  let dataSourceIds = input.data_source_ids || [];

  if (dataSourceIds.length === 0) {
    // Look up by source name
    const result = await pg.query(
      'SELECT id FROM data_sources WHERE name = $1',
      [input.source_name],
    );

    if (result.rows.length > 0) {
      dataSourceIds = result.rows.map((r) => r.id);
    }
  }

  if (dataSourceIds.length === 0) {
    // No registered source - return warning
    return {
      compliance_status: 'warn',
      reason:
        'Data source not registered in license registry. Please register before ingesting.',
      violations: [],
      warnings: [
        {
          source: input.source_name,
          warning: 'Source not found in license registry',
          severity: 'medium',
        },
      ],
      appeal_path: null,
    };
  }

  // Query license compliance
  const result = await pg.query(
    `
    SELECT ds.*, l.compliance_level, l.restrictions, l.name as license_name
    FROM data_sources ds
    JOIN licenses l ON ds.license_id = l.id
    WHERE ds.id = ANY($1)
  `,
    [dataSourceIds],
  );

  if (result.rows.length === 0) {
    return {
      compliance_status: 'warn',
      reason: 'Data source license information not found',
      violations: [],
      warnings: [],
      appeal_path: null,
    };
  }

  const violations: any[] = [];
  const warnings: any[] = [];
  let complianceStatus = 'allow';

  for (const row of result.rows) {
    const restrictions = row.restrictions;

    if (
      input.operation === 'export' &&
      restrictions.export_allowed === false
    ) {
      violations.push({
        data_source: row.name,
        license: row.license_name,
        violation: 'Export not permitted under license terms',
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
    }
  }

  const reason =
    complianceStatus === 'block'
      ? `Operation blocked: ${violations.map((v) => v.violation).join('; ')}`
      : 'Operation complies with license requirements';

  return {
    compliance_status: complianceStatus,
    reason,
    violations,
    warnings,
    appeal_path: complianceStatus === 'block' ? '/ombudsman/appeals' : null,
  };
}

/**
 * Save configuration to database
 */
async function saveConfiguration(
  input: SaveConfigurationRequestType,
  pg: Pool,
): Promise<string> {
  const client = await pg.connect();

  try {
    await client.query('BEGIN');

    const configId = `etl_config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Insert configuration
    await client.query(
      `INSERT INTO etl_configurations
       (id, tenant_id, source_name, source_type, created_by, created_at,
        field_mappings, pii_handling, license_decision, metadata)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9)`,
      [
        configId,
        input.tenant_id,
        input.source_name,
        input.source_type,
        input.created_by,
        JSON.stringify(input.field_mappings),
        JSON.stringify(input.pii_handling),
        JSON.stringify(input.license_decision || {}),
        JSON.stringify({ sample_hash: hashSample(input.sample_rows) }),
      ],
    );

    await client.query('COMMIT');

    return configId;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Load configuration from database
 */
async function loadConfiguration(
  configId: string,
  tenantId: string,
  pg: Pool,
): Promise<any | null> {
  const result = await pg.query(
    `SELECT * FROM etl_configurations
     WHERE id = $1 AND tenant_id = $2`,
    [configId, tenantId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

function hashSample(rows: Record<string, any>[]): string {
  const crypto = require('crypto');
  const sample = JSON.stringify(rows.slice(0, 10));
  return crypto.createHash('sha256').update(sample).digest('hex');
}
