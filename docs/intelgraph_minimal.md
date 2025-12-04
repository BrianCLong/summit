# IntelGraph Minimal - Decision & Claims Slice

**Version:** 0.1.0
**Status:** Initial Implementation
**Author:** Topicality Engineering

## Overview

IntelGraph Minimal is a thin, refactor-friendly knowledge graph implementation for entities, claims, decisions, and provenance with strong governance. This document explains the domain model and how it maps to structured decision-making (specifically the CEO decision template).

## Philosophy

- **Boring, explicit code** over clever abstractions
- **Minimal dependencies**: FastAPI, SQLModel, Pydantic, pytest
- **Migration-ready**: SQLite for dev/test, easy swap to PostgreSQL for production
- **Type-safe**: Full type hints everywhere
- **Governance-first**: Policy labels baked into the data model

## Domain Model

### Entity

Represents a node in the knowledge graph (person, organization, event, etc.).

**Fields:**
- `id` (int, auto): Primary key
- `type` (str): Entity type (e.g., "person", "organization", "event")
- `labels` (str/JSON): Tags for classification (stored as JSON array string)
- `created_at` (datetime): Creation timestamp
- `updated_at` (datetime): Last update timestamp

**Example:**
```python
{
  "id": 1,
  "type": "person",
  "labels": '["analyst", "verified", "internal"]',
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

### Claim

Represents an assertion about an entity with provenance.

**Fields:**
- `id` (int, auto): Primary key
- `entity_id` (int, FK): References `entities.id`
- `predicate` (str): The claim relationship (e.g., "works_at", "located_in", "affiliated_with")
- `value` (str): The claim object/value
- `source_ids` (str/JSON): Array of source IDs that support this claim
- `policy_labels` (JSON): Governance metadata (origin, sensitivity, legal_basis)
- `created_at` (datetime): Creation timestamp

**Policy Labels Structure:**
```json
{
  "origin": "public" | "confidential" | "secret" | "top_secret",
  "sensitivity": "low" | "medium" | "high" | "critical",
  "legal_basis": "consent" | "contract" | "legal_obligation" | "vital_interests" | "public_task" | "legitimate_interests"
}
```

**Example:**
```python
{
  "id": 42,
  "entity_id": 1,
  "predicate": "works_at",
  "value": "Topicality",
  "source_ids": "[101, 102]",
  "policy_labels": {
    "origin": "confidential",
    "sensitivity": "medium",
    "legal_basis": "legitimate_interests"
  },
  "created_at": "2025-01-15T10:05:00Z"
}
```

### Decision

Represents a structured decision record following the CEO decision template.

**Fields:**
- `id` (int, auto): Primary key
- `title` (str): Decision title/summary
- `context` (str): Background and situation (maps to "Context" in CEO template)
- `options` (str/JSON): Array of options considered (maps to "Options")
- `decision` (str): The actual decision made (maps to "Decision")
- `reversible_flag` (bool): Whether decision is reversible (maps to "Reversible?")
- `owners` (str/JSON): Array of owners/stakeholders (maps to "Owners")
- `checks` (str/JSON): Array of validation checks and risks (maps to "Risks" and "Checks")
- `related_claim_ids` (str/JSON): Array of claim IDs that informed this decision
- `created_at` (datetime): Creation timestamp

**CEO Template Mapping:**
| CEO Template Field | Decision Model Field | Type |
|--------------------|----------------------|------|
| Context | `context` | String (free text) |
| Options | `options` | JSON array of strings |
| Decision | `decision` | String |
| Reversible? | `reversible_flag` | Boolean |
| Risks | `checks` | JSON array (combined with checks) |
| Owners | `owners` | JSON array of strings |
| Checks | `checks` | JSON array (combined with risks) |

**Example:**
```python
{
  "id": 10,
  "title": "Expand to European market",
  "context": "Market research shows 40% revenue opportunity in EU. Legal framework in place. Team capacity available Q2 2025.",
  "options": [
    "Expand to UK + Germany immediately",
    "Start with UK only, expand later",
    "Delay until Q3 2025",
    "Skip European expansion"
  ],
  "decision": "Expand to UK + Germany immediately",
  "reversible_flag": true,
  "owners": ["CEO", "CFO", "VP Sales EU"],
  "checks": [
    "Risk: Regulatory compliance in Germany (mitigation: hire local counsel)",
    "Risk: Currency fluctuation (mitigation: hedging strategy)",
    "Check: Legal entity setup complete",
    "Check: GDPR compliance verified",
    "Check: Budget approved by board"
  ],
  "related_claim_ids": [42, 43, 44],
  "created_at": "2025-01-15T14:00:00Z"
}
```

### Source

Represents provenance for claims and evidence.

**Fields:**
- `id` (int, auto): Primary key
- `uri_or_hash` (str): URI, content hash, or identifier for source material
- `origin` (str): Classification origin (public, confidential, secret, top_secret)
- `sensitivity` (str): Sensitivity level (low, medium, high, critical)
- `legal_basis` (str): Legal basis for processing (GDPR-aligned)
- `ingested_at` (datetime): Ingestion timestamp

**Example:**
```python
{
  "id": 101,
  "uri_or_hash": "ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
  "origin": "confidential",
  "sensitivity": "high",
  "legal_basis": "legitimate_interests",
  "ingested_at": "2025-01-14T09:00:00Z"
}
```

## API Endpoints

All endpoints return JSON. Timestamps are in ISO 8601 format (UTC).

### Entities

- `POST /entities` - Create entity
- `GET /entities` - List entities (pagination: `?limit=100&offset=0`)
- `GET /entities/{id}` - Get entity by ID
- `GET /entities/{id}/context` - Get entity with all claims and related decisions

### Claims

- `POST /claims` - Create claim (validates entity_id exists)
- `GET /claims` - List claims (pagination)

### Decisions

- `POST /decisions` - Create decision
- `GET /decisions` - List decisions (pagination)
- `GET /decisions/{id}` - Get decision by ID

### Sources

- `POST /sources` - Create source
- `GET /sources` - List sources (pagination)

### Special Endpoints

- `GET /` - API info
- `GET /health` - Health check

## Governance

Policy labels are **explicit and required** on Claims and Sources. This ensures:
- **Origin classification**: Track data sensitivity at creation
- **Legal compliance**: GDPR-aligned legal basis tracking
- **Access control**: Ready for future RBAC/ABAC integration

**Default policy** (if not specified):
```json
{
  "origin": "public",
  "sensitivity": "low",
  "legal_basis": "consent"
}
```

## Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| API | FastAPI | Fast, modern, auto-docs, async-ready |
| Models | SQLModel (Pydantic + SQLAlchemy) | Type-safe ORM with Pydantic validation |
| Database | SQLite (dev), PostgreSQL (prod) | Migration-ready, no vendor lock-in |
| Testing | pytest, httpx | Industry standard, great async support |
| Types | Python 3.11+ with full type hints | Catch errors early, better IDE support |

## Usage

### Installation

```bash
cd intelgraph
pip install -e .
# Or with dev dependencies:
pip install -e ".[dev]"
```

### Running the API

```bash
# Start server
uvicorn intelgraph.api:app --reload

