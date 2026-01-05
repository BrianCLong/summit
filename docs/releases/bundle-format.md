# Release Bundle Format

This document describes the format of the release artifacts bundle, designed for stability and forward compatibility.

## `schemaVersion`

All key JSON artifacts in the release bundle include a top-level `schemaVersion` field. This version string (e.g., `"1.0.0"`) allows consumers to identify the format of the artifact and adapt to changes over time.

Example (`release-manifest.json`):

```json
{
  "schemaVersion": "1.0.0",
  "version": "v0.4-20240101",
  "image": "ghcr.io/owner/repo:main-sha-1234567",
  "digest": "sha256:abcdef...",
  ...
}
```

## `bundle-index.json`

The `bundle-index.json` file is the recommended entry point for programmatically consuming the release bundle. It provides a manifest of all files in the bundle, their checksums, and pointers to key artifacts.

### Structure

- `schemaVersion` (string): The version of the bundle index itself.
- `tag` (string): The Git tag associated with the release (e.g., `v0.3.0-rc.1`).
- `channel` (string): The release channel (e.g., `rc`, `stable`).
- `generatedAt` (string): An ISO 8601 timestamp of when the index was generated.
- `pointers` (object): Direct paths to essential artifacts within the bundle.
- `files` (array): A list of all files in the bundle, each with:
  - `path` (string): The relative path to the file.
  - `bytes` (number): The size of the file in bytes.
  - `sha256` (string): The SHA256 checksum of the file.

### Example `bundle-index.json`

```json
{
  "schemaVersion": "1.0.0",
  "tag": "v0.3.0-rc.1",
  "channel": "rc",
  "generatedAt": "2024-01-01T12:00:00.000Z",
  "pointers": {
    "status": "dist/release/release-status.json",
    "manifest": "dist/release/release-manifest.json",
    "notes": "dist/release/release-notes.md",
    "sbom": "dist/release/sbom.cdx.json",
    "provenance": "dist/release/provenance.json",
    "checksums": "dist/release/SHA256SUMS"
  },
  "files": [
    {
      "path": "dist/release/release-manifest.json",
      "bytes": 1234,
      "sha256": "abcdef123456..."
    },
    {
      "path": "dist/release/provenance.json",
      "bytes": 5678,
      "sha256": "fedcba654321..."
    }
  ]
}
```
