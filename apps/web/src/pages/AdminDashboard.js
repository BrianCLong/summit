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
exports.default = AdminDashboard;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const react_2 = require("@apollo/client/react");
const client_1 = require("@apollo/client");
const DashboardOverview_1 = __importDefault(require("../components/admin/DashboardOverview"));
const UserManagement_1 = __importDefault(require("../components/admin/UserManagement"));
// TODO: Implement missing admin components
// import ModerationQueue from '../components/admin/ModerationQueue';
// import FeatureFlagsPanel from '../components/admin/FeatureFlagsPanel';
// import AuditLogViewer from '../components/admin/AuditLogViewer';
// import DataExportTools from '../components/admin/DataExportTools';
// import SystemConfigPanel from '../components/admin/SystemConfigPanel';
// import AlertsPanel from '../components/admin/AlertsPanel';
// ============================================================================
// GRAPHQL QUERIES
// ============================================================================
const GET_DASHBOARD_STATS = (0, client_1.gql) `
  query GetAdminDashboard {
    adminDashboard {
      users {
        totalUsers
        activeUsers
        suspendedUsers
        adminUsers
        analystUsers
        viewerUsers
        activeToday
        activeThisWeek
        newThisMonth
      }
      audit {
        totalEvents
        eventsToday
        eventsThisWeek
        successfulEvents
        failedEvents
        uniqueUsers
        topActions {
          action
          count
        }
      }
      moderation {
        totalItems
        pendingItems
        approvedItems
        rejectedItems
        criticalItems
        highPriorityItems
        avgResolutionTimeSeconds
      }
      alerts {
        totalAlerts
        activeAlerts
        criticalAlerts
        highSeverityAlerts
        securityAlerts
        performanceAlerts
      }
    }
  }
`;
const GET_ACTIVE_ALERTS = (0, client_1.gql) `
  query GetActiveAlerts {
    adminAlerts(status: ACTIVE, limit: 5) {
      id
      alertType
      severity
      title
      message
      createdAt
    }
  }
`;
// ============================================================================
// COMPONENTS
// ============================================================================
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (<div role="tabpanel" hidden={value !== index} id={`admin-tabpanel-${index}`} aria-labelledby={`admin-tab-${index}`} {...other}>
      {value === index && <material_1.Box sx={{ py: 3 }}>{children}</material_1.Box>}
    </div>);
}
function a11yProps(index) {
    return {
        id: `admin-tab-${index}`,
        'aria-controls': `admin-tabpanel-${index}`,
    };
}
// ============================================================================
// MAIN COMPONENT
// ============================================================================
function AdminDashboard() {
    const [currentTab, setCurrentTab] = (0, react_1.useState)(0);
    const { data: dashboardData, loading: dashboardLoading, error: dashboardError } = (0, react_2.useQuery)(GET_DASHBOARD_STATS, {
        pollInterval: 30000, // Refresh every 30 seconds
    });
    const { data: alertsData } = (0, react_2.useQuery)(GET_ACTIVE_ALERTS, {
        pollInterval: 15000, // Refresh every 15 seconds
    });
    const handleTabChange = (_event, newValue) => {
        setCurrentTab(newValue);
    };
    const activeAlertCount = alertsData?.adminAlerts?.filter((alert) => alert.severity === 'CRITICAL' || alert.severity === 'HIGH').length || 0;
    if (dashboardError) {
        return (<material_1.Container maxWidth="xl">
        <material_1.Box sx={{ mt: 4 }}>
          <material_1.Alert severity="error">
            Failed to load admin dashboard: {dashboardError.message}
            <br />
            Please ensure you have admin privileges.
          </material_1.Alert>
        </material_1.Box>
      </material_1.Container>);
    }
    return (<material_1.Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <material_1.Typography variant="h4" component="h1" gutterBottom>
          Admin Panel
        </material_1.Typography>
        <material_1.IconButton color="inherit" size="large">
          <material_1.Badge badgeContent={activeAlertCount} color="error">
            <icons_material_1.Notifications />
          </material_1.Badge>
        </material_1.IconButton>
      </material_1.Box>

      {/* Critical Alerts Banner */}
      {alertsData?.adminAlerts?.some((alert) => alert.severity === 'CRITICAL') && (<material_1.Alert severity="error" sx={{ mb: 3 }}>
          <material_1.Typography variant="subtitle1" fontWeight="bold">
            Critical Alerts Require Attention
          </material_1.Typography>
          {alertsData.adminAlerts
                .filter((alert) => alert.severity === 'CRITICAL')
                .map((alert) => (<material_1.Typography key={alert.id} variant="body2">
                • {alert.title}
              </material_1.Typography>))}
        </material_1.Alert>)}

      {/* Tabs */}
      <material_1.Paper sx={{ mb: 3 }}>
        <material_1.Tabs value={currentTab} onChange={handleTabChange} aria-label="admin panel tabs" variant="scrollable" scrollButtons="auto">
          <material_1.Tab icon={<icons_material_1.Dashboard />} label="Dashboard" {...a11yProps(0)}/>
          <material_1.Tab icon={<icons_material_1.People />} label="Users" {...a11yProps(1)}/>
          <material_1.Tab icon={<material_1.Badge badgeContent={dashboardData?.adminDashboard?.moderation?.pendingItems || 0} color="warning">
                <icons_material_1.Gavel />
              </material_1.Badge>} label="Moderation" {...a11yProps(2)}/>
          <material_1.Tab icon={<icons_material_1.Flag />} label="Feature Flags" {...a11yProps(3)}/>
          <material_1.Tab icon={<icons_material_1.Description />} label="Audit Logs" {...a11yProps(4)}/>
          <material_1.Tab icon={<icons_material_1.GetApp />} label="Data Exports" {...a11yProps(5)}/>
          <material_1.Tab icon={<icons_material_1.Settings />} label="System Config" {...a11yProps(6)}/>
          <material_1.Tab icon={<material_1.Badge badgeContent={activeAlertCount} color="error">
                <icons_material_1.Notifications />
              </material_1.Badge>} label="Alerts" {...a11yProps(7)}/>
        </material_1.Tabs>
      </material_1.Paper>

      {/* Tab Panels */}
      <TabPanel value={currentTab} index={0}>
        <DashboardOverview_1.default data={dashboardData?.adminDashboard} loading={dashboardLoading}/>
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        <UserManagement_1.default />
      </TabPanel>

      <TabPanel value={currentTab} index={2}>
        <material_1.Typography>Moderation Queue (Coming Soon)</material_1.Typography>
      </TabPanel>

      <TabPanel value={currentTab} index={3}>
        <material_1.Typography>Feature Flags (Coming Soon)</material_1.Typography>
      </TabPanel>

      <TabPanel value={currentTab} index={4}>
        <material_1.Typography>Audit Log Viewer (Coming Soon)</material_1.Typography>
      </TabPanel>

      <TabPanel value={currentTab} index={5}>
        <material_1.Typography>Data Export Tools (Coming Soon)</material_1.Typography>
      </TabPanel>

      <TabPanel value={currentTab} index={6}>
        <material_1.Typography>System Configuration (Coming Soon)</material_1.Typography>
      </TabPanel>

      <TabPanel value={currentTab} index={7}>
        <material_1.Typography>Alerts Panel (Coming Soon)</material_1.Typography>
      </TabPanel>
    </material_1.Container>);
}
