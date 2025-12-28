# Experimentation Safety Memo

**Date:** 2025-12-27
**Owner:** Experimental Lane Owner (Frontend)

## Active Experiments

- **Preview Lane Access** (`exp.preview_lane`)
- **Signal Focus Lens** (`exp.signal_focus_lens`)
- **Pattern Pulse** (`exp.pattern_pulse`)

## Why These Experiments Are Safe

1. **Isolation by Lane**
   - All experiments live under `/experimental/preview` and are gated by `exp.preview_lane`.
   - No GA navigation exposes the preview lane.

2. **Explicit Flagging**
   - Each experiment has its own feature flag with default OFF state.
   - Flags are evaluated server-side and audited via the feature flag service.

3. **Read-Only Semantics**
   - Experimental panels use synthetic, client-side data only.
   - No write paths, mutations, or KPI claims are introduced.

4. **Clear UX Labeling**
   - Preview Lane and Experimental badges are displayed on every panel.
   - A guardrails section reiterates that outputs are non-authoritative.

## Prevention of GA Trust Impact

- **Access Control:** Route access requires both flag enablement and an allowed role.
- **No GA Surface Changes:** Existing GA dashboards and navigation remain untouched.
- **Instant Reversibility:** Disabling any flag removes the experiment without migrations.
- **Observability:** Activation, performance, and confusion signals are logged as `[experiment]` events.

## Review & Exit Criteria

- Review checkpoint: **2026-01-10**
- Experiments will graduate only after governance approval, claim audit, and SLO review.
- Any misleading UI or claim ambiguity triggers immediate removal.
