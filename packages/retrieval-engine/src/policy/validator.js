"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePolicyFile = validatePolicyFile;
const fs_1 = __importDefault(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const zod_1 = require("zod");
const GateRuleSchema = zod_1.z.object({
    require: zod_1.z.array(zod_1.z.record(zod_1.z.boolean())).optional(),
    deny_if: zod_1.z.array(zod_1.z.record(zod_1.z.boolean())).optional(),
});
const PolicySchema = zod_1.z.object({
    version: zod_1.z.number(),
    gates: zod_1.z.object({
        ingest: GateRuleSchema,
        execution: GateRuleSchema,
        evidence: GateRuleSchema,
    }),
});
function validatePolicyFile(filepath) {
    const content = fs_1.default.readFileSync(filepath, 'utf8');
    const raw = js_yaml_1.default.load(content);
    return PolicySchema.parse(raw);
}
