/**
 * SearchHome - Search Landing Page (Stub)
 * TODO: Implement full search functionality
 */
import React from 'react';
import { Container, Typography, Card, CardContent, Alert, TextField, Box } from '@mui/material';

export default function SearchHome() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Intelligence Search
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        Search interface - implementation pending
      </Alert>
      <Card>
        <CardContent>
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Search intelligence data..."
              variant="outlined"
              disabled
            />
          </Box>
          <Typography variant="body1" color="text.secondary">
            This page will provide unified search across intelligence data sources.
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
}
