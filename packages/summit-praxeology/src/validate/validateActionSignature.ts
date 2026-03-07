import type { ErrorObject } from 'ajv';

import { DEFAULT_PG_CONTENT_SAFETY } from '../policy/pgPolicy';
import { makeAjv } from './ajv';

export type ValidationReport = {
  ok: boolean;
  schemaErrors: Array<{
    message: string;
    instancePath: string;
    schemaPath: string;
  }>;
  semanticViolations: Array<{
    code: string;
    message: string;
    path: string;
  }>;
};

function scanPrescriptiveText(value: unknown, path: string) {
  if (typeof value !== 'string') {
    return [];
  }

  const lowered = value.toLowerCase();
  const hits =
    DEFAULT_PG_CONTENT_SAFETY.prescriptiveLanguageHeuristics.forbiddenPhrases.filter(
      (phrase) => lowered.includes(phrase),
    );

  if (!hits.length) {
    return [];
  }

  return [
    {
      code: 'PG_SV_PRESCRIPTIVE_LANGUAGE',
      message: `Potentially prescriptive language detected (${hits.join(', ')}). PG is analytic/defensive only.`,
      path,
    },
  ];
}

export function validateActionSignature(actionSignature: unknown): ValidationReport {
  const ajv = makeAjv();
  const validate = ajv.getSchema('https://summit.dev/schemas/pg.action.schema.json');

  if (!validate) {
    throw new Error('AJV schema not registered: pg.action.schema.json');
  }

  const okSchema = validate(actionSignature);
  const schemaErrors = (validate.errors ?? []).map((error: ErrorObject) => ({
    message: error.message ?? 'schema validation error',
    instancePath: error.instancePath,
    schemaPath: error.schemaPath,
  }));

  const action = actionSignature as {
    label?: unknown;
    description?: unknown;
  };

  const semanticViolations = [
    ...scanPrescriptiveText(action.label, '/label'),
    ...scanPrescriptiveText(action.description, '/description'),
  ];

  return {
    ok: Boolean(okSchema) && semanticViolations.length === 0,
    schemaErrors,
    semanticViolations,
  };
}
