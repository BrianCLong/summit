import * as Keychain from 'react-native-keychain';
import {
  saveAuthTokens,
  getAuthTokens,
  getAuthToken,
  clearAuthToken,
  saveUser,
  getUser,
  clearUser,
  isAuthenticated,
  isBiometricsAvailable,
} from '../../src/services/AuthService';

jest.mock('react-native-keychain');
jest.mock('react-native-mmkv');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveAuthTokens', () => {
    it('saves tokens to keychain', async () => {
      const tokens = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: Date.now() + 3600000,
      };

      await saveAuthTokens(tokens);

      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
        'auth_tokens',
        JSON.stringify(tokens),
        { service: 'intelgraph_auth' }
      );
    });
  });

  describe('getAuthTokens', () => {
    it('returns null when no tokens exist', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);

      const result = await getAuthTokens();

      expect(result).toBeNull();
    });

    it('returns tokens when they exist', async () => {
      const tokens = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: Date.now() + 3600000,
      };

      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        password: JSON.stringify(tokens),
      });

      const result = await getAuthTokens();

      expect(result).toEqual(tokens);
    });
  });

  describe('getAuthToken', () => {
    it('returns null when no tokens exist', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);

      const result = await getAuthToken();

      expect(result).toBeNull();
    });

    it('returns access token when valid', async () => {
      const tokens = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: Date.now() + 3600000, // 1 hour from now
      };

      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        password: JSON.stringify(tokens),
      });

      const result = await getAuthToken();

      expect(result).toBe('test-access-token');
    });
  });

  describe('clearAuthToken', () => {
    it('clears tokens from keychain', async () => {
      await clearAuthToken();

      expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
        service: 'intelgraph_auth',
      });
    });
  });

  describe('isAuthenticated', () => {
    it('returns false when no token exists', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);

      const result = await isAuthenticated();

      expect(result).toBe(false);
    });

    it('returns true when valid token exists', async () => {
      const tokens = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: Date.now() + 3600000,
      };

      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        password: JSON.stringify(tokens),
      });

      const result = await isAuthenticated();

      expect(result).toBe(true);
    });
  });

  describe('isBiometricsAvailable', () => {
    it('returns true when biometrics are available', async () => {
      const result = await isBiometricsAvailable();
      expect(result).toBe(true);
    });
  });
});
