#!/usr/bin/env node
import { buildStar } from './graph';
import { simulate } from './sim';

const n = Number(process.argv[2] || 50);
const steps = Number(process.argv[3] || 20);
const g = buildStar(n);

// Scenario A: attacker only
const A = simulate(g, ['0','1','2'], [], steps);

// Scenario B: publish KPW proof at t=2 + influencer rebuttal at t=3
const B = simulate(g, ['0','1','2'], [
  { t: 2, type: 'publish_proof' },
  { t: 3, type: 'influencer_rebuttal' }
], steps);

// Scenario C: pre-bunk at t=0 + proof at t=2
const C = simulate(g, ['0','1','2'], [
  { t: 0, type: 'prebunk' },
  { t: 2, type: 'publish_proof' }
], steps);

console.log('Scenario, Peak, AUC');
console.log(`A (no defense), ${A.peak.toFixed(3)}, ${A.auc.toFixed(3)}`);
console.log(`B (proof+rebuttal), ${B.peak.toFixed(3)}, ${B.auc.toFixed(3)}`);
console.log(`C (prebunk+proof), ${C.peak.toFixed(3)}, ${C.auc.toFixed(3)}`);