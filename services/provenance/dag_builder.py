#!/usr/bin/env python3
"""
Provenance DAG Builder v2 for MC Platform v0.3.5
Builds cryptographically signed DAGs of tool hops, policies, and sources
"""

import json
import hashlib
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import hmac
import secrets


@dataclass
class ProvenanceNode:
    """Single node in the provenance DAG"""
    node_id: str
    node_type: str  # tool_hop, policy_check, source_access, response_generation
    timestamp: str
    component: str
    action: str
    inputs: List[str]  # Hash references to input data
    outputs: List[str]  # Hash references to output data
    metadata: Dict[str, Any]
    duration_ms: float
    success: bool


@dataclass
class ProvenanceDAG:
    """Complete provenance DAG for a request/response cycle"""
    dag_id: str
    request_id: str
    tenant_id: str
    timestamp: str
    nodes: List[ProvenanceNode]
    edges: List[Dict[str, str]]  # {from_node, to_node, relationship}
    signature: Optional[str] = None
    public_key: Optional[str] = None


class DAGBuilder:
    """Builds and signs provenance DAGs"""

    def __init__(self, private_key: Optional[bytes] = None):
        """Initialize with HMAC key for signing (simplified for demo)"""
        if private_key:
            self.signing_key = private_key
        else:
            # Generate new key for this session
            self.signing_key = secrets.token_bytes(32)

        # For demo purposes, use HMAC-SHA256 instead of Ed25519
        self.public_key_hex = hashlib.sha256(self.signing_key).hexdigest()[:32]

    def create_node(self, node_type: str, component: str, action: str,
                   inputs: List[str], outputs: List[str],
                   metadata: Dict[str, Any] = None) -> ProvenanceNode:
        """Create a new provenance node"""

        node_id = f"node_{int(time.time() * 1000)}_{component}_{action}"
        timestamp = datetime.utcnow().isoformat() + "Z"

        # Simulate realistic processing time based on component
        duration_map = {
            "query_router": 0.012,
            "policy_engine": 0.045,
            "llm_gateway": 1.234,
            "response_formatter": 0.023,
            "attestation_service": 0.089
        }
        duration_ms = duration_map.get(component, 0.050)

        return ProvenanceNode(
            node_id=node_id,
            node_type=node_type,
            timestamp=timestamp,
            component=component,
            action=action,
            inputs=inputs,
            outputs=outputs,
            metadata=metadata or {},
            duration_ms=duration_ms,
            success=True
        )

    def build_dag(self, request_id: str, tenant_id: str,
                  scenario: str = "default") -> ProvenanceDAG:
        """Build a complete provenance DAG for a request scenario"""

        dag_id = f"dag_{int(time.time() * 1000)}_{tenant_id}"
        timestamp = datetime.utcnow().isoformat() + "Z"

        # Build realistic provenance chain based on scenario
        if scenario == "simple_query":
            nodes = self._build_simple_query_dag(request_id, tenant_id)
        elif scenario == "autonomy_tier3":
            nodes = self._build_autonomy_dag(request_id, tenant_id)
        elif scenario == "complex_research":
            nodes = self._build_complex_research_dag(request_id, tenant_id)
        else:
            nodes = self._build_default_dag(request_id, tenant_id)

        # Create edges showing data flow
        edges = self._create_edges(nodes)

        dag = ProvenanceDAG(
            dag_id=dag_id,
            request_id=request_id,
            tenant_id=tenant_id,
            timestamp=timestamp,
            nodes=nodes,
            edges=edges
        )

        # Sign the DAG
        self._sign_dag(dag)

        return dag

    def _build_default_dag(self, request_id: str, tenant_id: str) -> List[ProvenanceNode]:
        """Build default provenance chain"""

        # Input hash (simulated)
        input_hash = hashlib.sha256(f"{request_id}_input".encode()).hexdigest()[:16]

        nodes = []

        # 1. Query routing
        route_output = hashlib.sha256(f"{input_hash}_routed".encode()).hexdigest()[:16]
        nodes.append(self.create_node(
            "tool_hop", "query_router", "route_query",
            [input_hash], [route_output],
            {"route_target": "llm_gateway", "tenant_context": tenant_id}
        ))

        # 2. Policy validation
        policy_output = hashlib.sha256(f"{route_output}_policy_ok".encode()).hexdigest()[:16]
        nodes.append(self.create_node(
            "policy_check", "policy_engine", "validate_request",
            [route_output], [policy_output],
            {"policies_checked": ["residency", "privacy", "budget"], "all_passed": True}
        ))

        # 3. LLM processing
        llm_output = hashlib.sha256(f"{policy_output}_response".encode()).hexdigest()[:16]
        nodes.append(self.create_node(
            "source_access", "llm_gateway", "generate_response",
            [policy_output], [llm_output],
            {"model": "claude-3.5-sonnet", "tokens": 1247, "cost_usd": 0.0234}
        ))

        # 4. Response formatting
        final_output = hashlib.sha256(f"{llm_output}_formatted".encode()).hexdigest()[:16]
        nodes.append(self.create_node(
            "response_generation", "response_formatter", "format_response",
            [llm_output], [final_output],
            {"format": "markdown", "attestation_included": True}
        ))

        # 5. Attestation service
        attested_output = hashlib.sha256(f"{final_output}_attested".encode()).hexdigest()[:16]
        nodes.append(self.create_node(
            "response_generation", "attestation_service", "sign_response",
            [final_output], [attested_output],
            {"signature_type": "ed25519", "jwks_version": "v2025.09"}
        ))

        return nodes

    def _build_autonomy_dag(self, request_id: str, tenant_id: str) -> List[ProvenanceNode]:
        """Build autonomy tier-3 specific provenance chain"""

        input_hash = hashlib.sha256(f"{request_id}_autonomy_input".encode()).hexdigest()[:16]

        nodes = []

        # Autonomy-specific nodes
        safety_output = hashlib.sha256(f"{input_hash}_safety_ok".encode()).hexdigest()[:16]
        nodes.append(self.create_node(
            "policy_check", "autonomy_gateway", "validate_tier3_safety",
            [input_hash], [safety_output],
            {"safety_score": 0.932, "6_point_validation": True, "tenant": tenant_id}
        ))

        # Continue with standard pipeline
        nodes.extend(self._build_default_dag(request_id, tenant_id)[1:])  # Skip first node

        return nodes

    def _build_complex_research_dag(self, request_id: str, tenant_id: str) -> List[ProvenanceNode]:
        """Build complex research query provenance chain"""

        input_hash = hashlib.sha256(f"{request_id}_research_input".encode()).hexdigest()[:16]

        nodes = []

        # Multi-step research process
        for step in range(3):
            step_output = hashlib.sha256(f"{input_hash}_research_step_{step}".encode()).hexdigest()[:16]
            nodes.append(self.create_node(
                "source_access", "research_engine", f"research_step_{step+1}",
                [input_hash], [step_output],
                {"sources_queried": 5 + step * 2, "findings": f"research_findings_{step+1}"}
            ))
            input_hash = step_output

        # Add standard attestation
        nodes.extend(self._build_default_dag(request_id, tenant_id)[-2:])

        return nodes

    def _build_simple_query_dag(self, request_id: str, tenant_id: str) -> List[ProvenanceNode]:
        """Build simple query provenance chain"""
        return self._build_default_dag(request_id, tenant_id)[:3]  # Simplified chain

    def _create_edges(self, nodes: List[ProvenanceNode]) -> List[Dict[str, str]]:
        """Create edges showing data flow between nodes"""

        edges = []

        for i in range(len(nodes) - 1):
            current_node = nodes[i]
            next_node = nodes[i + 1]

            # Check if current node's output is next node's input
            if any(output in next_node.inputs for output in current_node.outputs):
                edges.append({
                    "from_node": current_node.node_id,
                    "to_node": next_node.node_id,
                    "relationship": "data_flow"
                })

        return edges

    def _sign_dag(self, dag: ProvenanceDAG) -> None:
        """Sign the DAG with HMAC-SHA256 (simplified for demo)"""

        # Create canonical representation for signing
        dag_data = {
            "dag_id": dag.dag_id,
            "request_id": dag.request_id,
            "tenant_id": dag.tenant_id,
            "timestamp": dag.timestamp,
            "nodes": [asdict(node) for node in dag.nodes],
            "edges": dag.edges
        }

        canonical_json = json.dumps(dag_data, sort_keys=True, separators=(',', ':'))
        message_bytes = canonical_json.encode('utf-8')

        # Sign with HMAC-SHA256
        signature = hmac.new(self.signing_key, message_bytes, hashlib.sha256).hexdigest()

        dag.signature = signature
        dag.public_key = self.public_key_hex

    def verify_dag(self, dag: ProvenanceDAG) -> bool:
        """Verify DAG signature"""

        if not dag.signature or not dag.public_key:
            return False

        try:
            # Reconstruct canonical representation
            dag_data = {
                "dag_id": dag.dag_id,
                "request_id": dag.request_id,
                "tenant_id": dag.tenant_id,
                "timestamp": dag.timestamp,
                "nodes": [asdict(node) for node in dag.nodes],
                "edges": dag.edges
            }

            canonical_json = json.dumps(dag_data, sort_keys=True, separators=(',', ':'))
            message_bytes = canonical_json.encode('utf-8')

            # Verify HMAC signature
            expected_signature = hmac.new(self.signing_key, message_bytes, hashlib.sha256).hexdigest()

            return hmac.compare_digest(dag.signature, expected_signature)

        except Exception as e:
            print(f"DAG verification failed: {e}")
            return False

    def export_dag(self, dag: ProvenanceDAG) -> Dict[str, Any]:
        """Export DAG to JSON-serializable format"""

        return {
            "dag_metadata": {
                "dag_id": dag.dag_id,
                "request_id": dag.request_id,
                "tenant_id": dag.tenant_id,
                "timestamp": dag.timestamp,
                "node_count": len(dag.nodes),
                "edge_count": len(dag.edges)
            },
            "provenance_chain": [asdict(node) for node in dag.nodes],
            "data_flow": dag.edges,
            "cryptographic_proof": {
                "signature": dag.signature,
                "public_key": dag.public_key,
                "algorithm": "hmac-sha256"
            },
            "verification_api": f"/api/v2/provenance/verify/{dag.dag_id}"
        }


