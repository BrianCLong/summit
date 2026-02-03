from __future__ import annotations

from .config import PrivacyGraphConfig


class PrivacyGraphPolicyError(RuntimeError):
    pass

class PrivacyGraphPolicy:
    @staticmethod
    def validate(cfg: PrivacyGraphConfig) -> None:
        if not cfg.enabled:
            raise PrivacyGraphPolicyError("privacy_graph disabled (deny-by-default)")
        if cfg.require_dp and (cfg.dp_epsilon is None or cfg.dp_delta is None):
            raise PrivacyGraphPolicyError("DP required but dp_epsilon/dp_delta missing")
        if cfg.backend not in ("plaintext", "he_simulated"):
            raise PrivacyGraphPolicyError(f"Unknown backend: {cfg.backend}")
