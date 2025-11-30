#!/usr/bin/env node
import fs from 'fs';

function score(item) {
  let risk = 0;
  const rationale = [];
  if (!item.webauthn?.userVerified) {
    risk += 20;
    rationale.push('missing_uv');
  }
  if (!item.local?.firewallEnabled) {
    risk += 15;
    rationale.push('firewall_off');
  }
  if ((item.ua?.platform || '').toLowerCase().includes('windows 7')) {
    risk += 40;
    rationale.push('block_list_platform');
  }
  if (!item.secureContext) {
    risk += 35;
    rationale.push('insecure_context');
  }
  const status = risk >= 70 ? 'block' : risk >= 40 ? 'step_up' : risk >= 25 ? 'downgrade' : 'pass';
  return { status, risk, rationale, claims: { 'posture:riskScore': risk, 'posture:status': status } };
}

function simulate(path) {
  const raw = fs.readFileSync(path, 'utf8');
  const items = JSON.parse(raw);
  const decisions = items.map((item) => ({ ...score({ ...item, secureContext: true }), os: item.os, browser: item.browser }));
  return decisions;
}

if (process.argv.length < 3) {
  // eslint-disable-next-line no-console
  console.error('Usage: policy-simulator <fixtures.json>');
  process.exit(1);
}

const decisions = simulate(process.argv[2]);
// eslint-disable-next-line no-console
console.log(JSON.stringify(decisions, null, 2));
