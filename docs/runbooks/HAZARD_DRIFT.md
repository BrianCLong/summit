# HAZARD Drift Runbook

**Trigger:**

- `NarrativeVelocityAnomaly` (related) or Manual Drift Detection.
- HAZARD score distribution shift > 10%.

**Impact:**

- False positives/negatives in disinformation detection.
- Trust erosion.

**Immediate Actions:**

1. **Freeze Model Version:**
   - Stop auto-promotion of new model candidates.
2. **Rollback:**
   - Revert to last known good model (N-1): `summitctl models rollback hazard-v2`
3. **Re-score Shadow Set:**
   - Run the "Golden Set" against the current model to verify metrics.
4. **Investigate Data:**
   - Check for data poisoning or schema changes in input stream.

**Escalation:**

- Page Data Science Lead.
