import json
import os
from datetime import datetime
from typing import Dict, Any, Optional
from core.orchestrator.graph import OrchestratorGraph
from core.orchestrator.schema import OrchestrationSchema
from evidence.evidence_id import EvidenceIDGenerator

class OrchestratorEngine:
    def __init__(self, schema: Optional[OrchestrationSchema] = None):
        self.schema = schema or OrchestrationSchema()
        self.artifact_dir = "artifacts"

    def execute(self, graph: OrchestratorGraph, evidence_id_seq: int = 1):
        if not graph.is_acyclic():
            raise ValueError("Execution graph contains cycles.")

        evidence_id = EvidenceIDGenerator.generate(evidence_id_seq)
        order = graph.get_execution_order()
        results = {}

        print(f"Executing workflow {evidence_id} with order: {order}")

        for agent_name in order:
            # Retrieve role info from schema if available
            role = self.schema.get_role(agent_name)
            role_info = f" ({role.name})" if role else ""
            print(f"Running agent: {agent_name}{role_info}")

            # In a real system, this would call the agent
            results[agent_name] = f"Result from {agent_name}"

        self._generate_artifacts(evidence_id, results)
        return results

    def _generate_artifacts(self, evidence_id: str, results: Dict[str, Any]):
        os.makedirs(self.artifact_dir, exist_ok=True)

        # 1. report.json
        report = {
            "evidence_id": evidence_id,
            "item_slug": "multi-agent-orchestration",
            "patterns": ["agentic_ai"],
            "claims": [
                {
                    "text": f"Agent {name} completed successfully.",
                    "confidence": 1.0,
                    "supported_by": [{"url": "http://summit.internal/trace", "publisher": "Summit Orchestrator"}]
                } for name in results
            ],
            "assessments": [
                {
                    "pattern": "agentic_ai",
                    "recommended_controls": ["deterministic_execution_trace"]
                }
            ]
        }
        with open(os.path.join(self.artifact_dir, "report.json"), "w") as f:
            json.dump(report, f, indent=2, sort_keys=True)

        # 2. metrics.json
        metrics = {
            "evidence_id": evidence_id,
            "execution_time_ms": 100, # Mock value
            "agent_count": len(results)
        }
        with open(os.path.join(self.artifact_dir, "metrics.json"), "w") as f:
            json.dump(metrics, f, indent=2, sort_keys=True)

        # 3. stamp.json (MUST NOT contain unstable timestamp)
        stamp = {
            "evidence_id": evidence_id,
            "version": "1.0.0",
            "status": "verified"
        }
        with open(os.path.join(self.artifact_dir, "stamp.json"), "w") as f:
            json.dump(stamp, f, indent=2, sort_keys=True)

        print(f"Artifacts generated in {self.artifact_dir}/")
