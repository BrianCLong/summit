# Cross-Platform Graph Model (Summit)

This document defines the canonical node/edge types and conventions used for
cross-platform influence analytics in Summit.

## Node types

| Type    | Description                                    | Platform scoped |
| ------- | ---------------------------------------------- | --------------- |
| actor   | Account/page/channel identity                  | Yes             |
| content | Post/message                                   | Yes             |
| url     | Canonicalized URL referenced by content        | No              |
| media   | Media asset fingerprint (pHash/hash)           | No              |
| topic   | Optional clustered narrative or campaign label | No              |

## Edge types (timestamped)

| Type       | Description                                              |
| ---------- | -------------------------------------------------------- |
| engages    | Actor interacts with content (reply/share/react/comment) |
| mentions   | Actor mentions another actor                             |
| amplifies  | Actor amplifies a URL/media                              |
| co_shares  | Actor co-shares URL/media (projected similarity edge)    |
| crossposts | Content fingerprint shared across platforms              |

## Timestamping rules

- Event timestamps are required at ingestion time.
- Downstream aggregates must be deterministic and should not emit timestamps
  outside evidence `stamp.json` artifacts.

## MAESTRO alignment

**MAESTRO Layers:** Data, Agents, Tools, Observability.

**Threats Considered:** Data poisoning, prompt/tool abuse through malformed inputs,
and integrity drift from nondeterministic aggregation.

**Mitigations:** Deterministic aggregation, explicit thresholds in similarity
builders, and bounded fixtures/tests to detect regressions.

## Toy fixtures

- `summit/graph/fixtures/toy_events.jsonl` provides a deterministic co-share
  dataset for unit tests and local experimentation.
