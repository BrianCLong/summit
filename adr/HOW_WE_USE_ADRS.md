# How We Use Architecture Decision Records (ADRs)

## What is an ADR?

An Architecture Decision Record (ADR) is a document that captures an important architectural decision made along with its context and consequences. ADRs are our institutional memory for "why" we made specific architectural choices.

## When to Write an ADR

Create an ADR when you're making a decision that:

1. **Affects system structure**: Database choice, API design, service boundaries
2. **Has long-term impact**: Technology choices, architectural patterns, security models
3. **Involves significant trade-offs**: Performance vs. cost, complexity vs. flexibility
4. **Impacts multiple teams**: Shared services, platform capabilities, cross-cutting concerns
5. **Establishes a precedent**: "This is how we do X going forward"

### Examples of ADR-Worthy Decisions

✅ **Should write an ADR:**
- Choosing Neo4j over PostgreSQL for graph queries
- Adopting GraphQL vs. REST for our API
- Implementing multi-tenant compartment model
- Authority & license compiler design
- Copilot architecture (GraphRAG + policy)

❌ **Don't need an ADR:**
- Adding a new field to an existing table
- Refactoring a single service
- Fixing a bug
- UI component library choice (local to frontend)
- Routine operational changes

### The "Grandparent Test"

Ask yourself: "If a new engineer joins 2 years from now, will they wonder why we did this?"

If yes → Write an ADR.

## How to Write an ADR

### 1. Start with the Template

Copy `adr/adr-template.md` to a new file:

```bash
cp adr/adr-template.md adr/XXXX-your-decision-title.md
```

Use the next available number (check `adr/README.md` for the current highest number).

### 2. Fill in the Key Sections

The template has many sections, but these are the most critical:

#### Context (Most Important!)
- **Why** are we making this decision?
- What **problem** are we solving?
- What **constraints** do we have?
- What **requirements** must we meet?

**Bad context:**
> We need a database.

**Good context:**
> Summit's intelligence platform requires a native graph database to model complex relationships between entities. Traditional relational databases struggle with deep relationship traversals (N-hops), and our investigation queries often need to find connections 3-5 hops deep in <500ms. We need ACID guarantees, multi-tenant isolation, and integration with our existing Postgres transactional data.

#### Decision
- **What** did we decide?
- **How** will it work (high-level)?

Be specific and concrete. Avoid "we will use best practices" - say exactly what you'll do.

#### Alternatives Considered
This is critical! Show that you explored options.

For each alternative:
- What is it?
- Why is it attractive?
- Why didn't we choose it?
- What's the cost/complexity?

**Pro tip:** Decision-making is about trade-offs. Documenting alternatives shows you understood the trade-offs.

#### Consequences
What becomes easier? What becomes harder?

- **Positive**: What benefits do we get?
- **Negative**: What costs/complexity do we accept?
- **Neutral**: What changes without clear good/bad?

Be honest about trade-offs. Every decision has downsides.

#### Code References
Link to the actual implementation:
- File paths to core implementation
- Specific line numbers for critical logic
- Schema files, GraphQL schemas, policy files

**Example:**
```
- `server/src/graph/CypherQueryBuilder.ts:L45-L120` - Query builder
- `server/src/db/migrations/XXX-neo4j-indexes.sql` - Index definitions
```

#### Tests & Validation
How do we enforce this decision?

- Unit tests that validate the approach
- Integration tests for end-to-end validation
- Performance benchmarks
- Security tests
- CI checks that enforce the decision

**This is what makes ADRs living documentation** - tests ensure the decision is actually implemented and maintained.

### 3. Review Checklist

Before submitting your ADR, verify:

- [ ] **Context** clearly explains the problem and constraints
- [ ] **Decision** is specific and actionable
- [ ] **Alternatives** shows at least 2-3 other options considered
- [ ] **Consequences** honestly covers positives AND negatives
- [ ] **Code References** links to actual implementation
- [ ] **Tests** shows how we validate/enforce the decision
- [ ] All metadata filled (Date, Status, Area, Owner, Tags)
- [ ] `adr/README.md` index updated with new ADR

## ADR Lifecycle

### Status Progression

```
Proposed → Accepted → [Deprecated | Superseded]
```

- **Proposed**: Under discussion, not yet implemented
- **Accepted**: Decision made, implementation in progress or complete
- **Deprecated**: No longer relevant (technology sunset, requirements changed)
- **Superseded**: Replaced by a newer ADR (link to replacement)

### When to Update an ADR

ADRs are **append-only**:
- ✅ Add new sections (Migration & Rollout, Lessons Learned)
- ✅ Update Revision History table
- ✅ Add links to related ADRs
- ✅ Update code references as implementation evolves
- ❌ Don't delete or rewrite history
- ❌ Don't change the original decision

