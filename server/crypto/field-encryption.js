"use strict";
/**
 * Field-Level Encryption Library
 *
 * Provides transparent encryption/decryption for sensitive fields using AWS KMS
 * with envelope encryption (master key + data encryption keys).
 *
 * Features:
 * - Per-field encryption strategies
 * - Key separation (master KEK + field-specific DEKs)
 * - Transparent operations in resolvers/migrations
 * - Encrypted backup verification
 * - PII and API key protection
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensitiveFieldType = exports.EncryptionStrategy = void 0;
exports.encryptField = encryptField;
exports.decryptField = decryptField;
exports.generateSearchToken = generateSearchToken;
exports.verifyEncryptedBackup = verifyEncryptedBackup;
exports.EncryptedField = EncryptedField;
exports.migrateToEncrypted = migrateToEncrypted;
exports.migrateFromEncrypted = migrateFromEncrypted;
const kms_js_1 = require("./kms.js");
const crypto_1 = require("crypto");
// Encryption strategies for different field types
var EncryptionStrategy;
(function (EncryptionStrategy) {
    EncryptionStrategy["DETERMINISTIC"] = "deterministic";
    EncryptionStrategy["PROBABILISTIC"] = "probabilistic";
    EncryptionStrategy["SEARCHABLE"] = "searchable";
})(EncryptionStrategy || (exports.EncryptionStrategy = EncryptionStrategy = {}));
// Sensitive field types
var SensitiveFieldType;
(function (SensitiveFieldType) {
    SensitiveFieldType["PII_NAME"] = "pii:name";
    SensitiveFieldType["PII_EMAIL"] = "pii:email";
    SensitiveFieldType["PII_SSN"] = "pii:ssn";
    SensitiveFieldType["PII_PHONE"] = "pii:phone";
    SensitiveFieldType["PII_ADDRESS"] = "pii:address";
    SensitiveFieldType["API_KEY"] = "api:key";
    SensitiveFieldType["API_SECRET"] = "api:secret";
    SensitiveFieldType["PASSWORD_HASH"] = "auth:password";
    SensitiveFieldType["CREDIT_CARD"] = "payment:cc";
    SensitiveFieldType["BANK_ACCOUNT"] = "payment:bank";
})(SensitiveFieldType || (exports.SensitiveFieldType = SensitiveFieldType = {}));
// Field configurations
const FIELD_CONFIGS = {
    [SensitiveFieldType.PII_NAME]: {
        fieldType: SensitiveFieldType.PII_NAME,
        strategy: EncryptionStrategy.DETERMINISTIC,
        indexable: true,
    },
    [SensitiveFieldType.PII_EMAIL]: {
        fieldType: SensitiveFieldType.PII_EMAIL,
        strategy: EncryptionStrategy.DETERMINISTIC,
        indexable: true,
    },
    [SensitiveFieldType.PII_SSN]: {
        fieldType: SensitiveFieldType.PII_SSN,
        strategy: EncryptionStrategy.PROBABILISTIC,
        indexable: false,
    },
    [SensitiveFieldType.PII_PHONE]: {
        fieldType: SensitiveFieldType.PII_PHONE,
        strategy: EncryptionStrategy.DETERMINISTIC,
        indexable: true,
    },
    [SensitiveFieldType.PII_ADDRESS]: {
        fieldType: SensitiveFieldType.PII_ADDRESS,
        strategy: EncryptionStrategy.SEARCHABLE,
        indexable: true,
    },
    [SensitiveFieldType.API_KEY]: {
        fieldType: SensitiveFieldType.API_KEY,
        strategy: EncryptionStrategy.PROBABILISTIC,
        indexable: false,
    },
    [SensitiveFieldType.API_SECRET]: {
        fieldType: SensitiveFieldType.API_SECRET,
        strategy: EncryptionStrategy.PROBABILISTIC,
        indexable: false,
    },
    [SensitiveFieldType.PASSWORD_HASH]: {
        fieldType: SensitiveFieldType.PASSWORD_HASH,
        strategy: EncryptionStrategy.PROBABILISTIC,
        indexable: false,
    },
    [SensitiveFieldType.CREDIT_CARD]: {
        fieldType: SensitiveFieldType.CREDIT_CARD,
        strategy: EncryptionStrategy.PROBABILISTIC,
        indexable: false,
    },
    [SensitiveFieldType.BANK_ACCOUNT]: {
        fieldType: SensitiveFieldType.BANK_ACCOUNT,
        strategy: EncryptionStrategy.PROBABILISTIC,
        indexable: false,
    },
};
/**
 * Encrypt a sensitive field value
 *
 * @param plaintext - The sensitive data to encrypt
 * @param fieldType - Type of sensitive field
 * @returns Encrypted field metadata as JSON string
 */
