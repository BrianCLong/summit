---
name: security-audit
description: Governance-first security audit toolpack with strict policy gating.
triggers:
  tasks:
    - review
    - implement
  paths:
    - security/**
    - server/**
  keywords:
    - security
    - audit
shards:
  - default
  - deep
  - ci
---

Use this skillpack to run governed security checks. CI runs default to the minimal shard with explicit allowlists and break-glass waivers.
