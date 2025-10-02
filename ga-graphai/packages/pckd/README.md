# PCKD

Policy-Constrained Knowledge Distillation (PCKD) provides utilities for running
teacher-to-student distillation workflows that proactively exclude tainted data.
The package focuses on three reproducible outputs:

1. **Taint screen reports** describing excluded exemplars and why they were
   removed.
2. **Teacher logits caches** accompanied by proofs of exclusion for the removed
   exemplars.
3. **Attested training manifests** documenting student training runs so that
   compliance tools can deterministically verify policy adherence.

The module also includes baselines for standard knowledge distillation and a
stub Direct Preference Optimization (DPO) routine to support evaluation
comparisons, plus a compliance verifier that validates manifests.
