from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def emit_json(path: Path, obj: Any) -> None:
    """
    Deterministic JSON emitter:
    - sorted keys
    - UTF-8
    - newline at EOF
    - no timestamps (enforced by reviewers + validation)
    """
    text = json.dumps(obj, ensure_ascii=False, sort_keys=True, indent=2)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text + "\n", encoding="utf-8")


def emit_yaml(path: Path, obj: Any) -> None:
    """
    Deterministic YAML emitter:
    - sorted keys
    - UTF-8
    - newline at EOF
    """
    import yaml

    text = yaml.dump(
        obj,
        allow_unicode=True,
        sort_keys=True,
        indent=2,
        default_flow_style=False,
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    if not text.endswith("\n"):
        path.open("a", encoding="utf-8").write("\n")
