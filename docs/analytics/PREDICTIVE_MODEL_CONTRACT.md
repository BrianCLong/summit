# Predictive Analytics Contract

**Version:** 1.0
**Status:** ACTIVE
**Scope:** All predictive analytics operations in Summit
**Authority:** Governance-as-Code Framework

---

## Purpose

This contract defines **exactly what prediction means** in Summit and establishes **non-negotiable boundaries** for all predictive analytics operations.

**Core Principle:** Predictions are **advisory tools under governance**, not autonomous decision-makers.

---

## 1. Supported Prediction Types

Summit supports the following prediction types, and **only** these types:

### 1.1 Trend Analysis

**Definition:** Projection of historical patterns into future time periods.

**Allowed:**

- Compliance metric trends (gap reduction, evidence accumulation)
- Policy violation frequency projections
- Agent performance trends
- Resource utilization forecasts

**Prohibited:**

- Business outcome predictions (revenue, market share)
- Personnel performance predictions
- Predictions beyond 90-day horizon without explicit approval

**Output Form:** Time-series with confidence intervals

---

### 1.2 Risk Assessment

**Definition:** Likelihood estimation of adverse events or conditions.

**Allowed:**

- Audit failure risk
- Policy drift risk
- Security vulnerability likelihood
- Compliance gap severity
- Data quality degradation risk

**Prohibited:**

- Individual behavioral risk scoring
- Automated risk-based access decisions
- Predictions of human intent or motivation

**Output Form:** Risk score (0-1) with contributing factors

---

### 1.3 Likelihood Scoring

**Definition:** Probability estimation for discrete future events.

**Allowed:**

- Audit outcome prediction (pass/fail/findings)
- Policy conflict likelihood
- System anomaly probability
- Remediation success likelihood

**Prohibited:**

- Certainty claims (predictions must express uncertainty)
- Predictions used as sole decision criterion

**Output Form:** Probability distribution with confidence bounds

---

### 1.4 Anomaly Detection

**Definition:** Identification of statistically significant deviations from baseline.

**Allowed:**

- Metric outliers (Z-score, MAD, ratio-based)
- Behavioral anomalies in agent or system activity
- Data quality anomalies
- Unusual graph patterns

**Prohibited:**

- Anomaly detection without explainable baseline
- Automated enforcement based solely on anomaly signals

**Output Form:** Anomaly score with baseline comparison

---

### 1.5 What-If Simulation

**Definition:** Counterfactual analysis of hypothetical scenarios.

**Allowed:**

- Policy change impact simulation
- Resource allocation scenarios
- Remediation path comparison
- Architecture change impact

**Prohibited:**

- Unbounded simulation (must have defined end state)
- Simulations that modify production state
- Cascading what-if scenarios without approval

**Output Form:** Scenario comparison with delta metrics

---

## 2. Input Data Sources (Explicit Only)

Predictions **must** declare their input data sources. No implicit or inferred data sources are permitted.

### Allowed Sources

| Source Type              | Example                          | Access Pattern                    |
| ------------------------ | -------------------------------- | --------------------------------- |
| **Knowledge Graph**      | Entity relationships, properties | GraphQL queries with tenant scope |
| **Audit Events**         | Historical compliance actions    | Append-only audit store           |
| **Telemetry Aggregates** | Usage metrics, performance data  | Aggregated time-series            |
| **Policy State**         | Active policies, rules, tags     | Policy registry snapshots         |
| **Agent Execution Logs** | Run histories, outcomes          | Agent audit logs                  |
| **Compliance Evidence**  | Artifacts, test results          | Evidence repositories             |

### Prohibited Sources

- Real-time user input without consent
- Cross-tenant data without explicit authorization
- External data without provenance
- Sensitive PII fields (SSN, credentials, health data)
- Un-scrubbed telemetry data

### Data Freshness Declaration

Every prediction **must** declare:

- Oldest data timestamp used
- Data staleness tolerance
- Refresh frequency

---

## 3. Output Forms (Structured Only)

All predictions **must** return structured outputs conforming to these schemas:

### 3.1 Prediction Score

```typescript
interface PredictionScore {
  predictionId: string; // UUID
  type: PredictionType; // From section 1
  value: number; // Score or probability
  confidence: number; // 0-1, required
  range?: { min: number; max: number };
  unit: string; // e.g., "probability", "risk_score"
  timestamp: string; // ISO 8601
}
```

