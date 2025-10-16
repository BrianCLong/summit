#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const type = process.argv[2] || 'how-to';
const title = process.argv.slice(3).join(' ') || 'New Page';
const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const tpl = fs
  .readFileSync(`docs/_templates/${type}.md`, 'utf8')
  .replace('<Task-oriented title>', title)
  .replace('<End-to-end tutorial>', title)
  .replace('<Concept name>', title)
  .replace(
    'lastUpdated:',
    `lastUpdated: ${new Date().toISOString().slice(0, 10)}`,
  );
const out = `docs/${type === 'concept' ? 'concepts' : type}/${slug}.md`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, tpl);
console.log('Created', out);
