import { z } from 'zod';
import { ModelCardInput, RiskFlag } from './types.js';
import { ModelCardValidationError } from './errors.js';

const riskLevelValues = ['low', 'medium', 'high'] as const;

const metricSchema = z
  .object({
    name: z.string().min(1, 'Each metric requires a name.'),
    value: z
      .number({ invalid_type_error: 'Metric values must be numeric.' })
      .finite('Metric values must be finite numbers.'),
    unit: z.string().optional(),
    description: z.string().optional(),
  })
  .superRefine((metric, ctx) => {
    if (!Number.isFinite(metric.value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Metric "${metric.name}" has a non-finite value.`,
      });
    }
  });

const intendedUseSchema = z.object({
  summary: z.string().min(1, 'Intended use must include a summary.'),
  supportedPurposes: z
    .array(z.string().min(1))
    .min(1, 'Provide at least one supported purpose.'),
  usageRestrictions: z.array(z.string().min(1)).optional(),
});

const dataLineageSchema = z.object({
  datasets: z
    .array(
      z.object({
        id: z
          .string()
          .min(1, 'Each data lineage entry must include a dataset id.'),
        description: z.string().optional(),
      })
    )
    .min(1, 'At least one dataset id is required for data lineage.'),
});

const riskFlagSchema: z.ZodType<RiskFlag> = z.object({
  id: z.string().min(1, 'Risk flags must specify an id.'),
  level: z.enum(riskLevelValues, {
    required_error: 'Risk flags must define a severity level.',
  }),
  description: z.string().optional(),
  mitigation: z.string().optional(),
});

const riskSchema = z.object({
  flags: z
    .array(riskFlagSchema)
    .min(1, 'Provide at least one risk flag describing known issues.'),
  outOfScopePurposes: z
    .array(z.string().min(1))
    .default([]),
  notes: z.string().optional(),
});

const modelCardSchema = z.object({
  modelId: z.string().min(1, 'Model id is required.'),
  version: z.string().min(1, 'Model version is required.'),
  owner: z.string().min(1, 'Model owner is required.'),
  description: z.string().min(1, 'Provide a model description.'),
  metrics: z
    .array(metricSchema)
    .min(1, 'Include at least one evaluation metric.'),
  intendedUse: intendedUseSchema,
  dataLineage: dataLineageSchema,
  risk: riskSchema,
  references: z.array(z.string().min(1)).optional(),
});

export function validateModelCard(input: unknown): ModelCardInput {
  const result = modelCardSchema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => {
      const path = issue.path.length ? ` (at ${issue.path.join('.')})` : '';
      return `${issue.message}${path}`;
    });
    throw new ModelCardValidationError(issues);
  }
  return result.data as ModelCardInput;
}
