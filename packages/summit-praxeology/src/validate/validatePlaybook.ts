import type { ErrorObject } from 'ajv';
import { makeAjv } from './ajv';
import { validatePlaybookSemantics, type SVViolation } from '../sv/semanticRules';

export type RejectionReport = {
  ok: boolean;
  schemaErrors: Array<{
    message: string;
    instancePath: string;
    schemaPath: string;
  }>;
  semanticViolations: SVViolation[];
};

export function validatePlaybook(playbook: unknown): RejectionReport {
  const ajv = makeAjv();
  const validate = ajv.getSchema('https://summit.dev/schemas/pg.playbook.schema.json');

  if (!validate) {
    throw new Error('AJV schema not registered: pg.playbook.schema.json');
  }

  const okSchema = validate(playbook);
  const schemaErrors = (validate.errors ?? []).map((error: ErrorObject) => ({
    message: error.message ?? 'schema validation error',
    instancePath: error.instancePath,
    schemaPath: error.schemaPath
  }));

  const semanticViolations = validatePlaybookSemantics(playbook as any);
  const ok = Boolean(okSchema) && semanticViolations.length === 0;

  return {
    ok,
    schemaErrors,
    semanticViolations
  };
}
