#!/usr/bin/env node
import fs from 'fs';
import { loadPolicy, evaluate } from '../dist/policy-engine.js';

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
