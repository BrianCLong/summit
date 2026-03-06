from __future__ import annotations

import os
from pathlib import Path

from .config import load_config
from .reporter import write_artifacts
from .scanner import scan_import_edges
from .verifier import verify_edges


def run(config_path: Path | None = None, output_dir: Path | None = None, source_root: Path | None = None) -> int:
    if os.getenv("ENABLE_MODULITH", "false").lower() != "true":
        return 0

    root = Path.cwd() if source_root is None else source_root
    config_file = config_path or (root / "config/modules.yaml")
    artifact_dir = output_dir or (root / "artifacts/modulith")

    config = load_config(config_file)

    source_module_for: dict[Path, str] = {}
    python_files: list[Path] = []
    module_paths = {name: rule.path for name, rule in config.modules.items()}
    for module_name, module in module_paths.items():
        for file_path in sorted(module.glob("**/*.py")):
            if file_path.is_file():
                python_files.append(file_path)
                source_module_for[file_path] = module_name

    edges = scan_import_edges(module_paths, python_files, source_module_for)
    violations = verify_edges(edges, config)
    write_artifacts(artifact_dir, config_file, python_files, violations)
    return 1 if violations else 0
