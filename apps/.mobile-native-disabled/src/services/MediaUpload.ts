import RNFS from 'react-native-fs';
import axios from 'axios';
import {Platform} from 'react-native';

import {API_URL, MAX_PHOTO_SIZE, MAX_VIDEO_SIZE, MAX_AUDIO_SIZE} from '../config';
import {
  getPendingMediaUploads,
  updateMediaUploadStatus,
  deleteMediaUpload,
  addMediaToUploadQueue,
} from './Database';
import {getAuthToken} from './AuthService';
import {isOnline} from './OfflineSync';

export interface MediaFile {
  uri: string;
  type: 'photo' | 'video' | 'audio' | 'document';
  name: string;
  size: number;
  mimeType: string;
}

export interface UploadOptions {
  entityId?: string;
  caseId?: string;
  metadata?: any;
  onProgress?: (progress: number) => void;
}

// Upload media file
export const uploadMedia = async (
  file: MediaFile,
  options?: UploadOptions,
): Promise<{id: string; url: string}> => {
  console.log('[MediaUpload] Uploading media:', file.name);

  // Validate file size
  validateFileSize(file);

  // Check if online
  const online = await isOnline();

  if (!online) {
    // Queue for upload when online
    const id = await addMediaToUploadQueue({
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
    const token = await getAuthToken();

    // Prepare form data
    const formData = new FormData();
    formData.append('file', {
      uri: Platform.OS === 'android' ? file.uri : file.uri.replace('file://', ''),
      type: file.mimeType,
      name: file.name,
    } as any);

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
    const response = await axios.post(`${API_URL}/media/upload`, formData, {
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
  } catch (error) {
    console.error('[MediaUpload] Upload failed:', error);

    // Queue for retry
    await addMediaToUploadQueue({
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

// Upload queued media
export const uploadQueuedMedia = async (): Promise<void> => {
  console.log('[MediaUpload] Uploading queued media...');

  // Check if online
  const online = await isOnline();
  if (!online) {
    console.log('[MediaUpload] Device is offline, skipping upload');
    return;
  }

  const uploads = await getPendingMediaUploads();

  console.log(`[MediaUpload] Found ${uploads.length} pending uploads`);

  for (const upload of uploads) {
    try {
      // Update status to uploading
      await updateMediaUploadStatus(upload.id, 'uploading');

      // Get auth token
      const token = await getAuthToken();

      // Check if file still exists
      const fileExists = await RNFS.exists(upload.filePath);
      if (!fileExists) {
        console.log(`[MediaUpload] File not found: ${upload.filePath}`);
        await deleteMediaUpload(upload.id);
        continue;
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('file', {
        uri:
          Platform.OS === 'android'
            ? upload.filePath
            : upload.filePath.replace('file://', ''),
        type: upload.fileType,
        name: upload.filePath.split('/').pop(),
      } as any);

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
      await axios.post(`${API_URL}/media/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            updateMediaUploadStatus(upload.id, 'uploading', progress);
          }
        },
      });

      // Delete from queue
      await deleteMediaUpload(upload.id);

      // Delete local file
      await RNFS.unlink(upload.filePath);

      console.log(`[MediaUpload] Uploaded: ${upload.filePath}`);
    } catch (error: any) {
      console.error(`[MediaUpload] Failed to upload ${upload.filePath}:`, error);

      // Update status to failed
      await updateMediaUploadStatus(upload.id, 'failed', 0, error.message);
    }
  }
};

// Validate file size
const validateFileSize = (file: MediaFile): void => {
  let maxSize: number;

  switch (file.type) {
    case 'photo':
      maxSize = MAX_PHOTO_SIZE;
      break;
    case 'video':
      maxSize = MAX_VIDEO_SIZE;
      break;
    case 'audio':
      maxSize = MAX_AUDIO_SIZE;
      break;
    default:
      maxSize = MAX_PHOTO_SIZE;
  }

  if (file.size > maxSize) {
    throw new Error(
      `File size (${(file.size / 1024 / 1024).toFixed(2)} MB) exceeds maximum allowed size (${(maxSize / 1024 / 1024).toFixed(2)} MB)`,
    );
  }
};

// Compress image
export const compressImage = async (uri: string, quality: number = 0.8): Promise<string> => {
  const {Image} = await import('react-native-compressor');

  try {
    const compressedUri = await Image.compress(uri, {
      compressionMethod: 'auto',
      quality,
      maxWidth: 1920,
      maxHeight: 1920,
    });

    console.log('[MediaUpload] Image compressed:', compressedUri);

    return compressedUri;
  } catch (error) {
    console.error('[MediaUpload] Image compression failed:', error);
    return uri; // Return original URI if compression fails
  }
};

// Compress video
export const compressVideo = async (uri: string): Promise<string> => {
  const {Video} = await import('react-native-compressor');

  try {
    const compressedUri = await Video.compress(uri, {
      compressionMethod: 'auto',
    });

    console.log('[MediaUpload] Video compressed:', compressedUri);

    return compressedUri;
  } catch (error) {
    console.error('[MediaUpload] Video compression failed:', error);
    return uri; // Return original URI if compression fails
  }
};

// Get upload queue status
export const getUploadQueueStatus = async (): Promise<{
  pending: number;
  uploading: number;
  failed: number;
}> => {
  const uploads = await getPendingMediaUploads();

  return {
    pending: uploads.filter((u) => u.uploadStatus === 'pending').length,
    uploading: uploads.filter((u) => u.uploadStatus === 'uploading').length,
    failed: uploads.filter((u) => u.uploadStatus === 'failed').length,
  };
};

// Clear failed uploads
export const clearFailedUploads = async (): Promise<void> => {
  const uploads = await getPendingMediaUploads();

  for (const upload of uploads) {
    if (upload.uploadStatus === 'failed') {
      await deleteMediaUpload(upload.id);
    }
  }

  console.log('[MediaUpload] Failed uploads cleared');
};
