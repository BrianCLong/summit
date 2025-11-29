# Codex Prompt Templates

## Algorithm-Focused Prompt (Graph Traversal)
You are an expert software engineer.
Task: Implement breadth-first search (BFS) and depth-first search (DFS) for an undirected graph, returning traversal order and shortest path length between any two nodes.
Language: Python (standard library only).
Constraints:
- Represent the graph with an adjacency list.
- Validate inputs (no duplicate edges, nodes must exist before connecting).
- Include docstrings and inline comments for every public function.
- Add basic unit tests in the same file under a `__main__` guard.
Output: A single, self-contained Python script ready to run directly.

## Real-World Integration Prompt (External API)
You are an expert software engineer.
Task: Build a service that fetches weather data from the OpenWeatherMap API and exposes a REST endpoint to return normalized forecasts (temperature, conditions, humidity).
Language: Python using FastAPI and `httpx`.
Constraints:
- Read the OpenWeatherMap API key from the environment; fail fast with a helpful error if missing.
- Cache responses for 5 minutes to avoid redundant upstream calls.
- Include proper error handling for HTTP failures and malformed responses.
- Add inline comments explaining each route and helper.
- Provide a minimal `README` section at the bottom describing how to run and test the service.
Output: A complete FastAPI application file that can be run directly with `uvicorn`.
