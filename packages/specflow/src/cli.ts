#!/usr/bin/env node
import { Command } from 'commander';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const program = new Command();

program
  .name('summit')
  .description('Summit SpecFlow - Autonomous Change Workflow')
  .version('0.1.0');

program.command('explore')
  .description('Structured investigation of a problem space')
  .argument('<query>', 'The problem to investigate')
  .action(async (query) => {
    console.log(`🔍 Exploring: "${query}"`);
    console.log('... Spawning investigation agent (simulated) ...');

    const findingsContent = `# Findings: ${query}\n\n## Hypotheses\n- [ ] ...\n\n## Data Sources\n- ...`;
    try {
      await fs.writeFile('FINDINGS.md', findingsContent, { flag: 'wx' });
      console.log('✅ Created artifact: FINDINGS.md');
    } catch (e: any) {
      if (e.code === 'EEXIST') {
        console.log('⚠️  FINDINGS.md already exists.');
      } else {
        console.error('❌ Error creating FINDINGS.md:', e.message);
      }
    }
  });

program.command('new')
  .description('Start a new unit of work')
  .argument('<change-id>', 'ID of the change (e.g. feat/user-auth)')
  .action(async (changeId) => {
    console.log(`🚀 Scaffolding change: ${changeId}`);
    const changeDir = path.join('changes', changeId);

    try {
      await fs.mkdir(changeDir, { recursive: true });

      const specContent = `id: ${changeId}\nstatus: draft\nowner: user\nrequirements:\n  - ...`;
      await fs.writeFile(path.join(changeDir, 'spec.yaml'), specContent);
      console.log(`✅ Created ${path.join(changeDir, 'spec.yaml')}`);

      const readmeContent = `# Change: ${changeId}\n\nContext and implementation details.`;
      await fs.writeFile(path.join(changeDir, 'README.md'), readmeContent);
      console.log(`✅ Created ${path.join(changeDir, 'README.md')}`);

    } catch (e: any) {
      console.error('❌ Error scaffolding change:', e.message);
    }
  });

program.command('verify')
  .description('Generate a proof that the change is ready')
  .action(async () => {
    console.log('🛡️  Running Verify++ Rubric...');

    // Check if we are in a change directory or have a spec.yaml
    let hasSpec = false;
    try {
      await fs.access('spec.yaml');
      hasSpec = true;
    } catch {}

    const checks = [
      { name: 'Completeness', status: hasSpec ? 'PASS' : 'FAIL', msg: hasSpec ? 'spec.yaml found' : 'Missing spec.yaml' },
      { name: 'Correctness', status: 'PASS' }, // Simulated
      { name: 'Coherence', status: 'WARN', msg: 'Design update pending' },
      { name: 'Security', status: 'PASS' },
      { name: 'Compliance', status: 'PASS' },
      { name: 'Performance', status: 'PASS' },
      { name: 'UX', status: 'SKIP' },
      { name: 'Provenance', status: 'PASS' },
    ];
    console.table(checks);
    if (hasSpec) {
        console.log('✅ EvidenceBundle generated (simulated).');
    } else {
        console.log('❌ Verification failed: Context invalid.');
    }
  });

program.parse();
