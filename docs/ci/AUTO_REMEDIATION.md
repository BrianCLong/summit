# Auto-Remediation Playbooks

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

## Overview

Auto-Remediation Playbooks provide automated responses to common release blocker patterns. When a blocker matches a known pattern, the system can automatically execute remediation steps to resolve or mitigate the issue.

### Key Properties

- **Pattern-based matching**: Triggers on labels, keywords, and file patterns
- **Configurable automation**: Control which playbooks auto-execute
- **Safety first**: Dry-run by default, approval gates for destructive actions
- **Audit trail**: Full history of remediation attempts

---

## How It Works

```
Issue Labeled/Created
        │
        ▼
┌───────────────────┐
│ Match Playbooks   │
│ - Labels          │
│ - Keywords        │
│ - File patterns   │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ Check Constraints │
│ - Max attempts    │
│ - Cooldown        │
│ - Auto-execute    │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ Execute Steps     │
│ 1. Analyze        │
│ 2. Remediate      │
│ 3. Verify         │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ Post Actions      │
│ - Comment result  │
│ - Update labels   │
│ - Escalate if fail│
└───────────────────┘
```

---

## Available Playbooks

| Playbook            | Triggers                       | Auto-Execute | Description               |
| ------------------- | ------------------------------ | ------------ | ------------------------- |
| `flaky-tests`       | `flaky-test`, `test-failure`   | No           | Re-run tests with retries |
| `dependency-update` | `dependency`, `outdated`       | No           | Merge Dependabot PRs      |
| `build-cache`       | `cache-issue`, `build-failure` | **Yes**      | Clear and rebuild caches  |
| `lockfile-conflict` | `lockfile-conflict`            | No           | Regenerate lock files     |
| `type-errors`       | `type-error`, `typescript`     | No           | Analyze and suggest fixes |
| `sbom-failure`      | `sbom-failure`                 | No           | Regenerate SBOM           |
| `ci-timeout`        | `timeout`, `ci-slow`           | No           | Analyze and optimize      |
| `security-scan`     | `security`, `CVE-*`            | No           | Apply security patches    |

---

## Playbook Details

### Flaky Tests

**Triggers:** `flaky-test`, `test-failure`, keywords: "flaky", "intermittent"

**Steps:**

1. Identify failing tests from workflow logs
2. Re-run workflow with retry logic (3x)
3. Quarantine persistently failing tests

**Success criteria:** All tests pass

**On failure:** Add `needs-investigation` label, escalate to P0

---

### Dependency Update

**Triggers:** `dependency`, `outdated-dependency`

**Steps:**

1. Check for existing Dependabot PR
2. Merge if CI passes and update is safe
3. Create update PR if no Dependabot PR exists

**Success criteria:** Dependency updated, CI passing

---

### Build Cache (Auto-Execute)

**Triggers:** `cache-issue`, `build-failure`, keywords: "cache.\*corrupt"

**Steps:**

1. Clear GitHub Actions caches (pnpm, node_modules, build)
2. Trigger fresh build with clean checkout

**Success criteria:** Build passes

This playbook auto-executes because cache clearing is always safe.

---

### Lock File Conflict

**Triggers:** `lockfile-conflict`, keywords: "lock.\*conflict"

**Steps:**

1. Regenerate lock file: `pnpm install --no-frozen-lockfile`
2. Verify: `pnpm install --frozen-lockfile`

**Success criteria:** Lock file regenerated, install succeeds

---

### Type Errors

**Triggers:** `type-error`, `typescript`, keywords: "TS[0-9]+"

**Steps:**

1. Run type check and capture output
2. Parse error patterns
3. Generate suggestions for common fixes

**Success criteria:** Zero type errors

**On failure:** Comment with analysis and suggested investigation areas

---

### SBOM Failure

**Triggers:** `sbom-failure`, `compliance`

**Steps:**

1. Check SBOM tooling availability
2. Regenerate SBOM
3. Validate generated SBOM

**Success criteria:** Valid SBOM generated

---

### CI Timeout

**Triggers:** `timeout`, keywords: "timed out", "exceeded.\*limit"

**Steps:**

1. Analyze workflow timing metrics
2. Identify slowest steps
3. Suggest optimizations (caching, parallelization, test splitting)

**Success criteria:** Workflow duration under timeout limit

**On failure:** Comment with detailed timing analysis

---

### Security Scan

**Triggers:** `security`, `vulnerability`, keywords: "CVE-"

**Steps:**

1. Fetch vulnerability details from Dependabot/CodeQL
2. Categorize by severity (critical → low)
3. Check for available patches
4. Apply safe patch-level updates

**Success criteria:** No critical or high vulnerabilities

---

## Configuration

### Global Settings

```yaml
settings:
  require_approval: true # Require approval before execution
  max_attempts: 3 # Max remediation attempts per issue
  cooldown_minutes: 30 # Time between attempts
  post_comment: true # Comment results to issue
  audit_enabled: true # Track all attempts
```

### Playbook Structure

```yaml
playbooks:
  my-playbook:
    name: "Display Name"
    description: "What this playbook does"
    trigger:
      labels:
        - "trigger-label"
      keywords:
        - "keyword.*pattern"
    severity: P1
    auto_execute: false
    steps:
      - name: "Step name"
        action: action_type
        params:
          key: value
    success_criteria:
      - "condition == true"
    failure_actions:
      - action: escalate
```

### Available Actions

