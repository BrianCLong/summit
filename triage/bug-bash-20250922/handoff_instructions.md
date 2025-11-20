# Bug Bash Handoff Instructions

## For Maintainers

### 1. Ingest Findings
- Review the markdown stubs in `triage/bug-bash-20250922/stubs/`.
- Move them to `backlog/bugs/P0/`, `backlog/bugs/P1/`, etc., creating the directories as needed.
- Alternatively, convert them to GitHub Issues using the new templates.

### 2. Fix P0/P1 Issues
- **Security**: Prioritize `BUG-SEC-001`. Run `python policy-fuzzer/main.py` to reproduce and verify fixes.
- **Infra**: Fix the `pnpm smoke` / Playwright command arguments to restore CI health.

### 3. Sync Backlog
- Update `backlog/backlog.json` if any of these bugs represent new Stories or block existing Epics.

### 4. Improve Process
- Adopt the `triage/templates/` for future bug reports.
- Ensure the next bug bash has a clear "recording" phase where participants commit their findings to the repo (or use a form that does it).

## Meta Improvements for Future
- **Automation**: The Policy Fuzzer proved valuable. Integrate it deeper into CI (blocking PRs).
- **Templates**: The empty markdown files suggest the templates were not easy to use or were ignored. Consider a web form or a CLI tool (`npm run bug-bash:record`) to reduce friction.
- **UI Testing**: Ensure `pnpm smoke` works locally before the bug bash starts.
