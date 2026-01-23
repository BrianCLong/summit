/**
 * HuntList - Threat Hunting List Page (Stub)
 * TODO: Implement full threat hunting list functionality
 */
import React from 'react';
import { Container, Typography, Card, CardContent, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function HuntList() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Threat Hunts
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        Threat hunting interface - implementation pending
      </Alert>
      <Card>
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            This page will display active and completed threat hunts.
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
}
