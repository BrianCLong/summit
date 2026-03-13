import type { ErrorObject } from "ajv";
import { makeAjv } from "./ajv";
import { DEFAULT_PG_CONTENT_SAFETY } from "../policy/pgPolicy";

export type RejectionReport = {
  ok: boolean;
  schemaErrors: Array<{
    message: string;
    instancePath: string;
    schemaPath: string;
  }>;
  semanticViolations: any[]; // reuse type if needed
};

export function validateActionSignatureSemantics(actionSig: any): any[] {
  const violations: any[] = [];
  const lowerDesc = String(actionSig?.description || "").toLowerCase();
  const lowerLabel = String(actionSig?.label || "").toLowerCase();
  const forbidden = DEFAULT_PG_CONTENT_SAFETY.prescriptiveLanguageHeuristics.forbiddenPhrases;

  for (const f of forbidden) {
    if (lowerDesc.includes(f) || lowerLabel.includes(f)) {
      violations.push({
        code: "PG_SV_PRESCRIPTIVE_LANGUAGE",
        message: `Potentially prescriptive language detected (${f}). This package is analytic/defensive only.`,
        path: lowerDesc.includes(f) ? "/description" : "/label"
      });
    }
  }
  return violations;
}

export function validateActionSignature(actionSig: unknown): RejectionReport {
  const ajv = makeAjv();
  const validate = ajv.getSchema("https://summit.dev/schemas/pg.action.schema.json");
  if (!validate) {
    throw new Error("AJV schema not registered: pg.action.schema.json");
  }

  const okSchema = validate(actionSig);
  const schemaErrors = (validate.errors ?? []).map((e: ErrorObject) => ({
    message: e.message ?? "schema validation error",
    instancePath: e.instancePath,
    schemaPath: e.schemaPath
  }));

  const semanticViolations = validateActionSignatureSemantics(actionSig);

  const ok = Boolean(okSchema) && semanticViolations.length === 0;

  return { ok, schemaErrors, semanticViolations };
}
