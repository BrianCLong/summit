"""Built-in fixtures for FLIA tests and demos."""

from __future__ import annotations

import json
from importlib import resources
from pathlib import Path
from typing import Dict

FIXTURE_FILES = {
    "model_registry": "model_registry.json",
    "feature_catalog": "feature_catalog.json",
    "pipeline_dag": "pipeline_dag.json",
}


def load_fixture(name: str) -> Dict:
    filename = FIXTURE_FILES.get(name)
    if filename is None:
        raise KeyError(f"Unknown fixture: {name}")
    data = resources.files(__name__).joinpath(filename).read_text(encoding="utf-8")
    return json.loads(data)


def export_fixtures(target_dir: Path) -> Dict[str, Path]:
    """Write fixture JSON files to *target_dir* and return their paths."""

    target_dir.mkdir(parents=True, exist_ok=True)
    paths: Dict[str, Path] = {}
    for key, filename in FIXTURE_FILES.items():
        data = resources.files(__name__).joinpath(filename).read_text(encoding="utf-8")
        destination = target_dir / filename
        destination.write_text(data, encoding="utf-8")
        paths[key] = destination
    return paths
