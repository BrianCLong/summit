# SYNINT OSINT Capability Service

This module provides integration with SYNINT OSINT tools, allowing Summit to trigger OSINT sweeps and ingest normalized findings into the IntelGraph.

## Architecture

1.  **SynintClient**: Responsible for executing SYNINT sweeps. It supports two modes:
    *   **HTTP**: Communicates with a SYNINT API (FastAPI wrapper).
    *   **CLI**: Invokes SYNINT via Python CLI.
2.  **SynintMapper**: Normalizes raw agent findings into a generic `GraphMutation` format.
3.  **GraphQL Resolver**: Orchestrates the process: Validates target -> Runs sweep -> Maps findings -> Ingests into Neo4j.

## Configuration

Environment variables used by the service:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `SYNINT_MODE` | Execution mode: `http` or `cli` | `http` |
| `SYNINT_URL` | Base URL for SYNINT API (HTTP mode) | `http://localhost:8080` |
| `SYNINT_PYTHON` | Python binary path (CLI mode) | `python3` |
| `SYNINT_ENTRYPOINT` | Path to SYNINT `main.py` (CLI mode) | `main.py` |
| `SYNINT_TIMEOUT_MS` | Maximum execution time | `120000` |
| `SYNINT_CONCURRENCY` | Max concurrent agents | `2` |

## Extensibility

### Adding New Agents

To support a new SYNINT agent:
1.  Update `SynintMapper.toMutations` to recognize the agent name.
2.  Implement a mapping function in `SynintMapper` that converts the agent's findings into `GraphMutation` objects (nodes and edges).

### Custom Schema Mapping

The service maps findings to a standard schema:
*   **WhoisAgent**: Maps to `Domain` and `Organization` nodes.
*   **SocialMediaAgent**: Maps to `Target` and `Account` nodes.

## Usage via GraphQL

```graphql
mutation {
  runSynintSweep(target: "example.com") {
    target
    agents {
      agentName
      success
      findings
    }
  }
}
```
