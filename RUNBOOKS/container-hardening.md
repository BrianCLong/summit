# Container Hardening Runbook

This runbook documents the default hardening posture for IntelGraph services. All images are built with non-root users, read-only root filesystems, dropped capabilities, and seccomp/AppArmor defaults. Use this guide to adopt the golden Dockerfile patterns and to troubleshoot runtime issues introduced by the stricter sandboxing.

## Golden Dockerfile patterns

Templates live in `build/docker/`:

- `node.Dockerfile`: multi-stage build → `gcr.io/distroless/nodejs20-debian12` runtime, `USER 65532`, healthcheck to `/healthz`.
- `python.Dockerfile`: wheel-builder on `python:3.11-slim` → `gcr.io/distroless/python3`, installs only locked wheels, `USER 65532`.
- `static.Dockerfile`: Go/static apps build on `golang:1.22-alpine` → `gcr.io/distroless/static:nonroot`.

Common rules:

- Lockfiles are mandatory (`package-lock.json`, `requirements.lock`, `go.sum`). Builds fail without them.
- Runtime images must not include package managers or compilers; builders may include toolchains.
- Set `WORKDIR /app` and copy only build artifacts; ensure `.dockerignore` excludes dev/test content.
- Default user `65532:65532`; no extra Linux capabilities.
- Keep filesystem read-only; writable paths must be backed by `emptyDir` or tmpfs mounts.
- Health endpoints should expose `/healthz` and `/readyz` without requiring a shell.

## Helm security defaults

`deploy/helm/intelgraph/templates/_security.tpl` centralizes the hardened pod and container contexts:

- `runAsNonRoot: true`, `runAsUser: 65532`, `runAsGroup: 65532`, `fsGroup: 65532`
- `allowPrivilegeEscalation: false`, `readOnlyRootFilesystem: true`, `capabilities.drop: ["ALL"]`
- `seccompProfile: RuntimeDefault`, `AppArmor: runtime/default`
- Lifecycles include an optional `preStop` sleep (configurable via values)

Writable paths are declared in `Values.hardening.writablePaths` and rendered as `emptyDir` volumes (memory-backed by default). To add a new writable directory, append an entry with `name`, `mountPath`, and optional `sizeLimit`.

## Enabling strict mode

Strict hardening is **enabled by default** (`values.yaml` → `hardening.enabled: true`). To relax for debugging, override in your values file:

```yaml
hardening:
  enabled: false
```

Prefer targeted exceptions instead of disabling entirely. For example, to add a single capability:

```yaml
hardening:
  enabled: true
  extraCapabilities:
    - NET_BIND_SERVICE
```

and mirror the justification in the deployment change.

## Troubleshooting common issues

- **Write failures on read-only root**: Mount a new `emptyDir` via `hardening.writablePaths` or adjust the application to write under `/tmp` or `/var/run/app`.
- **Seccomp/AppArmor denials**: Check the namespace events (`kubectl describe pod <pod>`) for audit lines. If a syscall is blocked, capture the stack trace and open a change request to add the minimal capability or profile exception.
- **Lifecycle hook errors**: Distroless images lack `/bin/sh`. Override `hardening.preStopCommand` with a runtime-available binary, e.g. `[/usr/bin/node, -e, "setTimeout(()=>{},5000)"]` or a small helper shipped with the app.
- **Policy failures in CI**: Inspect `.ci/policies/docker.rego` messages. Use an approved base (`distroless`, `chainguard`) and ensure `USER 65532` is set.

## Weekly base refresh

Base images are tracked in `build/bases/manifest.yaml` with the last refresh date. A weekly automation should:

1. Pull updated bases from the approved list.
2. Rebuild service images using the golden Dockerfiles.
3. Run vulnerability and size checks; record CVE/size deltas.
4. Open a PR summarizing changes and attach updated SBOM digests.

## Graceful shutdown expectations

Pods should drain on `SIGTERM` and honor the `preStop` hook. Services should stop accepting new requests, finish in-flight work, and exit cleanly. Ensure the application handles signals internally; the Helm chart only provides a brief sleep for connection draining.
