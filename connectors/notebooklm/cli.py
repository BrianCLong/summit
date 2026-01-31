from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional


@dataclass(frozen=True)
class CliCommand:
    argv: list[str]


def build_create_notebook(title: str) -> CliCommand:
    return CliCommand(argv=["notebooklm", "create", title, "--json"])


def build_add_source(notebook_id: str, file_path: str) -> CliCommand:
    return CliCommand(
        argv=["notebooklm", "source", "add", file_path, "--notebook", notebook_id, "--json"]
    )


def build_list_sources(notebook_id: str) -> CliCommand:
    return CliCommand(argv=["notebooklm", "source", "list", "--notebook", notebook_id, "--json"])
