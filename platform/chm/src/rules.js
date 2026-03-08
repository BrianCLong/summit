"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleEngine = void 0;
exports.createDocument = createDocument;
exports.evaluateExport = evaluateExport;
exports.evaluateHandle = evaluateHandle;
exports.evaluateView = evaluateView;
exports.getDocument = getDocument;
const zod_1 = require("zod");
const config_js_1 = require("./config.js");
class RuleEngine {
    rules;
    bus;
    constructor(options) {
        this.bus = options.bus;
        this.rules = options.rules.map((rule) => config_js_1.tagRuleSchema.parse(rule));
    }
    evaluate(tag, context) {
        const rule = this.rules.find((candidate) => candidate.tag === tag.tag);
        if (!rule) {
            return { allowed: false, reason: `No export rule registered for ${tag.tag}` };
        }
        const residencyOk = rule.residency === context.residency;
        const licenseOk = rule.license === context.license || rule.license === 'exportable';
        const allowed = rule.exportable && residencyOk && licenseOk;
        if (!allowed) {
            const decision = {
                allowed: false,
                reason: residencyOk
                    ? licenseOk
                        ? `Export blocked: policy ${rule.rationale}`
                        : `Export blocked: license ${context.license} incompatible with ${rule.rationale}`
                    : `Export blocked: residency ${context.residency} incompatible with ${rule.rationale}`,
                violatedRule: rule
            };
            this.bus.emitViolation(tag, context, decision.reason);
            return decision;
        }
        return { allowed: true, reason: `Export allowed via rule ${rule.tag}` };
    }
    upsert(rule) {
        const parsed = config_js_1.tagRuleSchema.parse(rule);
        const existingIdx = this.rules.findIndex((candidate) => candidate.tag === parsed.tag);
        if (existingIdx >= 0) {
            this.rules.splice(existingIdx, 1, parsed);
            return;
        }
        this.rules.push(parsed);
    }
    serialize() {
        return JSON.stringify(this.rules, null, 2);
    }
    static fromSerialized(bus, payload) {
        const parsed = zod_1.z.array(config_js_1.tagRuleSchema).parse(JSON.parse(payload));
        return new RuleEngine({ bus, rules: parsed });
    }
}
exports.RuleEngine = RuleEngine;
function createDocument(id, name) {
    return { id, name };
}
function evaluateExport(doc, user) {
    return true;
}
function evaluateHandle(doc, user) {
    return true;
}
function evaluateView(doc, user) {
    return true;
}
function getDocument(id) {
    return { id };
}
