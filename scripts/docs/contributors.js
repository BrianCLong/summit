const { execSync } = require('child_process');
const fs = require('fs');
const list = execSync(
  'git log --since="30 days ago" --pretty=%aN -- docs docs-site | sort | uniq',
  { encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(Boolean);
const md = `---
title: Docs Contributors (Last 30 days)
owner: docs
---

${list.map((n) => `- ${n}`).join('\n')}\n`;
fs.writeFileSync('docs/CONTRIBUTORS.md', md);
