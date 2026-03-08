"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyCompiler = void 0;
const crypto_1 = require("crypto");
const types_js_1 = require("./types.js");
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
     * Compiles a set of policies into a deterministic JSON IR.
     */
    compile(policies) {
        const sortedPolicies = [...policies].sort((a, b) => a.id.localeCompare(b.id));
        // Default IR state
        const ir = {
            version: '1.0.0',
            compiledAt: new Date().toISOString(),
            hash: '',
            allowedEntities: ['*'], // Default allow all entities unless restricted
            allowedEdges: ['*'],
            deniedSelectors: [],
            redactions: {},
            retentionLimit: -1, // No limit
            exportAllowed: true,
            activePolicies: sortedPolicies.map(p => p.id),
            clausesUsed: sortedPolicies.flatMap(p => p.clauses.map(c => c.id)).sort()
        };
        // Apply Policies
        for (const policy of sortedPolicies) {
            this.applySelectors(ir, policy.selectors);
            if (policy.type === types_js_1.PolicyType.LICENSE) {
                this.applyLicense(ir, policy);
            }
            // Retention (take the shortest/strictest)
            if (policy.retention && policy.retention !== 'forever') {
                const seconds = this.parseDuration(policy.retention);
                if (ir.retentionLimit === -1 || seconds < ir.retentionLimit) {
                    ir.retentionLimit = seconds;
                }
            }
        }
        // Compute deterministic hash
        // We remove the hash field itself and compiledAt before hashing to ensure content-based hashing
        const contentToHash = {
            ...ir,
            compiledAt: undefined,
            hash: undefined
        };
        ir.hash = (0, crypto_1.createHash)('sha256').update(JSON.stringify(contentToHash)).digest('hex');
        return ir;
    }
    applySelectors(ir, selectors) {
        for (const selector of selectors) {
            if (selector.type === 'entity' && !selector.allow) {
                // If denied, we add to denied list (implementing simplistic deny logic)
                // In a real system, we'd have a more complex ACL
                ir.deniedSelectors.push(`entity:${selector.value}`);
            }
            if (selector.type === 'source' && !selector.allow) {
                ir.deniedSelectors.push(`source:${selector.value}`);
            }
        }
    }
    applyLicense(ir, license) {
        if (license.grants && !license.grants.includes('export')) {
            ir.exportAllowed = false;
        }
        if (license.revocations && license.revocations.includes('export')) {
            ir.exportAllowed = false;
        }
    }
    parseDuration(duration) {
        // Simplistic parser for P1Y, P30D, etc.
        // For MVP, assuming "P<number>D"
        if (duration.startsWith('P') && duration.endsWith('D')) {
            const days = parseInt(duration.substring(1, duration.length - 1));
            return days * 24 * 60 * 60;
        }
        return -1;
    }
}
exports.PolicyCompiler = PolicyCompiler;
