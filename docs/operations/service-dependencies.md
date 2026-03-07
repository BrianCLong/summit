# Service Dependency Graph (v1 skeleton)

- `gateway` depends on `summit-core`, `companyos`
- `summit-core` depends on `companyos`, `switchboard`, `maestro`, `intelgraph-db`
- `switchboard` depends on `companyos`, `intelgraph-db`
- `maestro` depends on `companyos`, `intelgraph-db`
- `companyos` depends on `intelgraph-db`
