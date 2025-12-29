from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Dict

DEFAULT_PROMPT_ROOT = Path(".agentic-prompts")


class PromptNotFound(Exception):
    pass


class PromptLoader:
    def __init__(self, root: Path = DEFAULT_PROMPT_ROOT) -> None:
        self.root = root
        manifest_path = root / "manifest.json"
        if not manifest_path.exists():
            raise PromptNotFound(f"Prompt manifest missing at {manifest_path}")
        self.manifest = json.loads(manifest_path.read_text())

    def _template_path(self, family: str, name: str, version: str) -> Path:
        return self.root / family / f"{name}_{version}.prompt"

    def load(self, name: str, version: str | None = None, family: str | None = None) -> str:
        family = family or self.manifest.get("default_family", "core")
        version = version or self.manifest.get("versions", {}).get(family, {}).get(name)
        if not version:
            raise PromptNotFound(f"No version declared for {family}/{name}")
        path = self._template_path(family, name, version)
        if not path.exists():
            raise PromptNotFound(f"Prompt template missing: {path}")
        return path.read_text()

    def render(self, name: str, *, variables: Dict[str, str], version: str | None = None, family: str | None = None) -> str:
        template = self.load(name, version=version, family=family)
        return template.format(**variables)

    def version_for(self, family: str, name: str) -> str:
        return self.manifest.get("versions", {}).get(family, {}).get(name, "")
