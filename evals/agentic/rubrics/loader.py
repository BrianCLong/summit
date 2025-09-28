import yaml
import os
from typing import Dict, Any

def load_rubric(rubric_name: str) -> Dict[str, Any]:
    """
    Loads a rubric YAML file by name.
    """
    rubric_path = os.path.join(os.path.dirname(__file__), f"{rubric_name}.yaml")
    if not os.path.exists(rubric_path):
        raise FileNotFoundError(f"Rubric file not found: {rubric_path}")
    with open(rubric_path, "r") as f:
        return yaml.safe_load(f)
