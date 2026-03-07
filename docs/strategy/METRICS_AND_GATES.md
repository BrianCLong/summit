# Success Metrics, Gates & Kill Criteria

**Status:** Draft
**Purpose:** Define objective signals for investment and de-investment.

---

## Bet 1: Regulated Agentic Marketplace

### Metrics

- **Adoption:** # of Active 3rd Party Agents deployed.
- **Trust:** % of Agents with "Verified" badge usage.
- **Revenue:** Monthly Gross Merchandise Value (GMV) of agent transactions.

### Gates

- **Gate 1 (Alpha -> Beta):** 3 External Partners signed up to build agents. Security Sandbox Audit passed.
- **Gate 2 (Beta -> GA):** $10k Monthly GMV. Zero "Critical" security incidents in sandbox.

### Kill Criteria

- **Security Failure:** Uncontainable sandbox escape demonstrated.
- **Market Apathy:** < 5 Active Agents after 6 months of Alpha.

---

## Bet 2: Continuous Assurance (CAaaS)

### Metrics

- **Adoption:** % of Enterprise Tenants enabling "Compliance Mode".
- **Value:** # of Automated Evidence Artifacts generated per month.
- **Churn:** Retention rate of "Compliance Mode" customers vs. standard.

### Gates

- **Gate 1:** Successful SOC2 Type 1 audit using _only_ Summit-generated evidence (Dogfooding).
- **Gate 2:** 5 Customers using the feature for their own external audits.

### Kill Criteria

- **Liability Risk:** Legal determination that we cannot limit liability for failed audits.
- **Tech Failure:** Inability to reliably capture >99.9% of required audit events.

---

## Bet 3: Cognitive Defense Platform

### Metrics

- **Efficacy:** % of "High Severity" narrative threats detected before viral inflection point (Simulation or Real).
- **Usage:** Daily Active Users (DAU) in the Threat Dashboard.
- **Data Health:** % of Data Connectors remaining healthy (not blocked) > 30 days.

### Gates

- **Gate 1:** Ingesting > 1M documents/day with < 500ms latency.
- **Gate 2:** 3 Reference Customers paying > $50k ARR.

### Kill Criteria

- **Data Starvation:** Loss of access to 2+ major data sources (e.g., X and Meta APIs revoked).
- **Accuracy Failure:** False Positive Rate > 10% making the tool noisy/useless.

---

## Bet 4: Auto-Scientist SDK

### Metrics

- **Engagement:** Weekly Active Developers (WAD).
- **Utility:** # of Experiments run per active user.

### Gates

- **Gate 1:** SDK published to internal PyPI, successful integration by "Black Project" team.
- **Gate 2:** 10 External downloads/activations.

### Kill Criteria

- **Adoption Failure:** < 3 Active users after 3 months.
- **Support Load:** Support costs > Revenue.

---

## Monitoring & Reporting

- **Dashboard:** All metrics to be tracked in the "Strategy HQ" Grafana dashboard.
- **Review Cadence:** Monthly "Strategy Review" meeting.
- **Action:** If a "Kill Criterion" is met, an immediate "Stop Work" order is triggered for review.
