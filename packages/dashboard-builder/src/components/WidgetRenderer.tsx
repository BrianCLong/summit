import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { DashboardWidget } from '../types';

export interface WidgetRendererProps {
  widget: DashboardWidget;
  editable?: boolean;
  onUpdate?: (updates: Partial<DashboardWidget>) => void;
  onDelete?: () => void;
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({
  widget,
  editable = false,
  onUpdate,
  onDelete,
}) => {
  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Widget Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e0e0e0',
          paddingBottom: 1,
          marginBottom: 1,
        }}
      >
        <Typography variant="h6" component="h3" sx={{ fontWeight: 600, fontSize: '1rem' }}>
          {widget.title}
        </Typography>
        {editable && (
          <Box>
            <IconButton size="small" onClick={() => onUpdate?.({})}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={onDelete}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* Widget Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {widget.description && (
          <Typography variant="body2" color="text.secondary" sx={{ marginBottom: 2 }}>
            {widget.description}
          </Typography>
        )}

        {/* Render different widget types */}
        {widget.type === 'chart' && (
          <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Chart Widget (Integration with @summit/chart-components)
            </Typography>
          </Box>
        )}

        {widget.type === 'metric' && (
          <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <Typography variant="h3" component="div" sx={{ fontWeight: 'bold' }}>
              1,234
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Metric Value
            </Typography>
          </Box>
        )}

        {widget.type === 'table' && (
          <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Table Widget (Integration with MUI DataGrid)
            </Typography>
          </Box>
        )}

        {widget.type === 'map' && (
          <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Map Widget (Integration with @summit/geospatial-viz)
            </Typography>
          </Box>
        )}

        {widget.type === 'text' && (
          <Box sx={{ padding: 2 }}>
            <Typography variant="body1">
              Text widget content goes here
            </Typography>
          </Box>
        )}

        {widget.type === 'custom' && (
          <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Custom Widget
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default WidgetRenderer;
