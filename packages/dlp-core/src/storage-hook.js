"use strict";
/**
 * DLP Storage Hook
 *
 * Hooks for integrating DLP scanning with storage operations.
 *
 * @package dlp-core
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DLPStorageHook = void 0;
const DLPService_1 = require("./DLPService");
class DLPStorageHook {
    dlpService;
    options;
    constructor(serviceConfig, options = {}) {
        this.dlpService = new DLPService_1.DLPService(serviceConfig);
        this.options = {
            scanOnUpload: true,
            scanOnDownload: true,
            blockUntilScanned: true,
            quarantineBucket: 'dlp-quarantine',
            allowedClassifications: ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL'],
            ...options,
        };
    }
    /**
     * Hook to run before file upload
     */
    async beforeUpload(content, context) {
        if (!this.options.scanOnUpload) {
            return { allowed: true, action: 'ALLOW' };
        }
        const scanResult = await this.dlpService.scan({
            content,
            contentType: context.contentType,
            context: {
                contentType: context.contentType,
                filename: context.key,
                purpose: 'FILE_UPLOAD',
                actor: context.actor,
            },
            metadata: {
                bucket: context.bucket,
                key: context.key,
                size: context.size,
                ...context.metadata,
            },
        });
        // Check if classification is allowed
        const classificationAllowed = this.options.allowedClassifications.includes(scanResult.detection.classification);
        if (!scanResult.allowed) {
            // Quarantine the file
            return {
                allowed: false,
                action: 'QUARANTINE',
                scanResult,
                quarantineKey: `${this.options.quarantineBucket}/${Date.now()}-${context.key}`,
                metadata: {
                    'x-dlp-scanned': 'true',
                    'x-dlp-classification': scanResult.detection.classification,
                    'x-dlp-action': 'QUARANTINE',
                    'x-dlp-audit-id': scanResult.auditEventId,
                    'x-dlp-violations': JSON.stringify(scanResult.violations.map((v) => v.type)),
                },
            };
        }
        if (!classificationAllowed) {
            return {
                allowed: false,
                action: 'BLOCK',
                scanResult,
                metadata: {
                    'x-dlp-scanned': 'true',
                    'x-dlp-classification': scanResult.detection.classification,
                    'x-dlp-action': 'BLOCK',
                    'x-dlp-reason': 'CLASSIFICATION_NOT_ALLOWED',
                },
            };
        }
        return {
            allowed: true,
            action: 'ALLOW',
            scanResult,
            metadata: {
                'x-dlp-scanned': 'true',
                'x-dlp-classification': scanResult.detection.classification,
                'x-dlp-categories': scanResult.detection.categories.join(','),
                'x-dlp-audit-id': scanResult.auditEventId,
            },
        };
    }
    /**
     * Hook to run before file download
     */
    async beforeDownload(content, context) {
        if (!this.options.scanOnDownload) {
            return { allowed: true, action: 'ALLOW' };
        }
        const isExternal = context.destination?.type === 'EXTERNAL';
        const scanResult = await this.dlpService.scan({
            content,
            contentType: 'application/octet-stream',
            context: {
                contentType: 'file',
                filename: context.key,
                purpose: isExternal ? 'EXTERNAL_TRANSFER' : 'DOWNLOAD',
                actor: context.actor,
            },
            metadata: {
                bucket: context.bucket,
                key: context.key,
                destination: context.destination?.target,
            },
        });
        if (!scanResult.allowed) {
            return {
                allowed: false,
                action: 'BLOCK',
                scanResult,
            };
        }
        // Check if redaction is needed
        if (scanResult.action === 'REDACT' && scanResult.detection.hasDetections) {
            return {
                allowed: true,
                action: 'REDACT',
                scanResult,
            };
        }
        return {
            allowed: true,
            action: 'ALLOW',
            scanResult,
        };
    }
    /**
     * Apply redaction to content before download
     */
    async applyRedaction(content, scanResult) {
        if (!scanResult.detection.hasDetections) {
            return content;
        }
        const redactionResult = await this.dlpService.redact({
            content,
            detections: scanResult.detection.detections,
        });
        return redactionResult.redactedContent;
    }
}
exports.DLPStorageHook = DLPStorageHook;
exports.default = DLPStorageHook;
