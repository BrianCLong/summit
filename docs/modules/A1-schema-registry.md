# A1: Canonical Schema & Policy Labels

Track: A (Core Graph)
Branch: feature/schema-registry
Labels: track:A, area:schema

Overview

- Define GraphQL types and canonical nodes/edges: Person, Org, Asset, Location, Event, Document, Claim, Case, Authority, License.
- Apply policy labels: sensitivity, legal_basis, need_to_know, retention, license.

Acceptance Criteria

- Schema registry committed with versioning; GraphQL schema generated.
- Neo4j indexes/constraints migrations present and pass.
- Unknown types render safely; schema tests and migrations pass in CI.
