"""Run a minimal deception simulation for CI purposes."""

from __future__ import annotations

import logging
from pathlib import Path

try:
    import yaml  # type: ignore
except Exception:  # pragma: no cover - YAML parser optional
    yaml = None

from counter_response_agent import CounterResponseAgent
from deception_graph_builder import DeceptionGraphBuilder

SCENARIO_FILE = Path("scenarios/deception/basic.yaml")


def load_scenario() -> dict:
    if yaml is None:
        return {"decoy_density": 0.1, "bait_type": "honeypot"}
    with SCENARIO_FILE.open() as fh:
        return yaml.safe_load(fh)


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    scenario = load_scenario()
    builder = DeceptionGraphBuilder()
    real_node = "server-1"
    decoy_id = builder.create_decoy(
        real_node,
        trap_type=scenario["bait_type"],
        bait_score=scenario["decoy_density"],
        deception_level="medium",
    )
    agent = CounterResponseAgent()
    agent.trigger(decoy_id, "inject-additional-decoys")


if __name__ == "__main__":
    main()
