"""Decorators for plugin development."""

from functools import wraps
from typing import Any, Callable, List, Optional
from .types import PluginPermission


def endpoint(method: str, path: str):
    """Decorator to mark a method as an API endpoint.

    Example:
        @endpoint("POST", "/analyze")
        async def analyze(self, request):
            return {"result": "analyzed"}
    """
    def decorator(func: Callable) -> Callable:
        func.__endpoint__ = {
            "method": method,
            "path": path,
            "handler": func.__name__,
        }
        return func
    return decorator


def webhook_handler(event: str):
    """Decorator to mark a method as a webhook handler.

    Example:
        @webhook_handler("entity:created")
        async def on_entity_created(self, event_data):
            print(f"Entity created: {event_data}")
    """
    def decorator(func: Callable) -> Callable:
        func.__webhook__ = {
            "event": event,
            "handler": func.__name__,
        }
        return func
    return decorator


def extension_point(type: str, id: Optional[str] = None):
    """Decorator to mark a method as providing an extension point.

    Example:
        @extension_point("analyzer", "my-analyzer")
        async def analyze(self, input):
            return {"insights": [...]}
    """
    def decorator(func: Callable) -> Callable:
        func.__extension_point__ = {
            "type": type,
            "id": id or func.__name__,
        }
        return func
    return decorator


def requires_permission(*permissions: PluginPermission):
    """Decorator to specify required permissions for a method.

    Example:
        @requires_permission(PluginPermission.NETWORK_ACCESS)
        async def fetch_data(self):
            ...
    """
    def decorator(func: Callable) -> Callable:
        func.__permissions__ = list(permissions)

        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            # In runtime, this would check permissions
            return await func(*args, **kwargs)

        return wrapper
    return decorator


def rate_limited(requests_per_minute: int):
    """Decorator to apply rate limiting to a method.

    Example:
        @rate_limited(100)
        async def api_call(self):
            ...
    """
    def decorator(func: Callable) -> Callable:
        func.__rate_limit__ = requests_per_minute

        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            # In runtime, this would check rate limit
            return await func(*args, **kwargs)

        return wrapper
    return decorator


def cached(ttl_seconds: int = 300):
    """Decorator to cache method results.

    Example:
        @cached(ttl_seconds=60)
        async def get_data(self, key: str):
            ...
    """
    def decorator(func: Callable) -> Callable:
        cache: dict = {}

        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            import time
            cache_key = str((args, tuple(sorted(kwargs.items()))))
            now = time.time()

            if cache_key in cache:
                value, timestamp = cache[cache_key]
                if now - timestamp < ttl_seconds:
                    return value

            result = await func(*args, **kwargs)
            cache[cache_key] = (result, now)
            return result

        return wrapper
    return decorator


def retry(max_attempts: int = 3, delay_seconds: float = 1.0):
    """Decorator to retry a method on failure.

    Example:
        @retry(max_attempts=3, delay_seconds=2.0)
        async def unreliable_call(self):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            import asyncio
            last_error = None

            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    if attempt < max_attempts - 1:
                        await asyncio.sleep(delay_seconds * (2 ** attempt))

            raise last_error  # type: ignore

        return wrapper
    return decorator
