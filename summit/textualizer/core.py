import json
import os
from typing import List, Any, Dict

def _load_manifest(directory: str) -> Dict[str, Any]:
    manifest_path = os.path.join(directory, "manifest.json")
    if os.path.exists(manifest_path):
        with open(manifest_path, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError as e:
                raise ValueError(f"Failed to parse manifest: {e}")
    return {}

def to_context_pack(traj_paths: list[str]) -> bytes:
    """
    Deterministically converts trajectories into context packs.
    """
    sorted_paths = sorted(traj_paths)
    trajectories = []

    # Heuristic: Load manifest from the directory of the first file
    manifest_fields = set()
    if sorted_paths:
        manifest = _load_manifest(os.path.dirname(sorted_paths[0]))
        manifest_fields.update(manifest.get("never_log_fields", []))

    default_redact = {"secret"}

    for path in sorted_paths:
        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = json.load(f)

                if isinstance(content, dict):
                    # Remove timestamps
                    for key in ['timestamp', 'created_at', 'updated_at', 'date']:
                        if key in content:
                            del content[key]

                    # Redact fields
                    for key in list(content.keys()):
                        if key in default_redact or key in manifest_fields:
                            content[key] = "[REDACTED]"

                trajectories.append(content)
        except json.JSONDecodeError:
            # Skip files that are not valid JSON? Or handle them?
            # The previous implementation had a pass.
            pass
        except Exception as e:
            # Re-raise if it's the manifest error? No, manifest error happens before loop.
            pass

    output = {"trajectories": trajectories}
    return json.dumps(output, sort_keys=True, indent=2).encode('utf-8')
