# Summit Entity Coverage Analysis

This tool provides scripts to analyze and report on the entity coverage of Summit's knowledge graph relative to its source corpus.

## Features

- **Entity Counts**: Unique entities by type (person, organization, location, event, concept), compared across staging (PG) and graph (Neo4j).
- **Document Coverage**: Percentage of source documents with at least one extracted entity.
- **Entity Deserts**: Identification of documents with zero extractions.
- **Density Distributions**: Computation of entity density per document (Bucketed).
- **Ingestion Tracking**: Rate of new entity introduction over ingestion batches.
- **Type Balance**: Detection of entity type imbalances.
- **Domain Comparison**: Comparison of coverage across different source domains.

## Usage

```bash
python scripts/entity_coverage/run_analysis.py --output-dir reports/entity-coverage
```

## Requirements

- Python 3.10+
- PostgreSQL and Neo4j access (via environment variables)
- Dependencies: `psycopg2-binary`, `neo4j`
