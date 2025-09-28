"""Bundle creation logic for the Reproducible Notebook Freezer."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from .utils import (
    dumps_json,
    ensure_clean_dir,
    normalise_output,
    notebook_cells,
    normalize_text,
    sha256_bytes,
    sha256_file,
    utcnow,
    write_json,
)


@dataclass
class DataFingerprint:
    path: str
    sha256: str
    size: int


@dataclass
class CellArtifact:
    index: int
    id: Optional[str]
    execution_count: Optional[int]
    source_hash: str
    artifact_path: Path
    artifact_sha: str
    output_types: List[str]


class NotebookBundler:
    """Create deterministic RNF bundles from notebooks."""

    def __init__(
        self,
        notebook_path: Path,
        bundle_root: Path,
        data_paths: Iterable[Path] | None = None,
    ) -> None:
        self.notebook_path = notebook_path
        self.bundle_root = bundle_root
        self.data_paths = list(data_paths or [])

    def run(self, archive: bool = False) -> Path:
        ensure_clean_dir(self.bundle_root)
        notebook = self._load_notebook()
        self._copy_notebook()
        _, environment_hash = self._capture_environment()
        data_manifest, data_hash = self._fingerprint_data()
        cell_artifacts = self._materialize_artifacts(notebook)
        manifest = self._build_manifest(
            notebook=notebook,
            environment_hash=environment_hash,
            data_manifest=data_manifest,
            data_hash=data_hash,
            artifacts=cell_artifacts,
        )
        manifest_path = self.bundle_root / "manifest.json"
        write_json(manifest_path, manifest)
        self._write_replay_script()
        if archive:
            self._create_archive()
        return manifest_path

    # ------------------------------------------------------------------
    def _load_notebook(self) -> Dict[str, Any]:
        with self.notebook_path.open("r", encoding="utf-8") as handle:
            return json.load(handle)

    def _copy_notebook(self) -> None:
        dest = self.bundle_root / "source" / self.notebook_path.name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(self.notebook_path, dest)

    def _capture_environment(self) -> tuple[str, str]:
        """Capture pip freeze output and write the requirements lock file."""
        try:
            result = subprocess.run(
                [sys.executable, "-m", "pip", "freeze"],
                check=True,
                capture_output=True,
                text=True,
            )
        except subprocess.CalledProcessError as exc:
            raise RuntimeError("Unable to capture pip environment") from exc
        requirements = result.stdout.strip()
        env_dir = self.bundle_root / "environment"
        env_dir.mkdir(parents=True, exist_ok=True)
        lock_file = env_dir / "requirements.lock"
        lock_file.write_text(requirements + "\n", encoding="utf-8")
        return requirements, sha256_bytes(requirements.encode("utf-8"))

    def _fingerprint_data(self) -> tuple[Dict[str, Any], Optional[str]]:
        if not self.data_paths:
            manifest = {"files": [], "sha256": None}
            write_json(self.bundle_root / "data" / "manifest.json", manifest)
            return manifest, None
        entries: List[DataFingerprint] = []
        for path in sorted(self.data_paths):
            if not path.exists():
                raise FileNotFoundError(f"Data path {path} does not exist")
            if path.is_dir():
                for file_path in sorted(path.rglob("*")):
                    if file_path.is_file():
                        entries.append(self._fingerprint_file(path, file_path))
            elif path.is_file():
                entries.append(self._fingerprint_file(path.parent, path))
        serialised = [entry.__dict__ for entry in entries]
        combined_hash = sha256_bytes(dumps_json(serialised).encode("utf-8"))
        data_manifest = {"files": serialised, "sha256": combined_hash}
        write_json(self.bundle_root / "data" / "manifest.json", data_manifest)
        return data_manifest, combined_hash

    def _fingerprint_file(self, base: Path, file_path: Path) -> DataFingerprint:
        rel = file_path.relative_to(base)
        digest = sha256_file(file_path)
        size = file_path.stat().st_size
        return DataFingerprint(path=str(rel).replace("\\", "/"), sha256=digest, size=size)

    def _materialize_artifacts(self, notebook: Dict[str, Any]) -> List[CellArtifact]:
        artifacts_dir = self.bundle_root / "artifacts"
        artifacts_dir.mkdir(parents=True, exist_ok=True)
        cell_artifacts: List[CellArtifact] = []
        for index, cell in notebook_cells(notebook):
            if cell.get("cell_type") != "code":
                continue
            outputs = [normalise_output(item) for item in cell.get("outputs", [])]
            payload = {
                "index": index,
                "id": cell.get("id"),
                "execution_count": cell.get("execution_count"),
                "outputs": outputs,
            }
            content = dumps_json(payload).encode("utf-8")
            sha = sha256_bytes(content)
            filename = artifacts_dir / f"cell-{index:04d}.json"
            filename.write_bytes(content + b"\n")
            cell_artifacts.append(
                CellArtifact(
                    index=index,
                    id=cell.get("id"),
                    execution_count=cell.get("execution_count"),
                    source_hash=sha256_bytes(normalize_text(cell.get("source", "")).encode("utf-8")),
                    artifact_path=filename.relative_to(self.bundle_root),
                    artifact_sha=sha,
                    output_types=[item["type"] for item in outputs],
                )
            )
        return cell_artifacts

    def _build_manifest(
        self,
        notebook: Dict[str, Any],
        environment_hash: str,
        data_manifest: Dict[str, Any],
        data_hash: Optional[str],
        artifacts: List[CellArtifact],
    ) -> Dict[str, Any]:
        notebook_copy = self.bundle_root / "source" / self.notebook_path.name
        notebook_hash = sha256_file(notebook_copy)
        cell_entries = [
            {
                "index": artifact.index,
                "id": artifact.id,
                "execution_count": artifact.execution_count,
                "source_sha256": artifact.source_hash,
                "artifact": {
                    "path": str(artifact.artifact_path).replace("\\", "/"),
                    "sha256": artifact.artifact_sha,
                    "output_types": artifact.output_types,
                },
            }
            for artifact in artifacts
        ]
        cache_payload = {
            "environment": environment_hash,
            "notebook": notebook_hash,
            "data": data_hash,
            "cells": [artifact.source_hash for artifact in artifacts],
        }
        cache_key = sha256_bytes(dumps_json(cache_payload).encode("utf-8"))
        manifest: Dict[str, Any] = {
            "schema_version": 1,
            "created_at": utcnow(),
            "notebook": {
                "path": f"source/{self.notebook_path.name}",
                "sha256": notebook_hash,
                "cell_count": len(list(notebook_cells(notebook))),
            },
            "environment": {
                "path": "environment/requirements.lock",
                "sha256": environment_hash,
            },
            "data": data_manifest,
            "cells": cell_entries,
            "cache_key": cache_key,
        }
        return manifest

    def _write_replay_script(self) -> None:
        script_path = self.bundle_root / "replay.py"
        script_path.write_text(REPLAY_TEMPLATE, encoding="utf-8")

    def _create_archive(self) -> None:
        archive_path = shutil.make_archive(str(self.bundle_root), "zip", root_dir=self.bundle_root)
        # Ensure reproducible timestamp metadata by touching the archive file.
        Path(archive_path).touch()


REPLAY_TEMPLATE = """#!/usr/bin/env python3
\"\"\"RNF bundle replayer.\"\"\"

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tools.notebook_freezer.cli import replay as replay_cmd  # type: ignore  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Replay an RNF bundle")
    parser.add_argument("bundle", nargs="?", default=str(Path(__file__).resolve().parent))
    args = parser.parse_args()
    replay_cmd(Path(args.bundle))


if __name__ == "__main__":
    main()
"""
