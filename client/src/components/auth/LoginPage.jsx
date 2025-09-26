import React, { useCallback, useState } from 'react';
import { Box, Paper, TextField, Button, Typography, Alert, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../store/slices/authSlice';

const LOGIN_MUTATION = `
  mutation LoginMutation($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      refreshToken
      requiresMfa
      challengeId
      user {
        id
        email
        firstName
        lastName
        role
        mfaEnabled
      }
      mfaSetup {
        secret
        otpauthUrl
      }
    }
  }
`;

const VERIFY_MUTATION = `
  mutation VerifyMfaMutation($challengeId: ID!, $code: String!) {
    verifyMfa(challengeId: $challengeId, code: $code) {
      token
      refreshToken
      requiresMfa
      user {
        id
        email
        firstName
        lastName
        role
        mfaEnabled
      }
    }
  }
`;

async function callGraphQL(query, variables, operationName) {
  const response = await fetch('/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables, operationName }),
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const body = await response.json();
  if (body.errors?.length) {
    throw new Error(body.errors.map((err) => err.message).join('\n'));
  }

  return body.data;
}

function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('credentials');
  const [challengeId, setChallengeId] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSetup, setMfaSetup] = useState(null);

  const resetMfaState = useCallback(() => {
    setChallengeId('');
    setMfaCode('');
    setMfaSetup(null);
    setStep('credentials');
  }, []);

  const finalizeLogin = useCallback(
    (payload) => {
      if (!payload?.token || !payload?.user) {
        throw new Error('Authentication payload missing token or user');
      }
      dispatch(
        loginSuccess({
          user: payload.user,
          token: payload.token,
          refreshToken: payload.refreshToken || null,
        }),
      );
      resetMfaState();
      navigate('/dashboard');
    },
    [dispatch, navigate, resetMfaState],
  );

  const handleLogin = (e) => {
    e.preventDefault();

    if (!credentials.email || !credentials.password) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);
    setError('');

    callGraphQL(
      LOGIN_MUTATION,
      { email: credentials.email, password: credentials.password },
      'LoginMutation',
    )
      .then((data) => {
        const payload = data?.login;
        if (!payload) {
          throw new Error('Unexpected response from authentication service');
        }

        if (payload.requiresMfa) {
          setChallengeId(payload.challengeId || '');
          setMfaSetup(payload.mfaSetup || null);
          setMfaCode('');
          setStep(payload.mfaSetup ? 'setup' : 'mfa');
          return;
        }

        finalizeLogin(payload);
      })
      .catch((err) => {
        setError(err.message || 'Unable to sign in');
      })
      .finally(() => setLoading(false));
  };

  const handleVerifyMfa = (e) => {
    e.preventDefault();

    if (!challengeId) {
      setError('No MFA challenge in progress');
      return;
    }

    if (!mfaCode.trim()) {
      setError('Enter the 6-digit code from your authenticator app');
      return;
    }

    setLoading(true);
    setError('');

    callGraphQL(
      VERIFY_MUTATION,
      { challengeId, code: mfaCode.trim() },
      'VerifyMfaMutation',
    )
      .then((data) => {
        const payload = data?.verifyMfa;
        if (!payload) {
          throw new Error('Unexpected response from MFA verification');
        }
        finalizeLogin(payload);
      })
      .catch((err) => {
        setError(err.message || 'Invalid MFA code');
      })
      .finally(() => setLoading(false));
  };

  const credentialForm = (
    <Box component="form" onSubmit={handleLogin}>
      <TextField
        fullWidth
        label="Email"
        type="email"
        value={credentials.email}
        onChange={(e) => {
          setCredentials({ ...credentials, email: e.target.value });
          setError('');
        }}
        autoComplete="email"
        inputProps={{ 'data-testid': 'email-input', 'aria-label': 'email' }}
        sx={{ mb: 2 }}
      />
      <TextField
        fullWidth
        label="Password"
        type="password"
        value={credentials.password}
        onChange={(e) => {
          setCredentials({ ...credentials, password: e.target.value });
          setError('');
        }}
        autoComplete="current-password"
        inputProps={{ 'data-testid': 'password-input', 'aria-label': 'password' }}
        sx={{ mb: 3 }}
      />
      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        data-testid="login-button"
        disabled={loading}
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </Button>
    </Box>
  );

  const mfaForm = (
    <Box component="form" onSubmit={handleVerifyMfa}>
      <TextField
        fullWidth
        label="Authenticator Code"
        value={mfaCode}
        onChange={(e) => {
          setMfaCode(e.target.value);
          setError('');
        }}
        inputProps={{ 'data-testid': 'mfa-code-input', inputMode: 'numeric', pattern: '[0-9]*', maxLength: 8 }}
        autoFocus
        sx={{ mb: 3 }}
      />
      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        data-testid="mfa-submit-button"
        disabled={loading}
      >
        {loading ? 'Verifying…' : 'Verify Code'}
      </Button>
    </Box>
  );

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
      <Paper sx={{ p: 4, maxWidth: 400, width: '100%' }}>
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

        {step === 'credentials' ? credentialForm : mfaForm}

        {step === 'credentials' && (
          <Alert severity="info" sx={{ mt: 3 }}>
            Use your Summit credentials to sign in. Accounts with multi-factor authentication
            will be prompted for a one-time password.
          </Alert>
        )}

        {step === 'setup' && mfaSetup && (
          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Finish setting up multi-factor authentication
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Scan the QR code generated by your authenticator app using the URI below or enter the
              shared secret manually. Once configured, enter the 6-digit code to verify setup.
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Secret: <strong>{mfaSetup.secret}</strong>
            </Typography>
            {mfaSetup.otpauthUrl && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                URI:{' '}
                <Link href={mfaSetup.otpauthUrl} underline="hover" target="_blank" rel="noopener">
                  {mfaSetup.otpauthUrl}
                </Link>
              </Typography>
            )}
          </Alert>
        )}
      </Paper>
    </Box>
  );
}

export default LoginPage;
