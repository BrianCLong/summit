/**
 * HuntDetail - Threat Hunt Detail Page (Stub)
 * TODO: Implement full threat hunt detail functionality
 */
import React from 'react';
import { Container, Typography, Card, CardContent, Alert, Button } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';

export default function HuntDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button onClick={() => navigate('/hunts')} sx={{ mb: 2 }}>
        Back to Hunts
      </Button>
      <Typography variant="h4" gutterBottom>
        Hunt Details: {id}
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        Hunt detail view - implementation pending
      </Alert>
      <Card>
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            This page will display details for hunt ID: {id}
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
}
