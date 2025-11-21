"""Type definitions for Summit Plugin SDK."""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class PluginPermission(str, Enum):
    """Available plugin permissions."""
    READ_DATA = "read:data"
    WRITE_DATA = "write:data"
    EXECUTE_QUERIES = "execute:queries"
    ACCESS_GRAPH = "access:graph"
    NETWORK_ACCESS = "network:access"
    FILE_SYSTEM = "filesystem:access"
    DATABASE_ACCESS = "database:access"
    API_ENDPOINTS = "api:endpoints"
    UI_EXTENSIONS = "ui:extensions"
    ANALYTICS = "analytics:access"
    ML_MODELS = "ml:models"
    WEBHOOKS = "webhooks:manage"
    SCHEDULED_TASKS = "tasks:schedule"


class PluginState(str, Enum):
    """Plugin lifecycle states."""
    UNLOADED = "unloaded"
    LOADING = "loading"
    LOADED = "loaded"
    INITIALIZING = "initializing"
    ACTIVE = "active"
    PAUSED = "paused"
    ERROR = "error"
    UNLOADING = "unloading"


class PluginCategory(str, Enum):
    """Plugin categories."""
    DATA_SOURCE = "data-source"
    ANALYZER = "analyzer"
    VISUALIZATION = "visualization"
    EXPORT = "export"
    AUTHENTICATION = "authentication"
    SEARCH = "search"
    ML_MODEL = "ml-model"
    WORKFLOW = "workflow"
    UI_THEME = "ui-theme"
    API_EXTENSION = "api-extension"
    INTEGRATION = "integration"
    UTILITY = "utility"


class Author(BaseModel):
    """Plugin author information."""
    name: str
    email: Optional[str] = None
    url: Optional[str] = None


class ResourceLimits(BaseModel):
    """Resource limits for plugin execution."""
    max_memory_mb: int = Field(default=256, ge=1, le=2048)
    max_cpu_percent: int = Field(default=50, ge=1, le=100)
    max_storage_mb: int = Field(default=100, ge=1, le=1024)
    max_network_mbps: int = Field(default=10, ge=1, le=1000)


class ExtensionPointConfig(BaseModel):
    """Extension point configuration."""
    id: str
    type: str
    config: Dict[str, Any] = Field(default_factory=dict)


class WebhookConfig(BaseModel):
    """Webhook configuration."""
    event: str
    handler: str


class ApiEndpointConfig(BaseModel):
    """API endpoint configuration."""
    method: str  # GET, POST, PUT, PATCH, DELETE
    path: str
    handler: str


class PluginManifest(BaseModel):
    """Plugin manifest definition."""
    id: str = Field(min_length=3, max_length=100, pattern=r"^[a-z0-9-]+$")
    name: str = Field(min_length=1, max_length=200)
    version: str = Field(pattern=r"^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$")
    description: str = Field(max_length=1000)
    author: Author
    homepage: Optional[str] = None
    repository: Optional[str] = None
    license: str

    category: PluginCategory
    main: str
    icon: Optional[str] = None

    dependencies: Dict[str, str] = Field(default_factory=dict)
    peer_dependencies: Dict[str, str] = Field(default_factory=dict)
    engine_version: str

    permissions: List[PluginPermission] = Field(default_factory=list)
    resources: ResourceLimits = Field(default_factory=ResourceLimits)

    extension_points: List[ExtensionPointConfig] = Field(default_factory=list)
    config_schema: Dict[str, Any] = Field(default_factory=dict)
    webhooks: List[WebhookConfig] = Field(default_factory=list)
    api_endpoints: List[ApiEndpointConfig] = Field(default_factory=list)


class PluginConfig(BaseModel):
    """Plugin runtime configuration."""
    plugin_id: str
    version: str
    settings: Dict[str, Any] = Field(default_factory=dict)


class PluginHealthStatus(BaseModel):
    """Plugin health check result."""
    healthy: bool
    message: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)
    checked_at: datetime = Field(default_factory=datetime.utcnow)


class PluginLogger:
    """Logger interface for plugins."""

    def __init__(self, plugin_id: str):
        self.plugin_id = plugin_id

    def debug(self, message: str, **meta: Any) -> None:
        print(f"[DEBUG][{self.plugin_id}] {message}", meta if meta else "")

    def info(self, message: str, **meta: Any) -> None:
        print(f"[INFO][{self.plugin_id}] {message}", meta if meta else "")

    def warn(self, message: str, **meta: Any) -> None:
        print(f"[WARN][{self.plugin_id}] {message}", meta if meta else "")

    def error(self, message: str, error: Optional[Exception] = None, **meta: Any) -> None:
        print(f"[ERROR][{self.plugin_id}] {message}", error, meta if meta else "")


class PluginStorage:
    """Storage interface for plugins."""

    def __init__(self, plugin_id: str):
        self.plugin_id = plugin_id
        self._store: Dict[str, Any] = {}

    async def get(self, key: str) -> Optional[Any]:
        return self._store.get(key)

    async def set(self, key: str, value: Any) -> None:
        self._store[key] = value

    async def delete(self, key: str) -> None:
        self._store.pop(key, None)

    async def has(self, key: str) -> bool:
        return key in self._store

    async def keys(self) -> List[str]:
        return list(self._store.keys())

    async def clear(self) -> None:
        self._store.clear()


class PluginAPI:
    """API client interface for plugins."""

    def __init__(self, base_url: str):
        self.base_url = base_url

    async def request(
        self,
        endpoint: str,
        method: str = "GET",
        body: Optional[Any] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> Any:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method,
                f"{self.base_url}{endpoint}",
                json=body,
                headers=headers,
            )
            response.raise_for_status()
            return response.json()

    async def graphql(
        self,
        query: str,
        variables: Optional[Dict[str, Any]] = None,
    ) -> Any:
        return await self.request(
            "/graphql",
            method="POST",
            body={"query": query, "variables": variables or {}},
        )


class PluginEventBus:
    """Event bus interface for plugins."""

    def __init__(self):
        self._handlers: Dict[str, List[Any]] = {}

    def on(self, event: str, handler: Any) -> None:
        if event not in self._handlers:
            self._handlers[event] = []
        self._handlers[event].append(handler)

    def off(self, event: str, handler: Any) -> None:
        if event in self._handlers:
            self._handlers[event] = [h for h in self._handlers[event] if h != handler]

    async def emit(self, event: str, *args: Any, **kwargs: Any) -> None:
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


class PluginContext:
    """Context provided to plugins at runtime."""

    def __init__(
        self,
        plugin_id: str,
        version: str,
        config: Dict[str, Any],
    ):
        self.plugin_id = plugin_id
        self.version = version
        self.config = config
        self.logger = PluginLogger(plugin_id)
        self.storage = PluginStorage(plugin_id)
        self.api = PluginAPI("http://localhost:3000")
        self.events = PluginEventBus()
