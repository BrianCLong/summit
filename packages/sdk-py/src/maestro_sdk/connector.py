from typing import Any, Generic, Protocol, TypeVar

from .types import RunContext

TIn = TypeVar("TIn")
TOut = TypeVar("TOut")


class Connector(Protocol, Generic[TIn, TOut]):
    def init(self, ctx: RunContext) -> None: ...  # optional
    def send(self, ctx: RunContext, input: TIn, cfg: dict[str, Any] | None = None) -> TOut: ...


def define_connector(c: Connector[TIn, TOut]) -> Connector[TIn, TOut]:
    return c