If a decision changes significantly, mark the old ADR as "Superseded" and create a new one.

### Revision History

Always update the Revision History table when you modify an ADR:

```markdown
| Date | Author | Change |
|------|--------|--------|
| 2024-01-15 | Data Guild | Initial version |
| 2024-03-10 | Data Guild | Updated with production rollout results |
| 2024-06-15 | Data Guild | Added lessons learned from scaling to 10M nodes |
```

## Working with ADRs

### Discovering ADRs

```bash
# List all ADRs
intelgraph adr:list

# Filter by area
intelgraph adr:list --area data
intelgraph adr:list --area ai

# Filter by status
intelgraph adr:list --status accepted
intelgraph adr:list --status proposed

# Filter by tags
intelgraph adr:list --tags neo4j
intelgraph adr:list --tags policy,compliance
```

### Reading an ADR

```bash
# Open a specific ADR
intelgraph adr:open 0006
intelgraph adr:open 12  # Auto-pads to 0012

# Raw markdown (for copying/editing)
intelgraph adr:open 0006 --raw
```

### Creating a New ADR

```bash
# 1. Find next available number
intelgraph adr:list

# 2. Copy template (assuming next is 0013)
cp adr/adr-template.md adr/0013-my-new-decision.md

# 3. Edit the ADR
vim adr/0013-my-new-decision.md

# 4. Update the index
vim adr/README.md  # Add entry to the index table

# 5. Commit with your changes
git add adr/0013-my-new-decision.md adr/README.md
git commit -m "feat: add ADR-0013 for my architectural decision"
```

## ADRs and Code Changes

### PRs Should Include ADR Updates

When your PR modifies foundational areas:
- Auth/security code → Update ADR-0002 (ABAC), ADR-0010 (Multi-tenant)
- Graph queries → Update ADR-0006 (Neo4j)
- GraphQL schema → Update ADR-0007 (GraphQL API)
- Copilot/AI → Update ADR-0012 (Copilot GraphRAG)
- Provenance → Update ADR-0011 (Provenance Ledger)

### CI Checks

Our CI pipeline (`.github/workflows/adr-check.yml`) watches for changes to foundational code:

If you modify:
- `services/authz-gateway/`
- `policy/`
- `**/*.graphql`
- `server/src/graph/`
- `server/src/services/copilot/`
- ...and other foundational areas

**And** you don't update any ADR files, CI will:
1. Emit a warning (not a failure)
2. Comment on your PR with relevant ADRs to consider
3. Suggest using `intelgraph adr:list` to find ADRs

This is a **gentle reminder**, not a blocker. If no architectural decision changed, ignore it.

### When to Update vs. Create New ADR

**Update existing ADR** when:
- Implementation details change (new code paths, optimizations)
- Lessons learned from production usage
- Minor refinements to the approach
- Adding test coverage or validation

**Create new ADR** when:
- Fundamentally different approach/technology
- Reversing a previous decision
- New decision in a different area
- Major pivot that invalidates original context

## ADR Anti-Patterns

### ❌ "Process Documentation Disguised as ADR"

**Bad:**
> ADR-0042: Code Review Process
>
> We will require 2 approvals for all PRs.

**Why it's bad:** This is a process decision, not an architectural decision. Put it in a CONTRIBUTING.md or team handbook.

### ❌ "Implementation Details Instead of Decisions"

**Bad:**
> ADR-0043: Add Logging
>
> We will add logging to the UserService.

**Why it's bad:** Too narrow. Not architectural. This is just a code change.

### ❌ "Vague Aspirations Instead of Concrete Decisions"

**Bad:**
> Decision: We will follow best practices for security.

**Why it's bad:** What are "best practices"? Be specific: "We will implement ABAC with OPA for authorization decisions."

### ❌ "Missing Context and Alternatives"

**Bad:**
> Context: We need a database.
> Decision: Use PostgreSQL.
> Consequences: We can store data.

**Why it's bad:** No explanation of **why** Postgres, what alternatives were considered, or what trade-offs we accepted.

### ❌ "No Link to Code or Tests"

**Bad:**
> [ADR has no Code References or Tests sections]

**Why it's bad:** ADRs without code references become stale documentation. ADRs are living documents - they should point to the actual implementation and tests that enforce the decision.

## Tips for Great ADRs

### 1. Write for Your Future Self
Assume you'll forget why you made this decision in 6 months. What would you want to know?

### 2. Document the Debate
Include dissenting opinions or concerns raised during the decision process. This context is valuable.

### 3. Be Specific About Trade-offs
Every decision has costs. Being honest about downsides builds trust and helps future engineers understand the constraints you faced.

