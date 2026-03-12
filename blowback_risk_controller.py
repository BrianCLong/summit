"""Planner for modeling blowback risks and integrity responses.

This module provides data classes capturing different components of a
blowback-risk analysis such as paths, provocations, cooling plays and
indicators.  It is intended as a light-weight, in-memory structure that
other systems can populate and inspect in order to tune responses to
provocations while respecting civil liberties.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


class ValidationError(ValueError):
    """Raised when controller configuration is inconsistent."""


@dataclass
class RiskScoreConfig:
    """Configuration used to tune the blowback risk score."""

    likelihood_weight: float = 1.0
    impact_weight: float = 1.0
    reversibility_weight: float = 1.0
    reversibility_ceiling: float = 10.0
    reversibility_floor: float = 0.0
    tuning_parameter_weights: dict[str, float] = field(default_factory=dict)
    audience_weights: dict[str, float] = field(default_factory=dict)

    def apply_tuning(self, score: float, path: BlowbackPath) -> float:
        """Adjust the risk score using tuning parameters and audience weights."""

        adjusted = score
        for key, weight in self.tuning_parameter_weights.items():
            if weight == 0:
                continue
            value = path.tuning_parameters.get(key)
            if value is None:
                continue
            adjusted *= 1 + max(0.0, value) * weight
        if path.audience_segments:
            for audience in path.audience_segments:
                multiplier = self.audience_weights.get(audience)
                if multiplier is None:
                    continue
                adjusted *= multiplier
        return adjusted

    def validate(self) -> None:
        """Validate that weights are non-negative."""

        invalid = [
            name
            for name, value in [
                ("likelihood_weight", self.likelihood_weight),
                ("impact_weight", self.impact_weight),
                ("reversibility_weight", self.reversibility_weight),
                ("reversibility_ceiling", self.reversibility_ceiling),
                ("reversibility_floor", self.reversibility_floor),
            ]
            if value < 0
        ]
        if invalid:
            raise ValidationError(
                f"RiskScoreConfig has negative weights: {', '.join(sorted(invalid))}"
            )
        for mapping_name, mapping in (
            ("tuning_parameter_weights", self.tuning_parameter_weights),
            ("audience_weights", self.audience_weights),
        ):
            for key, value in mapping.items():
                if value < 0:
                    raise ValidationError(f"{mapping_name} contains negative weight for '{key}'")


@dataclass
class BlowbackPath:
    """Represents a single potential blowback escalation path."""

    path: str
    trigger: str
    likelihood: int
    impact: int
    reversibility: int
    tripwires: list[str] = field(default_factory=list)
    tuning_parameters: dict[str, float] = field(default_factory=dict)
    audience_segments: list[str] = field(default_factory=list)
    channels: list[str] = field(default_factory=list)
    notes: str | None = None

    def __post_init__(self) -> None:
        self._validate_scale(self.likelihood, "likelihood")
        self._validate_scale(self.impact, "impact")
        self._validate_scale(self.reversibility, "reversibility")
        for key, value in self.tuning_parameters.items():
            if not 0.0 <= value <= 1.0:
                raise ValidationError(
                    f"Tuning parameter '{key}' for path '{self.path}' must be between 0 and 1"
                )

    @staticmethod
    def _validate_scale(value: int, field_name: str) -> None:
        if not 1 <= value <= 10:
            raise ValidationError(
                f"{field_name} must be between 1 and 10 inclusive; received {value}"
            )

    def risk_score(self, config: RiskScoreConfig | None = None) -> float:
        """Compute an adjustable composite risk score."""

        config = config or RiskScoreConfig()
        config.validate()
        likelihood_term = self.likelihood * config.likelihood_weight
        impact_term = self.impact * config.impact_weight
        reversibility_gap = config.reversibility_ceiling - self.reversibility
        reversibility_term = max(config.reversibility_floor, reversibility_gap)
        base_score = (
            likelihood_term * impact_term * (reversibility_term * config.reversibility_weight)
        )
        return config.apply_tuning(base_score, self)

    def risk_details(self, config: RiskScoreConfig | None = None) -> dict[str, float]:
        """Return a breakdown of the components used for the score."""

        config = config or RiskScoreConfig()
        config.validate()
        likelihood_term = self.likelihood * config.likelihood_weight
        impact_term = self.impact * config.impact_weight
        reversibility_gap = config.reversibility_ceiling - self.reversibility
        reversibility_term = max(config.reversibility_floor, reversibility_gap)
        base_score = (
            likelihood_term * impact_term * (reversibility_term * config.reversibility_weight)
        )
        adjusted = config.apply_tuning(base_score, self)
        return {
            "likelihood_term": likelihood_term,
            "impact_term": impact_term,
            "reversibility_term": reversibility_term * config.reversibility_weight,
            "base_score": base_score,
            "adjusted_score": adjusted,
        }


@dataclass
class Provocation:
    """Describes a piece of bait and the safest counter-moves."""

    bait: str
    counter_moves: list[str]
    confidence: str
    tuning_rules: dict[str, str] = field(default_factory=dict)


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
    tuning_sliders: dict[str, float] = field(default_factory=dict)


@dataclass
class IntegrityFriction:
    """Lawful friction measure with policy references."""

    name: str
    references: list[str]
    intensity_levels: dict[str, float]
    audience_applications: list[str]


@dataclass
class Indicator:
    """Indicator & warning entry with thresholds and triggers."""

    name: str
    green: str
    amber: str
    red: str
    play_trigger: str
    customizable_params: dict[str, float]
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
    variants: dict[str, str] = field(default_factory=dict)


@dataclass
class TimebandAction:
    """Actions and pivots for a given timeband."""

    band: str
    actions: list[str]
    resources: list[str]
    conditions: list[str]
    pivots: list[str]


@dataclass
class MeasurementPlan:
    """Metric and audit plan for assessing impact."""

    metrics: list[str]
    dashboards: list[str]
    cadence: str
    weights: dict[str, float]
    tuning_views: list[str]


@dataclass
class BlowbackRiskController:
    """Container orchestrating all blowback-risk elements.

    The controller stores the different analytical components in-memory and
    can export the full plan as a nested dictionary for downstream
    serialization or inspection.
    """

    paths: list[BlowbackPath] = field(default_factory=list)
    provocations: list[Provocation] = field(default_factory=list)
    cooling_plays: list[CoolingPlay] = field(default_factory=list)
    frictions: list[IntegrityFriction] = field(default_factory=list)
    indicators: list[Indicator] = field(default_factory=list)
    messengers: list[MessengerProfile] = field(default_factory=list)
    timebands: list[TimebandAction] = field(default_factory=list)
    measurement_plan: MeasurementPlan | None = None
    transparency_note: str | None = None

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

    def to_dict(self) -> dict[str, Any]:
        """Return a dictionary representation of the full plan."""

        return {
            "blowback_map": [asdict(p) for p in self.paths],
            "provocations": [asdict(p) for p in self.provocations],
            "cooling_plays": [asdict(p) for p in self.cooling_plays],
            "integrity_frictions": [asdict(f) for f in self.frictions],
            "indicators": [asdict(i) for i in self.indicators],
            "credible_messengers": [asdict(m) for m in self.messengers],
            "timeband_playbook": [asdict(t) for t in self.timebands],
            "measurement_plan": asdict(self.measurement_plan) if self.measurement_plan else None,
            "transparency_note": self.transparency_note,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> BlowbackRiskController:
        """Recreate a controller from a serialized dictionary."""
        controller = cls()
        for p in data.get("blowback_map", []):
            controller.add_path(BlowbackPath(**p))
        for p in data.get("provocations", []):
            controller.add_provocation(Provocation(**p))
        for p in data.get("cooling_plays", []):
            controller.add_cooling_play(CoolingPlay(**p))
        for f in data.get("integrity_frictions", []):
            controller.add_friction(IntegrityFriction(**f))
        for i in data.get("indicators", []):
            controller.add_indicator(Indicator(**i))
        for m in data.get("credible_messengers", []):
            controller.add_messenger(MessengerProfile(**m))
        for t in data.get("timeband_playbook", []):
            controller.add_timeband(TimebandAction(**t))
        if mp := data.get("measurement_plan"):
            controller.set_measurement_plan(MeasurementPlan(**mp))
        if note := data.get("transparency_note"):
            controller.set_transparency_note(note)
        return controller

    def rank_paths(self, config: RiskScoreConfig | None = None) -> list[BlowbackPath]:
        """Return paths ordered by descending risk score."""

        config = config or RiskScoreConfig()
        return sorted(self.paths, key=lambda p: p.risk_score(config), reverse=True)

    def aggregate_risk(self, config: RiskScoreConfig | None = None) -> dict[str, Any]:
        """Return summary statistics for stored blowback paths."""

        config = config or RiskScoreConfig()
        config.validate()
        if not self.paths:
            return {
                "total_paths": 0,
                "highest_risk_path": None,
                "average_score": 0.0,
                "audience_totals": {},
            }

        scores = [(path, path.risk_score(config)) for path in self.paths]
        highest_path, highest_score = max(scores, key=lambda item: item[1])
        average_score = sum(score for _, score in scores) / len(scores)
        audience_totals: dict[str, float] = {}
        for path, score in scores:
            segments = path.audience_segments or ["general"]
            for segment in segments:
                audience_totals[segment] = audience_totals.get(segment, 0.0) + score
        return {
            "total_paths": len(self.paths),
            "highest_risk_path": {"path": highest_path.path, "score": highest_score},
            "average_score": average_score,
            "audience_totals": audience_totals,
        }

    def high_risk_tripwires(
        self, threshold: float, config: RiskScoreConfig | None = None
    ) -> dict[str, list[str]]:
        """Return tripwires for paths exceeding the given risk threshold."""

        if threshold < 0:
            raise ValidationError("Threshold must be non-negative")
        config = config or RiskScoreConfig()
        alerts: dict[str, list[str]] = {}
        for path in self.paths:
            score = path.risk_score(config)
            if score >= threshold:
                alerts[path.path] = list(path.tripwires)
        return alerts

    def validate(self, config: RiskScoreConfig | None = None) -> None:
        """Validate controller contents and optional scoring configuration."""

        if config is not None:
            config.validate()

        errors: list[str] = []
        seen_paths = set()
        for path in self.paths:
            if path.path in seen_paths:
                errors.append(f"Duplicate blowback path id '{path.path}' detected")
            seen_paths.add(path.path)

        for messenger in self.messengers:
            if not 0.0 <= messenger.cred_score <= 1.0:
                errors.append(
                    f"Messenger '{messenger.messenger}' cred_score must be between 0 and 1"
                )

        if self.measurement_plan:
            for metric, weight in self.measurement_plan.weights.items():
                if weight < 0:
                    errors.append(f"Measurement weight for '{metric}' must be non-negative")

        if errors:
            raise ValidationError("; ".join(errors))
