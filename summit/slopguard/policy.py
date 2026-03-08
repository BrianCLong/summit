from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from summit.slopguard.citations import extract_citations, validate_citations
from summit.slopguard.cluster import run_cluster_analysis
from summit.slopguard.scoring import get_slop_score


@dataclass(frozen=True)
class SlopDecision:
    allowed: bool
    score: float
    reasons: list[str]
    policy_version: str
    override_required: bool = False
    metadata: dict[str, Any] = field(default_factory=dict)

def evaluate_artifact(*, artifact: dict[str, Any], policy: dict[str, Any]) -> SlopDecision:
    """
    Deny-by-default if score >= threshold OR missing required disclosure fields OR citation issues OR cluster findings.
    """
    kind = artifact.get("kind", "unknown")
    text = artifact.get("text", "")
    meta = artifact.get("meta", {})

    scoring_results = get_slop_score(text)
    score = scoring_results["score"]
    reasons = scoring_results["reasons"]

    # Citation verification
    citations = extract_citations(text)
    cit_results = validate_citations(citations)

    if not cit_results["valid"]:
        reasons.extend(cit_results["issues"])

    # Cluster analysis (Lane 2)
    cluster_results = run_cluster_analysis(artifact, policy)
    if cluster_results["status"] == "ACTIVE" and cluster_results["findings"]:
        for finding in cluster_results["findings"]:
            reasons.append(f"CLUSTER_MATCH: {finding['type']} with {finding['artifact_id']} (sim: {finding['similarity']})")

    # Check for mandatory disclosure
    required_disclosure = policy.get("require_disclosure_fields", [])
    missing_disclosures = [f for f in required_disclosure if f not in meta]

    if missing_disclosures:
        reasons.append(f"MISSING_DISCLOSURES: {missing_disclosures}")

    deny_threshold = policy.get("deny_threshold", 0.7)

    allowed = True
    override_required = False

    # Hard deny conditions
    if score >= deny_threshold:
        allowed = False
        reasons.append(f"SCORE_ABOVE_THRESHOLD: {score:.2f} >= {deny_threshold:.2f}")
        override_required = True

    if missing_disclosures:
        allowed = False
        override_required = True

    if not cit_results["valid"]:
        allowed = False
        override_required = True

    if cluster_results["status"] == "ACTIVE" and any(f['type'] == 'EXACT_DUPLICATE' for f in cluster_results['findings']):
        allowed = False
        override_required = True

    return SlopDecision(
        allowed=allowed,
        score=score,
        reasons=reasons,
        policy_version=str(policy.get("version", "1")),
        override_required=override_required,
        metadata={
            "kind": kind,
            "scoring_metrics": scoring_results["metrics"],
            "citation_metrics": cit_results["counts"],
            "cluster_findings": cluster_results["findings"]
        }
    )
