# Assumptions Ledger: item-UNKNOWN

- CI is GitHub Actions (medium) → validate via repo settings.
- Node 20 available in CI (medium) → validate workflow run.
- Required check naming conventions unknown (high) → run discovery steps.

## Falsification criteria

- If repo uses different CI system or Node unavailable → rewrite verifier in repo-native runtime.
