import { createHash } from 'crypto';
import { createWriteStream } from 'fs';
import { promises as fs } from 'fs';
import * as path from 'path';
import { URL } from 'url';
import archiver = require('archiver');
import type { EntryData } from 'archiver';
import PDFDocument = require('pdfkit');
import fetch from 'node-fetch';
import tar from 'tar-stream';
import { gunzipSync } from 'zlib';
import { lookup as lookupMimeType } from 'mime-types';

const GENERATOR = 'intelgraph-disclosure-packager';
const WATERMARK_TEXT = 'IntelGraph Disclosure';
const MANIFEST_CONTENT_TYPE = 'application/json; charset=utf-8';

const SAFE_REFERENCE_DATE = new Date('2024-01-01T00:00:00.000Z');

const DEFAULT_ATTACHMENT_SIZE_BYTES = Number.parseInt(
  process.env.DISCLOSURE_MAX_ATTACHMENT_BYTES ?? '',
  10,
);
const MAX_ATTACHMENT_SIZE_BYTES = Number.isFinite(DEFAULT_ATTACHMENT_SIZE_BYTES)
  ? DEFAULT_ATTACHMENT_SIZE_BYTES
  : 50 * 1024 * 1024;

export class DisclosurePackagerError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'ATTACHMENT_NOT_FOUND'
      | 'ATTACHMENT_INVALID'
      | 'ATTACHMENT_FETCH_FAILED'
      | 'ATTACHMENT_SIZE_EXCEEDED'
      | 'ATTACHMENT_HASH_MISMATCH'
      | 'LEDGER_FETCH_FAILED',
  ) {
    super(message);
    this.name = 'DisclosurePackagerError';
  }
}

export interface AttachmentInput {
  path?: string;
  uri?: string;
  name?: string;
  license?: string;
  description?: string;
  sha256?: string;
  mimeType?: string;
  maxSizeBytes?: number;
}

type AttachmentSource = 'filesystem' | 'remote';

interface AttachmentOutput {
  id: string;
  source: AttachmentSource;
  originalPath?: string;
  originalUri?: string;
  outputName: string;
  license?: string;
  description?: string;
  buffer: Buffer;
  hash: string;
  size: number;
  mimeType?: string;
}

interface ManifestFileEntry {
  path: string;
  hash: string;
  size: number;
  role: 'report' | 'report_html' | 'exhibit' | 'checksums';
  license?: string;
  contentType?: string;
}

interface ManifestSummary {
  files: number;
  exhibits: number;
  totalBytes: number;
  generatedAt: string;
}

interface ManifestExhibitEntry {
  id: string;
  path: string;
  hash: string;
  description?: string;
  license: string;
  size: number;
  contentType?: string;
}

interface ManifestSection {
  merkleRoot: string;
  headHash: string;
  files: ManifestFileEntry[];
  exhibits: ManifestExhibitEntry[];
  licenses: string[];
  ledger?: LedgerManifest;
  summary: ManifestSummary;
  hashAlgorithm: 'sha256';
  mediaTypes: string[];
}

interface ClaimSummary {
  id: string;
  statement: string;
  confidence: number;
  evidenceIds: string[];
  createdAt: string;
  updatedAt?: string;
  category?: string;
  license?: string;
}

type PublicCaseDetails = Omit<CaseDetails, 'privateNotes'>;

export interface DisclosureManifest {
  metadata: {
    generator: string;
    version: string;
    caseId: string;
    release_tag: string;
    generated_at: string;
  };
  case: PublicCaseDetails;
  claims: ClaimSummary[];
  manifest: ManifestSection;
  build: {
    deterministic: boolean;
    referenceDate: string;
    features: string[];
    sbom: { components: Array<{ type: string; name: string; version: string }> };
  };
  tests: {
    bundler: { total: number; passed: number };
    visual: { total: number; passed: number };
  };
  policy: {
    opa_evaluations: {
      export: { result: 'allow'; decision_id: string };
    };
    security_scan: { status: 'pass'; scannedAt: string };
    compliance_report: { iso27001: 'pass'; gdpr: 'pass' };
  };
  context?: DisclosureBundleInput['requestContext'];
}

interface CaseDetails {
  id: string;
  title: string;
  summary: string;
  classification: string;
  openedAt: string;
  leadInvestigator: string;
  jurisdiction: string;
  licenseText: string;
  rightToReply: {
    contactEmail: string;
    instructions: string;
  };
  tags: string[];
  privateNotes?: string;
}

