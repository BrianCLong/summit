import os
import json
from typing import Dict, Any, List

def check_flag_enablement(config: Dict[str, Any], evidence_manifest: Dict[str, Any]) -> List[str]:
    """
    Returns a list of violation messages.
    Rule: If continual_learning_enabled or merge_training_enabled is True,
    there MUST be corresponding Evidence IDs in the config or manifest
    proving safety regression and split-brain eval pass.
    """
    violations = []

    innovation_flags = ["continual_learning_enabled", "merge_training_enabled"]

    for flag in innovation_flags:
        if config.get(flag, False):
            # Check for evidence
            # We look for a specific evidence key in the config or manifest
            # e.g., "continual_learning_evidence_id"
            evidence_key = f"{flag}_evidence_id"
            evd_id = config.get(evidence_key)

            if not evd_id:
                violations.append(f"Flag '{flag}' is enabled but no '{evidence_key}' provided.")
            else:
                # Validate existence in manifest (index.json)
                found = False
                if isinstance(evidence_manifest, list):
                     for entry in evidence_manifest:
                         if entry.get("evd_id") == evd_id:
                             found = True
                             break
                if not found:
                    violations.append(f"Evidence ID '{evd_id}' for '{flag}' not found in index.")

    return violations
