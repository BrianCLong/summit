# Assumptions & Validation: Expectation Baselines

## Assumptions

- Test runner available (medium confidence)
- CI can run Node scripts (high confidence)
- Required check names unknown (high confidence they exist, unknown labels)

## Validation

- Add negative fixtures that must fail verifier.
- Re-run verifier twice; outputs identical (determinism).
- Discover required check names and rename jobs accordingly.

## Falsification criteria

- If determinism cannot be achieved (outputs differ run-to-run), stop and reduce scope to schema-only.
- If CI environment blocks Node execution, migrate verifier to existing repo scripting standard.

## Next steps if falsified

- Implement verifier in repo-native language/tooling already present.
