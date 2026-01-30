from typing import Any, Dict, Iterable


class Collector:
    name: str = "collector.base"
    def collect(self) -> Iterable[dict[str, Any]]:
        raise NotImplementedError
