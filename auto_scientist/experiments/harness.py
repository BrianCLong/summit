import argparse
import logging
import json
import random
import yaml
from pathlib import Path
from typing import Dict, Any
import sys
import os

# Ensure we can import from impl
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from impl.runner import PipelineRunner

class ExperimentHarness:
    def __init__(self, config_path: str, seed: int = 42):
        self.config_path = config_path
        self.seed = seed
        self.config = self._load_config()
        self._setup_logging()
        self._set_seed()

    def _load_config(self) -> Dict[str, Any]:
        path = Path(self.config_path)
        if not path.exists():
            raise FileNotFoundError(f"Config file not found: {self.config_path}")
        with open(path, 'r') as f:
            return yaml.safe_load(f)

    def _setup_logging(self):
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger("ExperimentHarness")
        self.logger.info(f"Initialized harness with seed {self.seed}")

    def _set_seed(self):
        random.seed(self.seed)
        # Add other seeding if necessary (e.g. numpy, torch)
        self.logger.info(f"Seed set to {self.seed}")

    def run(self):
        self.logger.info("Starting experiment run...")
        self.logger.info(f"Running with config: {self.config}")

        runner = PipelineRunner(self.config)
        success = runner.execute()

        # Example output
        result = {"status": "success" if success else "failure", "metrics": {}}
        self._save_results(result)

    def _save_results(self, result: Dict[str, Any]):
        output_dir = Path("experiments/results")
        output_dir.mkdir(parents=True, exist_ok=True)
        output_file = output_dir / "latest_run.json"
        with open(output_file, 'w') as f:
            json.dump(result, f, indent=2)
        self.logger.info(f"Results saved to {output_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Experiment Harness")
    parser.add_argument("--config", type=str, default="experiments/configs/default.yaml", help="Path to config file")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    harness = ExperimentHarness(args.config, args.seed)
    harness.run()
