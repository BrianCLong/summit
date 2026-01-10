import os
import sys

# Add the current directory to sys.path to allow imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from experiments.harness import ExperimentHarness


def main():
    print("Auto Scientist CLI")
    # Using the harness as the main entry point for now
    harness = ExperimentHarness("experiments/configs/default.yaml")
    harness.run()


if __name__ == "__main__":
    main()
