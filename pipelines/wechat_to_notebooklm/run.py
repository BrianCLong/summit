from __future__ import annotations

import os
from dataclasses import dataclass

from connectors.notebooklm.cli import build_add_source, build_create_notebook
from ingest.wechat.validate import canonicalize_and_validate


@dataclass(frozen=True)
class Plan:
    canonical_url: str
    commands: list[list[str]]


def plan(url: str, md_path: str, title: str) -> Plan:
    c = canonicalize_and_validate(url)
    cmds = [
        build_create_notebook(title).argv,
        build_add_source("<NOTEBOOK_ID_FROM_CREATE>", md_path).argv,
    ]
    return Plan(canonical_url=c.url, commands=cmds)


def run(url: str, md_path: str, title: str, dry_run: bool = True) -> Plan:
    if os.getenv("WECHAT_TO_NOTEBOOKLM", "0") != "1":
        # deny-by-default: only planning allowed unless explicitly enabled
        dry_run = True
    p = plan(url, md_path, title)
    if dry_run:
        return p
    raise NotImplementedError("TODO: execute commands with redaction + timeouts")
