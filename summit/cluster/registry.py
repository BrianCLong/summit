from typing import Dict, Type

from summit.flags import is_feature_enabled

from .drivers.vind.driver import VindDriver
from .drivers.vind.vcluster_cli import VClusterCLI


class DriverRegistry:
    _drivers: dict[str, type] = {}

    @classmethod
    def register(cls, name: str, driver_cls: type):
        cls._drivers[name] = driver_cls

    @classmethod
    def get_driver(cls, name: str):
        if not is_feature_enabled("SUMMIT_VIND_ENABLED") and name == "vind":
            raise RuntimeError("Vind driver is disabled. Enable it with SUMMIT_VIND_ENABLED=1")

        driver_cls = cls._drivers.get(name)
        if not driver_cls:
            raise ValueError(f"Driver '{name}' not found")

        if name == "vind":
            return driver_cls(VClusterCLI())

        return driver_cls()

# Initial registration
DriverRegistry.register("vind", VindDriver)
