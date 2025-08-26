from __future__ import annotations

from typing import Any

from ..schemas import ModelMeta


def has_gradients(model: ModelMeta) -> bool:
    return bool(model.gradients)


def tensor_to_numpy(x: Any) -> Any:  # pragma: no cover
    try:
        return x.detach().cpu().numpy()
    except Exception:
        return x
