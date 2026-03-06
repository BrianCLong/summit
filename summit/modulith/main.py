from __future__ import annotations

import argparse
import os
from pathlib import Path

from summit.modulith.config import ConfigError, load_config
from summit.modulith.reporter import write_artifacts
from summit.modulith.scanner import scan_imports
from summit.modulith.verifier import verify


def run(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Summit modulith boundary verifier")
    parser.add_argument("--config", default="config/modules.yaml")
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--out-dir", default="artifacts/modulith")
    args = parser.parse_args(argv)

    if os.getenv("ENABLE_MODULITH", "false").lower() not in {"1", "true", "yes", "on"}:
        return 0

    config_path = Path(args.config)
    repo_root = Path(args.repo_root)
    out_dir = Path(args.out_dir)

    try:
        config = load_config(config_path)
    except (OSError, ConfigError) as exc:
        parser.error(str(exc))

    edges, dynamic_candidates = scan_imports(repo_root, config)
    violations = verify(edges, dynamic_candidates, config)
    write_artifacts(out_dir, config=config, config_path=config_path, edges=edges, violations=violations)

    return 1 if violations else 0


if __name__ == "__main__":
    raise SystemExit(run())
