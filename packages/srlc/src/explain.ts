import { ExplainTrace, Policy } from './types.js';
import { canonicalPipeline } from './descriptors.js';

export function buildExplainTraces(policy: Policy): ExplainTrace[] {
  return policy.fields.map((field) => {
    const steps = [...canonicalPipeline(field), `consistency=${field.consistency}`];
    if (field.explain) {
      steps.push(`note=${field.explain}`);
    }
    return {
      field: field.path,
      steps
    };
  });
}
