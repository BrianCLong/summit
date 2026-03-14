#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const RELEASE_DIR = path.join(ROOT, 'release');
const EVIDENCE_DIR = path.join(ROOT, '.repoos', 'evidence');

function sha256File(filePath) {
  const input = readFileSync(filePath);
  return createHash('sha256').update(input).digest('hex');
}

function collectTimestampKeys(value, current = '$', findings = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectTimestampKeys(entry, `${current}[${index}]`, findings));
    return findings;
  }

  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (['timestamp', 'createdAt', 'generatedAt'].includes(key)) {
        findings.push(`${current}.${key}`);
      }
      collectTimestampKeys(child, `${current}.${key}`, findings);
    }
  }

  return findings;
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

function main() {
  if (!existsSync(EVIDENCE_DIR)) mkdirSync(EVIDENCE_DIR, { recursive: true });

  const failures = [];

  const required = [
    '.repoos/release/release-surface.json',
    'release/manifest.json',
    'release/sbom.json',
    'release/provenance.json',
  ];

  for (const rel of required) {
    assert(existsSync(path.join(ROOT, rel)), `missing required artifact: ${rel}`, failures);
  }

  if (failures.length === 0) {
    const manifest = JSON.parse(readFileSync(path.join(RELEASE_DIR, 'manifest.json'), 'utf8'));
    const sbom = JSON.parse(readFileSync(path.join(RELEASE_DIR, 'sbom.json'), 'utf8'));
    const provenance = JSON.parse(readFileSync(path.join(RELEASE_DIR, 'provenance.json'), 'utf8'));

    const manifestHash = sha256File(path.join(RELEASE_DIR, 'manifest.json'));
    const sbomHash = sha256File(path.join(RELEASE_DIR, 'sbom.json'));

    const provenanceSubjects = provenance.subjects ?? [];
    const manifestSubject = provenanceSubjects.find((subject) => subject.name === 'release/manifest.json');
    const sbomSubject = provenanceSubjects.find((subject) => subject.name === 'release/sbom.json');

    assert(Boolean(manifest.release_version), 'manifest missing release_version', failures);
    assert(Array.isArray(manifest.components) && manifest.components.length > 0, 'manifest components are empty', failures);
    assert(sbom.bomFormat === 'CycloneDX', 'sbom must use CycloneDX format', failures);
    assert(Boolean(provenance.commit_sha), 'provenance missing commit_sha', failures);
    assert(Boolean(provenance.builder?.id), 'provenance missing builder.id', failures);
    assert(manifestSubject?.digest?.sha256 === manifestHash, 'manifest digest mismatch in provenance', failures);
    assert(sbomSubject?.digest?.sha256 === sbomHash, 'sbom digest mismatch in provenance', failures);

    const deterministicFindings = [
      ...collectTimestampKeys(manifest),
      ...collectTimestampKeys(sbom),
      ...collectTimestampKeys(provenance),
    ];
    assert(deterministicFindings.length === 0, `non-deterministic keys present: ${deterministicFindings.join(', ')}`, failures);
  }

  const report = {
    verified: failures.length === 0,
    checks: {
      artifacts_present: failures.filter((failure) => failure.startsWith('missing required artifact')).length === 0,
      hashes_match: !failures.some((failure) => failure.includes('digest mismatch')),
      sbom_integrity: !failures.some((failure) => failure.includes('sbom')),
      provenance_contract: !failures.some((failure) => failure.includes('provenance')),
      deterministic_build: !failures.some((failure) => failure.includes('non-deterministic')),
    },
    failures,
  };

  writeFileSync(path.join(EVIDENCE_DIR, 'release-verification-report.json'), `${JSON.stringify(report, null, 2)}\n`);

  const readinessPath = path.join(EVIDENCE_DIR, 'release-readiness-report.json');
  if (existsSync(readinessPath)) {
    const readiness = JSON.parse(readFileSync(readinessPath, 'utf8'));
    readiness.verification_passed = report.verified;
    writeFileSync(readinessPath, `${JSON.stringify(readiness, null, 2)}\n`);
  }

  if (!report.verified) {
    console.error('Release verification failed.');
    process.exit(1);
  }

  console.log('Release verification passed.');
}

main();