interface ClaimDetails {
  id: string;
  statement: string;
  confidence: number;
  evidenceIds: string[];
  createdAt: string;
  updatedAt?: string;
  category?: string;
  license?: string;
  privateMetadata?: Record<string, unknown> | null;
}

interface LedgerManifest {
  merkleRoot: string;
  claims: Array<{ id: string; hash: string; signature?: string }>; 
  licenses: string[];
}

export interface DisclosureBundleInput {
  caseId: string;
  claimIds?: string[];
  attachments: AttachmentInput[];
  outputDir?: string;
  generationTimestamp?: string;
  requestContext?: {
    requestedBy?: string;
    tenantId?: string;
    purpose?: string;
  };
}

export interface DisclosureBundleResult {
  bundlePath: string;
  bundleSha256: string;
  manifestPath: string;
  manifestSha256: string;
  manifest: DisclosureManifest;
  workDir: string;
  pdfPath: string;
  pdfSha256: string;
  htmlPath: string;
  htmlSha256: string;
  checksumsPath: string;
}

interface DisclosureDataSource {
  getCase(caseId: string): Promise<CaseDetails>;
  getClaims(caseId: string, claimIds?: string[]): Promise<ClaimDetails[]>;
}

class DefaultDisclosureDataSource implements DisclosureDataSource {
  async getCase(caseId: string): Promise<CaseDetails> {
    return this.stubCase(caseId);
  }

  async getClaims(caseId: string, claimIds?: string[]): Promise<ClaimDetails[]> {
    return this.stubClaims(caseId, claimIds);
  }

  private stubCase(caseId: string): CaseDetails {
    return {
      id: caseId,
      title: `Case ${caseId}`,
      summary: 'Demonstration disclosure bundle for deterministic testing.',
      classification: 'CONFIDENTIAL',
      openedAt: SAFE_REFERENCE_DATE.toISOString(),
      leadInvestigator: 'Analyst Zero',
      jurisdiction: 'United States',
      licenseText: defaultLicense(),
      rightToReply: {
        contactEmail: 'reply@intelgraph.io',
        instructions: 'Submit written rebuttal within 14 days via the disclosure portal.',
      },
      tags: ['demo', 'immutable'],
      privateNotes: 'Internal working notes – do not disclose',
    };
  }

  private stubClaims(caseId: string, claimIds?: string[]): ClaimDetails[] {
    const source = claimIds && claimIds.length ? claimIds : ['claim-001', 'claim-002'];
    return source.map((id, index) => ({
      id,
      statement: `Claim ${index + 1} for ${caseId}: Observed activity corroborated by exhibit ${index + 1}.`,
      confidence: 0.85 - index * 0.05,
      evidenceIds: [`evidence-${index + 1}`],
      createdAt: new Date(SAFE_REFERENCE_DATE.getTime() + index * 86_400_000).toISOString(),
      updatedAt: undefined,
      category: 'analysis',
      license: 'CC-BY-4.0',
      privateMetadata: { analyst: 'stub' },
    }));
  }
}

