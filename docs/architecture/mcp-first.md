# MCP-First Architecture Strategy

## Vision

Summit is transitioning to a **Model Context Protocol (MCP) First** architecture. This means that instead of building bespoke API connectors and static prompt contexts, Summit will interact with external tools, data sources, and internal subsystems primarily through standard MCP interfaces.

By treating "Context" as a first-class citizen served via standard protocols, we achieve:
1.  **Portability**: Agents defined in Summit can move between environments (Dev, CI, Prod) without code changes, only configuration updates.
2.  **Security**: Tool execution is sandboxed and governed by explicit permissions defined at the MCP layer.
3.  **Extensibility**: New capabilities (e.g., a new CRM or Threat Feed) can be added by registering an MCP server, without rebuilding the core platform.

## Core Components

### 1. Summit MCP Host
The core Summit Server (`server/`) will act as an **MCP Host**. It will maintain persistent connections to registered MCP Servers.
- **Responsibility**: Discover tools, route agent tool calls to the correct server, and manage the context window.
- **Implementation**: We will leverage the `mcp-sdk` (TypeScript) within the Node.js backend.

### 2. MCP Registry
A configuration-driven registry that defines which MCP servers are available to which tenants/agents.
- **Location**: `config/mcp-servers.yaml` (see `config/mcp-servers.example.yaml`).
- **Schema**: Defines server URLs, transport types (Stdio/SSE), and required capabilities.

### 3. Context Manager
A new service module (`server/src/services/ContextManager.ts`) responsible for:
- Aggregating "Resource" context from MCP servers.
- Injecting "Prompt" blueprints from MCP servers.
- ensuring deterministic context ordering for auditability.

## Summit MCP Capability Map

We classify capabilities into **Internal** (Summit exposes these via its own MCP Server) and **External** (Summit consumes these from other MCP Servers).

### Internal Capabilities (Summit as MCP Server)
These allow *other* agents (e.g., local developer IDE agents, CI bots) to interact with Summit.

| Capability | Resource URI | Description |
| :--- | :--- | :--- |
| **Graph Query** | `summit://graph/query` | Execute Cypher queries against the Knowledge Graph (governed). |
| **Evidence** | `summit://evidence/{id}` | Retrieve or append to an evidence bundle. |
| **Governance** | `summit://governance/policy/{id}` | Fetch active policy definitions. |
| **Risk** | `summit://risk/assessment` | Trigger or read a risk assessment. |

### External Capabilities (Summit as MCP Host)
Summit connects to these servers to empower its internal agents.

| Capability | Provider | MCP Server Type | Use Case |
| :--- | :--- | :--- | :--- |
| **Code Access** | GitHub / GitLab | `stdio` / `sse` | Reading repo content for architectural review. |
| **Issue Tracking** | Linear / Jira | `sse` | Syncing project state and roadmap items. |
| **Communication** | Slack / Discord | `sse` | Sending alerts and reading Ops channels. |
| **OSINT** | Internal OSINT Service | `stdio` | Fetching WHOIS, DNS, and Wikipedia data (replacing bespoke fetchers). |
| **Filesystem** | Local FS (Sandbox) | `stdio` | Safe file manipulation for evidence generation. |

## Transition Plan

### Phase 1: Hybrid (Current -> Q1)
- Deploy `MockLLM` and `OSINTService` via an internal MCP adapter.
- Replace direct Wikipedia fetch in `OSINTService` with a call to a generic "Web Content" MCP tool.

### Phase 2: Standardization (Q2)
- Formalize `config/mcp-servers.yaml`.
- Implement `ContextManager` to replace large prompt templates.
- Migrate `server/src/connectors/` to standalone MCP servers.

### Phase 3: Federation (Q3)
- Full distributed mesh where Summit agents can discover tools dynamically based on the `mcp-registry`.
