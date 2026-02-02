from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, List, TypedDict

from summit.evidence.writer import EvidencePaths, default_paths, write_json


class Finding(TypedDict):
    workflow: str
    status: str
    gap_analysis: str


@dataclass
class PalantirEvidenceWriter:
    root_dir: Path
    git_sha: str
    scenario: str

    @property
    def evidence_id(self) -> str:
        date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
        return f"EVID:palantir:{date_str}:{self.git_sha}:{self.scenario}"

    def write_artifacts(
        self,
        summary: str,
        findings: List[Finding],
        metrics: dict[str, float],
        config: dict[str, Any],
        lineage: List[dict] = None,
        extra_artifacts: Dict[str, Any] = None  # New: Generic artifact support
    ) -> EvidencePaths:
        """
        Writes deterministic Palantir competitive analysis evidence.
        """
        paths = default_paths(self.root_dir / "reports" / "palantir")

        # Calculate config hash for stamp
        config_str = json.dumps(config, sort_keys=True)
        config_hash = hashlib.sha256(config_str.encode("utf-8")).hexdigest()

        artifact_list = ["metrics.json", "stamp.json"]

        # Lineage (Foundry)
        if lineage:
             artifact_list.append("lineage.json")
             write_json(paths.root / "lineage.json", {"evidence_id": self.evidence_id, "lineage": lineage})

             # DOT Visualization
             dot_content = self.generate_dot_lineage(lineage)
             artifact_list.append("lineage.dot")
             (paths.root / "lineage.dot").write_text(dot_content, encoding="utf-8")

        # Extras (Gotham/Apollo cases, logs, etc)
        if extra_artifacts:
            for name, content in extra_artifacts.items():
                filename = f"{name}.json"
                artifact_list.append(filename)
                write_json(paths.root / filename, {"evidence_id": self.evidence_id, name: content})

        # 1. Report
        report_data = {
            "evidence_id": self.evidence_id,
            "summary": summary,
            "artifacts": artifact_list,
            "findings": findings
        }
        write_json(paths.report, report_data)

        # 2. Metrics
        metrics_data = {
            "evidence_id": self.evidence_id,
            "metrics": {
                "runtime_ms": metrics.get("runtime_ms", 0.0),
                "memory_mb": metrics.get("memory_mb", 0.0),
                "cost_usd_est": metrics.get("cost_usd_est", 0.0),
                **{k: v for k, v in metrics.items() if k not in ["runtime_ms", "memory_mb", "cost_usd_est"]}
            }
        }
        write_json(paths.metrics, metrics_data)

        # 3. Stamp (The only place with timestamps)
        stamp_data = {
            "evidence_id": self.evidence_id,
            "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "git_sha": self.git_sha,
            "config_hash": config_hash,
            "merkle_root": self._compute_merkle_root([report_data, metrics_data])
        }

        # Enhanced Evidence: Blockchain + ZK
        stamp_data["blockchain_tx"] = self.anchor_to_blockchain(stamp_data["merkle_root"])
        stamp_data["zk_proof"] = self.generate_zk_proof(self.evidence_id, config_hash)

        write_json(paths.stamp, stamp_data)

        return paths

    def _compute_merkle_root(self, artifacts: List[dict]) -> str:
        """
        Computes a simple Merkle Root for Holographic Evidence.
        """
        hashes = []
        for artifact in artifacts:
            s = json.dumps(artifact, sort_keys=True).encode("utf-8")
            hashes.append(hashlib.sha256(s).hexdigest())

        hashes.sort()
        combined = "".join(hashes).encode("utf-8")
        return hashlib.sha256(combined).hexdigest()

    def anchor_to_blockchain(self, merkle_root: str) -> str:
        """
        Simulates anchoring the evidence to a public ledger.
        Returns a transaction hash.
        """
        # Mock interaction with Ethereum/Solana
        # In reality: web3.eth.send_transaction(...)
        tx_payload = f"ANCHOR:{merkle_root}"
        return hashlib.sha3_256(tx_payload.encode("utf-8")).hexdigest()

    def generate_zk_proof(self, computation_id: str, inputs_hash: str) -> str:
        """
        Stub for ZK-SNARK generation.
        Proves computation was correct without revealing inputs.
        """
        # Mock ZK Proof
        return f"zk_proof_for_{computation_id}_with_{inputs_hash[:8]}"

    def generate_dot_lineage(self, lineage: List[dict]) -> str:
        """
        Generates Graphviz DOT syntax for lineage visualization.
        """
        lines = ["digraph Lineage {", "  rankdir=LR;", "  node [shape=box, style=filled, fillcolor=lightgrey];"]

        # We assume lineage is a list of node definitions or edges
        # Just a simple heuristic for this generic writer
        for item in lineage:
            # If item represents a Dataset with inputs
            if "rid" in item and "inputs" in item:
                target = item["rid"]
                label = item.get("alias", target)
                lines.append(f'  "{target}" [label="{label}"];')

                for src in item.get("inputs", []):
                    lines.append(f'  "{src}" -> "{target}";')

        lines.append("}")
        return "\n".join(lines)
