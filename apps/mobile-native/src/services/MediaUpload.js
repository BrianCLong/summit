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
exports.clearFailedUploads = exports.getUploadQueueStatus = exports.compressVideo = exports.compressImage = exports.uploadQueuedMedia = exports.uploadMedia = void 0;
const react_native_fs_1 = __importDefault(require("react-native-fs"));
const axios_1 = __importDefault(require("axios"));
const react_native_1 = require("react-native");
const config_1 = require("../config");
const Database_1 = require("./Database");
const AuthService_1 = require("./AuthService");
const OfflineSync_1 = require("./OfflineSync");
// Upload media file
const uploadMedia = async (file, options) => {
    console.log('[MediaUpload] Uploading media:', file.name);
    // Validate file size
    validateFileSize(file);
    // Check if online
    const online = await (0, OfflineSync_1.isOnline)();
    if (!online) {
        // Queue for upload when online
        const id = await (0, Database_1.addMediaToUploadQueue)({
            filePath: file.uri,
            fileType: file.type,
            fileSize: file.size,
            entityId: options?.entityId,
            caseId: options?.caseId,
            metadata: options?.metadata,
        });
        console.log('[MediaUpload] Queued for upload:', id);
        return {
            id: `pending_${id}`,
            url: file.uri, // Return local URI for now
        };
    }
    try {
        // Get auth token
        const token = await (0, AuthService_1.getAuthToken)();
        // Prepare form data
        const formData = new FormData();
        formData.append('file', {
            uri: react_native_1.Platform.OS === 'android' ? file.uri : file.uri.replace('file://', ''),
            type: file.mimeType,
            name: file.name,
        });
        if (options?.entityId) {
            formData.append('entityId', options.entityId);
        }
        if (options?.caseId) {
            formData.append('caseId', options.caseId);
        }
        if (options?.metadata) {
            formData.append('metadata', JSON.stringify(options.metadata));
        }
        // Upload file
        const response = await axios_1.default.post(`${config_1.API_URL}/media/upload`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: `Bearer ${token}`,
            },
            onUploadProgress: (progressEvent) => {
                if (progressEvent.total) {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    options?.onProgress?.(progress);
                }
            },
        });
        console.log('[MediaUpload] Upload completed:', response.data);
        return {
            id: response.data.id,
            url: response.data.url,
        };
    }
    catch (error) {
        console.error('[MediaUpload] Upload failed:', error);
        // Queue for retry
        await (0, Database_1.addMediaToUploadQueue)({
            filePath: file.uri,
            fileType: file.type,
            fileSize: file.size,
            entityId: options?.entityId,
            caseId: options?.caseId,
            metadata: options?.metadata,
        });
        throw error;
    }
};
exports.uploadMedia = uploadMedia;
// Upload queued media
const uploadQueuedMedia = async () => {
    console.log('[MediaUpload] Uploading queued media...');
    // Check if online
    const online = await (0, OfflineSync_1.isOnline)();
    if (!online) {
        console.log('[MediaUpload] Device is offline, skipping upload');
        return;
    }
    const uploads = await (0, Database_1.getPendingMediaUploads)();
    console.log(`[MediaUpload] Found ${uploads.length} pending uploads`);
    for (const upload of uploads) {
        try {
            // Update status to uploading
            await (0, Database_1.updateMediaUploadStatus)(upload.id, 'uploading');
            // Get auth token
            const token = await (0, AuthService_1.getAuthToken)();
            // Check if file still exists
            const fileExists = await react_native_fs_1.default.exists(upload.filePath);
            if (!fileExists) {
                console.log(`[MediaUpload] File not found: ${upload.filePath}`);
                await (0, Database_1.deleteMediaUpload)(upload.id);
                continue;
            }
            // Prepare form data
            const formData = new FormData();
            formData.append('file', {
                uri: react_native_1.Platform.OS === 'android'
                    ? upload.filePath
                    : upload.filePath.replace('file://', ''),
                type: upload.fileType,
                name: upload.filePath.split('/').pop(),
            });
            if (upload.entityId) {
                formData.append('entityId', upload.entityId);
            }
            if (upload.caseId) {
                formData.append('caseId', upload.caseId);
            }
            if (upload.metadata) {
                formData.append('metadata', JSON.stringify(upload.metadata));
            }
            // Upload file
            await axios_1.default.post(`${config_1.API_URL}/media/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`,
                },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        (0, Database_1.updateMediaUploadStatus)(upload.id, 'uploading', progress);
                    }
                },
            });
            // Delete from queue
            await (0, Database_1.deleteMediaUpload)(upload.id);
            // Delete local file
            await react_native_fs_1.default.unlink(upload.filePath);
            console.log(`[MediaUpload] Uploaded: ${upload.filePath}`);
        }
        catch (error) {
            console.error(`[MediaUpload] Failed to upload ${upload.filePath}:`, error);
            // Update status to failed
            await (0, Database_1.updateMediaUploadStatus)(upload.id, 'failed', 0, error.message);
        }
    }
};
exports.uploadQueuedMedia = uploadQueuedMedia;
// Validate file size
const validateFileSize = (file) => {
    let maxSize;
    switch (file.type) {
        case 'photo':
            maxSize = config_1.MAX_PHOTO_SIZE;
            break;
        case 'video':
            maxSize = config_1.MAX_VIDEO_SIZE;
            break;
        case 'audio':
            maxSize = config_1.MAX_AUDIO_SIZE;
            break;
        default:
            maxSize = config_1.MAX_PHOTO_SIZE;
    }
    if (file.size > maxSize) {
        throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(2)} MB) exceeds maximum allowed size (${(maxSize / 1024 / 1024).toFixed(2)} MB)`);
    }
};
// Compress image
const compressImage = async (uri, quality = 0.8) => {
    const { Image } = await Promise.resolve().then(() => __importStar(require('react-native-compressor')));
    try {
        const compressedUri = await Image.compress(uri, {
            compressionMethod: 'auto',
            quality,
            maxWidth: 1920,
            maxHeight: 1920,
        });
        console.log('[MediaUpload] Image compressed:', compressedUri);
        return compressedUri;
    }
    catch (error) {
        console.error('[MediaUpload] Image compression failed:', error);
        return uri; // Return original URI if compression fails
    }
};
exports.compressImage = compressImage;
// Compress video
const compressVideo = async (uri) => {
    const { Video } = await Promise.resolve().then(() => __importStar(require('react-native-compressor')));
    try {
        const compressedUri = await Video.compress(uri, {
            compressionMethod: 'auto',
        });
        console.log('[MediaUpload] Video compressed:', compressedUri);
        return compressedUri;
    }
    catch (error) {
        console.error('[MediaUpload] Video compression failed:', error);
        return uri; // Return original URI if compression fails
    }
};
exports.compressVideo = compressVideo;
// Get upload queue status
const getUploadQueueStatus = async () => {
    const uploads = await (0, Database_1.getPendingMediaUploads)();
    return {
        pending: uploads.filter((u) => u.uploadStatus === 'pending').length,
        uploading: uploads.filter((u) => u.uploadStatus === 'uploading').length,
        failed: uploads.filter((u) => u.uploadStatus === 'failed').length,
    };
};
exports.getUploadQueueStatus = getUploadQueueStatus;
// Clear failed uploads
const clearFailedUploads = async () => {
    const uploads = await (0, Database_1.getPendingMediaUploads)();
    for (const upload of uploads) {
        if (upload.uploadStatus === 'failed') {
            await (0, Database_1.deleteMediaUpload)(upload.id);
        }
    }
    console.log('[MediaUpload] Failed uploads cleared');
};
exports.clearFailedUploads = clearFailedUploads;
