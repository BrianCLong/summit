/**
 * IOCList - Indicators of Compromise List Page (Stub)
 * TODO: Implement full IOC list functionality
 */
import React from 'react';
import { Container, Typography, Card, CardContent, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function IOCList() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Indicators of Compromise
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        IOC management interface - implementation pending
      </Alert>
      <Card>
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            This page will display and manage indicators of compromise (IOCs).
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
}
