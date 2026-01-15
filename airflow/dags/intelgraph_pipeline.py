import json
import os
import sys
from datetime import datetime, timedelta

from airflow.operators.python import PythonOperator

from airflow import DAG

# Add the airflow directory to the python path so imports work
sys.path.append(os.path.join(os.environ.get("AIRFLOW_HOME", "/opt/airflow"), "airflow"))

# Assuming the helper classes are available in the python environment
# In a real environment, these would be proper imports.
# For this task, we will simulate the "OsintConnector" logic within the task or assume it's available via a wrapper.

default_args = {
    "owner": "intelgraph",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
}

STAGING_DIR = os.environ.get("AIRFLOW_STAGING_DIR", "/tmp/airflow_staging")
os.makedirs(STAGING_DIR, exist_ok=True)


def extract_osint_source(source_type: str, **kwargs):
    """
    Extracts data from an OSINT source (Social, Web, Darknet).
    In a real implementation, this would call the OsintConnector.fetchBatch() method via a bridge or direct library call.
    """
    execution_date = kwargs["ds"]
    run_id = kwargs["run_id"]

    # Simulate data extraction based on source type
    data = []
    limit = 100
    for i in range(limit):
        data.append(
            {
                "id": f"{source_type}_{execution_date}_{i}",
                "content": f"Batch content from {source_type}",
                "timestamp": datetime.now().isoformat(),
                "sourceType": source_type,
                "metadata": {"batch_run": run_id},
            }
        )

    filename = f"{source_type}_{execution_date}_{run_id}_raw.jsonl"
    filepath = os.path.join(STAGING_DIR, filename)

    with open(filepath, "w") as f:
        for record in data:
            f.write(json.dumps(record) + "\n")

    print(f"Extracted {len(data)} records from {source_type} to {filepath}")
    return filepath


def validate_and_enrich(ti, **kwargs):
    """
    Reads raw files, validates schema, enriches data, and splits into Valid/DLQ.
    """
    source_tasks = ["extract_social", "extract_web", "extract_darknet"]
    file_paths = ti.xcom_pull(task_ids=source_tasks)

    if not file_paths:
        print("No input files found.")
        return None

    execution_date = kwargs["ds"]
    run_id = kwargs["run_id"]

    valid_filepath = os.path.join(STAGING_DIR, f"transformed_{execution_date}_{run_id}.jsonl")
    dlq_filepath = os.path.join(STAGING_DIR, f"dlq_{execution_date}_{run_id}.jsonl")

    valid_count = 0
    dlq_count = 0

    with open(valid_filepath, "w") as valid_f, open(dlq_filepath, "w") as dlq_f:
        for fp in file_paths:
            if not fp or not os.path.exists(fp):
                continue

            with open(fp) as raw_f:
                for line in raw_f:
                    try:
                        record = json.loads(line)

                        # 1. Validation
                        if not record.get("content") or not record.get("timestamp"):
                            dlq_f.write(
                                json.dumps({"raw": record, "error": "Missing required fields"})
                                + "\n"
                            )
                            dlq_count += 1
                            continue

                        # 2. Enrichment (Simulated)
                        record["enrichment"] = {
                            "processed_at": datetime.now().isoformat(),
                            "risk_score": 0.5,  # Placeholder
                        }

                        # 3. Schema Versioning
                        record["schema_version"] = "1.0"

                        valid_f.write(json.dumps(record) + "\n")
                        valid_count += 1

                    except Exception as e:
                        dlq_f.write(json.dumps({"raw": line.strip(), "error": str(e)}) + "\n")
                        dlq_count += 1

    print(f"Transformation complete. Valid: {valid_count}, DLQ: {dlq_count}")
    return {
        "valid_path": valid_filepath,
        "dlq_path": dlq_filepath,
        "valid_count": valid_count,
        "dlq_count": dlq_count,
    }


def load_to_graph_and_lineage(ti):
    """
    Loads transformed data into Neo4j and records Lineage.
    """
    transform_result = ti.xcom_pull(task_id="validate_and_enrich")
    if not transform_result or transform_result["valid_count"] == 0:
        print("No valid data to load.")
        return

    filepath = transform_result["valid_path"]

    # In a real impl, this would use the Neo4j driver
    print(f"Loading data from {filepath} into Neo4j...")

    # Simulate Lineage Tracking
    # We would call the Provenance API or write to a lineage topic here
    print("Recording lineage events for batch...")


def handle_dlq_alert(ti):
    """
    Checks DLQ and alerts if threshold exceeded.
    """
    transform_result = ti.xcom_pull(task_id="validate_and_enrich")
    if not transform_result:
        return

    dlq_count = transform_result.get("dlq_count", 0)
    dlq_path = transform_result.get("dlq_path")

    if dlq_count > 0:
        print(f"ALERT: {dlq_count} records failed validation. See {dlq_path}")
        # Send Slack/PagerDuty alert
    else:
        print("No DLQ records found. Clean run.")


with DAG(
    "osint_ingestion_pipeline_v1",
    default_args=default_args,
    description="Robust OSINT Ingestion Pipeline (Social, Web, Darknet)",
    schedule_interval=timedelta(hours=1),
    start_date=datetime(2023, 1, 1),
    catchup=False,
    tags=["osint", "etl", "security"],
) as dag:
    # Parallel extraction from multiple sources
    extract_social = PythonOperator(
        task_id="extract_social",
        python_callable=extract_osint_source,
        op_kwargs={"source_type": "social"},
    )

    extract_web = PythonOperator(
        task_id="extract_web",
        python_callable=extract_osint_source,
        op_kwargs={"source_type": "web"},
    )

    extract_darknet = PythonOperator(
        task_id="extract_darknet",
        python_callable=extract_osint_source,
        op_kwargs={"source_type": "darknet"},
    )

    # Validate, Dedupe, Enrich
    transform_task = PythonOperator(
        task_id="validate_and_enrich",
        python_callable=validate_and_enrich,
    )

    # Load to Graph DB
    load_task = PythonOperator(
        task_id="load_to_graph_and_lineage",
        python_callable=load_to_graph_and_lineage,
    )

    # DLQ Monitoring
    dlq_task = PythonOperator(
        task_id="handle_dlq_alert",
        python_callable=handle_dlq_alert,
    )

    # Dependencies
    [extract_social, extract_web, extract_darknet] >> transform_task
    transform_task >> load_task
    transform_task >> dlq_task
