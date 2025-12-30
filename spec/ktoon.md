# KTOON (Keyed Token-Oriented Object Notation)

KTOON is a TOON v3–compatible superset that optimizes serialization for agent workloads, streaming, and governance-heavy pipelines. It retains the TOON text format and lossless JSON round-trip guarantees while layering tokenizer-aware compactness, deterministic canonicalization, and patch/reference semantics for long-running agent sessions.

## Goals

- Preserve strict TOON compatibility: any KTOON document can be emitted as strict TOON (`text/toon`, UTF-8, LF) with extensions stripped.
- Reduce token usage for LLM prompts and MCP payloads through dictionaries, normalization, and reference reuse.
- Support streaming and incremental updates via deterministic patch blocks and chunk framing.
- Provide schema, validation, and governance hooks for reliable decoding and compliance evidence.
- Enable agent-friendly diffs and caching through canonical ordering and stable hashes.

## Document Structure

A KTOON document is partitioned into optional blocks followed by the body:

- `@ktoon <version>` — declares KTOON semantics (defaults to `1`).
- `@keys` — key dictionary mapping long field paths to compact symbols.
- `@vals` — value/enum dictionary (optionally namespaced per field).
- `@schema` — typed hints (required/optional, enums, formats, primary keys).
- `@guards` — governance constraints (redaction, provenance tags, attestation hash).
- `@refs` — reusable referenced blocks keyed by stable IDs.
- `@deltas` — deterministic patches against referenced blocks or inlined tables.
- Body — TOON table/object/array content (optionally optimized per subtree).

Strict TOON emitters simply ignore the `@*` blocks and expand dictionaries when rendering.

## Dictionaries

### Key Dictionary

- Maps fully qualified paths (e.g., `artist.billingAddress.country`) to short codes chosen to be single-token for a target tokenizer.
- Codes are reused across tables and nested objects, enabling compact headers.
- Keys are stable and canonicalized alphabetically before encoding to keep hashes deterministic.

### Value/Enum Dictionary

- Maps repeated scalar values (statuses, countries, currency codes) to short codes.
- Namespaced either globally or per field for clarity (e.g., `status: { c: confirmed, x: cancelled }`).
- Encoders track frequency and only introduce dictionary entries when cost savings are positive given the tokenizer profile.

## Adaptive Structure Optimizer

For each subtree the encoder selects one of three shapes:

1. TOON object — best for heterogeneous or shallow structures.
2. TOON table — when arrays are uniform and shallow.
3. Split tables — normalizes repeated nested objects into separate tables with stable IDs and reference columns, preventing duplication across rows and turns.

The optimizer evaluates column reuse, tokenizer costs (per model), and duplication to select the representation with the lowest token budget while maintaining determinism.

## Delta & Merge Semantics

Patch blocks operate on tables or objects with deterministic rules:

- `+` append rows or object keys.
- `~` update rows by primary key (defined in `@schema`).
- `-` delete rows/keys by primary key or path.
- Patches are composable and order-stable; conflicting updates fail fast in strict mode.

## References & Streaming

- Any block (table/object) may be emitted once with `@id <hash>`. Subsequent turns can reference it via `@ref <hash>` plus optional `@deltas`.
- Streaming frames include chunk metadata, checksums, and max-row sizing to keep MCP/tool payloads bounded.

## Validation & Governance

- `@schema` uses compact, TOON-aligned syntax for field types, required flags, enum sets, and primary keys.
- `@guards` includes redaction rules (allow/deny lists), provenance tags, and optional signatures/attestation hashes.
- Strict-mode decoders surface actionable errors (missing required fields, enum violations, checksum mismatch) instead of silent coercion.

## Canonicalization

- Deterministic ordering of dictionary entries, table columns, and object keys.
- Canonical number formatting, explicit `null`, and stable whitespace for text renderings.
- Stable hashing inputs are defined for reference IDs and attestation blocks.

## Transport & Media Types

- `text/ktoon` — full-featured KTOON documents with optional extensions.
- `text/toon` — strict TOON output with extensions stripped and dictionaries expanded.
- Frame metadata: `chunk`, `total`, `checksum`, `schema-version`, `mode` (`strict-toon|ktoon|ktoon+delta`).

## Library Plan

- `packages/ktoon` (TypeScript): core parser/encoder, optimizer, dictionaries, patch/reference application, and renderers for `text/toon` and `text/ktoon`.
- `packages/ktoon-php`: parity encoder/decoder for Laravel/MCP middleware (future work).
- Bench harness: tokenizer-aware measurements (tiktoken-compatible), regression fixtures, and strict-mode error tests.

## Usage Modes

- `strict-toon` — emit plain TOON for consumers unaware of KTOON.
- `ktoon` — use dictionaries and adaptive tables.
- `ktoon+delta` — emit references and patches for incremental updates.

## Example (compact)

```
@ktoon 1
@keys { a:id b:status c:artist.id d:artist.name }
@vals status { c:confirmed x:cancelled }
bookings[2]{a,b,c,d}:
  1,c,PGreBnRL,René Bourgeois
  2,x,ABCD1234,Some Artist
```

Strict TOON output would expand `a→id`, `b→status`, etc., and drop the dictionary blocks while preserving the rows and headers.
