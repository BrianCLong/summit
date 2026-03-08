"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardOverview;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const recharts_1 = require("recharts");
// ============================================================================
// COMPONENT
// ============================================================================
function DashboardOverview({ data, loading }) {
    if (loading || !data) {
        return (<material_1.Grid container spacing={3}>
        {[1, 2, 3, 4].map((i) => (<material_1.Grid item xs={12} sm={6} md={3} key={i}>
            <material_1.Skeleton variant="rectangular" height={150}/>
          </material_1.Grid>))}
      </material_1.Grid>);
    }
    const { users, audit, moderation, alerts } = data;
    // Calculate percentages
    const activeUserPercentage = (users.activeUsers / users.totalUsers) * 100;
    const auditSuccessRate = (audit.successfulEvents / audit.totalEvents) * 100;
    const moderationPendingPercentage = (moderation.pendingItems / moderation.totalItems) * 100;
    // Data for charts
    const userRoleData = [
        { name: 'Admins', value: users.adminUsers },
        { name: 'Analysts', value: users.analystUsers },
        { name: 'Viewers', value: users.viewerUsers },
    ];
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];
    return (<material_1.Box>
      {/* Key Metrics */}
      <material_1.Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Total Users */}
        <material_1.Grid item xs={12} sm={6} md={3}>
          <material_1.Card>
            <material_1.CardContent>
              <material_1.Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <icons_material_1.People color="primary" sx={{ mr: 1 }}/>
                <material_1.Typography variant="h6" color="textSecondary">
                  Total Users
                </material_1.Typography>
              </material_1.Box>
              <material_1.Typography variant="h3" component="div" gutterBottom>
                {users.totalUsers.toLocaleString()}
              </material_1.Typography>
              <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <material_1.Chip label={`${users.activeUsers} active`} size="small" color="success" variant="outlined"/>
                {users.suspendedUsers > 0 && (<material_1.Chip label={`${users.suspendedUsers} suspended`} size="small" color="error" variant="outlined"/>)}
              </material_1.Box>
              <material_1.Box sx={{ mt: 2 }}>
                <material_1.Typography variant="caption" color="textSecondary">
                  Active Rate
                </material_1.Typography>
                <material_1.LinearProgress variant="determinate" value={activeUserPercentage} sx={{ mt: 0.5 }}/>
              </material_1.Box>
            </material_1.CardContent>
          </material_1.Card>
        </material_1.Grid>

        {/* Activity */}
        <material_1.Grid item xs={12} sm={6} md={3}>
          <material_1.Card>
            <material_1.CardContent>
              <material_1.Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <icons_material_1.TrendingUp color="success" sx={{ mr: 1 }}/>
                <material_1.Typography variant="h6" color="textSecondary">
                  Activity
                </material_1.Typography>
              </material_1.Box>
              <material_1.Typography variant="h3" component="div" gutterBottom>
                {users.activeToday.toLocaleString()}
              </material_1.Typography>
              <material_1.Typography variant="body2" color="textSecondary">
                Active today
              </material_1.Typography>
              <material_1.Box sx={{ mt: 2 }}>
                <material_1.Typography variant="caption" display="block">
                  {users.activeThisWeek} active this week
                </material_1.Typography>
                <material_1.Typography variant="caption" display="block">
                  {users.newThisMonth} new this month
                </material_1.Typography>
              </material_1.Box>
            </material_1.CardContent>
          </material_1.Card>
        </material_1.Grid>

        {/* Moderation */}
        <material_1.Grid item xs={12} sm={6} md={3}>
          <material_1.Card>
            <material_1.CardContent>
              <material_1.Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <icons_material_1.Assignment color="warning" sx={{ mr: 1 }}/>
                <material_1.Typography variant="h6" color="textSecondary">
                  Moderation
                </material_1.Typography>
              </material_1.Box>
              <material_1.Typography variant="h3" component="div" gutterBottom>
                {moderation.pendingItems}
              </material_1.Typography>
              <material_1.Typography variant="body2" color="textSecondary">
                Pending review
              </material_1.Typography>
              <material_1.Box sx={{ mt: 2 }}>
                {moderation.criticalItems > 0 && (<material_1.Chip label={`${moderation.criticalItems} critical`} size="small" color="error"/>)}
                {moderation.highPriorityItems > 0 && (<material_1.Chip label={`${moderation.highPriorityItems} high priority`} size="small" color="warning" sx={{ ml: 1 }}/>)}
              </material_1.Box>
            </material_1.CardContent>
          </material_1.Card>
        </material_1.Grid>

        {/* Alerts */}
        <material_1.Grid item xs={12} sm={6} md={3}>
          <material_1.Card>
            <material_1.CardContent>
              <material_1.Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <icons_material_1.Warning color="error" sx={{ mr: 1 }}/>
                <material_1.Typography variant="h6" color="textSecondary">
                  Alerts
                </material_1.Typography>
              </material_1.Box>
              <material_1.Typography variant="h3" component="div" gutterBottom>
                {alerts.activeAlerts}
              </material_1.Typography>
              <material_1.Typography variant="body2" color="textSecondary">
                Active alerts
              </material_1.Typography>
              <material_1.Box sx={{ mt: 2 }}>
                {alerts.criticalAlerts > 0 && (<material_1.Chip label={`${alerts.criticalAlerts} critical`} size="small" color="error"/>)}
                {alerts.securityAlerts > 0 && (<material_1.Chip label={`${alerts.securityAlerts} security`} size="small" color="warning" sx={{ ml: 1 }}/>)}
              </material_1.Box>
            </material_1.CardContent>
          </material_1.Card>
        </material_1.Grid>
      </material_1.Grid>

      {/* Charts and Details */}
      <material_1.Grid container spacing={3}>
        {/* User Distribution */}
        <material_1.Grid item xs={12} md={6}>
          <material_1.Paper sx={{ p: 3 }}>
            <material_1.Typography variant="h6" gutterBottom>
              User Distribution by Role
            </material_1.Typography>
            <recharts_1.ResponsiveContainer width="100%" height={300}>
              <recharts_1.PieChart>
                <recharts_1.Pie data={userRoleData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                  {userRoleData.map((entry, index) => (<recharts_1.Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]}/>))}
                </recharts_1.Pie>
                <recharts_1.Tooltip />
              </recharts_1.PieChart>
            </recharts_1.ResponsiveContainer>
          </material_1.Paper>
        </material_1.Grid>

        {/* Top Actions */}
        <material_1.Grid item xs={12} md={6}>
          <material_1.Paper sx={{ p: 3 }}>
            <material_1.Typography variant="h6" gutterBottom>
              Top Audit Actions (Last 7 Days)
            </material_1.Typography>
            <recharts_1.ResponsiveContainer width="100%" height={300}>
              <recharts_1.BarChart data={audit.topActions.slice(0, 5)}>
                <recharts_1.CartesianGrid strokeDasharray="3 3"/>
                <recharts_1.XAxis dataKey="action" angle={-45} textAnchor="end" height={100}/>
                <recharts_1.YAxis />
                <recharts_1.Tooltip />
                <recharts_1.Bar dataKey="count" fill="#8884d8"/>
              </recharts_1.BarChart>
            </recharts_1.ResponsiveContainer>
          </material_1.Paper>
        </material_1.Grid>

        {/* Audit Summary */}
        <material_1.Grid item xs={12} md={6}>
          <material_1.Paper sx={{ p: 3 }}>
            <material_1.Typography variant="h6" gutterBottom>
              Audit Summary
            </material_1.Typography>
            <material_1.List>
              <material_1.ListItem>
                <material_1.ListItemText primary="Total Events" secondary={audit.totalEvents.toLocaleString()}/>
                <icons_material_1.CheckCircle color="success"/>
              </material_1.ListItem>
              <material_1.ListItem>
                <material_1.ListItemText primary="Events Today" secondary={audit.eventsToday.toLocaleString()}/>
              </material_1.ListItem>
              <material_1.ListItem>
                <material_1.ListItemText primary="Success Rate" secondary={`${auditSuccessRate.toFixed(1)}%`}/>
                <material_1.LinearProgress variant="determinate" value={auditSuccessRate} sx={{ width: 100, ml: 2 }}/>
              </material_1.ListItem>
              <material_1.ListItem>
                <material_1.ListItemText primary="Failed Events" secondary={audit.failedEvents.toLocaleString()}/>
                {audit.failedEvents > 0 && <icons_material_1.Error color="error"/>}
              </material_1.ListItem>
              <material_1.ListItem>
                <material_1.ListItemText primary="Unique Users" secondary={audit.uniqueUsers.toLocaleString()}/>
              </material_1.ListItem>
            </material_1.List>
          </material_1.Paper>
        </material_1.Grid>

        {/* Moderation Summary */}
        <material_1.Grid item xs={12} md={6}>
          <material_1.Paper sx={{ p: 3 }}>
            <material_1.Typography variant="h6" gutterBottom>
              Moderation Summary
            </material_1.Typography>
            <material_1.List>
              <material_1.ListItem>
                <material_1.ListItemText primary="Total Items" secondary={moderation.totalItems.toLocaleString()}/>
              </material_1.ListItem>
              <material_1.ListItem>
                <material_1.ListItemText primary="Pending Review" secondary={moderation.pendingItems.toLocaleString()}/>
                <material_1.Chip label={`${moderationPendingPercentage.toFixed(0)}%`} color={moderationPendingPercentage > 50 ? 'warning' : 'default'} size="small"/>
              </material_1.ListItem>
              <material_1.ListItem>
                <material_1.ListItemText primary="Approved" secondary={moderation.approvedItems.toLocaleString()}/>
                <icons_material_1.CheckCircle color="success"/>
              </material_1.ListItem>
              <material_1.ListItem>
                <material_1.ListItemText primary="Rejected" secondary={moderation.rejectedItems.toLocaleString()}/>
              </material_1.ListItem>
              <material_1.ListItem>
                <material_1.ListItemText primary="Avg Resolution Time" secondary={`${Math.round(moderation.avgResolutionTimeSeconds / 60)} minutes`}/>
              </material_1.ListItem>
            </material_1.List>
          </material_1.Paper>
        </material_1.Grid>
      </material_1.Grid>
    </material_1.Box>);
}
