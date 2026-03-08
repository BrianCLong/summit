# PR Concern Keys

## Purpose

Concern keys give Summit a stable, machine-readable identity for a line of work.

They are used to:
- reduce duplicate PR proliferation
- identify concern clusters
- connect successor PRs to superseded PRs
- enforce canonical frontier discipline

## Format

Concern keys should be:
- lowercase
- kebab-case
- stable across retries/revisions of the same concern
- narrow enough to represent one merge frontier

Examples:
- `ci-gate`
- `workflow-cleanup`
- `merge-queue-telemetry`
- `apollo-migration`
- `infra-eks-bootstrap`
- `evidence-id-policy`
- `branch-protection-drift-gate`

## Rules

### 1. One concern key per PR
Every non-trivial PR should declare exactly one:
`/concern <key>`

### 2. Revisions keep the same concern key
If a later PR is a retry or successor, it should reuse the same concern key.

### 3. Superseding PRs should say so
Declare:
`/supersedes #123 #124`
or:
`/supersedes none`
