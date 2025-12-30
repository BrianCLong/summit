# Minimal Support Proofs

**Goal:** Identify smallest evidence set that justifies lifecycle state transition under proof budget.

**Process**

1. Group evidence by class and compute marginal contribution to aggregate confidence.
2. Solve for minimal set satisfying state threshold while respecting max items/bytes/verification time.
3. Record provenance and hashes for included items; attach policy decision token controlling evidence visibility.
