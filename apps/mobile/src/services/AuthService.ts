import { MMKV } from 'react-native-mmkv';
import * as Keychain from 'react-native-keychain';
import ReactNativeBiometrics from 'react-native-biometrics';

import { AUTH_CONFIG, API_CONFIG } from '@/config';

const storage = new MMKV({ id: 'auth' });
const rnBiometrics = new ReactNativeBiometrics();

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  permissions: string[];
  clearance: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// ============================================
// Token Management
// ============================================

export const saveAuthTokens = async (tokens: AuthTokens): Promise<void> => {
  await Keychain.setGenericPassword(
    'auth_tokens',
    JSON.stringify(tokens),
    { service: 'intelgraph_auth' },
  );
  storage.set('token_expiry', tokens.expiresAt);
};

export const getAuthTokens = async (): Promise<AuthTokens | null> => {
  try {
    const credentials = await Keychain.getGenericPassword({ service: 'intelgraph_auth' });
    if (credentials) {
      return JSON.parse(credentials.password);
    }
    return null;
  } catch {
    return null;
  }
};

export const getAuthToken = async (): Promise<string | null> => {
  const tokens = await getAuthTokens();
  if (!tokens) return null;

  // Check if token is about to expire
  const now = Date.now();
  if (tokens.expiresAt - now < AUTH_CONFIG.tokenRefreshBuffer) {
    // Token is about to expire, try to refresh
    const newToken = await refreshAuthToken();
    return newToken;
  }

  return tokens.accessToken;
};

export const refreshAuthToken = async (): Promise<string | null> => {
  const tokens = await getAuthTokens();
  if (!tokens?.refreshToken) return null;

  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    const newTokens: AuthTokens = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken || tokens.refreshToken,
      expiresAt: Date.now() + (data.expiresIn * 1000),
    };

    await saveAuthTokens(newTokens);
    return newTokens.accessToken;
  } catch (error) {
    console.error('[AuthService] Token refresh failed:', error);
    return null;
  }
};

export const clearAuthToken = async (): Promise<void> => {
  await Keychain.resetGenericPassword({ service: 'intelgraph_auth' });
  storage.delete('token_expiry');
};

// ============================================
// User Management
// ============================================

export const saveUser = (user: User): void => {
  storage.set(AUTH_CONFIG.userKey, JSON.stringify(user));
};

export const getUser = (): User | null => {
  const data = storage.getString(AUTH_CONFIG.userKey);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

export const clearUser = (): void => {
  storage.delete(AUTH_CONFIG.userKey);
};

// ============================================
// Login/Logout
// ============================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export const login = async (credentials: LoginCredentials): Promise<User> => {
  const response = await fetch(`${API_CONFIG.baseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Login failed');
  }

  const data = await response.json();

  // Save tokens
  await saveAuthTokens({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: Date.now() + (data.expiresIn * 1000),
  });

  // Save user
  saveUser(data.user);

  return data.user;
};

export const logout = async (): Promise<void> => {
  try {
    const token = await getAuthToken();
    if (token) {
      await fetch(`${API_CONFIG.baseUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  } catch (error) {
    console.error('[AuthService] Logout request failed:', error);
  }

  await clearAuthToken();
  clearUser();
  clearBiometricEnabled();
};

// ============================================
// Biometric Authentication
// ============================================

export const isBiometricsAvailable = async (): Promise<boolean> => {
  const { available } = await rnBiometrics.isSensorAvailable();
  return available;
};

export const getBiometricType = async (): Promise<string | null> => {
  const { biometryType } = await rnBiometrics.isSensorAvailable();
  return biometryType || null;
};

export const enableBiometrics = async (): Promise<boolean> => {
  try {
    const { success } = await rnBiometrics.simplePrompt({
      promptMessage: 'Confirm your identity to enable biometric login',
    });

    if (success) {
      storage.set(AUTH_CONFIG.biometricKey, 'true');
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

export const isBiometricEnabled = (): boolean => {
  return storage.getString(AUTH_CONFIG.biometricKey) === 'true';
};

export const clearBiometricEnabled = (): void => {
  storage.delete(AUTH_CONFIG.biometricKey);
};

export const authenticateWithBiometrics = async (): Promise<boolean> => {
  try {
    const { success } = await rnBiometrics.simplePrompt({
      promptMessage: 'Authenticate to access IntelGraph',
    });
    return success;
  } catch {
    return false;
  }
};

// ============================================
// Session Management
// ============================================

export const isAuthenticated = async (): Promise<boolean> => {
  const token = await getAuthToken();
  return token !== null;
};

export const getSessionInfo = async () => {
  const user = getUser();
  const tokens = await getAuthTokens();

  return {
    user,
    isAuthenticated: !!tokens?.accessToken,
    expiresAt: tokens?.expiresAt,
    biometricEnabled: isBiometricEnabled(),
  };
};
