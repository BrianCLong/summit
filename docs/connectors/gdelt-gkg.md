# GDELT GKG Connector

## Readiness Assertion

This connector aligns with the Summit Readiness Assertion and keeps external narrative signals in a governed evidence-first lane. See `docs/SUMMIT_READINESS_ASSERTION.md` for the system-level readiness posture.

## Summary

The GDELT Global Knowledge Graph (GKG) connector provides a governed entry point for ingesting
15-minute narrative signals as external observations. The implementation now includes:

- deterministic parsing and mapping for core GKG v2.1 columns,
- observation-node generation for mention edges,
- support for `.tsv`, `.tsv.gz`, and single-file `.zip` payloads,
- index+md5 parsing helpers for deterministic replay references.

## Data Model

Nodes currently emitted:

- `GDELT_Record` (raw source observation)
- `Theme`
- `Location`
- `Observation` (derived, deterministic ID)

Relationships currently emitted:

- `GDELT_Record` -[:MENTIONS]-> `Theme | Location`
- `Observation` -[:EVIDENCED_BY]-> `GDELT_Record`
- `Observation` -[:TARGETS]-> `Theme | Location`

## Usage

From repository root:

```bash
python -m connectors.gdelt_gkg.connector
```

Parse an explicit file path:

```bash
python -m connectors.gdelt_gkg.connector --input /path/to/20250101000000.gkg.csv.zip
```

## Raw Index + MD5 Helpers

`connectors/gdelt_gkg/fetch_raw_index.py` provides utility functions to parse GKG index/md5 content and generate stable evidence references:

- `parse_index_lines(lines)`
- `parse_md5_lines(lines)`
- `merge_index_with_md5(index_files, checksums)`

Each merged file entry includes `evidence_ref`, a deterministic hash based on filename, size, and checksum.

## Validation Commands

```bash
python -m pytest connectors/__tests__/test_gdelt_gkg_connector.py
```

## Controlled Next Actions

- Expand to full GKG v2.1 field coverage from the public codebook.
- Add checksum verification against downloaded artifacts before parsing.
- Add evidence bundle output (`report.json`, `metrics.json`, `stamp.json`) for replay proofs.
