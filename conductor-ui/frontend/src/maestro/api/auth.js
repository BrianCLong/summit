const API_BASE_URL = '/api/maestro/v1/auth';
export const exchangeCodeForTokens = async (
  provider,
  code,
  codeVerifier,
  redirectUri,
) => {
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
export const initiateLogin = async (provider) => {
  const response = await fetch(`${API_BASE_URL}/oidc/authorize/${provider}`, {
    method: 'GET',
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to initiate login');
  }
  return response.json();
};
export const logoutApi = async () => {
  const response = await fetch(`${API_BASE_URL}/logout`, {
    method: 'POST',
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to logout');
  }
};
export const refreshTokenApi = async () => {
  const response = await fetch(`${API_BASE_URL}/refresh-token`, {
    method: 'POST',
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to refresh token');
  }
  return response.json();
};
export const getUserInfo = async () => {
  const response = await fetch(`${API_BASE_URL}/userinfo`, {
    method: 'GET',
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to get user info');
  }
  return response.json();
};
