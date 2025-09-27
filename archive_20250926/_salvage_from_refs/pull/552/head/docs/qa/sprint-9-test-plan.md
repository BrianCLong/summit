# Sprint 9 Test Plan

## Unit Tests
- DeepfakeDetector checksum verification and score banding.
- MediaPrecheckService quarantine flag logic.
- EntityResolutionService merge and revert provenance entries.

## Integration Tests
- Upload path routes through detector and quarantine queue.
- Reviewer mutation creates audit log and emits Splunk event.
- ER suggestions exposed via GraphQL and reversible merge.

## End-to-End Tests
- Playwright flow: upload → quarantine → approve → graph write.
- ER merge then revert via UI with provenance confirmation.

## Manual QA
- Validate DLP masking toggles via environment variable.
- Verify dashboards render queue depth and merge counts.

## Exit Criteria
- All automated tests pass in CI.
- No severity-1 defects outstanding.
