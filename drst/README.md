# Data Residency Shadow Tester (DRST)

`drst` is a Go-based agent and controller that exercises multi-jurisdiction routing and storage residency controls with deterministic synthetic traffic. It generates tagged transactions, traces their network path, scans configured storage buckets, and emits a compliance map including negative inclusion proofs for buckets that remain within regional boundaries.

## Features

- Deterministic synthetic transaction generator keyed by jurisdiction and endpoint.
- DNS-based edge tracer with optional host/IP-to-region mapping for precise residency attribution.
- Storage scanner for JSON artifact manifests backed by Merkle-root negative inclusion proofs.
- Single command reports routing and storage violations plus evidence for compliant buckets.

## Usage

1. Prepare a configuration file (see `sample-config.yaml`) describing jurisdictions, routing expectations, and storage targets.
2. Optionally provide a JSON map that associates hostnames or specific IP addresses with a residency region label.
3. Run the controller:

```bash
cd drst
go run ./cmd/drst --config sample-config.yaml --region-map ./region-map.json
```

- `--seed` overrides the master RNG seed so runs are reproducible when set to a known value.
- `--region-map` is optional; when omitted the tracer will report hops/IPs but regions remain `"unresolved"` and will be flagged if residency enforcement is required.

The command prints a JSON report summarizing routing violations, storage violations, and the Merkle-root proofs that no out-of-region artifacts were discovered for compliant buckets.

## Storage Artifact Format

Storage targets point to either a single JSON file or directory containing JSON files. Each file may contain a single artifact or an array of artifacts using the following shape:

```json
{
  "identifier": "unique-object-id",
  "region": "us-west-2",
  "metadata": {
    "checksum": "...",
    "owner": "..."
  }
}
```

## Extending DRST

- Implement custom `probe.RegionResolver` instances when richer geolocation data is available.
- Replace the default `storage.Scanner` with adapters that query cloud provider APIs for bucket inventories.
- Feed observations into downstream tooling by serializing `report.ComplianceMap` and storing it alongside other compliance evidence.
