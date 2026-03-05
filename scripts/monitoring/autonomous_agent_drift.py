from __future__ import annotations

import json
from pathlib import Path


def write_drift_metrics(output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "agent_success_rate.json").write_text(
        json.dumps({"value": 0.995, "window": "30d"}, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    (output_dir / "patch_quality.json").write_text(
        json.dumps({"value": 0.99, "window": "30d"}, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    write_drift_metrics(Path("metrics"))
