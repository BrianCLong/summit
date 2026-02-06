# Runbook — Narrative IO Inference + Convergence

## Purpose

Operate daily narrative inference and convergence analysis with deterministic outputs, evidence discipline, and tuned thresholds.

## Inputs

- Daily corpus snapshot (JSON). Export from ingestion pipeline.
- Optional metadata: timestamps, actor IDs, platform hints.

## Execution

1. Run analysis on the daily snapshot:

   ```bash
   pnpm run narrative:analyze -- --in <snapshot.json> --out <output_dir>
   ```

2. Validate outputs are deterministic (byte-for-byte on re-run):

   ```bash
   pnpm run narrative:analyze -- --in <snapshot.json> --out <output_dir_replay>
   ```

3. Compare outputs with stable diff tooling.

## Output Interpretation

- **Convergence Direction**: directional implication movement (not consensus).
- **Convergence Speed**: time-normalized delta across snapshots.
- **Interpretive Variance**: low variance with high diversity indicates saturation without dominance.
- **Narrative IDs**: persistent identity across lexical mutation.

## Threshold Tuning (Safe Defaults)

- Adjust thresholds only with fixture-backed evidence.
- Maintain stable sorting and canonical output order.
- Log any threshold change as a governed exception with rollback steps.

## Adding a New Inference Template

1. Add template with required span anchors and rationale ID.
2. Add fixture tests with deterministic expected output.
3. Run determinism gate and span anchoring gate.

## Drift Signals (Monitor & Act)

- Sudden collapse/expansion in redundancy clusters.
- Defaults extractor output volume spikes.
- Convergence speed outliers.
- Narrative ID churn rate (too high = instability; too low = over-merging).

## Rollback Plan

- Revert the last template or threshold change.
- Re-run with previous snapshot to confirm restored determinism.

## Authority Alignment

- Governance authority: `docs/governance/CONSTITUTION.md`.
- Readiness posture: `docs/SUMMIT_READINESS_ASSERTION.md`.
