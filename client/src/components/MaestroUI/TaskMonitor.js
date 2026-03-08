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
exports.TaskMonitor = void 0;
const react_1 = __importStar(require("react"));
const Grid_1 = __importDefault(require("@mui/material/Grid"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const TaskMonitor = () => {
    const [tasks, setTasks] = (0, react_1.useState)([]);
    const [statistics, setStatistics] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [selectedTask, setSelectedTask] = (0, react_1.useState)(null);
    const [detailsOpen, setDetailsOpen] = (0, react_1.useState)(false);
    const [filter, setFilter] = (0, react_1.useState)('ALL');
    // Mock data for demonstration
    (0, react_1.useEffect)(() => {
        const mockTasks = [
            {
                taskId: 'health-check-001',
                taskType: 'health_check_task',
                status: 'COMPLETED',
                workflowInstanceId: 'hello-world-001',
                workflowType: 'hello_world_workflow',
                startTime: '2023-12-01T10:00:10Z',
                endTime: '2023-12-01T10:01:00Z',
                executionTime: 50000,
                retryCount: 0,
                inputData: {
                    message: 'Hello from IntelGraph Maestro!',
                    timestamp: '2023-12-01T10:00:00Z',
                    environment: 'dev',
                },
                outputData: {
                    status: 'healthy',
                    checks: ['postgres', 'redis', 'workers'],
                    timestamp: '2023-12-01T10:01:00Z',
                },
                logs: [
                    'Starting health check...',
                    'Checking PostgreSQL connection... OK',
                    'Checking Redis connection... OK',
                    'Checking worker availability... OK',
                    'Health check completed successfully',
                ],
            },
            {
                taskId: 'data-ingest-002',
                taskType: 'data_ingest_task',
                status: 'IN_PROGRESS',
                workflowInstanceId: 'hello-case-001',
                workflowType: 'hello_case_workflow',
                startTime: '2023-12-01T10:30:10Z',
                retryCount: 0,
                inputData: {
                    sources: [
                        { type: 'osint', url: 'https://api.example.com/intel-feed' },
                        { type: 'social', platform: 'twitter' },
                    ],
                    batch_size: 100,
                },
                logs: [
                    'Starting data ingestion...',
                    'Processing OSINT source...',
                    'Fetching social media data...',
                ],
            },
            {
                taskId: 'entity-resolve-003',
                taskType: 'entity_resolution_task',
                status: 'FAILED',
                workflowInstanceId: 'hello-case-002',
                workflowType: 'hello_case_workflow',
                startTime: '2023-12-01T09:45:00Z',
                endTime: '2023-12-01T09:47:30Z',
                executionTime: 150000,
                retryCount: 2,
                reasonForIncompletion: 'Connection timeout to ML service',
                inputData: {
                    entities: ['person', 'organization', 'location'],
                    threshold: 0.85,
                },
                logs: [
                    'Starting entity resolution...',
                    'Loading ML models...',
                    'ERROR: Connection timeout to ML service after 30s',
                    'Retrying... (attempt 1/2)',
                    'ERROR: Connection timeout to ML service after 30s',
                    'Retrying... (attempt 2/2)',
                    'ERROR: Connection timeout to ML service after 30s',
                    'Task failed after maximum retries',
                ],
            },
        ];
        const mockStats = {
            totalTasks: 156,
            runningTasks: 3,
            completedTasks: 142,
            failedTasks: 11,
            averageExecutionTime: 45000,
        };
        setTimeout(() => {
            setTasks(mockTasks);
            setStatistics(mockStats);
            setLoading(false);
        }, 1000);
    }, []);
    const getStatusIcon = (status) => {
        switch (status) {
            case 'COMPLETED':
                return <icons_material_1.CheckCircle color="success" fontSize="small"/>;
            case 'FAILED':
            case 'TIMED_OUT':
                return <icons_material_1.Error color="error" fontSize="small"/>;
            case 'IN_PROGRESS':
                return <icons_material_1.Schedule color="primary" fontSize="small"/>;
            default:
                return <icons_material_1.Schedule color="disabled" fontSize="small"/>;
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'COMPLETED':
                return 'success';
            case 'FAILED':
            case 'TIMED_OUT':
                return 'error';
            case 'IN_PROGRESS':
                return 'warning';
            default:
                return 'default';
        }
    };
    const formatDuration = (ms) => {
        if (!ms)
            return 'N/A';
        if (ms < 1000)
            return `${ms}ms`;
        if (ms < 60000)
            return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}m`;
    };
    const filteredTasks = tasks.filter((task) => filter === 'ALL' || task.status === filter);
    const handleViewDetails = (task) => {
        setSelectedTask(task);
        setDetailsOpen(true);
    };
    if (loading) {
        return (<material_1.Box p={3}>
        <material_1.Typography variant="h4" gutterBottom>
          Task Monitor
        </material_1.Typography>
        <material_1.LinearProgress />
      </material_1.Box>);
    }
    return (<material_1.Box p={3}>
      <material_1.Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <material_1.Typography variant="h4">Task Monitor</material_1.Typography>
        <material_1.Button variant="outlined" startIcon={<icons_material_1.Refresh />} onClick={() => window.location.reload()}>
          Refresh
        </material_1.Button>
      </material_1.Box>

      {/* Statistics Cards */}
      {statistics && (<Grid_1.default container spacing={3} mb={4}>
          <Grid_1.default item xs={12} sm={6} md={3}>
            <material_1.Card>
              <material_1.CardContent>
                <material_1.Typography variant="h6" color="primary">
                  {statistics.totalTasks}
                </material_1.Typography>
                <material_1.Typography variant="body2" color="text.secondary">
                  Total Tasks
                </material_1.Typography>
              </material_1.CardContent>
            </material_1.Card>
          </Grid_1.default>
          <Grid_1.default item xs={12} sm={6} md={3}>
            <material_1.Card>
              <material_1.CardContent>
                <material_1.Typography variant="h6" color="warning.main">
                  {statistics.runningTasks}
                </material_1.Typography>
                <material_1.Typography variant="body2" color="text.secondary">
                  Running
                </material_1.Typography>
              </material_1.CardContent>
            </material_1.Card>
          </Grid_1.default>
          <Grid_1.default item xs={12} sm={6} md={3}>
            <material_1.Card>
              <material_1.CardContent>
                <material_1.Typography variant="h6" color="success.main">
                  {statistics.completedTasks}
                </material_1.Typography>
                <material_1.Typography variant="body2" color="text.secondary">
                  Completed
                </material_1.Typography>
              </material_1.CardContent>
            </material_1.Card>
          </Grid_1.default>
          <Grid_1.default item xs={12} sm={6} md={3}>
            <material_1.Card>
              <material_1.CardContent>
                <material_1.Typography variant="h6" color="error.main">
                  {statistics.failedTasks}
                </material_1.Typography>
                <material_1.Typography variant="body2" color="text.secondary">
                  Failed
                </material_1.Typography>
              </material_1.CardContent>
            </material_1.Card>
          </Grid_1.default>
        </Grid_1.default>)}

      {/* Filter Chips */}
      <material_1.Box mb={3}>
        <material_1.Typography variant="subtitle1" gutterBottom>
          Filter by Status
        </material_1.Typography>
        <material_1.Box display="flex" gap={1} flexWrap="wrap">
          {['ALL', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SCHEDULED'].map((status) => (<material_1.Chip key={status} label={status.replace('_', ' ')} onClick={() => setFilter(status)} color={filter === status ? 'primary' : 'default'} variant={filter === status ? 'filled' : 'outlined'}/>))}
        </material_1.Box>
      </material_1.Box>

      {/* Tasks Table */}
      <material_1.TableContainer component={material_1.Paper}>
        <material_1.Table>
          <material_1.TableHead>
            <material_1.TableRow>
              <material_1.TableCell>Status</material_1.TableCell>
              <material_1.TableCell>Task Type</material_1.TableCell>
              <material_1.TableCell>Workflow</material_1.TableCell>
              <material_1.TableCell>Started</material_1.TableCell>
              <material_1.TableCell>Duration</material_1.TableCell>
              <material_1.TableCell>Retries</material_1.TableCell>
              <material_1.TableCell>Actions</material_1.TableCell>
            </material_1.TableRow>
          </material_1.TableHead>
          <material_1.TableBody>
            {filteredTasks.map((task) => (<material_1.TableRow key={task.taskId}>
                <material_1.TableCell>
                  <material_1.Box display="flex" alignItems="center" gap={1}>
                    {getStatusIcon(task.status)}
                    <material_1.Chip label={task.status.replace('_', ' ')} color={getStatusColor(task.status)} size="small"/>
                  </material_1.Box>
                </material_1.TableCell>
                <material_1.TableCell>
                  <material_1.Typography variant="body2" fontWeight="medium">
                    {task.taskType}
                  </material_1.Typography>
                  <material_1.Typography variant="caption" color="text.secondary">
                    {task.taskId}
                  </material_1.Typography>
                </material_1.TableCell>
                <material_1.TableCell>
                  <material_1.Typography variant="body2">{task.workflowType}</material_1.Typography>
                  <material_1.Typography variant="caption" color="text.secondary">
                    {task.workflowInstanceId}
                  </material_1.Typography>
                </material_1.TableCell>
                <material_1.TableCell>
                  <material_1.Typography variant="body2">
                    {task.startTime
                ? new Date(task.startTime).toLocaleString()
                : 'N/A'}
                  </material_1.Typography>
                </material_1.TableCell>
                <material_1.TableCell>
                  <material_1.Typography variant="body2">
                    {formatDuration(task.executionTime)}
                  </material_1.Typography>
                </material_1.TableCell>
                <material_1.TableCell>
                  <material_1.Chip label={task.retryCount} color={task.retryCount > 0 ? 'warning' : 'default'} size="small"/>
                </material_1.TableCell>
                <material_1.TableCell>
                  <material_1.Tooltip title="View Details">
                    <material_1.IconButton size="small" onClick={() => handleViewDetails(task)}>
                      <icons_material_1.Visibility fontSize="small"/>
                    </material_1.IconButton>
                  </material_1.Tooltip>
                </material_1.TableCell>
              </material_1.TableRow>))}
          </material_1.TableBody>
        </material_1.Table>
      </material_1.TableContainer>

      {/* Task Details Dialog */}
      <material_1.Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="lg" fullWidth>
        <material_1.DialogTitle>Task Details: {selectedTask?.taskType}</material_1.DialogTitle>
        <material_1.DialogContent>
          {selectedTask && (<material_1.Box>
              <Grid_1.default container spacing={3} mb={3}>
                <Grid_1.default item xs={12} md={6}>
                  <material_1.Typography variant="subtitle2" gutterBottom>
                    Basic Information
                  </material_1.Typography>
                  <material_1.Box mb={2}>
                    <material_1.Typography variant="body2" color="text.secondary">
                      Task ID
                    </material_1.Typography>
                    <material_1.Typography variant="body1">
                      {selectedTask.taskId}
                    </material_1.Typography>
                  </material_1.Box>
                  <material_1.Box mb={2}>
                    <material_1.Typography variant="body2" color="text.secondary">
                      Status
                    </material_1.Typography>
                    <material_1.Chip label={selectedTask.status} color={getStatusColor(selectedTask.status)} size="small"/>
                  </material_1.Box>
                  <material_1.Box mb={2}>
                    <material_1.Typography variant="body2" color="text.secondary">
                      Workflow
                    </material_1.Typography>
                    <material_1.Typography variant="body1">
                      {selectedTask.workflowType}
                    </material_1.Typography>
                    <material_1.Typography variant="body2" color="text.secondary">
                      {selectedTask.workflowInstanceId}
                    </material_1.Typography>
                  </material_1.Box>
                </Grid_1.default>
                <Grid_1.default item xs={12} md={6}>
                  <material_1.Typography variant="subtitle2" gutterBottom>
                    Execution Details
                  </material_1.Typography>
                  <material_1.Box mb={2}>
                    <material_1.Typography variant="body2" color="text.secondary">
                      Start Time
                    </material_1.Typography>
                    <material_1.Typography variant="body1">
                      {selectedTask.startTime
                ? new Date(selectedTask.startTime).toLocaleString()
                : 'N/A'}
                    </material_1.Typography>
                  </material_1.Box>
                  <material_1.Box mb={2}>
                    <material_1.Typography variant="body2" color="text.secondary">
                      End Time
                    </material_1.Typography>
                    <material_1.Typography variant="body1">
                      {selectedTask.endTime
                ? new Date(selectedTask.endTime).toLocaleString()
                : 'Running...'}
                    </material_1.Typography>
                  </material_1.Box>
                  <material_1.Box mb={2}>
                    <material_1.Typography variant="body2" color="text.secondary">
                      Duration
                    </material_1.Typography>
                    <material_1.Typography variant="body1">
                      {formatDuration(selectedTask.executionTime)}
                    </material_1.Typography>
                  </material_1.Box>
                  <material_1.Box mb={2}>
                    <material_1.Typography variant="body2" color="text.secondary">
                      Retry Count
                    </material_1.Typography>
                    <material_1.Typography variant="body1">
                      {selectedTask.retryCount}
                    </material_1.Typography>
                  </material_1.Box>
                </Grid_1.default>
              </Grid_1.default>

              {selectedTask.reasonForIncompletion && (<material_1.Alert severity="error" sx={{ mb: 3 }}>
                  <material_1.Typography variant="body2">
                    <strong>Failure Reason:</strong>{' '}
                    {selectedTask.reasonForIncompletion}
                  </material_1.Typography>
                </material_1.Alert>)}

              {/* Input/Output Data */}
              <material_1.Accordion>
                <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
                  <material_1.Typography variant="subtitle2">Input Data</material_1.Typography>
                </material_1.AccordionSummary>
                <material_1.AccordionDetails>
                  <material_1.Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                    <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                      {JSON.stringify(selectedTask.inputData, null, 2)}
                    </pre>
                  </material_1.Paper>
                </material_1.AccordionDetails>
              </material_1.Accordion>

              {selectedTask.outputData && (<material_1.Accordion>
                  <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
                    <material_1.Typography variant="subtitle2">Output Data</material_1.Typography>
                  </material_1.AccordionSummary>
                  <material_1.AccordionDetails>
                    <material_1.Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                      <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                        {JSON.stringify(selectedTask.outputData, null, 2)}
                      </pre>
                    </material_1.Paper>
                  </material_1.AccordionDetails>
                </material_1.Accordion>)}

              {/* Logs */}
              {selectedTask.logs && selectedTask.logs.length > 0 && (<material_1.Accordion>
                  <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
                    <material_1.Typography variant="subtitle2">Execution Logs</material_1.Typography>
                  </material_1.AccordionSummary>
                  <material_1.AccordionDetails>
                    <material_1.Paper sx={{ p: 2, backgroundColor: 'grey.900' }}>
                      {selectedTask.logs.map((log, index) => (<material_1.Typography key={index} variant="body2" component="div" sx={{
                        color: log.startsWith('ERROR')
                            ? 'error.main'
                            : 'grey.100',
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                    }}>
                          {log}
                        </material_1.Typography>))}
                    </material_1.Paper>
                  </material_1.AccordionDetails>
                </material_1.Accordion>)}
            </material_1.Box>)}
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => setDetailsOpen(false)}>Close</material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>
    </material_1.Box>);
};
exports.TaskMonitor = TaskMonitor;
exports.default = exports.TaskMonitor;