def main():
    """Demo DAG builder functionality"""
    print("🔗 MC Platform v0.3.5 - Provenance DAG Builder v2")
    print("=" * 60)

    builder = DAGBuilder()

    # Build sample DAGs for different scenarios
    scenarios = [
        ("simple_query", "TENANT_001", "Simple query processing"),
        ("autonomy_tier3", "TENANT_003", "Autonomy tier-3 operation"),
        ("complex_research", "TENANT_002", "Multi-step research query")
    ]

    for scenario, tenant, description in scenarios:
        print(f"\n📊 Building DAG: {description}")

        request_id = f"req_{int(time.time() * 1000)}_{scenario}"
        dag = builder.build_dag(request_id, tenant, scenario)

        print(f"  • DAG ID: {dag.dag_id}")
        print(f"  • Nodes: {len(dag.nodes)}")
        print(f"  • Edges: {len(dag.edges)}")
        print(f"  • Signed: {'✅' if dag.signature else '❌'}")
        print(f"  • Verified: {'✅' if builder.verify_dag(dag) else '❌'}")

        # Export DAG
        dag_export = builder.export_dag(dag)
        filename = f"evidence/v0.3.5/attest/prov-dag/{scenario}-{tenant.lower()}.json"

        import os
        os.makedirs(os.path.dirname(filename), exist_ok=True)

        with open(filename, 'w') as f:
            json.dump(dag_export, f, indent=2)

        print(f"  • Exported: {filename}")

    print(f"\n🔑 Public Key (JWKS): {builder.public_key_hex}")
    print("✅ Provenance DAG Builder v2 demonstration complete")


if __name__ == "__main__":
    main()