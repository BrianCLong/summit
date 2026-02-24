import { createWriteStream, promises as fs } from 'fs';
import { pipeline } from 'stream/promises';
import { createHash } from 'crypto';
import * as path from 'path';
import type { Readable } from 'stream';

/**
 * @interface ProvenanceRecord
 * @description Represents a record of an attachment's origin and history.
 * @property {string} sha256 - The SHA256 hash of the attachment content, serving as a unique identifier.
 * @property {Date} timestamp - The timestamp of when the record was created.
 * @property {unknown} [key] - Allows for additional arbitrary provenance data.
 */
export interface ProvenanceRecord {
  sha256: string;
  timestamp: Date;
  [key: string]: unknown;
}

/**
 * @interface AttachmentMetadata
 * @description Contains metadata about a saved attachment.
 * @property {string} filename - The original name of the file.
 * @property {string} mimeType - The MIME type of the file (e.g., 'image/png').
 * @property {number} size - The size of the file in bytes.
 * @property {string} sha256 - The SHA256 hash of the file content.
 * @property {string} [uploader] - The ID of the user who uploaded the file.
 * @property {string} [licenseId] - The ID of any license associated with the attachment.
 * @property {string[]} policyTags - Tags for applying data handling policies.
 * @property {ProvenanceRecord} provenance - The provenance record for this attachment.
 */
export interface AttachmentMetadata {
  filename: string;
  mimeType: string;
  size: number;
  sha256: string;
  uploader?: string;
  licenseId?: string;
  policyTags: string[];
  provenance: ProvenanceRecord;
}

/**
 * @class AttachmentService
 * @description Handles the saving and storage of file attachments.
 * Files are stored based on the SHA256 hash of their content to ensure deduplication.
 *
 * @example
 * ```typescript
 * import { AttachmentService } from './AttachmentService';
 * import { createReadStream } from 'fs';
 *
 * const attachmentService = new AttachmentService();
 * const fileStream = createReadStream('path/to/my-file.txt');
 *
 * const metadata = await attachmentService.save(fileStream, {
 *   filename: 'my-file.txt',
 *   mimeType: 'text/plain',
 *   uploader: 'user-123',
 * });
 *
 * console.log(`File saved with hash: ${metadata.sha256}`);
 * ```
 */
export class AttachmentService {
  private baseDir: string;

  /**
   * @constructor
   * @param {string} [baseDir=path.join(process.cwd(), 'attachments')] - The base directory for storing attachments.
   */
  constructor(baseDir = path.join(process.cwd(), 'attachments')) {
    this.baseDir = baseDir;
  }

  /**
   * @method save
   * @description Saves an attachment from a readable stream to the configured storage directory.
   * It calculates the SHA256 hash of the content while streaming and uses it as the final filename.
   * This provides content-addressable storage and automatic deduplication.
   * @param {Readable} stream - The readable stream of the file content.
   * @param {object} options - Options for saving the attachment.
   * @param {string} options.filename - The original filename.
   * @param {string} options.mimeType - The MIME type of the file.
   * @param {string} [options.uploader] - The ID of the user uploading the file.
   * @param {string} [options.licenseId] - An associated license ID.
   * @param {string[]} [options.policyTags=[]] - Policy tags for the attachment.
   * @returns {Promise<AttachmentMetadata>} Metadata of the saved attachment, including its SHA256 hash.
   */
  async save(
    stream: Readable,
    {
      filename,
      mimeType,
      uploader,
      licenseId,
      policyTags = [],
    }: {
      filename: string;
      mimeType: string;
      uploader?: string;
      licenseId?: string;
      policyTags?: string[];
    },
  ): Promise<AttachmentMetadata> {
    await fs.mkdir(this.baseDir, { recursive: true });
    const tempPath = path.join(this.baseDir, `${Date.now()}-${filename}`);
    const hash = createHash('sha256');
    const writeStream = createWriteStream(tempPath);
    await (pipeline as any)(
      stream,
      async function* (source: any) {
        for await (const chunk of source) {
          hash.update(chunk);
          yield chunk;
        }
      },
      writeStream,
    );
    const sha256 = hash.digest('hex');
    const finalPath = path.join(this.baseDir, sha256);
    await fs.rename(tempPath, finalPath);
    const stats = await fs.stat(finalPath);
    const provenance: ProvenanceRecord = {
      sha256,
      timestamp: new Date(),
      uploader,
      source: 'attachment-service',
    };
    return {
      filename: path.basename(filename),
      mimeType,
      size: stats.size,
      sha256,
      uploader,
      licenseId,
      policyTags,
      provenance,
    };
  }
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE =
  /\b(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g;

/**
 * @function detectPII
 * @description Scans a block of text for common types of Personally Identifiable Information (PII),
 * such as email addresses, phone numbers, and Social Security Numbers.
 * @param {string} text - The text to scan.
 * @returns {{ emails: string[], phones: string[], ssns: string[] }} An object containing arrays of any detected PII.
 *
 * @example
 * ```typescript
 * const text = 'Contact me at test@example.com or 555-123-4567. My SSN is 000-00-0000.';
 * const pii = detectPII(text);
 * console.log(pii.emails); // ['test@example.com']
 * console.log(pii.phones); // ['555-123-4567']
 * console.log(pii.ssns);   // ['000-00-0000']
 * ```
 */
export function detectPII(text: string) {
  return {
    emails: text.match(EMAIL_RE) || [],
    phones: text.match(PHONE_RE) || [],
    ssns: text.match(SSN_RE) || [],
  };
}

/**
 * @function redactPII
 * @description Redacts common PII from a block of text by replacing it with '[REDACTED]'.
 * @param {string} text - The text to redact.
 * @returns {string} The redacted text.
 *
 * @example
 * ```typescript
 * const text = 'My email is test@example.com.';
 * const redacted = redactPII(text);
 * console.log(redacted); // 'My email is [REDACTED].'
 * ```
 */
export function redactPII(text: string): string {
  return text
    .replace(EMAIL_RE, '[REDACTED]')
    .replace(PHONE_RE, '[REDACTED]')
    .replace(SSN_RE, '[REDACTED]');
}
