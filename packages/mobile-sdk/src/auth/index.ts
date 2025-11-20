/**
 * Authentication utilities for mobile apps
 */

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

// Token storage key
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';

// Get from storage (works with both localStorage and AsyncStorage pattern)
const getItem = async (key: string): Promise<string | null> => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem(key);
  }
  return null;
};

// Set in storage
const setItem = async (key: string, value: string): Promise<void> => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(key, value);
  }
};

// Remove from storage
const removeItem = async (key: string): Promise<void> => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(key);
  }
};

// Get access token
export const getAccessToken = async (): Promise<string | null> => {
  return await getItem(TOKEN_KEY);
};

// Set access token
export const setAccessToken = async (token: string): Promise<void> => {
  await setItem(TOKEN_KEY, token);
};

// Get refresh token
export const getRefreshToken = async (): Promise<string | null> => {
  return await getItem(REFRESH_TOKEN_KEY);
};

// Set refresh token
export const setRefreshToken = async (token: string): Promise<void> => {
  await setItem(REFRESH_TOKEN_KEY, token);
};

// Get user data
export const getUserData = async (): Promise<User | null> => {
  const data = await getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
};

// Set user data
export const setUserData = async (user: User): Promise<void> => {
  await setItem(USER_KEY, JSON.stringify(user));
};

// Clear all auth data
export const clearAuthData = async (): Promise<void> => {
  await removeItem(TOKEN_KEY);
  await removeItem(REFRESH_TOKEN_KEY);
  await removeItem(USER_KEY);
};

// Check if token is expired
export const isTokenExpired = (expiresAt: number): boolean => {
  return Date.now() >= expiresAt;
};

// Parse JWT token (basic implementation)
export const parseJWT = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to parse JWT:', error);
    return null;
  }
};

// Get token expiration
export const getTokenExpiration = (token: string): number | null => {
  const payload = parseJWT(token);
  return payload?.exp ? payload.exp * 1000 : null;
};

// Check if authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  const token = await getAccessToken();
  if (!token) return false;

  const expiresAt = getTokenExpiration(token);
  if (!expiresAt) return false;

  return !isTokenExpired(expiresAt);
};
