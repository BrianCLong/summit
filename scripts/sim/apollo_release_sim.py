#!/usr/bin/env python3
"""
Apollo Release Simulation.
Simulates promoting a release through Dev -> Staging -> Prod environments,
gating each stage based on mocked metrics.
"""

import sys
import logging
from dataclasses import dataclass
from typing import Dict
from summit.integrations.palantir_apollo import ReleaseGate, ReleaseChannel, ProductRelease

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

@dataclass
class ReleaseCandidate:
    version: str
    metrics: Dict[str, float]

def run_simulation():
    # Define channels with increasingly strict SLAs
    channels = [
        ReleaseChannel(name="dev", requires_approval=False, sla_latency_ms=1000),
        ReleaseChannel(name="staging", requires_approval=False, sla_latency_ms=500),
        ReleaseChannel(name="prod", requires_approval=True, sla_latency_ms=100),
    ]
    gate = ReleaseGate(channels)

    # Simulate a release candidate
    # This one is fast (50ms) so it should pass all gates
    rc = ReleaseCandidate(version="2.0.0-rc1", metrics={"runtime_ms": 50.0})

    stages = ["dev", "staging", "prod"]

    for stage in stages:
        logging.info(f"Attempting promotion to {stage}...")

        release = ProductRelease(
            version=rc.version,
            channel=stage,
            metrics=rc.metrics
        )

        decision = gate.evaluate_release(release)
        logging.info(f"Gate Decision: {decision}")

        if "NO-GO" in decision:
            logging.error(f"Promotion to {stage} failed!")
            sys.exit(1)

    logging.info("Release successfully promoted to PROD.")

    # Simulate a bad release
    logging.info("--- Simulating Bad Release ---")
    bad_rc = ReleaseCandidate(version="2.0.0-bad", metrics={"runtime_ms": 600.0})

    # Dev (Limit 1000) -> Pass
    # Staging (Limit 500) -> Fail

    try:
        # Dev
        d1 = gate.evaluate_release(ProductRelease(bad_rc.version, "dev", bad_rc.metrics))
        assert "GO" == d1
        logging.info("Dev: PASS")

        # Staging
        d2 = gate.evaluate_release(ProductRelease(bad_rc.version, "staging", bad_rc.metrics))
        logging.info(f"Staging Decision: {d2}")
        if "NO-GO" in d2:
            logging.info("Caught expected failure in Staging. Simulation success.")
        else:
            logging.error("Staging should have failed!")
            sys.exit(1)

    except Exception as e:
        logging.error(f"Simulation error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_simulation()
