# DuckDB Connector

This connector demonstrates a basic bridge for ingesting data from DuckDB using SQL queries.

## How to use

1.  This connector expects a SQL query file (`.sql`) that defines the data to be extracted from a DuckDB instance.
2.  The `schema_mapping.py` script simulates the execution of the SQL query and maps the resulting data to IntelGraph entities. In a real implementation, this would involve connecting to a DuckDB database and executing the provided SQL.

## Sample Data

See `sample.sql` for an example of a SQL query.

## Schema Mapping

The `schema_mapping.py` file contains the logic for converting data retrieved from DuckDB into IntelGraph entities. This is a simplified mapping for demonstration purposes.

## Testing

Unit tests for this connector can be found in `connectors/__tests__/test_duckdb_connector.py`.
