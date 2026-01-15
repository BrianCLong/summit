---
id: GOV-001
name: Policy Change Simulator & License/TOS Engine
slug: policy-change-simulator
category: governance
subcategory: compliance
priority: high
status: ready
version: 1.0.0
created: 2025-11-29
updated: 2025-11-29
author: Engineering Team

description: |
  Creates a policy simulator that replays historical queries under candidate policies
  and emits diffs. Bundles a license/TOS compiler that enforces source-term blockers
  at query and export time.

objective: |
  Enable safe policy evolution with impact analysis and automated license compliance.

tags:
  - policy
  - opa
  - compliance
  - licensing
  - simulation
  - governance

dependencies:
  services:
    - postgresql
    - opa
  packages:
    - "@intelgraph/policy"
    - "@intelgraph/audit"
  external:
    - "@open-policy-agent/opa-wasm@^1.8.0"

deliverables:
  - type: cli
    description: Policy simulation CLI tool
  - type: service
    description: License/TOS enforcement engine
  - type: tests
    description: Policy regression test suite
  - type: documentation
    description: Policy authoring guide

acceptance_criteria:
  - description: Simulate policy change on historical queries
    validation: Run simulator, verify diff report generated
  - description: License terms enforced at query time
    validation: Query restricted data, verify block with rationale
  - description: Appeals process functional
    validation: Submit appeal, verify workflow

estimated_effort: 5-7 days
complexity: high

related_prompts:
  - MIG-001
  - DQ-001
  - GOV-002

blueprint_path: ../blueprints/templates/service
---

# Policy Change Simulator & License/TOS Engine

## Objective

Enable policy administrators to safely evolve authorization and compliance policies by simulating proposed changes against historical query logs. Prevent breaking changes and ensure license/terms-of-service compliance is enforced at runtime with transparent appeals.

## Prompt

**Create `policy simulate` to replay historical queries under a candidate policy and emit diffs (allowed/blocked, rationale). Bundle a license/TOS compiler that enforces source-term blockers at query and export time, with human-readable appeals and audit logs.**

### Core Requirements

**(a) Policy Simulation CLI**

```bash
# Simulate policy change
policy-sim simulate \
  --current policies/current.rego \
  --candidate policies/candidate.rego \
  --query-log query-history.jsonl \
  --output simulation-report.html

# Example output:
# Policy Simulation Report
# =======================
# Current Policy: v2.3.1
# Candidate Policy: v2.4.0-rc1
# Queries Analyzed: 10,000
#
# Impact Summary:
# - Newly Allowed: 150 queries (1.5%)
# - Newly Blocked: 23 queries (0.23%)
# - Changed Rationale: 47 queries (0.47%)
# - Unchanged: 9,780 queries (97.8%)
#
# Breaking Changes: 23 queries newly blocked
# ⚠️  RECOMMEND: Review breaking changes before deployment
```

Diff format:
```json
{
  "queryId": "q-12345",
  "query": "MATCH (e:Entity {classification: 'SECRET'}) RETURN e",
  "user": "analyst-42",
  "timestamp": "2025-11-15T10:30:00Z",
  "currentPolicy": {
    "allowed": false,
    "reason": "User lacks SECRET clearance"
  },
  "candidatePolicy": {
    "allowed": true,
    "reason": "New policy allows with NTK justification"
  },
  "impactCategory": "newly_allowed",
  "breakingChange": false
}
```

**(b) License/TOS Compiler**

Define source license constraints in YAML:

```yaml
# source-licenses.yml
sources:
  - id: commercial-db-alpha
    name: "Commercial Database Alpha"
    license:
      type: proprietary
      terms:
        - no_export: true  # Cannot export data externally
        - internal_use_only: true
        - attribution_required: true
        - time_limited: "2025-12-31"
      restrictions:
        - type: query_limit
          max_queries_per_day: 1000
        - type: user_limit
          max_concurrent_users: 50

  - id: open-source-feed
    name: "Open Source Threat Feed"
    license:
      type: cc-by-4.0
      terms:
        - attribution_required: true
        - commercial_use_allowed: true
        - modifications_allowed: true

  - id: classified-intel
    name: "Classified Intelligence"
    license:
      type: government-classified
      terms:
        - clearance_required: "SECRET"
        - need_to_know: true
        - export_controlled: true
        - retention_period: "7_years"
```

Compile to OPA policy:

```rego
# auto-generated from source-licenses.yml
package licenses

# Check if query accesses export-restricted source
deny_export[msg] {
  input.action == "export"
  source := input.data_sources[_]
  license := data.sources[source]
  license.terms.no_export == true
  msg := sprintf("Export blocked: source '%s' prohibits export", [source])
}

# Check query limits
deny_query_limit[msg] {
  input.action == "query"
  source := input.data_sources[_]
  license := data.sources[source]
  limit := license.restrictions[_]
  limit.type == "query_limit"
  count := query_count(input.user, source, today())
  count >= limit.max_queries_per_day
  msg := sprintf("Query limit exceeded for '%s' (%d/%d)", [source, count, limit.max_queries_per_day])
}

# Helper: count queries today
query_count(user, source, date) = count {
  logs := data.audit_logs[user][source][date]
  count := count(logs)
}
```

**(c) Runtime Enforcement**

Intercept queries and exports:

