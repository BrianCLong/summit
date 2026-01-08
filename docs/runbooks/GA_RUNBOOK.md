# GA Operational Runbook

## P1 Incident Response

- **Declare:** Within 15 minutes of detection.
- **Action:**
  1.  Freeze pipeline.
  2.  Notify affected tenants.
  3.  Rotate keys if data risk.
- **RCA:** Must be completed within 72 hours.

## Drift Response

- **Trigger:** Entropy Spike ≥ threshold.
- **Action:**
  1.  Enable `ephemeral_frame_detector`.
  2.  Run A/B test.
  3.  Ship prompt patch within 24 hours.

## DSR Flow (Data Subject Request)

1.  Export hashed event IDs.
2.  Identify matching audit records.
3.  Purge raw data within SLA.

## Rollback Procedure

1.  Flip feature flag (e.g., `detector_v3: false`).
2.  Replay last 24h with prior stable model.
3.  Verify parity.
4.  Reopen traffic.
