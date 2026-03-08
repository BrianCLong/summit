from __future__ import annotations

from pathlib import Path

import yaml

from summit.modulith.schemas import ModuleSpec, ModulithConfig, Rules


class ConfigError(ValueError):
    pass


def load_config(path: Path) -> ModulithConfig:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ConfigError("modules.yaml must contain an object at root")

    modules_raw = data.get("modules")
    if not isinstance(modules_raw, dict) or not modules_raw:
        raise ConfigError("modules must be a non-empty mapping")

    modules: list[ModuleSpec] = []
    for name, payload in modules_raw.items():
        if not isinstance(payload, dict):
            raise ConfigError(f"module {name} must be an object")
        module_path = payload.get("path")
        if not isinstance(module_path, str) or not module_path:
            raise ConfigError(f"module {name} must define a non-empty path")
        allowed = payload.get("allowed_dependencies", [])
        if not isinstance(allowed, list) or any(not isinstance(item, str) for item in allowed):
            raise ConfigError(f"module {name} allowed_dependencies must be string array")

        modules.append(
            ModuleSpec(
                name=name,
                path=Path(module_path),
                allowed_dependencies=tuple(sorted(set(allowed))),
            )
        )

    rules_payload = data.get("rules", {})
    if not isinstance(rules_payload, dict):
        raise ConfigError("rules must be an object")

    rules = Rules(
        cross_module_requires_event=bool(rules_payload.get("cross_module_requires_event", False))
    )
    return ModulithConfig(modules=tuple(sorted(modules, key=lambda m: m.name)), rules=rules)
