#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign as signWithKey,
  verify as verifySignatureWithKey,
} from 'crypto';
import os from 'os';

type CycloneDxComponent = {
  name: string;
  version: string;
  purl?: string;
  license?: string;
  hashes?: Record<string, string>;
};

export type CycloneDxBom = {
  bomFormat: 'CycloneDX';
  specVersion: string;
  metadata: {
    component: CycloneDxComponent;
    timestamp?: string;
  };
  components: CycloneDxComponent[];
};

export type ProvenanceStatement = {
  _type: 'https://in-toto.io/Statement/v1';
  predicateType: 'https://slsa.dev/provenance/v1';
  subject: Array<{ name: string; digest: { sha256: string } }>;
  predicate: {
    buildType: string;
    builder: { id: string };
    invocation: {
      configSource: {
        uri: string;
        digest: Record<string, string>;
        entryPoint?: string;
      };
      parameters?: Record<string, unknown>;
      environment?: {
        github?: {
          repository?: string;
          ref?: string;
          actor?: string;
          issuer?: string;
        };
        permissions?: string[];
      };
    };
    metadata?: {
      buildInvocationId?: string;
      completeness?: {
        parameters?: boolean;
        environment?: boolean;
        materials?: boolean;
      };
      reproducible?: boolean;
    };
    materials?: Array<{
      uri: string;
      digest: Record<string, string>;
    }>;
  };
};

type EvidenceSigner = {
  publicKey: string; // PEM
  identity: string;
  certificateIssuer?: string;
};

export type EvidenceBundle = {
  imageDigest: string;
  sbom: CycloneDxBom;
  provenance: ProvenanceStatement;
  signedAt: string;
  signer: EvidenceSigner;
  signature: string; // base64
};

export type FreezeWindow = {
  start: string; // ISO timestamp
  end: string; // ISO timestamp
  reason?: string;
};

export type AllowlistEntry = {
  digest: string;
  expiresAt: string;
  owner: string;
  reason?: string;
};

export type PolicyOptions = {
  expectedDigest?: string;
  allowedBuilders: string[];
  allowedIssuers?: string[];
  requiredPermissions?: string[];
  freezeWindows?: FreezeWindow[];
  requireComponents?: boolean;
  allowlistPath?: string;
};

export class VerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VerificationError';
  }
}

function normalizeForStableSerialization(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeForStableSerialization(entry));
  }
  const sortedKeys = Object.keys(value as Record<string, unknown>).sort();
  return sortedKeys.reduce<Record<string, unknown>>((acc, key) => {
    acc[key] = normalizeForStableSerialization((value as Record<string, unknown>)[key]);
    return acc;
  }, {});
}

function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeForStableSerialization(value));
}

function sha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

function normalizeDigest(digest: string): string {
  return digest.startsWith('sha256:') ? digest : `sha256:${digest}`;
}

function loadJsonFile<T>(filePath: string): T {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new VerificationError(`File not found: ${resolved}`);
  }
  try {
    const raw = fs.readFileSync(resolved, 'utf8');
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new VerificationError(`Failed to read ${resolved}: ${(error as Error).message}`);
  }
}

export function generateCycloneDxBom(
  packageJsonPath: string,
  componentName: string,
  componentVersion: string,
): CycloneDxBom {
  const pkg = loadJsonFile<{ dependencies?: Record<string, string>; devDependencies?: Record<string, string> }>(
    packageJsonPath,
  );
  const components: CycloneDxComponent[] = [];
  const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const [name, version] of Object.entries(dependencies)) {
    components.push({
      name,
      version,
      purl: `pkg:npm/${name}@${version.replace('^', '').replace('~', '')}`,
    });
  }
  const bom: CycloneDxBom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    metadata: {
      component: {
        name: componentName,
        version: componentVersion,
      },
      timestamp: new Date().toISOString(),
    },
    components,
  };
  if (bom.components.length === 0) {
    throw new VerificationError('Generated SBOM has no components');
  }
  return bom;
}

export function createProvenanceStatement(
  imageDigest: string,
  builderId: string,
  repository: string,
  ref: string,
  workflowPath: string,
  permissions: string[],
): ProvenanceStatement {
  const normalizedDigest = normalizeDigest(imageDigest).replace('sha256:', '');
  return {
    _type: 'https://in-toto.io/Statement/v1',
    predicateType: 'https://slsa.dev/provenance/v1',
    subject: [
      {
        name: repository,
        digest: { sha256: normalizedDigest },
      },
    ],
    predicate: {
      buildType: 'https://github.com/Workflow',
      builder: { id: builderId },
      invocation: {
        configSource: {
          uri: `git+https://github.com/${repository}.git`,
          digest: { sha1: sha256(repository + ref) },
          entryPoint: workflowPath,
        },
        parameters: {
          permissions,
        },
        environment: {
          github: {
            repository,
            ref,
            issuer: 'https://token.actions.githubusercontent.com',
          },
          permissions,
        },
      },
      metadata: {
        buildInvocationId: sha256(`${repository}-${ref}-${workflowPath}`),
        completeness: {
          parameters: true,
          environment: true,
          materials: true,
        },
        reproducible: false,
      },
      materials: [],
    },
  };
}

