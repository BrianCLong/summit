"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// client/src/components/ui/StatusBar.tsx
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const StatusIndicator_1 = __importDefault(require("./StatusIndicator"));
const StatusBar = ({ environment = 'development', dataStatus = 'simulated', systemStatus = 'operational', simulationStatus = false, additionalIndicators = [], showBorder = true }) => {
    const getEnvironmentConfig = () => {
        switch (environment) {
            case 'development':
                return { status: 'testing', label: 'DEV', desc: 'Development Environment' };
            case 'staging':
                return { status: 'testing', label: 'STAGING', desc: 'Staging Environment' };
            case 'production':
                return { status: 'real', label: 'PROD', desc: 'Production Environment' };
            case 'demo':
                return { status: 'simulated', label: 'DEMO', desc: 'Demonstration Environment' };
            default:
                return { status: 'testing', label: 'ENV', desc: 'Environment Indicator' };
        }
    };
    const getSystemStatusConfig = () => {
        switch (systemStatus) {
            case 'operational':
                return { status: 'real', label: 'UP', desc: 'Systems Operational' };
            case 'degraded':
                return { status: 'partial', label: 'DEGRADED', desc: 'Systems Degraded' };
            case 'maintenance':
                return { status: 'maintenance', label: 'MAINT', desc: 'Maintenance Mode' };
            default:
                return { status: 'partial', label: 'STATUS', desc: 'System Status' };
        }
    };
    const envConfig = getEnvironmentConfig();
    const sysConfig = getSystemStatusConfig();
    const dataConfig = { status: dataStatus, label: dataStatus.toUpperCase(), desc: `Data: ${dataStatus.charAt(0).toUpperCase() + dataStatus.slice(1)}` };
    const normalizeStatus = (value) => {
        const allowed = ['simulated', 'real', 'partial', 'testing', 'maintenance'];
        return allowed.includes(value) ? value : 'partial';
    };
    return (<material_1.AppBar position="static" color="default" elevation={0} sx={{
            backgroundColor: '#fafafa',
            borderBottom: showBorder ? '1px solid #e0e0e0' : 'none',
            zIndex: (theme) => theme.zIndex.drawer + 1,
            padding: '4px 0'
        }}>
      <material_1.Toolbar sx={{ minHeight: '32px !important', paddingLeft: '16px !important', paddingRight: '16px !important' }}>
        <material_1.Typography variant="caption" color="textSecondary" sx={{
            marginRight: 2,
            minWidth: '80px',
            fontWeight: 'bold',
            textTransform: 'uppercase'
        }}>
          SUMMIT
        </material_1.Typography>
        
        <material_1.Divider orientation="vertical" flexItem sx={{ mx: 1 }}/>
        
        <material_1.Stack direction="row" spacing={1} alignItems="center">
          <StatusIndicator_1.default status={envConfig.status} label={envConfig.label} description={envConfig.desc} size="small"/>
          
          <StatusIndicator_1.default status={dataConfig.status} label={dataConfig.label} description={dataConfig.desc} size="small"/>
          
          <StatusIndicator_1.default status={sysConfig.status} label={sysConfig.label} description={sysConfig.desc} size="small"/>
          
          {simulationStatus && (<StatusIndicator_1.default status="simulated" label="SIM" description="Simulation Mode Active" size="small"/>)}
          
          {additionalIndicators.map((indicator, index) => (<StatusIndicator_1.default key={`additional-${index}`} status={normalizeStatus(indicator.status)} label={indicator.label} description={indicator.description} size="small"/>))}
        </material_1.Stack>
      </material_1.Toolbar>
    </material_1.AppBar>);
};
exports.default = StatusBar;
