"""Decentralized AI scorecard evaluator."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from summit.subsumption.decentralized_ai.governance_audit import (
    gini,
    participation_rate,
    shannon_entropy,
)
from summit.subsumption.decentralized_ai.incentive_model import incentive_transparency_score
from summit.subsumption.decentralized_ai.openness_validator import validate_openness
from summit.subsumption.decentralized_ai.schema import evidence_id


@dataclass(frozen=True)
class DecentralizedAIScorecard:
    """Deterministic evaluation. No timestamps. Stable sort on all arrays."""

    version: str = "v0"

    def evaluate(self, evidence_bundle: dict[str, Any]) -> dict[str, Any]:
        network = str(evidence_bundle.get("network", "unknown"))
        validator_weights = [float(x) for x in evidence_bundle.get("validator_weights", [])]
        token_holders = [float(x) for x in evidence_bundle.get("token_holders", [])]
        votes_cast = int(evidence_bundle.get("votes_cast", 0))
        eligible_voters = int(evidence_bundle.get("eligible_voters", 0))

        metrics = {
            "validator_entropy": shannon_entropy(validator_weights),
            "token_gini": gini(token_holders),
            "governance_participation": participation_rate(votes_cast, eligible_voters),
            "incentive_transparency": incentive_transparency_score(evidence_bundle),
        }

        openness_findings = validate_openness(evidence_bundle)
        findings = sorted(
            openness_findings
            + [
                {
                    "id": "distribution-entropy",
                    "title": "Validator distribution entropy",
                    "status": "pass" if metrics["validator_entropy"] >= 1.5 else "warn",
                    "details": f"entropy={metrics['validator_entropy']:.4f}",
                },
                {
                    "id": "token-concentration",
                    "title": "Token concentration (Gini)",
                    "status": "pass" if metrics["token_gini"] <= 0.65 else "fail",
                    "details": f"gini={metrics['token_gini']:.4f}",
                },
            ],
            key=lambda item: item["id"],
        )

        claim_ids = sorted(evidence_bundle.get("claims", []))
        score = round(
            (
                min(metrics["validator_entropy"] / 3.0, 1.0)
                + (1.0 - metrics["token_gini"])
                + metrics["governance_participation"]
                + metrics["incentive_transparency"]
            )
            / 4,
            4,
        )

        payload = {
            "network": network,
            "claims": claim_ids,
            "score": score,
            "findings": findings,
            "metrics": metrics,
            "version": self.version,
        }
        artifact_evidence_id = evidence_id(network=network, category="scorecard", payload=payload)

        return {
            "report": {
                "network": network,
                "claims": claim_ids,
                "score": score,
                "findings": findings,
                "evidence_id": artifact_evidence_id,
            },
            "metrics": {
                "network": network,
                "metrics": metrics,
                "evidence_id": artifact_evidence_id,
            },
            "stamp": {
                "network": network,
                "deterministic": True,
                "version": self.version,
                "evidence_id": artifact_evidence_id,
            },
        }
