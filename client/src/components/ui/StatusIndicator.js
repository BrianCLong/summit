"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// client/src/components/ui/StatusIndicator.tsx
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const sizeMap = {
    small: { fontSize: '1rem', chipSize: 'small' },
    medium: { fontSize: '1.2rem', chipSize: 'medium' },
    large: { fontSize: '1.5rem', chipSize: 'medium' }
};
const StatusIndicator = ({ status, size = 'medium', label, description, sx = {} }) => {
    const getStatusConfig = () => {
        const config = sizeMap[size];
        switch (status) {
            case 'simulated':
                return {
                    icon: <icons_material_1.Diamond sx={{ fontSize: config.fontSize, color: '#9e9e9e' }}/>,
                    label: label || 'SIM',
                    color: 'default',
                    backgroundColor: '#f5f5f5',
                    borderColor: '#bdbdbd',
                    description: description || 'Simulated data - not connected to real systems'
                };
            case 'real':
                return {
                    icon: <icons_material_1.FiberManualRecord sx={{ fontSize: config.fontSize, color: '#4caf50' }}/>,
                    label: label || 'REAL',
                    color: 'success',
                    backgroundColor: '#e8f5e9',
                    borderColor: '#4caf50',
                    description: description || 'Connected to real production systems'
                };
            case 'partial':
                return {
                    icon: <icons_material_1.RadioButtonUnchecked sx={{ fontSize: config.fontSize, color: '#ff9800' }}/>,
                    label: label || 'PARTIAL',
                    color: 'warning',
                    backgroundColor: '#fff3e0',
                    borderColor: '#ff9800',
                    description: description || 'Partially connected to real systems'
                };
            case 'testing':
                return {
                    icon: <icons_material_1.ChangeHistory sx={{ fontSize: config.fontSize, color: '#2196f3' }}/>,
                    label: label || 'TEST',
                    color: 'info',
                    backgroundColor: '#e3f2fd',
                    borderColor: '#2196f3',
                    description: description || 'Under testing - not for production use'
                };
            case 'maintenance':
                return {
                    icon: <icons_material_1.Hexagon sx={{ fontSize: config.fontSize, color: '#f44336' }}/>,
                    label: label || 'MAINT',
                    color: 'error',
                    backgroundColor: '#ffebee',
                    borderColor: '#f44336',
                    description: description || 'Under maintenance - limited functionality'
                };
            default:
                return {
                    icon: <icons_material_1.Circle sx={{ fontSize: config.fontSize, color: '#9e9e9e' }}/>,
                    label: label || 'N/A',
                    color: 'default',
                    backgroundColor: '#f5f5f5',
                    borderColor: '#bdbdbd',
                    description: description || 'Status not specified'
                };
        }
    };
    const { icon, label: statusLabel, backgroundColor, borderColor, description: statusDesc } = getStatusConfig();
    return (<material_1.Tooltip title={statusDesc} arrow>
      <material_1.Chip icon={icon} label={statusLabel} size={sizeMap[size].chipSize} variant="outlined" sx={{
            backgroundColor,
            borderColor,
            fontWeight: 'bold',
            ...sx
        }}/>
    </material_1.Tooltip>);
};
exports.default = StatusIndicator;
