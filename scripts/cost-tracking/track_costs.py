import argparse
import csv
import json
import logging
import random
import uuid
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Standard costs per 1K tokens (USD)
PRICING_TABLE = {
    "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
    "gpt-4o": {"input": 0.005, "output": 0.015},
    "claude-3-opus": {"input": 0.015, "output": 0.075},
    "qwen-max": {"input": 0.001, "output": 0.002},
    "vllm_native": {"input": 0.0001, "output": 0.0001},
}

class CostTracker:
    def __init__(self, anomaly_threshold_usd: float = 0.50):
        self.ledger: List[Dict[str, Any]] = []
        self.anomaly_threshold_usd = anomaly_threshold_usd

    def record_call(self, operation_type: str, model: str, prompt_tokens: int, completion_tokens: int, timestamp: Optional[datetime] = None) -> Dict[str, Any]:
        """Record a single LLM call."""
        if timestamp is None:
            timestamp = datetime.now(timezone.utc)

        # Calculate cost
        model_pricing = PRICING_TABLE.get(model, {"input": 0.0, "output": 0.0})
        cost_usd = (prompt_tokens / 1000.0) * model_pricing["input"] + (completion_tokens / 1000.0) * model_pricing["output"]

        is_anomaly = cost_usd > self.anomaly_threshold_usd

        entry = {
            "id": str(uuid.uuid4()),
            "timestamp": timestamp.isoformat(),
            "operation_type": operation_type,
            "model": model,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
            "cost_usd": cost_usd,
            "is_anomaly": is_anomaly
        }

        self.ledger.append(entry)

        if is_anomaly:
            logger.warning(f"Cost anomaly detected: {operation_type} using {model} cost ${cost_usd:.4f} ({prompt_tokens} in / {completion_tokens} out)")

        return entry

    def generate_report(self, output_dir: str = "."):
        """Aggregate costs and generate JSON and CSV reports."""
        if not self.ledger:
            logger.warning("No data in ledger to report.")
            return

        # Aggregations
        cost_by_operation = defaultdict(float)
        cost_by_model = defaultdict(float)
        tokens_by_operation = defaultdict(int)
        anomalies = []

        # Calculate trends (daily for this example)
        daily_costs = defaultdict(float)

        for entry in self.ledger:
            cost = entry["cost_usd"]
            op = entry["operation_type"]
            model = entry["model"]
            tokens = entry["total_tokens"]

            # Simple daily bucket
            day_str = entry["timestamp"][:10]

            cost_by_operation[op] += cost
            cost_by_model[model] += cost
            tokens_by_operation[op] += tokens
            daily_costs[day_str] += cost

            if entry["is_anomaly"]:
                anomalies.append(entry)

        # Sort daily costs to simulate trends
        trend_data = [{"date": k, "cost_usd": v} for k, v in sorted(daily_costs.items())]

        # Find top N expensive queries
        top_expensive = sorted(self.ledger, key=lambda x: x["cost_usd"], reverse=True)[:5]

        report = {
            "total_cost_usd": sum(e["cost_usd"] for e in self.ledger),
            "total_tokens": sum(e["total_tokens"] for e in self.ledger),
            "cost_by_operation": dict(cost_by_operation),
            "cost_by_model": dict(cost_by_model),
            "tokens_by_operation": dict(tokens_by_operation),
            "daily_trends": trend_data,
            "top_expensive_queries": top_expensive,
            "anomalies": anomalies
        }

        # Write JSON
        json_path = f"{output_dir}/cost_report.json"
        with open(json_path, "w") as f:
            json.dump(report, f, indent=2)
        logger.info(f"Wrote JSON report to {json_path}")

        # Write CSV
        csv_path = f"{output_dir}/cost_report.csv"
        with open(csv_path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=self.ledger[0].keys())
            writer.writeheader()
            writer.writerows(self.ledger)
        logger.info(f"Wrote CSV report to {csv_path}")

def infer_operation(prompt: str) -> str:
    """Infer the operation type from heuristics in the prompt text."""
    lower_prompt = prompt.lower()
    if "extract" in lower_prompt or "entities" in lower_prompt or "entity" in lower_prompt:
        return "entity_extraction"
    elif "embed" in lower_prompt or "vector" in lower_prompt:
        return "embedding"
    elif "rank" in lower_prompt or "score" in lower_prompt or "relevance" in lower_prompt:
        return "re_ranking"
    else:
        return "answer_generation"


