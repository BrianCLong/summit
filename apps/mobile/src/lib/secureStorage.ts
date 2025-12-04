/**
 * Secure Storage Module
 * Provides encrypted local storage for sensitive data
 * Uses Web Crypto API for encryption
 */
import { get, set, del, clear } from 'idb-keyval';
import type { AuthState } from '@/types';

// Storage keys
const KEYS = {
  SESSION: 'ig_session',
  ACCESS_TOKEN: 'ig_access_token',
  REFRESH_TOKEN: 'ig_refresh_token',
  DEVICE_TOKEN: 'ig_device_token',
  PIN_HASH: 'ig_pin_hash',
  ENCRYPTION_KEY: 'ig_enc_key',
  DEVICE_INFO: 'ig_device_info',
} as const;

// Encryption helpers using Web Crypto API
async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  try {
    // Try to retrieve existing key
    const storedKey = await get(KEYS.ENCRYPTION_KEY);
    if (storedKey) {
      return await crypto.subtle.importKey(
        'raw',
        storedKey,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
    }

    // Generate new key
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    // Export and store
    const exportedKey = await crypto.subtle.exportKey('raw', key);
    await set(KEYS.ENCRYPTION_KEY, new Uint8Array(exportedKey));

    return key;
  } catch (error) {
    console.error('Failed to get/create encryption key:', error);
    throw error;
  }
}

async function encrypt(data: string): Promise<string> {
  const key = await getOrCreateEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Base64 encode for storage
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(encryptedData: string): Promise<string> {
  const key = await getOrCreateEncryptionKey();

  // Base64 decode
  const combined = new Uint8Array(
    atob(encryptedData)
      .split('')
      .map((c) => c.charCodeAt(0))
  );

  // Extract IV and data
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return new TextDecoder().decode(decrypted);
}

// Hash PIN for storage
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Secure Storage API
export const secureStorage = {
  // Session management
  async saveSession(session: Partial<AuthState>): Promise<void> {
    const encrypted = await encrypt(JSON.stringify(session));
    await set(KEYS.SESSION, encrypted);
  },

  async getSession(): Promise<Partial<AuthState> | null> {
    try {
      const encrypted = await get(KEYS.SESSION);
      if (!encrypted) return null;

      const decrypted = await decrypt(encrypted as string);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  },

  async clearSession(): Promise<void> {
    await del(KEYS.SESSION);
  },

  // Token management
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    const encryptedAccess = await encrypt(accessToken);
    const encryptedRefresh = await encrypt(refreshToken);

    await set(KEYS.ACCESS_TOKEN, encryptedAccess);
    await set(KEYS.REFRESH_TOKEN, encryptedRefresh);
  },

  async getAccessToken(): Promise<string | null> {
    try {
      const encrypted = await get(KEYS.ACCESS_TOKEN);
      if (!encrypted) return null;
      return await decrypt(encrypted as string);
    } catch {
      return null;
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      const encrypted = await get(KEYS.REFRESH_TOKEN);
      if (!encrypted) return null;
      return await decrypt(encrypted as string);
    } catch {
      return null;
    }
  },

  async clearTokens(): Promise<void> {
    await del(KEYS.ACCESS_TOKEN);
    await del(KEYS.REFRESH_TOKEN);
  },

  // Device token
  async setDeviceToken(token: string): Promise<void> {
    const encrypted = await encrypt(token);
    await set(KEYS.DEVICE_TOKEN, encrypted);
  },

  async getDeviceToken(): Promise<string | null> {
    try {
      const encrypted = await get(KEYS.DEVICE_TOKEN);
      if (!encrypted) return null;
      return await decrypt(encrypted as string);
    } catch {
      return null;
    }
  },

  // PIN management
  async setPin(pin: string): Promise<void> {
    const hashedPin = await hashPin(pin);
    const encrypted = await encrypt(hashedPin);
    await set(KEYS.PIN_HASH, encrypted);
  },

  async verifyPin(pin: string): Promise<boolean> {
    try {
      const encrypted = await get(KEYS.PIN_HASH);
      if (!encrypted) return false;

      const storedHash = await decrypt(encrypted as string);
      const inputHash = await hashPin(pin);

      // Constant-time comparison
      if (storedHash.length !== inputHash.length) return false;

      let result = 0;
      for (let i = 0; i < storedHash.length; i++) {
        result |= storedHash.charCodeAt(i) ^ inputHash.charCodeAt(i);
      }
      return result === 0;
    } catch {
      return false;
    }
  },

  async hasPin(): Promise<boolean> {
    const pin = await get(KEYS.PIN_HASH);
    return !!pin;
  },

  // Clear all storage
  async clearAll(): Promise<void> {
    await clear();
  },
};

export default secureStorage;