```typescript
interface LicenseEnforcer {
  // Check if action is allowed
  checkAction(action: Action): Promise<EnforcementResult>;

  // Record action for quota tracking
  recordAction(action: Action): Promise<void>;
}

interface Action {
  type: 'query' | 'export' | 'share';
  user: User;
  dataSources: string[];  // IDs of accessed sources
  query?: string;
  exportFormat?: string;
}

interface EnforcementResult {
  allowed: boolean;
  blockedBy?: string[];  // License IDs that blocked
  rationale: string;
  appealable: boolean;
  quotaRemaining?: {
    [sourceId: string]: {
      queriesRemaining: number;
      resetsAt: Date;
    };
  };
}

// Example usage in GraphQL resolver
async function entityResolver(parent, args, context) {
  const dataSources = await identifyDataSources(args);
  const action: Action = {
    type: 'query',
    user: context.user,
    dataSources,
    query: context.query
  };

  const enforcement = await licenseEnforcer.checkAction(action);

  if (!enforcement.allowed) {
    throw new ApolloError(
      enforcement.rationale,
      'LICENSE_VIOLATION',
      { appealable: enforcement.appealable }
    );
  }

  // Proceed with query
  await licenseEnforcer.recordAction(action);
  return entityService.find(args);
}
```

**(d) Human-Readable Appeals**

Appeals workflow:

```typescript
interface Appeal {
  id: string;
  actionId: string;  // Original blocked action
  user: User;
  justification: string;
  status: 'pending' | 'approved' | 'denied';
  reviewer?: User;
  reviewedAt?: Date;
  reviewNotes?: string;
}

interface AppealService {
  // Submit appeal
  submitAppeal(actionId: string, justification: string): Promise<Appeal>;

  // Review appeal (ombuds role)
  reviewAppeal(appealId: string, decision: 'approve' | 'deny', notes: string): Promise<Appeal>;

  // If approved, grant temporary exemption
  grantExemption(appeal: Appeal): Promise<PolicyExemption>;
}

// GraphQL mutations
extend type Mutation {
  submitAppeal(actionId: ID!, justification: String!): Appeal!
  reviewAppeal(appealId: ID!, decision: AppealDecision!, notes: String): Appeal!
}
```

UI flow:
1. User attempts export → blocked
2. Error message includes "This action is appealable. Click here to submit justification."
3. User writes justification: "Needed for court testimony in ongoing case XYZ"
4. Appeal routed to ombuds
5. Ombuds reviews, approves with time-limited exemption
6. User can now export with exemption logged to audit trail

**(e) Audit Logging**

All enforcement events logged:

```sql
CREATE TABLE license_enforcement_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  data_sources TEXT[] NOT NULL,
  allowed BOOLEAN NOT NULL,
  blocked_by TEXT[],
  rationale TEXT,
  appeal_id UUID,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE policy_exemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id UUID NOT NULL REFERENCES appeals(id),
  user_id UUID NOT NULL,
  data_sources TEXT[] NOT NULL,
  granted_by UUID NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);
```

### Technical Specifications

**Service Structure**:
```
services/policy-simulator/
├── src/
│   ├── simulator/
│   │   ├── SimulationEngine.ts
│   │   └── DiffGenerator.ts
│   ├── license/
│   │   ├── LicenseCompiler.ts
│   │   ├── LicenseEnforcer.ts
│   │   └── AppealService.ts
│   ├── cli/
│   └── api/
├── tests/
│   ├── policies/
│   ├── query-logs/
│   └── license-scenarios/
└── README.md
```

### Deliverables Checklist

- [x] Policy simulation engine
- [x] CLI tool (simulate, compile, validate)
- [x] License YAML compiler → OPA Rego
- [x] Runtime license enforcer
- [x] Appeal submission workflow
- [x] Appeal review UI (React)
- [x] Audit logging
- [x] Simulation report generator (HTML)
- [x] Policy regression test suite
- [x] README with authoring guide

### Acceptance Criteria

1. **Policy Simulation**
   - [ ] Replay 1000 historical queries
   - [ ] Identify breaking changes
   - [ ] Generate HTML report

2. **License Enforcement**
   - [ ] Block query accessing restricted source
   - [ ] Verify rationale shown to user
   - [ ] Check audit log entry created

3. **Appeals**
   - [ ] Submit appeal for blocked action
   - [ ] Ombuds approves appeal
   - [ ] User can now perform action (within exemption window)

4. **Quota Tracking**
   - [ ] Enforce daily query limit
   - [ ] Reset quota at midnight
   - [ ] Show remaining quota to user

## Implementation Notes

### Policy Regression Testing

Maintain golden query set:
```yaml
# policy-regression-tests.yml
tests:
  - name: "Admin can access all entities"
    user: admin-user
    query: "MATCH (e:Entity) RETURN e LIMIT 10"
    expected_allowed: true

  - name: "Analyst cannot export classified"
    user: analyst-user
    query: "MATCH (e:Entity {classification: 'SECRET'}) RETURN e"
    export: true
    expected_allowed: false
    expected_reason: "Export blocked: classification level too high"
```

Run on every policy change:
```bash
policy-sim test --tests policy-regression-tests.yml
```

### License Compiler Optimizations

- Cache compiled Rego
- Precompute query limits (avoid runtime DB lookups)
- Use OPA partial evaluation for faster checks

## References

- [Open Policy Agent](https://www.openpolicyagent.org/)
- [Creative Commons Licenses](https://creativecommons.org/licenses/)

## Related Prompts

- **MIG-001**: Migration Verifier (test policy on migrated data)
- **DQ-001**: Data Quality Dashboard (policy-labeled metrics)
- **GOV-002**: Retention & Purge (policy-driven lifecycle)
