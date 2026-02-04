import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { Procedure } from '../types';
import type { ProcedurePolicy } from '../policy/types';

const schemaPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'schema',
  'procedure.schema.json',
);
const procedureSchema = JSON.parse(readFileSync(schemaPath, 'utf8'));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateSchema = ajv.compile(procedureSchema);

export class ProcedureValidationError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

function assertPolicy(condition: boolean, code: string, message: string, details?: unknown) {
  if (!condition) {
    throw new ProcedureValidationError(code, message, details);
  }
}

export function validateProcedure(
  procedure: Procedure,
  policy: ProcedurePolicy,
): void {
  const schemaValid = validateSchema(procedure);
  if (!schemaValid) {
    throw new ProcedureValidationError(
      'SCHEMA_INVALID',
      'Procedure does not match schema.',
      validateSchema.errors ?? [],
    );
  }

  assertPolicy(
    procedure.steps.length <= policy.budgets.maxSteps,
    'POLICY_MAX_STEPS_EXCEEDED',
    `Procedure exceeds max steps (${policy.budgets.maxSteps}).`,
    { count: procedure.steps.length },
  );

  const uniqueHttpDomains = new Set<string>();

  procedure.steps.forEach((step, index) => {
    assertPolicy(
      policy.allow.stepTypes.includes(step.type),
      'POLICY_STEP_TYPE_DENIED',
      `Step type ${step.type} is not allowlisted.`,
      { step: index },
    );

    if (step.type === 'export.csv') {
      const destination =
        typeof step.with?.destination === 'string'
          ? step.with.destination
          : '';
      assertPolicy(
        destination.length > 0,
        'POLICY_EXPORT_DESTINATION_REQUIRED',
        'Export step requires a destination.',
        { step: index },
      );
      assertPolicy(
        policy.allow.exportDestinations.csv.includes(destination),
        'POLICY_EXPORT_DESTINATION_DENIED',
        `Export destination ${destination} is not allowlisted.`,
        { step: index },
      );
    }

    if (step.type === 'enrich.http') {
      const domain = typeof step.with?.domain === 'string' ? step.with.domain : '';
      assertPolicy(
        domain.length > 0,
        'POLICY_HTTP_DOMAIN_REQUIRED',
        'HTTP enrichment requires a domain.',
        { step: index },
      );
      uniqueHttpDomains.add(domain);
      assertPolicy(
        policy.allow.httpDomains.includes(domain),
        'POLICY_HTTP_DOMAIN_DENIED',
        `HTTP domain ${domain} is not allowlisted.`,
        { step: index },
      );
    }

    if (step.type === 'graph.query') {
      const fanout =
        typeof step.with?.fanout === 'number' ? step.with.fanout : 0;
      assertPolicy(
        fanout <= policy.budgets.maxQueryFanout,
        'POLICY_QUERY_FANOUT_EXCEEDED',
        `Graph query fanout exceeds ${policy.budgets.maxQueryFanout}.`,
        { step: index, fanout },
      );
    }

    const nextStep = procedure.steps[index + 1];
    if (nextStep) {
      policy.rules.forbidAdjacency.forEach(rule => {
        if (rule.from === step.type && rule.to === nextStep.type) {
          throw new ProcedureValidationError(
            'POLICY_FORBIDDEN_ADJACENCY',
            `Step adjacency ${rule.from} -> ${rule.to} is forbidden.`,
            { step: index },
          );
        }
      });
    }
  });

  assertPolicy(
    uniqueHttpDomains.size <= policy.budgets.maxHttpDomains,
    'POLICY_HTTP_DOMAIN_BUDGET_EXCEEDED',
    `HTTP domain usage exceeds ${policy.budgets.maxHttpDomains}.`,
    { count: uniqueHttpDomains.size },
  );
}
