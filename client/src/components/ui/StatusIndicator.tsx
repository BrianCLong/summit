// client/src/components/ui/StatusIndicator.tsx
import React from 'react';
import { Chip, Tooltip, Box } from '@mui/material';
import { 
  Circle, 
  Square, 
  Diamond, 
  Hexagon, 
  Triangle,
  FiberManualRecord,
  RadioButtonUnchecked,
  CropSquare
} from '@mui/icons-material';

interface StatusIndicatorProps {
  status: 'simulated' | 'real' | 'partial' | 'testing' | 'maintenance';
  size?: 'small' | 'medium' | 'large';
  label?: string;
  description?: string;
  sx?: object;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  status, 
  size = 'medium', 
  label, 
  description, 
  sx = {}
}) => {
  const getStatusConfig = () => {
    const sizeMap = {
      small: { fontSize: '1rem', chipSize: 'small' },
      medium: { fontSize: '1.2rem', chipSize: 'medium' },
      large: { fontSize: '1.5rem', chipSize: 'large' }
    };

    const config = sizeMap[size];

    switch (status) {
      case 'simulated':
        return {
          icon: <Diamond sx={{ fontSize: config.fontSize, color: '#9e9e9e' }} />,
          label: label || 'SIM',
          color: 'default',
          backgroundColor: '#f5f5f5',
          borderColor: '#bdbdbd',
          description: description || 'Simulated data - not connected to real systems'
        };
      case 'real':
        return {
          icon: <FiberManualRecord sx={{ fontSize: config.fontSize, color: '#4caf50' }} />,
          label: label || 'REAL',
          color: 'success',
          backgroundColor: '#e8f5e9',
          borderColor: '#4caf50',
          description: description || 'Connected to real production systems'
        };
      case 'partial':
        return {
          icon: <RadioButtonUnchecked sx={{ fontSize: config.fontSize, color: '#ff9800' }} />,
          label: label || 'PARTIAL',
          color: 'warning',
          backgroundColor: '#fff3e0',
          borderColor: '#ff9800',
          description: description || 'Partially connected to real systems'
        };
      case 'testing':
        return {
          icon: <Triangle sx={{ fontSize: config.fontSize, color: '#2196f3' }} />,
          label: label || 'TEST',
          color: 'info',
          backgroundColor: '#e3f2fd',
          borderColor: '#2196f3',
          description: description || 'Under testing - not for production use'
        };
      case 'maintenance':
        return {
          icon: <Hexagon sx={{ fontSize: config.fontSize, color: '#f44336' }} />,
          label: label || 'MAINT',
          color: 'error',
          backgroundColor: '#ffebee',
          borderColor: '#f44336',
          description: description || 'Under maintenance - limited functionality'
        };
      default:
        return {
          icon: <Circle sx={{ fontSize: config.fontSize, color: '#9e9e9e' }} />,
          label: label || 'N/A',
          color: 'default',
          backgroundColor: '#f5f5f5',
          borderColor: '#bdbdbd',
          description: description || 'Status not specified'
        };
    }
  };

  const { icon, label: statusLabel, color, backgroundColor, borderColor, description: statusDesc } = getStatusConfig();

  return (
    <Tooltip title={statusDesc} arrow>
      <Chip
        icon={icon}
        label={statusLabel}
        size={sizeMap[size].chipSize}
        variant="outlined"
        sx={{
          backgroundColor,
          borderColor,
          fontWeight: 'bold',
          ...sx
        }}
      />
    </Tooltip>
  );
};

export default StatusIndicator;