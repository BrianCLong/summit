import fs from 'node:fs';
import path from 'node:path';
import type { GateResult, ImageGateConfig, ImageRequirement } from './types.ts';

export async function enforceImageGate(rootDir: string, config: ImageGateConfig): Promise<GateResult> {
  const issues: string[] = [];

  config.stageImages.forEach((image) => {
    const digestIssue = validateDigest(image);
    if (digestIssue) {
      issues.push(`${image.name}: ${digestIssue}`);
    }

    const signatureIssue = validateArtifact(rootDir, image.signaturePath, 'signature');
    if (signatureIssue) {
      issues.push(`${image.name}: ${signatureIssue}`);
    }

    const provenanceIssue = validateArtifact(rootDir, image.provenancePath, 'provenance');
    if (provenanceIssue) {
      issues.push(`${image.name}: ${provenanceIssue}`);
    }
  });

  return {
    gate: 'image',
    ok: issues.length === 0,
    details: issues.length ? issues : ['All stage images are digest pinned with signature and provenance evidence']
  };
}

function validateDigest(image: ImageRequirement): string | undefined {
  if (!image.digest.startsWith('sha256:') || image.digest.length < 71) {
    return 'image digest must be a sha256 hash';
  }
  if (!image.name.includes('@sha256:')) {
    return 'image reference must be digest pinned (name@sha256:<digest>)';
  }
  return undefined;
}

function validateArtifact(rootDir: string, relativePath: string, artifact: 'signature' | 'provenance'): string | undefined {
  const resolved = path.resolve(rootDir, relativePath);
  if (!fs.existsSync(resolved)) {
    return `${artifact} missing at ${relativePath}`;
  }
  const content = fs.readFileSync(resolved, 'utf-8').trim();
  if (!content.length) {
    return `${artifact} file ${relativePath} is empty`;
  }
  return undefined;
}
