"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyCompiler = void 0;
const crypto_1 = require("crypto");
const types_js_1 = require("./types.js");
/**
 * Epic C2: Policy Compiler
 *
 * Compiles high-level policy specifications into deterministic enforcement plans.
 */
class PolicyCompiler {
    static instance;
    constructor() { }
    static getInstance() {
        if (!PolicyCompiler.instance) {
            PolicyCompiler.instance = new PolicyCompiler();
        }
        return PolicyCompiler.instance;
    }
    /**
     * Compiles a PolicySpec into an executable EnforcementPlan.
     * This process is deterministic: same input -> same output hash.
     */
    compile(spec) {
        this.validateSpec(spec);
        const compiledAt = new Date();
        // Generate decision tables
        const queryRules = this.compileQueryRules(spec);
        const exportRules = this.compileExportRules(spec);
        const runbookRules = this.compileRunbookRules(spec);
        // Compile global registries
        const purposeRegistry = {};
        for (const tag of spec.purposeTags) {
            purposeRegistry[tag.tag] = { allowedUses: tag.allowedUses };
        }
        const retentionRegistry = {};
        for (const rule of spec.retentionRules) {
            retentionRegistry[rule.dataType] = rule;
        }
        // Calculate deterministic hash
        // Requirement: "same inputs -> same plan hash"
        const planHash = this.calculateHash({
            spec
        });
        return {
            policyVersion: spec.version,
            compiledAt,
            planHash,
            queryRules,
            exportRules,
            runbookRules,
            purposeRegistry,
            retentionRegistry
        };
    }
    validateSpec(spec) {
        if (!spec.version)
            throw new Error("Policy version is required");
        if (!spec.tenantId)
            throw new Error("Tenant ID is required");
    }
    calculateHash(data) {
        return (0, crypto_1.createHash)('sha256').update(JSON.stringify(data)).digest('hex');
    }
    mergeRule(rules, key, newEntry) {
        if (!rules[key]) {
            rules[key] = newEntry;
            return;
        }
        const existing = rules[key];
        // If either is explicit DENY, result is DENY
        if (newEntry.decision === types_js_1.EnforcementDecision.DENY) {
            existing.decision = types_js_1.EnforcementDecision.DENY;
            existing.denialReason = newEntry.denialReason;
            existing.conditions = []; // Unconditional deny overrides conditions
            return;
        }
        // If both are CONDITIONAL (or one is), merge conditions (AND logic)
        if (newEntry.conditions && newEntry.conditions.length > 0) {
            if (!existing.conditions)
                existing.conditions = [];
            existing.conditions.push(...newEntry.conditions);
            // If existing was ALLOW, it becomes CONDITIONAL
            if (existing.decision === types_js_1.EnforcementDecision.ALLOW) {
                existing.decision = types_js_1.EnforcementDecision.CONDITIONAL;
            }
            // Update denial reason if missing
            if (!existing.denialReason) {
                existing.denialReason = newEntry.denialReason;
            }
        }
    }
    /**
     * Compile rules for Query actions (Graph access, search)
     */
    compileQueryRules(spec) {
        const rules = {};
        // 1. Authority Requirements
        for (const req of spec.authorityRequiredFor) {
            this.mergeRule(rules, req.action, {
                decision: types_js_1.EnforcementDecision.CONDITIONAL,
                conditions: [{
                        type: 'authority',
                        key: 'authorityType',
                        operator: 'contains',
                        value: req.authorityType
                    }],
                denialReason: this.createAuthorityDenial(req)
            });
        }
        return rules;
    }
    /**
     * Compile rules for Export actions (Wallet export, download)
     */
    compileExportRules(spec) {
        const rules = {};
        // License Constraints
        for (const constraint of spec.licenseConstraints) {
            const ruleKey = `source:${constraint.source}`;
            if (constraint.forbiddenActions && constraint.forbiddenActions.includes('export')) {
                this.mergeRule(rules, ruleKey, {
                    decision: types_js_1.EnforcementDecision.DENY,
                    denialReason: {
                        code: 'LICENSE_RESTRICTION',
                        humanMessage: `Data from source '${constraint.source}' cannot be exported under current license.`,
                        remediationSteps: [{
                                action: "Remove Data",
                                details: `Exclude data from ${constraint.source} in your export selection.`
                            }]
                    }
                });
            }
        }
        return rules;
    }
    /**
     * Compile rules for Runbook automation steps
     */
    compileRunbookRules(spec) {
        const rules = {};
        for (const req of spec.authorityRequiredFor) {
            if (req.action.startsWith('runbook:')) {
                this.mergeRule(rules, req.action, {
                    decision: types_js_1.EnforcementDecision.CONDITIONAL,
                    conditions: [{
                            type: 'authority',
                            key: 'authorityType',
                            operator: 'contains',
                            value: req.authorityType
                        }],
                    denialReason: this.createAuthorityDenial(req)
                });
            }
        }
        return rules;
    }
    createAuthorityDenial(req) {
        return {
            code: 'MISSING_AUTHORITY',
            humanMessage: `Action '${req.action}' requires attached authority of type '${req.authorityType}'.`,
            remediationSteps: [
                {
                    action: "Attach Authority",
                    details: `Link a valid ${req.authorityType} (e.g. Warrant, Consent) to this operation.`
                }
            ],
            appealRoute: '/compliance/appeals/new'
        };
    }
}
exports.PolicyCompiler = PolicyCompiler;
