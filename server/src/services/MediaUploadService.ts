import { createWriteStream, createReadStream, promises as fs } from 'fs';
import { pipeline } from 'stream/promises';
import { createHash } from 'crypto';
import path from 'path';
import { randomUUID as uuidv4 } from 'node:crypto';
import sharp from 'sharp';
import ffprobe from 'ffprobe-static';
import ffmpeg from 'fluent-ffmpeg';
// @ts-ignore - Upload type not exported from graphql-upload-ts
import { Upload } from 'graphql-upload-ts';
import pino from 'pino';
import exifReader from 'exif-reader';
import {
  ImageProcessingPipeline,
  defaultImageProcessingConfig,
  type ImageProcessingOptions,
  type ImageProcessingResult,
  type ProcessedImage,
  type FacialRecognitionResult,
} from './ImageProcessingPipeline.js';
import {
  CdnUploadService,
  type CdnUploadConfig,
  type CdnUploadRequest,
} from './CdnUploadService.js';

const logger = pino({ name: 'MediaUploadService' });

// Configure FFmpeg binary paths
ffmpeg.setFfmpegPath(require('ffmpeg-static'));
ffmpeg.setFfprobePath(ffprobe.path);

export interface MediaUploadConfig {
  maxFileSize: number; // bytes
  allowedTypes: string[];
  uploadPath: string;
  thumbnailPath: string;
  chunkSize: number;
  imageProcessing?: ImageProcessingOptions;
  cdnUpload?: CdnUploadConfig;
}

export interface MediaMetadata {
  filename: string;
  originalName: string;
  mimeType: string;
  filesize: number;
  checksum: string;
  mediaType: MediaType;
  dimensions?: MediaDimensions;
  duration?: number;
  metadata: Record<string, any>;
}

export type DerivativeType = 'optimized' | 'thumbnail' | 'conversion';

export interface DerivativeFile {
  type: DerivativeType;
  format: string;
  filename: string;
  width?: number;
  height?: number;
  cdnUrl?: string;
  sourcePath?: string;
}

export interface ImageProcessingMetadata {
  derivatives: DerivativeFile[];
  exif?: Record<string, any>;
  facialRecognition?: FacialRecognitionResult;
  cdn?: Record<string, string>;
}

export interface MediaDimensions {
  width?: number;
  height?: number;
  channels?: number;
  bitRate?: number;
  frameRate?: number;
}

export enum MediaType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
  GEOSPATIAL = 'GEOSPATIAL',
}

export class MediaUploadService {
  private config: MediaUploadConfig;
  private imageProcessingPipeline?: ImageProcessingPipeline;
  private cdnUploadService?: CdnUploadService;

