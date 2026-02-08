# Runbook: Narrative IO Inference & Convergence

## Execution
Run analysis on a daily snapshot:
```bash
pnpm run narrative:analyze -- --in tests/narrative/fixtures/day0.json --out /tmp/out
```

## Interpretation
- **Convergence Direction:** Vector alignment of implied narratives. High cosine similarity indicates convergence.
- **Consensus:** Agreement on explicit claims. Distinct from convergence (agreement on implicit assumptions).
- **Redundancy:** Structural similarity without lexical overlap. High redundancy + low lexical overlap = coordinated messaging.

## Tuning
- Adjust `similarity_threshold` in `src/narrative/redundancy/similarity.ts` if false positives occur.
- Adjust `inference_confidence` threshold if defaults are too noisy.

## Determinism
- Ensure `seeded` random number generator is used.
- Sort all outputs by stable keys (e.g., ID) before hashing.
