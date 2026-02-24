# Capability Model

**Status**: v0.1 (Draft)
**Owner**: Jules
**Audience**: Integration Engineers, Policy Authors

## 1. Overview

The **Capability Model** defines the "language of action" within Summit Switchboard. It decouples the *intent* of an agent (e.g., "I need to search the web") from the *implementation* provided by an MCP server (e.g., "Brave Search", "Google Search", or a mock).

This model ensures:
1.  ** Deterministic matching**: Given a task context, the same tool is always selected.
2.  ** Policy enforcement**: Capabilities can be vetoed based on their declared properties (e.g., "No external network access").
3.  ** Lazy expansion**: High-volume toolsets (like AWS CLI) are not loaded into the context window until explicitly requested.

## 2. Taxonomy

A capability is defined by three dimensions: **Verbs**, **Resources**, and **Constraints**.

### 2.1 Verbs (Action Primitives)
Standardized actions that agents can request.

*   `search`: Query an index for information.
*   `read`: Retrieve content from a URI.
*   `write`: Modify or create a resource.
*   `execute`: Run a computation or script.
*   `reason`: Delegate a cognitive task to a sub-agent.
*   `notify`: Send a signal to a human or system.

### 2.2 Resources (Target Domains)
The domain or system the verb acts upon.

*   `internet`: Public web.
*   `codebase`: The local repository.
*   `knowledge_graph`: The Summit graph store.
*   `aws`: Cloud infrastructure.
*   `slack`: Communication channels.
*   `fs`: Local filesystem.

### 2.3 Constraints (Policy Tags)
Tags that limit the scope or risk of the capability.

*   `readonly`: No side effects.
*   `human_in_the_loop`: Requires approval.
*   `pii_safe`: Guaranteed not to return PII (or handles redaction).
*   `rate_limited`: Subject to quota.

## 3. Advertising Capabilities (MCP Servers)

MCP servers advertise their capabilities in their manifest or during the `initialize` handshake. Switchboard extends the standard MCP capabilities with a structured `x-summit-capabilities` block.

**Schema:**

```json
{
  "name": "brave-search",
  "version": "1.0.0",
  "capabilities": {
    "tools": {
      "search_web": {
        "description": "Search the public internet via Brave.",
        "x-summit-capabilities": [
          {
            "verb": "search",
            "resource": "internet",
            "constraints": ["readonly"]
          }
        ]
      }
    }
  }
}
```

## 4. Declaring Requirements (Tasks)

When a task is started, it declares the *minimum* capabilities required. This prevents "over-privileged" agents.

**Task Context:**

```yaml
task_id: "investigate-domain-spoofing"
required_capabilities:
  - verb: "search"
    resource: "internet"
  - verb: "read"
    resource: "codebase"
    constraints: ["readonly"]
```

## 5. Matching Algorithm

The matching process is **deterministic**.

1.  **Filter**: Select all registered MCP servers that match the `verb` and `resource`.
2.  **Prune**: Remove servers that do not satisfy the required `constraints`.
3.  **Policy Check**: Run the OPA policy against the candidate list.
    *   *Input*: `user_tier`, `tenant_policy`, `candidate_tools`.
    *   *Output*: `allowed_tools`.
4.  **Rank**: Sort candidates by priority score (defined in tenant config).
    *   e.g., `Local Knowledge > Paid API > Free API`.
5.  **Select**: Pick the top-ranked tool.

**Tie-Breaking**: If scores are equal, sort alphabetically by server name to ensure reproducibility.

## 6. Lazy Tool Expansion

To save context tokens and reduce cognitive load, Switchboard supports **Lazy Expansion**.

### 6.1 Rules

*   **Eager Load**: Tools marked as `essential` in the task definition are always loaded.
*   **Lazy Load**: Tools marked as `on_demand` are represented by a single "stub" tool (e.g., `aws_helper`).
*   **Expansion Trigger**: When the agent calls the stub (e.g., `aws_helper.list_services()`), Switchboard:
    1.  Pauses execution.
    2.  Loads the specific tool definitions for that service (e.g., `s3_list_buckets`).
    3.  Updates the context.
    4.  Resumes execution.

### 6.2 Refusal

Switchboard will **refuse** expansion if:
*   The expanded toolset exceeds the token budget.
*   The requested expansion violates a runtime policy (e.g., "No S3 write access allowed during business hours").

## 7. Edge Cases

### 7.1 Conflicting Capabilities
*   *Scenario*: Two servers offer `search:internet`.
*   *Resolution*: Use the **Ranking** step in the matching algorithm. Tenant config defines the preference order.

### 7.2 Partial Matches
*   *Scenario*: Task asks for `search:internet` + `pii_safe`, but only `search:internet` is available.
*   *Resolution*: **Fail Closed**. The task cannot proceed safely.

### 7.3 Health Veto
*   *Scenario*: The primary server (Rank 1) is unhealthy.
*   *Resolution*: Automatically fall back to Rank 2. If no healthy candidates exist, fail the capability request.
