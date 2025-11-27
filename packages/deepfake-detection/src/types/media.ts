/**
 * Media type definitions for deepfake detection
 */

export enum MediaType {
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  IMAGE = 'IMAGE',
}

export enum MediaStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  ANALYZED = 'ANALYZED',
  FAILED = 'FAILED',
  ARCHIVED = 'ARCHIVED',
}

export interface Media {
  id: string;
  type: MediaType;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date;
  uploadedBy: string;
  status: MediaStatus;

  // Optional metadata
  investigationId?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;

  // Media-specific properties
  duration?: number; // seconds, for video/audio
  width?: number; // pixels, for video/image
  height?: number; // pixels, for video/image
  codec?: string; // for video/audio
  frameRate?: number; // fps, for video
  sampleRate?: number; // Hz, for audio
  channels?: number; // audio channels

  // Checksums
  sha256?: string;
  md5?: string;
}

export interface MediaUploadInput {
  file: File | Buffer;
  filename: string;
  mimeType: string;
  investigationId?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export interface MediaMetadata {
  mediaId: string;
  extractedAt: Date;
  
  // Technical metadata
  format: string;
  duration?: number;
  bitrate?: number;
  
  // Video metadata
  videoCodec?: string;
  videoWidth?: number;
  videoHeight?: number;
  frameRate?: number;
  aspectRatio?: string;
  
  // Audio metadata
  audioCodec?: string;
  sampleRate?: number;
  channels?: number;
  bitDepth?: number;
  
  // EXIF data (images)
  exif?: Record<string, unknown>;
  
  // GPS data
  gps?: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
  
  // Camera/device info
  device?: {
    make?: string;
    model?: string;
    software?: string;
  };
  
  // Creation timestamp from metadata
  createdAt?: Date;
  modifiedAt?: Date;
}
