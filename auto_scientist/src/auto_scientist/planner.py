# src/auto_scientist/planner.py
from __future__ import annotations
import yaml
from typing import List, Protocol, runtime_checkable
from pathlib import Path
from uuid import UUID

from pydantic import BaseModel
import litellm

from .graph import ExperimentGraph
from .curriculum import CurriculumStage

class PlannerError(Exception):
    """Base exception for planner errors."""

class ProposedExperiment(BaseModel):
    """Represents a single experiment proposed by a planner."""
    description: str
    config: dict
    depends_on: List[UUID]

@runtime_checkable
class Planner(Protocol):
    """Protocol for a planner, which proposes new experiments."""
    def propose_experiments(
        self,
        graph: ExperimentGraph,
        curriculum_stage: CurriculumStage,
        research_goal: str,
        max_proposals: int = 1,
    ) -> List[ProposedExperiment]:
        ...

class LLMPlannerConfig(BaseModel):
    """Configuration for the LLMPlanner."""
    provider: str = "openai"
    model: str = "gpt-4-turbo-preview"
    temperature: float = 0.1
    prompt_template_path: Path = Path("prompts/planner.prompt.yaml")

class LLMPlanner(Planner):
    """
    A planner that uses a large language model to propose experiments.
    """
    def __init__(self, config: LLMPlannerConfig):
        self.config = config
        self._load_prompt_template()

    def _load_prompt_template(self) -> None:
        try:
            with self.config.prompt_template_path.open("r", encoding="utf-8") as f:
                template_data = yaml.safe_load(f)
            self.system_prompt = template_data["system_prompt"]
            self.user_prompt_template = template_data["user_prompt_template"]
        except Exception as e:
            raise PlannerError(f"Failed to load prompt template from '{self.config.prompt_template_path}': {e}")

    def propose_experiments(
        self,
        graph: ExperimentGraph,
        curriculum_stage: CurriculumStage,
        research_goal: str,
        max_proposals: int = 1,
    ) -> List[ProposedExperiment]:
        """
        Generates experiment proposals by querying an LLM.
        """
        user_prompt = self.user_prompt_template.format(
            research_goal=research_goal,
            stage_name=curriculum_stage.name,
            stage_description=curriculum_stage.description,
            stage_goals="\n".join(f"- {g}" for g in curriculum_stage.goals),
            graph_json=graph.to_dict(),
        )

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        try:
            response = litellm.completion(
                model=f"{self.config.provider}/{self.config.model}",
                messages=messages,
                temperature=self.config.temperature,
            )
            raw_content = response.choices[0].message.content
        except Exception as e:
            raise PlannerError(f"LLM API call failed: {e}")

        # Post-process the response to extract the YAML
        try:
            # Clean up the response, removing markdown code fences
            cleaned_content = raw_content.strip().removeprefix("```yaml").removesuffix("```").strip()
            proposals_data = yaml.safe_load(cleaned_content)

            if not isinstance(proposals_data, list):
                raise ValueError("Expected a list of proposals.")

            return [ProposedExperiment.model_validate(p) for p in proposals_data]

        except Exception as e:
            raise PlannerError(f"Failed to parse LLM response as valid YAML: {e}\nRaw response:\n{raw_content}")

class MockPlanner(Planner):
    """
    A simple mock planner for testing and development.
    Proposes a predefined experiment.
    """
    def propose_experiments(
        self,
        graph: ExperimentGraph,
        curriculum_stage: CurriculumStage,
        research_goal: str,
        max_proposals: int = 1,
    ) -> List[ProposedExperiment]:
        print("MockPlanner: Proposing a simple experiment.")
        return [
            ProposedExperiment(
                description="Run a simple baseline model.",
                config={"model": "mock_model", "param": 0.1},
                depends_on=[],
            )
        ]
