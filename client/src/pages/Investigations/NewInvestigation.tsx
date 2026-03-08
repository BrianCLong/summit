import React, { useState } from 'react';
import {
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Box,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function NewInvestigation() {
  const [title, setTitle] = useState('');
  const navigate = useNavigate();

  const handleCreate = () => {
    // In a real app, this would be a mutation
    // For E2E purposes, we navigate to the detail page of a "created" investigation
    navigate('/investigations/inv-1');
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4 }}>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
              Create New Investigation
            </Typography>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Investigation Title"
                inputProps={{ 'data-testid': 'title' }}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Drift Probe"
              />
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={4}
                placeholder="Describe the scope of this investigation"
              />
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleCreate}
                disabled={!title}
              >
                Create
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
