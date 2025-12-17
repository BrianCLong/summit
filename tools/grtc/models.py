"""Data models for the GRTC compiler."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Mapping, Optional


@dataclass(frozen=True)
class RequirementExample:
    """Raw example provided in the governance requirement specification."""

    name: str
    payload: Any
    expected: Any
    notes: Optional[str] = None


@dataclass(frozen=True)
class MinimalReproduction:
    """Minimal reproduction entry grouped by adapter classification."""

    category: str
    name: str
    payload: Any
    expected: Any
    notes: Optional[str] = None


@dataclass(frozen=True)
class RequirementRule:
    """Governance rule as described in the YAML specification."""

    rule_id: str
    title: str
    purpose: str
    jurisdictions: List[str]
    statement: str
    tags: List[str] = field(default_factory=list)
    positive: List[RequirementExample] = field(default_factory=list)
    negative: List[RequirementExample] = field(default_factory=list)
    boundaries: List[RequirementExample] = field(default_factory=list)
    minimal_reproductions: List[MinimalReproduction] = field(default_factory=list)


@dataclass(frozen=True)
class GovernanceSpecification:
    """Top-level specification for the compiler."""

    spec_id: str
    description: str
    seed: str
    version: str
    purposes: Mapping[str, str]
    jurisdictions: Mapping[str, Mapping[str, Any]]
    rules: List[RequirementRule]


@dataclass(frozen=True)
class TestCase:
    """Normalized test case emitted by the compiler."""

    test_id: str
    rule_id: str
    title: str
    kind: str
    category: str
    purpose: str
    jurisdictions: List[str]
    tags: List[str]
    payload: Any
    expected: Any
    notes: Optional[str] = None


@dataclass(frozen=True)
class CorpusArtifact:
    """Bundle of compiled tests and manifest metadata."""

    manifest: Dict[str, Any]
    tests: List[TestCase]


ALLOWED_MINIMAL_CATEGORIES = ("RSR", "PPC", "MOCC", "QPG")
