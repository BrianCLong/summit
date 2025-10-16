"""
Data Lineage Tracking and OpenLineage Integration
Tracks column-level lineage and publishes to data catalog
"""

import hashlib
import json
import uuid
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any

try:
    from openlineage.client import OpenLineageClient
    from openlineage.client.dataset import Dataset
    from openlineage.client.event import EventType, RunEvent, RunState
    from openlineage.client.job import Job
    from openlineage.client.run import Run

    OPENLINEAGE_AVAILABLE = True
except ImportError:
    OPENLINEAGE_AVAILABLE = False

from ..utils.logging import get_logger


class LineageEventType(Enum):
    """Types of lineage events"""

    EXTRACT = "extract"
    TRANSFORM = "transform"
    LOAD = "load"
    VALIDATE = "validate"
    QUALITY_CHECK = "quality_check"


@dataclass
class ColumnLineage:
    """Column-level lineage information"""

    source_dataset: str
    source_column: str
    target_dataset: str
    target_column: str
    transformation_type: str
    transformation_logic: str | None = None
    confidence: float = 1.0


@dataclass
class DatasetInfo:
    """Dataset information for lineage tracking"""

    namespace: str
    name: str
    columns: list[str]
    metadata: dict[str, Any]


@dataclass
class JobInfo:
    """Job information for lineage tracking"""

    namespace: str
    name: str
    job_type: str
    metadata: dict[str, Any]


@dataclass
class RunInfo:
    """Run information for lineage tracking"""

    run_id: str
    job_info: JobInfo
    inputs: list[DatasetInfo]
    outputs: list[DatasetInfo]
    column_lineage: list[ColumnLineage]
    started_at: datetime
    completed_at: datetime | None = None
    status: str = "RUNNING"
    metadata: dict[str, Any] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


