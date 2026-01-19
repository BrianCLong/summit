import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import Ajv from "ajv";
import addFormats from "ajv-formats";

type Args = {
  events: string;
  schema: string;
  policy: string;
  report?: string;
};

type Policy = {
  version: number;
  policy_id: string;
  description?: string;
  default_verdict: "ALLOW" | "WARN" | "BLOCK";
  rules: Array<{
    id: string;
    verdict: "ALLOW" | "WARN" | "BLOCK";
    match: { namespace_regex: string; name_regex: string };
    notes?: string[];
  }>;
};

type ValidationReport = {
  policy_hash: string;
  schema_ok: boolean;
  policy_ok: boolean;
  violations: Array<{
    type: "SCHEMA" | "DETERMINISM" | "POLICY";
    message: string;
    details?: unknown;
  }>;
  outputs_seen: Array<{ namespace: string; name: string }>;
  blocked_outputs: Array<{ namespace: string; name: string; rule?: string }>;
  warnings: Array<string>;
};

export function main(argv = process.argv.slice(2)): number {
  const args = parseArgs(argv);

  const events = readJson(args.events);
  if (!Array.isArray(events)) throw new Error("events.json must be an array");

  const schema = readJson(args.schema);
  const policy = readYamlPolicy(args.policy);
  const policyHash = sha256Hex(stableStringify(policy));

  const report: ValidationReport = {
    policy_hash: policyHash,
    schema_ok: true,
    policy_ok: true,
    violations: [],
    outputs_seen: [],
    blocked_outputs: [],
    warnings: []
  };

  // 1) Schema validation (Summit extension schema)
  // @ts-ignore
  const AjvClass = Ajv.default || Ajv;
  const ajv = new AjvClass({ allErrors: true, strict: false });
  // @ts-ignore
  const addFormatsFunc = addFormats.default || addFormats;
  addFormatsFunc(ajv);
  const validate = ajv.compile(schema);

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const ok = validate(ev);
    if (!ok) {
      report.schema_ok = false;
      report.violations.push({
        type: "SCHEMA",
        message: `event[${i}] failed schema validation`,
        details: validate.errors ?? undefined
      });
    }
  }

  // 2) Determinism constraints:
  // - eventTime must be fixed constant
  // - run.runId must equal summit.postgres.sqlHash
  // - producer must be stable string
  for (let i = 0; i < events.length; i++) {
    const ev: any = events[i];
    const eventTime = ev?.eventTime;
    if (eventTime !== "1970-01-01T00:00:00.000Z") {
      report.schema_ok = false;
      report.violations.push({
        type: "DETERMINISM",
        message: `event[${i}] eventTime must be deterministic constant`,
        details: { eventTime }
      });
    }

    const runId = ev?.run?.runId;
    const sqlHash = ev?.run?.facets?.["summit.postgres"]?.sqlHash;
    if (!runId || !sqlHash || runId !== sqlHash) {
      report.schema_ok = false;
      report.violations.push({
        type: "DETERMINISM",
        message: `event[${i}] runId must equal summit.postgres.sqlHash`,
        details: { runId, sqlHash }
      });
    }

    const producer = ev?.producer;
    if (producer !== "summit-lineage-extractor-postgres") {
      report.schema_ok = false;
      report.violations.push({
        type: "DETERMINISM",
        message: `event[${i}] producer must be stable`,
        details: { producer }
      });
    }
  }

  // 3) Policy gate: every output must match ALLOW/WARN rule; BLOCK fails
  const outputs = collectOutputs(events);
  report.outputs_seen = outputs;

  for (const o of outputs) {
    const decision = evaluatePolicy(policy, o.namespace, o.name);
    if (decision.verdict === "BLOCK") {
      report.policy_ok = false;
      report.blocked_outputs.push({ namespace: o.namespace, name: o.name, rule: decision.ruleId });
      report.violations.push({
        type: "POLICY",
        message: `output ${o.namespace}.${o.name} blocked by policy`,
        details: { rule: decision.ruleId }
      });
    } else if (decision.verdict === "WARN") {
      report.warnings.push(`output ${o.namespace}.${o.name} allowed with WARN by rule=${decision.ruleId}`);
    }
  }

  // Deterministic write-out (optional)
  if (args.report) {
    writeFileSync(args.report, stableStringify(report) + "\n", "utf8");
  }

  // Exit codes:
  // - 2 schema/determinism invalid
  // - 3 policy blocked
  if (!report.schema_ok) return 2;
  if (!report.policy_ok) return 3;
  return 0;
}

function parseArgs(argv: string[]): Args {
  const m = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const k = a.slice(2);
    const v = argv[i + 1] ?? "";
    m.set(k, v);
    i++;
  }
  const required = (k: keyof Args) => {
    const v = m.get(String(k));
    if (!v) throw new Error(`missing --${String(k)}`);
    return v;
  };
  return {
    events: required("events"),
    schema: required("schema"),
    policy: required("policy"),
    report: m.get("report")
  };
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

