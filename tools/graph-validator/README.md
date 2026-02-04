# Graph Degree Distribution Drift Validator

This tool monitors the degree distribution of a Neo4j graph for drift using an online Kolmogorov-Smirnov (KS) test. It is designed to be CI-friendly and lightweight.

## Components

- **validator.py**: The core script that samples degrees, maintains a baseline, and runs the KS test.
- **loader.py**: A utility to load synthetic data into Neo4j for testing purposes.
- **Dockerfile**: Encapsulates the environment (Python, dependencies).
- **docker-compose.yml**: A complete fixture with Neo4j, Postgres, loader, and validator.

## Usage

### Running the Fixture

To start the full environment (Neo4j, Postgres, Data Loader, and Validator):

```bash
docker-compose up --build --exit-code-from validator
```

This command will:
1. Start Neo4j and Postgres.
2. Wait for Neo4j to be healthy.
3. Run `loader` to populate the graph with random nodes and edges.
4. Run `validator` to:
   - Create a baseline (if not present in `./artifacts`).
   - Run the validation check against the live graph.
   - Output a JSON report to `./artifacts/drift_report.json`.
   - Exit with code 0 if OK, or 1 if DRIFT is detected (or error).

### Output

The validator emits a JSON report:

```json
{
  "test": "two_sample_KS_online",
  "D": 0.0123,
  "p": 0.4567,
  "n_baseline": 50000,
  "n_live": 50000,
  "topk_mass_delta": [...],
  "status": "OK",
  "window_start": "...",
  "window_end": "..."
}
```

### Configuration

Environment variables in `docker-compose.yml` control the behavior:

- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`: Connection details.
- `NODE_COUNT`, `EDGE_COUNT`: Data size for the loader.

### Manual Run

You can build the image and run it manually:

```bash
docker build -t graph-validator .
docker run --network host -e NEO4J_URI=bolt://localhost:7687 graph-validator
```

## Algorithm

1. **Sampling**: Fetches a random sample of degrees from the graph (default N=100k) using `MATCH (n) WHERE rand() < P ...`.
2. **KS Test**: Computes the KS statistic ($D$) and p-value between the baseline and the live sample.
   * *Note*: This implementation uses the exact KS test (`scipy.stats.ks_2samp`) on the full reservoir sample (100k items) rather than a sketch approximation, as 100k integers fit easily in memory and allow for higher precision without the complexity of sketch data structures.
3. **Decision**: Flags drift if $D > 0.05$ or $p < 0.01$.

## Requirements

- Docker & Docker Compose
- Python 3.11+ (if running locally)
- Dependencies: `neo4j`, `scipy`, `numpy`
