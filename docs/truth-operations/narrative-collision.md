# Narrative Collision Detection

**When stories harden too quickly, something is wrong.** Narrative attacks target belief through plausible explanations. Summit detects and manages collisions to keep explanatory diversity healthy.

## Objectives

- Surface competing explanations for the same entities, events, or indicators.
- Detect premature convergence that hints at coordinated manipulation.
- Preserve dissenting narratives until corroboration or refutation is established.

## Narrative Collision Graph

- **Nodes**: narrative clusters (claims + framing) scored by integrity and authority continuity.
- **Edges**: relationships indicating agreement, contradiction, suppression, or provenance overlap.
- **Attributes**: narrative convergence rate, dissent depth, temporal freshness, affected decisions.
- **Operations**: merge (with justification), split (to restore diversity), quarantine (when integrity collapses).

## Detection Signals

- **Convergence Velocity**: slope of agreement growth across independent sources.
- **Source Homogeneity**: ratio of unique origins vs repeated syndication.
- **Suppression Score**: drop-off in alternate narratives after a dominant frame emerges.
- **Semantic Compression**: reduction in entropy or variance of summaries over time.
- **Authority Drift**: new or low-authority sources steering the dominant narrative.

## Workflow

1. **Ingest** entity/event-linked statements from ingestion and analysis pipelines.
2. **Cluster** into narratives using embeddings + structured claims.
3. **Score** collision risk via convergence velocity, source homogeneity, and authority drift.
4. **Flag** narratives that exceed risk thresholds; annotate dependent decisions.
5. **Preserve** dissent by preventing automatic suppression; require human adjudication for merges.

## Safeguards

- **Anti-Amplification**: if convergence velocity is high but authority continuity is low, downrank propagation.
- **Diversity Minimums**: enforce a minimum number of independent sources before allowing closure.
- **Narrative Memory**: retain suppressed alternatives with provenance for reactivation if the dominant narrative is later invalidated.

## Outputs

- Collision alerts routed to containment workflows.
- Updated narrative metadata for integrity scoring and temporal relevance calculations.
- Audit-ready records linking narrative decisions to authority continuity status.
