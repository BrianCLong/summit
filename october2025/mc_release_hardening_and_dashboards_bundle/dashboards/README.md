# Dashboards

These JSONs are importable into Grafana. They assume:
- **Prometheus** scraping CI metrics (via a GitHub Actions exporter) for success ratio and durations.
- **Loki** aggregating CI logs with a `job="ci"` label for flaky detection.

**Files**
- `ci_overview.json` — success ratio, p95 duration, failed runs.
- `pr_health.json` — median PR CI time, open PRs.
- `flaky_tests.json` — table and timeseries of flakes (expects `FLAKY` tag in logs).

**Next steps**
1. Add your exporters: GitHub Actions → Prometheus, CI logs → Loki.
2. Import dashboards, wire datasources, set alerts on thresholds.
