import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

function CopilotRunsPanel() {
  return (
    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>Copilot Runs</Typography>
      <Box>
        {/* Copilot run history and details will go here */}
        <Typography variant="body2">History and details of Copilot runs.</Typography>
      </Box>
    </Paper>
  );
}

export default CopilotRunsPanel;
