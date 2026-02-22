#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const regPath = path.join(root, "docs/ga/policy_registry.json");
const docPath = path.join(root, "docs/ga/policy_registry.md");

const registry = JSON.parse(fs.readFileSync(regPath, "utf8"));

let md = `# Policy→Workflow→Evidence Registry (Authoritative)

Each policy/control below maps to definitive CI checks and a stable \`evidence_id\`.
**Gate logic**: a release is mergeable only if all \`required: true\` entries have their checks green **and** the declared artifacts exist and validate.

`;

for (const p of registry.policies) {
  md += `## ${p.id} — ${p.title}\n`;
  if (p.control_map && p.control_map.length > 0) {
    md += `- Controls: ${p.control_map.join(", ")}\n`;
  }

  if (p.workflows.length === 1) {
    const wf = p.workflows[0];
    md += `- Workflow: \`${wf.path}\` → job \`${wf.job}\`\n`;
    md += `- Check: \`${wf.check_name}\`\n`;
    md += `- Evidence: \`${wf.evidence_id}\` → \`${wf.artifact}\`\n`;
  } else {
    md += `- Checks:\n`;
    for (const wf of p.workflows) {
      md += `  - \`${wf.check_name}\` → \`${wf.evidence_id}\` → \`${wf.artifact}\`\n`;
    }
  }
  md += `\n`;
}

fs.writeFileSync(docPath, md.trim() + "\n");
console.log(`✅ Generated ${docPath} from ${regPath}`);
