"""Payload grammar helpers."""

from __future__ import annotations

import copy
from dataclasses import dataclass
from typing import Any, Callable, Dict, Iterable, List, Sequence


GeneratorFunc = Callable[["RandomLike"], Any]


class RandomLike:
    """Protocol subset for deterministic randomness."""

    def choice(self, seq: Sequence[Any]) -> Any:
        raise NotImplementedError

    def random(self) -> float:
        raise NotImplementedError

    def randint(self, a: int, b: int) -> int:
        raise NotImplementedError

    def choices(
        self, population: Sequence[Any], weights: Sequence[int] | None = None, k: int = 1
    ) -> List[Any]:
        raise NotImplementedError


@dataclass
class GrammarRule:
    name: str
    generator: GeneratorFunc
    weight: int = 1


@dataclass
class PayloadGrammar:
    """Composable payload grammar using weighted production rules."""

    rules: Iterable[GrammarRule]
    default_rule: GrammarRule | None = None

    def __post_init__(self) -> None:
        self._rules: List[GrammarRule] = list(self.rules)
        if self.default_rule:
            self._rules.append(self.default_rule)
        if not self._rules:
            raise ValueError("At least one grammar rule is required")
        self._weights = [max(1, rule.weight) for rule in self._rules]

    def generate(self, rng: RandomLike) -> Any:
        rule = rng.choices(self._rules, weights=self._weights, k=1)[0]
        payload = rule.generator(rng)
        return copy.deepcopy(payload)

    def extend(self, *rules: GrammarRule) -> "PayloadGrammar":
        return PayloadGrammar([*self._rules, *rules])


def simple_dict_rule(name: str, template: Dict[str, Any], weight: int = 1) -> GrammarRule:
    def _generator(rng: RandomLike) -> Dict[str, Any]:
        payload = {}
        for key, value in template.items():
            if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
                payload[key] = rng.choice(list(value))
            elif callable(value):
                payload[key] = value(rng)
            else:
                payload[key] = value
        return payload

    return GrammarRule(name=name, generator=_generator, weight=weight)


__all__ = [
    "GrammarRule",
    "PayloadGrammar",
    "simple_dict_rule",
]
