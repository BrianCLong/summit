# [INT] IG-101 → MC-205 → SB-33 → CO-58 integration sequence complete

## Checklist

- [ ] Confirm current status of IG-101, MC-205, SB-33, CO-58 PRs and link them here
- [ ] Rebase each PR on latest main and resolve conflicts
- [ ] Merge **IG-101** (new graph schema) and run IntelGraph unit/integration tests
- [ ] Update and merge **MC-205** to consume new schema; all Maestro workflows green
- [ ] Update and merge **SB-33** so normalized events conform to new schema; ingestion tests pass
- [ ] Update and merge **CO-58** to expose unified graph API; CompanyOS contract tests pass
- [ ] Add a short integration doc: dependency graph + “IG-101 → MC-205 → SB-33 → CO-58” sequence
- [ ] Add/refresh one E2E test that crosses all four services using the new schema
