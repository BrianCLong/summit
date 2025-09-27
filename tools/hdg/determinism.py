"""Determinism helpers for the HDG toolkit."""

from __future__ import annotations

import contextlib
import dataclasses
import hashlib
import json
import os
import random
import warnings
from typing import Any, Dict, Iterable, Optional

try:  # pragma: no cover - optional dependency
    import numpy as np
except Exception:  # pragma: no cover - optional dependency
    np = None  # type: ignore

try:  # pragma: no cover - optional dependency
    import torch
except Exception:  # pragma: no cover - optional dependency
    torch = None  # type: ignore

try:  # pragma: no cover - optional dependency
    import tensorflow as tf
except Exception:  # pragma: no cover - optional dependency
    tf = None  # type: ignore

try:  # pragma: no cover - optional dependency
    import jax
    import jax.numpy as jnp
except Exception:  # pragma: no cover - optional dependency
    jax = None  # type: ignore
    jnp = None  # type: ignore


_DETERMINISM_ENV_VARS = {
    "CUBLAS_WORKSPACE_CONFIG": ":16:8",
    "TF_DETERMINISTIC_OPS": "1",
    "TF_CUDNN_DETERMINISTIC": "1",
    "XLA_FLAGS": "--xla_gpu_deterministic_ops=true",
}


@dataclasses.dataclass
class DeterminismState:
    """Snapshot describing determinism controls that were applied."""

    seed: Optional[int]
    frameworks: Dict[str, Dict[str, Any]]
    env: Dict[str, str]


def _set_env_vars(env: Dict[str, str]) -> Dict[str, Optional[str]]:
    previous: Dict[str, Optional[str]] = {}
    for key, value in env.items():
        previous[key] = os.environ.get(key)
        os.environ[key] = value
    return previous


def seed_everything(seed: int) -> Dict[str, bool]:
    """Seed all supported frameworks.

    Returns a dictionary detailing which frameworks were successfully seeded.
    """

    status = {"python": True}
    random.seed(seed)
    os.environ["PYTHONHASHSEED"] = str(seed)

    if np is not None:
        np.random.seed(seed)
        status["numpy"] = True
    else:  # pragma: no cover - optional dependency
        status["numpy"] = False

    if torch is not None:
        torch.manual_seed(seed)
        if torch.cuda.is_available():  # pragma: no cover - GPU only
            torch.cuda.manual_seed_all(seed)
        status["torch"] = True
    else:  # pragma: no cover - optional dependency
        status["torch"] = False

    if tf is not None:
        try:  # pragma: no cover - TF optional
            tf.random.set_seed(seed)
            status["tensorflow"] = True
        except Exception:  # pragma: no cover - TF optional
            status["tensorflow"] = False
    else:
        status["tensorflow"] = False

    if jax is not None:
        try:  # pragma: no cover - JAX optional
            jax_key = jax.random.PRNGKey(seed)
            status["jax"] = True
            status["jax_key"] = jax_key  # type: ignore[assignment]
        except Exception:  # pragma: no cover - JAX optional
            status["jax"] = False
    else:
        status["jax"] = False

    return status


