# Runbook: Narrative IO Inference & Convergence

## Running Analysis
Run the analysis CLI:
```bash
pnpm run narrative:analyze --in <snapshot.json> --out <output_dir>
```

## Drift Detection
Run the drift check:
```bash
npx tsx scripts/monitoring/narrative-io-inference-convergence-drift.ts
```

## Interpreting Convergence
*   **Converging:** Variance < 0.2. Narratives are aligning on implicit assumptions. High risk of coordinated IO.
*   **Diverging:** Variance > 0.5. Narratives are fragmented.
*   **Stable:** Variance 0.2 - 0.5. Normal baseline.

## Tuning
Adjust thresholds in `src/narrative/redundancy/cluster.ts` if cluster sizes are too large (reduce threshold) or too small (increase threshold).
