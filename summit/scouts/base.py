import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, List

from summit.telemetry.instrumentation import get_telemetry
from summit.telemetry.metrics import get_metrics


@dataclass
class Result:
    artifacts: list[str] = field(default_factory=list)
    cost_ms: int = 0

@dataclass
class Config:
    max_cost_ms: int = 1000
    max_output_bytes: int = 1024 * 1024
    allowlisted_tools: list[str] = field(default_factory=list)

class Scout(ABC):
    @abstractmethod
    def name(self) -> str:
        pass

    def run(self, ctx: Any, cfg: Config) -> Result:
        tracer = get_telemetry().tracer
        metrics = get_metrics()

        with tracer.start_as_current_span(f"scout.{self.name()}") as span:
            start_time = time.time()
            try:
                result = self._run(ctx, cfg)
                status = "success"
                metrics.record_scout_run(self.name(), time.time() - start_time, status, result.cost_ms)
                return result
            except Exception as e:
                status = "error"
                metrics.record_scout_error(self.name(), type(e).__name__)
                metrics.record_scout_run(self.name(), time.time() - start_time, status)
                span.record_exception(e)
                raise

    @abstractmethod
    def _run(self, ctx: Any, cfg: Config) -> Result:
        pass
