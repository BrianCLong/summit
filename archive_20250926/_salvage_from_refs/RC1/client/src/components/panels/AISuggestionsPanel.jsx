import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

function AISuggestionsPanel() {
  return (
    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>AI Suggestions</Typography>
      <Box>
        {/* AI suggestions will go here */}
        <Typography variant="body2">AI-powered insights and suggestions.</Typography>
      </Box>
    </Paper>
  );
}

export default AISuggestionsPanel;
