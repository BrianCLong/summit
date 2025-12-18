from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
import sys
import os
import json

# Add the airflow directory to the python path so imports work
sys.path.append(os.path.join(os.environ.get("AIRFLOW_HOME", "/opt/airflow"), "airflow"))

# Assuming the helper classes are available in the python environment
try:
    from airflow.etl.connectors.mock_source import MockSourceConnector
    from airflow.etl.transformers.validation import validate_record
    from airflow.etl.loaders.neo4j_loader import Neo4jLoader
except ImportError:
    pass

default_args = {
    'owner': 'intelgraph',
    'depends_on_past': False,
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
}

STAGING_DIR = os.environ.get("AIRFLOW_STAGING_DIR", "/tmp/airflow_staging")
os.makedirs(STAGING_DIR, exist_ok=True)

def extract_source(source_name: str, **kwargs):
    """
    Extracts data from a single source and writes to a staging file.
    Returns the file path.
    """
    execution_date = kwargs['ds']
    run_id = kwargs['run_id']
    connector = MockSourceConnector(source_name=source_name)
    data = list(connector.fetch_data(limit=50))

    filename = f"{source_name}_{execution_date}_{run_id}_raw.jsonl"
    filepath = os.path.join(STAGING_DIR, filename)

    with open(filepath, 'w') as f:
        for record in data:
            f.write(json.dumps(record) + "\n")

    print(f"Extracted {len(data)} records from {source_name} to {filepath}")
    return filepath

def transform_data(ti, **kwargs):
    """
    Reads raw files, validates/transforms, and writes valid data and DLQ data.
    """
    # Get all file paths from the upstream extract tasks
    # ti.xcom_pull(task_ids=['extract_twitter', 'extract_reddit', ...])
    # Or simpler: get from all upstream tasks if using dynamic mapping,
    # but for explicit tasks we list them or use a common prefix.

    # In this specific DAG structure, we can pull from the task group or list.
    # For simplicity, we'll pull from the specific task IDs we know exist.
    source_tasks = ['extract_twitter_mock', 'extract_reddit_mock', 'extract_rss_mock']
    file_paths = ti.xcom_pull(task_ids=source_tasks)

    if not file_paths:
        print("No input files found.")
        return None

    execution_date = kwargs['ds']
    run_id = kwargs['run_id']

    valid_filepath = os.path.join(STAGING_DIR, f"transformed_{execution_date}_{run_id}.jsonl")
    dlq_filepath = os.path.join(STAGING_DIR, f"dlq_{execution_date}_{run_id}.jsonl")

    valid_count = 0
    dlq_count = 0

    with open(valid_filepath, 'w') as valid_f, open(dlq_filepath, 'w') as dlq_f:
        for fp in file_paths:
            if not fp or not os.path.exists(fp):
                continue

            with open(fp, 'r') as raw_f:
                for line in raw_f:
                    try:
                        record = json.loads(line)
                        validated = validate_record(record)
                        if validated:
                            data = validated.model_dump(mode='json') if hasattr(validated, 'model_dump') else validated.dict()
                            valid_f.write(json.dumps(data) + "\n")
                            valid_count += 1
                        else:
                            # This case actually happens if validate_record returns None (handled inside validate_record)
                            # But validate_record currently prints and returns None.
                            # We should probably modify validate_record to raise or return error info,
                            # but for now, if it returns None, we assume it failed but we don't have the original raw record if validate_record consumed it?
                            # Wait, validate_record takes the dict.
                            dlq_f.write(json.dumps({"raw": record, "error": "Validation failed"}) + "\n")
                            dlq_count += 1
                    except Exception as e:
                        dlq_f.write(json.dumps({"raw": line.strip(), "error": str(e)}) + "\n")
                        dlq_count += 1

    print(f"Transformation complete. Valid: {valid_count}, DLQ: {dlq_count}")
    return {"valid_path": valid_filepath, "dlq_path": dlq_filepath, "valid_count": valid_count, "dlq_count": dlq_count}

def load_data(ti):
    """
    Loads transformed data into Neo4j from the staging file.
    """
    transform_result = ti.xcom_pull(task_id='transform_data')
    if not transform_result or transform_result['valid_count'] == 0:
        print("No valid data to load.")
        return

    filepath = transform_result['valid_path']
    loader = Neo4jLoader()

    # Batch load from file
    batch_size = 100
    batch = []

    try:
        loader.connect()
        with open(filepath, 'r') as f:
            for line in f:
                batch.append(json.loads(line))
                if len(batch) >= batch_size:
                    loader.load_batch(batch)
                    batch = []
            if batch:
                loader.load_batch(batch)
        print(f"Successfully loaded data from {filepath}")
    except Exception as e:
        print(f"Failed to load data: {e}")
        raise
    finally:
        loader.close()

def handle_dlq(ti):
    """
    Checks if there are records in the DLQ and alerts/archives.
    """
    transform_result = ti.xcom_pull(task_id='transform_data')
    if not transform_result:
        return

    dlq_count = transform_result.get('dlq_count', 0)
    dlq_path = transform_result.get('dlq_path')

    if dlq_count > 0:
        print(f"ALERT: {dlq_count} records failed validation. See {dlq_path}")
        # In a real system: send Slack alert, move file to 'dead_letter' bucket
    else:
        print("No DLQ records found. Clean run.")

with DAG(
    'intelgraph_etl_pipeline',
    default_args=default_args,
    description='ETL pipeline for IntelGraph intelligence data',
    schedule_interval=timedelta(hours=1),
    start_date=datetime(2023, 1, 1),
    catchup=False,
    tags=['intelgraph', 'etl', 'neo4j'],
) as dag:

    sources = ["twitter_mock", "reddit_mock", "rss_mock"]
    extract_tasks = []

    for source in sources:
        task = PythonOperator(
            task_id=f'extract_{source}',
            python_callable=extract_source,
            op_kwargs={'source_name': source},
        )
        extract_tasks.append(task)

    transform_task = PythonOperator(
        task_id='transform_data',
        python_callable=transform_data,
    )

    load_task = PythonOperator(
        task_id='load_data',
        python_callable=load_data,
    )

    dlq_task = PythonOperator(
        task_id='handle_dlq',
        python_callable=handle_dlq,
    )

    # Set dependencies
    # All extract tasks run in parallel, then transform
    extract_tasks >> transform_task

    # Transform splits to Load (success path) and DLQ (failure path)
    transform_task >> load_task
    transform_task >> dlq_task