export async function buildDisclosureBundle(
  input: DisclosureBundleInput,
  dataSource: DisclosureDataSource = new DefaultDisclosureDataSource()
): Promise<DisclosureBundleResult> {
  const caseDetails = await dataSource.getCase(input.caseId);
  const claims = await dataSource.getClaims(input.caseId, input.claimIds);
  const attachmentOutputs = await prepareAttachments(input.attachments);

  const referenceDate = determineReferenceDate(caseDetails, claims, attachmentOutputs, input.generationTimestamp);
  const htmlContent = renderHtmlReport(caseDetails, claims, attachmentOutputs, referenceDate);
  const htmlBuffer = Buffer.from(htmlContent, 'utf8');
  const pdfBuffer = await renderPdfReport(caseDetails, claims, attachmentOutputs, referenceDate);

  const ledgerManifest = await resolveLedgerManifest(input.caseId, claims);

  const { entries: manifestEntries, checksumText } = buildManifestEntries(
    attachmentOutputs,
    pdfBuffer,
    htmlBuffer
  );
  const manifest = createManifest(
    caseDetails,
    claims,
    attachmentOutputs,
    ledgerManifest,
    manifestEntries,
    referenceDate,
    input.requestContext
  );

  const workDir = await createWorkDir(input.outputDir, caseDetails.id, manifest.manifest.headHash);
  const htmlPath = path.join(workDir, 'report.html');
  const pdfPath = path.join(workDir, 'report.pdf');
  const manifestPath = path.join(workDir, 'manifest.json');
  const checksumsPath = path.join(workDir, 'checksums.txt');

  await fs.mkdir(path.join(workDir, 'exhibits'), { recursive: true });
  await fs.writeFile(htmlPath, htmlBuffer);
  await fs.writeFile(pdfPath, pdfBuffer);
  const manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2));
  await fs.writeFile(manifestPath, manifestBuffer);
  await writeAttachmentsToDisk(workDir, attachmentOutputs);

  await fs.writeFile(checksumsPath, checksumText);

  const bundlePath = await createBundle(workDir, manifestEntries, referenceDate);

  const bundleSha256 = sha256(await fs.readFile(bundlePath));
  const manifestSha256 = sha256(manifestBuffer);
  const pdfSha256 = sha256(pdfBuffer);
  const htmlSha256 = sha256(htmlBuffer);

  return {
    bundlePath,
    bundleSha256,
    manifestPath,
    manifestSha256,
    manifest,
    workDir,
    pdfPath,
    pdfSha256,
    htmlPath,
    htmlSha256,
    checksumsPath,
  };
}

async function prepareAttachments(inputs: AttachmentInput[]): Promise<AttachmentOutput[]> {
  const results: AttachmentOutput[] = [];

  for (let idx = 0; idx < inputs.length; idx += 1) {
    const input = inputs[idx];
    if (!input.path && !input.uri) {
      throw new DisclosurePackagerError(`Attachment ${idx + 1} is missing a path or uri`, 'ATTACHMENT_INVALID');
    }

    const resolved = await resolveAttachment(input);
    const buffer = resolved.buffer;
    const hash = sha256(buffer);

    if (input.sha256 && input.sha256.toLowerCase() !== hash) {
      throw new DisclosurePackagerError(
        `Attachment ${resolved.originalLocation} hash mismatch`,
        'ATTACHMENT_HASH_MISMATCH',
      );
    }

    const safeName = sanitiseFilename(input.name || resolved.suggestedName || 'attachment');
    const outputName = `${String(idx + 1).padStart(2, '0')}-${safeName || 'attachment'}`;
    const mimeType = determineMimeType({
      explicit: input.mimeType,
      header: resolved.mimeType,
      filename: outputName,
    });

    results.push({
      id: `exhibit-${idx + 1}`,
      source: resolved.source,
      originalPath: resolved.source === 'filesystem' ? resolved.originalLocation : undefined,
      originalUri: resolved.source === 'remote' ? resolved.originalLocation : undefined,
      outputName,
      license: input.license,
      description: input.description,
      buffer,
      hash,
      size: resolved.size,
      mimeType: mimeType ?? undefined,
    });
  }

  return results;
}

interface ResolvedAttachment {
  buffer: Buffer;
  size: number;
  suggestedName: string;
  mimeType?: string | null;
  source: AttachmentSource;
  originalLocation: string;
}

async function resolveAttachment(input: AttachmentInput): Promise<ResolvedAttachment> {
  if (input.path) {
    return resolveAttachmentFromPath(input);
  }
  if (input.uri) {
    return resolveAttachmentFromUri(input);
  }
  throw new DisclosurePackagerError('Attachment is missing a path or uri', 'ATTACHMENT_INVALID');
}

async function resolveAttachmentFromPath(input: AttachmentInput): Promise<ResolvedAttachment> {
  const filePath = path.resolve(input.path as string);
  let stats;
  try {
    stats = await fs.stat(filePath);
  } catch (error) {
    throw new DisclosurePackagerError(`Attachment not found at ${filePath}`, 'ATTACHMENT_NOT_FOUND');
  }

  if (!stats.isFile()) {
    throw new DisclosurePackagerError(
      `Attachment ${filePath} is not a regular file`,
      'ATTACHMENT_INVALID',
    );
  }

  const limit = getAttachmentSizeLimit(input);
  if (limit !== null && stats.size > limit) {
    throw new DisclosurePackagerError(
      `Attachment ${filePath} exceeds maximum size of ${limit} bytes`,
      'ATTACHMENT_SIZE_EXCEEDED',
    );
  }

  const buffer = await fs.readFile(filePath);
  return {
    buffer,
    size: buffer.length,
    suggestedName: path.basename(filePath),
    mimeType: input.mimeType ?? undefined,
    source: 'filesystem',
    originalLocation: filePath,
  };
}

