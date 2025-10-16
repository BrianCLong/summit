import { AuthContextType } from '../contexts/AuthContext';

const API_BASE_URL = '/api/maestro/v1/auth';

interface AuthResponse {
  idToken: string;
  accessToken: string;
  expiresAt: number;
  user: AuthContextType['user'];
}

export const exchangeCodeForTokens = async (
  provider: string,
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/oidc/callback/${provider}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      codeVerifier,
      redirectUri,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to exchange code for tokens');
  }

  return response.json();
};

export const initiateLogin = async (
  provider: string,
): Promise<{ authorizeUrl: string }> => {
  const response = await fetch(`${API_BASE_URL}/oidc/authorize/${provider}`, {
    method: 'GET',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to initiate login');
  }

  return response.json();
};

export const logoutApi = async (): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/logout`, {
    method: 'POST',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to logout');
  }
};

export const refreshTokenApi = async (): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/refresh-token`, {
    method: 'POST',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to refresh token');
  }

  return response.json();
};

export const getUserInfo = async (): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/userinfo`, {
    method: 'GET',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to get user info');
  }

  return response.json();
};
