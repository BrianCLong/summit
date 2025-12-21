# NRR Engine Blueprint

## Overview
This blueprint defines the "NRR Engine" designed to make expansion the default outcome for the platform. It encompasses data models, strategic levers, and operational workflows.

## 1. Expansion Levers
We define the following primary levers for driving Net Revenue Retention (NRR):
- **Seats**: User-based licensing expansion.
- **Usage**: Consumption-based metrics (e.g., API calls, storage, active entities).
- **Modules**: Cross-selling additional product modules (e.g., "Cognitive Ops", "PsyOps Defense").
- **Enterprise Controls**: Upgrading for governance features (SSO, Audit Logs, RBAC).
- **Outcomes-based Pricing**: Pricing tied to specific value metrics (e.g., "Threats Mitigated").

## 2. NRR Decomposition Dashboard
A dashboard to visualize the components of NRR:
- **New ARR**: Revenue from new customers.
- **Expansion ARR**: Additional revenue from existing customers (Upsell/Cross-sell).
- **Contraction ARR**: Lost revenue from downgrades.
- **Churn ARR**: Lost revenue from cancellations.
- **Net ARR**: (New + Expansion) - (Contraction + Churn).

## 3. Segmentation & Cohorts
Customers are segmented by:
- **ICP (Ideal Customer Profile)**: High/Medium/Low fit.
- **Plan**: Starter, Professional, Enterprise.
- **Industry**: Defense, Finance, Tech, etc.

**Cohort Analysis**:
- Track NRR performance by cohort (e.g., "Enterprise - Finance - Q1 2024").
- Identify "Best" (High NRR) and "Worst" (High Churn) cohorts.

## 4. NRR Targets
- Targets are set per segment.
- Owners are assigned to each segment/target.

## 5. Top 10 Expansion Blockers
Identified systemic blockers to be tracked:
1. Product Gaps
2. Packaging/Pricing Friction
3. Procurement Complexity
4. Low Adoption/Activation
5. Integration Difficulty
6. Lack of Executive Sponsorship
7. Poor Onboarding Experience
8. Technical Debt/Bugs
9. Missing Compliance/Security Features
10. Budget Constraints

## 6. Customer Growth Plan
A template for CSMs to drive growth:
- **Current State**: Metrics, Adoption.
- **Desired Outcomes**: Customer goals.
- **Gap Analysis**: What is missing?
- **Action Plan**: Steps to achieve outcomes (Training, New Features, etc.).
- **Timeline**: Milestones.

## 7. Renewal Calendar & Risk Scoring
- **Renewal Date**: Tracked for every contract.
- **Risk Score**: Calculated based on health signals (0-100).
- **Intervention**: Automatic alerts 90/60/30 days before renewal for high-risk accounts.

## 8. "No Surprise Renewals" Policy
- **QBR Cadence**: Quarterly Business Reviews required for Enterprise.
- **Value Proof**: Every renewal conversation must start with a "Value Report" showing realized value.

## 9. Expansion Forecast Model
- **Leading Indicators**:
    - Active Users (WAU/MAU)
    - Admin Activity
    - Integration Usage
    - Feature Adoption Depth
- **Forecast**: Probabilistic model predicting expansion based on indicators.

## 10. Roadmap Capacity
- **Allocation**: A percentage of engineering roadmap is explicitly tied to fixing "Top Churn Drivers" and unlocking "Top Expansion Levers".

## 11. Operational Hygiene
- **Vanity Metrics**: Remove metrics that do not correlate with Renewal or Expansion (e.g., "Emails Sent" vs "Meetings Booked").
