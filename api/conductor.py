"""Maestro Conductor API router for multi-agent orchestration."""

import os
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api.llm_provider import llm_provider
from maestro.models import (
    Agent,
    AgentType,
    Review,
    ReviewStatus,
    WorkItem,
    WorkItemStatus,
)
from summit.orchestration.policy.sot_policy import SocietyOfThoughtPolicy
from summit.orchestration.society_of_thought import SocietyOfThoughtEngine

router = APIRouter(prefix="/conductor", tags=["conductor"])

# In-memory storage for conductor objects (for scaffolding)
AGENTS: dict[str, Agent] = {}
WORK_ITEMS: dict[str, WorkItem] = {}
REVIEWS: dict[str, Review] = {}

# Stubbed workflow engine
AGENT_ASSIGNMENT_RULES = {
    "bug": "jules-bug-fixer",
    "feature": "codex-feature-dev",
    "security": "atlas-security-scanner",
    "default": "jules-generalist",
}


# Request/Response schemas
class CreateAgentRequest(BaseModel):
    name: str
    type: AgentType
    description: str | None = None


class CreateWorkItemRequest(BaseModel):
    github_issue_url: str
    title: str
    description: str | None = None
    priority: int = 0


class UpdateWorkItemRequest(BaseModel):
    status: WorkItemStatus | None = None
    assigned_to_agent_id: str | None = None


class HandoffWorkItemRequest(BaseModel):
    target_agent_id: str
    comments: str | None = None


class CreateReviewRequest(BaseModel):
    work_item_id: str
    reviewer_agent_id: str
    status: ReviewStatus
    comments: str | None = None


# Agent endpoints
@router.post("/agents", response_model=Agent, status_code=201)
def create_agent(request: CreateAgentRequest):
    """Create a new agent."""
    if request.name in [agent.name for agent in AGENTS.values()]:
        raise HTTPException(
            status_code=409, detail=f"Agent with name '{request.name}' already exists"
        )
    agent = Agent(name=request.name, type=request.type, description=request.description)
    AGENTS[agent.id] = agent
    return agent


@router.get("/agents", response_model=list[Agent])
def list_agents():
    """List all available agents."""
    return list(AGENTS.values())


@router.get("/agents/{agent_id}", response_model=Agent)
def get_agent(agent_id: str):
    """Get a specific agent by ID."""
    if agent_id not in AGENTS:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
    return AGENTS[agent_id]


# Work Item endpoints
@router.post("/work-items", response_model=WorkItem, status_code=201)
def create_work_item(request: CreateWorkItemRequest):
    """Create a new work item from a GitHub issue."""
    work_item = WorkItem(
        github_issue_url=request.github_issue_url,
        title=request.title,
        description=request.description,
        priority=request.priority,
    )
    WORK_ITEMS[work_item.id] = work_item
    return work_item


@router.get("/work-items", response_model=list[WorkItem])
def list_work_items(status: WorkItemStatus | None = None):
    """List all work items, optionally filtered by status."""
    if status:
        return [item for item in WORK_ITEMS.values() if item.status == status]
    return list(WORK_ITEMS.values())


@router.get("/work-items/{work_item_id}", response_model=WorkItem)
def get_work_item(work_item_id: str):
    """Get a specific work item by ID."""
    if work_item_id not in WORK_ITEMS:
        raise HTTPException(status_code=404, detail=f"Work item {work_item_id} not found")
    return WORK_ITEMS[work_item_id]


@router.patch("/work-items/{work_item_id}", response_model=WorkItem)
def update_work_item(work_item_id: str, request: UpdateWorkItemRequest):
    """Update a work item's status or assignee."""
    if work_item_id not in WORK_ITEMS:
        raise HTTPException(status_code=404, detail=f"Work item {work_item_id} not found")
    item = WORK_ITEMS[work_item_id]
    if request.status is not None:
        item.status = request.status
    if request.assigned_to_agent_id is not None:
        if request.assigned_to_agent_id not in AGENTS:
            raise HTTPException(
                status_code=404,
                detail=f"Agent {request.assigned_to_agent_id} not found",
            )
        item.assigned_to_agent_id = request.assigned_to_agent_id
    item.updated_at = datetime.utcnow()
    WORK_ITEMS[item.id] = item
    return item


