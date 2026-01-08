#!/usr/bin/env node

import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

const FAILURE_OWNERS_PATH = path.join(process.cwd(), 'docs/ci/FAILURE_OWNERS.yml');
const REPORT_PATH = path.join(process.cwd(), 'artifacts/ci-owners/validation.md');

function validate() {
  console.log(`Validating ${FAILURE_OWNERS_PATH}...`);

  if (!fs.existsSync(FAILURE_OWNERS_PATH)) {
    console.error(`Error: ${FAILURE_OWNERS_PATH} not found.`);
    process.exit(1);
  }

  let content;
  try {
    content = fs.readFileSync(FAILURE_OWNERS_PATH, 'utf8');
  } catch (e) {
    console.error(`Error reading file: ${e.message}`);
    process.exit(1);
  }

  let data;
  try {
    data = yaml.load(content);
  } catch (e) {
    console.error(`Error parsing YAML: ${e.message}`);
    process.exit(1);
  }

  const errors = [];
  const warnings = [];

  // Validate top-level keys
  if (!data.defaults) errors.push('Missing top-level key: defaults');
  if (!data.owners) errors.push('Missing top-level key: owners');

  // Validate defaults
  if (data.defaults) {
    if (!data.defaults.triage_label) errors.push('Missing defaults.triage_label');
    if (!data.defaults.owner_label_prefix) errors.push('Missing defaults.owner_label_prefix');
  }

  // Validate owners
  if (data.owners && Array.isArray(data.owners)) {
    const seenIds = new Set();

    data.owners.forEach((owner, index) => {
      const location = `owners[${index}]`;

      if (!owner.id) {
        errors.push(`${location}: Missing id`);
      } else {
        if (seenIds.has(owner.id)) {
          errors.push(`${location}: Duplicate id ${owner.id}`);
        }
        seenIds.add(owner.id);
      }

      if (!owner.name) errors.push(`${location}: Missing name`);

      if (owner.github) {
        if (!Array.isArray(owner.github)) {
          errors.push(`${location}: github must be an array`);
        } else {
          if (owner.github.length > 3) {
            errors.push(`${location}: github has too many handles (max 3)`);
          }
          owner.github.forEach(handle => {
            if (!handle.startsWith('@')) {
              errors.push(`${location}: github handle ${handle} must start with @`);
            }
          });
        }
      }

      if (owner.labels) {
        if (!Array.isArray(owner.labels)) {
          errors.push(`${location}: labels must be an array`);
        } else if (data.defaults && data.defaults.owner_label_prefix) {
            owner.labels.forEach(label => {
                if (!label.startsWith(data.defaults.owner_label_prefix)) {
                    warnings.push(`${location}: label ${label} does not start with prefix ${data.defaults.owner_label_prefix}`);
                }
            });
        }
      }

      if (owner.matches) {
          const validMatchKeys = ['failure_codes', 'categories', 'paths', 'workflows'];
          Object.keys(owner.matches).forEach(key => {
              if (!validMatchKeys.includes(key)) {
                  errors.push(`${location}: matches contains invalid key ${key}`);
              }
          });
      }
    });
  } else if (data.owners) {
      errors.push('owners must be an array');
  }

  // Generate Report
  const reportDir = path.dirname(REPORT_PATH);
  if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
  }

  let reportContent = '# Failure Owners Validation Report\n\n';
  reportContent += `Date: ${new Date().toISOString()}\n\n`;

  if (errors.length === 0) {
      reportContent += '## Status: PASS\n\n';
      reportContent += 'No errors found.\n';
      console.log('Validation passed.');
  } else {
      reportContent += '## Status: FAIL\n\n';
      reportContent += '### Errors\n';
      errors.forEach(err => reportContent += `- ${err}\n`);
      console.error('Validation failed.');
  }

  if (warnings.length > 0) {
      reportContent += '\n### Warnings\n';
      warnings.forEach(warn => reportContent += `- ${warn}\n`);
      console.warn('Validation has warnings.');
  }

  fs.writeFileSync(REPORT_PATH, reportContent);
  console.log(`Report written to ${REPORT_PATH}`);

  if (errors.length > 0) {
      process.exit(1);
  }
}

validate();
