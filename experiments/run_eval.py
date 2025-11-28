import yaml
import json
import csv
import sys
from pathlib import Path
from sre.models import Episode
from sre.metrics import TraceLengthMetric, ToolEfficiencyMetric, ExactMatchMetric
from experiments.adapter import convert_to_episode

# Ensure we can import from experiments and sre
sys.path.append(str(Path.cwd()))
sys.path.append(str(Path.cwd() / "impl"))

def main():
    config_path = Path("experiments/configs/math_config.yaml")
    with open(config_path, "r") as f:
        config = yaml.safe_load(f)

    dataset_path = Path(config["dataset"])
    output_dir = Path(config["output_dir"])
    output_dir.mkdir(parents=True, exist_ok=True)

    metric_map = {
        "trace_length": TraceLengthMetric(),
        "tool_efficiency": ToolEfficiencyMetric(),
        "exact_match": ExactMatchMetric()
    }

    results = []

    print(f"Loading dataset from {dataset_path}...")
    with open(dataset_path, "r") as f:
        for line in f:
            raw_record = json.loads(line)
            episode_dict = convert_to_episode(raw_record)
            episode = Episode.model_validate(episode_dict)

            row = {"episode_id": episode.episode_id}

            for m_name in config["metrics"]:
                if m_name in metric_map:
                    score = metric_map[m_name].compute(episode)
                    row[m_name] = score

            results.append(row)

    # Write CSV
    output_csv = output_dir / f"{config['experiment_name']}_results.csv"
    if results:
        fieldnames = list(results[0].keys())
        with open(output_csv, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(results)

    print(f"Results written to {output_csv}")

if __name__ == "__main__":
    main()