| Action           | Description              | Parameters                |
| ---------------- | ------------------------ | ------------------------- |
| `rerun_workflow` | Trigger workflow run     | `workflow`, `retry_count` |
| `add_label`      | Add label to issue       | `label`                   |
| `clear_cache`    | Delete GHA caches        | `cache_keys[]`            |
| `run_command`    | Execute shell command    | `command`, `timeout`      |
| `comment`        | Add issue comment        | `body`                    |
| `suggest_fixes`  | Generate fix suggestions | `max_suggestions`         |

---

## Usage

### Automatic Triggering

Remediation runs automatically when:

1. **Issue labeled** with a trigger label (`release-blocker`, `flaky-test`, etc.)
2. **Scheduled** every 4 hours for batch processing
3. **Manual dispatch** via workflow UI

### Manual Invocation

#### Via GitHub Actions UI

1. Navigate to Actions → Auto-Remediation
2. Click "Run workflow"
3. Configure options:
   - Issue number (optional)
   - Specific playbook (or auto-detect)
   - Dry run mode (recommended first)
   - Auto-only filter
4. Click "Run workflow"

#### Via CLI

```bash
# Dry run for specific issue
./scripts/release/run_remediation.sh --issue 456 --dry-run

# Execute specific playbook
./scripts/release/run_remediation.sh --issue 456 --playbook build-cache

# Run auto-execute playbooks only
./scripts/release/run_remediation.sh --auto

# Force run (bypass cooldown)
./scripts/release/run_remediation.sh --issue 456 --force

# Batch process all candidates
./scripts/release/run_remediation.sh
```

---

## Safety Mechanisms

### Rate Limiting

| Control              | Default | Purpose                      |
| -------------------- | ------- | ---------------------------- |
| `max_attempts`       | 3       | Prevent infinite retry loops |
| `cooldown_minutes`   | 30      | Space out attempts           |
| `max_issues_per_run` | 20      | Limit batch size             |

### Approval Gates

- Most playbooks require `auto_execute: false`
- Destructive actions need explicit approval
- Security playbooks always require review

### Dry Run Mode

Always available via `--dry-run` flag. Shows:

- Which playbook would match
- What steps would execute
- Expected outcomes

---

## Remediation Comments

When remediation completes, a comment is added:

```markdown
**Auto-Remediation ✅**

Playbook: **Build Cache Remediation**
Trigger: `label:cache-issue`
Status: completed

_This remediation was automatically triggered. Review the changes
and close this issue if resolved._
```

---

## State Tracking

State tracked in `docs/releases/_state/remediation_state.json`:

```json
{
  "version": "1.0.0",
  "last_run_at": "2026-01-08T12:00:00Z",
  "remediation_history": {
    "456": {
      "last_attempt_at": "2026-01-08T12:00:00Z",
      "attempts": 2,
      "last_playbook": "build-cache",
      "last_result": "success"
    }
  },
  "stats": {
    "total_attempts": 42,
    "successful": 35,
    "failed": 7,
    "by_playbook": {
      "build-cache": 20,
      "flaky-tests": 15
    }
  }
}
```

---

## Adding Custom Playbooks

### 1. Define the Playbook

Add to `docs/ci/REMEDIATION_PLAYBOOKS.yml`:

```yaml
playbooks:
  custom-fix:
    name: "Custom Fix Playbook"
    description: "Fixes a specific issue pattern"
    trigger:
      labels:
        - "custom-issue"
      keywords:
        - "specific.*pattern"
    severity: P1
    auto_execute: false
    steps:
      - name: "Analyze issue"
        action: run_command
        params:
          command: "echo 'Analyzing...'"

      - name: "Apply fix"
        action: run_command
        params:
          command: "./scripts/custom-fix.sh"
    success_criteria:
      - "exit_code == 0"
```

### 2. Test with Dry Run

```bash
./scripts/release/run_remediation.sh --issue 123 --playbook custom-fix --dry-run
```

### 3. Enable Auto-Execute (Optional)

Only if the playbook is completely safe:

```yaml
auto_execute: true
```

---

## Troubleshooting

### Playbook Not Matching

**Symptom:** Issue has expected labels but no remediation runs

**Diagnosis:**

- Check trigger labels match exactly
- Review keyword regex patterns
- Verify playbook is enabled

**Resolution:**

- Add missing trigger label
- Fix regex pattern
- Force specific playbook: `--playbook <name>`

### Remediation Failing

**Symptom:** Playbook runs but doesn't fix the issue

**Diagnosis:**

- Check workflow logs for step errors
- Review success criteria
- Verify permissions

**Resolution:**

- Fix failing step command
- Adjust success criteria
- Ensure `GITHUB_TOKEN` has required permissions

### Max Attempts Reached

**Symptom:** "Max attempts reached" message

**Diagnosis:**

- Issue has been remediated 3+ times
- Previous attempts didn't resolve

**Resolution:**

- Use `--force` to bypass limit
- Manual intervention required
- Reset state file if stuck

---

## Integration

### With Auto-Triage

Issues are triaged before remediation:

1. Issue created with `release-blocker`
2. Auto-triage routes to team
3. Auto-remediation attempts fix
4. Team reviews if automated fix fails

### With Escalation

Remediation failures trigger escalation:

1. Playbook executes
2. If `failure_actions` includes `escalate`
3. Issue gets escalation label
4. Appears in digest and handoff

---

## References

- [Auto-Triage Routing](AUTO_TRIAGE_ROUTING.md)
- [Blocker Escalation](BLOCKER_ESCALATION.md)
- [Release Ops Digest](RELEASE_OPS_DIGEST.md)

---

## Change Log

| Date       | Change                           | Author               |
| ---------- | -------------------------------- | -------------------- |
| 2026-01-08 | Initial Auto-Remediation release | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
