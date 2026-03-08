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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultMediaUploadConfig = exports.MediaUploadService = exports.MediaType = void 0;
// @ts-nocheck
const fs_1 = require("fs");
const promises_1 = require("stream/promises");
const crypto_1 = require("crypto");
const path = __importStar(require("path"));
const node_crypto_1 = require("node:crypto");
const sharp_1 = __importDefault(require("sharp"));
const ffprobe_static_1 = __importDefault(require("ffprobe-static"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const pino_1 = __importDefault(require("pino"));
const exif_reader_1 = __importDefault(require("exif-reader"));
const ImageProcessingPipeline_js_1 = require("./ImageProcessingPipeline.js");
const CdnUploadService_js_1 = require("./CdnUploadService.js");
const logger = pino_1.default({ name: 'MediaUploadService' });
// Configure FFmpeg binary paths
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
fluent_ffmpeg_1.default.setFfmpegPath(ffmpeg_static_1.default);
fluent_ffmpeg_1.default.setFfprobePath(ffprobe_static_1.default.path);
var MediaType;
(function (MediaType) {
    MediaType["TEXT"] = "TEXT";
    MediaType["IMAGE"] = "IMAGE";
    MediaType["AUDIO"] = "AUDIO";
    MediaType["VIDEO"] = "VIDEO";
    MediaType["DOCUMENT"] = "DOCUMENT";
    MediaType["GEOSPATIAL"] = "GEOSPATIAL";
})(MediaType || (exports.MediaType = MediaType = {}));
class MediaUploadService {
    config;
    imageProcessingPipeline;
    cdnUploadService;
    constructor(config) {
        this.config = config;
        this.imageProcessingPipeline = new ImageProcessingPipeline_js_1.ImageProcessingPipeline(config.uploadPath, config.thumbnailPath, config.imageProcessing || ImageProcessingPipeline_js_1.defaultImageProcessingConfig);
        if (config.cdnUpload?.enabled) {
            this.cdnUploadService = new CdnUploadService_js_1.CdnUploadService(config.cdnUpload);
        }
        this.ensureDirectories();
    }
    async ensureDirectories() {
        try {
            await fs_1.promises.mkdir(this.config.uploadPath, { recursive: true });
            await fs_1.promises.mkdir(this.config.thumbnailPath, { recursive: true });
            await fs_1.promises.mkdir(path.join(this.config.uploadPath, 'temp'), {
                recursive: true,
            });
        }
        catch (error) {
            logger.error('Failed to create upload directories:', error);
            throw error;
        }
    }
    /**
     * Upload and process a media file with comprehensive metadata extraction
     */
    async uploadMedia(upload, userId) {
        const uploadResolved = await upload;
        const { createReadStream, filename, mimetype } = uploadResolved;
        const stream = createReadStream();
        logger.info(`Starting upload for file: ${filename}, type: ${mimetype}, user: ${userId}`);
        // Generate unique filename
        const fileId = (0, node_crypto_1.randomUUID)();
        const ext = path.extname(filename || '');
        const uniqueFilename = `${fileId}${ext}`;
        const tempFilePath = path.join(this.config.uploadPath, 'temp', uniqueFilename);
        const finalFilePath = path.join(this.config.uploadPath, uniqueFilename);
        try {
            // Validate file type
            if (!this.isAllowedType(mimetype)) {
                throw new Error(`File type ${mimetype} is not allowed`);
            }
            // Stream to temporary file with size checking
            await this.streamToFile(stream, tempFilePath);
            // Verify file size
            const stats = await fs_1.promises.stat(tempFilePath);
            if (stats.size > this.config.maxFileSize) {
                throw new Error(`File size ${stats.size} exceeds maximum ${this.config.maxFileSize}`);
            }
            // Determine media type
            const mediaType = this.getMediaType(mimetype);
            const baseFilename = path.parse(uniqueFilename).name;
            // Extract metadata based on media type
            const initialDimensions = await this.extractMediaDimensions(tempFilePath, mediaType, mimetype);
            const duration = await this.extractDuration(tempFilePath, mediaType);
            // Move to final location prior to derivative generation
            await fs_1.promises.rename(tempFilePath, finalFilePath);
            let dimensions = initialDimensions;
            let processingMetadata;
            if (mediaType === MediaType.IMAGE && this.imageProcessingPipeline) {
                const processed = await this.imageProcessingPipeline.processImage(finalFilePath, mimetype, baseFilename);
                dimensions = {
                    width: processed.optimizedInfo.width,
                    height: processed.optimizedInfo.height,
                    channels: processed.optimizedInfo.channels,
                };
                processingMetadata = this.mapImageProcessingMetadata(processed, uniqueFilename);
            }
            if (mediaType === MediaType.VIDEO) {
                await this.generateThumbnail(finalFilePath, mediaType, uniqueFilename);
            }
            const additionalMetadata = await this.extractAdditionalMetadata(finalFilePath, mediaType);
            if (processingMetadata?.exif && !additionalMetadata.exif) {
                additionalMetadata.exif = processingMetadata.exif;
            }
            if (processingMetadata?.facialRecognition) {
                additionalMetadata.facialRecognition =
                    processingMetadata.facialRecognition;
            }
            if (processingMetadata) {
                const cdnMap = await this.uploadToCdn(finalFilePath, uniqueFilename, mimetype, processingMetadata.derivatives);
                processingMetadata.derivatives = processingMetadata.derivatives.map((derivative) => ({
                    ...derivative,
                    cdnUrl: derivative.cdnUrl || cdnMap[derivative.filename],
                }));
                processingMetadata.cdn = cdnMap;
            }
            const finalStats = await fs_1.promises.stat(finalFilePath);
            const checksum = await this.calculateChecksum(finalFilePath);
            const metadata = {
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
                                derivatives: processingMetadata.derivatives.map(({ sourcePath, ...rest }) => rest),
                            },
                        }
                        : {}),
                },
            };
            logger.info(`Successfully uploaded media: ${uniqueFilename}, size: ${finalStats.size}, type: ${mediaType}`);
            return metadata;
        }
        catch (error) {
            // Cleanup on error
            try {
                await fs_1.promises.unlink(tempFilePath);
            }
            catch (cleanupError) {
                logger.warn('Failed to cleanup temp file:', cleanupError);
            }
            logger.error(`Upload failed for ${filename}:`, error);
            throw error;
        }
    }
    /**
     * Stream upload with chunked processing for large files
     */
    async streamToFile(stream, filePath) {
        const writeStream = (0, fs_1.createWriteStream)(filePath);
        try {
            await (0, promises_1.pipeline)(stream, writeStream);
        }
        catch (error) {
            // Ensure write stream is closed
            writeStream.destroy();
            throw error;
        }
    }
    /**
     * Calculate SHA-256 checksum for file integrity
     */
    async calculateChecksum(filePath) {
        const hash = (0, crypto_1.createHash)('sha256');
        const stream = (0, fs_1.createReadStream)(filePath);
        for await (const chunk of stream) {
            hash.update(chunk);
        }
        return hash.digest('hex');
    }
    /**
     * Determine media type from MIME type
     */
    getMediaType(mimeType) {
        if (mimeType.startsWith('image/'))
            return MediaType.IMAGE;
        if (mimeType.startsWith('audio/'))
            return MediaType.AUDIO;
        if (mimeType.startsWith('video/'))
            return MediaType.VIDEO;
        if (mimeType.startsWith('text/'))
            return MediaType.TEXT;
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
    async extractMediaDimensions(filePath, mediaType, mimeType) {
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
        }
        catch (error) {
            logger.warn(`Failed to extract dimensions for ${filePath}:`, error);
            return undefined;
        }
    }
    /**
     * Extract image dimensions using Sharp
     */
    async extractImageDimensions(filePath) {
        const metadata = await (0, sharp_1.default)(filePath).metadata();
        return {
            width: metadata.width,
            height: metadata.height,
            channels: metadata.channels,
        };
    }
    /**
     * Extract audio/video dimensions using FFprobe
     */
    async extractAVDimensions(filePath) {
        return new Promise((resolve, reject) => {
            fluent_ffmpeg_1.default.ffprobe(filePath, (err, metadata) => {
                if (err) {
                    reject(err);
                    return;
                }
                const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
                const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');
                const dimensions = {};
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
    async extractDuration(filePath, mediaType) {
        if (mediaType !== MediaType.AUDIO && mediaType !== MediaType.VIDEO) {
            return undefined;
        }
        return new Promise((resolve, reject) => {
            fluent_ffmpeg_1.default.ffprobe(filePath, (err, metadata) => {
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
    async extractAdditionalMetadata(filePath, mediaType) {
        const metadata = {};
        try {
            switch (mediaType) {
                case MediaType.IMAGE:
                    const imageMetadata = await (0, sharp_1.default)(filePath).metadata();
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
        }
        catch (error) {
            logger.warn(`Failed to extract additional metadata from ${filePath}:`, error);
        }
        return metadata;
    }
    /**
     * Parse EXIF data for image metadata
     */
    parseExifData(exifBuffer) {
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
            logger.warn('Failed to parse EXIF data:', error);
            return { exifError: 'PARSE_FAILED' };
        }
    }
    /**
     * Extract AV metadata using FFprobe
     */
    async extractAVMetadata(filePath) {
        return new Promise((resolve) => {
            fluent_ffmpeg_1.default.ffprobe(filePath, (err, metadata) => {
                if (err) {
                    logger.warn(`Failed to extract AV metadata from ${filePath}:`, err);
                    resolve({});
                    return;
                }
                const result = {
                    format: metadata.format.format_name,
                    duration: metadata.format.duration,
                    bitrate: metadata.format.bit_rate,
                    streams: metadata.streams.length,
                };
                // Extract codec information
                const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
                const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');
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
    mapImageProcessingMetadata(processed, canonicalFilename) {
        const derivatives = [
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
    mapProcessedImages(type, images) {
        return images.map((image) => ({
            type,
            format: image.format,
            filename: path.basename(image.path),
            width: image.width,
            height: image.height,
            sourcePath: image.path,
        }));
    }
    async uploadToCdn(mainFilePath, mainFilename, mimeType, derivatives) {
        if (!this.cdnUploadService)
            return {};
        const requests = [
            {
                localPath: mainFilePath,
                key: mainFilename,
                contentType: mimeType,
            },
        ];
        for (const derivative of derivatives || []) {
            const localPath = derivative.sourcePath ||
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
    async generateThumbnail(filePath, mediaType, filename) {
        const thumbnailPath = path.join(this.config.thumbnailPath, `thumb_${filename}.jpg`);
        try {
            if (mediaType === MediaType.IMAGE) {
                await (0, sharp_1.default)(filePath)
                    .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 80 })
                    .toFile(thumbnailPath);
            }
            else if (mediaType === MediaType.VIDEO) {
                await this.generateVideoThumbnail(filePath, thumbnailPath);
            }
            logger.info(`Generated thumbnail: ${thumbnailPath}`);
        }
        catch (error) {
            logger.warn(`Failed to generate thumbnail for ${filename}:`, error);
        }
    }
    /**
     * Generate video thumbnail using FFmpeg
     */
    async generateVideoThumbnail(videoPath, thumbnailPath) {
        return new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(videoPath)
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
    parseFrameRate(frameRate) {
        if (!frameRate)
            return undefined;
        if (frameRate.includes('/')) {
            const [num, den] = frameRate.split('/').map(Number);
            return den ? num / den : undefined;
        }
        return parseFloat(frameRate);
    }
    /**
     * Check if file type is allowed
     */
    isAllowedType(mimeType) {
        return (this.config.allowedTypes.includes(mimeType) ||
            this.config.allowedTypes.some((allowed) => allowed.endsWith('/*') && mimeType.startsWith(allowed.slice(0, -1))));
    }
    /**
     * Delete uploaded media file and thumbnail
     */
    async deleteMedia(filename) {
        const filePath = path.join(this.config.uploadPath, filename);
        const thumbnailPath = path.join(this.config.thumbnailPath, `thumb_${filename}.jpg`);
        try {
            await fs_1.promises.unlink(filePath);
            logger.info(`Deleted media file: ${filename}`);
        }
        catch (error) {
            logger.warn(`Failed to delete media file ${filename}:`, error);
        }
        try {
            await fs_1.promises.unlink(thumbnailPath);
            logger.info(`Deleted thumbnail: thumb_${filename}.jpg`);
        }
        catch (error) {
            // Thumbnail might not exist, ignore error
        }
    }
    /**
     * Get file stats
     */
    async getFileStats(filename) {
        const filePath = path.join(this.config.uploadPath, filename);
        try {
            const stats = await fs_1.promises.stat(filePath);
            return {
                exists: true,
                size: stats.size,
                modified: stats.mtime,
            };
        }
        catch (error) {
            return { exists: false };
        }
    }
    /**
     * Validate media integrity using checksum
     */
    async validateIntegrity(filename, expectedChecksum) {
        const filePath = path.join(this.config.uploadPath, filename);
        try {
            const actualChecksum = await this.calculateChecksum(filePath);
            return actualChecksum === expectedChecksum;
        }
        catch (error) {
            logger.error(`Failed to validate integrity for ${filename}:`, error);
            return false;
        }
    }
}
exports.MediaUploadService = MediaUploadService;
// Default configuration
exports.defaultMediaUploadConfig = {
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
    thumbnailPath: process.env.MEDIA_THUMBNAIL_PATH || '/tmp/intelgraph/thumbnails',
    chunkSize: 64 * 1024, // 64KB chunks
    imageProcessing: ImageProcessingPipeline_js_1.defaultImageProcessingConfig,
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
