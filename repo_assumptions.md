# repo_assumptions.md

## Verified
- Summit is a public repo: BrianCLong/summit
- README positions Summit as an Agentic AI OSINT Platform
- Stack includes Neo4j, Postgres, Redis, GraphQL
- Visible top-level dirs include connect, analysis, audit, .opa/policy, SECURITY, RUNBOOKS
- CI policy names include:
  - Release Readiness Gate
  - GA Gate
  - Unit Tests & Coverage
  - CI Core (Primary Gate)

## Assumed
- New conflict/COP code can live under connect/, analysis/, audit/, docs/, scripts/monitoring/
- Evidence objects can be introduced without breaking existing consumers if versioned
- JSON report artifacts are acceptable CI outputs

## Must-not-touch
- Existing branch protection reconciler paths and governance policy semantics
- Existing production GraphQL schema names unless behind additive versioning
- Existing security policy docs without maintainer review
- Existing ingest connectors used in production unless feature-flagged
