#!/usr/bin/env node
import path from 'node:path';
import { promises as fsp } from 'node:fs';
import crypto from 'node:crypto';

async function main() {
  const evidenceDir = process.env.EVIDENCE_DIR;
  if (!evidenceDir) {
    console.error('EVIDENCE_DIR env var not set');
    process.exit(1);
  }

  const reportPath = path.join(evidenceDir, 'validation_report.json');
  let report;
  try {
    const raw = await fsp.readFile(reportPath, 'utf8');
    report = JSON.parse(raw);
  } catch (error) {
    console.error(`Failed to read validation report at ${reportPath}: ${error.message}`);
    process.exit(1);
  }

  // Check verification status
  // Note: If stub evidence is used, report might pass but it's not "fresh real evidence".
  // The user defined "Verifiable" as "artifact exists, hashes match...".
  // If STUB_EVIDENCE_USED is set, we treat it as unverified for the purpose of this metric
  // because we want "fresh" evidence (real), not stubs.
  // However, the user said "Run = a successful CI job on main that should emit your evidence bundle".
  // If stubs are used, it means we FAILED to produce real evidence (or didn't try).

  const stubUsed = process.env.STUB_EVIDENCE_USED === '1';
  const passed = report.status === 'pass';
  const verified = passed && !stubUsed;

  // Find a representative evidence file to use for path/hash
  // We'll look for anything in the evidence dir that isn't a json report if possible,
  // or use one from control_evidence_index if available.
  // The user example shows "artifacts/evidence/bundle.cdx.json".
  // We will assume if verified, there are artifacts.

  // Let's try to find an SBOM or Provenance file.
  // control_evidence_index.json has the details.
  let evidencePath = "unknown";
  let evidenceSha = "unknown";

  try {
    const indexPath = path.join(evidenceDir, 'control_evidence_index.json');
    const rawIndex = await fsp.readFile(indexPath, 'utf8');
    const index = JSON.parse(rawIndex);

    // Look for SBOM or Provenance in evidence entries
    let foundEntry = null;
    if (index.controls) {
      for (const control of index.controls) {
        if (control.evidence) {
          for (const ev of control.evidence) {
             if (ev.artifact_path && (ev.artifact_path.includes('sbom') || ev.artifact_path.includes('provenance'))) {
               foundEntry = ev;
               break;
             }
          }
        }
        if (foundEntry) break;
      }
    }

    if (foundEntry) {
      evidencePath = foundEntry.artifact_path;
      if (foundEntry.checksums && foundEntry.checksums.sha256) {
        evidenceSha = foundEntry.checksums.sha256;
      }
    }
  } catch (e) {
    // Ignore if index read fails, we fallback to unknown
  }

  const summary = {
    runId: process.env.GITHUB_RUN_ID || 'unknown',
    commit: process.env.GITHUB_SHA || 'unknown',
    expected: true, // We assume this job runs where evidence IS expected
    evidence: {
      path: evidencePath,
      sha256: evidenceSha,
      provenance: "artifacts/evidence/provenance.intoto.jsonl", // Placeholder or dynamic if we find it
      verified: verified,
      buildTime: new Date().toISOString() // Current time as build time
    }
  };

  const summaryPath = path.join(evidenceDir, 'summary.json');
  await fsp.writeFile(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`Summary written to ${summaryPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
