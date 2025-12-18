/**
 * Entity Detail Page
 * Shows entity details, photos, attributes, and provenance
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Skeleton,
  IconButton,
  Avatar,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  ImageList,
  ImageListItem,
  Dialog,
  Fab,
  TextField,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  LinearProgress,
} from '@mui/material';
import {
  ArrowBack,
  Person,
  Business,
  LocationOn,
  Event,
  Description,
  Add,
  PhotoCamera,
  Verified,
  History,
} from '@mui/icons-material';
import { useEntity } from '@/hooks/useEntity';
import { offlineCache } from '@/lib/offlineCache';
import { syncEngine } from '@/lib/syncEngine';
import { v4 as uuidv4 } from 'uuid';
import type { Entity, EntityType, Note, EntityPhoto } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

// Entity type icons
const entityIcons: Record<EntityType, React.ReactNode> = {
  person: <Person sx={{ fontSize: 40 }} />,
  organization: <Business sx={{ fontSize: 40 }} />,
  location: <LocationOn sx={{ fontSize: 40 }} />,
  event: <Event sx={{ fontSize: 40 }} />,
  document: <Description sx={{ fontSize: 40 }} />,
  vehicle: <Description sx={{ fontSize: 40 }} />,
  device: <Description sx={{ fontSize: 40 }} />,
  account: <Person sx={{ fontSize: 40 }} />,
  other: <Description sx={{ fontSize: 40 }} />,
};

// Tab panel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

// Photo gallery with lightbox
interface PhotoGalleryProps {
  photos: EntityPhoto[];
}

function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<EntityPhoto | null>(null);

  if (photos.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <PhotoCamera sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
        <Typography color="text.secondary">No photos</Typography>
      </Box>
    );
  }

  return (
    <>
      <ImageList cols={3} gap={8}>
        {photos.map((photo) => (
          <ImageListItem
            key={photo.id}
            onClick={() => setSelectedPhoto(photo)}
            sx={{ cursor: 'pointer', borderRadius: 1, overflow: 'hidden' }}
          >
            <img
              src={photo.thumbnailUrl}
              alt={photo.caption || 'Entity photo'}
              loading="lazy"
              style={{ aspectRatio: '1', objectFit: 'cover' }}
            />
          </ImageListItem>
        ))}
      </ImageList>

      {/* Lightbox */}
      <Dialog
        open={!!selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        maxWidth="lg"
        fullWidth
      >
        {selectedPhoto && (
          <Box sx={{ position: 'relative' }}>
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.caption || 'Entity photo'}
              style={{ width: '100%', display: 'block' }}
            />
            {selectedPhoto.caption && (
              <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
                <Typography>{selectedPhoto.caption}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(selectedPhoto.uploadedAt).toLocaleString()}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Dialog>
    </>
  );
}

// Provenance display
interface ProvenanceDisplayProps {
  provenance: Entity['provenance'];
}

function ProvenanceDisplay({ provenance }: ProvenanceDisplayProps) {
  if (!provenance) {
    return (
      <Box textAlign="center" py={4}>
        <History sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
        <Typography color="text.secondary">No provenance data</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Confidence */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <Verified color={provenance.confidence > 0.7 ? 'success' : 'warning'} />
            <Typography variant="subtitle2">
              Confidence: {Math.round(provenance.confidence * 100)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={provenance.confidence * 100}
            color={provenance.confidence > 0.7 ? 'success' : 'warning'}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </CardContent>
      </Card>

      {/* Sources */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Sources ({provenance.sources.length})
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            {provenance.sources.map((source, i) => (
              <Chip key={i} label={source} size="small" variant="outlined" />
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Chain */}
      {provenance.chain.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Provenance Chain
            </Typography>
            <List disablePadding dense>
              {provenance.chain.map((link, i) => (
                <ListItem key={i} disablePadding sx={{ py: 0.5 }}>
                  <ListItemText
                    primary={link.source}
                    secondary={`${link.method} - ${new Date(link.timestamp).toLocaleDateString()}`}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

// Add Note Dialog
interface AddNoteDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (content: string) => void;
}

function AddNoteDialog({ open, onClose, onSave }: AddNoteDialogProps) {
  const [content, setContent] = useState('');

  const handleSave = () => {
    if (content.trim()) {
      onSave(content.trim());
      setContent('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add Note</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          multiline
          rows={4}
          fullWidth
          placeholder="Enter your note about this entity..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={!content.trim()}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Main Entity Detail Page
export function EntityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { entity, isLoading, fetchEntity } = useEntity();
  const { user } = useAuth();

  const [notes, setNotes] = useState<Note[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);

  // Load entity
  useEffect(() => {
    if (id) {
      fetchEntity(id);
    }
  }, [id, fetchEntity]);

  // Load notes
  useEffect(() => {
    const loadNotes = async () => {
      if (id) {
        const entityNotes = await offlineCache.notes.getByEntity(id);
        setNotes(entityNotes);
      }
    };
    loadNotes();
  }, [id]);

  // Handle adding a note
  const handleAddNote = async (content: string) => {
    if (!id || !user) return;

    const note: Note = {
      id: uuidv4(),
      localId: uuidv4(),
      entityId: id,
      content,
      createdAt: new Date().toISOString(),
      createdBy: user.id,
      syncStatus: 'pending',
      version: 1,
    };

    await offlineCache.notes.create(note);
    setNotes((prev) => [note, ...prev]);
    await syncEngine.queueForSync('create', 'note', note);
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="circular" width={80} height={80} sx={{ mx: 'auto', mb: 2 }} />
        <Skeleton variant="text" height={40} sx={{ mb: 1 }} />
        <Skeleton variant="rounded" height={200} />
      </Box>
    );
  }

  if (!entity) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography>Entity not found</Typography>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </Box>
    );
  }

  // Get attribute entries for display
  const attributeEntries = Object.entries(entity.attributes).filter(
    ([key]) => !['id', 'type', 'name'].includes(key)
  );

  return (
    <Box sx={{ pb: 10 }}>
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h6" fontWeight={600} noWrap sx={{ flex: 1 }}>
          Entity Details
        </Typography>
      </Box>

      {/* Entity Header */}
      <Box sx={{ px: 2, mb: 3, textAlign: 'center' }}>
        <Avatar
          src={entity.photos?.[0]?.thumbnailUrl}
          sx={{
            width: 80,
            height: 80,
            mx: 'auto',
            mb: 1,
            bgcolor: 'primary.main',
          }}
        >
          {entityIcons[entity.type]}
        </Avatar>
        <Typography variant="h5" fontWeight={600}>
          {entity.name}
        </Typography>
        <Chip
          label={entity.type.charAt(0).toUpperCase() + entity.type.slice(1)}
          size="small"
          sx={{ mt: 1 }}
        />
        {entity.confidence !== undefined && (
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
            Confidence: {Math.round(entity.confidence * 100)}%
          </Typography>
        )}
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          variant="fullWidth"
        >
          <Tab label="Details" />
          <Tab label="Photos" />
          <Tab label="Provenance" />
        </Tabs>
      </Box>

      {/* Details Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ px: 2 }}>
          {/* Attributes */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Attributes
              </Typography>
              {attributeEntries.length > 0 ? (
                <List disablePadding dense>
                  {attributeEntries.map(([key, value]) => (
                    <ListItem key={key} disablePadding sx={{ py: 0.5 }}>
                      <ListItemText
                        primary={key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        secondary={String(value)}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No additional attributes
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Notes ({notes.length})
          </Typography>
          {notes.length > 0 ? (
            notes.map((note) => (
              <Card key={note.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="body2">{note.content}</Typography>
                  <Box display="flex" justifyContent="space-between" mt={1}>
                    <Typography variant="caption" color="text.disabled">
                      {new Date(note.createdAt).toLocaleString()}
                    </Typography>
                    {note.syncStatus !== 'synced' && (
                      <Chip
                        label={note.syncStatus}
                        size="small"
                        color={note.syncStatus === 'error' ? 'error' : 'default'}
                        sx={{ height: 18, fontSize: '0.65rem' }}
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              No notes yet
            </Typography>
          )}
        </Box>
      </TabPanel>

      {/* Photos Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ px: 2 }}>
          <PhotoGallery photos={entity.photos || []} />
        </Box>
      </TabPanel>

      {/* Provenance Tab */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ px: 2 }}>
          <ProvenanceDisplay provenance={entity.provenance} />
        </Box>
      </TabPanel>

      {/* Add Note FAB */}
      <Fab
        color="primary"
        aria-label="add note"
        sx={{
          position: 'fixed',
          bottom: 80,
          right: 16,
        }}
        onClick={() => setNoteDialogOpen(true)}
      >
        <Add />
      </Fab>

      {/* Add Note Dialog */}
      <AddNoteDialog
        open={noteDialogOpen}
        onClose={() => setNoteDialogOpen(false)}
        onSave={handleAddNote}
      />
    </Box>
  );
}

export default EntityDetailPage;
