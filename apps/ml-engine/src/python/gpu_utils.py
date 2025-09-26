#!/usr/bin/env python3
"""Utility helpers for working with GPU acceleration.

This module centralises device detection, configuration, and telemetry
collection so the rest of the ML engine can remain agnostic to whether
CUDA-capable hardware is available.  The helpers are defensive and will
gracefully degrade when GPUs (or CUDA tooling) are not present so the
service can continue to operate in CPU-only environments.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import torch

try:  # pragma: no cover - optional dependency in non-GPU environments
    import pynvml  # type: ignore

    pynvml.nvmlInit()
    _PYNVML_AVAILABLE = True
except Exception:  # pragma: no cover - best-effort initialisation
    _PYNVML_AVAILABLE = False

logger = logging.getLogger(__name__)


@dataclass
class GPUDeviceInfo:
    """Describes a CUDA-capable device."""

    name: str
    index: int
    total_memory_mb: int
    compute_capability: Optional[str]


def list_available_gpus() -> List[GPUDeviceInfo]:
    """Return a list of CUDA devices detected by PyTorch."""

    devices: List[GPUDeviceInfo] = []

    if not torch.cuda.is_available():
        return devices

    for index in range(torch.cuda.device_count()):
        properties = torch.cuda.get_device_properties(index)
        devices.append(
            GPUDeviceInfo(
                name=properties.name,
                index=index,
                total_memory_mb=int(properties.total_memory // (1024 * 1024)),
                compute_capability=f"{properties.major}.{properties.minor}",
            )
        )

    return devices


def resolve_device(preference: Optional[str] = None) -> Tuple[str, Optional[GPUDeviceInfo]]:
    """Determine the most appropriate device given a user preference."""

    preference_normalised = (preference or os.getenv("GPU_ENABLED", "auto")).lower()

    if preference_normalised in {"false", "0", "no", "cpu"}:
        return "cpu", None

    if torch.cuda.is_available():
        available_devices = list_available_gpus()
        if not available_devices:
            return "cpu", None

        ordinal = os.getenv("GPU_DEVICE_ORDINAL")
        if preference and preference_normalised.startswith("cuda"):
            # Users may specify cuda, cuda:0 or similar.
            try:
                index = int(preference.split(":")[1])
            except (IndexError, ValueError):  # pragma: no cover - defensive
                index = 0
        elif ordinal and ordinal.isdigit():
            index = int(ordinal)
        else:
            index = 0

        index = max(0, min(index, len(available_devices) - 1))
        os.environ.setdefault("CUDA_VISIBLE_DEVICES", str(index))
        return f"cuda:{index}", available_devices[index]

    if torch.backends.mps.is_available():  # Apple Silicon fallback
        return "mps", None

    return "cpu", None


def collect_gpu_telemetry(index: int = 0) -> Optional[Dict[str, float]]:
    """Return real-time GPU telemetry if the NVML bindings are available."""

    if not _PYNVML_AVAILABLE:
        return None

    try:  # pragma: no cover - runtime only
        handle = pynvml.nvmlDeviceGetHandleByIndex(index)
        memory = pynvml.nvmlDeviceGetMemoryInfo(handle)
        utilisation = pynvml.nvmlDeviceGetUtilizationRates(handle)
        temperature = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)

        return {
            "memory_used_mb": float(memory.used) / (1024 * 1024),
            "memory_total_mb": float(memory.total) / (1024 * 1024),
            "utilisation_percent": float(utilisation.gpu),
            "memory_utilisation_percent": float(utilisation.memory),
            "temperature_celsius": float(temperature),
        }
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.debug("Failed to collect GPU telemetry via NVML: %s", exc)
        return None


def log_available_gpus() -> None:
    """Emit a concise log statement describing detected GPU devices."""

    devices = list_available_gpus()
    if not devices:
        logger.info("No CUDA-capable GPU detected. Running in CPU mode.")
        return

    for device in devices:
        logger.info(
            "Detected GPU %s (index=%s, memory=%s MiB, compute capability=%s)",
            device.name,
            device.index,
            device.total_memory_mb,
            device.compute_capability,
        )


def shutdown_nvml() -> None:
    """Shutdown NVML to prevent handle leaks in long-running processes."""

    if _PYNVML_AVAILABLE:  # pragma: no cover - runtime guard
        try:
            pynvml.nvmlShutdown()
        except Exception:  # pragma: no cover - best effort cleanup
            logger.debug("NVML shutdown encountered a non-fatal error", exc_info=True)
