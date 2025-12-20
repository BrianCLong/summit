#!/usr/bin/env -S node --loader ts-node/esm

import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ArtifactRecord {
  name: string;
  path: string;
  sha256?: string;
}

interface ImageDigestRecord {
  name: string;
  digest: string;
}

interface EvidenceBundle {
  version: string;
  generatedAt: string;
  git: {
    commit: string;
    shortCommit: string;
    branch: string;
    message?: string;
  };
  workflow: {
    runId?: string;
    runAttempt?: string;
    workflowName?: string;
    job?: string;
    url?: string;
  };
  summary: {
    tests: string;
    security: string;
  };
  artifacts: {
    files: ArtifactRecord[];
    images: ImageDigestRecord[];
    sboms: ArtifactRecord[];
  };
  attestations: {
    cosignSigned?: boolean;
    cosignCertificate?: string;
    cosignSignature?: string;
    provenance?: string;
  };
  notes?: string;
}

const VERSION = '1.0.0';

const parseList = (input?: string): string[] => {
  if (!input) return [];
  return input
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
};

const parseKeyValueList = (input?: string): ImageDigestRecord[] => {
  if (!input) return [];
  return input
    .split(',')
    .map(pair => pair.trim())
    .filter(Boolean)
    .map(pair => {
      const [name, digest] = pair.split('=');
      return { name: name?.trim() || 'unknown', digest: digest?.trim() || 'unknown' };
    });
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
};

const sha256File = async (filePath: string): Promise<string | undefined> => {
  if (!(await fileExists(filePath))) return undefined;
  const data = await fs.readFile(filePath);
  return createHash('sha256').update(data).digest('hex');
};

const commandExists = async (command: string): Promise<boolean> => {
  try {
    await execAsync(`command -v ${command}`);
    return true;
  } catch (error) {
    return false;
  }
};

const optionalRun = async (command: string): Promise<string | undefined> => {
  try {
    const result = await execAsync(command);
    return result.stdout.trim();
  } catch (error) {
    return undefined;
  }
};

const resolveGitInfo = async () => {
  const commit = process.env.GITHUB_SHA || (await optionalRun('git rev-parse HEAD')) || 'unknown';
  const branch =
    process.env.GITHUB_REF_NAME ||
    process.env.GITHUB_HEAD_REF ||
    process.env.GITHUB_REF ||
    (await optionalRun('git rev-parse --abbrev-ref HEAD')) ||
    'unknown';
  const shortCommit = commit.slice(0, 12);
  const message = await optionalRun(`git show -s --format=%s ${commit}`);

  return { commit, branch, shortCommit, message };
};

const gatherArtifacts = async (paths: string[], label: string): Promise<ArtifactRecord[]> => {
  const records: ArtifactRecord[] = [];
  for (const artifactPath of paths) {
    const normalizedPath = path.resolve(artifactPath);
    const present = await fileExists(normalizedPath);
    const digest = present ? await sha256File(normalizedPath) : undefined;
    records.push({
      name: path.basename(artifactPath) || label,
      path: normalizedPath,
      sha256: digest,
    });
  }
  return records;
};

const maybeSignBundle = async (bundlePath: string) => {
  if (process.env.EVIDENCE_SIGN !== 'true') return undefined;
  const cosignAvailable = await commandExists('cosign');
  if (!cosignAvailable) {
    console.warn('Cosign not available, skipping signature.');
    return undefined;
  }

  const signaturePath = `${bundlePath}.sig`;
  const certificatePath = `${bundlePath}.crt`;
  try {
    await execAsync(
      `cosign sign-blob --yes --output-signature ${signaturePath} --output-certificate ${certificatePath} ${bundlePath}`,
      { env: { ...process.env, COSIGN_EXPERIMENTAL: process.env.COSIGN_EXPERIMENTAL || 'true' } },
    );
    return { signaturePath, certificatePath };
  } catch (error) {
    console.warn('Cosign signing failed; continuing without signature.');
    return undefined;
  }
};

