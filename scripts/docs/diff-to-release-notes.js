const { execSync } = require('child_process');
const fs = require('fs');
const tag = process.env.RELEASE_TAG || 'vNEXT';
const base = process.env.BASE_REF || 'origin/main~1';
const diff = execSync(`git diff --name-status ${base}... -- docs`, {
  encoding: 'utf8',
})
  .trim()
  .split('\n');
const changes = { added: [], modified: [], removed: [] };
for (const line of diff) {
  if (!line) continue;
  const [t, file] = line.split(/\s+/);
  if (t === 'A') changes.added.push(file);
  else if (t === 'M') changes.modified.push(file);
  else if (t === 'D') changes.removed.push(file);
}
const md = `---\ntitle: Docs Changes — ${tag}\nsummary: Additions, updates, and removals in docs for ${tag}.\nowner: docs\n---\n\n## Added\n${changes.added.map((f) => `- ${f}`).join('\n') || '- None'}\n\n## Updated\n${changes.modified.map((f) => `- ${f}`).join('\n') || '- None'}\n\n## Removed\n${changes.removed.map((f) => `- ${f}`).join('\n') || '- None'}\n`;
fs.mkdirSync('docs/releases', { recursive: true });
fs.writeFileSync(`docs/releases/changes-${tag}.md`, md);
console.log('Wrote docs/releases/changes-' + tag + '.md');
