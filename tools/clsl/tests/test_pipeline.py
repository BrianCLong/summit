from __future__ import annotations

from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
  sys.path.insert(0, str(BASE_DIR))

from clsl.cli import execute
from clsl.config import load_config
from clsl.evaluator import EvaluationRunner


def _load_runner(tmp_path: Path) -> EvaluationRunner:
  config_path = Path('tools/clsl/configs/sample.json').resolve()
  config = load_config(config_path)
  config.output_dir = tmp_path / 'out'
  return EvaluationRunner(config)


def test_runner_deterministic(tmp_path: Path) -> None:
  runner = _load_runner(tmp_path)
  results_a = runner.run()
  results_b = runner.run()

  assert [r.name for r in results_a] == [r.name for r in results_b]
  for left, right in zip(results_a, results_b):
    assert left.auc == right.auc
    assert left.breakpoints == right.breakpoints


def test_hardening_shifts_breakpoints(tmp_path: Path) -> None:
  runner = _load_runner(tmp_path)
  results = {run.name: run for run in runner.run()}
  baseline = results['baseline']
  watermark_hardened = results['watermark-relaxed']
  c2pa_hardened = results['c2pa-strict']

  target_key = 'rescan:hard'
  assert watermark_hardened.breakpoints['watermark'][target_key] >= baseline.breakpoints['watermark'][target_key]
  assert c2pa_hardened.breakpoints['c2pa'][target_key] <= baseline.breakpoints['c2pa'][target_key]


def test_cli_runs(tmp_path: Path) -> None:
  config_path = Path('tools/clsl/configs/sample.json').resolve()
  output_dir = tmp_path / 'artifacts'
  exit_code = execute(['run', '--config', str(config_path), '--output', str(output_dir)])
  assert exit_code == 0
  assert (output_dir / 'summary.json').exists()