async function encryptField(plaintext, fieldType) {
    const config = FIELD_CONFIGS[fieldType];
    if (!config) {
        throw new Error(`Unknown field type: ${fieldType}`);
    }
    // Generate data encryption key (DEK) using KMS master key
    const dekPlaintext = (0, crypto_1.randomBytes)(32); // 256-bit DEK
    const dekCiphertext = await (0, kms_js_1.enc)(dekPlaintext);
    // Generate IV based on strategy
    let iv;
    if (config.strategy === EncryptionStrategy.DETERMINISTIC) {
        // Deterministic: derive IV from plaintext for same ciphertext
        iv = (0, crypto_1.createHash)('sha256')
            .update(plaintext)
            .update(fieldType)
            .digest()
            .slice(0, 16);
    }
    else {
        // Probabilistic: random IV for different ciphertext each time
        iv = (0, crypto_1.randomBytes)(16);
    }
    // Encrypt field data with DEK using AES-256-GCM
    const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
    const cipher = crypto.createCipheriv('aes-256-gcm', dekPlaintext, iv);
    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    const authTag = cipher.getAuthTag().toString('base64');
    // Create encrypted field metadata
    const encrypted = {
        version: 1,
        algorithm: 'aes-256-gcm',
        keyId: dekCiphertext, // Encrypted DEK
        ciphertext,
        iv: iv.toString('base64'),
        authTag,
    };
    return JSON.stringify(encrypted);
}
/**
 * Decrypt a sensitive field value
 *
 * @param encryptedData - The encrypted field metadata JSON string
 * @returns Decrypted plaintext
 */
