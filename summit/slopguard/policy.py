from __future__ import annotations
import json
import os
from dataclasses import dataclass
from typing import Dict, Any, List, Optional
from summit.slopguard.scoring import score_artifact
from summit.slopguard.citations import verify_citations
from summit.slopguard.dataset_hygiene import verify_dataset_provenance

@dataclass(frozen=True)
class SlopDecision:
    allowed: bool
    score: float
    reasons: List[str]
    policy_version: str
    override_required: bool = False

def evaluate_artifact(*, artifact: Dict[str, Any], policy: Dict[str, Any]) -> SlopDecision:
    """
    Deny-by-default if score >= threshold OR missing required disclosure fields.
    """
    text = artifact.get("text", "")
    meta = artifact.get("meta", {})

    scoring_result = score_artifact(text)
    score = scoring_result["score"]
    reasons = scoring_result["reasons"]

    # Disclosure check
    required_fields = policy.get("require_disclosure_fields", [])
    missing_fields = [f for f in required_fields if f not in meta]
    if missing_fields:
        reasons.append(f"missing_disclosures:{','.join(missing_fields)}")
        # If missing disclosures, we don't necessarily set score to 1.0 but we might deny.

    deny_threshold = policy.get("deny_threshold", 0.70)

    allowed = True
    if score >= deny_threshold:
        allowed = False
        reasons.append("score_above_threshold")

    if missing_fields:
        allowed = False
        reasons.append("missing_required_disclosure")

    # Citation check
    citations = artifact.get("citations", [])
    if citations:
        cit_result = verify_citations(citations)
        if not cit_result["pass"]:
            allowed = False
            reasons.extend(cit_result["failures"])
            reasons.append("citation_verification_failed")

    # Dataset hygiene check
    if artifact.get("kind") == "dataset":
        dataset_result = verify_dataset_provenance(artifact, policy)
        if not dataset_result["allowed"]:
            allowed = False
        reasons.extend(dataset_result["reasons"])

    return SlopDecision(
        allowed=allowed,
        score=score,
        reasons=reasons,
        policy_version=str(policy.get("version", "1")),
        override_required=not allowed
    )
