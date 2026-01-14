#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const input = JSON.parse(readFileSync(0, "utf8"));
const { summary, diff } = input;

function row(c){ return `| ${c.id} | ${c?.deltas?.coverage?.before ?? ""} → ${c?.deltas?.coverage?.after ?? ""} | ${c?.deltas?.owner?.before ?? ""} → ${c?.deltas?.owner?.after ?? ""} |`; }

let md = `# Evidence Map Diff
**Base:** ${summary.baseRef}
**Head:** ${summary.headRef}

**Counts:** added ${summary.counts.added} · removed ${summary.counts.removed} · changed ${summary.counts.changed}

## Added Controls
${diff.added.length ? diff.added.map(a=>`- \`${a.id}\``).join("\n") : "_none_"}

## Removed Controls
${diff.removed.length ? diff.removed.map(r=>`- \`${r.id}\``).join("\n") : "_none_"}

## Changed Controls
| Control | Coverage | Owner |
|---|---:|---|
${diff.changed.length ? diff.changed.map(row).join("\n") : "| _none_ | | |"}
`;

mkdirSync("artifacts/ga-diff", { recursive:true });
writeFileSync("artifacts/ga-diff/evidence_diff.md", md);
console.log("artifacts/ga-diff/evidence_diff.md");
