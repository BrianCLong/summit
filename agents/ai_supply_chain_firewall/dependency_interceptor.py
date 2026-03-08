import hashlib
import json
import re
from typing import List


def is_secret(dependency: str) -> bool:
    """Basic check to avoid logging things that look like secrets/tokens."""
    # This is a very basic heuristic.
    if re.search(r'(?i)(token|key|secret|password|auth)=', dependency):
        return True
    return False

def intercept_dependencies(suggestions: list[str], output_path: str = "suggestions.jsonl"):
    """
    Takes a list of raw AI suggested dependencies, filters out potential secrets,
    hashes the dependency names, and writes them to a JSONL file.
    """
    with open(output_path, "w") as f:
        for dep in suggestions:
            if is_secret(dep):
                continue

            # Simple hash to avoid leaking full dependency contexts or internal names if they slipped through
            hashed_dep = hashlib.sha256(dep.encode('utf-8')).hexdigest()
            f.write(json.dumps({"hash": hashed_dep}) + "\n")