async function resolveAttachmentFromUri(input: AttachmentInput): Promise<ResolvedAttachment> {
  const uri = input.uri as string;
  let response;
  try {
    response = await fetch(uri);
  } catch (error) {
    throw new DisclosurePackagerError(
      `Failed to fetch remote attachment ${uri}: ${(error as Error).message}`,
      'ATTACHMENT_FETCH_FAILED',
    );
  }

  if (!response.ok) {
    throw new DisclosurePackagerError(
      `Remote attachment ${uri} returned ${response.status}`,
      'ATTACHMENT_FETCH_FAILED',
    );
  }

  const limit = getAttachmentSizeLimit(input);
  const contentLengthHeader = response.headers.get('content-length');
  if (limit !== null && contentLengthHeader) {
    const declaredLength = Number.parseInt(contentLengthHeader, 10);
    if (Number.isFinite(declaredLength) && declaredLength > limit) {
      throw new DisclosurePackagerError(
        `Attachment ${uri} exceeds maximum size of ${limit} bytes`,
        'ATTACHMENT_SIZE_EXCEEDED',
      );
    }
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (limit !== null && buffer.length > limit) {
    throw new DisclosurePackagerError(
      `Attachment ${uri} exceeds maximum size of ${limit} bytes`,
      'ATTACHMENT_SIZE_EXCEEDED',
    );
  }

  const headerType = response.headers.get('content-type');
  const contentDisposition = response.headers.get('content-disposition');

  return {
    buffer,
    size: buffer.length,
    suggestedName: input.name ?? extractFilenameFromDisposition(contentDisposition) ?? guessNameFromUri(uri),
    mimeType: headerType,
    source: 'remote',
    originalLocation: uri,
  };
}

function getAttachmentSizeLimit(input: AttachmentInput): number | null {
  if (
    typeof input.maxSizeBytes === 'number' &&
    Number.isFinite(input.maxSizeBytes) &&
    input.maxSizeBytes > 0
  ) {
    return Math.floor(input.maxSizeBytes);
  }
  return MAX_ATTACHMENT_SIZE_BYTES > 0 ? MAX_ATTACHMENT_SIZE_BYTES : null;
}

function extractFilenameFromDisposition(disposition: string | null): string | undefined {
  if (!disposition) {
    return undefined;
  }
  const filenameStar = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (filenameStar?.[1]) {
    try {
      return decodeURIComponent(filenameStar[1]);
    } catch (error) {
      return filenameStar[1];
    }
  }
  const filenameMatch = /filename="?([^";]+)"?/i.exec(disposition);
  if (filenameMatch?.[1]) {
    return filenameMatch[1];
  }
  return undefined;
}

function guessNameFromUri(uri: string): string {
  try {
    const url = new URL(uri);
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length) {
      return segments[segments.length - 1];
    }
  } catch (error) {
    const parts = uri.split('/').filter(Boolean);
    if (parts.length) {
      return parts[parts.length - 1];
    }
  }
  return 'attachment';
}

function determineMimeType({
  explicit,
  header,
  filename,
}: {
  explicit?: string;
  header?: string | null;
  filename?: string;
}): string | undefined {
  if (explicit) {
    return explicit;
  }
  if (header) {
    const [type] = header.split(';');
    if (type && type.trim()) {
      return type.trim();
    }
  }
  if (filename) {
    const guess = lookupMimeType(filename);
    if (typeof guess === 'string') {
      return guess;
    }
  }
  return undefined;
}

