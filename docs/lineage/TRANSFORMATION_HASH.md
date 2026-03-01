# Transformation Hash Schema

## Goals
* Stable across runtimes.
* Insensitive to whitespace, formatting, and non-semantic noise.
* Sensitive to: **inputs/outputs**, **operation kind**, **normalized transformation logic**, and **semantic context**.

## Canonical Object (v1)

Compute `transformation_hash = sha256(canonical_json_bytes)` where `canonical_json_bytes` is:

* JSON with **sorted keys**
* UTF-8
* No insignificant whitespace
* Arrays in defined order (defined below)

### Canonical Object Schema

```json
{
  "schema": "summit.lineage.transformation.v1",
  "kind": "sql|dbt_model|py_udf|spark_job|api_etl|unknown",
  "engine": {
    "name": "dbt|spark|duckdb|postgres|snowflake|bigquery|py|unknown",
    "version": "string-or-unknown"
  },
  "subject": {
    "job_namespace": "string",
    "job_name": "string"
  },
  "inputs": [
    {"namespace": "string", "name": "string", "facets": {"schema_fingerprint": "sha256:..." }}
  ],
  "outputs": [
    {"namespace": "string", "name": "string", "facets": {"schema_fingerprint": "sha256:..." }}
  ],
  "logic": {
    "representation": "sql_ast|sql_text|dbt_compiled_sql|py_source|bytecode_hash|unknown",
    "normalized": "string",
    "parameters": [
      {"k": "string", "v": "string"}
    ]
  },
  "semantics": {
    "db_namespace": "string-or-empty",
    "db_system": "string-or-empty",
    "otel_semconv_version": "string-or-empty",
    "openlineage_producer": "string-or-empty"
  }
}
```

## Ordering Rules

* `inputs` MUST be sorted by `(namespace, name)`
* `outputs` MUST be sorted by `(namespace, name)`
* `parameters` MUST be sorted by `k`

## Normalization Rules (v1)

### SQL (recommended)

* Normalize to a stable AST form if you already have a parser in the runtime.
  * **Note:** Do **not** add a parser solely for hashing (matches OTEL guidance not to parse statements just to extract attributes).
* If AST isn’t available, use **sql_text normalization**:
  * Trim all leading/trailing whitespace.
  * Collapse whitespace.
  * Uppercase keywords (optional, but if done, MUST be done deterministically).
  * Remove comments.
  * Normalize parameter placeholders (e.g., all `?` → `:p`).
  * Enforce stable ordering of CTE declarations if your compiler already provides it; otherwise don’t.

### dbt

* Prefer `dbt_compiled_sql` if available.
* Include `model.unique_id` and `project_name` (as `subject.job_name` or a facet).

### Py

* Prefer `sha256(normalized_source)` if source is present.
* If not, use `bytecode_hash` or a stable function signature + dependency digest.

## `schema_fingerprint`

Compute dataset schema fingerprint as:

`sha256( canonical_json( sorted_columns ) )` where each column entry is:

```json
{"name":"col","type":"TYPE","nullable":true,"ordinal":1}
```

Columns MUST be sorted by `name` before JSON encoding.
This allows deterministic detection of "same name but different schema".
