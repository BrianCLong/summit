#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const REQUIRED_CHECKS_PATH = path.join(
  ROOT,
  'release/ga-launch/required-checks.manifest.json',
);
const TRIGGER_MATRIX_PATH = path.join(
  ROOT,
  'release/ga-launch/ci-trigger-matrix.json',
);

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

function validateRequiredChecks(manifest, failures) {
  assert(
    manifest?.branches?.['release/v4-ga']?.require_merge_queue === true,
    'release/v4-ga must require merge queue.',
    failures,
  );

  for (const [branch, config] of Object.entries(manifest.branches ?? {})) {
    const checks = config.required_checks ?? [];
    assert(
      checks.length === 1,
      `${branch} must have exactly one required check context.`,
      failures,
    );
    assert(
      checks[0] === 'pr-gate / gate',
      `${branch} required check must be "pr-gate / gate".`,
      failures,
    );

    for (const forbidden of manifest.validation_contract
      ?.forbidden_required_contexts ?? []) {
      assert(
        !checks.includes(forbidden),
        `${branch} contains forbidden required context: ${forbidden}.`,
        failures,
      );
    }
  }
}

function validateTriggerMatrix(matrix, failures) {
  const classes = matrix.workflow_classes ?? [];
  const classMap = new Map(classes.map((entry) => [entry.name, entry]));

  assert(classMap.has('pr-gate'), 'ci-trigger-matrix missing pr-gate class.', failures);
  assert(classMap.has('full-ci'), 'ci-trigger-matrix missing full-ci class.', failures);

  const prGate = classMap.get('pr-gate');
  const fullCi = classMap.get('full-ci');

  if (prGate) {
    assert(
      prGate.required_for_merge === true,
      'pr-gate must be marked required_for_merge=true.',
      failures,
    );
    assert(
      (prGate.events ?? []).includes('pull_request'),
      'pr-gate must run on pull_request.',
      failures,
    );
  }

  if (fullCi) {
    assert(
      !(fullCi.events ?? []).includes('pull_request'),
      'full-ci must not run on pull_request.',
      failures,
    );
    assert(
      (fullCi.events ?? []).includes('merge_group'),
      'full-ci must run on merge_group.',
      failures,
    );
  }

  for (const entry of classes) {
    assert(
      Boolean(entry?.concurrency?.group),
      `${entry.name} is missing concurrency.group.`,
      failures,
    );
  }
}

function main() {
  const failures = [];

  const requiredChecksManifest = readJson(REQUIRED_CHECKS_PATH);
  const triggerMatrix = readJson(TRIGGER_MATRIX_PATH);

  validateRequiredChecks(requiredChecksManifest, failures);
  validateTriggerMatrix(triggerMatrix, failures);

  if (failures.length > 0) {
    console.error('GA launch artifact validation failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('GA launch artifact validation passed.');
}

main();