class LineageTracker:
    """
    Tracks data lineage throughout the pipeline
    """

    def __init__(self):
        self.logger = get_logger("lineage-tracker")
        self.current_runs: dict[str, RunInfo] = {}
        self.completed_runs: list[RunInfo] = []

    def start_run(
        self, job_name: str, job_type: str, namespace: str = "intelgraph", run_id: str | None = None
    ) -> str:
        """Start tracking a new pipeline run"""

        if not run_id:
            run_id = str(uuid.uuid4())

        job_info = JobInfo(
            namespace=namespace,
            name=job_name,
            job_type=job_type,
            metadata={"owner": "data-engineering", "environment": "production"},
        )

        run_info = RunInfo(
            run_id=run_id,
            job_info=job_info,
            inputs=[],
            outputs=[],
            column_lineage=[],
            started_at=datetime.now(),
            status="RUNNING",
        )

        self.current_runs[run_id] = run_info
        self.logger.info(f"Started lineage tracking for run {run_id}")

        return run_id

    def add_input_dataset(
        self,
        run_id: str,
        namespace: str,
        dataset_name: str,
        columns: list[str],
        metadata: dict[str, Any] = None,
    ):
        """Add an input dataset to the run"""

        if run_id not in self.current_runs:
            raise ValueError(f"Run {run_id} not found")

        dataset_info = DatasetInfo(
            namespace=namespace, name=dataset_name, columns=columns, metadata=metadata or {}
        )

        self.current_runs[run_id].inputs.append(dataset_info)
        self.logger.debug(f"Added input dataset {dataset_name} to run {run_id}")

    def add_output_dataset(
        self,
        run_id: str,
        namespace: str,
        dataset_name: str,
        columns: list[str],
        metadata: dict[str, Any] = None,
    ):
        """Add an output dataset to the run"""

        if run_id not in self.current_runs:
            raise ValueError(f"Run {run_id} not found")

        dataset_info = DatasetInfo(
            namespace=namespace, name=dataset_name, columns=columns, metadata=metadata or {}
        )

        self.current_runs[run_id].outputs.append(dataset_info)
        self.logger.debug(f"Added output dataset {dataset_name} to run {run_id}")

    def add_column_lineage(
        self,
        run_id: str,
        source_dataset: str,
        source_column: str,
        target_dataset: str,
        target_column: str,
        transformation_type: str,
        transformation_logic: str | None = None,
    ):
        """Add column-level lineage information"""

        if run_id not in self.current_runs:
            raise ValueError(f"Run {run_id} not found")

        lineage = ColumnLineage(
            source_dataset=source_dataset,
            source_column=source_column,
            target_dataset=target_dataset,
            target_column=target_column,
            transformation_type=transformation_type,
            transformation_logic=transformation_logic,
        )

        self.current_runs[run_id].column_lineage.append(lineage)
        self.logger.debug(
            f"Added column lineage {source_dataset}.{source_column} -> {target_dataset}.{target_column}"
        )

    def complete_run(self, run_id: str, status: str = "COMPLETED", metadata: dict[str, Any] = None):
        """Mark a run as completed"""

        if run_id not in self.current_runs:
            raise ValueError(f"Run {run_id} not found")

        run_info = self.current_runs[run_id]
        run_info.completed_at = datetime.now()
        run_info.status = status

        if metadata:
            run_info.metadata.update(metadata)

        # Move to completed runs
        self.completed_runs.append(run_info)
        del self.current_runs[run_id]

        self.logger.info(f"Completed lineage tracking for run {run_id} with status {status}")

        return run_info

    def get_lineage_graph(self, dataset_name: str) -> dict[str, Any]:
        """Get lineage graph for a specific dataset"""

        upstream = []
        downstream = []

        # Search through completed runs for lineage
        for run_info in self.completed_runs:
            for lineage in run_info.column_lineage:
                if lineage.target_dataset == dataset_name:
                    upstream.append(
                        {
                            "source_dataset": lineage.source_dataset,
                            "source_column": lineage.source_column,
                            "target_column": lineage.target_column,
                            "transformation": lineage.transformation_type,
                            "run_id": run_info.run_id,
                            "job_name": run_info.job_info.name,
                        }
                    )

                if lineage.source_dataset == dataset_name:
                    downstream.append(
                        {
                            "target_dataset": lineage.target_dataset,
                            "source_column": lineage.source_column,
                            "target_column": lineage.target_column,
                            "transformation": lineage.transformation_type,
                            "run_id": run_info.run_id,
                            "job_name": run_info.job_info.name,
                        }
                    )

        return {
            "dataset": dataset_name,
            "upstream": upstream,
            "downstream": downstream,
            "generated_at": datetime.now().isoformat(),
        }


class OpenLineageEmitter:
    """
    Emits OpenLineage events to external systems
    """

    def __init__(self, url: str | None = None):
        if not OPENLINEAGE_AVAILABLE:
            raise ImportError("openlineage-python is required for OpenLineage integration")

        self.client = OpenLineageClient(url=url)
        self.logger = get_logger("openlineage-emitter")

    def emit_start_event(self, run_info: RunInfo):
        """Emit a run start event"""
        try:
            event = self._create_run_event(run_info, EventType.START, RunState.RUNNING)
            self.client.emit(event)
            self.logger.info(f"Emitted start event for run {run_info.run_id}")
        except Exception as e:
            self.logger.error(f"Failed to emit start event: {e}")

    def emit_complete_event(self, run_info: RunInfo):
        """Emit a run completion event"""
        try:
            run_state = RunState.COMPLETED if run_info.status == "COMPLETED" else RunState.FAILED
            event = self._create_run_event(run_info, EventType.COMPLETE, run_state)
            self.client.emit(event)
            self.logger.info(f"Emitted complete event for run {run_info.run_id}")
        except Exception as e:
            self.logger.error(f"Failed to emit complete event: {e}")

    def _create_run_event(
        self, run_info: RunInfo, event_type: EventType, run_state: RunState
    ) -> RunEvent:
        """Create an OpenLineage run event"""

        # Create job
        job = Job(
            namespace=run_info.job_info.namespace,
            name=run_info.job_info.name,
            facets=run_info.job_info.metadata,
        )

        # Create run
        run = Run(runId=run_info.run_id, facets=run_info.metadata)

        # Create input datasets
        inputs = []
        for input_dataset in run_info.inputs:
            dataset = Dataset(
                namespace=input_dataset.namespace,
                name=input_dataset.name,
                facets=input_dataset.metadata,
            )
            inputs.append(dataset)

        # Create output datasets
        outputs = []
        for output_dataset in run_info.outputs:
            dataset = Dataset(
                namespace=output_dataset.namespace,
                name=output_dataset.name,
                facets=output_dataset.metadata,
            )
            outputs.append(dataset)

        # Create event
        event = RunEvent(
            eventType=event_type,
            eventTime=datetime.now(),
            run=run,
            job=job,
            inputs=inputs,
            outputs=outputs,
            producer="intelgraph-pipelines/1.0.0",
        )

        return event


