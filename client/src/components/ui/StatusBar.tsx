// client/src/components/ui/StatusBar.tsx
import React from 'react';
import { AppBar, Toolbar, Typography, Stack, Divider } from '@mui/material';
import StatusIndicator from './StatusIndicator';

interface StatusBarProps {
  environment?: 'development' | 'staging' | 'production' | 'demo';
  dataStatus?: 'simulated' | 'real' | 'partial';
  systemStatus?: 'operational' | 'degraded' | 'maintenance';
  simulationStatus?: boolean;
  additionalIndicators?: Array<{ status: string; label: string; description: string }>;
  showBorder?: boolean;
}

type IndicatorStatus = 'simulated' | 'real' | 'partial' | 'testing' | 'maintenance';

const StatusBar: React.FC<StatusBarProps> = ({
  environment = 'development',
  dataStatus = 'simulated',
  systemStatus = 'operational',
  simulationStatus = false,
  additionalIndicators = [],
  showBorder = true
}) => {
  const getEnvironmentConfig = () => {
    switch (environment) {
      case 'development':
        return { status: 'testing' as const, label: 'DEV', desc: 'Development Environment' };
      case 'staging':
        return { status: 'testing' as const, label: 'STAGING', desc: 'Staging Environment' };
      case 'production':
        return { status: 'real' as const, label: 'PROD', desc: 'Production Environment' };
      case 'demo':
        return { status: 'simulated' as const, label: 'DEMO', desc: 'Demonstration Environment' };
      default:
        return { status: 'testing' as const, label: 'ENV', desc: 'Environment Indicator' };
    }
  };

  const getSystemStatusConfig = () => {
    switch (systemStatus) {
      case 'operational':
        return { status: 'real' as const, label: 'UP', desc: 'Systems Operational' };
      case 'degraded':
        return { status: 'partial' as const, label: 'DEGRADED', desc: 'Systems Degraded' };
      case 'maintenance':
        return { status: 'maintenance' as const, label: 'MAINT', desc: 'Maintenance Mode' };
      default:
        return { status: 'partial' as const, label: 'STATUS', desc: 'System Status' };
    }
  };

  const envConfig = getEnvironmentConfig();
  const sysConfig = getSystemStatusConfig();
  const dataConfig = { status: dataStatus, label: dataStatus.toUpperCase(), desc: `Data: ${dataStatus.charAt(0).toUpperCase() + dataStatus.slice(1)}` };
  const normalizeStatus = (value: string): IndicatorStatus => {
    const allowed: IndicatorStatus[] = ['simulated', 'real', 'partial', 'testing', 'maintenance'];
    return allowed.includes(value as IndicatorStatus) ? (value as IndicatorStatus) : 'partial';
  };

  return (
    <AppBar 
      position="static" 
      color="default" 
      elevation={0}
      sx={{
        backgroundColor: '#fafafa',
        borderBottom: showBorder ? '1px solid #e0e0e0' : 'none',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        padding: '4px 0'
      }}
    >
      <Toolbar sx={{ minHeight: '32px !important', paddingLeft: '16px !important', paddingRight: '16px !important' }}>
        <Typography 
          variant="caption" 
          color="textSecondary" 
          sx={{ 
            marginRight: 2, 
            minWidth: '80px',
            fontWeight: 'bold',
            textTransform: 'uppercase'
          }}
        >
          SUMMIT
        </Typography>
        
        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
        
        <Stack direction="row" spacing={1} alignItems="center">
          <StatusIndicator 
            status={envConfig.status} 
            label={envConfig.label} 
            description={envConfig.desc}
            size="small"
          />
          
          <StatusIndicator 
            status={dataConfig.status} 
            label={dataConfig.label} 
            description={dataConfig.desc}
            size="small"
          />
          
          <StatusIndicator 
            status={sysConfig.status} 
            label={sysConfig.label} 
            description={sysConfig.desc}
            size="small"
          />
          
          {simulationStatus && (
            <StatusIndicator 
              status="simulated" 
              label="SIM" 
              description="Simulation Mode Active"
              size="small"
            />
          )}
          
          {additionalIndicators.map((indicator, index) => (
            <StatusIndicator
              key={`additional-${index}`}
              status={normalizeStatus(indicator.status)}
              label={indicator.label}
              description={indicator.description}
              size="small"
            />
          ))}
        </Stack>
      </Toolbar>
    </AppBar>
  );
};

export default StatusBar;
