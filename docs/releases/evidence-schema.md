# Evidence Schema

The evidence JSON file contains proof of various checks and validations performed during the release process.

## Structure

```json
{
  "schemaVersion": "1.0.0",
  "tag": "v1.0.0",
  "sha": "git-commit-sha",
  "checks": [
    {
      "name": "check-name",
      "status": "PASS",
      "timestamp": "ISO-8601"
    }
  ],
  "bundle": {
    "algorithm": "sha256",
    "digest": "sha256-hash-of-bundle",
    "source": "SHA256SUMS"
  }
}
```

## Fields

### `bundle`

Links the evidence to a specific release bundle.

- `algorithm`: The hashing algorithm used (e.g., "sha256").
- `digest`: The computed hash of the bundle's `SHA256SUMS` file (or canonical signature file).
- `source`: The file used to compute the digest (e.g., "SHA256SUMS").
