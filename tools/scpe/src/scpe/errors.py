"""Custom exceptions for SCPE."""

from __future__ import annotations


class SCPEError(Exception):
    """Base exception for SCPE-related failures."""

    def __init__(self, message: str, *, hint: str | None = None) -> None:
        super().__init__(message)
        self.hint = hint

    def __str__(self) -> str:  # pragma: no cover - debug helper
        if self.hint:
            return f"{super().__str__()} (hint: {self.hint})"
        return super().__str__()


class ConfigError(SCPEError):
    """Raised when SCPE configuration is invalid."""


class VerificationError(SCPEError):
    """Raised when verification of an artifact fails."""


class ReceiptError(SCPEError):
    """Raised when an attested receipt fails integrity checks."""
