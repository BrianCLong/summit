import { verifyAttestation, VerifyOptions } from './cosign.js';
import * as fs from 'fs';
import * as path from 'path';

export interface VerificationResult {
  status: 'PASS' | 'FAIL';
  checks: Array<{
    name: string;
    status: 'PASS' | 'FAIL';
    message?: string;
  }>;
  evidence: {
    runId: string;
    artifactDigest: string;
    timestamp: string;
  };
}

export async function verifyRun(params: {
  runId: string;
  imageRef: string;
  openlineageEvent?: any; // In real usage, fetch from API
  cosignOptions?: VerifyOptions;
}): Promise<VerificationResult> {
  const { runId, imageRef, openlineageEvent, cosignOptions } = params;
  const checks: VerificationResult['checks'] = [];

  // 1. Verify SLSA Provenance Attestation
  try {
    const output = verifyAttestation({
      imageRef,
      predicateType: 'https://slsa.dev/provenance/v1',
      options: cosignOptions,
    });

    checks.push({ name: 'cosign_verify_attestation', status: 'PASS' });

    // Cosign output is a stream of JSON objects, typically one per line
    const lines = output.trim().split('\n');
    let runIdMatched = false;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.payload) {
          const payload = JSON.parse(
            Buffer.from(entry.payload, 'base64').toString('utf-8')
          );
          const attestationRunId =
            payload.predicate?.buildDefinition?.externalParameters?.openlineage
              ?.runId;

          if (attestationRunId === runId) {
            runIdMatched = true;
            break;
          }
        }
      } catch (err) {
        // Skip invalid lines
      }
    }

    if (runIdMatched) {
      checks.push({ name: 'runId_matches_attestation', status: 'PASS' });
    } else {
      checks.push({
        name: 'runId_matches_attestation',
        status: 'FAIL',
        message: `Mismatched runId: expected ${runId} in any verified attestation`,
      });
    }
  } catch (e: any) {
    checks.push({
      name: 'cosign_verify_attestation',
      status: 'FAIL',
      message: e.message,
    });
  }

  // 2. Verify OpenLineage Facet Join (if event provided)
  if (openlineageEvent) {
    const provenanceFacet = openlineageEvent.run?.facets?.summit_provenance;
    if (provenanceFacet) {
      checks.push({ name: 'openlineage_facet_present', status: 'PASS' });
      // In a real implementation, we would check that the OCI digest matches the facet
    } else {
      checks.push({
        name: 'openlineage_facet_present',
        status: 'FAIL',
        message: 'summit_provenance facet missing in OpenLineage event',
      });
    }
  }

  const overallStatus = checks.every((c) => c.status === 'PASS') ? 'PASS' : 'FAIL';

  return {
    status: overallStatus,
    checks,
    evidence: {
      runId,
      artifactDigest: imageRef.includes('@')
        ? imageRef.split('@')[1]
        : imageRef, // Fallback to full ref if no @ (e.g. tag-only, though discouraged)
      timestamp: new Date().toISOString(),
    },
  };
}

export function generateEvidenceArtifacts(
  result: VerificationResult,
  outputDir: string
) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // report.json
  fs.writeFileSync(
    path.join(outputDir, 'report.json'),
    JSON.stringify(
      {
        status: result.status,
        checks: result.checks,
        failClosed: true,
      },
      null,
      2
    ) + '\n'
  );

  // metrics.json
  fs.writeFileSync(
    path.join(outputDir, 'metrics.json'),
    JSON.stringify(
      {
        join_success_rate: result.status === 'PASS' ? 1.0 : 0.0,
        attestation_count: 1,
      },
      null,
      2
    ) + '\n'
  );

  // stamp.json
  fs.writeFileSync(
    path.join(outputDir, 'stamp.json'),
    JSON.stringify(
      {
        evidenceId: `evid:summit:lineage-attest:v1:${result.evidence.runId}`,
        runId: result.evidence.runId,
        timestamp: result.evidence.timestamp,
        toolchain: {
          cosign: 'v2.4.1',
          'summit-verify': 'v0.1.0',
        },
      },
      null,
      2
    ) + '\n'
  );
}
