import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

function RelationshipsPanel() {
  return (
    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>Relationships</Typography>
      <Box>
        {/* Relationship list will go here */}
        <Typography variant="body2">Details of relationships between entities.</Typography>
      </Box>
    </Paper>
  );
}

export default RelationshipsPanel;
