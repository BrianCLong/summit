#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const fg = require('fast-glob');
const yaml = require('js-yaml');
const { create } = require('xmlbuilder2');

function parseArgs() {
  const args = process.argv.slice(2);
  const conf = { input: 'tests/trajectory', junit: 'reports/junit-trajectory.xml', json: 'reports/trajectory-report.json', md: 'reports/trajectory-summary.md', minPass: 0.95, maxStepErr: 0.02 };
  for (let i = 0; i < args.length; i+=2) {
    const k = args[i], v = args[i+1];
    if (!v) continue;
    if (k === '--input') conf.input = v;
    if (k === '--junit') conf.junit = v;
    if (k === '--json') conf.json = v;
    if (k === '--md') conf.md = v;
    if (k === '--min-pass') conf.minPass = parseFloat(v);
    if (k === '--max-step-err') conf.maxStepErr = parseFloat(v);
  }
  return conf;
}

function ensureDir(filePath) { fs.mkdirSync(path.dirname(filePath), { recursive: true }); }

function validateTrace(doc) {
  const errors = [];
  if (!doc.steps || !Array.isArray(doc.steps) || doc.steps.length === 0) errors.push('no steps');
  const roles = ['thought','action','observation'];
  const roleSeq = doc.steps.map(s => s.role);
  // Soft pattern check: no two consecutive actions; observations follow actions
  for (let i=1;i<roleSeq.length;i++) {
    if (roleSeq[i] === 'action' && roleSeq[i-1] === 'action') errors.push(`consecutive action at index ${i}`);
    if (roleSeq[i] === 'observation' && roleSeq[i-1] !== 'action') errors.push(`observation not after action at index ${i}`);
  }
  // Label checks
  const labels = new Set(doc.steps.filter(s => s.label).map(s => s.label));
  const exp = doc.expectations || {};
  (exp.must_include_labels||[]).forEach(l => { if (!labels.has(l)) errors.push(`missing label ${l}`); });
  (exp.forbid_labels||[]).forEach(l => { if (labels.has(l)) errors.push(`forbidden label ${l}`); });
  if (exp.max_steps && doc.steps.length > exp.max_steps) errors.push(`too many steps: ${doc.steps.length} > ${exp.max_steps}`);
  // Outcome contains (search in last observation or action=answer)
  const outcomeText = (doc.steps.findLast ? doc.steps.findLast(s => s.role === 'observation') : [...doc.steps].reverse().find(s => s.role==='observation'))?.text || '';
  (exp.outcome_contains||[]).forEach(substr => { if (!outcomeText.toLowerCase().includes(substr.toLowerCase())) errors.push(`outcome missing '${substr}'`); });
  return { pass: errors.length === 0, errors };
}

(async function main(){
  const cfg = parseArgs();
  const files = await fg([`${cfg.input}/**/*.y?(a)ml`], { dot: false });
  const cases = [];
  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8');
    const doc = yaml.load(raw);
    const res = validateTrace(doc);
    cases.push({ id: doc.id || path.basename(file), file, ...res });
  }
  const passCount = cases.filter(c => c.pass).length;
  const passRate = cases.length ? passCount / cases.length : 1;
  const stepErrRate = cases.reduce((acc,c)=> acc + (c.errors.length>0?1:0),0) / (cases.length||1);

  // JUnit
  const testsuite = { '@name': 'trajectory-golden', '@tests': cases.length, '@failures': cases.length - passCount, testcase: [] };
  cases.forEach(c => {
    const tc = { '@name': c.id, '@classname': 'trajectory' };
    if (!c.pass) tc.failure = { '@message': c.errors.join('; ') };
    testsuite.testcase.push(tc);
  });
  const junitXml = create({ testsuite }).end({ prettyPrint: true });

  ensureDir(cfg.junit); fs.writeFileSync(cfg.junit, junitXml);
  ensureDir(cfg.json); fs.writeFileSync(cfg.json, JSON.stringify({ summary: { total: cases.length, passCount, passRate, stepErrRate }, cases }, null, 2));

  const md = [`**Trajectory Validation**`, `- Total: ${cases.length}`, `- Passed: ${passCount}`, `- Pass rate: ${(passRate*100).toFixed(1)}%`, `- Step error rate: ${(stepErrRate*100).toFixed(1)}%`, '', ...cases.filter(c=>!c.pass).slice(0,20).map(c=>`- ❌ ${c.id}: ${c.errors.join('; ')}`) ].join('\n');
  ensureDir(cfg.md); fs.writeFileSync(cfg.md, md + '\n');

  const fail = (passRate < cfg.minPass) || (stepErrRate > cfg.maxStepErr);
  if (fail) {
    console.error(`Trajectory thresholds not met: passRate=${passRate}, stepErrRate=${stepErrRate}`);
    process.exit(1);
  }
})();
