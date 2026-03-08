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
exports.AttachmentUpload = AttachmentUpload;
/**
 * Attachment Upload Component
 * Handles photo and audio capture/upload with offline support
 */
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const uuid_1 = require("uuid");
const offlineCache_1 = require("@/lib/offlineCache");
const syncEngine_1 = require("@/lib/syncEngine");
const AuthContext_1 = require("@/contexts/AuthContext");
// Max file sizes
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB
function AttachmentUpload({ caseId, entityId, onUpload }) {
    const { user } = (0, AuthContext_1.useAuth)();
    const fileInputRef = (0, react_1.useRef)(null);
    const audioInputRef = (0, react_1.useRef)(null);
    const [pendingAttachments, setPendingAttachments] = (0, react_1.useState)([]);
    const [isUploading, setIsUploading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [dialogOpen, setDialogOpen] = (0, react_1.useState)(false);
    // Handle photo capture
    const handlePhotoCapture = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };
    // Handle audio capture
    const handleAudioCapture = () => {
        if (audioInputRef.current) {
            audioInputRef.current.click();
        }
    };
    // Process file selection
    const handleFileSelect = async (event, type) => {
        const file = event.target.files?.[0];
        if (!file || !user)
            return;
        // Validate file size
        const maxSize = type === 'photo' ? MAX_PHOTO_SIZE : MAX_AUDIO_SIZE;
        if (file.size > maxSize) {
            setError(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
            return;
        }
        setError(null);
        // Create attachment record
        const attachment = {
            id: (0, uuid_1.v4)(),
            localId: (0, uuid_1.v4)(),
            type,
            filename: file.name,
            mimeType: file.type,
            size: file.size,
            caseId,
            entityId,
            uploadedBy: user.id,
            syncStatus: 'pending',
        };
        // Store file locally for offline access
        try {
            // Convert to base64 for storage (in production, use IndexedDB blobs)
            const reader = new FileReader();
            reader.onload = async () => {
                attachment.localUri = reader.result;
                // Save to offline cache
                await offlineCache_1.offlineCache.attachments.create(attachment);
                // Add to pending list
                setPendingAttachments((prev) => [...prev, attachment]);
                // Queue for sync
                await syncEngine_1.syncEngine.queueForSync('create', 'attachment', {
                    ...attachment,
                    fileData: reader.result, // Include base64 data for upload
                });
                onUpload?.(attachment);
            };
            reader.readAsDataURL(file);
        }
        catch (err) {
            setError('Failed to process file');
        }
        // Reset input
        event.target.value = '';
    };
    // Remove pending attachment
    const handleRemove = async (id) => {
        setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
        // Note: In production, would also remove from sync queue
    };
    // Get icon for attachment type
    const getAttachmentIcon = (type) => {
        switch (type) {
            case 'photo':
                return <icons_material_1.Image />;
            case 'audio':
                return <icons_material_1.AudioFile />;
            default:
                return <icons_material_1.AttachFile />;
        }
    };
    // Get status icon
    const getStatusIcon = (status) => {
        switch (status) {
            case 'synced':
                return <icons_material_1.CheckCircle color="success" fontSize="small"/>;
            case 'error':
                return <icons_material_1.Error color="error" fontSize="small"/>;
            default:
                return <icons_material_1.CloudUpload color="action" fontSize="small"/>;
        }
    };
    return (<>
      {/* Upload Buttons */}
      <material_1.Box display="flex" gap={1}>
        <material_1.Button variant="outlined" startIcon={<icons_material_1.PhotoCamera />} onClick={handlePhotoCapture} size="small">
          Photo
        </material_1.Button>
        <material_1.Button variant="outlined" startIcon={<icons_material_1.Mic />} onClick={handleAudioCapture} size="small">
          Audio
        </material_1.Button>
        {pendingAttachments.length > 0 && (<material_1.Chip label={`${pendingAttachments.length} pending`} size="small" onClick={() => setDialogOpen(true)}/>)}
      </material_1.Box>

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => handleFileSelect(e, 'photo')}/>
      <input ref={audioInputRef} type="file" accept="audio/*" capture="user" hidden onChange={(e) => handleFileSelect(e, 'audio')}/>

      {/* Error display */}
      {error && (<material_1.Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>
          {error}
        </material_1.Alert>)}

      {/* Pending Attachments Dialog */}
      <material_1.Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <material_1.DialogTitle>
          Pending Attachments
          <material_1.IconButton aria-label="close" onClick={() => setDialogOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <icons_material_1.Close />
          </material_1.IconButton>
        </material_1.DialogTitle>
        <material_1.DialogContent>
          {pendingAttachments.length === 0 ? (<material_1.Typography color="text.secondary" textAlign="center" py={2}>
              No pending attachments
            </material_1.Typography>) : (<material_1.List>
              {pendingAttachments.map((attachment) => (<material_1.ListItem key={attachment.id}>
                  <material_1.ListItemIcon>{getAttachmentIcon(attachment.type)}</material_1.ListItemIcon>
                  <material_1.ListItemText primary={attachment.filename} secondary={`${(attachment.size / 1024).toFixed(1)} KB`}/>
                  <material_1.ListItemSecondaryAction>
                    <material_1.Box display="flex" alignItems="center" gap={1}>
                      {getStatusIcon(attachment.syncStatus)}
                      <material_1.IconButton edge="end" onClick={() => handleRemove(attachment.id)} size="small">
                        <icons_material_1.Delete />
                      </material_1.IconButton>
                    </material_1.Box>
                  </material_1.ListItemSecondaryAction>
                </material_1.ListItem>))}
            </material_1.List>)}
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => setDialogOpen(false)}>Close</material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>
    </>);
}
exports.default = AttachmentUpload;
