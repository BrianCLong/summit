# Dependency Risk Report Schema

This document defines the canonical schema for `report.json` emitted by the
Dependency & Supply-Chain Risk Gate (`scripts/ci/dependency_risk_gate.mjs`).

## Top-Level Shape

```json
{
  "metadata": {
    "repo": "summit",
    "sha": "<git sha>",
    "timestamp": "2026-01-14T00:00:00.000Z",
    "tool_versions": {
      "node": "v20.0.0",
      "pnpm": "10.0.0"
    },
    "sources": [
      {
        "type": "pnpm_audit",
        "status": "run|skipped|failed",
        "notes": "..."
      }
    ]
  },
  "vulnerabilities": [
    {
      "id": "GHSA-xxxx-xxxx-xxxx",
      "severity": "high",
      "package": "lodash",
      "version": "4.17.21",
      "via": ["proto pollution"],
      "fix_available": true,
      "source": "pnpm_audit"
    }
  ],
  "licenses": [
    {
      "package": "lodash",
      "version": "4.17.21",
      "license": "MIT",
      "source": "package.json"
    }
  ],
  "policy": {
    "hash": "<sha256>",
    "decisions": {
      "vulnerability_gate": {
        "status": "pass|fail",
        "max_severity": "high",
        "violations": 0
      },
      "license_gate": {
        "status": "pass|fail",
        "unknown_behavior": "fail|warn",
        "violations": 0
      }
    },
    "allowlist_hits": {
      "vulnerabilities": [
        {
          "id": "GHSA-xxxx-xxxx-xxxx",
          "expires": "2026-03-01",
          "rationale": "..."
        }
      ]
    }
  },
  "verdict": {
    "status": "pass|fail",
    "reasons": ["..."]
  }
}
```

## Field Notes

- `metadata.sources` records which scanners ran or were skipped to keep evidence
  deterministic across environments.
- `vulnerabilities` are sorted by severity (critical → low), then `id`, then
  package name for deterministic ordering.
- `licenses` are sorted by package name, then version.
- `policy.hash` is the SHA-256 hash of the policy file used for evaluation.
- `verdict.reasons` is a stable, ordered list describing why the gate failed.
