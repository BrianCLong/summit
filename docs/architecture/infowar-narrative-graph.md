# Info Warfare Narrative Graph Architecture

This document defines the ontology and secure query patterns for narrative graph analysis within the Summit platform.

## Ontology

- **Nodes:** Narrative, Claim, Actor, Platform, Event, Artifact, Regulation
- **Edges:** AMPLIFIES, REFERENCES, TARGETS, COUPLED_WITH, EVIDENCED_BY

## Secure Query Patterns

All queries MUST include `tenantId` or `organizationId` filters to ensure strict multi-tenant isolation.
Queries that touch raw narrative data must be audited via the `INFOWAR_QUERY_EXECUTED` event.
