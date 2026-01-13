import { createHash } from 'node:crypto';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { execSync } from 'node:child_process';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

/**
 * @typedef {Object} RawReceiptInput
 * @property {string} adapterId
 * @property {string} runId
 * @property {string} action
 * @property {string} decision
 * @property {Record<string, unknown>} subject
 * @property {Record<string, unknown>} resource
 * @property {Record<string, unknown>} context
 * @property {number} retries
 * @property {unknown[] | undefined} obligations
 * @property {string | undefined} issuedAt
 */

/**
 * @typedef {Object} ReceiptBenchmarkOptions
 * @property {number} [iterations]
 * @property {boolean} [smoke]
 * @property {Partial<RawReceiptInput>} [payload]
 */

/**
 * @typedef {Object} ReceiptBenchmarkReport
 * @property {'receipt-validation'} benchmark
 * @property {number} iterations
 * @property {number} durationMs
 * @property {number} opsPerSec
 * @property {'smoke' | 'standard'} mode
 * @property {{
 *  node: string;
 *  platform: string;
 *  arch: string;
 *  cpus: number;
 *  totalMem: number;
 *  version?: string;
 *  gitCommit?: string;
 * }} environment
 * @property {string} sampleReceiptId
 */

const ajv = new Ajv({ allErrors: false });
addFormats(ajv);

/** @type {import('ajv').JSONSchemaType<RawReceiptInput>} */
const receiptSchema = {
  type: 'object',
  properties: {
    adapterId: { type: 'string', minLength: 1 },
    runId: { type: 'string', minLength: 1 },
    action: { type: 'string', minLength: 1 },
    decision: { type: 'string', enum: ['allow', 'deny', 'defer'] },
    subject: { type: 'object' },
    resource: { type: 'object' },
    context: { type: 'object' },
    retries: { type: 'integer', minimum: 0 },
    obligations: { type: 'array', items: { type: 'object' }, nullable: true, default: [] },
    issuedAt: { type: 'string', format: 'date-time', nullable: true },
  },
  required: ['adapterId', 'runId', 'action', 'decision', 'subject', 'resource', 'context', 'retries'],
  additionalProperties: false,
};

const validateReceipt = ajv.compile(receiptSchema);

function hashJson(obj) {
  return createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}

function emitDecisionReceipt(options) {
  const retries = options.retries ?? 0;
  const id = options.stepId || `decision-${options.adapterId ? `${options.adapterId}-` : ''}${Date.now()}`;

  const receipt = {
    id,
    action: options.action,
    decision: options.decision,
    retries,
    obligations: options.obligations,
    digests: {
      subject: hashJson(options.subject),
      resource: hashJson(options.resource),
      context: hashJson(options.context),
    },
    adapterId: options.adapterId,
    issuedAt: new Date().toISOString(),
  };

  return { receipt };
}

function normalizeReceiptPayload(raw) {
  return {
    adapterId: raw.adapterId,
    action: raw.action,
    decision: raw.decision,
    subject: raw.subject,
    resource: raw.resource,
    context: raw.context,
    retries: raw.retries,
    obligations: raw.obligations,
    stepId: `${raw.runId}-${hashJson(raw.subject).slice(0, 8)}`,
    note: 'receipt benchmark',
  };
}

function defaultPayload(seed, overrides = {}) {
  const baseIssuedAt = overrides.issuedAt ?? new Date().toISOString();
  return {
    adapterId: overrides.adapterId ?? 'adapter.perf',
    runId: overrides.runId ?? `run-${seed}`,
    action: overrides.action ?? 'execute',
    decision: overrides.decision ?? 'allow',
    subject: overrides.subject ?? { userId: `user-${seed % 10}`, region: 'us-east-1' },
    resource: overrides.resource ?? { type: 'dataset', id: `ds-${seed % 5}` },
    context: overrides.context ?? { traceId: `trace-${seed}`, path: '/ingest' },
    retries: overrides.retries ?? 0,
    obligations: overrides.obligations ?? [{ type: 'header', requirement: 'x-perf-check' }],
    issuedAt: baseIssuedAt,
  };
}

function getGitCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch (_error) {
    return undefined;
  }
}

async function getPackageVersion() {
  try {
    const pkg = await import('../package.json', { assert: { type: 'json' } });
    return pkg.default?.version ?? pkg.version;
  } catch (_error) {
    return undefined;
  }
}

/**
 * @param {ReceiptBenchmarkOptions} options
 * @returns {Promise<ReceiptBenchmarkReport>}
 */
export async function runReceiptBenchmark(options = {}) {
  const smokeMode = options.smoke ?? process.env.SMOKE === '1';
  const iterations = options.iterations ?? (smokeMode ? 250 : 2500);
  if (iterations <= 0) {
    throw new Error('iterations must be greater than zero');
  }

  const startedAt = performance.now();
  let sampleReceiptId = '';

  for (let i = 0; i < iterations; i += 1) {
    const payload = defaultPayload(i, options.payload);
    const valid = validateReceipt(payload);
    if (!valid) {
      throw new Error(`Invalid receipt payload: ${ajv.errorsText(validateReceipt.errors)}`);
    }

    const normalized = normalizeReceiptPayload(payload);
    const { receipt } = emitDecisionReceipt(normalized);
    sampleReceiptId = receipt.id;
  }

  const durationMs = performance.now() - startedAt;
  const opsPerSec = Math.round((iterations / durationMs) * 1000);

  return {
    benchmark: 'receipt-validation',
    iterations,
    durationMs: Number(durationMs.toFixed(2)),
    opsPerSec,
    mode: smokeMode ? 'smoke' : 'standard',
    environment: {
      node: process.version,
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMem: os.totalmem(),
      version: await getPackageVersion(),
      gitCommit: getGitCommit(),
    },
    sampleReceiptId,
  };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const iterationsArg = [...args].find((arg) => arg.startsWith('--iterations='))?.split('=')[1];
  const iterations = iterationsArg ? Number.parseInt(iterationsArg, 10) : undefined;
  const smoke = args.has('--smoke');

  const report = await runReceiptBenchmark({ iterations, smoke });
  // eslint-disable-next-line no-console -- CLI output
  console.log(JSON.stringify(report, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    // eslint-disable-next-line no-console -- CLI error output
    console.error(error);
    process.exit(1);
  });
}
