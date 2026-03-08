# RFC 0001: Graph Intelligence Roadmap

**Status:** Proposed

## Background

Enterprise buyers are increasingly asking for GraphRAG bundling (driven by AWS Neptune and Bedrock), ISO-GQL standards support (to reduce lock-in), and zero-ETL integrations. As a result, Summit must evolve its Graph Intelligence posture to align with these expectations while maintaining its unique focus on provability and governance.

## Proposal

Summit will adopt an "audit-grade determinism" approach for all graph intelligence workflows. Audit-grade determinism means that every data mutation, policy change, and inference step is backed by cryptographic proofs, versioned artifacts, and reproducible environments, ensuring that graph query results and entity merges can be completely audited and trusted.

We don't accept vendor benchmarks because they optimize for conditions that don't match our buyers' workloads. Instead, we ship our own reproducible benchmark proof pack, consisting of our schema, our exact query shapes, and deterministically generated runtime provenance. This provides transparent, indisputable evidence of performance and correctness.

## Strategy

1. **Graph Standards Gate:** Adopt a GQL compatibility posture.
2. **Bench Evidence Pack:** Introduce a reproducible benchmark harness.
3. **Tiered Graph Architecture:** Support zero-ETL graph views over lakehouses for exploration, and a curated evidence graph for decisions and audits.
4. **Governed Entity Resolution:** Make entity resolution policies versioned artifacts that produce reversible merges.
