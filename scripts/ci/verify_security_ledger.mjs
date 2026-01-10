import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import yaml from 'js-yaml';

const DEFAULT_LEDGER_PATH = 'docs/security/security_ledger.yml';
const ALLOWED_TYPES = new Set(['dependency', 'code', 'secret', 'ci', 'supply-chain']);
const ALLOWED_SEVERITIES = new Set(['low', 'med', 'high', 'critical']);
const ALLOWED_STATUSES = new Set(['open', 'fixed', 'deferred']);

function parseArgs() {
  const args = process.argv.slice(2);
  const options = { mode: 'hard', ledger: DEFAULT_LEDGER_PATH };

  args.forEach((arg) => {
    const [rawKey, rawValue] = arg.split('=');
    if (!rawKey.startsWith('--')) return;
    const key = rawKey.replace(/^--/, '');
    const value = rawValue ?? 'true';
    if (key === 'mode') options.mode = value;
    if (key === 'ledger') options.ledger = value;
  });

  if (!['hard', 'report'].includes(options.mode)) {
    throw new Error(`Invalid mode: ${options.mode}. Expected hard or report.`);
  }

  return options;
}

function readLedgerFile(ledgerPath) {
  const absolute = path.resolve(process.cwd(), ledgerPath);
  const content = fs.readFileSync(absolute, 'utf8');
  return { content, absolute };
}

function mapEntryLines(content) {
  const lines = content.split(/\r?\n/);
  const map = new Map();
  lines.forEach((line, index) => {
    const match = line.match(/^\s*-\s*id:\s*(\S+)/);
    if (match) {
      map.set(match[1], index + 1);
    }
  });
  return map;
}

function normalizePath(entryPath) {
  if (!entryPath) return '';
  return entryPath.replace(/:(\d+(-\d+)?)$/, '');
}

function pathExists(entryPath) {
  const cleaned = normalizePath(entryPath);
  if (!cleaned) return true;
  const target = path.isAbsolute(cleaned)
    ? cleaned
    : path.resolve(process.cwd(), cleaned);
  return fs.existsSync(target);
}

function countBy(values) {
  return values.reduce((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function validateEntry(entry) {
  const failures = [];
  if (!entry || typeof entry !== 'object') {
    failures.push('Entry must be an object.');
    return failures;
  }

  if (typeof entry.id !== 'string' || entry.id.trim() === '') {
    failures.push('id is required and must be a non-empty string.');
  }
  if (!ALLOWED_TYPES.has(entry.type)) {
    failures.push(`type must be one of ${Array.from(ALLOWED_TYPES).join(', ')}.`);
  }
  if (!ALLOWED_SEVERITIES.has(entry.severity)) {
    failures.push(`severity must be one of ${Array.from(ALLOWED_SEVERITIES).join(', ')}.`);
  }
  if (!ALLOWED_STATUSES.has(entry.status)) {
    failures.push(`status must be one of ${Array.from(ALLOWED_STATUSES).join(', ')}.`);
  }
  if (typeof entry.summary !== 'string' || entry.summary.trim() === '') {
    failures.push('summary is required and must be a non-empty string.');
  }

  if (!entry.evidence || typeof entry.evidence !== 'object') {
    failures.push('evidence is required and must be an object.');
  } else {
    if (!Array.isArray(entry.evidence.paths)) {
      failures.push('evidence.paths must be an array.');
    } else if (
      entry.evidence.paths.some(
        (item) => typeof item !== 'string' || item.trim() === '',
      )
    ) {
      failures.push('evidence.paths entries must be non-empty strings.');
    }

    const verify = entry.evidence.verify;
    if (entry.status === 'deferred') {
      if (verify === null) {
        // allowed
      } else if (typeof verify !== 'string' || verify.trim() === '') {
        failures.push('evidence.verify must be a string or null for deferred entries.');
      }
      if (typeof entry.deferred_reason !== 'string' || entry.deferred_reason.trim() === '') {
        failures.push('deferred_reason is required for deferred entries.');
      }
    } else if (typeof verify !== 'string' || verify.trim() === '') {
      failures.push('evidence.verify is required for non-deferred entries.');
    }

    if (
      typeof entry.evidence.indicator !== 'string' ||
      entry.evidence.indicator.trim() === ''
    ) {
      failures.push('evidence.indicator is required and must be a non-empty string.');
    }
  }

  return failures;
}

function main() {
  const { mode, ledger } = parseArgs();
  let content;
  let absoluteLedgerPath;
  try {
    const file = readLedgerFile(ledger);
    content = file.content;
    absoluteLedgerPath = file.absolute;
  } catch (error) {
    console.error(`Failed to read ledger file: ${error.message}`);
    process.exit(mode === 'report' ? 0 : 1);
  }

  const lineMap = mapEntryLines(content);
  let parsed;
  try {
    parsed = yaml.load(content);
  } catch (error) {
    console.error(`Failed to parse ledger YAML: ${error.message}`);
    process.exit(mode === 'report' ? 0 : 1);
  }

  if (!parsed || typeof parsed !== 'object') {
    console.error('Ledger content must be a YAML object.');
    process.exit(mode === 'report' ? 0 : 1);
  }

  const entries = parsed.entries;
  if (!Array.isArray(entries)) {
    console.error('Ledger must contain an entries array.');
    process.exit(mode === 'report' ? 0 : 1);
  }

  const failures = [];

  entries.forEach((entry) => {
    const entryFailures = validateEntry(entry);
    const entryId = entry?.id ?? '<unknown>';
    const line = lineMap.get(entryId);
    entryFailures.forEach((message) => {
      failures.push({ id: entryId, message, line });
    });

    if (entry?.evidence?.paths && Array.isArray(entry.evidence.paths)) {
      entry.evidence.paths.forEach((entryPath) => {
        if (!pathExists(entryPath)) {
          failures.push({
            id: entryId,
            message: `Referenced path does not exist: ${entryPath}`,
            line,
          });
        }
      });
    }

    if (
      mode === 'hard' &&
      entry?.status === 'open' &&
      (entry?.severity === 'high' || entry?.severity === 'critical')
    ) {
      failures.push({
        id: entryId,
        message: `Open ${entry.severity} issue blocks hard-mode gate.`,
        line,
      });
    }
  });

  const statusCounts = countBy(entries.map((entry) => entry.status));
  const severityCounts = countBy(entries.map((entry) => entry.severity));

  console.log('Security ledger summary');
  console.log(`Ledger: ${absoluteLedgerPath}`);
  console.log(`Mode: ${mode}`);
  console.log(`Status counts: ${JSON.stringify(statusCounts)}`);
  console.log(`Severity counts: ${JSON.stringify(severityCounts)}`);

  if (failures.length > 0) {
    console.log('Failures:');
    failures.forEach((failure) => {
      const location = failure.line
        ? `${ledger}:${failure.line}`
        : ledger;
      console.log(`- ${location} (${failure.id}): ${failure.message}`);
    });
  } else {
    console.log('No ledger validation failures.');
  }

  if (mode === 'hard' && failures.length > 0) {
    process.exit(1);
  }
}

main();
