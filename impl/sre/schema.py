import json
from pathlib import Path
from typing import Union, Dict, Any
from .models import Episode

def load_episode(data: Union[str, Path, Dict[str, Any]]) -> Episode:
    """
    Loads an Episode from a JSON string, file path, or dictionary.
    """
    if isinstance(data, (str, Path)):
        # Check if it's a file path
        p = Path(data)
        if p.exists() and p.is_file():
            with open(p, "r") as f:
                content = json.load(f)
        else:
            # Assume it's a JSON string
            content = json.loads(str(data))
    else:
        content = data

    return Episode.model_validate(content)

def validate_episode(episode: Episode) -> bool:
    """
    Validates an Episode object (mostly handled by Pydantic on load).
    Returns True if valid.
    """
    # Additional semantic validation can go here
    return True
