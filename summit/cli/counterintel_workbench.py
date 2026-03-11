import argparse
import sys
from typing import List

from summit.counterintelligence.case_file import CounterintelligenceCaseFile, AssetStatus
from summit.counter_ai.risk_register import CounterAIRiskRegister, global_risk_bus

# Mock data functions for demonstration
def get_mock_case_file(asset_id: str) -> CounterintelligenceCaseFile:
    cf = CounterintelligenceCaseFile(case_id=f"CF-{asset_id[:4].upper()}", asset_ids=[asset_id])
    cf.update_analysis(
        access=f"Asset {asset_id} participates in community clusters 4, 7, and 9.",
        motivation="Potential state-sponsored disruption.",
        vulnerability="Reusable infrastructure patterns identified in related nodes.",
        intelligence_value="High. Provides early warning signals on coordinated narrative deployment."
    )
    # Simulate a ledger history
    cf.ledger.append(AssetStatus.IDENTIFIED, actor="system", rationale="Automated graph anomaly detection")
    cf.ledger.append(AssetStatus.SUSPECTED_ADVERSARIAL, actor="analyst_jane", rationale="Manual review confirms artificial coordination")
    return cf

def get_mock_graph_context(asset_id: str) -> dict:
    return {
        "neighborhood_size": 142,
        "top_connected_nodes": ["node_A", "node_B", "node_C"],
        "dominant_relation_types": ["retweet_cluster", "semantic_clone"]
    }

def print_workbench(asset_id: str):
    print("=" * 80)
    print("   COUNTERINTELLIGENCE WORKBENCH - DEFENSIVE ANALYSIS ONLY - NO OPERATIONAL TASKING")
    print("=" * 80)
    print()

    # 1. Identity & Case Summary
    cf = get_mock_case_file(asset_id)
    print("1. IDENTITY & CASE SUMMARY")
    print("-" * 30)
    print(f"Case ID:        {cf.case_id}")
    print(f"Asset ID(s):    {', '.join(cf.asset_ids)}")
    print(f"Current State:  {cf.ledger.current_state.value}")
    print()
    print("Defensive Analysis:")
    print(f"  Access:             {cf.access}")
    print(f"  Motivation:         {cf.motivation}")
    print(f"  Vulnerability:      {cf.vulnerability}")
    print(f"  Intelligence Value: {cf.intelligence_value}")
    print()

    # 2. Graph & Risk Context Snapshot
    print("2. GRAPH & RISK CONTEXT SNAPSHOT (READ-ONLY)")
    print("-" * 45)
    ctx = get_mock_graph_context(asset_id)
    print(f"Neighborhood Size:     {ctx['neighborhood_size']} nodes")
    print(f"Top Connected Nodes:   {', '.join(ctx['top_connected_nodes'])}")
    print(f"Dominant Relations:    {', '.join(ctx['dominant_relation_types'])}")
    print()

    # Mocking a risk observation related to the asset
    print("Counter-AI Risk Observations:")
    # In a real system, we'd query global_risk_bus or a persistent store.
    print(f"  [!] R-002: Relation Injection / Enhancement detected in neighborhood of {asset_id}.")
    print("      Context: Suspiciously high similarity between narratives.")
    print()

    # 3. Defensive Recommendations & Flags
    print("3. DEFENSIVE RECOMMENDATIONS & FLAGS")
    print("-" * 36)
    print(cf.operational_constraints) # "DEFENSIVE ANALYSIS ONLY. DO NOT ENGAGE. DO NOT TASK."
    print()
    print("Recommendations based on current state & risks:")
    if cf.ledger.current_state == AssetStatus.SUSPECTED_ADVERSARIAL:
        print("  -> Suggestion: Consider transitioning to MONITORED_SENSOR to capture early-warning signals.")
        print("  -> Suggestion: Prioritize data hygiene around this neighborhood due to observed R-002 risk.")
    elif cf.ledger.current_state == AssetStatus.TURNED_EARLY_WARNING:
        print("  -> Suggestion: Monitor for intelligence exhaustion. Consider BURNED state if risk outweighs value.")
    print()
    print("=" * 80)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Counterintelligence Workbench - Read Only")
    parser.add_argument("--asset-id", type=str, required=True, help="The ID of the adversarial asset to analyze.")
    args = parser.parse_args()

    print_workbench(args.asset_id)
