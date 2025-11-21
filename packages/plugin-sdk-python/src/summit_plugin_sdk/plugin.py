"""Plugin base class and builder."""

from abc import ABC, abstractmethod
from typing import Any, Callable, Coroutine, Dict, List, Optional
from .types import (
    PluginManifest,
    PluginContext,
    PluginPermission,
    PluginCategory,
    PluginHealthStatus,
    Author,
    ResourceLimits,
)


class Plugin(ABC):
    """Base class for all plugins."""

    def __init__(self, manifest: PluginManifest):
        self.manifest = manifest
        self._context: Optional[PluginContext] = None

    @property
    def context(self) -> PluginContext:
        if self._context is None:
            raise RuntimeError("Plugin not initialized")
        return self._context

    async def initialize(self, context: PluginContext) -> None:
        """Initialize the plugin with context."""
        self._context = context
        await self.on_initialize()

    async def start(self) -> None:
        """Start the plugin."""
        await self.on_start()

    async def stop(self) -> None:
        """Stop the plugin."""
        await self.on_stop()

    async def destroy(self) -> None:
        """Cleanup resources."""
        await self.on_destroy()
        self._context = None

    async def health_check(self) -> PluginHealthStatus:
        """Check plugin health."""
        return await self.on_health_check()

    # Override these methods in your plugin
    async def on_initialize(self) -> None:
        """Called when plugin is initialized."""
        pass

    async def on_start(self) -> None:
        """Called when plugin is started."""
        pass

    async def on_stop(self) -> None:
        """Called when plugin is stopped."""
        pass

    async def on_destroy(self) -> None:
        """Called when plugin is destroyed."""
        pass

    async def on_health_check(self) -> PluginHealthStatus:
        """Called for health check."""
        return PluginHealthStatus(healthy=True)


InitHandler = Callable[[PluginContext], Coroutine[Any, Any, None]]
LifecycleHandler = Callable[[], Coroutine[Any, Any, None]]
HealthCheckHandler = Callable[[], Coroutine[Any, Any, PluginHealthStatus]]


class PluginBuilder:
    """Fluent builder for creating plugins."""

    def __init__(self):
        self._manifest_data: Dict[str, Any] = {
            "permissions": [],
            "extension_points": [],
            "webhooks": [],
            "api_endpoints": [],
        }
        self._init_handler: Optional[InitHandler] = None
        self._start_handler: Optional[LifecycleHandler] = None
        self._stop_handler: Optional[LifecycleHandler] = None
        self._destroy_handler: Optional[LifecycleHandler] = None
        self._health_check_handler: Optional[HealthCheckHandler] = None

    def with_metadata(
        self,
        id: str,
        name: str,
        version: str,
        description: str,
        author_name: str,
        author_email: Optional[str] = None,
        license: str = "MIT",
        category: PluginCategory = PluginCategory.UTILITY,
    ) -> "PluginBuilder":
        """Set plugin metadata."""
        self._manifest_data.update({
            "id": id,
            "name": name,
            "version": version,
            "description": description,
            "author": Author(name=author_name, email=author_email),
            "license": license,
            "category": category,
        })
        return self

    def with_main(self, main: str) -> "PluginBuilder":
        """Set main entry point."""
        self._manifest_data["main"] = main
        return self

    def requires_engine(self, version: str) -> "PluginBuilder":
        """Set required engine version."""
        self._manifest_data["engine_version"] = version
        return self

    def request_permission(self, permission: PluginPermission) -> "PluginBuilder":
        """Add a required permission."""
        if permission not in self._manifest_data["permissions"]:
            self._manifest_data["permissions"].append(permission)
        return self

    def request_permissions(self, *permissions: PluginPermission) -> "PluginBuilder":
        """Add multiple required permissions."""
        for perm in permissions:
            self.request_permission(perm)
        return self

    def with_resources(
        self,
        max_memory_mb: int = 256,
        max_cpu_percent: int = 50,
        max_storage_mb: int = 100,
        max_network_mbps: int = 10,
    ) -> "PluginBuilder":
        """Set resource limits."""
        self._manifest_data["resources"] = ResourceLimits(
            max_memory_mb=max_memory_mb,
            max_cpu_percent=max_cpu_percent,
            max_storage_mb=max_storage_mb,
            max_network_mbps=max_network_mbps,
        )
        return self

    def on_initialize(self, handler: InitHandler) -> "PluginBuilder":
        """Set initialization handler."""
        self._init_handler = handler
        return self

    def on_start(self, handler: LifecycleHandler) -> "PluginBuilder":
        """Set start handler."""
        self._start_handler = handler
        return self

    def on_stop(self, handler: LifecycleHandler) -> "PluginBuilder":
        """Set stop handler."""
        self._stop_handler = handler
        return self

    def on_destroy(self, handler: LifecycleHandler) -> "PluginBuilder":
        """Set destroy handler."""
        self._destroy_handler = handler
        return self

    def with_health_check(self, handler: HealthCheckHandler) -> "PluginBuilder":
        """Set health check handler."""
        self._health_check_handler = handler
        return self

    def build(self) -> Plugin:
        """Build the plugin."""
        # Validate required fields
        required = ["id", "name", "version", "description", "author", "license", "category", "main", "engine_version"]
        for field in required:
            if field not in self._manifest_data:
                raise ValueError(f"Missing required field: {field}")

        manifest = PluginManifest(**self._manifest_data)

        # Create plugin class dynamically
        builder = self

        class BuiltPlugin(Plugin):
            async def on_initialize(self) -> None:
                if builder._init_handler:
                    await builder._init_handler(self.context)

            async def on_start(self) -> None:
                if builder._start_handler:
                    await builder._start_handler()

            async def on_stop(self) -> None:
                if builder._stop_handler:
                    await builder._stop_handler()

            async def on_destroy(self) -> None:
                if builder._destroy_handler:
                    await builder._destroy_handler()

            async def on_health_check(self) -> PluginHealthStatus:
                if builder._health_check_handler:
                    return await builder._health_check_handler()
                return PluginHealthStatus(healthy=True)

        return BuiltPlugin(manifest)


def create_plugin() -> PluginBuilder:
    """Create a new plugin builder."""
    return PluginBuilder()
