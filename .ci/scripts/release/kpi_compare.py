#!/usr/bin/env python3
"""
KPI Comparison Script

Compares key performance indicators (KPIs) 24 hours after a release
and automatically opens issues for regressions.

Usage:
    python kpi_compare.py --version 1.2.3 --baseline-version 1.2.2
"""

import argparse
import json
import os
import subprocess
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from urllib.parse import urlencode
from urllib.request import Request, urlopen


@dataclass
class KPIMetric:
    name: str
    current: float
    baseline: float
    threshold: float
    unit: str
    direction: str  # 'lower' or 'higher' is better

    @property
    def delta(self) -> float:
        return self.current - self.baseline

    @property
    def delta_percent(self) -> float:
        if self.baseline == 0:
            return 0
        return ((self.current - self.baseline) / self.baseline) * 100

    @property
    def is_regression(self) -> bool:
        if self.direction == "lower":
            return self.delta_percent > self.threshold
        else:
            return self.delta_percent < -self.threshold


@dataclass
class KPIReport:
    version: str
    baseline_version: str
    generated_at: str
    metrics: list
    regressions: list
    improvements: list


def query_prometheus(query: str, time: datetime | None = None) -> float | None:
    """Query Prometheus for a metric value."""
    prometheus_url = os.environ.get(
        "PROMETHEUS_URL", "http://prometheus.monitoring.svc.cluster.local:9090"
    )

    params = {"query": query}
    if time:
        params["time"] = time.isoformat() + "Z"

    url = f"{prometheus_url}/api/v1/query?{urlencode(params)}"

    try:
        req = Request(url)
        with urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode())
            if data["status"] == "success" and data["data"]["result"]:
                return float(data["data"]["result"][0]["value"][1])
    except Exception as e:
        print(f"Error querying Prometheus: {e}", file=sys.stderr)

    return None


def get_error_rate(version: str, time: datetime | None = None) -> float:
    """Get error rate for a specific version."""
    query = f"""
    sum(rate(http_requests_total{{status=~"5..",version="{version}"}}[1h]))
    /
    sum(rate(http_requests_total{{version="{version}"}}[1h]))
    * 100
    """
    result = query_prometheus(query.strip(), time)
    return result if result is not None else 0.0


def get_p95_latency(version: str, time: datetime | None = None) -> float:
    """Get P95 latency for a specific version."""
    query = f"""
    histogram_quantile(0.95,
        sum(rate(http_request_duration_seconds_bucket{{version="{version}"}}[1h])) by (le)
    ) * 1000
    """
    result = query_prometheus(query.strip(), time)
    return result if result is not None else 0.0


def get_p99_latency(version: str, time: datetime | None = None) -> float:
    """Get P99 latency for a specific version."""
    query = f"""
    histogram_quantile(0.99,
        sum(rate(http_request_duration_seconds_bucket{{version="{version}"}}[1h])) by (le)
    ) * 1000
    """
    result = query_prometheus(query.strip(), time)
    return result if result is not None else 0.0


def get_throughput(version: str, time: datetime | None = None) -> float:
    """Get request throughput for a specific version."""
    query = f"""
    sum(rate(http_requests_total{{version="{version}"}}[1h]))
    """
    result = query_prometheus(query.strip(), time)
    return result if result is not None else 0.0


def get_cpu_usage(version: str, time: datetime | None = None) -> float:
    """Get CPU usage for a specific version."""
    query = f"""
    avg(rate(container_cpu_usage_seconds_total{{version="{version}"}}[5m])) * 100
    """
    result = query_prometheus(query.strip(), time)
    return result if result is not None else 0.0


def get_memory_usage(version: str, time: datetime | None = None) -> float:
    """Get memory usage in MB for a specific version."""
    query = f"""
    avg(container_memory_working_set_bytes{{version="{version}"}}) / 1024 / 1024
    """
    result = query_prometheus(query.strip(), time)
    return result if result is not None else 0.0


