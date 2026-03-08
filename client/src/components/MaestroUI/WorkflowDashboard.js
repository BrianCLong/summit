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
exports.WorkflowDashboard = void 0;
const react_1 = __importStar(require("react"));
const Grid_1 = __importDefault(require("@mui/material/Grid"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const WorkflowDashboard = () => {
    const [workflows, setWorkflows] = (0, react_1.useState)([]);
    const [workflowDefinitions, setWorkflowDefinitions] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [selectedWorkflow, setSelectedWorkflow] = (0, react_1.useState)(null);
    const [detailsOpen, setDetailsOpen] = (0, react_1.useState)(false);
    // Mock data for demonstration
    (0, react_1.useEffect)(() => {
        const mockWorkflows = [
            {
                workflowId: 'hello-world-001',
                workflowName: 'hello_world_workflow',
                version: 1,
                status: 'COMPLETED',
                startTime: '2023-12-01T10:00:00Z',
                endTime: '2023-12-01T10:02:00Z',
                correlationId: 'hw-001',
                tasks: [
                    {
                        taskId: 'health-check-001',
                        taskType: 'health_check_task',
                        status: 'COMPLETED',
                        startTime: '2023-12-01T10:00:10Z',
                        endTime: '2023-12-01T10:01:00Z',
                    },
                    {
                        taskId: 'system-info-001',
                        taskType: 'system_info_task',
                        status: 'COMPLETED',
                        startTime: '2023-12-01T10:01:00Z',
                        endTime: '2023-12-01T10:02:00Z',
                    },
                ],
            },
            {
                workflowId: 'hello-case-001',
                workflowName: 'hello_case_workflow',
                version: 1,
                status: 'RUNNING',
                startTime: '2023-12-01T10:30:00Z',
                correlationId: 'hc-001',
                tasks: [
                    {
                        taskId: 'data-ingest-001',
                        taskType: 'data_ingest_task',
                        status: 'COMPLETED',
                        startTime: '2023-12-01T10:30:10Z',
                        endTime: '2023-12-01T10:31:00Z',
                    },
                    {
                        taskId: 'entity-resolution-001',
                        taskType: 'entity_resolution_task',
                        status: 'IN_PROGRESS',
                        startTime: '2023-12-01T10:31:00Z',
                    },
                    {
                        taskId: 'graph-analysis-001',
                        taskType: 'graph_analysis_task',
                        status: 'SCHEDULED',
                    },
                ],
            },
        ];
        const mockDefinitions = [
            {
                name: 'hello_world_workflow',
                description: 'Basic IntelGraph Maestro orchestrator health check workflow',
                version: 1,
                tasks: ['health_check_task', 'system_info_task'],
            },
            {
                name: 'hello_case_workflow',
                description: 'End-to-end IntelGraph value loop: ingest → resolve → analyze → brief',
                version: 1,
                tasks: [
                    'data_ingest_task',
                    'entity_resolution_task',
                    'graph_analysis_task',
                    'intelligence_brief_task',
                ],
            },
        ];
        // Simulate API call delay
        setTimeout(() => {
            setWorkflows(mockWorkflows);
            setWorkflowDefinitions(mockDefinitions);
            setLoading(false);
        }, 1000);
    }, []);
    const getStatusIcon = (status) => {
        switch (status) {
            case 'COMPLETED':
                return <icons_material_1.CheckCircle color="success"/>;
            case 'FAILED':
                return <icons_material_1.Error color="error"/>;
            case 'RUNNING':
            case 'IN_PROGRESS':
                return <icons_material_1.Schedule color="primary"/>;
            default:
                return <icons_material_1.Info color="disabled"/>;
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'COMPLETED':
                return 'success';
            case 'FAILED':
                return 'error';
            case 'RUNNING':
            case 'IN_PROGRESS':
                return 'warning';
            default:
                return 'default';
        }
    };
    const handleStartWorkflow = (definitionName) => {
        // Mock workflow start
        // eslint-disable-next-line no-console
        console.log(`Starting workflow: ${definitionName}`);
        setError(null);
    };
    const handleStopWorkflow = (workflowId) => {
        // Mock workflow stop
        // eslint-disable-next-line no-console
        console.log(`Stopping workflow: ${workflowId}`);
        setError(null);
    };
    const handleViewDetails = (workflow) => {
        setSelectedWorkflow(workflow);
        setDetailsOpen(true);
    };
    const calculateProgress = (workflow) => {
        if (!workflow.tasks || workflow.tasks.length === 0)
            return 0;
        const completedTasks = workflow.tasks.filter((t) => t.status === 'COMPLETED').length;
        return (completedTasks / workflow.tasks.length) * 100;
    };
    if (loading) {
        return (<material_1.Box p={3}>
        <material_1.Typography variant="h4" gutterBottom>
          IntelGraph Maestro Workflows
        </material_1.Typography>
        <material_1.LinearProgress />
        <material_1.Typography variant="body2" color="text.secondary" mt={1}>
          Loading workflow data...
        </material_1.Typography>
      </material_1.Box>);
    }
    return (<material_1.Box p={3}>
      <material_1.Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <material_1.Typography variant="h4" gutterBottom>
          IntelGraph Maestro Workflows
        </material_1.Typography>
        <material_1.Button variant="outlined" startIcon={<icons_material_1.Refresh />} onClick={() => window.location.reload()}>
          Refresh
        </material_1.Button>
      </material_1.Box>

      {error && (<material_1.Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </material_1.Alert>)}

      {/* Workflow Definitions */}
      <material_1.Typography variant="h6" gutterBottom>
        Available Workflows
      </material_1.Typography>
      <Grid_1.default container spacing={2} mb={4}>
        {workflowDefinitions.map((definition) => (<Grid_1.default item xs={12} md={6} key={definition.name}>
            <material_1.Card>
              <material_1.CardContent>
                <material_1.Box display="flex" justifyContent="space-between" alignItems="start">
                  <material_1.Box>
                    <material_1.Typography variant="h6" gutterBottom>
                      {definition.name}
                    </material_1.Typography>
                    <material_1.Typography variant="body2" color="text.secondary" mb={2}>
                      {definition.description}
                    </material_1.Typography>
                    <material_1.Chip label={`v${definition.version}`} size="small" color="primary"/>
                  </material_1.Box>
                  <material_1.Button variant="contained" size="small" startIcon={<icons_material_1.PlayArrow />} onClick={() => handleStartWorkflow(definition.name)}>
                    Start
                  </material_1.Button>
                </material_1.Box>
              </material_1.CardContent>
            </material_1.Card>
          </Grid_1.default>))}
      </Grid_1.default>

      {/* Running Workflows */}
      <material_1.Typography variant="h6" gutterBottom>
        Workflow Executions
      </material_1.Typography>
      <Grid_1.default container spacing={2}>
        {workflows.map((workflow) => (<Grid_1.default item xs={12} key={workflow.workflowId}>
            <material_1.Card>
              <material_1.CardContent>
                <material_1.Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                  <material_1.Box>
                    <material_1.Box display="flex" alignItems="center" gap={1} mb={1}>
                      {getStatusIcon(workflow.status)}
                      <material_1.Typography variant="h6">
                        {workflow.workflowName}
                      </material_1.Typography>
                      <material_1.Chip label={workflow.status} color={getStatusColor(workflow.status)} size="small"/>
                    </material_1.Box>
                    <material_1.Typography variant="body2" color="text.secondary">
                      ID: {workflow.workflowId} | Started:{' '}
                      {new Date(workflow.startTime).toLocaleString()}
                    </material_1.Typography>
                    {workflow.correlationId && (<material_1.Typography variant="body2" color="text.secondary">
                        Correlation: {workflow.correlationId}
                      </material_1.Typography>)}
                  </material_1.Box>
                  <material_1.Box display="flex" gap={1}>
                    <material_1.IconButton size="small" onClick={() => handleViewDetails(workflow)}>
                      <icons_material_1.Timeline />
                    </material_1.IconButton>
                    {workflow.status === 'RUNNING' && (<material_1.IconButton size="small" color="error" onClick={() => handleStopWorkflow(workflow.workflowId)}>
                        <icons_material_1.Stop />
                      </material_1.IconButton>)}
                  </material_1.Box>
                </material_1.Box>

                {workflow.status === 'RUNNING' && (<material_1.Box>
                    <material_1.Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <material_1.Typography variant="body2">Progress</material_1.Typography>
                      <material_1.Typography variant="body2">
                        {Math.round(calculateProgress(workflow))}%
                      </material_1.Typography>
                    </material_1.Box>
                    <material_1.LinearProgress variant="determinate" value={calculateProgress(workflow)}/>
                  </material_1.Box>)}
              </material_1.CardContent>
            </material_1.Card>
          </Grid_1.default>))}
      </Grid_1.default>

      {/* Workflow Details Dialog */}
      <material_1.Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <material_1.DialogTitle>
          Workflow Details: {selectedWorkflow?.workflowName}
        </material_1.DialogTitle>
        <material_1.DialogContent>
          {selectedWorkflow && (<material_1.Box>
              <Grid_1.default container spacing={2} mb={3}>
                <Grid_1.default item xs={6}>
                  <material_1.Typography variant="body2" color="text.secondary">
                    Workflow ID
                  </material_1.Typography>
                  <material_1.Typography variant="body1">
                    {selectedWorkflow.workflowId}
                  </material_1.Typography>
                </Grid_1.default>
                <Grid_1.default item xs={6}>
                  <material_1.Typography variant="body2" color="text.secondary">
                    Status
                  </material_1.Typography>
                  <material_1.Chip label={selectedWorkflow.status} color={getStatusColor(selectedWorkflow.status)} size="small"/>
                </Grid_1.default>
                <Grid_1.default item xs={6}>
                  <material_1.Typography variant="body2" color="text.secondary">
                    Start Time
                  </material_1.Typography>
                  <material_1.Typography variant="body1">
                    {new Date(selectedWorkflow.startTime).toLocaleString()}
                  </material_1.Typography>
                </Grid_1.default>
                <Grid_1.default item xs={6}>
                  <material_1.Typography variant="body2" color="text.secondary">
                    End Time
                  </material_1.Typography>
                  <material_1.Typography variant="body1">
                    {selectedWorkflow.endTime
                ? new Date(selectedWorkflow.endTime).toLocaleString()
                : 'Running...'}
                  </material_1.Typography>
                </Grid_1.default>
              </Grid_1.default>

              <material_1.Divider sx={{ my: 2 }}/>

              <material_1.Typography variant="h6" gutterBottom>
                Tasks
              </material_1.Typography>
              <material_1.List>
                {selectedWorkflow.tasks?.map((task) => (<material_1.ListItem key={task.taskId}>
                    <material_1.Box display="flex" alignItems="center" width="100%">
                      {getStatusIcon(task.status)}
                      <material_1.Box ml={2} flex={1}>
                        <material_1.ListItemText primary={task.taskType} secondary={`Status: ${task.status} | ID: ${task.taskId}`}/>
                      </material_1.Box>
                      {task.startTime && (<material_1.Typography variant="body2" color="text.secondary">
                          {new Date(task.startTime).toLocaleTimeString()}
                        </material_1.Typography>)}
                    </material_1.Box>
                  </material_1.ListItem>))}
              </material_1.List>
            </material_1.Box>)}
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => setDetailsOpen(false)}>Close</material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>
    </material_1.Box>);
};
exports.WorkflowDashboard = WorkflowDashboard;
exports.default = exports.WorkflowDashboard;
