const fs = require('node:fs');

function resolvePassphrase(options) {
  if (!options.encrypt) {
    return null;
  }
  if (options.passphraseFile) {
    return fs.readFileSync(options.passphraseFile, 'utf8').trim();
  }
  if (process.env.IG_BACKUP_PASSPHRASE) {
    return process.env.IG_BACKUP_PASSPHRASE;
  }
  throw new Error('Encryption is enabled. Provide IG_BACKUP_PASSPHRASE or --passphrase-file, or disable with --no-encrypt.');
}

module.exports = { resolvePassphrase };
