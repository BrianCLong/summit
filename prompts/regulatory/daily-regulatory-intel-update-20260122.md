# Prompt: Daily Regulatory Intelligence Update (Automation Turn 4)

## Objective
Capture the Automation Turn 4 daily regulatory intelligence update for AI governance, data
sovereignty, and privacy enforcement. The update must be recorded as a durable RAOS artifact and
aligned to Summit authority files.

## Required Actions
1. Add a new report file at `docs/raos/regulatory-intel/2026-01-22-automation-turn-4.md` with the
   provided update content.
2. Update `docs/roadmap/STATUS.json` with a new `last_updated` timestamp and a revision note that
   references this regulatory intelligence update.
3. Create a task specification under `agents/examples/` that references this prompt hash and
   declares the approved scope and verification tier.

## Constraints
- Keep the report aligned to Summit Readiness and governance authority files.
- Do not introduce new regulatory language or compliance logic outside policy-as-code.
- Limit changes to the declared scope paths in the prompt registry entry.

## Verification
- Run `scripts/check-boundaries.cjs`.
