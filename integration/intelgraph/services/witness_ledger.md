# Witness Ledger

## Responsibilities

- Store append-only witness chain entries.
- Provide session retrieval for audit and replay.
- Anchor session hashes in transparency log when configured.

## Inputs

- Session ID, commitment, policy decision ID, determinism token.

## Outputs

- Updated session anchor and witness chain entries.

## Operational Notes

- Enforce monotonic step ordering per session.
- Reject commits that break hash chain continuity.
