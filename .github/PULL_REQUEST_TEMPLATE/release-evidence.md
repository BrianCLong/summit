### Release Evidence Review Checklist

**Instructions for reviewer:** Open the evidence JSON file(s) in this PR and manually verify the fields against the checklist below.

---

* [ ] **Tag:** Matches the intended release version (e.g., `vX.Y.Z` or `vX.Y.Z-rc.N`).
  - *Value in file:*
* [ ] **SHA:** Matches the intended commit hash.
  - *Value in file:*
* [ ] **Evidence Decision:** The `decision` field is `GO`.
  - *Value in file:*
* [ ] **Expiration:** The `expiresAt` timestamp is in the future.
  - *Value in file:*
* [ ] **Dry-Run URL:** A valid dry-run workflow URL is present and corresponds to this tag and SHA.
  - *Link:*
* [ ] **Freeze Override:** If the release freeze is active, a justification for the override is documented.
  - *Justification:*
* [ ] **I understand that merging this pull request enables the publication of the release tag.**
