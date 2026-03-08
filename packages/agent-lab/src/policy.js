"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyAdapterRegistry = exports.BasicPolicyEngine = void 0;
const url_1 = require("url");
const DEFAULT_POLICY_VERSION = '1.0.0';
const matchTarget = (target, allowlist) => {
    return allowlist.some((allowed) => {
        if (!allowed)
            return false;
        if (allowed === '*')
            return true;
        if (target === allowed)
            return true;
        if (target.endsWith(`.${allowed}`))
            return true;
        return false;
    });
};
class BasicPolicyEngine {
    config;
    calls = [];
    constructor(config = {}) {
        this.config = config;
    }
    enforceRateLimit() {
        const { rateLimit } = this.config;
        if (!rateLimit)
            return true;
        const now = Date.now();
        const windowStart = now - rateLimit.intervalMs;
        while (this.calls.length && this.calls[0] < windowStart) {
            this.calls.shift();
        }
        if (this.calls.length >= rateLimit.maxCalls) {
            return false;
        }
        this.calls.push(now);
        return true;
    }
    evaluate(context) {
        if (!this.enforceRateLimit()) {
            return {
                allowed: false,
                reason: 'Rate limit exceeded',
                policyVersion: DEFAULT_POLICY_VERSION,
            };
        }
        if (this.config.allowedTools && !this.config.allowedTools.includes(context.tool)) {
            return {
                allowed: false,
                reason: `Tool ${context.tool} is not allowlisted`,
                policyVersion: DEFAULT_POLICY_VERSION,
            };
        }
        if (context.command && this.config.commandAllowlist) {
            if (!this.config.commandAllowlist.includes(context.command)) {
                return {
                    allowed: false,
                    reason: `Command ${context.command} is not allowlisted`,
                    policyVersion: DEFAULT_POLICY_VERSION,
                };
            }
        }
        if (context.target && this.config.targetAllowlist) {
            const targetHost = (() => {
                try {
                    const url = new url_1.URL(context.target);
                    return url.hostname;
                }
                catch (err) {
                    return context.target;
                }
            })();
            if (!matchTarget(targetHost, this.config.targetAllowlist)) {
                return {
                    allowed: false,
                    reason: `Target ${targetHost} is not allowlisted`,
                    policyVersion: DEFAULT_POLICY_VERSION,
                };
            }
        }
        const reason = context.labMode === true ? 'Allowed by policy' : 'Dry-run approval (lab mode disabled)';
        return {
            allowed: true,
            reason,
            policyVersion: DEFAULT_POLICY_VERSION,
        };
    }
}
exports.BasicPolicyEngine = BasicPolicyEngine;
class PolicyAdapterRegistry {
    adapters = {};
    register(name, engine) {
        this.adapters[name] = engine;
    }
    get(name) {
        return this.adapters[name];
    }
}
exports.PolicyAdapterRegistry = PolicyAdapterRegistry;
