import hashlib
import json
from typing import Any, Dict, List

from .lookalike_detector import detect_typosquat
from .propagation_risk import calculate_propagation_risk
from .slopsquat_guard import analyze_slopsquat


def evaluate_dependencies(dependencies: list[str], policy_config: dict[str, Any]) -> dict[str, Any]:
    """
    Evaluates dependencies against the configured policy.
    Returns the evidence report dictionary.
    """
    # Create evidence structure matching the schema
    report = {
        "evidence_id": "SUMMIT-AIFW-DEP-GATE",
        "item_slug": "ai-supply-chain-firewall",
        "patterns": ["slopsquat", "typosquat", "propagation_velocity"],
        "claims": ["blocks ai-suggested risky dependencies"],
        "assessments": []
    }

    for dep in dependencies:
        reasons = []
        overall_risk = 0.0

        # 1. Typosquat Check
        threshold = policy_config.get("typosquat", {}).get("edit_distance_threshold", 1)
        is_typosquat, similar = detect_typosquat(dep, threshold)
        if is_typosquat:
            reasons.append(f"Typosquatting risk: similar to {', '.join(similar)}")
            overall_risk = max(overall_risk, 0.8)

        # 2. Slopsquat Check
        slop_result = analyze_slopsquat(dep)
        if slop_result["is_hallucinated"]:
            reasons.append(slop_result["reason"])
            overall_risk = max(overall_risk, 0.7)

        # 3. Propagation Risk
        prop_result = calculate_propagation_risk(dep)
        if prop_result["is_velocity_anomaly"]:
            reasons.extend(prop_result["reasons"])
            overall_risk = max(overall_risk, prop_result["risk_score"])

        # If no risk, add clear
        if not reasons:
            reasons.append("Dependency appears safe based on offline heuristics.")

        report["assessments"].append({
            "dependency": dep,
            "risk_score": overall_risk,
            "reasons": reasons
        })

    return report

def enforce_gate(report: dict[str, Any], block_threshold: float = 0.75) -> bool:
    """
    Determines if the PR should fail based on the report.
    Returns True if passed (allow), False if failed (block).
    """
    for assessment in report["assessments"]:
        if assessment["risk_score"] >= block_threshold:
            return False
    return True

def generate_stamp(report: dict[str, Any], policy_version: str = "v1.0") -> dict[str, Any]:
    """Generates a deterministic stamp without timestamps."""
    content_hash = hashlib.sha256(json.dumps(report, sort_keys=True).encode('utf-8')).hexdigest()
    return {
        "policy_version": policy_version,
        "content_hash": content_hash,
        "status": "sealed"
    }

def generate_metrics(report: dict[str, Any]) -> dict[str, Any]:
    """Generates aggregate metrics from the report."""
    total = len(report["assessments"])
    blocked = sum(1 for a in report["assessments"] if a["risk_score"] >= 0.75)
    return {
        "total_analyzed": total,
        "total_blocked": blocked,
        "pass_rate": ((total - blocked) / total) if total > 0 else 1.0
    }
