import { createHash, createHmac, randomBytes } from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface ExceptionEntry {
  id: string;
  owner: string;
  reason: string;
  expiresAt: string; // ISO date string
  scope: string;
}

export interface ExceptionPolicy {
  updatedAt: string;
  exceptions: ExceptionEntry[];
}

export interface FreezeWindow {
  name: string;
  start: string; // ISO date
  end: string; // ISO date
  allowedDeployers?: string[];
}

export interface BuildProvenanceInput {
  imageDigest: string;
  buildCommand: string;
  repository: string;
  commit: string;
  ref: string;
  builderId?: string;
  artifacts?: string[];
}

export interface BuildProvenance {
  buildType: string;
  metadata: {
    invocationId: string;
    startedOn: string;
    finishedOn: string;
    builder: string;
  };
  materials: string[];
  subject: {
    name: string;
    digest: string;
  };
  invocation: {
    parameters: Record<string, unknown>;
  };
}

export class Phase1GateError extends Error {}

export function loadExceptionPolicy(policyPath: string): ExceptionPolicy {
  const raw = fs.readFileSync(policyPath, 'utf8');
  const parsed: ExceptionPolicy = JSON.parse(raw);
  if (!parsed.updatedAt || !Array.isArray(parsed.exceptions)) {
    throw new Phase1GateError('Exception policy file is malformed');
  }
  return parsed;
}

export function assertExceptionsValid(policy: ExceptionPolicy, now: Date = new Date()): void {
  policy.exceptions.forEach((exception) => {
    const expires = new Date(exception.expiresAt);
    if (Number.isNaN(expires.getTime())) {
      throw new Phase1GateError(`Exception ${exception.id} has invalid expiry`);
    }
    if (expires <= now) {
      throw new Phase1GateError(`Exception ${exception.id} is expired`);
    }
    if (!exception.owner || !exception.reason || !exception.scope) {
      throw new Phase1GateError(`Exception ${exception.id} missing required metadata`);
    }
  });
}

export function loadFreezeWindows(freezePath: string): FreezeWindow[] {
  const raw = fs.readFileSync(freezePath, 'utf8');
  const parsed: FreezeWindow[] = JSON.parse(raw);
  parsed.forEach((window) => {
    if (!window.name || !window.start || !window.end) {
      throw new Phase1GateError('Freeze window entry missing required fields');
    }
  });
  return parsed;
}

export function assertNotInFreeze(
  freezeWindows: FreezeWindow[],
  now: Date = new Date(),
  actor?: string,
  breakGlassToken?: string,
): void {
  const active = freezeWindows.find((window) => {
    const start = new Date(window.start);
    const end = new Date(window.end);
    return start <= now && now <= end;
  });

  if (!active) return;

  if (breakGlassToken && actor && active.allowedDeployers?.includes(actor)) {
    return;
  }

  const reason = `Deployment blocked: in freeze window "${active.name}" (${active.start} → ${active.end})`;
  throw new Phase1GateError(reason);
}

export function generateSbom(packageJsonPath: string, outputPath: string): void {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const timestamp = new Date().toISOString();
  const dependencies = Object.entries({
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {}),
  }).map(([name, version]) => ({ name, version }));

  const sbom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: `urn:uuid:${cryptoRandomUuid()}`,
    version: 1,
    metadata: {
      timestamp,
      component: {
        type: 'application',
        name: packageJson.name,
        version: packageJson.version,
      },
      tools: [
        {
          vendor: 'summit',
          name: 'phase1-sbom-generator',
          version: '1.0.0',
        },
      ],
    },
    components: dependencies.map((dep) => ({
      type: 'library',
      name: dep.name,
      version: dep.version as string,
    })),
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(sbom, null, 2));
}

export function generateProvenance(
  input: BuildProvenanceInput,
  outputPath: string,
  clock: () => Date = () => new Date(),
): BuildProvenance {
  const start = clock();
  const finish = clock();
  const provenance: BuildProvenance = {
    buildType: 'https://slsa.dev/container/v1',
    metadata: {
      invocationId: cryptoRandomUuid(),
      startedOn: start.toISOString(),
      finishedOn: finish.toISOString(),
      builder: input.builderId ?? 'authz-gateway/phase1',
    },
    materials: [input.repository, input.commit, input.ref].filter(Boolean),
    subject: {
      name: input.repository,
      digest: input.imageDigest,
    },
    invocation: {
      parameters: {
        buildCommand: input.buildCommand,
        artifacts: input.artifacts ?? [],
      },
    },
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(provenance, null, 2));
  return provenance;
}

export function digestForPath(targetPath: string): string {
  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    const hash = createHash('sha256');
    const entries = fs.readdirSync(targetPath).sort();
    entries.forEach((entry) => {
      const full = path.join(targetPath, entry);
      hash.update(entry);
      hash.update(digestForPath(full));
    });
    return hash.digest('hex');
  }

  const fileBuffer = fs.readFileSync(targetPath);
  return createHash('sha256').update(fileBuffer).digest('hex');
}

export function cosignSignArtifact(artifactPath: string, identity?: string): string {
  const signaturePath = `${artifactPath}.sig`;
  const bundlePath = `${artifactPath}.bundle.json`;
  execFileSync('cosign', ['sign-blob', '--yes', '--output-signature', signaturePath, '--bundle', bundlePath, artifactPath], {
    env: {
      ...process.env,
      COSIGN_EXPERIMENTAL: 'true',
      COSIGN_CERT_CHAIN: identity ?? process.env.COSIGN_CERT_CHAIN ?? '',
    },
    stdio: 'inherit',
  });
  return signaturePath;
}

export function cosignVerifyArtifact(artifactPath: string, signaturePath: string, bundlePath?: string): void {
  try {
    const args = ['verify-blob', '--signature', signaturePath, artifactPath];
    const effectiveBundle = bundlePath || (fs.existsSync(`${artifactPath}.bundle.json`) ? `${artifactPath}.bundle.json` : undefined);

    if (effectiveBundle) {
      args.push('--bundle', effectiveBundle);
      if (process.env.CERTIFICATE_IDENTITY && process.env.CERTIFICATE_OIDC_ISSUER) {
        args.push('--certificate-identity', process.env.CERTIFICATE_IDENTITY);
        args.push('--certificate-oidc-issuer', process.env.CERTIFICATE_OIDC_ISSUER);
      }
    }

    execFileSync('cosign', args, {
      env: { ...process.env, COSIGN_EXPERIMENTAL: 'true' },
      stdio: 'inherit',
    });
  } catch (error) {
    throw new Phase1GateError(`cosign verification failed for ${artifactPath}: ${String(error)}`);
  }
}

export function buildDeterministicHmac(input: string, secret?: string): string {
  const key = secret ?? process.env.PHASE1_HMAC_SECRET ?? 'phase1-default-secret';
  return createHmac('sha256', key).update(input).digest('hex');
}

function cryptoRandomUuid(): string {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`;
}
