# Required checks discovery (SlopGuard)

The following CI gates are planned for SlopGuard. These should be mapped to real CI check names once discovered in the repo settings.

1. `slopguard_policy`: Evaluates artifact against SlopGuard policy.
2. `slopguard_citations`: Validates citations in research artifacts.
3. `dataset_hygiene`: Ensures dataset provenance tags are present.

## TODO
- [ ] Verify branch protection rules for required check names.
- [ ] Integrate SlopGuard CLI into the CI pipeline.
- [ ] Rename temporary gate names to match repository standards.
