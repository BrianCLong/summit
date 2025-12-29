# Security Posture (Scaffolding)

The Summit Flywheel Setup defaults to **safe mode**. Elevated automation ("vibe"
mode) will remain opt-in and gated in future PRs. No passwordless sudo or
privilege escalations are performed in this scaffolding release.

Upcoming hardening milestones:

- Enforce deterministic downloads with pinned versions and checksums.
- Record machine identity and installer state to support resumable runs.
- Introduce a "dangerous command gate" for actions requiring explicit approval.
- Provide transparent `--print` and `--print-plan` outputs for auditing.

If you suspect a security issue, follow the repository's standard reporting
path in `SECURITY.md` at the repo root.