class ProvenanceManager:
    """
    Manages data provenance for entities and relationships
    """

    def __init__(self):
        self.logger = get_logger("provenance-manager")

    def add_provenance_to_entity(
        self,
        entity: dict[str, Any],
        source: str,
        run_id: str,
        mapping_version: str,
        source_record_hash: str | None = None,
    ) -> dict[str, Any]:
        """Add provenance information to an entity"""

        if source_record_hash is None and "props" in entity:
            # Generate hash from source properties
            source_record_hash = self._generate_record_hash(entity["props"])

        # Add provenance to entity properties
        if "props" not in entity:
            entity["props"] = {}

        entity["props"]["_provenance"] = {
            "ingest_source": source,
            "ingest_run_id": run_id,
            "mapping_version": mapping_version,
            "source_record_hash": source_record_hash,
            "ingested_at": datetime.now().isoformat(),
            "lineage_tracked": True,
        }

        return entity

    def add_provenance_to_relationship(
        self,
        relationship: dict[str, Any],
        source: str,
        run_id: str,
        confidence: float = 1.0,
        inference_method: str | None = None,
    ) -> dict[str, Any]:
        """Add provenance information to a relationship"""

        if "props" not in relationship:
            relationship["props"] = {}

        relationship["props"]["_provenance"] = {
            "ingest_source": source,
            "ingest_run_id": run_id,
            "confidence": confidence,
            "inference_method": inference_method,
            "created_at": datetime.now().isoformat(),
        }

        return relationship

    def _generate_record_hash(self, record: dict[str, Any]) -> str:
        """Generate a hash for the source record"""
        # Remove internal metadata fields
        clean_record = {k: v for k, v in record.items() if not k.startswith("_")}

        # Create deterministic string representation
        record_str = json.dumps(clean_record, sort_keys=True)
        return hashlib.sha256(record_str.encode()).hexdigest()

    def trace_entity_lineage(self, entity_id: str) -> dict[str, Any]:
        """Trace the lineage of a specific entity"""
        # This would query the Neo4j database to find provenance information
        # Implementation would depend on the specific Neo4j schema

        return {
            "entity_id": entity_id,
            "sources": [],
            "transformations": [],
            "created_at": datetime.now().isoformat(),
        }


