# Agent Directives

## Bootstrap Initialization
System bootstrapped on 2026-03-06.

## Core Principles
- One concern per PR (Frontier Policy)
- Evidence-first engineering
- Surgical changes only
- Goal-driven execution

## Initial Rules
1. All PRs must declare `/concern <key>` for governed paths
2. All PRs must declare `/supersedes #N` or `/supersedes none`
3. Canonical survivors are the sole merge frontier per concern
4. Queue states must be maintained: merge-now, needs-rebase, conflict, blocked, obsolete

## Auto-generated rules will be appended below by SAFE autodidactic loop
---
