import type { ErrorObject } from "ajv";
import { makeAjv } from "./ajv";
import { validateActionSignatureSemantics } from "./validateActionSignature";
import { validatePlaybookSemantics } from "../sv/semanticRules";

export type RejectionReport = {
  ok: boolean;
  schemaErrors: Array<{
    message: string;
    instancePath: string;
    schemaPath: string;
  }>;
  semanticViolations: any[];
};

export function validatePGWriteSetSemantics(writeset: any): any[] {
  const violations: any[] = [];

  if (writeset?.graph !== "PG") {
    violations.push({
      code: "PG_SV_MUST_BE_PG_GRAPH",
      message: "PG WriteSets must target the PG graph.",
      path: "/graph"
    });
  }

  if (writeset?.mode !== "quarantine") {
    violations.push({
      code: "PG_SV_MUST_BE_QUARANTINED",
      message: "PG WriteSets must be in quarantine mode.",
      path: "/mode"
    });
  }

  if (writeset?.safety?.neverPromoteToReality !== true) {
    violations.push({
      code: "PG_SV_NEVER_PROMOTE_REQUIRED",
      message: "PG WriteSets must declare neverPromoteToReality=true.",
      path: "/safety/neverPromoteToReality"
    });
  }

  return violations;
}

export function validatePGWriteSet(writeset: any): RejectionReport {
  const ajv = makeAjv();
  const validate = ajv.getSchema("https://summit.dev/schemas/pg.writeset.schema.json");

  if (!validate) {
    throw new Error('AJV schema not registered: pg.writeset.schema.json');
  }

  const okSchema = validate(writeset);
  let schemaErrors = (validate.errors ?? []).map((e: ErrorObject) => ({
    message: e.message ?? "schema validation error",
    instancePath: e.instancePath,
    schemaPath: e.schemaPath
  }));

  const semanticViolations = validatePGWriteSetSemantics(writeset);

  if (Array.isArray(writeset?.ops)) {
    for (let i = 0; i < writeset.ops.length; i++) {
      const op = writeset.ops[i];
      if (!op || !op.payload) continue;

      let payloadValidate: any;
      if (op.entityType === 'ActionSignature') {
         payloadValidate = ajv.getSchema("https://summit.dev/schemas/pg.action.schema.json");
      } else if (op.entityType === 'Playbook') {
         payloadValidate = ajv.getSchema("https://summit.dev/schemas/pg.playbook.schema.json");
      } else if (op.entityType === 'Hypothesis') {
         payloadValidate = ajv.getSchema("https://summit.dev/schemas/pg.hypothesis.schema.json");
      }

      if (payloadValidate) {
        const okPayloadSchema = payloadValidate(op.payload);
        if (!okPayloadSchema) {
          schemaErrors = schemaErrors.concat((payloadValidate.errors ?? []).map((e: ErrorObject) => ({
            message: e.message ?? "schema validation error",
            instancePath: `/ops/${i}/payload` + e.instancePath,
            schemaPath: e.schemaPath
          })));
        }
      }

      if (op.entityType === 'ActionSignature') {
        const svErrors = validateActionSignatureSemantics(op.payload);
        for (const err of svErrors) {
          semanticViolations.push({
             ...err,
             path: `/ops/${i}/payload` + err.path
          });
        }
      } else if (op.entityType === 'Playbook') {
        const svErrors = validatePlaybookSemantics(op.payload);
        for (const err of svErrors) {
          semanticViolations.push({
             ...err,
             path: `/ops/${i}/payload` + err.path
          });
        }
      }
    }
  }

  const ok = schemaErrors.length === 0 && semanticViolations.length === 0;

  return { ok, schemaErrors, semanticViolations };
}
