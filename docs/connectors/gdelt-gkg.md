# GDELT GKG Connector (Draft)

## Readiness Assertion

This connector aligns with the Summit Readiness Assertion and keeps external narrative signals in a governed evidence-first lane. See `docs/SUMMIT_READINESS_ASSERTION.md` for the system-level readiness posture.

## Summary

The GDELT Global Knowledge Graph (GKG) connector provides a governed entry point for ingesting
15-minute narrative signals as external observations. The current implementation is a draft
skeleton with a minimal TSV parser and entity mapping for sample GKG v2.1 records.

## Data Model (Current Skeleton)

- `GDELT_Record` (raw observation)
- `Theme`
- `Location`

Relationships:

- `GDELT_Record` -[:MENTIONS]-> `Theme`
- `GDELT_Record` -[:MENTIONS]-> `Location`

## Usage

```bash
cd connectors/gdelt_gkg
python connector.py
```

The connector reads `sample_gkg_v21.tsv` by default. Provide a file path to parse a specific TSV
extract:

```bash
python -c "from connector import GDELTGKGConnector; print(GDELTGKGConnector('manifest.yaml', '/path/to/file.tsv').run()['stats'])"
```

## Implementation Notes

- Parsing currently expects at least 10 tab-separated columns and captures the remainder in the
  `raw_fields` payload for future schema expansion.
- Themes and locations are parsed into lists using `;` delimiters and mapped to `Theme` and
  `Location` entities.

## Next Actions

- Expand the field map to full GKG v2.1 coverage using the official codebook.
- Add checksum verification and deterministic replay support.
- Extend mapping to `Observation` and `Claim` nodes once policy scaffolding is in place.
