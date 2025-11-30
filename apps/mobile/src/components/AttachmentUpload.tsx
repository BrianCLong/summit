/**
 * Attachment Upload Component
 * Handles photo and audio capture/upload with offline support
 */
import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Alert,
} from '@mui/material';
import {
  PhotoCamera,
  Mic,
  AttachFile,
  Close,
  CloudUpload,
  Image,
  AudioFile,
  Delete,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import type { Attachment, AttachmentType, SyncStatus } from '@/types';
import { offlineCache } from '@/lib/offlineCache';
import { syncEngine } from '@/lib/syncEngine';
import { useAuth } from '@/contexts/AuthContext';

interface AttachmentUploadProps {
  caseId?: string;
  entityId?: string;
  onUpload?: (attachment: Attachment) => void;
}

// Max file sizes
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB

export function AttachmentUpload({ caseId, entityId, onUpload }: AttachmentUploadProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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
  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: AttachmentType
  ) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file size
    const maxSize = type === 'photo' ? MAX_PHOTO_SIZE : MAX_AUDIO_SIZE;
    if (file.size > maxSize) {
      setError(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
      return;
    }

    setError(null);

    // Create attachment record
    const attachment: Attachment = {
      id: uuidv4(),
      localId: uuidv4(),
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
        attachment.localUri = reader.result as string;

        // Save to offline cache
        await offlineCache.attachments.create(attachment);

        // Add to pending list
        setPendingAttachments((prev) => [...prev, attachment]);

        // Queue for sync
        await syncEngine.queueForSync('create', 'attachment', {
          ...attachment,
          fileData: reader.result, // Include base64 data for upload
        });

        onUpload?.(attachment);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to process file');
    }

    // Reset input
    event.target.value = '';
  };

  // Remove pending attachment
  const handleRemove = async (id: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
    // Note: In production, would also remove from sync queue
  };

  // Get icon for attachment type
  const getAttachmentIcon = (type: AttachmentType) => {
    switch (type) {
      case 'photo':
        return <Image />;
      case 'audio':
        return <AudioFile />;
      default:
        return <AttachFile />;
    }
  };

  // Get status icon
  const getStatusIcon = (status: SyncStatus) => {
    switch (status) {
      case 'synced':
        return <CheckCircle color="success" fontSize="small" />;
      case 'error':
        return <ErrorIcon color="error" fontSize="small" />;
      default:
        return <CloudUpload color="action" fontSize="small" />;
    }
  };

  return (
    <>
      {/* Upload Buttons */}
      <Box display="flex" gap={1}>
        <Button
          variant="outlined"
          startIcon={<PhotoCamera />}
          onClick={handlePhotoCapture}
          size="small"
        >
          Photo
        </Button>
        <Button
          variant="outlined"
          startIcon={<Mic />}
          onClick={handleAudioCapture}
          size="small"
        >
          Audio
        </Button>
        {pendingAttachments.length > 0 && (
          <Chip
            label={`${pendingAttachments.length} pending`}
            size="small"
            onClick={() => setDialogOpen(true)}
          />
        )}
      </Box>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => handleFileSelect(e, 'photo')}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        capture="user"
        hidden
        onChange={(e) => handleFileSelect(e, 'audio')}
      />

      {/* Error display */}
      {error && (
        <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Pending Attachments Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Pending Attachments
          <IconButton
            aria-label="close"
            onClick={() => setDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {pendingAttachments.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={2}>
              No pending attachments
            </Typography>
          ) : (
            <List>
              {pendingAttachments.map((attachment) => (
                <ListItem key={attachment.id}>
                  <ListItemIcon>{getAttachmentIcon(attachment.type)}</ListItemIcon>
                  <ListItemText
                    primary={attachment.filename}
                    secondary={`${(attachment.size / 1024).toFixed(1)} KB`}
                  />
                  <ListItemSecondaryAction>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getStatusIcon(attachment.syncStatus)}
                      <IconButton
                        edge="end"
                        onClick={() => handleRemove(attachment.id)}
                        size="small"
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default AttachmentUpload;
