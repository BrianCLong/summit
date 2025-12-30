# Replay Tokens

Replay tokens bind artifacts to specific execution contexts to support deterministic verification and caching.

## Fields

- **Snapshot identifier:** data snapshot or crawl identifier.
- **Schema/index versions:** guarantees structural compatibility.
- **Policy or module versions:** captures policy, transform, or module version sets used during execution.
- **Seed values:** deterministic seeds for sampling or constraint solving.
- **Time window:** bounded validity period for temporal analyses.

## Practices

- Include replay tokens in certificates, attribution artifacts, governance reports, manifests, and inversion artifacts.
- Use replay tokens as cache keys and to gate execution reuse.
