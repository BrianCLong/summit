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
exports.AlertsPage = AlertsPage;
/**
 * Alerts Page
 * Shows user's alerts and tasks with offline support
 */
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const useAlerts_1 = require("@/hooks/useAlerts");
const useTasks_1 = require("@/hooks/useTasks");
const theme_1 = require("@/theme");
function TabPanel({ children, value, index }) {
    return (<div role="tabpanel" hidden={value !== index}>
      {value === index && <material_1.Box sx={{ pt: 1 }}>{children}</material_1.Box>}
    </div>);
}
// Severity icon component
function SeverityIcon({ severity }) {
    const color = (0, theme_1.getSeverityColor)(severity);
    switch (severity) {
        case 'critical':
            return <icons_material_1.Error sx={{ color }}/>;
        case 'error':
        case 'warning':
            return <icons_material_1.Warning sx={{ color }}/>;
        default:
            return <icons_material_1.Info sx={{ color }}/>;
    }
}
function AlertItem({ alert, onAcknowledge, onSelect }) {
    return (<material_1.ListItem onClick={() => onSelect(alert)} sx={{
            bgcolor: alert.isRead ? 'transparent' : 'action.hover',
            borderRadius: 2,
            mb: 1,
            cursor: 'pointer',
        }}>
      <material_1.ListItemIcon>
        <SeverityIcon severity={alert.severity}/>
      </material_1.ListItemIcon>
      <material_1.ListItemText primary={<material_1.Typography variant="body1" fontWeight={alert.isRead ? 400 : 600} noWrap>
            {alert.title}
          </material_1.Typography>} secondary={<material_1.Box>
            <material_1.Typography variant="caption" color="text.secondary" noWrap>
              {alert.message}
            </material_1.Typography>
            <material_1.Typography variant="caption" color="text.disabled" display="block">
              {new Date(alert.createdAt).toLocaleString()}
            </material_1.Typography>
          </material_1.Box>}/>
      <material_1.ListItemSecondaryAction>
        {!alert.acknowledgedAt ? (<material_1.IconButton edge="end" onClick={(e) => {
                e.stopPropagation();
                onAcknowledge(alert.id);
            }} size="small">
            <icons_material_1.Done />
          </material_1.IconButton>) : (<icons_material_1.CheckCircle color="success" fontSize="small"/>)}
      </material_1.ListItemSecondaryAction>
    </material_1.ListItem>);
}
function TaskItem({ task, onComplete, onSelect }) {
    const priorityColor = (0, theme_1.getPriorityColor)(task.priority);
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
    return (<material_1.ListItem onClick={() => onSelect(task)} sx={{
            borderRadius: 2,
            mb: 1,
            cursor: 'pointer',
            borderLeft: `4px solid ${priorityColor}`,
        }}>
      <material_1.ListItemIcon>
        <icons_material_1.Assignment />
      </material_1.ListItemIcon>
      <material_1.ListItemText primary={<material_1.Box display="flex" alignItems="center" gap={1}>
            <material_1.Typography variant="body1" fontWeight={500} noWrap sx={{ flex: 1 }}>
              {task.title}
            </material_1.Typography>
            <material_1.Chip label={task.priority} size="small" sx={{
                bgcolor: priorityColor,
                color: 'white',
                fontSize: '0.65rem',
                height: 20,
            }}/>
          </material_1.Box>} secondary={<material_1.Box>
            {task.dueDate && (<material_1.Typography variant="caption" color={isOverdue ? 'error' : 'text.secondary'}>
                Due: {new Date(task.dueDate).toLocaleDateString()}
                {isOverdue && ' (Overdue)'}
              </material_1.Typography>)}
          </material_1.Box>}/>
      <material_1.ListItemSecondaryAction>
        {task.status !== 'completed' ? (<material_1.IconButton edge="end" onClick={(e) => {
                e.stopPropagation();
                onComplete(task.id);
            }} size="small">
            <icons_material_1.Done />
          </material_1.IconButton>) : (<icons_material_1.CheckCircle color="success" fontSize="small"/>)}
      </material_1.ListItemSecondaryAction>
    </material_1.ListItem>);
}
// Main Alerts Page
function AlertsPage() {
    const [tabValue, setTabValue] = (0, react_1.useState)(0);
    const [selectedAlert, setSelectedAlert] = (0, react_1.useState)(null);
    const [selectedTask, setSelectedTask] = (0, react_1.useState)(null);
    const { alerts, unreadCount, isLoading: alertsLoading, refresh: refreshAlerts, acknowledge, } = (0, useAlerts_1.useAlerts)();
    const { tasks, pendingCount, isLoading: tasksLoading, refresh: refreshTasks, updateStatus, } = (0, useTasks_1.useTasks)();
    const handleRefresh = async () => {
        await Promise.all([refreshAlerts(), refreshTasks()]);
    };
    const handleCompleteTask = (id) => {
        updateStatus(id, 'completed');
    };
    return (<material_1.Box sx={{ pb: 8 }}>
      {/* Header */}
      <material_1.Box sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
        }}>
        <material_1.Typography variant="h5" fontWeight={600}>
          Inbox
        </material_1.Typography>
        <material_1.IconButton onClick={handleRefresh} disabled={alertsLoading || tasksLoading}>
          <icons_material_1.Refresh />
        </material_1.IconButton>
      </material_1.Box>

      {/* Tabs */}
      <material_1.Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
        <material_1.Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="fullWidth">
          <material_1.Tab label={<material_1.Badge badgeContent={unreadCount} color="error">
                <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <icons_material_1.NotificationsActive fontSize="small"/>
                  Alerts
                </material_1.Box>
              </material_1.Badge>}/>
          <material_1.Tab label={<material_1.Badge badgeContent={pendingCount} color="primary">
                <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <icons_material_1.Assignment fontSize="small"/>
                  Tasks
                </material_1.Box>
              </material_1.Badge>}/>
        </material_1.Tabs>
      </material_1.Box>

      {/* Alerts Tab */}
      <TabPanel value={tabValue} index={0}>
        <material_1.Box sx={{ px: 2 }}>
          {alertsLoading ? (Array.from({ length: 5 }).map((_, i) => (<material_1.Skeleton key={i} variant="rounded" height={80} sx={{ mb: 1, borderRadius: 2 }}/>))) : alerts.length === 0 ? (<material_1.Box textAlign="center" py={4}>
              <icons_material_1.NotificationsActive sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }}/>
              <material_1.Typography color="text.secondary">No alerts</material_1.Typography>
            </material_1.Box>) : (<material_1.List disablePadding>
              {alerts.map((alert) => (<AlertItem key={alert.id} alert={alert} onAcknowledge={acknowledge} onSelect={setSelectedAlert}/>))}
            </material_1.List>)}
        </material_1.Box>
      </TabPanel>

      {/* Tasks Tab */}
      <TabPanel value={tabValue} index={1}>
        <material_1.Box sx={{ px: 2 }}>
          {tasksLoading ? (Array.from({ length: 5 }).map((_, i) => (<material_1.Skeleton key={i} variant="rounded" height={80} sx={{ mb: 1, borderRadius: 2 }}/>))) : tasks.length === 0 ? (<material_1.Box textAlign="center" py={4}>
              <icons_material_1.Assignment sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }}/>
              <material_1.Typography color="text.secondary">No tasks</material_1.Typography>
            </material_1.Box>) : (<material_1.List disablePadding>
              {tasks.map((task) => (<TaskItem key={task.id} task={task} onComplete={handleCompleteTask} onSelect={setSelectedTask}/>))}
            </material_1.List>)}
        </material_1.Box>
      </TabPanel>

      {/* Alert Detail Drawer */}
      <material_1.SwipeableDrawer anchor="bottom" open={!!selectedAlert} onClose={() => setSelectedAlert(null)} onOpen={() => { }} PaperProps={{
            sx: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
        }}>
        {selectedAlert && (<material_1.Box sx={{ p: 3 }}>
            <material_1.Box display="flex" alignItems="flex-start" gap={2} mb={2}>
              <SeverityIcon severity={selectedAlert.severity}/>
              <material_1.Box flex={1}>
                <material_1.Typography variant="h6">{selectedAlert.title}</material_1.Typography>
                <material_1.Chip label={selectedAlert.type.replace('_', ' ')} size="small" sx={{ mt: 0.5 }}/>
              </material_1.Box>
            </material_1.Box>
            <material_1.Typography variant="body1" paragraph>
              {selectedAlert.message}
            </material_1.Typography>
            <material_1.Divider sx={{ my: 2 }}/>
            <material_1.Typography variant="caption" color="text.secondary">
              Created: {new Date(selectedAlert.createdAt).toLocaleString()}
            </material_1.Typography>
            {selectedAlert.acknowledgedAt && (<material_1.Typography variant="caption" color="text.secondary" display="block">
                Acknowledged: {new Date(selectedAlert.acknowledgedAt).toLocaleString()}
              </material_1.Typography>)}
            <material_1.Box mt={3} display="flex" gap={2}>
              {!selectedAlert.acknowledgedAt && (<material_1.Button variant="contained" fullWidth onClick={() => {
                    acknowledge(selectedAlert.id);
                    setSelectedAlert(null);
                }}>
                  Acknowledge
                </material_1.Button>)}
              {selectedAlert.caseId && (<material_1.Button variant="outlined" fullWidth endIcon={<icons_material_1.ChevronRight />} href={`/cases/${selectedAlert.caseId}`}>
                  View Case
                </material_1.Button>)}
            </material_1.Box>
          </material_1.Box>)}
      </material_1.SwipeableDrawer>

      {/* Task Detail Drawer */}
      <material_1.SwipeableDrawer anchor="bottom" open={!!selectedTask} onClose={() => setSelectedTask(null)} onOpen={() => { }} PaperProps={{
            sx: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
        }}>
        {selectedTask && (<material_1.Box sx={{ p: 3 }}>
            <material_1.Box display="flex" alignItems="flex-start" gap={2} mb={2}>
              <icons_material_1.Assignment />
              <material_1.Box flex={1}>
                <material_1.Typography variant="h6">{selectedTask.title}</material_1.Typography>
                <material_1.Chip label={selectedTask.priority} size="small" sx={{
                mt: 0.5,
                bgcolor: (0, theme_1.getPriorityColor)(selectedTask.priority),
                color: 'white',
            }}/>
              </material_1.Box>
            </material_1.Box>
            {selectedTask.description && (<material_1.Typography variant="body1" paragraph>
                {selectedTask.description}
              </material_1.Typography>)}
            <material_1.Divider sx={{ my: 2 }}/>
            <material_1.Typography variant="caption" color="text.secondary">
              Status: {selectedTask.status}
            </material_1.Typography>
            {selectedTask.dueDate && (<material_1.Typography variant="caption" color="text.secondary" display="block">
                Due: {new Date(selectedTask.dueDate).toLocaleString()}
              </material_1.Typography>)}
            <material_1.Box mt={3} display="flex" gap={2}>
              {selectedTask.status !== 'completed' && (<material_1.Button variant="contained" fullWidth onClick={() => {
                    handleCompleteTask(selectedTask.id);
                    setSelectedTask(null);
                }}>
                  Mark Complete
                </material_1.Button>)}
              <material_1.Button variant="outlined" fullWidth endIcon={<icons_material_1.ChevronRight />} href={`/cases/${selectedTask.caseId}`}>
                View Case
              </material_1.Button>
            </material_1.Box>
          </material_1.Box>)}
      </material_1.SwipeableDrawer>
    </material_1.Box>);
}
exports.default = AlertsPage;
