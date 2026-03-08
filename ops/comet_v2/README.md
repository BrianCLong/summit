# Comet v2 Triage Automation

This directory contains tools for automating the triage of Comet v2 tasks.

## Worklist Generation

The `generate_worklist.py` script parses `tracking_issue.md` (which mirrors the GitHub tracking issue) and generates `worklist.json`.

### Scores
- **0 (Blocked):** Task is blocked.
- **1 (Ready for Implementation):** Task is open and not blocked.
- **2 (Ready for Review):** PR is open or "Ready for Review" is detected.
- **3 (Completed):** Task is checked off.

### Usage
Run the script to update the worklist:
```bash
python3 ops/comet_v2/generate_worklist.py
```

## Agentic Triage Integration

The `scripts/ops/pr_triage.ts` script consumes `worklist.json` to prioritize PRs in the "Ready Queue".
Run with:
```bash
npx tsx scripts/ops/pr_triage.ts --ready
```
