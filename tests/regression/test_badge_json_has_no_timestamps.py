import json
import os
import subprocess
from pathlib import Path


def test_badge_json_has_no_timestamps(tmp_path: Path) -> None:
    output_path = tmp_path / "badge.json"
    env = os.environ.copy()
    env.update(
        {
            "BADGE_LABEL": "sbom",
            "BADGE_MESSAGE": "verified",
            "BADGE_COLOR": "brightgreen",
            "BADGE_OUTPUT": str(output_path),
        }
    )

    subprocess.run(
        ["node", "scripts/ci/write_badge_json.mjs"],
        check=True,
        env=env,
    )

    data = json.loads(output_path.read_text())
    forbidden_keys = {"timestamp", "created_at", "generated_at", "time"}
    assert forbidden_keys.isdisjoint(data.keys())
