import logging
from typing import Any, Protocol, runtime_checkable

from .sandbox import SafeExecutor

logger = logging.getLogger(__name__)

@runtime_checkable
class LLMProvider(Protocol):
    def generate_plan(self, query: str, context: dict[str, Any]) -> str:
        ...

class VisionInvestigationLoop:
    MAX_PIXELS = 60_000_000 # 60MP

    def __init__(self, llm: LLMProvider):
        self.llm = llm
        self.executor = SafeExecutor()
        self.context = {}
        self.history = []
        self.total_pixels_processed = 0

    def think(self, query: str) -> str:
        """Asks LLM for next step/code."""
        response = self.llm.generate_plan(query, self.context)
        self.history.append({"role": "llm", "content": response})
        return response

    def act(self, code: str) -> dict[str, Any]:
        """Executes the code."""
        if self.total_pixels_processed > self.MAX_PIXELS:
            return {"error": "Pixel budget exceeded. Execution blocked."}

        # Simple heuristic: remove markdown code blocks if present
        cleaned_code = code.replace("```python", "").replace("```", "").strip()

        result = self.executor.execute(cleaned_code, self.context)
        self.history.append({"role": "executor", "code": cleaned_code, "result": result})
        return result

    def observe(self, result: dict[str, Any]):
        """Updates context with results and checks budget."""
        if "error" in result:
             logger.error(f"Observation error: {result['error']}")

        # Check for pixel usage in metrics from tool outputs
        # Note: result is the `locals()` from execution. We need to find tool outputs.
        # Tool outputs are dicts with "metrics".
        for val in result.values():
            if isinstance(val, dict) and "metrics" in val:
                metrics = val["metrics"]
                w, h = 0, 0
                if "crop_size" in metrics:
                    w, h = metrics["crop_size"]
                elif "new_size" in metrics:
                    w, h = metrics["new_size"]
                # "original_size" is input, we care about processed output size usually,
                # or maybe input size for the op. Let's count output size for now.

                self.total_pixels_processed += w * h

        if self.total_pixels_processed > self.MAX_PIXELS:
            logger.warning(f"Pixel budget exceeded: {self.total_pixels_processed}/{self.MAX_PIXELS}")

        # Merge locals back into context so variables persist between steps
        self.context.update(result)

    def run(self, image_path: str, query: str, max_steps: int = 5) -> dict[str, Any]:
        self.context = {"image_path": image_path}
        self.history = []
        self.total_pixels_processed = 0

        logger.info(f"Starting investigation on {image_path} with query: {query}")

        for step in range(max_steps):
            logger.info(f"Step {step+1}/{max_steps}")

            # 1. Think
            response = self.think(query)

            # Check if finished
            if "FINAL ANSWER:" in response:
                return {
                    "status": "success",
                    "answer": response.split("FINAL ANSWER:")[1].strip(),
                    "history": self.history,
                    "evidence": self.context # The final context contains all variables/metrics
                }

            # 2. Act
            result = self.act(response)

            # 3. Observe
            self.observe(result)

            if self.total_pixels_processed > self.MAX_PIXELS:
                logger.warning(f"Pixel budget exceeded: {self.total_pixels_processed}/{self.MAX_PIXELS}")
                return {"status": "budget_exceeded", "history": self.history}

            if "error" in result:
                logger.warning(f"Step failed: {result['error']}")
                if "Pixel budget exceeded" in result['error']:
                    return {"status": "budget_exceeded", "history": self.history}
                # Continue to next step to let LLM recover

        return {"status": "timeout", "history": self.history, "evidence": self.context}
