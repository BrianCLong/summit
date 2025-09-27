"""Command line entry point for RTGH."""

from __future__ import annotations

import argparse
import importlib
import json
from pathlib import Path
from typing import Any, Dict, List

from .config import FuzzConfig, SeededCanary
from .grammar import PayloadGrammar, simple_dict_rule
from .harness import RTGHarness
from .mutators import ConstraintMutator


def _load_config(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _load_adapters(import_path: str):
    module_name, attr = import_path.rsplit(":", 1)
    module = importlib.import_module(module_name)
    adapters = getattr(module, attr)
    if callable(adapters):
        adapters = adapters()
    return adapters


def build_harness_from_config(config: Dict[str, Any]) -> RTGHarness:
    grammar_rules = []
    for rule in config.get("grammar", []):
        grammar_rules.append(simple_dict_rule(rule["name"], rule["template"], rule.get("weight", 1)))
    grammar = PayloadGrammar(grammar_rules)

    mutators: List[ConstraintMutator] = []
    config_mutators = config.get("mutators", [])
    for mutator_config in config_mutators:
        module_name, attr = mutator_config["callable"].rsplit(":", 1)
        module = importlib.import_module(module_name)
        factory = getattr(module, attr)
        mutators.append(factory(**mutator_config.get("kwargs", {})))

    seeded_canaries = [
        SeededCanary(
            gate=item["gate"],
            payload=item["payload"],
            severity=item.get("severity", 1.0),
            metadata=item.get("metadata", {}),
        )
        for item in config.get("seeded_canaries", [])
    ]

    harness = RTGHarness(
        adapters=_load_adapters(config["adapters"]),
        grammar=grammar,
        mutators=mutators,
        config=FuzzConfig(
            iterations=config.get("iterations", 128),
            seed=config.get("seed", 0),
            chained_seed=config.get("chained_seed"),
            cross_gate_chance=config.get("cross_gate_chance", 0.35),
            ci_mode=config.get("ci_mode", False),
            seeded_canaries=seeded_canaries,
        ),
    )
    return harness


def main(argv: List[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Red-Teamable Guard Harness")
    parser.add_argument("config", type=Path, help="Path to RTGH JSON config")
    parser.add_argument("--ci", action="store_true", help="Run in CI mode")
    args = parser.parse_args(argv)

    harness_config = _load_config(args.config)
    if args.ci:
        harness_config["ci_mode"] = True

    harness = build_harness_from_config(harness_config)
    report = harness.run()
    output_path = Path(harness_config.get("output", "rtgh-report.json"))
    output_path.write_bytes(report.to_bytes())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
