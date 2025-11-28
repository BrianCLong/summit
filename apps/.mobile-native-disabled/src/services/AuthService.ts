import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import ReactNativeBiometrics from 'react-native-biometrics';
import DeviceInfo from 'react-native-device-info';
import axios from 'axios';

import {API_URL} from '../config';

const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';
const BIOMETRIC_KEY = 'biometric_enabled';
const PIN_KEY = 'user_pin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
  mfaRequired?: boolean;
  sessionToken?: string;
}

const rnBiometrics = new ReactNativeBiometrics();

// Get auth token
export const getAuthToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    return token;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
};

// Set auth token
export const setAuthToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to set auth token:', error);
  }
};

// Get refresh token
export const getRefreshToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    return token;
  } catch (error) {
    console.error('Failed to get refresh token:', error);
    return null;
  }
};

// Set refresh token
export const setRefreshToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to set refresh token:', error);
  }
};

// Get user data
export const getUserData = async (): Promise<User | null> => {
  try {
    const userData = await AsyncStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Failed to get user data:', error);
    return null;
  }
};

// Set user data
export const setUserData = async (user: User): Promise<void> => {
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to set user data:', error);
  }
};

// Login with email and password
export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  try {
    const deviceId = await DeviceInfo.getUniqueId();
    const deviceName = await DeviceInfo.getDeviceName();

    const response = await axios.post(`${API_URL}/auth/login`, {
      ...credentials,
      deviceId,
      deviceName,
    });

    const {user, token, refreshToken, mfaRequired, sessionToken} = response.data;

    if (!mfaRequired) {
      await setAuthToken(token);
      await setRefreshToken(refreshToken);
      await setUserData(user);

      // Store credentials securely for biometric login
      await Keychain.setGenericPassword(credentials.email, credentials.password, {
        service: 'intelgraph.auth',
      });
    }

    return response.data;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

// Verify MFA code
export const verifyMFA = async (sessionToken: string, code: string): Promise<LoginResponse> => {
  try {
    const response = await axios.post(`${API_URL}/auth/mfa/verify`, {
      sessionToken,
      code,
    });

    const {user, token, refreshToken} = response.data;

    await setAuthToken(token);
    await setRefreshToken(refreshToken);
    await setUserData(user);

    return response.data;
  } catch (error) {
    console.error('MFA verification failed:', error);
    throw error;
  }
};

// Logout
export const logout = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
    await Keychain.resetGenericPassword({service: 'intelgraph.auth'});
  } catch (error) {
    console.error('Logout failed:', error);
  }
};

// Refresh token
export const refreshAuthToken = async (): Promise<string | null> => {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    const response = await axios.post(`${API_URL}/auth/refresh`, {
      refreshToken,
    });

    const {token} = response.data;
    await setAuthToken(token);

    return token;
  } catch (error) {
    console.error('Token refresh failed:', error);
    await logout();
    return null;
  }
};

// Check if biometric authentication is available
export const isBiometricAvailable = async (): Promise<boolean> => {
  try {
    const {available} = await rnBiometrics.isSensorAvailable();
    return available;
  } catch (error) {
    console.error('Failed to check biometric availability:', error);
    return false;
  }
};

// Enable biometric authentication
export const enableBiometric = async (): Promise<boolean> => {
  try {
    const {success} = await rnBiometrics.simplePrompt({
      promptMessage: 'Confirm your identity',
      cancelButtonText: 'Cancel',
    });

    if (success) {
      await AsyncStorage.setItem(BIOMETRIC_KEY, 'true');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to enable biometric:', error);
    return false;
  }
};

// Check if biometric is enabled
export const isBiometricEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await AsyncStorage.getItem(BIOMETRIC_KEY);
    return enabled === 'true';
  } catch (error) {
    console.error('Failed to check biometric enabled:', error);
    return false;
  }
};

// Login with biometric
export const loginWithBiometric = async (): Promise<User | null> => {
  try {
    const {success} = await rnBiometrics.simplePrompt({
      promptMessage: 'Authenticate to login',
      cancelButtonText: 'Cancel',
    });

    if (!success) {
      return null;
    }

    // Get stored credentials
    const credentials = await Keychain.getGenericPassword({
      service: 'intelgraph.auth',
    });

    if (!credentials) {
      return null;
    }

    // Login with stored credentials
    const response = await login({
      email: credentials.username,
      password: credentials.password,
    });

    return response.user;
  } catch (error) {
    console.error('Biometric login failed:', error);
    return null;
  }
};

// Set PIN
export const setPIN = async (pin: string): Promise<void> => {
  try {
    await Keychain.setGenericPassword('pin', pin, {
      service: 'intelgraph.pin',
    });
  } catch (error) {
    console.error('Failed to set PIN:', error);
  }
};

// Verify PIN
export const verifyPIN = async (pin: string): Promise<boolean> => {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: 'intelgraph.pin',
    });

    if (!credentials) {
      return false;
    }

    return credentials.password === pin;
  } catch (error) {
    console.error('Failed to verify PIN:', error);
    return false;
  }
};
