/**
 * License/Authority Engine (Policy Engine)
 * Data License Registry + Warrant/Authority Binding compiler
 * Blocks unsafe queries/exports and explains "why"
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { z } from 'zod';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

const PORT = parseInt(process.env.PORT || '4040');
const NODE_ENV = process.env.NODE_ENV || 'development';

// Database connection
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/policy_engine',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ============================================================================
// Zod Schemas
// ============================================================================

const LicenseClauseSchema = z.object({
  id: z.string(),
  type: z.enum([
    'PERMITTED_USE',
    'PROHIBITED_USE',
    'DATA_RETENTION',
    'GEOGRAPHIC_RESTRICTION',
    'PURPOSE_RESTRICTION',
    'SHARING_RESTRICTION',
    'ATTRIBUTION_REQUIRED',
    'AUDIT_REQUIRED',
    'NOTIFICATION_REQUIRED',
    'EXPIRATION',
  ]),
  description: z.string(),
  conditions: z.record(z.any()).optional(),
  enforcementLevel: z.enum(['HARD', 'SOFT', 'ADVISORY']).default('HARD'),
});

const DataLicenseSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  owner: z.string(),
  clauses: z.array(LicenseClauseSchema),
  effectiveDate: z.string().datetime(),
  expirationDate: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
});

const AuthorityBindingSchema = z.object({
  id: z.string(),
  authorityType: z.enum([
    'WARRANT',
    'SUBPOENA',
    'COURT_ORDER',
    'INTERNAL_POLICY',
    'CONSENT',
    'LEGITIMATE_INTEREST',
    'LEGAL_OBLIGATION',
  ]),
  authorityRef: z.string(), // Reference to warrant/order document
  scope: z.object({
    dataTypes: z.array(z.string()),
    purposes: z.array(z.string()),
    entities: z.array(z.string()).optional(),
    timeRange: z.object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional(),
    }).optional(),
  }),
  constraints: z.array(z.string()).optional(),
  issuedBy: z.string(),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  verified: z.boolean().default(false),
});

const QueryPlanSchema = z.object({
  queryId: z.string(),
  operation: z.enum(['READ', 'EXPORT', 'AGGREGATE', 'JOIN', 'DELETE']),
  targetDatasets: z.array(z.string()),
  requestedFields: z.array(z.string()).optional(),
  purpose: z.string(),
  requester: z.object({
    userId: z.string(),
    roles: z.array(z.string()),
    authorityBindingId: z.string().optional(),
  }),
  context: z.record(z.any()).optional(),
});

const PolicyDecisionSchema = z.object({
  decision: z.enum(['ALLOW', 'DENY', 'CONDITIONAL']),
  reasons: z.array(z.object({
    clause: LicenseClauseSchema,
    licenseId: z.string(),
    impact: z.enum(['BLOCKING', 'WARNING', 'INFO']),
    explanation: z.string(),
    suggestedAction: z.string().optional(),
  })),
  conditions: z.array(z.string()).optional(),
  overrideWorkflow: z.string().optional(),
});

const LicenseCheckRequestSchema = z.object({
  datasetId: z.string(),
  purpose: z.string(),
  requesterId: z.string(),
  operation: z.enum(['READ', 'EXPORT', 'AGGREGATE', 'JOIN', 'DELETE']),
});

// ============================================================================
// Types
// ============================================================================

type LicenseClause = z.infer<typeof LicenseClauseSchema>;
type DataLicense = z.infer<typeof DataLicenseSchema>;
type AuthorityBinding = z.infer<typeof AuthorityBindingSchema>;
type QueryPlan = z.infer<typeof QueryPlanSchema>;
type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;

interface PolicyEvaluationResult {
  queryId: string;
  decision: PolicyDecision;
  affectedLicenses: string[];
  requiredAuthorities: string[];
  auditLogId: string;
  evaluatedAt: string;
}

interface SimulationResult {
  proposedChange: string;
  affectedDatasets: string[];
  impactedQueries: number;
  blockingChanges: number;
  warnings: string[];
}

// ============================================================================
// Policy Reasoner
// ============================================================================

class PolicyReasoner {
  constructor(private pool: Pool) {}

  async evaluateQueryPlan(queryPlan: QueryPlan): Promise<PolicyEvaluationResult> {
    const auditLogId = `audit_${uuidv4()}`;
    const reasons: PolicyDecision['reasons'] = [];
    const affectedLicenses: string[] = [];
    const requiredAuthorities: string[] = [];
    let decision: 'ALLOW' | 'DENY' | 'CONDITIONAL' = 'ALLOW';
    const conditions: string[] = [];

    // 1. Get licenses for target datasets
    const licenses = await this.getLicensesForDatasets(queryPlan.targetDatasets);

    for (const license of licenses) {
      affectedLicenses.push(license.id);

      // 2. Evaluate each clause
      for (const clause of license.clauses) {
        const evaluation = this.evaluateClause(clause, queryPlan, license);

        if (evaluation.violated) {
          reasons.push({
            clause,
            licenseId: license.id,
            impact: clause.enforcementLevel === 'HARD' ? 'BLOCKING' : 'WARNING',
            explanation: evaluation.explanation,
            suggestedAction: evaluation.suggestedAction,
          });

          if (clause.enforcementLevel === 'HARD') {
            decision = 'DENY';
          } else if (decision === 'ALLOW' && clause.enforcementLevel === 'SOFT') {
            decision = 'CONDITIONAL';
            if (evaluation.condition) {
              conditions.push(evaluation.condition);
            }
          }
        }
      }
    }

    // 3. Check authority bindings
    if (queryPlan.requester.authorityBindingId) {
      const authority = await this.getAuthorityBinding(queryPlan.requester.authorityBindingId);

      if (authority) {
        const authorityValid = this.validateAuthorityBinding(authority, queryPlan);

        if (!authorityValid.valid) {
          reasons.push({
            clause: {
              id: 'authority-requirement',
              type: 'PERMITTED_USE',
              description: 'Authority binding validation',
              enforcementLevel: 'HARD',
            },
            licenseId: 'SYSTEM',
            impact: 'BLOCKING',
            explanation: authorityValid.explanation,
            suggestedAction: 'Obtain valid authority for this operation',
          });
          decision = 'DENY';
        } else {
          requiredAuthorities.push(authority.id);
        }
      }
    }

    // 4. Log audit
    await this.logPolicyDecision(auditLogId, queryPlan, decision, reasons);

    return {
      queryId: queryPlan.queryId,
      decision: {
        decision,
        reasons,
        conditions: conditions.length > 0 ? conditions : undefined,
        overrideWorkflow: decision === 'DENY' ? '/policy/override/request' : undefined,
      },
      affectedLicenses,
      requiredAuthorities,
      auditLogId,
      evaluatedAt: new Date().toISOString(),
    };
  }

  async checkLicense(
    datasetId: string,
    purpose: string,
    requesterId: string,
    operation: 'READ' | 'EXPORT' | 'AGGREGATE' | 'JOIN' | 'DELETE',
  ): Promise<{
    allowed: boolean;
    decision: string;
    clause?: LicenseClause;
    owner?: string;
    overrideWorkflow?: string;
  }> {
    const licenses = await this.getLicensesForDatasets([datasetId]);

    if (licenses.length === 0) {
      return {
        allowed: true,
        decision: 'No license restrictions found',
      };
    }

    for (const license of licenses) {
      for (const clause of license.clauses) {
        // Check purpose restrictions
        if (clause.type === 'PURPOSE_RESTRICTION') {
          const allowedPurposes = clause.conditions?.allowedPurposes || [];
          if (!allowedPurposes.includes(purpose)) {
            return {
              allowed: false,
              decision: `Purpose "${purpose}" not permitted by license`,
              clause,
              owner: license.owner,
              overrideWorkflow: '/policy/override/request',
            };
          }
        }

        // Check prohibited uses
        if (clause.type === 'PROHIBITED_USE') {
          const prohibitedOperations = clause.conditions?.operations || [];
          if (prohibitedOperations.includes(operation)) {
            return {
              allowed: false,
              decision: `Operation "${operation}" prohibited by license clause: ${clause.description}`,
              clause,
              owner: license.owner,
              overrideWorkflow: '/policy/override/request',
            };
          }
        }

        // Check geographic restrictions
        if (clause.type === 'GEOGRAPHIC_RESTRICTION') {
          // Would check requester's location against allowed regions
          const allowedRegions = clause.conditions?.regions || [];
          // Simplified: assume requester context has region
        }

        // Check expiration
        if (clause.type === 'EXPIRATION') {
          const expirationDate = clause.conditions?.date;
          if (expirationDate && new Date(expirationDate) < new Date()) {
            return {
              allowed: false,
              decision: `License expired on ${expirationDate}`,
              clause,
              owner: license.owner,
              overrideWorkflow: '/policy/override/request',
            };
          }
        }
      }
    }

    return {
      allowed: true,
      decision: 'All license checks passed',
    };
  }

  async simulatePolicyChange(
    proposedChange: string,
    changeType: 'ADD_CLAUSE' | 'REMOVE_CLAUSE' | 'MODIFY_CLAUSE',
    affectedLicenseId: string,
  ): Promise<SimulationResult> {
    // Get datasets affected by this license
    const affectedDatasets = await this.getDatasetsForLicense(affectedLicenseId);

    // Simulate impact on existing query patterns
    // This would analyze historical query logs
    const impactedQueries = Math.floor(Math.random() * 100); // Simplified
    const blockingChanges = Math.floor(impactedQueries * 0.1);

    const warnings: string[] = [];

    if (blockingChanges > 10) {
      warnings.push(`High impact: ${blockingChanges} queries would be blocked`);
    }

    if (affectedDatasets.length > 5) {
      warnings.push(`Wide scope: ${affectedDatasets.length} datasets affected`);
    }

    return {
      proposedChange,
      affectedDatasets,
      impactedQueries,
      blockingChanges,
      warnings,
    };
  }

  private evaluateClause(
    clause: LicenseClause,
    queryPlan: QueryPlan,
    license: DataLicense,
  ): {
    violated: boolean;
    explanation: string;
    suggestedAction?: string;
    condition?: string;
  } {
    switch (clause.type) {
      case 'PURPOSE_RESTRICTION': {
        const allowedPurposes = clause.conditions?.allowedPurposes || [];
        if (!allowedPurposes.includes(queryPlan.purpose)) {
          return {
            violated: true,
            explanation: `Purpose "${queryPlan.purpose}" is not in allowed purposes: ${allowedPurposes.join(', ')}`,
            suggestedAction: `Request purpose override or use allowed purpose`,
          };
        }
        break;
      }

      case 'PROHIBITED_USE': {
        const prohibitedOps = clause.conditions?.operations || [];
        if (prohibitedOps.includes(queryPlan.operation)) {
          return {
            violated: true,
            explanation: `Operation "${queryPlan.operation}" is prohibited: ${clause.description}`,
            suggestedAction: `Contact data owner (${license.owner}) for exception`,
          };
        }
        break;
      }

      case 'SHARING_RESTRICTION': {
        if (queryPlan.operation === 'EXPORT') {
          const allowedRecipients = clause.conditions?.allowedRecipients || [];
          // Would check if export target is in allowed recipients
          if (allowedRecipients.length > 0) {
            return {
              violated: true,
              explanation: `Export restricted to: ${allowedRecipients.join(', ')}`,
              suggestedAction: `Verify recipient is authorized`,
              condition: 'VERIFY_RECIPIENT',
            };
          }
        }
        break;
      }

      case 'AUDIT_REQUIRED': {
        // Add audit condition
        return {
          violated: false,
          explanation: 'Audit logging required',
          condition: 'AUDIT_LOG_ACCESS',
        };
      }

      case 'ATTRIBUTION_REQUIRED': {
        if (queryPlan.operation === 'EXPORT') {
          return {
            violated: false,
            explanation: 'Attribution required in export',
            condition: 'INCLUDE_ATTRIBUTION',
          };
        }
        break;
      }

      case 'EXPIRATION': {
        const expDate = clause.conditions?.date || license.expirationDate;
        if (expDate && new Date(expDate) < new Date()) {
          return {
            violated: true,
            explanation: `License expired on ${expDate}`,
            suggestedAction: `Renew license with owner: ${license.owner}`,
          };
        }
        break;
      }
    }

    return { violated: false, explanation: 'Clause satisfied' };
  }

  private validateAuthorityBinding(
    authority: AuthorityBinding,
    queryPlan: QueryPlan,
  ): { valid: boolean; explanation: string } {
    // Check expiration
    if (authority.expiresAt && new Date(authority.expiresAt) < new Date()) {
      return {
        valid: false,
        explanation: `Authority binding expired on ${authority.expiresAt}`,
      };
    }

    // Check scope
    if (authority.scope.purposes.length > 0) {
      if (!authority.scope.purposes.includes(queryPlan.purpose)) {
        return {
          valid: false,
          explanation: `Purpose "${queryPlan.purpose}" not covered by authority scope`,
        };
      }
    }

    // Check data types
    // Would compare queryPlan.targetDatasets against authority.scope.dataTypes

    return { valid: true, explanation: 'Authority binding valid' };
  }

  private async getLicensesForDatasets(datasetIds: string[]): Promise<DataLicense[]> {
    // Simplified: return mock licenses
    // In production: query database
    return [
      {
        id: 'license_default',
        name: 'Default Data License',
        version: '1.0',
        owner: 'data-governance@org.com',
        clauses: [
          {
            id: 'clause_purpose',
            type: 'PURPOSE_RESTRICTION',
            description: 'Data may only be used for authorized purposes',
            conditions: {
              allowedPurposes: ['investigation', 'analysis', 'reporting'],
            },
            enforcementLevel: 'HARD',
          },
          {
            id: 'clause_audit',
            type: 'AUDIT_REQUIRED',
            description: 'All access must be logged',
            enforcementLevel: 'HARD',
          },
        ],
        effectiveDate: '2024-01-01T00:00:00Z',
        metadata: {},
      },
    ];
  }

  private async getAuthorityBinding(bindingId: string): Promise<AuthorityBinding | null> {
    // Simplified: return mock authority
    return null;
  }

  private async getDatasetsForLicense(licenseId: string): Promise<string[]> {
    // Would query database for datasets using this license
    return ['dataset_1', 'dataset_2', 'dataset_3'];
  }

  private async logPolicyDecision(
    auditLogId: string,
    queryPlan: QueryPlan,
    decision: string,
    reasons: PolicyDecision['reasons'],
  ): Promise<void> {
    // Would insert into audit_log table
    console.log(`[AUDIT] ${auditLogId}: ${decision} for query ${queryPlan.queryId}`);
  }
}

// ============================================================================
// Fastify Server
// ============================================================================

const server: FastifyInstance = Fastify({
  logger: {
    level: NODE_ENV === 'development' ? 'debug' : 'info',
    ...(NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty' } }
      : {}),
  },
});

server.register(helmet);
server.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
});

const reasoner = new PolicyReasoner(pool);

// Health check
server.get('/health', async () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  };
});

// ============================================================================
// Policy Evaluation Endpoint
// ============================================================================

server.post<{ Body: z.infer<typeof QueryPlanSchema> }>(
  '/policy/evaluate',
  async (request, reply) => {
    try {
      const queryPlan = QueryPlanSchema.parse(request.body);
      const result = await reasoner.evaluateQueryPlan(queryPlan);

      server.log.info({
        queryId: queryPlan.queryId,
        decision: result.decision.decision,
        reasons: result.decision.reasons.length,
      }, 'Policy evaluation completed');

      return result;
    } catch (error) {
      server.log.error(error, 'Policy evaluation failed');
      reply.status(500);
      return { error: 'Policy evaluation failed' };
    }
  },
);

// ============================================================================
// License Check Endpoint
// ============================================================================

server.post<{ Body: z.infer<typeof LicenseCheckRequestSchema> }>(
  '/license/check',
  async (request, reply) => {
    try {
      const { datasetId, purpose, requesterId, operation } = LicenseCheckRequestSchema.parse(request.body);
      const result = await reasoner.checkLicense(datasetId, purpose, requesterId, operation);

      server.log.info({
        datasetId,
        purpose,
        allowed: result.allowed,
      }, 'License check completed');

      return result;
    } catch (error) {
      server.log.error(error, 'License check failed');
      reply.status(500);
      return { error: 'License check failed' };
    }
  },
);

// ============================================================================
// Policy Simulation Endpoint
// ============================================================================

server.post<{
  Body: {
    proposedChange: string;
    changeType: 'ADD_CLAUSE' | 'REMOVE_CLAUSE' | 'MODIFY_CLAUSE';
    affectedLicenseId: string;
  };
}>(
  '/policy/simulate',
  async (request, reply) => {
    try {
      const { proposedChange, changeType, affectedLicenseId } = request.body;
      const result = await reasoner.simulatePolicyChange(proposedChange, changeType, affectedLicenseId);

      server.log.info({
        licenseId: affectedLicenseId,
        changeType,
        impactedQueries: result.impactedQueries,
      }, 'Policy simulation completed');

      return result;
    } catch (error) {
      server.log.error(error, 'Policy simulation failed');
      reply.status(500);
      return { error: 'Policy simulation failed' };
    }
  },
);

// ============================================================================
// License Registry Endpoints
// ============================================================================

// Register a new license
server.post<{ Body: Omit<DataLicense, 'id'> }>(
  '/license/register',
  async (request, reply) => {
    try {
      const licenseData = request.body;
      const id = `license_${uuidv4()}`;

      const license: DataLicense = {
        id,
        ...licenseData,
      };

      // Would insert into database
      server.log.info({ licenseId: id, name: license.name }, 'License registered');

      return { licenseId: id, license };
    } catch (error) {
      server.log.error(error, 'License registration failed');
      reply.status(500);
      return { error: 'License registration failed' };
    }
  },
);

// Get license by ID
server.get<{ Params: { licenseId: string } }>(
  '/license/:licenseId',
  async (request, reply) => {
    try {
      const { licenseId } = request.params;

      // Would query database
      return {
        id: licenseId,
        name: 'Sample License',
        version: '1.0',
        owner: 'data-governance@org.com',
        clauses: [],
        effectiveDate: new Date().toISOString(),
      };
    } catch (error) {
      server.log.error(error, 'License retrieval failed');
      reply.status(500);
      return { error: 'License retrieval failed' };
    }
  },
);

// ============================================================================
// Authority Binding Endpoints
// ============================================================================

// Register authority binding
server.post<{ Body: Omit<AuthorityBinding, 'id'> }>(
  '/authority/register',
  async (request, reply) => {
    try {
      const bindingData = request.body;
      const id = `authority_${uuidv4()}`;

      const binding: AuthorityBinding = {
        id,
        ...bindingData,
      };

      server.log.info({
        authorityId: id,
        type: binding.authorityType,
      }, 'Authority binding registered');

      return { authorityId: id, binding };
    } catch (error) {
      server.log.error(error, 'Authority registration failed');
      reply.status(500);
      return { error: 'Authority registration failed' };
    }
  },
);

// ============================================================================
// Gateway Guardrail Messages
// ============================================================================

// Endpoint for gateway to get policy reasoner messages
server.post<{ Body: { queryPlan: z.infer<typeof QueryPlanSchema> } }>(
  '/gateway/guardrail',
  async (request, reply) => {
    try {
      const { queryPlan } = request.body;
      const result = await reasoner.evaluateQueryPlan(queryPlan);

      if (result.decision.decision === 'DENY') {
        return {
          blocked: true,
          message: result.decision.reasons
            .filter((r) => r.impact === 'BLOCKING')
            .map((r) => r.explanation)
            .join('; '),
          overrideWorkflow: result.decision.overrideWorkflow,
          affectedLicenses: result.affectedLicenses,
        };
      }

      return {
        blocked: false,
        warnings: result.decision.reasons
          .filter((r) => r.impact === 'WARNING')
          .map((r) => r.explanation),
        conditions: result.decision.conditions,
      };
    } catch (error) {
      server.log.error(error, 'Gateway guardrail check failed');
      reply.status(500);
      return { error: 'Guardrail check failed' };
    }
  },
);

// Start server
const start = async () => {
  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
    server.log.info(
      `Policy Engine service ready at http://localhost:${PORT}`,
    );
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
