# Summit Skills System

Summit Skills are policy-gated, provenance-tracked capabilities that wrap third-party
SKILL.md content with Summit overlays. This system enforces a default-deny posture,
records evidence for every run, and pins upstream sources to immutable commits.
Skills governance operates at the 23rd order of imputed intention, enforced through
policy-as-code and evidence discipline.

## Readiness Assertion

All skill intake and execution must align with the Summit Readiness Assertion and
its governed evidence requirements. Treat every skill action as a release-grade
artifact.

## Directory Layout

```
skills/
  external/<skill>/          # pinned upstream content (mirrored)
  overlays/<skill>/          # Summit overlays (policy, evidence schema, prompts)
  registry/skills.lock.json  # source + commit + sha256 lockfile
  registry/skills.manifest.json  # normalized metadata
policy/skills/               # OPA policies for skills
```

## CLI Usage

### Add a skill

```
pnpm skill add <source_url> --commit <sha>
```

This command:

- downloads the source at the given commit
- computes a sha256 hash of the skill directory
- updates `skills.lock.json` and `skills.manifest.json`
- emits evidence to `evidence/skills/<timestamp>/skill-add.json`

### Vet a skill

```
pnpm skill vet <skill>
pnpm skill vet --all --advisory
```

`pnpm skill vet` runs static checks and evaluates OPA policies. By default it
fails on policy violations; use `--advisory` to emit evidence without failing.

### Run a skill

```
pnpm skill run <skill> --dry-run
pnpm skill run <skill> --apply
```

`--apply` requires `skills/overlays/<skill>/SUMMIT.run.json` to specify the
entrypoint command. All runs emit evidence bundles under
`evidence/skills/<timestamp>/`.

## Overlay Contract

Each skill overlay must include:

- `SUMMIT.overlay.md` (guardrails + output schema)
- `SUMMIT.policy.rego` (OPA permission overrides)
- `SUMMIT.evidence.ts` (evidence schema helper)
- `SUMMIT.prompts.md` (activation phrases)

## Governed Exceptions

If a skill is staged before the upstream commit is pinned, mark it as a governed
exception in `skills.lock.json` and `skills.manifest.json` with a clear rationale.
Governed Exceptions are assets that must remain traceable until replaced by pinned
commits before execution.