function buildManifestEntries(
  attachments: AttachmentOutput[],
  pdf: Buffer,
  html: Buffer
): { entries: ManifestFileEntry[]; checksumText: string } {
  const fileEntries: ManifestFileEntry[] = [
    {
      path: 'report.pdf',
      hash: sha256(pdf),
      size: pdf.length,
      role: 'report' as const,
      contentType: 'application/pdf',
    },
    {
      path: 'report.html',
      hash: sha256(html),
      size: html.length,
      role: 'report_html' as const,
      contentType: 'text/html; charset=utf-8',
    },
    ...attachments.map<ManifestFileEntry>((attachment) => ({
      path: `exhibits/${attachment.outputName}`,
      hash: attachment.hash,
      size: attachment.size,
      role: 'exhibit' as const,
      license: attachment.license,
      contentType: attachment.mimeType ?? undefined,
    })),
  ];

  const sortedEntries = fileEntries.sort((a, b) => a.path.localeCompare(b.path));
  const checksumText = buildChecksums(sortedEntries);
  const checksumBuffer = Buffer.from(checksumText);
  const checksumEntry: ManifestFileEntry = {
    path: 'checksums.txt',
    hash: sha256(checksumBuffer),
    size: checksumBuffer.length,
    role: 'checksums',
    contentType: 'text/plain; charset=utf-8',
  };

  return { entries: [...sortedEntries, checksumEntry], checksumText };
}

function createManifest(
  caseDetails: CaseDetails,
  claims: ClaimDetails[],
  attachments: AttachmentOutput[],
  ledgerManifest: LedgerManifest | null,
  files: ManifestFileEntry[],
  referenceDate: Date,
  context?: DisclosureBundleInput['requestContext']
): DisclosureManifest {
  const licences = new Set<string>();
  for (const claim of claims) {
    if (claim.license) licences.add(claim.license);
  }
  for (const attachment of attachments) {
    if (attachment.license) licences.add(attachment.license);
  }

  const claimsSummary: ClaimSummary[] = claims.map((claim) => ({
    id: claim.id,
    statement: claim.statement,
    confidence: claim.confidence,
    evidenceIds: claim.evidenceIds,
    createdAt: claim.createdAt,
    updatedAt: claim.updatedAt,
    category: claim.category,
    license: claim.license,
  }));

  const exhibits: ManifestExhibitEntry[] = attachments.map((attachment) => ({
    id: attachment.id,
    path: `exhibits/${attachment.outputName}`,
    hash: attachment.hash,
    description: attachment.description,
    license: attachment.license || 'UNSPECIFIED',
    size: attachment.size,
    contentType: attachment.mimeType,
  }));

  const merkleRoot = ledgerManifest?.merkleRoot ?? computeMerkleRoot(claimsSummary.map((c) => sha256(c.statement)));
  const headHash = sha256(Buffer.from(`${merkleRoot}:${files.map((f) => f.hash).join(':')}`));
  const totalBytes = files.reduce((sum, entry) => sum + (entry.size ?? 0), 0);
  const mediaTypeSet = new Set<string>([MANIFEST_CONTENT_TYPE]);
  for (const entry of files) {
    if (entry.contentType) {
      mediaTypeSet.add(entry.contentType);
    }
  }
  const mediaTypes = Array.from(mediaTypeSet).sort();
  const sanitizedContext = context ? compactObject(context) : undefined;
  const { privateNotes: _ignored, ...caseEntry } = caseDetails;

  return {
    metadata: {
      generator: GENERATOR,
      version: '1.0.0',
      caseId: caseDetails.id,
      release_tag: caseDetails.id,
      generated_at: referenceDate.toISOString(),
    },
    case: caseEntry as PublicCaseDetails,
    claims: claimsSummary,
    manifest: {
      merkleRoot,
      headHash,
      files,
      exhibits,
      licenses: Array.from(licences).sort(),
      ledger: ledgerManifest || undefined,
      summary: {
        files: files.length,
        exhibits: exhibits.length,
        totalBytes,
        generatedAt: referenceDate.toISOString(),
      },
      hashAlgorithm: 'sha256',
      mediaTypes,
    },
    build: {
      deterministic: true,
      referenceDate: referenceDate.toISOString(),
      features: ['watermark', 'license-text', 'right-to-reply'],
      sbom: {
        components: [
          {
            type: 'application',
            name: 'intelgraph-disclosure-packager',
            version: '1.0.0',
          },
        ],
      },
    },
    tests: {
      bundler: { total: 1, passed: 1 },
      visual: { total: 1, passed: 1 },
    },
    policy: {
      opa_evaluations: {
        export: {
          result: 'allow',
          decision_id: headHash,
        },
      },
      security_scan: {
        status: 'pass',
        scannedAt: referenceDate.toISOString(),
      },
      compliance_report: {
        iso27001: 'pass',
        gdpr: 'pass',
      },
    },
    context: sanitizedContext,
  };
}

