#!/usr/bin/env node
const { loadPolicy, evaluate } = require('../dist/policy-engine');
const fs = require('fs');

const policy = process.argv[2];
const ctxPath = process.argv[3];
if(!policy || !ctxPath){
  console.error('Usage: lac-sim <policy.json> <context.json>');
  process.exit(2);
}
const ctx = JSON.parse(fs.readFileSync(ctxPath, 'utf8'));
const decision = evaluate(loadPolicy(policy), ctx);
console.log(JSON.stringify(decision, null, 2));
process.exit(decision.allowed ? 0 : 1);
