### Context

Source: `Autonomous Build Operator — Full Roadmap & Tuning Guide`
Excerpt/why: The scheduler is a critical component responsible for orchestrating tasks. As the system scales, it needs to handle high concurrency, prevent race conditions, and ensure efficient resource utilization. Robustness against transient failures is also crucial.

### Problem / Goal

The current scheduler may not be designed for high concurrency or fault tolerance. Without proper locking mechanisms, race conditions could lead to incorrect task assignments or duplicate executions. Lack of hedging can result in tasks getting stuck due to slow or unresponsive workers. The goal is to implement a robust scheduler that supports concurrent task dispatch, uses distributed locks to prevent conflicts, and employs hedging strategies to mitigate slow worker issues.

### Proposed Approach

- Implement a distributed locking mechanism (e.g., using Redis or ZooKeeper) to ensure that only one scheduler instance can dispatch a particular task at a time.
- Design the scheduler to handle concurrent task requests efficiently, potentially using a worker pool or asynchronous processing.
- Implement a hedging strategy where, if a task is not acknowledged by a worker within a certain timeout, a duplicate task is dispatched to another worker.
- Ensure that the scheduler can gracefully handle worker failures and re-queue tasks as necessary.

### Tasks

- [ ] Design the distributed locking mechanism for task dispatch.
- [ ] Implement the distributed lock in the scheduler.
- [ ] Implement the hedging strategy for slow task acknowledgments.
- [ ] Ensure the scheduler can re-queue tasks from failed workers.
- [ ] Add unit and integration tests for concurrency and locking.
- [ ] Add E2E tests for hedging scenarios.

### Acceptance Criteria

- Given multiple scheduler instances, when a task is dispatched, then it is only processed once.
- Given a worker is slow to acknowledge a task, then a duplicate task is dispatched to another worker within a defined timeout.
- The scheduler can handle 100 concurrent task dispatch requests with p99 latency < 500ms.
- Metrics/SLO: Scheduler dispatch latency p99 < 100ms; duplicate task rate < 0.1%.
- Tests: Concurrency tests, fault injection tests for worker failures.
- Observability: Metrics for scheduler queue size, dispatch rate, and hedging events.

### Safety & Policy

- Action class: WRITE (dispatches tasks)
- OPA rule(s) evaluated: N/A

### Dependencies

- Depends on: #<id_of_durable_store_issue>
- Blocks: High-scale autonomous operations.

### DOR / DOD

- DOR: Scheduler design for concurrency, locking, and hedging approved.
- DOD: Merged, concurrency tests passing, runbook updated with scheduler operational guidelines.

### Links

- Code: `<path/to/orchestrator/scheduler>`
- Docs: `<link/to/scheduler/design>`
