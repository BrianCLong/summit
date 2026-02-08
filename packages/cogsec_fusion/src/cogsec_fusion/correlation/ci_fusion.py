from typing import Dict, List, Any
import hashlib

class IncidentFusion:
    def __init__(self):
        self.graph = {"nodes": [], "edges": []}

    def add_incident(self, incident: Dict[str, Any]):
        node = {
            "id": incident["id"],
            "type": "Incident",
            "properties": incident
        }
        self.graph["nodes"].append(node)
        return node

    def add_domain(self, domain: str):
        domain_id = f"dom-{hashlib.md5(domain.encode()).hexdigest()[:8]}"
        node = {
            "id": domain_id,
            "type": "Domain",
            "properties": {"name": domain}
        }
        self.graph["nodes"].append(node)
        return node

    def link(self, source_id: str, target_id: str, rel_type: str):
        edge = {
            "source": source_id,
            "target": target_id,
            "type": rel_type,
            "properties": {}
        }
        self.graph["edges"].append(edge)
        return edge

    def correlate_spoof(self, incident_id: str, spoof_domain: str, target_org: str):
        """
        Creates a subgraph correlating a spoof domain to an incident and the target organization.
        """
        # Find or create incident node (assuming it exists or pass full obj)
        # For simplicity, we just create nodes here
        domain_node = self.add_domain(spoof_domain)

        org_id = f"org-{hashlib.md5(target_org.encode()).hexdigest()[:8]}"
        org_node = {
            "id": org_id,
            "type": "Org",
            "properties": {"name": target_org}
        }
        self.graph["nodes"].append(org_node)

        self.link(incident_id, domain_node["id"], "HOSTED_ON") # Or ATTRIBUTED_TO via infrastructure? Let's say Incident involves Domain
        # Actually Schema says Incident -> ? maybe not direct.
        # Let's say Domain IMPERSONATES Org
        self.link(domain_node["id"], org_id, "IMPERSONATES")

        return self.graph
