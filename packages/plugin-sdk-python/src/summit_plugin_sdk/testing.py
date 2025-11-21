"""Testing utilities for plugins."""

from typing import Any, Dict, List, Optional
from .types import PluginContext, PluginHealthStatus
from .plugin import Plugin


class MockPluginContext(PluginContext):
    """Mock context for testing plugins."""

    def __init__(
        self,
        plugin_id: str = "test-plugin",
        version: str = "1.0.0",
        config: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            plugin_id=plugin_id,
            version=version,
            config=config or {},
        )
        self.log_messages: List[Dict[str, Any]] = []
        self.emitted_events: List[Dict[str, Any]] = []

    def _capture_log(self, level: str, message: str, **meta: Any) -> None:
        self.log_messages.append({
            "level": level,
            "message": message,
            "meta": meta,
        })


class MockLogger:
    """Mock logger that captures log messages."""

    def __init__(self, context: MockPluginContext):
        self.context = context

    def debug(self, message: str, **meta: Any) -> None:
        self.context._capture_log("debug", message, **meta)

    def info(self, message: str, **meta: Any) -> None:
        self.context._capture_log("info", message, **meta)

    def warn(self, message: str, **meta: Any) -> None:
        self.context._capture_log("warn", message, **meta)

    def error(self, message: str, error: Optional[Exception] = None, **meta: Any) -> None:
        self.context._capture_log("error", message, error=error, **meta)


class MockStorage:
    """Mock storage for testing."""

    def __init__(self):
        self._data: Dict[str, Any] = {}

    async def get(self, key: str) -> Optional[Any]:
        return self._data.get(key)

    async def set(self, key: str, value: Any) -> None:
        self._data[key] = value

    async def delete(self, key: str) -> None:
        self._data.pop(key, None)

    async def has(self, key: str) -> bool:
        return key in self._data

    async def keys(self) -> List[str]:
        return list(self._data.keys())

    async def clear(self) -> None:
        self._data.clear()


class MockAPI:
    """Mock API client for testing."""

    def __init__(self):
        self.requests: List[Dict[str, Any]] = []
        self.responses: Dict[str, Any] = {}

    def mock_response(self, endpoint: str, response: Any) -> None:
        """Set a mock response for an endpoint."""
        self.responses[endpoint] = response

    async def request(
        self,
        endpoint: str,
        method: str = "GET",
        body: Optional[Any] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> Any:
        self.requests.append({
            "endpoint": endpoint,
            "method": method,
            "body": body,
            "headers": headers,
        })
        return self.responses.get(endpoint, {"success": True})

    async def graphql(
        self,
        query: str,
        variables: Optional[Dict[str, Any]] = None,
    ) -> Any:
        self.requests.append({
            "type": "graphql",
            "query": query,
            "variables": variables,
        })
        return {"data": {}}


class MockEventBus:
    """Mock event bus for testing."""

    def __init__(self):
        self.emitted_events: List[Dict[str, Any]] = []
        self._handlers: Dict[str, List[Any]] = {}

    def on(self, event: str, handler: Any) -> None:
        if event not in self._handlers:
            self._handlers[event] = []
        self._handlers[event].append(handler)

    def off(self, event: str, handler: Any) -> None:
        if event in self._handlers:
            self._handlers[event] = [h for h in self._handlers[event] if h != handler]

    async def emit(self, event: str, *args: Any, **kwargs: Any) -> None:
        self.emitted_events.append({
            "event": event,
            "args": args,
            "kwargs": kwargs,
        })
        if event in self._handlers:
            for handler in self._handlers[event]:
                result = handler(*args, **kwargs)
                if hasattr(result, "__await__"):
                    await result

    def once(self, event: str, handler: Any) -> None:
        async def wrapped(*args: Any, **kwargs: Any) -> Any:
            self.off(event, wrapped)
            result = handler(*args, **kwargs)
            if hasattr(result, "__await__"):
                return await result
            return result
        self.on(event, wrapped)


def create_mock_context(
    plugin_id: str = "test-plugin",
    version: str = "1.0.0",
    config: Optional[Dict[str, Any]] = None,
) -> MockPluginContext:
    """Create a mock plugin context for testing."""
    context = MockPluginContext(plugin_id, version, config)
    context.logger = MockLogger(context)  # type: ignore
    context.storage = MockStorage()  # type: ignore
    context.api = MockAPI()  # type: ignore
    context.events = MockEventBus()  # type: ignore
    return context


async def test_plugin_lifecycle(plugin: Plugin) -> None:
    """Test plugin lifecycle methods.

    Runs through the complete plugin lifecycle:
    1. Initialize
    2. Start
    3. Health check
    4. Stop
    5. Destroy

    Raises:
        AssertionError: If any lifecycle method fails
    """
    context = create_mock_context(
        plugin_id=plugin.manifest.id,
        version=plugin.manifest.version,
    )

    # Initialize
    await plugin.initialize(context)
    assert plugin._context is not None, "Plugin context should be set after initialization"

    # Start
    await plugin.start()

    # Health check
    health = await plugin.health_check()
    assert health.healthy, f"Plugin health check failed: {health.message}"

    # Stop
    await plugin.stop()

    # Destroy
    await plugin.destroy()
    assert plugin._context is None, "Plugin context should be None after destroy"


class PluginTestCase:
    """Base class for plugin test cases."""

    plugin_class: type
    plugin: Plugin
    context: MockPluginContext

    @classmethod
    def setup_class(cls) -> None:
        """Set up the test class."""
        if hasattr(cls, "plugin_class"):
            cls.plugin = cls.plugin_class()
            cls.context = create_mock_context(
                plugin_id=cls.plugin.manifest.id,
                version=cls.plugin.manifest.version,
            )

    async def setup_method(self) -> None:
        """Set up each test method."""
        await self.plugin.initialize(self.context)
        await self.plugin.start()

    async def teardown_method(self) -> None:
        """Tear down each test method."""
        await self.plugin.stop()
        await self.plugin.destroy()
