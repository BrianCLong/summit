# Replay Tokens

Replay tokens bind artifacts to specific execution contexts to support deterministic verification
and caching. Tokens are immutable, content-addressable summaries of the runtime envelope.

## Fields

- **Snapshot identifier:** data snapshot or crawl identifier.
- **Schema/index versions:** guarantees structural compatibility.
- **Policy or module versions:** captures policy, transform, or module version sets used during
  execution.
- **Seed values:** deterministic seeds for sampling or constraint solving.
- **Time window:** bounded validity period for temporal analyses.
- **Salt references:** identifiers for any salts required to validate commitments.

## Token Encoding

- Represented as a canonical JSON object with sorted keys.
- Serialized to a base64url digest for transport in APIs.
- Includes a `token_version` field to allow safe evolution.

## Practices

- Include replay tokens in certificates, attribution artifacts, governance reports, manifests,
  and inversion artifacts.
- Use replay tokens as cache keys and to gate execution reuse.
- Reject mismatched token versions or missing field groups at verification time.
