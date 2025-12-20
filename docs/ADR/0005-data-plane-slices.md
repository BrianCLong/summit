# ADR 0005: Use Logical Data-Plane Slices per Regulated Tenant Cohort

- **Context:** Regulated customers require stronger data isolation without duplicating every service stack on day-1.
- **Decision:** Partition Neo4j, Postgres, Redis, and Kafka via dedicated schemas, logical DBs, and topic namespaces per regulated cohort, with resource quotas enforced by the mesh.
- **SLO Impact:** Protects job success SLO (99%) by isolating heavy analytical workloads; failure or saturation in one slice cannot consume shared resources beyond defined quotas.
- **Failure Domain:** Each slice maps to its own autoscaling group and storage classes, allowing targeted failover/restore without affecting other tenants in the region.
- **Consequences:** Adds operational overhead for schema management and monitoring, but avoids the blast radius and cost of fully separate stacks.
