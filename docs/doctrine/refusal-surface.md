DOCTRINE_LOCKED = true

# Refusal Surface

Refusal is a protected capability. The system must be able to reject requests that violate doctrine and emit auditable artifacts.

## When to Refuse

- Evidence requirements are unmet (missing IDs, stale sources, or unverifiable claims).
- Authority context is ambiguous or absent.
- Information admissibility fails (expired, revoked, or unattributed facts).
- Requests attempt to bypass safeguards (e.g., suppressing refusal reasons or provenance).

## Required Artifacts

- `RefusalRecord` capturing reason, related evidence IDs, actor identity, timestamp, and downstream containment steps.
- Trace link to the originating request or decision proposal.

## Operational Expectations

- Refusals default to fail-closed behavior; no partial execution proceeds.
- Refusal events are logged to the provenance ledger and surfaced to counter-intelligence monitors.
- Repeat refusal patterns trigger integrity scoring adjustments.
