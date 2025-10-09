# feat(rel): Auto-generate release notes with digests/SBOM links

## Description
Automate release note generation on tag push that includes image digests, SBOM artifact links, and summarized changelog. This eliminates manual release note creation and ensures consistency.

## Acceptance Criteria
- [ ] Automatically generate release notes on tag push
- [ ] Include full image digest list for all services
- [ ] Link to SBOM artifacts attached to release
- [ ] Summarize commits since last release
- [ ] Include breaking changes and migration notes
- [ ] Publish as GitHub Release with proper tagging

## Implementation Notes
- Use GitHub Actions on tag push events
- Parse image digests from docker-compose files
- Link to SBOM artifacts uploaded during build
- Format using GitHub markdown conventions

## Task List
- [ ] Create release note template
- [ ] Implement digest extraction logic
- [ ] Add changelog summarization
- [ ] Configure GitHub Actions workflow
- [ ] Test with sample tag push
- [ ] Update release process documentation