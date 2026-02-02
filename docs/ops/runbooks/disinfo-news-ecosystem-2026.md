# Disinfo News Ecosystem 2026 Runbook

## How to run analyzer CLI

```bash
pnpm disinfo:analyze --input <path_to_bundle.json> --out <output_directory>
```

Example:
```bash
pnpm disinfo:analyze --input fixtures/disinfo/sample_bundle.json --out artifacts/disinfo/manual_run_01
```

## How to interpret `report.json` risk fields

- **`risk_score`**: 0.0 to 1.0.
  - < 0.3: Low Risk.
  - 0.3 - 0.7: Medium Risk (Requires review).
  - > 0.7: High Risk (Automated mitigation suggested).

- **`signals.content.sensationalism_score`**: % of items with clickbait/sensationalist language.
- **`signals.provenance.has_missing_credentials`**: Boolean. True if any media item lacks C2PA/Content Credentials.
- **`signals.network.coordinated_sharing_events`**: Count of detected synchronized sharing events.

## What to do on drift alerts

If the `disinfo-news-ecosystem-drift` job fails:
1. Check `artifacts/disinfo/drift_check/metrics.json`.
2. Compare with baseline.
3. If `elapsed_ms` spike: Investigate logic changes in `analyzer.ts` or `network.ts`.
4. If `rss_mb_est` spike: Check for memory leaks in graph construction.
5. Rollback to previous version if strictly blocking release.

## SLO assumptions

- **Latency**: < 3s per bundle (local).
- **Availability**: Best-effort (offline tool).
- **Accuracy**: Heuristic-based; not guaranteed.

## Alert wiring points

- Alerts are currently logged to console in CI.
- Future integration: `alerting/` module can consume `metrics.json` via log shipping.
