import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const AuthLogin: React.FC = () => {
  const { login, isLoading, error } = useAuth();
  const [selectedProvider, setSelectedProvider] = useState<'auth0' | 'azure' | 'google' | null>(null);

  const providers = [
    {
      id: 'auth0' as const,
      name: 'Auth0',
      description: 'Enterprise SSO',
      icon: '🔐',
      color: 'bg-orange-500 hover:bg-orange-600',
    },
    {
      id: 'azure' as const,
      name: 'Azure AD',
      description: 'Microsoft Enterprise',
      icon: '🏢',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      id: 'google' as const,
      name: 'Google',
      description: 'Google Workspace',
      icon: '🔵',
      color: 'bg-red-500 hover:bg-red-600',
    },
  ];

  const handleLogin = async (provider: 'auth0' | 'azure' | 'google') => {
    setSelectedProvider(provider);
    try {
      await login(provider);
    } catch (error) {
      setSelectedProvider(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">
            {selectedProvider ? `Redirecting to ${selectedProvider}...` : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="h-16 w-16 rounded-full bg-indigo-600 mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">M</span>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-slate-900">
            Sign in to Maestro
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Maestro builds IntelGraph • Evidence-first Control Plane
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Authentication Error
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <p className="text-sm text-slate-600 text-center">
            Choose your identity provider:
          </p>
          
          {providers.map((provider) => (
            <button
              key={provider.id}
              onClick={() => handleLogin(provider.id)}
              disabled={isLoading}
              className={`
                w-full flex items-center justify-center px-4 py-3 border border-transparent 
                text-sm font-medium rounded-md text-white transition-colors
                ${provider.color}
                disabled:opacity-50 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
              `}
            >
              <span className="text-xl mr-3" aria-hidden="true">
                {provider.icon}
              </span>
              <div className="text-left">
                <div className="font-semibold">{provider.name}</div>
                <div className="text-xs opacity-90">{provider.description}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="text-center text-xs text-slate-500">
          <p>
            Secure OIDC/SAML with PKCE • Session timeout: 15min idle
          </p>
          <p className="mt-1">
            Multi-tenant • Role-based access control
          </p>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer hover:text-slate-700">
              Security Information
            </summary>
            <div className="mt-2 space-y-1">
              <p>• PKCE (Proof Key for Code Exchange) enabled</p>
              <p>• Tokens stored in secure session storage</p>
              <p>• Automatic token refresh every 14 minutes</p>
              <p>• Idle timeout after 15 minutes of inactivity</p>
              <p>• CSP and CSRF protection enabled</p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default AuthLogin;