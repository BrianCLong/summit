#!/usr/bin/env node
import fs from 'node:fs';
import yaml from 'js-yaml';
import { verifyBundle } from '../../summit/agents/policy/bundle/verify-bundle';

type CheckResult = { ok: boolean; errors: string[] };

function loadPolicy(): Record<string, unknown> {
  const raw = fs.readFileSync('summit/agents/policy/policy.yml', 'utf8');
  const parsed = yaml.load(raw);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('policy.yml must parse to an object');
  }
  return parsed as Record<string, unknown>;
}

function validateSemantics(policy: Record<string, unknown>): CheckResult {
  const errors: string[] = [];
  const semantics = policy.semantics as Record<string, unknown> | undefined;
  if (!semantics || !Array.isArray(semantics.allowed_actions)) {
    errors.push('policy.semantics.allowed_actions must be an array');
  }
  return { ok: errors.length === 0, errors };
}

function validateIntensity(policy: Record<string, unknown>): CheckResult {
  const errors: string[] = [];
  const intensity = policy.intensity as Record<string, unknown> | undefined;
  const min = Number(intensity?.min);
  const max = Number(intensity?.max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min) {
    errors.push('policy.intensity must define numeric min/max with 0 <= min <= max');
  }
  return { ok: errors.length === 0, errors };
}

function shouldVerifyProdBundle(changedFiles: string[]): boolean {
  return changedFiles.some((file) =>
    file.startsWith('summit/agents/policy/') || file.startsWith('summit/agents/skills/')
  );
}

function main(): void {
  const changedFiles = process.argv.slice(2);
  const policy = loadPolicy();

  const checks = [validateSemantics(policy), validateIntensity(policy)];
  const errors = checks.flatMap((check) => check.errors);

  if (shouldVerifyProdBundle(changedFiles)) {
    const verification = verifyBundle('prod');
    if (!verification.ok) {
      errors.push(
        ...verification.errors,
        'Update policy-bundle.prod.json and ensure approvals include governance.'
      );
    }
  }

  if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exit(1);
  }

  console.log('Policy checks passed.');
}

main();