### 3.2 Ranked Hypotheses

```typescript
interface RankedHypothesis {
  predictionId: string;
  hypotheses: Array<{
    rank: number;
    scenario: string;
    likelihood: number; // 0-1
    impact: "low" | "medium" | "high" | "critical";
    supportingEvidence: string[];
  }>;
  timestamp: string;
}
```

### 3.3 Trend Forecast

```typescript
interface TrendForecast {
  predictionId: string;
  metric: string;
  baseline: number;
  forecast: Array<{
    timestamp: string;
    value: number;
    confidenceInterval: { lower: number; upper: number };
  }>;
  assumptions: string[];
}
```

### Prohibited Outputs

- Free-form text claims without structured data
- Predictions without confidence scores
- Binary outcomes without probability
- Aggregated predictions hiding individual scores

---

## 4. Prohibited Uses

The following uses of predictive analytics are **explicitly prohibited**:

### 4.1 Automated Decision-Making Without Human Review

- No prediction may trigger enforcement actions without human approval
- No access control decisions based solely on predictions
- No automated resource allocation exceeding defined thresholds

### 4.2 Sensitive Inference

- No predictions of protected class membership
- No behavioral profiling for surveillance
- No predictive screening of individuals

### 4.3 Self-Modifying Predictions

- No prediction models that update their own weights without approval
- No reinforcement learning on production predictions
- No automated A/B testing of prediction algorithms

### 4.4 Cascading Predictions

- No using prediction outputs as inputs to other predictions without governance check
- No multi-hop inference chains exceeding 2 steps
- No recursive prediction loops

---

## 5. Required Metadata (Non-Optional)

Every prediction output **must** include this metadata envelope:

```typescript
interface PredictionMetadata {
  // Identification
  predictionId: string; // UUID
  predictionType: PredictionType; // From section 1
  modelVersion: string; // Semantic version

  // Governance
  governanceVerdict: GovernanceVerdict; // Policy evaluation result
  capabilityAuthorization: string; // Agent capability ID
  tenantId: string; // Tenant scope

  // Confidence & Quality
  confidence: number; // 0-1, required
  assumptions: string[]; // Explicit assumptions
  limitations: string[]; // Known limitations

  // Data Provenance
  dataSources: Array<{
    type: string;
    query: string;
    timestamp: string;
    recordCount: number;
  }>;
  dataFreshness: {
    oldestRecord: string; // ISO 8601
    youngestRecord: string; // ISO 8601
    stalenessTolerance: string; // ISO 8601 duration
  };

  // Execution
  executionTime: number; // Milliseconds
  resourceUsage: {
    cpuMs: number;
    memoryMb: number;
    tokenCount?: number; // For LLM-based predictions
  };

  // Explainability
  explanation: {
    method: string; // Algorithm/approach
    featureImportance?: Record<string, number>;
    topFactors: string[]; // Human-readable factors
  };

  // Audit
  timestamp: string; // ISO 8601
  auditLogId?: string; // Reference to audit log
}
```

**Enforcement:** Predictions without complete metadata are invalid and must be rejected.

---

## 6. Confidence & Uncertainty Expression

### 6.1 Confidence Scoring (Mandatory)

All predictions **must** include a confidence score (0-1) representing:

- Data quality and freshness
- Model accuracy on validation data
- Assumption validity
- Input completeness

**Confidence Bands:**

- `0.0 - 0.4`: Low confidence (advisory only, human review required)
- `0.4 - 0.7`: Medium confidence (suitable for recommendations)
- `0.7 - 0.9`: High confidence (suitable for decision support)
- `0.9 - 1.0`: Very high confidence (rare, requires justification)

### 6.2 Uncertainty Visualization

Where applicable, predictions should include:

- Confidence intervals (for numeric predictions)
- Probability distributions (for categorical predictions)
- Sensitivity analysis (how assumptions affect outcomes)

### 6.3 Confidence Decay

Prediction confidence **decays over time**:

- Initial confidence: As computed
- After 24 hours: 95% of initial
- After 7 days: 80% of initial
- After 30 days: 50% of initial

