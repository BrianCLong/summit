# Summit CLI Threat Model

This document outlines the security threat model for the Summit CLI, specifically related to the agent ecosystem (creation, distribution, execution).

| Threat | Mitigation | CI/Runtime Gate | Test Case |
|---|---|---|---|
| Malicious published bundle | Signature + provenance required | ci-agent-publish-security | tests/security/publish-malicious-bundle.spec.ts |
| Prompt-injection via template/bundle metadata | Lint + schema validation | ci-agent-schema | tests/security/template-injection.spec.ts |
| Unsafe post-install scripts | Deny-by-default, no arbitrary install hooks in v1 | Runtime gate in installer | tests/security/install-hook-deny.spec.ts |
| Graph poisoning via fake metadata | Registry verification + signed provenance | ci-marketplace-integrity | tests/security/graph-ingest-integrity.spec.ts |

## Abuse-case Fixtures
- Unsigned bundle
- Tampered provenance.json
- Template with shell injection marker
- Bundle requesting forbidden network/tool scopes

## Policy Regression Tests
- Install deny-by-default for untrusted bundle
- Publish blocked when deterministic artifacts missing
