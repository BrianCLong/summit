import fs from 'fs';
import path from 'path';

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  let prev;
  do {
    prev = content;
    // We will replace the whole conflict block with the HEAD block (the top one)
    // because some files only have a comma difference, let's keep it simple
    content = content.replace(/<<<<<<< HEAD\n(.*?)\n=======\n.*?\n>>>>>>> [^\n]*\n/gs, '$1\n');
  } while (content !== prev);

  fs.writeFileSync(file, content);

  try {
    JSON.parse(fs.readFileSync(file, 'utf8'));
    console.log(`Success parsing ${file}`);
  } catch(e) {
    console.error(`Failed parsing ${file}: ${e.message}`);
  }
}

const list = [
  '.archive/v039/server/package.json',
  '.github/scripts/issue-queue-bot/package.json',
  'apps/.desktop-electron-disabled/package.json',
  'apps/.mobile-native-disabled/package.json',
  'benchmark/package.json',
  'companyos/services/tenant-api/package.json',
  'conductor-ui/backend/package.json',
  'deepagent-mvp/package.json',
  'extensions/vscode-maestro/package.json',
  'gateway/graphql-bff/package.json',
  'gateway/package.json',
  'intelgraph/server/package.json',
  'intelgraph-quickstart/api/package.json',
  'services/predictive-analytics/predictive-integrity-shield/package.json',
  'services/predictive-analytics/synthetic-future-personas/package.json',
  'services/predictive-analytics/temporal-fracture-forecasting/package.json',
  'services/predictive-analytics/uncertainty-field-mapping/package.json',
  'services/sandbox-gateway/package.json',
  'tools/ultra-agent/vscode/package.json',
  'tools/vscode/doc-lsp/package.json',
  'tools/vscode/intelgraph-docs/package.json',
  'ui/graph-timeline-demo/package.json',
  'webapp/package.json'
];

for (const file of list) {
  if (fs.existsSync(file)) {
    fixFile(file);
  }
}
