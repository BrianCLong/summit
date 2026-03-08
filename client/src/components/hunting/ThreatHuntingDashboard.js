"use strict";
/**
 * ThreatHuntingDashboard
 * Main dashboard for orchestrating agentic threat hunts over the knowledge graph
 */
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
exports.ThreatHuntingDashboard = void 0;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const Grid_1 = __importDefault(require("@mui/material/Grid"));
const icons_material_1 = require("@mui/icons-material");
const TabPanel = ({ children, value, index }) => (<div role="tabpanel" hidden={value !== index}>
    {value === index && <material_1.Box sx={{ p: 3 }}>{children}</material_1.Box>}
  </div>);
const severityColors = {
    CRITICAL: '#d32f2f',
    HIGH: '#f57c00',
    MEDIUM: '#fbc02d',
    LOW: '#388e3c',
    INFO: '#1976d2',
};
const statusColors = {
    initializing: '#9e9e9e',
    generating_hypotheses: '#2196f3',
    executing_queries: '#ff9800',
    analyzing_results: '#9c27b0',
    enriching_findings: '#00bcd4',
    remediating: '#f44336',
    completed: '#4caf50',
    failed: '#d32f2f',
    cancelled: '#757575',
};
const ThreatHuntingDashboard = () => {
    const [activeTab, setActiveTab] = (0, react_1.useState)(0);
    const [activeHunt, setActiveHunt] = (0, react_1.useState)(null);
    const [findings, setFindings] = (0, react_1.useState)([]);
    const [metrics, setMetrics] = (0, react_1.useState)(null);
    const [isConfigOpen, setIsConfigOpen] = (0, react_1.useState)(false);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [config, setConfig] = (0, react_1.useState)({
        scope: 'all',
        timeWindowHours: 24,
        autoRemediate: false,
        remediationApprovalRequired: true,
        confidenceThreshold: 0.7,
        targetPrecision: 0.91,
    });
    // Polling for hunt status
    (0, react_1.useEffect)(() => {
        let interval = null;
        if (activeHunt && !['completed', 'failed', 'cancelled'].includes(activeHunt.status)) {
            interval = setInterval(async () => {
                try {
                    const response = await fetch(`/api/v1/hunt/${activeHunt.huntId}/status`);
                    if (response.ok) {
                        const status = await response.json();
                        setActiveHunt(status);
                        if (status.status === 'completed') {
                            await fetchResults(status.huntId);
                        }
                    }
                }
                catch (err) {
                    console.error('Failed to fetch hunt status:', err);
                }
            }, 2000);
        }
        return () => {
            if (interval)
                clearInterval(interval);
        };
    }, [activeHunt, activeHunt?.huntId, activeHunt?.status]);
    const startHunt = (0, react_1.useCallback)(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/v1/hunt/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scope: config.scope,
                    timeWindowHours: config.timeWindowHours,
                    configuration: {
                        autoRemediate: config.autoRemediate,
                        remediationApprovalRequired: config.remediationApprovalRequired,
                        confidenceThreshold: config.confidenceThreshold,
                        targetPrecision: config.targetPrecision,
                    },
                }),
            });
            if (!response.ok) {
                throw new Error('Failed to start hunt');
            }
            const result = await response.json();
            setActiveHunt({
                huntId: result.huntId,
                status: 'initializing',
                progress: 0,
                currentPhase: 'Initializing',
                findingsCount: 0,
                elapsedTimeMs: 0,
                estimatedRemainingMs: result.estimatedDuration,
            });
            setFindings([]);
            setMetrics(null);
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setIsLoading(false);
        }
    }, [config]);
    const cancelHunt = (0, react_1.useCallback)(async () => {
        if (!activeHunt)
            return;
        try {
            await fetch(`/api/v1/hunt/${activeHunt.huntId}/cancel`, { method: 'POST' });
            setActiveHunt((prev) => prev ? { ...prev, status: 'cancelled' } : null);
        }
        catch (err) {
            setError(err.message);
        }
    }, [activeHunt]);
    const fetchResults = async (huntId) => {
        try {
            const response = await fetch(`/api/v1/hunt/${huntId}/results`);
            if (response.ok) {
                const results = await response.json();
                setFindings(results.findings || []);
                setMetrics(results.metrics || null);
            }
        }
        catch (err) {
            console.error('Failed to fetch results:', err);
        }
    };
    const formatDuration = (ms) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        }
        if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        }
        return `${seconds}s`;
    };
    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
                return <icons_material_1.CheckCircle sx={{ color: statusColors.completed }}/>;
            case 'failed':
                return <icons_material_1.Error sx={{ color: statusColors.failed }}/>;
            case 'cancelled':
                return <icons_material_1.Stop sx={{ color: statusColors.cancelled }}/>;
            default:
                return <material_1.CircularProgress size={20}/>;
        }
    };
    return (<material_1.Box sx={{ p: 3, minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <icons_material_1.Security sx={{ fontSize: 40, color: 'primary.main' }}/>
          <material_1.Box>
            <material_1.Typography variant="h4" fontWeight="bold">
              Threat Hunting Platform
            </material_1.Typography>
            <material_1.Typography variant="body2" color="text.secondary">
              Agentic hunt queries over knowledge graph with auto-remediation
            </material_1.Typography>
          </material_1.Box>
        </material_1.Box>

        <material_1.Box sx={{ display: 'flex', gap: 2 }}>
          <material_1.Tooltip title="Configuration">
            <material_1.IconButton onClick={() => setIsConfigOpen(true)}>
              <icons_material_1.Settings />
            </material_1.IconButton>
          </material_1.Tooltip>

          {activeHunt && !['completed', 'failed', 'cancelled'].includes(activeHunt.status) ? (<material_1.Button variant="outlined" color="error" startIcon={<icons_material_1.Stop />} onClick={cancelHunt}>
              Cancel Hunt
            </material_1.Button>) : (<material_1.Button variant="contained" color="primary" startIcon={<icons_material_1.PlayArrow />} onClick={startHunt} disabled={isLoading}>
              Start Hunt
            </material_1.Button>)}
        </material_1.Box>
      </material_1.Box>

      {/* Error Alert */}
      {error && (<material_1.Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </material_1.Alert>)}

      {/* Active Hunt Status */}
      {activeHunt && (<material_1.Card sx={{ mb: 3 }}>
          <material_1.CardContent>
            <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {getStatusIcon(activeHunt.status)}
                <material_1.Box>
                  <material_1.Typography variant="h6">
                    Hunt: {activeHunt.huntId.slice(0, 8)}...
                  </material_1.Typography>
                  <material_1.Typography variant="body2" color="text.secondary">
                    {activeHunt.currentPhase}
                  </material_1.Typography>
                </material_1.Box>
              </material_1.Box>

              <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <material_1.Chip label={activeHunt.status.replace('_', ' ').toUpperCase()} sx={{
                bgcolor: statusColors[activeHunt.status],
                color: 'white',
                fontWeight: 'bold',
            }}/>
                <material_1.Box sx={{ textAlign: 'right' }}>
                  <material_1.Typography variant="body2">
                    Elapsed: {formatDuration(activeHunt.elapsedTimeMs)}
                  </material_1.Typography>
                  {activeHunt.estimatedRemainingMs > 0 && (<material_1.Typography variant="caption" color="text.secondary">
                      ~{formatDuration(activeHunt.estimatedRemainingMs)} remaining
                    </material_1.Typography>)}
                </material_1.Box>
              </material_1.Box>
            </material_1.Box>

            <material_1.LinearProgress variant="determinate" value={activeHunt.progress} sx={{ height: 8, borderRadius: 4 }}/>

            <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <material_1.Typography variant="caption" color="text.secondary">
                {activeHunt.progress.toFixed(0)}% complete
              </material_1.Typography>
              <material_1.Typography variant="caption" color="text.secondary">
                {activeHunt.findingsCount} findings discovered
              </material_1.Typography>
            </material_1.Box>
          </material_1.CardContent>
        </material_1.Card>)}

      {/* Metrics Summary */}
      {metrics && (<Grid_1.default container spacing={2} sx={{ mb: 3 }}>
          <Grid_1.default item xs={12} sm={6} md={2}>
            <material_1.Card>
              <material_1.CardContent sx={{ textAlign: 'center' }}>
                <icons_material_1.BugReport sx={{ fontSize: 32, color: 'error.main', mb: 1 }}/>
                <material_1.Typography variant="h4" fontWeight="bold">
                  {metrics.totalFindingsDiscovered}
                </material_1.Typography>
                <material_1.Typography variant="body2" color="text.secondary">
                  Findings
                </material_1.Typography>
              </material_1.CardContent>
            </material_1.Card>
          </Grid_1.default>

          <Grid_1.default item xs={12} sm={6} md={2}>
            <material_1.Card>
              <material_1.CardContent sx={{ textAlign: 'center' }}>
                <icons_material_1.NetworkCheck sx={{ fontSize: 32, color: 'warning.main', mb: 1 }}/>
                <material_1.Typography variant="h4" fontWeight="bold">
                  {metrics.iocsDiscovered}
                </material_1.Typography>
                <material_1.Typography variant="body2" color="text.secondary">
                  IOCs
                </material_1.Typography>
              </material_1.CardContent>
            </material_1.Card>
          </Grid_1.default>

          <Grid_1.default item xs={12} sm={6} md={2}>
            <material_1.Card>
              <material_1.CardContent sx={{ textAlign: 'center' }}>
                <icons_material_1.Assessment sx={{ fontSize: 32, color: 'info.main', mb: 1 }}/>
                <material_1.Typography variant="h4" fontWeight="bold">
                  {(metrics.precisionEstimate * 100).toFixed(0)}%
                </material_1.Typography>
                <material_1.Typography variant="body2" color="text.secondary">
                  Precision
                </material_1.Typography>
              </material_1.CardContent>
            </material_1.Card>
          </Grid_1.default>

          <Grid_1.default item xs={12} sm={6} md={2}>
            <material_1.Card>
              <material_1.CardContent sx={{ textAlign: 'center' }}>
                <icons_material_1.Timeline sx={{ fontSize: 32, color: 'success.main', mb: 1 }}/>
                <material_1.Typography variant="h4" fontWeight="bold">
                  {metrics.totalQueriesExecuted}
                </material_1.Typography>
                <material_1.Typography variant="body2" color="text.secondary">
                  Queries
                </material_1.Typography>
              </material_1.CardContent>
            </material_1.Card>
          </Grid_1.default>

          <Grid_1.default item xs={12} sm={6} md={2}>
            <material_1.Card>
              <material_1.CardContent sx={{ textAlign: 'center' }}>
                <icons_material_1.Security sx={{ fontSize: 32, color: 'secondary.main', mb: 1 }}/>
                <material_1.Typography variant="h4" fontWeight="bold">
                  {metrics.totalHypothesesTested}
                </material_1.Typography>
                <material_1.Typography variant="body2" color="text.secondary">
                  Hypotheses
                </material_1.Typography>
              </material_1.CardContent>
            </material_1.Card>
          </Grid_1.default>

          <Grid_1.default item xs={12} sm={6} md={2}>
            <material_1.Card>
              <material_1.CardContent sx={{ textAlign: 'center' }}>
                <icons_material_1.Refresh sx={{ fontSize: 32, color: 'primary.main', mb: 1 }}/>
                <material_1.Typography variant="h4" fontWeight="bold">
                  {formatDuration(metrics.executionTimeMs)}
                </material_1.Typography>
                <material_1.Typography variant="body2" color="text.secondary">
                  Duration
                </material_1.Typography>
              </material_1.CardContent>
            </material_1.Card>
          </Grid_1.default>
        </Grid_1.default>)}

      {/* Tabs */}
      <material_1.Paper sx={{ mb: 3 }}>
        <material_1.Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} indicatorColor="primary" textColor="primary">
          <material_1.Tab label="Findings" icon={<icons_material_1.BugReport />} iconPosition="start"/>
          <material_1.Tab label="IOCs" icon={<icons_material_1.NetworkCheck />} iconPosition="start"/>
          <material_1.Tab label="Remediation" icon={<icons_material_1.Security />} iconPosition="start"/>
          <material_1.Tab label="Report" icon={<icons_material_1.Assessment />} iconPosition="start"/>
        </material_1.Tabs>
      </material_1.Paper>

      {/* Findings Tab */}
      <TabPanel value={activeTab} index={0}>
        {findings.length === 0 ? (<material_1.Box sx={{ textAlign: 'center', py: 5 }}>
            <icons_material_1.BugReport sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }}/>
            <material_1.Typography variant="h6" color="text.secondary">
              No findings yet
            </material_1.Typography>
            <material_1.Typography variant="body2" color="text.secondary">
              Start a threat hunt to discover findings
            </material_1.Typography>
          </material_1.Box>) : (<material_1.Box>
            {/* Severity breakdown */}
            <material_1.Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              {Object.entries(metrics?.findingsBySeverity || {}).map(([severity, count]) => (<material_1.Chip key={severity} label={`${severity}: ${count}`} sx={{
                    bgcolor: severityColors[severity],
                    color: 'white',
                    fontWeight: 'bold',
                }}/>))}
            </material_1.Box>

            {/* Findings list */}
            {findings.map((finding) => (<material_1.Accordion key={finding.id} sx={{ mb: 1 }}>
                <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
                  <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <material_1.Chip label={finding.severity} size="small" sx={{
                    bgcolor: severityColors[finding.severity],
                    color: 'white',
                    fontWeight: 'bold',
                    minWidth: 80,
                }}/>
                    <material_1.Typography sx={{ flex: 1 }}>
                      {finding.classification.replace('_', ' ')}
                    </material_1.Typography>
                    <material_1.Chip label={`${(finding.confidence * 100).toFixed(0)}% confidence`} size="small" variant="outlined"/>
                    {finding.autoRemediationEligible && (<material_1.Chip label="Auto-remediate" size="small" color="success"/>)}
                  </material_1.Box>
                </material_1.AccordionSummary>
                <material_1.AccordionDetails>
                  <Grid_1.default container spacing={2}>
                    <Grid_1.default item xs={12}>
                      <material_1.Typography variant="subtitle2" color="text.secondary">
                        Evidence Summary
                      </material_1.Typography>
                      <material_1.Typography>{finding.evidenceSummary}</material_1.Typography>
                    </Grid_1.default>

                    <Grid_1.default item xs={12} md={4}>
                      <material_1.Typography variant="subtitle2" color="text.secondary">
                        Entities Involved ({finding.entitiesInvolved.length})
                      </material_1.Typography>
                      <material_1.Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                        {finding.entitiesInvolved.slice(0, 5).map((entity) => (<material_1.Chip key={entity.id} label={`${entity.type}: ${entity.name}`} size="small" variant="outlined"/>))}
                      </material_1.Box>
                    </Grid_1.default>

                    <Grid_1.default item xs={12} md={4}>
                      <material_1.Typography variant="subtitle2" color="text.secondary">
                        MITRE ATT&CK ({finding.ttpsMatched.length})
                      </material_1.Typography>
                      <material_1.Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                        {finding.ttpsMatched.map((ttp) => (<material_1.Chip key={ttp.id} label={`${ttp.id}: ${ttp.name}`} size="small" color="primary" variant="outlined"/>))}
                      </material_1.Box>
                    </Grid_1.default>

                    <Grid_1.default item xs={12} md={4}>
                      <material_1.Typography variant="subtitle2" color="text.secondary">
                        Recommended Actions ({finding.recommendedActions.length})
                      </material_1.Typography>
                      <material_1.Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                        {finding.recommendedActions.map((action) => (<material_1.Chip key={action.id} label={action.type.replace('_', ' ')} size="small" color="warning"/>))}
                      </material_1.Box>
                    </Grid_1.default>
                  </Grid_1.default>
                </material_1.AccordionDetails>
              </material_1.Accordion>))}
          </material_1.Box>)}
      </TabPanel>

      {/* IOCs Tab */}
      <TabPanel value={activeTab} index={1}>
        {findings.length === 0 ? (<material_1.Box sx={{ textAlign: 'center', py: 5 }}>
            <icons_material_1.NetworkCheck sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }}/>
            <material_1.Typography variant="h6" color="text.secondary">
              No IOCs discovered yet
            </material_1.Typography>
          </material_1.Box>) : (<material_1.TableContainer component={material_1.Paper}>
            <material_1.Table>
              <material_1.TableHead>
                <material_1.TableRow>
                  <material_1.TableCell>Type</material_1.TableCell>
                  <material_1.TableCell>Value</material_1.TableCell>
                  <material_1.TableCell>Finding</material_1.TableCell>
                  <material_1.TableCell>Severity</material_1.TableCell>
                  <material_1.TableCell>Actions</material_1.TableCell>
                </material_1.TableRow>
              </material_1.TableHead>
              <material_1.TableBody>
                {findings.flatMap((finding) => finding.iocsIdentified.map((ioc) => (<material_1.TableRow key={`${finding.id}-${ioc.id}`}>
                      <material_1.TableCell>
                        <material_1.Chip label={ioc.type} size="small"/>
                      </material_1.TableCell>
                      <material_1.TableCell sx={{ fontFamily: 'monospace' }}>{ioc.value}</material_1.TableCell>
                      <material_1.TableCell>{finding.id.slice(0, 8)}...</material_1.TableCell>
                      <material_1.TableCell>
                        <material_1.Chip label={finding.severity} size="small" sx={{
                    bgcolor: severityColors[finding.severity],
                    color: 'white',
                }}/>
                      </material_1.TableCell>
                      <material_1.TableCell>
                        <material_1.Tooltip title="View details">
                          <material_1.IconButton size="small">
                            <icons_material_1.Visibility />
                          </material_1.IconButton>
                        </material_1.Tooltip>
                        <material_1.Tooltip title="Export">
                          <material_1.IconButton size="small">
                            <icons_material_1.Download />
                          </material_1.IconButton>
                        </material_1.Tooltip>
                      </material_1.TableCell>
                    </material_1.TableRow>)))}
              </material_1.TableBody>
            </material_1.Table>
          </material_1.TableContainer>)}
      </TabPanel>

      {/* Remediation Tab */}
      <TabPanel value={activeTab} index={2}>
        <material_1.Box sx={{ textAlign: 'center', py: 5 }}>
          <icons_material_1.Security sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }}/>
          <material_1.Typography variant="h6" color="text.secondary">
            Remediation actions will appear here
          </material_1.Typography>
          <material_1.Typography variant="body2" color="text.secondary">
            {config.autoRemediate
            ? 'Auto-remediation is enabled'
            : 'Auto-remediation is disabled'}
          </material_1.Typography>
        </material_1.Box>
      </TabPanel>

      {/* Report Tab */}
      <TabPanel value={activeTab} index={3}>
        {metrics ? (<material_1.Box>
            <material_1.Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, gap: 2 }}>
              <material_1.Button variant="outlined" startIcon={<icons_material_1.Download />}>
                Export JSON
              </material_1.Button>
              <material_1.Button variant="outlined" startIcon={<icons_material_1.Download />}>
                Export PDF
              </material_1.Button>
            </material_1.Box>

            <material_1.Card>
              <material_1.CardContent>
                <material_1.Typography variant="h5" gutterBottom>
                  Executive Summary
                </material_1.Typography>
                <material_1.Divider sx={{ my: 2 }}/>
                <material_1.Typography paragraph>
                  Threat hunt completed with <strong>{metrics.totalFindingsDiscovered}</strong> findings
                  discovered. <strong>{metrics.findingsBySeverity?.CRITICAL || 0}</strong> critical and{' '}
                  <strong>{metrics.findingsBySeverity?.HIGH || 0}</strong> high severity findings require
                  immediate attention.
                </material_1.Typography>
                <material_1.Typography paragraph>
                  <strong>{metrics.iocsDiscovered}</strong> IOCs were identified across all findings.
                  Estimated precision: <strong>{(metrics.precisionEstimate * 100).toFixed(1)}%</strong>.
                </material_1.Typography>
                <material_1.Typography paragraph>
                  Hunt executed <strong>{metrics.totalQueriesExecuted}</strong> graph queries testing{' '}
                  <strong>{metrics.totalHypothesesTested}</strong> hypotheses in{' '}
                  <strong>{formatDuration(metrics.executionTimeMs)}</strong>.
                </material_1.Typography>
              </material_1.CardContent>
            </material_1.Card>
          </material_1.Box>) : (<material_1.Box sx={{ textAlign: 'center', py: 5 }}>
            <icons_material_1.Assessment sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }}/>
            <material_1.Typography variant="h6" color="text.secondary">
              Report will be generated after hunt completion
            </material_1.Typography>
          </material_1.Box>)}
      </TabPanel>

      {/* Configuration Dialog */}
      <material_1.Dialog open={isConfigOpen} onClose={() => setIsConfigOpen(false)} maxWidth="sm" fullWidth>
        <material_1.DialogTitle>Hunt Configuration</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <material_1.FormControl fullWidth>
              <material_1.InputLabel>Hunt Scope</material_1.InputLabel>
              <material_1.Select value={config.scope} label="Hunt Scope" onChange={(e) => setConfig({ ...config, scope: e.target.value })}>
                <material_1.MenuItem value="all">All (Network + Endpoint + Identity)</material_1.MenuItem>
                <material_1.MenuItem value="network">Network Only</material_1.MenuItem>
                <material_1.MenuItem value="endpoint">Endpoint Only</material_1.MenuItem>
                <material_1.MenuItem value="identity">Identity Only</material_1.MenuItem>
                <material_1.MenuItem value="cloud">Cloud Only</material_1.MenuItem>
              </material_1.Select>
            </material_1.FormControl>

            <material_1.TextField label="Time Window (hours)" type="number" value={config.timeWindowHours} onChange={(e) => setConfig({ ...config, timeWindowHours: parseInt(e.target.value) || 24 })} fullWidth/>

            <material_1.TextField label="Confidence Threshold" type="number" value={config.confidenceThreshold} onChange={(e) => setConfig({ ...config, confidenceThreshold: parseFloat(e.target.value) || 0.7 })} inputProps={{ step: 0.1, min: 0, max: 1 }} fullWidth/>

            <material_1.TextField label="Target Precision" type="number" value={config.targetPrecision} onChange={(e) => setConfig({ ...config, targetPrecision: parseFloat(e.target.value) || 0.91 })} inputProps={{ step: 0.01, min: 0.5, max: 1 }} fullWidth helperText="Default: 91% precision"/>

            <material_1.FormControlLabel control={<material_1.Switch checked={config.autoRemediate} onChange={(e) => setConfig({ ...config, autoRemediate: e.target.checked })}/>} label="Enable Auto-Remediation"/>

            {config.autoRemediate && (<material_1.FormControlLabel control={<material_1.Switch checked={config.remediationApprovalRequired} onChange={(e) => setConfig({ ...config, remediationApprovalRequired: e.target.checked })}/>} label="Require Approval for Remediation"/>)}
          </material_1.Box>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => setIsConfigOpen(false)}>Cancel</material_1.Button>
          <material_1.Button onClick={() => setIsConfigOpen(false)} variant="contained">
            Save
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>
    </material_1.Box>);
};
exports.ThreatHuntingDashboard = ThreatHuntingDashboard;
exports.default = exports.ThreatHuntingDashboard;
