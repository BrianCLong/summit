#!/usr/bin/env python3
"""
Apollo Chaos & Rollback Simulation.
Simulates a production latency spike during rollout and triggers automated rollback.
"""

import sys
import logging
import random
from dataclasses import dataclass
from typing import Dict, List
from summit.integrations.palantir_apollo import ReleaseGate, ReleaseChannel, ProductRelease

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

class RollbackController:
    """
    Watches metrics and reverts version if SLA is breached.
    """
    def __init__(self, gate: ReleaseGate):
        self.gate = gate
        self.current_version = "1.0.0"
        self.history = ["1.0.0"]

    def deploy(self, version: str, metrics: Dict[str, float]) -> bool:
        logging.info(f"Deploying {version}...")
        release = ProductRelease(version, "prod", metrics)
        decision = self.gate.evaluate_release(release)

        if "NO-GO" in decision:
            logging.error(f"Deployment rejected by Gate: {decision}")
            self.rollback()
            return False

        self.current_version = version
        self.history.append(version)
        logging.info(f"Deployment {version} successful.")
        return True

    def rollback(self):
        # Rolling back reverts to the state BEFORE the failed deploy attempt.
        # So we look at history[-1] because the failed deploy was never appended to history.
        if len(self.history) >= 1:
            previous = self.history[-1]
            logging.warning(f"!!! TRIGGERING ROLLBACK to {previous} !!!")
            self.current_version = previous
        else:
            logging.critical("Cannot rollback! No history.")

def run_chaos_sim():
    gate = ReleaseGate([ReleaseChannel("prod", True, 200)]) # Strict 200ms SLA
    controller = RollbackController(gate)

    # 1. Healthy Deploy
    logging.info("--- Phase 1: Healthy Deploy ---")
    controller.deploy("1.1.0", {"runtime_ms": 150.0})
    assert controller.current_version == "1.1.0"

    # 2. Chaos Deploy (Latency Spike)
    logging.info("--- Phase 2: Chaos Injection ---")
    # Simulate network chaos adding 500ms latency
    chaos_latency = 150.0 + random.randint(300, 600)

    success = controller.deploy("1.2.0", {"runtime_ms": chaos_latency})

    if not success:
        logging.info("Chaos properly handled.")
        if controller.current_version == "1.1.0":
            logging.info("Rollback verified: Back to 1.1.0")
        else:
            logging.error(f"Rollback failed! Stuck on {controller.current_version}")
            sys.exit(1)
    else:
        logging.error("Chaos failed to trigger rollback!")
        sys.exit(1)

if __name__ == "__main__":
    run_chaos_sim()