Expired predictions (confidence < threshold) must be refreshed or discarded.

---

## 7. Governance Integration

### 7.1 Capability Requirement

All predictive operations require:

- Declared agent capability: `predictive_analytics`
- Sub-capability for prediction type (e.g., `trend_analysis`, `risk_assessment`)
- Policy check before execution

### 7.2 Policy Hooks

Predictions are subject to these policy checks:

**Pre-Execution:**

- Capability authorization check
- Data source access validation
- Resource budget check (time, memory, tokens)

**Post-Execution:**

- Output schema validation
- Metadata completeness check
- Confidence threshold enforcement
- Prohibited use detection

### 7.3 Audit Requirements

Every prediction must generate an audit event:

```json
{
  "eventType": "prediction_executed",
  "predictionId": "uuid",
  "predictionType": "risk_assessment",
  "tenantId": "tenant-123",
  "agentId": "agent-456",
  "confidence": 0.82,
  "dataSources": ["graph", "audit_logs"],
  "governanceVerdict": "ALLOW",
  "timestamp": "2025-12-31T10:30:00Z"
}
```

---

## 8. Model Versioning & Validation

### 8.1 Model Versions

All prediction models must:

- Use semantic versioning (MAJOR.MINOR.PATCH)
- Document model changes in CHANGELOG
- Maintain backward compatibility for MINOR/PATCH

**Version Increment Rules:**

- MAJOR: Breaking changes to inputs/outputs
- MINOR: New features, improved accuracy
- PATCH: Bug fixes, performance improvements

### 8.2 Validation Requirements

Before deployment, models must:

- Pass accuracy tests on held-out validation data
- Document baseline performance metrics
- Include regression tests
- Provide example inputs/outputs

### 8.3 Model Registry

All models are registered in:

```typescript
interface PredictionModelRegistry {
  modelId: string;
  version: string;
  type: PredictionType;
  accuracy: { metric: string; value: number };
  deployedAt: string;
  validatedAt: string;
  validationResults: ValidationReport;
}
```

---

## 9. Explainability Requirements

Every prediction **must** provide an explanation including:

### 9.1 Method Transparency

- Algorithm/approach used (e.g., "linear regression", "z-score anomaly detection")
- Mathematical basis (reference to documentation)
- Assumptions made

### 9.2 Feature Importance

- Which input features contributed most to the prediction
- Relative importance scores (if applicable)
- Feature value ranges used

### 9.3 Human-Readable Factors

- Top 3-5 factors in plain language
- Example: "High risk due to: (1) 15 open compliance gaps, (2) upcoming audit deadline, (3) recent policy violations"

### 9.4 Counterfactual Explanation (Where Applicable)

- What would need to change for a different prediction
- Example: "To achieve 'low risk', reduce open gaps to < 5"

---

## 10. Resource Limits & Budgets

All predictive operations are subject to hard limits:

### 10.1 Execution Limits

| Resource           | Limit                                    | Enforcement                       |
| ------------------ | ---------------------------------------- | --------------------------------- |
| **Execution Time** | 30 seconds default, 5 minutes max        | Hard timeout, process termination |
| **Memory**         | 512 MB default, 2 GB max                 | Container limit, OOM kill         |
| **CPU**            | 1 CPU-second default, 10 CPU-seconds max | Resource accounting               |
| **Token Budget**   | 10,000 tokens (LLM predictions)          | Token counter, early termination  |
| **Data Rows**      | 100,000 rows default, 1M max             | Query result limit                |

### 10.2 Rate Limits

| Scope          | Limit              | Window |
| -------------- | ------------------ | ------ |
| **Per Agent**  | 100 predictions    | 1 hour |
| **Per Tenant** | 1,000 predictions  | 1 hour |
| **Per Model**  | 10,000 predictions | 1 hour |

### 10.3 Budget Exhaustion

When limits are exceeded:

- Prediction is terminated with `BUDGET_EXCEEDED` error
- Partial results are discarded (no partial predictions)
- Audit event is generated
- Retry is blocked for cooldown period (5 minutes)

---

## 11. Determinism & Reproducibility

### 11.1 Deterministic Execution (Where Feasible)

For the same inputs, predictions should return the same outputs:

- Use fixed random seeds for stochastic methods
- Document non-deterministic components (e.g., LLM sampling)
- Provide reproducibility guarantees where possible

