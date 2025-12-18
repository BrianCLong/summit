from __future__ import annotations
from dataclasses import dataclass
from .. import tools


@dataclass
class PRResult:
    created: bool
    merged: bool
    notes: list[str]


class PRManager:
    def prepare_and_optionally_merge(self, title: str, body: str, branch: str, auto_merge: bool) -> PRResult:
        notes: list[str] = []
        tools.create_pr(branch=branch, title=title, body=body, meta={})
        notes.append(f"PR stub created on branch {branch}.")
        merged = False
        if auto_merge:
            tools.merge_pr()
            merged = True
            notes.append("PR stub merged.")
        return PRResult(created=True, merged=merged, notes=notes)
