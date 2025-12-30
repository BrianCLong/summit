# Lifecycle Model

**States:** NEW → ACTIVE → RETIRED (with optional SUPPRESSED/RESURFACING extensions).

**Inputs:** Evidence items with trust score, freshness, class (exploit, sighting, remediation), and conflict flags.

**Logic:**

- Aggregate confidence = Σ (trust_weight _ freshness_decay _ evidence_signal).
- Conflict score from mutually exclusive claims reduces effective confidence.
- State thresholds and hysteresis prevent oscillation; stability derived from confidence variance over time.
