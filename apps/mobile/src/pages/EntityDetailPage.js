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
exports.EntityDetailPage = EntityDetailPage;
/**
 * Entity Detail Page
 * Shows entity details, photos, attributes, and provenance
 */
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const useEntity_1 = require("@/hooks/useEntity");
const offlineCache_1 = require("@/lib/offlineCache");
const syncEngine_1 = require("@/lib/syncEngine");
const uuid_1 = require("uuid");
const AuthContext_1 = require("@/contexts/AuthContext");
// Entity type icons
const entityIcons = {
    person: <icons_material_1.Person sx={{ fontSize: 40 }}/>,
    organization: <icons_material_1.Business sx={{ fontSize: 40 }}/>,
    location: <icons_material_1.LocationOn sx={{ fontSize: 40 }}/>,
    event: <icons_material_1.Event sx={{ fontSize: 40 }}/>,
    document: <icons_material_1.Description sx={{ fontSize: 40 }}/>,
    vehicle: <icons_material_1.Description sx={{ fontSize: 40 }}/>,
    device: <icons_material_1.Description sx={{ fontSize: 40 }}/>,
    account: <icons_material_1.Person sx={{ fontSize: 40 }}/>,
    other: <icons_material_1.Description sx={{ fontSize: 40 }}/>,
};
function TabPanel({ children, value, index }) {
    return (<div role="tabpanel" hidden={value !== index}>
      {value === index && <material_1.Box sx={{ py: 2 }}>{children}</material_1.Box>}
    </div>);
}
function PhotoGallery({ photos }) {
    const [selectedPhoto, setSelectedPhoto] = (0, react_1.useState)(null);
    if (photos.length === 0) {
        return (<material_1.Box textAlign="center" py={4}>
        <icons_material_1.PhotoCamera sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }}/>
        <material_1.Typography color="text.secondary">No photos</material_1.Typography>
      </material_1.Box>);
    }
    return (<>
      <material_1.ImageList cols={3} gap={8}>
        {photos.map((photo) => (<material_1.ImageListItem key={photo.id} onClick={() => setSelectedPhoto(photo)} sx={{ cursor: 'pointer', borderRadius: 1, overflow: 'hidden' }}>
            <img src={photo.thumbnailUrl} alt={photo.caption || 'Entity photo'} loading="lazy" style={{ aspectRatio: '1', objectFit: 'cover' }}/>
          </material_1.ImageListItem>))}
      </material_1.ImageList>

      {/* Lightbox */}
      <material_1.Dialog open={!!selectedPhoto} onClose={() => setSelectedPhoto(null)} maxWidth="lg" fullWidth>
        {selectedPhoto && (<material_1.Box sx={{ position: 'relative' }}>
            <img src={selectedPhoto.url} alt={selectedPhoto.caption || 'Entity photo'} style={{ width: '100%', display: 'block' }}/>
            {selectedPhoto.caption && (<material_1.Box sx={{ p: 2, bgcolor: 'background.paper' }}>
                <material_1.Typography>{selectedPhoto.caption}</material_1.Typography>
                <material_1.Typography variant="caption" color="text.secondary">
                  {new Date(selectedPhoto.uploadedAt).toLocaleString()}
                </material_1.Typography>
              </material_1.Box>)}
          </material_1.Box>)}
      </material_1.Dialog>
    </>);
}
function ProvenanceDisplay({ provenance }) {
    if (!provenance) {
        return (<material_1.Box textAlign="center" py={4}>
        <icons_material_1.History sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }}/>
        <material_1.Typography color="text.secondary">No provenance data</material_1.Typography>
      </material_1.Box>);
    }
    return (<material_1.Box>
      {/* Confidence */}
      <material_1.Card sx={{ mb: 2 }}>
        <material_1.CardContent>
          <material_1.Box display="flex" alignItems="center" gap={1} mb={1}>
            <icons_material_1.Verified color={provenance.confidence > 0.7 ? 'success' : 'warning'}/>
            <material_1.Typography variant="subtitle2">
              Confidence: {Math.round(provenance.confidence * 100)}%
            </material_1.Typography>
          </material_1.Box>
          <material_1.LinearProgress variant="determinate" value={provenance.confidence * 100} color={provenance.confidence > 0.7 ? 'success' : 'warning'} sx={{ height: 8, borderRadius: 4 }}/>
        </material_1.CardContent>
      </material_1.Card>

      {/* Sources */}
      <material_1.Card sx={{ mb: 2 }}>
        <material_1.CardContent>
          <material_1.Typography variant="subtitle2" gutterBottom>
            Sources ({provenance.sources.length})
          </material_1.Typography>
          <material_1.Box display="flex" gap={1} flexWrap="wrap">
            {provenance.sources.map((source, i) => (<material_1.Chip key={i} label={source} size="small" variant="outlined"/>))}
          </material_1.Box>
        </material_1.CardContent>
      </material_1.Card>

      {/* Chain */}
      {provenance.chain.length > 0 && (<material_1.Card>
          <material_1.CardContent>
            <material_1.Typography variant="subtitle2" gutterBottom>
              Provenance Chain
            </material_1.Typography>
            <material_1.List disablePadding dense>
              {provenance.chain.map((link, i) => (<material_1.ListItem key={i} disablePadding sx={{ py: 0.5 }}>
                  <material_1.ListItemText primary={link.source} secondary={`${link.method} - ${new Date(link.timestamp).toLocaleDateString()}`}/>
                </material_1.ListItem>))}
            </material_1.List>
          </material_1.CardContent>
        </material_1.Card>)}
    </material_1.Box>);
}
function AddNoteDialog({ open, onClose, onSave }) {
    const [content, setContent] = (0, react_1.useState)('');
    const handleSave = () => {
        if (content.trim()) {
            onSave(content.trim());
            setContent('');
            onClose();
        }
    };
    return (<material_1.Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <material_1.DialogTitle>Add Note</material_1.DialogTitle>
      <material_1.DialogContent>
        <material_1.TextField autoFocus multiline rows={4} fullWidth placeholder="Enter your note about this entity..." value={content} onChange={(e) => setContent(e.target.value)} sx={{ mt: 1 }}/>
      </material_1.DialogContent>
      <material_1.DialogActions>
        <material_1.Button onClick={onClose}>Cancel</material_1.Button>
        <material_1.Button onClick={handleSave} variant="contained" disabled={!content.trim()}>
          Save
        </material_1.Button>
      </material_1.DialogActions>
    </material_1.Dialog>);
}
// Main Entity Detail Page
function EntityDetailPage() {
    const { id } = (0, react_router_dom_1.useParams)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    const { entity, isLoading, fetchEntity } = (0, useEntity_1.useEntity)();
    const { user } = (0, AuthContext_1.useAuth)();
    const [notes, setNotes] = (0, react_1.useState)([]);
    const [tabValue, setTabValue] = (0, react_1.useState)(0);
    const [noteDialogOpen, setNoteDialogOpen] = (0, react_1.useState)(false);
    // Load entity
    (0, react_1.useEffect)(() => {
        if (id) {
            fetchEntity(id);
        }
    }, [id, fetchEntity]);
    // Load notes
    (0, react_1.useEffect)(() => {
        const loadNotes = async () => {
            if (id) {
                const entityNotes = await offlineCache_1.offlineCache.notes.getByEntity(id);
                setNotes(entityNotes);
            }
        };
        loadNotes();
    }, [id]);
    // Handle adding a note
    const handleAddNote = async (content) => {
        if (!id || !user)
            return;
        const note = {
            id: (0, uuid_1.v4)(),
            localId: (0, uuid_1.v4)(),
            entityId: id,
            content,
            createdAt: new Date().toISOString(),
            createdBy: user.id,
            syncStatus: 'pending',
            version: 1,
        };
        await offlineCache_1.offlineCache.notes.create(note);
        setNotes((prev) => [note, ...prev]);
        await syncEngine_1.syncEngine.queueForSync('create', 'note', note);
    };
    if (isLoading) {
        return (<material_1.Box sx={{ p: 2 }}>
        <material_1.Skeleton variant="circular" width={80} height={80} sx={{ mx: 'auto', mb: 2 }}/>
        <material_1.Skeleton variant="text" height={40} sx={{ mb: 1 }}/>
        <material_1.Skeleton variant="rounded" height={200}/>
      </material_1.Box>);
    }
    if (!entity) {
        return (<material_1.Box sx={{ p: 2, textAlign: 'center' }}>
        <material_1.Typography>Entity not found</material_1.Typography>
        <material_1.Button onClick={() => navigate(-1)}>Go Back</material_1.Button>
      </material_1.Box>);
    }
    // Get attribute entries for display
    const attributeEntries = Object.entries(entity.attributes).filter(([key]) => !['id', 'type', 'name'].includes(key));
    return (<material_1.Box sx={{ pb: 10 }}>
      {/* Header */}
      <material_1.Box sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
        }}>
        <material_1.IconButton onClick={() => navigate(-1)}>
          <icons_material_1.ArrowBack />
        </material_1.IconButton>
        <material_1.Typography variant="h6" fontWeight={600} noWrap sx={{ flex: 1 }}>
          Entity Details
        </material_1.Typography>
      </material_1.Box>

      {/* Entity Header */}
      <material_1.Box sx={{ px: 2, mb: 3, textAlign: 'center' }}>
        <material_1.Avatar src={entity.photos?.[0]?.thumbnailUrl} sx={{
            width: 80,
            height: 80,
            mx: 'auto',
            mb: 1,
            bgcolor: 'primary.main',
        }}>
          {entityIcons[entity.type]}
        </material_1.Avatar>
        <material_1.Typography variant="h5" fontWeight={600}>
          {entity.name}
        </material_1.Typography>
        <material_1.Chip label={entity.type.charAt(0).toUpperCase() + entity.type.slice(1)} size="small" sx={{ mt: 1 }}/>
        {entity.confidence !== undefined && (<material_1.Typography variant="caption" color="text.secondary" display="block" mt={1}>
            Confidence: {Math.round(entity.confidence * 100)}%
          </material_1.Typography>)}
      </material_1.Box>

      {/* Tabs */}
      <material_1.Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <material_1.Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="fullWidth">
          <material_1.Tab label="Details"/>
          <material_1.Tab label="Photos"/>
          <material_1.Tab label="Provenance"/>
        </material_1.Tabs>
      </material_1.Box>

      {/* Details Tab */}
      <TabPanel value={tabValue} index={0}>
        <material_1.Box sx={{ px: 2 }}>
          {/* Attributes */}
          <material_1.Card sx={{ mb: 2 }}>
            <material_1.CardContent>
              <material_1.Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Attributes
              </material_1.Typography>
              {attributeEntries.length > 0 ? (<material_1.List disablePadding dense>
                  {attributeEntries.map(([key, value]) => (<material_1.ListItem key={key} disablePadding sx={{ py: 0.5 }}>
                      <material_1.ListItemText primary={key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} secondary={String(value)}/>
                    </material_1.ListItem>))}
                </material_1.List>) : (<material_1.Typography variant="body2" color="text.secondary">
                  No additional attributes
                </material_1.Typography>)}
            </material_1.CardContent>
          </material_1.Card>

          {/* Notes */}
          <material_1.Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Notes ({notes.length})
          </material_1.Typography>
          {notes.length > 0 ? (notes.map((note) => (<material_1.Card key={note.id} sx={{ mb: 2 }}>
                <material_1.CardContent>
                  <material_1.Typography variant="body2">{note.content}</material_1.Typography>
                  <material_1.Box display="flex" justifyContent="space-between" mt={1}>
                    <material_1.Typography variant="caption" color="text.disabled">
                      {new Date(note.createdAt).toLocaleString()}
                    </material_1.Typography>
                    {note.syncStatus !== 'synced' && (<material_1.Chip label={note.syncStatus} size="small" color={note.syncStatus === 'error' ? 'error' : 'default'} sx={{ height: 18, fontSize: '0.65rem' }}/>)}
                  </material_1.Box>
                </material_1.CardContent>
              </material_1.Card>))) : (<material_1.Typography variant="body2" color="text.secondary">
              No notes yet
            </material_1.Typography>)}
        </material_1.Box>
      </TabPanel>

      {/* Photos Tab */}
      <TabPanel value={tabValue} index={1}>
        <material_1.Box sx={{ px: 2 }}>
          <PhotoGallery photos={entity.photos || []}/>
        </material_1.Box>
      </TabPanel>

      {/* Provenance Tab */}
      <TabPanel value={tabValue} index={2}>
        <material_1.Box sx={{ px: 2 }}>
          <ProvenanceDisplay provenance={entity.provenance}/>
        </material_1.Box>
      </TabPanel>

      {/* Add Note FAB */}
      <material_1.Fab color="primary" aria-label="add note" sx={{
            position: 'fixed',
            bottom: 80,
            right: 16,
        }} onClick={() => setNoteDialogOpen(true)}>
        <icons_material_1.Add />
      </material_1.Fab>

      {/* Add Note Dialog */}
      <AddNoteDialog open={noteDialogOpen} onClose={() => setNoteDialogOpen(false)} onSave={handleAddNote}/>
    </material_1.Box>);
}
exports.default = EntityDetailPage;
