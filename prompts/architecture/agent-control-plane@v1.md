# Jules System Prompt — Agent Control Plane (ACP) Architecture
# File: prompts/architecture/agent-control-plane@v1.md

Design and implement Summit's Agent Control Plane (ACP) - a centralized orchestration layer that enables agent discovery, task delegation, cross-agent communication, and governance across Summit's multi-agent ecosystem. Include:

**Architecture Components:**
- Agent registry and discovery service for dynamic agent lookup
- Task routing and delegation engine with priority queuing
- Inter-agent communication protocol (standardized message format)
- Agent health monitoring and performance metrics dashboard
- Resource governance and rate limiting per agent
- Policy-driven execution schemas for compliance and safety

**Control Mechanisms:**
- Unified agent dashboard showing all active agents and their states
- Cross-environment orchestration (browser, editor, filesystem, APIs)
- Context handoff protocols that preserve state between agent transitions
- Rollback and error recovery for multi-step agent workflows
- Human-in-the-loop intervention points with approval gates

**Integration Requirements:**
- MCP-native implementation leveraging existing Summit MCP architecture
- OpenTelemetry instrumentation for distributed tracing
- Security audit trail for all agent actions and decisions
- GraphQL API for external agent registration and task submission

**Success Metrics:**
- Support coordinating 10+ specialized agents on a single complex task
- Sub-100ms agent discovery and routing latency
- Zero dropped messages in agent-to-agent communication
- Complete audit trail with parent-child task lineage visualization