### 4. Link Liberally
- Link to related ADRs
- Link to external resources (papers, blog posts, docs)
- Link to internal design docs, RFCs, discussions

### 5. Update as You Learn
Production usage often reveals insights. Update the ADR with "Lessons Learned" or "Production Experience" sections.

### 6. Make ADRs Discoverable
- Use consistent tags
- Update the index in README.md
- Reference ADRs in code comments: `// See ADR-0006 for rationale`

## Examples of Good ADR Sections

### Great Context Example

```markdown
## Context

Summit's AI copilot must assist analysts while respecting multi-tenant compartment
boundaries and authority classifications. A naive RAG implementation that simply
retrieves "similar" documents risks:

1. **Compartment leakage**: Retrieving documents from other tenants/teams
2. **Authority violations**: Exposing classified data to users lacking clearance
3. **Compliance failures**: ITAR, EAR, CUI violations trigger regulatory penalties

Traditional vector-only RAG also misses graph relationships. An analyst asking
"Who is connected to Person X?" needs graph traversals, not just document similarity.

We need a solution that combines:
- Vector search for semantic similarity
- Graph traversal for relationship discovery
- Policy filtering to enforce compartment and authority boundaries
- Citation tracking for audit trails
```

**Why it's great:**
- Explains the specific problem
- Identifies concrete risks
- States requirements clearly
- Provides business/compliance context

### Great Alternatives Example

```markdown
## Alternatives Considered

### Alternative 1: Standard RAG (Vector-only)
- **Description:** Use pgvector for similarity search, no graph traversal
- **Pros:**
  - Simple implementation (~200 LOC)
  - Fast (single vector query)
  - Well-understood pattern
- **Cons:**
  - Misses graph relationships entirely
  - Can't answer "who is connected to X?" queries
  - Limited context (documents only, not entities)
- **Cost/Complexity:** Low complexity, inadequate for graph intelligence use cases
- **Why we didn't choose it:** Our core value prop is graph intelligence; vector-only RAG is insufficient

### Alternative 2: LLM Function Calling for Tool Selection
- **Description:** Let the LLM decide which tools (graph, vector, keyword) to call
- **Pros:**
  - Flexible - LLM adapts to query type
  - Handles novel query patterns
- **Cons:**
  - 3-5 LLM calls per query (expensive)
  - Higher latency (5-10 seconds typical)
  - Harder to enforce policy (LLM decides context)
  - Non-deterministic (LLM might skip graph search)
- **Cost/Complexity:** High cost (~$0.15/query vs. $0.03 for GraphRAG), unpredictable
- **Why we didn't choose it:** Cost and latency don't meet our p95 < 5s requirement
```

**Why it's great:**
- Concrete descriptions
- Honest pros/cons for each
- Quantitative trade-offs where possible
- Clear rationale for rejection

### Great Consequences Example

```markdown
## Consequences

### Positive
- Graph traversals + vector search provide 90%+ recall vs. 60% for vector-only
- Policy filtering ensures zero cross-compartment leaks (verified in 10k test queries)
- Citations enable analysts to verify every AI claim
- Hybrid retrieval balances precision (graph) and recall (vectors)

### Negative
- Complex architecture (3 data stores: Postgres, Neo4j, pgvector)
- Latency sensitive to slowest retrieval path (p95: 3.2s, target: <5s)
- Policy filtering can over-redact (false positive rate: 5%)
- Token costs scale with context size (~$0.03/query, budget: $500/month for 15k queries)

### Neutral
- LLM non-determinism complicates testing (use fixed seeds for eval)
- Requires ongoing tuning (context ranking, retrieval thresholds)

### Operational Impact
- **Monitoring**: Track query latency, retrieval precision/recall, LLM token usage, policy violations
- **Cost**: Current: $450/month for LLM API, $200/month for Neo4j, target: <$1k/month
- **Compliance**: All copilot queries logged in provenance ledger (7-year retention)
```

**Why it's great:**
- Honest about downsides
- Quantitative where possible
- Operational considerations included
- Clear monitoring and cost implications

## Questions?

- **General ADR questions**: Ask in #architecture Slack channel
- **Specific technical questions**: Tag the ADR owner (listed in ADR metadata)
- **Process questions**: See this document or ask in #engineering

## Further Reading

- [ADR GitHub Org](https://adr.github.io/) - Community resources
- [Michael Nygard's ADR article](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) - Original ADR proposal
- [Thoughtworks ADR Tools](https://github.com/npryce/adr-tools) - CLI tools for ADRs

---

**Remember:** ADRs are not bureaucracy - they're our collective memory. Write them to help your future teammates (and yourself) understand why we built the system the way we did.
