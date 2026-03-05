from __future__ import annotations

import argparse
import json
from pathlib import Path

from summit.pkg.unity_adapter import build_package_report


def _load_policy(path: Path) -> dict[str, object]:
    policy: dict[str, object] = {
        "allowed_scopes": [],
        "blocked_registries": [],
        "enforce_https": True,
    }
    raw = path.read_text(encoding="utf-8").splitlines()
    key: str | None = None
    for line in raw:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if stripped.endswith(":"):
            key = stripped[:-1]
            if key in ("allowed_scopes", "blocked_registries"):
                policy[key] = []
            continue
        if stripped.startswith("- ") and key in ("allowed_scopes", "blocked_registries"):
            policy[key].append(stripped[2:].strip())
            continue
        if ":" in stripped:
            left, right = [part.strip() for part in stripped.split(":", 1)]
            if left == "enforce_https":
                policy[left] = right.lower() == "true"
    return policy


def main() -> int:
    parser = argparse.ArgumentParser(description="Scan a Unity package and emit deterministic artifacts.")
    parser.add_argument("manifest", help="Path to Unity package.json")
    parser.add_argument("--policy", default="policies/registry_policy.yaml", help="Path to registry policy YAML")
    parser.add_argument("--out", default="artifacts", help="Output directory")
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    policy = _load_policy(Path(args.policy))
    report, metrics, stamp = build_package_report(args.manifest, policy)

    (out_dir / "package-report.json").write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    (out_dir / "metrics.json").write_text(json.dumps(metrics, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    (out_dir / "stamp.json").write_text(json.dumps(stamp, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
