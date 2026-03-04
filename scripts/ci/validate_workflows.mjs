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
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKFLOWS_DIR = path.join(__dirname, '../../.github/workflows');
const MAX_WORKFLOWS = 25;
const REQUIRED_WORKFLOWS = ['pr-gate.yml', 'main-validation.yml'];

// Workflows that should have path filters
const PATH_FILTER_RECOMMENDED = ['server-ci.yml', 'client-ci.yml', 'infra-ci.yml', 'docs-ci.yml'];

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
      .filter(f => !f.startsWith('_')); // Ignore underscore-prefixed (like _auth-oidc.yml)

    const count = files.length;
    this.log(`Found ${count} workflows (max: ${MAX_WORKFLOWS})`, 'debug');

    if (count > MAX_WORKFLOWS) {
      this.error(`Too many workflows: ${count} > ${MAX_WORKFLOWS}`);
      this.error(`Consider consolidating workflows or moving to archived/`);
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
      const workflow = yaml.load(content);

      if (!workflow || typeof workflow !== 'object') {
        this.warning(`${filename}: Unable to parse as YAML object`);
        return;
      }

      // Check for workflow name
      if (!workflow.name) {
        this.warning(`${filename}: Missing workflow name`);
      } else {
        // Check for duplicate names
        if (this.workflowNames.has(workflow.name)) {
          this.error(`${filename}: Duplicate workflow name: ${workflow.name}`);
        }
        this.workflowNames.add(workflow.name);
      }

      // Check for concurrency guard
      if (!workflow.concurrency) {
        this.error(`${filename}: Missing concurrency guard`);
        this.error(`  Add: concurrency:\\n    group: ${workflow.name || 'workflow'}-\\${{ github.ref }}\\n    cancel-in-progress: true`);
      } else {
        this.log(`${filename}: Has concurrency guard ✓`, 'debug');
      }

      // Check for path filters on recommended workflows
      if (PATH_FILTER_RECOMMENDED.includes(filename)) {
        const hasPaths = workflow.on?.pull_request?.paths ||
                        workflow.on?.push?.paths;

        if (!hasPaths) {
          this.warning(`${filename}: Recommended to have path filters`);
        } else {
          this.log(`${filename}: Has path filters ✓`, 'debug');
        }
      }

      // Check for timeout on jobs
      if (workflow.jobs) {
        for (const [jobName, job] of Object.entries(workflow.jobs)) {
          if (typeof job === 'object' && !job['timeout-minutes']) {
            this.warning(`${filename}: Job '${jobName}' missing timeout-minutes`);
          }
        }
      }

    } catch (err) {
      this.error(`${filename}: Failed to validate: ${err.message}`);
    }
  }

  validateAllWorkflows() {
    this.log('\n🔍 Validating individual workflows...', 'info');

    const files = fs.readdirSync(WORKFLOWS_DIR)
      .filter(f => (f.endsWith('.yml') || f.endsWith('.yaml')))
      .filter(f => !f.startsWith('_')); // Skip partials like _auth-oidc.yml

    for (const file of files) {
      this.validateWorkflowFile(file);
    }
  }

  checkForArchived() {
    this.log('\n📦 Checking archived workflows...', 'info');

    const archivedDir = path.join(WORKFLOWS_DIR, 'archived');
    if (fs.existsSync(archivedDir)) {
      const archivedCount = fs.readdirSync(archivedDir)
        .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'))
        .length;

      this.log(`Archived workflows: ${archivedCount}`, 'info');
    }
  }

  async run() {
    console.log('═══════════════════════════════════════');
    console.log('   CI Workflow Drift Sentinel');
    console.log('═══════════════════════════════════════\n');

    this.validateWorkflowCount();
    this.validateRequiredWorkflows();
    this.validateAllWorkflows();
    this.checkForArchived();

    // Summary
    console.log('\n═══════════════════════════════════════');
    console.log('   Summary');
    console.log('═══════════════════════════════════════');
    console.log(`Errors:   ${this.errors.length}`);
    console.log(`Warnings: ${this.warnings.length}`);
    console.log('═══════════════════════════════════════\n');

    if (this.errors.length > 0) {
      console.error('\n❌ Validation failed with errors:');
      this.errors.forEach(err => console.error(`  - ${err}`));
      process.exit(1);
    }

    if (this.warnings.length > 0) {
      console.warn('\n⚠️  Validation passed with warnings:');
      this.warnings.forEach(warn => console.warn(`  - ${warn}`));
    }

    console.log('\n✅ Workflow validation passed!\n');
    process.exit(0);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new WorkflowValidator();
  validator.run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

export default WorkflowValidator;
