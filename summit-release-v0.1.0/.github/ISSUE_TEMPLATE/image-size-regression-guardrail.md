# feat(ops): Compose image-size regression guardrail (+10% fail)

## Description
Add a CI job that monitors container image sizes and fails if they exceed a 10% increase compared to the previous release. This prevents accidental bloat from creeping into the release pipeline.

## Acceptance Criteria
- [ ] Add CI job that calculates current image sizes for all Summit services
- [ ] Compare against baseline sizes stored from previous GA release
- [ ] Fail build if any image exceeds +10% size threshold
- [ ] Store baseline sizes as artifacts on each GA release
- [ ] Add badge to README showing current image sizes
- [ ] Document size monitoring in RELEASE_LIFECYCLE.md

## Implementation Notes
- Use `docker images --format` to get image sizes
- Store baseline as JSON artifact on GitHub Releases
- Consider separate thresholds for different service types (DB vs app)

## Task List
- [ ] Create size measurement script
- [ ] Implement size comparison logic
- [ ] Integrate with GitHub Actions workflow
- [ ] Add size badges to README
- [ ] Update documentation