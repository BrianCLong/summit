import type { ErrorObject } from 'ajv';

import { validatePlaybook } from './validatePlaybook';
import { validateActionSignature } from './validateActionSignature';
import { makeAjv } from './ajv';

export type PGWriteSetValidationReport = {
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
  opReports: Array<{
    entityId: string;
    ok: boolean;
    details: unknown;
  }>;
};

export function validatePGWriteSet(writeSet: unknown): PGWriteSetValidationReport {
  const ajv = makeAjv();
  const validate = ajv.getSchema('https://summit.dev/schemas/pg.writeset.schema.json');

  if (!validate) {
    throw new Error('AJV schema not registered: pg.writeset.schema.json');
  }

  const okSchema = validate(writeSet);
  const schemaErrors = (validate.errors ?? []).map((error: ErrorObject) => ({
    message: error.message ?? 'schema validation error',
    instancePath: error.instancePath,
    schemaPath: error.schemaPath,
  }));

  const ws = writeSet as {
    graph?: string;
    mode?: string;
    safety?: { neverPromoteToReality?: boolean };
    ops?: Array<{
      entityType?: string;
      entityId?: string;
      payload?: unknown;
    }>;
  };

  const semanticViolations: Array<{ code: string; message: string; path: string }> = [];
  const opReports: Array<{ entityId: string; ok: boolean; details: unknown }> = [];

  if (ws?.graph !== 'PG') {
    semanticViolations.push({
      code: 'PG_WS_GRAPH_MUST_BE_PG',
      message: 'PG WriteSet graph must be PG.',
      path: '/graph',
    });
  }

  if (ws?.mode !== 'quarantine') {
    semanticViolations.push({
      code: 'PG_WS_MUST_BE_QUARANTINED',
      message: 'PG WriteSet mode must be quarantine.',
      path: '/mode',
    });
  }

  if (ws?.safety?.neverPromoteToReality !== true) {
    semanticViolations.push({
      code: 'PG_WS_NEVER_PROMOTE_TO_REALITY',
      message: 'PG WriteSet must explicitly forbid promotion to RG.',
      path: '/safety/neverPromoteToReality',
    });
  }

  for (const [index, op] of (ws?.ops ?? []).entries()) {
    const entityId = op.entityId ?? `unknown_${index}`;

    if (op.entityType === 'ActionSignature') {
      const report = validateActionSignature(op.payload);
      opReports.push({ entityId, ok: report.ok, details: report });
      if (!report.ok) {
        semanticViolations.push({
          code: 'PG_WS_INVALID_ACTION_SIGNATURE',
          message: `Invalid ActionSignature payload at op ${index}.`,
          path: `/ops/${index}/payload`,
        });
      }
      continue;
    }

    if (op.entityType === 'Playbook') {
      const report = validatePlaybook(op.payload);
      opReports.push({ entityId, ok: report.ok, details: report });
      if (!report.ok) {
        semanticViolations.push({
          code: 'PG_WS_INVALID_PLAYBOOK',
          message: `Invalid Playbook payload at op ${index}.`,
          path: `/ops/${index}/payload`,
        });
      }
      continue;
    }

    opReports.push({ entityId, ok: true, details: { skipped: true } });
  }

  return {
    ok: Boolean(okSchema) && semanticViolations.length === 0,
    schemaErrors,
    semanticViolations,
    opReports,
  };
}
