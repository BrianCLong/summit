import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

export interface VerificationResult {
  runId: string;
  status: 'PASS' | 'FAIL';
  checks: Array<{
    name: string;
    status: 'PASS' | 'FAIL';
    message?: string;
  }>;
}

export function verifyAttestation(runId: string, attestationPath: string, manifestDigest: string): VerificationResult {
  const result: VerificationResult = {
    runId,
    status: 'PASS',
    checks: []
  };

  try {
    const attestation = JSON.parse(readFileSync(attestationPath, 'utf8'));
    // Cosign attestation is a Statement with base64 encoded payload
    const payload = JSON.parse(Buffer.from(attestation.payload, 'base64').toString());
    const predicate = payload.predicate;

    const predicateRunId = predicate.buildDefinition.externalParameters.openlineage.runId;
    // Updated path to match summit-attest implementation
    const predicateManifestDigest = predicate.buildDefinition.externalParameters.summit.runManifestDigest;

    const runIdMatch = predicateRunId === runId;
    result.checks.push({
      name: 'runId_matches',
      status: runIdMatch ? 'PASS' : 'FAIL',
      message: runIdMatch ? undefined : `Expected ${runId}, got ${predicateRunId}`
    });

    const digestMatch = predicateManifestDigest === manifestDigest;
    result.checks.push({
      name: 'manifest_digest_matches',
      status: digestMatch ? 'PASS' : 'FAIL',
      message: digestMatch ? undefined : `Expected ${manifestDigest}, got ${predicateManifestDigest}`
    });

    if (!runIdMatch || !digestMatch) {
      result.status = 'FAIL';
    }

  } catch (error: any) {
    result.status = 'FAIL';
    result.checks.push({
      name: 'attestation_parsable',
      status: 'FAIL',
      message: error.message
    });
  }

  return result;
}

export function writeEvidence(evidenceId: string, runId: string, result: VerificationResult, outputDir: string) {
  mkdirSync(outputDir, { recursive: true });

  const stamp = {
    evidenceId,
    runId,
    timestamp: new Date().toISOString()
  };

  const metrics = {
    check_count: result.checks.length,
    pass_count: result.checks.filter(c => c.status === 'PASS').length
  };

  const report = result;

  // Standardized evidence index format with 'items'
  const index = {
    version: "1.0",
    items: {
      [evidenceId]: {
        stamp: "stamp.json",
        metrics: "metrics.json",
        report: "report.json"
      }
    }
  };

  writeFileSync(`${outputDir}/stamp.json`, JSON.stringify(stamp, null, 2));
  writeFileSync(`${outputDir}/metrics.json`, JSON.stringify(metrics, null, 2));
  writeFileSync(`${outputDir}/report.json`, JSON.stringify(report, null, 2));
  writeFileSync(`${outputDir}/index.json`, JSON.stringify(index, null, 2));
}
