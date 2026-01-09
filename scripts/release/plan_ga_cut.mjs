#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i += 1) {
    const [key, value] = args[i].split('=');
    const normalizedKey = key.replace(/^--/, '');
    if (value === undefined) {
      options[normalizedKey] = args[i + 1];
      i += 1;
    } else {
      options[normalizedKey] = value;
    }
  }

  return {
    tenantProfile: options['tenant-profile'] ?? options.tenantProfile,
    resolvedPolicies: options['resolved-policies'],
    out: options.out ?? 'artifacts/tenants/ga-cut-plan.json',
    dryRun: options['dry-run'] === 'true' || options['dry-run'] === '1',
  };
}

function loadJson(filePath) {
  const absolute = path.resolve(process.cwd(), filePath);
  const raw = fs.readFileSync(absolute, 'utf8');
  return JSON.parse(raw);
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function main() {
  const { tenantProfile, resolvedPolicies, out, dryRun } = parseArgs();

  if (!tenantProfile) {
    console.error('Missing --tenant-profile');
    process.exit(1);
  }

  const resolvedPath =
    resolvedPolicies ?? `artifacts/tenants/RESOLVED_POLICIES_${tenantProfile}.json`;
  const resolved = loadJson(resolvedPath);
  const policy = resolved.policy ?? resolved;

  const plan = {
    tenant_profile: tenantProfile,
    generated_at: new Date().toISOString(),
    dry_run: dryRun,
    overlays: {
      policy_overlay: resolved.overlay_file ?? null,
      base_files: resolved.base_files ?? [],
    },
    ga_requirements: {
      readiness_tier: policy.ga?.readiness_tier ?? 'standard',
      evidence_requirements: policy.ga?.evidence_requirements ?? [],
      manual_signoff_required: policy.ga?.manual_signoff_required ?? false,
      required_signoffs: policy.ga?.required_signoffs ?? [],
      stabilization_window_days: policy.ga?.stabilization_window_days ?? 0,
    },
    risk_requirements: {
      block_on_high_risk_for_channel: policy.risk?.block_on_high_risk_for_channel ?? {},
      thresholds: policy.risk?.thresholds ?? {},
    },
    incident_requirements: {
      drill_cadence_days: policy.incident?.drill_cadence_days ?? null,
      rto_hours: policy.incident?.rto_hours ?? null,
      rpo_hours: policy.incident?.rpo_hours ?? null,
      rollback_slo_minutes: policy.incident?.rollback_slo_minutes ?? null,
    },
    deploy_channels: policy.deploy?.default_channels ?? [],
  };

  ensureDir(out);
  fs.writeFileSync(out, JSON.stringify(plan, null, 2));

  console.log(`GA cut plan written to ${out}`);
}

main();
