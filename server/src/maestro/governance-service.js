"use strict";
// @ts-nocheck
/**
 * Agent Governance & Safety Rails
 *
 * This module enforces governance constraints and safety rails for agent coordination
 * and autonomous operations in accordance with the Summit Constitution and operational
 * policies. These safety mechanisms ensure agents operate within legal, ethical, and
 * security boundaries.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentGovernance = exports.AgentGovernanceService = void 0;
const ledger_js_1 = require("../provenance/ledger.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class AgentGovernanceService {
    static instance;
    safetyViolations = new Map(); // tenantId -> violations
    ledger;
    policies = new Map(); // tenantId -> { policyId -> config }
    riskThresholds = {
        low: 0.3,
        medium: 0.6,
        high: 0.8,
        critical: 0.95
    };
    // Default governance configuration
    defaultConfig = {
        maxConcurrency: 5,
        maxBudget: 10000, // $10,000 budget ceiling
        maxExecutionTimeMs: 60000, // 60 seconds max
        requiredApprovals: 1,
        capabilitiesWhitelist: [
            'data-query',
            'graph-analysis',
            'text-summarization',
            'entity-resolution',
            'threat-correlation',
            'provenance-tracing'
        ],
        allowedDomains: [
            'localhost',
            '127.0.0.1',
            'intelgraph.local',
            'intelgraph.cloud'
        ],
        dataClassification: 'internal',
        auditLevel: 'standard'
    };
    constructor() {
        this.ledger = ledger_js_1.ProvenanceLedgerV2.getInstance();
        this.initializePolicies();
    }
    static getInstance() {
        if (!AgentGovernanceService.instance) {
            AgentGovernanceService.instance = new AgentGovernanceService();
        }
        return AgentGovernanceService.instance;
    }
    /**
     * Initialize default policies and governance rules
     */
    initializePolicies() {
        const systemPolicies = new Map();
        systemPolicies.set('*', this.defaultConfig); // Default for all agents
        // Define governance tiers based on sensitivity and risk
        systemPolicies.set('tier-0', {
            ...this.defaultConfig,
            maxBudget: 5000,
            maxExecutionTimeMs: 30000,
            requiredApprovals: 0,
            capabilitiesWhitelist: [
                'data-query',
                'graph-analysis',
                'text-summarization'
            ],
            dataClassification: 'internal',
            auditLevel: 'minimal'
        });
        systemPolicies.set('tier-1', {
            ...this.defaultConfig,
            maxBudget: 15000,
            maxExecutionTimeMs: 120000,
            requiredApprovals: 1,
            capabilitiesWhitelist: [
                'data-query',
                'graph-analysis',
                'text-summarization',
                'entity-resolution',
                'threat-correlation'
            ],
            dataClassification: 'confidential',
            auditLevel: 'standard'
        });
        systemPolicies.set('tier-2', this.defaultConfig);
        this.policies.set('system', systemPolicies);
        logger_js_1.default.info('Agent governance policies initialized');
    }
    /**
     * Evaluate whether an agent action is permitted
     */
    async evaluateAction(agent, action, context, metadata) {
        // === HITL OVERRIDE (Task #104) ===
        // Check if there is an existing human approval for this task/action
        if (context.taskId) {
            try {
                const { getPostgresPool } = await Promise.resolve().then(() => __importStar(require('../db/postgres.js')));
                const pool = getPostgresPool();
                // Check for approved record in the approvals table
                const result = await pool.query(`SELECT status FROM approvals 
           WHERE (payload->>'taskId' = $1 OR run_id = $2)
           AND status = 'approved' 
           ORDER BY created_at DESC LIMIT 1`, [context.taskId, context.runId]);
                if (result.rows && result.rows.length > 0) {
                    logger_js_1.default.info({ taskId: context.taskId }, 'Governance: Human approval detected, allowing action');
                    return {
                        allowed: true,
                        reason: 'Action manually authorized by human operator',
                        riskScore: 0,
                        violations: []
                    };
                }
            }
            catch (err) {
                logger_js_1.default.warn({ taskId: context.taskId, error: err.message }, 'Governance: Approval check failed, falling back to policy');
            }
        }
        const config = this.getAgentConfig(agent);
        const violations = [];
        // Check 1: Capability whitelist
        if (!config.capabilitiesWhitelist.includes(action)) {
            const violation = {
                id: `violation-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                agentId: agent.id,
                violationType: 'UNAUTHORIZED_CAPABILITY',
                severity: 'high',
                details: `Agent attempted to use unauthorized capability: ${action}`,
                timestamp: new Date(),
                context
            };
            violations.push(violation);
            logger_js_1.default.warn({
                agentId: agent.id,
                action,
                violationId: violation.id
            }, 'Unauthorized capability attempt detected');
        }
        // Check 2: Budget constraints if applicable
        const estimatedCost = this.estimateActionCost(action, context);
        if (estimatedCost > config.maxBudget) {
            const violation = {
                id: `violation-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                agentId: agent.id,
                violationType: 'BUDGET_EXCEEDED',
                severity: 'medium',
                details: `Estimated cost $${estimatedCost} exceeds max budget $${config.maxBudget}`,
                timestamp: new Date(),
                context
            };
            violations.push(violation);
            logger_js_1.default.warn({
                agentId: agent.id,
                estimatedCost,
                maxBudget: config.maxBudget,
                violationId: violation.id
            }, 'Budget constraint violation detected');
        }
        // Check 3: Risk assessment
        const riskScore = this.calculateRiskScore(agent, action, context);
        // Check 4: Required approvals
        let requiredApprovals = config.requiredApprovals;
        if (riskScore > this.riskThresholds.high) {
            requiredApprovals = Math.max(requiredApprovals, 2); // Increase approvals for high risk
        }
        if (riskScore > this.riskThresholds.critical) {
            const violation = {
                id: `violation-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                agentId: agent.id,
                violationType: 'ETHICAL_VIOLATION',
                severity: 'critical',
                details: `Action risk score ${riskScore} exceeds critical threshold ${this.riskThresholds.critical}`,
                timestamp: new Date(),
                context
            };
            violations.push(violation);
            logger_js_1.default.error({
                agentId: agent.id,
                riskScore,
                criticalThreshold: this.riskThresholds.critical,
                violationId: violation.id
            }, 'Critical risk threshold exceeded');
        }
        // Record violations in provenance ledger and local cache
        const tenantId = agent.tenantId || 'system';
        if (violations.length > 0) {
            if (!this.safetyViolations.has(tenantId)) {
                this.safetyViolations.set(tenantId, []);
            }
            this.safetyViolations.get(tenantId).push(...violations);
        }
        for (const violation of violations) {
            await this.ledger.appendEntry({
                tenantId: tenantId,
                actionType: 'GOVERNANCE_VIOLATION',
                resourceType: 'SafetyViolation',
                resourceId: violation.id,
                actorId: agent.id,
                actorType: 'system',
                timestamp: new Date(),
                payload: {
                    mutationType: 'CREATE',
                    entityId: violation.id,
                    entityType: 'SafetyViolation',
                    violationType: violation.violationType,
                    severity: violation.severity,
                    details: violation.details
                },
                metadata: {
                    agentId: agent.id,
                    action,
                    riskScore,
                    originalContext: context,
                    ...metadata
                }
            });
        }
        const allowed = violations.length === 0 && riskScore <= this.riskThresholds.critical;
        const decision = {
            allowed,
            reason: allowed ? 'Action passes all governance checks' : `Action violates ${violations.length} governance policies`,
            riskScore,
            requiredApprovals: riskScore > this.riskThresholds.high ? requiredApprovals : config.requiredApprovals,
            violations
        };
        logger_js_1.default.info({
            agentId: agent.id,
            action,
            allowed,
            riskScore,
            violationCount: violations.length
        }, 'Governance decision made');
        return decision;
    }
    /**
     * Calculate risk score for an agent action based on multiple factors
     */
    calculateRiskScore(agent, action, context) {
        let score = 0.0;
        // Base risk from action type
        switch (action) {
            case 'delete':
            case 'modify_classification':
            case 'export_sensitive_data':
                score += 0.8;
                break;
            case 'query':
            case 'read':
                score += 0.2;
                break;
            case 'execute_arbitrary_code':
                score += 0.95;
                break;
            default:
                score += 0.5;
                break;
        }
        // Additional risk based on context
        if (context.tenantId === 'restricted') {
            score += 0.2;
        }
        if (context.riskFactors?.includes('high_value_target')) {
            score += 0.3;
        }
        // Data sensitivity risk
        if (context.dataClassification) {
            switch (context.dataClassification) {
                case 'secret':
                    score += 0.4;
                    break;
                case 'confidential':
                    score += 0.2;
                    break;
                case 'internal':
                    score += 0.1;
                    break;
            }
        }
        // Time-of-day risk (operations at unusual hours)
        const hour = new Date().getUTCHours();
        if (hour < 6 || hour > 22) { // After-hours operations
            score += 0.1;
        }
        return Math.min(1.0, score); // Cap at 1.0
    }
    /**
     * Estimate computational cost of an action
     */
    estimateActionCost(action, context) {
        // This is a simplified estimation model
        // In practice, would integrate with FinOps cost tracking
        const baseCosts = {
            'query': 0.01,
            'read': 0.005,
            'create': 0.02,
            'update': 0.02,
            'delete': 0.03,
            'graph_analysis': 0.15,
            'entity_resolution': 0.10,
            'threat_correlation': 0.20,
            'export_pdf': 0.05,
            'export_csv': 0.05,
            'execute_arbitrary_code': 10000 // Very high cost for unapproved code execution
        };
        const baseCost = baseCosts[action] || 0.05;
        // Scale by data volume if available
        const dataSize = context.dataSize || 1; // Size factor, default to 1
        const volumeFactor = Math.log10(Math.max(1, dataSize)) / 10; // Logarithmic scaling
        return baseCost * (1 + volumeFactor) * 100; // Scale appropriately
    }
    /**
     * Get governance configuration for an agent
     */
    getAgentConfig(agent) {
        const tenantId = agent.tenantId || 'system';
        const tenantPolicies = this.policies.get(tenantId) || this.policies.get('system');
        if (!tenantPolicies)
            return this.defaultConfig;
        const policyId = agent.metadata?.governanceTier || '*';
        return tenantPolicies.get(policyId) || tenantPolicies.get('*') || this.defaultConfig;
    }
    /**
     * Enforce security checks before allowing agent coordination
     */
    async enforceSecurityConstraints(agentIds, action, context) {
        // In a real implementation, would check cross-agent coordination permissions
        // and ensure no unauthorized data sharing occurs
        return this.evaluateAction({ id: 'coordinator', name: 'SubagentCoordinator', tenantId: 'system', capabilities: [], metadata: {}, status: 'idle', health: { cpuUsage: 0, memoryUsage: 0, lastHeartbeat: new Date(), activeTasks: 0, errorRate: 0 }, templateId: 'system', config: {} }, `COORDINATION:${action}`, context);
    }
    /**
     * Register a governance policy for a specific agent or tenant
     */
    registerPolicy(id, config, tenantId = 'system') {
        if (!this.policies.has(tenantId)) {
            this.policies.set(tenantId, new Map());
        }
        this.policies.get(tenantId).set(id, config);
        logger_js_1.default.info({
            policyId: id,
            tenantId,
            config
        }, 'Agent governance policy registered');
    }
    /**
     * Get recent safety violations for an agent
     */
    getRecentViolations(agentId, tenantId = 'system', sinceDays = 7) {
        const cutoffTime = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
        const tenantViolations = this.safetyViolations.get(tenantId) || [];
        return tenantViolations
            .filter(violation => violation.agentId === agentId && violation.timestamp > cutoffTime)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    /**
     * Check if an agent is in safe/governed state
     */
    isAgentOperational(agent) {
        // Check if agent is within resource limits and hasn't exceeded safety thresholds
        const isHealthy = agent.health.memoryUsage < 90 && agent.health.cpuUsage < 90;
        const recentViolations = this.getRecentViolations(agent.id, agent.tenantId || 'system', 1); // Check last day
        const hasCriticalViolations = recentViolations.some(v => v.severity === 'critical');
        return isHealthy && !hasCriticalViolations;
    }
    /**
     * Generate governance compliance report
     */
    async generateComplianceReport(tenantId = 'system') {
        const allViolations = this.safetyViolations.get(tenantId) || [];
        const tenantPolicies = this.policies.get(tenantId) || new Map();
        const report = {
            timestamp: new Date().toISOString(),
            tenantId,
            summary: {
                totalViolations: allViolations.length,
                criticalViolations: allViolations.filter(v => v.severity === 'critical').length,
                highViolations: allViolations.filter(v => v.severity === 'high').length,
                policyCoverage: tenantPolicies.size
            },
            violationsByType: this.groupViolationsByType(allViolations),
            violationsBySeverity: this.groupViolationsBySeverity(allViolations),
            agentCompliance: this.calculateAgentCompliance()
        };
        logger_js_1.default.info({
            reportId: `gov-report-${Date.now()}`,
            violations: allViolations.length
        }, 'Governance compliance report generated');
        return report;
    }
    /**
     * Helper to group violations by type
     */
    groupViolationsByType(violations) {
        return violations.reduce((acc, violation) => {
            acc[violation.violationType] = (acc[violation.violationType] || 0) + 1;
            return acc;
        }, {});
    }
    /**
     * Helper to group violations by severity
     */
    groupViolationsBySeverity(violations) {
        return violations.reduce((acc, violation) => {
            acc[violation.severity] = (acc[violation.severity] || 0) + 1;
            return acc;
        }, {});
    }
    /**
     * Calculate compliance metrics for agents
     */
    calculateAgentCompliance() {
        // Would aggregate per-agent compliance data in a real implementation
        return {};
    }
}
exports.AgentGovernanceService = AgentGovernanceService;
exports.agentGovernance = AgentGovernanceService.getInstance();
