import fs from 'fs';
import path from 'path';

const WORKFLOW_DIR = '.github/workflows';

function fixWorkflow(filename) {
  const filePath = path.join(WORKFLOW_DIR, filename);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Remove recursive triggers
  if (filename.includes('merge') || filename.includes('orchestrator') || filename.includes('bot')) {
    if (content.includes('push:') && content.includes('branches: [main]')) {
      content = content.replace(/[ ]+push:\n[ ]+branches: \[main\]\n/g, '');
      changed = true;
      console.log(`- Removed push trigger from ${filename}`);
    }
  }

  // 2. Add concurrency if missing
  if (!content.includes('concurrency:') && (content.includes('pull_request:') || content.includes('push:'))) {
    const concurrencyBlock = `\nconcurrency:\n  group: \${{ github.workflow }}-\${{ github.ref }}\n  cancel-in-progress: true\n`;
    content = content.replace(/(on:[\s\S]*?)(?=\n[a-z])/i, `$1${concurrencyBlock}`);
    changed = true;
    console.log(`- Added concurrency to ${filename}`);
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
  }
}

const files = fs.readdirSync(WORKFLOW_DIR).filter(f => f.endsWith('.yml'));
for (const file of files) {
  fixWorkflow(file);
}