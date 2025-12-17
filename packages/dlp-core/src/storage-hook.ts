/**
 * DLP Storage Hook
 *
 * Hooks for integrating DLP scanning with storage operations.
 *
 * @package dlp-core
 */

import { DLPService } from './DLPService';
import type { DLPServiceConfig, ContentScanResult } from './types';

export interface StorageHookOptions {
  scanOnUpload?: boolean;
  scanOnDownload?: boolean;
  blockUntilScanned?: boolean;
  quarantineBucket?: string;
  allowedClassifications?: string[];
}

export interface UploadContext {
  bucket: string;
  key: string;
  contentType: string;
  size: number;
  metadata?: Record<string, string>;
  actor?: {
    id: string;
    tenantId: string;
    roles: string[];
  };
}

export interface DownloadContext {
  bucket: string;
  key: string;
  actor?: {
    id: string;
    tenantId: string;
    roles: string[];
  };
  destination?: {
    type: 'INTERNAL' | 'EXTERNAL';
    target?: string;
  };
}

export interface StorageHookResult {
  allowed: boolean;
  action: 'ALLOW' | 'BLOCK' | 'QUARANTINE' | 'REDACT';
  scanResult?: ContentScanResult;
  quarantineKey?: string;
  metadata?: Record<string, string>;
}

export class DLPStorageHook {
  private dlpService: DLPService;
  private options: Required<StorageHookOptions>;

  constructor(serviceConfig: DLPServiceConfig, options: StorageHookOptions = {}) {
    this.dlpService = new DLPService(serviceConfig);
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
  async beforeUpload(
    content: Buffer | string,
    context: UploadContext
  ): Promise<StorageHookResult> {
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
    const classificationAllowed = this.options.allowedClassifications.includes(
      scanResult.detection.classification
    );

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
  async beforeDownload(
    content: Buffer | string,
    context: DownloadContext
  ): Promise<StorageHookResult> {
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
  async applyRedaction(content: string, scanResult: ContentScanResult): Promise<string> {
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

export default DLPStorageHook;
