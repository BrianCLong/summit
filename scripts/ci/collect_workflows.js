const fs = require('fs');
const path = require('path');

const root = '.github/workflows';
const out = [];

if (fs.existsSync(root)) {
  for (const f of fs.readdirSync(root)) {
    if (!f.endsWith('.yml') && !f.endsWith('.yaml')) continue;
    const p = path.join(root, f);
    const text = fs.readFileSync(p, 'utf8');
    // naive parse: grep "uses:" lines with job/step names for context
    const lines = text.split('\n');
    let currentJob = null, currentStep = null;
    for (const line of lines) {
      const mJob = line.match(/^\s{2}(\w+):\s*$/);
      if (mJob) currentJob = mJob[1];
      const mName = line.match(/^\s+-\s+name:\s*(.+)\s*$/);
      if (mName) currentStep = mName[1].trim();
      const mUses = line.match(/uses:\s*([^\s#]+)\s*$/);
      if (mUses) {
        out.push({
          file: f,
          job: currentJob,
          name: currentStep || currentJob || f,
          uses: mUses[1]
        });
      }
    }
  }
}

process.stdout.write(JSON.stringify(out, null, 2));