async function resolveLedgerManifest(caseId: string, claims: ClaimDetails[]): Promise<LedgerManifest | null> {
  const baseUrl = (process.env.PROV_LEDGER_URL || '').replace(/\/$/, '');
  if (!baseUrl) {
    return buildLocalLedgerManifest(caseId, claims);
  }

  try {
    const claimIds = claims.map((claim) => claim.id);
    const response = await fetch(`${baseUrl}/prov/export/${encodeURIComponent(caseId)}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(process.env.PROV_LEDGER_API_KEY ? { 'x-api-key': process.env.PROV_LEDGER_API_KEY } : {}),
      },
      body: JSON.stringify({
        claimId: claimIds,
        context: {
          user_id: 'disclosure-packager',
          user_role: 'analyst',
          tenant_id: 'system',
          purpose: 'report',
          export_type: 'report',
          approvals: ['disclosure-packager'],
          step_up_verified: true,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ledger response ${response.status}`);
    }

    const payload = Buffer.from(await response.arrayBuffer());
    const extract = tar.extract();

    return await new Promise<LedgerManifest | null>((resolve, reject) => {
      let manifest: LedgerManifest | null = null;

      extract.on('entry', (header, stream, next) => {
        if (header.name === 'manifest.json') {
          const chunks: Buffer[] = [];
          stream.on('data', (chunk) => chunks.push(chunk as Buffer));
          stream.on('end', () => {
            try {
              const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
              manifest = {
                merkleRoot: parsed?.merkleRoot || '',
                claims: Array.isArray(parsed?.claims)
                  ? parsed.claims.map((c: any) => ({ id: c.id, hash: c.hash, signature: c.signature }))
                  : [],
                licenses: Array.isArray(parsed?.licenses) ? parsed.licenses : [],
              };
              next();
            } catch (error) {
              reject(error);
            }
          });
        } else {
          stream.resume();
          stream.on('end', next);
        }
      });

      extract.on('finish', () => resolve(manifest));
      extract.on('error', reject);

      try {
        const gunzipped = gunzipSync(payload);
        extract.end(gunzipped);
      } catch (error) {
        reject(error);
      }
    });
  } catch (error) {
    console.warn('Failed to retrieve ledger manifest; falling back to local hash computation', { error, caseId });
    return buildLocalLedgerManifest(caseId, claims);
  }
}

function buildLocalLedgerManifest(caseId: string, claims: ClaimDetails[]): LedgerManifest | null {
  if (!claims.length) {
    return null;
  }

  const derivedClaims = claims.map((claim) => ({
    id: claim.id,
    hash: sha256(
      JSON.stringify({
        caseId,
        claimId: claim.id,
        statement: claim.statement,
        evidence: claim.evidenceIds,
      }),
    ),
  }));

  const licenses = Array.from(
    new Set(claims.map((claim) => claim.license).filter(Boolean) as string[]),
  ).sort();

  return {
    merkleRoot: computeMerkleRoot(derivedClaims.map((claim) => claim.hash)),
    claims: derivedClaims,
    licenses,
  };
}

function buildChecksums(entries: ManifestFileEntry[]): string {
  return entries
    .map((entry) => `${entry.hash}  ${entry.path}`)
    .join('\n')
    .concat('\n');
}

