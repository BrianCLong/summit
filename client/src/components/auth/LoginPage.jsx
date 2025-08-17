import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  TextField, 
  Button, 
  Typography,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../store/slices/authSlice';

function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    
    if (credentials.email && credentials.password) {
      const mockUser = {
        id: '1',
        email: credentials.email,
        firstName: 'Demo',
        lastName: 'User',
        role: 'ANALYST'
      };
      
      dispatch(loginSuccess({
        user: mockUser,
        token: 'demo-token-12345'
      }));
      
      navigate('/dashboard');
    } else {
      setError('Please enter email and password');
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      bgcolor: 'grey.100'
    }}>
      <Paper sx={{ p: 4, maxWidth: 400, width: '100%' }}>
        <Typography variant="h4" align="center" gutterBottom fontWeight="bold">
          IntelGraph
        </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 3 }}>
          Intelligence Analysis Platform
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Box component="form" onSubmit={handleLogin}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={credentials.email}
            onChange={(e) => setCredentials({...credentials, email: e.target.value})}
            autoComplete="email"
            inputProps={{ 'aria-label': 'email' }}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={credentials.password}
            onChange={(e) => setCredentials({...credentials, password: e.target.value})}
            autoComplete="current-password"
            inputProps={{ 'aria-label': 'password' }}
            sx={{ mb: 3 }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
          >
            Sign In
          </Button>
        </Box>
        
        <Alert severity="info" sx={{ mt: 3 }}>
          Demo: Enter any email and password to continue
        </Alert>
      </Paper>
    </Box>
  );
}

export default LoginPage;
