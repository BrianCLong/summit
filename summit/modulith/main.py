from __future__ import annotations

import argparse
import os
from pathlib import Path

from .config import load_config
from .reporter import build_input_hash, write_artifacts
from .scanner import scan_import_edges
from .verifier import verify_edges



def run(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Summit Modulith verifier")
    parser.add_argument("--config", default="config/modules.yaml")
    parser.add_argument("--artifacts-dir", default="artifacts/modulith")
    parser.add_argument("--repo-root", default=".")
    args = parser.parse_args(argv)

    enabled = os.getenv("ENABLE_MODULITH", "false").lower() == "true"

    repo_root = Path(args.repo_root).resolve()
    config_path = (repo_root / args.config).resolve()
    artifacts_dir = (repo_root / args.artifacts_dir).resolve()

    if not enabled:
        write_artifacts(
            artifacts_dir=artifacts_dir,
            violations=[],
            edges=[],
            input_hash="sha256:disabled",
            enabled=False,
        )
        return 0

    config_text = config_path.read_text(encoding="utf-8")
    config = load_config(config_path=config_path, repo_root=repo_root)
    edges = scan_import_edges(config)
    violations = verify_edges(edges, config)
    input_hash = build_input_hash(config_text=config_text, edges=edges)

    write_artifacts(
        artifacts_dir=artifacts_dir,
        violations=violations,
        edges=edges,
        input_hash=input_hash,
        enabled=True,
    )

    return 1 if violations else 0
