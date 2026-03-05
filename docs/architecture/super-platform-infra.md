# Super-Platform Infrastructure Architecture

Summit achieves a "super-platform" capability by unifying successful patterns from Adidas, AWS CDK, HashiCorp Terraform Cloud, and Backstage.

## Inspiration and Mappings

1. **Adidas Decentralized Delivery:** Domain teams own deploying their own infrastructure. They use a shared platform CLI and CI checks to enforce governance. ([InfoQ](https://www.infoq.com/news/2026/03/adidas-decentralized-platform/))
2. **AWS CDK Composition:** Reusable “constructs” encapsulate best practices and abstract complex cloud provisioning. A stack is the deployment unit.
3. **Terraform Cloud Policy:** Centralized policy enforcement (Sentinel/OPA) applied directly to runs, ensuring guardrails and deny-by-default behavior before execution.
4. **Backstage Scaffolding:** Software templates define the "golden path", ensuring consistent repositories and metadata.

## Summit Layering

- **Layer 0 (Developer Portal/Scaffolder):** Generates Summit components with required metadata (Backstage analog).
- **Layer 1 (Infra Registry):** Manages modules, stacks, and consumption configs with ownership and semver (Adidas/CDK analog).
- **Layer 2 (Policy Execution):** Evaluates infrastructure plans against OPA policies in CI. Default deny (TFC analog).
- **Layer 3 (GraphRAG Governance):** Infrastructure components become Knowledge Graph entities for reasoning and blast-radius analysis.
- **Layer 4 (Agent Gateway):** Agents propose infrastructure diffs via PRs. CI handles execution. Least-privilege boundary.
