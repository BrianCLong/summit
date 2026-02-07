# Data Handling: Sandboxed Agent Runtime (Cloudflare Moltworker Adapter)

**Status:** Experimental Adapter Data Policy

## Never Log (Final)

- API keys, OAuth tokens, or secret material.
- Raw user message text unless explicitly approved by `debug-mode` and documented.
- Browser screenshots or HTML dumps unless redacted + user-consented.
- Object-store keys that embed user identifiers.

## Retention Defaults

- Evidence bundles: 30 days in CI artifacts (configurable in self-host).
- Runtime state store: default TTL 7 days for experimental adapter unless overridden.

## Classification & Minimization

- Store only per-run state required for determinism and evidence.
- Use namespace isolation per evidence ID.
- Encrypt at rest and in transit via platform defaults.

## Access Controls

- Zero-trust authentication for admin/runtime APIs.
- Deny-by-default tool access and egress unless allowlisted.

## Audit & Evidence

- Every runtime run produces an evidence bundle with deterministic stamp.
- Audit events record authz decisions and gateway routing.

## Compliance Position (Final)

- No claim of privacy beyond explicit controls and threat model.
- All regulatory logic remains policy-as-code in Summit governance engines.
