from __future__ import annotations

import os


def deny_if_disabled(flag: str) -> None:
    if os.getenv(flag, "0") != "1":
        raise RuntimeError(f"disabled by default: set {flag}=1 to enable")
