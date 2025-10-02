"""Unit tests for the Tenant Isolation Prover."""

from __future__ import annotations

import json
import unittest
from pathlib import Path

from tools.tip import cli
from tools.tip.loader import (
  DEFAULT_MANIFEST_EXTENSIONS,
  DEFAULT_POLICY_EXTENSIONS,
  collect_files,
  load_kubernetes_documents,
  load_policy_documents,
)
from tools.tip.prover import TenantIsolationProver


SCENARIO_ROOT = Path(__file__).resolve().parents[3] / "samples" / "tip"


def _run_scenario(name: str):
  scenario_dir = SCENARIO_ROOT / name
  manifest_files = collect_files(
    [str(scenario_dir / "manifests.yaml")], DEFAULT_MANIFEST_EXTENSIONS
  )
  policy_files = collect_files(
    [str(scenario_dir / "policies.yaml")], DEFAULT_POLICY_EXTENSIONS
  )
  manifests = load_kubernetes_documents(manifest_files)
  policies = load_policy_documents(policy_files)
  prover = TenantIsolationProver(manifests, policies)
  return prover.prove()


class TenantIsolationProverTests(unittest.TestCase):

  def test_compliant_configuration_produces_proof(self):
    result = _run_scenario("good")
    self.assertEqual(result.status, "passed")
    self.assertIsNotNone(result.proof)
    self.assertTrue(result.proof.digest)
    self.assertEqual(result.analysis["network"]["exposures"], [])
    self.assertFalse(result.warnings)

    # Determinism: running the prover again should yield the same digest.
    result_again = _run_scenario("good")
    self.assertEqual(result.proof.digest, result_again.proof.digest)

    # CLI output should align with the library output.
    cli_result, exit_code, output = cli.run_cli(
      [
        "--manifests",
        str(SCENARIO_ROOT / "good" / "manifests.yaml"),
        "--policies",
        str(SCENARIO_ROOT / "good" / "policies.yaml"),
      ]
    )
    self.assertEqual(exit_code, 0)
    self.assertEqual(cli_result.proof.digest, result.proof.digest)
    rendered = json.loads(output)
    self.assertEqual(rendered["proof"]["digest"], result.proof.digest)

  def test_insecure_configuration_yields_counterexamples(self):
    result = _run_scenario("bad")
    self.assertEqual(result.status, "failed")
    counterexample_types = {item["type"] for item in result.counterexamples}
    self.assertIn("network-port-scan", counterexample_types)
    self.assertIn("service-account-hop", counterexample_types)

    # CLI should fail with a non-zero exit code for the insecure scenario.
    _, exit_code, output = cli.run_cli(
      [
        "--manifests",
        str(SCENARIO_ROOT / "bad" / "manifests.yaml"),
        "--policies",
        str(SCENARIO_ROOT / "bad" / "policies.yaml"),
      ]
    )
    self.assertEqual(exit_code, 1)
    rendered = json.loads(output)
    self.assertEqual(rendered["status"], "failed")
    self.assertTrue(rendered["counterexamples"])


if __name__ == "__main__":
  unittest.main()