  constructor(config: MediaUploadConfig) {
    this.config = config;
    this.imageProcessingPipeline = new ImageProcessingPipeline(
      config.uploadPath,
      config.thumbnailPath,
      config.imageProcessing || defaultImageProcessingConfig,
    );

    if (config.cdnUpload?.enabled) {
      this.cdnUploadService = new CdnUploadService(config.cdnUpload);
    }
    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.config.uploadPath, { recursive: true });
      await fs.mkdir(this.config.thumbnailPath, { recursive: true });
      await fs.mkdir(path.join(this.config.uploadPath, 'temp'), {
        recursive: true,
      });
    } catch (error) {
      logger.error('Failed to create upload directories:', error);
      throw error;
    }
  }

  /**
   * Upload and process a media file with comprehensive metadata extraction
   */
  async uploadMedia(upload: Upload, userId?: string): Promise<MediaMetadata> {
    const { createReadStream, filename, mimetype } = await upload;
    const stream = createReadStream();

    logger.info(
      `Starting upload for file: ${filename}, type: ${mimetype}, user: ${userId}`,
    );

    // Generate unique filename
    const fileId = uuidv4();
    const ext = path.extname(filename || '');
    const uniqueFilename = `${fileId}${ext}`;
    const tempFilePath = path.join(
      this.config.uploadPath,
      'temp',
      uniqueFilename,
    );
    const finalFilePath = path.join(this.config.uploadPath, uniqueFilename);

    try {
      // Validate file type
      if (!this.isAllowedType(mimetype)) {
        throw new Error(`File type ${mimetype} is not allowed`);
      }

      // Stream to temporary file with size checking
      await this.streamToFile(stream, tempFilePath);

      // Verify file size
      const stats = await fs.stat(tempFilePath);
      if (stats.size > this.config.maxFileSize) {
        throw new Error(
          `File size ${stats.size} exceeds maximum ${this.config.maxFileSize}`,
        );
      }

        // Determine media type
        const mediaType = this.getMediaType(mimetype);
        const baseFilename = path.parse(uniqueFilename).name;

        // Extract metadata based on media type
        const initialDimensions = await this.extractMediaDimensions(
          tempFilePath,
          mediaType,
          mimetype,
        );
        const duration = await this.extractDuration(tempFilePath, mediaType);

        // Move to final location prior to derivative generation
        await fs.rename(tempFilePath, finalFilePath);

        let dimensions = initialDimensions;
        let processingMetadata: ImageProcessingMetadata | undefined;

        if (mediaType === MediaType.IMAGE && this.imageProcessingPipeline) {
          const processed = await this.imageProcessingPipeline.processImage(
            finalFilePath,
            mimetype,
            baseFilename,
          );

          dimensions = {
            width: processed.optimizedInfo.width,
            height: processed.optimizedInfo.height,
            channels: processed.optimizedInfo.channels,
          };

          processingMetadata = this.mapImageProcessingMetadata(
            processed,
            uniqueFilename,
          );
        }

        if (mediaType === MediaType.VIDEO) {
          await this.generateThumbnail(finalFilePath, mediaType, uniqueFilename);
        }

        const additionalMetadata = await this.extractAdditionalMetadata(
          finalFilePath,
          mediaType,
        );

        if (processingMetadata?.exif && !additionalMetadata.exif) {
          additionalMetadata.exif = processingMetadata.exif;
        }

        if (processingMetadata?.facialRecognition) {
          additionalMetadata.facialRecognition =
            processingMetadata.facialRecognition;
        }

        if (processingMetadata) {
          const cdnMap = await this.uploadToCdn(
            finalFilePath,
            uniqueFilename,
            mimetype,
            processingMetadata.derivatives,
          );

          processingMetadata.derivatives = processingMetadata.derivatives.map(
            (derivative) => ({
              ...derivative,
              cdnUrl: derivative.cdnUrl || cdnMap[derivative.filename],
            }),
          );
          processingMetadata.cdn = cdnMap;
        }

        const finalStats = await fs.stat(finalFilePath);
        const checksum = await this.calculateChecksum(finalFilePath);

        const metadata: MediaMetadata = {
          filename: uniqueFilename,
          originalName: filename || 'unknown',
          mimeType: mimetype,
          filesize: finalStats.size,
          checksum,
          mediaType,
          dimensions,
          duration,
          metadata: {
            uploadedBy: userId,
            uploadedAt: new Date().toISOString(),
            processingVersion: '2.0',
            ...additionalMetadata,
            ...(processingMetadata
              ? {
                  imageProcessing: {
                    ...processingMetadata,
                    derivatives: processingMetadata.derivatives.map(
                      ({ sourcePath, ...rest }) => rest,
                    ),
                  },
                }
              : {}),
          },
        };

        logger.info(
          `Successfully uploaded media: ${uniqueFilename}, size: ${finalStats.size}, type: ${mediaType}`,
        );
        return metadata;
    } catch (error) {
      // Cleanup on error
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        logger.warn('Failed to cleanup temp file:', cleanupError);
      }

      logger.error(`Upload failed for ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Stream upload with chunked processing for large files
   */
  private async streamToFile(
    stream: NodeJS.ReadableStream,
    filePath: string,
  ): Promise<void> {
    const writeStream = createWriteStream(filePath);

    try {
      // @ts-ignore - stream type incompatibility
      await pipeline(stream, writeStream);
    } catch (error) {
      // Ensure write stream is closed
      writeStream.destroy();
      throw error;
    }
  }

  /**
   * Calculate SHA-256 checksum for file integrity
   */
  private async calculateChecksum(filePath: string): Promise<string> {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);

    for await (const chunk of stream) {
      hash.update(chunk);
    }

    return hash.digest('hex');
  }

  /**
   * Determine media type from MIME type
   */
  private getMediaType(mimeType: string): MediaType {
    if (mimeType.startsWith('image/')) return MediaType.IMAGE;
    if (mimeType.startsWith('audio/')) return MediaType.AUDIO;
    if (mimeType.startsWith('video/')) return MediaType.VIDEO;
    if (mimeType.startsWith('text/')) return MediaType.TEXT;
    if (mimeType.includes('pdf') || mimeType.includes('document'))
      return MediaType.DOCUMENT;
    if (mimeType.includes('geo') || mimeType.includes('gis'))
      return MediaType.GEOSPATIAL;

    // Default to document for unknown types
    return MediaType.DOCUMENT;
  }

  /**
   * Extract media dimensions using appropriate tools
   */
  private async extractMediaDimensions(
    filePath: string,
    mediaType: MediaType,
    mimeType: string,
  ): Promise<MediaDimensions | undefined> {
    try {
      switch (mediaType) {
        case MediaType.IMAGE:
          return await this.extractImageDimensions(filePath);

        case MediaType.VIDEO:
        case MediaType.AUDIO:
          return await this.extractAVDimensions(filePath);

        default:
          return undefined;
      }
    } catch (error) {
      logger.warn(`Failed to extract dimensions for ${filePath}:`, error);
      return undefined;
    }
  }

  /**
   * Extract image dimensions using Sharp
   */
  private async extractImageDimensions(
    filePath: string,
  ): Promise<MediaDimensions> {
    const metadata = await sharp(filePath).metadata();

    return {
      width: metadata.width,
      height: metadata.height,
      channels: metadata.channels,
    };
  }

  /**
   * Extract audio/video dimensions using FFprobe
   */
  private async extractAVDimensions(
    filePath: string,
  ): Promise<MediaDimensions> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(
          (s) => s.codec_type === 'video',
        );
        const audioStream = metadata.streams.find(
          (s) => s.codec_type === 'audio',
        );

        const dimensions: MediaDimensions = {};

        if (videoStream) {
          dimensions.width = videoStream.width;
          dimensions.height = videoStream.height;
          dimensions.frameRate = this.parseFrameRate(videoStream.r_frame_rate);
          dimensions.bitRate = parseInt(videoStream.bit_rate || '0');
        }

        if (audioStream) {
          dimensions.channels = audioStream.channels;
          if (!dimensions.bitRate) {
            dimensions.bitRate = parseInt(audioStream.bit_rate || '0');
          }
        }

        resolve(dimensions);
      });
    });
  }

  /**
   * Extract duration for audio/video files
   */
  private async extractDuration(
    filePath: string,
    mediaType: MediaType,
  ): Promise<number | undefined> {
    if (mediaType !== MediaType.AUDIO && mediaType !== MediaType.VIDEO) {
      return undefined;
    }

    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          logger.warn(`Failed to extract duration from ${filePath}:`, err);
          resolve(undefined);
          return;
        }

        resolve(metadata.format.duration);
      });
    });
  }

  /**
   * Extract additional metadata (EXIF, ID3, etc.)
   */
  private async extractAdditionalMetadata(
    filePath: string,
    mediaType: MediaType,
  ): Promise<Record<string, any>> {
    const metadata: Record<string, any> = {};

    try {
      switch (mediaType) {
        case MediaType.IMAGE:
          const imageMetadata = await sharp(filePath).metadata();
          if (imageMetadata.exif) {
            // Parse EXIF data for GPS coordinates, camera info, etc.
            metadata.exif = this.parseExifData(imageMetadata.exif);
          }
          break;

        case MediaType.AUDIO:
        case MediaType.VIDEO:
          // Extract metadata using FFprobe
          const avMetadata = await this.extractAVMetadata(filePath);
          Object.assign(metadata, avMetadata);
          break;

        default:
          break;
      }
    } catch (error) {
      logger.warn(
        `Failed to extract additional metadata from ${filePath}:`,
        error,
      );
    }

    return metadata;
  }

  /**
   * Parse EXIF data for image metadata
   */
  private parseExifData(exifBuffer: Buffer): Record<string, any> {
    try {
      const decoded = exifReader(exifBuffer);
      return {
        image: decoded.image,
        thumbnail: decoded.thumbnail,
        exif: decoded.exif,
        gps: decoded.gps,
        interoperability: decoded.interoperability,
      };
    } catch (error) {
      logger.warn('Failed to parse EXIF data:', error);
      return { exifError: 'PARSE_FAILED' };
    }
  }

  /**
   * Extract AV metadata using FFprobe
   */
    private async extractAVMetadata(
      filePath: string,
    ): Promise<Record<string, any>> {
      return new Promise((resolve) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          logger.warn(`Failed to extract AV metadata from ${filePath}:`, err);
          resolve({});
          return;
        }

        const result: Record<string, any> = {
          format: metadata.format.format_name,
          duration: metadata.format.duration,
          bitrate: metadata.format.bit_rate,
          streams: metadata.streams.length,
        };

        // Extract codec information
        const videoStream = metadata.streams.find(
          (s) => s.codec_type === 'video',
        );
        const audioStream = metadata.streams.find(
          (s) => s.codec_type === 'audio',
        );

        if (videoStream) {
          result.videoCodec = videoStream.codec_name;
          result.videoProfile = videoStream.profile;
        }

        if (audioStream) {
          result.audioCodec = audioStream.codec_name;
          result.sampleRate = audioStream.sample_rate;
        }

        resolve(result);
      });
    });
  }

  private mapImageProcessingMetadata(
    processed: ImageProcessingResult,
    canonicalFilename: string,
  ): ImageProcessingMetadata {
    const derivatives: DerivativeFile[] = [
      {
        type: 'optimized',
        format: path.extname(canonicalFilename).replace('.', '') || 'jpeg',
        filename: canonicalFilename,
        width: processed.optimizedInfo.width,
        height: processed.optimizedInfo.height,
      },
      ...this.mapProcessedImages('thumbnail', processed.thumbnails),
      ...this.mapProcessedImages('conversion', processed.conversions),
    ];

    return {
      derivatives,
      exif: processed.exif,
      facialRecognition: processed.facialRecognition,
    };
  }

  private mapProcessedImages(
    type: DerivativeType,
    images: ProcessedImage[],
  ): DerivativeFile[] {
    return images.map((image) => ({
      type,
      format: image.format,
      filename: path.basename(image.path),
      width: image.width,
      height: image.height,
      sourcePath: image.path,
    }));
  }

  private async uploadToCdn(
    mainFilePath: string,
    mainFilename: string,
    mimeType: string,
    derivatives?: DerivativeFile[],
  ): Promise<Record<string, string>> {
    if (!this.cdnUploadService) return {};

    const requests: CdnUploadRequest[] = [
      {
        localPath: mainFilePath,
        key: mainFilename,
        contentType: mimeType,
      },
    ];

    for (const derivative of derivatives || []) {
      const localPath =
        derivative.sourcePath ||
        path.join(this.config.uploadPath, derivative.filename);

      requests.push({
        localPath,
        key: derivative.filename,
        contentType: `image/${derivative.format}`,
      });
    }

    return this.cdnUploadService.uploadFiles(requests);
  }

  /**
   * Generate thumbnail for images and videos
   */
  private async generateThumbnail(
    filePath: string,
    mediaType: MediaType,
    filename: string,
  ): Promise<void> {
    const thumbnailPath = path.join(
      this.config.thumbnailPath,
      `thumb_${filename}.jpg`,
    );

    try {
      if (mediaType === MediaType.IMAGE) {
        await sharp(filePath)
          .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toFile(thumbnailPath);
      } else if (mediaType === MediaType.VIDEO) {
        await this.generateVideoThumbnail(filePath, thumbnailPath);
      }

      logger.info(`Generated thumbnail: ${thumbnailPath}`);
    } catch (error) {
      logger.warn(`Failed to generate thumbnail for ${filename}:`, error);
    }
  }

  /**
   * Generate video thumbnail using FFmpeg
   */
  private async generateVideoThumbnail(
    videoPath: string,
    thumbnailPath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          count: 1,
          folder: path.dirname(thumbnailPath),
          filename: path.basename(thumbnailPath),
          timemarks: ['10%'], // Take screenshot at 10% of video duration
        })
        .on('end', () => resolve())
        .on('error', reject);
    });
  }

  /**
   * Parse frame rate string to number
   */
  private parseFrameRate(frameRate?: string): number | undefined {
    if (!frameRate) return undefined;

    if (frameRate.includes('/')) {
      const [num, den] = frameRate.split('/').map(Number);
      return den ? num / den : undefined;
    }

    return parseFloat(frameRate);
  }

  /**
   * Check if file type is allowed
   */
  private isAllowedType(mimeType: string): boolean {
    return (
      this.config.allowedTypes.includes(mimeType) ||
      this.config.allowedTypes.some(
        (allowed) =>
          allowed.endsWith('/*') && mimeType.startsWith(allowed.slice(0, -1)),
      )
    );
  }

  /**
   * Delete uploaded media file and thumbnail
   */
  async deleteMedia(filename: string): Promise<void> {
    const filePath = path.join(this.config.uploadPath, filename);
    const thumbnailPath = path.join(
      this.config.thumbnailPath,
      `thumb_${filename}.jpg`,
    );

    try {
      await fs.unlink(filePath);
      logger.info(`Deleted media file: ${filename}`);
    } catch (error) {
      logger.warn(`Failed to delete media file ${filename}:`, error);
    }

    try {
      await fs.unlink(thumbnailPath);
      logger.info(`Deleted thumbnail: thumb_${filename}.jpg`);
    } catch (error) {
      // Thumbnail might not exist, ignore error
    }
  }

  /**
   * Get file stats
   */
  async getFileStats(
    filename: string,
  ): Promise<{ exists: boolean; size?: number; modified?: Date }> {
    const filePath = path.join(this.config.uploadPath, filename);

    try {
      const stats = await fs.stat(filePath);
      return {
        exists: true,
        size: stats.size,
        modified: stats.mtime,
      };
    } catch (error) {
      return { exists: false };
    }
  }

  /**
   * Validate media integrity using checksum
   */
  async validateIntegrity(
    filename: string,
    expectedChecksum: string,
  ): Promise<boolean> {
    const filePath = path.join(this.config.uploadPath, filename);

    try {
      const actualChecksum = await this.calculateChecksum(filePath);
      return actualChecksum === expectedChecksum;
    } catch (error) {
      logger.error(`Failed to validate integrity for ${filename}:`, error);
      return false;
    }
  }
}

// Default configuration
export const defaultMediaUploadConfig: MediaUploadConfig = {
  maxFileSize: 10 * 1024 * 1024 * 1024, // 10GB
  allowedTypes: [
    'image/*',
    'video/*',
    'audio/*',
    'text/*',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/json',
    'application/xml',
  ],
  uploadPath: process.env.MEDIA_UPLOAD_PATH || '/tmp/intelgraph/uploads',
  thumbnailPath:
    process.env.MEDIA_THUMBNAIL_PATH || '/tmp/intelgraph/thumbnails',
  chunkSize: 64 * 1024, // 64KB chunks
  imageProcessing: defaultImageProcessingConfig,
  cdnUpload: {
    enabled: false,
    bucket: process.env.MEDIA_CDN_BUCKET || '',
    region: process.env.MEDIA_CDN_REGION || 'us-east-1',
    basePath: process.env.MEDIA_CDN_BASE_PATH,
    endpoint: process.env.MEDIA_CDN_ENDPOINT,
    publicUrl: process.env.MEDIA_CDN_PUBLIC_URL,
    accessKeyId: process.env.MEDIA_CDN_ACCESS_KEY_ID,
    secretAccessKey: process.env.MEDIA_CDN_SECRET_ACCESS_KEY,
  },
};
