# RFC: Agentic CI + Policy-as-Code Integration (Summit/Maestro)

## Status
**Proposed**

## Author
Perplexity (synthesized for Brian Long)

## Date
2026-02-08

## Readiness Assertion
This RFC asserts alignment with the Summit Readiness Assertion and is scoped for GA-ready adoption without introducing new frameworks or external orchestration dependencies. See `docs/SUMMIT_READINESS_ASSERTION.md` for readiness baselines.

## Summary
Introduce a TypeScript-first DSL (`AgentWorkflow`) that compiles high-level agent graphs into GitHub-native artifacts (Actions YAML + policy summaries) while enforcing safe outputs, auditability, and governance guardrails for IC/defense use cases.

## Assumptions
1. **TS-first DSL** for Summit’s stack, with no new frameworks.
2. **GA readiness** with minimal dependencies; prefer existing runtime primitives.
3. **IC/defense posture**: auditable outputs, safe defaults, evidence-first artifacts.

## Goals
- Compile agent graphs to **GitHub Actions YAML + PaC** (no vendor lock-in).
- Enforce **safe outputs**: read-only defaults, explicit permissions, auditable logs.
- Provide **TS-native** developer ergonomics with type-safe DSLs.
- Measure **token cost, coverage burn-down, remediation SLAs** (e.g., high vulns <7 days).

## Non-Goals
- Full-fledged agent frameworks (adapt later through runtimes).
- Runtime-specific UI or orchestration beyond Summit/Maestro’s existing control plane.

## Proposed DSL (TypeScript)
```typescript
// summit/agentic.ts – Core DSL
interface SafeOutputs {
  createIssue?: { titlePrefix: string };
  createPR?: { baseBranch: string; autoMerge?: false };
  commentPR?: boolean;
}

interface AgentWorkflow {
  on: GitHubTrigger[]; // push, pr, schedule, issue
  permissions: {
    contents: 'read' | 'write';
    securityEvents: 'read';
  }; // Explicit
  safeOutputs: SafeOutputs;
  agents: SmallAgent[]; // Fleet of 1-chore agents
}

interface SmallAgent {
  name: string;
  prompt: string; // Natural lang intent
  tools: string[]; // e.g., ['codeQL', 'osintGraphQuery']
  level?: 'critical' | 'high' | 'error' | 'warn'; // PaC integration
}

export function defineWorkflow(def: AgentWorkflow): CompiledAction {
  // Compile to Actions YAML + PaC policy
  return compileToGitHubAction(def);
}
```

## Usage Example (Doc Drift + Vulnerability Policy Check)
```typescript
// workflows/doc-vuln-check.ts – Your repo file
const docDriftWorkflow: AgentWorkflow = {
  on: ['pull_request', 'schedule: daily'],
  permissions: { contents: 'read', securityEvents: 'read' },
  safeOutputs: { createPR: { baseBranch: 'main' } },
  agents: [
    {
      name: 'docChecker',
      prompt: 'Compare docstrings vs impl; explain mismatches; propose fix.',
      tools: ['readCode', 'readDocs'],
    },
    {
      name: 'policyChecker',
      prompt: 'Summarize GHAS alerts vs org policy; flag high vulns >7d old.',
      tools: ['ghasAPI', 'policyEval'],
      level: 'high',
    },
  ],
};

export default defineWorkflow(docDriftWorkflow);
```

## Compile CLI (Maestro Integration)
```
 npx maestro compile workflows/ --output .github/workflows/agentic.yml
 # Outputs GitHub Actions YAML + embedded PaC policy
```

## Generated Artifacts (Example Snippets)
**GitHub Actions YAML**
```yaml
# .github/workflows/agentic.yml (auto-generated)
name: Summit Agentic CI
on: [pull_request, schedule: '0 9 * * *']
permissions:
  contents: read
  security-events: read
  pull-requests: write
jobs:
  summit-agents:
    runs-on: ubuntu-latest
    steps:
      - uses: summit/actions/policy-as-code@v2
        with:
          policy: ${{ github.workspace }}/.summit-policy.yml
      - name: Run Doc Drift Agent
        uses: summit/actions/agent@v1
        with:
          workflow: ${{ toJson(docDriftWorkflow) }}
          outputs: pr-comment
```

**Embedded PaC Policy**
```yaml
codescanning:
  conditions:
    ids: ['js/sql-injection']
  remediate:
    high: 7
secretscanning:
  level: critical
```

## Integration Plan (Four-Week Cut)
1. **Week 1: DSL + Compiler**
   - Implement `AgentWorkflow` types and `compileToGitHubAction()`.
   - Vendor or inline policy-as-code artifacts with provenance.
   - Test: compile sample → push to test repo → verify runs.
2. **Week 2: Maestro Runtime**
   - Execute workflows in Summit with GraphQL tool adapters.
   - Enforce safe outputs, log all invocations, OPA-gated policies.
   - UI: workflow graph view + token dashboard.
3. **Week 3: GitHub Actions Layer**
   - Publish `@summit/actions/agent` for runtime execution.
   - Defaults: runner group, OIDC auth, signed SBOM.
4. **Week 4: GA Polish**
   - Examples: doc drift, OSINT graph hygiene, vuln SLA reports.
   - Metrics: PR throughput, token/$, coverage burn-down.
   - Documentation: `examples/workflows/` aligned with GitHub Next patterns.

## Risks & Mitigations
| Risk | Mitigation |
| --- | --- |
| Token cost explosion | Per-agent budgets + deterministic fallbacks. |
| False positives | Human-in-loop PR review + tunable `level`. |
| GHES compatibility | Test on 3.9+ with GraphQL fallbacks. |
| Audit gaps | Explicit YAML, signed workflows, evidence logs. |

## Governance & Compliance Alignment
- **Policy-as-Code**: All compliance logic is expressed as policy artifacts.
- **Evidence-First**: Compile-time and runtime evidence bundles are mandatory.
- **Safe Outputs**: Default read-only permissions with explicit escalation.

## MAESTRO Security Alignment
- **MAESTRO Layers**: Foundation, Agents, Tools, Infra, Observability, Security.
- **Threats Considered**: Prompt injection, tool abuse, unsafe permissions, nondeterminism.
- **Mitigations**: Read-only defaults, explicit permissions, deterministic runs, signed artifacts, audit logs.

## Decision
Proceed to PR scaffold with DSL + compiler and evidence-first integration artifacts.
