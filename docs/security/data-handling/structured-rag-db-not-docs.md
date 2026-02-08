# Structured RAG Data Handling

**Authority:** [SUMMIT Readiness Assertion](../../SUMMIT_READINESS_ASSERTION.md)

## Data Scope
Structured retrieval operates on allowlisted relational data sources and produces deterministic evidence artifacts.

## Guards

- **Least privilege:** DB credentials must be read-only and scoped to allowlisted schemas.
- **Tenant isolation:** Required tenant predicate when configured.
- **Parameterization:** All filters use parameterized queries; no raw SQL injection surface.
- **Budgets:** Hard caps on row counts and response bytes.

## Redaction

- Evidence artifacts never include connection strings or credentials.
- Query parameters are stored as values only, suitable for controlled environments.

## Evidence Storage

Artifacts are written to `artifacts/structured-rag-db-not-docs/<run_id>/` and must be treated as controlled data.
