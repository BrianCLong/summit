#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

// Helper to read JSON
const readJson = (filepath) => {
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error reading JSON file ${filepath}: ${err.message}`);
    process.exit(1);
  }
};

// Helper to read YAML or JSON policy
const readPolicy = (filepath) => {
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    if (filepath.endsWith('.json')) {
      return JSON.parse(content);
    }
    return yaml.load(content);
  } catch (err) {
    console.error(`Error reading policy file ${filepath}: ${err.message}`);
    process.exit(1);
  }
};

const args = process.argv.slice(2);
const getArg = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) return null;
  return args[index + 1];
};

const previewPath = getArg('--preview');
const prodPath = getArg('--prod');
const policyPath = getArg('--policy');

if (!previewPath || !prodPath || !policyPath) {
  console.error('Usage: compare_scorecards.mjs --preview <path> --prod <path> --policy <path>');
  process.exit(1);
}

const preview = readJson(previewPath);
const prod = readJson(prodPath);
const policy = readPolicy(policyPath);

console.log(`Comparing Scorecards...`);
console.log(`Preview: ${previewPath}`);
console.log(`Prod: ${prodPath}`);
console.log(`Policy: ${policyPath}`);

let failed = false;

// 1. Check Terraform Plan
// Policy might specify "allow_empty_plan" or similar.
// Assuming strict drift check means no changes allowed unless specified.
// The user prompt said "Diffs or it doesn't count", "drift blocks GA automatically".
// So if plan has changes (resource_changes), it's a drift.

// Note: The scorecard format in the user prompt is:
// { timestamp, environment, plan, flags, images }
// Where 'plan' is the output of 'terraform show -json plan.bin'

if (preview.plan) {
    const resourceChanges = preview.plan.resource_changes || [];
    const changes = resourceChanges.filter(rc => rc.change.actions.includes('create') || rc.change.actions.includes('update') || rc.change.actions.includes('delete'));

    if (changes.length > 0) {
        if (policy.terraform && policy.terraform.allow_changes === true) {
             console.warn('WARN: Terraform plan contains changes, but policy allows it.');
        } else {
            console.error('FAIL: Terraform plan contains changes (drift detected).');
            changes.forEach(c => console.log(`  - ${c.address}: ${c.change.actions.join(', ')}`));
            failed = true;
        }
    } else {
        console.log('PASS: Terraform plan is clean.');
    }
} else {
    // If no plan captured, maybe we should warn?
    // If it's just app parity check, maybe plan is optional?
    // User snippet implies plan is part of it.
    console.warn('WARN: No terraform plan found in preview scorecard.');
}

// 2. Check Feature Flags
if (policy.flags && policy.flags.check_parity) {
    const previewFlags = preview.flags || {};
    const prodFlags = prod.flags || {};

    // Check for keys present in both and if values match
    const allKeys = new Set([...Object.keys(previewFlags), ...Object.keys(prodFlags)]);
    const allowedDrift = policy.flags.allowed_drift || [];

    let flagDrift = false;
    for (const key of allKeys) {
        if (allowedDrift.includes(key)) continue;

        const valPreview = previewFlags[key];
        const valProd = prodFlags[key];

        if (JSON.stringify(valPreview) !== JSON.stringify(valProd)) {
            console.error(`FAIL: Flag mismatch for '${key}': Preview=${valPreview}, Prod=${valProd}`);
            flagDrift = true;
        }
    }

    if (flagDrift) {
        failed = true;
    } else {
        console.log('PASS: Feature flags match (excluding allowed drift).');
    }
}

// 3. Check Image Digests
if (policy.images && policy.images.check_parity) {
    const previewImages = preview.images || {};
    const prodImages = prod.images || {};

    let imageMismatch = false;
    for (const [svc, digest] of Object.entries(previewImages)) {
        if (prodImages[svc] !== digest) {
             console.error(`FAIL: Image digest mismatch for '${svc}': Preview=${digest}, Prod=${prodImages[svc]}`);
             imageMismatch = true;
        }
    }

    if (imageMismatch) {
        failed = true;
    } else {
        console.log('PASS: Image digests match.');
    }
}

if (failed) {
    console.error('BLOCKING GA: Parity check failed.');
    process.exit(1);
} else {
    console.log('SUCCESS: Parity check passed.');
    process.exit(0);
}
