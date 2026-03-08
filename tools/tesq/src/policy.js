"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyEngine = void 0;
const DEFAULT_OUTPUT_LIMIT = 64 * 1024; // 64 KiB
function createEmptyPolicy(tenantId) {
    return {
        tenantId,
        quotas: new Map(),
        allowAllSyscalls: false,
        allowedSyscalls: new Set(),
        deniedSyscalls: new Set(),
        allowAllNetwork: false,
        deniedAllNetwork: false,
        allowedNetworkDestinations: new Set(),
        outputMaxBytes: DEFAULT_OUTPUT_LIMIT
    };
}
function clonePolicy(policy, tenantId) {
    return {
        tenantId: tenantId ?? policy.tenantId,
        quotas: new Map(policy.quotas),
        allowAllSyscalls: policy.allowAllSyscalls,
        allowedSyscalls: new Set(policy.allowedSyscalls),
        deniedSyscalls: new Set(policy.deniedSyscalls),
        allowAllNetwork: policy.allowAllNetwork,
        deniedAllNetwork: policy.deniedAllNetwork,
        allowedNetworkDestinations: new Set(policy.allowedNetworkDestinations),
        outputMaxBytes: policy.outputMaxBytes
    };
}
class PolicyEngine {
    quotaManager;
    policies = new Map();
    constructor(policySource, quotaManager) {
        this.quotaManager = quotaManager;
        this.load(policySource);
    }
    load(policySource) {
        this.policies.clear();
        const sanitized = policySource.replace(/\r/g, '');
        const lines = sanitized.split('\n');
        let currentPolicy = null;
        for (const rawLine of lines) {
            const line = rawLine.replace(/#.*/, '').trim();
            if (!line) {
                continue;
            }
            if (/^tenant\s+/i.test(line) && line.endsWith('{')) {
                const match = line.match(/^tenant\s+([\w*\-]+)\s*\{$/i);
                if (!match || !match[1]) {
                    throw new Error(`Invalid tenant declaration: ${rawLine}`);
                }
                currentPolicy = createEmptyPolicy(match[1]);
                this.policies.set(currentPolicy.tenantId, currentPolicy);
                continue;
            }
            if (line === '}') {
                currentPolicy = null;
                continue;
            }
            if (!currentPolicy) {
                throw new Error(`Statement outside tenant block: ${rawLine}`);
            }
            this.parseStatement(currentPolicy, line.replace(/;$/, ''));
        }
        if (this.quotaManager) {
            for (const policy of this.policies.values()) {
                for (const [toolName, rule] of policy.quotas.entries()) {
                    this.quotaManager.registerLimit(policy.tenantId, toolName, rule);
                }
            }
        }
    }
    parseStatement(policy, statement) {
        if (/^quota\s+/i.test(statement)) {
            this.parseQuota(policy, statement);
            return;
        }
        if (/^allow_syscalls\s+/i.test(statement)) {
            const value = statement.replace(/^allow_syscalls\s+/i, '').trim();
            if (value.toLowerCase() === 'any') {
                policy.allowAllSyscalls = true;
                return;
            }
            value.split(',').map((s) => s.trim()).filter(Boolean).forEach((syscall) => {
                policy.allowedSyscalls.add(syscall);
            });
            return;
        }
        if (/^deny_syscalls\s+/i.test(statement)) {
            const value = statement.replace(/^deny_syscalls\s+/i, '').trim();
            value.split(',').map((s) => s.trim()).filter(Boolean).forEach((syscall) => {
                policy.deniedSyscalls.add(syscall);
            });
            return;
        }
        if (/^allow_network\s+/i.test(statement)) {
            const value = statement.replace(/^allow_network\s+/i, '').trim();
            if (value.toLowerCase() === 'any') {
                policy.allowAllNetwork = true;
                return;
            }
            value.split(',').map((s) => s.trim()).filter(Boolean).forEach((destination) => {
                policy.allowedNetworkDestinations.add(destination);
            });
            return;
        }
        if (/^deny_network\s+/i.test(statement)) {
            const value = statement.replace(/^deny_network\s+/i, '').trim();
            if (value.toLowerCase() === 'all') {
                policy.deniedAllNetwork = true;
                return;
            }
            value.split(',').map((s) => s.trim()).filter(Boolean).forEach((destination) => {
                policy.allowedNetworkDestinations.delete(destination);
            });
            return;
        }
        if (/^output_max\s+/i.test(statement)) {
            const value = statement.replace(/^output_max\s+/i, '').trim();
            const limit = Number.parseInt(value, 10);
            if (Number.isNaN(limit) || limit <= 0) {
                throw new Error(`Invalid output_max value: ${statement}`);
            }
            policy.outputMaxBytes = limit;
            return;
        }
        throw new Error(`Unrecognized policy statement: ${statement}`);
    }
    parseQuota(policy, statement) {
        const match = statement.match(/^quota\s+(\S+)\s+(\d+)(?:\s+per\s+([\w\-]+))?$/i);
        if (!match || !match[1] || !match[2]) {
            throw new Error(`Invalid quota statement: ${statement}`);
        }
        const [, toolName, limitStr, window] = match;
        const limit = Number.parseInt(limitStr, 10);
        if (Number.isNaN(limit) || limit < 0) {
            throw new Error(`Invalid quota limit in statement: ${statement}`);
        }
        const rule = {
            limit,
            window: window ?? undefined
        };
        policy.quotas.set(toolName, rule);
    }
    getPolicyForTenant(tenantId) {
        if (this.policies.has(tenantId)) {
            return clonePolicy(this.policies.get(tenantId));
        }
        if (this.policies.has('*')) {
            const base = this.policies.get('*');
            return clonePolicy(base, tenantId);
        }
        if (this.policies.has('default')) {
            const base = this.policies.get('default');
            return clonePolicy(base, tenantId);
        }
        return createEmptyPolicy(tenantId);
    }
    evaluate(request, tool, quotaManager) {
        const policy = this.getPolicyForTenant(request.tenantId);
        const requiredSyscalls = tool.metadata.requiredSyscalls ?? [];
        for (const syscall of requiredSyscalls) {
            if (policy.deniedSyscalls.has(syscall)) {
                return {
                    allowed: false,
                    reason: `Syscall ${syscall} denied by policy`,
                    policy
                };
            }
            if (!policy.allowAllSyscalls && !policy.allowedSyscalls.has(syscall)) {
                return {
                    allowed: false,
                    reason: `Syscall ${syscall} not allowlisted`,
                    policy
                };
            }
        }
        const networkDestinations = tool.metadata.networkDestinations ?? [];
        if (policy.deniedAllNetwork && networkDestinations.length > 0) {
            return {
                allowed: false,
                reason: 'Network egress denied by policy',
                policy
            };
        }
        if (!policy.allowAllNetwork) {
            for (const destination of networkDestinations) {
                if (!policy.allowedNetworkDestinations.has(destination)) {
                    return {
                        allowed: false,
                        reason: `Network destination ${destination} not allowlisted`,
                        policy
                    };
                }
            }
        }
        const maxOutput = tool.metadata.maxOutputBytes;
        if (maxOutput && maxOutput > policy.outputMaxBytes) {
            return {
                allowed: false,
                reason: `Tool output budget ${maxOutput} exceeds policy limit ${policy.outputMaxBytes}`,
                policy
            };
        }
        const quotaRule = policy.quotas.get(tool.name);
        if (quotaRule && !quotaManager.checkAndConsume(request.tenantId, tool.name, quotaRule.limit)) {
            return {
                allowed: false,
                reason: `Quota exceeded for ${tool.name}`,
                policy
            };
        }
        return {
            allowed: true,
            policy
        };
    }
    listPolicies() {
        return Array.from(this.policies.values()).map((policy) => clonePolicy(policy));
    }
}
exports.PolicyEngine = PolicyEngine;
