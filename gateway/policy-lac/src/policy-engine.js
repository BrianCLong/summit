"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPolicy = loadPolicy;
exports.evaluate = evaluate;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ajv_1 = __importDefault(require("ajv"));
const ajv = new ajv_1.default({ allErrors: true, strict: true });
const schema = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, '..', 'policies', 'schema', 'policy.schema.json'), 'utf8'));
const validate = ajv.compile(schema);
function loadPolicy(policyPath) {
    const raw = JSON.parse(fs_1.default.readFileSync(policyPath, 'utf8'));
    if (!validate(raw)) {
        const errors = ajv.errorsText(validate.errors);
        throw new Error('Policy schema invalid: ' + errors);
    }
    return raw;
}
function matches(str, pattern) {
    if (pattern.endsWith('*'))
        return str.startsWith(pattern.slice(0, -1));
    return str === pattern;
}
function evaluate(policy, ctx) {
    let allowHit = null;
    let denyHit = null;
    for (const r of policy.rules) {
        const actionOk = r.actions.some((a) => matches(ctx.action, a));
        const resourceOk = r.resources.some((p) => matches(ctx.resource, p));
        if (!(actionOk && resourceOk))
            continue;
        const { purpose, labels, sensitivityAtMost, timeWindow } = r.conditions || {};
        if (purpose && (!ctx.attributes.purpose || !purpose.includes(ctx.attributes.purpose)))
            continue;
        if (labels && (!Array.isArray(ctx.attributes.labels) || !labels.every((l) => ctx.attributes.labels.includes(l))))
            continue;
        if (sensitivityAtMost && (ctx.attributes.sensitivity || 'S0') > sensitivityAtMost)
            continue;
        if (timeWindow) {
            const now = new Date();
            if (Number.isNaN(Date.parse(timeWindow.start)) || Number.isNaN(Date.parse(timeWindow.end)))
                continue;
            if (now < new Date(timeWindow.start) || now > new Date(timeWindow.end))
                continue;
        }
        if (r.effect === 'deny') {
            denyHit = r;
            break;
        }
        if (r.effect === 'allow') {
            allowHit = r;
        }
    }
    if (denyHit)
        return { allowed: false, reason: denyHit.reason || 'Denied by policy', matchedRuleId: denyHit.id };
    if (allowHit)
        return { allowed: true, reason: allowHit.reason || 'Allowed by policy', matchedRuleId: allowHit.id };
    return { allowed: false, reason: 'Denied by default (no matching rule)' };
}
