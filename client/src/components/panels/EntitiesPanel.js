import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';

function EntitiesPanel({ entities = [] }) {
  return (
    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Entities
      </Typography>
      <Box>
        {entities.length === 0 && (
          <Typography variant="body2">List of entities related to the investigation.</Typography>
        )}
        {entities.map((entity) => (
          <Box key={entity.id} sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2">{entity.label || entity.name}</Typography>
            {entity.canonicalId && entity.canonicalId !== entity.id && (
              <LinkIcon color="primary" fontSize="small" sx={{ ml: 1 }} />
            )}
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

export default EntitiesPanel;
