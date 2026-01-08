# Streaming Platform Offset & Retry Semantics

## Guarantees

The Summit Streaming Platform guarantees **At-Least-Once** delivery.

## Offset Commitment Strategy

- **Auto-Commit:** Disabled (or handled carefully by framework).
- **Manual Commit:** Offsets are committed **only after** successful processing of the message.
- **Batch Processing:** If using batching, offsets are committed for the highest successfully processed offset in the batch, or per-message if processing sequentially.
- **Failure Scenario:** If a handler throws an error and it is NOT caught/DLQ'd, the offset is **not committed**. The consumer will eventually re-process the message (after session timeout or restart).

## Retry Policy

1.  **Transient Errors:** The consumer will retry processing indefinitely (or up to a configured limit) for network glitches or temporary service unavailability, causing partition blocking.
2.  **Blocking:** To preserve order, retries block the partition.
3.  **Dead Letter Queue (DLQ):**
    - Poison pill messages (schema errors, permanent validation failures) are sent to the DLQ.
    - Upon successful enqueue to DLQ, the original message is marked as "processed" (offset committed) to unblock the partition.
    - If DLQ enqueue fails, the consumer **crashes** (throws) to prevent data loss.

## Dead Letter Queue

- **Topic Naming:** `{original-topic}.dlq`
- **Payload:** Wraps original message with error metadata:
  ```json
  {
    "originalTopic": "...",
    "originalPartition": 0,
    "originalValue": "<base64>",
    "error": "Error message",
    "timestamp": "ISO-8601"
  }
  ```
- **Recovery:** Manual inspection and replay from DLQ is required.

## Schema Evolution

- **Compatibility:** BACKWARD compatibility is enforced.
- **Producers:** Must use schemas registered in the Glue Registry.
- **Consumers:** Must be able to read newer schemas if backward compatible (Avro/Protobuf rules apply).