def collect_kpis(version: str, baseline_version: str) -> list:
    """Collect all KPI metrics for comparison."""
    now = datetime.utcnow()

    metrics = [
        KPIMetric(
            name="Error Rate",
            current=get_error_rate(version, now),
            baseline=get_error_rate(baseline_version, now - timedelta(days=1)),
            threshold=50,  # 50% increase is a regression
            unit="%",
            direction="lower",
        ),
        KPIMetric(
            name="P95 Latency",
            current=get_p95_latency(version, now),
            baseline=get_p95_latency(baseline_version, now - timedelta(days=1)),
            threshold=20,  # 20% increase is a regression
            unit="ms",
            direction="lower",
        ),
        KPIMetric(
            name="P99 Latency",
            current=get_p99_latency(version, now),
            baseline=get_p99_latency(baseline_version, now - timedelta(days=1)),
            threshold=25,  # 25% increase is a regression
            unit="ms",
            direction="lower",
        ),
        KPIMetric(
            name="Throughput",
            current=get_throughput(version, now),
            baseline=get_throughput(baseline_version, now - timedelta(days=1)),
            threshold=20,  # 20% decrease is a regression
            unit="req/s",
            direction="higher",
        ),
        KPIMetric(
            name="CPU Usage",
            current=get_cpu_usage(version, now),
            baseline=get_cpu_usage(baseline_version, now - timedelta(days=1)),
            threshold=30,  # 30% increase is a regression
            unit="%",
            direction="lower",
        ),
        KPIMetric(
            name="Memory Usage",
            current=get_memory_usage(version, now),
            baseline=get_memory_usage(baseline_version, now - timedelta(days=1)),
            threshold=25,  # 25% increase is a regression
            unit="MB",
            direction="lower",
        ),
    ]

    return metrics


def get_codeowner(metric_name: str) -> str:
    """Get the CODEOWNER for a specific metric area."""
    # Map metrics to team owners
    owners = {
        "Error Rate": "@platform-team",
        "P95 Latency": "@backend-team",
        "P99 Latency": "@backend-team",
        "Throughput": "@sre-team",
        "CPU Usage": "@sre-team",
        "Memory Usage": "@sre-team",
    }
    return owners.get(metric_name, "@platform-team")


def create_regression_issue(
    version: str,
    baseline_version: str,
    metric: KPIMetric,
) -> str | None:
    """Create a GitHub issue for a regression."""
    gh_token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    repo = os.environ.get("GITHUB_REPOSITORY", "brianclong/summit")

    if not gh_token:
        print("No GitHub token available, skipping issue creation", file=sys.stderr)
        return None

    owner = get_codeowner(metric.name)

    title = f"[KPI Regression] {metric.name} degraded after v{version} release"

    body = f"""## KPI Regression Detected

**Metric**: {metric.name}
**Version**: v{version}
**Baseline Version**: v{baseline_version}
**Detected At**: {datetime.utcnow().isoformat()}Z

### Values
| | Value | Change |
|---|---|---|
| Baseline | {metric.baseline:.2f} {metric.unit} | - |
| Current | {metric.current:.2f} {metric.unit} | {metric.delta_percent:+.1f}% |
| Threshold | {metric.threshold}% | - |

### Impact
This metric has degraded beyond the acceptable threshold of {metric.threshold}%.

### Recommended Actions
1. Review recent changes in v{version}
2. Check relevant dashboards for anomalies
3. Consider rollback if SLO is breached

### Assignee
{owner}

### Links
- [Release v{version}](https://github.com/{repo}/releases/tag/v{version})
- [Grafana Dashboard](https://grafana.intelgraph.io/d/kpi-overview)

---
*This issue was automatically created by the post-release KPI check.*
"""

    try:
        result = subprocess.run(
            [
                "gh",
                "issue",
                "create",
                "--repo",
                repo,
                "--title",
                title,
                "--body",
                body,
                "--label",
                "kpi-regression,release,automated",
            ],
            capture_output=True,
            text=True,
        )

        if result.returncode == 0:
            issue_url = result.stdout.strip()
            print(f"Created issue: {issue_url}")
            return issue_url
        else:
            print(f"Failed to create issue: {result.stderr}", file=sys.stderr)
            return None
    except Exception as e:
        print(f"Error creating issue: {e}", file=sys.stderr)
        return None


def generate_report(
    version: str,
    baseline_version: str,
    metrics: list,
) -> KPIReport:
    """Generate a KPI comparison report."""
    regressions = [m for m in metrics if m.is_regression]
    improvements = [
        m
        for m in metrics
        if not m.is_regression and abs(m.delta_percent) > 5  # Only note significant improvements
    ]

    return KPIReport(
        version=version,
        baseline_version=baseline_version,
        generated_at=datetime.utcnow().isoformat() + "Z",
        metrics=[asdict(m) for m in metrics],
        regressions=[asdict(m) for m in regressions],
        improvements=[asdict(m) for m in improvements],
    )


