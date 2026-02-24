# Configuration Schema

**Status**: v0.1 (Draft)
**Owner**: Jules
**Audience**: DevOps, SRE

## 1. Overview

The `switchboard.yaml` file is the central nervous system of Summit Switchboard. It defines **Tenants**, **Registries** (MCP Servers), **Policies**, and **Runtime Behavior**.

## 2. Schema Structure

The configuration is strictly typed and validated on startup.

### 2.1 Root Object

```yaml
version: "v0.1"

# Global defaults
defaults:
  timeout_ms: 30000
  max_retries: 3

# Identity Providers
credential_providers:
  - name: "aws-secrets-manager"
    type: "aws"
    region: "us-west-2"

# Policy Engines
policy_engines:
  - name: "default-opa"
    type: "opa"
    url: "http://localhost:8181/v1/data/summit/allow"

# Tool Registries (MCP Servers)
registries:
  - name: "brave-search"
    url: "http://localhost:8080/sse"
    type: "sse"
    capabilities: ["search:internet"]
  - name: "local-fs"
    command: ["npx", "-y", "@modelcontextprotocol/server-filesystem", "/home/user/workspace"]
    type: "stdio"

# Tenant Definitions
tenants:
  - id: "tenant-a"
    tier: "standard"
    policy_engine: "default-opa"
    allowed_registries: ["brave-search"]
```

## 3. Detailed Sections

### 3.1 Registries (MCP Servers)
Defines how to connect to MCP servers.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | string | Yes | Unique identifier for the server. |
| `type` | enum | Yes | `sse` (Server-Sent Events) or `stdio` (Process). |
| `url` | string | No | Required if type is `sse`. |
| `command` | list | No | Required if type is `stdio`. |
| `env` | map | No | Environment variables for `stdio` processes. |

### 3.2 Tenants
Defines isolation boundaries.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | string | Yes | Tenant ID. |
| `tier` | string | Yes | Used for policy decisions (e.g., rate limits). |
| `config_overrides` | map | No | Override global defaults (e.g., shorter timeouts). |

## 4. Examples

### 4.1 Single-Tenant Dev Setup

```yaml
version: "v0.1"
registries:
  - name: "local-tools"
    type: "stdio"
    command: ["python", "server.py"]

tenants:
  - id: "dev"
    tier: "unlimited"
    allowed_registries: ["*"]
```

### 4.2 Multi-Tenant Production Setup

```yaml
version: "v0.1"
defaults:
  timeout_ms: 5000

policy_engines:
  - name: "corp-policy"
    type: "opa"
    bundle_path: "/etc/switchboard/policy.tar.gz"

registries:
  - name: "brave"
    url: "http://brave-mcp:8080"
    type: "sse"
  - name: "internal-db"
    url: "http://db-mcp:8080"
    type: "sse"

tenants:
  - id: "research-team"
    tier: "high"
    allowed_registries: ["brave", "internal-db"]
  - id: "guest-user"
    tier: "low"
    allowed_registries: ["brave"]
```

## 5. Validation Rules

*   **Uniqueness**: Registry names and Tenant IDs must be unique.
*   **References**: `allowed_registries` must refer to defined registries.
*   **Sanity**: `timeout_ms` must be > 0.

## 6. Versioning

*   **Config Version**: The `version` field (e.g., `v0.1`) dictates the schema parser used.
*   **Breaking Changes**: Will increment the version (e.g., `v0.2`). Switchboard supports the current and previous version (N-1 compatibility).
