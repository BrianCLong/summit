import json
import os
import sys
import datetime
import hashlib
import uuid
try:
    from jsonschema import validate, ValidationError
except ImportError:
    print("jsonschema not installed. Please install it using: pip install jsonschema")
    sys.exit(1)

SCHEMA_DIR = "packages/schema/src/influence_ops/v2"
EVIDENCE_ROOT = "evidence"

def get_git_sha():
    # Placeholder for git sha, in real env use subprocess to get it
    return "gitsha7"

def generate_evidence_id():
    date_str = datetime.datetime.now().strftime("%Y%m%d")
    return f"EVID-IOPS-{date_str}-v2-schema-{get_git_sha()}"

def load_schema(filename):
    path = os.path.join(SCHEMA_DIR, filename)
    with open(path, 'r') as f:
        return json.load(f)

def generate_sample_data(schema_name):
    if schema_name == "campaign_phase.graph.json":
        return {
            "nodes": [
                {"id": "camp1", "type": "Campaign", "properties": {"name": "Test Campaign", "status": "ACTIVE"}},
                {"id": "phase1", "type": "CampaignPhase", "properties": {"name": "Seeding"}}
            ],
            "edges": [
                {"source": "camp1", "target": "phase1", "type": "HAS_PHASE", "properties": {"weight": 1.0}}
            ]
        }
    elif schema_name == "narrative_market.graph.json":
        return {
            "nodes": [
                {"id": "market1", "type": "NarrativeMarket"},
                {"id": "metric1", "type": "MarketMetric", "properties": {"metricType": "ATTENTION", "value": 0.8}}
            ],
            "edges": [
                {"source": "market1", "target": "metric1", "type": "MEASURED_BY"}
            ]
        }
    elif schema_name == "cognitive_layer.graph.json":
        return {
            "nodes": [
                {"id": "cog1", "type": "CognitiveState", "properties": {"uncertainty": 0.2}},
                {"id": "def1", "type": "DefenseIntervention", "properties": {"interventionType": "Debunk"}}
            ],
            "edges": [
                {"source": "def1", "target": "cog1", "type": "MITIGATED_BY"}
            ]
        }
    elif schema_name == "proof_layer.graph.json":
        return {
            "nodes": [
                {"id": "proof1", "type": "ProofObject", "properties": {"proofType": "VIDEO", "isSynthetic": False}},
                {"id": "swarm1", "type": "Swarm"}
            ],
            "edges": [
                {"source": "proof1", "target": "swarm1", "type": "SUPPORTED_BY_PROOF"}
            ]
        }
    elif schema_name == "wargame.graph.json":
        return {
            "nodes": [
                {"id": "scenario1", "type": "WargameScenario", "properties": {"scenarioName": "Red Team 1"}},
                {"id": "faction1", "type": "Faction", "properties": {"factionName": "Blue"}}
            ],
            "edges": []
        }
    return {}

def main():
    schemas = [
        "campaign_phase.graph.json",
        "narrative_market.graph.json",
        "cognitive_layer.graph.json",
        "proof_layer.graph.json",
        "wargame.graph.json"
    ]

    evidence_id = generate_evidence_id()
    evidence_dir = os.path.join(EVIDENCE_ROOT, evidence_id)
    os.makedirs(evidence_dir, exist_ok=True)

    report = {"items": [], "evidence_id": evidence_id}
    metrics = {"total_schemas": len(schemas), "valid_schemas": 0}

    for schema_file in schemas:
        print(f"Validating {schema_file}...")
        try:
            schema = load_schema(schema_file)
            data = generate_sample_data(schema_file)
            validate(instance=data, schema=schema)
            print(f"  OK")
            metrics["valid_schemas"] += 1
            report["items"].append({
                "schema": schema_file,
                "status": "valid",
                "sample_data_snippet": str(data)[:100]
            })
        except Exception as e:
            print(f"  FAILED: {e}")
            report["items"].append({
                "schema": schema_file,
                "status": "invalid",
                "error": str(e)
            })
            # Fail hard if validation fails
            sys.exit(1)

    # Write evidence artifacts
    with open(os.path.join(evidence_dir, "report.json"), "w") as f:
        json.dump(report, f, indent=2)

    with open(os.path.join(evidence_dir, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)

    stamp = {
        "timestamp": datetime.datetime.now().isoformat(),
        "git_sha": get_git_sha(),
        "evidence_id": evidence_id
    }
    with open(os.path.join(evidence_dir, "stamp.json"), "w") as f:
        json.dump(stamp, f, indent=2)

    print(f"Evidence generated at {evidence_dir}")

if __name__ == "__main__":
    main()
