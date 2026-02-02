# Debezium & OpenLineage Integration Guide

Debezium 3.4 marks a turning point for built-in OpenLineage support. Instead of relying on a Kafka Connect transformation to emit lineage events, Debezium Server (the lightweight runner outside Kafka Connect) can emit OpenLineage output directly.

## Debezium Server Configuration

You can configure Debezium Server to send lineage events to an OpenLineage backend (like Marquez or equivalent) using straightforward properties in `application.properties`.

### Required Properties

Add the following to your `application.properties`:

```properties
debezium.sink.type=openlineage
debezium.sink.openlineage.url=<your-openlineage-url>
debezium.sink.openlineage.pipeline.namespace=summit
```

*   `debezium.sink.type`: Set to `openlineage` to enable the sink.
*   `debezium.sink.openlineage.url`: The URL of your OpenLineage backend (e.g., Marquez).
*   `debezium.sink.openlineage.pipeline.namespace`: A namespace for your pipelines (e.g., `summit`).

Under the hood, this produces marketplace-standard Run, Job, and Dataset facets for each change event Debezium sees. Table names and columns get translated into OpenLineage datasets, so schema changes (like adding a column or renaming a table) surface as lineage evolutions you can validate and test against your tooling.

## Airflow OpenLineage Provider

Airflow’s OpenLineage provider has been iterating in lockstep.

*   **Version**: 2.9.2
*   **Release Date**: January 2, 2026

Ensure that Airflow DAG runs emit lineage events compatible with the latest OpenLineage API schema by installing the official provider:

```bash
pip install apache-airflow-providers-openlineage==2.9.2
```

## End-to-End Verification

With these updates, you can:

1.  Configure Debezium Server to emit OpenLineage events without extra transforms.
2.  Point both Debezium and Airflow at the same lineage backend (e.g., Marquez).
3.  Validate lineage via automated fixtures.

### Testing Lineage

You should write tests to replay intentional schema changes and confirm the lineage output matches expectations. Automated fixtures should assert expected Run, Dataset, and Job facets.
