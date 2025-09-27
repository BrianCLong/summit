from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from tools.scba import (
    CacheWarmAttack,
    CoarseTimerAttack,
    EndpointPolicy,
    LeakBudget,
    LengthLeakAttack,
    PolicyStore,
    SideChannelBudgetAuditor,
)
from tools.scba.measurements import Measurement
from tools.scba.probes import SyntheticProbe


def make_policy(padding: bool, jitter: bool, cache_bust: bool) -> EndpointPolicy:
    return EndpointPolicy(
        endpoint="payments:create",
        budget=LeakBudget(latency_ms=2.0, payload_bytes=4.0, cache_hint=0.2),
        mitigation_toggles={
            "padding": padding,
            "jitter": jitter,
            "cache-bust": cache_bust,
        },
    )


def make_probe(policy: EndpointPolicy) -> SyntheticProbe:
    def _invoke(secret: str, rng) -> Measurement:
        base_latency = 30.0
        base_size = 128
        base_cache = 0.1

        latency = base_latency
        size = base_size
        cache_hint = base_cache

        if secret in {"1", "slow", "warm"}:
            latency += 8.0
            size += 24
            cache_hint = 1.0

        if policy.is_toggle_enabled("padding"):
            size = base_size + 16

        if policy.is_toggle_enabled("jitter"):
            latency = base_latency + rng.uniform(-0.5, 0.5)

        if policy.is_toggle_enabled("cache-bust"):
            cache_hint = 0.15

        return Measurement(
            latency_ms=latency,
            payload_bytes=size,
            cache_hint=cache_hint,
            meta={},
        )

    return SyntheticProbe(_invoke)


def run_attacks(policy: EndpointPolicy) -> list:
    store = PolicyStore({policy.endpoint: policy})
    auditor = SideChannelBudgetAuditor(store, seed=1337)
    probe = make_probe(policy)
    auditor.register_attack(policy.endpoint, LengthLeakAttack(probe, secrets=("0", "1"), samples_per_secret=15))
    auditor.register_attack(policy.endpoint, CoarseTimerAttack(probe, secrets=("fast", "slow"), samples_per_secret=15))
    auditor.register_attack(policy.endpoint, CacheWarmAttack(probe, secrets=("cold", "warm"), samples_per_secret=15))
    return auditor.run()


def test_seeded_leaks_are_flagged_when_over_budget():
    policy = make_policy(padding=False, jitter=False, cache_bust=False)
    findings = run_attacks(policy)
    assert any(not finding.passed for finding in findings)
    for finding in findings:
        if not finding.passed:
            assert any(
                measurement.effect > finding.budget[channel]
                for channel, measurement in finding.channel_measurements.items()
            )


def test_mitigations_reduce_leakage_below_budget():
    policy = make_policy(padding=True, jitter=True, cache_bust=True)
    findings = run_attacks(policy)
    assert all(finding.passed for finding in findings)
    serialized = [json.loads(finding.to_json()) for finding in findings]
    for record in serialized:
        for channel, metrics in record["channels"].items():
            assert metrics["effect"] <= record["budget"][channel]
