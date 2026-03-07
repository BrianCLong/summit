# Canonical Analytics Stack

As defined in the Data Platform Charter, the following technologies constitute the official, canonical stack for all analytics and business intelligence purposes. The use of any other data warehousing, processing, or visualization technology for analytics is prohibited without a formal exception granted by the Data Council.

## 1. Data Warehouse

- **Primary Warehouse:** [Specify primary warehouse technology, e.g., Snowflake, BigQuery, Redshift]
- **Rationale:** [Briefly explain why this technology was chosen, e.g., scalability, performance, cost-effectiveness, existing expertise.]

## 2. Data Ingestion & Transformation (ETL/ELT)

- **Ingestion:** [Specify ingestion tool, e.g., Fivetran, Airbyte, custom pipelines]
- **Transformation:** [Specify transformation tool, e.g., dbt]
- **Orchestration:** [Specify orchestrator, e.g., Airflow, Dagster, Prefect]
- **Rationale:** [Explain the reasoning for the chosen ETL/ELT stack.]

## 3. Business Intelligence & Visualization

- **Primary BI Tool:** [Specify BI tool, e.g., Looker, Tableau, Power BI]
- **Rationale:** [Explain why this BI tool was selected as the standard.]

## 4. Data Quality & Observability

- **Quality Monitoring:** [Specify data quality tool, e.g., Great Expectations, Monte Carlo]
- **Observability Platform:** [Specify observability tool, e.g., Datadog, OpenTelemetry]
- **Rationale:** [Explain the choice of tools for ensuring data integrity and pipeline health.]

## 5. Banned Technologies

To eliminate shadow data marts and ensure a single source of truth, the following are explicitly banned for creating or hosting analytical datasets:

- Spreadsheets (Google Sheets, Microsoft Excel) used as persistent data stores.
- Personal or team-managed databases (e.g., local PostgreSQL, MySQL instances).
- Department-specific data warehouses or marts not managed by the central data team.
- Third-party SaaS tools that create their own isolated analytical data stores.

All existing datasets in these systems must be migrated to the canonical stack according to the official [Migration Strategy](MIGRATION_STRATEGY.md).
