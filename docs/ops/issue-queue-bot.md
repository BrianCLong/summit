# Deterministic P0 Queue Bot

This bot implements an automated, deterministic labeling and queueing system for P0 candidates in the Summit repository.
It ensures that critical issues are properly triaged, scored, and categorized without heuristic drift.

## Overview

The bot listens to issue events (opened, edited, labeled, unlabeled, reopened) and determines if the issue is a P0 candidate based on:
1. The presence of the label `P0-candidate`.
2. The presence of specific keywords in the title or body (e.g., "GA blocker", "release blocker", "CI gate", etc.).

## Deterministic Scoring

The bot calculates a score based purely on explicit signals:
- `+40` if label `prio:P0` exists
- `+30` if text contains any GA-blocker keyword
- `+20` if label `ga:blocker`
- `+15` if label `ci`, `reproducibility`, `security`, or similar.
- `+10` if issue references a failing workflow or check name (e.g., `.yml`, `workflow`, `gate`)
- `-20` if label `needs-info` or `blocked`

## Confidence Tiers

- **High:** Score >= 70
- **Medium:** 50 - 69
- **Low:** < 50

## Categorization

- **integrity:** contains "manifest" or "run_id"
- **reproducibility:** contains "deterministic" or "reproducibility"
- **ci:** contains "workflow", "actions", or "CI"
- **security:** contains "vuln", "CVE", "RCE"
- **deps/other:** otherwise

## Outputs

When triggered, the bot calculates the above and:
1. Applies appropriate labels (`prio:P0` or `prio:P1`, `ga:blocker`, `queue:deterministic`, `needs-triage`).
2. Posts a deterministic JSON payload as a comment with the calculated score, confidence, category, queue order, and applied labels.

## Testing & Dry Run

- The bot logic is fully unit tested in `.github/scripts/issue-queue-bot/__tests__/`.
- To run without making mutations, trigger the workflow with the `DRY_RUN=true` environment variable.
