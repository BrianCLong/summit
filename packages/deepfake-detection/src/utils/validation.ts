/**
 * Validation utilities for deepfake detection
 */

import {
  CONFIDENCE_THRESHOLDS,
  FILE_SIZE_LIMITS,
  SUPPORTED_MIME_TYPES,
} from '../constants/index.js';
import type { MediaType } from '../types/index.js';

export class ValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public field?: string,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate confidence score is within valid range
 */
export function validateConfidenceScore(score: number): void {
  if (typeof score !== 'number' || isNaN(score)) {
    throw new ValidationError(
      'Confidence score must be a valid number',
      'INVALID_CONFIDENCE_SCORE',
      'confidenceScore',
    );
  }

  if (score < 0 || score > 1) {
    throw new ValidationError(
      'Confidence score must be between 0.0 and 1.0',
      'CONFIDENCE_OUT_OF_RANGE',
      'confidenceScore',
    );
  }
}

/**
 * Validate media type
 */
export function validateMediaType(type: string): type is MediaType {
  const validTypes = ['VIDEO', 'AUDIO', 'IMAGE'];
  if (!validTypes.includes(type)) {
    throw new ValidationError(
      `Invalid media type: ${type}. Must be one of: ${validTypes.join(', ')}`,
      'INVALID_MEDIA_TYPE',
      'mediaType',
    );
  }
  return true;
}

/**
 * Validate MIME type for given media type
 */
export function validateMimeType(mimeType: string, mediaType: MediaType): void {
  const supportedTypes = SUPPORTED_MIME_TYPES[mediaType];

  if (!supportedTypes.includes(mimeType)) {
    throw new ValidationError(
      `Unsupported MIME type: ${mimeType} for media type: ${mediaType}`,
      'UNSUPPORTED_MIME_TYPE',
      'mimeType',
    );
  }
}

/**
 * Validate file size for given media type
 */
export function validateFileSize(sizeBytes: number, mediaType: MediaType): void {
  const maxSize = FILE_SIZE_LIMITS[mediaType];

  if (sizeBytes > maxSize) {
    throw new ValidationError(
      `File size (${formatBytes(sizeBytes)}) exceeds maximum allowed size (${formatBytes(maxSize)}) for media type: ${mediaType}`,
      'FILE_TOO_LARGE',
      'sizeBytes',
    );
  }

  if (sizeBytes <= 0) {
    throw new ValidationError(
      'File size must be greater than 0',
      'INVALID_FILE_SIZE',
      'sizeBytes',
    );
  }
}

/**
 * Validate UUID format
 */
export function validateUuid(uuid: string, fieldName: string = 'id'): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(uuid)) {
    throw new ValidationError(
      `Invalid UUID format: ${uuid}`,
      'INVALID_UUID',
      fieldName,
    );
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    throw new ValidationError(
      `Invalid email format: ${email}`,
      'INVALID_EMAIL',
      'email',
    );
  }
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): void {
  try {
    new URL(url);
  } catch {
    throw new ValidationError(
      `Invalid URL format: ${url}`,
      'INVALID_URL',
      'url',
    );
  }
}

/**
 * Validate priority value (1-10)
 */
export function validatePriority(priority: number): void {
  if (!Number.isInteger(priority) || priority < 1 || priority > 10) {
    throw new ValidationError(
      'Priority must be an integer between 1 and 10',
      'INVALID_PRIORITY',
      'priority',
    );
  }
}

/**
 * Validate pagination parameters
 */
export function validatePagination(limit?: number, offset?: number): void {
  if (limit !== undefined) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
      throw new ValidationError(
        'Limit must be an integer between 1 and 1000',
        'INVALID_LIMIT',
        'limit',
      );
    }
  }

  if (offset !== undefined) {
    if (!Number.isInteger(offset) || offset < 0) {
      throw new ValidationError(
        'Offset must be a non-negative integer',
        'INVALID_OFFSET',
        'offset',
      );
    }
  }
}

/**
 * Helper: Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Sanitize filename (remove dangerous characters)
 */
export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '');

  // Remove dangerous characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop() || '';
    const nameWithoutExt = sanitized.substring(0, 255 - ext.length - 1);
    sanitized = `${nameWithoutExt}.${ext}`;
  }

  return sanitized;
}

/**
 * Validate SHA-256 checksum format
 */
export function validateSha256(checksum: string): void {
  const sha256Regex = /^[a-f0-9]{64}$/i;

  if (!sha256Regex.test(checksum)) {
    throw new ValidationError(
      'Invalid SHA-256 checksum format',
      'INVALID_CHECKSUM',
      'checksum',
    );
  }
}
