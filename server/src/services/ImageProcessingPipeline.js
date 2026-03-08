"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultImageProcessingConfig = exports.ImageProcessingPipeline = void 0;
// @ts-nocheck
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const exif_reader_1 = __importDefault(require("exif-reader"));
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'ImageProcessingPipeline' });
const DEFAULT_PIPELINE_CONFIG = {
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
class ImageProcessingPipeline {
    uploadPath;
    thumbnailPath;
    options;
    constructor(uploadPath, thumbnailPath, options = DEFAULT_PIPELINE_CONFIG) {
        this.uploadPath = uploadPath;
        this.thumbnailPath = thumbnailPath;
        this.options = options;
    }
    async processImage(filePath, mimeType, baseFilename) {
        const config = {
            ...DEFAULT_PIPELINE_CONFIG,
            ...this.options,
            thumbnails: this.options.thumbnails || DEFAULT_PIPELINE_CONFIG.thumbnails,
            conversions: this.options.conversions || DEFAULT_PIPELINE_CONFIG.conversions,
            optimization: {
                ...DEFAULT_PIPELINE_CONFIG.optimization,
                ...(this.options.optimization || {}),
            },
            watermark: {
                ...DEFAULT_PIPELINE_CONFIG.watermark,
                ...(this.options.watermark || {}),
            },
            facialRecognitionHook: this.options.facialRecognitionHook ||
                DEFAULT_PIPELINE_CONFIG.facialRecognitionHook,
        };
        const sourceMetadata = await (0, sharp_1.default)(filePath).metadata();
        const canonicalName = baseFilename || path_1.default.parse(filePath).name || 'processed-image';
        const optimizedInfo = await this.optimizeImage(filePath, mimeType, config, sourceMetadata);
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
    async optimizeImage(filePath, mimeType, config, metadata) {
        const outputFormat = config.optimization.targetFormat || this.formatFromMime(mimeType);
        const tempPath = this.variantPath(filePath, 'optimized', outputFormat);
        const pipeline = (0, sharp_1.default)(filePath).rotate();
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
        await fs_1.promises.rename(tempPath, filePath);
        return info;
    }
    async generateThumbnails(filePath, baseFilename, config) {
        await fs_1.promises.mkdir(this.thumbnailPath, { recursive: true });
        const results = [];
        for (const thumb of config.thumbnails) {
            const targetFormat = thumb.format || 'jpeg';
            const targetPath = path_1.default.join(this.thumbnailPath, `${baseFilename}_${thumb.postfix}.${targetFormat}`);
            const info = await (0, sharp_1.default)(filePath)
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
    async convertFormats(filePath, baseFilename, config) {
        const results = [];
        for (const conversion of config.conversions) {
            const targetPath = this.variantPath(filePath, conversion.suffix || conversion.format, conversion.format, baseFilename);
            const info = await (0, sharp_1.default)(filePath)
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
    async extractExifData(exifBuffer) {
        if (!exifBuffer)
            return undefined;
        try {
            const decoded = (0, exif_reader_1.default)(exifBuffer);
            return {
                image: decoded.image,
                thumbnail: decoded.thumbnail,
                exif: decoded.exif,
                gps: decoded.gps,
                interoperability: decoded.interoperability,
            };
        }
        catch (error) {
            logger.warn({ err: error }, 'Failed to parse EXIF data');
            return undefined;
        }
    }
    async runFacialRecognitionHook(imagePath, metadata, config) {
        if (!config.facialRecognitionHook)
            return undefined;
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
        }
        catch (error) {
            logger.warn({ err: error }, 'Facial recognition hook failed');
            return undefined;
        }
    }
    formatFromMime(mimeType) {
        if (mimeType.includes('png'))
            return 'png';
        if (mimeType.includes('webp'))
            return 'webp';
        if (mimeType.includes('avif'))
            return 'avif';
        return 'jpeg';
    }
    variantPath(originalPath, suffix, format, baseFilename) {
        const parsed = path_1.default.parse(originalPath);
        const name = baseFilename || parsed.name;
        return path_1.default.join(this.uploadPath, `${name}_${suffix}.${format}`);
    }
    async buildWatermark(watermark, metadata) {
        if (!watermark.text && !watermark.imagePath) {
            return undefined;
        }
        const opacity = watermark.opacity ?? 0.25;
        const gravity = watermark.gravity || 'southeast';
        if (watermark.imagePath) {
            try {
                await fs_1.promises.access(watermark.imagePath);
                return {
                    input: watermark.imagePath,
                    gravity,
                    opacity,
                };
            }
            catch (error) {
                logger.warn({ err: error }, 'Watermark image not accessible');
            }
        }
        if (!watermark.text)
            return undefined;
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
exports.ImageProcessingPipeline = ImageProcessingPipeline;
exports.defaultImageProcessingConfig = DEFAULT_PIPELINE_CONFIG;
