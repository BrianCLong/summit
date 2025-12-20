#!/usr/bin/env node

const path = require('node:path');
const { createBackup, restoreBackup } = require('./lib/backup-service');
const { resolvePassphrase } = require('./lib/passphrase');

function printHelp() {
  console.log(`Usage: ig backup <create|restore> [options]

Commands:
  create            Create an encrypted backup from the database
  restore           Restore a backup into the database

Options:
  --db <path>             Path to JSON database file (default: ./tmp/ig-db.json)
  --output <file>         Backup file to write for create (default: ./tmp/ig-backup.json)
  --input <file>          Backup file to read for restore
  --case <case-id>        Limit backup/restore to a specific case (repeatable)
  --passphrase-file <p>   File containing encryption passphrase (avoids echoing secrets)
  --dry-run               Show the summary without writing files or mutating data
  --no-encrypt            Disable AES-256-GCM encryption (default is encrypted)
  --help                  Show this help message
`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const [group, action] = args.splice(0, 2);
  const options = {
    encrypt: true,
    caseIds: [],
    dbPath: path.join(process.cwd(), 'tmp/ig-db.json'),
    outputPath: path.join(process.cwd(), 'tmp/ig-backup.json'),
    dryRun: false,
  };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    switch (arg) {
      case '--db':
        options.dbPath = args[++i];
        break;
      case '--output':
        options.outputPath = args[++i];
        break;
      case '--input':
        options.inputPath = args[++i];
        break;
      case '--case':
        options.caseIds.push(args[++i]);
        break;
      case '--passphrase-file':
        options.passphraseFile = args[++i];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--no-encrypt':
        options.encrypt = false;
        break;
      case '--help':
        options.help = true;
        break;
      default:
        break;
    }
  }
  return { group, action, options };
}

function main() {
  const { group, action, options } = parseArgs(process.argv);
  if (options.help || group !== 'backup' || !['create', 'restore'].includes(action)) {
    printHelp();
    return;
  }
  try {
    if (action === 'create') {
      const passphrase = options.encrypt ? resolvePassphrase(options) : null;
      const result = createBackup({
        dbPath: options.dbPath,
        outputPath: options.outputPath,
        passphrase,
        encrypt: options.encrypt,
        caseIds: options.caseIds,
        dryRun: options.dryRun,
      });
      console.log(
        JSON.stringify(
          {
            status: 'ok',
            encrypted: result.encrypted,
            savedTo: result.path,
            counts: result.backup.counts,
            checksum: result.backup.checksum,
            caseHashes: result.backup.hashes.cases,
            dryRun: options.dryRun,
            filtered: Boolean(options.caseIds.length),
          },
          null,
          2,
        ),
      );
    } else {
      const restorePassphrase =
        options.passphraseFile || process.env.IG_BACKUP_PASSPHRASE
          ? resolvePassphrase(options)
          : null;
      const result = restoreBackup({
        dbPath: options.dbPath,
        inputPath: options.inputPath,
        passphrase: restorePassphrase,
        caseIds: options.caseIds,
        dryRun: options.dryRun,
      });
      console.log(
        JSON.stringify(
          {
            status: 'ok',
            dryRun: result.dryRun,
            filtered: result.filtered,
            counts: result.counts,
            checksum: result.checksum,
            expectedChecksum: result.expectedChecksum,
            checksumMatches: result.checksumMatches,
            caseHashes: result.caseHashes,
          },
          null,
          2,
        ),
      );
    }
  } catch (err) {
    console.error(JSON.stringify({ status: 'error', message: err.message }));
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = { parseArgs, printHelp };
