const fs = require('fs');
const { execFileSync } = require('child_process');
const base = process.env.GITHUB_BASE_REF || 'main';
const diff = execFileSync('git', ['diff', '--name-only', `origin/${base}`]).toString();
const touchesData = diff.split('\n').some(p => /schema|model|db\/migrations|api\/openapi\.yaml/.test(p));
if (touchesData && !fs.existsSync('SECURITY/DPIA.md')) {
  console.error('DPIA required: add/updated SECURITY/DPIA.md');
  process.exit(1);
}