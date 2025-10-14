import React from 'react';
import { Alert, Box } from '@mui/material';

const DiagnosticBanner = () => {
  return (
    <Box sx={{ mb: 2 }}>
      <Alert severity="info">🔧 Development Mode - All systems operational</Alert>
    </Box>
  );
};

export default DiagnosticBanner;
