const crypto = require('crypto');

function deriveKey(material) {
  return crypto.createHash('sha256').update(material).digest();
}

function deriveIv(material) {
  return crypto.createHash('md5').update(material).digest();
}

function tokenize(value, material) {
  if (value === null || value === undefined) {
    return value;
  }
  const plaintext = Buffer.from(String(value));
  const key = deriveKey(material);
  const iv = deriveIv(material);
  const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return encrypted.toString('base64');
}

function detokenize(token, material) {
  if (token === null || token === undefined) {
    return token;
  }
  const key = deriveKey(material);
  const iv = deriveIv(material);
  const decipher = crypto.createDecipheriv('aes-256-ctr', key, iv);
  const decrypted = Buffer.concat([decipher.update(Buffer.from(String(token), 'base64')), decipher.final()]);
  return decrypted.toString();
}

module.exports = {
  tokenize,
  detokenize
};
