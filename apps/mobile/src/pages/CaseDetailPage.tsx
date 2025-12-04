/**
 * Case Detail Page
 * Shows case summary, key entities, map snapshot, and allows note taking
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
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Divider,
  Tab,
  Tabs,
} from '@mui/material';
import {
  ArrowBack,
  Person,
  Business,
  LocationOn,
  Event,
  Description,
  Add,
  Map,
  Notes,
  ChevronRight,
} from '@mui/icons-material';
import { useCases } from '@/hooks/useCases';
import { useTasks } from '@/hooks/useTasks';
import { getPriorityColor } from '@/theme';
import { offlineCache } from '@/lib/offlineCache';
import { syncEngine } from '@/lib/syncEngine';
import { v4 as uuidv4 } from 'uuid';
import type { Case, Entity, Note, EntityType } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

// Entity type icons
const entityIcons: Record<EntityType, React.ReactNode> = {
  person: <Person />,
  organization: <Business />,
  location: <LocationOn />,
  event: <Event />,
  document: <Description />,
  vehicle: <Description />,
  device: <Description />,
  account: <Person />,
  other: <Description />,
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

// Entity list item
interface EntityItemProps {
  entity: { id: string; type: EntityType; name: string; thumbnailUrl?: string };
  onClick: () => void;
}

function EntityItem({ entity, onClick }: EntityItemProps) {
  return (
    <ListItem
      onClick={onClick}
      sx={{ borderRadius: 2, cursor: 'pointer' }}
    >
      <ListItemAvatar>
        <Avatar src={entity.thumbnailUrl}>
          {entityIcons[entity.type] || entity.name.charAt(0)}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={entity.name}
        secondary={entity.type.charAt(0).toUpperCase() + entity.type.slice(1)}
      />
      <ChevronRight color="action" />
    </ListItem>
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
          placeholder="Enter your note..."
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

// Main Case Detail Page
export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getCase } = useCases();
  const { getByCase: getTasksByCase } = useTasks();
  const { user } = useAuth();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);

  // Load case data
  useEffect(() => {
    const loadCase = async () => {
      if (!id) return;

      setIsLoading(true);
      try {
        const data = await getCase(id);
        setCaseData(data);

        // Load notes for this case
        const caseNotes = await offlineCache.notes.getByCase(id);
        setNotes(caseNotes);
      } catch (error) {
        console.error('Failed to load case:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCase();
  }, [id, getCase]);

  // Handle adding a note
  const handleAddNote = async (content: string) => {
    if (!id || !user) return;

    const note: Note = {
      id: uuidv4(),
      localId: uuidv4(),
      caseId: id,
      content,
      createdAt: new Date().toISOString(),
      createdBy: user.id,
      syncStatus: 'pending',
      version: 1,
    };

    // Save locally
    await offlineCache.notes.create(note);
    setNotes((prev) => [note, ...prev]);

    // Queue for sync
    await syncEngine.queueForSync('create', 'note', note);
  };

  // Get tasks for this case
  const caseTasks = id ? getTasksByCase(id) : [];

  if (isLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="rounded" height={200} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={100} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={300} />
      </Box>
    );
  }

  if (!caseData) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography>Case not found</Typography>
        <Button onClick={() => navigate('/cases')}>Back to Cases</Button>
      </Box>
    );
  }

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
        <IconButton onClick={() => navigate('/cases')}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h6" fontWeight={600} noWrap sx={{ flex: 1 }}>
          {caseData.title}
        </Typography>
      </Box>

      {/* Status and Priority */}
      <Box sx={{ px: 2, mb: 2, display: 'flex', gap: 1 }}>
        <Chip
          label={caseData.status.replace('_', ' ')}
          size="small"
          color="primary"
        />
        <Chip
          label={caseData.priority}
          size="small"
          sx={{
            bgcolor: getPriorityColor(caseData.priority),
            color: 'white',
          }}
        />
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          variant="fullWidth"
        >
          <Tab label="Overview" />
          <Tab label="Entities" />
          <Tab label="Notes" />
        </Tabs>
      </Box>

      {/* Overview Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ px: 2 }}>
          {/* Summary */}
          {caseData.summary && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Summary
                </Typography>
                <Typography variant="body2">{caseData.summary}</Typography>
              </CardContent>
            </Card>
          )}

          {/* Map Snapshot */}
          {caseData.mapSnapshot && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Map color="action" />
                  <Typography variant="subtitle2" color="text.secondary">
                    Location
                  </Typography>
                </Box>
                {caseData.mapSnapshot.thumbnailUrl ? (
                  <Box
                    component="img"
                    src={caseData.mapSnapshot.thumbnailUrl}
                    alt="Map"
                    sx={{
                      width: '100%',
                      height: 150,
                      objectFit: 'cover',
                      borderRadius: 1,
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      height: 150,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography color="text.secondary">
                      {caseData.mapSnapshot.markers.length} locations
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* Last Brief */}
          {caseData.lastBrief && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Last Brief
                </Typography>
                <Typography variant="body2" fontWeight={500} gutterBottom>
                  {caseData.lastBrief.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {caseData.lastBrief.summary}
                </Typography>
                <Typography variant="caption" color="text.disabled" display="block" mt={1}>
                  {new Date(caseData.lastBrief.createdAt).toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Pending Tasks */}
          {caseTasks.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Pending Tasks ({caseTasks.filter((t) => t.status !== 'completed').length})
                </Typography>
                <List disablePadding dense>
                  {caseTasks
                    .filter((t) => t.status !== 'completed')
                    .slice(0, 3)
                    .map((task) => (
                      <ListItem key={task.id} disablePadding sx={{ py: 0.5 }}>
                        <ListItemText
                          primary={task.title}
                          secondary={task.dueDate && `Due: ${new Date(task.dueDate).toLocaleDateString()}`}
                        />
                      </ListItem>
                    ))}
                </List>
              </CardContent>
            </Card>
          )}
        </Box>
      </TabPanel>

      {/* Entities Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ px: 2 }}>
          {caseData.keyEntities && caseData.keyEntities.length > 0 ? (
            <List disablePadding>
              {caseData.keyEntities.map((entity) => (
                <EntityItem
                  key={entity.id}
                  entity={entity}
                  onClick={() => navigate(`/entities/${entity.id}`)}
                />
              ))}
            </List>
          ) : (
            <Box textAlign="center" py={4}>
              <Person sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">No entities</Typography>
            </Box>
          )}
        </Box>
      </TabPanel>

      {/* Notes Tab */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ px: 2 }}>
          {notes.length > 0 ? (
            <List disablePadding>
              {notes.map((note) => (
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
              ))}
            </List>
          ) : (
            <Box textAlign="center" py={4}>
              <Notes sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">No notes yet</Typography>
            </Box>
          )}
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

export default CaseDetailPage;
