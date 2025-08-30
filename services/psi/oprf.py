"""OPRF tokenization helpers used for PSI joins."""

from collections.abc import Iterable


def create_tokens(ids: Iterable[str]) -> list[str]:
    """Return deterministic placeholder tokens for identifiers.

    This stub does not implement real cryptography but illustrates the
    interface expected by the federation gateway.
    """
    return [f"token:{value}" for value in ids]
