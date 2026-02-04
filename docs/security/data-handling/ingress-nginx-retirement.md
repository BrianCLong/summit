# Data Handling: Ingress NGINX Retirement

## Data Classes

- Route inventory exports: internal.
- Hostnames and paths: confidential.
- Evidence bundles: internal (audit-grade).

## Retention

- Evidence bundles: retain for 1 year unless superseded by policy.
- Drift findings: retain for 1 year unless superseded by policy.

## Redaction Rules

- Do not log secrets, private keys, or authentication headers.
- Mask sensitive hostnames in any public artifact exports.

## Access Controls

- Evidence bundles must remain in repo-controlled storage.
- Exposure outside the repo is intentionally constrained pending governance approval.

## MAESTRO Threat Modeling Alignment

- MAESTRO Layers: Foundation, Data, Tools, Observability, Security.
- Threats Considered: prompt injection, tool abuse (file system scanning), policy bypass by
  embedding ingress-nginx markers in non-governed files.
- Mitigations: scoped file scanning to tracked manifest files, deny-by-default gate, evidence
  artifacts for auditability, deterministic outputs to reduce integrity drift.

## Compliance Notes

Regulatory logic remains policy-as-code and is enforced through CI gates. Any exceptions must be
logged as governed exceptions and are deferred pending governance approval.
