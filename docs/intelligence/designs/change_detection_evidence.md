# Change Detection Evidence Design

## Purpose

To treat "change in state" as a first-class evidence artifact, distinct from the content of the states themselves. This allows the system to alert on behavior (e.g., mass deletions, policy shifts) rather than just content.

## Definition

A `StateChange` is an immutable record of a transition between two observed states of an entity or resource.

## Required Metadata

```yaml
StateChange:
  id: "CHG-{timestamp}-{entity_id}"
  entity_id: "ENT-..."
  change_type:
    - "deletion"
    - "edit"
    - "availability_toggle"
    - "permission_change"
  pre_state_hash: "sha256"
  post_state_hash: "sha256" (or null if deletion)
  timestamp_detected: "iso8601"
  latency: "ms" (time between event and detection)
  trigger_event: "event_id" (optional, inferred cause)
```

## Inputs

- Periodic snapshots of monitored resources (URLs, Profiles, APIs).
- Stream of "Diff" events from collection agents.

## Outputs

- `StateChange` nodes in IntelGraph.
- Alerts triggered by velocity or volume of changes (e.g., "Burst Deletion Alert").

## Failure Cases

- **Noise:** High-frequency, irrelevant changes (e.g., dynamic ads, timestamps) triggering false positives. Requires `IgnoreMasks`.
- **Missed Transients:** Changes that happen and revert between poll intervals. Requires push-based or high-frequency polling for high-value targets.
