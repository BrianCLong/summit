# Runbook: Offline Case Packs

This runbook provides instructions for building, verifying, and managing Offline Case Packs in the Summit platform.

## Overview

Offline Case Packs are a standardized, secure, and deterministic format for packaging intelligence case data for offline use. This enables field operators to securely transport and analyze case data without a live connection to the central server.

## Building a Case Pack

To build a case pack, use the `casepack:build` command:

```bash
pnpm casepack:build --case <caseId> --scope <path/to/scope.json> --out <path/to/outputDir>
```

- `--case`: The ID of the case to be packed.
- `--scope`: A JSON file that defines the scope of the data to be included in the pack.
- `--out`: The directory where the case pack will be created.

### Scope File Format

The scope file is a JSON file that specifies the data to be included in the case pack. Here is an example:

```json
{
  "selectors": [
    { "type": "entity", "ids": ["id1", "id2"] },
    { "type": "sighting", "time_range": ["2024-01-01T00:00:00Z", "2024-01-31T23:59:59Z"] }
  ]
}
```

## Verifying a Case Pack

To verify the integrity of a case pack, use the `casepack:verify` command:

```bash
pnpm casepack:verify --path <path/to/casepackDir>
```

- `--path`: The path to the case pack directory.

The verifier checks the following:

- **Manifest Signature**: Ensures that the manifest has not been tampered with.
- **File Checksums**: Verifies that the files in the pack match the checksums in the manifest.
- **Budget Integrity**: Confirms that the pack does not exceed the defined size and object count budgets.

## Known Limitations

- **Encryption**: The case pack is not yet encrypted. This will be addressed in a future increment.
- **Key Management**: The current implementation uses a test key pair. Integration with a Key Management System (KMS) is planned for a future release.
- **Data Fetching**: The data fetching logic in the builder is currently a placeholder. This will be integrated with the live data sources in a future step.
