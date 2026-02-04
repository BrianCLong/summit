from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class KeelConfig:
    enabled: bool = False
    alpha_mode: str = "unset"
    num_layers: int | None = None
    const_alpha: float | None = None

    def validate(self) -> None:
        if not self.enabled:
            return
        if self.alpha_mode not in {"L", "sqrtL", "const"}:
            raise ValueError("Keel enabled but alpha_mode not explicitly set.")
        if self.num_layers is None or self.num_layers <= 0:
            raise ValueError("Keel enabled but num_layers missing/invalid.")
        if self.alpha_mode == "const":
            if self.const_alpha is None:
                raise ValueError("Keel enabled with alpha_mode=const but const_alpha missing.")
            if self.const_alpha <= 0:
                raise ValueError("Keel enabled with alpha_mode=const but const_alpha invalid.")


def resolve_keel_alpha(config: KeelConfig) -> float:
    if not config.enabled:
        raise ValueError("Keel is disabled; alpha resolution is not permitted.")
    if config.alpha_mode == "L":
        assert config.num_layers is not None
        return float(config.num_layers)
    if config.alpha_mode == "sqrtL":
        assert config.num_layers is not None
        return float(config.num_layers) ** 0.5
    if config.alpha_mode == "const":
        assert config.const_alpha is not None
        return float(config.const_alpha)
    raise ValueError("Keel enabled but alpha_mode not explicitly set.")
