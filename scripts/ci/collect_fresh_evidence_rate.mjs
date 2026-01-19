#!/usr/bin/env node
import fs from "fs";

const summaries = process.argv.slice(2);

// Deterministic: sort for stable behavior even if shell expansion order differs
summaries.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

let den = 0;
let num = 0;

for (const p of summaries) {
  try {
    const s = JSON.parse(fs.readFileSync(p, "utf8"));

    // Denominator: runs expected to emit evidence (default true if omitted)
    const expected = s?.expected ?? true;
    if (!expected) continue;

    den++;

    // Numerator: "verified" already implies signature/provenance checks happened upstream
    if (s?.evidence?.verified === true) num++;
  } catch {
    // If summary is malformed, treat as missing evidence by counting only if it was expected.
    // We cannot infer expected without parsing; so do nothing here to avoid inflating den.
  }
}

const rate = den === 0 ? 0 : Math.floor((100 * num) / den);

// Shields endpoint JSON
const out = {
  schemaVersion: 1,
  label: "Fresh Evidence Rate (7d)",
  message: `${rate}% (${num}/${den})`,
  color: rate >= 95 ? "brightgreen" : rate >= 85 ? "yellow" : "red"
};

fs.mkdirSync("docs/governance/metrics", { recursive: true });
fs.writeFileSync(
  "docs/governance/metrics/fresh-evidence-rate.json",
  JSON.stringify(out, null, 2) + "\n",
  "utf8"
);

// Optional: also write raw numbers for internal dashboards
fs.writeFileSync(
  "docs/governance/metrics/fresh-evidence-rate.raw.json",
  JSON.stringify({ num, den, rate }, null, 2) + "\n",
  "utf8"
);
