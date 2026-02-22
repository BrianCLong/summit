from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from services.graphrag_api.models.reasoning_budget import ReasoningBudget
from services.graphrag_api.middleware.budget_enforcer import BudgetEnforcer, TraceContext

router = APIRouter()
enforcer = BudgetEnforcer()

class ChatRequest(BaseModel):
    query: str
    tenant_id: str
    budget: Optional[ReasoningBudget] = None

class EvidencePath(BaseModel):
    id: str
    nodes: List[str]

class BudgetUsage(BaseModel):
    nodes_visited: int
    paths_found: int

class ChatResponse(BaseModel):
    answer: str
    evidence_paths: List[EvidencePath]
    explanation_grade: str
    stop_reason: str
    budget_used: BudgetUsage

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    # Enforce budget and create context
    budget = request.budget or ReasoningBudget()
    context: TraceContext = enforcer.enforce(request.tenant_id, budget)

    # In a real implementation, we would pass `context` to the retrieval/generation layers

    # Mock response
    return ChatResponse(
        answer="This is a mocked answer based on the graph.",
        evidence_paths=[EvidencePath(id="path-1", nodes=["EntityA", "EntityB"])],
        explanation_grade="strong",
        stop_reason=context.budget.explore.stop_when,
        budget_used=BudgetUsage(nodes_visited=10, paths_found=1)
    )
