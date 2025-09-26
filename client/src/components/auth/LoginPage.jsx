import React, { useState } from 'react';
import { Box, Paper, TextField, Button, Typography, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../store/slices/authSlice';
import ThemeToggle from '../theme/ThemeToggle';

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
        role: 'ANALYST',
      };

      dispatch(
        loginSuccess({
          user: mockUser,
          token: 'demo-token-12345',
        }),
      );

      navigate('/dashboard');
    } else {
      setError('Please enter email and password');
    }
  };

  return (
    <Box
      className="flex min-h-screen items-center justify-center bg-background text-foreground transition-colors"
      sx={{ px: 3, py: 6 }}
    >
      <Paper
        elevation={0}
        className="w-full max-w-md rounded-2xl border border-border/60 bg-card text-card-foreground shadow-lg transition-colors"
        sx={{ p: 4 }}
      >
        <Box className="mb-4 flex justify-end">
          <ThemeToggle />
        </Box>
        <Typography variant="h4" align="center" gutterBottom fontWeight="bold">
          IntelGraph
        </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 3 }}>
          Intelligence Analysis Platform
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleLogin}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={credentials.email}
            onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
            autoComplete="email"
            inputProps={{ 'aria-label': 'email' }}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={credentials.password}
            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
            autoComplete="current-password"
            inputProps={{ 'aria-label': 'password' }}
            sx={{ mb: 3 }}
          />
          <Button type="submit" fullWidth variant="contained" size="large">
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
