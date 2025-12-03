/**
 * License Registry Service
 * Enforces license compliance, TOS validation, and DPIA requirements
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { z } from 'zod';
import { Pool } from 'pg';

const anyRecord = () => z.record(z.string(), z.any());

const PORT = parseInt(process.env.PORT || '4030');
const NODE_ENV = process.env.NODE_ENV || 'development';

type EnforcementConfig = {
  enforceTos: boolean;
  enforceExportControls: boolean;
  enforceDpia: boolean;
  usageTrackingEnabled: boolean;
  complianceReportDays: number;
};

const enforcementConfig: EnforcementConfig = {
  enforceTos: process.env.ENFORCE_TOS !== 'false',
  enforceExportControls: process.env.ENFORCE_EXPORT_CONTROLS !== 'false',
  enforceDpia: process.env.ENFORCE_DPIA !== 'false',
  usageTrackingEnabled: process.env.ENABLE_USAGE_TRACKING !== 'false',
  complianceReportDays: parseInt(process.env.COMPLIANCE_REPORT_DAYS || '30', 10),
};

const POLICY_EXEMPT_PATHS = new Set(['/health']);

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
    export_classification: z.string().optional(),
    prohibited_markets: z.array(z.string()).default([]),
    tos_required: z.boolean().optional(),
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
  tos_version: z.string().optional(),
  dpia_completed: z.boolean(),
  pii_classification: z.enum(['none', 'low', 'medium', 'high', 'critical']),
  retention_period: z.number(), // days
  geographic_restrictions: z.array(z.string()),
  export_classification: z
    .enum(['unknown', 'ear99', 'controlled', 'restricted'])
    .default('unknown'),
  country_of_origin: z.string().optional(),
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

type UsageEvent = {
  id: string;
  event_type: 'compliance_check' | 'license_created' | 'data_source_registered';
  result: 'allow' | 'warn' | 'block';
  operation?: ComplianceCheck['operation'];
  data_source_ids?: string[];
  triggered_controls?: string[];
  violations?: any[];
  warnings?: any[];
  reason_for_access?: string;
  authority_id?: string;
  created_at: string;
};

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

async function ensureUsageEventsTable() {
  if (!enforcementConfig.usageTrackingEnabled) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS usage_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      result TEXT NOT NULL,
      operation TEXT,
      data_source_ids TEXT[],
      triggered_controls JSONB,
      violations JSONB,
      warnings JSONB,
      reason_for_access TEXT,
      authority_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function recordUsageEvent(event: UsageEvent) {
  if (!enforcementConfig.usageTrackingEnabled) {
    return;
  }

  const safeEvent = {
    ...event,
    triggered_controls: event.triggered_controls || [],
    violations: event.violations || [],
    warnings: event.warnings || [],
  };

  try {
    await pool.query(
      `INSERT INTO usage_events
        (id, event_type, result, operation, data_source_ids, triggered_controls,
         violations, warnings, reason_for_access, authority_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        safeEvent.id,
        safeEvent.event_type,
        safeEvent.result,
        safeEvent.operation,
        safeEvent.data_source_ids || [],
        JSON.stringify(safeEvent.triggered_controls),
        JSON.stringify(safeEvent.violations),
        JSON.stringify(safeEvent.warnings),
        safeEvent.reason_for_access,
        safeEvent.authority_id,
        safeEvent.created_at,
      ],
    );
  } catch (error) {
    console.error('Failed to persist usage event', error);
  }
}

async function ensureComplianceColumns() {
  await pool.query(
    'ALTER TABLE data_sources ADD COLUMN IF NOT EXISTS tos_version TEXT',
  );
  await pool.query(
    "ALTER TABLE data_sources ADD COLUMN IF NOT EXISTS export_classification TEXT DEFAULT 'unknown'",
  );
  await pool.query(
    'ALTER TABLE data_sources ADD COLUMN IF NOT EXISTS country_of_origin TEXT',
  );
}

function normalizeJsonField<T>(value: any, fallback: T): T {
  if (!value) {
    return fallback;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  return value as T;
}

// Policy enforcement
async function policyMiddleware(request: any, reply: any) {
  const routeUrl =
    (request.routerPath as string | undefined) ||
    request.routeOptions?.url ||
    request.raw?.url;

  if (routeUrl && POLICY_EXEMPT_PATHS.has(routeUrl.split('?')[0])) {
    return;
  }

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

    const normalizedRestrictions = {
      prohibited_markets: [],
      ...(restrictions || {}),
    };

    let licenseData: any = {
      id: `license_${Date.now()}`,
      name,
      type,
      restrictions: normalizedRestrictions,
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

    await recordUsageEvent({
      id: `usage_${licenseData.id}`,
      event_type: 'license_created',
      result: 'allow',
      triggered_controls: ['license_registry'],
      created_at: licenseData.created_at,
      authority_id: (request as any).authorityId,
    });

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
       (id, name, source_type, license_id, tos_accepted, tos_version, dpia_completed,
        pii_classification, retention_period, geographic_restrictions, export_classification,
        country_of_origin, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        data.id,
        data.name,
        data.source_type,
        data.license_id,
        data.tos_accepted,
        data.tos_version,
        data.dpia_completed,
        data.pii_classification,
        data.retention_period,
        JSON.stringify(data.geographic_restrictions),
        data.export_classification,
        data.country_of_origin,
        data.created_at,
      ],
    );

    server.log.info({
      dataSourceId: data.id,
      licenseId: data.license_id,
      authority: (request as any).authorityId,
    }, 'Registered data source');

    await recordUsageEvent({
      id: `usage_${data.id}`,
      event_type: 'data_source_registered',
      result: data.tos_accepted ? 'allow' : 'warn',
      data_source_ids: [data.id],
      triggered_controls: data.tos_accepted ? [] : ['tos_contract'],
      warnings: data.tos_accepted
        ? []
        : [
            {
              warning: 'Data source registered without TOS confirmation',
              severity: 'medium',
            },
          ],
      authority_id: (request as any).authorityId,
      created_at: data.created_at,
    });

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
      const triggeredControls = new Set<string>();

      const registerViolation = (
        violation: any,
        control: string,
        severity: 'low' | 'medium' | 'high' | 'critical' = 'critical',
      ) => {
        violations.push({ ...violation, severity });
        triggeredControls.add(control);
        overallCompliance = 'block';
      };

      const registerWarning = (
        warning: any,
        control: string,
        severity: 'low' | 'medium' | 'high' = 'medium',
      ) => {
        warnings.push({ ...warning, severity });
        triggeredControls.add(control);
        if (overallCompliance !== 'block') {
          overallCompliance = 'warn';
        }
      };

      for (const row of result.rows) {
        const restrictions = {
          export_allowed: true,
          research_only: false,
          prohibited_markets: [],
          ...normalizeJsonField<Record<string, any>>(row.restrictions, {}),
        };
        const complianceLevel = row.compliance_level;
        const geographicRestrictions = normalizeJsonField<string[]>(
          row.geographic_restrictions,
          [],
        );

        const tosRequired = Boolean(restrictions.tos_required);
        const missingTos = !row.tos_accepted;

        if (missingTos) {
          const message = tosRequired
            ? 'Terms of service acceptance required by license terms'
            : 'Terms of service not yet accepted for this data source';

          if (enforcementConfig.enforceTos) {
            registerViolation(
              {
                data_source: row.name,
                license: row.license_name,
                violation: message,
              },
              'tos_contract',
              'high',
            );
          } else {
            registerWarning(
              {
                data_source: row.name,
                license: row.license_name,
                warning: `${message} (enforcement disabled)`,
              },
              'tos_contract',
            );
          }
        }

        // Check operation-specific restrictions
        if (operation === 'export' && !restrictions.export_allowed) {
          const exportViolation = {
            data_source: row.name,
            license: row.license_name,
            violation: 'Export not permitted under license terms',
          };

          if (enforcementConfig.enforceExportControls) {
            registerViolation(exportViolation, 'export_control', 'critical');
          } else {
            registerWarning(
              { ...exportViolation, warning: exportViolation.violation },
              'export_control',
              'high',
            );
          }
        }

        if (
          enforcementConfig.enforceExportControls &&
          operation === 'export' &&
          restrictions.prohibited_markets?.includes(jurisdiction || '')
        ) {
          registerViolation(
            {
              data_source: row.name,
              license: row.license_name,
              violation: `Export restricted for jurisdiction ${jurisdiction}`,
            },
            'export_control',
            'high',
          );
        }

        if (
          operation === 'export' &&
          ['controlled', 'restricted'].includes(row.export_classification)
        ) {
          const message = `Export classification ${row.export_classification} requires escalation`;
          if (enforcementConfig.enforceExportControls) {
            registerViolation(
              {
                data_source: row.name,
                license: row.license_name,
                violation: message,
              },
              'export_control',
              'critical',
            );
          } else {
            registerWarning(
              {
                data_source: row.name,
                license: row.license_name,
                warning: `${message} (export enforcement disabled)`,
              },
              'export_control',
            );
          }
        }

        if (
          operation === 'query' &&
          restrictions.research_only &&
          purpose !== 'research'
        ) {
          registerViolation(
            {
              data_source: row.name,
              license: row.license_name,
              violation: 'Commercial use not permitted - research only license',
            },
            'license_terms',
            'critical',
          );
        }

        // Check DPIA completion for high-risk data
        if (
          ['high', 'critical'].includes(row.pii_classification) &&
          !row.dpia_completed
        ) {
          if (enforcementConfig.enforceDpia) {
            registerViolation(
              {
                data_source: row.name,
                violation:
                  'DPIA assessment required for high-risk PII processing',
              },
              'gdpr_dpia',
              'high',
            );
          } else {
            registerWarning(
              {
                data_source: row.name,
                warning:
                  'DPIA assessment required for high-risk PII processing (monitoring only)',
              },
              'gdpr_dpia',
              'high',
            );
          }
        }

        // Check geographic restrictions
        if (
          jurisdiction &&
          geographicRestrictions.includes(jurisdiction)
        ) {
          registerViolation(
            {
              data_source: row.name,
              violation: `Data processing restricted in jurisdiction: ${jurisdiction}`,
            },
            'regional_restriction',
            'critical',
          );
        }

        // Apply license compliance level
        if (complianceLevel === 'block') {
          registerViolation(
            {
              data_source: row.name,
              license: row.license_name,
              violation: 'License marked as blocked for compliance',
            },
            'license_policy',
            'critical',
          );
        } else if (
          complianceLevel === 'warn' &&
          overallCompliance !== 'block'
        ) {
          registerWarning(
            {
              data_source: row.name,
              license: row.license_name,
              warning: 'License requires additional review',
            },
            'license_policy',
            'medium',
          );
        }
      }

      const triggeredControlList = Array.from(triggeredControls);

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
        controls_triggered: triggeredControlList,
      };

      await recordUsageEvent({
        id: `usage_${Date.now()}`,
        event_type: 'compliance_check',
        result: overallCompliance as UsageEvent['result'],
        operation,
        data_source_ids,
        triggered_controls: triggeredControlList,
        violations,
        warnings,
        reason_for_access: (request as any).reasonForAccess,
        authority_id: (request as any).authorityId,
        created_at: response.checked_at,
      });

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

server.get('/compliance/report', async (request) => {
  const query = (request as any).query || {};
  const requestedWindow = parseInt(
    query.days || `${enforcementConfig.complianceReportDays}`,
    10,
  );
  const windowDays = Number.isNaN(requestedWindow)
    ? enforcementConfig.complianceReportDays
    : requestedWindow;

  if (!enforcementConfig.usageTrackingEnabled) {
    return {
      usage_tracking_enabled: false,
      enforcement: enforcementConfig,
      message:
        'Usage tracking disabled; enable ENABLE_USAGE_TRACKING to collect compliance metrics.',
    };
  }

  const since = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const result = await pool.query(
    `SELECT event_type, result, triggered_controls, created_at
     FROM usage_events
     WHERE created_at >= $1
     ORDER BY created_at DESC`,
    [since],
  );

  const totals = { checks: 0, blocked: 0, warned: 0, allowed: 0 };
  const controlSummary: Record<string, { violations: number; warnings: number }> = {};

  const recentEvents = result.rows.slice(0, 25).map((row) => ({
    ...row,
    triggered_controls: normalizeJsonField<string[]>(row.triggered_controls, []),
  }));

  for (const row of result.rows) {
    if (row.event_type !== 'compliance_check') continue;
    const triggered = normalizeJsonField<string[]>(row.triggered_controls, []);

    totals.checks += 1;
    if (row.result === 'block') {
      totals.blocked += 1;
    } else if (row.result === 'warn') {
      totals.warned += 1;
    } else {
      totals.allowed += 1;
    }

    triggered.forEach((control) => {
      if (!controlSummary[control]) {
        controlSummary[control] = { violations: 0, warnings: 0 };
      }

      if (row.result === 'block') {
        controlSummary[control].violations += 1;
      } else if (row.result === 'warn') {
        controlSummary[control].warnings += 1;
      }
    });
  }

  const regulatoryMapping: Record<string, string> = {
    tos_contract: 'TOS and contractual obligations',
    export_control: 'Export control (ITAR/EAR) and sanctions',
    gdpr_dpia: 'GDPR Article 35 DPIA coverage',
    regional_restriction: 'Data residency and geographic controls',
    license_policy: 'License policy controls',
    license_terms: 'License acceptable use controls',
  };

  return {
    window_days: windowDays,
    usage_tracking_enabled: enforcementConfig.usageTrackingEnabled,
    enforcement: enforcementConfig,
    totals,
    control_summary: Object.entries(controlSummary).map(
      ([control, summary]) => ({
        control,
        description: regulatoryMapping[control] || 'Custom control',
        ...summary,
      }),
    ),
    recent_events: recentEvents,
    generated_at: new Date().toISOString(),
  };
});

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
    await ensureComplianceColumns();
    await ensureUsageEventsTable();
    await server.listen({ port: PORT, host: '0.0.0.0' });
    server.log.info(`⚖️  License Registry ready at http://localhost:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
