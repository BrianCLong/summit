# GraphQL 5xx Handling

1. Check Grafana dashboard for error spikes.
2. If DB connection error, restart Postgres pool.
3. If memory issue, check node OOM killer logs.
