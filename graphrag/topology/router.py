from dataclasses import dataclass
from typing import Dict, Any, Optional
import yaml
import os

@dataclass(frozen=True)
class RegionRoute:
    read_region: str
    write_region: str
    mode: str  # "local_read" | "primary_write" | "read_only"

class Router:
    def __init__(self, config_path: str = "graphrag/topology/regions.yaml"):
        if not os.path.exists(config_path):
             # Try absolute path or other locations if needed?
             # For now assume running from root
             raise FileNotFoundError(f"Configuration file not found: {config_path}")

        with open(config_path, "r") as f:
            self.config = yaml.safe_load(f)
        self.regions = {r["name"]: r for r in self.config["regions"]}
        self.default_region = self.config["default_region"]

    def route(self, data_class: str, preferred_region: str) -> RegionRoute:
        if preferred_region not in self.regions:
             raise ValueError(f"Unknown region: {preferred_region}")

        region_config = self.regions[preferred_region]

        if data_class not in region_config.get("allow_classes", []):
             raise ValueError(f"Data class '{data_class}' not allowed in region '{preferred_region}'")

        # Determine write region
        primary_region = self.default_region
        for r_name, r_conf in self.regions.items():
            if r_conf.get("role") == "primary":
                primary_region = r_name
                break

        return RegionRoute(
            read_region=preferred_region,
            write_region=primary_region,
            mode="local_read"
        )
