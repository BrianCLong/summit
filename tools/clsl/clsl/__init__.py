"""Content Laundering Stress Lab (CLSL)."""

from importlib.metadata import version, PackageNotFoundError

try:
  __version__ = version("clsl")
except PackageNotFoundError:  # pragma: no cover - fallback for local execution
  __version__ = "0.1.0"

__all__ = ["__version__"]
