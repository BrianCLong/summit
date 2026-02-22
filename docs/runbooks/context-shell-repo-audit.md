# Runbook: Repo Audit (Policy Gates for Release Workflows)

## Objective

Locate policy gates and enforcement points tied to release workflows using Context Shell.

## Preconditions

- Repo is available locally.
- Access to `ctx.bash` tool via Maestro.

## Steps

1. **Search release documentation for policy gates**

```yaml
steps:
  - id: release-policy-search
    tool: ctx.bash
    params:
      root: "/workspace/summit"
      fsMode: "readonly"
      command: "rg 'policy|gate|approval' docs/release"
```

2. **Scan CI and governance rules**

```yaml
steps:
  - id: ci-policy-search
    tool: ctx.bash
    params:
      root: "/workspace/summit"
      fsMode: "readonly"
      command: "rg 'policy|gate|approval' .github docs/governance"
```

3. **Record evidence artifacts**

The JSONL evidence log is written automatically:

```
./evidence/context-shell/context-shell-events.jsonl
```

Archive the file with release evidence bundles to satisfy provenance requirements.

## Expected Outputs

- Structured stdout/stderr and file access lists from each call.
- Evidence events with command hashes, policy decision IDs, and timestamps.
