# Super Platform Infrastructure Architecture

## Layer Mapping

| Adidas layer | CDK concept | Terraform Cloud concept | Backstage concept |
|---|---|---|---|
| module | construct library | module registry | template skeleton |
| stack | stack | workspace/run plan | generated component |
| consumption config | App/stack instance | workspace vars | template input + catalog |

## 10 Summit Rules

1. **Registry Verification**: Every module must be registered. Enforcement: `registry.test.ts`.
2. **Semver Validation**: Artifacts must be versioned. Enforcement: `validate.ts`.
3. **Owner Validation**: Artifacts must define a valid team owner. Enforcement: `validate.ts`.
4. **Deny-by-default**: Unmatched configurations are denied. Enforcement: `deny-by-default.rego`.
5. **No local applies**: Execution must occur via CI. Enforcement: Agent Gateways / `deny-by-default.rego`.
6. **Required Checks**: Metadata generation must be complete. Enforcement: `scaffolder.test.ts`.
7. **Evidence Emitter**: Each rule execution emits evidence. Enforcement: `.github/scripts/evidence-emit.ts`.
8. **GraphRAG Entity Extraction**: Infra definitions must be mapped into the GraphRAG index. Enforcement: `evidence/index.json`.
9. **No Secret Logging**: Policies enforce zero logging of credentials. Enforcement: `policy-evaluator.js` (or related runner).
10. **Agent Guardrails**: AI agents propose; CI verifies and executes. Enforcement: Pipeline topology limits agents to Pull Requests.

_Based on Adidas InfoQ case study, AWS documentation on CDK, HashiCorp's Sentinel for TFC, and Backstage Software Templates._
