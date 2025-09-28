from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tools.rtgh import (
    FuzzConfig,
    PayloadGrammar,
    RTGHarness,
    SeededCanary,
)
from tools.rtgh.adapters import GateResult, InMemoryGateAdapter
from tools.rtgh.grammar import GrammarRule
from tools.rtgh.mutators import field_flip_mutator, inject_flag_mutator


@pytest.fixture
def sample_adapters():
    def rsr(payload):
        if payload.get("action") == "grant" and payload.get("role") == "admin":
            return GateResult(True, 0.9, {"reason": "privilege escalation"})
        return GateResult(False, 0.0)

    def qpg(payload):
        if payload.get("quota", 0) > 5 and payload.get("region") == "restricted":
            return GateResult(True, 0.6, {"reason": "quota override"})
        return GateResult(False, 0.0)

    return [
        InMemoryGateAdapter("RSR", rsr),
        InMemoryGateAdapter("QPG", qpg),
    ]


def build_grammar():
    rules = [
        GrammarRule(
            name="baseline",
            generator=lambda rng: {
                "action": rng.choice(["audit", "grant", "revoke"]),
                "role": rng.choice(["user", "auditor", "admin"]),
                "quota": rng.randint(0, 10),
                "region": rng.choice(["open", "restricted"]),
            },
            weight=4,
        ),
        GrammarRule(
            name="elevate",
            generator=lambda rng: {"action": "grant", "role": "user", "quota": rng.randint(0, 3), "region": "open"},
            weight=1,
        ),
    ]
    return PayloadGrammar(rules)


def test_seeded_bypass_produces_stable_scores(sample_adapters):
    grammar = build_grammar()
    mutators = [
        inject_flag_mutator("role", "admin", name="force-admin"),
        field_flip_mutator("region", ["restricted", "open"], name="flip-region"),
    ]

    config = FuzzConfig(
        iterations=32,
        seed=1337,
        ci_mode=False,
        seeded_canaries=[
            SeededCanary(gate="RSR", payload={"action": "grant", "role": "admin"}, severity=0.9),
        ],
    )

    harness = RTGHarness(sample_adapters, grammar, mutators, config)
    report = harness.run()

    rsr_report = next(g for g in report.gate_reports if g.gate == "RSR")
    assert rsr_report.bypass_rate > 0
    assert rsr_report.average_severity > 0
    assert pytest.approx(rsr_report.unified_score(), rel=1e-6) == rsr_report.unified_score()
    assert any(record.metadata.get("canary") for record in rsr_report.bypasses)

    rerun_report = RTGHarness(sample_adapters, grammar, mutators, config).run()
    assert report.to_bytes() == rerun_report.to_bytes()


def test_adapters_record_full_traces(sample_adapters):
    grammar = build_grammar()
    config = FuzzConfig(iterations=4, seed=7)
    harness = RTGHarness(sample_adapters, grammar, [], config)
    report = harness.run()

    bypass_records = [record for gate in report.gate_reports for record in gate.bypasses]
    if bypass_records:
        trace = bypass_records[0].trace
        assert trace, "trace should contain at least one entry"
        assert trace[0]["gate"] in {adapter.name for adapter in sample_adapters}
        assert "payload" in trace[0]


def test_ci_mode_generates_stable_output(sample_adapters):
    grammar = build_grammar()
    config = FuzzConfig(iterations=8, seed=2024, ci_mode=True)
    harness = RTGHarness(sample_adapters, grammar, [], config)
    first = harness.run().to_bytes()
    second = RTGHarness(sample_adapters, grammar, [], config).run().to_bytes()
    assert first == second
