# Summit MVP Generation Prompt (Multi-Agent Architecture)

This prompt bootstraps a primary code-generation agent (Codex / GPT-4.1 / Jules) to deliver a complete, runnable MVP of the Summit platform with governance, provenance, and CI baked in. It is ready for immediate use in development or experimentation sessions.

## Prompt (ready to paste)

```
You are the primary code-generation and architecture agent for the Summit project. Your objective is to produce a complete, runnable MVP of the Summit platform that satisfies the following:

1) Core Deliverables
   - A working multi-agent execution framework with:
     • Base agent interface and loader
     • Task queue / scheduler
     • A default “executor” agent that can run simple tasks end-to-end
   - SBOM and provenance integration (SLSA provenance tracking)
   - OPA policy enforcement integrated at runtime
   - Basic UI/CLI to:
     • Trigger tasks
     • View logs
     • Inspect provenance
   - CI configuration (GitHub Actions) that:
     • Lints
     • Builds
     • Runs tests
     • Publishes SBOM
   - Automated tests:
     • Unit tests
     • Integration tests for core flows

2) Project Structure
   - A clear directory layout (e.g., src/, tests/, docs/, ci/)
   - README with:
     • Project overview
     • Architecture diagrams
     • Setup & run instructions
   - Marine-grade config files (e.g., OpenAPI, OPA policies, SLSA config)

3) Governance Artifacts
   - AGENTS.md listing agent specs
   - Policy documentation (OPA rules)
   - Provenance policy definitions

4) Quality Requirements
   - No TODOs or stubs
   - Fully green CI on first commit
   - Code must compile, tests must pass

5) Output Requirements
   - A ZIP archive of the MVP codebase
   - Clear commit history simulation with messages for each logical milestone
   - A manifest of all SBOM components

Your task in this iteration:
Generate the full MVP codebase and associated governance docs in a format ready to commit to a repository. Accompany code with explanations and annotated architecture diagrams. Validate output with a simulated CI run description that shows all steps passing.

Produce files using code blocks with exact paths, contents, and any support scripts needed.

Begin with the root directory tree and core architecture explanation.

Do not ask clarifying questions. Output must be complete, explicit, and ready for immediate ingestion into source control.
```

## Usage Guidelines

- Run the prompt with a code-generation-capable model (e.g., Codex, GPT-4.1) to produce a full MVP drop-in repository.
- Expect the response to include all mandatory governance artifacts (AGENTS.md, OPA policies, provenance definitions) and CI-ready automation.
- Use the generated ZIP archive as the artifact to unpack into a new repository; ensure SBOM and provenance evidence are captured before first commit.
- After generation, verify outputs against Summit governance (see `docs/governance/`) and run the simulated CI steps to confirm green status.

## Rationale

This prompt is optimized to:

- Prioritize security and governance from the first iteration via OPA and SLSA requirements.
- Ensure operational readiness (tests, CI, provenance) alongside functional agent execution features.
- Deliver a structured, audit-friendly commit history that can be replayed or imported into Summit workflows.

## Extension Ideas

- Create variants for UI-first MVPs, backend-only prototypes, or automated test-generation agents by swapping deliverable emphases while keeping governance and provenance fixed.
- Pair this prompt with `docs/prompts/council_wishbook_prompts_9_16_delivery_blueprint.md` to align with broader Summit execution blueprints.
