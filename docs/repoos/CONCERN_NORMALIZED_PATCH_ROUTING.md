# Concern-Normalized Patch Routing (CNPR)

Concern-Normalized Patch Routing (CNPR) is the architectural pattern that allows Summit to process a massive volume of AI-generated patches without PR explosions.

## The Core Rule

One concern → one canonical patch frontier → one merge lane owner

At scale, autonomous agents will often emit overlapping patches against the same latent issue (e.g., the same bug, a refactoring with different shapes). CNPR forces every AI-generated change to pass through a single canonical concern identity before it can become a PR.

This layer converts an autonomous repo from a *patch emitter* into a *semantic integrator*.

## The Workflow

1. **Agents submit patches, not PRs**
   Agents propose mutations against a concern by generating patch candidates, they do not directly create PRs.

2. **Every patch maps to a canonical concern**
   Patches are deterministically classified (using scopes and invariants) and mapped to a single concern ID in the registry (`.github/repoos/concerns.yml`).

3. **Each concern has one live frontier**
   For each concern, exactly one active canonical integration branch (frontier) is maintained. Patches are either absorbed, supersede the current frontier, or are archived as evidence.

4. **Frontiers synthesize many candidates into one canonical delta**
   The patch frontier synthesizer combines compatible patches into one repository-approved proposal branch.

5. **Late PR materialization**
   A PR only materializes when a frontier is semantically coherent, stable against `main`, and green in its assigned lane.

6. **All displaced work is archived as evidence**
   Following Summit's evidence-first governance model, superseded candidates are preserved as evidence artifacts (`artifacts/pr-intake/`), not left open as duplicate backlog. Work is never lost.

## Schema Validation

Concerns and their definitions are strictly validated. For instance, `concern.schema.json` requires:

```json
{
  "id": "concern.ci.required-contexts",
  "title": "Restore and preserve required status context production",
  "domain": "ci",
  "files": [
    ".github/workflows/**",
    "scripts/branch-protection/**"
  ],
  "invariants": [
    "required status names remain stable",
    "merge queue compatibility preserved"
  ],
  "lane": "lane.gov-deterministic"
}
```
