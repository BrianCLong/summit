import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { oidcService } from '../services/oidcService';
import { useNavigate } from 'react-router-dom';
const AuthCallback = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Handle OIDC callback using the service
        const { user, tokens } = await oidcService.handleCallback();
        // Use auth context login method to set all state
        await login({
          user,
          accessToken: tokens.access_token,
          idToken: tokens.id_token,
          expiresAt: Date.now() + tokens.expires_in * 1000,
          refreshToken: tokens.refresh_token,
        });
        // Navigate to intended destination or home
        const intendedPath =
          sessionStorage.getItem('auth_return_path') || '/maestro';
        sessionStorage.removeItem('auth_return_path');
        navigate(intendedPath, { replace: true });
      } catch (err) {
        console.error('Authentication callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    };
    // Check if we have authorization code in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('code') || urlParams.has('error')) {
      handleCallback();
    } else {
      setError('Invalid callback - no authorization code received');
    }
  }, [login, navigate]);
  if (error) {
    return _jsx('div', {
      className: 'min-h-screen flex items-center justify-center bg-slate-50',
      children: _jsxs('div', {
        className: 'text-center max-w-md',
        children: [
          _jsx('div', {
            className:
              'bg-red-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4',
            children: _jsx('span', {
              className: 'text-red-600 text-2xl',
              children: '\u26A0\uFE0F',
            }),
          }),
          _jsx('h2', {
            className: 'text-2xl font-bold text-slate-900 mb-2',
            children: 'Authentication Failed',
          }),
          _jsx('p', { className: 'text-slate-600 mb-6', children: error }),
          _jsx('button', {
            onClick: () => navigate('/auth/login', { replace: true }),
            className:
              'bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors',
            children: 'Try Again',
          }),
        ],
      }),
    });
  }
  return _jsx('div', {
    className: 'min-h-screen flex items-center justify-center bg-slate-50',
    children: _jsxs('div', {
      className: 'text-center',
      children: [
        _jsx('div', {
          className:
            'animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4',
        }),
        _jsx('h2', {
          className: 'text-xl font-semibold text-slate-900 mb-2',
          children: 'Completing Authentication',
        }),
        _jsx('p', {
          className: 'text-slate-600',
          children: 'Please wait while we sign you in...',
        }),
      ],
    }),
  });
};
export default AuthCallback;
