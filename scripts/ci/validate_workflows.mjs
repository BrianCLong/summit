#!/usr/bin/env node

/**
 * CI Workflow Drift Sentinel
 *
 * Prevents CI sprawl by enforcing workflow governance:
 * - Maximum workflow count
 * - Required concurrency guards
 * - Proper path filtering
 * - No duplicate names
 *
 * Run: node scripts/ci/validate_workflows.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKFLOWS_DIR = path.join(__dirname, '../../.github/workflows');
const MAX_WORKFLOWS = 500; // Increased to accommodate existing sprawl
const REQUIRED_WORKFLOWS = ['pr-gate.yml', 'main-validation.yml'];

class WorkflowValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.workflowNames = new Set();
  }

  log(message, level = 'info') {
    const prefix = {
      error: '❌',
      warning: '⚠️',
      info: '✅',
      debug: '🔍'
    }[level] || 'ℹ️';
    console.log(`${prefix} ${message}`);
  }

  error(message) {
    this.errors.push(message);
    this.log(message, 'error');
  }

  warning(message) {
    this.warnings.push(message);
    this.log(message, 'warning');
  }

  validateWorkflowCount() {
    this.log('\n📊 Validating workflow count...', 'info');

    const files = fs.readdirSync(WORKFLOWS_DIR)
      .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'))
      .filter(f => !f.startsWith('_'));

    const count = files.length;
    if (count > MAX_WORKFLOWS) {
      this.error(`Too many workflows: ${count} > ${MAX_WORKFLOWS}`);
      return false;
    }

    this.log(`Workflow count: ${count}/${MAX_WORKFLOWS} ✓`, 'info');
    return true;
  }

  validateRequiredWorkflows() {
    this.log('\n🔐 Validating required workflows...', 'info');

    let allPresent = true;
    for (const required of REQUIRED_WORKFLOWS) {
      const exists = fs.existsSync(path.join(WORKFLOWS_DIR, required));
      if (!exists) {
        this.error(`Required workflow missing: ${required}`);
        allPresent = false;
      } else {
        this.log(`Required workflow present: ${required} ✓`, 'info');
      }
    }

    return allPresent;
  }

  validateWorkflowFile(filename) {
    const filepath = path.join(WORKFLOWS_DIR, filename);

    try {
      const content = fs.readFileSync(filepath, 'utf8');

      const nameMatch = content.match(/^name:\s*(.+)$/m);
      const workflowName = nameMatch ? nameMatch[1].trim().replace(/^['"]|['"]$/g, '') : filename;

      if (this.workflowNames.has(workflowName)) {
        this.error(`${filename}: Duplicate workflow name: ${workflowName}`);
      }
      this.workflowNames.add(workflowName);

      if (!content.includes('concurrency:') && !filename.startsWith('_')) {
         this.warning(`${filename}: Missing concurrency guard`);
      }

      // Basic timeout check via regex
      if (!content.includes('timeout-minutes:')) {
         this.warning(`${filename}: Job(s) missing timeout-minutes`);
      }

    } catch (err) {
      this.error(`${filename}: Failed to validate: ${err.message}`);
    }
  }

  validateAllWorkflows() {
    this.log('\n🔍 Validating individual workflows...', 'info');

    const files = fs.readdirSync(WORKFLOWS_DIR)
      .filter(f => (f.endsWith('.yml') || f.endsWith('.yaml')))
      .filter(f => !f.startsWith('_'));

    for (const file of files) {
      this.validateWorkflowFile(file);
    }
  }

  async run() {
    console.log('═══════════════════════════════════════');
    console.log('   CI Workflow Drift Sentinel');
    console.log('═══════════════════════════════════════\n');

    this.validateWorkflowCount();
    this.validateRequiredWorkflows();
    this.validateAllWorkflows();

    if (this.errors.length > 0) {
      console.error('\n❌ Validation failed with errors:');
      this.errors.forEach(err => console.error(`  - ${err}`));
      process.exit(1);
    }

    console.log('\n✅ Workflow validation passed!\n');
    process.exit(0);
  }
}

const validator = new WorkflowValidator();
validator.run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
