from __future__ import annotations

from src.connectors.reverse_image.plan import run as reverse_run


def run(args: dict) -> dict:
    return reverse_run(args)
