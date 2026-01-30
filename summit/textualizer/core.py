from typing import List, Any, Set
import json
import os

TIMESTAMP_KEYS = {
    "timestamp", "created_at", "updated_at", "date", "time", "build_timestamp"
}

# Default sensitive keys based on security practices and fixtures
DEFAULT_SENSITIVE_KEYS = {
    "password", "secret", "api_key", "token", "git_commit",
    "build_pipeline", "approver", "access_key", "canary"
}


def _load_manifest_keys(traj_paths: list[str]) -> Set[str]:
    """
    Attempts to load redaction keys from a manifest.json file located
    in the same directory as the first trajectory file.

    Raises:
        ValueError: If a manifest file exists but cannot be parsed (Fail-Closed).
    """
    if not traj_paths:
        return set()

    first_path = traj_paths[0]
    directory = os.path.dirname(first_path)
    manifest_path = os.path.join(directory, "manifest.json")

    keys = set()
    if os.path.exists(manifest_path):
        try:
            with open(manifest_path, "r") as f:
                data = json.load(f)
                # Support different schema variations found in the repo
                if "never_log_fields" in data:
                    keys.update(data["never_log_fields"])
                if "redact" in data:
                     keys.update(data["redact"])
                if "redactedFields" in data:
                     keys.update(data["redactedFields"])
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse manifest at {manifest_path}: {e}")
        except Exception as e:
            raise ValueError(f"Error loading manifest at {manifest_path}: {e}")

    return keys


def _clean_data(data: Any, redacted_keys: Set[str]) -> Any:
    """
    Recursively cleans data:
    1. Removes timestamp keys.
    2. Redacts sensitive keys.
    """
    if isinstance(data, dict):
        new_dict = {}
        for key, value in data.items():
            if key in TIMESTAMP_KEYS:
                continue

            if key in redacted_keys:
                new_dict[key] = "[REDACTED]"
            else:
                new_dict[key] = _clean_data(value, redacted_keys)
        return new_dict

    if isinstance(data, list):
        # Recursively clean items, but maintain order (critical for trajectories)
        return [_clean_data(item, redacted_keys) for item in data]

    return data


def to_context_pack(traj_paths: list[str]) -> bytes:
    """
    Deterministically converts trajectories into context packs.
    """
    manifest_keys = _load_manifest_keys(traj_paths)
    all_redacted_keys = DEFAULT_SENSITIVE_KEYS.union(manifest_keys)

    trajectories = []

    # Sort paths to ensure deterministic processing order of files
    sorted_paths = sorted(traj_paths)

    for path in sorted_paths:
        if not os.path.exists(path):
            continue

        try:
            with open(path, "r") as f:
                data = json.load(f)
                trajectories.append(data)
        except Exception:
            # Skip invalid files or handle error
            continue

    # Combine
    combined_data = {"trajectories": trajectories}

    # Clean and Redact
    cleaned_data = _clean_data(combined_data, all_redacted_keys)

    # Return as bytes
    return json.dumps(cleaned_data, sort_keys=True).encode("utf-8")
