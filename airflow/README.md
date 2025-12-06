# IntelGraph ETL Pipeline

This directory contains the Airflow Data Pipelines for IntelGraph.

## Structure

*   `dags/`: Contains the Airflow DAG definitions.
    *   `intelgraph_pipeline.py`: Main ETL pipeline for ingesting intelligence data.
    *   `coord_batch.py`: (Legacy/Deprecated) Coordination detection batch job.
*   `etl/`: Python package containing the core logic.
    *   `connectors/`: Data ingestion connectors (Mock, etc.).
    *   `transformers/`: Data validation and transformation logic (Pydantic models).
    *   `loaders/`: Database loaders (Neo4j).
*   `tests/`: Unit tests for the ETL components.

## Setup

1.  Ensure Python dependencies are installed:
    ```bash
    pip install apache-airflow neo4j pandas pydantic
    ```

2.  Set environment variables:
    ```bash
    export NEO4J_URI=bolt://neo4j:7687
    export NEO4J_USER=neo4j
    export NEO4J_PASSWORD=your_password
    export PYTHONPATH=$PYTHONPATH:$(pwd)
    ```

## Running Tests

To run the unit tests:

```bash
pytest -c /dev/null airflow/tests/
```

## Architecture

The `intelgraph_pipeline` DAG follows a standard ETL pattern:

1.  **Extract:** Fetches data from configured sources (currently using `MockSourceConnector` for demo).
2.  **Transform:** Validates data against the `IntelligenceRecord` Pydantic schema to ensure data quality.
3.  **Load:** Batches validated records and loads them into Neo4j using `Neo4jLoader`.
4.  **Quality Check:** Simple post-load verification.

The pipeline is designed to be:
*   **Robust:** Uses Pydantic for strict schema validation.
*   **Scalable:** Loaders support batching; Airflow allows parallel task execution.
*   **Maintainable:** Core logic is separated from DAG definitions in the `etl/` package.
