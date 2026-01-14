# Hermetic CI Gate Runbook

This runbook enforces the Summit Readiness Assertion by proving that designated CI steps execute
hermetically: no outbound network access and no inbound listening sockets. The gate produces
audit-ready evidence under `artifacts/governance/hermetic-ci/<sha>` for every run.

## What is enforced and why

- **No outbound network access** during hermetic steps. Any network call is treated as a violation
  unless explicitly authorized as a **Governed Exception** in the policy allowlist.
- **No inbound listening sockets** during hermetic steps. This prevents accidental service
  startups, keeps tests deterministic, and shortens feedback loops.

These constraints support the Law of Consistency by ensuring hermetic, reproducible test and lint
outcomes with minimal, non-sensitive diagnostics.

## How enforcement works

1. `scripts/ci/hermetic_ci_gate.mjs` loads `docs/ci/HERMETIC_CI_POLICY.yml`.
2. Each hermetic command runs under a sanitized environment (sensitive keys removed) with any
   policy-provided overrides applied.
3. **Outbound detection**
   - **Preferred**: `strace -f -e trace=network` captures network syscalls and produces a trace.
   - **Fallback**: `ss -tnp` snapshots established connections for the process tree.
   - Fallback detection is intentionally constrained; it only fails on clear evidence.
4. **Inbound detection**
   - `ss -ltnup` identifies listening sockets owned by the process tree.
5. Reports are emitted deterministically (stable ordering and JSON formatting).

## Adding a hermetic step

1. Edit `docs/ci/HERMETIC_CI_POLICY.yml` and append a new `hermetic_steps` entry.
2. Declare any required environment toggles (e.g., `NO_NETWORK_LISTEN`).
3. If outbound access is required, document a **Governed Exception** in `allow.outbound_hosts`
   or `allow.outbound_ports`.
4. Run locally: `pnpm ci:hermetic --step <id>`.

## Debugging violations locally

1. Inspect `artifacts/governance/hermetic-ci/<sha>/report.md` for the failure summary.
2. Review `logs/<step>/stdout.txt` and `stderr.txt` for command output.
3. For network violations:
   - Check `logs/<step>/strace.txt` (preferred) or `logs/<step>/ss_established.txt` (fallback).
4. For socket violations:
   - Check `logs/<step>/ss_listen.txt` and `logs/<step>/process_tree.json`.

## Known limitations

- The `ss` fallback is intentionally constrained and only detects clear established connections.
- Full process-tree socket attribution relies on Linux `ss` output; non-Linux runners are deferred
  pending a cross-platform socket inspector.
- If `strace` is unavailable, outbound enforcement remains best-effort until the tooling is present.
- Host allowlists compare literal hostnames or IPs; DNS resolution is intentionally constrained
  pending a governed resolver.

## Tightening the gate (future direction)

- Add a stricter mode to require `strace` on CI runners.
- Adopt containerized hermetic execution (net=none) when privileged containers are permitted.
- Expand allowlists into a centralized policy-as-code registry for governance audits.
