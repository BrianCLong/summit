import asyncio
import os
import random
import uuid
import time
import json
from typing import Dict, Any, Sequence

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import (
    BatchSpanProcessor,
    SpanExporter,
    SpanExportResult
)
from opentelemetry.sdk.resources import Resource
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import ReadableSpan

# Set up tracing
resource = Resource.create(attributes={"service.name": "summit-graphrag"})
provider = TracerProvider(resource=resource)

# Configure Exporters
# 1. OTLP Exporter (for Jaeger / external backend)
otlp_endpoint = os.environ.get("OTLP_ENDPOINT", "http://localhost:4317")
otlp_exporter = OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

# 2. JSON Exporter (for local analysis)
class JsonFileSpanExporter(SpanExporter):
    def __init__(self, filename="traces.json"):
        self.filename = filename

    def export(self, spans: Sequence[ReadableSpan]) -> SpanExportResult:
        try:
            with open(self.filename, 'a') as f:
                for span in spans:
                    span_data = {
                        "name": span.name,
                        "context": {
                            "trace_id": format(span.get_span_context().trace_id, '032x'),
                            "span_id": format(span.get_span_context().span_id, '016x'),
                            "is_remote": span.get_span_context().is_remote,
                        },
                        "parent_id": format(span.parent.span_id, '016x') if span.parent else None,
                        "start_time": span.start_time,
                        "end_time": span.end_time,
                        "attributes": dict(span.attributes) if span.attributes else {},
                    }
                    f.write(json.dumps(span_data) + '\n')
            return SpanExportResult.SUCCESS
        except Exception as e:
            print(f"Failed to export span: {e}")
            return SpanExportResult.FAILURE

    def shutdown(self) -> None:
        pass

if os.environ.get("TRACE_OUTPUT_FILE"):
    file_exporter = JsonFileSpanExporter(filename=os.environ.get("TRACE_OUTPUT_FILE"))
    provider.add_span_processor(BatchSpanProcessor(file_exporter))

trace.set_tracer_provider(provider)
tracer = trace.get_tracer("graphrag.tracer")

async def entity_resolution(query: str, query_id: str):
    with tracer.start_as_current_span("entity_resolution") as span:
        span.set_attribute("query.id", query_id)
        # Simulate work
        await asyncio.sleep(random.uniform(0.05, 0.2))
        entities = ["entity1", "entity2", "entity3"]
        span.set_attribute("graph.entity_count", len(entities))
        return entities

async def graph_traversal(entities: list, query_id: str):
    with tracer.start_as_current_span("graph_traversal") as span:
        span.set_attribute("query.id", query_id)
        span.set_attribute("graph.entity_count", len(entities))
        # Simulate work
        depth = random.randint(1, 3)
        span.set_attribute("graph.depth", depth)
        await asyncio.sleep(random.uniform(0.1, 0.4))
        return f"graph_context_depth_{depth}"

async def llm_call(context: str, query: str, query_id: str):
    with tracer.start_as_current_span("llm_call") as span:
        span.set_attribute("query.id", query_id)
        # Simulate work
        tokens = random.randint(100, 500)
        span.set_attribute("llm.token_count", tokens)
        await asyncio.sleep(random.uniform(0.5, 1.5))
        return "llm_raw_response"

async def answer_synthesis(raw_response: str, query_id: str):
    with tracer.start_as_current_span("answer_synthesis") as span:
        span.set_attribute("query.id", query_id)
        # Simulate work
        await asyncio.sleep(random.uniform(0.05, 0.15))
        return "synthesized_answer"

async def response_dispatch(answer: str, query_id: str):
    with tracer.start_as_current_span("response_dispatch") as span:
        span.set_attribute("query.id", query_id)
        # Simulate work
        await asyncio.sleep(random.uniform(0.01, 0.05))
        return {"status": "success", "data": answer}

async def process_query(query: str):
    query_id = str(uuid.uuid4())
    # Note: start_as_current_span does not automatically propagate context
    # correctly across 'await' unless we do it within the same asyncio context.
    # However, Python opentelemetry uses ContextVars, so it works across async tasks.
    with tracer.start_as_current_span("api_receipt") as span:
        span.set_attribute("query.id", query_id)
        span.set_attribute("query.text", query)

        entities = await entity_resolution(query, query_id)
        context = await graph_traversal(entities, query_id)
        raw_response = await llm_call(context, query, query_id)
        answer = await answer_synthesis(raw_response, query_id)
        response = await response_dispatch(answer, query_id)

        return response

async def main():
    queries = [
        "What are the capabilities of the platform?",
        "Who is the CEO of the target company?",
        "Find recent activity related to threat actor X."
    ]

    print("Simulating GraphRAG queries...")
    tasks = [process_query(q) for q in queries]
    await asyncio.gather(*tasks)
    print("Simulation complete. Ensuring all traces are flushed...")
    provider.force_flush()

if __name__ == "__main__":
    asyncio.run(main())
