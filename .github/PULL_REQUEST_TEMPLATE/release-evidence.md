### Release Evidence Review Checklist

**Instructions for reviewer:** Open the evidence JSON file(s) in this PR and manually verify the fields against the checklist below.

---

- [ ] **Tag:** Matches the intended release version (e.g., `vX.Y.Z` or `vX.Y.Z-rc.N`).
  - _Value in file:_
- [ ] **SHA:** Matches the intended commit hash.
  - _Value in file:_
- [ ] **Evidence Decision:** The `decision` field is `GO`.
  - _Value in file:_
- [ ] **Expiration:** The `expiresAt` timestamp is in the future.
  - _Value in file:_
- [ ] **Dry-Run URL:** A valid dry-run workflow URL is present and corresponds to this tag and SHA.
  - _Link:_
- [ ] **Freeze Override:** If the release freeze is active, a justification for the override is documented.
  - _Justification:_
- [ ] **I understand that merging this pull request enables the publication of the release tag.**
