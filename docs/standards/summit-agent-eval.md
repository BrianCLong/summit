
## Deterministic Artifact Rules

To ensure reliable, reproducible evaluation and replay of agent behaviors, all test artifacts must adhere to strict determinism standards.

1. **Canonical JSON Serialization**: When comparing artifacts for equality or evaluating states, canonical JSON serialization MUST be used. `JSON.stringify` does not guarantee key ordering and can lead to false negatives during comparison.
   - Use `canonicalizeJson` from `evaluation/utils/canonical-json.ts`.
   - Keys within JSON objects are sorted alphabetically.

2. **No Timestamps**: Artifacts must not contain timestamp fields or variable timing data that differs across execution runs. This prevents flaky tests caused by execution delays.

3. **No Non-Deterministic IDs**: Randomly generated IDs (such as UUIDs) are prohibited in deterministic test artifacts. If IDs are required, they must be deterministically generated, predictable, or mocked for the test environment.

4. **Stable Ordering**: Array and object element order must be consistent across multiple runs of the same evaluation.
