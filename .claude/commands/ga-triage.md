# GA Triage Command

When `make ga` fails, run this command to diagnose and get actionable next steps.

## What This Does

1. Runs `make ga` and captures output
2. Identifies which check failed
3. Provides targeted remediation steps from the GA Red Playbook

## Steps

### Step 1: Run GA Gate

Run `make ga` and capture the output:

```bash
make ga 2>&1 | tee /tmp/ga-output.txt
```

### Step 2: Identify the Failure

Check which step failed:

```bash
grep -E "(❌|FAIL|failed)" /tmp/ga-output.txt
```

### Step 3: Check the GA Report

If the gate generated a report, read it:

```bash
cat artifacts/ga/ga_report.md 2>/dev/null || echo "No report generated"
```

### Step 4: Triage Based on Failure

Based on the failed check, suggest the appropriate section from `.claude/playbooks/ga-red-playbook.md`:

| Failed Check      | Playbook Section | Quick Fix                                         |
| ----------------- | ---------------- | ------------------------------------------------- |
| Lint and Test     | §1               | Run `pnpm lint:fix` and `pnpm test -- -u`         |
| Clean Environment | §2               | Run `docker compose down -v --remove-orphans`     |
| Services Up       | §3               | Check `docker compose logs` for errors            |
| Readiness Check   | §4               | Wait longer or check `curl localhost:8080/health` |
| Deep Health Check | §5               | Check `curl localhost:8080/health/detailed`       |
| Smoke Test        | §6               | Run `make dev-smoke` for details                  |
| Security Check    | §7               | Run `gitleaks detect --verbose`                   |

### Step 5: Apply the Fix

After identifying the issue:

1. Apply the minimal fix
2. Re-run the failing check directly (faster than full `make ga`)
3. Once that passes, run `make ga` again

### Step 6: Document in PR

Include in your PR:

- What failed
- What you did to fix it
- Evidence that it now passes

## Quick Commands Reference

```bash
# Re-run specific checks faster than full make ga
pnpm lint          # Lint only
pnpm test          # Tests only
make dev-smoke     # Smoke only
gitleaks detect    # Security only

# Full gate (after fixes)
make ga
```

## See Also

- [GA Red Playbook](../playbooks/ga-red-playbook.md) - Full troubleshooting guide
- [Workflow: GA Red](../workflows/workflow-ga-red.md) - Step-by-step workflow
