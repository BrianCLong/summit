# Platform Health Score Specification

This document defines the methodology for computing the Platform Health Score, a composite metric used to evaluate the overall state of the platform.

## Goal

To provide a single, quantifiable metric (0-100) that reflects the reliability, quality, efficiency, and security of the platform.

## Components & Weighting

The score is calculated as a weighted sum of the following components:

| Component        | Weight | Source                        | Metric                   | Target |
| ---------------- | ------ | ----------------------------- | ------------------------ | ------ |
| **Reliability**  | 35%    | `test-summary-junit.xml`      | Test Pass Rate           | 100%   |
| **Availability** | 20%    | Prometheus / SLOs             | Uptime / Error Rate      | 99.9%  |
| **Quality**      | 15%    | GitHub / Backlog              | Open Critical Bugs       | 0      |
| **Security**     | 15%    | Security Scan (`vulns-*.txt`) | Critical Vulnerabilities | 0      |
| **Efficiency**   | 10%    | Budget Tracker                | LLM Cost vs Budget       | < 100% |
| **Velocity**     | 5%     | Git / CI                      | PR Lead Time             | < 24h  |

## Formula

$$
\text{Health Score} = 0.35 \times S_{\text{reliability}} + 0.20 \times S_{\text{availability}} + 0.15 \times S_{\text{quality}} + 0.15 \times S_{\text{security}} + 0.10 \times S_{\text{efficiency}} + 0.05 \times S_{\text{velocity}}
$$

### Scoring Rules for Components

1.  **Reliability ($S_{\text{reliability}}$)**
    - $\frac{\text{Passed Tests}}{\text{Total Tests}} \times 100$

2.  **Availability ($S_{\text{availability}}$)**
    - If Error Rate < 0.1%: 100
    - If Error Rate < 1%: 80
    - If Error Rate < 5%: 50
    - Else: 0

3.  **Quality ($S_{\text{quality}}$)**
    - $100 - (5 \times \text{Open Critical Bugs})$
    - Minimum: 0

4.  **Security ($S_{\text{security}}$)**
    - $100 - (20 \times \text{Critical Vulnerabilities})$
    - Minimum: 0

5.  **Efficiency ($S_{\text{efficiency}}$)**
    - If Cost <= Budget: 100
    - If Cost <= 1.1 \* Budget: 80
    - Else: 50

6.  **Velocity ($S_{\text{velocity}}$)**
    - If Lead Time < 24h: 100
    - If Lead Time < 48h: 80
    - Else: 50

## Thresholds

- **🟢 Healthy**: Score >= 90
- **🟡 Degraded**: 70 <= Score < 90
- **🔴 Critical**: Score < 70

## Sampling

The score is computed daily via CI/CD pipeline and published to the dashboard.
