# GMR Guardrail Architecture

## Summit Readiness Assertion Alignment

This guardrail operates under the certified readiness posture and treats any deviation as a governed exception, not a defect. See `docs/SUMMIT_READINESS_ASSERTION.md` for the controlling declaration.

## Scope

**Objective:** Detect CDC→Graph materialization drift with a deterministic, windowed ratio:

```
GMR = (graph_nodes_created + graph_edges_created) / cdc_rows_total
```

The gate is GA-grade by design: it derives from counters only, enforces tenant isolation, and emits deterministic evidence artifacts.

## Windowing Strategy

- **Window boundary:** Hourly windows aligned to database time (`date_trunc('hour', now())`).
- **Window key:** `(ts_window_start, ts_window_end, tenant_id, source)`.
- **Join semantics:** Full outer join between `facts_cdc` and `facts_graph` to surface missing metrics.

## Hashing Strategy

- **`pipeline_hash` definition:** Hash of mapping rules + loader config + code SHA, normalized for deterministic comparison.
- **Drift interpretation:** When GMR shifts and `pipeline_hash` is unchanged (including prior window hash), prioritize upstream/schema drift investigation.

## Dependency Graph

```
CDC Sink ─┐
          ├── metrics.facts_cdc ─┐
Graph Loader ─┘                  ├── metrics.gmr_rollup ── metrics.gmr_baseline ── gate query
                                 └── evidence artifacts (metrics.json/report.json/stamp.json)
```

## Failure Modes (Deterministic)

1. **Missing CDC metrics** → `missing_metrics` failure.
2. **Missing graph metrics** → `missing_metrics` failure.
3. **Zero GMR with non-zero CDC** → `zero_gmr` failure.
4. **MAD drift beyond 3× band** → `mad_drift` failure.
5. **MAD drift with unchanged hash** → `hash_stable_drift` failure.

## MAESTRO Threat Modeling Alignment

- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Observability, Security.
- **Threats Considered:** Metric spoofing, cross-tenant inference, alert fatigue, silent ingestion stalls.
- **Mitigations:** RLS/tenant isolation, low-cardinality labels, deterministic gating evidence, explicit drift reasons.

## Evidence Artifacts

For each gated window, the gate emits:

- `metrics/evidence/<EVIDENCE_ID>/metrics.json`
- `metrics/evidence/<EVIDENCE_ID>/report.json`
- `metrics/evidence/<EVIDENCE_ID>/stamp.json`

Evidence IDs are deterministic: `gmr/<window_start_utc>/<pipeline_hash8>`.
