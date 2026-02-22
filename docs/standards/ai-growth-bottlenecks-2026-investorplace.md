# AI Growth Bottlenecks (InvestorPlace 2026-02-01)

## Scope

Summit ingests a captured, deterministic text fixture from a public source and extracts a six-layer
bottleneck taxonomy plus source-attributed assertions. This standard defines the import/export
contract for deterministic evidence artifacts.

## Import Matrix

| Field | Required | Notes |
| --- | --- | --- |
| `source.url` | ✅ | Canonical source URL (no query tokens in logs). |
| `source.title` | ✅ | Article title as captured in fixture. |
| `source.published_at` | Optional | String (ISO-8601 when known). |
| `source.text` | ✅ | Plain text fixture input for deterministic mode. |
| `source.excerpts[]` | Optional | Short snippet pointers for traceability. |

## Export Matrix

| Artifact | Required | Notes |
| --- | --- | --- |
| `bottlenecks.report.json` | ✅ | Taxonomy, assertions, hashes, and evidence ID. |
| `metrics.json` | Optional | Coverage counts + confidence markers (feature-flagged). |
| `stamp.json` | ✅ | Stable hashes + schema version (no timestamps). |

## Evidence ID Format

`evidence_id` must follow the governance pattern: `^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*$`. Use a
prefix like `EVID-BOTTLENECKS` for clarity.

## Taxonomy (Six Layers)

The extractor MUST normalize exactly six layers:

1. `raw_materials`
2. `power`
3. `infra_thermal`
4. `compute_packaging`
5. `memory_hbm`
6. `networking_optics`

## Assertion Handling

All assertions remain **source-attributed**. Summit does not validate or restate macro claims as
facts unless corroborated by additional sources.

## Determinism Guarantees

* Inputs MUST be plain text in deterministic mode.
* Outputs MUST be byte-stable across runs; forbid timestamps and random UUIDs.
* Hashes MUST be computed from stable field ordering.

## Non-Goals

* No market predictions or investment guidance.
* No truth verification of macro claims beyond attribution.
* No web scraping in CI (fixtures only).
