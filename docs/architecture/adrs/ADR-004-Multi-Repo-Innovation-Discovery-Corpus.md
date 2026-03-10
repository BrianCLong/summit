# ADR 004: Multi-Repo Innovation Discovery Corpus

**Date**: 2024-03-08
**Status**: Proposed
**Context**: Global Innovation Discovery (GID) seeks to cluster recurring patterns and abandoned capabilities across multiple repositories. To test this, we need a representative but tractable multi-repo dataset.

**Decision**: We will define an initial ingestion corpus of 100 open-source repositories scoped to specific domains (e.g., AI Frameworks, DevOps Infrastructure, Agent Runtimes). This corpus will be defined statically for Phase 1 of GID to validate cross-repo clustering algorithms before attempting to scan GitHub at scale.

**Consequences**:
* **Positive**: Constrains the problem space, allowing rapid iteration on clustering and similarity scoring algorithms without facing massive ingestion bottlenecks.
* **Negative**: The small sample size may miss macro-level paradigm shifts that only become visible at the scale of 10,000+ repositories.
