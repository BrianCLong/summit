"""Maestro domain models for Runs, Artifacts, and Disclosure Packs."""

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


class RunStatus(str, Enum):
    """Status of a run."""

    PENDING = "pending"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ArtifactKind(str, Enum):
    """Type of artifact."""

    SBOM = "sbom"
    SLSA_PROVENANCE = "slsa_provenance"
    RISK_ASSESSMENT = "risk_assessment"
    BUILD_LOG = "build_log"
    TEST_REPORT = "test_report"
    OTHER = "other"


class TaskStatus(str, Enum):
    """Status of a task run."""

    PENDING = "pending"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


class TaskRun(BaseModel):
    """An instance of a task for a specific run."""

    task_id: str
    status: TaskStatus = Field(default=TaskStatus.PENDING)
    started_at: datetime | None = None
    finished_at: datetime | None = None


class Run(BaseModel):
    """A Maestro run tracking computation or workflow execution."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str = Field(..., description="Human-readable name for the run")
    owner: str = Field(..., description="User or service that initiated the run")
    started_at: datetime = Field(default_factory=datetime.utcnow)
    finished_at: datetime | None = None
    status: RunStatus = Field(default=RunStatus.PENDING)
    cost_estimate: float | None = Field(None, description="Estimated cost in dollars", ge=0)
    cost_actual: float | None = Field(None, description="Actual cost in dollars", ge=0)
    related_entity_ids: list[str] = Field(
        default_factory=list,
        description="References to IntelGraph entities (UUID strings)",
    )
    related_decision_ids: list[str] = Field(
        default_factory=list,
        description="References to IntelGraph decisions (UUID strings)",
    )
    metadata: dict[str, Any] = Field(default_factory=dict, description="Additional run metadata")
    workflow_id: str | None = Field(None, description="ID of the workflow template for this run")
    task_runs: list[TaskRun] = Field(
        default_factory=list, description="State of individual tasks in the workflow"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Build and analyze entity network",
                "owner": "analyst@example.com",
                "status": "succeeded",
                "cost_estimate": 5.00,
                "cost_actual": 4.73,
                "related_entity_ids": ["e123", "e456"],
                "related_decision_ids": ["d789"],
            }
        }


class ArtifactMetadata(BaseModel):
    """Metadata about an artifact's governance compliance."""

    sbom_present: bool = Field(default=False, description="Whether SBOM data is included")
    slsa_provenance_present: bool = Field(
        default=False, description="Whether SLSA provenance is included"
    )
    risk_assessment_present: bool = Field(
        default=False, description="Whether risk assessment is included"
    )
    additional_metadata: dict[str, Any] = Field(
        default_factory=dict, description="Additional metadata fields"
    )


class Artifact(BaseModel):
    """An artifact produced or consumed by a run."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    run_id: str = Field(..., description="ID of the run that produced this artifact")
    kind: ArtifactKind = Field(..., description="Type of artifact")
    path_or_uri: str = Field(..., description="File path, S3 URI, or other location identifier")
    content_hash: str | None = Field(
        None, description="SHA256 or other hash of the artifact content"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    metadata_json: ArtifactMetadata = Field(
        default_factory=ArtifactMetadata, description="Governance metadata"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "run_id": "abc123",
                "kind": "sbom",
                "path_or_uri": "s3://artifacts/run-abc123/sbom.json",
                "content_hash": "sha256:abcdef123456",
                "metadata_json": {
                    "sbom_present": True,
                    "slsa_provenance_present": False,
                    "risk_assessment_present": False,
                },
            }
        }


class DisclosurePack(BaseModel):
    """A disclosure pack summarizing a run and its artifacts."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    run_id: str = Field(..., description="ID of the run this pack describes")
    summary: str = Field(..., description="Human-readable summary of the run")
    artifact_ids: list[str] = Field(
        default_factory=list, description="IDs of artifacts included in this pack"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: dict[str, Any] = Field(default_factory=dict, description="Additional pack metadata")

    class Config:
        json_schema_extra = {
            "example": {
                "run_id": "abc123",
                "summary": "Entity network analysis completed with SBOM and risk assessment",
                "artifact_ids": ["art1", "art2", "art3"],
            }
        }


# Models for Maestro Conductor (Multi-agent workflows)


class AgentType(str, Enum):
    """Type of agent."""

    CODE_GENERATION = "code_generation"
    CODE_REVIEW = "code_review"
    SECURITY_ANALYSIS = "security_analysis"
    TESTING = "testing"
    DOCUMENTATION = "documentation"
    OTHER = "other"


class Agent(BaseModel):
    """An AI agent available for work."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str = Field(..., description="Unique name of the agent (e.g., 'Jules', 'Codex-Reviewer')")
    type: AgentType = Field(..., description="Primary function of the agent")
    description: str | None = Field(None, description="Description of the agent's capabilities")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=True, description="Whether the agent is available for new work")


class WorkItemStatus(str, Enum):
    """Status of a work item."""

    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    IN_REVIEW = "in_review"
    COMPLETED = "completed"
    FAILED = "failed"


class WorkItem(BaseModel):
    """A unit of work to be performed by an agent, sourced from a GitHub issue."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    github_issue_url: str = Field(..., description="URL of the source GitHub issue")
    title: str = Field(..., description="Title of the work item")
    description: str | None = Field(None, description="Detailed description of the task")
    status: WorkItemStatus = Field(default=WorkItemStatus.PENDING)
    priority: int = Field(
        default=0, description="Priority of the work item (higher is more urgent)"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    assigned_to_agent_id: str | None = Field(
        None, description="ID of the agent currently assigned to this item"
    )
    related_run_id: str | None = Field(
        None, description="ID of the Maestro Run associated with this work"
    )


class ReviewStatus(str, Enum):
    """Status of a review."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMMENTED = "commented"


class Review(BaseModel):
    """Feedback from an agent on a work item."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    work_item_id: str = Field(..., description="ID of the work item being reviewed")
    reviewer_agent_id: str = Field(..., description="ID of the agent performing the review")
    status: ReviewStatus = Field(..., description="Outcome of the review")
    comments: str | None = Field(None, description="Review comments in Markdown format")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Task(BaseModel):
    """A single task in a workflow."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str = Field(..., description="Name of the task")
    agent_type: AgentType = Field(..., description="Type of agent required for this task")


class TaskDependency(BaseModel):
    """Represents a dependency between two tasks."""

    source_task_id: str = Field(..., description="The task that must be completed first")
    destination_task_id: str = Field(..., description="The task that depends on the source task")


class Workflow(BaseModel):
    """A workflow template consisting of a DAG of tasks."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str = Field(..., description="Name of the workflow")
    tasks: list[Task] = Field(default_factory=list, description="List of tasks in the workflow")
    dependencies: list[TaskDependency] = Field(
        default_factory=list, description="List of dependencies between tasks"
    )