async function decryptField(encryptedData) {
    const encrypted = JSON.parse(encryptedData);
    if (encrypted.version !== 1) {
        throw new Error(`Unsupported encryption version: ${encrypted.version}`);
    }
    // Decrypt DEK using KMS master key
    const dekPlaintext = await (0, kms_js_1.dec)(encrypted.keyId);
    // Decrypt field data using DEK
    const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
    const decipher = crypto.createDecipheriv('aes-256-gcm', dekPlaintext, Buffer.from(encrypted.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(encrypted.authTag, 'base64'));
    let plaintext = decipher.update(encrypted.ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');
    return plaintext;
}
/**
 * Generate searchable token for encrypted field
 * Used for partial matching on encrypted data
 *
 * @param plaintext - The sensitive data
 * @param fieldType - Type of sensitive field
 * @returns Searchable token hash
 */
function generateSearchToken(plaintext, fieldType) {
    const config = FIELD_CONFIGS[fieldType];
    if (!config.indexable) {
        throw new Error(`Field type ${fieldType} is not indexable`);
    }
    // Create deterministic hash for searching
    return (0, crypto_1.createHash)('sha256')
        .update(plaintext.toLowerCase())
        .update(fieldType)
        .update(process.env.SEARCH_TOKEN_SALT || 'default-salt')
        .digest('hex');
}
/**
 * Verify encrypted backup integrity
 * Ensures backups remain encrypted
 *
 * @param backupData - Backup data containing encrypted fields
 * @returns true if all fields are properly encrypted
 */
function verifyEncryptedBackup(backupData) {
    const sensitiveFieldPatterns = [
        /ssn/i,
        /api[_-]?key/i,
        /secret/i,
        /password/i,
        /credit[_-]?card/i,
        /bank[_-]?account/i,
    ];
    const checkObject = (obj, path = '') => {
        for (const [key, value] of Object.entries(obj)) {
            const fullPath = path ? `${path}.${key}` : key;
            // Check if key matches sensitive pattern
            const isSensitive = sensitiveFieldPatterns.some(pattern => pattern.test(key));
            if (isSensitive && typeof value === 'string') {
                // Verify it's encrypted (should be JSON with EncryptedField structure)
                try {
                    const parsed = JSON.parse(value);
                    if (!parsed.version || !parsed.ciphertext || !parsed.keyId) {
                        console.warn(`Unencrypted sensitive field detected: ${fullPath}`);
                        return false;
                    }
                }
                catch {
                    console.warn(`Invalid encryption format for field: ${fullPath}`);
                    return false;
                }
            }
            // Recursively check nested objects
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                if (!checkObject(value, fullPath)) {
                    return false;
                }
            }
            // Check arrays
            if (Array.isArray(value)) {
                for (let i = 0; i < value.length; i++) {
                    if (value[i] && typeof value[i] === 'object') {
                        if (!checkObject(value[i], `${fullPath}[${i}]`)) {
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    };
    return checkObject(backupData);
}
/**
 * Decorator for transparent field encryption in resolvers
 * Automatically encrypts/decrypts fields based on configuration
 */
function EncryptedField(fieldType) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args) {
            // Encrypt input arguments
            const encryptedArgs = await Promise.all(args.map(async (arg) => {
                if (typeof arg === 'string' && arg.length > 0) {
                    return encryptField(arg, fieldType);
                }
                return arg;
            }));
            // Call original method with encrypted args
            const result = await originalMethod.apply(this, encryptedArgs);
            // Decrypt result if it's an encrypted field
            if (typeof result === 'string') {
                try {
                    return await decryptField(result);
                }
                catch {
                    // Not encrypted, return as-is
                    return result;
                }
            }
            return result;
        };
        return descriptor;
    };
}
/**
 * Migration helper: Encrypt existing plaintext fields
 *
 * @param records - Array of database records
 * @param fieldMapping - Map of field names to field types
 * @returns Records with encrypted fields
 */
async function migrateToEncrypted(records, fieldMapping) {
    return Promise.all(records.map(async (record) => {
        const encrypted = { ...record };
        for (const [fieldName, fieldType] of Object.entries(fieldMapping)) {
            if (record[fieldName] && typeof record[fieldName] === 'string') {
                // Check if already encrypted
                try {
                    JSON.parse(record[fieldName]);
                    // Already encrypted, skip
                    continue;
                }
                catch {
                    // Not encrypted, encrypt it
                    encrypted[fieldName] = await encryptField(record[fieldName], fieldType);
                }
            }
        }
        return encrypted;
    }));
}
/**
 * Migration helper: Decrypt fields back to plaintext
 * Use only for rollback scenarios
 *
 * @param records - Array of database records with encrypted fields
 * @param fieldNames - Names of fields to decrypt
 * @returns Records with decrypted fields
 */
async function migrateFromEncrypted(records, fieldNames) {
    return Promise.all(records.map(async (record) => {
        const decrypted = { ...record };
        for (const fieldName of fieldNames) {
            if (record[fieldName] && typeof record[fieldName] === 'string') {
                try {
                    decrypted[fieldName] = await decryptField(record[fieldName]);
                }
                catch {
                    // Not encrypted or invalid, keep as-is
                    continue;
                }
            }
        }
        return decrypted;
    }));
}
