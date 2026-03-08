"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const secrets_js_1 = __importDefault(require("../../config/secrets.js"));
const crypto_secure_random_js_1 = require("../../utils/crypto-secure-random.js");
class KeyService {
    static ALGORITHM = 'aes-256-gcm';
    /**
     * Generates a new API key with a prefix.
     * Format: prefix_randomString
     * Returns the plain key (to show once) and the hash (to store).
     */
    static async generateApiKey(prefix = 'summit_sk') {
        const key = `${prefix}_${(0, crypto_secure_random_js_1.randomString)(32, 'base64url')}`;
        const hash = await this.hashKey(key);
        return { key, hash };
    }
    /**
     * Hashes a key for secure storage (one-way).
     * Uses scrypt.
     */
    static async hashKey(key) {
        return new Promise((resolve, reject) => {
            const salt = crypto_1.default.randomBytes(16).toString('hex');
            crypto_1.default.scrypt(key, salt, 64, (err, derivedKey) => {
                if (err)
                    reject(err);
                resolve(`${salt}:${derivedKey.toString('hex')}`);
            });
        });
    }
    /**
     * Verifies a key against a stored hash.
     */
    static async verifyKey(key, hash) {
        const [salt, storedHash] = hash.split(':');
        if (!salt || !storedHash)
            return false;
        return new Promise((resolve, reject) => {
            crypto_1.default.scrypt(key, salt, 64, (err, derivedKey) => {
                if (err)
                    reject(err);
                resolve(derivedKey.toString('hex') === storedHash);
            });
        });
    }
    /**
     * Encrypts sensitive data (like an external API key) for storage.
     */
    static encrypt(text) {
        if (!secrets_js_1.default.ENCRYPTION_KEY) {
            throw new Error('ENCRYPTION_KEY is not configured');
        }
        // config.ENCRYPTION_KEY is hex string (64 chars = 32 bytes)
        const key = Buffer.from(secrets_js_1.default.ENCRYPTION_KEY, 'hex');
        const iv = crypto_1.default.randomBytes(16);
        const cipher = crypto_1.default.createCipheriv(KeyService.ALGORITHM, key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    }
    /**
     * Decrypts sensitive data.
     */
    static decrypt(encryptedText) {
        if (!secrets_js_1.default.ENCRYPTION_KEY) {
            throw new Error('ENCRYPTION_KEY is not configured');
        }
        const key = Buffer.from(secrets_js_1.default.ENCRYPTION_KEY, 'hex');
        const parts = encryptedText.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted text format');
        }
        const [ivHex, authTagHex, encryptedHex] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto_1.default.createDecipheriv(KeyService.ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
exports.KeyService = KeyService;
