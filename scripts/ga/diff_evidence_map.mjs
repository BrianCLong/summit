#!/usr/bin/env node
import { execSync } from "node:child_process";
import yaml from "yaml";

function readYmlAt(ref) {
  try {
    const buf = execSync(`git show ${ref}:docs/ga/evidence_map.yml`, { stdio: ["ignore","pipe","pipe"] });
    return yaml.parse(buf.toString());
  } catch {
    return {};
  }
}

function indexByControl(obj) {
  const items = Array.isArray(obj) ? obj : (obj?.controls || []);
  const map = new Map();
  for (const c of items) map.set(c.id || c.control || c.name, c);
  return map;
}

function diffMaps(aMap, bMap) {
  const added = [], removed = [], changed = [];
  const keys = new Set([...aMap.keys(), ...bMap.keys()]);
  for (const k of keys) {
    const a = aMap.get(k), b = bMap.get(k);
    if (!a && b) added.push({ id:k, after:b });
    else if (a && !b) removed.push({ id:k, before:a });
    else if (JSON.stringify(a) !== JSON.stringify(b)) {
      // shallow highlight of notable fields
      const fields = ["coverage","owner","evidence","status","risk"];
      const deltas = {};
      for (const f of fields) if ((a?.[f] ?? null) !== (b?.[f] ?? null)) deltas[f] = { before:a?.[f], after:b?.[f] };
      changed.push({ id:k, deltas, before:a, after:b });
    }
  }
  return { added, removed, changed };
}

const baseRef = process.env.EVIDENCE_DIFF_BASE || "origin/main";
const headRef = process.env.EVIDENCE_DIFF_HEAD || "HEAD";

const base = readYmlAt(baseRef);
const head = readYmlAt(headRef);

const diff = diffMaps(indexByControl(base), indexByControl(head));
const summary = {
  baseRef, headRef,
  counts: { added: diff.added.length, removed: diff.removed.length, changed: diff.changed.length }
};

const payload = { summary, diff };

console.log(JSON.stringify(payload, null, 2));

// Optional: non‑zero exit on risky regressions
const risky = diff.removed.length > 0 || diff.changed.some(c => c.deltas.coverage && (c.deltas.coverage.after ?? 0) < (c.deltas.coverage.before ?? 0));
if (process.env.EVIDENCE_DIFF_FAIL_ON_REGRESSION === "1" && risky) {
  process.exitCode = 2;
}