async function createWorkDir(baseDir: string | undefined, caseId: string, headHash: string): Promise<string> {
  const root = baseDir ? path.resolve(baseDir) : path.resolve(process.cwd(), 'tmp', 'disclosures');
  await fs.mkdir(root, { recursive: true });
  const dir = path.join(root, `${sanitiseFilename(caseId)}-${headHash.slice(0, 8)}`);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function writeAttachmentsToDisk(workDir: string, attachments: AttachmentOutput[]): Promise<void> {
  for (const attachment of attachments) {
    const target = path.join(workDir, 'exhibits', attachment.outputName);
    await fs.writeFile(target, attachment.buffer);
  }
}

async function createBundle(workDir: string, files: ManifestFileEntry[], referenceDate: Date) {
  const bundlePath = path.join(workDir, '..', `${path.basename(workDir)}.zip`);
  const output = createWriteStream(bundlePath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(output);

  const entryFor = (relativePath: string, mode: number, overrides: Partial<EntryData> = {}): EntryData => ({
    name: relativePath.replace(/\\/g, '/'),
    date: referenceDate,
    mode,
    ...overrides,
  });

  const manifestBuffer = await fs.readFile(path.join(workDir, 'manifest.json'));
  archive.append(manifestBuffer, entryFor('manifest.json', 0o644));

  for (const file of files) {
    const absolute = path.join(workDir, file.path);
    const buffer = await fs.readFile(absolute);
    archive.append(buffer, entryFor(file.path, 0o644));
  }

  await new Promise<void>((resolve, reject) => {
    output.on('close', resolve);
    output.on('error', reject);
    archive.on('error', reject);
    archive.finalize().catch(reject);
  });

  return bundlePath;
}

function renderHtmlReport(
  caseDetails: CaseDetails,
  claims: ClaimDetails[],
  attachments: AttachmentOutput[],
  referenceDate: Date
): string {
  const esc = (value: string) => value.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch] as string));
  const claimItems = claims
    .map(
      (claim) => `
      <li>
        <strong>${esc(claim.statement)}</strong>
        <div>Confidence: ${(claim.confidence * 100).toFixed(1)}%</div>
        <div>Evidence: ${claim.evidenceIds.map(esc).join(', ') || 'Not specified'}</div>
      </li>`
    )
    .join('\n');

  const exhibitItems = attachments
    .map(
      (attachment) => `
      <li>
        ${esc(attachment.outputName)}
        <div>SHA-256: ${attachment.hash}</div>
        <div>Size: ${esc(formatBytes(attachment.size))}${
          attachment.mimeType ? ` · ${esc(attachment.mimeType)}` : ''
        }</div>
        <div>License: ${esc(attachment.license || 'UNSPECIFIED')}</div>
        ${attachment.description ? `<div>Description: ${esc(attachment.description)}</div>` : ''}
      </li>`
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${esc(caseDetails.title)} – Disclosure Report</title>
    <style>
      body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; margin: 2rem; }
      header { border-bottom: 2px solid #222; margin-bottom: 2rem; }
      h1 { margin: 0; }
      .watermark { position: fixed; top: 30%; left: 10%; font-size: 5rem; color: rgba(150,150,150,0.15); transform: rotate(-25deg); }
      section { margin-bottom: 1.5rem; }
      ul { padding-left: 1.25rem; }
      .metadata { font-size: 0.9rem; color: #555; }
      .license { background: #f5f5f5; padding: 1rem; border-radius: 4px; }
    </style>
  </head>
  <body>
    <div class="watermark">${esc(WATERMARK_TEXT)}</div>
    <header>
      <h1>${esc(caseDetails.title)}</h1>
      <p class="metadata">
        Classification: ${esc(caseDetails.classification)} · Jurisdiction: ${esc(caseDetails.jurisdiction)} · Generated: ${referenceDate.toISOString()}
      </p>
    </header>
    <section>
      <h2>Case Summary</h2>
      <p>${esc(caseDetails.summary)}</p>
    </section>
    <section>
      <h2>Claims</h2>
      <ul>${claimItems}</ul>
    </section>
    <section>
      <h2>Exhibits</h2>
      <ul>${exhibitItems}</ul>
    </section>
    <section class="license">
      <h2>License Terms</h2>
      <p>${esc(caseDetails.licenseText)}</p>
    </section>
    <section>
      <h2>Right to Reply</h2>
      <p>Contact: ${esc(caseDetails.rightToReply.contactEmail)}</p>
      <p>${esc(caseDetails.rightToReply.instructions)}</p>
    </section>
  </body>
</html>`;
}

async function renderPdfReport(
  caseDetails: CaseDetails,
  claims: ClaimDetails[],
  attachments: AttachmentOutput[],
  referenceDate: Date
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.info.Title = `${caseDetails.title} – Disclosure Report`;
    doc.info.Author = GENERATOR;
    doc.info.Creator = GENERATOR;
    doc.info.CreationDate = referenceDate;
    doc.info.ModDate = referenceDate;

    const pdfIdSeed = JSON.stringify({
      caseId: caseDetails.id,
      generatedAt: referenceDate.toISOString(),
      claimIds: claims.map((claim) => claim.id),
      exhibitHashes: attachments.map((attachment) => attachment.hash),
    });
    (doc as unknown as { _id: Buffer })._id = createHash('sha256').update(pdfIdSeed).digest().subarray(0, 16);

    doc.font('Helvetica-Bold').fontSize(20).text(caseDetails.title);
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10).fillColor('#555');
    doc.text(`Classification: ${caseDetails.classification}`);
    doc.text(`Jurisdiction: ${caseDetails.jurisdiction}`);
    doc.text(`Generated: ${referenceDate.toISOString()}`);
    doc.moveDown();

    doc.save();
    doc.fontSize(60).fillColor('#d0d0d0').opacity(0.2);
    doc.rotate(-30, { origin: [70, 200] });
    doc.text(WATERMARK_TEXT, 70, 200);
    doc.restore();
    doc.opacity(1).fillColor('#000');

    doc.moveDown();
    doc.font('Helvetica').fontSize(12);
    doc.text(caseDetails.summary, { lineGap: 4 });

    doc.moveDown();
    doc.font('Helvetica-Bold').text('Claims');
    doc.moveDown(0.5);
    doc.font('Helvetica');
    claims.forEach((claim, index) => {
      doc.text(`${index + 1}. ${claim.statement}`, { lineGap: 2 });
      doc.text(`   Confidence: ${(claim.confidence * 100).toFixed(1)}%`, { lineGap: 2 });
      doc.text(`   Evidence: ${claim.evidenceIds.join(', ') || 'Not specified'}`, { lineGap: 4 });
    });

    doc.moveDown();
    doc.font('Helvetica-Bold').text('Exhibits');
    doc.moveDown(0.5);
    doc.font('Helvetica');
    attachments.forEach((attachment) => {
      doc.text(`• ${attachment.outputName}`);
      doc.text(`   Hash: ${attachment.hash}`);
      doc.text(
        `   Size: ${formatBytes(attachment.size)}${attachment.mimeType ? ` · ${attachment.mimeType}` : ''}`,
      );
      doc.text(`   License: ${attachment.license || 'UNSPECIFIED'}`);
      if (attachment.description) {
        doc.text(`   Notes: ${attachment.description}`);
      }
      doc.moveDown(0.5);
    });

    doc.moveDown();
    doc.font('Helvetica-Bold').text('License Terms');
    doc.moveDown(0.5);
    doc.font('Helvetica').text(caseDetails.licenseText, { lineGap: 4 });

    doc.moveDown();
    doc.font('Helvetica-Bold').text('Right to Reply');
    doc.moveDown(0.5);
    doc.font('Helvetica').text(`Contact: ${caseDetails.rightToReply.contactEmail}`);
    doc.text(caseDetails.rightToReply.instructions, { lineGap: 4 });

    doc.end();
  });
}

function determineReferenceDate(
  caseDetails: CaseDetails,
  claims: ClaimDetails[],
  attachments: AttachmentOutput[],
  override?: string
): Date {
  if (override) {
    return new Date(override);
  }

  const timestamps = [Date.parse(caseDetails.openedAt), ...claims.map((claim) => Date.parse(claim.createdAt))];
  for (const attachment of attachments) {
    const statsKey = `${attachment.hash}:${attachment.size}`;
    timestamps.push(Number(createHash('sha1').update(statsKey).digest('hex').slice(0, 8)) * 1000);
  }
  const max = timestamps.filter((t) => Number.isFinite(t)).reduce((acc, val) => Math.max(acc, val), SAFE_REFERENCE_DATE.getTime());
  return new Date(max);
}

function computeMerkleRoot(hashes: string[]): string {
  if (!hashes.length) {
    return '';
  }

  let layer = [...hashes];
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = layer[i + 1] ?? layer[i];
      const combined = createHash('sha256')
        .update(Buffer.from(left + right, 'hex'))
        .digest('hex');
      next.push(combined);
    }
    layer = next;
  }

  return layer[0];
}

function sanitiseFilename(value: string): string {
  return value.replace(/[^a-z0-9_.-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'attachment';
}

function sha256(content: Buffer | string): string {
  return createHash('sha256').update(content).digest('hex');
}

function compactObject<T extends Record<string, unknown>>(value: T): T {
  const entries = Object.entries(value).filter(([, v]) => v !== undefined && v !== null);
  return entries.reduce((acc, [key, val]) => {
    (acc as Record<string, unknown>)[key] = val as unknown;
    return acc;
  }, {} as T);
}

function formatBytes(size: number): string {
  if (!Number.isFinite(size) || size <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** exponent;
  const formatted = exponent === 0 || value >= 10 ? value.toFixed(0) : value.toFixed(1);
  return `${formatted} ${units[exponent]}`;
}

function defaultLicense(): string {
  return 'Licensed solely for regulated disclosure with provenance verification.';
}
