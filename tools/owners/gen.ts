import fs from 'fs';
const pkgs = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  .workspaces as string[];
const lines = ['# AUTO-GENERATED — DO NOT EDIT'];
for (const p of pkgs) {
  lines.push(`${p} @intelgraph/backend @intelgraph/ops`);
}
fs.writeFileSync('.github/CODEOWNERS', lines.join('\n'));
