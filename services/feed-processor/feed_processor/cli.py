"""CLI entrypoints for the feed processor service."""

from __future__ import annotations

import argparse
import asyncio
import logging
from typing import Optional

from .config import Settings, get_settings
from .processor import run_from_cli
from .tracing import configure_tracing


def parse_args(argv: Optional[list[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the feed processor workers")
    parser.add_argument(
        "--log-level",
        default=None,
        help="Override the configured log level (DEBUG, INFO, WARNING, ERROR)",
    )
    return parser.parse_args(argv)


async def async_main(settings: Settings) -> None:
    provider = configure_tracing(settings)
    logging.basicConfig(level=getattr(logging, settings.log_level))
    try:
        await run_from_cli(settings)
    finally:
        if provider:
            provider.shutdown()


def main(argv: Optional[list[str]] = None) -> None:
    args = parse_args(argv)
    settings = get_settings()
    if args.log_level:
        settings = settings.model_copy(
            update={"log_level": args.log_level.upper()}
        )
    asyncio.run(async_main(settings))


if __name__ == "__main__":
    main()
