# Summit Plugin SDK for Python

Build powerful plugins for the Summit platform using Python.

## Installation

```bash
pip install summit-plugin-sdk
```

## Quick Start

```python
from summit_plugin_sdk import (
    create_plugin,
    PluginPermission,
    PluginCategory,
    PluginContext,
    PluginHealthStatus,
)


async def on_initialize(context: PluginContext) -> None:
    context.logger.info("Plugin initializing...")
    # Store configuration
    await context.storage.set("config", context.config)


async def on_start() -> None:
    print("Plugin started!")


async def on_stop() -> None:
    print("Plugin stopping...")


async def health_check() -> PluginHealthStatus:
    return PluginHealthStatus(healthy=True, message="All good!")


plugin = (
    create_plugin()
    .with_metadata(
        id="my-awesome-plugin",
        name="My Awesome Plugin",
        version="1.0.0",
        description="An awesome Summit plugin",
        author_name="Your Name",
        category=PluginCategory.ANALYZER,
    )
    .with_main("./main.py")
    .requires_engine(">=1.0.0")
    .request_permissions(
        PluginPermission.READ_DATA,
        PluginPermission.WRITE_DATA,
    )
    .with_resources(max_memory_mb=128, max_cpu_percent=30)
    .on_initialize(on_initialize)
    .on_start(on_start)
    .on_stop(on_stop)
    .with_health_check(health_check)
    .build()
)
```

## Creating Extensions

### Data Source Extension

```python
from summit_plugin_sdk import DataSourceExtension, DataSourceQuery, DataSourceResult


class MyDataSource(DataSourceExtension):
    def __init__(self, config: dict):
        super().__init__("my-datasource", config)

    async def connect(self) -> None:
        # Connect to your data source
        pass

    async def disconnect(self) -> None:
        # Cleanup connection
        pass

    async def test_connection(self) -> bool:
        return True

    async def execute(self, query: DataSourceQuery) -> DataSourceResult:
        # Execute query and return results
        return DataSourceResult(
            data=[{"id": 1, "name": "Test"}],
            total=1,
            has_more=False,
        )
```

### Analyzer Extension

```python
from summit_plugin_sdk import (
    AnalyzerExtension,
    AnalyzerInput,
    AnalyzerResult,
    Insight,
)


class SentimentAnalyzer(AnalyzerExtension):
    def __init__(self):
        super().__init__(
            id="sentiment-analyzer",
            name="Sentiment Analyzer",
            description="Analyzes text sentiment",
            supported_data_types=["text"],
        )

    async def execute(self, input: AnalyzerInput) -> AnalyzerResult:
        # Analyze sentiment
        return AnalyzerResult(
            insights=[
                Insight(
                    type="sentiment",
                    description="Positive sentiment detected",
                    confidence=0.92,
                )
            ],
            confidence=0.92,
        )
```

## Using Decorators

```python
from summit_plugin_sdk import (
    endpoint,
    webhook_handler,
    requires_permission,
    PluginPermission,
)


class MyPlugin:
    @endpoint("POST", "/analyze")
    async def analyze(self, request):
        return {"result": "analyzed"}

    @webhook_handler("entity:created")
    async def on_entity_created(self, event):
        print(f"New entity: {event}")

    @requires_permission(PluginPermission.NETWORK_ACCESS)
    async def fetch_external_data(self):
        # This method requires network access permission
        pass
```

## Testing

```python
import pytest
from summit_plugin_sdk import test_plugin_lifecycle, create_mock_context
from my_plugin import plugin


@pytest.mark.asyncio
async def test_plugin_lifecycle():
    await test_plugin_lifecycle(plugin)


@pytest.mark.asyncio
async def test_plugin_initialization():
    context = create_mock_context(config={"api_key": "test"})
    await plugin.initialize(context)

    # Check storage was set
    stored = await context.storage.get("config")
    assert stored == {"api_key": "test"}
```

## CLI Usage

```bash
# Create a new plugin
summit-plugin create my-plugin

# Build the plugin
summit-plugin build

# Test the plugin
summit-plugin test

# Publish to marketplace
summit-plugin publish
```

## API Reference

### PluginContext

- `plugin_id: str` - Plugin identifier
- `version: str` - Plugin version
- `config: Dict[str, Any]` - Plugin configuration
- `logger` - Logger instance
- `storage` - Key-value storage
- `api` - Platform API client
- `events` - Event bus

### PluginPermission

Available permissions:
- `READ_DATA` - Read platform data
- `WRITE_DATA` - Write platform data
- `NETWORK_ACCESS` - Make network requests
- `FILE_SYSTEM` - Access file system
- `DATABASE_ACCESS` - Direct database access
- And more...

## License

MIT