def instrument_llm_calls(tracker: CostTracker):
    """
    Dynamically instrument LLM calls in the system without modifying production code.
    Since we cannot modify production code directly, we patch known call sites if this
    script is loaded at runtime.
    """
    try:
        from unittest.mock import patch

        # Try importing specific classes that make LLM calls to patch them
        # E.g., OpenAIGraphRagLlmAdapter in Node, but for Python we can patch OllamaProvider

        try:
            from summit.providers.ollama import OllamaProvider

            original_generate = OllamaProvider.generate

            def patched_generate(self, model: str, prompt: str, *, options: dict | None = None) -> dict:
                # Approximate tokens for prompt
                prompt_tokens = len(prompt.split()) * 1.3

                # Call original
                result = original_generate(self, model, prompt, options=options)

                # Approximate tokens for completion
                completion_tokens = len(result.get("response", "").split()) * 1.3

                op_type = infer_operation(prompt)

                # Record to tracker
                tracker.record_call(
                    operation_type=op_type,
                    model=model,
                    prompt_tokens=int(prompt_tokens),
                    completion_tokens=int(completion_tokens)
                )
                return result

            patch('summit.providers.ollama.OllamaProvider.generate', new=patched_generate).start()
            logger.info("Successfully instrumented OllamaProvider.generate")

        except ImportError:
            logger.info("OllamaProvider not found, skipping instrumentation.")

        try:
            from summit.orchestration.society_of_thought import SocietyOfThoughtEngine
            # This class takes an llm_client in its constructor.
            # A more advanced instrumentation would wrap the engine or the client.
            logger.info("SocietyOfThoughtEngine found, but instance-level patching requires app context.")
        except ImportError:
            logger.info("SocietyOfThoughtEngine not found, skipping.")

    except Exception as e:
        logger.error(f"Error during instrumentation: {e}")


def simulate_traffic(tracker: CostTracker, num_events: int = 100):
    """Simulate realistic traffic for testing before production deployment."""
    logger.info(f"Simulating {num_events} LLM calls...")

    operations = ["entity_extraction", "embedding", "answer_generation", "re_ranking"]
    models = list(PRICING_TABLE.keys())

    now = datetime.now(timezone.utc)

    for i in range(num_events):
        op = random.choice(operations)
        model = random.choice(models)

        # Simulate typical token distributions based on operation
        if op == "entity_extraction":
            pt = random.randint(1000, 5000)
            ct = random.randint(50, 200)
        elif op == "embedding":
            pt = random.randint(500, 8000)
            ct = 0
            model = "vllm_native" # Force specific model for embeddings
        elif op == "answer_generation":
            pt = random.randint(2000, 10000)
            ct = random.randint(500, 2500)
            # Occasional runaway generation
            if random.random() < 0.05:
                ct += random.randint(5000, 15000)
        else: # re_ranking
            pt = random.randint(4000, 12000)
            ct = random.randint(10, 50)

        # Spread events over the last 7 days
        days_ago = random.uniform(0, 7)
        timestamp = now - timedelta(days=days_ago)

        tracker.record_call(
            operation_type=op,
            model=model,
            prompt_tokens=pt,
            completion_tokens=ct,
            timestamp=timestamp
        )


def main():
    parser = argparse.ArgumentParser(description="Summit LLM Cost Tracking")
    parser.add_argument("--simulate", action="store_true", help="Run in simulation mode to generate fake traffic")
    parser.add_argument("--instrument", action="store_true", help="Dynamically instrument LLM calls (requires running as a wrapper)")
    parser.add_argument("--output-dir", type=str, default=".", help="Directory to write reports")
    parser.add_argument("--anomaly-threshold", type=float, default=0.50, help="USD threshold to flag a call as an anomaly")
    args = parser.parse_args()

    tracker = CostTracker(anomaly_threshold_usd=args.anomaly_threshold)

    if args.instrument:
        instrument_llm_calls(tracker)

    if args.simulate:
        simulate_traffic(tracker, num_events=200)
        tracker.generate_report(args.output_dir)
    elif not args.instrument:
        # If neither simulate nor instrument is passed, do a simple simulation by default
        # so the script actually does something when run standalone
        logger.info("No mode specified. Running simulation by default.")
        simulate_traffic(tracker, num_events=50)
        tracker.generate_report(args.output_dir)

if __name__ == "__main__":
    main()
