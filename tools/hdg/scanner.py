"""Variance scanner for HDG."""

from __future__ import annotations

import dataclasses
import importlib
import json
from typing import Any, Callable, Dict, Iterable, List, Optional, Sequence

try:  # pragma: no cover - optional dependency
    import torch
    from torch.profiler import ProfilerActivity, profile
except Exception:  # pragma: no cover - optional dependency
    torch = None  # type: ignore
    ProfilerActivity = None  # type: ignore


_NON_DETERMINISTIC_PATTERNS: Sequence[str] = (
    "cudnn_convolution",
    "cudnn_batch_norm",
    "aten::_index_put_impl_",
    "aten::bernoulli",
    "aten::dropout",
    "aten::multinomial",
    "aten::native_dropout",
    "aten::scatter_add",
    "aten::uniform_",
)


def _load_callable(path: str) -> Callable[..., Any]:
    module_path, _, attr = path.partition(":")
    if not attr:
        raise ValueError("Callable path must be formatted as 'module.submodule:callable'")
    module = importlib.import_module(module_path)
    target = module
    for part in attr.split("."):
        target = getattr(target, part)
    if not callable(target):
        raise TypeError(f"Resolved object '{path}' is not callable")
    return target


def _normalise_output(value: Any) -> bytes:
    if torch is not None and isinstance(value, torch.Tensor):  # pragma: no branch - depends on torch
        return value.detach().cpu().numpy().tobytes()
    if hasattr(value, "tobytes"):
        return value.tobytes()
    if isinstance(value, (bytes, bytearray)):
        return bytes(value)
    if isinstance(value, str):
        return value.encode("utf-8")
    if isinstance(value, dict):
        payload = []
        for key in sorted(value.keys()):
            payload.append(_normalise_output(value[key]))
        return b"".join(payload)
    if isinstance(value, Iterable) and not isinstance(value, (str, bytes, bytearray)):
        return b"".join(_normalise_output(v) for v in value)
    return json.dumps(value, sort_keys=True, default=str).encode("utf-8")


@dataclasses.dataclass
class VarianceScanResult:
    callable_path: str
    nondeterministic_ops: List[str]
    identical: bool
    runs: int
    op_footprint: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return dataclasses.asdict(self)


class VarianceScanner:
    """Run a callable and report deterministic guarantees."""

    def __init__(self, callable_path: str, args: Optional[Iterable[Any]] = None, kwargs: Optional[Dict[str, Any]] = None):
        self.callable_path = callable_path
        self.callable = _load_callable(callable_path)
        self.args = list(args or [])
        self.kwargs = dict(kwargs or {})

    def run(self, runs: int = 2) -> VarianceScanResult:
        if runs < 2:
            raise ValueError("At least two runs are required to assess variance")

        op_names: List[str] = []
        outputs: List[bytes] = []

        for _ in range(runs):
            result, events = self._execute_with_trace()
            outputs.append(_normalise_output(result))
            for event in events:
                if event not in op_names:
                    op_names.append(event)

        first = outputs[0]
        identical = all(output == first for output in outputs[1:])
        nondet_ops = [name for name in op_names if any(pattern in name for pattern in _NON_DETERMINISTIC_PATTERNS)]

        return VarianceScanResult(
            callable_path=self.callable_path,
            nondeterministic_ops=nondet_ops,
            identical=identical,
            runs=runs,
            op_footprint=op_names,
        )

    def _execute_with_trace(self):
        if torch is None or ProfilerActivity is None:
            result = self.callable(*self.args, **self.kwargs)
            return result, []

        with profile(activities=[ProfilerActivity.CPU], record_shapes=False) as prof:  # pragma: no cover - requires torch
            result = self.callable(*self.args, **self.kwargs)
        events = [event.key for event in prof.key_averages()]
        return result, events


def load_args(arg_string: Optional[str]) -> List[Any]:
    if not arg_string:
        return []
    data = json.loads(arg_string)
    if isinstance(data, list):
        return data
    return [data]


def load_kwargs(kwargs_string: Optional[str]) -> Dict[str, Any]:
    if not kwargs_string:
        return {}
    data = json.loads(kwargs_string)
    if not isinstance(data, dict):
        raise TypeError("Keyword arguments must be provided as a JSON object")
    return data
