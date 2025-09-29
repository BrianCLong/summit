import React from 'react';
import { Container, Card, CardContent, Typography, Button } from '@mui/material';
import { useAuth } from '../../context/AuthContext.jsx';
import { Navigate } from 'react-router-dom';

const LoginPage = () => {
  const { isAuthenticated, login } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Card>
        <CardContent sx={{ textAlign: 'center', p: 4 }}>
          <Typography variant="h4" gutterBottom>
            IntelGraph Platform
          </Typography>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Intelligence Analysis & Graph Explorer
          </Typography>
          <Button 
            variant="contained" 
            size="large" 
            onClick={login}
            sx={{ px: 4 }}
          >
            Login (Mock)
          </Button>
        </CardContent>
      </Card>
    </Container>
  );
};

export default LoginPage;
