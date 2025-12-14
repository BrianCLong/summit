# Prompt 1: IntelGraph Core Data Model & Service

**Tier:** 0 - Foundation
**Priority:** ⭐️ CRITICAL PATH
**Effort:** 2 weeks
**Dependencies:** None
**Blocks:** All other prompts

---

You are Claude Code, an AI software engineer working for a company called Topicality (topicality.co).

Context:
- Topicality's core product is "Summit IntelGraph" — a knowledge graph of entities, claims, provenance, and policy labels.
- We care about provenance, governance, and auditability: every claim should be traceable back to sources and policy labels (origin, sensitivity, legal basis).
- This is the central "brain" that other systems (Maestro, governance, reporting) will depend on.

Goal:
Design and implement a FIRST SLICE of the IntelGraph core:
1) a minimal but expressive data model,
2) an API/service layer to read/write graph objects,
3) basic querying, and
4) documentation.

Assumptions (adjust only if absolutely necessary):
- Use a mainstream stack (e.g., TypeScript + Node + Postgres OR Python + FastAPI + Postgres). Pick one, explain why, and stick to it.
- Assume a greenfield repo; structure it sensibly with clear separation of concerns.

Requirements:
1. Data model
   - Represent entities (people, orgs, systems, documents, datasets, etc.).
   - Represent claims: a claim is something like "entity A has property P with value V at time T".
   - Represent provenance:
     - Source(s) for each claim (URLs, document IDs, hash of source content).
     - Ingestion method (manual, automated pipeline, connector name).
     - Confidence score and status (draft, verified, deprecated).
   - Represent policy labels:
     - origin (e.g., customer_data, public_web, internal),
     - sensitivity (e.g., low/medium/high),
     - legal_basis (e.g., contract, consent, legitimate_interest, unknown).

2. Service/API layer
   - CRUD for entities and claims.
   - Ability to:
     - upsert entities and link them,
     - add/retire claims,
     - attach provenance and policy labels.
   - Support at least:
     - get_entity(entity_id) with its current claims,
     - search_entities by name/type,
     - get_claim_history(entity_id, property) with timestamps & provenance.

3. Query examples
   - Include sample queries (and tests) that:
     - Find all claims about a given entity within a time range.
     - Find all high-sensitivity claims for a customer's tenant ID.
     - Show the provenance trail for a specific claim (sources, ingestion pipeline, timestamps).

4. Testing & docs
   - Provide unit tests for core data model and API endpoints.
   - Include a README that explains:
     - the core concepts,
     - how to run the service locally,
     - how to call the key APIs,
     - how this first slice could evolve.

Deliverables:
- Repository/file layout.
- Schema definitions / migrations.
- Service code (handlers/controllers).
- Example API calls (e.g., via curl or a simple client script).
- Tests and README.

Work step-by-step:
1) Propose the stack and high-level architecture.
2) Define the schema.
3) Define API surface.
4) Implement.
5) Add tests.
6) Write README.

Show code and design decisions as you go. Optimize for clarity and evolvability.
