#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import yaml from 'js-yaml';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const REQUIRED_FIELDS = [
  'id', 'migration_ref', 'area', 'type', 'description', 'owner', 'ticket',
  'introduced_on', 'risk_level', 'rollback_plan', 'forward_fix_plan',
  'data_loss_risk', 'verification'
];

const VALID_TYPES = ['reversible', 'irreversible', 'risky'];
const VALID_AREAS = ['server', 'db', 'infra', 'other'];
const VALID_RISK_LEVELS = ['low', 'medium', 'high'];
const VALID_DATA_LOSS_RISKS = ['none', 'possible', 'likely'];

function validateEntry(entry) {
  const errors = [];
  const today = new Date().toISOString().split('T')[0];

  for (const field of REQUIRED_FIELDS) {
    if (entry[field] === undefined || entry[field] === null || entry[field] === '') {
      errors.push(`Missing required field: '${field}'`);
    }
  }

  if (entry.type && !VALID_TYPES.includes(entry.type)) {
    errors.push(`Invalid 'type': ${entry.type}. Must be one of ${VALID_TYPES.join(', ')}`);
  }
  if (entry.area && !VALID_AREAS.includes(entry.area)) {
    errors.push(`Invalid 'area': ${entry.area}. Must be one of ${VALID_AREAS.join(', ')}`);
  }
  if (entry.risk_level && !VALID_RISK_LEVELS.includes(entry.risk_level)) {
    errors.push(`Invalid 'risk_level': ${entry.risk_level}. Must be one of ${VALID_RISK_LEVELS.join(', ')}`);
  }
  if (entry.data_loss_risk && !VALID_DATA_LOSS_RISKS.includes(entry.data_loss_risk)) {
    errors.push(`Invalid 'data_loss_risk': ${entry.data_loss_risk}. Must be one of ${VALID_DATA_LOSS_RISKS.join(', ')}`);
  }

  if (entry.introduced_on && !/^\d{4}-\d{2}-\d{2}$/.test(entry.introduced_on)) {
    errors.push(`Invalid date format for 'introduced_on': ${entry.introduced_on}. Must be YYYY-MM-DD`);
  }

  if (entry.expires_on && !/^\d{4}-\d{2}-\d{2}$/.test(entry.expires_on)) {
    errors.push(`Invalid date format for 'expires_on': ${entry.expires_on}. Must be YYYY-MM-DD`);
  }

  if (entry.type === 'irreversible') {
    if (entry.data_loss_risk === 'none') {
      errors.push("'irreversible' migration must have 'data_loss_risk' set to 'possible' or 'likely'");
    }
    if (!entry.rollback_plan) {
      errors.push("'irreversible' migration must have a 'rollback_plan'");
    }
    if (!entry.forward_fix_plan) {
      errors.push("'irreversible' migration must have a 'forward_fix_plan'");
    }
  }

  if (entry.type === 'risky' && !entry.expires_on) {
    errors.push("'risky' migration must have an 'expires_on' date");
  }

  if (entry.expires_on && entry.expires_on < today) {
    errors.push(`'expires_on' date (${entry.expires_on}) has passed`);
  }

  return errors;
}

function getLastGaTagInfo() {
  try {
    const lastGaTag = execSync("git tag --list 'v*.*.*' --sort=-v:refname | grep -v -- '-rc' | head -n 1").toString().trim();
    if (!lastGaTag) {
      return { lastGaTag: null, lastGaTagDate: null };
    }
    const lastGaTagDate = execSync(`git log -1 --format=%aI ${lastGaTag}`).toString().trim().split('T')[0];
    return { lastGaTag, lastGaTagDate };
  } catch (error) {
    console.warn('Could not determine last GA tag. Skipping detection of new migrations.', error.message);
    return { lastGaTag: null, lastGaTagDate: null };
  }
}

