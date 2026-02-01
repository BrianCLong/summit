# Dependency Delta

## Added Dependencies
- `neo4j`: Required for GraphPerf benchmark runner and index health checks.
- `pytest-mock`: Required for unit testing GraphPerf components with mocked Neo4j drivers.

## Removed Dependencies
- None

## Rationale
- These dependencies are required for the new "GraphPerf: Path Query Accelerator" module, which includes database migrations, query shaping, and performance benchmarking.

## License Check
- [x] All new dependencies have compatible licenses (Apache-2.0, MIT, etc.)
  - `neo4j`: Apache-2.0
  - `pytest-mock`: MIT
