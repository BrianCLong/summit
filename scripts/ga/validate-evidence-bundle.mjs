#!/usr/bin/env node
import fs from 'node:fs';
import { loadTrace } from './lib/trace-loader.mjs';
import { parseControlRegistry } from './lib/control-registry.mjs';

const args = Object.fromEntries(process.argv.slice(2).map(a=>{
  const [k,v] = a.split('=');
  return [k.replace(/^--/,''), v ?? true];
}));

if (!args.trace || !args.registry) {
    console.error("Usage: node validate-evidence-bundle.mjs --trace=... --registry=... [--out=...] [--md=...]");
    process.exit(1);
}

const trace = loadTrace(args.trace);
const controls = parseControlRegistry(args.registry);

function match(control, event) {
  // Match if any mapped check appears in event name/id/tags/path
  const hay = JSON.stringify(event).toLowerCase();
  return control.mappedChecks.some(m => hay.includes(m.toLowerCase()));
}

const results = controls.map(c => {
  const events = trace.filter(e => match(c, e));
  // Status is pass if we have matching events and ALL of them passed (or at least one passed and none failed? usually "at least one pass" is enough if retries happen, but let's be strict: if any event matches, checks its status)
  // User says: "events.every(e => e.status === 'pass' || e.ok === true)"

  // However, we might have multiple events for the same control (e.g. multiple test suites).
  // If ANY match is found, we evaluate status.

  let status = 'missing';
  if (events.length > 0) {
      const allPass = events.every(e => {
          // Check various success indicators
          return e.status === 'pass' || e.ok === true || e.result === 'success' || e.outcome === 'passed';
      });
      status = allPass ? 'pass' : 'fail';
  }

  return { control: c, status, events };
});

const summary = {
  generated_at: new Date().toISOString(),
  totals: {
    controls: controls.length,
    pass: results.filter(r=>r.status==='pass').length,
    fail: results.filter(r=>r.status==='fail').length,
    missing: results.filter(r=>r.status==='missing').length,
  },
  results
};

if (args.out) fs.writeFileSync(args.out, JSON.stringify(summary, null, 2));
if (args.md) {
  const lines = [];
  lines.push(`# GA Evidence Validator Report`);
  lines.push(`Generated: ${summary.generated_at}`);
  lines.push('');
  lines.push(`**Totals:** ✅ ${summary.totals.pass} · ❌ ${summary.totals.fail} · ⛔ ${summary.totals.missing} / ${summary.totals.controls}`);
  lines.push('');
  lines.push('| Control ID | Name | Owner | Status | Evidence |');
  lines.push('|---|---|---|---|---|');
  for (const r of results) {
    const { id, name, owner, evidence } = r.control;
    const badge = r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⛔';
    lines.push(`| ${id} | ${name} | ${owner} | ${badge} ${r.status} | ${evidence} |`);
  }
  fs.writeFileSync(args.md, lines.join('\n'));
}

const p0Fails = results.filter(r => /P0/i.test(r.control.intent) && r.status !== 'pass');
// Exit 2 if P0 fails, 1 if any non-P0 fails, 0 if all pass
// But user said: "Exit code != 0 if any P0 control is missing or failing."
// And "results.some(r=>r.status!=='pass') ? 1 : 0" for others.

if (p0Fails.length > 0) {
    console.error(`ERROR: ${p0Fails.length} P0 controls failed or missing.`);
    process.exit(2);
}

if (results.some(r => r.status !== 'pass')) {
    console.error(`WARNING: Some controls failed or missing.`);
    process.exit(1);
}

console.log("All controls passed.");
process.exit(0);