function generateJsonSummary(entries, validationErrors, lastGaTagDate) {
  const summary = {
    status: 'valid',
    counts: {
      total: entries.length,
      by_type: { reversible: 0, irreversible: 0, risky: 0 },
    },
    new_migrations_since_last_ga: [],
    errors: [],
    expired_risky_migrations: [],
  };

  entries.forEach(entry => {
    if (entry.type && VALID_TYPES.includes(entry.type)) {
      summary.counts.by_type[entry.type]++;
    }
    if (lastGaTagDate && entry.introduced_on > lastGaTagDate) {
      summary.new_migrations_since_last_ga.push(entry.id);
    }
  });

  const today = new Date().toISOString().split('T')[0];
  entries.forEach(entry => {
    if (entry.type === 'risky' && entry.expires_on && entry.expires_on < today) {
      summary.expired_risky_migrations.push(entry.id);
    }
  });

  if (validationErrors.length > 0) {
    summary.status = 'invalid';
    summary.errors = validationErrors;
  } else if (summary.expired_risky_migrations.length > 0) {
    summary.status = 'invalid';
    summary.errors.push({ id: 'Expired Entries', errors: ['One or more risky migrations have expired.']})
  }

  return summary;
}

function generateMarkdownReport(summary, entries, lastGaTag) {
  let report = `# Migration Registry Report\n\n`;
  report += `**Status:** ${summary.status === 'valid' ? '✅ Valid' : '❌ Invalid'}\n\n`;
  report += `## Summary\n`;
  report += `- **Total Migrations:** ${summary.counts.total}\n`;
  report += `- **Reversible:** ${summary.counts.by_type.reversible}\n`;
  report += `- **Irreversible:** ${summary.counts.by_type.irreversible}\n`;
  report += `- **Risky:** ${summary.counts.by_type.risky}\n`;

  if (lastGaTag && summary.new_migrations_since_last_ga.length > 0) {
    report += `\n## 🚀 New Migrations Since ${lastGaTag}\n`;
    summary.new_migrations_since_last_ga.forEach(id => {
        report += `- ${id}\n`;
    });
  }

  if (summary.errors.length > 0) {
    report += `\n## 🚨 Validation Errors\n`;
    summary.errors.forEach(err => {
      report += `### Migration ID: ${err.id}\n`;
      err.errors.forEach(e => {
        report += `- ${e}\n`;
      });
    });
  }

  report += `\n## All Migrations\n`;
  report += `| ID | Type | Risk Level | Data Loss Risk | Owner | Ticket |\n`;
  report += `|----|------|------------|----------------|-------|--------|\n`;
  entries.forEach(entry => {
    report += `| ${entry.id || 'N/A'} | ${entry.type || 'N/A'} | ${entry.risk_level || 'N/A'} | ${entry.data_loss_risk || 'N/A'} | ${entry.owner || 'N/A'} | ${entry.ticket || 'N/A'} |\n`;
  });

  return report;
}

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('registry-file', {
      alias: 'f',
      type: 'string',
      description: 'Path to MIGRATIONS_REGISTRY.yml',
      default: 'docs/releases/MIGRATIONS_REGISTRY.yml',
    })
    .option('output-dir', {
      alias: 'o',
      type: 'string',
      description: 'Directory for report artifacts',
      default: 'artifacts/migrations',
    })
    .help()
    .argv;

  try {
    const fileContents = fs.readFileSync(argv.registryFile, 'utf8');
    const data = yaml.load(fileContents);
    const entries = data.migrations || [];

    const { lastGaTag, lastGaTagDate } = getLastGaTagInfo();

    const validationErrors = [];
    entries.forEach(entry => {
      const errors = validateEntry(entry);
      if (errors.length > 0) {
        validationErrors.push({ id: entry.id || 'Unknown', errors });
      }
    });

    const summary = generateJsonSummary(entries, validationErrors, lastGaTagDate);
    const report = generateMarkdownReport(summary, entries, lastGaTag);

    if (!fs.existsSync(argv.outputDir)) {
        fs.mkdirSync(argv.outputDir, { recursive: true });
    }

    fs.writeFileSync(path.join(argv.outputDir, 'summary.json'), JSON.stringify(summary, null, 2));
    fs.writeFileSync(path.join(argv.outputDir, 'report.md'), report);

    console.log(`✅ Reports generated in ${argv.outputDir}`);

    if (summary.status !== 'valid') {
      console.error('❌ Migration registry validation failed.');
      process.exit(1);
    }

  } catch (error) {
    console.error(`Error processing migration registry: ${error.message}`);
    process.exit(1);
  }
}

main();
