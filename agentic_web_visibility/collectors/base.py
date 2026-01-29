from typing import Iterable, Dict, Any

class Collector:
    name: str = "collector.base"
    def collect(self) -> Iterable[Dict[str, Any]]:
        raise NotImplementedError
