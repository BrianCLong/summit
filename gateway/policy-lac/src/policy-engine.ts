import fs from "fs";
import path from "path";
import Ajv, { DefinedError } from "ajv";

export type Decision = { allowed: boolean; reason: string; matchedRuleId?: string };
export type Context = { action: string; resource: string; attributes: Record<string, any> };
export type PolicyRule = {
  id: string;
  effect: "allow" | "deny";
  actions: string[];
  resources: string[];
  conditions?: {
    purpose?: string[];
    labels?: string[];
    sensitivityAtMost?: string;
    timeWindow?: { start: string; end: string };
    [key: string]: unknown;
  };
  reason?: string;
};

export type PolicyDocument = { version: string; rules: PolicyRule[] };

const ajv = new Ajv({ allErrors: true, strict: true });
const schema = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "policies", "schema", "policy.schema.json"), "utf8")
);
const validate = ajv.compile<PolicyDocument>(schema);

export function loadPolicy(policyPath: string): PolicyDocument {
  const raw = JSON.parse(fs.readFileSync(policyPath, "utf8")) as PolicyDocument;
  if (!validate(raw)) {
    const errors = ajv.errorsText(validate.errors as DefinedError[]);
    throw new Error("Policy schema invalid: " + errors);
  }
  return raw;
}

function matches(str: string, pattern: string) {
  if (pattern.endsWith("*")) return str.startsWith(pattern.slice(0, -1));
  return str === pattern;
}

export function evaluate(policy: PolicyDocument, ctx: Context): Decision {
  let allowHit: PolicyRule | null = null;
  let denyHit: PolicyRule | null = null;
  for (const r of policy.rules) {
    const actionOk = r.actions.some((a) => matches(ctx.action, a));
    const resourceOk = r.resources.some((p) => matches(ctx.resource, p));
    if (!(actionOk && resourceOk)) continue;
    const { purpose, labels, sensitivityAtMost, timeWindow } = r.conditions || {};
    if (purpose && (!ctx.attributes.purpose || !purpose.includes(ctx.attributes.purpose))) continue;
    if (
      labels &&
      (!Array.isArray(ctx.attributes.labels) ||
        !labels.every((l) => ctx.attributes.labels.includes(l)))
    )
      continue;
    if (sensitivityAtMost && (ctx.attributes.sensitivity || "S0") > sensitivityAtMost) continue;
    if (timeWindow) {
      const now = new Date();
      if (Number.isNaN(Date.parse(timeWindow.start)) || Number.isNaN(Date.parse(timeWindow.end)))
        continue;
      if (now < new Date(timeWindow.start) || now > new Date(timeWindow.end)) continue;
    }
    if (r.effect === "deny") {
      denyHit = r;
      break;
    }
    if (r.effect === "allow") {
      allowHit = r;
    }
  }
  if (denyHit)
    return {
      allowed: false,
      reason: denyHit.reason || "Denied by policy",
      matchedRuleId: denyHit.id,
    };
  if (allowHit)
    return {
      allowed: true,
      reason: allowHit.reason || "Allowed by policy",
      matchedRuleId: allowHit.id,
    };
  return { allowed: false, reason: "Denied by default (no matching rule)" };
}
