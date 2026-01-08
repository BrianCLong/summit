
# Backup Integrity Verification Runbook

## Overview
This runbook covers how to verify the integrity of backups using the `BackupIntegrityVerifier`. This tool ensures backups match their manifests (checksums, file existence).

## 1. Generating a Backup Manifest
The backup service automatically generates a manifest. If you need to generate one for simulation or testing:

```typescript
// Script usage
const verifier = new BackupIntegrityVerifier();
await verifier.simulateBackup({ outputDir: './backups/sim-1' });
```

## 2. Verifying a Backup
To verify a backup against its manifest:

```bash
# Example command if exposed via CLI (currently integrated in DR drills or tests)
npx tsx scripts/resilience-verify.ts
```

The verifier performs:
1. **Existence Check**: Ensures all files listed in `manifest.json` exist.
2. **Checksum Check**: Calculates SHA256 of files and compares with manifest.

## 3. Offline Verification
For air-gapped or offline verification:
1. Copy the backup directory (including `manifest.json`) to a secure verification host.
2. Run the verifier tool against the directory.

## 4. Failure Modes & Remediation

### Checksum Mismatch
**Symptom:** Verifier reports `Checksum mismatch`.
**Cause:** Bit rot, malicious tampering, or incomplete transfer.
**Remediation:**
1. Do NOT restore from this backup.
2. Alert security team if tampering is suspected.
3. Attempt to verify the previous backup.

### Missing File
**Symptom:** Verifier reports file not found.
**Cause:** Incomplete backup or deletion.
**Remediation:** Mark backup as invalid.

## 5. Simulation / Testing
You can run the deterministic simulation to prove the verifier works:

```bash
npx tsx server/src/backup/BackupIntegrityVerifier.test.ts
```
