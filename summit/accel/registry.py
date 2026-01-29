from __future__ import annotations

from typing import Callable, Dict

from .contracts import AccelMethodSpec, AccelRunResult

Runner = Callable[[AccelMethodSpec, dict], AccelRunResult]

_REGISTRY: Dict[str, Runner] = {}


def register(method_id: str, runner: Runner) -> None:
    if method_id in _REGISTRY:
        raise ValueError(f"method already registered: {method_id}")
    _REGISTRY[method_id] = runner


def get(method_id: str) -> Runner:
    if method_id not in _REGISTRY:
        raise KeyError(f"unknown method_id: {method_id}")
    return _REGISTRY[method_id]


def list_methods() -> list[str]:
    return sorted(_REGISTRY.keys())
