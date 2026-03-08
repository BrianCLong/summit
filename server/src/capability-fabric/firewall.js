"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.capabilityFirewall = exports.CapabilityFirewall = void 0;
const ajv_1 = __importDefault(require("ajv"));
const crypto_1 = __importDefault(require("crypto"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const logger_js_1 = __importDefault(require("../config/logger.js"));
const registry_js_1 = require("./registry.js");
const policy_gate_js_1 = require("./policy-gate.js");
const ajv = new ajv_1.default({ allErrors: true, strict: false });
const schemaCache = new Map();
const rateLimitBuckets = new Map();
function hashPayload(payload) {
    return crypto_1.default
        .createHash('sha256')
        .update(JSON.stringify(payload ?? {}))
        .digest('hex');
}
function filterPayload(payload, allowlist, redactions) {
    const redactionActions = [];
    let filtered = { ...payload };
    if (allowlist && allowlist.length > 0) {
        filtered = allowlist.reduce((acc, key) => {
            if (payload[key] !== undefined) {
                acc[key] = payload[key];
            }
            return acc;
        }, {});
        redactionActions.push('allowlist_applied');
    }
    if (redactions && redactions.length > 0) {
        for (const key of redactions) {
            if (filtered[key] !== undefined) {
                delete filtered[key];
                redactionActions.push(`redacted:${key}`);
            }
        }
    }
    return { filtered, redactionActions };
}
function loadSchema(schemaPath) {
    const existing = schemaCache.get(schemaPath);
    if (existing) {
        return existing;
    }
    const schema = JSON.parse(node_fs_1.default.readFileSync(schemaPath, 'utf8'));
    const validate = ajv.compile(schema);
    schemaCache.set(schemaPath, validate);
    return validate;
}
function enforceRateLimit(capability) {
    const maxPerMinute = capability.risk_controls?.rate_limit?.max_per_minute;
    if (!maxPerMinute) {
        return { allowed: true, remaining: Infinity };
    }
    const now = Date.now();
    const windowMs = 60_000;
    const bucket = rateLimitBuckets.get(capability.capability_id) ?? [];
    const filtered = bucket.filter((timestamp) => now - timestamp < windowMs);
    if (filtered.length >= maxPerMinute) {
        rateLimitBuckets.set(capability.capability_id, filtered);
        return { allowed: false, remaining: 0 };
    }
    filtered.push(now);
    rateLimitBuckets.set(capability.capability_id, filtered);
    return { allowed: true, remaining: Math.max(0, maxPerMinute - filtered.length) };
}
class CapabilityFirewall {
    enforcementEnabled = process.env.CAPABILITY_FABRIC_ENFORCEMENT !== 'false';
    async preflightHttpEndpoint(method, pathValue, body, actorScopes, approvalToken, tenantId = 'system', userId = 'unknown') {
        const registry = (0, registry_js_1.loadCapabilityRegistry)();
        const capability = (0, registry_js_1.resolveCapabilityByHttp)(registry, method, pathValue);
        if (!capability) {
            const decision = {
                allowed: false,
                reason: 'capability_unregistered',
            };
            if (this.enforcementEnabled) {
                throw new Error(decision.reason);
            }
            return {
                capability: {
                    capability_id: 'unregistered',
                    name: 'unregistered',
                    description: 'unregistered',
                    business_domain: 'unknown',
                    owner_team: 'unknown',
                    repo: 'unknown',
                    service: 'unknown',
                    data_classification: 'internal',
                    allowed_identities: [],
                    operations: [],
                },
                decision,
                sanitizedArgs: body,
                inputHash: hashPayload(body),
            };
        }
        const allowed = capability.allowed_identities?.some((identity) => actorScopes.includes(identity));
        if (!allowed) {
            const decision = {
                allowed: false,
                reason: 'identity_not_allowed',
                capability_id: capability.capability_id,
            };
            if (this.enforcementEnabled) {
                throw new Error(decision.reason);
            }
            return {
                capability,
                decision,
                sanitizedArgs: body,
                inputHash: hashPayload(body),
            };
        }
        const requiresApproval = capability.risk_controls?.approvals_required ||
            capability.data_classification === 'restricted';
        if (requiresApproval && !approvalToken) {
            const decision = {
                allowed: false,
                reason: 'approval_required',
                capability_id: capability.capability_id,
                approvals_required: true,
            };
            if (this.enforcementEnabled) {
                throw new Error(decision.reason);
            }
            return {
                capability,
                decision,
                sanitizedArgs: body,
                inputHash: hashPayload(body),
            };
        }
        const { allowed: withinRate, remaining } = enforceRateLimit(capability);
        if (!withinRate) {
            const decision = {
                allowed: false,
                reason: 'rate_limited',
                capability_id: capability.capability_id,
                rate_limit_remaining: remaining,
            };
            if (this.enforcementEnabled) {
                throw new Error(decision.reason);
            }
            return {
                capability,
                decision,
                sanitizedArgs: body,
                inputHash: hashPayload(body),
            };
        }
        const allowlist = capability.risk_controls?.allowlist_fields;
        const redactions = capability.risk_controls?.redaction_fields;
        const { filtered, redactionActions } = filterPayload(body, allowlist, redactions);
        if (capability.schemas?.input_schema_ref) {
            const schemaPath = node_path_1.default.resolve(process.cwd(), capability.schemas.input_schema_ref);
            const validator = loadSchema(schemaPath);
            const valid = validator(filtered);
            if (!valid) {
                const decision = {
                    allowed: false,
                    reason: 'input_schema_invalid',
                    capability_id: capability.capability_id,
                };
                if (this.enforcementEnabled) {
                    throw new Error(decision.reason);
                }
                return {
                    capability,
                    decision,
                    sanitizedArgs: filtered,
                    inputHash: hashPayload(filtered),
                };
            }
        }
        const policyDecision = await (0, policy_gate_js_1.evaluateCapabilityPolicy)(capability, {
            tenantId,
            userId,
            role: 'agent',
            scopes: actorScopes,
            approvalToken,
        });
        if (!policyDecision.allow) {
            const decision = {
                allowed: false,
                reason: `policy_denied:${policyDecision.reason}`,
                capability_id: capability.capability_id,
            };
            if (this.enforcementEnabled) {
                throw new Error(decision.reason);
            }
            return {
                capability,
                decision,
                sanitizedArgs: filtered,
                inputHash: hashPayload(filtered),
            };
        }
        const decision = {
            allowed: true,
            reason: 'allowed',
            capability_id: capability.capability_id,
            policy_refs: capability.policy_refs,
            approvals_required: requiresApproval,
            redaction_actions: redactionActions,
            rate_limit_remaining: remaining,
        };
        return {
            capability,
            decision,
            sanitizedArgs: filtered,
            inputHash: hashPayload(filtered),
        };
    }
    async preflightMcpInvoke(server, tool, args, sessionScopes, approvalToken, tenantId = 'system', userId = 'unknown') {
        const registry = (0, registry_js_1.loadCapabilityRegistry)();
        const capability = (0, registry_js_1.resolveCapabilityByMcp)(registry, server, tool);
        if (!capability) {
            const decision = {
                allowed: false,
                reason: 'capability_unregistered',
            };
            if (this.enforcementEnabled) {
                throw new Error(decision.reason);
            }
            return {
                capability: {
                    capability_id: 'unregistered',
                    name: 'unregistered',
                    description: 'unregistered',
                    business_domain: 'unknown',
                    owner_team: 'unknown',
                    repo: 'unknown',
                    service: 'unknown',
                    data_classification: 'internal',
                    allowed_identities: [],
                    operations: [],
                },
                decision,
                sanitizedArgs: args,
                inputHash: hashPayload(args),
            };
        }
        const allowed = capability.allowed_identities?.some((identity) => sessionScopes.includes(identity));
        if (!allowed) {
            const decision = {
                allowed: false,
                reason: 'identity_not_allowed',
                capability_id: capability.capability_id,
            };
            if (this.enforcementEnabled) {
                throw new Error(decision.reason);
            }
            return {
                capability,
                decision,
                sanitizedArgs: args,
                inputHash: hashPayload(args),
            };
        }
        const requiresApproval = capability.risk_controls?.approvals_required ||
            capability.data_classification === 'restricted';
        if (requiresApproval && !approvalToken) {
            const decision = {
                allowed: false,
                reason: 'approval_required',
                capability_id: capability.capability_id,
                approvals_required: true,
            };
            if (this.enforcementEnabled) {
                throw new Error(decision.reason);
            }
            return {
                capability,
                decision,
                sanitizedArgs: args,
                inputHash: hashPayload(args),
            };
        }
        const { allowed: withinRate, remaining } = enforceRateLimit(capability);
        if (!withinRate) {
            const decision = {
                allowed: false,
                reason: 'rate_limited',
                capability_id: capability.capability_id,
                rate_limit_remaining: remaining,
            };
            if (this.enforcementEnabled) {
                throw new Error(decision.reason);
            }
            return {
                capability,
                decision,
                sanitizedArgs: args,
                inputHash: hashPayload(args),
            };
        }
        const allowlist = capability.risk_controls?.allowlist_fields;
        const redactions = capability.risk_controls?.redaction_fields;
        const { filtered, redactionActions } = filterPayload(args, allowlist, redactions);
        if (capability.schemas?.input_schema_ref) {
            const schemaPath = node_path_1.default.resolve(process.cwd(), capability.schemas.input_schema_ref);
            const validator = loadSchema(schemaPath);
            const valid = validator({ server, tool, args: filtered });
            if (!valid) {
                const decision = {
                    allowed: false,
                    reason: 'input_schema_invalid',
                    capability_id: capability.capability_id,
                };
                if (this.enforcementEnabled) {
                    throw new Error(decision.reason);
                }
                return {
                    capability,
                    decision,
                    sanitizedArgs: filtered,
                    inputHash: hashPayload(filtered),
                };
            }
        }
        const policyDecision = await (0, policy_gate_js_1.evaluateCapabilityPolicy)(capability, {
            tenantId,
            userId,
            role: 'agent',
            scopes: sessionScopes,
            approvalToken,
        });
        if (!policyDecision.allow) {
            const decision = {
                allowed: false,
                reason: `policy_denied:${policyDecision.reason}`,
                capability_id: capability.capability_id,
            };
            if (this.enforcementEnabled) {
                throw new Error(decision.reason);
            }
            return {
                capability,
                decision,
                sanitizedArgs: filtered,
                inputHash: hashPayload(filtered),
            };
        }
        const decision = {
            allowed: true,
            reason: 'allowed',
            capability_id: capability.capability_id,
            policy_refs: capability.policy_refs,
            approvals_required: requiresApproval,
            redaction_actions: redactionActions,
            rate_limit_remaining: remaining,
        };
        return {
            capability,
            decision,
            sanitizedArgs: filtered,
            inputHash: hashPayload(filtered),
        };
    }
    postflightMcpInvoke(capability, server, tool, result) {
        const allowlist = capability.risk_controls?.allowlist_fields;
        const redactions = capability.risk_controls?.redaction_fields;
        const { filtered, redactionActions } = filterPayload(result, allowlist, redactions);
        if (capability.schemas?.output_schema_ref) {
            const schemaPath = node_path_1.default.resolve(process.cwd(), capability.schemas.output_schema_ref);
            const validator = loadSchema(schemaPath);
            const valid = validator({
                server,
                tool,
                result: filtered,
            });
            if (!valid && this.enforcementEnabled) {
                throw new Error('output_schema_invalid');
            }
        }
        const decision = {
            allowed: true,
            reason: 'allowed',
            capability_id: capability.capability_id,
            policy_refs: capability.policy_refs,
            redaction_actions: redactionActions,
        };
        return {
            decision,
            outputHash: hashPayload(filtered),
            sanitizedResult: filtered,
        };
    }
    logDecision(decision, inputHash, outputHash) {
        logger_js_1.default.info('Capability firewall decision', {
            decision,
            inputHash,
            outputHash,
        });
    }
}
exports.CapabilityFirewall = CapabilityFirewall;
exports.capabilityFirewall = new CapabilityFirewall();
