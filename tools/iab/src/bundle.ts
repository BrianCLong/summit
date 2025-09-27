import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import tar from 'tar';
import yaml from 'js-yaml';
import { loadIncidentConfig } from './config.js';
import {
  ArtifactConfig,
  IncidentConfig,
  ManifestDocument,
  ProcessedArtifact,
  RedactionConfig
} from './types.js';
import { validateArtifact } from './validators/index.js';
import { redactStructuredValue, redactText } from './redaction.js';
import { signManifest, verifySignature } from './signature.js';
import { createSummaryMarkdown } from './summary.js';
import { readFileWithEncoding } from './fs-utils.js';

const TOOL_NAME = 'Incident Attestation Bundler';
const TOOL_VERSION = '0.1.0';

interface BundleOptions {
  incidentPath: string;
  outputPath: string;
  privateKeyPath: string;
}

function sha256(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function determineBundlePath(artifact: ArtifactConfig): string {
  const ext = path.extname(artifact.path) || '.txt';
  const safeId = artifact.id.replace(/[^a-zA-Z0-9-_]/g, '_');
  return path.join('artifacts', `${safeId}${ext}`);
}

async function stageArtifact(
  artifact: ArtifactConfig,
  redaction: RedactionConfig | undefined,
  stagingDir: string,
  baseDir: string
): Promise<ProcessedArtifact> {
  const sourcePath = path.isAbsolute(artifact.path)
    ? artifact.path
    : path.resolve(baseDir, artifact.path);
  const rawContent = await readFileWithEncoding(sourcePath);
  const validation = validateArtifact(artifact, rawContent.content);

  if (validation.status === 'failed') {
    throw new Error(`Validation failed for artifact ${artifact.id}: ${validation.details.join('; ')}`);
  }

  let sanitizedBuffer: Buffer;
  let redactions: ProcessedArtifact['redactions'] = [];

  if (rawContent.isBinary) {
    sanitizedBuffer = rawContent.buffer;
  } else {
    const extension = path.extname(sourcePath).toLowerCase();
    if (extension === '.json' || extension === '.trace' || extension === '.policy') {
      const parsed = JSON.parse(rawContent.content);
      const { value, records } = redactStructuredValue(parsed, redaction, [artifact.id]);
      sanitizedBuffer = Buffer.from(JSON.stringify(value, null, 2));
      redactions = records;
    } else if (extension === '.yaml' || extension === '.yml') {
      const parsed = yaml.load(rawContent.content);
      const { value, records } = redactStructuredValue(parsed, redaction, [artifact.id]);
      sanitizedBuffer = Buffer.from(yaml.dump(value, { noRefs: true, skipInvalid: true }));
      redactions = records;
    } else {
      const { sanitized, records } = redactText(rawContent.content, redaction);
      sanitizedBuffer = Buffer.from(sanitized);
      redactions = records;
    }
  }

  const bundledPath = determineBundlePath(artifact);
  const destination = path.join(stagingDir, bundledPath);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, sanitizedBuffer);

  return {
    id: artifact.id,
    type: artifact.type,
    sourcePath,
    bundledPath,
    checksum: sha256(sanitizedBuffer),
    validation,
    redactions,
    description: artifact.description,
    metadata: artifact.metadata
  };
}

export async function createBundle(options: BundleOptions): Promise<string> {
  const incident = await loadIncidentConfig(options.incidentPath);
  const baseDir = path.dirname(path.resolve(options.incidentPath));
  const stagingDir = await fs.mkdtemp(path.join(os.tmpdir(), 'iab-'));

  try {
    const processedArtifacts: ProcessedArtifact[] = [];
    for (const artifact of incident.artifacts) {
      processedArtifacts.push(await stageArtifact(artifact, incident.redaction, stagingDir, baseDir));
    }

    const manifest: ManifestDocument = {
      version: '1.0.0',
      incident: {
        id: incident.id,
        occurredAt: incident.occurredAt,
        reportedAt: incident.reportedAt,
        severity: incident.severity,
        description: incident.description
      },
      createdAt: new Date().toISOString(),
      tool: {
        name: TOOL_NAME,
        version: TOOL_VERSION
      },
      artifacts: processedArtifacts
    };

    const manifestPath = path.join(stagingDir, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    const summary = createSummaryMarkdown(manifest);
    await fs.writeFile(path.join(stagingDir, 'summary.md'), summary);

    const signature = await signManifest(manifestPath, options.privateKeyPath);
    await fs.writeFile(path.join(stagingDir, 'signature.sig'), signature, 'utf8');

    await tar.create(
      {
        cwd: stagingDir,
        gzip: true,
        file: options.outputPath
      },
      ['manifest.json', 'summary.md', 'signature.sig', 'artifacts']
    );

    return options.outputPath;
  } finally {
    await fs.rm(stagingDir, { recursive: true, force: true });
  }
}

export async function verifyBundle(
  bundlePath: string,
  publicKeyPath: string
): Promise<ManifestDocument> {
  const extractionDir = await fs.mkdtemp(path.join(os.tmpdir(), 'iab-verify-'));
  try {
    await tar.extract({ file: bundlePath, cwd: extractionDir, sync: true });
    const manifestPath = path.join(extractionDir, 'manifest.json');
    const signaturePath = path.join(extractionDir, 'signature.sig');

    const signature = await fs.readFile(signaturePath, 'utf8');

    const verified = await verifySignature(manifestPath, signature, publicKeyPath);
    if (!verified) {
      throw new Error('signature verification failed');
    }

    const manifestRaw = await fs.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestRaw) as ManifestDocument;

    return manifest;
  } finally {
    await fs.rm(extractionDir, { recursive: true, force: true });
  }
}
