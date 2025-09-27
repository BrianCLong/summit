"""Executable entry point for ``python -m tools.itrc``."""

from .cli import main

if __name__ == "__main__":  # pragma: no cover - CLI bootstrap
    raise SystemExit(main())
