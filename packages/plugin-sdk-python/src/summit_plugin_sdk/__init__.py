"""Summit Plugin SDK for Python.

This SDK provides tools and utilities for building Summit platform plugins in Python.
"""

from .plugin import Plugin, PluginBuilder, create_plugin
from .types import (
    PluginManifest,
    PluginContext,
    PluginPermission,
    PluginState,
    PluginConfig,
    ResourceLimits,
)
from .extensions import (
    ExtensionPoint,
    DataSourceExtension,
    AnalyzerExtension,
    WorkflowExtension,
)
from .decorators import endpoint, webhook_handler, extension_point
from .testing import MockPluginContext, test_plugin_lifecycle

__version__ = "1.0.0"
__all__ = [
    # Core
    "Plugin",
    "PluginBuilder",
    "create_plugin",
    # Types
    "PluginManifest",
    "PluginContext",
    "PluginPermission",
    "PluginState",
    "PluginConfig",
    "ResourceLimits",
    # Extensions
    "ExtensionPoint",
    "DataSourceExtension",
    "AnalyzerExtension",
    "WorkflowExtension",
    # Decorators
    "endpoint",
    "webhook_handler",
    "extension_point",
    # Testing
    "MockPluginContext",
    "test_plugin_lifecycle",
]
