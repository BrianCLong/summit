"""Hardware Determinism Guard (HDG).

This module exposes helper entry points for enforcing deterministic
behavior across supported ML frameworks, emitting reproducibility
receipts, and scanning execution traces for nondeterministic kernels.
"""

from .determinism import enforce_determinism, seed_everything
from .receipt import DeterminismReceipt, ReceiptEmitter
from .scanner import VarianceScanner, VarianceScanResult

__all__ = [
    "enforce_determinism",
    "seed_everything",
    "DeterminismReceipt",
    "ReceiptEmitter",
    "VarianceScanner",
    "VarianceScanResult",
]
