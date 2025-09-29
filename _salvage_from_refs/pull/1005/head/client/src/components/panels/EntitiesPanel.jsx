import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

function EntitiesPanel() {
  return (
    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>Entities</Typography>
      <Box>
        {/* Entity list will go here */}
        <Typography variant="body2">List of entities related to the investigation.</Typography>
      </Box>
    </Paper>
  );
}

export default EntitiesPanel;