const buildEvidenceBundle = async () => {
  const args = process.argv.slice(2);
  const cliArtifacts = args
    .filter(arg => arg.startsWith('--artifact='))
    .map(arg => arg.replace('--artifact=', ''));
  const cliSboms = args
    .filter(arg => arg.startsWith('--sbom='))
    .map(arg => arg.replace('--sbom=', ''));
  const cliTestReports = args
    .filter(arg => arg.startsWith('--test-report='))
    .map(arg => arg.replace('--test-report=', ''));
  const cliSecurityReports = args
    .filter(arg => arg.startsWith('--security-report='))
    .map(arg => arg.replace('--security-report=', ''));

  const artifactPaths = [...parseList(process.env.ARTIFACT_PATHS), ...cliArtifacts];
  const sbomPaths = [...parseList(process.env.SBOM_PATHS), ...cliSboms];
  const testReports = [...parseList(process.env.TEST_REPORTS), ...cliTestReports];
  const securityReports = [...parseList(process.env.SECURITY_REPORTS), ...cliSecurityReports];

  const gitInfo = await resolveGitInfo();
  const workflowUrl = process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${process.env.GITHUB_REPOSITORY || ''}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : undefined;

  const [artifactRecords, sbomRecords] = await Promise.all([
    gatherArtifacts(artifactPaths, 'artifact'),
    gatherArtifacts(sbomPaths, 'sbom'),
  ]);

  const testDigestSummaries: ArtifactRecord[] = await gatherArtifacts(testReports, 'test-report');
  const securityDigestSummaries: ArtifactRecord[] = await gatherArtifacts(securityReports, 'security-report');

  const imageDigests = parseKeyValueList(process.env.IMAGE_DIGESTS);

  const testsSummary = process.env.TEST_RESULTS_SUMMARY ||
    (testDigestSummaries.length > 0
      ? 'Test report files attached in artifacts.'
      : 'No test summary provided.');
  const securitySummary = process.env.SECURITY_SCAN_SUMMARY ||
    (securityDigestSummaries.length > 0
      ? 'Security scan reports attached in artifacts.'
      : 'No security scan summary provided.');

  const evidence: EvidenceBundle = {
    version: VERSION,
    generatedAt: new Date().toISOString(),
    git: {
      commit: gitInfo.commit,
      shortCommit: gitInfo.shortCommit,
      branch: gitInfo.branch,
      message: gitInfo.message,
    },
    workflow: {
      runId: process.env.GITHUB_RUN_ID,
      runAttempt: process.env.GITHUB_RUN_ATTEMPT,
      workflowName: process.env.GITHUB_WORKFLOW,
      job: process.env.GITHUB_JOB,
      url: workflowUrl,
    },
    summary: {
      tests: testsSummary,
      security: securitySummary,
    },
    artifacts: {
      files: [...artifactRecords, ...testDigestSummaries, ...securityDigestSummaries],
      images: imageDigests,
      sboms: sbomRecords,
    },
    attestations: {
      cosignSigned: false,
      provenance: process.env.SLSA_PROVENANCE_PATH,
    },
    notes: process.env.EVIDENCE_NOTES,
  };

  const outputDir = path.resolve('evidence-bundles');
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `evidence-${gitInfo.commit}.json`);
  await fs.writeFile(outputPath, JSON.stringify(evidence, null, 2));

  const signature = await maybeSignBundle(outputPath);
  if (signature) {
    evidence.attestations.cosignSigned = true;
    evidence.attestations.cosignSignature = signature.signaturePath;
    evidence.attestations.cosignCertificate = signature.certificatePath;
    await fs.writeFile(outputPath, JSON.stringify(evidence, null, 2));
  }

  console.log(`Evidence bundle written to ${outputPath}`);
  if (signature) {
    console.log(`Cosign signature: ${signature.signaturePath}`);
  }
};

buildEvidenceBundle().catch(error => {
  console.error('Failed to generate evidence bundle:', error);
  process.exitCode = 1;
});
