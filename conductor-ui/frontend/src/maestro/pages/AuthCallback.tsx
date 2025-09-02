import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { exchangeCodeForTokens } from '../api/auth';
import { useNavigate } from 'react-router-dom';

const AuthCallback: React.FC = () => {
  const { setUser, setAccessToken, setIdToken, setExpiresAt, setLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      setLoading(true);
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');

      const storedCodeVerifier = sessionStorage.getItem('oauthCodeVerifier');
      const storedProvider = sessionStorage.getItem('oauthProvider');
      const storedState = sessionStorage.getItem('oauthState');

      // Clear session storage items immediately to prevent replay attacks
      sessionStorage.removeItem('oauthCodeVerifier');
      sessionStorage.removeItem('oauthProvider');
      sessionStorage.removeItem('oauthState');

      if (!code || !state || state !== storedState || !storedCodeVerifier || !storedProvider) {
        console.error('OIDC callback: Missing parameters or state mismatch.');
        // Redirect to login with an error message
        navigate('/login?error=auth_failed');
        setLoading(false);
        return;
      }

      try {
        const redirectUri = window.location.origin + '/auth/callback';
        const { idToken, accessToken, expiresAt, user } = await exchangeCodeForTokens(
          storedProvider,
          code,
          storedCodeVerifier,
          redirectUri
        );

        // Update AuthContext state
        setUser(user);
        setAccessToken(accessToken);
        setIdToken(idToken);
        setExpiresAt(expiresAt);

        // Redirect to the main application or a previously intended route
        navigate('/maestro');
      } catch (error) {
        console.error('Token exchange failed:', error);
        // Redirect to login with an error message
        navigate('/login?error=token_exchange_failed');
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [setUser, setAccessToken, setIdToken, setExpiresAt, setLoading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-slate-600">Processing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
