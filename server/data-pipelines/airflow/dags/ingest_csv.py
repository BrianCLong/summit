"""
Airflow DAG for CSV Data Ingestion
Orchestrates CSV ingestion → validation → transformation → loading to Neo4j/Postgres
"""

import os
import sys
from datetime import datetime, timedelta
import asyncio
import inspect
from airflow.operators.python import PythonOperator
from airflow import DAG

# Add data-pipelines directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), "../../"))

from transformations.entity_mapper import ORGANIZATION_MAPPING, PERSON_MAPPING, EntityMapper
from utils.neo4j_loader import Neo4jLoader
from utils.validation import DataValidator

from connectors import CSVConnector

default_args = {
    "owner": "intelgraph",
    "depends_on_past": False,
    "start_date": datetime(2025, 8, 14),
    "email_on_failure": True,
    "email_on_retry": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
    "max_active_runs": 1,
}

dag = DAG(
    "ingest_csv_data",
    default_args=default_args,
    description="Ingest CSV data into IntelGraph",
    schedule_interval="@daily",
    catchup=False,
    tags=["ingestion", "csv", "etl"],
)


def maybe_await(result):
    if inspect.isawaitable(result):
        return asyncio.run(result)
    return result


def extract_csv_data(**context):
    """
    Task to extract data from CSV files
    """
    from config import get_staging_path

    # Configuration - in production this would come from Airflow Variables
    csv_config = {
        "name": "daily_contacts",
        "file_path": "/data/input/contacts.csv",
        "delimiter": ",",
        "encoding": "utf-8",
        "has_header": True,
        "chunk_size": 5000,
    }

    # Initialize connector
    connector = CSVConnector("daily_contacts", csv_config)

    # Run ingestion
    output_path = get_staging_path("raw")
    stats = maybe_await(connector.ingest(batch_size=1000, output_path=output_path))

    # Store stats in XCom for monitoring
    context["task_instance"].xcom_push(key="ingestion_stats", value=stats.__dict__)

    return f"Extracted {stats.records_success} records"


def validate_data(**context):
    """
    Task to validate extracted data
    """
    import glob
    import json

    from config import get_staging_path

    # Get ingestion stats from previous task
    stats = context["task_instance"].xcom_pull(key="ingestion_stats", task_ids="extract_data")

    # Find all raw data files
    raw_path = get_staging_path("raw")
    data_files = glob.glob(str(raw_path / "daily_contacts_*.json"))

    validator = DataValidator()

    total_valid = 0
    total_invalid = 0

    for file_path in data_files:
        with open(file_path) as f:
            records = json.load(f)

        # Validate each record
        valid_records = []
        invalid_records = []

        for record in records:
            try:
                # Basic validation - check required fields
                if validator.validate_record(record, "person"):
                    valid_records.append(record)
                    total_valid += 1
                else:
                    invalid_records.append(record)
                    total_invalid += 1
            except Exception as e:
                print(f"Validation error: {e}")
                invalid_records.append(record)
                total_invalid += 1

        # Save valid records to processed folder
        if valid_records:
            processed_path = get_staging_path("processed")
            processed_file = processed_path / f"validated_{os.path.basename(file_path)}"
            with open(processed_file, "w") as f:
                json.dump(valid_records, f, indent=2)

        # Save invalid records to failed folder for review
        if invalid_records:
            failed_path = get_staging_path("failed")
            failed_file = failed_path / f"failed_{os.path.basename(file_path)}"
            with open(failed_file, "w") as f:
                json.dump(invalid_records, f, indent=2)

    # Store validation stats
    validation_stats = {
        "valid_records": total_valid,
        "invalid_records": total_invalid,
        "validation_rate": (
            total_valid / (total_valid + total_invalid) if (total_valid + total_invalid) > 0 else 0
        ),
    }

    context["task_instance"].xcom_push(key="validation_stats", value=validation_stats)

    return f"Validated {total_valid} records, {total_invalid} failed validation"


def transform_data(**context):
    """
    Task to transform data into IntelGraph entities
    """
    import glob
    import json

    from config import get_staging_path

    # Get validation stats from previous task
    validation_stats = context["task_instance"].xcom_pull(
        key="validation_stats", task_ids="validate_data"
    )

    # Find all validated data files
    processed_path = get_staging_path("processed")
    data_files = glob.glob(str(processed_path / "validated_*.json"))

    # Initialize entity mapper with rules
    mapper = EntityMapper([PERSON_MAPPING, ORGANIZATION_MAPPING])

    all_entities = []

    for file_path in data_files:
        with open(file_path) as f:
            records = json.load(f)

        # Transform records to entities
        entities = mapper.transform_batch(records)
        all_entities.extend(entities)

    # Save transformed entities
    if all_entities:
        transformed_path = get_staging_path("transformed")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = transformed_path / f"entities_{timestamp}.json"

        with open(output_file, "w") as f:
            json.dump(all_entities, f, indent=2, default=str)

    # Store transformation stats
    transform_stats = {
        "entities_created": len(all_entities),
        "entity_types": list(set(e["type"] for e in all_entities)),
    }

    context["task_instance"].xcom_push(key="transform_stats", value=transform_stats)

    return f"Transformed {len(all_entities)} entities"


