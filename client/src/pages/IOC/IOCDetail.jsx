/**
 * IOCDetail - IOC Detail Page (Stub)
 * TODO: Implement full IOC detail functionality
 */
import React from 'react';
import { Container, Typography, Card, CardContent, Alert, Button } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';

export default function IOCDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button onClick={() => navigate('/ioc')} sx={{ mb: 2 }}>
        Back to IOCs
      </Button>
      <Typography variant="h4" gutterBottom>
        IOC Details: {id}
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        IOC detail view - implementation pending
      </Alert>
      <Card>
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            This page will display details for IOC ID: {id}
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
}
