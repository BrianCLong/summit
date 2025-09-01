from typing import Protocol, Generic, TypeVar
from .types import RunContext, Json

TIn = TypeVar('TIn')
TOut = TypeVar('TOut')

class Task(Protocol, Generic[TIn, TOut]):
    def init(self, ctx: RunContext) -> None: ...  # optional
    def validate(self, input: Json) -> None: ...  # optional
    def execute(self, ctx: RunContext, input: Json) -> Json: ...

def define_task(task: Task[TIn, TOut]) -> Task[TIn, TOut]:
    return task
