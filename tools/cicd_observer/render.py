from typing import Any, Dict


def render_markdown(metrics: dict[str, Any]) -> str:
    md = "# CI/CD Automation Report\n\n"
    md += f"**Total Runs:** {metrics.get('total_runs', 0)}\n"
    md += f"**Success Rate:** {metrics.get('success_rate', 0):.2%}\n"
    md += f"**p50 Duration:** {metrics.get('durations_ms', {}).get('p50', 0) / 1000:.2f}s\n"
    md += f"**p95 Duration:** {metrics.get('durations_ms', {}).get('p95', 0) / 1000:.2f}s\n"
    md += f"**Flake Count:** {metrics.get('flake_count', 0)}\n"

    if metrics.get('flake_shas'):
        md += "\n### Detected Flaky SHAs\n"
        for sha in metrics['flake_shas']:
            md += f"- `{sha}`\n"

    return md

def render_report_json(metrics: dict[str, Any]) -> dict[str, Any]:
    return {
        "report_v1": {
            "summary": metrics,
            "status": "stable" if metrics.get('success_rate', 0) > 0.9 else "degraded"
        }
    }
