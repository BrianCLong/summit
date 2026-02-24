# Runbook: Evidence Bundle Reproduction & Operations

## Overview
This runbook covers how to reproduce a build deterministically, rotate signing keys, and manage evidence waivers.

## Reproducing a Build
To reproduce the `artifacts/build/build.tgz` from a specific tag (e.g., `v1.2.3`):

1. Checkout the tag:
   ```bash
   git checkout v1.2.3
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Run the build:
   ```bash
   npm run build:client
   npm run build:server
   ```
4. Pack deterministically:
   ```bash
   ./scripts/ci/pack_deterministic.sh
   ```
5. Compare the SHA256 of `artifacts/build/build.tgz` with the one in the release.

## Key Rotation
The evidence bundle is signed using Minisign. The public key is pinned in `docs/governance/EVIDENCE_ID_POLICY.yml` and `.ci/keys/minisign.pub`.

1. Generate a new keypair:
   ```bash
   minisign -G -p new.pub -s new.key
   ```
2. Update `.ci/keys/minisign.pub` with content of `new.pub`.
3. Update GitHub Secrets:
   - `MINISIGN_SECRET_KEY`: Content of `new.key`
   - `MINISIGN_PASSWORD`: Password for the key (if any)
4. Commit the new public key.

## Managing Waivers
To waive a required evidence ID (e.g., if a tool is broken):

1. Edit `docs/governance/EVIDENCE_WAIVERS.yml`.
2. Add a new entry:
   ```yaml
   - id: BROKEN-ID
     reason: "Tool is broken, fix ETA 2026-03-01"
     approver: "security-team"
     expires_on: "2026-03-01"
   ```
3. Commit and push.

## Incident Response
If signature verification fails in CI:
1. Check if the key was rotated but secret not updated.
2. Check if the file was tampered with.
3. Check `evidence_index.json` for discrepancies.
