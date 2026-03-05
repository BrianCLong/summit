from __future__ import annotations

import json
from pathlib import Path

from agents.patcher.git_interface import FilePatch


class DeterministicPatchEngine:
    def build_patch_stack(self, patches: list[FilePatch], run_id: str) -> list[dict[str, str]]:
        stack: list[dict[str, str]] = []
        for index, patch in enumerate(sorted(patches, key=lambda item: item.target_file), start=1):
            evidence_id = f"EV-{run_id}-PATCH-{index:03d}"
            stack.append(
                {
                    "patch_id": f"PATCH-{index:03d}",
                    "target_file": patch.target_file,
                    "diff": patch.diff,
                    "evidence_id": evidence_id,
                }
            )
        return stack

    def write_artifact(self, stack: list[dict[str, str]], output_path: Path) -> None:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(
            json.dumps({"patches": stack}, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
