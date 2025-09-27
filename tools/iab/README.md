# Incident Attestation Bundler (IAB)

`iab` is a Node.js + TypeScript command line utility for assembling attested incident bundles. It
collects logs, policies, differential privacy budgets, consent proofs, and error traces into a
signed `.tgz` file with a manifest, SHA-256 checksums, and a human-readable Markdown summary.

## Features

- Validates artifact inputs per type before inclusion.
- Automatically redacts sensitive data using configurable tombstoning rules.
- Produces a manifest describing each artifact, applied redactions, and validation metadata.
- Generates a Markdown summary suitable for investigators and regulators.
- Signs bundles using RSA SHA-256 for offline verification.

## Getting Started

```bash
cd tools/iab
npm install
npm run build
```

## Usage

### Create a bundle

```bash
node dist/index.js bundle \
  --incident ../../samples/iab/sample-incident.json \
  --output ../../samples/iab/sample-bundle.tgz \
  --private-key ../../samples/iab/keys/sample-private.pem
```

### Verify a bundle offline

```bash
node dist/index.js verify \
  --bundle ../../samples/iab/sample-bundle.tgz \
  --public-key ../../samples/iab/keys/sample-public.pem
```

The verify command extracts the manifest, validates the RSA signature, and prints a concise
summary. Use this flow to share bundles with regulators or auditors.

## Sample Data

The `samples/iab` directory provides a fully wired example with intentionally redacted PII so you
can test the flow end-to-end.

## Configuration Format

Incident configurations are JSON or YAML files with the following schema:

```json
{
  "id": "INC-2025-09-01-01",
  "occurredAt": "2025-09-01T13:04:00Z",
  "reportedAt": "2025-09-01T14:20:00Z",
  "severity": "high",
  "description": "Short incident summary...",
  "redaction": {
    "fields": ["customField"],
    "patterns": [{ "pattern": "(?i)secret", "replacement": "<SECRET>" }]
  },
  "artifacts": [
    {
      "id": "ingest-logs",
      "type": "log",
      "path": "../../runs/incident-123/log.txt",
      "description": "Ingestion service structured logs"
    }
  ]
}
```

`fields` specify object keys that should be tombstoned when redacting structured artifacts. Regular
expression `patterns` apply to text artifacts.

## Testing

```bash
npm test
```

This command builds the CLI, creates the sample bundle, and verifies it using the sample key pair.
