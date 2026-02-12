const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

const workflowsDir = '.github/workflows';

function fixWorkflow(file) {
  const filePath = path.join(workflowsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');

  try {
    let doc = yaml.load(content);
    if (!doc || !doc.jobs) return;

    let modified = true; // Always dump to normalize style and fix issues

    // Fix pull_request: null
    if (doc.on) {
        if (doc.on.pull_request === null) doc.on.pull_request = {};
        if (Array.isArray(doc.on.push?.branches)) {
            // keep it as array
        }
    }

    for (const jobId in doc.jobs) {
      const job = doc.jobs[jobId];
      if (!job.steps) continue;

      let setupNodeIdx = -1;
      let pnpmSetupIdx = -1;
      let hasPnpmCache = false;

      for (let i = 0; i < job.steps.length; i++) {
        const step = job.steps[i];

        if (step.uses && step.uses.includes('actions/setup-node')) {
          setupNodeIdx = i;
          if (step.with && step.with.cache === 'pnpm') {
            hasPnpmCache = true;
          }
          // Ensure node-version is a string to prevent yaml issues
          if (step.with && typeof step.with['node-version'] === 'number') {
              step.with['node-version'] = String(step.with['node-version']);
          }
        }

        if (step.uses && step.uses.includes('pnpm/action-setup')) {
          pnpmSetupIdx = i;
          // Remove version pinning
          if (step.with) {
              delete step.with.version;
              if (Object.keys(step.with).length === 0) delete step.with;
          }
        }

        if (step.run && step.run.includes('corepack enable')) {
          pnpmSetupIdx = i;
        }

        // Fix run commands
        if (step.run && (step.run.includes('npm install -g pnpm') || step.run.includes('pnpm add -w js-yaml'))) {
            step.run = 'pnpm install --frozen-lockfile --ignore-scripts';
        }
      }

      if (hasPnpmCache) {
        if (pnpmSetupIdx === -1) {
          job.steps.splice(setupNodeIdx, 0, {
            name: 'Setup pnpm',
            uses: 'pnpm/action-setup@v4'
          });
        } else if (pnpmSetupIdx > setupNodeIdx) {
          const [setupStep] = job.steps.splice(pnpmSetupIdx, 1);
          job.steps.splice(setupNodeIdx, 0, setupStep);
        }
      }

      const jobString = JSON.stringify(job);
      const needsSysDeps = jobId.includes('test') || jobId.includes('engine') || jobString.includes('test:unit') || jobString.includes('canvas') || jobString.includes('soc-controls');

      if (needsSysDeps) {
          const hasSysDeps = job.steps.some(s => (s.name && s.name.includes('system dependencies')) || (s.run && s.run.includes('libpixman')));
          if (!hasSysDeps) {
              job.steps.splice(0, 0, {
                  name: 'Install system dependencies',
                  run: 'sudo apt-get update && sudo apt-get install -y libpixman-1-dev libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev'
              });
          }
      }
    }

    let newContent = yaml.dump(doc, {
      lineWidth: -1,
      noRefs: true,
      quotingType: '"',
      noCompatMode: true
    });

    // Final cleanup of the dumped string
    newContent = newContent.replace(/pull_request: \{\}/g, 'pull_request:');

    fs.writeFileSync(filePath, newContent);

  } catch (e) {
    console.error(`Failed to fix ${file}: ${e.message}`);
  }
}

fs.readdirSync(workflowsDir).forEach(file => {
  if (file.endsWith('.yml') || file.endsWith('.yaml')) {
    fixWorkflow(file);
  }
});
