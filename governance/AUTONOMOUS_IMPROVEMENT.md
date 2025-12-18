# Autonomous Improvement Loop

## Purpose

Run a periodic loop that:

- Scans the repo for deficits.
- Selects and fixes issues autonomously.
- Produces PRs for human or automated merge.

## Loop Steps

1. **Scan**
   - Missing tests, TODOs, flaky tests, weak docs, hotspots.

2. **Analyze**
   - Predictive agent ranks opportunities by impact and risk.

3. **Act**
   - Jules implements prioritized fixes.
   - Codex recaptures historical work when relevant.

4. **Review & Merge**
   - Reviewer evaluates PRs; merges when criteria met.

5. **Learn**
   - Update analytics with outcomes to improve future predictions.
