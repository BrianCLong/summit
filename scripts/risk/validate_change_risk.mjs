#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const REQUIRED_FIELDS = ['risk'];

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
    riskReport: options['risk-report'] ?? 'risk-report.json',
    channel: options.channel ?? 'prod',
    output: options.output ?? 'artifacts/tenants/risk-validation.json',
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

function normalizeBand(band) {
  if (!band) return 'Unknown';
  const normalized = band.toLowerCase();
  if (normalized === 'none') return 'None';
  if (normalized === 'critical') return 'Critical';
  if (normalized === 'high') return 'High';
  if (normalized === 'medium') return 'Medium';
  if (normalized === 'low') return 'Low';
  return band;
}

function bandRank(band) {
  const normalized = normalizeBand(band);
  const ranking = { Low: 1, Medium: 2, High: 3, Critical: 4 };
  return ranking[normalized] ?? 0;
}

function main() {
  const { tenantProfile, resolvedPolicies, riskReport, channel, output } = parseArgs();

  if (!tenantProfile) {
    console.error('Missing --tenant-profile');
    process.exit(1);
  }

  const resolvedPath =
    resolvedPolicies ?? `artifacts/tenants/RESOLVED_POLICIES_${tenantProfile}.json`;

  const resolved = loadJson(resolvedPath);
  const report = loadJson(riskReport);

  const policy = resolved.policy ?? resolved;
  REQUIRED_FIELDS.forEach((field) => {
    if (!(field in policy)) {
      throw new Error(`Resolved policy missing ${field}`);
    }
  });
  const riskPolicy = policy.risk ?? {};
  const riskBand = normalizeBand(report.band ?? report.risk_band);
  const blockConfig = riskPolicy.block_on_high_risk_for_channel ?? {};
  const channelBlock = normalizeBand(blockConfig[channel] ?? 'High');

  const blocked = bandRank(riskBand) >= bandRank(channelBlock) && channelBlock !== 'None';

  const result = {
    tenant_profile: tenantProfile,
    channel,
    risk_band: riskBand,
    block_threshold: channelBlock,
    blocked,
    evaluated_at: new Date().toISOString(),
    source: {
      resolved_policy: resolvedPath,
      risk_report: riskReport,
    },
  };

  ensureDir(output);
  fs.writeFileSync(output, JSON.stringify(result, null, 2));

  if (blocked) {
    console.error(`Risk validation blocked for ${tenantProfile} on ${channel}.`);
    process.exitCode = 2;
  } else {
    console.log(`Risk validation passed for ${tenantProfile} on ${channel}.`);
  }
}

main();
