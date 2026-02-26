import yaml
import os
from pathlib import Path
from typing import Optional, List
from summit.modulith.schemas import ModulithConfig

def load_config(config_path: str = "config/modules.yaml") -> ModulithConfig:
    """Load and validate the modulith configuration."""
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Configuration file not found: {config_path}")

    with open(config_path, "r") as f:
        config_data = yaml.safe_load(f)

    return ModulithConfig(**config_data)

class ConfigWrapper:
    def __init__(self, config: ModulithConfig):
        self._config = config
        self._path_to_module = {
            Path(m.path).resolve(): name
            for name, m in config.modules.items()
        }

    def module_of(self, file_path: str) -> Optional[str]:
        """Determine which module a file belongs to."""
        resolved_path = Path(file_path).resolve()
        for module_path, module_name in self._path_to_module.items():
            if resolved_path.is_relative_to(module_path):
                return module_name
        return None

    def module_of_import(self, import_path: str) -> Optional[str]:
        """Determine which module an import belongs to."""
        if not import_path.startswith("summit."):
            return None

        # Example: summit.ingest.pipeline -> ingest
        parts = import_path.split(".")
        if len(parts) >= 2:
            module_candidate = parts[1]
            if module_candidate in self._config.modules:
                return module_candidate
        return None

    def allowed_dependencies(self, module_name: str) -> List[str]:
        """Get the list of allowed dependencies for a module."""
        module_cfg = self._config.modules.get(module_name)
        if not module_cfg:
            return []
        return module_cfg.allowed_dependencies

    @property
    def rules(self):
        return self._config.rules
