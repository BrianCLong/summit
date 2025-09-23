# Universal Ingestion Pipeline

This module provides a reference Python ETL pipeline that ingests heterogeneous
HUMINT, SIGINT, GEOINT and OSINT data into the IntelGraph Neo4j model.

## Features

- Handles CSV, JSON, XML, plain text and GeoJSON inputs
- Normalises records into `Entity` and `RELATIONSHIP` structures
- Performs fuzzy entity resolution and optional NLP driven alias linking
- Loads results into Neo4j using the official Python driver

## Usage

```bash
python ingest.py OSINT sample.csv sample.json sample.xml sample.txt sample.geojson \
  --neo4j-uri bolt://localhost:7687 --neo4j-user neo4j --neo4j-password password
```

Each file is tagged with the supplied source type (e.g. HUMINT, SIGINT). The
pipeline resolves duplicate entities before inserting them into the graph.
