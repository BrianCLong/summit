from typing import Protocol, Generic, TypeVar, Any, Dict
from .types import RunContext

TIn = TypeVar('TIn')
TOut = TypeVar('TOut')

class Connector(Protocol, Generic[TIn, TOut]):
    def init(self, ctx: RunContext) -> None: ...  # optional
    def send(self, ctx: RunContext, input: TIn, cfg: Dict[str, Any] | None = None) -> TOut: ...

def define_connector(c: Connector[TIn, TOut]) -> Connector[TIn, TOut]:
    return c
