# IntelGraph Backup & Restore Runbook

This runbook documents the `ig backup` workflow that ships with the monorepo. The CLI covers full and case-targeted backups, encrypted export, checksum validation, critical object-reference preservation, and dry-run safety checks.

## Safe defaults

- **Encryption on by default.** The CLI requires `IG_BACKUP_PASSPHRASE` or `--passphrase-file` unless you explicitly opt out with `--no-encrypt`.
- **No secrets are printed.** Only counts, hashes, and file paths are logged; passphrases are never echoed.
- **Integrity enforced.** Every backup stores payload-wide, per-case, and per-reference hashes; restores fail fast on any mismatch and report whether checksums match.

## Commands

### Create an encrypted backup

```bash
IG_BACKUP_PASSPHRASE="$(cat /secure/path/passphrase)" \
node tools/ig-backup/index.js backup create \
  --db /tmp/ig-db.json \
  --output /tmp/ig-backup.enc
```

Key flags:

- `--case <id>`: limit backup to one case (repeat for multiple).
- `--dry-run`: compute hashes and metadata without writing the backup file.
- `--no-encrypt`: write a plain JSON backup (not recommended).
- `--output <path>`: explicit path for the generated backup file (default: `./tmp/ig-backup.json`).

### Restore a backup

```bash
IG_BACKUP_PASSPHRASE="$(cat /secure/path/passphrase)" \
node tools/ig-backup/index.js backup restore \
  --db /tmp/ig-restore.json \
  --input /tmp/ig-backup.enc
```

Key flags:

- `--case <id>`: restore only the selected case(s).
- `--dry-run`: verify checksums/hashes and show counts without writing to the database file.
- `--input <path>`: required; the CLI refuses to restore without an explicit source file.
- `--passphrase-file <path>`: read the encryption passphrase from a file so it never hits process arguments.

## Validation and integrity checks

- Backups include SHA-256 hashes for the entire payload, per-case hashes of case + object bundles, and per-case hashes of the critical object reference map (`caseRefs`).
- During restore, hashes must match; otherwise the command fails with `checksum`, `Hash mismatch`, or `Reference hash mismatch` errors.
- Successful restores report `checksum`, `expectedChecksum`, `caseRefHashes`, and `caseRefsAggregate`; full restores should return identical values for both the payload checksum and reference checksum.

## Local integration smoke test (ephemeral DB)

Run the bundled tests to exercise backup, restore, checksum validation, reference validation, and partial restore paths against a temporary JSON database:

```bash
node --test tools/ig-backup/index.test.js
```

## Expected outcomes

- **Counts match:** restored `cases` and `objects` totals equal the backup (or the subset when `--case` is used).
- **Hashes match:** the reported `checksum` equals `expectedChecksum` for full restores; per-case hashes and reference hashes are preserved during partial restores.
- **Secrets remain hidden:** passphrases are read from files or environment variables and never printed to stdout.