def print_report(report: KPIReport):
    """Print the KPI report in a readable format."""
    print("\n" + "=" * 60)
    print("KPI Comparison Report")
    print(f"Version: v{report.version} vs v{report.baseline_version}")
    print(f"Generated: {report.generated_at}")
    print("=" * 60 + "\n")

    print("Metrics Summary:")
    print("-" * 60)
    print(f"{'Metric':<20} {'Baseline':>12} {'Current':>12} {'Change':>12}")
    print("-" * 60)

    for m in report.metrics:
        status = "REGRESSION" if m["is_regression"] else ""
        print(
            f"{m['name']:<20} {m['baseline']:>10.2f}{m['unit']:>2} {m['current']:>10.2f}{m['unit']:>2} {m['delta_percent']:>+10.1f}% {status}"
        )

    print("-" * 60)

    if report.regressions:
        print(f"\nRegressions: {len(report.regressions)}")
        for r in report.regressions:
            print(f"  - {r['name']}: {r['delta_percent']:+.1f}% (threshold: {r['threshold']}%)")
    else:
        print("\nNo regressions detected")

    if report.improvements:
        print(f"\nImprovements: {len(report.improvements)}")
        for i in report.improvements:
            print(f"  - {i['name']}: {i['delta_percent']:+.1f}%")

    print()


def output_github_actions(report: KPIReport):
    """Output results for GitHub Actions."""
    github_output = os.environ.get("GITHUB_OUTPUT")

    if github_output:
        with open(github_output, "a") as f:
            f.write(f"regression_count={len(report.regressions)}\n")
            f.write(f"improvement_count={len(report.improvements)}\n")
            f.write(f"has_regressions={'true' if report.regressions else 'false'}\n")

    # Write summary
    github_summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if github_summary:
        with open(github_summary, "a") as f:
            f.write(f"## KPI Report: v{report.version}\n\n")

            f.write("| Metric | Baseline | Current | Change | Status |\n")
            f.write("|--------|----------|---------|--------|--------|\n")

            for m in report.metrics:
                status = "Regression" if m["is_regression"] else "OK"
                f.write(
                    f"| {m['name']} | {m['baseline']:.2f} {m['unit']} | {m['current']:.2f} {m['unit']} | {m['delta_percent']:+.1f}% | {status} |\n"
                )

            f.write("\n")

            if report.regressions:
                f.write(f"**Regressions Found**: {len(report.regressions)}\n\n")


def main():
    parser = argparse.ArgumentParser(description="Compare KPIs between release versions")
    parser.add_argument("--version", required=True, help="Current version to analyze")
    parser.add_argument(
        "--baseline-version",
        help="Baseline version to compare against (defaults to previous release)",
    )
    parser.add_argument(
        "--create-issues",
        action="store_true",
        help="Create GitHub issues for regressions",
    )
    parser.add_argument(
        "--output",
        choices=["text", "json", "github"],
        default="text",
        help="Output format",
    )

    args = parser.parse_args()

    # Determine baseline version if not specified
    baseline_version = args.baseline_version
    if not baseline_version:
        # Try to get previous release tag
        try:
            result = subprocess.run(
                ["git", "tag", "-l", "v*", "--sort=-v:refname"],
                capture_output=True,
                text=True,
            )
            tags = [t for t in result.stdout.strip().split("\n") if t and "rc." not in t]
            current_idx = next((i for i, t in enumerate(tags) if t == f"v{args.version}"), -1)
            if current_idx >= 0 and current_idx + 1 < len(tags):
                baseline_version = tags[current_idx + 1].lstrip("v")
        except Exception:
            pass

        if not baseline_version:
            print("Could not determine baseline version", file=sys.stderr)
            sys.exit(1)

    print(f"Comparing v{args.version} against baseline v{baseline_version}")

    # Collect metrics
    metrics = collect_kpis(args.version, baseline_version)

    # Generate report
    report = generate_report(args.version, baseline_version, metrics)

    # Output
    if args.output == "json":
        print(json.dumps(asdict(report), indent=2))
    elif args.output == "github":
        output_github_actions(report)
        print_report(report)
    else:
        print_report(report)

    # Create issues for regressions
    if args.create_issues:
        regressions = [m for m in metrics if m.is_regression]
        for metric in regressions:
            create_regression_issue(args.version, baseline_version, metric)

    # Exit with error if regressions found
    if report.regressions:
        sys.exit(1)


if __name__ == "__main__":
    main()
