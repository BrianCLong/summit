# Summit Competitive Intelligence Subsumption Protocol v1 (mergeable + gated)

This protocol turns competitive intelligence into **deterministic extraction → integration PR stack → measurable transcendence → moat + gates**, while staying license/ethics clean.

## Core principles

* **Concept extraction, not code copying.** Implement patterns independently.
* **Evidence-first.** Every claim has a trace: source URL, snippet hash, notes, mapping to Summit modules.
* **Patch-first.** Small PRs, minimal blast radius, each PR independently mergeable.
* **Moat via gates.** Competitive wins become enforced controls (CI checks, schemas, policies, evals).

## Dossier Structure

Every competitive target must have a dossier in `docs/competitive/TARGET_SLUG/`:

* `sources.yml`: List of public sources used.
* `extractions.md`: Bulleted list of verifiable extractions.
* `mapping.yml`: Mapping of extractions to Summit modules/files.
* `risks.md`: License, security, and assumption analysis.
* `benchmarks.md`: Planned and achieved benchmarks in deterministic format.
* `pr-stack.yml`: The sequence of PRs (PR0..PRn) to implement the findings.

## Extraction Item Schema

Each extraction in `extractions.md` must follow this schema:

* `id`: stable (`ci.<target>.<area>.<nnn>`)
* `url`: canonical URL of the source.
* `quote`: Relevant snippet (max 25 words).
* `quote_sha256`: SHA256 hash of the quote text for verification.
* `claim`: What we infer from the source (clearly marked as inference vs direct).
* `value`: Why this extraction matters for Summit.
* `summit_mapping`: Summit module(s) or area(s) affected.
* `gate`: How we enforce this gain (test, CI check, policy, or eval).

## Enforcement

CI validates that every dossier is complete, extractions have valid hashes, and quotes are within the word limit.
