#!/usr/bin/env node
import path from 'node:path';
import { existsSync } from 'node:fs';
import { promises as fsp } from 'node:fs';
import { pathToFileURL } from 'node:url';
import {
  REPO_ROOT,
  hashFile,
  loadControlMap,
  normalizeCoverageStatus
} from './lib/control-evidence-utils.mjs';

function parseArgs(argv) {
  const args = {
    evidenceDir: null,
    controlMap: 'compliance/control-map.yaml'
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--evidence-dir') args.evidenceDir = argv[i + 1];
    if (arg === '--control-map') args.controlMap = argv[i + 1];
  }
  return args;
}

function parseUtcDate(value) {
  if (!value) return null;
  const normalized = value.includes('T') ? value : `${value}T00:00:00Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function sortIssues(issues) {
  return [...issues].sort((a, b) => {
    const controlCmp = a.control_id.localeCompare(b.control_id);
    if (controlCmp !== 0) return controlCmp;
    const typeCmp = a.type.localeCompare(b.type);
    if (typeCmp !== 0) return typeCmp;
    return a.message.localeCompare(b.message);
  });
}

async function loadIndex(evidenceDir) {
  const indexPath = path.join(evidenceDir, 'control_evidence_index.json');
  const raw = await fsp.readFile(indexPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Invalid control_evidence_index.json at ${indexPath}`);
  }
  return parsed;
}

async function validateControlEvidence({ evidenceDir, controlMapPath }) {
  const controlMap = await loadControlMap(controlMapPath);
  const index = await loadIndex(evidenceDir);

  const violations = [];
  const warnings = [];
  const allowStubEvidence = process.env.ALLOW_STUB_EVIDENCE === '1';
  const exceptionSummary = [];
  const controlsById = new Map();
  for (const entry of index.controls || []) {
    controlsById.set(entry.control_id, entry);
  }

  const now = new Date();
  const requiredControls = Object.entries(controlMap.controls || {});
  let coveredCount = 0;
  let partialCount = 0;
  let deferredCount = 0;

  for (const [controlId, controlData] of requiredControls) {
    const expectedStatus = normalizeCoverageStatus(controlData.status);
    const indexEntry = controlsById.get(controlId);
    if (!indexEntry) {
      violations.push({
        control_id: controlId,
        type: 'missing_control',
        message: `Control ${controlId} is missing from control_evidence_index.json.`
      });
      continue;
    }

    const coverageStatus = normalizeCoverageStatus(indexEntry.coverage_status);
    if (coverageStatus === 'covered') coveredCount += 1;
    else if (coverageStatus === 'partially_covered') partialCount += 1;
    else deferredCount += 1;

    const evidenceList = Array.isArray(indexEntry.evidence) ? indexEntry.evidence : [];
    if (coverageStatus === 'covered') {
      if (!evidenceList.length) {
        violations.push({
          control_id: controlId,
          type: 'missing_evidence',
          message: `Control ${controlId} is covered but has no evidence entries.`
        });
      }
    }

    const exceptions = Array.isArray(indexEntry.exceptions) ? indexEntry.exceptions : [];
    exceptions.forEach((entry) => {
      if (entry && entry.exception_id) {
        exceptionSummary.push({ control_id: controlId, ...entry });
      }
    });
    const hasPolicyEvidence = evidenceList.some((item) => item.evidence_type === 'policy_doc');
    const hasValidException = exceptions.some((entry) => {
      const expiry = parseUtcDate(entry.expiry_date_utc);
      return expiry && expiry >= now;
    });

    if (coverageStatus !== 'covered' && !hasPolicyEvidence && !hasValidException) {
      violations.push({
        control_id: controlId,
        type: 'missing_exception',
        message: `Control ${controlId} is ${coverageStatus} without a valid exception or policy_doc evidence.`
      });
    }

    for (const item of evidenceList) {
      if (!item.artifact_path) {
        violations.push({
          control_id: controlId,
          type: 'evidence_missing_path',
          message: `Evidence item for ${controlId} is missing artifact_path.`
        });
        continue;
      }
      if (!item.producer) {
        violations.push({
          control_id: controlId,
          type: 'evidence_missing_producer',
          message: `Evidence item ${item.artifact_path} for ${controlId} is missing producer.`
        });
      }
      if (item.artifact_location === 'repo') {
        const repoPath = path.resolve(REPO_ROOT, item.artifact_path);
        if (!existsSync(repoPath)) {
          violations.push({
            control_id: controlId,
            type: 'missing_repo_artifact',
            message: `Repo artifact missing for ${controlId}: ${item.artifact_path}`
          });
        }
        continue;
      }

      const artifactPath = path.join(evidenceDir, item.artifact_path);
      if (!existsSync(artifactPath)) {
        const payload = {
          control_id: controlId,
          type: 'missing_bundle_artifact',
          message: `Evidence artifact missing for ${controlId}: ${item.artifact_path}`
        };
        if (allowStubEvidence && item.artifact_path.startsWith('ci/')) {
          warnings.push(payload);
        } else {
          violations.push(payload);
        }
        continue;
      }

      if (!item.checksums || !item.checksums.sha256) {
        const payload = {
          control_id: controlId,
          type: 'missing_checksum',
          message: `Evidence artifact ${item.artifact_path} for ${controlId} missing sha256 checksum.`
        };
        if (allowStubEvidence && item.artifact_path.startsWith('ci/')) {
          warnings.push(payload);
        } else {
          violations.push(payload);
        }
        continue;
      }

      const computed = await hashFile(artifactPath);
      if (computed !== item.checksums.sha256) {
        violations.push({
          control_id: controlId,
          type: 'checksum_mismatch',
          message: `Checksum mismatch for ${controlId}: ${item.artifact_path}`
        });
      }
    }

    if (coverageStatus !== expectedStatus) {
      warnings.push({
        control_id: controlId,
        type: 'status_mismatch',
        message: `Control ${controlId} coverage_status is ${coverageStatus}, expected ${expectedStatus}.`
      });
    }
  }

  const report = {
    status: violations.length > 0 ? 'fail' : 'pass',
    generated_at_utc: new Date().toISOString(),
    summary: {
      total_controls: requiredControls.length,
      covered: coveredCount,
      partially_covered: partialCount,
      deferred: deferredCount,
      violations: violations.length,
      warnings: warnings.length
    },
    violations: sortIssues(violations),
    warnings: sortIssues(warnings),
    exceptions: exceptionSummary
  };

  const reportPath = path.join(evidenceDir, 'validation_report.json');
  await fsp.writeFile(reportPath, JSON.stringify(report, null, 2));
  return report;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.evidenceDir) {
    console.error('Missing --evidence-dir');
    process.exit(2);
  }
  const evidenceDir = path.resolve(REPO_ROOT, args.evidenceDir);
  const controlMapPath = path.resolve(REPO_ROOT, args.controlMap);
  const report = await validateControlEvidence({ evidenceDir, controlMapPath });

  console.log(`Control evidence validation status: ${report.status.toUpperCase()}`);
  if (report.violations.length) {
    report.violations.forEach((item) => {
      console.error(`- ${item.control_id}: ${item.message}`);
    });
    process.exit(1);
  }
}

const entryUrl = pathToFileURL(process.argv[1] || '').href;
if (import.meta.url === entryUrl) {
  main().catch((error) => {
    console.error('Control evidence validation failed:', error.message);
    process.exit(2);
  });
}

export { validateControlEvidence };
