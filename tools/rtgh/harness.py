"""Main fuzzing harness for RTGH."""

from __future__ import annotations

import copy
import random
import time
from collections import defaultdict
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, MutableMapping, Sequence

from .adapters import GateAdapter
from .config import FuzzConfig
from .grammar import PayloadGrammar
from .mutators import ConstraintMutator
from .report import BypassRecord, FuzzReport, GateReport


@dataclass
class FuzzState:
    rng_payload: random.Random
    rng_mutation: random.Random
    rng_chaining: random.Random
    bypass_payloads: MutableMapping[str, List[Dict[str, Any]]]


class RTGHarness:
    """Red-Teamable Guard Harness for governance gate fuzzing."""

    def __init__(
        self,
        adapters: Sequence[GateAdapter],
        grammar: PayloadGrammar,
        mutators: Iterable[ConstraintMutator] | None = None,
        config: FuzzConfig | None = None,
    ) -> None:
        if not adapters:
            raise ValueError("At least one gate adapter is required")
        self.adapters = list(adapters)
        self.grammar = grammar
        self.mutators = list(mutators or [])
        self.config = config or FuzzConfig()

    def _build_state(self) -> FuzzState:
        seeds = self.config.build_rng_seeds()
        return FuzzState(
            rng_payload=random.Random(seeds["payload"]),
            rng_mutation=random.Random(seeds["mutation"]),
            rng_chaining=random.Random(seeds["chaining"]),
            bypass_payloads=defaultdict(list),
        )

    def _apply_mutators(self, payload: Any, state: FuzzState) -> Any:
        result = payload
        for mutator in self.mutators:
            result = mutator(result, state.rng_mutation)
        return result

    def _maybe_chain(self, payload: Any, state: FuzzState) -> Any:
        if not state.bypass_payloads:
            return payload
        if state.rng_chaining.random() > self.config.cross_gate_chance:
            return payload
        donor_gate = state.rng_chaining.choice(list(state.bypass_payloads))
        donor_payload = state.rng_chaining.choice(state.bypass_payloads[donor_gate])
        if isinstance(payload, dict) and isinstance(donor_payload, dict):
            chained = dict(payload)
            chained.update({f"{donor_gate}_signal": copy.deepcopy(donor_payload)})
            return chained
        return copy.deepcopy(donor_payload)

    def _run_canaries(self, state: FuzzState, reports: Dict[str, GateReport]) -> None:
        for canary in self.config.seeded_canaries:
            matching = [adapter for adapter in self.adapters if adapter.name == canary.gate]
            if not matching:
                continue
            adapter = matching[0]
            trace = []
            result = adapter.evaluate(canary.payload)
            trace.append(adapter.trace_from(canary.payload, result))
            if result.allowed:
                bypass = BypassRecord(
                    gate=adapter.name,
                    payload=canary.payload,
                    severity=canary.severity,
                    trace=trace,
                    metadata={"canary": True, **canary.metadata},
                )
                reports[adapter.name].bypasses.append(bypass)
                state.bypass_payloads[adapter.name].append(copy.deepcopy(canary.payload))
            reports[adapter.name].total_cases += 1

    def run(self) -> FuzzReport:
        state = self._build_state()
        gate_reports: Dict[str, GateReport] = {
            adapter.name: GateReport(gate=adapter.name, total_cases=0)
            for adapter in self.adapters
        }

        self._run_canaries(state, gate_reports)

        start_time = time.monotonic()
        for _ in range(self.config.iterations):
            payload = self.grammar.generate(state.rng_payload)
            payload = self._apply_mutators(payload, state)
            payload = self._maybe_chain(payload, state)

            for adapter in self.adapters:
                trace: List[Dict[str, Any]] = []
                result = adapter.evaluate(payload)
                trace_entry = adapter.trace_from(payload, result)
                trace.append(trace_entry)
                gate_report = gate_reports[adapter.name]
                gate_report.total_cases += 1
                if result.allowed:
                    bypass = BypassRecord(
                        gate=adapter.name,
                        payload=payload,
                        severity=result.severity,
                        trace=trace,
                        metadata={"canary": False},
                    )
                    gate_report.bypasses.append(bypass)
                    state.bypass_payloads[adapter.name].append(copy.deepcopy(payload))

            if self.config.timeout_s is not None and (time.monotonic() - start_time) > self.config.timeout_s:
                break

        for report in gate_reports.values():
            report.bypasses.sort(key=lambda record: (-record.severity, repr(record.payload)))

        return FuzzReport(
            seed=self.config.seed,
            ci_mode=self.config.ci_mode,
            gate_reports=[gate_reports[adapter.name] for adapter in self.adapters],
            metadata={"iterations": self.config.iterations},
        )


__all__ = ["RTGHarness"]
