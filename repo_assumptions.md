# Repo Reality Check — eval-driven-agentic-rag-2026

## Verified
- pnpm monorepo; quickstart uses pnpm + docker-compose (Neo4j/Postgres/Redis). (source: README)
- CI jobs include lint/typecheck/unit-tests/security-compliance/soc-controls and evidence stamping via scripts/ci/emit_evidence_stamp.mjs.
- RAG entrypoint is located at `server/src/rag/retrieval.ts`
- Policy engine enforcer is located at `server/src/policy/enforcer.ts`

## Assumed (validate)
- The exact entry point to AI RAG capabilities outside of retrieval (such as model execution, verifier loops). This will be built in `server/src/ai/rag/verifier.ts` or similar location based on instructions.

## Must-not-touch
- scripts/ci/emit_evidence_stamp.mjs contract
- .github/workflows/ci.yml required checks (only additive changes)
