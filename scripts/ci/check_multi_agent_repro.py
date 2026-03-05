from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path


def run_once(task: str, out_dir: Path) -> str:
    subprocess.run(
        [
            "python3",
            "agents/runner/multi_agent_runner.py",
            "--task",
            task,
            "--out",
            str(out_dir),
        ],
        check=True,
    )
    stamp = json.loads((out_dir / "stamp.json").read_text(encoding="utf-8"))
    return stamp["deterministic_hash"]


def main() -> int:
    with tempfile.TemporaryDirectory() as temp_dir:
        root = Path(temp_dir)
        hash_a = run_once("sample", root / "run_a")
        hash_b = run_once("sample", root / "run_b")

    if hash_a != hash_b:
        raise SystemExit("determinism check failed")

    print(f"determinism check passed: {hash_a}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
