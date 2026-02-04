from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]

FILES_REQUIRED = [
    ROOT / "metrics/sql/001_create_facts_tables.sql",
    ROOT / "metrics/sql/005_enable_rls.sql",
    ROOT / "metrics/prometheus/recording_rules.yml",
    ROOT / "metrics/prometheus/alerting_rules.yml",
]


def read_text(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f"Missing required file: {path}")
    return path.read_text()


def main() -> None:
    ddl = read_text(ROOT / "metrics/sql/001_create_facts_tables.sql")
    rls = read_text(ROOT / "metrics/sql/005_enable_rls.sql")
    recording = read_text(ROOT / "metrics/prometheus/recording_rules.yml")
    alerting = read_text(ROOT / "metrics/prometheus/alerting_rules.yml")

    if "tenant_id" not in ddl:
        raise SystemExit("DDL must include tenant_id for tenant isolation")

    if "ENABLE ROW LEVEL SECURITY" not in rls:
        raise SystemExit("RLS SQL must enable row level security")

    forbidden_labels = ["ts_window_start", "ts_window_end"]
    for label in forbidden_labels:
        if label in recording or label in alerting:
            raise SystemExit(f"Prometheus rules must not include high-cardinality label: {label}")

    print("GMR asset validation passed")


if __name__ == "__main__":
    main()
