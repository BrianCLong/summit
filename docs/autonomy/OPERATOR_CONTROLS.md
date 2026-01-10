# Operator Controls & UX Expectations

Operators must be able to understand, set, and override autonomy tiers instantly. Controls must be explicit, auditable, and fail closed when in doubt.

## Core Controls

- **Set tier per loop**: Operators can set a loop’s requested tier (default Tier 0).
- **Instant downgrade**: One-click or single command to force Tier 0.
- **Pause execution**: Temporarily suspend action execution without removing tier configuration.
- **Inspect rationale**: View policy decision, signals, confidence, and caps for the last action.

## Required UX Surfaces

1. **Tier Dashboard**
   - Current tier per loop and effective tier after policy evaluation.
   - Promotion/demotion history with timestamps and receipts.
2. **Action Feed**
   - Actions by tier, with outcome and drift indicators.
   - Rollback status and auto-demotion triggers.
3. **Explain Panel**
   - “Why did this run at this tier?” explanation derived from receipts.
   - Decision log references for compliance/ethics review.

## CLI/Automation Controls

- `tier get <loop_id>`: show requested/effective tier and last decision.
- `tier set <loop_id> --tier tier1`: request a tier change (subject to policy).
- `tier downgrade <loop_id>`: force Tier 0 immediately.
- `tier pause <loop_id>` / `tier resume <loop_id>`: stop/start execution.

## Safety and Audit Guarantees

- Tier changes must produce receipts and decision logs.
- Any manual downgrade must take effect before the next evaluation.
- Operator actions are immutable audit events in the provenance ledger.
