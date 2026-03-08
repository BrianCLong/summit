"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validators = void 0;
exports.toRejectionReport = toRejectionReport;
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const artifact_schema_json_1 = __importDefault(require("./artifact.schema.json"));
const narrative_schema_json_1 = __importDefault(require("./narrative.schema.json"));
const belief_schema_json_1 = __importDefault(require("./belief.schema.json"));
const claim_schema_json_1 = __importDefault(require("./claim.schema.json"));
const narrative_claim_link_schema_json_1 = __importDefault(require("./links/narrative-claim-link.schema.json"));
const belief_claim_link_schema_json_1 = __importDefault(require("./links/belief-claim-link.schema.json"));
const narrative_belief_link_schema_json_1 = __importDefault(require("./links/narrative-belief-link.schema.json"));
const divergence_metric_schema_json_1 = __importDefault(require("./metrics/divergence-metric.schema.json"));
const belief_gap_metric_schema_json_1 = __importDefault(require("./metrics/belief-gap-metric.schema.json"));
const cog_op_schema_json_1 = __importDefault(require("./writeset/cog-op.schema.json"));
const cog_writeset_schema_json_1 = __importDefault(require("./writeset/cog-writeset.schema.json"));
const cog_rejection_report_schema_json_1 = __importDefault(require("./writeset/cog-rejection-report.schema.json"));
const ajv = new ajv_1.default({ allErrors: true, strict: true });
(0, ajv_formats_1.default)(ajv);
[
    artifact_schema_json_1.default,
    narrative_schema_json_1.default,
    belief_schema_json_1.default,
    claim_schema_json_1.default,
    narrative_claim_link_schema_json_1.default,
    belief_claim_link_schema_json_1.default,
    narrative_belief_link_schema_json_1.default,
    divergence_metric_schema_json_1.default,
    belief_gap_metric_schema_json_1.default,
    cog_op_schema_json_1.default,
    cog_writeset_schema_json_1.default,
    cog_rejection_report_schema_json_1.default,
].forEach((schema) => ajv.addSchema(schema));
exports.validators = {
    artifact: ajv.getSchema(artifact_schema_json_1.default.$id),
    narrative: ajv.getSchema(narrative_schema_json_1.default.$id),
    belief: ajv.getSchema(belief_schema_json_1.default.$id),
    claim: ajv.getSchema(claim_schema_json_1.default.$id),
    narrativeClaimLink: ajv.getSchema(narrative_claim_link_schema_json_1.default.$id),
    beliefClaimLink: ajv.getSchema(belief_claim_link_schema_json_1.default.$id),
    narrativeBeliefLink: ajv.getSchema(narrative_belief_link_schema_json_1.default.$id),
    divergenceMetric: ajv.getSchema(divergence_metric_schema_json_1.default.$id),
    beliefGapMetric: ajv.getSchema(belief_gap_metric_schema_json_1.default.$id),
    cogOp: ajv.getSchema(cog_op_schema_json_1.default.$id),
    cogWriteSet: ajv.getSchema(cog_writeset_schema_json_1.default.$id),
    cogRejectionReport: ajv.getSchema(cog_rejection_report_schema_json_1.default.$id),
};
function toRejectionReport(validator) {
    if (validator.errors?.length) {
        return { ok: false, errors: validator.errors };
    }
    return { ok: true };
}