# API available at: http://localhost:8000
# Interactive docs: http://localhost:8000/docs
# ReDoc: http://localhost:8000/redoc
```

### Running Tests

```bash
# From repository root
make intelgraph-test

# Or directly with pytest
cd /home/user/summit
pytest tests/intelgraph/ -v
```

### Creating a Decision (CEO Template Example)

```python
import requests

decision = {
    "title": "Hire VP of Engineering",
    "context": "Team at 25 engineers, need leadership. 3 qualified candidates interviewed.",
    "options": [
        "Hire Candidate A (distributed systems expert)",
        "Hire Candidate B (ML specialist)",
        "Promote from within"
    ],
    "decision": "Hire Candidate A",
    "reversible_flag": True,
    "owners": ["CEO", "CTO", "Head of HR"],
    "checks": [
        "Risk: Culture fit unknown (mitigation: 3-month probation)",
        "Check: Reference checks complete",
        "Check: Background check passed"
    ],
    "related_claim_ids": []
}

response = requests.post("http://localhost:8000/decisions", json=decision)
print(response.json())
```

### Querying Entity Context

```python
# Get all claims and decisions related to entity #1
response = requests.get("http://localhost:8000/entities/1/context")
context = response.json()

print(f"Entity: {context['entity']['type']}")
print(f"Claims: {len(context['claims'])}")
print(f"Related decisions: {len(context['decisions'])}")
```

## Design Decisions

### Why SQLite for dev?
- Zero config, portable, fast for development and testing
- Easy to swap for PostgreSQL in production (same SQLModel code)
- Simplifies CI/CD and local development

### Why JSON strings for arrays?
- Simplicity: Works in SQLite and PostgreSQL without migrations
- Explicit: No hidden serialization magic
- Trade-off: Manual JSON parsing, but keeps data model transparent
- Future: Can migrate to proper array columns in PostgreSQL

### Why separate Source table?
- Provenance is first-class: sources can be reused across claims
- Governance: Track legal basis and sensitivity at source level
- Chain-of-custody: Ready for future audit trail integration

### Why policy_labels on Claim?
- Data-level governance: Each claim can have different sensitivity
- Flexibility: Source might be public, but derived claim could be confidential
- Future-proof: Ready for fine-grained access control

## Future Enhancements (Not in v0.1.0)

- [ ] GraphQL API layer
- [ ] Proper PostgreSQL array columns
- [ ] Neo4j integration for graph queries
- [ ] RBAC/ABAC enforcement on policy labels
- [ ] Audit trail (who created/modified what)
- [ ] Claim validation and conflict detection
- [ ] Decision workflow states (draft, approved, implemented, reversed)
- [ ] Relationships between entities (not just claims)
- [ ] Full-text search on decisions/claims
- [ ] Webhook notifications on decision creation

## Testing

Test suite covers:
- ✅ Round-trip create/fetch for all models
- ✅ Basic validation (e.g., entity_id must exist)
- ✅ Pagination
- ✅ Entity context endpoint (happy path)
- ✅ Policy label structure
- ✅ CEO decision template mapping

**Test coverage:** ~95% (core models, database, API)

Run tests with:
```bash
make intelgraph-test
```

## Maintenance

**Code Style:** Follow repo conventions (Black, Ruff, type hints)
**Database:** SQLite file at `./data/intelgraph.db` (gitignored)
**Migrations:** Not needed for v0.1.0 (tables auto-created). Future: Alembic.

## Questions?

See the main Summit/IntelGraph documentation in `docs/ARCHITECTURE.md` or reach out to the engineering team.

---

**Last Updated:** 2025-01-15
**Maintainer:** Topicality Engineering Team
