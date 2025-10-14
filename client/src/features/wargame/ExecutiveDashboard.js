import React from 'react';
import { Typography, Box, Card, CardContent } from '@mui/material';

const ExecutiveDashboard = () => {
  return (
    <Box sx={{ p: 2 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Executive Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This component is under development. Full functionality coming soon.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ExecutiveDashboard;