export function createEvidenceBundle(
  sbom: CycloneDxBom,
  provenance: ProvenanceStatement,
  imageDigest: string,
  signerIdentity: string,
  privateKeyPem?: string,
): EvidenceBundle {
  const signingKey =
    privateKeyPem ?? generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const payload = Buffer.from(
    stableStringify({ sbom, provenance, imageDigest: normalizeDigest(imageDigest) }),
    'utf8',
  );
  const signature = signWithKey(null, payload, createPrivateKey(signingKey)).toString('base64');
  const publicKey = createPublicKey(signingKey).export({ type: 'spki', format: 'pem' }).toString();
  return {
    imageDigest: normalizeDigest(imageDigest),
    sbom,
    provenance,
    signedAt: new Date().toISOString(),
    signer: {
      publicKey,
      identity: signerIdentity,
      certificateIssuer: 'https://token.actions.githubusercontent.com',
    },
    signature,
  };
}

export function loadAllowlist(entriesPath?: string): AllowlistEntry[] {
  if (!entriesPath) return [];
  const content = loadJsonFile<{ entries: AllowlistEntry[] }>(entriesPath);
  return content.entries;
}

function isAllowlisted(digest: string, allowlist: AllowlistEntry[]): boolean {
  const normalized = normalizeDigest(digest);
  const now = Date.now();
  return allowlist.some((entry) => {
    const expiry = Date.parse(entry.expiresAt);
    return normalizeDigest(entry.digest) === normalized && expiry > now;
  });
}

function assertSbom(sbom: CycloneDxBom, requireComponents: boolean | undefined) {
  if (sbom.bomFormat !== 'CycloneDX') {
    throw new VerificationError('SBOM must be CycloneDX');
  }
  if (!Array.isArray(sbom.components)) {
    throw new VerificationError('SBOM components missing');
  }
  if (requireComponents && sbom.components.length === 0) {
    throw new VerificationError('SBOM must contain at least one component');
  }
}

function assertProvenance(
  provenance: ProvenanceStatement,
  imageDigest: string,
  allowedBuilders: string[],
  allowedIssuers?: string[],
  requiredPermissions?: string[],
) {
  if (provenance.predicateType !== 'https://slsa.dev/provenance/v1') {
    throw new VerificationError('Unsupported provenance predicate');
  }
  const subject = provenance.subject?.[0];
  if (!subject?.digest?.sha256) {
    throw new VerificationError('Provenance subject digest missing');
  }
  const normalizedDigest = normalizeDigest(`sha256:${subject.digest.sha256}`);
  if (normalizedDigest !== normalizeDigest(imageDigest)) {
    throw new VerificationError('Provenance digest does not match image digest');
  }
  if (!allowedBuilders.includes(provenance.predicate.builder.id)) {
    throw new VerificationError('Builder identity is not allowed');
  }
  if (allowedIssuers?.length) {
    const issuer = provenance.predicate.invocation.environment?.github?.issuer;
    if (!issuer || !allowedIssuers.includes(issuer)) {
      throw new VerificationError('OIDC issuer not allowed');
    }
  }
  if (requiredPermissions?.length) {
    const permissions = provenance.predicate.invocation.environment?.permissions ?? [];
    for (const required of requiredPermissions) {
      if (!permissions.includes(required)) {
        throw new VerificationError(`Missing required permission: ${required}`);
      }
    }
  }
}

function assertFreezeWindows(signedAt: string, windows: FreezeWindow[] | undefined) {
  if (!windows?.length) return;
  const signed = Date.parse(signedAt);
  for (const window of windows) {
    const start = Date.parse(window.start);
    const end = Date.parse(window.end);
    if (Number.isNaN(start) || Number.isNaN(end)) {
      throw new VerificationError('Freeze window has invalid dates');
    }
    if (signed >= start && signed <= end) {
      const reason = window.reason ? ` (${window.reason})` : '';
      throw new VerificationError(`Deploys are frozen${reason}`);
    }
  }
}

