from __future__ import annotations

import json
from collections.abc import Iterable
from dataclasses import asdict, is_dataclass
from pathlib import Path
from typing import Any, TypeVar

T = TypeVar("T")


def _serialize(item: Any) -> Any:
    if is_dataclass(item):
        return asdict(item)
    if isinstance(item, set):
        return list(item)
    return item


def _deserialize(cls: type[T], payload: dict) -> T:
    return cls(**payload)  # type: ignore[arg-type]


def load_collection(path: Path, cls: type[T]) -> list[T]:
    if not path.exists():
        return []
    data = json.loads(path.read_text())
    return [_deserialize(cls, item) for item in data]


def save_collection(path: Path, items: Iterable[Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    serialized = [_serialize(item) for item in items]
    path.write_text(json.dumps(serialized, default=str, indent=2))
