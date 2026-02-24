import hashlib
import json
from typing import List, Dict, Any, Optional
from datetime import datetime

class MultimodalEvidenceBundle:
    """Handles evidence-first ingestion of multimodal data into IntelGraph."""

    def __init__(self, run_id: str):
        self.run_id = run_id
        self.evidence_items = []

    def add_item(self, content_type: str, source: str, metadata: Dict[str, Any]) -> str:
        """
        Adds a multimodal item (PDF, image, video transcript) to the evidence bundle.
        Returns a stable Evidence ID.
        """
        # Generate deterministic Evidence ID (EVID-AGENT-YYYYMMDD-<6Base32>)
        # Simplified for this implementation
        timestamp = datetime.utcnow().strftime("%Y%m%d")
        payload = f"{self.run_id}-{content_type}-{source}-{json.dumps(metadata, sort_keys=True)}"
        h = hashlib.sha256(payload.encode()).hexdigest()
        evidence_id = f"EVID-AGENT-{timestamp}-{h[:6].upper()}"

        item = {
            "evidence_id": evidence_id,
            "content_type": content_type,
            "source": source,
            "metadata": metadata,
            "ingested_at": datetime.utcnow().isoformat(),
            "hash": h
        }

        self.evidence_items.append(item)
        return evidence_id

    def generate_provenance_graph(self) -> Dict[str, Any]:
        """Generates the chain-of-custody edges for the evidence bundle."""
        graph = {
            "nodes": [],
            "edges": []
        }

        for item in self.evidence_items:
            # Add evidence node
            graph["nodes"].append({
                "id": item["evidence_id"],
                "type": "Evidence",
                "properties": {
                    "contentType": item["content_type"],
                    "source": item["source"]
                }
            })

            # Add edge to the run
            graph["edges"].append({
                "source": self.run_id,
                "target": item["evidence_id"],
                "type": "PRODUCED_EVIDENCE",
                "properties": {
                    "timestamp": item["ingested_at"]
                }
            })

        return graph

    def export_bundle(self) -> Dict[str, Any]:
        return {
            "run_id": self.run_id,
            "evidence": self.evidence_items,
            "provenance": self.generate_provenance_graph()
        }
