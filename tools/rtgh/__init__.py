"""Red-Teamable Guard Harness (RTGH).

This package provides a pluggable fuzzing harness that can exercise multiple
categories of governance gates (RSR, PPC, MOCC, QPG, SRPL) through a unified
interface.  It exposes the primary :class:`RTGHarness` along with helper data
structures used to build payload grammars, constraint mutators, and reporting
logic.
"""

from .config import FuzzConfig, SeededCanary
from .grammar import PayloadGrammar
from .mutators import ConstraintMutator, ProbabilityMutator
from .adapters import GateAdapter, GateResult
from .harness import RTGHarness
from .report import FuzzReport, GateReport, BypassRecord

__all__ = [
    "FuzzConfig",
    "SeededCanary",
    "PayloadGrammar",
    "ConstraintMutator",
    "ProbabilityMutator",
    "GateAdapter",
    "GateResult",
    "RTGHarness",
    "FuzzReport",
    "GateReport",
    "BypassRecord",
]
