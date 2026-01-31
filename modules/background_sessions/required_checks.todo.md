# Required Checks Discovery (Background Sessions)

## Goal

Identify the real CI required checks for Background Sessions gates and map them to
summit-required check names.

## Steps

1. Inspect the default branch protection settings for the repo.
2. Identify the CI workflow that runs for PRs touching `modules/background_sessions/**`.
3. Record the exact check names emitted by CI for:
   - unit tests
   - policy fixtures
   - evidence schema validation
   - dependency delta enforcement
4. Update this file with the discovered names and the mapping to the temporary
   gate labels:
   - `gate.background_sessions.unit`
   - `gate.background_sessions.policy`
   - `gate.background_sessions.evidence`
   - `gate.dependency_delta`

## Mapping Table (Fill In)

| Temporary Gate                    | Actual CI Check Name | Notes |
| --------------------------------- | -------------------- | ----- |
| gate.background_sessions.unit     | TODO                 |       |
| gate.background_sessions.policy   | TODO                 |       |
| gate.background_sessions.evidence | TODO                 |       |
| gate.dependency_delta             | TODO                 |       |
