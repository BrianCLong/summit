# [Title] - Discovery Output

| Metadata         | Value                              |
| :--------------- | :--------------------------------- |
| **Discovery ID** | `DISC-XXX`                         |
| **Owner**        | @user                              |
| **Status**       | In Progress / Complete / Abandoned |
| **Decision**     | Go / No-Go                         |
| **Reviewers**    | @reviewer1, @reviewer2             |
| **Date**         | YYYY-MM-DD                         |

## 1. Executive Summary

_Briefly describe the problem and the outcome of the discovery._

## 2. Outputs

### Prototype / Spike Results

_Link to the prototype code or PRs. Summarize findings._

### Feasibility Analysis

_Is this technically possible? What are the hard constraints?_

### Cost Analysis

_Estimated development cost (time/people) and operational cost (infra)._

- **Effort Estimate**: [Low/Medium/High] with confidence band (e.g., 4-6 weeks).

### Technical Risk Register

| Risk                   | Likelihood | Impact | Mitigation                               |
| :--------------------- | :--------- | :----- | :--------------------------------------- |
| e.g., Latency too high | High       | High   | Use Redis caching, prototype shows <50ms |
| e.g., Vendor limit     | Med        | High   | Request quota increase                   |

## 3. Validation

### Customer/Stakeholder Evidence

_Who did we talk to? What did they say?_

- Customer A: "Liked it, but needs X."
- Stakeholder B: "Approved."

## 4. Platform Primitives Identified

_What shared components do we need to build or use?_

- e.g., New Event Bus topic
- e.g., Vector Database

## 5. Recommendation

### Go / No-Go Decision

_Why?_

### Next Steps

- [ ] Convert to Spec
- [ ] Schedule work
- [ ] Archive findings
