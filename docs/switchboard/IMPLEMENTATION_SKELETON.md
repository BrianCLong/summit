# Implementation Skeleton (v0.1)

## Suggested Folder Tree

```
packages/switchboard/
├── src/
│   ├── api/                  # API Layer (Express/Fastify)
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── schema/           # OpenAPI/Zod schemas
│   ├── core/                 # Core Logic
│   │   ├── registry/         # Server/Cap Registry
│   │   ├── router/           # Routing Logic
│   │   ├── policy/           # Policy Engine Client
│   │   ├── credentials/      # Credential Broker
│   │   └── ledger/           # Receipt/Audit Logging
│   ├── adapters/             # External Integrations
│   │   ├── db/               # PostgreSQL/Redis
│   │   ├── mcp/              # MCP Protocol Client
│   │   └── vault/            # Secrets Manager
│   ├── config/
│   ├── utils/
│   └── index.ts              # Entrypoint
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── package.json
```

## Key Interfaces (Stubbed)

```typescript
// src/core/registry/types.ts
export interface ServerRegistry {
  register(server: MCPServerConfig): Promise<ServerID>;
  get(id: ServerID): Promise<MCPServerConfig | null>;
  listCapabilities(tenantId: string): Promise<Capability[]>;
  updateHealth(id: ServerID, status: HealthStatus): Promise<void>;
}

// src/core/policy/types.ts
export interface PolicyEngine {
  evaluate(context: PolicyContext): Promise<PolicyDecision>;
}

export interface PolicyDecision {
  allowed: boolean;
  reasons: string[];
  obligations?: Record<string, any>;
}

// src/core/router/types.ts
export interface Router {
  route(request: ToolExecutionRequest): Promise<ToolExecutionResult>;
}

// src/core/ledger/types.ts
export interface ReceiptWriter {
  commit(receipt: ExecutionReceipt): Promise<string>; // returns receipt ID
}
```

## Module Stubs

### CapabilityMatcher
Logic to find the right server/tool for a vague request.
*   `findBestMatch(query: string): Capability`

### CredentialBroker
Mint/Retrieve credentials.
*   `getCredential(target: ServerID, scope: string): Promise<Token>`

### HealthManager
Background worker for health checks.
*   `checkAll(): Promise<void>`
*   `quarantine(id: ServerID): Promise<void>`

## Unit Test Layout

*   `tests/unit/core/registry.test.ts`: Test CRUD logic.
*   `tests/unit/core/policy.test.ts`: Test decision logic with mock OPA.
*   `tests/unit/core/router.test.ts`: Test routing flows (happy/sad paths).
*   `tests/integration/api.test.ts`: Test HTTP endpoints with Supertest.

## Adapters

*   **Database:** Use `Prisma` or `TypeORM` or raw `pg` for Registry.
*   **MCP Client:** Use `@modelcontextprotocol/sdk` to talk to downstream servers.
*   **Vault:** Adapter for HashiCorp Vault or AWS Secrets Manager.
