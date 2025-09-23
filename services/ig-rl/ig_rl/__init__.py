"""IG-RL service package."""

from .config import ServiceConfig
from .service.app import create_app

__all__ = ["ServiceConfig", "create_app"]
