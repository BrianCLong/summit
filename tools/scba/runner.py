"""Core orchestration logic for the Side-Channel Budget Auditor."""

from __future__ import annotations

import json
import random
from dataclasses import dataclass
from typing import Dict, Iterable, List

from .attacks import Attack, AttackResult
from .measurements import Measurement
from .policies import EndpointPolicy, PolicyStore
from .stats import effect_size, welch_p_value


@dataclass
class ChannelMeasurement:
    channel: str
    effect: float
    p_value: float

    def to_dict(self) -> Dict[str, float]:
        return {"effect": self.effect, "p_value": self.p_value}


@dataclass
class AuditFinding:
    endpoint: str
    attack: str
    channel_measurements: Dict[str, ChannelMeasurement]
    passed: bool
    budget: Dict[str, float]

    def to_json(self) -> str:
        payload = {
            "endpoint": self.endpoint,
            "attack": self.attack,
            "passed": self.passed,
            "budget": self.budget,
            "channels": {name: measurement.to_dict() for name, measurement in self.channel_measurements.items()},
        }
        return json.dumps(payload, indent=2, sort_keys=True)


class SideChannelBudgetAuditor:
    """Executes canned attacks against registered endpoints."""

    def __init__(self, policies: PolicyStore | None = None, seed: int = 0) -> None:
        self.policies = policies or PolicyStore()
        self.seed = seed
        self.attacks: Dict[str, List[Attack]] = {}

    def register_attack(self, endpoint: str, attack: Attack) -> None:
        self.attacks.setdefault(endpoint, []).append(attack)

    def run(self) -> List[AuditFinding]:
        rng = random.Random(self.seed)
        findings: List[AuditFinding] = []
        for endpoint, attacks in self.attacks.items():
            policy = self.policies.get(endpoint)
            if not policy:
                raise ValueError(f"missing policy for endpoint {endpoint}")
            for attack in attacks:
                results = attack.collect(rng)
                finding = self._analyse_attack(policy, attack, results)
                findings.append(finding)
        return findings

    def _analyse_attack(self, policy: EndpointPolicy, attack: Attack, results: List[AttackResult]) -> AuditFinding:
        measurements: Dict[str, ChannelMeasurement] = {}
        channels = policy.budget.as_dict().keys()
        for channel in channels:
            channel_samples = [[sample.channel(channel) for sample in result.samples] for result in results]
            # Compare each secret to baseline and take the worst leakage observed.
            worst_effect = 0.0
            worst_p_value = 1.0
            for sample_set in channel_samples[1:]:
                effect = effect_size(channel_samples[0], sample_set)
                p_value = welch_p_value(channel_samples[0], sample_set)
                if effect > worst_effect:
                    worst_effect = effect
                if p_value < worst_p_value:
                    worst_p_value = p_value
            measurements[channel] = ChannelMeasurement(channel=channel, effect=worst_effect, p_value=worst_p_value)
        passed = all(measurements[ch].effect <= policy.budget.as_dict()[ch] for ch in channels)
        return AuditFinding(
            endpoint=policy.endpoint,
            attack=attack.name,
            channel_measurements=measurements,
            passed=passed,
            budget=policy.budget.as_dict(),
        )

    @staticmethod
    def summarize(findings: Iterable[AuditFinding]) -> str:
        data = [finding.to_json() for finding in findings]
        return "\n".join(data)
