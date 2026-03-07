from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional

PrecisionMode = Literal["bf16", "fp8_unified", "mixed_legacy"]
FP8Format = Literal["E4M3", "E5M2"]

@dataclass(frozen=True)
class FP8Config:
    fmt: FP8Format = "E4M3"
    amax_history: int = 16
    scale_method: str = "dynamic"  # TODO: define allowed values
    allow_calibration_ops: list[str] = field(default_factory=list)  # deny-by-default

@dataclass(frozen=True)
class EnforcementConfig:
    deny_on_mismatch: bool = True
    mismatch_tol: float = 0.0  # deny-by-default (no mismatch allowed) until tuned

@dataclass(frozen=True)
class PrecisionFlowPolicy:
    mode: PrecisionMode = "bf16"
    fp8: FP8Config = field(default_factory=FP8Config)
    enforcement: EnforcementConfig = field(default_factory=EnforcementConfig)

def policy_from_dict(d: dict[str, Any]) -> PrecisionFlowPolicy:
    # Minimal parser; keep blast radius small.
    mode = d.get("mode", "bf16")
    fp8d = d.get("fp8", {}) or {}
    end = d.get("enforcement", {}) or {}
    return PrecisionFlowPolicy(
        mode=mode,
        fp8=FP8Config(
            fmt=fp8d.get("format", fp8d.get("fmt", "E4M3")),
            amax_history=int(fp8d.get("amax_history", 16)),
            scale_method=str(fp8d.get("scale_method", "dynamic")),
            allow_calibration_ops=list(fp8d.get("allow_calibration_ops", [])),
        ),
        enforcement=EnforcementConfig(
            deny_on_mismatch=bool(end.get("deny_on_mismatch", True)),
            mismatch_tol=float(end.get("mismatch_tol", 0.0)),
        ),
    )
