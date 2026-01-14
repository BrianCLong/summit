---
name: security-audit
description: Security audit shard for controlled vulnerability triage.
triggers:
  - security-audit
  - security
shards:
  default:
    - audit
  deep:
    - audit
  ci:
    - ci
---

Use this skillpack when auditing changes for security regressions or policy compliance. Tool
selection is policy-gated and defaults to deny in CI without a break-glass waiver.
