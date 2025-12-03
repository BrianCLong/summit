"""
Federated Model Registry

Manages model versions across federated learning rounds
with support for air-gapped deployments.
"""

import hashlib
import json
import logging
import pickle
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class ModelVersion:
    """Represents a model version in the registry"""

    version_id: str
    round_number: int
    parameters_hash: str
    metrics: Dict[str, float]
    created_at: float
    node_contributions: List[str]
    privacy_budget_used: float
    parent_version: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "version_id": self.version_id,
            "round_number": self.round_number,
            "parameters_hash": self.parameters_hash,
            "metrics": self.metrics,
            "created_at": self.created_at,
            "node_contributions": self.node_contributions,
            "privacy_budget_used": self.privacy_budget_used,
            "parent_version": self.parent_version,
            "tags": self.tags,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ModelVersion":
        """Create from dictionary"""
        return cls(**data)


class ModelRegistry:
    """
    Federated Model Registry

    Features:
    - Version tracking across training rounds
    - Lineage tracking for audit trails
    - Air-gap compatible serialization
    - Neo4j integration for graph-based queries
    """

    def __init__(
        self,
        storage_path: str = "./model_registry",
        neo4j_config: Optional[Dict[str, str]] = None,
    ):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)

        self.neo4j_config = neo4j_config
        self._versions: Dict[str, ModelVersion] = {}
        self._parameters_cache: Dict[str, Any] = {}

        # Load existing registry
        self._load_registry()

        logger.info(f"Model registry initialized at {storage_path}")

    def register_model(
        self,
        parameters: Any,
        round_number: int,
        metrics: Dict[str, float],
        node_contributions: List[str],
        privacy_budget_used: float,
        parent_version: Optional[str] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> ModelVersion:
        """Register a new model version"""
        # Compute parameters hash
        params_hash = self._compute_hash(parameters)

        # Generate version ID
        version_id = f"v{round_number}_{params_hash[:8]}_{int(time.time())}"

        version = ModelVersion(
            version_id=version_id,
            round_number=round_number,
            parameters_hash=params_hash,
            metrics=metrics,
            created_at=time.time(),
            node_contributions=node_contributions,
            privacy_budget_used=privacy_budget_used,
            parent_version=parent_version,
            tags=tags or [],
            metadata=metadata or {},
        )

        # Store version
        self._versions[version_id] = version
        self._parameters_cache[version_id] = parameters

        # Persist to storage
        self._save_version(version, parameters)

        # Store in Neo4j if configured
        if self.neo4j_config:
            self._store_version_neo4j(version)

        logger.info(
            f"Registered model version {version_id} "
            f"(round={round_number}, accuracy={metrics.get('accuracy', 0):.4f})"
        )

        return version

    def get_version(self, version_id: str) -> Optional[ModelVersion]:
        """Get model version by ID"""
        return self._versions.get(version_id)

    def get_parameters(self, version_id: str) -> Optional[Any]:
        """Get model parameters for version"""
        # Check cache first
        if version_id in self._parameters_cache:
            return self._parameters_cache[version_id]

        # Load from storage
        params_path = self.storage_path / f"{version_id}_params.pkl"
        if params_path.exists():
            with open(params_path, "rb") as f:
                parameters = pickle.load(f)
            self._parameters_cache[version_id] = parameters
            return parameters

        return None

    def get_latest_version(self) -> Optional[ModelVersion]:
        """Get the latest registered version"""
        if not self._versions:
            return None

        return max(
            self._versions.values(),
            key=lambda v: v.created_at,
        )

    def get_best_version(
        self, metric: str = "accuracy", higher_is_better: bool = True
    ) -> Optional[ModelVersion]:
        """Get the best version by metric"""
        if not self._versions:
            return None

        versions_with_metric = [
            v for v in self._versions.values()
            if metric in v.metrics
        ]

        if not versions_with_metric:
            return None

        return (max if higher_is_better else min)(
            versions_with_metric,
            key=lambda v: v.metrics[metric],
        )

    def get_versions_by_round(self, round_number: int) -> List[ModelVersion]:
        """Get all versions from a specific round"""
        return [
            v for v in self._versions.values()
            if v.round_number == round_number
        ]

    def get_versions_by_tag(self, tag: str) -> List[ModelVersion]:
        """Get all versions with a specific tag"""
        return [
            v for v in self._versions.values()
            if tag in v.tags
        ]

    def get_lineage(self, version_id: str) -> List[ModelVersion]:
        """Get the lineage (ancestors) of a version"""
        lineage = []
        current_id = version_id

        while current_id:
            version = self._versions.get(current_id)
            if version is None:
                break
            lineage.append(version)
            current_id = version.parent_version

        return lineage

    def add_tag(self, version_id: str, tag: str) -> bool:
        """Add a tag to a version"""
        version = self._versions.get(version_id)
        if version is None:
            return False

        if tag not in version.tags:
            version.tags.append(tag)
            self._save_version_metadata(version)

        return True

    def remove_tag(self, version_id: str, tag: str) -> bool:
        """Remove a tag from a version"""
        version = self._versions.get(version_id)
        if version is None:
            return False

        if tag in version.tags:
            version.tags.remove(tag)
            self._save_version_metadata(version)

        return True

    def export_for_airgap(
        self,
        version_id: str,
        export_path: str,
    ) -> str:
        """Export model for air-gapped deployment"""
        version = self._versions.get(version_id)
        if version is None:
            raise ValueError(f"Version {version_id} not found")

        parameters = self.get_parameters(version_id)
        if parameters is None:
            raise ValueError(f"Parameters not found for {version_id}")

        export_data = {
            "version": version.to_dict(),
            "parameters": parameters,
            "export_timestamp": time.time(),
            "checksum": self._compute_hash(parameters),
        }

        export_file = Path(export_path) / f"model_export_{version_id}.pkl"
        export_file.parent.mkdir(parents=True, exist_ok=True)

        with open(export_file, "wb") as f:
            pickle.dump(export_data, f)

        # Generate manifest
        manifest = {
            "version_id": version_id,
            "export_timestamp": time.time(),
            "checksum": export_data["checksum"],
            "metrics": version.metrics,
        }

        manifest_file = export_file.with_suffix(".manifest.json")
        with open(manifest_file, "w") as f:
            json.dump(manifest, f, indent=2)

        logger.info(f"Exported version {version_id} to {export_file}")

        return str(export_file)

    def import_from_airgap(self, import_path: str) -> ModelVersion:
        """Import model from air-gapped export"""
        import_file = Path(import_path)

        with open(import_file, "rb") as f:
            export_data = pickle.load(f)

        # Verify checksum
        computed_checksum = self._compute_hash(export_data["parameters"])
        if computed_checksum != export_data["checksum"]:
            raise ValueError("Checksum verification failed")

        version_data = export_data["version"]
        version = ModelVersion.from_dict(version_data)

        # Store in registry
        self._versions[version.version_id] = version
        self._parameters_cache[version.version_id] = export_data["parameters"]
        self._save_version(version, export_data["parameters"])

        logger.info(f"Imported version {version.version_id} from {import_path}")

        return version

    def get_training_summary(self) -> Dict[str, Any]:
        """Get summary of all registered models"""
        if not self._versions:
            return {
                "total_versions": 0,
                "total_rounds": 0,
                "best_accuracy": 0,
                "total_privacy_budget": 0,
                "unique_nodes": [],
            }

        all_nodes = set()
        for v in self._versions.values():
            all_nodes.update(v.node_contributions)

        accuracies = [
            v.metrics.get("accuracy", 0)
            for v in self._versions.values()
        ]

        return {
            "total_versions": len(self._versions),
            "total_rounds": max(v.round_number for v in self._versions.values()),
            "best_accuracy": max(accuracies) if accuracies else 0,
            "latest_accuracy": (
                self.get_latest_version().metrics.get("accuracy", 0)
                if self.get_latest_version()
                else 0
            ),
            "total_privacy_budget": sum(
                v.privacy_budget_used for v in self._versions.values()
            ),
            "unique_nodes": list(all_nodes),
            "versions_by_round": {
                r: len(self.get_versions_by_round(r))
                for r in set(v.round_number for v in self._versions.values())
            },
        }

    def _compute_hash(self, parameters: Any) -> str:
        """Compute hash of parameters"""
        serialized = pickle.dumps(parameters)
        return hashlib.sha256(serialized).hexdigest()

    def _save_version(self, version: ModelVersion, parameters: Any) -> None:
        """Save version to storage"""
        # Save metadata
        self._save_version_metadata(version)

        # Save parameters
        params_path = self.storage_path / f"{version.version_id}_params.pkl"
        with open(params_path, "wb") as f:
            pickle.dump(parameters, f)

    def _save_version_metadata(self, version: ModelVersion) -> None:
        """Save version metadata"""
        metadata_path = self.storage_path / f"{version.version_id}_meta.json"
        with open(metadata_path, "w") as f:
            json.dump(version.to_dict(), f, indent=2)

    def _load_registry(self) -> None:
        """Load existing versions from storage"""
        for meta_file in self.storage_path.glob("*_meta.json"):
            try:
                with open(meta_file, "r") as f:
                    data = json.load(f)
                version = ModelVersion.from_dict(data)
                self._versions[version.version_id] = version
            except Exception as e:
                logger.error(f"Failed to load {meta_file}: {e}")

        logger.info(f"Loaded {len(self._versions)} existing versions")

    def _store_version_neo4j(self, version: ModelVersion) -> None:
        """Store version in Neo4j for graph queries"""
        if not self.neo4j_config:
            return

        try:
            from neo4j import GraphDatabase

            driver = GraphDatabase.driver(
                self.neo4j_config["uri"],
                auth=(
                    self.neo4j_config["user"],
                    self.neo4j_config["password"],
                ),
            )

            with driver.session() as session:
                # Create model version node
                session.run(
                    """
                    CREATE (mv:ModelVersion {
                        version_id: $version_id,
                        round_number: $round_number,
                        parameters_hash: $params_hash,
                        accuracy: $accuracy,
                        loss: $loss,
                        privacy_budget_used: $privacy_used,
                        created_at: datetime($created_at)
                    })
                    """,
                    version_id=version.version_id,
                    round_number=version.round_number,
                    params_hash=version.parameters_hash,
                    accuracy=version.metrics.get("accuracy", 0),
                    loss=version.metrics.get("loss", 0),
                    privacy_used=version.privacy_budget_used,
                    created_at=time.strftime(
                        "%Y-%m-%dT%H:%M:%S",
                        time.localtime(version.created_at),
                    ),
                )

                # Create relationships to parent
                if version.parent_version:
                    session.run(
                        """
                        MATCH (child:ModelVersion {version_id: $child_id})
                        MATCH (parent:ModelVersion {version_id: $parent_id})
                        CREATE (child)-[:DERIVED_FROM]->(parent)
                        """,
                        child_id=version.version_id,
                        parent_id=version.parent_version,
                    )

                # Create relationships to contributing nodes
                for node_id in version.node_contributions:
                    session.run(
                        """
                        MERGE (n:FederatedNode {node_id: $node_id})
                        WITH n
                        MATCH (mv:ModelVersion {version_id: $version_id})
                        CREATE (n)-[:CONTRIBUTED_TO]->(mv)
                        """,
                        node_id=node_id,
                        version_id=version.version_id,
                    )

            driver.close()

        except Exception as e:
            logger.error(f"Failed to store version in Neo4j: {e}")

    def query_neo4j(self, cypher_query: str, **params) -> List[Dict[str, Any]]:
        """Execute a Cypher query on the model registry graph"""
        if not self.neo4j_config:
            raise ValueError("Neo4j not configured")

        from neo4j import GraphDatabase

        driver = GraphDatabase.driver(
            self.neo4j_config["uri"],
            auth=(
                self.neo4j_config["user"],
                self.neo4j_config["password"],
            ),
        )

        results = []
        with driver.session() as session:
            result = session.run(cypher_query, **params)
            results = [dict(record) for record in result]

        driver.close()
        return results

    def get_node_contribution_graph(self) -> Dict[str, Any]:
        """Get contribution graph for visualization"""
        nodes = []
        edges = []

        # Add model version nodes
        for version in self._versions.values():
            nodes.append({
                "id": version.version_id,
                "type": "model_version",
                "round": version.round_number,
                "accuracy": version.metrics.get("accuracy", 0),
            })

            # Add edges to parent
            if version.parent_version:
                edges.append({
                    "source": version.version_id,
                    "target": version.parent_version,
                    "type": "derived_from",
                })

            # Add contributing node edges
            for node_id in version.node_contributions:
                # Add node if not exists
                if not any(n["id"] == node_id for n in nodes):
                    nodes.append({
                        "id": node_id,
                        "type": "federated_node",
                    })

                edges.append({
                    "source": node_id,
                    "target": version.version_id,
                    "type": "contributed_to",
                })

        return {"nodes": nodes, "edges": edges}