### 11.2 Prediction Caching

Identical prediction requests within a time window may be cached:

- Cache TTL: 5 minutes default, configurable
- Cache key includes: input hash, model version, tenant ID
- Cache invalidation on model update

### 11.3 Replay & Verification

All predictions can be replayed for verification:

- Input data is logged (subject to retention policy)
- Prediction can be re-executed with same inputs
- Divergence between original and replayed results triggers alert

---

## 12. Compliance & Certification

### 12.1 Framework Alignment

This contract ensures compliance with:

- **SOC 2:** CC6.1 (Logical access), CC7.2 (System monitoring)
- **ISO 27001:** A.18.1.4 (Privacy impact assessment)
- **GDPR:** Article 22 (Automated decision-making), Article 13 (Transparency)
- **NIST AI RMF:** GOVERN 1.1, MAP 1.1, MEASURE 2.1

### 12.2 Prohibited Jurisdictions

Certain prediction types may be prohibited in specific jurisdictions:

- EU: Automated decision-making with legal/significant effect (GDPR Article 22)
- California: Profiling without explicit consent (CCPA/CPRA)

**Enforcement:** Tenant location determines applicable restrictions.

### 12.3 Certification Requirements

Predictive models used in regulated contexts require:

- Annual validation review
- Bias testing on protected attributes
- Fairness metrics documentation
- Third-party audit (for high-risk predictions)

---

## 13. Violation & Enforcement

### 13.1 Contract Violations

The following are **contract violations**:

- Executing predictions without required capability
- Missing mandatory metadata fields
- Using prohibited data sources
- Exceeding resource limits
- Bypassing policy checks

### 13.2 Enforcement Actions

| Severity     | Violation Type                         | Action                                                       |
| ------------ | -------------------------------------- | ------------------------------------------------------------ |
| **Critical** | Prohibited use, policy bypass          | Immediate termination, agent suspension, audit alert         |
| **High**     | Missing metadata, governance violation | Prediction rejection, warning, escalation after 3 violations |
| **Medium**   | Resource limit exceeded, stale data    | Prediction failure, cooldown period                          |
| **Low**      | Low confidence without disclosure      | Warning, metadata enhancement required                       |

### 13.3 Audit Trail

All violations are logged:

```json
{
  "eventType": "prediction_contract_violation",
  "violationType": "missing_metadata",
  "severity": "high",
  "predictionId": "uuid",
  "agentId": "agent-456",
  "details": "Missing confidence score",
  "enforcementAction": "REJECT",
  "timestamp": "2025-12-31T10:30:00Z"
}
```

---

## 14. Review & Evolution

### 14.1 Contract Versioning

This contract is versioned:

- Current version: 1.0
- Review frequency: Quarterly
- Change authority: Governance Board

### 14.2 Feedback Loop

Prediction performance is monitored:

- Accuracy tracking (actual vs. predicted)
- Confidence calibration (claimed vs. realized)
- False positive/negative rates

Findings inform contract updates.

### 14.3 Deprecation Policy

When prediction types are deprecated:

- 90-day notice period
- Migration guide provided
- Fallback to similar prediction type
- Audit log retention extended

---

## 15. Summary: The Contract in One Page

**What predictions are:**

- Advisory tools under governance
- Structured, explainable, confidence-scored outputs
- Time-bounded, resource-limited operations

**What predictions are NOT:**

- Autonomous decision-makers
- Substitutes for human judgment
- Certain or guaranteed outcomes

**Non-negotiable requirements:**

- Declared capability and policy check
- Complete metadata envelope
- Explainability payload
- Audit trail
- Resource limits

**Prohibited:**

- Automated enforcement without human review
- Sensitive inference (profiling, behavioral prediction)
- Unbounded or cascading predictions
- Data sources without provenance

**Governance:**

- All predictions pass through PolicyEngine
- Violations trigger enforcement actions
- Full audit trail required
- Quarterly contract review

---

**This contract is the foundation of predictive analytics in Summit. No prediction exists outside this contract.**

**Effective Date:** 2025-12-31
**Next Review:** 2026-03-31
**Authority:** Summit Governance-as-Code Framework
**Enforcement:** Mandatory, automated, audited
