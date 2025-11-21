"""
Example Airflow DAG for ETL pipeline orchestration
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.http.operators.http import SimpleHttpOperator
from airflow.providers.postgres.operators.postgres import PostgresOperator
import json

default_args = {
    'owner': 'intelgraph',
    'depends_on_past': False,
    'start_date': datetime(2025, 1, 1),
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
    'execution_timeout': timedelta(hours=2)
}

dag = DAG(
    'etl_pipeline_example',
    default_args=default_args,
    description='Example ETL pipeline using IntelGraph data integration framework',
    schedule_interval='0 2 * * *',  # Run daily at 2 AM
    catchup=False,
    tags=['etl', 'data-integration', 'example']
)

def extract_data(**context):
    """Extract data from source"""
    print("Extracting data from source...")
    # Would call IntelGraph connector
    return {'records_extracted': 1000}

def transform_data(**context):
    """Transform extracted data"""
    print("Transforming data...")
    # Would call IntelGraph transformer
    return {'records_transformed': 950}

def validate_data(**context):
    """Validate transformed data"""
    print("Validating data quality...")
    # Would call IntelGraph validator
    return {'records_valid': 940, 'records_failed': 10}

def enrich_data(**context):
    """Enrich data with additional information"""
    print("Enriching data...")
    # Would call IntelGraph enricher
    return {'records_enriched': 940}

def load_data(**context):
    """Load data to target"""
    print("Loading data to target...")
    # Would call IntelGraph loader
    return {'records_loaded': 940}

def track_lineage(**context):
    """Track data lineage"""
    print("Tracking data lineage...")
    # Would call IntelGraph lineage tracker
    return {'lineage_tracked': True}

def send_metrics(**context):
    """Send pipeline metrics"""
    ti = context['task_instance']

    # Gather metrics from previous tasks
    extract_result = ti.xcom_pull(task_ids='extract')
    transform_result = ti.xcom_pull(task_ids='transform')
    validate_result = ti.xcom_pull(task_ids='validate')
    load_result = ti.xcom_pull(task_ids='load')

    metrics = {
        'pipeline_id': context['dag'].dag_id,
        'run_id': context['run_id'],
        'execution_date': context['execution_date'].isoformat(),
        'records_extracted': extract_result.get('records_extracted', 0),
        'records_transformed': transform_result.get('records_transformed', 0),
        'records_loaded': load_result.get('records_loaded', 0),
        'records_failed': validate_result.get('records_failed', 0)
    }

    print(f"Pipeline metrics: {json.dumps(metrics, indent=2)}")
    return metrics

# Define tasks
extract_task = PythonOperator(
    task_id='extract',
    python_callable=extract_data,
    dag=dag
)

transform_task = PythonOperator(
    task_id='transform',
    python_callable=transform_data,
    dag=dag
)

validate_task = PythonOperator(
    task_id='validate',
    python_callable=validate_data,
    dag=dag
)

enrich_task = PythonOperator(
    task_id='enrich',
    python_callable=enrich_data,
    dag=dag
)

load_task = PythonOperator(
    task_id='load',
    python_callable=load_data,
    dag=dag
)

lineage_task = PythonOperator(
    task_id='track_lineage',
    python_callable=track_lineage,
    dag=dag
)

metrics_task = PythonOperator(
    task_id='send_metrics',
    python_callable=send_metrics,
    dag=dag
)

# Define task dependencies
extract_task >> transform_task >> validate_task >> enrich_task >> load_task >> [lineage_task, metrics_task]
