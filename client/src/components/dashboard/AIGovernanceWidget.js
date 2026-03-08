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
exports.default = AIGovernanceWidget;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const Grid_1 = __importDefault(require("@mui/material/Grid"));
const CheckCircle_1 = __importDefault(require("@mui/icons-material/CheckCircle"));
const Error_1 = __importDefault(require("@mui/icons-material/Error"));
const PauseCircle_1 = __importDefault(require("@mui/icons-material/PauseCircle"));
const Refresh_1 = __importDefault(require("@mui/icons-material/Refresh"));
const Warning_1 = __importDefault(require("@mui/icons-material/Warning"));
// Mock data - in production, this would come from a GraphQL query or API call
const mockMetrics = {
    automatedValidationRate: 85,
    humanEscalations: 12,
    policyViolations: 3,
    activeAgents: 24,
    containedAgents: 1,
    avgResponseTimeMs: 47,
};
const mockFleet = [
    {
        id: 'agent-001',
        name: 'Entity Extraction Fleet',
        status: 'active',
        policyCompliance: 98,
        lastHeartbeat: new Date(),
        incidentsToday: 0,
    },
    {
        id: 'agent-002',
        name: 'Relationship Inference Fleet',
        status: 'active',
        policyCompliance: 92,
        lastHeartbeat: new Date(),
        incidentsToday: 1,
    },
    {
        id: 'agent-003',
        name: 'Anomaly Detection Fleet',
        status: 'paused',
        policyCompliance: 100,
        lastHeartbeat: new Date(Date.now() - 300000),
        incidentsToday: 0,
    },
    {
        id: 'agent-004',
        name: 'OSINT Collector Fleet',
        status: 'contained',
        policyCompliance: 67,
        lastHeartbeat: new Date(Date.now() - 600000),
        incidentsToday: 3,
    },
];
function getStatusIcon(status) {
    switch (status) {
        case 'active':
            return <CheckCircle_1.default color="success" fontSize="small"/>;
        case 'paused':
            return <PauseCircle_1.default color="warning" fontSize="small"/>;
        case 'error':
            return <Error_1.default color="error" fontSize="small"/>;
        case 'contained':
            return <Warning_1.default color="error" fontSize="small"/>;
        default:
            return null;
    }
}
function getStatusColor(status) {
    switch (status) {
        case 'active':
            return 'success';
        case 'paused':
            return 'warning';
        case 'error':
        case 'contained':
            return 'error';
        default:
            return 'default';
    }
}
function getComplianceColor(compliance) {
    if (compliance >= 90) {
        return '#4caf50';
    }
    if (compliance >= 70) {
        return '#ff9800';
    }
    return '#f44336';
}
function MetricCard({ title, value, subtitle, color }) {
    return (<material_1.Box>
      <material_1.Typography variant="caption" color="text.secondary">
        {title}
      </material_1.Typography>
      <material_1.Typography variant="h4" sx={{ color: color || 'text.primary', fontWeight: 600 }}>
        {value}
      </material_1.Typography>
      {subtitle && (<material_1.Typography variant="caption" color="text.secondary">
          {subtitle}
        </material_1.Typography>)}
    </material_1.Box>);
}
function AIGovernanceWidget() {
    const [metrics] = (0, react_1.useState)(mockMetrics);
    const [fleet] = (0, react_1.useState)(mockFleet);
    const [isRefreshing, setIsRefreshing] = (0, react_1.useState)(false);
    const handleRefresh = () => {
        setIsRefreshing(true);
        // Simulate refresh
        setTimeout(() => setIsRefreshing(false), 1000);
    };
    return (<material_1.Card elevation={1} sx={{ borderRadius: 3 }}>
      <material_1.CardContent>
        <material_1.Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <material_1.Typography variant="h6">AI Governance & Agent Fleet</material_1.Typography>
          <material_1.Stack direction="row" spacing={1} alignItems="center">
            <material_1.Chip label={`${metrics.automatedValidationRate}% Automated`} color="success" size="small" sx={{ fontWeight: 600 }}/>
            <material_1.Tooltip title="Refresh metrics">
              <material_1.IconButton size="small" onClick={handleRefresh} disabled={isRefreshing}>
                <Refresh_1.default fontSize="small" sx={{
            animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
            '@keyframes spin': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' },
            },
        }}/>
              </material_1.IconButton>
            </material_1.Tooltip>
          </material_1.Stack>
        </material_1.Stack>

        {/* Key Metrics Row */}
        <Grid_1.default container spacing={3} mb={3}>
          <Grid_1.default size={{ xs: 6, sm: 3 }}>
            <MetricCard title="Policy Validation Rate" value={`${metrics.automatedValidationRate}%`} subtitle="OPA-based validation" color="#4caf50"/>
          </Grid_1.default>
          <Grid_1.default size={{ xs: 6, sm: 3 }}>
            <MetricCard title="Human Escalations" value={metrics.humanEscalations} subtitle="Last 24 hours"/>
          </Grid_1.default>
          <Grid_1.default size={{ xs: 6, sm: 3 }}>
            <MetricCard title="Active Agents" value={metrics.activeAgents} subtitle={`${metrics.containedAgents} contained`} color={metrics.containedAgents > 0 ? '#ff9800' : '#4caf50'}/>
          </Grid_1.default>
          <Grid_1.default size={{ xs: 6, sm: 3 }}>
            <MetricCard title="Avg Response Time" value={`${metrics.avgResponseTimeMs}ms`} subtitle="Incident response" color="#2196f3"/>
          </Grid_1.default>
        </Grid_1.default>

        {/* Agent Fleet Status */}
        <material_1.Typography variant="subtitle2" color="text.secondary" mb={1}>
          Agent Fleet Status
        </material_1.Typography>
        <material_1.Stack spacing={1}>
          {fleet.map((agent) => (<material_1.Box key={agent.id} sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'action.hover',
            }}>
              <material_1.Stack direction="row" spacing={1.5} alignItems="center">
                {getStatusIcon(agent.status)}
                <material_1.Box>
                  <material_1.Typography variant="body2" fontWeight={500}>
                    {agent.name}
                  </material_1.Typography>
                  <material_1.Typography variant="caption" color="text.secondary">
                    Last heartbeat:{' '}
                    {agent.lastHeartbeat.toLocaleTimeString()}
                  </material_1.Typography>
                </material_1.Box>
              </material_1.Stack>
              <material_1.Stack direction="row" spacing={2} alignItems="center">
                <material_1.Tooltip title="Policy Compliance">
                  <material_1.Box sx={{ width: 100 }}>
                    <material_1.Stack direction="row" justifyContent="space-between">
                      <material_1.Typography variant="caption">Compliance</material_1.Typography>
                      <material_1.Typography variant="caption" sx={{ color: getComplianceColor(agent.policyCompliance) }}>
                        {agent.policyCompliance}%
                      </material_1.Typography>
                    </material_1.Stack>
                    <material_1.LinearProgress variant="determinate" value={agent.policyCompliance} sx={{
                height: 4,
                borderRadius: 2,
                bgcolor: 'action.selected',
                '& .MuiLinearProgress-bar': {
                    bgcolor: getComplianceColor(agent.policyCompliance),
                },
            }}/>
                  </material_1.Box>
                </material_1.Tooltip>
                <material_1.Chip label={agent.status.toUpperCase()} size="small" color={getStatusColor(agent.status)} variant={agent.status === 'contained' ? 'filled' : 'outlined'}/>
                {agent.incidentsToday > 0 && (<material_1.Tooltip title={`${agent.incidentsToday} incidents today`}>
                    <material_1.Chip label={`${agent.incidentsToday} incidents`} size="small" color="warning"/>
                  </material_1.Tooltip>)}
              </material_1.Stack>
            </material_1.Box>))}
        </material_1.Stack>

        {/* Incident Response Actions */}
        {metrics.containedAgents > 0 && (<material_1.Box mt={2} p={1.5} sx={{
                bgcolor: 'warning.light',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'warning.main',
            }}>
            <material_1.Stack direction="row" spacing={1} alignItems="center">
              <Warning_1.default color="warning" fontSize="small"/>
              <material_1.Typography variant="body2" fontWeight={500}>
                {metrics.containedAgents} agent(s) automatically contained due
                to policy violations
              </material_1.Typography>
            </material_1.Stack>
            <material_1.Typography variant="caption" color="text.secondary" mt={0.5}>
              Review in Agent Fleet Control Center for manual release
            </material_1.Typography>
          </material_1.Box>)}
      </material_1.CardContent>
    </material_1.Card>);
}
