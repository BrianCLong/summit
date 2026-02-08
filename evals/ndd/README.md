# NDD Evaluation Suite

## Fixtures
1. Seed density (`fixture_seed_density`)
   - Expect higher `OriginDensityScore` for seeded scenario vs organic baseline.
2. Robustness under correction (`fixture_robustness`)
   - Expect lower `ChallengeResistanceScore` when post-challenge volume collapses.
3. Handoff detection (`fixture_handoff`)
   - Expect `HandoffLikelihoodScore >= 0.7` and HLT improvement vs virality baseline.
4. Comparative framing (`fixture_comparative`)
   - Expect `ComparativeFrameConsistencyScore >= 0.8` on coordinated comparisons.
5. Co-evolution (`fixture_coevolution`)
   - Expect `RoleTransitionEntropy` within expected band for staged role shifts.
6. Minimalism shift (`fixture_minimalism`)
   - Expect `MinimalismShiftScore >= 0.6` after saturation threshold.

## Expected Outputs
- Metric ranges per fixture with pass/fail thresholds.
- HLT benchmark emitted for handoff fixture.

## HLT Benchmark
- **Definition**: median time between first handoff alert and first mainstream amplification.
- **Baseline**: virality-only alert lead time (no handoff features).

## Determinism
- Two consecutive runs must produce identical metrics.json and stamp.json.
