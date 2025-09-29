# Troubleshooting

For the comprehensive local developer experience guide (quick start, CLI
reference, and smoke test workflow) see
[`docs/devkit-local-development.md`](./devkit-local-development.md).

This page captures a short index of the highest-signal remediation steps. Use
it alongside the detailed guide above when diagnosing problems.

- Verify Docker and Compose versions with `docker --version` and
  `docker compose version`.
- Ensure `.env` matches `.env.example` for required variables like
  `DEV_TENANT_ID` and observability ports.
- Inspect the latest smoke report at `runs/dev-smoke/latest.json` after running
  `./dev test`.
