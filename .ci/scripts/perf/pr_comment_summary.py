import json
import os
import sys
from pathlib import Path
from typing import Any

GITHUB_OUTPUT = os.environ.get("GITHUB_STEP_SUMMARY")
SUMMARY_FILE = Path(os.environ.get("PERF_SUMMARY_FILE", "perf/results/k6-baseline-summary.json"))
COMMENT_PATH = Path("perf/results/pr_comment.md")


def load_summary(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"Summary file not found: {path}")
    with path.open() as handle:
        return json.load(handle)


def format_thresholds(thresholds: dict[str, Any]) -> str:
    lines = []
    for name, result in thresholds.items():
        status = "✅" if result.get("ok") else "❌"
        lines.append(f"- {status} `{name}` ({result.get('actual')}/{result.get('threshold')})")
    return "\n".join(lines)


def summarize() -> str:
    summary = load_summary(SUMMARY_FILE)
    metrics = summary.get("metrics", {})
    thresholds = summary.get("thresholds", {})

    http_duration = metrics.get("http_req_duration", {})
    p95 = http_duration.get("p(95)")
    p99 = http_duration.get("p(99)")
    failure_rate = metrics.get("http_req_failed", {}).get("rate")

    lines = [
        "## Performance summary",
        f"- Requests: {metrics.get('http_reqs', {}).get('count', 'n/a')}",
        f"- p95: {p95} ms | p99: {p99} ms",
        f"- Failure rate: {failure_rate}",
        "### Thresholds",
        format_thresholds(thresholds),
    ]
    return "\n".join(lines)


def write_outputs(body: str) -> None:
    COMMENT_PATH.parent.mkdir(parents=True, exist_ok=True)
    COMMENT_PATH.write_text(body)

    if GITHUB_OUTPUT:
        with open(GITHUB_OUTPUT, "a", encoding="utf-8") as handle:
            handle.write(body + "\n")


def main() -> None:
    try:
        body = summarize()
    except Exception as exc:
        print(f"Failed to summarize: {exc}", file=sys.stderr)
        sys.exit(1)

    write_outputs(body)
    print(body)


if __name__ == "__main__":
    main()
