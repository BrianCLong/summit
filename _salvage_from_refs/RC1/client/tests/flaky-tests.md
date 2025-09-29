# Flaky Test Quarantine

This document tracks tests that have been identified as flaky and measures taken to stabilize them.

## Quarantine Rules

- Tests marked as flaky should be run with increased retries
- If a test fails 3 times in a row, investigate root cause
- Once stabilized, remove from quarantine list
- Add timestamp when quarantined and when resolved

## Current Quarantined Tests

*No tests currently quarantined*

## Resolved Tests

*No tests resolved yet*

## Stabilization Techniques Applied

### Network Stability
- Added `page.waitForLoadState('networkidle')` for network-dependent tests
- Increased timeouts for slow database operations
- Added explicit waits for GraphQL operations

### Element Stability  
- Use `page.waitForSelector()` instead of immediate assertions
- Added retry logic for element interactions
- Wait for animations to complete before assertions

### Test Isolation
- Clear state between tests 
- Use unique test data identifiers
- Reset database state where needed

## CI Integration

Flaky tests are configured with:
- `retries: 3` in playwright.config.ts
- Network idle waiting
- Increased timeouts for CI environment

## Monitoring

Track flake rate in CI:
- Target: < 2% flake rate across all tests
- Monitor: weekly flake rate trends
- Alert: if flake rate > 5% for any test file