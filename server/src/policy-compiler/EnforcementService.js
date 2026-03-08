"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnforcementService = void 0;
const crypto_1 = require("crypto");
const types_js_1 = require("./types.js");
const PolicyCompiler_js_1 = require("./PolicyCompiler.js");
/**
 * Epic C3: Runtime Enforcement Service
 *
 * Evaluates requests against the compiled policy plan.
 */
class EnforcementService {
    static instance;
    currentPlan = null;
    compiler;
    constructor() {
        this.compiler = PolicyCompiler_js_1.PolicyCompiler.getInstance();
    }
    static getInstance() {
        if (!EnforcementService.instance) {
            EnforcementService.instance = new EnforcementService();
        }
        return EnforcementService.instance;
    }
    /**
     * Load a policy spec and compile it into the active plan.
     */
    loadPolicy(spec) {
        this.currentPlan = this.compiler.compile(spec);
    }
    /**
     * Evaluate a Query request
     */
    evaluateQuery(context, plan = this.currentPlan) {
        return this.evaluateAction(context, 'query', plan);
    }
    /**
     * Evaluate an Export request
     */
    evaluateExport(context, plan = this.currentPlan) {
        return this.evaluateAction(context, 'export', plan);
    }
    /**
     * Evaluate a Runbook Step execution
     */
    evaluateRunbookStep(context, plan = this.currentPlan) {
        return this.evaluateAction(context, 'runbook', plan);
    }
    evaluateAction(context, type, plan) {
        const decisionId = (0, crypto_1.randomUUID)();
        if (!plan) {
            // Fail safe: Strict mode requires a policy.
            return {
                allowed: false,
                reason: {
                    code: 'NO_POLICY_LOADED',
                    humanMessage: 'System is in strict mode but no policy is loaded.',
                    remediationSteps: []
                },
                decisionId
            };
        }
        // 0. Check Purpose Constraints (Global)
        if (context.purpose) {
            const purposeDef = plan.purposeRegistry[context.purpose];
            if (purposeDef) {
                // If purpose is defined, action must be in allowedUses
                // We assume allowedUses contains specific actions or categories.
                // For strict matching:
                const isAllowed = purposeDef.allowedUses.includes(context.action.target) ||
                    purposeDef.allowedUses.includes(type); // Allow by category (e.g. 'query')
                if (!isAllowed) {
                    return {
                        allowed: false,
                        reason: {
                            code: 'PURPOSE_MISMATCH',
                            humanMessage: `Purpose '${context.purpose}' does not authorize action '${context.action.target}'.`,
                            remediationSteps: [{
                                    action: "Change Purpose",
                                    details: `Select a purpose that allows '${context.action.target}' or request policy update.`
                                }]
                        },
                        decisionId
                    };
                }
            }
            else {
                // Purpose provided but not found in registry.
                // Should we allow or deny? Strict: Deny.
                return {
                    allowed: false,
                    reason: {
                        code: 'INVALID_PURPOSE',
                        humanMessage: `The purpose '${context.purpose}' is not recognized by the current policy.`,
                        remediationSteps: []
                    },
                    decisionId
                };
            }
        }
        // 1. Retention Filters (Query only)
        let modifications;
        if (type === 'query') {
            // Check if target matches a retention rule
            // Assuming target might be a dataType or we have a mapping.
            // For MVP, if target matches a key in retentionRegistry, we enforce.
            const retentionRule = plan.retentionRegistry[context.action.target];
            if (retentionRule) {
                if (!modifications)
                    modifications = { redactFields: [], filterClauses: [] };
                // Generate a filter clause
                // e.g. "created_at > NOW() - retentionDays"
                modifications.filterClauses.push(`age_in_days <= ${retentionRule.retentionDays}`);
            }
        }
        let ruleTable;
        switch (type) {
            case 'query':
                ruleTable = plan.queryRules;
                break;
            case 'export':
                ruleTable = plan.exportRules;
                break;
            case 'runbook':
                ruleTable = plan.runbookRules;
                break;
        }
        // 2. Evaluate Specific Rules
        const actionKey = context.action.target;
        const rule = ruleTable[actionKey];
        if (!rule) {
            // Default Behavior:
            // If we are strictly governing 'authorityRequiredFor', then absence means no authority needed.
            // However, C1.2 says "Missing tag defaults to most restrictive".
            // If the resource is sensitive (context should tell us, but context doesn't have sensitivity explicitly, only the Policy inputs defined it).
            // We assume if no rule exists, it's ALLOWED (Public/Internal default).
            // A "Restricted" resource should have a rule generated by the compiler.
            return { allowed: true, decisionId, modifications };
        }
        if (rule.decision === types_js_1.EnforcementDecision.DENY) {
            return {
                allowed: false,
                reason: rule.denialReason,
                decisionId
            };
        }
        if (rule.decision === types_js_1.EnforcementDecision.CONDITIONAL && rule.conditions) {
            for (const condition of rule.conditions) {
                const passed = this.evaluateCondition(condition, context);
                if (!passed) {
                    return {
                        allowed: false,
                        reason: rule.denialReason,
                        decisionId
                    };
                }
            }
        }
        return { allowed: true, decisionId, modifications };
    }
    evaluateCondition(condition, context) {
        switch (condition.type) {
            case 'authority':
                if (condition.operator === 'contains') {
                    return (context.activeAuthority || []).includes(condition.value);
                }
                break;
            // Future: Attribute-based checks
        }
        return false;
    }
}
exports.EnforcementService = EnforcementService;
