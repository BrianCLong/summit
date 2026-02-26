from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class ModuleSpec:
    name: str
    path: Path
    allowed_dependencies: tuple[str, ...]


@dataclass(frozen=True)
class Rules:
    cross_module_requires_event: bool = False


@dataclass(frozen=True)
class ModulithConfig:
    modules: tuple[ModuleSpec, ...]
    rules: Rules

    def module_for_file(self, file_path: Path, repo_root: Path) -> str | None:
        rel = file_path.resolve().relative_to(repo_root.resolve())
        for module in self.modules:
            if rel.as_posix().startswith(module.path.as_posix().rstrip("/") + "/"):
                return module.name
        return None

    def module_for_import(self, import_name: str) -> str | None:
        for module in self.modules:
            module_prefix = module.path.as_posix().replace("/", ".")
            if import_name == module_prefix or import_name.startswith(module_prefix + "."):
                return module.name
        return None

    def allowed(self, src_module: str, target_module: str) -> bool:
        if src_module == target_module:
            return True
        src = next((m for m in self.modules if m.name == src_module), None)
        if src is None:
            return False
        return target_module in src.allowed_dependencies


Violation = dict[str, Any]