class LineageCatalog:
    """
    Simple data catalog for storing and querying lineage information
    """

    def __init__(self, storage_path: str = "lineage_catalog.json"):
        self.storage_path = storage_path
        self.logger = get_logger("lineage-catalog")
        self.datasets: dict[str, dict[str, Any]] = {}
        self.lineage_graph: dict[str, list[dict[str, Any]]] = {}
        self._load_catalog()

    def _load_catalog(self):
        """Load catalog from storage"""
        try:
            with open(self.storage_path) as f:
                data = json.load(f)
                self.datasets = data.get("datasets", {})
                self.lineage_graph = data.get("lineage_graph", {})
        except FileNotFoundError:
            self.logger.info("No existing catalog found, starting fresh")
        except Exception as e:
            self.logger.error(f"Failed to load catalog: {e}")

    def _save_catalog(self):
        """Save catalog to storage"""
        try:
            data = {
                "datasets": self.datasets,
                "lineage_graph": self.lineage_graph,
                "updated_at": datetime.now().isoformat(),
            }
            with open(self.storage_path, "w") as f:
                json.dump(data, f, indent=2, default=str)
        except Exception as e:
            self.logger.error(f"Failed to save catalog: {e}")

    def register_dataset(
        self, dataset_name: str, columns: list[str], metadata: dict[str, Any] = None
    ):
        """Register a dataset in the catalog"""

        self.datasets[dataset_name] = {
            "name": dataset_name,
            "columns": columns,
            "metadata": metadata or {},
            "registered_at": datetime.now().isoformat(),
            "last_updated": datetime.now().isoformat(),
        }

        self._save_catalog()
        self.logger.info(f"Registered dataset {dataset_name}")

    def add_lineage_edge(
        self,
        source_dataset: str,
        target_dataset: str,
        column_mappings: list[dict[str, str]],
        transformation_info: dict[str, Any],
    ):
        """Add a lineage edge between datasets"""

        edge = {
            "source": source_dataset,
            "target": target_dataset,
            "column_mappings": column_mappings,
            "transformation_info": transformation_info,
            "created_at": datetime.now().isoformat(),
        }

        if source_dataset not in self.lineage_graph:
            self.lineage_graph[source_dataset] = []

        self.lineage_graph[source_dataset].append(edge)
        self._save_catalog()

        self.logger.info(f"Added lineage edge {source_dataset} -> {target_dataset}")

    def get_upstream_lineage(self, dataset_name: str, max_depth: int = 10) -> list[dict[str, Any]]:
        """Get upstream lineage for a dataset"""
        visited = set()
        result = []

        def traverse_upstream(current_dataset, depth=0):
            if depth > max_depth or current_dataset in visited:
                return

            visited.add(current_dataset)

            # Find all edges pointing to current dataset
            for source, edges in self.lineage_graph.items():
                for edge in edges:
                    if edge["target"] == current_dataset:
                        result.append(edge)
                        traverse_upstream(source, depth + 1)

        traverse_upstream(dataset_name)
        return result

    def get_downstream_lineage(
        self, dataset_name: str, max_depth: int = 10
    ) -> list[dict[str, Any]]:
        """Get downstream lineage for a dataset"""
        visited = set()
        result = []

        def traverse_downstream(current_dataset, depth=0):
            if depth > max_depth or current_dataset in visited:
                return

            visited.add(current_dataset)

            # Find all edges from current dataset
            edges = self.lineage_graph.get(current_dataset, [])
            for edge in edges:
                result.append(edge)
                traverse_downstream(edge["target"], depth + 1)

        traverse_downstream(dataset_name)
        return result


# Integration helper functions
def track_connector_lineage(
    lineage_tracker: LineageTracker,
    run_id: str,
    connector_name: str,
    source_info: dict[str, Any],
    extracted_columns: list[str],
):
    """Helper to track lineage for connector extraction"""

    # Add input dataset (source)
    lineage_tracker.add_input_dataset(
        run_id=run_id,
        namespace="external",
        dataset_name=f"{connector_name}_source",
        columns=extracted_columns,
        metadata=source_info,
    )

    # Add output dataset (staging)
    lineage_tracker.add_output_dataset(
        run_id=run_id,
        namespace="staging",
        dataset_name=f"{connector_name}_raw",
        columns=extracted_columns,
        metadata={"storage_format": "json", "extraction_timestamp": datetime.now().isoformat()},
    )


def track_transformation_lineage(
    lineage_tracker: LineageTracker,
    run_id: str,
    transformation_name: str,
    input_dataset: str,
    output_dataset: str,
    field_mappings: dict[str, str],
):
    """Helper to track lineage for data transformations"""

    for source_field, target_field in field_mappings.items():
        lineage_tracker.add_column_lineage(
            run_id=run_id,
            source_dataset=input_dataset,
            source_column=source_field,
            target_dataset=output_dataset,
            target_column=target_field,
            transformation_type=transformation_name,
        )
