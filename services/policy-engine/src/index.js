"use strict";
// @ts-nocheck
/**
 * License/Authority Engine (Policy Engine)
 * Data License Registry + Warrant/Authority Binding compiler
 * Blocks unsafe queries/exports and explains "why"
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializePolicyDecision = serializePolicyDecision;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const zod_1 = require("zod");
const pg_1 = require("pg");
const uuid_1 = require("uuid");
const PORT = parseInt(process.env.PORT || '4040');
const NODE_ENV = process.env.NODE_ENV || 'development';
// Database connection
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL ||
        'postgres://postgres:postgres@localhost:5432/policy_engine',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
// ============================================================================
// Zod Schemas
// ============================================================================
const LicenseClauseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.enum([
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
    description: zod_1.z.string(),
    conditions: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    enforcementLevel: zod_1.z.enum(['HARD', 'SOFT', 'ADVISORY']).default('HARD'),
});
const DataLicenseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    version: zod_1.z.string(),
    owner: zod_1.z.string(),
    clauses: zod_1.z.array(LicenseClauseSchema),
    effectiveDate: zod_1.z.string().datetime(),
    expirationDate: zod_1.z.string().datetime().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
const AuthorityBindingSchema = zod_1.z.object({
    id: zod_1.z.string(),
    authorityType: zod_1.z.enum([
        'WARRANT',
        'SUBPOENA',
        'COURT_ORDER',
        'INTERNAL_POLICY',
        'CONSENT',
        'LEGITIMATE_INTEREST',
        'LEGAL_OBLIGATION',
    ]),
    authorityRef: zod_1.z.string(), // Reference to warrant/order document
    scope: zod_1.z.object({
        dataTypes: zod_1.z.array(zod_1.z.string()),
        purposes: zod_1.z.array(zod_1.z.string()),
        entities: zod_1.z.array(zod_1.z.string()).optional(),
        timeRange: zod_1.z.object({
            start: zod_1.z.string().datetime().optional(),
            end: zod_1.z.string().datetime().optional(),
        }).optional(),
    }),
    constraints: zod_1.z.array(zod_1.z.string()).optional(),
    issuedBy: zod_1.z.string(),
    issuedAt: zod_1.z.string().datetime(),
    expiresAt: zod_1.z.string().datetime().optional(),
    verified: zod_1.z.boolean().default(false),
});
const QueryPlanSchema = zod_1.z.object({
    queryId: zod_1.z.string(),
    operation: zod_1.z.enum(['READ', 'EXPORT', 'AGGREGATE', 'JOIN', 'DELETE']),
    targetDatasets: zod_1.z.array(zod_1.z.string()),
    requestedFields: zod_1.z.array(zod_1.z.string()).optional(),
    purpose: zod_1.z.string(),
    requester: zod_1.z.object({
        userId: zod_1.z.string(),
        roles: zod_1.z.array(zod_1.z.string()),
        authorityBindingId: zod_1.z.string().optional(),
    }),
    context: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
const PolicyDecisionSchema = zod_1.z.object({
    decision: zod_1.z.enum(['ALLOW', 'DENY', 'CONDITIONAL']),
    reasons: zod_1.z.array(zod_1.z.object({
        clause: LicenseClauseSchema,
        licenseId: zod_1.z.string(),
        impact: zod_1.z.enum(['BLOCKING', 'WARNING', 'INFO']),
        explanation: zod_1.z.string(),
        suggestedAction: zod_1.z.string().optional(),
    })),
    conditions: zod_1.z.array(zod_1.z.string()).optional(),
    overrideWorkflow: zod_1.z.string().optional(),
});
const LicenseCheckRequestSchema = zod_1.z.object({
    datasetId: zod_1.z.string(),
    purpose: zod_1.z.string(),
    requesterId: zod_1.z.string(),
    operation: zod_1.z.enum(['READ', 'EXPORT', 'AGGREGATE', 'JOIN', 'DELETE']),
});
function sortJson(value) {
    if (Array.isArray(value)) {
        return value.map((item) => sortJson(item));
    }
    if (value && typeof value === 'object') {
        return Object.entries(value)
            .sort(([a], [b]) => a.localeCompare(b))
            .reduce((acc, [key, val]) => {
            const next = sortJson(val);
            if (next !== undefined) {
                acc[key] = next;
            }
            return acc;
        }, {});
    }
    return value === undefined ? undefined : value;
}
function serializePolicyDecision(decision) {
    const sanitized = sortJson(decision);
    return JSON.stringify(sanitized);
}
// ============================================================================
// Policy Reasoner
// ============================================================================
class PolicyReasoner {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async evaluateQueryPlan(queryPlan) {
        const auditLogId = `audit_${(0, uuid_1.v4)()}`;
        const reasons = [];
        const affectedLicenses = [];
        const requiredAuthorities = [];
        let decision = 'ALLOW';
        const conditions = [];
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
                    }
                    else if (decision === 'ALLOW' && clause.enforcementLevel === 'SOFT') {
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
                }
                else {
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
    async checkLicense(datasetId, purpose, requesterId, operation) {
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
    async simulatePolicyChange(proposedChange, changeType, affectedLicenseId) {
        // Get datasets affected by this license
        const affectedDatasets = await this.getDatasetsForLicense(affectedLicenseId);
        // Simulate impact on existing query patterns
        // This would analyze historical query logs
        const impactedQueries = Math.floor(Math.random() * 100); // Simplified
        const blockingChanges = Math.floor(impactedQueries * 0.1);
        const warnings = [];
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
    evaluateClause(clause, queryPlan, license) {
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
    validateAuthorityBinding(authority, queryPlan) {
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
    async getLicensesForDatasets(datasetIds) {
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
    async getAuthorityBinding(bindingId) {
        // Simplified: return mock authority
        return null;
    }
    async getDatasetsForLicense(licenseId) {
        // Would query database for datasets using this license
        return ['dataset_1', 'dataset_2', 'dataset_3'];
    }
    async logPolicyDecision(auditLogId, queryPlan, decision, reasons) {
        // Would insert into audit_log table
        console.log(`[AUDIT] ${auditLogId}: ${decision} for query ${queryPlan.queryId}`);
    }
}
// ============================================================================
// Fastify Server
// ============================================================================
const server = (0, fastify_1.default)({
    logger: {
        level: NODE_ENV === 'development' ? 'debug' : 'info',
        ...(NODE_ENV === 'development'
            ? { transport: { target: 'pino-pretty' } }
            : {}),
    },
});
server.register(helmet_1.default);
server.register(cors_1.default, {
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
server.post('/policy/evaluate', async (request, reply) => {
    try {
        const queryPlan = QueryPlanSchema.parse(request.body);
        const result = await reasoner.evaluateQueryPlan(queryPlan);
        server.log.info({
            queryId: queryPlan.queryId,
            decision: result.decision.decision,
            reasons: result.decision.reasons.length,
        }, 'Policy evaluation completed');
        return result;
    }
    catch (error) {
        server.log.error(error, 'Policy evaluation failed');
        reply.status(500);
        return { error: 'Policy evaluation failed' };
    }
});
// ============================================================================
// License Check Endpoint
// ============================================================================
server.post('/license/check', async (request, reply) => {
    try {
        const { datasetId, purpose, requesterId, operation } = LicenseCheckRequestSchema.parse(request.body);
        const result = await reasoner.checkLicense(datasetId, purpose, requesterId, operation);
        server.log.info({
            datasetId,
            purpose,
            allowed: result.allowed,
        }, 'License check completed');
        return result;
    }
    catch (error) {
        server.log.error(error, 'License check failed');
        reply.status(500);
        return { error: 'License check failed' };
    }
});
// ============================================================================
// Policy Simulation Endpoint
// ============================================================================
server.post('/policy/simulate', async (request, reply) => {
    try {
        const { proposedChange, changeType, affectedLicenseId } = request.body;
        const result = await reasoner.simulatePolicyChange(proposedChange, changeType, affectedLicenseId);
        server.log.info({
            licenseId: affectedLicenseId,
            changeType,
            impactedQueries: result.impactedQueries,
        }, 'Policy simulation completed');
        return result;
    }
    catch (error) {
        server.log.error(error, 'Policy simulation failed');
        reply.status(500);
        return { error: 'Policy simulation failed' };
    }
});
// ============================================================================
// License Registry Endpoints
// ============================================================================
// Register a new license
server.post('/license/register', async (request, reply) => {
    try {
        const licenseData = request.body;
        const id = `license_${(0, uuid_1.v4)()}`;
        const license = {
            id,
            ...licenseData,
        };
        // Would insert into database
        server.log.info({ licenseId: id, name: license.name }, 'License registered');
        return { licenseId: id, license };
    }
    catch (error) {
        server.log.error(error, 'License registration failed');
        reply.status(500);
        return { error: 'License registration failed' };
    }
});
// Get license by ID
server.get('/license/:licenseId', async (request, reply) => {
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
    }
    catch (error) {
        server.log.error(error, 'License retrieval failed');
        reply.status(500);
        return { error: 'License retrieval failed' };
    }
});
// ============================================================================
// Authority Binding Endpoints
// ============================================================================
// Register authority binding
server.post('/authority/register', async (request, reply) => {
    try {
        const bindingData = request.body;
        const id = `authority_${(0, uuid_1.v4)()}`;
        const binding = {
            id,
            ...bindingData,
        };
        server.log.info({
            authorityId: id,
            type: binding.authorityType,
        }, 'Authority binding registered');
        return { authorityId: id, binding };
    }
    catch (error) {
        server.log.error(error, 'Authority registration failed');
        reply.status(500);
        return { error: 'Authority registration failed' };
    }
});
// ============================================================================
// Gateway Guardrail Messages
// ============================================================================
// Endpoint for gateway to get policy reasoner messages
server.post('/gateway/guardrail', async (request, reply) => {
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
    }
    catch (error) {
        server.log.error(error, 'Gateway guardrail check failed');
        reply.status(500);
        return { error: 'Guardrail check failed' };
    }
});
// Start server
const start = async () => {
    try {
        await server.listen({ port: PORT, host: '0.0.0.0' });
        server.log.info(`Policy Engine service ready at http://localhost:${PORT}`);
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();
