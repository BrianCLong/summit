# Summit GraphRAG Distributed Tracing

This directory contains scripts for instrumenting the Summit GraphRAG pipeline with distributed tracing using OpenTelemetry.

## Files

- `simulate_graphrag.py`: Simulates the GraphRAG pipeline components (api_receipt, entity_resolution, graph_traversal, llm_call, answer_synthesis, response_dispatch) with OpenTelemetry trace instrumentation.
- `analyze_traces.py`: Analyzes the exported JSON traces and generates per-span latency breakdowns (average, min, max durations).
- `requirements.txt`: Python dependencies required for OpenTelemetry.

## Setup

Install the required Python packages:

```bash
pip install -r requirements.txt
```

## Running the Simulation and Exporting Traces

### Exporting to a Local JSON File (for Analysis)

To export traces to a local JSON file for the analysis script, set the `TRACE_OUTPUT_FILE` environment variable:

```bash
export TRACE_OUTPUT_FILE="traces.json"
python simulate_graphrag.py
```

### Exporting to Jaeger / OTLP Backend

By default, the script will attempt to export traces to an OTLP endpoint at `http://localhost:4317` (the default gRPC endpoint for OpenTelemetry Collector or Jaeger with OTLP receiver).

You can override this endpoint using the `OTLP_ENDPOINT` environment variable:

```bash
export OTLP_ENDPOINT="http://your-jaeger-host:4317"
python simulate_graphrag.py
```

To run Jaeger locally for testing via Docker:

```bash
docker run -d --name jaeger \
  -e COLLECTOR_OTLP_ENABLED=true \
  -p 16686:16686 \
  -p 4317:4317 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest
```

After running the script, navigate to `http://localhost:16686` to view the traces in the Jaeger UI. Look for the `summit-graphrag` service.

## Trace Analysis

You can run the provided analysis script against the exported local JSON file:

```bash
python analyze_traces.py traces.json
```

This will output a latency breakdown table similar to this:

```
Span Name                 | Count  | Avg (ms)   | Min (ms)   | Max (ms)
----------------------------------------------------------------------
api_receipt               | 3      | 1421.45    | 1201.21    | 1650.11
llm_call                  | 3      | 1102.34    | 901.12     | 1342.15
graph_traversal           | 3      | 205.11     | 112.44     | 311.22
entity_resolution         | 3      | 110.22     | 55.11      | 190.33
answer_synthesis          | 3      | 85.34      | 51.12      | 120.45
response_dispatch         | 3      | 25.11      | 11.22      | 45.11
```

## Trace Attributes Captured

The instrumentation automatically captures these attributes for each span:
- `query.id`: Unique identifier for the query sequence.
- `query.text`: The original query string (captured on `api_receipt`).
- `graph.entity_count`: Number of entities resolved and traversed.
- `graph.depth`: Depth of traversal in the graph.
- `llm.token_count`: Simulated number of tokens processed.
