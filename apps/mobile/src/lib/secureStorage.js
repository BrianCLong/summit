"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.secureStorage = void 0;
/**
 * Secure Storage Module
 * Provides encrypted local storage for sensitive data
 * Uses Web Crypto API for encryption
 */
const idb_keyval_1 = require("idb-keyval");
// Storage keys
const KEYS = {
    SESSION: 'ig_session',
    ACCESS_TOKEN: 'ig_access_token',
    REFRESH_TOKEN: 'ig_refresh_token',
    DEVICE_TOKEN: 'ig_device_token',
    PIN_HASH: 'ig_pin_hash',
    ENCRYPTION_KEY: 'ig_enc_key',
    DEVICE_INFO: 'ig_device_info',
};
// Encryption helpers using Web Crypto API
async function getOrCreateEncryptionKey() {
    try {
        // Try to retrieve existing key
        const storedKey = await (0, idb_keyval_1.get)(KEYS.ENCRYPTION_KEY);
        if (storedKey) {
            return await crypto.subtle.importKey('raw', storedKey, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
        }
        // Generate new key
        const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
        // Export and store
        const exportedKey = await crypto.subtle.exportKey('raw', key);
        await (0, idb_keyval_1.set)(KEYS.ENCRYPTION_KEY, new Uint8Array(exportedKey));
        return key;
    }
    catch (error) {
        console.error('Failed to get/create encryption key:', error);
        throw error;
    }
}
async function encrypt(data) {
    const key = await getOrCreateEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(data);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    // Base64 encode for storage
    return btoa(String.fromCharCode(...combined));
}
async function decrypt(encryptedData) {
    const key = await getOrCreateEncryptionKey();
    // Base64 decode
    const combined = new Uint8Array(atob(encryptedData)
        .split('')
        .map((c) => c.charCodeAt(0)));
    // Extract IV and data
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(decrypted);
}
// Hash PIN for storage
async function hashPin(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
// Secure Storage API
exports.secureStorage = {
    // Session management
    async saveSession(session) {
        const encrypted = await encrypt(JSON.stringify(session));
        await (0, idb_keyval_1.set)(KEYS.SESSION, encrypted);
    },
    async getSession() {
        try {
            const encrypted = await (0, idb_keyval_1.get)(KEYS.SESSION);
            if (!encrypted)
                return null;
            const decrypted = await decrypt(encrypted);
            return JSON.parse(decrypted);
        }
        catch (error) {
            console.error('Failed to get session:', error);
            return null;
        }
    },
    async clearSession() {
        await (0, idb_keyval_1.del)(KEYS.SESSION);
    },
    // Token management
    async setTokens(accessToken, refreshToken) {
        const encryptedAccess = await encrypt(accessToken);
        const encryptedRefresh = await encrypt(refreshToken);
        await (0, idb_keyval_1.set)(KEYS.ACCESS_TOKEN, encryptedAccess);
        await (0, idb_keyval_1.set)(KEYS.REFRESH_TOKEN, encryptedRefresh);
    },
    async getAccessToken() {
        try {
            const encrypted = await (0, idb_keyval_1.get)(KEYS.ACCESS_TOKEN);
            if (!encrypted)
                return null;
            return await decrypt(encrypted);
        }
        catch {
            return null;
        }
    },
    async getRefreshToken() {
        try {
            const encrypted = await (0, idb_keyval_1.get)(KEYS.REFRESH_TOKEN);
            if (!encrypted)
                return null;
            return await decrypt(encrypted);
        }
        catch {
            return null;
        }
    },
    async clearTokens() {
        await (0, idb_keyval_1.del)(KEYS.ACCESS_TOKEN);
        await (0, idb_keyval_1.del)(KEYS.REFRESH_TOKEN);
    },
    // Device token
    async setDeviceToken(token) {
        const encrypted = await encrypt(token);
        await (0, idb_keyval_1.set)(KEYS.DEVICE_TOKEN, encrypted);
    },
    async getDeviceToken() {
        try {
            const encrypted = await (0, idb_keyval_1.get)(KEYS.DEVICE_TOKEN);
            if (!encrypted)
                return null;
            return await decrypt(encrypted);
        }
        catch {
            return null;
        }
    },
    // PIN management
    async setPin(pin) {
        const hashedPin = await hashPin(pin);
        const encrypted = await encrypt(hashedPin);
        await (0, idb_keyval_1.set)(KEYS.PIN_HASH, encrypted);
    },
    async verifyPin(pin) {
        try {
            const encrypted = await (0, idb_keyval_1.get)(KEYS.PIN_HASH);
            if (!encrypted)
                return false;
            const storedHash = await decrypt(encrypted);
            const inputHash = await hashPin(pin);
            // Constant-time comparison
            if (storedHash.length !== inputHash.length)
                return false;
            let result = 0;
            for (let i = 0; i < storedHash.length; i++) {
                result |= storedHash.charCodeAt(i) ^ inputHash.charCodeAt(i);
            }
            return result === 0;
        }
        catch {
            return false;
        }
    },
    async hasPin() {
        const pin = await (0, idb_keyval_1.get)(KEYS.PIN_HASH);
        return !!pin;
    },
    // Clear all storage
    async clearAll() {
        await (0, idb_keyval_1.clear)();
    },
};
exports.default = exports.secureStorage;
