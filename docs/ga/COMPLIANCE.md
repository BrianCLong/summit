# GA Compliance & Audit

> **Version**: 1.0  
> **Last Updated**: 2026-02-05  
> **Status**: Ready (execution deferred pending release window)

## Compliance Validation

```bash
./scripts/compliance/ga-compliance-validate.sh
```

Outputs:
- `artifacts/compliance/governance-compliance.json`
- `artifacts/compliance/audit/*`
- `artifacts/compliance/ga-compliance-summary.json`

## SBOM & CVE Gate

```bash
./scripts/compliance/ga-sbom-cve.sh
```

Outputs:
- `artifacts/compliance/sbom/*`
- `artifacts/compliance/sbom-cve-summary.json`

## Notes

- CVE scan requires `trivy` in PATH; when unavailable, the scan is deferred pending tooling.
