## Summary

Explain what changed and why.

## Gates Touched

- [ ] Security/Tenancy
- [ ] Reliability/Performance
- [ ] Supply Chain/Evidence
- [ ] Observability/SLOs
- [ ] Accessibility/UX
- [ ] Docs/Runbooks

## Evidence (required)

> Attach links/files; PR will fail without at least one item per checked gate.

- SSO / RBAC: [link/screenshot]
- CSP/Headers/CSRF: [report/header dump]
- Perf/Load (K6/RUM): [artifact/link]
- Streams resilience: [video/log]
- Evidence immutability: [AWS policy + denied attempt]
- Cosign/SBOM/SLSA: [verify logs]
- SLO/AlertCenter: [dashboard/incident]
- A11y: [axe CI output]

## Rollback Plan

Describe rollback steps and impact.

## Security

- Threat model impact: [ ] None / [ ] Yes (explain)
- CSP diff included: [ ] Yes / [ ] N/A
- CSRF tokens updated/enforced: [ ] Yes / [ ] N/A

## Testing

- Unit/Integration: [summary]
- E2E (Playwright): [link to trace]

## Docs

- [ ] Updated Operator Runbook
- [ ] Updated Security Appendix

## Checklist

- [ ] I confirm evidence is attached for each gate touched.
- [ ] I confirm on‑call is informed of any operational changes.
