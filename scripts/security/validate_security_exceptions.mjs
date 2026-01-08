#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const ARTIFACTS_DIR = 'artifacts/security-exceptions';
const REGISTRY_FILE = 'docs/security/SECURITY_EXCEPTIONS.yml';

const argv = yargs(hideBin(process.argv))
  .option('strict', {
    alias: 's',
    type: 'boolean',
    description: 'Exit with a non-zero status code for validation failures.',
    default: false,
  })
  .option('release-channel', {
    alias: 'c',
    type: 'string',
    description: 'The release channel being gated (e.g., "ga", "rc").',
    default: 'pr',
  }).argv;

function validateException(exception, today) {
  const errors = [];
  const requiredFields = [
    'id', 'control', 'scope', 'description', 'owner', 'ticket', 'rationale',
    'compensating_controls', 'risk_rating', 'created_on', 'expires_on'
  ];

  for (const field of requiredFields) {
    if (exception[field] === undefined || exception[field] === null || exception[field] === '') {
      errors.push(`Missing required field: '${field}'`);
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Date validation
  const expiresOn = new Date(exception.expires_on);
  if (expiresOn < today) {
    errors.push(`Exception has expired (expires_on: ${exception.expires_on})`);
  }

  // High/Critical risk validation
  if (['high', 'critical'].includes(exception.risk_rating)) {
    if (!Array.isArray(exception.compensating_controls) || exception.compensating_controls.length < 2) {
      errors.push('High/Critical risk exceptions require at least 2 compensating controls.');
    }
  }

  // GA channel validation
  if (argv.releaseChannel === 'ga') {
    if (exception.risk_rating === 'critical') {
      if (!Array.isArray(exception.approvals) || exception.approvals.length === 0) {
        errors.push('Critical risk exceptions are disallowed for GA releases without explicit approvals.');
      }
    }
    const createdOn = new Date(exception.created_on);
    const reviewRequiredBy = exception.review_required_by ? new Date(exception.review_required_by) : null;
    if (!reviewRequiredBy) {
      errors.push('GA channel exceptions must have a `review_required_by` date.');
    } else {
      const fourteenDays = 14 * 24 * 60 * 60 * 1000;
      if (reviewRequiredBy.getTime() - createdOn.getTime() > fourteenDays) {
        errors.push('For GA channel, `review_required_by` must be within 14 days of `created_on`.');
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}

function generateReport(results) {
    const { valid, invalid, expired, expiringSoon } = results;

    let markdown = `# Security Exceptions Report\n\n`;
    markdown += `*Generated on: ${new Date().toUTCString()}*\n`;
    markdown += `*Release Channel: \`${argv.releaseChannel}\`*\n`;
    markdown += `*Strict Mode: \`${argv.strict}\`*\n\n`;

    markdown += `## Summary\n`;
    markdown += `- **Valid:** ${valid.length}\n`;
    markdown += `- **Invalid:** ${invalid.length}\n`;
    markdown += `- **Expired:** ${expired.length}\n`;
    markdown += `- **Expiring Soon (<=7 days):** ${expiringSoon.length}\n\n`;

    if (invalid.length > 0) {
        markdown += `## ❌ Invalid Exceptions\n\n`;
        invalid.forEach(ex => {
            markdown += `### \`${ex.id}\`\n`;
            markdown += `- **Owner:** ${ex.owner}\n`;
            markdown += `- **Control:** ${ex.control}\n`;
            markdown += `- **Errors:**\n`;
            ex.errors.forEach(err => {
                markdown += `  - ${err}\n`;
            });
            markdown += '\n';
        });
    }

    if (expired.length > 0) {
        markdown += `## Expired Exceptions\n\n`;
        expired.forEach(ex => {
            markdown += `- **${ex.id}**: Expired on ${ex.expires_on} (Owner: ${ex.owner})\n`;
        });
        markdown += '\n';
    }

    if (expiringSoon.length > 0) {
        markdown += `## Expiring Soon\n\n`;
        expiringSoon.forEach(ex => {
            markdown += `- **${ex.id}**: Expires on ${ex.expires_on} (Owner: ${ex.owner})\n`;
        });
        markdown += '\n';
    }

    if (valid.length > 0) {
        markdown += `## ✅ Active & Valid Exceptions\n\n`;
        valid.forEach(ex => {
            markdown += `### \`${ex.id}\`\n`;
            markdown += `- **Risk:** ${ex.risk_rating}\n`;
            markdown += `- **Owner:** ${ex.owner}\n`;
            markdown += `- **Control:** ${ex.control}\n`;
            markdown += `- **Expires:** ${ex.expires_on}\n\n`;
        });
    }

    return markdown;
}


function main() {
  console.log('Running security exception validator...');

  if (!fs.existsSync(REGISTRY_FILE)) {
    console.error(`Error: Registry file not found at ${REGISTRY_FILE}`);
    process.exit(1);
  }

  const fileContents = fs.readFileSync(REGISTRY_FILE, 'utf8');
  const data = yaml.load(fileContents);
  const exceptions = data.exceptions || [];

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day

  const results = {
    valid: [],
    invalid: [],
    expired: [],
    expiringSoon: [],
    errors: 0,
  };

  for (const ex of exceptions) {
    const { isValid, errors } = validateException(ex, today);
    if (isValid) {
      results.valid.push(ex);
      const expiresOn = new Date(ex.expires_on);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (expiresOn.getTime() - today.getTime() <= sevenDays) {
        results.expiringSoon.push(ex);
      }
    } else {
      ex.errors = errors;
      results.invalid.push(ex);
      results.errors += errors.length;
      if (errors.some(e => e.startsWith('Exception has expired'))) {
        results.expired.push(ex);
      }
    }
  }

  // Create artifacts
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'summary.json'), JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'report.md'), generateReport(results));

  console.log(`Validation complete. Found ${results.errors} total errors.`);
  console.log(`Report generated at ${path.join(ARTIFACTS_DIR, 'report.md')}`);

  if (argv.strict && results.errors > 0) {
    console.error('\n❌ Strict mode enabled and validation failures were found. Exiting with error.');
    process.exit(1);
  } else {
    console.log('\n✅ Validation successful.');
    process.exit(0);
  }
}

main();