/**
 * Minimal YAML reader for the constrained policy format.
 * This avoids bringing in a YAML dependency.
 * It supports:
 * - string scalars
 * - numbers
 * - arrays of objects (rules)
 * - nested objects (match)
 *
 * If you later want full YAML, replace with a real parser in a subsequent PR.
 */
function readYamlPolicy(path: string): Policy {
  const text = readFileSync(path, "utf8");
  // A tiny, deterministic, constrained parser by line indentation.
  // Policy file is authored to match this format.
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\t/g, "  "))
    .filter((l) => !l.trim().startsWith("#"));

  const obj: any = {};
  let i = 0;

  const parseScalar = (v: string): any => {
    const t = v.trim();
    if (t === "") return "";
    if (/^-?\d+$/.test(t)) return Number(t);
    // strip quotes if present
    const m = t.match(/^"(.*)"$/);
    if (m) return m[1];
    const m2 = t.match(/^'(.*)'$/);
    if (m2) return m2[1];
    return t;
  };

  // Very limited: parse top-level keys and "rules" list.
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const top = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (!top) {
      i++;
      continue;
    }
    const key = top[1];
    const rest = top[2] ?? "";
    if (key !== "rules") {
      obj[key] = parseScalar(rest);
      i++;
      continue;
    }

    // rules:
    i++;
    const rules: any[] = [];
    while (i < lines.length) {
      const l = lines[i];
      if (!l.trim()) {
        i++;
        continue;
      }
      if (!l.startsWith("  - ")) break; // end of rules list
      const rule: any = {};
      // first line: - id: something OR - id: ...
      const first = l.replace(/^  -\s*/, "");
      const kv = first.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
      if (kv) rule[kv[1]] = parseScalar(kv[2]);
      i++;

      // parse indented rule fields until next "- " or outdent
      while (i < lines.length) {
        const ll = lines[i];
        if (!ll.trim()) {
          i++;
          continue;
        }
        if (ll.startsWith("  - ")) break;
        if (!ll.startsWith("    ")) break;

        // match nested object
        const kvm = ll.match(/^    ([a-zA-Z0-9_]+):\s*(.*)$/);
        if (!kvm) {
          i++;
          continue;
        }
        const rk = kvm[1];
        const rv = kvm[2] ?? "";
        if (rk === "match") {
          i++;
          const match: any = {};
          while (i < lines.length) {
            const ml = lines[i];
            if (!ml.startsWith("      ")) break;
            const mkv = ml.match(/^      ([a-zA-Z0-9_]+):\s*(.*)$/);
            if (mkv) match[mkv[1]] = parseScalar(mkv[2]);
            i++;
          }
          rule.match = match;
          continue;
        }
        if (rk === "notes") {
          // parse list of strings
          i++;
          const notes: string[] = [];
          while (i < lines.length) {
            const nl = lines[i];
            if (!nl.startsWith("      - ")) break;
            notes.push(parseScalar(nl.replace(/^      -\s*/, "")));
            i++;
          }
          rule.notes = notes;
          continue;
        }
        rule[rk] = parseScalar(rv);
        i++;
      }

      rules.push(rule);
    }
    obj.rules = rules;
  }

  // Basic shape validation
  if (!obj.version || !obj.policy_id || !obj.default_verdict || !Array.isArray(obj.rules)) {
    throw new Error("policy yaml missing required fields");
  }
  return obj as Policy;
}

function collectOutputs(events: any[]): Array<{ namespace: string; name: string }> {
  const seen = new Set<string>();
  const out: Array<{ namespace: string; name: string }> = [];
  for (const ev of events) {
    const outputs = ev?.outputs;
    if (!Array.isArray(outputs)) continue;
    for (const d of outputs) {
      const ns = String(d?.namespace ?? "");
      const name = String(d?.name ?? "");
      if (!ns || !name) continue;
      const k = `${ns}::${name}`;
      if (!seen.has(k)) {
        seen.add(k);
        out.push({ namespace: ns, name });
      }
    }
  }
  return out.sort((a, b) => {
    const aa = `${a.namespace}.${a.name}`;
    const bb = `${b.namespace}.${b.name}`;
    return aa < bb ? -1 : aa > bb ? 1 : 0;
  });
}

function evaluatePolicy(policy: Policy, ns: string, name: string): { verdict: Policy["default_verdict"]; ruleId?: string } {
  for (const r of policy.rules) {
    const nsRe = new RegExp(r.match.namespace_regex);
    const nRe = new RegExp(r.match.name_regex);
    if (nsRe.test(ns) && nRe.test(name)) return { verdict: r.verdict, ruleId: r.id };
  }
  return { verdict: policy.default_verdict };
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Deterministic stringify: stable key ordering for objects.
 */
function stableStringify(value: unknown): string {
  return JSON.stringify(stableNormalize(value));
}

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableNormalize);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const out: Record<string, unknown> = {};
    for (const k of keys) out[k] = stableNormalize(obj[k]);
    return out;
  }
  return value;
}

// If executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.exit(main());
  } catch (e: any) {
    console.error(String(e?.message ?? e));
    process.exit(2);
  }
}
