"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decide = decide;
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const policy_schema_json_1 = __importDefault(require("./policy.schema.json"));
const ajv = new ajv_1.default({ allErrors: true, allowUnionTypes: true });
(0, ajv_formats_1.default)(ajv);
const validate = ajv.compile(policy_schema_json_1.default);
function decide(policy, req) {
    if (!validate(policy)) {
        return { allow: false, denial: 'policy_invalid', reasons: [] };
    }
    const candidates = policy.models.map((m) => ({
        ...m,
        counters: { rpm: 0, tpm: 0, usd_today: 0, window_open: true },
    }));
    const rule = policy.rules.find((r) => (!r.match.task || r.match.task === req.task) &&
        (r.match.loa === undefined || r.match.loa >= req.loa));
    if (!rule)
        return { allow: false, denial: 'no_matching_rule', reasons: [] };
    const { pickModel } = require('./scheduler');
    const { chosen, denied } = pickModel(candidates, rule.route.prefer, rule.route.fallback);
    if (!chosen) {
        return {
            allow: false,
            denial: 'no_model_available',
            reasons: Object.entries(denied).map(([model, reason]) => ({
                model,
                reason,
            })),
        };
    }
    return {
        allow: true,
        model: chosen.name,
        reasons: Object.entries(denied).map(([model, reason]) => ({
            model,
            reason,
        })),
    };
}
