# Agent Risk Scoring Model

**Owner:** Security Operations
**Status:** DRAFT

## 1. Overview

The **Risk Scoring Model** assigns a numerical value (0-100) to every agent execution context. This score determines the scrutiny level, approval requirements, and runtime sandboxing applied to the agent.

Unlike static code analysis, this score is dynamic—calculated based on the _intent_ and _capabilities_ requested by the agent for a specific run.

---

## 2. Risk Factors & Calculation

The Total Risk Score ($R_{total}$) is a summation of weighted factors, clamped at 100.

$$ R\_{total} = \min(100, \sum (Factor \times Weight)) $$

### A. Surface Area (Files & Directories)

Agents declaring intent to modify specific paths incur risk points.

| Directory / Pattern      | Risk Points | Rationale                                   |
| :----------------------- | :---------- | :------------------------------------------ |
| `docs/**`                | 1           | Documentation is low risk.                  |
| `apps/web/**`            | 5           | Frontend code changes.                      |
| `server/src/services/**` | 15          | Business logic modification.                |
| `server/src/auth/**`     | **40**      | Authentication bypass risk.                 |
| `policy/**`              | **50**      | Changing the rules of the system (OPA).     |
| `.github/workflows/**`   | **60**      | CI/CD pipeline modification (Supply Chain). |
| `security/**`            | **80**      | Core security controls.                     |

### B. Permissions & Capabilities

| Capability       | Risk Points | Rationale                       |
| :--------------- | :---------- | :------------------------------ |
| `READ_ONLY`      | 0           | Passive observation.            |
| `FILE_WRITE`     | 10          | Standard code editing.          |
| `SHELL_EXEC`     | 30          | Arbitrary command execution.    |
| `NETWORK_EGRESS` | 20          | Data exfiltration risk.         |
| `DB_WRITE`       | 25          | Database mutation.              |
| `SECRET_READ`    | **50**      | Access to API keys/credentials. |

### C. Scope & Tenancy

| Scope                        | Multiplier |
| :--------------------------- | :--------- |
| Single Tenant (Self)         | 1.0x       |
| Multi-Tenant (Specific List) | 1.5x       |
| **Global / All Tenants**     | **3.0x**   |

---

## 3. Risk Thresholds & Actions

Scores map to operational zones that trigger specific enforcement actions in CI/CD and Runtime.

| Score Range  | Level        | Required Actions                                                                                                     |
| :----------- | :----------- | :------------------------------------------------------------------------------------------------------------------- |
| **0 - 19**   | **Low**      | **Log Only.** Standard telemetry. Auto-approve.                                                                      |
| **20 - 49**  | **Medium**   | **Standard Review.** Requires 1 human review on PR. Runtime sandbox standard.                                        |
| **50 - 79**  | **High**     | **Enhanced Audit.** Requires Senior approval. Full session recording enabled. Shadow-mode execution (if applicable). |
| **80 - 100** | **Critical** | **Lockdown.** Requires Security Officer approval. MFA challenge for deployment. Isolated runtime environment.        |

---

## 4. CI/CD Integration (Pre-Flight Check)

Before an agent is allowed to run, the `risk-calculator` action evaluates the manifest.

### Pseudo-code Implementation

```typescript
function calculateRisk(manifest: AgentManifest, diff: FileDiff): RiskResult {
  let score = 0;

  // 1. Check touched files
  for (const file of diff.files) {
    if (file.path.startsWith("server/src/auth")) score += 40;
    if (file.path.startsWith(".github")) score += 60;
    // ...
  }

  // 2. Check capabilities
  if (manifest.capabilities.includes("SHELL_EXEC")) score += 30;

  // 3. Apply Multipliers
  if (manifest.scope === "GLOBAL") score *= 3.0;

  return {
    score: Math.min(100, score),
    level: getLevel(score),
    block: score >= 80 && !manifest.approvals.has("SECURITY_OFFICER"),
  };
}
```

### Blocking Logic

- **Risk Score > 80:** The CI job fails immediately with `RISK_THRESHOLD_EXCEEDED` unless a cryptographically signed approval token from the Security team is present in the run context.
- **Risk Score Increase:** If an agent's code changes causes its derived risk score to jump by >20 points compared to the previous version, manual re-approval is triggered.
