from pathlib import Path
from typing import Any, Dict, Union

import yaml


def load_prompt_artifact(path: Union[str, Path]) -> dict[str, Any]:
    """Load a prompt artifact from a YAML file."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Prompt artifact not found: {path}")

    with path.open("r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    return data
