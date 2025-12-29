from typing import Any
from . import FastAPI

class _Response:
    def __init__(self, payload: Any, status_code: int = 200):
        self._payload = payload
        self.status_code = status_code

    def json(self) -> Any:
        return self._payload


class TestClient:
    def __init__(self, app: FastAPI):
        self.app = app
        self._entered = False
        manager = getattr(app, "_lifespan", None)
        if manager:
            try:
                manager.__enter__()
                self._entered = True
            except AttributeError:
                pass

    def __del__(self):
        manager = getattr(self.app, "_lifespan", None)
        if self._entered and manager and hasattr(manager, "__exit__"):
            manager.__exit__(None, None, None)

    def get(self, path: str) -> _Response:
        handler = self.app.routes.get(("GET", path)) if hasattr(self.app, "routes") else None
        if not handler:
            return _Response({"detail": "Not Found"}, status_code=404)
        payload = handler()
        return _Response(payload, status_code=200)

__all__ = ["TestClient"]
