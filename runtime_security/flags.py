from __future__ import annotations

import os


def runtime_security_enabled() -> bool:
    return os.getenv("SUMMIT_RUNTIME_SECURITY", "0") == "1"
