# PR Hygiene & Merge Policy

## Commit Rules
- Use Conventional Commits (e.g., `feat:`, `fix:`, `docs:`, `chore:`).
- Keep commits small and logical. Do not squash unrelated changes into a single commit.
- Ensure the commit message body explains the *why*, not just the *what*.

## Reviewer Checklist
- [ ] Code meets architectural guidelines and doesn't introduce circular dependencies.
- [ ] Tests are included and pass locally.
- [ ] No hardcoded secrets or PII leaks.
- [ ] Documentation (READMEs, inline comments) is updated if necessary.
- [ ] The PR is small enough to review effectively (< 400 lines preferred).

## Merge Policy
- **Required Approvals:** 1 approval for general code, 2 for core orchestration logic.
- **CI Gates:** All required status checks must pass before merging.
- **Merge Strategy:** Use "Squash and merge" to keep the main timeline clean, unless preserving specific history is justified.
