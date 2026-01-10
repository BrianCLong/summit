import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const DEFAULT_PATH = 'docs/security/security_ledger.yml';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  args.forEach((arg) => {
    const [key, value] = arg.split('=');
    if (key.startsWith('--')) {
      options[key.replace(/^--/, '')] = value ?? true;
    }
  });
  return {
    path: options.path ?? DEFAULT_PATH,
    mode: options.mode ?? 'soft',
  };
}

function loadLedger(filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const raw = fs.readFileSync(absolutePath, 'utf8');
  const parsed = yaml.load(raw);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Security ledger must be a YAML object.');
  }
  return parsed;
}

function validateEntry(entry) {
  const failures = [];
  if (!entry || typeof entry !== 'object') {
    return ['Security ledger entry is not an object.'];
  }
  ['id', 'title', 'severity', 'status', 'owner'].forEach((field) => {
    if (typeof entry[field] !== 'string' || entry[field].trim().length === 0) {
      failures.push(`Entry ${entry.id ?? '<unknown>'} missing ${field}.`);
    }
  });
  if (typeof entry.rationale !== 'string' || entry.rationale.trim().length === 0) {
    failures.push(`Entry ${entry.id ?? '<unknown>'} missing rationale.`);
  }
  const allowedSeverity = ['low', 'medium', 'high', 'critical'];
  if (!allowedSeverity.includes(entry.severity)) {
    failures.push(`Entry ${entry.id ?? '<unknown>'} invalid severity ${entry.severity}.`);
  }
  const allowedStatus = ['open', 'closed', 'deferred'];
  if (!allowedStatus.includes(entry.status)) {
    failures.push(`Entry ${entry.id ?? '<unknown>'} invalid status ${entry.status}.`);
  }
  if (entry.status === 'deferred') {
    if (typeof entry.deferred_reason !== 'string' || entry.deferred_reason.trim().length === 0) {
      failures.push(`Deferred entry ${entry.id ?? '<unknown>'} missing deferred_reason.`);
    }
    if (typeof entry.deferred_until !== 'string' || entry.deferred_until.trim().length === 0) {
      failures.push(`Deferred entry ${entry.id ?? '<unknown>'} missing deferred_until.`);
    }
  }
  return failures;
}

function main() {
  const { path: filePath, mode } = parseArgs();
  const ledger = loadLedger(filePath);
  const entries = ledger.entries;
  if (!Array.isArray(entries)) {
    throw new Error('Security ledger must include an entries array.');
  }

  const failures = [];
  let openHigh = 0;
  let openCritical = 0;
  let deferred = 0;
  let closed = 0;

  entries.forEach((entry) => {
    failures.push(...validateEntry(entry));
    if (entry.status === 'open' && entry.severity === 'high') {
      openHigh += 1;
    }
    if (entry.status === 'open' && entry.severity === 'critical') {
      openCritical += 1;
    }
    if (entry.status === 'deferred') {
      deferred += 1;
    }
    if (entry.status === 'closed') {
      closed += 1;
    }
  });

  if (mode === 'hard' && (openHigh > 0 || openCritical > 0)) {
    failures.push(`Open high/critical issues detected. high=${openHigh} critical=${openCritical}`);
  }

  if (failures.length > 0) {
    failures.forEach((failure) => {
      console.error(`SECURITY_LEDGER_FAIL: ${failure}`);
    });
    process.exitCode = 1;
    return;
  }

  console.log(
    `Security ledger verified. Entries=${entries.length} closed=${closed} deferred=${deferred} open_high=${openHigh} open_critical=${openCritical}`,
  );
}

main();
