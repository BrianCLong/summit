/**
 * License Registry Service
 * Enforces license compliance, TOS validation, and DPIA requirements
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { z } from 'zod';

const anyRecord = () => z.record(z.string(), z.any());
import { Pool } from 'pg';

const PORT = parseInt(process.env.PORT || '4030');
const NODE_ENV = process.env.NODE_ENV || 'development';

// Database connection
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/licenses',
});

// Schemas
const LicenseSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum([
    'commercial',
    'open_source',
    'proprietary',
    'restricted',
    'public_domain',
  ]),
  version: z.string().optional(),
  terms: anyRecord(),
  restrictions: z.object({
    commercial_use: z.boolean(),
    export_allowed: z.boolean(),
    research_only: z.boolean(),
    attribution_required: z.boolean(),
    share_alike: z.boolean(),
  }),
  compliance_level: z.enum(['allow', 'warn', 'block']),
  expiry_date: z.string().datetime().optional(),
  created_at: z.string().datetime(),
});

const DataSourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  source_type: z.string(),
  license_id: z.string(),
  tos_accepted: z.boolean(),
  dpia_completed: z.boolean(),
  pii_classification: z.enum(['none', 'low', 'medium', 'high', 'critical']),
  retention_period: z.number(), // days
  geographic_restrictions: z.array(z.string()),
  created_at: z.string().datetime(),
});

const ComplianceCheckSchema = z.object({
  operation: z.enum(['query', 'export', 'ingest', 'transform']),
  data_source_ids: z.array(z.string()),
  purpose: z.string(),
  jurisdiction: z.string().optional(),
});

const DPIAAssessmentSchema = z.object({
  data_source_id: z.string(),
  risk_level: z.enum(['low', 'medium', 'high', 'critical']),
  processing_purpose: z.string(),
  data_categories: z.array(z.string()),
  retention_justification: z.string(),
  security_measures: z.array(z.string()),
  third_party_sharing: z.boolean(),
  automated_decision_making: z.boolean(),
  completed_by: z.string(),
  completed_at: z.string().datetime(),
});

type License = z.infer<typeof LicenseSchema>;
type DataSource = z.infer<typeof DataSourceSchema>;
type ComplianceCheck = z.infer<typeof ComplianceCheckSchema>;
type DPIAAssessment = z.infer<typeof DPIAAssessmentSchema>;

// Pre-configured license templates
const LICENSE_TEMPLATES: Record<string, Partial<License>> = {
  'cc-by-4.0': {
    name: 'Creative Commons Attribution 4.0',
    type: 'open_source',
    restrictions: {
      commercial_use: true,
      export_allowed: true,
      research_only: false,
      attribution_required: true,
      share_alike: false,
    },
    compliance_level: 'allow',
  },
  'commercial-restricted': {
    name: 'Commercial License - Export Restricted',
    type: 'commercial',
    restrictions: {
      commercial_use: true,
      export_allowed: false,
      research_only: false,
      attribution_required: true,
      share_alike: false,
    },
    compliance_level: 'block',
  },
  'research-only': {
    name: 'Academic Research Only',
    type: 'restricted',
    restrictions: {
      commercial_use: false,
      export_allowed: false,
      research_only: true,
      attribution_required: true,
      share_alike: false,
    },
    compliance_level: 'warn',
  },
};

// Policy enforcement
async function policyMiddleware(request: any, reply: any) {
  const authorityId = request.headers['x-authority-id'];
  const reasonForAccess = request.headers['x-reason-for-access'];

  if (!authorityId || !reasonForAccess) {
    const dryRun = process.env.POLICY_DRY_RUN === 'true';

    if (dryRun) {
      request.log.warn('Policy violation in dry-run mode');
      return;
    }

    return reply.status(403).send({
      error: 'Policy denial',
      reason: 'Missing authority binding or reason-for-access',
      appealPath: '/ombudsman/appeals',
    });
  }

  request.authorityId = authorityId;
  request.reasonForAccess = reasonForAccess;
}

// Create Fastify instance
const server: FastifyInstance = Fastify({
  logger: {
    level: NODE_ENV === 'development' ? 'debug' : 'info',
    ...(NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty' } }
      : {}),
  },
});

// Register plugins
server.register(helmet);
server.register(cors);

// Add policy middleware
server.addHook('preHandler', policyMiddleware);

// Health check
server.get('/health', async () => {
  try {
    await pool.query('SELECT 1');
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      dependencies: {
        database: 'healthy',
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: 'unhealthy',
      },
    };
  }
});

// License management endpoints
server.post<{
  Body: { name: string; type: string; restrictions: any; template?: string };
}>('/licenses', async (request, reply) => {
  try {
    const { name, type, restrictions, template } = request.body;

    let licenseData: any = {
      id: `license_${Date.now()}`,
      name,
      type,
      restrictions,
      terms: {},
      compliance_level: 'warn',
      created_at: new Date().toISOString(),
    };

    // Apply template if specified
    if (template && LICENSE_TEMPLATES[template]) {
      licenseData = { ...licenseData, ...LICENSE_TEMPLATES[template] };
    }

    const result = await pool.query(
      `INSERT INTO licenses (id, name, type, version, terms, restrictions, compliance_level, expiry_date, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        licenseData.id,
        licenseData.name,
        licenseData.type,
        licenseData.version,
        JSON.stringify(licenseData.terms),
        JSON.stringify(licenseData.restrictions),
        licenseData.compliance_level,
        licenseData.expiry_date,
        licenseData.created_at,
      ],
    );

    server.log.info({
      licenseId: licenseData.id,
      authority: (request as any).authorityId,
    }, 'Created license');

    return LicenseSchema.parse({
      ...result.rows[0],
      terms: result.rows[0].terms,
      restrictions: result.rows[0].restrictions,
    });
  } catch (error) {
    server.log.error(error, 'Failed to create license');
    reply.status(500);
    return { error: 'Failed to create license' };
  }
});

server.get<{ Params: { id: string } }>(
  '/licenses/:id',
  async (request, reply) => {
    try {
      const result = await pool.query('SELECT * FROM licenses WHERE id = $1', [
        request.params.id,
      ]);

      if (result.rows.length === 0) {
        reply.status(404);
        return { error: 'License not found' };
      }

      return LicenseSchema.parse({
        ...result.rows[0],
        terms: result.rows[0].terms,
        restrictions: result.rows[0].restrictions,
      });
    } catch (error) {
      reply.status(500);
      return { error: 'Failed to retrieve license' };
    }
  },
);

// Data source registration
server.post<{ Body: any }>('/data-sources', async (request, reply) => {
  try {
    const data = DataSourceSchema.parse({
      id: `ds_${Date.now()}`,
      ...(request.body as object),
      created_at: new Date().toISOString(),
    });

    const result = await pool.query(
      `INSERT INTO data_sources
       (id, name, source_type, license_id, tos_accepted, dpia_completed,
        pii_classification, retention_period, geographic_restrictions, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        data.id,
        data.name,
        data.source_type,
        data.license_id,
        data.tos_accepted,
        data.dpia_completed,
        data.pii_classification,
        data.retention_period,
        JSON.stringify(data.geographic_restrictions),
        data.created_at,
      ],
    );

    server.log.info({
      dataSourceId: data.id,
      licenseId: data.license_id,
      authority: (request as any).authorityId,
    }, 'Registered data source');

    return DataSourceSchema.parse({
      ...result.rows[0],
      geographic_restrictions: result.rows[0].geographic_restrictions,
    });
  } catch (error) {
    server.log.error(error, 'Failed to register data source');
    reply.status(500);
    return { error: 'Failed to register data source' };
  }
});

// Compliance checking endpoint
server.post<{ Body: ComplianceCheck }>(
  '/compliance/check',
  {
    schema: {
      body: ComplianceCheckSchema,
    },
  },
  async (request, reply) => {
    try {
      const { operation, data_source_ids, purpose, jurisdiction } =
        request.body;

      // Get data sources with their licenses
      const result = await pool.query(
        `
      SELECT ds.*, l.compliance_level, l.restrictions, l.name as license_name
      FROM data_sources ds
      JOIN licenses l ON ds.license_id = l.id
      WHERE ds.id = ANY($1)
    `,
        [data_source_ids],
      );

      const violations: any[] = [];
      const warnings: any[] = [];
      let overallCompliance = 'allow';

      for (const row of result.rows) {
        const restrictions = row.restrictions;
        const complianceLevel = row.compliance_level;

        // Check operation-specific restrictions
        if (operation === 'export' && !restrictions.export_allowed) {
          violations.push({
            data_source: row.name,
            license: row.license_name,
            violation: 'Export not permitted under license terms',
            severity: 'critical',
          });
          overallCompliance = 'block';
        }

        if (
          operation === 'query' &&
          restrictions.research_only &&
          purpose !== 'research'
        ) {
          violations.push({
            data_source: row.name,
            license: row.license_name,
            violation: 'Commercial use not permitted - research only license',
            severity: 'critical',
          });
          overallCompliance = 'block';
        }

        // Check DPIA completion for high-risk data
        if (
          ['high', 'critical'].includes(row.pii_classification) &&
          !row.dpia_completed
        ) {
          warnings.push({
            data_source: row.name,
            warning: 'DPIA assessment required for high-risk PII processing',
            severity: 'high',
          });
          if (overallCompliance !== 'block') overallCompliance = 'warn';
        }

        // Check geographic restrictions
        if (
          jurisdiction &&
          row.geographic_restrictions.includes(jurisdiction)
        ) {
          violations.push({
            data_source: row.name,
            violation: `Data processing restricted in jurisdiction: ${jurisdiction}`,
            severity: 'critical',
          });
          overallCompliance = 'block';
        }

        // Apply license compliance level
        if (complianceLevel === 'block') {
          violations.push({
            data_source: row.name,
            license: row.license_name,
            violation: 'License marked as blocked for compliance',
            severity: 'critical',
          });
          overallCompliance = 'block';
        } else if (
          complianceLevel === 'warn' &&
          overallCompliance !== 'block'
        ) {
          warnings.push({
            data_source: row.name,
            license: row.license_name,
            warning: 'License requires additional review',
            severity: 'medium',
          });
          overallCompliance = 'warn';
        }
      }

      const response = {
        operation,
        compliance_status: overallCompliance,
        violations,
        warnings,
        human_readable_reason: generateHumanReadableReason(
          overallCompliance,
          violations,
          warnings,
        ),
        appeal_path:
          overallCompliance === 'block' ? '/ombudsman/appeals' : null,
        checked_at: new Date().toISOString(),
        authority_id: (request as any).authorityId,
        reason_for_access: (request as any).reasonForAccess,
      };

      server.log.info({
        operation,
        compliance: overallCompliance,
        violationCount: violations.length,
        warningCount: warnings.length,
        authority: (request as any).authorityId,
      }, 'Compliance check performed');

      return response;
    } catch (error) {
      server.log.error(error, 'Compliance check failed');
      reply.status(500);
      return { error: 'Compliance check failed' };
    }
  },
);

// DPIA assessment endpoint
server.post<{ Body: any }>('/dpia/assessment', async (request, reply) => {
  try {
    const assessment = DPIAAssessmentSchema.parse({
      ...(request.body as object),
      completed_by: (request as any).authorityId,
      completed_at: new Date().toISOString(),
    });

    const result = await pool.query(
      `INSERT INTO dpia_assessments
       (data_source_id, risk_level, processing_purpose, data_categories,
        retention_justification, security_measures, third_party_sharing,
        automated_decision_making, completed_by, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        assessment.data_source_id,
        assessment.risk_level,
        assessment.processing_purpose,
        JSON.stringify(assessment.data_categories),
        assessment.retention_justification,
        JSON.stringify(assessment.security_measures),
        assessment.third_party_sharing,
        assessment.automated_decision_making,
        assessment.completed_by,
        assessment.completed_at,
      ],
    );

    // Update data source DPIA completion status
    await pool.query(
      'UPDATE data_sources SET dpia_completed = true WHERE id = $1',
      [assessment.data_source_id],
    );

    server.log.info({
      dataSourceId: assessment.data_source_id,
      riskLevel: assessment.risk_level,
      authority: (request as any).authorityId,
    }, 'DPIA assessment completed');

    return DPIAAssessmentSchema.parse({
      ...result.rows[0],
      data_categories: result.rows[0].data_categories,
      security_measures: result.rows[0].security_measures,
    });
  } catch (error) {
    server.log.error(error, 'Failed to complete DPIA assessment');
    reply.status(500);
    return { error: 'Failed to complete DPIA assessment' };
  }
});

// License templates endpoint
server.get('/licenses/templates', async () => {
  return {
    templates: Object.entries(LICENSE_TEMPLATES).map(([key, template]) => ({
      id: key,
      ...template,
    })),
  };
});

function generateHumanReadableReason(
  compliance: string,
  violations: any[],
  warnings: any[],
): string {
  if (compliance === 'block') {
    const reasons = violations.map((v) => v.violation).join('; ');
    return `Operation blocked due to license violations: ${reasons}. Please contact the data governance team for guidance.`;
  }

  if (compliance === 'warn') {
    const reasons = warnings.map((w) => w.warning).join('; ');
    return `Operation permitted with warnings: ${reasons}. Consider reviewing data usage policies.`;
  }

  return 'Operation complies with all license requirements and data protection regulations.';
}

// Start server
const start = async () => {
  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
    server.log.info(`⚖️  License Registry ready at http://localhost:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
