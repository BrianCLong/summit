"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttachmentService = void 0;
exports.detectPII = detectPII;
exports.redactPII = redactPII;
const fs_1 = require("fs");
const promises_1 = require("stream/promises");
const crypto_1 = require("crypto");
const path = __importStar(require("path"));
/**
 * @class AttachmentService
 * @description Handles the saving and storage of file attachments.
 * Files are stored based on the SHA256 hash of their content to ensure deduplication.
 *
 * @example
 * ```typescript
 * import { AttachmentService } from './AttachmentService.js';
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
class AttachmentService {
    baseDir;
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
    async save(stream, { filename, mimeType, uploader, licenseId, policyTags = [], }) {
        await fs_1.promises.mkdir(this.baseDir, { recursive: true });
        const tempPath = path.join(this.baseDir, `${Date.now()}-${filename}`);
        const hash = (0, crypto_1.createHash)('sha256');
        const writeStream = (0, fs_1.createWriteStream)(tempPath);
        await promises_1.pipeline(stream, async function* (source) {
            for await (const chunk of source) {
                hash.update(chunk);
                yield chunk;
            }
        }, writeStream);
        const sha256 = hash.digest('hex');
        const finalPath = path.join(this.baseDir, sha256);
        await fs_1.promises.rename(tempPath, finalPath);
        const stats = await fs_1.promises.stat(finalPath);
        const provenance = {
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
exports.AttachmentService = AttachmentService;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /\b(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
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
function detectPII(text) {
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
function redactPII(text) {
    return text
        .replace(EMAIL_RE, '[REDACTED]')
        .replace(PHONE_RE, '[REDACTED]')
        .replace(SSN_RE, '[REDACTED]');
}