# Orchestration endpoints
@router.post("/work-items/route", response_model=WorkItem)
def route_work_item(work_item_id: str):
    """Route a pending work item to an appropriate agent (stubbed)."""
    if work_item_id not in WORK_ITEMS:
        raise HTTPException(status_code=404, detail=f"Work item {work_item_id} not found")
    item = WORK_ITEMS[work_item_id]
    if item.status != WorkItemStatus.PENDING:
        raise HTTPException(
            status_code=400, detail="Work item must be in 'pending' status to be routed"
        )

    # Simple routing logic based on title keywords
    title_lower = item.title.lower()
    agent_name = AGENT_ASSIGNMENT_RULES["default"]
    if "bug" in title_lower or "fix" in title_lower:
        agent_name = AGENT_ASSIGNMENT_RULES["bug"]
    elif "feature" in title_lower or "implement" in title_lower:
        agent_name = AGENT_ASSIGNMENT_RULES["feature"]
    elif "security" in title_lower or "vulnerability" in title_lower:
        agent_name = AGENT_ASSIGNMENT_RULES["security"]

    # Find agent by name
    agent_id = None
    for id, agent in AGENTS.items():
        if agent.name == agent_name:
            agent_id = id
            break

    if not agent_id:
        raise HTTPException(status_code=404, detail=f"No agent found with name '{agent_name}'")

    item.assigned_to_agent_id = agent_id
    item.status = WorkItemStatus.ASSIGNED
    item.updated_at = datetime.utcnow()
    WORK_ITEMS[item.id] = item
    return item


@router.post("/work-items/{work_item_id}/handoff", response_model=WorkItem)
def handoff_work_item(work_item_id: str, request: HandoffWorkItemRequest):
    """Handoff a work item to another agent."""
    if work_item_id not in WORK_ITEMS:
        raise HTTPException(status_code=404, detail=f"Work item {work_item_id} not found")
    if request.target_agent_id not in AGENTS:
        raise HTTPException(
            status_code=404, detail=f"Target agent {request.target_agent_id} not found"
        )

    item = WORK_ITEMS[work_item_id]
    item.assigned_to_agent_id = request.target_agent_id
    item.status = WorkItemStatus.ASSIGNED
    item.updated_at = datetime.utcnow()
    # In a real system, we'd log the handoff comments
    WORK_ITEMS[item.id] = item
    return item


# Review endpoints
@router.post("/reviews", response_model=Review, status_code=201)
def create_review(request: CreateReviewRequest):
    """Submit a review for a work item."""
    if request.work_item_id not in WORK_ITEMS:
        raise HTTPException(status_code=404, detail=f"Work item {request.work_item_id} not found")
    if request.reviewer_agent_id not in AGENTS:
        raise HTTPException(
            status_code=404, detail=f"Reviewer agent {request.reviewer_agent_id} not found"
        )

    review = Review(
        work_item_id=request.work_item_id,
        reviewer_agent_id=request.reviewer_agent_id,
        status=request.status,
        comments=request.comments,
    )
    REVIEWS[review.id] = review

    # Update work item status to 'in_review'
    item = WORK_ITEMS[request.work_item_id]
    item.status = WorkItemStatus.IN_REVIEW
    item.updated_at = datetime.utcnow()
    WORK_ITEMS[item.id] = item

    return review


@router.get("/work-items/{work_item_id}/reviews", response_model=list[Review])
def get_reviews_for_work_item(work_item_id: str):
    """Get all reviews for a specific work item."""
    if work_item_id not in WORK_ITEMS:
        raise HTTPException(status_code=404, detail=f"Work item {work_item_id} not found")
    return [review for review in REVIEWS.values() if review.work_item_id == work_item_id]


# Society of Thought Integration
SOT_ENABLED = os.environ.get("SOT_ENABLED", "false").lower() == "true"

@router.post("/reason")
async def reason(user_input: str):
    """Reason about a task using Society of Thought (if enabled)."""
    policy = SocietyOfThoughtPolicy()
    engine = SocietyOfThoughtEngine(llm_provider, policy=policy, enabled=SOT_ENABLED)

    try:
        result = await engine.run(user_input)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
