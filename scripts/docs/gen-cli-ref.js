const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const cmds = ['intelgraph', 'intelgraph agents', 'intelgraph datasets'];
const outDir = 'docs/reference/cli';
fs.mkdirSync(outDir, { recursive: true });
for (const c of cmds) {
  const slug = c.replace(/\s+/g, '-');
  const help = execSync(`${c} --help`, { encoding: 'utf8' });
  const md = `---\ntitle: ${c} CLI\nowner: platform\nversion: latest\n---\n\n\n\n\n\n\n\n\
${help.replace(/`/g, '\`')}
\
`;
  fs.writeFileSync(path.join(outDir, `${slug}.md`), md);
}
