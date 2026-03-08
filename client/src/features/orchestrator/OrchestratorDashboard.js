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
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const Grid_1 = __importDefault(require("@mui/material/Grid"));
const PlayArrow_1 = __importDefault(require("@mui/icons-material/PlayArrow"));
const RocketLaunch_1 = __importDefault(require("@mui/icons-material/RocketLaunch"));
const Timeline_1 = __importDefault(require("@mui/icons-material/Timeline"));
const Checklist_1 = __importDefault(require("@mui/icons-material/Checklist"));
const SyncAlt_1 = __importDefault(require("@mui/icons-material/SyncAlt"));
const Insights_1 = __importDefault(require("@mui/icons-material/Insights"));
const orchestrator_1 = require("../../services/orchestrator");
const formatUptime = (uptimeMs) => {
    if (!uptimeMs || uptimeMs <= 0) {
        return '0s';
    }
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes === 0) {
        return `${remainingSeconds}s`;
    }
    return `${minutes}m ${remainingSeconds}s`;
};
const moduleStateColor = {
    running: 'success',
    starting: 'warning',
    error: 'error',
    offline: 'default',
};
const presetIcons = {
    'launch-readiness': <RocketLaunch_1.default fontSize="small"/>,
    'stability-check': <Checklist_1.default fontSize="small"/>,
    'insight-sync': <Insights_1.default fontSize="small"/>,
    'rapid-response': <SyncAlt_1.default fontSize="small"/>,
};
const metricValue = (value) => `${Math.round(value * 100) / 100}`;
const OrchestratorDashboard = () => {
    const orchestrator = (0, react_1.useMemo)(() => (0, orchestrator_1.createLaunchableOrchestrator)(), []);
    const [snapshot, setSnapshot] = (0, react_1.useState)(orchestrator.getSnapshot());
    const [activeTaskId, setActiveTaskId] = (0, react_1.useState)(null);
    const [initialized, setInitialized] = (0, react_1.useState)(false);
    const presets = (0, react_1.useMemo)(() => {
        const basePresets = (0, orchestrator_1.createDefaultMissionPresets)();
        return basePresets.map((preset) => ({
            ...preset,
            icon: presetIcons[preset.id] ?? <RocketLaunch_1.default fontSize="small"/>,
        }));
    }, []);
    (0, react_1.useEffect)(() => {
        const unsubscribers = [
            orchestrator.on('module:status', () => {
                setSnapshot(orchestrator.getSnapshot());
            }),
            orchestrator.on('task:started', (record) => {
                setActiveTaskId(record.task.id);
                setSnapshot(orchestrator.getSnapshot());
            }),
            orchestrator.on('task:completed', () => {
                setActiveTaskId(null);
                setSnapshot(orchestrator.getSnapshot());
            }),
            orchestrator.on('task:error', () => {
                setActiveTaskId(null);
                setSnapshot(orchestrator.getSnapshot());
            }),
        ];
        return () => {
            unsubscribers.forEach((unsubscribe) => unsubscribe());
        };
    }, [orchestrator]);
    (0, react_1.useEffect)(() => {
        orchestrator.startAll().then(() => {
            setSnapshot(orchestrator.getSnapshot());
            setInitialized(true);
        });
    }, [orchestrator]);
    const handleRunTask = (0, react_1.useCallback)((preset) => {
        const task = preset.buildTask();
        setActiveTaskId(task.id);
        orchestrator.dispatchTask(task);
    }, [orchestrator]);
    const renderModuleCard = (module) => {
        const { definition, status } = module;
        const color = moduleStateColor[status.state] ?? 'default';
        const reliabilityPercent = Math.round(status.telemetry.reliability * 100);
        return (<Grid_1.default xs={12} md={6} lg={4} key={definition.id}>
        <material_1.Card elevation={3} sx={{ height: '100%' }}>
          <material_1.CardContent>
            <material_1.Stack direction="row" justifyContent="space-between" alignItems="center">
              <material_1.Box>
                <material_1.Typography variant="h6">{definition.displayName}</material_1.Typography>
                <material_1.Typography variant="body2" color="text.secondary">
                  {definition.summary}
                </material_1.Typography>
              </material_1.Box>
              <material_1.Chip label={status.state.toUpperCase()} color={color} size="small"/>
            </material_1.Stack>

            <material_1.Stack spacing={1.5} sx={{ mt: 2 }}>
              <material_1.Typography variant="caption" color="text.secondary">
                Capabilities
              </material_1.Typography>
              <material_1.Stack direction="row" spacing={1} flexWrap="wrap">
                {definition.capabilities.map((capability) => (<material_1.Chip key={capability} label={capability} size="small"/>))}
              </material_1.Stack>
            </material_1.Stack>

            <material_1.Stack spacing={1.5} sx={{ mt: 3 }}>
              <material_1.Typography variant="caption" color="text.secondary">
                Telemetry
              </material_1.Typography>
              <material_1.Stack spacing={1}>
                <material_1.Tooltip title="Average execution latency for the module">
                  <material_1.Stack direction="row" justifyContent="space-between">
                    <material_1.Typography variant="body2">Latency</material_1.Typography>
                    <material_1.Typography variant="body2">
                      {status.telemetry.latencyMs} ms
                    </material_1.Typography>
                  </material_1.Stack>
                </material_1.Tooltip>
                <material_1.Tooltip title="Average module utilization">
                  <material_1.Stack direction="row" justifyContent="space-between">
                    <material_1.Typography variant="body2">Utilization</material_1.Typography>
                    <material_1.Typography variant="body2">
                      {metricValue(status.telemetry.utilization * 100)}%
                    </material_1.Typography>
                  </material_1.Stack>
                </material_1.Tooltip>
                <material_1.Tooltip title="Execution success rate">
                  <material_1.Stack>
                    <material_1.Stack direction="row" justifyContent="space-between">
                      <material_1.Typography variant="body2">Reliability</material_1.Typography>
                      <material_1.Typography variant="body2">
                        {reliabilityPercent}%
                      </material_1.Typography>
                    </material_1.Stack>
                    <material_1.LinearProgress variant="determinate" value={reliabilityPercent} sx={{ height: 8, borderRadius: 4, mt: 0.5 }}/>
                  </material_1.Stack>
                </material_1.Tooltip>
                <material_1.Stack direction="row" justifyContent="space-between">
                  <material_1.Typography variant="body2">Tasks Processed</material_1.Typography>
                  <material_1.Typography variant="body2">
                    {status.tasksProcessed}
                  </material_1.Typography>
                </material_1.Stack>
                <material_1.Stack direction="row" justifyContent="space-between">
                  <material_1.Typography variant="body2">Uptime</material_1.Typography>
                  <material_1.Typography variant="body2">
                    {formatUptime(status.uptimeMs)}
                  </material_1.Typography>
                </material_1.Stack>
              </material_1.Stack>
            </material_1.Stack>
          </material_1.CardContent>
        </material_1.Card>
      </Grid_1.default>);
    };
    const renderTaskHistory = () => (<material_1.Stack spacing={2}>
      {snapshot.tasks.slice(0, 6).map((record) => (<material_1.Card key={`${record.task.id} -${record.startedAt} `} variant="outlined" sx={{
                borderColor: record.status === 'completed'
                    ? (theme) => (0, material_1.alpha)(theme.palette.success.main, 0.4)
                    : record.status === 'error'
                        ? (theme) => (0, material_1.alpha)(theme.palette.error.main, 0.4)
                        : undefined,
            }}>
          <material_1.CardContent>
            <material_1.Stack direction="row" justifyContent="space-between" alignItems="center">
              <material_1.Box>
                <material_1.Typography variant="subtitle1">{record.task.name}</material_1.Typography>
                <material_1.Typography variant="body2" color="text.secondary">
                  {record.task.requestedBy} •{' '}
                  {new Date(record.startedAt).toLocaleTimeString()}
                </material_1.Typography>
              </material_1.Box>
              <material_1.Chip label={record.status.toUpperCase()} color={record.status === 'completed'
                ? 'success'
                : record.status === 'error'
                    ? 'error'
                    : 'warning'} size="small"/>
            </material_1.Stack>
            <material_1.Divider sx={{ my: 2 }}/>
            <Grid_1.default container spacing={2}>
              {record.results.map((result) => (<Grid_1.default xs={12} md={6} key={`${result.moduleId} -${result.action} `}>
                  <material_1.Stack spacing={0.5}>
                    <material_1.Typography variant="body2" fontWeight={600}>
                      {result.moduleId} — {result.action}
                    </material_1.Typography>
                    <material_1.Typography variant="body2" color="text.secondary">
                      {result.message}
                    </material_1.Typography>
                  </material_1.Stack>
                </Grid_1.default>))}
            </Grid_1.default>
          </material_1.CardContent>
        </material_1.Card>))}
    </material_1.Stack>);
    return (<material_1.Box sx={{ p: 3 }}>
      <material_1.Stack spacing={3}>
        <material_1.Card elevation={4}>
          <material_1.CardContent>
            <material_1.Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <material_1.Box>
                <material_1.Stack direction="row" spacing={1} alignItems="center">
                  <Timeline_1.default color="primary"/>
                  <material_1.Typography variant="h5">
                    Launchable Orchestrator Control Center
                  </material_1.Typography>
                </material_1.Stack>
                <material_1.Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                  Coordinate Maestro Composer, Build Plane, Build Platform,
                  CompanyOS, Switchboard, IntelGraph, and Activities from a
                  single real-time control surface.
                </material_1.Typography>
              </material_1.Box>
              <material_1.Chip icon={<PlayArrow_1.default />} label={initialized ? 'Online' : 'Initializing'} color={initialized ? 'success' : 'warning'}/>
            </material_1.Stack>
          </material_1.CardContent>
        </material_1.Card>

        <material_1.Card elevation={3}>
          <material_1.CardContent>
            <material_1.Stack spacing={2}>
              <material_1.Typography variant="h6">Mission Presets</material_1.Typography>
              <Grid_1.default container spacing={2}>
                {presets.map((preset) => {
            const isActive = Boolean(activeTaskId && activeTaskId.startsWith(preset.id));
            return (<Grid_1.default xs={12} md={6} lg={3} key={preset.id}>
                      <material_1.Card variant="outlined" sx={{
                    height: '100%',
                    borderColor: isActive
                        ? (theme) => theme.palette.primary.main
                        : undefined,
                }}>
                        <material_1.CardContent>
                          <material_1.Stack spacing={2}>
                            <material_1.Stack direction="row" spacing={1} alignItems="center">
                              <material_1.Chip icon={preset.icon} label={preset.name} variant="outlined"/>
                            </material_1.Stack>
                            <material_1.Typography variant="body2" color="text.secondary">
                              {preset.description}
                            </material_1.Typography>
                            <material_1.Button variant="contained" startIcon={<PlayArrow_1.default />} onClick={() => handleRunTask(preset)} disabled={isActive}>
                              Launch
                            </material_1.Button>
                          </material_1.Stack>
                        </material_1.CardContent>
                      </material_1.Card>
                    </Grid_1.default>);
        })}
              </Grid_1.default>
            </material_1.Stack>
          </material_1.CardContent>
        </material_1.Card>

        <Grid_1.default container spacing={3}>
          {snapshot.modules.map((module) => renderModuleCard(module))}
        </Grid_1.default>

        <material_1.Card elevation={3}>
          <material_1.CardContent>
            <material_1.Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <Checklist_1.default color="primary"/>
              <material_1.Typography variant="h6">Recent Missions</material_1.Typography>
            </material_1.Stack>
            {snapshot.tasks.length === 0 ? (<material_1.Typography variant="body2" color="text.secondary">
                No missions executed yet. Launch a preset to generate telemetry.
              </material_1.Typography>) : (renderTaskHistory())}
          </material_1.CardContent>
        </material_1.Card>
      </material_1.Stack>
    </material_1.Box>);
};
exports.default = OrchestratorDashboard;
