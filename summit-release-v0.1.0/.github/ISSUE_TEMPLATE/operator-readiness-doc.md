# feat(docs): Operator Readiness one-pager export

## Description
Create a one-page PDF export that summarizes all critical operational information for new operators. This should include ports, credential models, backup procedures, RPO/RTO commitments, and SLOs.

## Acceptance Criteria
- [ ] Create concise one-page operator readiness document
- [ ] Include all critical ports and service mappings
- [ ] Document credential model and rotation procedures
- [ ] Define backup path, RPO, and RTO commitments
- [ ] Summarize key SLOs and alerting contacts
- [ ] Export as PDF and attach to GitHub releases
- [ ] Automate PDF generation in release workflow

## Implementation Notes
- Use markdown-to-pdf converter in GitHub Actions
- Include diagrams for service architecture
- Link to full documentation for deep dives
- Version with each release

## Task List
- [ ] Design one-page layout and content structure
- [ ] Create markdown template
- [ ] Add architecture diagram
- [ ] Implement PDF generation workflow
- [ ] Test with sample release
- [ ] Update release process documentation