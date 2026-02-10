from dataclasses import dataclass
from typing import Generic, TypeVar, Callable

T = TypeVar("T")

@dataclass
class TypedResult(Generic[T]):
    value: T

def validate_or_retry(run_fn: Callable[[], T], *, retries: int = 1) -> T:
    # TODO: wire to Pydantic if present; otherwise keep as hook.
    last_exc: Exception | None = None
    for _ in range(retries + 1):
        try:
            return run_fn()
        except Exception as e:  # validation failure bucket
            last_exc = e
    raise last_exc  # type: ignore[misc]
