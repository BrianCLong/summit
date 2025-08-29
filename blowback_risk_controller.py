"""Planner for modeling blowback risks and integrity responses.

This module provides data classes capturing different components of a
blowback-risk analysis such as paths, provocations, cooling plays and
indicators.  It is intended as a light-weight, in-memory structure that
other systems can populate and inspect in order to tune responses to
provocations while respecting civil liberties.
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Any


@dataclass
class BlowbackPath:
    """Represents a single potential blowback escalation path."""

    path: str
    trigger: str
    likelihood: int
    impact: int
    reversibility: int
    tripwires: List[str] = field(default_factory=list)
    tuning_parameters: Dict[str, float] = field(default_factory=dict)


@dataclass
class Provocation:
    """Describes a piece of bait and the safest counter-moves."""

    bait: str
    counter_moves: List[str]
    confidence: str
    tuning_rules: Dict[str, str] = field(default_factory=dict)


@dataclass
class CoolingPlay:
    """Structured cooling response with timing and channel details."""

    tier: int
    audience: str
    messenger: str
    channel: str
    timing: str
    expected_effect: str
    risks: str
    tuning_sliders: Dict[str, float] = field(default_factory=dict)


@dataclass
class IntegrityFriction:
    """Lawful friction measure with policy references."""

    name: str
    references: List[str]
    intensity_levels: Dict[str, float]
    audience_applications: List[str]


@dataclass
class Indicator:
    """Indicator & warning entry with thresholds and triggers."""

    name: str
    green: str
    amber: str
    red: str
    play_trigger: str
    customizable_params: Dict[str, float]
    fusion_logic: str


@dataclass
class MessengerProfile:
    """Entry in the credible-messenger matrix."""

    audience: str
    messenger: str
    cred_score: float
    reach: str
    notes: str
    selection_algo: str
    variants: Dict[str, str] = field(default_factory=dict)


@dataclass
class TimebandAction:
    """Actions and pivots for a given timeband."""

    band: str
    actions: List[str]
    resources: List[str]
    conditions: List[str]
    pivots: List[str]


@dataclass
class MeasurementPlan:
    """Metric and audit plan for assessing impact."""

    metrics: List[str]
    dashboards: List[str]
    cadence: str
    weights: Dict[str, float]
    tuning_views: List[str]


@dataclass
class BlowbackRiskController:
    """Container orchestrating all blowback-risk elements.

    The controller stores the different analytical components in-memory and
    can export the full plan as a nested dictionary for downstream
    serialization or inspection.
    """

    paths: List[BlowbackPath] = field(default_factory=list)
    provocations: List[Provocation] = field(default_factory=list)
    cooling_plays: List[CoolingPlay] = field(default_factory=list)
    frictions: List[IntegrityFriction] = field(default_factory=list)
    indicators: List[Indicator] = field(default_factory=list)
    messengers: List[MessengerProfile] = field(default_factory=list)
    timebands: List[TimebandAction] = field(default_factory=list)
    measurement_plan: Optional[MeasurementPlan] = None
    transparency_note: Optional[str] = None

    def add_path(self, path: BlowbackPath) -> None:
        self.paths.append(path)

    def add_provocation(self, provocation: Provocation) -> None:
        self.provocations.append(provocation)

    def add_cooling_play(self, play: CoolingPlay) -> None:
        self.cooling_plays.append(play)

    def add_friction(self, friction: IntegrityFriction) -> None:
        self.frictions.append(friction)

    def add_indicator(self, indicator: Indicator) -> None:
        self.indicators.append(indicator)

    def add_messenger(self, messenger: MessengerProfile) -> None:
        self.messengers.append(messenger)

    def add_timeband(self, timeband: TimebandAction) -> None:
        self.timebands.append(timeband)

    def set_measurement_plan(self, plan: MeasurementPlan) -> None:
        self.measurement_plan = plan

    def set_transparency_note(self, note: str) -> None:
        self.transparency_note = note

    def to_dict(self) -> Dict[str, Any]:
        """Return a dictionary representation of the full plan."""

        return {
            "blowback_map": [asdict(p) for p in self.paths],
            "provocations": [asdict(p) for p in self.provocations],
            "cooling_plays": [asdict(p) for p in self.cooling_plays],
            "integrity_frictions": [asdict(f) for f in self.frictions],
            "indicators": [asdict(i) for i in self.indicators],
            "credible_messengers": [asdict(m) for m in self.messengers],
            "timeband_playbook": [asdict(t) for t in self.timebands],
            "measurement_plan": asdict(self.measurement_plan)
            if self.measurement_plan
            else None,
            "transparency_note": self.transparency_note,
        }
