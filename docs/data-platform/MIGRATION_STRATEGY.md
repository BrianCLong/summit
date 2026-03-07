# Migration and Decommissioning Strategy

This document outlines the official strategy for migrating valuable analytical assets from legacy systems and shadow data marts into the canonical data platform. It also establishes a clear process for decommissioning redundant or untrusted datasets.

## 1. Migration Philosophy

Our approach is to systematically migrate and centralize all critical analytics, rather than attempting a "big bang" migration. The primary goals are to ensure business continuity, build trust in the new platform, and methodically retire legacy systems.

- **Prioritization:** Migration efforts will be prioritized based on business impact, data criticality, and the level of risk associated with the legacy system.
- **Validation:** Before decommissioning any legacy asset (e.g., a spreadsheet, a shadow mart), the corresponding new dataset or dashboard in the canonical stack must be validated for accuracy and completeness by the relevant business stakeholders.
- **Communication:** A clear communication plan will accompany each migration, ensuring that all affected users are aware of the timeline, changes, and new location for their data.

## 2. Migration Process

The migration from a legacy system to the canonical data platform will follow these steps:

1.  **Discovery & Assessment:** Identify and catalog existing shadow marts, critical spreadsheets, and other non-canonical data sources. Assess their business value, usage, and data quality.
2.  **Prioritization:** The Data Council will prioritize the migration backlog quarterly based on the assessment.
3.  **Migration & Development:** The data team will ingest the source data into the warehouse, remodel it to conform to the new standards, and rebuild any associated reports or dashboards in the official BI tool.
4.  **Validation (Dual-Run Period):** For a defined period (e.g., one month), both the legacy and new systems will run in parallel. Business users will be responsible for validating that the new system produces the same or more accurate results.
5.  **Cutover:** Once validated, all users will be switched over to the new system. Links to the legacy asset will be redirected to the new one.
6.  **Decommissioning:** After a successful cutover and a brief "cool-down" period (e.g., two weeks), the legacy asset will be archived (read-only) and eventually deleted.

## 3. Deletion Quota and Exceptions

To ensure steady progress in eliminating data fragmentation, a deletion quota is established.

- **Deletion Quota:** We will retire a minimum of **X shadow datasets per month**. A "shadow dataset" can be a critical analytical spreadsheet, a departmental data mart, or a set of duplicate metric tables.
- **Tracking:** Progress against this quota will be tracked and reported in the monthly Data Platform Release Notes.

### Exceptions Registry

While the goal is to eliminate all non-canonical datasets, temporary exceptions may be granted under specific circumstances (e.g., a short-term experiment, a data source with no available ingestion connector).

- **Request Process:** All exceptions must be requested through a formal process and approved by the Data Council.
- **Expiration Date:** No exception is permanent. Every approved exception will be entered into an **Exceptions Registry** and assigned an explicit expiration date (e.g., 3 months).
- **Review:** The registry will be reviewed quarterly to ensure that temporary datasets are not becoming permanent fixtures.
