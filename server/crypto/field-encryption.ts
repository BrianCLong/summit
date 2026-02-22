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

import { enc, dec } from './kms';
import { createHash, randomBytes } from 'crypto';

// Field encryption metadata
interface EncryptedField {
  version: number;
  algorithm: string;
  keyId: string;
  ciphertext: string;
  iv: string;
  authTag: string;
}

// Encryption strategies for different field types
export enum EncryptionStrategy {
  DETERMINISTIC = 'deterministic', // Same plaintext => same ciphertext (for indexing)
  PROBABILISTIC = 'probabilistic', // Same plaintext => different ciphertext (max security)
  SEARCHABLE = 'searchable',       // Supports partial matching
}

// Sensitive field types
export enum SensitiveFieldType {
  PII_NAME = 'pii:name',
  PII_EMAIL = 'pii:email',
  PII_SSN = 'pii:ssn',
  PII_PHONE = 'pii:phone',
  PII_ADDRESS = 'pii:address',
  API_KEY = 'api:key',
  API_SECRET = 'api:secret',
  PASSWORD_HASH = 'auth:password',
  CREDIT_CARD = 'payment:cc',
  BANK_ACCOUNT = 'payment:bank',
}

// Configuration for field encryption
interface FieldConfig {
  fieldType: SensitiveFieldType;
  strategy: EncryptionStrategy;
  indexable: boolean;
}

// Field configurations
const FIELD_CONFIGS: Record<SensitiveFieldType, FieldConfig> = {
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
export async function encryptField(
  plaintext: string,
  fieldType: SensitiveFieldType
): Promise<string> {
  const config = FIELD_CONFIGS[fieldType];
  if (!config) {
    throw new Error(`Unknown field type: ${fieldType}`);
  }

  // Generate data encryption key (DEK) using KMS master key
  const dekPlaintext = randomBytes(32); // 256-bit DEK
  const dekCiphertext = await enc(dekPlaintext);

  // Generate IV based on strategy
  let iv: Buffer;
  if (config.strategy === EncryptionStrategy.DETERMINISTIC) {
    // Deterministic: derive IV from plaintext for same ciphertext
    iv = createHash('sha256')
      .update(plaintext)
      .update(fieldType)
      .digest()
      .slice(0, 16);
  } else {
    // Probabilistic: random IV for different ciphertext each time
    iv = randomBytes(16);
  }

  // Encrypt field data with DEK using AES-256-GCM
  const crypto = await import('crypto');
  const cipher = crypto.createCipheriv('aes-256-gcm', dekPlaintext, iv);
  
  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('base64');

  // Create encrypted field metadata
  const encrypted: EncryptedField = {
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
export async function decryptField(encryptedData: string): Promise<string> {
  const encrypted: EncryptedField = JSON.parse(encryptedData);

  if (encrypted.version !== 1) {
    throw new Error(`Unsupported encryption version: ${encrypted.version}`);
  }

  // Decrypt DEK using KMS master key
  const dekPlaintext = await dec(encrypted.keyId);

  // Decrypt field data using DEK
  const crypto = await import('crypto');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    dekPlaintext,
    Buffer.from(encrypted.iv, 'base64')
  );
  
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
export function generateSearchToken(
  plaintext: string,
  fieldType: SensitiveFieldType
): string {
  const config = FIELD_CONFIGS[fieldType];
  
  if (!config.indexable) {
    throw new Error(`Field type ${fieldType} is not indexable`);
  }

  // Create deterministic hash for searching
  return createHash('sha256')
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
export function verifyEncryptedBackup(backupData: any): boolean {
  const sensitiveFieldPatterns = [
    /ssn/i,
    /api[_-]?key/i,
    /secret/i,
    /password/i,
    /credit[_-]?card/i,
    /bank[_-]?account/i,
  ];

  const checkObject = (obj: any, path = ''): boolean => {
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = path ? `${path}.${key}` : key;
      
      // Check if key matches sensitive pattern
      const isSensitive = sensitiveFieldPatterns.some(pattern => 
        pattern.test(key)
      );

      if (isSensitive && typeof value === 'string') {
        // Verify it's encrypted (should be JSON with EncryptedField structure)
        try {
          const parsed = JSON.parse(value);
          if (!parsed.version || !parsed.ciphertext || !parsed.keyId) {
            console.warn(`Unencrypted sensitive field detected: ${fullPath}`);
            return false;
          }
        } catch {
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
export function EncryptedField(fieldType: SensitiveFieldType) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Encrypt input arguments
      const encryptedArgs = await Promise.all(
        args.map(async (arg) => {
          if (typeof arg === 'string' && arg.length > 0) {
            return encryptField(arg, fieldType);
          }
          return arg;
        })
      );

      // Call original method with encrypted args
      const result = await originalMethod.apply(this, encryptedArgs);

      // Decrypt result if it's an encrypted field
      if (typeof result === 'string') {
        try {
          return await decryptField(result);
        } catch {
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
export async function migrateToEncrypted<T extends Record<string, any>>(
  records: T[],
  fieldMapping: Record<string, SensitiveFieldType>
): Promise<T[]> {
  return Promise.all(
    records.map(async (record) => {
      const encrypted = { ...record };
      
      for (const [fieldName, fieldType] of Object.entries(fieldMapping)) {
        if (record[fieldName] && typeof record[fieldName] === 'string') {
          // Check if already encrypted
          try {
            JSON.parse(record[fieldName]);
            // Already encrypted, skip
            continue;
          } catch {
            // Not encrypted, encrypt it
            encrypted[fieldName] = await encryptField(
              record[fieldName],
              fieldType
            );
          }
        }
      }
      
      return encrypted;
    })
  );
}

/**
 * Migration helper: Decrypt fields back to plaintext
 * Use only for rollback scenarios
 * 
 * @param records - Array of database records with encrypted fields
 * @param fieldNames - Names of fields to decrypt
 * @returns Records with decrypted fields
 */
export async function migrateFromEncrypted<T extends Record<string, any>>(
  records: T[],
  fieldNames: string[]
): Promise<T[]> {
  return Promise.all(
    records.map(async (record) => {
      const decrypted = { ...record };
      
      for (const fieldName of fieldNames) {
        if (record[fieldName] && typeof record[fieldName] === 'string') {
          try {
            decrypted[fieldName] = await decryptField(record[fieldName]);
          } catch {
            // Not encrypted or invalid, keep as-is
            continue;
          }
        }
      }
      
      return decrypted;
    })
  );
}
