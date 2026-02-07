# Repo Assumptions & Validation

## Verified

_(empty)_

## Assumed

- Language: Python
- CLI entrypoint: `summit`
- Test runner: pytest
- Lint: ruff
- CI: GitHub Actions

## Must-Not-Touch Files

- Lockfiles
- Release workflows
- Security policy
- Any `infra/` deployment configs (until verified)

## Validation Checklist (Before PR1 Merge)

- Confirm actual CLI framework and where commands live.
- Confirm existing evidence schema (or create one without breaking changes).
- Confirm CI check names and required status checks.
- Confirm existing logging redaction/security documentation conventions.
