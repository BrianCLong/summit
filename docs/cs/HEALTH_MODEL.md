# Customer Health Model

The Customer Health Model provides a transparent and auditable score that reflects a customer's overall engagement and stability on the Summit Platform. The score is calculated based on a weighted average of several key factors, each with defined thresholds.

## Health Score Factors

The health score is composed of the following factors:

- **Adoption:** Measures the active usage of the platform.
- **SLO Compliance:** Tracks the adherence to defined Service Level Objectives.
- **Incident Frequency/Severity:** Monitors the impact of incidents on the customer.
- **Version Drift:** Measures how far a customer's deployment is from the latest release.
- **Security Exceptions:** Tracks the number and severity of security exceptions.

Each factor is assigned a weight, and the final health score is a number between 0 and 100, where 100 represents a perfectly healthy customer. The scoring is deterministic, and the breakdown of each factor is available for review.
