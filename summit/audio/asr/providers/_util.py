from __future__ import annotations

import os

import summit.flags


def deny_if_disabled(flag: str) -> None:
    if os.getenv(flag, "0") != "1" and not summit.flags.FEATURE_QWEN3_ASR:
        raise RuntimeError(f"disabled by default: set {flag}=1 or FEATURE_QWEN3_ASR=1 to enable")
