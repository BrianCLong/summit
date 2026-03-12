#!/usr/bin/env node

/**
 * Entropy Gate — Governance Integration Seam
 *
 * Reads artifacts/repoos/frontier-entropy/report.json and emits
 * a pass/fail/warn result for use in CI merge gates or governance checks.
 *
 * Exit codes:
 *   0 = PASS (stable or watch)
 *   1 = FAIL (critical — gate blocks merge)
 *   2 = WARN (warning — gate annotates but does not block)
 *   3 = ERROR (no report found or schema error)
 *
 * Environment:
 *   ENTROPY_GATE_BLOCK_ON_WARNING=true  — treat warning as FAIL (strict mode)
 *   ENTROPY_GATE_REPORT_PATH            — override default report path
 *
 * Integration example:
 *   # In a governance workflow step:
 *   node scripts/ci/gates/entropy-gate.mjs
 *   # Exit code drives gate pass/fail
 *
 * Future hook points:
 *   - Import as module: import { checkEntropyGate } from './entropy-gate.mjs'
 *   - Call checkEntropyGate() to get structured result
 *   - Integrate into merge train gate chain
 */

import fs from 'fs/promises';
import path from 'path';

const REPORT_PATH = process.env.ENTROPY_GATE_REPORT_PATH ||
  path.join(process.cwd(), 'artifacts/repoos/frontier-entropy/report.json');

const BLOCK_ON_WARNING = process.env.ENTROPY_GATE_BLOCK_ON_WARNING === 'true';

const GATE_EXIT = {
  PASS: 0,
  FAIL: 1,
  WARN: 2,
  ERROR: 3,
};

/**
 * Load and validate entropy report.
 * @returns {{ ok: boolean, report: object|null, error: string|null }}
 */
async function loadReport() {
  try {
    const raw = await fs.readFile(REPORT_PATH, 'utf-8');
    const report = JSON.parse(raw);

    // Minimal schema check
    const required = ['schemaVersion', 'evidenceId', 'sourceCommit', 'assessment'];
    for (const field of required) {
      if (!(field in report)) {
        return { ok: false, report: null, error: `Missing required field: ${field}` };
      }
    }

    return { ok: true, report, error: null };
  } catch (err) {
    if (err.code === 'ENOENT') {
      return { ok: false, report: null, error: `Report not found: ${REPORT_PATH}` };
    }
    return { ok: false, report: null, error: `Failed to read report: ${err.message}` };
  }
}

/**
 * Evaluate gate result from report.
 * @returns {{ result: 'pass'|'warn'|'fail'|'error', level: string, message: string, exitCode: number }}
 */
export function evaluateGate(report) {
  if (!report) return { result: 'error', level: 'none', message: 'No report', exitCode: GATE_EXIT.ERROR };

  const level = report.assessment?.level || report.entropy?.assessment || 'unknown';
  const recommendation = report.assessment?.recommendation || '';
  const evidenceId = report.evidenceId || 'unknown';
  const prediction = report.prediction;

  switch (level) {
    case 'stable':
      return {
        result: 'pass',
        level,
        message: `[PASS] Entropy stable. evidenceId=${evidenceId}`,
        exitCode: GATE_EXIT.PASS,
      };

    case 'watch':
      return {
        result: 'pass',
        level,
        message: `[PASS/WATCH] Minor fluctuations. Monitor for trends. evidenceId=${evidenceId}`,
        exitCode: GATE_EXIT.PASS,
      };

    case 'warning': {
      const timeBand = prediction?.timeBand;
      const confidence = prediction?.confidence || 'low';
      const etaMsg = timeBand && timeBand !== 'stable' && confidence !== 'low'
        ? ` (ETA band: ${timeBand}, confidence: ${confidence})`
        : '';
      const msg = `[WARN] Entropy velocity elevated${etaMsg}. ${recommendation} evidenceId=${evidenceId}`;
      return {
        result: BLOCK_ON_WARNING ? 'fail' : 'warn',
        level,
        message: msg,
        exitCode: BLOCK_ON_WARNING ? GATE_EXIT.FAIL : GATE_EXIT.WARN,
      };
    }

    case 'critical': {
      const msg = `[FAIL] CRITICAL entropy velocity. Immediate intervention required. evidenceId=${evidenceId}`;
      return {
        result: 'fail',
        level,
        message: msg,
        exitCode: GATE_EXIT.FAIL,
      };
    }

    default:
      return {
        result: 'error',
        level,
        message: `[ERROR] Unknown assessment level: ${level}. evidenceId=${evidenceId}`,
        exitCode: GATE_EXIT.ERROR,
      };
  }
}

/**
 * Programmatic interface for other gates/scripts.
 */
export async function checkEntropyGate() {
  const { ok, report, error } = await loadReport();
  if (!ok) {
    return { result: 'error', level: 'none', message: error, exitCode: GATE_EXIT.ERROR };
  }
  return evaluateGate(report);
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

if (import.meta.url === `file://${process.argv[1]}`) {
  const { ok, report, error } = await loadReport();

  if (!ok) {
    console.error(`Entropy gate ERROR: ${error}`);
    process.exit(GATE_EXIT.ERROR);
  }

  const gateResult = evaluateGate(report);

  // Emit structured output for CI log parsing
  console.log(`entropy-gate: ${gateResult.message}`);

  if (process.env.GITHUB_OUTPUT) {
    // Write outputs for GitHub Actions
    const output = [
      `entropy_gate_result=${gateResult.result}`,
      `entropy_gate_level=${gateResult.level}`,
      `entropy_evidence_id=${report.evidenceId}`,
    ].join('\n');

    await fs.appendFile(process.env.GITHUB_OUTPUT, output + '\n');
  }

  process.exit(gateResult.exitCode);
}
