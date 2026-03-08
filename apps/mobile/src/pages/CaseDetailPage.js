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
exports.CaseDetailPage = CaseDetailPage;
/**
 * Case Detail Page
 * Shows case summary, key entities, map snapshot, and allows note taking
 */
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const useCases_1 = require("@/hooks/useCases");
const useTasks_1 = require("@/hooks/useTasks");
const theme_1 = require("@/theme");
const offlineCache_1 = require("@/lib/offlineCache");
const syncEngine_1 = require("@/lib/syncEngine");
const uuid_1 = require("uuid");
const AuthContext_1 = require("@/contexts/AuthContext");
// Entity type icons
const entityIcons = {
    person: <icons_material_1.Person />,
    organization: <icons_material_1.Business />,
    location: <icons_material_1.LocationOn />,
    event: <icons_material_1.Event />,
    document: <icons_material_1.Description />,
    vehicle: <icons_material_1.Description />,
    device: <icons_material_1.Description />,
    account: <icons_material_1.Person />,
    other: <icons_material_1.Description />,
};
function TabPanel({ children, value, index }) {
    return (<div role="tabpanel" hidden={value !== index}>
      {value === index && <material_1.Box sx={{ py: 2 }}>{children}</material_1.Box>}
    </div>);
}
function EntityItem({ entity, onClick }) {
    return (<material_1.ListItem onClick={onClick} sx={{ borderRadius: 2, cursor: 'pointer' }}>
      <material_1.ListItemAvatar>
        <material_1.Avatar src={entity.thumbnailUrl}>
          {entityIcons[entity.type] || entity.name.charAt(0)}
        </material_1.Avatar>
      </material_1.ListItemAvatar>
      <material_1.ListItemText primary={entity.name} secondary={entity.type.charAt(0).toUpperCase() + entity.type.slice(1)}/>
      <icons_material_1.ChevronRight color="action"/>
    </material_1.ListItem>);
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
        <material_1.TextField autoFocus multiline rows={4} fullWidth placeholder="Enter your note..." value={content} onChange={(e) => setContent(e.target.value)} sx={{ mt: 1 }}/>
      </material_1.DialogContent>
      <material_1.DialogActions>
        <material_1.Button onClick={onClose}>Cancel</material_1.Button>
        <material_1.Button onClick={handleSave} variant="contained" disabled={!content.trim()}>
          Save
        </material_1.Button>
      </material_1.DialogActions>
    </material_1.Dialog>);
}
// Main Case Detail Page
function CaseDetailPage() {
    const { id } = (0, react_router_dom_1.useParams)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    const { getCase } = (0, useCases_1.useCases)();
    const { getByCase: getTasksByCase } = (0, useTasks_1.useTasks)();
    const { user } = (0, AuthContext_1.useAuth)();
    const [caseData, setCaseData] = (0, react_1.useState)(null);
    const [notes, setNotes] = (0, react_1.useState)([]);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [tabValue, setTabValue] = (0, react_1.useState)(0);
    const [noteDialogOpen, setNoteDialogOpen] = (0, react_1.useState)(false);
    // Load case data
    (0, react_1.useEffect)(() => {
        const loadCase = async () => {
            if (!id)
                return;
            setIsLoading(true);
            try {
                const data = await getCase(id);
                setCaseData(data);
                // Load notes for this case
                const caseNotes = await offlineCache_1.offlineCache.notes.getByCase(id);
                setNotes(caseNotes);
            }
            catch (error) {
                console.error('Failed to load case:', error);
            }
            finally {
                setIsLoading(false);
            }
        };
        loadCase();
    }, [id, getCase]);
    // Handle adding a note
    const handleAddNote = async (content) => {
        if (!id || !user)
            return;
        const note = {
            id: (0, uuid_1.v4)(),
            localId: (0, uuid_1.v4)(),
            caseId: id,
            content,
            createdAt: new Date().toISOString(),
            createdBy: user.id,
            syncStatus: 'pending',
            version: 1,
        };
        // Save locally
        await offlineCache_1.offlineCache.notes.create(note);
        setNotes((prev) => [note, ...prev]);
        // Queue for sync
        await syncEngine_1.syncEngine.queueForSync('create', 'note', note);
    };
    // Get tasks for this case
    const caseTasks = id ? getTasksByCase(id) : [];
    if (isLoading) {
        return (<material_1.Box sx={{ p: 2 }}>
        <material_1.Skeleton variant="rounded" height={200} sx={{ mb: 2 }}/>
        <material_1.Skeleton variant="rounded" height={100} sx={{ mb: 2 }}/>
        <material_1.Skeleton variant="rounded" height={300}/>
      </material_1.Box>);
    }
    if (!caseData) {
        return (<material_1.Box sx={{ p: 2, textAlign: 'center' }}>
        <material_1.Typography>Case not found</material_1.Typography>
        <material_1.Button onClick={() => navigate('/cases')}>Back to Cases</material_1.Button>
      </material_1.Box>);
    }
    return (<material_1.Box sx={{ pb: 10 }}>
      {/* Header */}
      <material_1.Box sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
        }}>
        <material_1.IconButton onClick={() => navigate('/cases')}>
          <icons_material_1.ArrowBack />
        </material_1.IconButton>
        <material_1.Typography variant="h6" fontWeight={600} noWrap sx={{ flex: 1 }}>
          {caseData.title}
        </material_1.Typography>
      </material_1.Box>

      {/* Status and Priority */}
      <material_1.Box sx={{ px: 2, mb: 2, display: 'flex', gap: 1 }}>
        <material_1.Chip label={caseData.status.replace('_', ' ')} size="small" color="primary"/>
        <material_1.Chip label={caseData.priority} size="small" sx={{
            bgcolor: (0, theme_1.getPriorityColor)(caseData.priority),
            color: 'white',
        }}/>
      </material_1.Box>

      {/* Tabs */}
      <material_1.Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <material_1.Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="fullWidth">
          <material_1.Tab label="Overview"/>
          <material_1.Tab label="Entities"/>
          <material_1.Tab label="Notes"/>
        </material_1.Tabs>
      </material_1.Box>

      {/* Overview Tab */}
      <TabPanel value={tabValue} index={0}>
        <material_1.Box sx={{ px: 2 }}>
          {/* Summary */}
          {caseData.summary && (<material_1.Card sx={{ mb: 2 }}>
              <material_1.CardContent>
                <material_1.Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Summary
                </material_1.Typography>
                <material_1.Typography variant="body2">{caseData.summary}</material_1.Typography>
              </material_1.CardContent>
            </material_1.Card>)}

          {/* Map Snapshot */}
          {caseData.mapSnapshot && (<material_1.Card sx={{ mb: 2 }}>
              <material_1.CardContent>
                <material_1.Box display="flex" alignItems="center" gap={1} mb={1}>
                  <icons_material_1.Map color="action"/>
                  <material_1.Typography variant="subtitle2" color="text.secondary">
                    Location
                  </material_1.Typography>
                </material_1.Box>
                {caseData.mapSnapshot.thumbnailUrl ? (<material_1.Box component="img" src={caseData.mapSnapshot.thumbnailUrl} alt="Map" sx={{
                    width: '100%',
                    height: 150,
                    objectFit: 'cover',
                    borderRadius: 1,
                }}/>) : (<material_1.Box sx={{
                    width: '100%',
                    height: 150,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <material_1.Typography color="text.secondary">
                      {caseData.mapSnapshot.markers.length} locations
                    </material_1.Typography>
                  </material_1.Box>)}
              </material_1.CardContent>
            </material_1.Card>)}

          {/* Last Brief */}
          {caseData.lastBrief && (<material_1.Card sx={{ mb: 2 }}>
              <material_1.CardContent>
                <material_1.Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Last Brief
                </material_1.Typography>
                <material_1.Typography variant="body2" fontWeight={500} gutterBottom>
                  {caseData.lastBrief.title}
                </material_1.Typography>
                <material_1.Typography variant="body2" color="text.secondary">
                  {caseData.lastBrief.summary}
                </material_1.Typography>
                <material_1.Typography variant="caption" color="text.disabled" display="block" mt={1}>
                  {new Date(caseData.lastBrief.createdAt).toLocaleDateString()}
                </material_1.Typography>
              </material_1.CardContent>
            </material_1.Card>)}

          {/* Pending Tasks */}
          {caseTasks.length > 0 && (<material_1.Card>
              <material_1.CardContent>
                <material_1.Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Pending Tasks ({caseTasks.filter((t) => t.status !== 'completed').length})
                </material_1.Typography>
                <material_1.List disablePadding dense>
                  {caseTasks
                .filter((t) => t.status !== 'completed')
                .slice(0, 3)
                .map((task) => (<material_1.ListItem key={task.id} disablePadding sx={{ py: 0.5 }}>
                        <material_1.ListItemText primary={task.title} secondary={task.dueDate && `Due: ${new Date(task.dueDate).toLocaleDateString()}`}/>
                      </material_1.ListItem>))}
                </material_1.List>
              </material_1.CardContent>
            </material_1.Card>)}
        </material_1.Box>
      </TabPanel>

      {/* Entities Tab */}
      <TabPanel value={tabValue} index={1}>
        <material_1.Box sx={{ px: 2 }}>
          {caseData.keyEntities && caseData.keyEntities.length > 0 ? (<material_1.List disablePadding>
              {caseData.keyEntities.map((entity) => (<EntityItem key={entity.id} entity={entity} onClick={() => navigate(`/entities/${entity.id}`)}/>))}
            </material_1.List>) : (<material_1.Box textAlign="center" py={4}>
              <icons_material_1.Person sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }}/>
              <material_1.Typography color="text.secondary">No entities</material_1.Typography>
            </material_1.Box>)}
        </material_1.Box>
      </TabPanel>

      {/* Notes Tab */}
      <TabPanel value={tabValue} index={2}>
        <material_1.Box sx={{ px: 2 }}>
          {notes.length > 0 ? (<material_1.List disablePadding>
              {notes.map((note) => (<material_1.Card key={note.id} sx={{ mb: 2 }}>
                  <material_1.CardContent>
                    <material_1.Typography variant="body2">{note.content}</material_1.Typography>
                    <material_1.Box display="flex" justifyContent="space-between" mt={1}>
                      <material_1.Typography variant="caption" color="text.disabled">
                        {new Date(note.createdAt).toLocaleString()}
                      </material_1.Typography>
                      {note.syncStatus !== 'synced' && (<material_1.Chip label={note.syncStatus} size="small" color={note.syncStatus === 'error' ? 'error' : 'default'} sx={{ height: 18, fontSize: '0.65rem' }}/>)}
                    </material_1.Box>
                  </material_1.CardContent>
                </material_1.Card>))}
            </material_1.List>) : (<material_1.Box textAlign="center" py={4}>
              <icons_material_1.Notes sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }}/>
              <material_1.Typography color="text.secondary">No notes yet</material_1.Typography>
            </material_1.Box>)}
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
exports.default = CaseDetailPage;
