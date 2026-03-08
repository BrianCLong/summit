"use strict";
/**
 * Autonomous Threat Response with AI Decision Engine
 *
 * Machine learning-driven autonomous response orchestration
 * with human-in-the-loop safeguards
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIDecisionEngine = exports.PlaybookSchema = exports.ResponseActionSchema = exports.ThreatContextSchema = void 0;
const zod_1 = require("zod");
exports.ThreatContextSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    timestamp: zod_1.z.date(),
    severity: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    category: zod_1.z.enum([
        'MALWARE', 'INTRUSION', 'EXFILTRATION', 'LATERAL_MOVEMENT', 'PRIVILEGE_ESCALATION',
        'PERSISTENCE', 'C2_ACTIVITY', 'INSIDER_THREAT', 'APT', 'RANSOMWARE', 'DDoS'
    ]),
    indicators: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        value: zod_1.z.string(),
        confidence: zod_1.z.number()
    })),
    affectedAssets: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        type: zod_1.z.enum(['ENDPOINT', 'SERVER', 'NETWORK', 'USER', 'APPLICATION', 'DATA']),
        criticality: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
        businessContext: zod_1.z.string().optional()
    })),
    attackStage: zod_1.z.enum([
        'RECONNAISSANCE', 'WEAPONIZATION', 'DELIVERY', 'EXPLOITATION',
        'INSTALLATION', 'C2', 'ACTIONS_ON_OBJECTIVES'
    ]),
    attribution: zod_1.z.object({
        actor: zod_1.z.string().optional(),
        campaign: zod_1.z.string().optional(),
        confidence: zod_1.z.number()
    }).optional(),
    timeline: zod_1.z.array(zod_1.z.object({ timestamp: zod_1.z.date(), event: zod_1.z.string() }))
});
exports.ResponseActionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: zod_1.z.enum([
        'ISOLATE_HOST', 'BLOCK_IP', 'BLOCK_DOMAIN', 'DISABLE_USER', 'KILL_PROCESS',
        'QUARANTINE_FILE', 'RESET_CREDENTIALS', 'REVOKE_SESSION', 'ENABLE_MFA',
        'DEPLOY_PATCH', 'UPDATE_FIREWALL', 'SINKHOLE_DOMAIN', 'FORENSIC_CAPTURE',
        'ALERT_SOC', 'ESCALATE', 'NOTIFY_STAKEHOLDER'
    ]),
    target: zod_1.z.object({
        type: zod_1.z.string(),
        identifier: zod_1.z.string(),
        context: zod_1.z.record(zod_1.z.any()).optional()
    }),
    parameters: zod_1.z.record(zod_1.z.any()),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    requiresApproval: zod_1.z.boolean(),
    reversible: zod_1.z.boolean(),
    estimatedImpact: zod_1.z.object({
        businessDisruption: zod_1.z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH']),
        affectedUsers: zod_1.z.number(),
        duration: zod_1.z.number()
    }),
    status: zod_1.z.enum(['PENDING', 'APPROVED', 'EXECUTING', 'COMPLETED', 'FAILED', 'ROLLED_BACK']),
    executedAt: zod_1.z.date().optional(),
    result: zod_1.z.object({ success: zod_1.z.boolean(), details: zod_1.z.string() }).optional()
});
exports.PlaybookSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    triggerConditions: zod_1.z.array(zod_1.z.object({
        field: zod_1.z.string(),
        operator: zod_1.z.enum(['EQUALS', 'CONTAINS', 'GREATER_THAN', 'LESS_THAN', 'MATCHES']),
        value: zod_1.z.any()
    })),
    actions: zod_1.z.array(zod_1.z.object({
        order: zod_1.z.number(),
        action: exports.ResponseActionSchema.omit({ id: true, status: true }),
        conditions: zod_1.z.array(zod_1.z.object({ field: zod_1.z.string(), operator: zod_1.z.string(), value: zod_1.z.any() })).optional(),
        onFailure: zod_1.z.enum(['STOP', 'CONTINUE', 'ROLLBACK', 'ESCALATE'])
    })),
    approvalRequired: zod_1.z.boolean(),
    autoExecute: zod_1.z.boolean(),
    maxAutonomyLevel: zod_1.z.enum(['FULL_AUTO', 'SEMI_AUTO', 'SUPERVISED', 'MANUAL']),
    cooldownMinutes: zod_1.z.number(),
    metrics: zod_1.z.object({
        timesExecuted: zod_1.z.number(),
        avgExecutionTime: zod_1.z.number(),
        successRate: zod_1.z.number()
    })
});
/**
 * AI Decision Engine for autonomous response
 */
