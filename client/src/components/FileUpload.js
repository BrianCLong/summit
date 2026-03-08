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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileUpload = FileUpload;
const react_1 = __importStar(require("react"));
const client_1 = require("@apollo/client");
const UPLOAD_FILE = (0, client_1.gql) `
  mutation UploadAttachment($file: Upload!) {
    uploadAttachment(file: $file) {
      filename
      mimeType
      size
      sha256
    }
  }
`;
const UPLOAD_MEDIA = (0, client_1.gql) `
  mutation UploadMedia($file: Upload!) {
    uploadMedia(file: $file) {
      filename
      originalName
      mimeType
      filesize
      checksum
      mediaType
      dimensions {
        width
        height
      }
    }
  }
`;
const defaultAcceptedTypes = [
    'image/*',
    'video/*',
    'audio/*',
    'application/pdf',
    'text/*',
    'application/json',
    '.csv',
    '.xlsx',
    '.docx',
];
const formatFileSize = (bytes) => {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
function FileUpload({ 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
investigationId, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
entityId, onUploadComplete, onUploadError, acceptedTypes = defaultAcceptedTypes, maxSize = 100 * 1024 * 1024, // 100MB default
multiple = false, useMediaUpload = false, }) {
    const [isDragging, setIsDragging] = (0, react_1.useState)(false);
    const [uploadProgress, setUploadProgress] = (0, react_1.useState)({});
    const [uploadedFiles, setUploadedFiles] = (0, react_1.useState)([]);
    const [errors, setErrors] = (0, react_1.useState)([]);
    const fileInputRef = (0, react_1.useRef)(null);
    const [uploadAttachment, { loading: attachmentLoading }] = (0, client_1.useMutation)(UPLOAD_FILE, {
        context: {
            fetchOptions: {
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress((prev) => ({ ...prev, current: progress }));
                },
            },
        },
    });
    const [uploadMedia, { loading: mediaLoading }] = (0, client_1.useMutation)(UPLOAD_MEDIA, {
        context: {
            fetchOptions: {
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress((prev) => ({ ...prev, current: progress }));
                },
            },
        },
    });
    const loading = attachmentLoading || mediaLoading;
    const validateFile = (0, react_1.useCallback)((file) => {
        if (file.size > maxSize) {
            return `File "${file.name}" exceeds maximum size of ${formatFileSize(maxSize)}`;
        }
        const fileType = file.type;
        const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
        const isAccepted = acceptedTypes.some((type) => {
            if (type.startsWith('.')) {
                return fileExt === type.toLowerCase();
            }
            if (type.endsWith('/*')) {
                return fileType.startsWith(type.replace('/*', '/'));
            }
            return fileType === type;
        });
        if (!isAccepted) {
            return `File type "${file.type || fileExt}" is not accepted`;
        }
        return null;
    }, [acceptedTypes, maxSize]);
    const handleUpload = (0, react_1.useCallback)(async (files) => {
        const fileArray = Array.from(files);
        const newErrors = [];
        for (const file of fileArray) {
            const validationError = validateFile(file);
            if (validationError) {
                newErrors.push(validationError);
                continue;
            }
            try {
                setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));
                const mutation = useMediaUpload ? uploadMedia : uploadAttachment;
                const { data } = await mutation({
                    variables: { file },
                });
                const result = useMediaUpload ? data.uploadMedia : data.uploadAttachment;
                const uploadedFile = {
                    ...result,
                    size: result.size || result.filesize,
                };
                setUploadedFiles((prev) => [...prev, uploadedFile]);
                setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
                if (onUploadComplete) {
                    onUploadComplete(uploadedFile);
                }
            }
            catch (error) {
                const err = error;
                newErrors.push(`Failed to upload "${file.name}": ${err.message}`);
                if (onUploadError) {
                    onUploadError(err);
                }
            }
        }
        setErrors(newErrors);
    }, [validateFile, uploadAttachment, uploadMedia, useMediaUpload, onUploadComplete, onUploadError]);
    const handleDragEnter = (0, react_1.useCallback)((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);
    const handleDragLeave = (0, react_1.useCallback)((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);
    const handleDragOver = (0, react_1.useCallback)((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);
    const handleDrop = (0, react_1.useCallback)((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            if (!multiple && files.length > 1) {
                setErrors(['Only one file can be uploaded at a time']);
                return;
            }
            handleUpload(files);
        }
    }, [handleUpload, multiple]);
    const handleFileSelect = (0, react_1.useCallback)((e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleUpload(files);
        }
        // Reset input to allow re-selecting same file
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [handleUpload]);
    const handleClick = (0, react_1.useCallback)(() => {
        fileInputRef.current?.click();
    }, []);
    const handleRemoveFile = (0, react_1.useCallback)((filename) => {
        setUploadedFiles((prev) => prev.filter((f) => f.filename !== filename));
    }, []);
    const clearErrors = (0, react_1.useCallback)(() => {
        setErrors([]);
    }, []);
    return (<div className="file-upload-container">
      <style>{`
        .file-upload-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .dropzone {
          border: 2px dashed #ccc;
          border-radius: 8px;
          padding: 40px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          background: #fafafa;
        }
        .dropzone:hover {
          border-color: #1976d2;
          background: #f0f7ff;
        }
        .dropzone.dragging {
          border-color: #1976d2;
          background: #e3f2fd;
        }
        .dropzone.loading {
          opacity: 0.7;
          pointer-events: none;
        }
        .dropzone-icon {
          font-size: 48px;
          margin-bottom: 16px;
          color: #666;
        }
        .dropzone-text {
          font-size: 16px;
          color: #333;
          margin-bottom: 8px;
        }
        .dropzone-subtext {
          font-size: 14px;
          color: #666;
        }
        .file-input {
          display: none;
        }
        .uploaded-files {
          margin-top: 16px;
        }
        .uploaded-file {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background: #f5f5f5;
          border-radius: 4px;
          margin-bottom: 8px;
        }
        .file-info {
          display: flex;
          flex-direction: column;
        }
        .file-name {
          font-weight: 500;
          color: #333;
        }
        .file-meta {
          font-size: 12px;
          color: #666;
        }
        .remove-btn {
          background: none;
          border: none;
          color: #f44336;
          cursor: pointer;
          padding: 4px 8px;
          font-size: 14px;
        }
        .remove-btn:hover {
          background: #ffebee;
          border-radius: 4px;
        }
        .error-list {
          margin-top: 16px;
          background: #ffebee;
          border-radius: 4px;
          padding: 12px;
        }
        .error-item {
          color: #c62828;
          font-size: 14px;
          margin-bottom: 4px;
        }
        .error-item:last-child {
          margin-bottom: 0;
        }
        .clear-errors {
          margin-top: 8px;
          background: none;
          border: 1px solid #c62828;
          color: #c62828;
          padding: 4px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }
        .progress-bar {
          height: 4px;
          background: #e0e0e0;
          border-radius: 2px;
          margin-top: 8px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: #1976d2;
          transition: width 0.2s ease;
        }
      `}</style>

      <div className={`dropzone ${isDragging ? 'dragging' : ''} ${loading ? 'loading' : ''}`} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop} onClick={handleClick} role="button" tabIndex={0} aria-label="File upload dropzone">
        <div className="dropzone-icon">📁</div>
        <div className="dropzone-text">
          {loading ? 'Uploading...' : 'Drag and drop files here, or click to browse'}
        </div>
        <div className="dropzone-subtext">
          {multiple ? 'You can upload multiple files' : 'Upload one file at a time'}
          {' • '}
          Max size: {formatFileSize(maxSize)}
        </div>
        {loading && (<div className="progress-bar">
            <div className="progress-fill" style={{ width: `${uploadProgress.current || 0}%` }}/>
          </div>)}
      </div>

      <input ref={fileInputRef} type="file" className="file-input" accept={acceptedTypes.join(',')} multiple={multiple} onChange={handleFileSelect}/>

      {errors.length > 0 && (<div className="error-list">
          {errors.map((error, index) => (<div key={index} className="error-item">
              {error}
            </div>))}
          <button className="clear-errors" onClick={clearErrors}>
            Clear errors
          </button>
        </div>)}

      {uploadedFiles.length > 0 && (<div className="uploaded-files">
          <h4>Uploaded Files</h4>
          {uploadedFiles.map((file) => (<div key={file.filename} className="uploaded-file">
              <div className="file-info">
                <span className="file-name">{file.originalName || file.filename}</span>
                <span className="file-meta">
                  {file.mimeType} • {formatFileSize(file.size || file.filesize || 0)}
                  {file.checksum && ` • SHA256: ${file.checksum.substring(0, 8)}...`}
                </span>
              </div>
              <button className="remove-btn" onClick={() => handleRemoveFile(file.filename)} aria-label={`Remove ${file.filename}`}>
                ✕
              </button>
            </div>))}
        </div>)}
    </div>);
}
exports.default = FileUpload;
