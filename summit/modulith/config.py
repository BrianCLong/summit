from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml


@dataclass(frozen=True)
class ModuleSpec:
    name: str
    path: Path
    import_prefix: str
    allowed_dependencies: tuple[str, ...]


@dataclass(frozen=True)
class RuleSpec:
    cross_module_requires_event: bool = False


@dataclass(frozen=True)
class ModulithConfig:
    modules: dict[str, ModuleSpec]
    rules: RuleSpec

    def module_for_file(self, file_path: Path) -> str | None:
        resolved = file_path.resolve()
        for module in self.modules.values():
            module_root = module.path.resolve()
            if resolved == module_root or module_root in resolved.parents:
                return module.name
        return None

    def module_for_import(self, import_name: str) -> str | None:
        for module in self.modules.values():
            if import_name == module.import_prefix or import_name.startswith(f"{module.import_prefix}."):
                return module.name
        return None



def _path_to_prefix(path: Path) -> str:
    return ".".join(path.parts)


def load_config(config_path: Path, repo_root: Path) -> ModulithConfig:
    payload = yaml.safe_load(config_path.read_text(encoding="utf-8")) or {}
    modules_payload: dict[str, Any] = payload.get("modules", {})
    rules_payload: dict[str, Any] = payload.get("rules", {})

    modules: dict[str, ModuleSpec] = {}
    for module_name, module_data in sorted(modules_payload.items()):
        rel_path = Path(module_data["path"])
        module_path = (repo_root / rel_path).resolve()
        modules[module_name] = ModuleSpec(
            name=module_name,
            path=module_path,
            import_prefix=_path_to_prefix(rel_path),
            allowed_dependencies=tuple(sorted(module_data.get("allowed_dependencies", []))),
        )

    return ModulithConfig(
        modules=modules,
        rules=RuleSpec(cross_module_requires_event=bool(rules_payload.get("cross_module_requires_event", False))),
    )
