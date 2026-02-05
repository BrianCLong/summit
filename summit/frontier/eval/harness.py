from dataclasses import dataclass
from typing import Callable, Any, Dict, List, Optional
import time

@dataclass
class Scenario:
    name: str
    setup_func: Callable[[], Any]
    run_func: Callable[[Any], Any]
    check_func: Callable[[Any], float]  # Returns score 0.0-1.0

@dataclass
class EvaluationResult:
    scenario_name: str
    score: float
    duration: float
    error: Optional[str] = None

class EvalHarness:
    def __init__(self):
        self.results: List[EvaluationResult] = []

    def run_scenario(self, scenario: Scenario) -> EvaluationResult:
        start_time = time.time()
        try:
            context = scenario.setup_func()
            output = scenario.run_func(context)
            score = scenario.check_func(output)
            error = None
        except Exception as e:
            score = 0.0
            error = str(e)
            output = None

        duration = time.time() - start_time
        result = EvaluationResult(scenario.name, score, duration, error)
        self.results.append(result)
        return result