def load_to_neo4j(**context):
    """
    Task to load entities into Neo4j
    """
    import glob
    import json

    from config import get_neo4j_connection_string, get_staging_path

    # Get transform stats from previous task
    transform_stats = context["task_instance"].xcom_pull(
        key="transform_stats", task_ids="transform_data"
    )

    # Find transformed entity files
    transformed_path = get_staging_path("transformed")
    entity_files = glob.glob(str(transformed_path / "entities_*.json"))

    # Initialize Neo4j loader
    loader = Neo4jLoader(get_neo4j_connection_string())

    total_loaded = 0

    for file_path in entity_files:
        with open(file_path) as f:
            entities = json.load(f)

        # Load entities in batches
        batch_size = 100
        for i in range(0, len(entities), batch_size):
            batch = entities[i : i + batch_size]
            loaded_count = maybe_await(loader.load_entities(batch))
            total_loaded += loaded_count

    # Store load stats
    load_stats = {"entities_loaded": total_loaded, "load_timestamp": datetime.now().isoformat()}

    context["task_instance"].xcom_push(key="load_stats", value=load_stats)

    return f"Loaded {total_loaded} entities to Neo4j"


def cleanup_staging(**context):
    """
    Task to clean up staging files and archive processed data
    """
    import glob
    import shutil

    from config import get_staging_path

    # Archive processed files
    staging_base = get_staging_path()
    archive_path = staging_base / "archives" / datetime.now().strftime("%Y%m%d")
    archive_path.mkdir(parents=True, exist_ok=True)

    # Move processed files to archive
    for folder in ["raw", "processed", "transformed"]:
        folder_path = get_staging_path(folder)
        files = glob.glob(str(folder_path / "*.json"))

        if files:
            archive_folder = archive_path / folder
            archive_folder.mkdir(exist_ok=True)

            for file_path in files:
                shutil.move(file_path, archive_folder / os.path.basename(file_path))

    return f"Archived {len(files)} files to {archive_path}"


def send_completion_notification(**context):
    """
    Task to send completion notification with pipeline statistics
    """
    # Gather stats from all tasks
    ingestion_stats = context["task_instance"].xcom_pull(
        key="ingestion_stats", task_ids="extract_data"
    )
    validation_stats = context["task_instance"].xcom_pull(
        key="validation_stats", task_ids="validate_data"
    )
    transform_stats = context["task_instance"].xcom_pull(
        key="transform_stats", task_ids="transform_data"
    )
    load_stats = context["task_instance"].xcom_pull(key="load_stats", task_ids="load_to_neo4j")

    # Create summary message
    summary = f"""
    CSV Ingestion Pipeline Completed Successfully
    
    Extraction:
    - Records processed: {ingestion_stats.get('records_processed', 0)}
    - Records successful: {ingestion_stats.get('records_success', 0)}
    - Records failed: {ingestion_stats.get('records_failed', 0)}
    
    Validation:
    - Valid records: {validation_stats.get('valid_records', 0)}
    - Invalid records: {validation_stats.get('invalid_records', 0)}
    - Validation rate: {validation_stats.get('validation_rate', 0):.2%}
    
    Transformation:
    - Entities created: {transform_stats.get('entities_created', 0)}
    - Entity types: {', '.join(transform_stats.get('entity_types', []))}
    
    Loading:
    - Entities loaded to Neo4j: {load_stats.get('entities_loaded', 0)}
    
    Pipeline completed at: {datetime.now().isoformat()}
    """

    print(summary)

    # In production, this would send to Slack, email, or monitoring system
    return "Notification sent"


# Define task dependencies
extract_task = PythonOperator(task_id="extract_data", python_callable=extract_csv_data, dag=dag)

validate_task = PythonOperator(task_id="validate_data", python_callable=validate_data, dag=dag)

transform_task = PythonOperator(task_id="transform_data", python_callable=transform_data, dag=dag)

load_task = PythonOperator(task_id="load_to_neo4j", python_callable=load_to_neo4j, dag=dag)

cleanup_task = PythonOperator(task_id="cleanup_staging", python_callable=cleanup_staging, dag=dag)

notification_task = PythonOperator(
    task_id="send_notification", python_callable=send_completion_notification, dag=dag
)

# Set up task dependencies
extract_task >> validate_task >> transform_task >> load_task >> cleanup_task >> notification_task
