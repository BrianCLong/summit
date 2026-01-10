# Ecosystem Governance Enforcement

## Automated Enforcement

The following extension guardrails are enforced automatically:

- Manifests are required for extension surfaces (`extension.json`, `plugin.json`, or `maestro-plugin.yaml`).
- Permissions are declared in each manifest.
- Compatibility metadata is present (`summit.minVersion` or `version`).
- Entrypoint paths are relative and do not reference forbidden paths.

Automated checks run via:

```bash
node scripts/ci/check-extensions-compliance.mjs
```

To generate a report without failing the run:

```bash
node scripts/ci/check-extensions-compliance.mjs --report
```

### Governed Exceptions

VS Code extensions under `extensions/` that declare `engines.vscode` are treated as governed
exceptions.

An explicit override is available for repo owners only by setting:

```
EXTENSION_GOVERNANCE_OVERRIDE=1
```

## Manual Review

Manual review follows `docs/ecosystem/EXTENSION_REVIEW_CHECKLIST.md` and confirms that
extensions adhere to data access and security constraints beyond automated checks.
