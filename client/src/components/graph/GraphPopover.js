import React from 'react';
import { Paper, Typography, Box } from '@mui/material';

function GraphPopover({ data }) {
  if (!data) return null;

  return (
    <Paper elevation={3} sx={{ p: 1, maxWidth: 300, overflow: 'auto' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
        {data.label || data.id}
      </Typography>
      <Divider sx={{ my: 0.5 }} />
      {Object.entries(data.properties || {}).map(([key, value]) => (
        <Box
          key={key}
          sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}
        >
          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
            {key}:
          </Typography>
          <Typography variant="caption">{String(value)}</Typography>
        </Box>
      ))}
      {/* Display other relevant data fields */}
      {data.type && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
            Type:
          </Typography>
          <Typography variant="caption">{data.type}</Typography>
        </Box>
      )}
      {data.importance && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
            Importance:
          </Typography>
          <Typography variant="caption">{data.importance}</Typography>
        </Box>
      )}
      {data.weight && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
            Weight:
          </Typography>
          <Typography variant="caption">{data.weight}</Typography>
        </Box>
      )}
    </Paper>
  );
}

export default GraphPopover;
