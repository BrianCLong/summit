from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml


@dataclass(frozen=True)
class ModuleRule:
    name: str
    path: Path
    allowed_dependencies: tuple[str, ...]


@dataclass(frozen=True)
class ModulithConfig:
    modules: dict[str, ModuleRule]
    cross_module_requires_event: bool

    def module_for_path(self, file_path: Path) -> str | None:
        resolved = file_path.resolve()
        for module in sorted(self.modules.values(), key=lambda item: len(str(item.path)), reverse=True):
            if resolved.is_relative_to(module.path):
                return module.name
        return None

    def allowed_dependencies_for(self, module_name: str) -> set[str]:
        rule = self.modules[module_name]
        return set(rule.allowed_dependencies)


def _normalize_module(base_dir: Path, name: str, raw: dict[str, Any]) -> ModuleRule:
    if "path" not in raw:
        raise ValueError(f"module '{name}' is missing required 'path'")
    raw_allowed = raw.get("allowed_dependencies", [])
    if not isinstance(raw_allowed, list):
        raise ValueError(f"module '{name}' has non-list 'allowed_dependencies'")
    return ModuleRule(
        name=name,
        path=(base_dir / raw["path"]).resolve(),
        allowed_dependencies=tuple(sorted(str(item) for item in raw_allowed)),
    )


def load_config(config_path: Path) -> ModulithConfig:
    with config_path.open("r", encoding="utf-8") as handle:
        payload = yaml.safe_load(handle) or {}

    modules_raw = payload.get("modules")
    if not isinstance(modules_raw, dict) or not modules_raw:
        raise ValueError("modules.yaml must define non-empty 'modules' map")

    base_dir = config_path.parent.parent.resolve()
    modules = {
        str(name): _normalize_module(base_dir, str(name), raw)
        for name, raw in sorted(modules_raw.items(), key=lambda item: item[0])
    }

    for module_name, module in modules.items():
        invalid = [dep for dep in module.allowed_dependencies if dep not in modules or dep == module_name]
        if invalid:
            raise ValueError(f"module '{module_name}' has invalid dependency declarations: {invalid}")

    rules = payload.get("rules", {})
    cross_module_requires_event = bool(rules.get("cross_module_requires_event", True))
    return ModulithConfig(modules=modules, cross_module_requires_event=cross_module_requires_event)
