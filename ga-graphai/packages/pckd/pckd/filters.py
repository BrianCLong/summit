"""Policy filter definitions."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Dict, Iterable

from .data import Example, TaintScreenResult


class PolicyFilter(ABC):
    """Base class for policy filters that decide whether an example is allowed."""

    name: str

    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    def is_allowed(self, example: Example) -> bool:
        """Return True if the example can be used for training."""

    @abstractmethod
    def describe(self) -> Dict[str, str]:
        """Return metadata for attestations."""


class MetadataPolicyFilter(PolicyFilter):
    """Reject examples when metadata values violate policy constraints."""

    def __init__(self, name: str, key: str, disallowed_values: Iterable[str]):
        super().__init__(name)
        self.key = key
        self.disallowed_values = set(disallowed_values)

    def is_allowed(self, example: Example) -> bool:
        value = example.metadata.get(self.key)
        return value not in self.disallowed_values

    def describe(self) -> Dict[str, str]:
        return {
            "type": "metadata-exclusion",
            "key": self.key,
            "disallowed": ",".join(sorted(self.disallowed_values)),
        }


def taint_screen(dataset: Iterable[Example], filters: Iterable[PolicyFilter]) -> TaintScreenResult:
    """Run policy filters and separate allowed and rejected examples."""

    allowed = []
    rejected = []
    rejection_reasons: Dict[str, str] = {}

    for example in dataset:
        for policy in filters:
            if not policy.is_allowed(example):
                rejected.append(example)
                rejection_reasons[example.example_id] = policy.name
                break
        else:
            allowed.append(example)

    return TaintScreenResult(allowed=allowed, rejected=rejected, rejection_reasons=rejection_reasons)
