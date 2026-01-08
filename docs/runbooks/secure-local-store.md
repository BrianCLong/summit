# Secure Local Store Runbook

## Overview
The Secure Local Store provides encrypted-at-rest storage for offline data, with support for verified case pack ingestion, tamper detection, and key rotation. It is designed for "field mode" operations where connectivity is intermittent or non-existent.

## Architecture
- **Location**: `server/src/lib/local-store/`
- **Encryption**: AES-256-GCM with unique keys per tenant.
- **Key Management**: Local keyring file (`keyring.json`) stores keys. Active key is rotated on demand.
- **Integrity**: Authenticated Encryption (AEAD) ensures ciphertext integrity and authenticity of Associated Data (AAD).
- **Audit**: Operations are logged to `audits/ingest-log.jsonl` and `audits/tamper-events.jsonl`.

## CLI Usage

The system is managed via the `localstore` CLI scripts.

### 1. Initialize Store
Initialize the root store directory.
```bash
pnpm localstore:init --path ./my-store
```

### 2. Initialize Tenant
Create a tenant workspace and initial encryption keys.
```bash
pnpm localstore:tenant:init --path ./my-store --tenant tenant-123
```

### 3. Ingest Case Pack
Ingest a verified case pack (directory or zip) into the tenant's store.
```bash
pnpm localstore:ingest --path ./my-store --tenant tenant-123 --pack ./downloads/case-pack-v1
```
*Note: The ingest process verifies the pack's manifest hash and file checksums before processing.*

### 4. Verify Integrity
Scan the store for missing files, corruption, or tampering.
```bash
pnpm localstore:verify --path ./my-store --tenant tenant-123
```
If tampering is detected, the command exits with non-zero status and details are printed (and logged to `tamper-events.jsonl`).

### 5. Rotate Keys
Rotate the encryption key for a tenant and re-encrypt all stored objects.
```bash
pnpm localstore:rotate --path ./my-store --tenant tenant-123
```
*Note: Old keys are retained in the keyring to support decryption during rotation recovery if needed, but the CLI immediately re-encrypts all content.*

## Threat Model

### Protected Against:
- **At-Rest Theft**: If the disk is stolen, data is encrypted (assuming the key is not stored on the same disk or is protected by OS-level encryption/TPM, though currently keys are stored in `keys/` directory for this MVP).
- **Tampering**: Modification of `.enc` files or swapping files (AAD mismatch) is detected.
- **Incomplete Ingest**: Deterministic ingest logs and atomic file writes (mostly) help recovery.

### Not Protected Against (Current Scope):
- **Compromised Host**: A running process with access to the `keys/` directory can read all data.
- **Key Theft**: Keys are stored on the filesystem. Production deployment should use a KMS or hardware token via the `KeyProvider` interface.

## Interpreting Tamper Events

Events in `tamper-events.jsonl`:
- `missing_file`: A file listed in the index is gone.
- `integrity_failure`: The file is corrupted or not a valid JSON envelope.
- `decryption_failure`: The AES-GCM tag check failed. Indicates malicious modification or bit rot.
- `aad_mismatch`: The file was moved from another context (e.g., different tenant or ID).

## Next Steps
- **Conflict-Safe Sync**: Implement vector clocks and merge policies for bi-directional sync.
- **KMS Integration**: Replace `LocalKeyProvider` with a real KMS implementation.
