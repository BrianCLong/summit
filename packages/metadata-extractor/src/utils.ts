import { TemporalMetadata, GeolocationMetadata } from './types.js';

/**
 * Utility functions for metadata extraction and analysis
 */

/**
 * Normalize timezone information
 */
export function normalizeTimezone(tz?: string): string | undefined {
  if (!tz) return undefined;

  // Convert common timezone formats
  const normalized = tz
    .replace(/\s+/g, '')
    .replace(/UTC([+-]\d{1,2}):?(\d{2})?/, 'UTC$1$2');

  return normalized;
}

/**
 * Calculate clock skew between two timestamps
 */
export function calculateClockSkew(
  localTime: Date,
  referenceTime: Date
): number {
  return localTime.getTime() - referenceTime.getTime();
}

/**
 * Detect timezone from timestamp pattern
 */
export function detectTimezone(dates: Date[]): string | undefined {
  if (dates.length === 0) return undefined;

  // Simple heuristic: check offset of first date
  const offset = dates[0].getTimezoneOffset();
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  const sign = offset <= 0 ? '+' : '-';

  return `UTC${sign}${hours.toString().padStart(2, '0')}${minutes.toString().padStart(2, '0')}`;
}

/**
 * Calculate distance between two geolocations (Haversine formula)
 */
export function calculateDistance(
  geo1: GeolocationMetadata,
  geo2: GeolocationMetadata
): number | undefined {
  if (!geo1.latitude || !geo1.longitude || !geo2.latitude || !geo2.longitude) {
    return undefined;
  }

  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(geo2.latitude - geo1.latitude);
  const dLon = toRadians(geo2.longitude - geo1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(geo1.latitude)) *
      Math.cos(toRadians(geo2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Extract version from software string
 */
export function extractVersion(software: string): { name: string; version?: string } {
  const patterns = [
    /^(.+?)\s+(\d+(?:\.\d+)*)/,
    /^(.+?)\s+v(\d+(?:\.\d+)*)/i,
    /^(.+?)-(\d+(?:\.\d+)*)/,
    /^(.+?)\/(\d+(?:\.\d+)*)/,
  ];

  for (const pattern of patterns) {
    const match = software.match(pattern);
    if (match) {
      return {
        name: match[1].trim(),
        version: match[2],
      };
    }
  }

  return { name: software };
}

/**
 * Sanitize metadata for safe storage/transmission
 */
export function sanitizeMetadata(metadata: any): any {
  if (metadata === null || metadata === undefined) return metadata;

  if (Array.isArray(metadata)) {
    return metadata.map(sanitizeMetadata);
  }

  if (typeof metadata === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(metadata)) {
      // Remove potentially sensitive keys
      if (key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('token')) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeMetadata(value);
      }
    }
    return sanitized;
  }

  return metadata;
}

/**
 * Merge multiple temporal metadata objects
 */
export function mergeTemporal(temporals: TemporalMetadata[]): TemporalMetadata {
  const merged: TemporalMetadata = {};

  // Find earliest creation time
  const creationDates = temporals
    .map(t => t.created)
    .filter((d): d is Date => d !== undefined);
  if (creationDates.length > 0) {
    merged.created = new Date(Math.min(...creationDates.map(d => d.getTime())));
  }

  // Find latest modification time
  const modifiedDates = temporals
    .map(t => t.modified)
    .filter((d): d is Date => d !== undefined);
  if (modifiedDates.length > 0) {
    merged.modified = new Date(Math.max(...modifiedDates.map(d => d.getTime())));
  }

  // Find latest access time
  const accessDates = temporals
    .map(t => t.accessed)
    .filter((d): d is Date => d !== undefined);
  if (accessDates.length > 0) {
    merged.accessed = new Date(Math.max(...accessDates.map(d => d.getTime())));
  }

  return merged;
}

/**
 * Detect file type from buffer magic bytes
 */
export function detectFileType(buffer: Buffer): string | undefined {
  const magicBytes: Record<string, string> = {
    '504B0304': 'application/zip', // ZIP/Office
    '25504446': 'application/pdf', // PDF
    'FFD8FF': 'image/jpeg', // JPEG
    '89504E47': 'image/png', // PNG
    '47494638': 'image/gif', // GIF
    '52494646': 'audio/wav', // WAV/AVI
    '1F8B': 'application/gzip', // GZIP
    '425A68': 'application/x-bzip2', // BZIP2
    '7F454C46': 'application/x-elf', // ELF
    '4D5A': 'application/x-msdownload', // EXE
  };

  const header = buffer.slice(0, 8).toString('hex').toUpperCase();

  for (const [magic, mimeType] of Object.entries(magicBytes)) {
    if (header.startsWith(magic)) {
      return mimeType;
    }
  }

  return undefined;
}
