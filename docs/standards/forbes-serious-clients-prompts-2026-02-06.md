# Forbes Serious Clients Prompts (2026-02-06) — Summit Standard

## Intent
Deliver a clean-room, Summit-original prompt pack and evaluator that reinforces professional,
transformation-first positioning while removing availability signals that read as novice.

## Source Constraints
The upstream Forbes article is paywalled; this standard is derived from public metadata and
Summit-original design. No proprietary prompt text is reproduced.

## Summit Readiness Assertion
This standard aligns with the Summit Readiness Assertion and the Law of Consistency by
requiring deterministic artifacts, governance alignment, and explicit rollback paths.

## Inputs
- `profile`: short profile summary
- `offer`: concise offer or service summary
- `draft_message`: initial client-facing message

## Outputs
- `artifacts/serious_client_tone/report.json`
- `artifacts/serious_client_tone/metrics.json`
- `artifacts/serious_client_tone/profile.json`

## Evaluation Rules (Summit Original)
1. **Availability Signal Detection**
   - Flag phrases that signal constant availability or low leverage.
2. **Transformation-First Positioning**
   - Require transformation language (e.g., "go from X to Y").
3. **Redaction**
   - Never log raw emails, phone numbers, addresses, or pricing in artifacts.

## Determinism Requirements
- JSON outputs are sorted and stable.
- No timestamps in artifacts.
- Estimated duration is computed deterministically from input length.

## Non-Goals
- Reproducing or claiming the Forbes prompt text.
- Generating full marketing campaigns or ROI claims.

## Rollback
Disable the `SERIOUS_CLIENT_TONE_PACK` flag and remove CI gating steps for this pack.
