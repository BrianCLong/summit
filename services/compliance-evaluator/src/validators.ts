import Ajv from "ajv";
import addFormats from "ajv-formats";
import base from "../../../compliance/evidence/schemas/summit.evidence.v1.json" assert { type: "json" };
import authz from "../../../compliance/evidence/schemas/summit.evidence.authz.v1.json" assert { type: "json" };
import deploy from "../../../compliance/evidence/schemas/summit.evidence.deployment.v1.json" assert { type: "json" };
import dsr from "../../../compliance/evidence/schemas/summit.evidence.dsr.v1.json" assert { type: "json" };

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const validators = {
  "summit.evidence.v1": ajv.compile(base as any),
  "summit.evidence.authz.v1": ajv.compile(authz as any),
  "summit.evidence.deployment.v1": ajv.compile(deploy as any),
  "summit.evidence.dsr.v1": ajv.compile(dsr as any)
} as const;

export function validateEvidence(
  evidence: any
): { ok: true } | { ok: false; errors: string[] } {
  const spec = evidence?.spec;
  const validator = (validators as any)[spec];
  if (!validator) {
    return { ok: false, errors: [`Unsupported spec: ${String(spec)}`] };
  }
  const ok = validator(evidence);
  if (ok) return { ok: true };
  const errors = (validator.errors ?? []).map(
    (error: any) => `${error.instancePath || "/"} ${error.message}`
  );
  return { ok: false, errors };
}
