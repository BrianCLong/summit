const crypto = require('node:crypto');

const ALGORITHM = 'aes-256-gcm';
const PBKDF2_ITERATIONS = 120000;
const KEY_LENGTH = 32;

function hashPayload(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function deriveKey(passphrase, salt) {
  return crypto.pbkdf2Sync(passphrase, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
}

function encryptSerialized(serializedBackup, passphrase) {
  const iv = crypto.randomBytes(12);
  const salt = crypto.randomBytes(16);
  const key = deriveKey(passphrase, salt);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(serializedBackup, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    kind: 'ig-backup-encrypted',
    algorithm: ALGORITHM,
    iv: iv.toString('base64'),
    salt: salt.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

function decryptSerialized(encryptedPayload, passphrase) {
  const { iv, salt, authTag, ciphertext } = encryptedPayload;
  const key = deriveKey(passphrase, Buffer.from(salt, 'base64'));
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

module.exports = {
  hashPayload,
  encryptSerialized,
  decryptSerialized,
};
