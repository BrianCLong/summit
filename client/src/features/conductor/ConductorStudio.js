"use strict";
// Conductor Studio - MoE+MCP Router Interface
// Provides routing preview, execution, and system monitoring for the Conductor
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
exports.default = ConductorStudio;
const react_1 = __importStar(require("react"));
const client_1 = require("@apollo/client");
const client_2 = require("@apollo/client");
const material_1 = require("@mui/material");
const Grid_1 = __importDefault(require("@mui/material/Grid"));
const icons_material_1 = require("@mui/icons-material");
const RolloutTimeline_1 = require("./panels/RolloutTimeline");
const CanaryHealthPanel_1 = require("./panels/CanaryHealthPanel");
const BudgetGuardrails_1 = require("./panels/BudgetGuardrails");
const ProvenanceTree_1 = require("./panels/ProvenanceTree");
const SLODashboardEmbed_1 = require("./panels/SLODashboardEmbed");
const NLToCypherPreview_1 = require("./panels/NLToCypherPreview");
const DualControlModal_1 = require("../conductor/components/DualControlModal");
const hooks_1 = require("./hooks");
// GraphQL operations (preview conduct only)
const PREVIEW_ROUTING = (0, client_2.gql) `
  query PreviewRouting($input: ConductInput!) {
    previewRouting(input: $input) {
      expert
      reason
      confidence
      alternatives {
        expert
        reason
        confidence
      }
      features {
        complexity
        dataIntensity
        timeConstraint
        securityLevel
        keywords
      }
    }
  }
`;
const CONDUCT_MUTATION = (0, client_2.gql) `
  mutation Conduct($input: ConductInput!) {
    conduct(input: $input) {
      expertId
      cost
      latencyMs
      auditId
      result
      evidence
      traceId
    }
  }
`;
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (<div role="tabpanel" hidden={value !== index} id={`conductor-tabpanel-${index}`} aria-labelledby={`conductor-tab-${index}`} {...other}>
      {value === index && <material_1.Box sx={{ p: 3 }}>{children}</material_1.Box>}
    </div>);
}
// Routing Preview Panel
function RoutingPreview({ taskInput, onTaskChange, }) {
    const [maxLatency, setMaxLatency] = (0, react_1.useState)(30000);
    const target = 'https://maestro.intelgraph.ai/health';
    const rollout = (0, hooks_1.useRolloutSteps)();
    const canary = (0, hooks_1.useCanaryHealth)(target);
    const denials = (0, hooks_1.useBudgetDenials)();
    const prov = (0, hooks_1.useProvenanceRoot)();
    const [dualOpen, setDualOpen] = (0, react_1.useState)(null);
    const [previewRouting, { loading, data, error }] = (0, client_1.useLazyQuery)(PREVIEW_ROUTING);
    const handlePreview = (0, react_1.useCallback)(() => {
        if (!taskInput.trim())
            return;
        previewRouting({
            variables: {
                input: {
                    task: taskInput,
                    maxLatencyMs: maxLatency,
                    context: {},
                },
            },
        });
    }, [taskInput, maxLatency, previewRouting]);
    const getExpertColor = (expert) => {
        const colors = {
            LLM_LIGHT: '#4caf50',
            LLM_HEAVY: '#ff9800',
            GRAPH_TOOL: '#2196f3',
            RAG_TOOL: '#9c27b0',
            FILES_TOOL: '#795548',
            OSINT_TOOL: '#f44336',
            EXPORT_TOOL: '#607d8b',
        };
        return colors[expert] || '#757575';
    };
    return (<Grid_1.default container spacing={3}>
      <Grid_1.default xs={12}>
        <material_1.Card>
          <material_1.CardContent>
            <material_1.Typography variant="h6" gutterBottom>
              <icons_material_1.Preview sx={{ mr: 1, verticalAlign: 'middle' }}/>
              Routing Preview
            </material_1.Typography>

            <material_1.Box sx={{ mb: 2 }}>
              <material_1.TextField fullWidth multiline rows={4} label="Task Description" value={taskInput} onChange={(e) => onTaskChange(e.target.value)} placeholder="Enter your task or query here..." variant="outlined"/>
            </material_1.Box>

            <material_1.Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <material_1.TextField label="Max Latency (ms)" type="number" value={maxLatency} onChange={(e) => setMaxLatency(Number(e.target.value))} sx={{ width: 200 }}/>
              <material_1.Button variant="contained" startIcon={<icons_material_1.Preview />} onClick={handlePreview} disabled={loading || !taskInput.trim()}>
                Preview Routing
              </material_1.Button>
            </material_1.Box>

            {loading && <material_1.LinearProgress />}

            {error && (<material_1.Alert severity="error" sx={{ mt: 2 }}>
                Failed to preview routing: {error.message}
              </material_1.Alert>)}

            {data?.previewRouting && (<material_1.Box sx={{ mt: 2 }}>
                <material_1.Typography variant="subtitle1" gutterBottom>
                  Routing Decision
                </material_1.Typography>

                <material_1.Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <material_1.Chip label={data.previewRouting.expert} sx={{
                backgroundColor: getExpertColor(data.previewRouting.expert),
                color: 'white',
            }}/>
                  <material_1.Chip label={`${Math.round(data.previewRouting.confidence * 100)}% confidence`} variant="outlined"/>
                </material_1.Box>

                <material_1.Typography variant="body2" sx={{ mb: 2 }}>
                  <strong>Reason:</strong> {data.previewRouting.reason}
                </material_1.Typography>

                {data.previewRouting.alternatives?.length > 0 && (<material_1.Accordion>
                    <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
                      <material_1.Typography>
                        Alternative Options (
                        {data.previewRouting.alternatives.length})
                      </material_1.Typography>
                    </material_1.AccordionSummary>
                    <material_1.AccordionDetails>
                      <material_1.List dense>
                        {data.previewRouting.alternatives.map((alt) => (<material_1.ListItem key={alt.expert}>
                              <material_1.ListItemIcon>
                                <material_1.Chip size="small" label={alt.expert} sx={{
                        backgroundColor: getExpertColor(alt.expert),
                        color: 'white',
                    }}/>
                              </material_1.ListItemIcon>
                              <material_1.ListItemText primary={`${Math.round(alt.confidence * 100)}% confidence`} secondary={alt.reason}/>
                            </material_1.ListItem>))}
                      </material_1.List>
                    </material_1.AccordionDetails>
                  </material_1.Accordion>)}

                {data.previewRouting.features && (<material_1.Box sx={{ mt: 2 }}>
                    <material_1.Typography variant="subtitle2" gutterBottom>
                      Extracted Features
                    </material_1.Typography>
                    <Grid_1.default container spacing={1}>
                      <Grid_1.default>
                        <material_1.Chip size="small" label={`Complexity: ${data.previewRouting.features.complexity}`}/>
                      </Grid_1.default>
                      <Grid_1.default>
                        <material_1.Chip size="small" label={`Data Intensity: ${data.previewRouting.features.dataIntensity}`}/>
                      </Grid_1.default>
                      <Grid_1.default>
                        <material_1.Chip size="small" label={`Security: ${data.previewRouting.features.securityLevel}`}/>
                      </Grid_1.default>
                      {data.previewRouting.features.keywords?.length > 0 &&
                    data.previewRouting.features.keywords.map((keyword, idx) => (<Grid_1.default key={idx}>
                              <material_1.Chip size="small" variant="outlined" label={keyword}/>
                            </Grid_1.default>))}
                    </Grid_1.default>
                  </material_1.Box>)}
              </material_1.Box>)}
          </material_1.CardContent>
        </material_1.Card>
      </Grid_1.default>
      {/* Rollouts & SLO/Guardrails/Provenance */}
      <Grid_1.default xs={12}>
        <material_1.Paper>
          <material_1.Tabs value={0} variant="scrollable" scrollButtons allowScrollButtonsMobile>
            <material_1.Tab label="Rollout"/>
            <material_1.Tab label="SLO"/>
            <material_1.Tab label="Budgets"/>
            <material_1.Tab label="Provenance"/>
          </material_1.Tabs>
          <material_1.Box sx={{ p: 2 }}>
            <Grid_1.default container spacing={2}>
              <Grid_1.default xs={12} md={6}>
                <material_1.Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <material_1.Button variant="contained" size="small" onClick={() => setDualOpen('promote')}>
                    Promote
                  </material_1.Button>
                  <material_1.Button variant="outlined" color="error" size="small" onClick={() => setDualOpen('abort')}>
                    Abort
                  </material_1.Button>
                </material_1.Box>
                <RolloutTimeline_1.RolloutTimeline name="maestro-server-rollout" steps={rollout.data || []}/>
              </Grid_1.default>
              <Grid_1.default xs={12} md={6}>
                <CanaryHealthPanel_1.CanaryHealthPanel availability={canary.data?.availability || 0} p95TtfbMs={canary.data?.p95TtfbMs || 0} errorRate={canary.data?.errorRate || 0} target={target}/>
              </Grid_1.default>
              <Grid_1.default xs={12} md={6}>
                <BudgetGuardrails_1.BudgetGuardrails denials={denials.data || []}/>
              </Grid_1.default>
              <Grid_1.default xs={12} md={6}>
                <ProvenanceTree_1.ProvenanceTree root={prov.data}/>
              </Grid_1.default>
              <Grid_1.default xs={12}>
                <SLODashboardEmbed_1.SLODashboardEmbed />
              </Grid_1.default>
              <Grid_1.default xs={12}>
                <NLToCypherPreview_1.NLToCypherPreview />
              </Grid_1.default>
            </Grid_1.default>
          </material_1.Box>
        </material_1.Paper>
      </Grid_1.default>
      <DualControlModal_1.DualControlModal open={dualOpen !== null} actionLabel={dualOpen === 'promote' ? 'Promote' : 'Abort'} onClose={() => setDualOpen(null)} onConfirm={(p) => {
            console.log('dual-control', dualOpen, p);
            setDualOpen(null);
        }}/>
    </Grid_1.default>);
}
// Execution Panel
function ExecutionPanel({ taskInput }) {
    const [conduct, { loading, data, error }] = (0, client_1.useMutation)(CONDUCT_MUTATION);
    const [executionLog, setExecutionLog] = (0, react_1.useState)([]);
    const handleExecute = (0, react_1.useCallback)(async () => {
        if (!taskInput.trim())
            return;
        setExecutionLog((prev) => [
            ...prev,
            `🚀 Starting execution: ${new Date().toLocaleTimeString()}`,
        ]);
        try {
            const result = await conduct({
                variables: {
                    input: {
                        task: taskInput,
                        maxLatencyMs: 30000,
                        context: {},
                    },
                },
            });
            setExecutionLog((prev) => [
                ...prev,
                `✅ Execution completed in ${result.data?.conduct?.latencyMs}ms`,
                `💰 Cost: $${result.data?.conduct?.cost?.toFixed(4)}`,
                `🔍 Audit ID: ${result.data?.conduct?.auditId}`,
                `🎯 Expert: ${result.data?.conduct?.expertId}`,
            ]);
        }
        catch (err) {
            setExecutionLog((prev) => [
                ...prev,
                `❌ Execution failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
            ]);
        }
    }, [taskInput, conduct]);
    const downloadEvidence = (0, react_1.useCallback)(() => {
        if (!data?.conduct?.evidence)
            return;
        const blob = new Blob([JSON.stringify(data.conduct.evidence, null, 2)], {
            type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conductor-evidence-${data.conduct.auditId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [data]);
    return (<Grid_1.default container spacing={3}>
      <Grid_1.default xs={12} md={6}>
        <material_1.Card>
          <material_1.CardContent>
            <material_1.Typography variant="h6" gutterBottom>
              <icons_material_1.PlayArrow sx={{ mr: 1, verticalAlign: 'middle' }}/>
              Execute Task
            </material_1.Typography>

            <material_1.Button fullWidth variant="contained" size="large" startIcon={<icons_material_1.PlayArrow />} onClick={handleExecute} disabled={loading || !taskInput.trim()} sx={{ mb: 2 }}>
              {loading ? 'Executing...' : 'Execute Task'}
            </material_1.Button>

            {loading && <material_1.LinearProgress />}

            {error && (<material_1.Alert severity="error" sx={{ mt: 2 }}>
                Execution failed: {error.message}
              </material_1.Alert>)}

            {data?.conduct && (<material_1.Box sx={{ mt: 2 }}>
                <material_1.Typography variant="subtitle1" gutterBottom>
                  Execution Results
                </material_1.Typography>

                <Grid_1.default container spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
                  <Grid_1.default xs={6}>
                    <material_1.Paper sx={{ p: 1, textAlign: 'center' }}>
                      <material_1.Typography variant="caption">Latency</material_1.Typography>
                      <material_1.Typography variant="h6">
                        {data.conduct.latencyMs}ms
                      </material_1.Typography>
                    </material_1.Paper>
                  </Grid_1.default>
                  <Grid_1.default xs={6}>
                    <material_1.Paper sx={{ p: 1, textAlign: 'center' }}>
                      <material_1.Typography variant="caption">Cost</material_1.Typography>
                      <material_1.Typography variant="h6">
                        ${data.conduct.cost?.toFixed(4)}
                      </material_1.Typography>
                    </material_1.Paper>
                  </Grid_1.default>
                  {Number(data.conduct.cost || 0) === 0 &&
                Number(data.conduct.latencyMs || 0) < 50 && (<Grid_1.default xs={12}>
                        <material_1.Chip size="small" color="success" label="from cache (heuristic)"/>
                      </Grid_1.default>)}
                </Grid_1.default>

                <material_1.Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {data.conduct.traceId && (<material_1.Tooltip title="Open trace in monitoring">
                      <material_1.IconButton size="small">
                        <icons_material_1.OpenInNew />
                      </material_1.IconButton>
                    </material_1.Tooltip>)}
                  <material_1.Button size="small" startIcon={<icons_material_1.CloudDownload />} onClick={downloadEvidence} disabled={!data.conduct.evidence}>
                    Download Evidence
                  </material_1.Button>
                </material_1.Box>

                {data.conduct.result && (<material_1.Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                    <material_1.Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                      {typeof data.conduct.result === 'string'
                    ? data.conduct.result
                    : JSON.stringify(data.conduct.result, null, 2)}
                    </material_1.Typography>
                  </material_1.Paper>)}
              </material_1.Box>)}
          </material_1.CardContent>
        </material_1.Card>
      </Grid_1.default>

      <Grid_1.default xs={12} md={6}>
        <material_1.Card>
          <material_1.CardContent>
            <material_1.Typography variant="h6" gutterBottom>
              <icons_material_1.Timeline sx={{ mr: 1, verticalAlign: 'middle' }}/>
              Execution Log
            </material_1.Typography>

            <material_1.Button size="small" startIcon={<icons_material_1.Refresh />} onClick={() => setExecutionLog([])} sx={{ mb: 2 }}>
              Clear Log
            </material_1.Button>

            <material_1.Paper sx={{
            p: 2,
            backgroundColor: 'grey.900',
            color: 'grey.100',
            maxHeight: 400,
            overflow: 'auto',
        }}>
              {executionLog.length === 0 ? (<material_1.Typography variant="body2" sx={{ opacity: 0.7 }}>
                  No execution logs yet...
                </material_1.Typography>) : (executionLog.map((log, idx) => (<material_1.Typography key={idx} variant="body2" component="div" sx={{ fontFamily: 'monospace', mb: 0.5 }}>
                    {log}
                  </material_1.Typography>)))}
            </material_1.Paper>
          </material_1.CardContent>
        </material_1.Card>
      </Grid_1.default>
    </Grid_1.default>);
}
// MCP Registry Panel
function MCPRegistry() {
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [data, setData] = (0, react_1.useState)({
        mcpServers: [],
    });
    const [error, setError] = (0, react_1.useState)(null);
    const refetch = (0, react_1.useCallback)(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/maestro/v1/mcp/servers');
            if (!res.ok)
                throw new Error(`Failed ${res.status}`);
            const servers = await res.json();
            setData({
                mcpServers: servers.map((s) => ({
                    ...s,
                    status: 'healthy',
                })),
            });
        }
        catch (e) {
            setError(e);
        }
        finally {
            setLoading(false);
        }
    }, []);
    (0, react_1.useEffect)(() => {
        refetch();
        const t = setInterval(refetch, 30000);
        return () => clearInterval(t);
    }, [refetch]);
    const getStatusColor = (status) => {
        switch (status.toLowerCase()) {
            case 'healthy':
                return 'success';
            case 'degraded':
                return 'warning';
            case 'unhealthy':
                return 'error';
            default:
                return 'default';
        }
    };
    return (<Grid_1.default container spacing={3}>
      <Grid_1.default xs={12}>
        <material_1.Card>
          <material_1.CardContent>
            <material_1.Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
        }}>
              <material_1.Typography variant="h6">
                <icons_material_1.Engineering sx={{ mr: 1, verticalAlign: 'middle' }}/>
                MCP Server Registry
              </material_1.Typography>
              <material_1.Button startIcon={<icons_material_1.Refresh />} onClick={() => refetch()} disabled={loading}>
                Refresh
              </material_1.Button>
            </material_1.Box>

            {loading && <material_1.LinearProgress />}

            {error && (<material_1.Alert severity="error">
                Failed to load MCP servers: {String(error.message || error)}
              </material_1.Alert>)}

            {data?.mcpServers && data.mcpServers.length > 0 ? (<material_1.TableContainer component={material_1.Paper}>
                <material_1.Table>
                  <material_1.TableHead>
                    <material_1.TableRow>
                      <material_1.TableCell>Server</material_1.TableCell>
                      <material_1.TableCell>Status</material_1.TableCell>
                      <material_1.TableCell>URL</material_1.TableCell>
                      <material_1.TableCell>Tools</material_1.TableCell>
                    </material_1.TableRow>
                  </material_1.TableHead>
                  <material_1.TableBody>
                    {data.mcpServers.map((server, idx) => (<material_1.TableRow key={idx}>
                        <material_1.TableCell>
                          <material_1.Typography variant="subtitle2">
                            {server.name}
                          </material_1.Typography>
                        </material_1.TableCell>
                        <material_1.TableCell>
                          <material_1.Chip label={server.status} color={getStatusColor(server.status)} size="small"/>
                        </material_1.TableCell>
                        <material_1.TableCell>
                          <material_1.Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {server.url}
                          </material_1.Typography>
                        </material_1.TableCell>
                        <material_1.TableCell>
                          <material_1.Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {server.tools?.map((tool) => (<material_1.Tooltip key={tool.name} title={tool.description}>
                                <material_1.Chip size="small" variant="outlined" label={tool.name}/>
                              </material_1.Tooltip>))}
                          </material_1.Box>
                        </material_1.TableCell>
                      </material_1.TableRow>))}
                  </material_1.TableBody>
                </material_1.Table>
              </material_1.TableContainer>) : (!loading && (<material_1.Alert severity="info">
                  No MCP servers found. Make sure the Conductor system is
                  running.
                </material_1.Alert>))}
          </material_1.CardContent>
        </material_1.Card>
      </Grid_1.default>
    </Grid_1.default>);
}
// Main Conductor Studio Component
function ConductorStudio() {
    const [tabValue, setTabValue] = (0, react_1.useState)(0);
    const [taskInput, setTaskInput] = (0, react_1.useState)('');
    const [sessions, setSessions] = (0, react_1.useState)([]);
    const [invocations, setInvocations] = (0, react_1.useState)([]);
    const loadSessions = (0, react_1.useCallback)(async () => {
        try {
            const res = await fetch(`/api/maestro/v1/runs/demo-run/mcp/sessions`);
            if (res.ok)
                setSessions(await res.json());
        }
        catch {
            /* noop */
        }
    }, []); // runId removed from dependency array
    const loadInvocations = (0, react_1.useCallback)(async () => {
        try {
            const res = await await fetch(`/api/maestro/v1/runs/demo-run/mcp/invocations`);
            if (res.ok)
                setInvocations(await res.json());
        }
        catch {
            /* noop */
        }
    }, []); // runId removed from dependency array
    (0, react_1.useEffect)(() => {
        loadSessions();
        loadInvocations();
    }, [loadSessions, loadInvocations]);
    const handleTabChange = (_event, newValue) => {
        setTabValue(newValue);
    };
    return (<material_1.Box sx={{ width: '100%' }}>
      <material_1.Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        <icons_material_1.Psychology sx={{ mr: 1, verticalAlign: 'middle', fontSize: '2rem' }}/>
        Conductor Studio
        <material_1.Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
          Multi-Expert Router & MCP Tool Orchestra
        </material_1.Typography>
      </material_1.Typography>

      <material_1.Paper sx={{ width: '100%', mb: 2 }}>
        <material_1.Tabs value={tabValue} onChange={handleTabChange} indicatorColor="primary" textColor="primary" variant="scrollable" scrollButtons="auto">
          <material_1.Tab icon={<icons_material_1.Preview />} label="Routing Preview"/>
          <material_1.Tab icon={<icons_material_1.PlayArrow />} label="Execute"/>
          <material_1.Tab icon={<icons_material_1.Engineering />} label="MCP Registry"/>
          <material_1.Tab icon={<icons_material_1.Timeline />} label="Tools & Evidence"/>
        </material_1.Tabs>
      </material_1.Paper>

      <TabPanel value={tabValue} index={0}>
        <RoutingPreview taskInput={taskInput} onTaskChange={setTaskInput}/>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <ExecutionPanel taskInput={taskInput}/>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <MCPRegistry />
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Grid_1.default container spacing={3}>
          <Grid_1.default xs={12} md={6}>
            <material_1.Card>
              <material_1.CardContent>
                <material_1.Typography variant="h6" gutterBottom>
                  Attached MCP Sessions
                </material_1.Typography>
                <material_1.Button size="small" startIcon={<icons_material_1.Refresh />} onClick={loadSessions} sx={{ mb: 2 }}>
                  Refresh
                </material_1.Button>
                {sessions.length === 0 ? (<material_1.Alert severity="info">
                    No active sessions for run: demo-run
                  </material_1.Alert>) : (<material_1.List>
                    {sessions.map((s, i) => (<react_1.default.Fragment key={s.sid}>
                        <material_1.ListItem>
                          <material_1.ListItemText primary={`sid=${s.sid}`} secondary={`scopes=[${(s.scopes || []).join(', ')}] servers=[${(s.servers || []).join(', ')}]`}/>
                        </material_1.ListItem>
                        {i < sessions.length - 1 && <material_1.Divider />}
                      </react_1.default.Fragment>))}
                  </material_1.List>)}
              </material_1.CardContent>
            </material_1.Card>
          </Grid_1.default>

          <Grid_1.default xs={12} md={6}>
            <material_1.Card>
              <material_1.CardContent>
                <material_1.Typography variant="h6" gutterBottom>
                  Tool Invocations (Audit)
                </material_1.Typography>
                <material_1.Button size="small" startIcon={<icons_material_1.Refresh />} onClick={loadInvocations} sx={{ mb: 2 }}>
                  Refresh
                </material_1.Button>
                {invocations.length === 0 ? (<material_1.Alert severity="info">
                    No invocations recorded for run: demo-run
                  </material_1.Alert>) : (<material_1.List>
                    {invocations.map((v, i) => (<react_1.default.Fragment key={v.id}>
                        <material_1.ListItem>
                          <material_1.ListItemText primary={new Date(v.createdAt).toLocaleString()} secondary={`argsHash=${v.details?.argsHash} resultHash=${v.details?.resultHash}`}/>
                        </material_1.ListItem>
                        {i < invocations.length - 1 && <material_1.Divider />}
                      </react_1.default.Fragment>))}
                  </material_1.List>)}
              </material_1.CardContent>
            </material_1.Card>
          </Grid_1.default>
        </Grid_1.default>
      </TabPanel>
    </material_1.Box>);
}
