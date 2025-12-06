# Prompt 5: Disclosure Pack Generator (SBOM + SLSA + Risk Summary)

**Tier:** 3 - Automation & Tooling
**Priority:** ⭐️ RELEASE BLOCKER
**Effort:** 1 week
**Dependencies:** Prompts 2, 3
**Blocks:** Prompt 8 (Release Gate Checker)
**Parallelizable:** Yes (with Prompts 6, 9)

---

You are Claude Code, an AI software engineer for Topicality.

Context:
- Every release must ship with a "Disclosure Pack":
  - SBOM,
  - SLSA-style provenance metadata,
  - risk assessment,
  - DPA/DPIA if applicable,
  - rollback plan with criteria.
- This should be automated and wired into CI/CD.

Goal:
Build a CLI tool + small library to generate a Disclosure Pack for a given build/release.

Assumptions:
- Use a language well suited for CLI tools (TypeScript/Node or Python).
- Assume we can read:
  - git metadata,
  - a build manifest (e.g., from package manager),
  - environment variables from CI (e.g., run_id, commit SHA).

Requirements:
1. Inputs
   - Repo path.
   - Commit SHA.
   - Build artifacts list (binary, container image tag, etc.).
   - Optional: Maestro run_id, IntelGraph claim_ledger_manifest_path.

2. Outputs (Disclosure Pack)
   - SBOM: list of dependencies (name, version, license if known).
   - SLSA-style provenance:
     - builder info, build steps, timestamps, git commit, branch/tag.
   - Risk assessment:
     - brief risk summary stub (to be later enriched by humans).
     - flags for: external data, PII, data residency constraints.
   - Rollback plan skeleton:
     - manual text fields + recommended triggers (e.g., error_rate > X, latency_p95 > Y, policy violation).

   All packaged as:
   - a JSON or YAML file plus optional human-readable Markdown.

3. CLI behavior
   - Commands like:
     - `disclosure-pack generate --repo <path> --commit <sha> --output <file>`
   - Options to:
     - include SBOM via existing tools (e.g., calling `syft`/`npm ls` etc.; stub if external tools not available).
     - attach Maestro run_id and IntelGraph references.

4. CI integration example
   - Provide example scripts/config for:
     - GitHub Actions or generic CI step that calls this CLI and uploads the artifact.

5. Tests & docs
   - Unit tests for pack generation.
   - README explaining usage, inputs, outputs, and how to extend.

Deliverables:
- CLI tool code.
- Library code (if separated).
- Example CI snippet.
- Tests and README.
