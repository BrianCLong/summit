import { promises as fs } from 'fs';
import path from 'path';
import sharp, { type FormatEnum, type OutputInfo } from 'sharp';
import exifReader from 'exif-reader';
import pino from 'pino';

const logger = pino({ name: 'ImageProcessingPipeline' });

export interface ThumbnailConfig {
  width: number;
  height: number;
  postfix: string;
  format?: keyof FormatEnum;
  quality?: number;
}

export interface FormatConversionConfig {
  format: keyof FormatEnum;
  quality?: number;
  suffix?: string;
}

export interface ImageOptimizationConfig {
  quality?: number;
  progressive?: boolean;
  normalize?: boolean;
  targetFormat?: keyof FormatEnum;
}

export interface WatermarkConfig {
  text?: string;
  imagePath?: string;
  gravity?: keyof sharp.GravityEnum;
  opacity?: number;
  size?: number;
  margin?: number;
}

export interface FacialRecognitionContext {
  width?: number;
  height?: number;
  mimeType: string;
}

export interface FacialRecognitionResult {
  faces: Array<{
    boundingBox: { x: number; y: number; width: number; height: number };
    confidence?: number;
    landmarks?: Record<string, [number, number]>;
  }>;
  modelVersion?: string;
  processedAt?: string;
  notes?: string;
}

export type FacialRecognitionHook = (
  imagePath: string,
  context: FacialRecognitionContext,
) => Promise<FacialRecognitionResult>;

export interface ImageProcessingOptions {
  thumbnails?: ThumbnailConfig[];
  conversions?: FormatConversionConfig[];
  optimization?: ImageOptimizationConfig;
  watermark?: WatermarkConfig;
  facialRecognitionHook?: FacialRecognitionHook;
}

export interface ImageProcessingResult {
  optimizedPath: string;
  optimizedInfo: OutputInfo;
  thumbnails: ProcessedImage[];
  conversions: ProcessedImage[];
  exif?: Record<string, any>;
  facialRecognition?: FacialRecognitionResult;
}

export interface ProcessedImage {
  path: string;
  format: string;
  width?: number;
  height?: number;
}

const DEFAULT_PIPELINE_CONFIG: Required<ImageProcessingOptions> = {
  thumbnails: [
    {
      width: 320,
      height: 320,
      postfix: 'thumb',
      format: 'jpeg',
      quality: 80,
    },
  ],
  conversions: [
    {
      format: 'webp',
      quality: 82,
      suffix: 'webp',
    },
  ],
  optimization: {
    quality: 88,
    progressive: true,
    normalize: true,
    targetFormat: undefined,
  },
  watermark: {
    text: undefined,
    imagePath: undefined,
    gravity: 'southeast',
    opacity: 0.25,
    size: 42,
    margin: 24,
  },
  facialRecognitionHook: undefined,
};

export class ImageProcessingPipeline {
  constructor(
    private readonly uploadPath: string,
    private readonly thumbnailPath: string,
    private readonly options: ImageProcessingOptions = DEFAULT_PIPELINE_CONFIG,
  ) {}

  async processImage(
    filePath: string,
    mimeType: string,
    baseFilename?: string,
  ): Promise<ImageProcessingResult> {
    const config: Required<ImageProcessingOptions> = {
      ...DEFAULT_PIPELINE_CONFIG,
      ...this.options,
      thumbnails: this.options.thumbnails || DEFAULT_PIPELINE_CONFIG.thumbnails,
      conversions:
        this.options.conversions || DEFAULT_PIPELINE_CONFIG.conversions,
      optimization: {
        ...DEFAULT_PIPELINE_CONFIG.optimization,
        ...(this.options.optimization || {}),
      },
      watermark: {
        ...DEFAULT_PIPELINE_CONFIG.watermark,
        ...(this.options.watermark || {}),
      },
      facialRecognitionHook:
        this.options.facialRecognitionHook ||
        DEFAULT_PIPELINE_CONFIG.facialRecognitionHook,
    };
    const sourceMetadata = await sharp(filePath).metadata();
    const canonicalName =
      baseFilename || path.parse(filePath).name || 'processed-image';

    const optimizedInfo = await this.optimizeImage(
      filePath,
      mimeType,
      config,
      sourceMetadata,
    );
    const optimizedPath = filePath;

    const [thumbnails, conversions, exif, facialRecognition] = await Promise.all([
      this.generateThumbnails(optimizedPath, canonicalName, config),
      this.convertFormats(optimizedPath, canonicalName, config),
      this.extractExifData(sourceMetadata.exif),
      this.runFacialRecognitionHook(optimizedPath, sourceMetadata, config),
    ]);

    return {
      optimizedPath,
      optimizedInfo,
      thumbnails,
      conversions,
      exif,
      facialRecognition,
    };
  }

