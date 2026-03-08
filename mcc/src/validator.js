"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateModelCard = validateModelCard;
const zod_1 = require("zod");
const errors_js_1 = require("./errors.js");
const riskLevelValues = ['low', 'medium', 'high'];
const metricSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1, 'Each metric requires a name.'),
    value: zod_1.z
        .number({ invalid_type_error: 'Metric values must be numeric.' })
        .finite('Metric values must be finite numbers.'),
    unit: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
})
    .superRefine((metric, ctx) => {
    if (!Number.isFinite(metric.value)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: `Metric "${metric.name}" has a non-finite value.`,
        });
    }
});
const intendedUseSchema = zod_1.z.object({
    summary: zod_1.z.string().min(1, 'Intended use must include a summary.'),
    supportedPurposes: zod_1.z
        .array(zod_1.z.string().min(1))
        .min(1, 'Provide at least one supported purpose.'),
    usageRestrictions: zod_1.z.array(zod_1.z.string().min(1)).optional(),
});
const dataLineageSchema = zod_1.z.object({
    datasets: zod_1.z
        .array(zod_1.z.object({
        id: zod_1.z
            .string()
            .min(1, 'Each data lineage entry must include a dataset id.'),
        description: zod_1.z.string().optional(),
    }))
        .min(1, 'At least one dataset id is required for data lineage.'),
});
const riskFlagSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, 'Risk flags must specify an id.'),
    level: zod_1.z.enum(riskLevelValues, {
        required_error: 'Risk flags must define a severity level.',
    }),
    description: zod_1.z.string().optional(),
    mitigation: zod_1.z.string().optional(),
});
const riskSchema = zod_1.z.object({
    flags: zod_1.z
        .array(riskFlagSchema)
        .min(1, 'Provide at least one risk flag describing known issues.'),
    outOfScopePurposes: zod_1.z
        .array(zod_1.z.string().min(1))
        .default([]),
    notes: zod_1.z.string().optional(),
});
const modelCardSchema = zod_1.z.object({
    modelId: zod_1.z.string().min(1, 'Model id is required.'),
    version: zod_1.z.string().min(1, 'Model version is required.'),
    owner: zod_1.z.string().min(1, 'Model owner is required.'),
    description: zod_1.z.string().min(1, 'Provide a model description.'),
    metrics: zod_1.z
        .array(metricSchema)
        .min(1, 'Include at least one evaluation metric.'),
    intendedUse: intendedUseSchema,
    dataLineage: dataLineageSchema,
    risk: riskSchema,
    references: zod_1.z.array(zod_1.z.string().min(1)).optional(),
});
function validateModelCard(input) {
    const result = modelCardSchema.safeParse(input);
    if (!result.success) {
        const issues = result.error.issues.map((issue) => {
            const path = issue.path.length ? ` (at ${issue.path.join('.')})` : '';
            return `${issue.message}${path}`;
        });
        throw new errors_js_1.ModelCardValidationError(issues);
    }
    return result.data;
}
