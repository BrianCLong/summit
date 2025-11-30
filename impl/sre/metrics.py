from abc import ABC, abstractmethod
from typing import List
from .models import Episode

class Metric(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def compute(self, episode: Episode) -> float:
        """Returns a scalar score for the episode."""
        pass

class TraceLengthMetric(Metric):
    @property
    def name(self) -> str:
        return "trace_length"

    def compute(self, episode: Episode) -> float:
        return float(len(episode.graph.nodes))

class ToolEfficiencyMetric(Metric):
    @property
    def name(self) -> str:
        return "tool_efficiency"

    def compute(self, episode: Episode) -> float:
        tool_calls = [n for n in episode.graph.nodes if n.type == "call"]
        if not tool_calls:
            return 1.0  # No tool calls means perfectly efficient (or irrelevant)

        # In a real implementation, we'd check if the tool call was useful
        # For now, just a placeholder ratio of unique tools to total calls
        unique_tools = set(n.metadata.get("tool_name", "unknown") for n in tool_calls)
        return len(unique_tools) / len(tool_calls)

class ExactMatchMetric(Metric):
    @property
    def name(self) -> str:
        return "exact_match"

    def compute(self, episode: Episode) -> float:
        # Placeholder: Compare episode.outcome with expected (passed via metadata or separate context)
        # Assuming run_config has 'expected_answer' for simplicity in this MVP
        expected = episode.run_config.get("expected_answer")
        actual = episode.outcome
        if expected is None or actual is None:
            return 0.0
        return 1.0 if str(expected).strip() == str(actual).strip() else 0.0
