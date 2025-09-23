import strawberry
from typing import List, Dict, Any
from intelgraph_py.analytics.explainability_engine import ExplanationOutput, generate_explanation
from intelgraph_py.tasks import generate_explanation_task
from intelgraph_py.models import ExplanationTaskResult
from intelgraph_py.database import get_db
from sqlalchemy.orm import Session

@strawberry.type
class Explanation:
    explanation_text: str
    confidence_score: float
    source_metadata: strawberry.scalars.JSON
    semantic_summary: str

@strawberry.type
class ExplanationTaskStatus:
    task_id: str
    status: str
    explanation_output: strawberry.scalars.JSON = None

@strawberry.input
class InsightInput:
    insight_type: str
    nodes: List[str] = strawberry.field(default_factory=list)
    edges: List[strawberry.scalars.JSON] = strawberry.field(default_factory=list)
    community_id: int = None
    community_details: List[strawberry.scalars.JSON] = strawberry.field(default_factory=list) # e.g., [{node_id: "A", community_id: 1}]
    central_node_id: str = None
    centrality_score: float = None
    centrality_type: str = None # e.g., "betweenness", "degree"
    predicted_edge: strawberry.scalars.JSON = None # e.g., {source_node_id: "A", target_node_id: "B", prediction_score: 0.9}
    llm_model: str = "gpt-4o" # Allow specifying LLM model
    # Add other relevant insight data fields as needed

@strawberry.type
class Query:
    @strawberry.field
    async def hello(self) -> str:
        return "Hello, world!"

    @strawberry.field
    async def get_explanation_task_status(self, task_id: str) -> ExplanationTaskStatus:
        db: Session = next(get_db()) # Get DB session
        task_result = db.query(ExplanationTaskResult).filter(ExplanationTaskResult.task_id == task_id).first()
        db.close()
        if not task_result:
            raise Exception("Task not found")
        return ExplanationTaskStatus(
            task_id=task_result.task_id,
            status=task_result.status,
            explanation_output=task_result.explanation_output
        )

@strawberry.type
class Mutation:
    @strawberry.mutation
    async def explain_graph_insight(self, insight_data: InsightInput) -> str:
        """
        Dispatches a task to generate a natural language explanation for a given AI-derived graph insight.
        Returns the task ID.
        """
        # Convert InsightInput to a dictionary for the explanation engine
        insight_data_dict = insight_data.__dict__.copy()
        llm_model = insight_data_dict.pop("llm_model", "gpt-4o")

        task = generate_explanation_task.delay(insight_data_dict, llm_model)
        return task.id

schema = strawberry.Schema(query=Query, mutation=Mutation)