def _configure_torch(precision: str, cudnn_deterministic: bool, allow_tf32: bool) -> Dict[str, Any]:
    result: Dict[str, Any] = {}
    if torch is None:
        return {"available": False}

    result["available"] = True
    torch.use_deterministic_algorithms(True)
    result["use_deterministic_algorithms"] = True

    if hasattr(torch.backends, "cudnn"):
        torch.backends.cudnn.deterministic = cudnn_deterministic
        torch.backends.cudnn.benchmark = False
        result["cudnn_deterministic"] = cudnn_deterministic
        result["cudnn_benchmark"] = False

    if hasattr(torch.backends, "cuda"):
        torch.backends.cuda.matmul.allow_tf32 = allow_tf32 and precision != "fp32"
        result["cuda_allow_tf32"] = torch.backends.cuda.matmul.allow_tf32

    if hasattr(torch, "set_float32_matmul_precision"):
        torch.set_float32_matmul_precision("medium" if allow_tf32 else "high")
        result["float32_matmul_precision"] = "medium" if allow_tf32 else "high"

    autocast_dtype = None
    if precision.lower() == "bf16" and hasattr(torch, "bfloat16"):
        autocast_dtype = torch.bfloat16
    elif precision.lower() == "fp32" and hasattr(torch, "float32"):
        autocast_dtype = torch.float32

    if autocast_dtype is not None:
        if hasattr(torch, "set_autocast_dtype"):
            torch.set_autocast_dtype("cuda", autocast_dtype)
        elif hasattr(torch, "set_autocast_gpu_dtype"):
            torch.set_autocast_gpu_dtype(autocast_dtype)
        result["autocast_gpu_dtype"] = "bf16" if precision.lower() == "bf16" else "fp32"

    return result


def _configure_tensorflow() -> Dict[str, Any]:
    if tf is None:
        return {"available": False}

    try:  # pragma: no cover - TF optional
        tf.config.experimental.enable_op_determinism()
        return {"available": True, "op_determinism": True}
    except Exception as exc:  # pragma: no cover - TF optional
        warnings.warn(f"Failed to enable TensorFlow determinism: {exc}")
        return {"available": True, "op_determinism": False}


def _configure_jax(precision: str) -> Dict[str, Any]:
    if jax is None:
        return {"available": False}

    config = {
        "available": True,
        "jax_enable_x64": True,
        "jax_numpy_rank_promotion": "raise",
    }
    os.environ.setdefault("JAX_ENABLE_X64", "1")
    os.environ.setdefault("JAX_DEFAULT_DTYPE_BITS", "32" if precision == "fp32" else "16")
    return config


def enforce_determinism(
    seed: Optional[int] = None,
    precision: str = "fp32",
    cudnn_deterministic: bool = True,
    allow_tf32: bool = False,
    extra_env: Optional[Dict[str, str]] = None,
) -> DeterminismState:
    """Apply deterministic guards across available frameworks."""

    frameworks: Dict[str, Dict[str, Any]] = {}

    if seed is not None:
        seed_info = seed_everything(seed)
        frameworks["seed"] = seed_info

    env_vars = dict(_DETERMINISM_ENV_VARS)
    if extra_env:
        env_vars.update(extra_env)
    applied_env = {k: v for k, v in env_vars.items() if v is not None}
    _set_env_vars(applied_env)

    frameworks["torch"] = _configure_torch(precision, cudnn_deterministic, allow_tf32)
    frameworks["tensorflow"] = _configure_tensorflow()
    frameworks["jax"] = _configure_jax(precision)

    return DeterminismState(seed=seed, frameworks=frameworks, env=applied_env)


def hash_training_graph(description: Any) -> str:
    """Return a stable hash for a model/training graph description."""

    if isinstance(description, (bytes, bytearray)):
        payload = bytes(description)
    elif isinstance(description, str):
        payload = description.encode("utf-8")
    else:
        payload = json.dumps(description, sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


@contextlib.contextmanager
def deterministic_run(seed: Optional[int] = None, **kwargs: Any):
    """Context manager that enforces determinism within a block."""

    state = enforce_determinism(seed=seed, **kwargs)
    tracked_keys = set(_DETERMINISM_ENV_VARS) | set(state.env.keys())
    original_env = {k: os.environ.get(k) for k in tracked_keys}
    try:
        yield state
    finally:
        for key, value in original_env.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value


def serialize_state(state: DeterminismState) -> Dict[str, Any]:
    data = dataclasses.asdict(state)
    seed_info = data.get("frameworks", {}).get("seed")
    if isinstance(seed_info, dict) and "jax_key" in seed_info:
        seed_info["jax_key"] = "<PRNGKey>"
    return data
