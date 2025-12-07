# Future History Entry Template

Use this template when creating new Future History entries. Copy the template below and fill in all
sections.

---

## Template

```markdown
### YYYY-MM-DD: Entry Title

**Category**: [Category] | **Status**: [Draft|Active] | **Owner**: [Team/Person]

#### Change/Decision

[1-2 paragraphs describing what changed or what decision was made. Be specific about the technical
changes, not just the goal.]

#### Rationale

[Why did we make this change? What problem were we solving? What alternatives did we consider? Keep
to 1-2 paragraphs.]

#### Short-term Effects (0–3 months)

- **Immediate**: [What happens right away]
- **Week 1-2**: [Early effects]
- **Month 1**: [First month outcomes]
- **Month 2-3**: [Near-term stabilization]

#### Long-term Effects (6–24 months)

- **6 months**: [Half-year trajectory]
- **12 months**: [One-year vision]
- **18 months**: [Extended trajectory]
- **24 months**: [Two-year strategic outcome]

#### Risks & Mitigations

| Risk     | Likelihood        | Impact            | Mitigation          |
| -------- | ----------------- | ----------------- | ------------------- |
| [Risk 1] | [Low/Medium/High] | [Low/Medium/High] | [How we address it] |
| [Risk 2] | [Low/Medium/High] | [Low/Medium/High] | [How we address it] |
| [Risk 3] | [Low/Medium/High] | [Low/Medium/High] | [How we address it] |

#### Links

- **PR**: #[number] or N/A
- **ADR**: [path to ADR] or N/A
- **Threat Model**: [path or N/A]
- **Health Score**: [metric location or N/A]
```

---

## Guidelines

### When to Create an Entry

Create a Future History entry when:

1. **Epic-level PRs**: Changes spanning multiple services or affecting platform architecture
2. **Strategic decisions**: Technology choices, vendor selections, architectural patterns
3. **Breaking changes**: API changes, migration paths, deprecations
4. **New capabilities**: Features that unlock new use cases or user segments
5. **Security changes**: Authentication, authorization, encryption, compliance
6. **Performance milestones**: Significant optimization efforts with measurable goals

### When NOT to Create an Entry

Skip Future History entries for:

- Bug fixes (unless they reveal systemic issues requiring architectural response)
- Routine dependency updates
- Documentation-only changes
- Refactoring without behavioral changes
- Feature flags or experiments (until they graduate to permanent features)

### Writing Effective Entries

#### Change/Decision Section

- **Be specific**: Name the technologies, patterns, or approaches
- **Quantify where possible**: "Reduced latency by 60%" not "Improved performance"
- **Describe the mechanism**: How does the change achieve its goal?

**Good**:

> Implemented DataLoader batching across all entity relationship resolvers, reducing N+1 query
> patterns by consolidating up to 200 individual queries into single batched requests per resolver
> invocation.

**Avoid**:

> Made the API faster by optimizing queries.

#### Rationale Section

- **State the problem clearly**: What was broken or insufficient?
- **Mention alternatives considered**: Why this approach over others?
- **Connect to business value**: How does this serve users or the organization?

#### Effects Sections

- **Be falsifiable**: Write predictions that can be validated or invalidated
- **Include metrics where possible**: Numbers make retrospectives meaningful
- **Acknowledge uncertainty**: "Expected" not "will" for longer-term predictions

#### Risks Section

- **Be honest about risks**: This isn't a sales document
- **Make mitigations actionable**: Specific steps, not vague assurances
- **Update as risks materialize**: Entries should evolve

### Categories

Use consistent categories for filtering and analysis:

| Category           | Description                                           |
| ------------------ | ----------------------------------------------------- |
| **Security**       | Authentication, authorization, encryption, compliance |
| **Performance**    | Latency, throughput, scalability, efficiency          |
| **Governance**     | Data management, audit, policy, compliance            |
| **Architecture**   | Structural changes, service boundaries, patterns      |
| **Strategy**       | Long-term planning, roadmaps, organizational          |
| **Infrastructure** | CI/CD, deployment, monitoring, operations             |
| **API**            | GraphQL schema, REST endpoints, contracts             |
| **Data**           | Databases, migrations, ETL, analytics                 |

### Status Values

| Status         | Meaning                                                    |
| -------------- | ---------------------------------------------------------- |
| **Draft**      | Entry created but not yet reviewed by stakeholders         |
| **Active**     | Entry reviewed; predictions being actively tracked         |
| **Validated**  | Predictions materialized as expected (can be archived)     |
| **Revised**    | Predictions updated based on new information               |
| **Superseded** | Replaced by a newer entry (archive with link to successor) |

---

## Automation

### Creating Entries via CLI

```bash
# Create entry from PR numbers
pnpm future-history:create --pr 13347 --pr 13348 --summary "Security scanning pipeline"

# Create entry interactively
pnpm future-history:create --interactive

# Validate entry format
pnpm future-history:validate docs/future-history/LOG.md
```

### CI Integration

Large PRs (>500 lines changed, >10 files) trigger a CI check that warns if no Future History entry
is included. To satisfy this check:

1. Add a Future History entry in the PR
2. Reference an existing entry that covers this work
3. Add `[fh-skip]` to the PR description with justification

---

## Examples

### Minimal Entry

```markdown
### 2025-12-01: Redis Cluster Migration

**Category**: Infrastructure | **Status**: Active | **Owner**: Platform Team

#### Change/Decision

Migrated from single Redis instance to 6-node Redis Cluster for session storage and caching.

#### Rationale

Single Redis instance was a SPOF and couldn't handle projected load growth.

#### Short-term Effects (0–3 months)

- **Immediate**: Zero-downtime migration completed
- **Month 1**: Session failover tested and validated
- **Month 2-3**: Cluster monitoring dashboards operational

#### Long-term Effects (6–24 months)

- **6 months**: Scale to 10K concurrent sessions
- **12 months**: Cross-region replication for DR
- **24 months**: Managed Redis service evaluation

#### Risks & Mitigations

| Risk                | Likelihood | Impact | Mitigation                                     |
| ------------------- | ---------- | ------ | ---------------------------------------------- |
| Cluster split-brain | Low        | High   | Proper quorum configuration; monitoring alerts |

#### Links

- **PR**: #12500
- **ADR**: N/A
- **Threat Model**: N/A
- **Health Score**: Redis cluster health in Grafana
```

### Comprehensive Entry

See entries in [LOG.md](./LOG.md) for full examples with detailed predictions and risk analysis.

---

## Maintenance

### Quarterly Review Checklist

- [ ] Review all Active entries
- [ ] Compare predictions to actual outcomes
- [ ] Update status for completed/superseded entries
- [ ] Move archived entries to Archive section
- [ ] Add retrospective notes where predictions diverged
- [ ] Identify patterns across entries for process improvement

### Retrospective Template

When an entry is validated or revised, add a retrospective note:

```markdown
---

**Retrospective (YYYY-MM-DD)**:

**Outcome**: [Validated | Partially Validated | Revised | Did Not Materialize]

**Notes**: [What actually happened vs. predictions]

**Lessons**: [What we learned for future predictions]
```
