"""Risk brief generation for OHIE."""

from __future__ import annotations

import json
import random
from dataclasses import dataclass
from hashlib import blake2s
from typing import Sequence

from .core import OptOutScenario, SensitivityPoint
from .dp import SamplingPlan


@dataclass(frozen=True)
class RiskBrief:
  """Structured summary for governance and risk review."""

  title: str
  scenario: OptOutScenario
  sensitivity_curve: Sequence[SensitivityPoint]
  sampling_plan: SamplingPlan
  confidence_interval: tuple[float, float]
  mitigations: Sequence[str]
  signature: str
  signed_by: str

  def to_markdown(self) -> str:
    """Render the brief as markdown."""

    lines = [
      f"# {self.title}",
      "",
      f"**Baseline KPI:** {self.scenario.baseline_kpi:.3f}",
      f"**Opt-Out Rate:** {self.scenario.opt_out_rate:.2%}",
      f"**Population:** {self.scenario.population:,}",
      f"**Sensitivity:** {self.scenario.sensitivity:.2f}",
      "",
      "## Sensitivity Curve",
    ]
    for point in self.sensitivity_curve:
      lines.append(
        f"- {point.opt_out_rate:.0%} opt-outs → analytic {point.analytic_kpi:.3f} • simulated {point.simulated_kpi:.3f}"
      )
    lines.extend(
      [
        "",
        "## Sampling Plan",
        f"- Sample Size: {self.sampling_plan.sample_size}",
        f"- Total Error @ {self.sampling_plan.confidence:.0%}: {self.sampling_plan.achieved_error:.4f}",
        f"- DP Noise Contribution: {self.sampling_plan.dp_noise:.4f}",
        f"- Statistical Error Contribution: {self.sampling_plan.sampling_error:.4f}",
        "",
        "## KPI Degradation Interval",
        f"- {self.confidence_interval[0]:.4f} – {self.confidence_interval[1]:.4f}",
        "",
        "## Mitigation Levers",
      ]
    )
    for item in self.mitigations:
      lines.append(f"- {item}")
    lines.extend(
      [
        "",
        f"Signed by {self.signed_by}",
        f"Signature: {self.signature}",
      ]
    )
    return "\n".join(lines)


def _choose_mitigations(rng: random.Random, options: Sequence[str], count: int = 2) -> list[str]:
  if count >= len(options):
    return list(options)
  indices = rng.sample(range(len(options)), count)
  return [options[i] for i in sorted(indices)]


def generate_risk_brief(
  scenario: OptOutScenario,
  sensitivity_curve: Sequence[SensitivityPoint],
  sampling_plan: SamplingPlan,
  confidence_interval: tuple[float, float],
  seed: int = 0,
  signatory: str = "OHIE-Automaton",
) -> RiskBrief:
  """Create a signed risk brief with deterministic mitigations."""

  rng = random.Random(seed)
  mitigation_templates = [
    "Deploy minimal-view DMP cohorting to isolate high-sensitivity attributes.",
    "Shift KPI measurement cadence to bi-weekly until opt-out rate stabilises.",
    "Introduce privacy-preserving lookalike fill-ins for critical segments.",
    "Flag campaigns exceeding degradation guardrail for manual approval.",
  ]
  mitigations = _choose_mitigations(rng, mitigation_templates, count=3)
  payload = {
    "scenario": {
      "baseline_kpi": scenario.baseline_kpi,
      "opt_out_rate": scenario.opt_out_rate,
      "population": scenario.population,
      "sensitivity": scenario.sensitivity,
    },
    "curve": [
      {
        "rate": point.opt_out_rate,
        "analytic": point.analytic_kpi,
        "simulated": point.simulated_kpi,
      }
      for point in sensitivity_curve
    ],
    "sampling_plan": {
      "sample_size": sampling_plan.sample_size,
      "achieved_error": sampling_plan.achieved_error,
      "dp_noise": sampling_plan.dp_noise,
      "sampling_error": sampling_plan.sampling_error,
      "confidence": sampling_plan.confidence,
    },
    "confidence_interval": list(confidence_interval),
    "mitigations": mitigations,
    "seed": seed,
    "signatory": signatory,
  }
  signature = blake2s(json.dumps(payload, sort_keys=True).encode("utf-8"), digest_size=16).hexdigest()
  return RiskBrief(
    title="Opt-Out Herd Immunity Risk Brief",
    scenario=scenario,
    sensitivity_curve=tuple(sensitivity_curve),
    sampling_plan=sampling_plan,
    confidence_interval=confidence_interval,
    mitigations=tuple(mitigations),
    signature=signature,
    signed_by=signatory,
  )
