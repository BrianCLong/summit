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
exports.GovernancePage = void 0;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const api_1 = require("../api");
const GovernancePage = () => {
    const [logs, setLogs] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [tab, setTab] = (0, react_1.useState)(0);
    (0, react_1.useEffect)(() => {
        loadData();
    }, []);
    const loadData = async () => {
        try {
            const data = await api_1.api.audit.getLog();
            setLogs(data);
        }
        catch (err) {
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    if (loading)
        return <material_1.CircularProgress />;
    return (<material_1.Box>
      <material_1.Typography variant="h4" sx={{ mb: 3 }}>Governance & Audit</material_1.Typography>

      <material_1.Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <material_1.Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <material_1.Tab label="Audit Log"/>
          <material_1.Tab label="Policies (OPA)"/>
        </material_1.Tabs>
      </material_1.Box>

      {tab === 0 && (<material_1.Paper>
              <material_1.List>
                  {logs.map((log) => (<material_1.ListItem key={log.id} divider>
                          <material_1.ListItemText primary={<material_1.Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <material_1.Typography fontWeight="bold">{log.actor}</material_1.Typography>
                                    <material_1.Typography>performed</material_1.Typography>
                                    <material_1.Chip label={log.action} size="small"/>
                                    <material_1.Typography>on</material_1.Typography>
                                    <material_1.Typography fontWeight="bold">{log.resource}</material_1.Typography>
                                </material_1.Box>} secondary={<material_1.Box component="span" sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                      <material_1.Typography variant="caption">{log.details}</material_1.Typography>
                                      <material_1.Typography variant="caption">{new Date(log.timestamp).toLocaleString()}</material_1.Typography>
                                  </material_1.Box>}/>
                      </material_1.ListItem>))}
                  {logs.length === 0 && (<material_1.ListItem><material_1.ListItemText primary="No audit events found"/></material_1.ListItem>)}
              </material_1.List>
          </material_1.Paper>)}

      {tab === 1 && (<material_1.Paper sx={{ p: 3 }}>
              <material_1.Typography variant="h6" gutterBottom>Active Policies</material_1.Typography>
              <material_1.Box sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', bgcolor: '#f5f5f5', p: 2 }}>
            {`package maestro.authz

default allow = false

# Allow admins everything
allow {
    input.user.role == "admin"
}

# Allow operators to manage runs
allow {
    input.user.role == "operator"
    input.action == "manage_runs"
}

# Viewers can only read
allow {
    input.user.role == "viewer"
    input.action == "read"
}`}
              </material_1.Box>
          </material_1.Paper>)}
    </material_1.Box>);
};
exports.GovernancePage = GovernancePage;
