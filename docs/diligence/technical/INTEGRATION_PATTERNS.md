# Isolation-First Integration Patterns

**Objective**: Integrate safely by default.

We prefer loose coupling. Direct database integration or shared memory is strictly prohibited for initial integration.

## 1. Pattern Hierarchy (Preferred to Least Preferred)

### Pattern 1: Sidecar (Read-Only)

- **Description**: The acquired system runs alongside Summit services but interacts only via read-only APIs or data replicas.
- **Use Case**: Analytics, Visualization, standalone tools.
- **Safety**: High. Zero risk of corrupting Summit state.
- **Cost**: Low.

### Pattern 2: Event Bridge (No Mutation)

- **Description**: The system subscribes to Summit events (e.g., "UserCreated") to trigger its own local actions, but does not write back to Summit.
- **Use Case**: Notification systems, compliance logging, external sync.
- **Safety**: High. One-way data flow.
- **Cost**: Medium.

### Pattern 3: Adapter with Caps (Controlled Mutation)

- **Description**: A strict anti-corruption layer (ACL) sits between Summit and the system. The Adapter enforces rate limits, schema validation, and "Caps" (maximum impact limits).
- **Use Case**: Two-way workflow integration, enrichment services.
- **Safety**: Medium. Relies on the quality of the Adapter.
- **Cost**: Medium-High.

### Pattern 4: Full Merge (Gated)

- **Description**: Code is refactored and merged directly into the Summit monorepo and service mesh.
- **Use Case**: Core feature acquisition intended to replace internal components.
- **Safety**: Low (until fully tested).
- **Cost**: High.
- **Constraint**: **Requires CTO approval.** Cannot be the Day-0 strategy.

## 2. Binding Patterns to Controls

| Pattern          | Budget Impact | Kill-Switch       | Required Monitoring          |
| :--------------- | :------------ | :---------------- | :--------------------------- |
| **Sidecar**      | Hosting only  | DNS Cutover       | Uptime, Error Rate           |
| **Event Bridge** | Queue depth   | Consumer Stop     | Lag, DLQ Size                |
| **Adapter**      | Dev + Hosting | API Gateway Block | Latency, Validation Failures |
| **Full Merge**   | Maintenance   | Feature Flag      | Full APM + Profiling         |

## 3. Implementation Rules

- **Rule 1**: Default to **Sidecar** or **Event Bridge**.
- **Rule 2**: Never allow direct database access (Shared Database Anti-Pattern).
- **Rule 3**: All integrations must have a **Kill-Switch** (Feature Flag or Network Policy) to sever the connection instantly.
- **Rule 4**: CI checks must block "Full Merge" attempts (e.g., direct imports of foreign code) without `CODEOWNERS` approval.
