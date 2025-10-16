from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import ConsoleSpanExporter, SimpleSpanProcessor

# Configure OpenTelemetry (for demonstration purposes)
provider = TracerProvider()
processor = SimpleSpanProcessor(ConsoleSpanExporter())
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

tracer = trace.get_tracer(__name__)


def execute_dag_node(run_id: str, node_id: str, tenant: str, model: str):
    """
    Simulates the execution of a DAG node with OTel spans.
    """
    with tracer.start_as_current_span(
        "dag_node_execution",
        attributes={
            "run.id": run_id,
            "node.id": node_id,
            "tenant": tenant,
            "model": model,
        },
    ) as span:
        print(
            f"Executing DAG node: Run ID={run_id}, Node ID={node_id}, Tenant={tenant}, Model={model}"
        )
        # Simulate some work
        import time

        time.sleep(0.1)
        span.add_event("node_completed", {"status": "success"})


if __name__ == "__main__":
    # Example usage
    execute_dag_node("run-123", "node-abc", "tenant-x", "model-y")
    execute_dag_node("run-124", "node-def", "tenant-z", "model-a")
