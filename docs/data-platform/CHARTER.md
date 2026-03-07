# Data Platform Charter

## 1. Mission

To build a centralized, trusted, and scalable data platform that serves as the single source of truth for all analytics, reporting, and data-driven decision-making across the organization. Our goal is to empower every team with timely, accurate, and accessible data while ensuring governance, security, and cost-efficiency.

## 2. Scope

This charter governs all data infrastructure, pipelines, and datasets used for analytical purposes. This includes:

- The canonical analytics warehouse and all associated data marts.
- ETL/ELT processes and orchestration.
- BI and data visualization tools.
- Data models and metric definitions.
- Data governance, quality, and access control.

This charter explicitly prohibits the creation and use of "shadow data marts," spreadsheets, or any other unsanctioned data stores for analytics.

## 3. Principles

- **Single Source of Truth:** All analytical queries and reports must originate from the canonical data spine. If it's not in the spine, it's not a trusted fact.
- **Data as a Product:** Datasets are treated as products with clear owners, SLAs, and documentation.
- **Governance by Default:** Data quality, security, and privacy are not afterthoughts. All new datasets and pipelines must adhere to the governance framework from inception.
- **Self-Serve Empowerment:** We will provide the tools, training, and documentation necessary for users to safely and effectively access and analyze data on their own.
- **Efficiency and Scalability:** The platform will be designed to be cost-effective and capable of scaling with the needs of the business.
- **Transparency:** All data platform work, from roadmap to incidents, will be conducted in a transparent manner.
