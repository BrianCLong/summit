#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const { PolicyService } = require('../dist/policy-service');

const policyPath = process.argv[2];
const ctxPath = process.argv[3];
if (!policyPath || !ctxPath) {
  console.error('Usage: lac-sim <policy.json> <context.json>');
  process.exit(2);
}

const resolvedPolicy = path.resolve(policyPath);
const resolvedCtx = path.resolve(ctxPath);
if (!fs.existsSync(resolvedPolicy)) {
  console.error(`Policy not found: ${resolvedPolicy}`);
  process.exit(2);
}
if (!fs.existsSync(resolvedCtx)) {
  console.error(`Context not found: ${resolvedCtx}`);
  process.exit(2);
}

const ctx = JSON.parse(fs.readFileSync(resolvedCtx, 'utf8'));
const service = new PolicyService(resolvedPolicy);
const decision = service.evaluateContext(ctx);
console.log(JSON.stringify(decision, null, 2));
process.exit(decision.allowed ? 0 : 1);
