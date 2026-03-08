# Modulith Runbook

## Triage
1. Run `ENABLE_MODULITH=true python -m summit.modulith`.
2. Review `artifacts/modulith/report.json` for `MBV-IMP-*` violations.
3. Update `config/modules.yaml` allowlist only when architecture approval is documented.

## Exception Process
- Use PR justification tag `#modulith-exception`.
- Include reason, rollback plan, and owner sign-off in PR notes.
