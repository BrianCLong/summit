"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyGuard = void 0;
const logger_js_1 = require("../utils/logger.js");
class PolicyGuard {
    policies = [
        // Budget policies
        {
            name: 'budget-limit',
            check: (task) => task.budgetUSD <= 50,
            reason: 'Task budget exceeds maximum allowed ($50)',
            severity: 'critical',
        },
        // Security policies
        {
            name: 'no-credential-access',
            check: (task) => !this.containsCredentialPatterns(task),
            reason: 'Task appears to involve credential access or secrets',
            severity: 'critical',
        },
        // License compliance
        {
            name: 'license-compliance',
            check: (task) => this.checkLicenseCompliance(task),
            reason: 'Task may involve restricted license code',
            severity: 'high',
        },
        // Resource limits
        {
            name: 'reasonable-scope',
            check: (task) => this.checkReasonableScope(task),
            reason: 'Task scope appears too broad or risky',
            severity: 'medium',
        },
        // Data residency
        {
            name: 'data-residency',
            check: (task) => this.checkDataResidency(task),
            reason: 'Task involves data that must remain in specified region',
            severity: 'high',
        },
    ];
    async checkPolicy(task) {
        logger_js_1.logger.debug('Running policy checks', {
            taskKind: task.kind,
            repo: task.repo,
        });
        for (const policy of this.policies) {
            try {
                const allowed = await policy.check(task);
                if (!allowed) {
                    logger_js_1.logger.warn('Policy violation detected', {
                        policy: policy.name,
                        severity: policy.severity,
                        reason: policy.reason,
                        task: task.kind,
                    });
                    return {
                        allowed: false,
                        reason: `Policy '${policy.name}': ${policy.reason}`,
                        confidence: policy.severity === 'critical' ? 1.0 : 0.8,
                    };
                }
            }
            catch (error) {
                logger_js_1.logger.error('Policy check failed', {
                    policy: policy.name,
                    error: error.message,
                });
                return {
                    allowed: false,
                    reason: `Policy check error: ${policy.name}`,
                    confidence: 0.9,
                };
            }
        }
        logger_js_1.logger.debug('All policy checks passed', { task: task.kind });
        return {
            allowed: true,
            confidence: 0.95,
        };
    }
    containsCredentialPatterns(task) {
        const dangerousPatterns = [
            /password/i,
            /secret/i,
            /api[_\-]?key/i,
            /token/i,
            /credential/i,
            /private[_\-]?key/i,
            /ssh[_\-]?key/i,
            /\.pem$/i,
            /\.key$/i,
            /wallet/i,
            /crypto.*key/i,
        ];
        const contextStr = JSON.stringify(task.context).toLowerCase();
        const issueStr = task.issue.toLowerCase();
        return dangerousPatterns.some((pattern) => pattern.test(contextStr) || pattern.test(issueStr));
    }
    checkLicenseCompliance(task) {
        // Check for restricted license patterns in context
        const restrictedLicenses = [
            /gpl/i,
            /agpl/i,
            /copyleft/i,
            /commercial.*only/i,
            /proprietary/i,
        ];
        const contextStr = JSON.stringify(task.context);
        // Allow if no license issues detected
        return !restrictedLicenses.some((pattern) => pattern.test(contextStr));
    }
    checkReasonableScope(task) {
        const riskyPatterns = [
            /delete.*database/i,
            /drop.*table/i,
            /rm\s+-rf/i,
            /system.*call/i,
            /exec.*command/i,
            /eval.*code/i,
            /migrate.*all/i,
            /reset.*production/i,
        ];
        const contextStr = JSON.stringify(task.context);
        const issueStr = task.issue;
        return !riskyPatterns.some((pattern) => pattern.test(contextStr) || pattern.test(issueStr));
    }
    checkDataResidency(task) {
        const context = task.context;
        // If data residency is specified, ensure it's compliant
        if (context.dataResidency) {
            const allowedRegions = ['US', 'EU', 'GLOBAL'];
            return allowedRegions.includes(context.dataResidency);
        }
        // Default to allowed if no residency specified
        return true;
    }
    // Add new policy dynamically
    addPolicy(policy) {
        this.policies.push(policy);
        logger_js_1.logger.info('Policy added', { name: policy.name });
    }
    // Remove policy
    removePolicy(name) {
        this.policies = this.policies.filter((p) => p.name !== name);
        logger_js_1.logger.info('Policy removed', { name });
    }
    // Get all policies
    getPolicies() {
        return [...this.policies];
    }
}
exports.PolicyGuard = PolicyGuard;
