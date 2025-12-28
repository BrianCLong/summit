# Experimental Registry

**Owner:** Experimental Lane Owner (Frontend)
**Last Updated:** 2025-12-27

## Active Experiments

| Experiment          | Flag(s)                 | Status                  | Owner                   | Review Date |
| ------------------- | ----------------------- | ----------------------- | ----------------------- | ----------- |
| Preview Lane Access | `exp.preview_lane`      | Active (off by default) | Experimental Lane Owner | 2026-01-10  |
| Signal Focus Lens   | `exp.signal_focus_lens` | Active (off by default) | Experimental Lane Owner | 2026-01-10  |
| Pattern Pulse       | `exp.pattern_pulse`     | Active (off by default) | Experimental Lane Owner | 2026-01-10  |

---

## Preview Lane Access

**Hypothesis:** A gated preview lane provides safe, isolated access to experiments without exposing GA users.

**Success Criteria:**

- Only explicitly enabled users can reach `/experimental/preview`.
- GA navigation and dashboards remain unchanged.

**Failure Criteria:**

- Any GA user can access preview content without flag + role.
- Preview content appears in GA navigation or default routes.

**Graduation / Removal Conditions:**

- **Graduate:** Governance approval to formalize preview lane access controls.
- **Remove:** If access gating is bypassed or trust is impacted.

**Flag Governance:**

- **Flag Name:** `exp.preview_lane`
- **Scope:** Frontend route gating for Experimental / Preview lane
- **Default State:** OFF
- **Who May Enable:** Platform admins via audited feature flag service
- **Audit / Logging:** Server-side flag evaluation logs; client logs `[experiment]` activation events
- **Expiration / Review:** 2026-01-10

---

## Signal Focus Lens

**Hypothesis:** Analysts benefit from an alternative, read-only clustering lens for quick signal scanning.

**Success Criteria:**

- ≥60% of enabled users interact with filters during a session.
- No increase in GA error rates or UI ambiguity signals.

**Failure Criteria:**

- Users report confusing overlays or misinterpret GA truth.
- Performance impact exceeds 50ms per filter operation.

**Graduation / Removal Conditions:**

- **Graduate:** Approved as GA-adjacent read-only overlay with governance sign-off.
- **Remove:** If confusion signals exceed engagement signals or performance regresses.

**Flag Governance:**

- **Flag Name:** `exp.signal_focus_lens`
- **Scope:** Experimental preview component toggle
- **Default State:** OFF
- **Who May Enable:** Platform admins via audited feature flag service
- **Audit / Logging:** Server-side flag evaluation logs; client logs activation + performance
- **Expiration / Review:** 2026-01-10

---

## Pattern Pulse

**Hypothesis:** A temporal pulse view helps identify timing clusters without altering GA metrics.

**Success Criteria:**

- ≥50% of enabled users view the pulse panel.
- No GA KPI reinterpretation or claim ambiguity.

**Failure Criteria:**

- Any mention of GA KPI confusion or misleading visual similarity.
- Measured UI confusion feedback exceeds 10% of preview sessions.

**Graduation / Removal Conditions:**

- **Graduate:** GA-adjacent overlay after claim audit + SLO review.
- **Remove:** If confusion exceeds threshold or governance declines.

**Flag Governance:**

- **Flag Name:** `exp.pattern_pulse`
- **Scope:** Experimental preview component toggle
- **Default State:** OFF
- **Who May Enable:** Platform admins via audited feature flag service
- **Audit / Logging:** Server-side flag evaluation logs; client logs activation + confusion events
- **Expiration / Review:** 2026-01-10
