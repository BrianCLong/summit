#!/usr/bin/env node
// Scans .github/workflows/*.yml for "uses:" and normalizes to "owner/repo@<ref>".
// Emits JSON: { refs: ["actions/checkout@<sha>", ...] }
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const workflowDir = path.join(process.cwd(), '.github', 'workflows');
const refs = new Set();

for (const entry of fs.readdirSync(workflowDir)) {
  if (!entry.endsWith('.yml') && !entry.endsWith('.yaml')) {
    continue;
  }
  const filePath = path.join(workflowDir, entry);
  const doc = yaml.parse(fs.readFileSync(filePath, 'utf8')) || {};
  const jobs = doc.jobs || {};

  for (const job of Object.values(jobs)) {
    if (!job) {
      continue;
    }

    if (typeof job.uses === 'string') {
      const usesValue = job.uses.trim();
      if (usesValue.startsWith('./')) {
        refs.add(`local/${usesValue}`);
      } else {
        refs.add(usesValue);
      }
    }

    const steps = Array.isArray(job.steps) ? job.steps : [];
    for (const step of steps) {
      if (!step || typeof step.uses !== 'string') {
        continue;
      }
      const usesValue = step.uses.trim();
      if (usesValue.startsWith('./')) {
        refs.add(`local/${usesValue}`);
        continue;
      }
      refs.add(usesValue);
    }
  }
}

process.stdout.write(JSON.stringify({ refs: Array.from(refs).sort() }, null, 2));