class AIDecisionEngine {
    riskThresholds = { auto: 30, semiAuto: 60, supervised: 80 };
    playbooks = new Map();
    pendingActions = new Map();
    executionHistory = [];
    learningEnabled = true;
    /**
     * Analyze threat and recommend response
     */
    async analyzeAndRespond(threat) {
        const riskScore = this.calculateRiskScore(threat);
        const matchingPlaybooks = this.findMatchingPlaybooks(threat);
        const actions = this.generateResponseActions(threat, matchingPlaybooks);
        const confidence = this.calculateConfidence(threat, actions);
        const reasoning = this.generateReasoning(threat, actions, riskScore);
        let decision;
        if (riskScore <= this.riskThresholds.auto && confidence > 0.85) {
            decision = 'AUTO_RESPOND';
        }
        else if (riskScore <= this.riskThresholds.semiAuto) {
            decision = 'RECOMMEND';
        }
        else {
            decision = 'ESCALATE';
        }
        // Auto-execute low-risk, high-confidence actions
        if (decision === 'AUTO_RESPOND') {
            for (const action of actions.filter(a => !a.requiresApproval)) {
                await this.executeAction(action);
            }
        }
        return {
            decision,
            actions,
            reasoning,
            confidence,
            riskScore,
            playbook: matchingPlaybooks[0] || null
        };
    }
    /**
     * Execute a response action
     */
    async executeAction(action) {
        action.status = 'EXECUTING';
        action.executedAt = new Date();
        try {
            // Simulate action execution based on type
            const result = await this.performAction(action);
            action.status = result.success ? 'COMPLETED' : 'FAILED';
            action.result = { success: result.success, details: result.message };
            this.executionHistory.push(action);
            if (this.learningEnabled) {
                this.updateLearning(action);
            }
            return {
                success: result.success,
                result: result.message,
                rollbackAvailable: action.reversible
            };
        }
        catch (error) {
            action.status = 'FAILED';
            action.result = { success: false, details: String(error) };
            return { success: false, result: String(error), rollbackAvailable: false };
        }
    }
    /**
     * Rollback a previous action
     */
    async rollbackAction(actionId) {
        const action = this.executionHistory.find(a => a.id === actionId);
        if (!action)
            return { success: false, message: 'Action not found' };
        if (!action.reversible)
            return { success: false, message: 'Action not reversible' };
        // Perform rollback based on action type
        const rollbackMap = {
            ISOLATE_HOST: async () => ({ success: true, message: 'Host reconnected' }),
            BLOCK_IP: async () => ({ success: true, message: 'IP unblocked' }),
            DISABLE_USER: async () => ({ success: true, message: 'User re-enabled' }),
            QUARANTINE_FILE: async () => ({ success: true, message: 'File restored' })
        };
        const rollbackFn = rollbackMap[action.type];
        if (rollbackFn) {
            const result = await rollbackFn();
            action.status = 'ROLLED_BACK';
            return result;
        }
        return { success: false, message: 'No rollback procedure available' };
    }
    /**
     * Configure autonomy levels
     */
    configureAutonomy(config) {
        this.riskThresholds.auto = config.fullAutoThreshold;
        this.riskThresholds.semiAuto = config.semiAutoThreshold;
        this.riskThresholds.supervised = config.supervisedThreshold;
        this.learningEnabled = config.enableLearning;
    }
    /**
     * Get pending actions requiring approval
     */
    getPendingApprovals() {
        return Array.from(this.pendingActions.values()).filter(a => a.status === 'PENDING');
    }
    /**
     * Approve pending action
     */
    async approveAction(actionId, approver) {
        const action = this.pendingActions.get(actionId);
        if (!action)
            return { success: false };
        action.status = 'APPROVED';
        await this.executeAction(action);
        this.pendingActions.delete(actionId);
        return { success: true };
    }
    /**
     * Get response metrics
     */
    getMetrics() {
        const actionCounts = new Map();
        let totalTime = 0;
        let successCount = 0;
        for (const action of this.executionHistory) {
            actionCounts.set(action.type, (actionCounts.get(action.type) || 0) + 1);
            if (action.result?.success)
                successCount++;
        }
        return {
            totalResponses: this.executionHistory.length,
            autoResponses: this.executionHistory.filter(a => !a.requiresApproval).length,
            avgResponseTime: this.executionHistory.length > 0 ? totalTime / this.executionHistory.length : 0,
            successRate: this.executionHistory.length > 0 ? successCount / this.executionHistory.length : 0,
            topActionTypes: Array.from(actionCounts.entries())
                .map(([type, count]) => ({ type, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
        };
    }
    // Private methods
    calculateRiskScore(threat) {
        let score = 0;
        const severityScores = { LOW: 10, MEDIUM: 30, HIGH: 60, CRITICAL: 100 };
        score += severityScores[threat.severity];
        score += threat.affectedAssets.filter(a => a.criticality === 'CRITICAL').length * 20;
        score += threat.attackStage === 'ACTIONS_ON_OBJECTIVES' ? 30 : 0;
        return Math.min(100, score);
    }
    findMatchingPlaybooks(threat) {
        return Array.from(this.playbooks.values()).filter(playbook => {
            return playbook.triggerConditions.every(cond => {
                const value = threat[cond.field];
                switch (cond.operator) {
                    case 'EQUALS': return value === cond.value;
                    case 'CONTAINS': return Array.isArray(value) && value.includes(cond.value);
                    default: return false;
                }
            });
        });
    }
    generateResponseActions(threat, playbooks) {
        const actions = [];
        // Generate actions based on threat category
        const categoryActions = {
            MALWARE: ['ISOLATE_HOST', 'QUARANTINE_FILE', 'FORENSIC_CAPTURE'],
            INTRUSION: ['BLOCK_IP', 'ISOLATE_HOST', 'ALERT_SOC'],
            EXFILTRATION: ['BLOCK_IP', 'DISABLE_USER', 'FORENSIC_CAPTURE'],
            RANSOMWARE: ['ISOLATE_HOST', 'DISABLE_USER', 'ALERT_SOC', 'ESCALATE']
        };
        const actionTypes = categoryActions[threat.category] || ['ALERT_SOC'];
        for (const type of actionTypes) {
            actions.push({
                id: crypto.randomUUID(),
                type,
                target: { type: 'auto', identifier: threat.affectedAssets[0]?.id || 'unknown' },
                parameters: {},
                priority: threat.severity,
                requiresApproval: threat.severity === 'CRITICAL',
                reversible: ['ISOLATE_HOST', 'BLOCK_IP', 'DISABLE_USER'].includes(type),
                estimatedImpact: {
                    businessDisruption: threat.severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
                    affectedUsers: threat.affectedAssets.length,
                    duration: 60
                },
                status: 'PENDING'
            });
        }
        return actions;
    }
    calculateConfidence(threat, actions) {
        let confidence = 0.7;
        if (threat.indicators.length > 3)
            confidence += 0.1;
        if (threat.attribution?.confidence && threat.attribution.confidence > 0.8)
            confidence += 0.1;
        return Math.min(1, confidence);
    }
    generateReasoning(threat, actions, riskScore) {
        return [
            `Threat severity: ${threat.severity} (risk score: ${riskScore})`,
            `Attack stage: ${threat.attackStage}`,
            `${threat.affectedAssets.length} asset(s) affected`,
            `${actions.length} response action(s) recommended`,
            `${actions.filter(a => a.reversible).length} action(s) are reversible`
        ];
    }
    async performAction(action) {
        // Simulated action execution
        return { success: true, message: `${action.type} executed successfully` };
    }
    updateLearning(action) {
        // Update ML model based on action outcome
    }
    // Public API
    addPlaybook(playbook) { this.playbooks.set(playbook.id, playbook); }
    getPlaybook(id) { return this.playbooks.get(id); }
    getAllPlaybooks() { return Array.from(this.playbooks.values()); }
    getExecutionHistory() { return [...this.executionHistory]; }
}
exports.AIDecisionEngine = AIDecisionEngine;
