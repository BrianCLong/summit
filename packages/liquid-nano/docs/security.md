# Security Hardening Checklist

The pilot enables conservative defaults while outlining additional controls for production promotion.

## Built-In Controls

- **Strict TypeScript** – All source files compile with `strict`, `exactOptionalPropertyTypes`, and `noUncheckedIndexedAccess`.
- **Plugin Safety** – Duplicate plugin registration is blocked; hot-loading requires `security.allowDynamicPlugins=true`.
- **Telemetry Sanitization** – `security.redactFields` redacts secrets before persistence or telemetry.
- **Signature Enforcement** – When `security.validateSignatures` is `true`, plugin failures propagate immediately.

## Recommended Enhancements

| Area            | Action                                                         |
| --------------- | -------------------------------------------------------------- |
| Secrets         | Mount via Kubernetes Secrets or SSM; never bake into images.   |
| TLS             | Terminate TLS at Ingress and enforce mTLS for upstream calls.  |
| SBOM            | Generate SBOM using `npm exec -- sbom-tool` before releases.   |
| Runtime User    | Drop privileges by using a non-root user in Dockerfile.       |
| Network Policy  | Apply `NetworkPolicy` manifest to restrict egress to OTLP only.|
| Supply Chain    | Enable container signing (Cosign) and verify in CI pipelines. |

## Incident Response

- Configure Audit Trail sink to `stdout` for tamper-resistant logging.
- Retain diagnostics snapshots for at least 30 days.
- Follow `docs/troubleshooting.md` escalation path and notify security operations for plugin exploitation attempts.
