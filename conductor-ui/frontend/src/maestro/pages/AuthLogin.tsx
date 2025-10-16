import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { generateCodeChallenge, generateCodeVerifier } from '../utils/oidc';
import { initiateLogin } from '../api/auth';

const AuthLogin: React.FC = () => {
  const { login } = useAuth();

  const handleLogin = async (provider: 'auth0' | 'azure' | 'google') => {
    try {
      const codeVerifier = await generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      sessionStorage.setItem('oauthCodeVerifier', codeVerifier);
      sessionStorage.setItem('oauthProvider', provider);

      // Generate a random state to prevent CSRF
      const state =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('oauthState', state);

      const redirectUri = window.location.origin + '/auth/callback';

      const { authorizeUrl } = await initiateLogin(provider);

      // Construct the full authorization URL
      const fullAuthorizeUrl =
        `${authorizeUrl}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&code_challenge=${encodeURIComponent(codeChallenge)}` +
        `&code_challenge_method=S256` +
        `&state=${encodeURIComponent(state)}`;

      window.location.href = fullAuthorizeUrl;
    } catch (error) {
      console.error('Login initiation failed:', error);
      // Optionally display an error message to the user
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="p-8 bg-white shadow-md rounded-lg text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          Sign In to Maestro
        </h2>
        <div className="space-y-4">
          <button
            onClick={() => handleLogin('auth0')}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Sign in with Auth0
          </button>
          <button
            onClick={() => handleLogin('azure')}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign in with Azure AD
          </button>
          <button
            onClick={() => handleLogin('google')}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthLogin;
