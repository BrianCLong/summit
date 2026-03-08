import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

import artifactSchema from './artifact.schema.json';
import narrativeSchema from './narrative.schema.json';
import beliefSchema from './belief.schema.json';
import claimSchema from './claim.schema.json';

import narrativeClaimSchema from './links/narrative-claim-link.schema.json';
import beliefClaimSchema from './links/belief-claim-link.schema.json';
import narrativeBeliefSchema from './links/narrative-belief-link.schema.json';

import divergenceSchema from './metrics/divergence-metric.schema.json';
import beliefGapSchema from './metrics/belief-gap-metric.schema.json';

import cogOpSchema from './writeset/cog-op.schema.json';
import cogWriteSetSchema from './writeset/cog-writeset.schema.json';
import cogRejectionReportSchema from './writeset/cog-rejection-report.schema.json';

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv as any);

[
  artifactSchema,
  narrativeSchema,
  beliefSchema,
  claimSchema,
  narrativeClaimSchema,
  beliefClaimSchema,
  narrativeBeliefSchema,
  divergenceSchema,
  beliefGapSchema,
  cogOpSchema,
  cogWriteSetSchema,
  cogRejectionReportSchema,
].forEach((schema) => ajv.addSchema(schema));

export const validators = {
  artifact: ajv.getSchema(artifactSchema.$id!) as ValidateFunction,
  narrative: ajv.getSchema(narrativeSchema.$id!) as ValidateFunction,
  belief: ajv.getSchema(beliefSchema.$id!) as ValidateFunction,
  claim: ajv.getSchema(claimSchema.$id!) as ValidateFunction,
  narrativeClaimLink: ajv.getSchema(narrativeClaimSchema.$id!) as ValidateFunction,
  beliefClaimLink: ajv.getSchema(beliefClaimSchema.$id!) as ValidateFunction,
  narrativeBeliefLink: ajv.getSchema(narrativeBeliefSchema.$id!) as ValidateFunction,
  divergenceMetric: ajv.getSchema(divergenceSchema.$id!) as ValidateFunction,
  beliefGapMetric: ajv.getSchema(beliefGapSchema.$id!) as ValidateFunction,
  cogOp: ajv.getSchema(cogOpSchema.$id!) as ValidateFunction,
  cogWriteSet: ajv.getSchema(cogWriteSetSchema.$id!) as ValidateFunction,
  cogRejectionReport: ajv.getSchema(cogRejectionReportSchema.$id!) as ValidateFunction,
};

export type AjvError = {
  instancePath: string;
  message?: string;
  schemaPath: string;
  params: Record<string, unknown>;
};

export function toRejectionReport(validator: ValidateFunction):
  | { ok: true }
  | { ok: false; errors: AjvError[] } {
  if (validator.errors?.length) {
    return { ok: false, errors: validator.errors as unknown as AjvError[] };
  }
  return { ok: true };
}
