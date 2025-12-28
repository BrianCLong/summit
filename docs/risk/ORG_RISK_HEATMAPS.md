# Summit Risk Heatmaps

**Last updated:** 2025-12-27

Heatmaps visualize likelihood × impact. Cells list Risk IDs (count). These are
**not normalized**; high-density cells indicate real concentration of risk.

## Global heatmap (all risks)

| Impact \ Likelihood | Low          | Medium                                                                                          | High                             |
| ------------------- | ------------ | ----------------------------------------------------------------------------------------------- | -------------------------------- |
| **Low**             | (0)          | (0)                                                                                             | (0)                              |
| **Medium**          | R-SEC-01 (1) | R-PUX-02, R-TECH-03, R-GOV-03, R-DEL-02, R-STR-03 (6)                                           | R-PUX-03, R-GOV-02, R-DEL-01 (3) |
| **High**            | (0)          | R-PUX-01, R-TECH-01, R-TECH-02, R-GOV-01, R-SEC-02, R-SEC-03, R-DEL-03, R-STR-01, R-STR-02 (10) | (0)                              |

## Category heatmaps

### Product & UX

| Impact \ Likelihood | Low | Medium       | High         |
| ------------------- | --- | ------------ | ------------ |
| **Low**             | (0) | (0)          | (0)          |
| **Medium**          | (0) | R-PUX-02 (1) | R-PUX-03 (1) |
| **High**            | (0) | R-PUX-01 (1) | (0)          |

### Technical & Reliability

| Impact \ Likelihood | Low | Medium                   | High |
| ------------------- | --- | ------------------------ | ---- |
| **Low**             | (0) | (0)                      | (0)  |
| **Medium**          | (0) | R-TECH-03 (1)            | (0)  |
| **High**            | (0) | R-TECH-01, R-TECH-02 (2) | (0)  |

### Governance & Compliance

| Impact \ Likelihood | Low | Medium       | High         |
| ------------------- | --- | ------------ | ------------ |
| **Low**             | (0) | (0)          | (0)          |
| **Medium**          | (0) | R-GOV-03 (1) | R-GOV-02 (1) |
| **High**            | (0) | R-GOV-01 (1) | (0)          |

### Security & Abuse

| Impact \ Likelihood | Low          | Medium                 | High |
| ------------------- | ------------ | ---------------------- | ---- |
| **Low**             | (0)          | (0)                    | (0)  |
| **Medium**          | R-SEC-01 (1) | (0)                    | (0)  |
| **High**            | (0)          | R-SEC-02, R-SEC-03 (2) | (0)  |

### Delivery & Execution

| Impact \ Likelihood | Low | Medium       | High         |
| ------------------- | --- | ------------ | ------------ |
| **Low**             | (0) | (0)          | (0)          |
| **Medium**          | (0) | R-DEL-02 (1) | R-DEL-01 (1) |
| **High**            | (0) | R-DEL-03 (1) | (0)          |

### Strategic & Capital

| Impact \ Likelihood | Low | Medium                 | High |
| ------------------- | --- | ---------------------- | ---- |
| **Low**             | (0) | (0)                    | (0)  |
| **Medium**          | (0) | R-STR-03 (1)           | (0)  |
| **High**            | (0) | R-STR-01, R-STR-02 (2) | (0)  |

## Horizon-based heatmaps

### Near-term (0-3 months)

| Impact \ Likelihood | Low          | Medium                                                | High                             |
| ------------------- | ------------ | ----------------------------------------------------- | -------------------------------- |
| **Low**             | (0)          | (0)                                                   | (0)                              |
| **Medium**          | R-SEC-01 (1) | R-PUX-02 (1)                                          | R-PUX-03, R-GOV-02, R-DEL-01 (3) |
| **High**            | (0)          | R-PUX-01, R-TECH-01, R-GOV-01, R-SEC-03, R-STR-02 (5) | (0)                              |

### Mid-term (3-9 months)

| Impact \ Likelihood | Low | Medium                                      | High |
| ------------------- | --- | ------------------------------------------- | ---- |
| **Low**             | (0) | (0)                                         | (0)  |
| **Medium**          | (0) | R-TECH-03, R-GOV-03, R-STR-03 (3)           | (0)  |
| **High**            | (0) | R-TECH-02, R-SEC-02, R-DEL-03, R-STR-01 (4) | (0)  |

### Long-term (9-18 months)

| Impact \ Likelihood | Low | Medium | High |
| ------------------- | --- | ------ | ---- |
| **Low**             | (0) | (0)    | (0)  |
| **Medium**          | (0) | (0)    | (0)  |
| **High**            | (0) | (0)    | (0)  |

## Lane-based slices (summary)

- **EXP:** No open risks in current register (requires validation each review).
- **GA-Adjacent:** R-PUX-02, R-TECH-02, R-GOV-03, R-DEL-01, R-STR-01.
- **GA:** All remaining risks (see master register).
