import argparse
import yaml
import sys
import os

# Add root to sys.path to allow imports from core and evidence
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from core.orchestrator.graph import OrchestratorGraph
from core.orchestrator.engine import OrchestratorEngine
from core.orchestrator.policy_gate import PolicyGate
from core.orchestrator.schema import OrchestrationSchema, AgentRole

def main():
    parser = argparse.ArgumentParser(description="Summit Multi-Agent Orchestrator CLI")
    parser.add_argument("workflow_file", help="Path to the YAML workflow file")
    parser.add_argument("--seq", type=int, default=1, help="Sequence number for Evidence ID")

    args = parser.parse_args()

    if not os.path.exists(args.workflow_file):
        print(f"Error: Workflow file {args.workflow_file} not found.")
        sys.exit(1)

    with open(args.workflow_file, "r") as f:
        config = yaml.safe_load(f)

    # Build schema and graph
    schema = OrchestrationSchema()
    graph = OrchestratorGraph()

    for agent_cfg in config.get("agents", []):
        name = agent_cfg["name"]
        role_name = agent_cfg.get("role", name)
        role = AgentRole(name=role_name)
        schema.roles.append(role)
        graph.add_agent(name, role=role_name)

    for edge in config.get("edges", []):
        graph.add_edge(edge["from"], edge["to"])

    # Apply policy if present
    policy_config = config.get("policy", {})
    allowed_edges = policy_config.get("allowed_edges", [])

    policy = PolicyGate(allowed_edges=allowed_edges)

    try:
        policy.validate_graph(graph)
        print("Policy check passed.")
    except PermissionError as e:
        print(f"Policy check failed: {e}")
        sys.exit(1)

    engine = OrchestratorEngine(schema=schema)
    results = engine.execute(graph, evidence_id_seq=args.seq)

    print("\nExecution Results Summary:")
    for agent, result in results.items():
        print(f" - {agent}: {result}")

if __name__ == "__main__":
    main()
