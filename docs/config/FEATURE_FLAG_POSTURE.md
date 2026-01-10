# Feature Flag Posture

## Philosophy
For GA, we value **Stability** and **Completeness**. Feature flags are used primarily to:
1.  Safely disable incomplete/experimental features (`agent.multiSwarm`).
2.  Allow legacy environment variable overrides for backward compatibility.
3.  Ensure all MVP requirements are enabled by default.

## Governance
*   **Owner**: Platform Engineering / Release Lead.
*   **Change Process**:
    *   Changing a GA-Frozen flag (`mvp1.*`) requires **CTO Approval** and a **Patch Release**.
    *   Adding a new flag requires an entry in `server/src/config/featureFlags.ts` and this document.

## Active Flags & Defaults

### Core System (Frozen: TRUE)
| Flag | Description | Code Default |
|------|-------------|--------------|
| `mvp1.authentication` | Core Auth Flow | `true` |
| `mvp1.authorizationRbac` | Role-Based Access Control | `true` |
| `mvp1.tenancyIsolation` | Multi-tenant Data Separation | `true` |
| `mvp1.auditLogging` | Compliance Logging | `true` |

### AI Agents (Frozen: TRUE)
| Flag | Description | Code Default |
|------|-------------|--------------|
| `agent.memory` | Agent Memory Systems | `true` |
| `agent.toolUse` | Tool Execution Capability | `true` |
| `agent.reflection` | Self-Correction Loops | `true` |

### Experimental (Frozen: FALSE)
| Flag | Description | Code Default |
|------|-------------|--------------|
| `agent.multiSwarm` | Coordinated Multi-Agent Swarms | `false` |
| `agent.autonomousDeployment` | Self-hosted deployment agents | `false` |

## Code Enforcement
The source of truth is `server/src/config/featureFlags.ts`.
The `FeatureFlags.loadFromEnv()` method explicitly defines these defaults.
Verification script: `scripts/config/verify_ga_defaults.ts`
