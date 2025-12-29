from typing import Any, Callable, Dict, Tuple

RouteKey = Tuple[str, str]

class FastAPI:
    def __init__(self, *_, lifespan=None, **__):
        self.routes: Dict[RouteKey, Callable[..., Any]] = {}
        self._lifespan = lifespan

    def get(self, path: str):
        def decorator(func: Callable[..., Any]):
            self.routes[("GET", path)] = func
            return func
        return decorator

__all__ = ["FastAPI"]
