#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PolicyAudit } = require('../packages/policy-audit');

const fixturesPath = path.join(__dirname, '../contracts/policy/fixtures.json');
const policyDir = path.join(__dirname, '../contracts/policy');
const auditDir = path.join(__dirname, '../tmp/policy-simulate');
const snapshotPath = path.join(__dirname, '../test-results/policy/matrix.json');
const hashPath = path.join(policyDir, 'abac.bundle.sha256');

async function main() {
  const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));
  fs.rmSync(auditDir, { recursive: true, force: true });
  fs.mkdirSync(auditDir, { recursive: true });
  const pa = new PolicyAudit({ policyDir, auditDir });
  const results = [];
  const failures = [];
  for (const scenario of fixtures.cases) {
    const subject = expand(fixtures.subjects, scenario.subject);
    const resource = expand(fixtures.resources, scenario.resource);
    const context = expand(fixtures.contexts, scenario.context);
    const decision = await pa.evaluate({
      subject,
      resource,
      action: scenario.action,
      context,
    });
    results.push({
      name: scenario.name,
      allow: decision.allow,
      reason: decision.reason,
    });
    if (decision.allow !== scenario.expect.allow || decision.reason !== scenario.expect.reason) {
      failures.push({
        name: scenario.name,
        expected: scenario.expect,
        actual: decision,
      });
    }
  }
  await pa.close();

  const matrix = {
    generatedAt: new Date().toISOString(),
    cases: results,
  };

  fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
  const update = process.argv.includes('--update');
  if (!fs.existsSync(snapshotPath) || update) {
    fs.writeFileSync(snapshotPath, JSON.stringify(matrix, null, 2));
  } else {
    const existing = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    if (!matricesEqual(existing.cases, matrix.cases)) {
      console.error('Policy matrix drift detected. Run with --update after reviewing changes.');
      logDiff(existing.cases, matrix.cases);
      process.exit(1);
    }
  }

  const rego = fs.readFileSync(path.join(policyDir, 'abac.rego'));
  const hash = crypto.createHash('sha256').update(rego).digest('hex');
  fs.writeFileSync(hashPath, hash + '\n');

  printTable(matrix.cases);

  if (failures.length > 0) {
    console.error('\nUnexpected policy decisions detected:');
    for (const failure of failures) {
      console.error(` - ${failure.name}: expected ${failure.expected.reason} (${failure.expected.allow ? 'allow' : 'deny'}) but received ${failure.actual.reason} (${failure.actual.allow ? 'allow' : 'deny'})`);
    }
    process.exit(1);
  }
}

function expand(map, ref) {
  if (!ref) return {};
  if (typeof ref === 'string') {
    return JSON.parse(JSON.stringify(map[ref]));
  }
  return JSON.parse(JSON.stringify(ref));
}

function matricesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].name !== b[i].name) return false;
    if (a[i].allow !== b[i].allow) return false;
    if (a[i].reason !== b[i].reason) return false;
  }
  return true;
}

function logDiff(before, after) {
  const map = new Map(before.map((entry) => [entry.name, entry]));
  for (const entry of after) {
    const prev = map.get(entry.name);
    if (!prev) {
      console.error(` + ${entry.name} => ${entry.reason} (${entry.allow ? 'allow' : 'deny'})`);
      continue;
    }
    if (prev.allow !== entry.allow || prev.reason !== entry.reason) {
      console.error(
        ` * ${entry.name}: ${prev.reason} (${prev.allow ? 'allow' : 'deny'}) -> ${entry.reason} (${entry.allow ? 'allow' : 'deny'})`,
      );
    }
    map.delete(entry.name);
  }
  for (const leftover of map.values()) {
    console.error(
      ` - ${leftover.name} => ${leftover.reason} (${leftover.allow ? 'allow' : 'deny'})`,
    );
  }
}

function printTable(rows) {
  const header = ['Scenario', 'Decision', 'Reason'];
  const widths = [
    Math.max(header[0].length, ...rows.map((r) => r.name.length)),
    Math.max(header[1].length, ...rows.map((r) => (r.allow ? 'allow' : 'deny').length)),
    Math.max(header[2].length, ...rows.map((r) => r.reason.length)),
  ];
  const line = `${header[0].padEnd(widths[0])} | ${header[1].padEnd(widths[1])} | ${header[2].padEnd(widths[2])}`;
  console.log(line);
  console.log('-'.repeat(line.length));
  for (const row of rows) {
    console.log(
      `${row.name.padEnd(widths[0])} | ${row.allow ? 'allow'.padEnd(widths[1]) : 'deny'.padEnd(widths[1])} | ${row.reason.padEnd(widths[2])}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
