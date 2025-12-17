#!/usr/bin/env python3
"""Data Mutation Chaos Lab (DMCL) orchestrator."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Sequence


DEFAULT_GATE_THRESHOLD = 0.7


@dataclass
class ScenarioResult:
    name: str
    mutation: str
    expected_behaviors: Sequence[str]
    observed_behavior: str
    exit_code: int
    alerts: List[str]
    score: int
    stdout_path: Path
    stderr_path: Path

    def to_dict(self) -> Dict[str, object]:
        return {
            "name": self.name,
            "mutation": self.mutation,
            "expected_behaviors": list(self.expected_behaviors),
            "observed_behavior": self.observed_behavior,
            "exit_code": self.exit_code,
            "alerts": self.alerts,
            "score": self.score,
            "stdout_artifact": str(self.stdout_path),
            "stderr_artifact": str(self.stderr_path),
        }


@dataclass
class DMCLConfig:
    seed: int
    base_input: Path
    scenarios: List[Dict[str, object]]
    gate_threshold: float = DEFAULT_GATE_THRESHOLD
    artifacts_dir: Path = Path("reports/dmcl/artifacts")
    report_dir: Path = Path("reports/dmcl")
    mutator_binary: Path | None = None


class DMCLRunner:
    def __init__(self, config: DMCLConfig, root_dir: Path) -> None:
        self.config = config
        self.root_dir = root_dir
        self.artifacts_dir = (root_dir / config.artifacts_dir).resolve()
        self.report_dir = (root_dir / config.report_dir).resolve()
        self.mutator_binary = self._ensure_mutator_binary(config.mutator_binary)

    def run(self) -> Dict[str, object]:
        self.artifacts_dir.mkdir(parents=True, exist_ok=True)
        self.report_dir.mkdir(parents=True, exist_ok=True)

        scenario_results: List[ScenarioResult] = []
        for scenario in sorted(self.config.scenarios, key=lambda item: item["name"]):
            scenario_results.append(self._execute_scenario(scenario))

        total = len(scenario_results)
        awarded = sum(r.score for r in scenario_results)
        ratio = awarded / total if total else 0.0
        gate_threshold = self.config.gate_threshold or DEFAULT_GATE_THRESHOLD
        gate_passed = ratio >= gate_threshold

        scorecard = {
            "seed": self.config.seed,
            "gate_threshold": gate_threshold,
            "total_scenarios": total,
            "points_awarded": awarded,
            "resilience_ratio": round(ratio, 4),
            "gate_passed": gate_passed,
            "generated_at": self._deterministic_timestamp(self.config.seed),
            "scenarios": [r.to_dict() for r in scenario_results],
        }

        json_report = self.report_dir / "dmcl_scorecard.json"
        markdown_report = self.report_dir / "dmcl_scorecard.md"

        self._write_json(json_report, scorecard)
        self._write_markdown(markdown_report, scorecard)

        gate_report = {
            "gate_passed": gate_passed,
            "resilience_ratio": round(ratio, 4),
            "threshold": gate_threshold,
            "seed": self.config.seed,
        }
        self._write_json(self.report_dir / "dmcl_gate.json", gate_report)

        return scorecard

    def _execute_scenario(self, scenario: Dict[str, object]) -> ScenarioResult:
        name = str(scenario["name"])
        mutation = str(scenario["mutation"])
        seed = int(scenario.get("seed", self.config.seed))
        expected = tuple(sorted({b.lower() for b in scenario.get("expected_behaviors", [])}))
        pipeline_cmd = scenario.get("pipeline_command") or []

        mutated_path = self.artifacts_dir / f"{name}.json"
        base_input = Path(scenario.get("input", self.config.base_input))
        self._mutate_dataset(base_input, mutated_path, mutation, seed)

        stdout_path = self.artifacts_dir / f"{name}.stdout.log"
        stderr_path = self.artifacts_dir / f"{name}.stderr.log"

        completed = self._run_pipeline(pipeline_cmd, mutated_path, stdout_path, stderr_path)
        observed_behavior, alerts = self._interpret_behavior(completed)

        score = 1 if not expected or observed_behavior in expected else 0

        return ScenarioResult(
            name=name,
            mutation=mutation,
            expected_behaviors=expected,
            observed_behavior=observed_behavior,
            exit_code=completed.returncode,
            alerts=alerts,
            score=score,
            stdout_path=stdout_path.relative_to(self.root_dir),
            stderr_path=stderr_path.relative_to(self.root_dir),
        )

    def _mutate_dataset(self, base_input: Path, mutated_path: Path, mutation: str, seed: int) -> None:
        if not base_input.is_file():
            raise FileNotFoundError(f"base dataset not found: {base_input}")

        cmd = [
            str(self.mutator_binary),
            "-input",
            str(base_input),
            "-output",
            str(mutated_path),
            "-mutation",
            mutation,
            "-seed",
            str(seed),
        ]

        subprocess.run(cmd, check=True)

    def _run_pipeline(
        self,
        pipeline_cmd: Sequence[str],
        mutated_path: Path,
        stdout_path: Path,
        stderr_path: Path,
    ) -> subprocess.CompletedProcess:
        if not pipeline_cmd:
            # No-op pipeline still provides deterministic artifacts.
            stdout_path.write_text("DMCL_NO_PIPELINE\n", encoding="utf-8")
            stderr_path.write_text("", encoding="utf-8")
            return subprocess.CompletedProcess(pipeline_cmd, 0, "DMCL_NO_PIPELINE\n", "")

        command = [part.replace("{input}", str(mutated_path)) for part in pipeline_cmd]
        env = os.environ.copy()
        env.setdefault("DMCL_MUTATED_INPUT", str(mutated_path))

        with stdout_path.open("w", encoding="utf-8") as stdout_file, stderr_path.open(
            "w", encoding="utf-8"
        ) as stderr_file:
            completed = subprocess.run(
                command,
                cwd=self.root_dir,
                env=env,
                stdout=stdout_file,
                stderr=stderr_file,
                text=True,
                check=False,
            )

        stdout_text = stdout_path.read_text(encoding="utf-8")
        stderr_text = stderr_path.read_text(encoding="utf-8")
        completed.stdout = stdout_text
        completed.stderr = stderr_text
        return completed

    @staticmethod
    def _interpret_behavior(completed: subprocess.CompletedProcess) -> tuple[str, List[str]]:
        stdout = completed.stdout or ""
        stderr = completed.stderr or ""
        alerts = []

        combined = f"{stdout}\n{stderr}".lower()
        if completed.returncode != 0:
            return "blocked", alerts
        if "redact" in combined:
            alerts.append("redaction")
            return "redaction", alerts
        if "fallback" in combined:
            alerts.append("fallback")
            return "fallback", alerts
        if "alert" in combined:
            alerts.append("alert")
            return "alert", alerts
        return "accepted", alerts

    @staticmethod
    def _deterministic_timestamp(seed: int) -> str:
        pseudo_epoch = max(seed, 0)
        base = 1_600_000_000  # Anchor near 2020-09-13 for readability.
        return _format_timestamp(base + pseudo_epoch%31_536_000)

    @staticmethod
    def _write_json(path: Path, data: Dict[str, object]) -> None:
        text = json.dumps(data, indent=2, sort_keys=True)
        path.write_text(f"{text}\n", encoding="utf-8")

    def _write_markdown(self, path: Path, scorecard: Dict[str, object]) -> None:
        lines = [
            "# DMCL Resilience Scorecard",
            "",
            f"- Seed: `{scorecard['seed']}`",
            f"- Gate Threshold: `{scorecard['gate_threshold']}`",
            f"- Resilience Ratio: `{scorecard['resilience_ratio']}`",
            f"- Gate Passed: `{str(scorecard['gate_passed']).lower()}`",
            "",
            "| Scenario | Mutation | Observed | Expected | Score | Alerts |",
            "| --- | --- | --- | --- | --- | --- |",
        ]

        for scenario in scorecard["scenarios"]:
            alerts = ", ".join(scenario["alerts"]) if scenario["alerts"] else "-"
            expected = ", ".join(scenario["expected_behaviors"]) if scenario["expected_behaviors"] else "-"
            lines.append(
                f"| {scenario['name']} | {scenario['mutation']} | {scenario['observed_behavior']} | {expected} | {scenario['score']} | {alerts} |"
            )

        path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    def _ensure_mutator_binary(self, override: Path | None) -> Path:
        if override:
            resolved = (self.root_dir / override).resolve()
            if not resolved.exists():
                raise FileNotFoundError(f"mutator binary override not found: {resolved}")
            return resolved

        bin_dir = self.root_dir / "tools" / "dmcl" / "bin"
        bin_dir.mkdir(parents=True, exist_ok=True)
        binary = bin_dir / "dmcl_mutator"
        if os.name == "nt":
            binary = binary.with_suffix(".exe")

        if not binary.exists():
            subprocess.run(
                [
                    "go",
                    "build",
                    "-o",
                    str(binary),
                    "./cmd/mutator",
                ],
                cwd=self.root_dir / "tools" / "dmcl",
                check=True,
            )
        return binary


def _format_timestamp(epoch: int) -> str:
    return f"{epoch}Z"


def load_config(path: Path) -> DMCLConfig:
    data = json.loads(path.read_text(encoding="utf-8"))
    return DMCLConfig(
        seed=int(data["seed"]),
        base_input=Path(data["base_input"]),
        scenarios=list(data.get("scenarios", [])),
        gate_threshold=float(data.get("gate_threshold", DEFAULT_GATE_THRESHOLD)),
        artifacts_dir=Path(data.get("artifacts_dir", "reports/dmcl/artifacts")),
        report_dir=Path(data.get("report_dir", "reports/dmcl")),
        mutator_binary=Path(data["mutator_binary"]) if data.get("mutator_binary") else None,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Data Mutation Chaos Lab harness")
    parser.add_argument("config", type=Path, help="Path to DMCL configuration JSON")
    parser.add_argument(
        "--root",
        type=Path,
        default=Path.cwd(),
        help="Repository root (defaults to current working directory)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = load_config(args.config)
    runner = DMCLRunner(config, args.root.resolve())
    scorecard = runner.run()
    print(json.dumps(scorecard, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
