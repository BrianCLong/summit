# Observability First Metric Catalogue

This catalogue defines the canonical metric names exposed by the Observability First SDKs. Every service adopts the same prefixes so that Grafana dashboards and SLO burn-rate alerts work out of the box.

| Domain      | Metric                                  | Type                                                       | Unit     | Description                                                                  |
| ----------- | --------------------------------------- | ---------------------------------------------------------- | -------- | ---------------------------------------------------------------------------- |
| http.server | `http_server_request_duration_seconds`  | Histogram (bucketed via `[0.05, 0.1, 0.25, 0.5, 1, 2, 5]`) | seconds  | End-to-end API latency including middleware.                                 |
| http.server | `http_server_request_total`             | Counter                                                    | requests | Total count of HTTP requests partitioned by `method`, `route`, `status`.     |
| http.server | `http_server_error_ratio`               | Gauge                                                      | percent  | Derived ratio of error responses (`status >= 500`).                          |
| worker      | `worker_job_duration_seconds`           | Histogram                                                  | seconds  | Background job execution time partitioned by `queue`, `job`.                 |
| worker      | `worker_job_failures_total`             | Counter                                                    | jobs     | Total failed jobs.                                                           |
| db          | `db_client_query_duration_seconds`      | Histogram                                                  | seconds  | Time spent executing SQL/NoSQL queries (labels: `operation`, `collection`).  |
| db          | `db_client_connection_pool_utilization` | Gauge                                                      | percent  | Saturation of database connection pool capacity.                             |
| infra       | `runtime_cpu_seconds_total`             | Counter                                                    | seconds  | CPU usage per service process.                                               |
| infra       | `runtime_memory_working_set_bytes`      | Gauge                                                      | bytes    | Memory working set for the process.                                          |
| infra       | `otel_exporter_queue_length`            | Gauge                                                      | spans    | Pending spans waiting to flush; ensures sampling and batch sizing are tuned. |

## Naming Rules

- All metrics use snake_case with a domain prefix (`http`, `worker`, `db`, `infra`).
- Labels follow `snake_case` and avoid high-cardinality request IDs. Use `route_template` instead of raw URLs.
- SDKs automatically emit service-level `service_name`, `service_namespace`, and `deployment_environment` resource attributes.
