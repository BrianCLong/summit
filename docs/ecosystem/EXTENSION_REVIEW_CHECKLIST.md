# Extension Review Checklist

## Required

- [ ] Extension surface identified (`extensions/` or `plugins/`).
- [ ] Manifest present (`extension.json`, `plugin.json`, or `maestro-plugin.yaml`).
- [ ] Permissions declared in the manifest.
- [ ] Compatibility metadata present (see `EXTENSION_COMPATIBILITY_POLICY.md`).
- [ ] Entrypoints are relative and do not reference forbidden paths.

## Governance

- [ ] Extension changes do not modify `docs/ga/MVP4_GA_BASELINE.md` without a governed exception.
- [ ] Extension changes do not modify `docs/security/SECURITY_REMEDIATION_LEDGER.md` without a governed exception.

## Manual Review

- [ ] Data access is scoped to declared permissions.
- [ ] External network access is intentional and documented.
- [ ] Build artifacts and binaries are reproducible.
