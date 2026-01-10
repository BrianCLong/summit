from __future__ import annotations

from dataclasses import dataclass


@dataclass
class RobustnessInput:
    """Canonical test input used to probe robustness."""

    slug: str
    prompt: str
    success_criteria: str
    metadata: dict[str, str]


ROBUSTNESS_INPUTS: list[RobustnessInput] = [
    RobustnessInput(
        slug="financial-scenario",
        prompt=(
            "Provide a 6-month forecast for cash runway given current burn, "
            "commitments, and a proposed hiring plan. Include risk bands."
        ),
        success_criteria=(
            "Returns a structured forecast with base/bull/bear cases, cites inputs, "
            "and flags data gaps without hallucinating figures."
        ),
        metadata={"domain": "finance", "type": "projection", "persona": "cfo"},
    ),
    RobustnessInput(
        slug="supply-chain-coldstart",
        prompt=(
            "Map the supplier network for a new component with limited historical data; "
            "suggest alternates and expected lead times."
        ),
        success_criteria=(
            "Produces at least three supplier clusters, highlights data sparsity, and "
            "recommends validation checks before procurement."
        ),
        metadata={"domain": "supply-chain", "type": "mapping", "persona": "planner"},
    ),
    RobustnessInput(
        slug="policy-qa",
        prompt=(
            "Answer a compliance control question referencing SOC 2 and ISO 27001, "
            "and explain any conflicting requirements."
        ),
        success_criteria=(
            "Cites both frameworks, clarifies overlaps versus deltas, and provides a "
            "clear remediation checklist."
        ),
        metadata={"domain": "governance", "type": "qa", "persona": "auditor"},
    ),
    RobustnessInput(
        slug="threat-model",
        prompt=(
            "Perform a threat model for a multi-tenant API that stores PII; include "
            "STRIDE categorization and mitigations."
        ),
        success_criteria=(
            "Covers all STRIDE categories, calls out tenant isolation risks, and orders "
            "mitigations by impact."
        ),
        metadata={"domain": "security", "type": "analysis", "persona": "security-engineer"},
    ),
    RobustnessInput(
        slug="incident-postmortem",
        prompt=(
            "Draft a postmortem for a 45-minute outage on the recommendation service; "
            "include timeline, blast radius, and prevention steps."
        ),
        success_criteria=(
            "Timeline is complete, root causes are explicit, and action items have owners "
            "and deadlines."
        ),
        metadata={"domain": "reliability", "type": "rca", "persona": "sre"},
    ),
]
