# Ultra-Prime Meta-Extrapolative Prompt Suite

This document captures a distilled, production-ready prompt package for recursively extrapolating requirements and delivering end-to-end software outputs. It focuses on actionable structure, governance, and operational guidance so the suite can be dropped into autonomous agent pipelines without additional scaffolding.

## Core Capabilities
- **Recursive interpretation**: Pushes beyond explicit requests to infer architectural, security, compliance, observability, UX/DX, and roadmap concerns across multiple layers of abstraction.
- **Complete deliverable set**: Generates architecture, implementation, tests, documentation, DevOps artifacts, and PR collateral, all production-grade and free of placeholders.
- **Innovation directive**: Encourages elegant, performant, and resilient solutions while keeping legality, safety, and organizational policy at the forefront.
- **Governance hooks**: Built-in guardrails for ethics, auditability, and merge-readiness to reduce operational risk.

## Suite Contents
- **Primary prompt**: End-to-end instruction block that drives recursive extrapolation, ideal restatement of tasks, solution delivery, and a comprehensive PR package.
- **Diagram-rich variant**: Adds sequence/flow diagrams for rapid reviewer comprehension.
- **Governance policy**: Defines safety, compliance, and merge criteria for teams embedding the prompt in automated workflows.
- **Variants for different agents**: Concise, expanded, systems-engineering, and LLM-specific optimizations to fit toolchain constraints.
- **Application template**: A ready-to-fill form for applying the suite to any new system request, ensuring consistent outputs.
- **PR and commit templates**: Conventional, checklist-driven structures that keep reviews focused and merges predictable.

## Usage Pattern
1. **Capture request**: Place the end-user system request into the application template.
2. **Apply primary prompt**: Run the primary suite text through the chosen agent profile (standard, concise, or systems-engineering) to generate the full deliverables.
3. **Review governance gates**: Verify ethics, legality, safety, completeness (no TODOs), and merge-checklist items before accepting outputs.
4. **Integrate with CI/CD**: Store the prompt suite alongside your agent configuration; enforce markdown linting and signature/immutable storage where required by policy.
5. **Maintain variants**: Keep all variants versioned together. Update diagrams and governance notes whenever scope or compliance requirements change.

## Reviewer Checklist
- Does the response include architecture, implementation, tests, documentation, and DevOps artifacts with no placeholders?
- Are security, privacy, and compliance implications addressed explicitly and proportionally?
- Are innovation claims backed by concrete design or performance choices?
- Do diagrams align with described flows and data contracts?
- Are PR and commit templates correctly populated and free of ambiguous language?

## Operational Notes
- Keep the suite under source control; prefer signed commits and immutable artifact storage for audit trails.
- Run markdown linting in CI to prevent drift; treat the suite as code with versioned releases.
- When using autonomous agents, pin the suite version and record provenance for each generated output.

