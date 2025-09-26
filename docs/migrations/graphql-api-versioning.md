# Summit GraphQL API Versioning Migration Guide

This document describes how to adopt the new versioned Summit GraphQL API that ships with `/graphql/v1` and `/graphql/v2` endpoints.

## Overview

- **Versioned endpoints:** Both versions are exposed simultaneously. `/graphql` points to the default version (`v1` unless overridden via the `GRAPHQL_DEFAULT_VERSION` environment variable).
- **Enabled versions:** Configure the comma-separated list via `GRAPHQL_ENABLED_VERSIONS` (default: `v1,v2`). The server only instantiates resolvers for the listed versions.
- **Helm support:** The Helm chart now templatizes the version list and default version so clusters can roll out the upgrade gradually.

## Breaking Change in v2

The v2 schema replaces the legacy `mlOutputs` query with a redesigned `mlInferences` query that returns structured confidence metrics.

| Aspect | v1 (`/graphql/v1`) | v2 (`/graphql/v2`)
| ------ | ------------------ | ------------------ |
| Query name | `mlOutputs` (deprecated) | `mlInferences`
| Type name | `LegacyMLOutput` | `MLOutput`
| Confidence field | `score: Float! @deprecated` | `metrics.confidence: Float!`
| Additional data | `explanation: String` | `metrics.uncertainty`, `metrics.sampleSize`, `explanations: [String!]!`

The breaking removal of `mlOutputs` in v2 means existing clients **must** adopt the new query before switching to the `/graphql/v2` endpoint.

## Deprecations

- `mlOutputs` query is marked with `@deprecated` in v1, guiding clients to the v2 replacement.
- `LegacyMLOutput.score` carries a deprecation notice to highlight the move to structured metrics in v2.

## Migration Steps for Clients

1. **Discover supported versions:** call the REST health endpoint or inspect service documentation to confirm whether `/graphql/v2` is available. (Clusters can deploy both versions concurrently.)
2. **Update GraphQL documents:**
   - Replace `mlOutputs` queries with `mlInferences`.
   - Update selections to use the nested `metrics` object and `explanations` array.
3. **Switch endpoint:**
   - During rollout, target `/graphql/v1` while verifying the new query using the alias path (`/graphql`).
   - Once the client only relies on v2 fields, change the GraphQL URL to `/graphql/v2`.
4. **Coordinate deployment:** ensure server instances have `GRAPHQL_ENABLED_VERSIONS` including `v2` before clients switch. Optionally set `GRAPHQL_DEFAULT_VERSION=v2` to move the `/graphql` alias.

## Example Queries

<details>
<summary>v1 Legacy Query (deprecated)</summary>

```graphql
query LegacyMlOutputs {
  mlOutputs {
    id
    label
    score # Deprecated – migrate to mlInferences
    explanation
  }
}
```

</details>

<details>
<summary>v2 Modern Query</summary>

```graphql
query MlInferences {
  mlInferences {
    id
    label
    metrics {
      confidence
      uncertainty
      sampleSize
    }
    explanations
  }
}
```

</details>

## Operational Notes

- **Testing:** the Helm chart test hook now validates `/graphql`, `/graphql/v1`, and `/graphql/v2`.
- **Rollbacks:** retain `v1` in `GRAPHQL_ENABLED_VERSIONS` until all clients migrate. You can drop it later to disable the legacy schema entirely.

For questions or feedback, contact the Summit backend team.
