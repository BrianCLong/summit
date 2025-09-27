import strawberry
from typing import List, Dict, Any, Optional
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
class LLMSettingsType:
    id: int
    model_name: str
    provider: str
    api_key: Optional[str]
    base_url: Optional[str]
    temperature: float
    max_tokens: int
    is_active: bool

@strawberry.input
class LLMSettingsInput:
    model_name: str
    provider: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 500
    is_active: bool = False

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

    @strawberry.field
    async def get_llm_settings(self, model_name: Optional[str] = None) -> List[LLMSettingsType]:
        db: Session = next(get_db())
        if model_name:
            settings = db.query(LLMSettings).filter(LLMSettings.model_name == model_name).all()
        else:
            settings = db.query(LLMSettings).all()
        db.close()
        return settings

@strawberry.input
class FeedbackInput:
    task_id: str
    feedback_type: str # e.g., "thumbs_up", "thumbs_down"
    comment: Optional[str] = None

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

    @strawberry.mutation
    async def submit_explanation_feedback(self, feedback: FeedbackInput) -> bool:
        """
        Submits feedback for a generated explanation.
        """
        db: Session = next(get_db())
        try:
            db_feedback = ExplanationFeedback(
                task_id=feedback.task_id,
                feedback_type=feedback.feedback_type,
                comment=feedback.comment
            )
            db.add(db_feedback)
            db.commit()
            db.refresh(db_feedback)
            return True
        except Exception as e:
            print(f"Error submitting feedback: {e}")
            return False
        finally:
            db.close()

    @strawberry.mutation
    async def create_llm_settings(self, settings: LLMSettingsInput) -> LLMSettingsType:
        db: Session = next(get_db())
        # Deactivate other settings for the same model if new one is active
        if settings.is_active:
            db.query(LLMSettings).filter(LLMSettings.model_name == settings.model_name).update({"is_active": False})
            db.commit()

        db_settings = LLMSettings(**settings.dict())
        db.add(db_settings)
        db.commit()
        db.refresh(db_settings)
        db.close()
        return db_settings

    @strawberry.mutation
    async def update_llm_settings(self, id: int, settings: LLMSettingsInput) -> LLMSettingsType:
        db: Session = next(get_db())
        db_settings = db.query(LLMSettings).filter(LLMSettings.id == id).first()
        if not db_settings:
            raise Exception("LLM Settings not found")

        # Deactivate other settings for the same model if updated one is active
        if settings.is_active:
            db.query(LLMSettings).filter(LLMSettings.model_name == settings.model_name, LLMSettings.id != id).update({"is_active": False})
            db.commit()

        for key, value in settings.dict(exclude_unset=True).items():
            setattr(db_settings, key, value)
        
        db.add(db_settings)
        db.commit()
        db.refresh(db_settings)
        db.close()
        return db_settings

schema = strawberry.Schema(query=Query, mutation=Mutation)
