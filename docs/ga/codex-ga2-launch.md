# Codex Desktop GA2 Launch (Conflict-Free)

Use these five isolated worktrees/branches for parallel threads:

- `/private/tmp/summit-ga2-security` -> `codex/ga2-security`
- `/private/tmp/summit-ga4-deps` -> `codex/ga4-deps`
- `/private/tmp/summit-ga2-quality` -> `codex/ga2-quality`
- `/private/tmp/summit-ga4-perf` -> `codex/ga4-perf`
- `/private/tmp/summit-ga2-integration` -> `codex/ga2-integration`

## Prompt Mapping

Use your existing prompt set in this order:

1. Thread 1: Security + Dependabot (P0)
2. Thread 2: Dependency modernization
3. Thread 3: Warnings/typos/bugs cleanup
4. Thread 4: Build/performance improvements
5. Thread 5: Convergence/integration

## Materialization Status

To check readiness:

```bash
for d in /private/tmp/summit-ga2-security /private/tmp/summit-ga4-deps /private/tmp/summit-ga2-quality /private/tmp/summit-ga4-perf /private/tmp/summit-ga2-integration; do
  printf "%s: " "$d"
  [ -f "$d/package.json" ] && echo ready || echo not_ready
done
```

If `deps`/`perf` are fresh `ga4` worktrees, materialize once:

```bash
git -C /private/tmp/summit-ga4-deps reset --hard HEAD
git -C /private/tmp/summit-ga4-perf reset --hard HEAD
```

## Materialize All (Sequential)

```bash
/Users/brianlong/Developer/summit/scripts/ga/materialize-ga2-worktrees.sh /private/tmp /tmp
```

Per-worktree logs:

- `/tmp/summit-ga2-security-materialize.log`
- `/tmp/summit-ga2-deps-materialize.log`
- `/tmp/summit-ga2-quality-materialize.log`
- `/tmp/summit-ga2-perf-materialize.log`
- `/tmp/summit-ga2-integration-materialize.log`
