import type { ErrorObject } from 'ajv';
import type { PGPlaybook } from '../engine/types';
import { validatePlaybookSemantics, type SVViolation } from '../sv/semanticRules';
import { makeAjv } from './ajv';

export type RejectionReport = {
  ok: boolean;
  schemaErrors: Array<{
    message: string;
    instancePath: string;
    schemaPath: string;
  }>;
  semanticViolations: SVViolation[];
};

function toPlaybook(value: unknown): PGPlaybook {
  if (typeof value === 'object' && value !== null) {
    return value as PGPlaybook;
  }

  return {
    id: '',
    steps: []
  };
}

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

  const semanticViolations = validatePlaybookSemantics(toPlaybook(playbook));
  const ok = Boolean(okSchema) && semanticViolations.length === 0;

  return {
    ok,
    schemaErrors,
    semanticViolations
  };
}
