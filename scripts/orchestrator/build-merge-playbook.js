const fs = require("fs");

const mms = JSON.parse(fs.readFileSync("artifacts/pr-planner/minimum_merge_set.json", "utf8"));
const actions = JSON.parse(fs.readFileSync("artifacts/pr-planner/pr_actions.json", "utf8"));

const mergeFirst = actions.filter(x => x.action === "merge-first");
const obsolete = actions.filter(x => x.action === "obsolete-after-root-merge");
const flatten = actions.filter(x => x.action === "flatten-into-stack-root");
const rebase = actions.filter(x => x.action === "rebase-after-root-cycle");
const mergeLater = actions.filter(x => x.action === "merge-later");
const manual = actions.filter(x => x.action === "manual-review");

let md = `# Summit Merge Playbook\n\n`;
md += `Generated from live PR graph.\n\n`;
md += `## Phase 1 — Merge MMS roots\n\n`;
for (const x of mms) {
  md += `- PR #${x.pr} — score=${x.score}, descendants=${x.descendants}, covers=${x.covers}\n`;
}

md += `\n## Phase 2 — Auto-close as obsolete after Phase 1\n\n`;
for (const x of obsolete.slice(0, 200)) {
  md += `- PR #${x.pr} — ${x.reason}\n`;
}

md += `\n## Phase 3 — Flatten stacks\n\n`;
for (const x of flatten.slice(0, 200)) {
  md += `- PR #${x.pr} — ${x.reason}\n`;
}

md += `\n## Phase 4 — Rebase after root merge cycle\n\n`;
for (const x of rebase.slice(0, 200)) {
  md += `- PR #${x.pr} — ${x.reason}\n`;
}

md += `\n## Phase 5 — Merge remaining clean independents\n\n`;
for (const x of mergeLater.slice(0, 200)) {
  md += `- PR #${x.pr} — ${x.reason}\n`;
}

md += `\n## Phase 6 — Manual queue\n\n`;
for (const x of manual.slice(0, 200)) {
  md += `- PR #${x.pr} — ${x.reason}\n`;
}

fs.writeFileSync("artifacts/pr-planner/merge_playbook.md", md);