  private async optimizeImage(
    filePath: string,
    mimeType: string,
    config: Required<ImageProcessingOptions>,
    metadata: sharp.Metadata,
  ): Promise<OutputInfo> {
    const outputFormat =
      config.optimization.targetFormat || this.formatFromMime(mimeType);
    const tempPath = this.variantPath(filePath, 'optimized', outputFormat);

    const pipeline = sharp(filePath).rotate();

    if (config.optimization.normalize) {
      pipeline.normalize();
    }

    const watermark = await this.buildWatermark(config.watermark, metadata);
    if (watermark) {
      pipeline.composite([watermark]);
    }

    const quality = config.optimization.quality;
    const progressive = config.optimization.progressive;

    const info = await pipeline
      .toFormat(outputFormat, {
        quality,
        progressive,
        mozjpeg: true,
        force: true,
      })
      .toFile(tempPath);

    await fs.rename(tempPath, filePath);
    return info;
  }

  private async generateThumbnails(
    filePath: string,
    baseFilename: string,
    config: Required<ImageProcessingOptions>,
  ): Promise<ProcessedImage[]> {
    await fs.mkdir(this.thumbnailPath, { recursive: true });
    const results: ProcessedImage[] = [];

    for (const thumb of config.thumbnails) {
      const targetFormat = thumb.format || 'jpeg';
      const targetPath = path.join(
        this.thumbnailPath,
        `${baseFilename}_${thumb.postfix}.${targetFormat}`,
      );

      const info = await sharp(filePath)
        .resize(thumb.width, thumb.height, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toFormat(targetFormat, {
          quality: thumb.quality ?? 80,
          progressive: true,
          mozjpeg: true,
        })
        .toFile(targetPath);

      results.push({
        path: targetPath,
        format: targetFormat,
        width: info.width,
        height: info.height,
      });
    }

    return results;
  }

  private async convertFormats(
    filePath: string,
    baseFilename: string,
    config: Required<ImageProcessingOptions>,
  ): Promise<ProcessedImage[]> {
    const results: ProcessedImage[] = [];

    for (const conversion of config.conversions) {
      const targetPath = this.variantPath(
        filePath,
        conversion.suffix || conversion.format,
        conversion.format,
        baseFilename,
      );

      const info = await sharp(filePath)
        .toFormat(conversion.format, {
          quality: conversion.quality ?? 85,
          progressive: true,
          mozjpeg: true,
        })
        .toFile(targetPath);

      results.push({
        path: targetPath,
        format: conversion.format,
        width: info.width,
        height: info.height,
      });
    }

    return results;
  }

  private async extractExifData(
    exifBuffer?: Buffer,
  ): Promise<Record<string, any> | undefined> {
    if (!exifBuffer) return undefined;

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
      logger.warn({ err: error }, 'Failed to parse EXIF data');
      return undefined;
    }
  }

  private async runFacialRecognitionHook(
    imagePath: string,
    metadata: sharp.Metadata,
    config: Required<ImageProcessingOptions>,
  ): Promise<FacialRecognitionResult | undefined> {
    if (!config.facialRecognitionHook) return undefined;

    try {
      const result = await config.facialRecognitionHook(imagePath, {
        width: metadata.width,
        height: metadata.height,
        mimeType: metadata.format ? `image/${metadata.format}` : 'image/jpeg',
      });
      return {
        ...result,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.warn({ err: error }, 'Facial recognition hook failed');
      return undefined;
    }
  }

  private formatFromMime(mimeType: string): keyof FormatEnum {
    if (mimeType.includes('png')) return 'png';
    if (mimeType.includes('webp')) return 'webp';
    if (mimeType.includes('avif')) return 'avif';
    return 'jpeg';
  }

  private variantPath(
    originalPath: string,
    suffix: string,
    format: keyof FormatEnum,
    baseFilename?: string,
  ): string {
    const parsed = path.parse(originalPath);
    const name = baseFilename || parsed.name;
    return path.join(this.uploadPath, `${name}_${suffix}.${format}`);
  }

  private async buildWatermark(
    watermark: WatermarkConfig,
    metadata: sharp.Metadata,
  ): Promise<sharp.OverlayOptions | undefined> {
    if (!watermark.text && !watermark.imagePath) {
      return undefined;
    }

    const opacity = watermark.opacity ?? 0.25;
    const gravity = watermark.gravity || 'southeast';

    if (watermark.imagePath) {
      try {
        await fs.access(watermark.imagePath);
        return {
          input: watermark.imagePath,
          gravity,
          opacity,
        };
      } catch (error) {
        logger.warn({ err: error }, 'Watermark image not accessible');
      }
    }

    if (!watermark.text) return undefined;

    const fontSize = watermark.size ?? 42;
    const margin = watermark.margin ?? 24;
    const width = metadata.width ? Math.max(metadata.width - margin * 2, 200) : 800;
    const height = metadata.height ? Math.max(metadata.height - margin * 2, 200) : 200;

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <style>
          .watermark { fill: white; font-size: ${fontSize}px; font-family: 'Helvetica', 'Arial', sans-serif; opacity: ${opacity}; }
        </style>
        <text x="${width - margin}" y="${height - margin}" text-anchor="end" class="watermark">${watermark.text}</text>
      </svg>
    `;

    return {
      input: Buffer.from(svg),
      gravity,
      opacity,
    };
  }
}

export const defaultImageProcessingConfig = DEFAULT_PIPELINE_CONFIG;
