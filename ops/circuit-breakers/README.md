# Circuit Breakers

This directory controls the operational safety of the Summit Agent Swarm.

## Mechanisms

### 1. PAUSE

- **Trigger**: Presence of a file named `PAUSE` in this directory (content ignored).
- **Effect**: Halts all agent activities immediately. No new tasks claimed, no transitions allowed.
- **Recovery**: Rename/Delete the file.

### 2. FREEZE_MERGE

- **Trigger**: Presence of a file named `FREEZE_MERGE` or Blackboard state `circuit_breakers.freeze_merge = true`.
- **Effect**: Agents can work and review, but the Merge Supervisor will NOT merge any PRs.
- **Use Case**: During critical release windows or instability investigations.

### 3. SAFE_MODE

- **Trigger**: Blackboard state `sprint.mode = "safe_mode"`.
- **Effect**: Restricts execution to Tier 0 (Foundational) and Tier 1 (Strategic) agents only. Experimental agents are blocked.

### 4. BREAK_GLASS

- **Trigger**: Human-signed override (PGP signature required in `ops/break-glass/`).
- **Effect**: Bypasses governance gates for emergency fixes.
- **Audit**: Logs every action to `audit.log` with high priority.

## Files

- `PAUSE.disabled`: Rename to `PAUSE` to activate.
