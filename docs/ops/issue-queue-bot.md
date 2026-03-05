# Deterministic P0 Queue Bot

## Purpose

The deterministic queue bot labels and orders issue-level P0 candidates using explicit rules only. This enforces repeatable triage for GA-blocker and CI/repro/security incidents while keeping human review in control.

## Workflow

- Workflow: `.github/workflows/issue-queue-bot.yml`
- Triggers:
  - `issues`: `opened`, `edited`, `labeled`, `unlabeled`, `reopened`
  - `workflow_dispatch` with `issue_number`
- Script entrypoint: `.github/scripts/issue-queue-bot/run.cjs`

## Deterministic Rules

Rules are stored in `.github/scripts/issue-queue-bot/rules.json`.

### Candidate Detection

An issue is a candidate when either condition is true:

1. label `P0-candidate` is present
2. body/title contains one of:
   - `GA blocker`
   - `release blocker`
   - `CI gate`
   - `reproducibility`
   - `manifest`
   - `run_id`
   - `supply chain`
   - `deterministic`
   - `security regression`

### Scoring

Score is weighted sum of explicit signals:

- `+40` if label `prio:P0` exists
- `+30` if text contains GA-blocker keywords
- `+20` if label `ga:blocker` exists
- `+15` if one domain label exists (`ci`, `reproducibility`, `security`, `integrity`, `deps`)
- `+10` if issue references failing workflow/check
- `-20` if label `needs-info` or `blocked` exists

Confidence mapping:

- High: `>= 70`
- Medium: `50-69`
- Low: `< 50`

Priority mapping:

- `prio:P0` when confidence is High
- `prio:P1` when confidence is Medium
- no priority label when confidence is Low

### Category Mapping

- `integrity` when text includes `manifest` or `run_id`
- `reproducibility` when text includes `deterministic` or `reproducibility`
- `ci` when text includes `workflow`, `actions`, or `ci`
- `security` when text includes `vuln`, `CVE`, or `RCE`
- fallback: `deps`

## Queue Order

Queue order is deterministic and monotonic, derived from issue number (`queue_order = issue.number`).

## Idempotency

- Labels are diffed before mutation.
- Existing bot payload comment is updated in place using marker `<!-- queue-bot:v1 -->`.
- Re-running with unchanged inputs does not create duplicate comments or label churn.

## Dry Run

Set repository variable `QUEUE_BOT_DRY_RUN=true`.

In dry-run mode, actions are logged without mutating labels/comments.

## Payload Format

```json
{
  "queue_bot": "v1",
  "category": "reproducibility",
  "score": 85,
  "confidence": "high",
  "queue_order": 17,
  "applied_labels": ["prio:P0", "ga:blocker", "queue:deterministic"],
  "issue": 18645
}
```

## Validation

Run local tests:

```bash
node --test .github/scripts/issue-queue-bot/__tests__/*.test.cjs
```
