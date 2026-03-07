# Cross-Region Synchronization Contract

**Protocol Version:** 1.0
**Implementation:** `server/src/lib/state/cross-region-sync.ts` backed by `SnsMessageBroker`
**Transport:** AWS SNS (Fanout) -> AWS SQS (Buffering)

This document defines the **guarantees** and **limitations** of the cross-region state synchronization mechanism used in Summit.

## 1. Guarantees

### Ordering

- **No Global Ordering:** Messages are **NOT** guaranteed to arrive in the same order across all regions.
- **Resolution Strategy:** We rely strictly on **CRDTs (Conflict-Free Replicated Data Types)** which are commutative and associative. The order of merge operations does not affect the final state (`A + B = B + A`).

### Delivery Semantics

- **At-Least-Once Delivery:** AWS SNS+SQS guarantees messages will be delivered at least once.
- **Idempotency:** The `CrossRegionSyncService` and underlying CRDTs must handle duplicate messages safely.
  - _Evidence:_ `GCounter.merge` uses `Math.max` for counters, ensuring re-processing the same update does not double-count.
  - _Evidence:_ `LWWRegister` uses timestamps; receiving an old message again is a no-op if a newer timestamp exists.

### Convergence

- **Strong Eventual Consistency:** All regions that have received the same set of updates (in any order) will reach the exact same state.
- **Conflict Resolution:**
  - **Counters:** Max-value merge.
  - **Registers:** Last-Writer-Wins (LWW) based on client-generated timestamps.
  - **Sets:** Observed-Remove (OR-Set) logic with unique tag tracking.

## 2. Failure Modes & Handling

| Failure Mode | Impact | Handling Mechanism |
| ~~~~ | ~~~~ | ~~~~ |
| **SNS Delay / Outage** | Updates delayed to other regions. State diverges temporarily. | System continues to operate with local state. When SNS recovers, SQS queue processes backlog, and state converges. |
| **Partial Delivery** | Region A gets update, Region B fails to receive it. | Region B remains stale until network heals. No data corruption occurs. |
| **Split Brain** | Regions cut off from each other. | Both regions accept writes. State diverges. Upon reconnection, CRDT merge unifies the state seamlessly. |
| **Duplicate Message** | SQS delivers message twice. | CRDT `merge` operation is idempotent. No impact. |

## 3. Sequence Diagram (Normal Operation)

```ascii
[Region A (Primary)]        [AWS SNS Topic]          [Region B (Secondary)]
       |                           |                            |
   1. User Action                  |                            |
       |                           |                            |
   2. Update Local CRDT            |                            |
       |                           |                            |
   3. Sync() -> Publish()  ----->  |                            |
                                   |  (Fanout)                  |
                                   |------------------------->  | 4. SQS Queue
                                   |                            |
                                   |                            | 5. Poll Queue
                                   |                            |
                                   |                            | 6. Receive Message
                                   |                            |
                                   |                            | 7. Local CRDT.merge(RemoteState)
                                   |                            |
                                   |                            | 8. Emit 'merged' event
```

## 4. Dual-Write Safety

The system is safe under active-active write scenarios because:

1.  **Unique Node IDs:** Each `GCounter`/`ORSet` tracks updates per `nodeId` (Region ID).
2.  **No Central Authority:** There is no single "Master" for CRDT state. Any region can originate an update.
3.  **Merge Logic:** The merge logic preserves the "highest knowledge" from all nodes.

**Constraint:** Do NOT use this system for non-commutative operations (e.g., "Subtract 50 from bank balance" is unsafe; "Add -50" is safe only if order doesn't matter for business rules, but typical banking requires transactional constraints not provided here). This is for **Coordination State** (Session counts, Presence, Config flags), not **Transactional Data**.
