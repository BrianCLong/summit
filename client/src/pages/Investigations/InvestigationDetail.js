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
exports.default = InvestigationDetail;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const Grid_1 = __importDefault(require("@mui/material/Grid"));
const lab_1 = require("@mui/lab");
const icons_material_1 = require("@mui/icons-material");
const react_router_dom_1 = require("react-router-dom");
const useSafeQuery_1 = require("../../hooks/useSafeQuery");
const AuthContext_1 = require("../../context/AuthContext");
function TabPanel({ children, value, index }) {
    return (<div role="tabpanel" hidden={value !== index}>
      {value === index && <material_1.Box sx={{ py: 3 }}>{children}</material_1.Box>}
    </div>);
}
const getStatusColor = (status) => {
    switch (status) {
        case 'OPEN':
            return 'info';
        case 'IN_PROGRESS':
            return 'warning';
        case 'REVIEW':
            return 'primary';
        case 'CLOSED':
            return 'success';
        case 'ARCHIVED':
            return 'default';
        default:
            return 'default';
    }
};
const getPriorityColor = (priority) => {
    switch (priority) {
        case 'CRITICAL':
            return 'error';
        case 'HIGH':
            return 'warning';
        case 'MEDIUM':
            return 'info';
        case 'LOW':
            return 'success';
        default:
            return 'default';
    }
};
const getClassificationColor = (classification) => {
    switch (classification) {
        case 'TOP_SECRET':
            return '#FF0000';
        case 'SECRET':
            return '#FFA500';
        case 'CONFIDENTIAL':
            return '#0000FF';
        case 'UNCLASSIFIED':
            return '#008000';
        default:
            return '#008000';
    }
};
function InvestigationDetail() {
    const { id } = (0, react_router_dom_1.useParams)();
    const { hasRole } = (0, AuthContext_1.useAuth)();
    const isViewer = hasRole('viewer');
    const [selectedTab, setSelectedTab] = (0, react_1.useState)(0);
    const [addEvidenceOpen, setAddEvidenceOpen] = (0, react_1.useState)(false);
    const [addNoteOpen, setAddNoteOpen] = (0, react_1.useState)(false);
    const [addEntityOpen, setAddEntityOpen] = (0, react_1.useState)(false);
    const [entityName, setEntityName] = (0, react_1.useState)('');
    const [enrichResult, setEnrichResult] = (0, react_1.useState)('');
    const { data: investigation, loading } = (0, useSafeQuery_1.useSafeQuery)({
        queryKey: `investigation_${id}`,
        mock: {
            id: id || 'INV-2025-089',
            title: 'Financial Fraud Investigation - TechCorp Subsidiary',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            classification: 'CONFIDENTIAL',
            createdAt: '2025-08-25T09:00:00Z',
            lastUpdated: '2025-08-27T03:45:00Z',
            assignedTo: ['John Smith', 'Sarah Johnson', 'Mike Davis'],
            description: 'Investigation into suspected financial fraud involving shell companies and wire transfers through offshore accounts. Multiple entities identified with suspicious transaction patterns exceeding $2.5M in aggregate.',
            stage: 'ANALYZE',
            progress: 65,
            evidence: [
                {
                    id: 'E001',
                    name: 'Bank Transaction Records Q3 2025.xlsx',
                    type: 'DOCUMENT',
                    size: '2.4 MB',
                    hash: 'sha256:a1b2c3d4e5f6...',
                    addedBy: 'John Smith',
                    addedAt: '2025-08-25T10:30:00Z',
                    chain: [
                        {
                            actor: 'John Smith',
                            action: 'Added to investigation',
                            timestamp: '2025-08-25T10:30:00Z',
                            location: 'Evidence Room A',
                        },
                        {
                            actor: 'Sarah Johnson',
                            action: 'Reviewed and verified',
                            timestamp: '2025-08-25T14:20:00Z',
                        },
                    ],
                },
                {
                    id: 'E002',
                    name: 'Email Communications Archive.pst',
                    type: 'DIGITAL',
                    size: '156 MB',
                    hash: 'sha256:f6e5d4c3b2a1...',
                    addedBy: 'Mike Davis',
                    addedAt: '2025-08-26T08:15:00Z',
                    chain: [
                        {
                            actor: 'Mike Davis',
                            action: 'Extracted from server',
                            timestamp: '2025-08-26T08:15:00Z',
                            location: 'IT Forensics Lab',
                        },
                        {
                            actor: 'Digital Forensics Team',
                            action: 'Hash verified',
                            timestamp: '2025-08-26T09:45:00Z',
                        },
                    ],
                },
                {
                    id: 'E003',
                    name: 'Witness Statement - CFO Interview',
                    type: 'TESTIMONY',
                    size: '1.2 MB',
                    hash: 'sha256:9a8b7c6d5e4f...',
                    addedBy: 'Sarah Johnson',
                    addedAt: '2025-08-27T02:00:00Z',
                    chain: [
                        {
                            actor: 'Sarah Johnson',
                            action: 'Interview conducted',
                            timestamp: '2025-08-27T02:00:00Z',
                            location: 'Conference Room B',
                        },
                    ],
                },
            ],
            entities: [
                {
                    id: 'P001',
                    name: 'Robert Chen',
                    type: 'PERSON',
                    risk: 85,
                    connections: 12,
                },
                {
                    id: 'O001',
                    name: 'Offshore Holdings LLC',
                    type: 'ORGANIZATION',
                    risk: 92,
                    connections: 8,
                },
                {
                    id: 'O002',
                    name: 'TechCorp Financial Services',
                    type: 'ORGANIZATION',
                    risk: 45,
                    connections: 24,
                },
                {
                    id: 'L001',
                    name: 'Cayman Islands Office',
                    type: 'LOCATION',
                    risk: 70,
                    connections: 6,
                },
            ],
            timeline: [
                {
                    id: 'T001',
                    type: 'CREATED',
                    description: 'Investigation opened following compliance alert',
                    actor: 'Compliance Team',
                    timestamp: '2025-08-25T09:00:00Z',
                },
                {
                    id: 'T002',
                    type: 'ASSIGNED',
                    description: 'Case assigned to Financial Crimes Unit',
                    actor: 'Case Manager',
                    timestamp: '2025-08-25T09:30:00Z',
                },
                {
                    id: 'T003',
                    type: 'EVIDENCE_ADDED',
                    description: 'Bank transaction records added to evidence',
                    actor: 'John Smith',
                    timestamp: '2025-08-25T10:30:00Z',
                },
                {
                    id: 'T004',
                    type: 'STATUS_CHANGED',
                    description: 'Status changed from OPEN to IN_PROGRESS',
                    actor: 'Lead Investigator',
                    timestamp: '2025-08-25T11:00:00Z',
                },
            ],
            notes: [
                {
                    id: 'N001',
                    author: 'John Smith',
                    content: 'Initial analysis reveals pattern of structured transactions just below CTR thresholds. Multiple wire transfers to same beneficial owner through different shell entities.',
                    timestamp: '2025-08-25T16:20:00Z',
                    classification: 'CONFIDENTIAL',
                },
                {
                    id: 'N002',
                    author: 'Sarah Johnson',
                    content: 'CFO interview reveals knowledge of unusual transaction patterns but claims no direct involvement. Recommended further investigation into accounting practices.',
                    timestamp: '2025-08-27T03:15:00Z',
                    classification: 'CONFIDENTIAL',
                },
            ],
            tags: [
                'Financial Fraud',
                'Money Laundering',
                'Shell Companies',
                'Offshore Banking',
                'CTR Evasion',
            ],
        },
        deps: [id],
    });
    if (loading || !investigation) {
        return (<material_1.Box sx={{ m: 2 }}>
        <material_1.LinearProgress />
        <material_1.Typography sx={{ mt: 2 }}>Loading investigation...</material_1.Typography>
      </material_1.Box>);
    }
    return (<material_1.Box sx={{ m: 2 }}>
      {/* Investigation Header */}
      <material_1.Card sx={{ mb: 3, borderRadius: 3 }}>
        <material_1.CardContent>
          <material_1.Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <material_1.Box sx={{ flex: 1 }}>
              <material_1.Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <icons_material_1.Gavel sx={{ fontSize: 32, color: 'primary.main' }}/>
                <material_1.Box>
                  <material_1.Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {investigation.title}
                  </material_1.Typography>
                  <material_1.Typography variant="subtitle1" color="text.secondary">
                    Case ID: {investigation.id}
                  </material_1.Typography>
                </material_1.Box>
              </material_1.Stack>

              <material_1.Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <material_1.Chip label={investigation.status} color={getStatusColor(investigation.status)} variant="filled"/>
                <material_1.Chip label={investigation.priority} color={getPriorityColor(investigation.priority)} variant="outlined"/>
                <material_1.Chip label={investigation.classification} sx={{
            backgroundColor: getClassificationColor(investigation.classification),
            color: 'white',
            fontWeight: 'bold',
        }}/>
                <material_1.Chip label={investigation.stage} variant="outlined"/>
              </material_1.Stack>

              <material_1.Typography variant="body1" paragraph>
                {investigation.description}
              </material_1.Typography>

              <material_1.Stack direction="row" spacing={4} sx={{ mb: 2 }}>
                <material_1.Box>
                  <material_1.Typography variant="caption" color="text.secondary">
                    Created
                  </material_1.Typography>
                  <material_1.Typography variant="body2">
                    {new Date(investigation.createdAt).toLocaleDateString()}
                  </material_1.Typography>
                </material_1.Box>
                <material_1.Box>
                  <material_1.Typography variant="caption" color="text.secondary">
                    Last Updated
                  </material_1.Typography>
                  <material_1.Typography variant="body2">
                    {new Date(investigation.lastUpdated).toLocaleDateString()}
                  </material_1.Typography>
                </material_1.Box>
                <material_1.Box>
                  <material_1.Typography variant="caption" color="text.secondary">
                    Progress
                  </material_1.Typography>
                  <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <material_1.LinearProgress variant="determinate" value={investigation.progress} sx={{ width: 100, height: 8, borderRadius: 4 }}/>
                    <material_1.Typography variant="body2">
                      {investigation.progress}%
                    </material_1.Typography>
                  </material_1.Box>
                </material_1.Box>
              </material_1.Stack>

              <material_1.Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                {investigation.tags.map((tag) => (<material_1.Chip key={tag} label={tag} size="small" variant="outlined"/>))}
              </material_1.Stack>
            </material_1.Box>

            <material_1.Stack spacing={2} alignItems="flex-end">
              <material_1.Stack direction="row" spacing={1}>
                <material_1.Tooltip title="Share Investigation">
                  <material_1.IconButton>
                    <icons_material_1.Share />
                  </material_1.IconButton>
                </material_1.Tooltip>
                <material_1.Tooltip title="Export Report">
                  <material_1.IconButton>
                    <icons_material_1.Download />
                  </material_1.IconButton>
                </material_1.Tooltip>
                <material_1.Tooltip title="Edit Investigation">
                  <material_1.IconButton>
                    <icons_material_1.Edit />
                  </material_1.IconButton>
                </material_1.Tooltip>
              </material_1.Stack>

              <material_1.Box>
                <material_1.Typography variant="caption" color="text.secondary">
                  Assigned Team
                </material_1.Typography>
                <material_1.Stack direction="row" spacing={1}>
                  {investigation.assignedTo.map((person) => (<material_1.Avatar key={person} sx={{ width: 32, height: 32 }}>
                      {person
                .split(' ')
                .map((n) => n[0])
                .join('')}
                    </material_1.Avatar>))}
                  <material_1.IconButton size="small" sx={{ width: 32, height: 32 }}>
                    <icons_material_1.Add />
                  </material_1.IconButton>
                </material_1.Stack>
              </material_1.Box>
            </material_1.Stack>
          </material_1.Stack>
        </material_1.CardContent>
      </material_1.Card>

      {/* Main Content Tabs */}
      <material_1.Card sx={{ borderRadius: 3 }}>
        <material_1.Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)} variant="scrollable" scrollButtons="auto">
          <material_1.Tab icon={<icons_material_1.AttachFile />} label={`Evidence (${investigation.evidence.length})`}/>
          <material_1.Tab icon={<icons_material_1.Group />} label={`Entities (${investigation.entities.length})`}/>
          <material_1.Tab icon={<icons_material_1.Timeline />} label="Timeline"/>
          <material_1.Tab icon={<icons_material_1.Comment />} label={`Notes (${investigation.notes.length})`}/>
          <material_1.Tab icon={<icons_material_1.AccountTree />} label="Relationships"/>
          <material_1.Tab icon={<icons_material_1.Assessment />} label="Analysis"/>
        </material_1.Tabs>

        {/* Evidence Tab */}
        <TabPanel value={selectedTab} index={0}>
          <material_1.CardContent>
            <material_1.Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <material_1.Typography variant="h6">Evidence Management</material_1.Typography>
              <material_1.Button variant="contained" startIcon={<icons_material_1.Add />} onClick={() => setAddEvidenceOpen(true)}>
                Add Evidence
              </material_1.Button>
            </material_1.Stack>

            <Grid_1.default container spacing={2}>
              {investigation.evidence.map((evidence) => (<Grid_1.default xs={12} key={evidence.id}>
                  <material_1.Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <material_1.CardContent>
                      <material_1.Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <material_1.Box sx={{ flex: 1 }}>
                          <material_1.Stack direction="row" alignItems="center" spacing={2}>
                            <icons_material_1.AttachFile color="primary"/>
                            <material_1.Box>
                              <material_1.Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                {evidence.name}
                              </material_1.Typography>
                              <material_1.Stack direction="row" spacing={2}>
                                <material_1.Chip label={evidence.type} size="small" variant="outlined"/>
                                <material_1.Typography variant="caption" color="text.secondary">
                                  {evidence.size} • Added by {evidence.addedBy}
                                </material_1.Typography>
                              </material_1.Stack>
                            </material_1.Box>
                          </material_1.Stack>

                          <material_1.Typography variant="caption" sx={{
                fontFamily: 'monospace',
                mt: 1,
                display: 'block',
            }}>
                            Hash: {evidence.hash}
                          </material_1.Typography>

                          <material_1.Accordion sx={{ mt: 2 }}>
                            <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
                              <material_1.Typography variant="body2">
                                Chain of Custody ({evidence.chain.length}{' '}
                                entries)
                              </material_1.Typography>
                            </material_1.AccordionSummary>
                            <material_1.AccordionDetails>
                              <lab_1.Timeline>
                                {evidence.chain.map((entry, index) => (<lab_1.TimelineItem key={index}>
                                    <lab_1.TimelineSeparator>
                                      <lab_1.TimelineDot color="primary"/>
                                      {index < evidence.chain.length - 1 && (<lab_1.TimelineConnector />)}
                                    </lab_1.TimelineSeparator>
                                    <lab_1.TimelineContent>
                                      <material_1.Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                        {entry.action}
                                      </material_1.Typography>
                                      <material_1.Typography variant="caption" color="text.secondary">
                                        {entry.actor} •{' '}
                                        {new Date(entry.timestamp).toLocaleString()}
                                        {entry.location &&
                    ` • ${entry.location}`}
                                      </material_1.Typography>
                                      {entry.notes && (<material_1.Typography variant="body2" sx={{ mt: 0.5 }}>
                                          {entry.notes}
                                        </material_1.Typography>)}
                                    </lab_1.TimelineContent>
                                  </lab_1.TimelineItem>))}
                              </lab_1.Timeline>
                            </material_1.AccordionDetails>
                          </material_1.Accordion>
                        </material_1.Box>

                        <material_1.Stack direction="row" spacing={1}>
                          <material_1.Tooltip title="View Evidence">
                            <material_1.IconButton>
                              <icons_material_1.Visibility />
                            </material_1.IconButton>
                          </material_1.Tooltip>
                          <material_1.Tooltip title="Download">
                            <material_1.IconButton>
                              <icons_material_1.Download />
                            </material_1.IconButton>
                          </material_1.Tooltip>
                        </material_1.Stack>
                      </material_1.Stack>
                    </material_1.CardContent>
                  </material_1.Card>
                </Grid_1.default>))}
            </Grid_1.default>
          </material_1.CardContent>
        </TabPanel>

        {/* Entities Tab */}
        <TabPanel value={selectedTab} index={1}>
          <material_1.CardContent>
            <material_1.Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <material_1.Typography variant="h6">Connected Entities</material_1.Typography>
              {!isViewer && (<material_1.Button variant="contained" startIcon={<icons_material_1.Add />} data-testid="add-entity" onClick={() => setAddEntityOpen(true)}>
                  Add Entity
                </material_1.Button>)}
            </material_1.Stack>

            <Grid_1.default container spacing={2}>
              {investigation.entities.map((entity) => (<Grid_1.default xs={12} sm={6} md={4} key={entity.id}>
                  <material_1.Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <material_1.CardContent>
                      <material_1.Stack direction="row" alignItems="center" spacing={2}>
                        <material_1.Avatar sx={{
                bgcolor: entity.risk > 70
                    ? 'error.main'
                    : entity.risk > 40
                        ? 'warning.main'
                        : 'success.main',
            }}>
                          {entity.type === 'PERSON' ? (<icons_material_1.Person />) : entity.type === 'ORGANIZATION' ? (<icons_material_1.Assignment />) : (<icons_material_1.Flag />)}
                        </material_1.Avatar>
                        <material_1.Box sx={{ flex: 1 }}>
                          <material_1.Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {entity.name}
                          </material_1.Typography>
                          <material_1.Stack direction="row" justifyContent="space-between">
                            <material_1.Chip label={entity.type} size="small" variant="outlined"/>
                            <material_1.Stack direction="row" alignItems="center" spacing={1}>
                              <material_1.Typography variant="caption">
                                Risk: {entity.risk}%
                              </material_1.Typography>
                              <material_1.Typography variant="caption">
                                Links: {entity.connections}
                              </material_1.Typography>
                            </material_1.Stack>
                          </material_1.Stack>
                        </material_1.Box>
                      </material_1.Stack>
                    </material_1.CardContent>
                  </material_1.Card>
                </Grid_1.default>))}
            </Grid_1.default>
          </material_1.CardContent>
        </TabPanel>

        {/* Timeline Tab */}
        <TabPanel value={selectedTab} index={2}>
          <material_1.CardContent>
            <material_1.Typography variant="h6" gutterBottom>
              Investigation Timeline
            </material_1.Typography>

            <lab_1.Timeline>
              {investigation.timeline.map((event, index) => (<lab_1.TimelineItem key={event.id}>
                  <lab_1.TimelineOppositeContent sx={{ flex: 0.3 }}>
                    <material_1.Typography variant="caption" color="text.secondary">
                      {new Date(event.timestamp).toLocaleString()}
                    </material_1.Typography>
                  </lab_1.TimelineOppositeContent>
                  <lab_1.TimelineSeparator>
                    <lab_1.TimelineDot color={event.type === 'CREATED'
                ? 'primary'
                : event.type === 'EVIDENCE_ADDED'
                    ? 'success'
                    : event.type === 'STATUS_CHANGED'
                        ? 'warning'
                        : 'info'}>
                      {event.type === 'CREATED' && <icons_material_1.Add />}
                      {event.type === 'EVIDENCE_ADDED' && <icons_material_1.AttachFile />}
                      {event.type === 'STATUS_CHANGED' && <icons_material_1.Edit />}
                      {event.type === 'ASSIGNED' && <icons_material_1.Person />}
                      {event.type === 'NOTE_ADDED' && <icons_material_1.Comment />}
                    </lab_1.TimelineDot>
                    {index < investigation.timeline.length - 1 && (<lab_1.TimelineConnector />)}
                  </lab_1.TimelineSeparator>
                  <lab_1.TimelineContent>
                    <material_1.Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {event.description}
                    </material_1.Typography>
                    <material_1.Typography variant="caption" color="text.secondary">
                      by {event.actor}
                    </material_1.Typography>
                  </lab_1.TimelineContent>
                </lab_1.TimelineItem>))}
            </lab_1.Timeline>
          </material_1.CardContent>
        </TabPanel>

        {/* Notes Tab */}
        <TabPanel value={selectedTab} index={3}>
          <material_1.CardContent>
            <material_1.Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <material_1.Typography variant="h6">Investigation Notes</material_1.Typography>
              <material_1.Button variant="contained" startIcon={<icons_material_1.Add />} onClick={() => setAddNoteOpen(true)}>
                Add Note
              </material_1.Button>
            </material_1.Stack>

            <material_1.Stack spacing={2}>
              {investigation.notes.map((note) => (<material_1.Card key={note.id} variant="outlined" sx={{ borderRadius: 2 }}>
                  <material_1.CardContent>
                    <material_1.Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <material_1.Box sx={{ flex: 1 }}>
                        <material_1.Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                          <material_1.Avatar sx={{ width: 32, height: 32 }}>
                            {note.author
                .split(' ')
                .map((n) => n[0])
                .join('')}
                          </material_1.Avatar>
                          <material_1.Box>
                            <material_1.Typography variant="subtitle2">
                              {note.author}
                            </material_1.Typography>
                            <material_1.Typography variant="caption" color="text.secondary">
                              {new Date(note.timestamp).toLocaleString()}
                            </material_1.Typography>
                          </material_1.Box>
                          <material_1.Chip label={note.classification} size="small" sx={{
                backgroundColor: getClassificationColor(note.classification),
                color: 'white',
                fontWeight: 'bold',
            }}/>
                        </material_1.Stack>
                        <material_1.Typography variant="body2">{note.content}</material_1.Typography>
                      </material_1.Box>
                    </material_1.Stack>
                  </material_1.CardContent>
                </material_1.Card>))}
            </material_1.Stack>
          </material_1.CardContent>
        </TabPanel>

        {/* Relationships Tab */}
        <TabPanel value={selectedTab} index={4}>
          <material_1.CardContent>
            <material_1.Typography variant="h6" gutterBottom>
              Entity Relationships
            </material_1.Typography>
            <material_1.Alert severity="info" sx={{ mb: 3 }}>
              Interactive relationship graph showing connections between
              entities in this investigation.
            </material_1.Alert>

            <material_1.Paper variant="outlined" className="graph-view" sx={{
            height: 400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 2,
            position: 'relative',
        }}>
              <material_1.Stack alignItems="center">
                <icons_material_1.AccountTree sx={{ fontSize: 64, color: 'text.secondary' }}/>
                <material_1.Typography variant="h6" color="text.secondary">
                  Relationship Graph
                </material_1.Typography>
                <material_1.Typography variant="body2" color="text.secondary">
                  Interactive network visualization of entity connections
                </material_1.Typography>
                {enrichResult && (<material_1.Typography variant="body1" color="primary" sx={{ mt: 2, fontWeight: 'bold' }}>
                    {enrichResult}
                  </material_1.Typography>)}
              </material_1.Stack>
            </material_1.Paper>
          </material_1.CardContent>
        </TabPanel>

        {/* Analysis Tab */}
        <TabPanel value={selectedTab} index={5}>
          <material_1.CardContent>
            <material_1.Typography variant="h6" gutterBottom>
              Investigation Analysis
            </material_1.Typography>

            <Grid_1.default container spacing={3}>
              <Grid_1.default xs={12} md={6}>
                <material_1.Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <material_1.CardContent>
                    <material_1.Typography variant="subtitle1" gutterBottom>
                      Risk Assessment
                    </material_1.Typography>
                    <material_1.Stack spacing={2}>
                      <material_1.Box>
                        <material_1.Stack direction="row" justifyContent="space-between">
                          <material_1.Typography variant="body2">
                            Overall Risk Level
                          </material_1.Typography>
                          <material_1.Typography variant="body2" color="error.main" fontWeight="bold">
                            HIGH
                          </material_1.Typography>
                        </material_1.Stack>
                        <material_1.LinearProgress variant="determinate" value={78} color="error" sx={{ mt: 1, height: 8, borderRadius: 4 }}/>
                      </material_1.Box>
                      <material_1.Box>
                        <material_1.Stack direction="row" justifyContent="space-between">
                          <material_1.Typography variant="body2">
                            Evidence Strength
                          </material_1.Typography>
                          <material_1.Typography variant="body2" color="warning.main" fontWeight="bold">
                            MEDIUM
                          </material_1.Typography>
                        </material_1.Stack>
                        <material_1.LinearProgress variant="determinate" value={65} color="warning" sx={{ mt: 1, height: 8, borderRadius: 4 }}/>
                      </material_1.Box>
                    </material_1.Stack>
                  </material_1.CardContent>
                </material_1.Card>
              </Grid_1.default>

              <Grid_1.default xs={12} md={6}>
                <material_1.Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <material_1.CardContent>
                    <material_1.Typography variant="subtitle1" gutterBottom>
                      Key Findings
                    </material_1.Typography>
                    <material_1.List dense>
                      <material_1.ListItem>
                        <material_1.ListItemIcon>
                          <icons_material_1.Warning color="error"/>
                        </material_1.ListItemIcon>
                        <material_1.ListItemText primary="Structured Transaction Pattern" secondary="Multiple transactions just below CTR thresholds"/>
                      </material_1.ListItem>
                      <material_1.ListItem>
                        <material_1.ListItemIcon>
                          <icons_material_1.Security color="warning"/>
                        </material_1.ListItemIcon>
                        <material_1.ListItemText primary="Shell Company Network" secondary="Complex ownership structure obscuring beneficial owners"/>
                      </material_1.ListItem>
                      <material_1.ListItem>
                        <material_1.ListItemIcon>
                          <icons_material_1.CheckCircle color="info"/>
                        </material_1.ListItemIcon>
                        <material_1.ListItemText primary="Digital Evidence Verified" secondary="All hash values confirmed, chain of custody intact"/>
                      </material_1.ListItem>
                    </material_1.List>
                  </material_1.CardContent>
                </material_1.Card>
              </Grid_1.default>
            </Grid_1.default>
          </material_1.CardContent>
        </TabPanel>
      </material_1.Card>

      {/* Add Evidence Dialog */}
      <material_1.Dialog open={addEvidenceOpen} onClose={() => setAddEvidenceOpen(false)} maxWidth="md" fullWidth>
        <material_1.DialogTitle>Add Evidence to Investigation</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.Stack spacing={3} sx={{ mt: 1 }}>
            <material_1.TextField fullWidth label="Evidence Name"/>
            <material_1.FormControl fullWidth>
              <material_1.InputLabel>Evidence Type</material_1.InputLabel>
              <material_1.Select label="Evidence Type">
                <material_1.MenuItem value="DOCUMENT">Document</material_1.MenuItem>
                <material_1.MenuItem value="DIGITAL">Digital Evidence</material_1.MenuItem>
                <material_1.MenuItem value="PHYSICAL">Physical Evidence</material_1.MenuItem>
                <material_1.MenuItem value="TESTIMONY">Testimony</material_1.MenuItem>
                <material_1.MenuItem value="FORENSIC">Forensic Analysis</material_1.MenuItem>
              </material_1.Select>
            </material_1.FormControl>
            <material_1.TextField fullWidth label="Description" multiline rows={3}/>
            <material_1.TextField fullWidth label="Location/Source"/>
            <material_1.TextField fullWidth label="Chain of Custody Notes"/>
          </material_1.Stack>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => setAddEvidenceOpen(false)}>Cancel</material_1.Button>
          <material_1.Button variant="contained">Add Evidence</material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>

      {/* Add Entity Dialog */}
      <material_1.Dialog open={addEntityOpen} onClose={() => setAddEntityOpen(false)} maxWidth="sm" fullWidth>
        <material_1.DialogTitle>Add Entity</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.Stack spacing={3} sx={{ mt: 1 }}>
            <material_1.TextField fullWidth label="Entity Name" id="entity-name" value={entityName} onChange={(e) => setEntityName(e.target.value)}/>
          </material_1.Stack>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => setAddEntityOpen(false)}>Cancel</material_1.Button>
          <material_1.Button variant="outlined" onClick={() => setEnrichResult('drift edges detected')}>
            Enrich
          </material_1.Button>
          <material_1.Button variant="contained" onClick={async () => {
            // Simulate API call for audit log
            await fetch('/api/audit-events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-tenant-id': 'global' },
                body: JSON.stringify({
                    eventType: 'user_action',
                    action: 'add_entity',
                    details: { name: entityName },
                }),
            }).catch(() => { });
            setAddEntityOpen(false);
        }}>
            Add
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>

      {/* Add Note Dialog */}
      <material_1.Dialog open={addNoteOpen} onClose={() => setAddNoteOpen(false)} maxWidth="md" fullWidth>
        <material_1.DialogTitle>Add Investigation Note</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.Stack spacing={3} sx={{ mt: 1 }}>
            <material_1.FormControl fullWidth>
              <material_1.InputLabel>Classification Level</material_1.InputLabel>
              <material_1.Select label="Classification Level">
                <material_1.MenuItem value="UNCLASSIFIED">Unclassified</material_1.MenuItem>
                <material_1.MenuItem value="CONFIDENTIAL">Confidential</material_1.MenuItem>
                <material_1.MenuItem value="SECRET">Secret</material_1.MenuItem>
                <material_1.MenuItem value="TOP_SECRET">Top Secret</material_1.MenuItem>
              </material_1.Select>
            </material_1.FormControl>
            <material_1.TextField fullWidth label="Note Content" multiline rows={6} placeholder="Enter your investigation notes..."/>
          </material_1.Stack>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => setAddNoteOpen(false)}>Cancel</material_1.Button>
          <material_1.Button variant="contained">Add Note</material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>
    </material_1.Box>);
}