function verifySignature(bundle: EvidenceBundle) {
  const payload = Buffer.from(
    stableStringify({
      sbom: bundle.sbom,
      provenance: bundle.provenance,
      imageDigest: normalizeDigest(bundle.imageDigest),
    }),
    'utf8',
  );
  const valid = verifySignatureWithKey(
    null,
    payload,
    createPublicKey(bundle.signer.publicKey),
    Buffer.from(bundle.signature, 'base64'),
  );
  if (!valid) {
    throw new VerificationError('Signature verification failed');
  }
}

export function verifyEvidenceBundle(bundle: EvidenceBundle, policy: PolicyOptions): { checks: string[] } {
  const allowlist = loadAllowlist(policy.allowlistPath);
  if (isAllowlisted(bundle.imageDigest, allowlist)) {
    return { checks: ['allowlist-bypass'] };
  }

  if (policy.expectedDigest && normalizeDigest(policy.expectedDigest) !== normalizeDigest(bundle.imageDigest)) {
    throw new VerificationError('Image digest does not match expected value');
  }

  assertSbom(bundle.sbom, policy.requireComponents);
  assertProvenance(
    bundle.provenance,
    bundle.imageDigest,
    policy.allowedBuilders,
    policy.allowedIssuers,
    policy.requiredPermissions,
  );
  assertFreezeWindows(bundle.signedAt, policy.freezeWindows);
  verifySignature(bundle);

  return {
    checks: ['sbom', 'provenance', 'signature', 'policy'],
  };
}

function parseFreezeWindows(raw: string | undefined): FreezeWindow[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [start, end, reason] = entry.split('|');
      if (!start || !end) {
        throw new VerificationError('Invalid freeze window entry');
      }
      return { start, end, reason };
    });
}

function parseArgs(argv: string[]): { bundlePath: string; policy: PolicyOptions } {
  const options: PolicyOptions = {
    allowedBuilders: [],
    allowedIssuers: [],
    requiredPermissions: [],
    freezeWindows: [],
  };
  let bundlePath = '';
  for (let i = 0; i < argv.length; i++) {
    const current = argv[i];
    const next = argv[i + 1];
    switch (current) {
      case '--bundle':
        bundlePath = next;
        i++;
        break;
      case '--expected-digest':
        options.expectedDigest = next;
        i++;
        break;
      case '--allowed-builder':
        options.allowedBuilders.push(next);
        i++;
        break;
      case '--allowed-issuer':
        options.allowedIssuers?.push(next);
        i++;
        break;
      case '--required-permission':
        options.requiredPermissions?.push(next);
        i++;
        break;
      case '--freeze-window':
        options.freezeWindows = [...(options.freezeWindows ?? []), ...parseFreezeWindows(next)];
        i++;
        break;
      case '--require-components':
        options.requireComponents = true;
        break;
      case '--allowlist':
        options.allowlistPath = next;
        i++;
        break;
      default:
        break;
    }
  }
  if (!bundlePath) {
    throw new VerificationError('Missing required --bundle argument');
  }
  if (!options.allowedBuilders.length) {
    throw new VerificationError('At least one --allowed-builder is required');
  }
  if (options.freezeWindows?.length === 0) {
    options.freezeWindows = parseFreezeWindows(process.env.FREEZE_WINDOWS);
  }
  return { bundlePath, policy: options };
}

function runCli() {
  const { bundlePath, policy } = parseArgs(process.argv.slice(2));
  const bundle = loadJsonFile<EvidenceBundle>(bundlePath);
  const result = verifyEvidenceBundle(bundle, policy);
  console.log(
    `Supply chain verification succeeded for ${bundle.imageDigest}. Checks: ${result.checks.join(', ')}`,
  );
}

if (require.main === module) {
  try {
    runCli();
  } catch (error) {
    console.error(`verification failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

export function writeEvidenceBundle(bundle: EvidenceBundle, outputPath: string) {
  fs.writeFileSync(outputPath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
}

export function buildAndSignFromPackage(
  packageJsonPath: string,
  componentName: string,
  componentVersion: string,
  imageDigest: string,
  builderId: string,
  repository: string,
  ref: string,
  workflowPath: string,
  permissions: string[],
  signerIdentity: string,
  privateKeyPem?: string,
): EvidenceBundle {
  const sbom = generateCycloneDxBom(packageJsonPath, componentName, componentVersion);
  const provenance = createProvenanceStatement(imageDigest, builderId, repository, ref, workflowPath, permissions);
  return createEvidenceBundle(sbom, provenance, imageDigest, signerIdentity, privateKeyPem);
}

export function persistAllowlist(entries: AllowlistEntry[], outputDir: string): string {
  const dir = fs.mkdtempSync(path.join(outputDir, 'allowlist-'));
  const filePath = path.join(dir, 'allowlist.json');
  fs.writeFileSync(filePath, JSON.stringify({ entries }, null, 2));
  return filePath;
}

export function mktempEvidencePath(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-'));
}
