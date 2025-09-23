"""CLI for running wargame scenarios."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from wargame_engine import (
    Map,
    Unit,
    OpticalSensor,
    ThermalSensor,
    AcousticSensor,
    Simulation,
)


def load_scenario(path: str):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    scenario_dir = Path(path).parent
    map_path = scenario_dir / data["map"]
    if map_path.suffix == ".png":
        game_map = Map.from_png(str(map_path))
    else:
        game_map = Map.from_json(str(map_path))
    units = []
    for u in data["units"]:
        sensors = [
            OpticalSensor(range=u.get("optical", 5)),
            ThermalSensor(range=u.get("thermal", 5)),
            AcousticSensor(range=u.get("acoustic", 5)),
        ]
        units.append(Unit(u["name"], u["team"], tuple(u["position"]), sensors))
    return game_map, units


def main():
    parser = argparse.ArgumentParser(description="Run tactical wargame simulation")
    parser.add_argument("scenario", help="Scenario JSON file")
    parser.add_argument("--runs", type=int, default=1, help="Number of simulation runs")
    parser.add_argument("--gui", action="store_true", help="Display final state with matplotlib")
    args = parser.parse_args()

    game_map, units = load_scenario(args.scenario)
    sim = Simulation(game_map, units)
    analytics = sim.run(runs=args.runs)
    print(json.dumps(analytics.summary(), indent=2))
    if args.gui:
        sim.render()


if __name__ == "__main__":
    main()
