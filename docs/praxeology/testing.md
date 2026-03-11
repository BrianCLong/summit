# Praxeology Quarantine Testing

This directory contains test suites designed to validate the invariants of the Praxeology trust lanes and write quarantining system.

## Core Invariants Validated

1. **No unvalidated writes to PG prod**
   - Untrusted sources must be quarantined.
   - Writes that bypass validation checks must fail.

2. **Trust lanes are mandatory**
   - All writesets must flow through designated trust lanes.
   - Lanes must score and deduplicate concurrent writesets.

3. **Deduplication Integrity**
   - No duplicates should leak through lanes.
   - Highest-trust-score writes should take precedence during conflict resolution.

## Test Suites

*   `test_praxeology_quarantine_enforcement.py`: Mocks untrusted writes and asserts proper quarantine/rejection.
*   `test_praxeology_trust_lane_scoring.ts`: Validates deduplication logic and trust scoring assignments within writesets.
*   `test_praxeology_dedupe_integrity.py`: Verifies that no duplicate writes bypass the trust lanes.
