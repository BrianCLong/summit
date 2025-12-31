#!/usr/bin/env npx tsx
/**
 * P29: Provenance and SBOM Verification Suite
 * Verifies that SBOM and provenance artifacts are complete, well-formed, and accurate
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '../..');
const SBOM_DIR = join(ROOT_DIR, 'sbom');
const PROVENANCE_DIR = join(ROOT_DIR, 'dist/provenance');

interface VerificationResult {
  passed: boolean;
  message: string;
  details?: string;
}

class VerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VerificationError';
  }
}

function sha256File(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

function getCurrentGitCommit(): string {
  try {
    return execSync('git rev-parse HEAD', { cwd: ROOT_DIR, encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

function verifyFileExists(path: string, description: string): VerificationResult {
  if (!existsSync(path)) {
    return {
      passed: false,
      message: `${description} not found`,
      details: `Expected file: ${path}`,
    };
  }
  return {
    passed: true,
    message: `${description} exists`,
  };
}

function verifySBOMExists(): VerificationResult[] {
  const results: VerificationResult[] = [];

  // Find SBOM files
  const sbomFiles = {
    cyclonedx: join(SBOM_DIR, 'intelgraph-platform-4.0.1-sbom-cyclonedx.json'),
    spdx: join(SBOM_DIR, 'intelgraph-platform-4.0.1-sbom-spdx.json'),
  };

  results.push(verifyFileExists(sbomFiles.cyclonedx, 'CycloneDX SBOM'));
  results.push(verifyFileExists(sbomFiles.spdx, 'SPDX SBOM'));

  return results;
}

function verifySBOMSchema(): VerificationResult[] {
  const results: VerificationResult[] = [];

  const cyclonedxPath = join(SBOM_DIR, 'intelgraph-platform-4.0.1-sbom-cyclonedx.json');
  const spdxPath = join(SBOM_DIR, 'intelgraph-platform-4.0.1-sbom-spdx.json');

  // Verify CycloneDX
  if (existsSync(cyclonedxPath)) {
    try {
      const sbom = JSON.parse(readFileSync(cyclonedxPath, 'utf-8'));

      // Check required fields
      const requiredFields = [
        'bomFormat',
        'specVersion',
        'serialNumber',
        'metadata',
        'components',
      ];

      const missingFields = requiredFields.filter((field) => !(field in sbom));

      if (missingFields.length > 0) {
        results.push({
          passed: false,
          message: 'CycloneDX SBOM schema validation failed',
          details: `Missing required fields: ${missingFields.join(', ')}`,
        });
      } else {
        // Validate specific values
        if (sbom.bomFormat !== 'CycloneDX') {
          results.push({
            passed: false,
            message: 'CycloneDX SBOM invalid bomFormat',
            details: `Expected "CycloneDX", got "${sbom.bomFormat}"`,
          });
        } else if (sbom.specVersion !== '1.5') {
          results.push({
            passed: false,
            message: 'CycloneDX SBOM invalid specVersion',
            details: `Expected "1.5", got "${sbom.specVersion}"`,
          });
        } else if (!sbom.serialNumber.startsWith('urn:uuid:')) {
          results.push({
            passed: false,
            message: 'CycloneDX SBOM invalid serialNumber format',
            details: 'serialNumber must start with "urn:uuid:"',
          });
        } else if (!Array.isArray(sbom.components)) {
          results.push({
            passed: false,
            message: 'CycloneDX SBOM components must be an array',
          });
        } else {
          results.push({
            passed: true,
            message: `CycloneDX SBOM schema valid (${sbom.components.length} components)`,
          });
        }
      }
    } catch (error) {
      results.push({
        passed: false,
        message: 'CycloneDX SBOM is not valid JSON',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Verify SPDX
  if (existsSync(spdxPath)) {
    try {
      const sbom = JSON.parse(readFileSync(spdxPath, 'utf-8'));

      const requiredFields = ['spdxVersion', 'dataLicense', 'SPDXID', 'name', 'creationInfo'];

      const missingFields = requiredFields.filter((field) => !(field in sbom));

      if (missingFields.length > 0) {
        results.push({
          passed: false,
          message: 'SPDX SBOM schema validation failed',
          details: `Missing required fields: ${missingFields.join(', ')}`,
        });
      } else {
        if (sbom.spdxVersion !== 'SPDX-2.3') {
          results.push({
            passed: false,
            message: 'SPDX SBOM invalid version',
            details: `Expected "SPDX-2.3", got "${sbom.spdxVersion}"`,
          });
        } else {
          results.push({
            passed: true,
            message: 'SPDX SBOM schema valid',
          });
        }
      }
    } catch (error) {
      results.push({
        passed: false,
        message: 'SPDX SBOM is not valid JSON',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

function verifyProvenanceExists(): VerificationResult {
  const provenancePath = join(PROVENANCE_DIR, 'build-provenance.intoto.jsonl');
  return verifyFileExists(provenancePath, 'SLSA provenance');
}

function verifyProvenanceSchema(): VerificationResult[] {
  const results: VerificationResult[] = [];
  const provenancePath = join(PROVENANCE_DIR, 'build-provenance.intoto.jsonl');

  if (!existsSync(provenancePath)) {
    return results; // Already caught by existence check
  }

  try {
    const provenance = JSON.parse(readFileSync(provenancePath, 'utf-8'));

    // Check required fields
    const requiredFields = ['_type', 'subject', 'predicateType', 'predicate'];
    const missingFields = requiredFields.filter((field) => !(field in provenance));

    if (missingFields.length > 0) {
      results.push({
        passed: false,
        message: 'Provenance schema validation failed',
        details: `Missing required fields: ${missingFields.join(', ')}`,
      });
      return results;
    }

    // Validate _type
    if (provenance._type !== 'https://in-toto.io/Statement/v1') {
      results.push({
        passed: false,
        message: 'Provenance invalid _type',
        details: `Expected "https://in-toto.io/Statement/v1", got "${provenance._type}"`,
      });
    }

    // Validate predicateType
    if (provenance.predicateType !== 'https://slsa.dev/provenance/v1') {
      results.push({
        passed: false,
        message: 'Provenance invalid predicateType',
        details: `Expected "https://slsa.dev/provenance/v1", got "${provenance.predicateType}"`,
      });
    }

    // Validate subject
    if (!Array.isArray(provenance.subject) || provenance.subject.length === 0) {
      results.push({
        passed: false,
        message: 'Provenance must have at least one subject',
      });
    } else {
      results.push({
        passed: true,
        message: `Provenance has ${provenance.subject.length} subjects`,
      });
    }

    // Validate predicate structure
    const predicate = provenance.predicate;
    if (!predicate.buildDefinition) {
      results.push({
        passed: false,
        message: 'Provenance missing buildDefinition',
      });
    } else {
      if (!predicate.buildDefinition.externalParameters) {
        results.push({
          passed: false,
          message: 'Provenance missing externalParameters',
        });
      }

      if (!predicate.runDetails) {
        results.push({
          passed: false,
          message: 'Provenance missing runDetails',
        });
      }
    }

    // Check for empty required fields
    const externalParams = predicate.buildDefinition?.externalParameters;
    if (externalParams) {
      const emptyFields = [];
      if (!externalParams.repository) emptyFields.push('repository');
      if (!externalParams.ref) emptyFields.push('ref');
      if (!externalParams.commit) emptyFields.push('commit');

      if (emptyFields.length > 0) {
        results.push({
          passed: false,
          message: 'Provenance has empty required fields',
          details: `Empty fields: ${emptyFields.join(', ')}`,
        });
      } else {
        results.push({
          passed: true,
          message: 'Provenance schema valid',
        });
      }
    }
  } catch (error) {
    results.push({
      passed: false,
      message: 'Provenance is not valid JSON',
      details: error instanceof Error ? error.message : String(error),
    });
  }

  return results;
}

function verifyProvenanceCommit(): VerificationResult {
  const provenancePath = join(PROVENANCE_DIR, 'build-provenance.intoto.jsonl');

  if (!existsSync(provenancePath)) {
    return { passed: false, message: 'Provenance file not found' };
  }

  try {
    const provenance = JSON.parse(readFileSync(provenancePath, 'utf-8'));
    const provenanceCommit = provenance.predicate?.buildDefinition?.externalParameters?.commit;
    const currentCommit = getCurrentGitCommit();

    if (!provenanceCommit) {
      return {
        passed: false,
        message: 'Provenance missing commit hash',
      };
    }

    if (currentCommit && provenanceCommit !== currentCommit) {
      return {
        passed: false,
        message: 'Provenance commit mismatch',
        details: `Provenance: ${provenanceCommit.substring(0, 8)}, Current: ${currentCommit.substring(0, 8)}`,
      };
    }

    return {
      passed: true,
      message: `Provenance references correct commit (${provenanceCommit.substring(0, 8)})`,
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Failed to verify provenance commit',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

function verifyArtifactHashes(): VerificationResult[] {
  const results: VerificationResult[] = [];
  const provenancePath = join(PROVENANCE_DIR, 'build-provenance.intoto.jsonl');

  if (!existsSync(provenancePath)) {
    return results;
  }

  try {
    const provenance = JSON.parse(readFileSync(provenancePath, 'utf-8'));
    const subjects = provenance.subject || [];

    let verified = 0;
    let mismatches = 0;
    let missing = 0;

    for (const subject of subjects) {
      const filePath = join(ROOT_DIR, subject.name);

      if (!existsSync(filePath)) {
        missing++;
        continue;
      }

      const actualHash = sha256File(filePath);
      const expectedHash = subject.digest?.sha256;

      if (!expectedHash) {
        continue;
      }

      if (actualHash === expectedHash) {
        verified++;
      } else {
        mismatches++;
        results.push({
          passed: false,
          message: `Hash mismatch for ${subject.name}`,
          details: `Expected: ${expectedHash.substring(0, 16)}..., Got: ${actualHash.substring(0, 16)}...`,
        });
      }
    }

    if (mismatches === 0 && missing === 0) {
      results.push({
        passed: true,
        message: `All ${verified} artifact hashes verified`,
      });
    } else if (missing > 0) {
      results.push({
        passed: false,
        message: `${missing} artifacts missing from provenance subjects`,
      });
    }
  } catch (error) {
    results.push({
      passed: false,
      message: 'Failed to verify artifact hashes',
      details: error instanceof Error ? error.message : String(error),
    });
  }

  return results;
}

async function main(): Promise<void> {
  console.log('========================================');
  console.log('  PROVENANCE & SBOM VERIFICATION');
  console.log('========================================');
  console.log('');

  const allResults: VerificationResult[] = [];

  // Phase 1: SBOM Existence
  console.log('📦 Verifying SBOM existence...');
  const sbomExistsResults = verifySBOMExists();
  allResults.push(...sbomExistsResults);

  // Phase 2: SBOM Schema
  console.log('🔍 Verifying SBOM schema...');
  const sbomSchemaResults = verifySBOMSchema();
  allResults.push(...sbomSchemaResults);

  // Phase 3: Provenance Existence
  console.log('📜 Verifying provenance existence...');
  const provenanceExistsResult = verifyProvenanceExists();
  allResults.push(provenanceExistsResult);

  // Phase 4: Provenance Schema
  console.log('🔍 Verifying provenance schema...');
  const provenanceSchemaResults = verifyProvenanceSchema();
  allResults.push(...provenanceSchemaResults);

  // Phase 5: Provenance Commit
  console.log('🔗 Verifying provenance commit...');
  const provenanceCommitResult = verifyProvenanceCommit();
  allResults.push(provenanceCommitResult);

  // Phase 6: Artifact Hashes
  console.log('🔐 Verifying artifact hashes...');
  const hashResults = verifyArtifactHashes();
  allResults.push(...hashResults);

  console.log('');
  console.log('========================================');
  console.log('  VERIFICATION RESULTS');
  console.log('========================================');
  console.log('');

  for (const result of allResults) {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.message}`);
    if (result.details) {
      console.log(`   ${result.details}`);
    }
  }

  const passed = allResults.filter((r) => r.passed).length;
  const total = allResults.length;
  const failed = total - passed;

  console.log('');
  console.log('========================================');
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  console.log('========================================');

  if (failed > 0) {
    console.error('');
    console.error('❌ VERIFICATION FAILED');
    console.error('');
    process.exit(1);
  }

  console.log('');
  console.log('✅ VERIFICATION PASSED');
  console.log('');
}

main().catch((error) => {
  console.error('Verification failed with error:', error);
  process.exit(1);
});
