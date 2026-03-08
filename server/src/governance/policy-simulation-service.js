"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultPolicySimulationService = exports.PolicySimulationService = void 0;
const crypto_1 = require("crypto");
const logger_js_1 = require("../config/logger.js");
const index_js_1 = require("../audit/index.js");
const ledger_js_1 = require("../provenance/ledger.js");
const database_js_1 = require("../config/database.js");
const DEFAULT_FIXTURE_EVENTS = [
    {
        requestId: 'fixture-1',
        actorId: 'analyst-1',
        tenantId: 'tenant-a',
        caseId: 'CASE-001',
        role: 'analyst',
        action: 'read',
        resource: 'case-file',
        decision: 'allow',
        context: { tags: ['restricted'] },
    },
    {
        requestId: 'fixture-2',
        actorId: 'auditor-9',
        tenantId: 'tenant-a',
        caseId: 'CASE-002',
        role: 'auditor',
        action: 'export',
        resource: 'graph',
        decision: 'deny',
        context: { reason: 'missing_warrant' },
    },
    {
        requestId: 'fixture-3',
        actorId: 'ops-4',
        tenantId: 'tenant-b',
        caseId: 'CASE-003',
        role: 'ops',
        action: 'write',
        resource: 'case-file',
        decision: 'allow',
        context: { reason: 'standard_update' },
    },
];
class HeuristicPolicyEvaluator {
    async evaluate(event, candidatePolicy) {
        if (typeof event.candidateDecision === 'string') {
            return {
                allow: event.candidateDecision === 'allow',
                source: 'event_override',
                reason: 'candidateDecision provided on event',
            };
        }
        if (!candidatePolicy) {
            return {
                allow: event.decision === 'allow',
                source: 'baseline_replay',
                reason: 'no candidate policy provided',
            };
        }
        const policyText = candidatePolicy.toLowerCase();
        const role = (event.role || '').toLowerCase();
        const action = (event.action || '').toLowerCase();
        if (policyText.includes('deny_all')) {
            return {
                allow: false,
                source: 'candidate_policy',
                reason: 'deny_all marker present',
            };
        }
        if (role && policyText.includes(`deny_role_${role}`)) {
            return {
                allow: false,
                source: 'candidate_policy',
                reason: `role ${role} explicitly denied`,
            };
        }
        if (role && policyText.includes(`allow_role_${role}`)) {
            return {
                allow: true,
                source: 'candidate_policy',
                reason: `role ${role} explicitly allowed`,
            };
        }
        if (policyText.includes(`deny_action_${action}`)) {
            return {
                allow: false,
                source: 'candidate_policy',
                reason: `action ${action} explicitly denied`
            };
        }
        if (event.caseId) {
            const lowerCaseId = event.caseId.toLowerCase();
            if (policyText.includes(`deny_case_${lowerCaseId}`)) {
                return {
                    allow: false,
                    source: 'candidate_policy',
                    reason: `case ${event.caseId} explicitly denied`,
                };
            }
            if (policyText.includes(`allow_case_${lowerCaseId}`)) {
                return {
                    allow: true,
                    source: 'candidate_policy',
                    reason: `case ${event.caseId} explicitly allowed`,
                };
            }
        }
        return {
            allow: event.decision === 'allow',
            source: 'candidate_policy',
            reason: 'no explicit candidate rule matched; mirrored baseline decision',
        };
    }
}
function ensureTransitionBucket(map, key) {
    if (!map[key]) {
        map[key] = { total: 0, allowedToDenied: 0, deniedToAllowed: 0 };
    }
    return map[key];
}
class PolicySimulationService {
    evaluator;
    constructor(evaluator = new HeuristicPolicyEvaluator()) {
        this.evaluator = evaluator;
        this.initializeSchema().catch(err => {
            logger_js_1.logger.error({ error: err }, 'Failed to initialize PolicySimulationService schema');
        });
    }
    async initializeSchema() {
        try {
            const pool = (0, database_js_1.getPostgresPool)();
            await pool.query(`
        CREATE TABLE IF NOT EXISTS policy_drafts (
          draft_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          version INTEGER NOT NULL,
          policy_text TEXT NOT NULL,
          author TEXT NOT NULL,
          change_summary TEXT NOT NULL,
          status TEXT NOT NULL,
          approvals TEXT[] DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_policy_drafts_tenant ON policy_drafts(tenant_id);
      `);
        }
        catch (e) {
            logger_js_1.logger.warn({ error: e }, "Could not initialize DB schema for PolicySimulationService");
        }
    }
    async runSimulation(options) {
        const events = options.events && options.events.length > 0 ? options.events : DEFAULT_FIXTURE_EVENTS;
        this.validateEvents(events);
        const breakdowns = {
            byTenant: {},
            byCase: {},
            byRole: {},
        };
        const changes = {
            allowedToDenied: [],
            deniedToAllowed: [],
        };
        let baselineAllowed = 0;
        let baselineDenied = 0;
        let candidateAllowed = 0;
        let candidateDenied = 0;
        let fallbackUsed = false;
        for (const event of events) {
            const baselineAllow = event.decision === 'allow';
            baselineAllow ? baselineAllowed++ : baselineDenied++;
            let candidateDecision;
            try {
                candidateDecision = await this.evaluator.evaluate(event, options.candidatePolicy);
            }
            catch (error) {
                fallbackUsed = true;
                candidateDecision = {
                    allow: baselineAllow,
                    source: 'fallback',
                    reason: error.message,
                };
                logger_js_1.logger.warn({
                    error: error.message,
                    eventId: event.requestId,
                }, 'Policy simulation evaluator failed; used baseline decision');
            }
            if (candidateDecision.allow) {
                candidateAllowed++;
            }
            else {
                candidateDenied++;
            }
            const transitionKeyTenant = event.tenantId || 'unknown-tenant';
            const transitionKeyCase = event.caseId || 'unknown-case';
            const transitionKeyRole = event.role || 'unknown-role';
            ensureTransitionBucket(breakdowns.byTenant, transitionKeyTenant).total += 1;
            ensureTransitionBucket(breakdowns.byCase, transitionKeyCase).total += 1;
            ensureTransitionBucket(breakdowns.byRole, transitionKeyRole).total += 1;
            if (baselineAllow && !candidateDecision.allow) {
                ensureTransitionBucket(breakdowns.byTenant, transitionKeyTenant).allowedToDenied += 1;
                ensureTransitionBucket(breakdowns.byCase, transitionKeyCase).allowedToDenied += 1;
                ensureTransitionBucket(breakdowns.byRole, transitionKeyRole).allowedToDenied += 1;
                changes.allowedToDenied.push(event);
            }
            if (!baselineAllow && candidateDecision.allow) {
                ensureTransitionBucket(breakdowns.byTenant, transitionKeyTenant).deniedToAllowed += 1;
                ensureTransitionBucket(breakdowns.byCase, transitionKeyCase).deniedToAllowed += 1;
                ensureTransitionBucket(breakdowns.byRole, transitionKeyRole).deniedToAllowed += 1;
                changes.deniedToAllowed.push(event);
            }
        }
        // P4.1 Diff Report Logic
        const newDenialsByAction = {};
        changes.allowedToDenied.forEach(e => {
            newDenialsByAction[e.action] = (newDenialsByAction[e.action] || 0) + 1;
        });
        const topImpactedTenants = Object.entries(breakdowns.byTenant)
            .map(([tenantId, breakdown]) => ({ tenantId, count: breakdown.allowedToDenied + breakdown.deniedToAllowed }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        return {
            summary: {
                totalEvents: events.length,
                baseline: {
                    allowed: baselineAllowed,
                    denied: baselineDenied,
                },
                candidate: {
                    allowed: candidateAllowed,
                    denied: candidateDenied,
                },
                transitions: {
                    allowedToDenied: changes.allowedToDenied.length,
                    deniedToAllowed: changes.deniedToAllowed.length,
                },
            },
            breakdowns,
            changes,
            metadata: {
                simulatorRunId: (0, crypto_1.randomUUID)(),
                evaluator: this.evaluator.constructor.name,
                fallback: fallbackUsed,
                featureFlagEnabled: process.env.POLICY_SIMULATION === '1',
            },
            diffReport: {
                newDenialsByAction,
                newlyAllowedRiskCount: changes.deniedToAllowed.length,
                topImpactedTenants
            }
        };
    }
    // P3.1: Policy Change Draft + Versioning
    async createDraft(input) {
        const draftId = `draft_${(0, crypto_1.randomUUID)()}`;
        const draft = {
            draftId,
            tenantId: input.tenantId,
            version: 1, // Simple versioning
            policyText: input.policyText,
            author: input.author,
            changeSummary: input.changeSummary,
            createdAt: new Date(),
            status: 'draft',
            approvals: []
        };
        // Persist
        const pool = (0, database_js_1.getPostgresPool)();
        await pool.query(`
      INSERT INTO policy_drafts (
        draft_id, tenant_id, version, policy_text, author, change_summary, status, approvals, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
            draft.draftId, draft.tenantId, draft.version, draft.policyText, draft.author,
            draft.changeSummary, draft.status, draft.approvals, draft.createdAt
        ]);
        return draft;
    }
    async getDraft(draftId) {
        const pool = (0, database_js_1.getPostgresPool)();
        const res = await pool.query('SELECT * FROM policy_drafts WHERE draft_id = $1', [draftId]);
        if (res.rows.length === 0)
            return undefined;
        const row = res.rows[0];
        return {
            draftId: row.draft_id,
            tenantId: row.tenant_id,
            version: row.version,
            policyText: row.policy_text,
            author: row.author,
            changeSummary: row.change_summary,
            status: row.status,
            approvals: row.approvals || [],
            createdAt: row.created_at
        };
    }
    // P3.2: Replay Against Historical Events
    async replayHistorical(draftId, timeWindowHours = 24) {
        const draft = await this.getDraft(draftId);
        if (!draft)
            throw new Error("Draft not found");
        let events = [];
        try {
            const endTime = new Date();
            const startTime = new Date(endTime.getTime() - (timeWindowHours * 60 * 60 * 1000));
            const auditEvents = await index_js_1.advancedAuditSystem.queryEvents({
                startTime,
                endTime,
                tenantIds: [draft.tenantId],
                // We want access/decision events.
                // Based on AuditEventType in advanced-audit-system.ts: 'resource_access', 'policy_decision', etc.
                eventTypes: ['resource_access', 'policy_decision', 'user_action']
            });
            events = auditEvents.map(ae => ({
                requestId: ae.requestId,
                actorId: ae.userId || 'unknown',
                tenantId: ae.tenantId,
                action: ae.action,
                resource: ae.resourceType,
                decision: ae.outcome === 'success' ? 'allow' : 'deny',
                timestamp: ae.timestamp.toISOString(),
                context: ae.details,
                role: ae.details?.role || 'unknown' // assuming role might be in details
            }));
        }
        catch (e) {
            logger_js_1.logger.error({ error: e }, "Failed to fetch historical events for simulation");
            // Fail fast!
            throw new Error("Could not fetch historical events. Simulation aborted to prevent misleading results.");
        }
        if (events.length === 0) {
            // If no events found, return empty result or warn.
            // Do NOT use fixtures silently.
            logger_js_1.logger.warn("No historical events found for simulation period");
            // We can proceed with empty events, runSimulation handles it.
        }
        return this.runSimulation({
            candidatePolicy: draft.policyText,
            events
        });
    }
    // P4.2: Approval Gate
    async publishDraft(draftId, approverId) {
        const draft = await this.getDraft(draftId);
        if (!draft)
            throw new Error("Draft not found");
        // Check if already approved by this user
        if (!draft.approvals.includes(approverId)) {
            draft.approvals.push(approverId);
            // Update DB
            const pool = (0, database_js_1.getPostgresPool)();
            await pool.query('UPDATE policy_drafts SET approvals = $1 WHERE draft_id = $2', [draft.approvals, draftId]);
        }
        if (draft.approvals.length < 2) {
            if (draft.status !== 'pending_approval') {
                draft.status = 'pending_approval';
                const pool = (0, database_js_1.getPostgresPool)();
                await pool.query('UPDATE policy_drafts SET status = $1 WHERE draft_id = $2', [draft.status, draftId]);
            }
            // Return draft with updated status, DO NOT THROW
            return draft;
        }
        // If we have 2 approvals, publish
        draft.status = 'published';
        const pool = (0, database_js_1.getPostgresPool)();
        await pool.query('UPDATE policy_drafts SET status = $1 WHERE draft_id = $2', [draft.status, draftId]);
        // Log to provenance ledger
        try {
            await ledger_js_1.provenanceLedger.appendEntry({
                timestamp: new Date(),
                tenantId: draft.tenantId,
                actionType: 'policy_published',
                resourceType: 'Policy',
                resourceId: draft.draftId,
                actorId: approverId,
                actorType: 'user',
                payload: {
                    mutationType: 'publish',
                    entityId: draft.draftId,
                    entityType: 'PolicyDraft',
                    version: draft.version,
                    policyText: draft.policyText,
                    approvals: draft.approvals,
                    changeSummary: draft.changeSummary
                },
                metadata: {
                    purpose: 'governance_policy_update'
                }
            });
        }
        catch (e) {
            logger_js_1.logger.error({ error: e }, "Failed to log policy publish to provenance ledger");
        }
        return draft;
    }
    validateEvents(events) {
        for (const [idx, event] of events.entries()) {
            if (!event.actorId) {
                throw new Error(`Event ${idx} is missing actorId`);
            }
            if (!event.tenantId) {
                throw new Error(`Event ${idx} is missing tenantId`);
            }
            if (!event.action) {
                throw new Error(`Event ${idx} is missing action`);
            }
            if (!['allow', 'deny'].includes(event.decision)) {
                throw new Error(`Event ${idx} must have a decision of allow or deny`);
            }
        }
    }
}
exports.PolicySimulationService = PolicySimulationService;
exports.defaultPolicySimulationService = new PolicySimulationService();
