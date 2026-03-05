from __future__ import annotations

import json
from pathlib import Path


def main() -> int:
    history_path = Path("artifacts/ai_front_door/history.json")
    output_path = Path("artifacts/ai_front_door/drift_report.json")

    if not history_path.exists():
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps({"status": "no_data", "drift": 0.0}, indent=2) + "\n")
        return 0

    history = json.loads(history_path.read_text())
    allow_rates = [float(item.get("allow_rate", 0.0)) for item in history]
    if len(allow_rates) < 2:
        drift = 0.0
    else:
        drift = round(allow_rates[-1] - allow_rates[-2], 4)

    report = {
        "status": "ok",
        "runs": len(allow_rates),
        "latest_allow_rate": allow_rates[-1] if allow_rates else 0.0,
        "drift": drift,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
