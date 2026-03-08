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
exports.DashboardPage = void 0;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const recharts_1 = require("recharts");
const api_1 = require("../api");
const DashboardPage = () => {
    const [data, setData] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const fetchData = async () => {
        setLoading(true);
        try {
            const result = await api_1.api.dashboard.get();
            setData(result);
            setError(null);
        }
        catch (err) {
            setError(err.message || 'Failed to load dashboard');
        }
        finally {
            setLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);
    if (loading && !data)
        return <material_1.Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><material_1.CircularProgress /></material_1.Box>;
    if (error)
        return <material_1.Alert severity="error">{error}</material_1.Alert>;
    if (!data)
        return null;
    const { health, stats, autonomic } = data;
    // Mock trend data for charts
    const runTrend = [
        { time: '10:00', runs: 12 },
        { time: '11:00', runs: 18 },
        { time: '12:00', runs: 15 },
        { time: '13:00', runs: 25 },
        { time: '14:00', runs: 30 },
        { time: '15:00', runs: activeRunsCount(stats) },
    ];
    function activeRunsCount(s) {
        return s.activeRuns; // Just helper
    }
    return (<material_1.Box>
      <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <material_1.Typography variant="h4" fontWeight="bold">Control Room</material_1.Typography>
        <material_1.IconButton onClick={fetchData}><icons_material_1.Refresh /></material_1.IconButton>
      </material_1.Box>

      {/* Top Level Health */}
      <material_1.Grid container spacing={3} sx={{ mb: 3 }}>
        <material_1.Grid item xs={12} md={3}>
          <material_1.Paper sx={{ p: 3, textAlign: 'center', height: '100%', bgcolor: getHealthColor(health.overallScore) }}>
            <material_1.Typography variant="h6" color="white">System Health</material_1.Typography>
            <material_1.Typography variant="h2" fontWeight="bold" color="white">{health.overallScore}%</material_1.Typography>
            <material_1.Typography variant="body2" color="white" sx={{ opacity: 0.8 }}>
              {health.overallScore > 90 ? 'Operational' : 'Degraded'}
            </material_1.Typography>
          </material_1.Paper>
        </material_1.Grid>

        {health.workstreams.map((ws) => (<material_1.Grid item xs={12} sm={6} md={3} key={ws.name}>
             <material_1.Card sx={{ height: '100%' }}>
                <material_1.CardContent>
                    <material_1.Typography color="textSecondary" gutterBottom>{ws.name}</material_1.Typography>
                    <material_1.Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <material_1.Typography variant="h5">{ws.status.toUpperCase()}</material_1.Typography>
                        <material_1.Chip label={`${ws.score}%`} color={ws.score > 90 ? 'success' : ws.score > 70 ? 'warning' : 'error'}/>
                    </material_1.Box>
                    <material_1.LinearProgress variant="determinate" value={ws.score} sx={{ mt: 2 }} color={ws.score > 90 ? 'success' : 'warning'}/>
                </material_1.CardContent>
             </material_1.Card>
          </material_1.Grid>))}
      </material_1.Grid>

      {/* Alerts Section */}
      {health.activeAlerts.length > 0 && (<material_1.Box sx={{ mb: 3 }}>
             {health.activeAlerts.map(alert => (<material_1.Alert severity={alert.severity} key={alert.id} sx={{ mb: 1 }}>
                     {alert.title} — {new Date(alert.timestamp).toLocaleTimeString()}
                 </material_1.Alert>))}
          </material_1.Box>)}

      {/* Live Activity & Autonomic */}
      <material_1.Grid container spacing={3}>
          <material_1.Grid item xs={12} md={8}>
              <material_1.Paper sx={{ p: 3 }}>
                  <material_1.Typography variant="h6" gutterBottom>Run Volume (Last 6 Hours)</material_1.Typography>
                  <material_1.Box sx={{ height: 300 }}>
                      <recharts_1.ResponsiveContainer width="100%" height="100%">
                          <recharts_1.AreaChart data={runTrend}>
                              <recharts_1.CartesianGrid strokeDasharray="3 3"/>
                              <recharts_1.XAxis dataKey="time"/>
                              <recharts_1.YAxis />
                              <recharts_1.Tooltip />
                              <recharts_1.Area type="monotone" dataKey="runs" stroke="#8884d8" fill="#8884d8"/>
                          </recharts_1.AreaChart>
                      </recharts_1.ResponsiveContainer>
                  </material_1.Box>
              </material_1.Paper>
          </material_1.Grid>
          <material_1.Grid item xs={12} md={4}>
              <material_1.Paper sx={{ p: 3, mb: 3 }}>
                  <material_1.Typography variant="h6" gutterBottom>Autonomic Control</material_1.Typography>
                  <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                       <material_1.Typography>Active Loops</material_1.Typography>
                       <material_1.Typography fontWeight="bold">{autonomic.activeLoops} / {autonomic.totalLoops}</material_1.Typography>
                  </material_1.Box>
                  <material_1.Typography variant="subtitle2" gutterBottom>Recent Decisions:</material_1.Typography>
                  <material_1.Box component="ul" sx={{ pl: 2 }}>
                      {autonomic.recentDecisions.map((d, i) => (<li key={i}><material_1.Typography variant="body2">{d}</material_1.Typography></li>))}
                  </material_1.Box>
              </material_1.Paper>

              <material_1.Paper sx={{ p: 3 }}>
                   <material_1.Typography variant="h6" gutterBottom>Live Stats</material_1.Typography>
                   <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                       <material_1.Typography>Active Runs</material_1.Typography>
                       <material_1.Chip label={stats.activeRuns} color="primary" size="small"/>
                   </material_1.Box>
                   <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                       <material_1.Typography>Completed</material_1.Typography>
                       <material_1.Chip label={stats.completedRuns} color="success" size="small"/>
                   </material_1.Box>
                   <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                       <material_1.Typography>Failed</material_1.Typography>
                       <material_1.Chip label={stats.failedRuns} color="error" size="small"/>
                   </material_1.Box>
                   <material_1.Box sx={{ mt: 2 }}>
                       <material_1.Typography variant="caption">Tasks/min: {stats.tasksPerMinute}</material_1.Typography>
                   </material_1.Box>
              </material_1.Paper>
          </material_1.Grid>
      </material_1.Grid>
    </material_1.Box>);
};
exports.DashboardPage = DashboardPage;
function getHealthColor(score) {
    if (score >= 90)
        return '#2e7d32'; // Green
    if (score >= 70)
        return '#ed6c02'; // Orange
    return '#d32f2f'; // Red
}
