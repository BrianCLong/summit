import argparse
import csv
import json
import logging
import os
import random
import subprocess
import sys
from pathlib import Path
from typing import Any

import yaml

# Ensure we can import from impl
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class ExperimentHarness:
    """
    Experiment harness for running Auto-Scientist benchmarks and experiments.
    Supports both simple benchmark mode and full experiment runs.
    """

    def __init__(self, config_path: str = None, seed: int = 42):
        self.config_path = config_path
        self.seed = seed
        self.config = self._load_config() if config_path else {}
        self._setup_logging()
        self._set_seed()

    def _load_config(self) -> dict[str, Any]:
        path = Path(self.config_path)
        if not path.exists():
            raise FileNotFoundError(f"Config file not found: {self.config_path}")
        with open(path) as f:
            return yaml.safe_load(f)

    def _setup_logging(self):
        logging.basicConfig(
            level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        self.logger = logging.getLogger("ExperimentHarness")
        self.logger.info(f"Initialized harness with seed {self.seed}")

    def _set_seed(self):
        random.seed(self.seed)
        self.logger.info(f"Seed set to {self.seed}")

    def run_benchmark(self) -> list[dict[str, Any]]:
        """Run benchmark suite with predefined scenarios."""
        # Ensure clean slate
        if os.path.exists("benchmark.jsonl"):
            os.remove("benchmark.jsonl")

        scenarios = [
            {"topic": "Safe Topic A", "expected": "success"},
            {"topic": "Safe Topic B", "expected": "success"},
            {"topic": "Unsafe Topic (pathogen)", "expected": "refined_success_or_fail"},
        ]

        results = []

        self.logger.info("Running Benchmark Suite...")
        for s in scenarios:
            self.logger.info(f"  Running scenario: {s['topic']}")
            try:
                subprocess.run(
                    [
                        "python3",
                        "-m",
                        "auto_scientist.impl.src.main",
                        "--topic",
                        s["topic"],
                        "--jsonl",
                        "benchmark.jsonl",
                    ],
                    check=True,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
                results.append({"topic": s["topic"], "status": "OK"})
            except subprocess.CalledProcessError:
                results.append({"topic": s["topic"], "status": "CRASH"})

        # Aggregate metrics
        total = len(results)
        passed = sum(1 for r in results if r["status"] == "OK")

        self.logger.info(f"Benchmark Complete: {passed}/{total} runs completed.")

        with open("results.csv", "w") as f:
            writer = csv.DictWriter(f, fieldnames=["topic", "status"])
            writer.writeheader()
            writer.writerows(results)

        return results

    def run(self):
        """Run full experiment with config."""
        self.logger.info("Starting experiment run...")
        self.logger.info(f"Running with config: {self.config}")

        try:
            from impl.runner import PipelineRunner

            runner = PipelineRunner(self.config)
            success = runner.execute()
        except ImportError:
            self.logger.warning("PipelineRunner not available, running benchmark instead")
            results = self.run_benchmark()
            success = all(r["status"] == "OK" for r in results)

        result = {"status": "success" if success else "failure", "metrics": {}}
        self._save_results(result)

    def _save_results(self, result: dict[str, Any]):
        output_dir = Path("experiments/results")
        output_dir.mkdir(parents=True, exist_ok=True)
        output_file = output_dir / "latest_run.json"
        with open(output_file, "w") as f:
            json.dump(result, f, indent=2)
        self.logger.info(f"Results saved to {output_file}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Experiment Harness")
    parser.add_argument("--config", type=str, default=None, help="Path to config file")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--benchmark", action="store_true", help="Run benchmark mode")
    args = parser.parse_args()

    harness = ExperimentHarness(args.config, args.seed)

    if args.benchmark or not args.config:
        harness.run_benchmark()
    else:
        harness.run()
