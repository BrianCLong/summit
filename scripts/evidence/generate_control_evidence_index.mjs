#!/usr/bin/env node
import path from 'node:path';
import { promises as fsp } from 'node:fs';
import { pathToFileURL } from 'node:url';
import {
  REPO_ROOT,
  hashFile,
  loadControlExceptions,
  loadControlMap,
  normalizeCoverageStatus,
  resolveEvidenceEntry
} from './lib/control-evidence-utils.mjs';

function parseArgs(argv) {
  const args = {
    evidenceDir: null,
    controlMap: 'compliance/control-map.yaml',
    exceptions: 'compliance/control-exceptions.yml'
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--evidence-dir') args.evidenceDir = argv[i + 1];
    if (arg === '--control-map') args.controlMap = argv[i + 1];
    if (arg === '--exceptions') args.exceptions = argv[i + 1];
  }
  return args;
}

function normalizeExceptionEntries(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.map((entry) => ({
    exception_id: entry.id || entry.exception_id,
    owner: entry.owner,
    reason: entry.reason,
    expiry_date_utc: entry.expiry_date_utc,
    approved_by: entry.approved_by
  })).filter(entry => entry.exception_id);
}

async function generateControlEvidenceIndex({ evidenceDir, controlMapPath, exceptionsPath }) {
  const controlMap = await loadControlMap(controlMapPath);
  const exceptions = await loadControlExceptions(exceptionsPath);

  const controls = Object.entries(controlMap.controls)
    .map(([controlId, data]) => {
      const coverageStatus = normalizeCoverageStatus(data.status);
      const evidenceEntries = Array.isArray(data.evidence) ? data.evidence : [];
      const evidence = evidenceEntries.map((entry) => resolveEvidenceEntry(entry));

      return {
        control_id: controlId,
        title: data.description || '',
        coverage_status: coverageStatus,
        evidence: evidence,
        exceptions: normalizeExceptionEntries(exceptions[controlId])
      };
    })
    .sort((a, b) => a.control_id.localeCompare(b.control_id))
    .map((control) => {
      const evidenceSorted = [...control.evidence].sort((a, b) => {
        return a.artifact_path.localeCompare(b.artifact_path);
      });
      return { ...control, evidence: evidenceSorted };
    });

  const evidenceRoot = path.resolve(REPO_ROOT, evidenceDir);
  for (const control of controls) {
    for (const item of control.evidence) {
      if (item.artifact_location !== 'bundle') {
        continue;
      }
      const artifactPath = path.join(evidenceRoot, item.artifact_path);
      try {
        const hash = await hashFile(artifactPath);
        item.checksums = { sha256: hash };
      } catch (error) {
        item.checksums = item.checksums || {};
      }
    }
  }

  const now = new Date();
  const report = {
    schema_version: '1',
    meta: {
      commit_sha: process.env.GITHUB_SHA || 'unknown',
      generated_at_utc: now.toISOString(),
      repo: process.env.GITHUB_REPOSITORY || 'unknown'
    },
    controls
  };

  await fsp.mkdir(evidenceRoot, { recursive: true });
  const outPath = path.join(evidenceRoot, 'control_evidence_index.json');
  await fsp.writeFile(outPath, JSON.stringify(report, null, 2));
  return outPath;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.evidenceDir) {
    console.error('Missing --evidence-dir');
    process.exit(2);
  }
  const controlMapPath = path.resolve(REPO_ROOT, args.controlMap);
  const exceptionsPath = path.resolve(REPO_ROOT, args.exceptions);
  const outPath = await generateControlEvidenceIndex({
    evidenceDir: args.evidenceDir,
    controlMapPath,
    exceptionsPath
  });
  console.log(`control_evidence_index.json written to ${outPath}`);
}

const entryUrl = pathToFileURL(process.argv[1] || '').href;
if (import.meta.url === entryUrl) {
  main().catch((error) => {
    console.error('Failed to generate control evidence index:', error.message);
    process.exit(2);
  });
}

export { generateControlEvidenceIndex };
