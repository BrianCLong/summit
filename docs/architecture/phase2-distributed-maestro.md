
## Phase 2: Distributed Maestro & Execution Fabric

### Architecture
Maestro v2 splits into:
- **API Service**: Handles HTTP requests, stateless.
- **Scheduler**: Manages task lifecycle, retries, and SLA monitoring.
- **Runners**: Worker processes consuming from durable queues.

### Key Components
1.  **Task Queue**:
    -   `InMemoryTaskQueue` for dev/test.
    -   `PersistentTaskQueue` (interface defined) for prod.
2.  **Event Store**:
    -   Structured, append-only log of system events.
    -   Supports audit and replay.

### Scalability
-   Horizontally scalable API nodes.
-   Queue-based load balancing for workers.
