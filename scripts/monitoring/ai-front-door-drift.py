from __future__ import annotations

import json
from pathlib import Path


def build_drift_report(current: dict[str, int], baseline: dict[str, int]) -> dict[str, object]:
    keys = sorted(set(current) | set(baseline))
    delta = {key: current.get(key, 0) - baseline.get(key, 0) for key in keys}
    return {
        'schema_version': '1.0',
        'current': {key: current.get(key, 0) for key in keys},
        'baseline': {key: baseline.get(key, 0) for key in keys},
        'delta': delta,
    }


def main() -> None:
    baseline_path = Path('artifacts/ai_front_door/baseline_metrics.json')
    current_path = Path('artifacts/ai_front_door/current_metrics.json')
    out_path = Path('artifacts/ai_front_door/drift_report.json')

    baseline = json.loads(baseline_path.read_text(encoding='utf-8')) if baseline_path.exists() else {}
    current = json.loads(current_path.read_text(encoding='utf-8')) if current_path.exists() else {}

    report = build_drift_report(current=current, baseline=baseline)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, indent=2, sort_keys=True) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
