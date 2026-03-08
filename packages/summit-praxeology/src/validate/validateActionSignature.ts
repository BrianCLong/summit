import type { ErrorObject } from 'ajv';
import { makeAjv } from './ajv';

export type ActionSignatureRejectionReport = {
  ok: boolean;
  schemaErrors: Array<{
    message: string;
    instancePath: string;
    schemaPath: string;
  }>;
};

export function validateActionSignature(actionSignature: unknown): ActionSignatureRejectionReport {
  const ajv = makeAjv();
  const validate = ajv.getSchema('https://summit.dev/schemas/pg.action.schema.json');

  if (!validate) {
    throw new Error('AJV schema not registered: pg.action.schema.json');
  }

  const okSchema = validate(actionSignature);
  const schemaErrors = (validate.errors ?? []).map((error: ErrorObject) => ({
    message: error.message ?? 'schema validation error',
    instancePath: error.instancePath,
    schemaPath: error.schemaPath
  }));

  const ok = Boolean(okSchema);

  return {
    ok,
    schemaErrors
  };
}
