import os
from datetime import UTC, datetime, timedelta, timezone

from airflow.operators.bash import BashOperator

from airflow import DAG

# Summit End-to-End Lineage Pipeline
# Expressed in W3C PROV terms and stitched by OpenLineage run IDs.

default_args = {
    "owner": "summit",
    "depends_on_past": False,
    "start_date": datetime(2024, 1, 1, tzinfo=UTC),
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
}

# OpenLineage configuration should be set via external environment variables.
# For GA readiness, we do NOT hardcode any tokens or backend URLs.
OPENLINEAGE_URL = os.environ.get("OPENLINEAGE_URL")
OPENLINEAGE_API_KEY = os.environ.get("OPENLINEAGE_API_KEY")

# DBT_PROJECT_DIR should point to where dbt_project.yml is located.
DBT_PROJECT_DIR = os.environ.get("DBT_PROJECT_DIR", os.path.join(os.getcwd(), "warehouse"))

with DAG(
    "summit_lineage_pipeline_v1",
    default_args=default_args,
    description="GA-ready end-to-end lineage across Airflow + dbt",
    schedule="@daily",
    catchup=False,
    tags=["summit", "openlineage", "dbt", "provenance", "ga-ready"],
) as dag:

    # Minimal "parent run" handoff pattern
    # When Airflow triggers dbt, we pass parent identifiers so dbt can set ParentRunFacet.
    # We use Jinja templates to pull the run context dynamically.
    run_dbt_models = BashOperator(
        task_id="dbt_analytics_models",
        bash_command=f"cd {DBT_PROJECT_DIR} && dbt-ol run",
        env={
            **os.environ,  # Inherit existing environment
            "OPENLINEAGE_URL": OPENLINEAGE_URL,
            "OPENLINEAGE_API_KEY": OPENLINEAGE_API_KEY,
            "OPENLINEAGE_PARENT_RUN_ID": "{{ ti.xcom_pull(key='openlineage_run_id') or run_id }}",
            "OPENLINEAGE_PARENT_JOB_NAMESPACE": "summit/airflow",
            "OPENLINEAGE_PARENT_JOB_NAME": f"{dag.dag_id}.dbt_analytics_models",
        },
    )
