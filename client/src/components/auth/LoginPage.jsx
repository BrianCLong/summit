import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../store/slices/authSlice';
import { useI18n } from '../../hooks/useI18n';
import LocaleSelector from '../i18n/LocaleSelector';

function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t, isLoading } = useI18n();
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
      setError(t('auth.loginError'));
    }
  };

  // Show loading state while translations are loading
  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.100',
        }}
      >
        <Typography>{t('common.loading')}</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.100',
        position: 'relative',
      }}
    >
      {/* Locale Selector in top-right corner */}
      <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
        <LocaleSelector variant="button" size="small" />
      </Box>

      <Paper sx={{ p: 4, maxWidth: 400, width: '100%' }}>
        <Typography variant="h4" align="center" gutterBottom fontWeight="bold">
          {t('auth.appTitle')}
        </Typography>
        <Typography
          variant="subtitle1"
          align="center"
          color="text.secondary"
          sx={{ mb: 3 }}
        >
          {t('auth.appSubtitle')}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleLogin}>
          <TextField
            fullWidth
            label={t('auth.email')}
            type="email"
            value={credentials.email}
            onChange={(e) =>
              setCredentials({ ...credentials, email: e.target.value })
            }
            autoComplete="email"
            inputProps={{ 'aria-label': t('auth.email') }}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label={t('auth.password')}
            type="password"
            value={credentials.password}
            onChange={(e) =>
              setCredentials({ ...credentials, password: e.target.value })
            }
            autoComplete="current-password"
            inputProps={{ 'aria-label': t('auth.password') }}
            sx={{ mb: 3 }}
          />
          <Button type="submit" fullWidth variant="contained" size="large">
            {t('auth.signIn')}
          </Button>
        </Box>

        <Alert severity="info" sx={{ mt: 3 }}>
          {t('auth.demoNotice')}
        </Alert>
      </Paper>
    </Box>
  );
}

export default LoginPage;
